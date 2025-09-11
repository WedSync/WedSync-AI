'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  X,
  Plus,
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
  Building2,
  MapPin,
  DollarSign,
  Users,
  FileText,
  Award,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WizardStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  fields: string[];
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 1,
    title: 'Business Information',
    description: 'Tell us about your business',
    icon: <Building2 className="w-5 h-5" />,
    fields: [
      'legal_business_name',
      'trading_name',
      'company_registration_number',
      'established_year',
      'business_structure',
    ],
  },
  {
    id: 2,
    title: 'Service Areas',
    description: 'Where do you provide services?',
    icon: <MapPin className="w-5 h-5" />,
    fields: ['service_areas', 'travel_policy', 'service_offerings'],
  },
  {
    id: 3,
    title: 'Pricing & Packages',
    description: 'Set your pricing structure',
    icon: <DollarSign className="w-5 h-5" />,
    fields: ['pricing_structure', 'hourly_rate', 'minimum_spend', 'packages'],
  },
  {
    id: 4,
    title: 'Team & Contact',
    description: 'Contact information and team details',
    icon: <Users className="w-5 h-5" />,
    fields: [
      'key_contact_name',
      'key_contact_email',
      'key_contact_phone',
      'team_members',
    ],
  },
  {
    id: 5,
    title: 'Media Gallery',
    description: 'Upload your portfolio images',
    icon: <FileText className="w-5 h-5" />,
    fields: ['logo_url', 'cover_image_url', 'gallery_images'],
  },
  {
    id: 6,
    title: 'Verification',
    description: 'Submit documents for verification',
    icon: <Award className="w-5 h-5" />,
    fields: ['verification_documents'],
  },
];

interface ProfileData {
  legal_business_name: string;
  trading_name: string;
  company_registration_number: string;
  vat_number: string;
  established_year: number | '';
  business_structure: string;
  service_offerings: Array<{
    name: string;
    description: string;
    category: string;
  }>;
  specializations: string[];
  languages_spoken: string[];
  service_areas: string[];
  travel_policy: string;
  pricing_structure: string;
  hourly_rate: number | '';
  minimum_spend: number | '';
  packages: Array<{
    name: string;
    description: string;
    price: number;
    includes: string[];
  }>;
  deposit_percentage: number | '';
  payment_terms: string;
  cancellation_policy: string;
  key_contact_name: string;
  key_contact_role: string;
  key_contact_email: string;
  key_contact_phone: string;
  team_members: Array<{
    name: string;
    role: string;
    bio: string;
    photo?: string;
  }>;
  unique_selling_points: string[];
  style_tags: string[];
  ideal_client_description: string;
  logo_url: string;
  cover_image_url: string;
  gallery_images: Array<{ url: string; caption: string; category: string }>;
  response_time_commitment: string;
  preferred_contact_method: string;
  auto_response_enabled: boolean;
  auto_response_message: string;
}

const initialProfileData: ProfileData = {
  legal_business_name: '',
  trading_name: '',
  company_registration_number: '',
  vat_number: '',
  established_year: '',
  business_structure: '',
  service_offerings: [],
  specializations: [],
  languages_spoken: [],
  service_areas: [],
  travel_policy: '',
  pricing_structure: '',
  hourly_rate: '',
  minimum_spend: '',
  packages: [],
  deposit_percentage: '',
  payment_terms: '',
  cancellation_policy: '',
  key_contact_name: '',
  key_contact_role: '',
  key_contact_email: '',
  key_contact_phone: '',
  team_members: [],
  unique_selling_points: [],
  style_tags: [],
  ideal_client_description: '',
  logo_url: '',
  cover_image_url: '',
  gallery_images: [],
  response_time_commitment: '',
  preferred_contact_method: 'email',
  auto_response_enabled: false,
  auto_response_message: '',
};

