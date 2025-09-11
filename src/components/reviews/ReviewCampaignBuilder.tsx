'use client';

import { useState, useTransition, useOptimistic, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRightIcon, PlusIcon, TrashIcon, EyeIcon } from 'lucide-react';
import {
  reviewCampaignSchema,
  type ReviewCampaignFormData,
} from '@/lib/validations/review-schemas';
import { createReviewCampaign } from '@/app/api/reviews/campaigns/create/action';
import { MessageTemplateEditor } from './MessageTemplateEditor';
import { CampaignPreview } from './CampaignPreview';
import { PlatformToggle } from './PlatformToggle';

interface ReviewCampaignBuilderProps {
  clientId?: string;
  existingCampaign?: Partial<ReviewCampaignFormData>;
  onSave?: (campaign: ReviewCampaignFormData) => void;
  onCancel?: () => void;
}

export function ReviewCampaignBuilder({
  clientId,
  existingCampaign,
  onSave,
  onCancel,
}: ReviewCampaignBuilderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPreview, setShowPreview] = useState(false);

  // Form state with React 19 useOptimistic for immediate UI feedback
  const [optimisticCampaign, setOptimisticCampaign] = useOptimistic(
    existingCampaign || {
      name: '',
      delay_days: 7,
      message_template: '',
      platforms: [],
      incentive_type: 'none',
      incentive_value: '',
      active: true,
    },
  );

  // Form action state management
  const [actionState, formAction] = useActionState(
    async (prevState: any, formData: FormData) => {
      const rawData = {
        name: formData.get('name') as string,
        delay_days: parseInt(formData.get('delay_days') as string),
        message_template: formData.get('message_template') as string,
        platforms: JSON.parse((formData.get('platforms') as string) || '[]'),
        incentive_type: formData.get('incentive_type') as string,
        incentive_value: formData.get('incentive_value') as string,
        active: formData.get('active') === 'true',
        client_id: clientId,
      };

      const result = reviewCampaignSchema.safeParse(rawData);
      if (!result.success) {
        return {
          success: false,
          errors: result.error.flatten().fieldErrors,
          message: 'Please fix the validation errors below',
        };
      }

      try {
        const campaign = await createReviewCampaign(result.data);
        if (onSave) {
          onSave(campaign);
        } else {
          router.push('/reviews/campaigns');
        }
        return {
          success: true,
          message: 'Campaign created successfully!',
          data: campaign,
        };
      } catch (error) {
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Failed to create campaign',
        };
      }
    },
    null,
  );

  const handleFieldChange = (field: string, value: any) => {
    setOptimisticCampaign((prev) => ({ ...prev, [field]: value }));
  };

  const handlePlatformToggle = (platform: string, enabled: boolean) => {
    const newPlatforms = enabled
      ? [...(optimisticCampaign.platforms || []), platform]
      : (optimisticCampaign.platforms || []).filter((p) => p !== platform);

    handleFieldChange('platforms', newPlatforms);
  };

  const handleSubmit = (formData: FormData) => {
    startTransition(() => {
      formAction(formData);
    });
  };

  const PLATFORM_OPTIONS = [
    {
      id: 'google',
      name: 'Google Business',
      icon: '🌟',
      description: 'Google My Business reviews',
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: '👍',
      description: 'Facebook page reviews',
    },
    {
      id: 'yelp',
      name: 'Yelp',
      icon: '📝',
      description: 'Yelp business reviews',
    },
    {
      id: 'weddingwire',
      name: 'WeddingWire',
      icon: '💍',
      description: 'WeddingWire vendor reviews',
    },
    {
      id: 'theknot',
      name: 'The Knot',
      icon: '🎗️',
      description: 'The Knot vendor reviews',
    },
  ];

  const INCENTIVE_OPTIONS = [
    { value: 'none', label: 'No Incentive' },
    { value: 'discount', label: 'Discount' },
    { value: 'gift', label: 'Free Gift' },
    { value: 'referral', label: 'Referral Bonus' },
  ];

  const DELAY_OPTIONS = [
    { value: 1, label: '1 day after wedding' },
    { value: 3, label: '3 days after wedding' },
    { value: 7, label: '1 week after wedding' },
    { value: 14, label: '2 weeks after wedding' },
    { value: 30, label: '1 month after wedding' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {existingCampaign ? 'Edit Campaign' : 'Create Review Campaign'}
            </h1>
            <p className="text-gray-600 mt-1">
              Set up automated review requests to collect more testimonials
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all duration-200"
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <form action={handleSubmit}>
            {/* Campaign Name */}
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-900"
              >
                Campaign Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={optimisticCampaign.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
                placeholder="e.g., Post-Wedding Reviews"
              />
              {actionState?.errors?.name && (
                <p className="text-sm text-error-600">
                  {actionState.errors.name[0]}
                </p>
              )}
            </div>

            {/* Timing Configuration */}
            <div className="space-y-2">
              <label
                htmlFor="delay_days"
                className="block text-sm font-medium text-gray-900"
              >
                Send Review Request
              </label>
              <select
                id="delay_days"
                name="delay_days"
                value={optimisticCampaign.delay_days}
                onChange={(e) =>
                  handleFieldChange('delay_days', parseInt(e.target.value))
                }
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
              >
                {DELAY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                Optimal timing: 7-14 days when couples are happiest with their
                memories
              </p>
            </div>

            {/* Platform Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-900">
                Review Platforms
              </label>
              <div className="grid grid-cols-1 gap-2">
                {PLATFORM_OPTIONS.map((platform) => (
                  <PlatformToggle
                    key={platform.id}
                    platform={platform}
                    enabled={(optimisticCampaign.platforms || []).includes(
                      platform.id,
                    )}
                    onChange={(enabled) =>
                      handlePlatformToggle(platform.id, enabled)
                    }
                  />
                ))}
              </div>
              <input
                type="hidden"
                name="platforms"
                value={JSON.stringify(optimisticCampaign.platforms)}
              />
              {actionState?.errors?.platforms && (
                <p className="text-sm text-error-600">
                  {actionState.errors.platforms[0]}
                </p>
              )}
            </div>

            {/* Message Template */}
            <div className="space-y-2">
              <label
                htmlFor="message_template"
                className="block text-sm font-medium text-gray-900"
              >
                Review Request Message
              </label>
              <MessageTemplateEditor
                value={optimisticCampaign.message_template}
                onChange={(value) =>
                  handleFieldChange('message_template', value)
                }
                clientName="Emma & Mike" // Example for preview
              />
              <input
                type="hidden"
                name="message_template"
                value={optimisticCampaign.message_template}
              />
              {actionState?.errors?.message_template && (
                <p className="text-sm text-error-600">
                  {actionState.errors.message_template[0]}
                </p>
              )}
            </div>

            {/* Incentive Configuration */}
            <div className="space-y-3">
              <label
                htmlFor="incentive_type"
                className="block text-sm font-medium text-gray-900"
              >
                Review Incentive (Optional)
              </label>
              <select
                id="incentive_type"
                name="incentive_type"
                value={optimisticCampaign.incentive_type}
                onChange={(e) =>
                  handleFieldChange('incentive_type', e.target.value)
                }
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
              >
                {INCENTIVE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {optimisticCampaign.incentive_type !== 'none' && (
                <input
                  type="text"
                  name="incentive_value"
                  placeholder={
                    optimisticCampaign.incentive_type === 'discount'
                      ? 'e.g., 10% off next session'
                      : optimisticCampaign.incentive_type === 'gift'
                        ? 'e.g., Free engagement print'
                        : 'e.g., $50 credit for referrals'
                  }
                  value={optimisticCampaign.incentive_value}
                  onChange={(e) =>
                    handleFieldChange('incentive_value', e.target.value)
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
                />
              )}
            </div>

            {/* Campaign Status */}
            <div className="flex items-center justify-between">
              <label
                htmlFor="active"
                className="text-sm font-medium text-gray-900"
              >
                Campaign Status
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="active"
                  name="active"
                  checked={optimisticCampaign.active}
                  onChange={(e) =>
                    handleFieldChange('active', e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                <span className="ml-3 text-sm font-medium text-gray-900">
                  {optimisticCampaign.active ? 'Active' : 'Paused'}
                </span>
              </label>
              <input
                type="hidden"
                name="active"
                value={optimisticCampaign.active.toString()}
              />
            </div>

            {/* Error Message */}
            {actionState?.message && !actionState.success && (
              <div className="rounded-lg bg-error-50 p-4 border border-error-200">
                <p className="text-sm text-error-700">{actionState.message}</p>
              </div>
            )}

            {/* Success Message */}
            {actionState?.message && actionState.success && (
              <div className="rounded-lg bg-success-50 p-4 border border-success-200">
                <p className="text-sm text-success-700">
                  {actionState.message}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all duration-200"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2 inline-block"></div>
                    {existingCampaign ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {existingCampaign ? 'Update Campaign' : 'Create Campaign'}
                    <ChevronRightIcon className="h-4 w-4 ml-2 inline-block" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="lg:sticky lg:top-6">
            <CampaignPreview
              campaign={optimisticCampaign}
              clientName="Emma & Mike"
              weddingDate="2024-06-15"
              venue="Sunset Manor"
            />
          </div>
        )}
      </div>
    </div>
  );
}
