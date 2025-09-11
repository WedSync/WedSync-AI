'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Star,
  Camera,
  Check,
  AlertCircle,
  ChevronRight,
  Upload,
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { ShimmerButton } from '@/components/magicui/shimmer-button';

// Form validation schema
const reviewSchema = z.object({
  vendorId: z.string().uuid('Please select a vendor'),
  overallRating: z.number().min(1, 'Overall rating is required').max(5),
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  content: z
    .string()
    .min(20, 'Review must be at least 20 characters')
    .max(5000),
  weddingDate: z.string().min(1, 'Wedding date is required'),
  vendorServiceType: z.string().min(1, 'Service type is required'),
  vendorPackageDetails: z.string().optional(),
  totalAmountPaid: z.number().optional(),
  wouldRecommend: z.boolean(),
  hiredAgain: z.boolean().optional(),
  responseTimeRating: z.number().min(1).max(5).optional(),
  categoryRatings: z.record(z.number().min(1).max(5)),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface VendorData {
  id: string;
  business_name: string;
  category: string;
  contact_email: string;
  logo_url?: string;
}

interface ReviewCategory {
  id: string;
  name: string;
  display_order: number;
}

export function PostWeddingReviewForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [categories, setCategories] = useState<ReviewCategory[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<VendorData | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isValid },
    trigger,
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      overallRating: 0,
      wouldRecommend: true,
      categoryRatings: {},
    },
    mode: 'onChange',
  });

  // Load vendors and categories
  useEffect(() => {
    const loadData = async () => {
      // Load vendors for this client
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('*')
        .eq('organization_id', clientId);

      if (vendorData) {
        setVendors(vendorData);
      }

      // Load review categories
      const { data: categoryData } = await supabase
        .from('vendor_review_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (categoryData) {
        setCategories(categoryData);
      }
    };

    loadData();
  }, [clientId, supabase]);

  const watchedRating = watch('overallRating');
  const watchedContent = watch('content') || '';

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `review-photos/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('review-photos')
        .upload(filePath, file);

      if (!uploadError && data) {
        const {
          data: { publicUrl },
        } = supabase.storage.from('review-photos').getPublicUrl(filePath);

        setUploadedPhotos((prev) => [...prev, publicUrl]);
      }
    }
  };

  // Handle form submission
  const onSubmit = async (data: ReviewFormData) => {
    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get organization ID
      const { data: clientData } = await supabase
        .from('clients')
        .select('organization_id')
        .eq('id', clientId)
        .single();

      if (!clientData) throw new Error('Client not found');

      // Create the review
      const { data: review, error: reviewError } = await supabase
        .from('vendor_reviews')
        .insert({
          vendor_id: data.vendorId,
          client_id: clientId,
          user_id: user.id,
          organization_id: clientData.organization_id,
          overall_rating: data.overallRating,
          title: data.title,
          content: data.content,
          wedding_date: data.weddingDate,
          vendor_service_type: data.vendorServiceType,
          vendor_package_details: data.vendorPackageDetails,
          total_amount_paid: data.totalAmountPaid,
          would_recommend: data.wouldRecommend,
          hired_again: data.hiredAgain,
          response_time_rating: data.responseTimeRating,
        })
        .select()
        .single();

      if (reviewError) throw reviewError;

      // Add category ratings
      const categoryRatingPromises = Object.entries(data.categoryRatings).map(
        ([categoryId, rating]) =>
          supabase.from('vendor_review_ratings').insert({
            review_id: review.id,
            category_id: categoryId,
            rating,
          }),
      );

      await Promise.all(categoryRatingPromises);

      // Add photos if any
      if (uploadedPhotos.length > 0) {
        const photoPromises = uploadedPhotos.map((url, index) =>
          supabase.from('vendor_review_photos').insert({
            review_id: review.id,
            photo_url: url,
            is_primary: index === 0,
            display_order: index,
          }),
        );

        await Promise.all(photoPromises);
      }

      // Success - redirect to thank you page
      router.push(
        `/vendors/reviews/thank-you?vendor=${selectedVendor?.business_name}`,
      );
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rating component
  const RatingInput = ({
    name,
    label,
    required = false,
    description,
  }: {
    name: string;
    label: string;
    required?: boolean;
    description?: string;
  }) => (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-900">
        {label} {required && <span className="text-error-500">*</span>}
      </label>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      <Controller
        name={name as any}
        control={control}
        render={({ field: { onChange, value } }) => (
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onChange(star)}
                className={`p-1 transition-all duration-200 transform hover:scale-110 ${
                  star <= (value || 0)
                    ? 'text-warning-500 hover:text-warning-600'
                    : 'text-gray-300 hover:text-gray-400'
                }`}
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= (value || 0) ? 'fill-current' : ''
                  }`}
                />
              </button>
            ))}
            <span className="ml-3 text-sm font-medium text-gray-700">
              {value > 0 ? `${value}/5` : 'Select rating'}
            </span>
          </div>
        )}
      />
      {errors[name as keyof typeof errors] && (
        <p className="text-sm text-error-500 flex items-center mt-1">
          <AlertCircle className="h-4 w-4 mr-1" />
          {errors[name as keyof typeof errors]?.message}
        </p>
      )}
    </div>
  );

  // Step navigation
  const nextStep = async () => {
    const fieldsToValidate =
      currentStep === 1
        ? ['vendorId', 'weddingDate', 'vendorServiceType']
        : currentStep === 2
          ? ['overallRating', 'title', 'content']
          : [];

    const isStepValid = await trigger(fieldsToValidate as any);
    if (isStepValid) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`flex items-center ${step < 4 ? 'flex-1' : ''}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-200 ${
                  step <= currentStep
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step < currentStep ? <Check className="h-5 w-5" /> : step}
              </div>
              {step < 4 && (
                <div
                  className={`flex-1 h-1 mx-2 transition-all duration-200 ${
                    step < currentStep ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span>Vendor Details</span>
          <span>Your Review</span>
          <span>Categories</span>
          <span>Submit</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: Vendor Selection */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Select Your Vendor
            </h2>

            <div className="space-y-6">
              {/* Vendor selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Which vendor would you like to review?{' '}
                  <span className="text-error-500">*</span>
                </label>
                <select
                  {...register('vendorId')}
                  onChange={(e) => {
                    const vendor = vendors.find((v) => v.id === e.target.value);
                    setSelectedVendor(vendor || null);
                    setValue('vendorServiceType', vendor?.category || '');
                  }}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                >
                  <option value="">Select a vendor...</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.business_name} - {vendor.category}
                    </option>
                  ))}
                </select>
                {errors.vendorId && (
                  <p className="text-sm text-error-500 mt-1 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.vendorId.message}
                  </p>
                )}
              </div>

              {/* Wedding date */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Wedding Date <span className="text-error-500">*</span>
                </label>
                <input
                  {...register('weddingDate')}
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                />
                {errors.weddingDate && (
                  <p className="text-sm text-error-500 mt-1 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.weddingDate.message}
                  </p>
                )}
              </div>

              {/* Service type */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Service Type <span className="text-error-500">*</span>
                </label>
                <input
                  {...register('vendorServiceType')}
                  type="text"
                  placeholder="e.g., Photography, Catering, DJ..."
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                />
                {errors.vendorServiceType && (
                  <p className="text-sm text-error-500 mt-1 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.vendorServiceType.message}
                  </p>
                )}
              </div>

              {/* Package details */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Package Details
                </label>
                <textarea
                  {...register('vendorPackageDetails')}
                  rows={3}
                  placeholder="Describe the package or services you purchased..."
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                />
              </div>

              {/* Amount paid */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Total Amount Paid
                </label>
                <input
                  {...register('totalAmountPaid', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Review Content */}
        {currentStep === 2 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Write Your Review
            </h2>

            <div className="space-y-6">
              {/* Overall rating */}
              <RatingInput
                name="overallRating"
                label="Overall Rating"
                required
                description="How would you rate your overall experience?"
              />

              {/* Review title */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Review Title <span className="text-error-500">*</span>
                </label>
                <input
                  {...register('title')}
                  type="text"
                  placeholder="Summarize your experience..."
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                />
                {errors.title && (
                  <p className="text-sm text-error-500 mt-1 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.title.message}
                  </p>
                )}
              </div>

              {/* Review content */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Your Review <span className="text-error-500">*</span>
                </label>
                <textarea
                  {...register('content')}
                  rows={6}
                  placeholder="Share your detailed experience with this vendor..."
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                />
                <div className="flex justify-between items-center mt-2">
                  <div>
                    {errors.content && (
                      <p className="text-sm text-error-500 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.content.message}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      watchedContent.length > 4500
                        ? 'text-error-500'
                        : 'text-gray-500'
                    }`}
                  >
                    {watchedContent.length}/5000
                  </span>
                </div>
              </div>

              {/* Photo upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Add Photos
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center px-4 py-2 bg-gray-50 text-gray-700 rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-100">
                    <Camera className="h-5 w-5 mr-2" />
                    <span>Upload Photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {uploadedPhotos.length > 0 && (
                    <span className="text-sm text-gray-600">
                      {uploadedPhotos.length} photo(s) uploaded
                    </span>
                  )}
                </div>
              </div>

              {/* Recommendation */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    {...register('wouldRecommend')}
                    type="checkbox"
                    id="recommend"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="recommend"
                    className="text-sm font-medium text-gray-700"
                  >
                    I would recommend this vendor to other couples
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    {...register('hiredAgain')}
                    type="checkbox"
                    id="hireAgain"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="hireAgain"
                    className="text-sm font-medium text-gray-700"
                  >
                    I would hire this vendor again
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Category Ratings */}
        {currentStep === 3 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Rate Specific Categories
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Help future couples by rating specific aspects of your vendor
              experience
            </p>

            <div className="space-y-6">
              {categories.map((category) => (
                <RatingInput
                  key={category.id}
                  name={`categoryRatings.${category.id}`}
                  label={category.name}
                  required
                />
              ))}

              {/* Response time rating */}
              <RatingInput
                name="responseTimeRating"
                label="Response Time"
                description="How quickly did they respond to your messages?"
              />
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {currentStep === 4 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Review & Submit
            </h2>

            <div className="space-y-6">
              {/* Review summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Your Review Summary
                </h3>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Vendor:</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {selectedVendor?.business_name}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Overall Rating:</dt>
                    <dd className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < watchedRating
                              ? 'text-warning-500 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-sm font-medium">
                        {watchedRating}/5
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Title:</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {watch('title')}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Would Recommend:</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {watch('wouldRecommend') ? 'Yes' : 'No'}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Submission notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Before You Submit
                    </h3>
                    <p className="mt-1 text-sm text-blue-700">
                      Your review will be moderated before being published. This
                      usually takes 24-48 hours. Please ensure your review is
                      honest, constructive, and follows our community
                      guidelines.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold text-sm rounded-lg shadow-xs hover:bg-gray-50 transition-all duration-200"
            >
              Previous
            </button>
          )}

          <div className={`${currentStep === 1 ? 'ml-auto' : ''}`}>
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 flex items-center"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            ) : (
              <ShimmerButton
                disabled={!isValid || isSubmitting}
                className="shadow-2xl"
              >
                <span className="whitespace-pre-wrap text-center text-sm font-medium">
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        ></path>
                      </svg>
                      Submitting Review...
                    </div>
                  ) : (
                    'Submit Review'
                  )}
                </span>
              </ShimmerButton>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
