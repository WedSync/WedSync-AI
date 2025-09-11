'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  PlusIcon,
  TrashIcon,
  GiftIcon,
  CurrencyDollarIcon,
  PercentBadgeIcon,
  SparklesIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import { toast } from '@/lib/toast-helper';
import { z } from 'zod';

interface ReferralProgram {
  id?: string;
  name: string;
  rewardType: 'monetary' | 'percentage' | 'upgrade' | 'custom';
  referrerRewardAmount: number;
  refereeRewardAmount: number;
  milestoneRewards?: Record<number, number>;
  attributionWindowDays: number;
  expiresAt?: string;
}

interface ReferralProgramBuilderProps {
  supplierId: string;
  onProgramCreated: (program: ReferralProgram) => void;
  initialProgram?: ReferralProgram;
}

const programSchema = z.object({
  name: z.string().min(1, 'Program name is required').max(100),
  rewardType: z.enum(['monetary', 'percentage', 'upgrade', 'custom']),
  referrerRewardAmount: z.number().min(0, 'Referrer reward must be positive'),
  refereeRewardAmount: z.number().min(0, 'Referee reward must be positive'),
  milestoneRewards: z.record(z.string(), z.number()).optional(),
  attributionWindowDays: z.number().min(1).max(365),
  expiresAt: z.string().optional(),
});