export function ProfileCreationWizard({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [profileData, setProfileData] =
    useState<ProfileData>(initialProfileData);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [geographicAreas, setGeographicAreas] = useState<any[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadGeographicAreas();
  }, []);

  const loadGeographicAreas = async () => {
    try {
      // This would be replaced with actual API call
      setGeographicAreas([
        { id: '1', name: 'London', display_name: 'London', type: 'city' },
        {
          id: '2',
          name: 'Manchester',
          display_name: 'Manchester',
          type: 'city',
        },
        {
          id: '3',
          name: 'Birmingham',
          display_name: 'Birmingham',
          type: 'city',
        },
      ]);
    } catch (error) {
      console.error('Error loading geographic areas:', error);
    }
  };

  const calculateProgress = () => {
    const totalFields = WIZARD_STEPS.reduce(
      (sum, step) => sum + step.fields.length,
      0,
    );
    let completedFields = 0;

    WIZARD_STEPS.forEach((step) => {
      step.fields.forEach((field) => {
        const value = profileData[field as keyof ProfileData];
        if (
          value &&
          value !== '' &&
          (Array.isArray(value) ? value.length > 0 : true)
        ) {
          completedFields++;
        }
      });
    });

    return Math.round((completedFields / totalFields) * 100);
  };

  const validateCurrentStep = () => {
    const step = WIZARD_STEPS.find((s) => s.id === currentStep);
    if (!step) return true;

    const stepErrors: Record<string, string> = {};

    step.fields.forEach((field) => {
      const value = profileData[field as keyof ProfileData];

      // Required field validation
      if (['legal_business_name', 'key_contact_email'].includes(field)) {
        if (!value || value === '') {
          stepErrors[field] = 'This field is required';
        }
      }

      // Email validation
      if (field === 'key_contact_email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value as string)) {
          stepErrors[field] = 'Please enter a valid email address';
        }
      }

      // Year validation
      if (field === 'established_year' && value) {
        const year = Number(value);
        if (year < 1900 || year > new Date().getFullYear()) {
          stepErrors[field] = 'Please enter a valid year';
        }
      }
    });

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < WIZARD_STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/directory/suppliers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Profile Created',
          description: 'Your supplier profile has been created successfully!',
        });
        onComplete?.();
      } else {
        throw new Error(result.error || 'Failed to create profile');
      }
    } catch (error) {
      console.error('Error creating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to create profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfileData = (field: keyof ProfileData, value: any) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleFileUpload = async (
    file: File,
    type: 'logo' | 'cover' | 'gallery',
  ) => {
    setUploadingMedia(true);
    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);

      // For demo purposes, we'll just set the URL directly
      // In production, this would upload to your media service
      const mockUrl = URL.createObjectURL(file);

      if (type === 'logo') {
        updateProfileData('logo_url', mockUrl);
      } else if (type === 'cover') {
        updateProfileData('cover_image_url', mockUrl);
      } else if (type === 'gallery') {
        const newImage = {
          url: mockUrl,
          caption: '',
          category: 'general',
        };
        updateProfileData('gallery_images', [
          ...profileData.gallery_images,
          newImage,
        ]);
      }

      toast({
        title: 'Upload successful',
        description: 'Your image has been uploaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploadingMedia(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const addServiceOffering = () => {
    updateProfileData('service_offerings', [
      ...profileData.service_offerings,
      { name: '', description: '', category: '' },
    ]);
  };

  const removeServiceOffering = (index: number) => {
    updateProfileData(
      'service_offerings',
      profileData.service_offerings.filter((_, i) => i !== index),
    );
  };

  const addPackage = () => {
    updateProfileData('packages', [
      ...profileData.packages,
      { name: '', description: '', price: 0, includes: [] },
    ]);
  };

  const removePackage = (index: number) => {
    updateProfileData(
      'packages',
      profileData.packages.filter((_, i) => i !== index),
    );
  };

  const addTeamMember = () => {
    updateProfileData('team_members', [
      ...profileData.team_members,
      { name: '', role: '', bio: '' },
    ]);
  };

  const removeTeamMember = (index: number) => {
    updateProfileData(
      'team_members',
      profileData.team_members.filter((_, i) => i !== index),
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <BusinessInformationStep
            data={profileData}
            updateData={updateProfileData}
            errors={errors}
          />
        );
      case 2:
        return (
          <ServiceAreasStep
            data={profileData}
            updateData={updateProfileData}
            errors={errors}
            geographicAreas={geographicAreas}
            addServiceOffering={addServiceOffering}
            removeServiceOffering={removeServiceOffering}
          />
        );
      case 3:
        return (
          <PricingPackagesStep
            data={profileData}
            updateData={updateProfileData}
            errors={errors}
            addPackage={addPackage}
            removePackage={removePackage}
          />
        );
      case 4:
        return (
          <TeamContactStep
            data={profileData}
            updateData={updateProfileData}
            errors={errors}
            addTeamMember={addTeamMember}
            removeTeamMember={removeTeamMember}
          />
        );
      case 5:
        return (
          <MediaGalleryStep
            data={profileData}
            updateData={updateProfileData}
            handleFileUpload={handleFileUpload}
            uploadingMedia={uploadingMedia}
          />
        );
      case 6:
        return (
          <VerificationStep
            data={profileData}
            updateData={updateProfileData}
            handleFileUpload={handleFileUpload}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Progress Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Create Your Supplier Profile</h1>
          <Badge variant="outline" className="px-3 py-1">
            Step {currentStep} of {WIZARD_STEPS.length}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Profile Completion</span>
            <span>{calculateProgress()}%</span>
          </div>
          <Progress value={calculateProgress()} className="h-2" />
        </div>

        {/* Step Navigation */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {WIZARD_STEPS.map((step) => (
            <div
              key={step.id}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg whitespace-nowrap ${
                step.id === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : step.id < currentStep
                    ? 'bg-green-100 text-green-800'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {step.id < currentStep ? (
                <Check className="w-4 h-4" />
              ) : (
                step.icon
              )}
              <span className="text-sm font-medium">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {WIZARD_STEPS[currentStep - 1]?.icon}
            <span>{WIZARD_STEPS[currentStep - 1]?.title}</span>
          </CardTitle>
          <CardDescription>
            {WIZARD_STEPS[currentStep - 1]?.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">{renderStepContent()}</CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        {currentStep === WIZARD_STEPS.length ? (
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Creating...' : 'Create Profile'}
          </Button>
        ) : (
          <Button onClick={handleNext}>
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Step Components (simplified for brevity)
function BusinessInformationStep({ data, updateData, errors }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="legal_business_name">Legal Business Name *</Label>
        <Input
          id="legal_business_name"
          value={data.legal_business_name}
          onChange={(e) => updateData('legal_business_name', e.target.value)}
          className={errors.legal_business_name ? 'border-red-500' : ''}
        />
        {errors.legal_business_name && (
          <p className="text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.legal_business_name}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="trading_name">Trading Name</Label>
        <Input
          id="trading_name"
          value={data.trading_name}
          onChange={(e) => updateData('trading_name', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="company_registration_number">
          Company Registration Number
        </Label>
        <Input
          id="company_registration_number"
          value={data.company_registration_number}
          onChange={(e) =>
            updateData('company_registration_number', e.target.value)
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="established_year">Established Year</Label>
        <Input
          id="established_year"
          type="number"
          min="1900"
          max={new Date().getFullYear()}
          value={data.established_year}
          onChange={(e) =>
            updateData(
              'established_year',
              e.target.value ? parseInt(e.target.value) : '',
            )
          }
          className={errors.established_year ? 'border-red-500' : ''}
        />
        {errors.established_year && (
          <p className="text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.established_year}
          </p>
        )}
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="business_structure">Business Structure</Label>
        <Select
          value={data.business_structure}
          onValueChange={(value) => updateData('business_structure', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select business structure" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sole_trader">Sole Trader</SelectItem>
            <SelectItem value="partnership">Partnership</SelectItem>
            <SelectItem value="limited_company">Limited Company</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function ServiceAreasStep({
  data,
  updateData,
  errors,
  geographicAreas,
  addServiceOffering,
  removeServiceOffering,
}: any) {
  return (
    <div className="space-y-6">
      {/* Service Areas */}
      <div className="space-y-2">
        <Label>Service Areas</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {geographicAreas.map((area: any) => (
            <div key={area.id} className="flex items-center space-x-2">
              <Checkbox
                id={area.id}
                checked={data.service_areas.includes(area.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    updateData('service_areas', [
                      ...data.service_areas,
                      area.id,
                    ]);
                  } else {
                    updateData(
                      'service_areas',
                      data.service_areas.filter((id: string) => id !== area.id),
                    );
                  }
                }}
              />
              <Label htmlFor={area.id} className="text-sm">
                {area.display_name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Service Offerings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Service Offerings</Label>
          <Button type="button" size="sm" onClick={addServiceOffering}>
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </Button>
        </div>

        {data.service_offerings.map((service: any, index: number) => (
          <Card key={index} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-medium">Service {index + 1}</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeServiceOffering(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="Service name"
                value={service.name}
                onChange={(e) => {
                  const newServices = [...data.service_offerings];
                  newServices[index].name = e.target.value;
                  updateData('service_offerings', newServices);
                }}
              />
              <Input
                placeholder="Category"
                value={service.category}
                onChange={(e) => {
                  const newServices = [...data.service_offerings];
                  newServices[index].category = e.target.value;
                  updateData('service_offerings', newServices);
                }}
              />
              <div className="md:col-span-2">
                <Textarea
                  placeholder="Service description"
                  value={service.description}
                  onChange={(e) => {
                    const newServices = [...data.service_offerings];
                    newServices[index].description = e.target.value;
                    updateData('service_offerings', newServices);
                  }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Travel Policy */}
      <div className="space-y-2">
        <Label htmlFor="travel_policy">Travel Policy</Label>
        <Textarea
          id="travel_policy"
          placeholder="Describe your travel policy, additional fees, and coverage areas..."
          value={data.travel_policy}
          onChange={(e) => updateData('travel_policy', e.target.value)}
        />
      </div>
    </div>
  );
}

function PricingPackagesStep({
  data,
  updateData,
  errors,
  addPackage,
  removePackage,
}: any) {
  return (
    <div className="space-y-6">
      {/* Pricing Structure */}
      <div className="space-y-2">
        <Label>Pricing Structure</Label>
        <Select
          value={data.pricing_structure}
          onValueChange={(value) => updateData('pricing_structure', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select pricing structure" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hourly">Hourly Rate</SelectItem>
            <SelectItem value="package">Package Based</SelectItem>
            <SelectItem value="custom">Custom Quotes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Hourly Rate */}
      {data.pricing_structure === 'hourly' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="hourly_rate">Hourly Rate (£)</Label>
            <Input
              id="hourly_rate"
              type="number"
              min="0"
              value={data.hourly_rate}
              onChange={(e) =>
                updateData(
                  'hourly_rate',
                  e.target.value ? parseFloat(e.target.value) : '',
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minimum_spend">Minimum Spend (£)</Label>
            <Input
              id="minimum_spend"
              type="number"
              min="0"
              value={data.minimum_spend}
              onChange={(e) =>
                updateData(
                  'minimum_spend',
                  e.target.value ? parseFloat(e.target.value) : '',
                )
              }
            />
          </div>
        </div>
      )}

      {/* Packages */}
      {(data.pricing_structure === 'package' ||
        data.pricing_structure === 'custom') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Packages</Label>
            <Button type="button" size="sm" onClick={addPackage}>
              <Plus className="w-4 h-4 mr-2" />
              Add Package
            </Button>
          </div>

          {data.packages.map((pkg: any, index: number) => (
            <Card key={index} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-medium">Package {index + 1}</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePackage(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Package name"
                  value={pkg.name}
                  onChange={(e) => {
                    const newPackages = [...data.packages];
                    newPackages[index].name = e.target.value;
                    updateData('packages', newPackages);
                  }}
                />
                <Input
                  type="number"
                  placeholder="Price (£)"
                  value={pkg.price}
                  onChange={(e) => {
                    const newPackages = [...data.packages];
                    newPackages[index].price = parseFloat(e.target.value) || 0;
                    updateData('packages', newPackages);
                  }}
                />
                <div className="md:col-span-2">
                  <Textarea
                    placeholder="Package description"
                    value={pkg.description}
                    onChange={(e) => {
                      const newPackages = [...data.packages];
                      newPackages[index].description = e.target.value;
                      updateData('packages', newPackages);
                    }}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Payment Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="deposit_percentage">Deposit Percentage (%)</Label>
          <Input
            id="deposit_percentage"
            type="number"
            min="0"
            max="100"
            value={data.deposit_percentage}
            onChange={(e) =>
              updateData(
                'deposit_percentage',
                e.target.value ? parseFloat(e.target.value) : '',
              )
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_terms">Payment Terms</Label>
          <Textarea
            id="payment_terms"
            placeholder="Describe your payment terms..."
            value={data.payment_terms}
            onChange={(e) => updateData('payment_terms', e.target.value)}
          />
        </div>
      </div>

      {/* Cancellation Policy */}
      <div className="space-y-2">
        <Label htmlFor="cancellation_policy">Cancellation Policy</Label>
        <Textarea
          id="cancellation_policy"
          placeholder="Describe your cancellation policy..."
          value={data.cancellation_policy}
          onChange={(e) => updateData('cancellation_policy', e.target.value)}
        />
      </div>
    </div>
  );
}

function TeamContactStep({
  data,
  updateData,
  errors,
  addTeamMember,
  removeTeamMember,
}: any) {
  return (
    <div className="space-y-6">
      {/* Key Contact */}
      <div className="space-y-4">
        <h3 className="font-semibold">Primary Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="key_contact_name">Contact Name</Label>
            <Input
              id="key_contact_name"
              value={data.key_contact_name}
              onChange={(e) => updateData('key_contact_name', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="key_contact_role">Role</Label>
            <Input
              id="key_contact_role"
              value={data.key_contact_role}
              onChange={(e) => updateData('key_contact_role', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="key_contact_email">Email Address *</Label>
            <Input
              id="key_contact_email"
              type="email"
              value={data.key_contact_email}
              onChange={(e) => updateData('key_contact_email', e.target.value)}
              className={errors.key_contact_email ? 'border-red-500' : ''}
            />
            {errors.key_contact_email && (
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.key_contact_email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="key_contact_phone">Phone Number</Label>
            <Input
              id="key_contact_phone"
              value={data.key_contact_phone}
              onChange={(e) => updateData('key_contact_phone', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Team Members</h3>
          <Button type="button" size="sm" onClick={addTeamMember}>
            <Plus className="w-4 h-4 mr-2" />
            Add Team Member
          </Button>
        </div>

        {data.team_members.map((member: any, index: number) => (
          <Card key={index} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-medium">Team Member {index + 1}</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeTeamMember(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="Name"
                value={member.name}
                onChange={(e) => {
                  const newMembers = [...data.team_members];
                  newMembers[index].name = e.target.value;
                  updateData('team_members', newMembers);
                }}
              />
              <Input
                placeholder="Role"
                value={member.role}
                onChange={(e) => {
                  const newMembers = [...data.team_members];
                  newMembers[index].role = e.target.value;
                  updateData('team_members', newMembers);
                }}
              />
              <div className="md:col-span-2">
                <Textarea
                  placeholder="Bio"
                  value={member.bio}
                  onChange={(e) => {
                    const newMembers = [...data.team_members];
                    newMembers[index].bio = e.target.value;
                    updateData('team_members', newMembers);
                  }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Response Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold">Response Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Response Time Commitment</Label>
            <Select
              value={data.response_time_commitment}
              onValueChange={(value) =>
                updateData('response_time_commitment', value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select response time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="within_hour">Within 1 hour</SelectItem>
                <SelectItem value="within_day">Within 24 hours</SelectItem>
                <SelectItem value="within_2days">Within 2 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Preferred Contact Method</Label>
            <Select
              value={data.preferred_contact_method}
              onValueChange={(value) =>
                updateData('preferred_contact_method', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="platform">Platform Messages</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaGalleryStep({
  data,
  updateData,
  handleFileUpload,
  uploadingMedia,
}: any) {
  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'cover' | 'gallery',
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file, type);
    }
  };

  return (
    <div className="space-y-6">
      {/* Logo Upload */}
      <div className="space-y-2">
        <Label>Business Logo</Label>
        <div className="border-2 border-dashed border-muted-foreground rounded-lg p-6 text-center">
          {data.logo_url ? (
            <div className="space-y-2">
              <img
                src={data.logo_url}
                alt="Logo"
                className="w-24 h-24 object-cover mx-auto rounded"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateData('logo_url', '')}
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
              <div>
                <Label
                  htmlFor="logo-upload"
                  className="cursor-pointer text-primary hover:underline"
                >
                  Click to upload logo
                </Label>
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, 'logo')}
                  disabled={uploadingMedia}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cover Image Upload */}
      <div className="space-y-2">
        <Label>Cover Image</Label>
        <div className="border-2 border-dashed border-muted-foreground rounded-lg p-6 text-center">
          {data.cover_image_url ? (
            <div className="space-y-2">
              <img
                src={data.cover_image_url}
                alt="Cover"
                className="w-full h-32 object-cover rounded"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateData('cover_image_url', '')}
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
              <div>
                <Label
                  htmlFor="cover-upload"
                  className="cursor-pointer text-primary hover:underline"
                >
                  Click to upload cover image
                </Label>
                <Input
                  id="cover-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, 'cover')}
                  disabled={uploadingMedia}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gallery Images */}
      <div className="space-y-2">
        <Label>Portfolio Gallery</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.gallery_images.map((image: any, index: number) => (
            <div key={index} className="relative group">
              <img
                src={image.url}
                alt=""
                className="w-full h-24 object-cover rounded"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  const newImages = data.gallery_images.filter(
                    (_: any, i: number) => i !== index,
                  );
                  updateData('gallery_images', newImages);
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}

          {/* Add Image Button */}
          <div className="border-2 border-dashed border-muted-foreground rounded-lg h-24 flex items-center justify-center">
            <Label htmlFor="gallery-upload" className="cursor-pointer">
              <Plus className="w-6 h-6 text-muted-foreground" />
              <Input
                id="gallery-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e, 'gallery')}
                disabled={uploadingMedia}
              />
            </Label>
          </div>
        </div>
      </div>

      {uploadingMedia && (
        <div className="text-center text-muted-foreground">Uploading...</div>
      )}
    </div>
  );
}

function VerificationStep({ data, updateData, handleFileUpload }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">
          Verification Documents
        </h3>
        <p className="text-blue-700 text-sm mb-4">
          Upload the following documents to get your business verified. This
          helps build trust with potential clients.
        </p>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span className="text-sm">Business Insurance Certificate</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span className="text-sm">
              Professional License (if applicable)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span className="text-sm">Company Registration Certificate</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span className="text-sm">Professional Certifications</span>
          </div>
        </div>
      </div>

      <div className="border-2 border-dashed border-muted-foreground rounded-lg p-8 text-center">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h4 className="font-semibold mb-2">Upload Verification Documents</h4>
        <p className="text-muted-foreground mb-4">
          You can upload documents after creating your profile in the
          verification section.
        </p>
        <div className="text-sm text-muted-foreground">
          Supported formats: PDF, JPG, PNG (Max 10MB per file)
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-green-900 mb-2">
          Benefits of Verification
        </h4>
        <ul className="text-green-700 text-sm space-y-1">
          <li>• Verified badge on your profile</li>
          <li>• Higher search ranking</li>
          <li>• Increased client trust and inquiries</li>
          <li>• Access to premium features</li>
        </ul>
      </div>
    </div>
  );
}