export function ReferralProgramBuilder({
  supplierId,
  onProgramCreated,
  initialProgram,
}: ReferralProgramBuilderProps) {
  const [formData, setFormData] = useState<ReferralProgram>({
    name: '',
    rewardType: 'monetary',
    referrerRewardAmount: 50,
    refereeRewardAmount: 25,
    milestoneRewards: {},
    attributionWindowDays: 90,
    expiresAt: '',
    ...initialProgram,
  });

  const [milestones, setMilestones] = useState<
    Array<{ referrals: number; reward: number }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState({
    emailTemplate: '',
    landingPagePreview: '',
    socialShareText: '',
  });

  useEffect(() => {
    // Convert milestone rewards object to array for easier editing
    if (formData.milestoneRewards) {
      const milestoneArray = Object.entries(formData.milestoneRewards).map(
        ([referrals, reward]) => ({
          referrals: parseInt(referrals),
          reward: reward,
        }),
      );
      setMilestones(milestoneArray);
    }
  }, [formData.milestoneRewards]);

  useEffect(() => {
    // Generate preview content when form data changes
    generatePreviews();
  }, [formData]);

  const generatePreviews = () => {
    const rewardText =
      formData.rewardType === 'monetary'
        ? `$${formData.referrerRewardAmount}`
        : `${formData.referrerRewardAmount}%`;

    const emailTemplate = `
Hi {{couple_name}},

We hope you loved working with us for your special day! 

We'd love to help more couples like you create their perfect wedding. For every friend you refer who books with us, you'll receive ${rewardText} and they'll get $${formData.refereeRewardAmount} off their package.

Use your unique referral code: {{referral_code}}

Share your code: {{landing_page_url}}

Thanks for spreading the love!
{{supplier_name}}
    `.trim();

    const socialShareText = `Just had the most amazing wedding experience with {{supplier_name}}! 💍✨ Use my referral code {{referral_code}} and save $${formData.refereeRewardAmount} on your wedding package. Both you and I get rewarded! {{landing_page_url}} #WeddingPlanning`;

    setPreview({
      emailTemplate,
      landingPagePreview: `Welcome! You've been referred by a happy couple. Save $${formData.refereeRewardAmount} on your ${formData.rewardType === 'monetary' ? 'wedding' : 'package'}.`,
      socialShareText,
    });
  };

  const addMilestone = () => {
    setMilestones((prev) => [...prev, { referrals: 5, reward: 100 }]);
  };

  const removeMilestone = (index: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMilestone = (
    index: number,
    field: 'referrals' | 'reward',
    value: number,
  ) => {
    setMilestones((prev) =>
      prev.map((milestone, i) =>
        i === index ? { ...milestone, [field]: value } : milestone,
      ),
    );
  };

  const validateForm = () => {
    try {
      const milestoneRewards = milestones.reduce(
        (acc, milestone) => {
          acc[milestone.referrals] = milestone.reward;
          return acc;
        },
        {} as Record<number, number>,
      );

      programSchema.parse({
        ...formData,
        milestoneRewards,
      });

      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the form errors before submitting.');
      return;
    }

    setIsLoading(true);

    try {
      const milestoneRewards = milestones.reduce(
        (acc, milestone) => {
          acc[milestone.referrals] = milestone.reward;
          return acc;
        },
        {} as Record<number, number>,
      );

      const programData = {
        ...formData,
        milestoneRewards:
          Object.keys(milestoneRewards).length > 0
            ? milestoneRewards
            : undefined,
      };

      const response = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(programData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create referral program');
      }

      const createdProgram = await response.json();
      toast.success('Referral program created successfully!');
      onProgramCreated(createdProgram);
    } catch (error) {
      console.error('Error creating referral program:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to create referral program',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const RewardTypeIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'monetary':
        return <CurrencyDollarIcon className="h-5 w-5" />;
      case 'percentage':
        return <PercentBadgeIcon className="h-5 w-5" />;
      case 'upgrade':
        return <SparklesIcon className="h-5 w-5" />;
      case 'custom':
        return <GiftIcon className="h-5 w-5" />;
      default:
        return <GiftIcon className="h-5 w-5" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Create Referral Program
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Build a powerful referral program that turns your happy couples into
          your best marketing team. Configure rewards, set milestones, and watch
          your business grow through word-of-mouth.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Program Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <GiftIcon className="h-6 w-6 text-purple-600" />
            Program Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Program Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Friend Referral Program"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="attributionWindowDays">
                Attribution Window (Days)
              </Label>
              <Input
                id="attributionWindowDays"
                type="number"
                value={formData.attributionWindowDays}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    attributionWindowDays: parseInt(e.target.value) || 90,
                  }))
                }
                min="1"
                max="365"
                className={errors.attributionWindowDays ? 'border-red-500' : ''}
              />
              {errors.attributionWindowDays && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.attributionWindowDays}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                How long after clicking a referral link can someone convert?
              </p>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="expiresAt">
                Program Expiration Date (Optional)
              </Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    expiresAt: e.target.value,
                  }))
                }
                className={errors.expiresAt ? 'border-red-500' : ''}
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave empty for no expiration
              </p>
            </div>
          </div>
        </Card>

        {/* Reward Configuration */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            Reward Configuration
          </h2>

          <div className="space-y-6">
            {/* Reward Type Selector */}
            <div>
              <Label>Reward Type</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                {[
                  {
                    value: 'monetary',
                    label: 'Money',
                    description: 'Cash rewards',
                  },
                  {
                    value: 'percentage',
                    label: 'Percentage',
                    description: 'Discount %',
                  },
                  {
                    value: 'upgrade',
                    label: 'Upgrade',
                    description: 'Service upgrade',
                  },
                  {
                    value: 'custom',
                    label: 'Custom',
                    description: 'Other rewards',
                  },
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        rewardType: type.value as any,
                      }))
                    }
                    className={`p-4 border rounded-lg text-left transition-all hover:shadow-md ${
                      formData.rewardType === type.value
                        ? 'border-purple-500 bg-purple-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <RewardTypeIcon type={type.value} />
                      <span className="font-medium">{type.label}</span>
                    </div>
                    <p className="text-sm text-gray-500">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Reward Amounts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="referrerReward">Referrer Reward</Label>
                <div className="relative">
                  {formData.rewardType === 'monetary' && (
                    <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  )}
                  <Input
                    id="referrerReward"
                    type="number"
                    value={formData.referrerRewardAmount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        referrerRewardAmount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    min="0"
                    step="0.01"
                    className={`${formData.rewardType === 'monetary' ? 'pl-10' : ''} ${errors.referrerRewardAmount ? 'border-red-500' : ''}`}
                  />
                  {formData.rewardType === 'percentage' && (
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      %
                    </span>
                  )}
                </div>
                {errors.referrerRewardAmount && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.referrerRewardAmount}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Reward for the person making the referral
                </p>
              </div>

              <div>
                <Label htmlFor="refereeReward">Referee Reward</Label>
                <div className="relative">
                  {formData.rewardType === 'monetary' && (
                    <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  )}
                  <Input
                    id="refereeReward"
                    type="number"
                    value={formData.refereeRewardAmount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        refereeRewardAmount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    min="0"
                    step="0.01"
                    className={`${formData.rewardType === 'monetary' ? 'pl-10' : ''} ${errors.refereeRewardAmount ? 'border-red-500' : ''}`}
                  />
                  {formData.rewardType === 'percentage' && (
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      %
                    </span>
                  )}
                </div>
                {errors.refereeRewardAmount && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.refereeRewardAmount}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Reward for the person being referred
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Milestone Rewards */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <SparklesIcon className="h-6 w-6 text-yellow-600" />
            Milestone Rewards
          </h2>
          <p className="text-gray-600 mb-4">
            Reward referrers when they reach certain referral milestones
          </p>

          <div className="space-y-4">
            {milestones.map((milestone, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <Label>After</Label>
                  <Input
                    type="number"
                    value={milestone.referrals}
                    onChange={(e) =>
                      updateMilestone(
                        index,
                        'referrals',
                        parseInt(e.target.value) || 0,
                      )
                    }
                    min="1"
                    className="w-20"
                  />
                  <span className="text-sm text-gray-500 ml-2">referrals</span>
                </div>
                <div className="flex-1">
                  <Label>Bonus Reward</Label>
                  <div className="relative">
                    {formData.rewardType === 'monetary' && (
                      <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    )}
                    <Input
                      type="number"
                      value={milestone.reward}
                      onChange={(e) =>
                        updateMilestone(
                          index,
                          'reward',
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      min="0"
                      step="0.01"
                      className={
                        formData.rewardType === 'monetary' ? 'pl-10' : ''
                      }
                    />
                    {formData.rewardType === 'percentage' && (
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        %
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeMilestone(index)}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addMilestone}
              className="w-full"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Milestone Reward
            </Button>
          </div>
        </Card>

        {/* Preview Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <ClipboardDocumentIcon className="h-6 w-6 text-blue-600" />
            Preview
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Email Template Preview</h3>
              <Textarea
                value={preview.emailTemplate}
                readOnly
                rows={8}
                className="bg-gray-50 text-sm"
              />
            </div>

            <div>
              <h3 className="font-medium mb-2">Social Share Text</h3>
              <Textarea
                value={preview.socialShareText}
                readOnly
                rows={4}
                className="bg-gray-50 text-sm"
              />

              <h3 className="font-medium mt-4 mb-2">Landing Page Message</h3>
              <div className="p-4 bg-gray-50 rounded-md text-sm">
                {preview.landingPagePreview}
              </div>
            </div>
          </div>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline">
            Save Draft
          </Button>
          <Button type="submit" loading={isLoading} variant="primary">
            Create Program
          </Button>
        </div>
      </form>
    </div>
  );
}
