'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  CheckCircle,
  Clock,
  Sparkles,
  TrendingUp,
  Gift,
  AlertCircle,
  Zap,
  Target,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import { format, addDays } from 'date-fns';

interface ExtensionEligibility {
  isEligible: boolean;
  reasons: string[];
  score: number;
  maxExtensionDays: number;
  recommendedAction: 'extend' | 'convert' | 'contact_sales';
}

interface ExtensionOption {
  days: number;
  reason: string;
  requirements: string[];
  value: string;
}

interface TrialExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtend?: (days: number, reason: string) => void;
  onConvert?: () => void;
  currentTrialEndDate: string;
  daysRemaining: number;
  userId: string;
}

export const TrialExtensionModal: React.FC<TrialExtensionModalProps> = ({
  isOpen,
  onClose,
  onExtend,
  onConvert,
  currentTrialEndDate,
  daysRemaining,
  userId,
}) => {
  const [eligibility, setEligibility] = useState<ExtensionEligibility | null>(
    null,
  );
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [extending, setExtending] = useState(false);
  const [extensionReason, setExtensionReason] = useState('');

  const extensionOptions: ExtensionOption[] = [
    {
      days: 7,
      reason: 'need_more_evaluation',
      requirements: ['Complete profile setup', 'Add at least one wedding'],
      value: '7_evaluation',
    },
    {
      days: 14,
      reason: 'pending_approval',
      requirements: [
        'Waiting for team/budget approval',
        'Active usage in last 7 days',
      ],
      value: '14_approval',
    },
    {
      days: 7,
      reason: 'technical_setup',
      requirements: [
        'Need time for integration',
        'Technical requirements review',
      ],
      value: '7_technical',
    },
  ];

  useEffect(() => {
    if (isOpen) {
      checkExtensionEligibility();
    }
  }, [isOpen]);

  const checkExtensionEligibility = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/trial/extension/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      setEligibility(data);
    } catch (error) {
      console.error('Error checking eligibility:', error);
      // Mock data for demonstration
      setEligibility({
        isEligible: true,
        reasons: [
          'Active usage in the last 7 days',
          'High engagement score (85%)',
          'No previous extensions',
        ],
        score: 85,
        maxExtensionDays: 14,
        recommendedAction: 'extend',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExtension = async () => {
    if (!selectedOption) {
      toast({
        title: 'Please select an extension option',
        variant: 'destructive',
      });
      return;
    }

    const option = extensionOptions.find((opt) => opt.value === selectedOption);
    if (!option) return;

    setExtending(true);
    try {
      const response = await fetch('/api/trial/extension/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          extensionDays: option.days,
          reason: option.reason,
          currentEndDate: currentTrialEndDate,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const newEndDate = addDays(new Date(currentTrialEndDate), option.days);

        toast({
          title: 'Trial Extended Successfully!',
          description: `Your trial has been extended until ${format(newEndDate, 'MMMM d, yyyy')}`,
        });

        // Track extension
        await trackExtension(option.days, option.reason);

        if (onExtend) {
          onExtend(option.days, option.reason);
        }
        onClose();
      } else {
        throw new Error(data.error || 'Extension failed');
      }
    } catch (error) {
      console.error('Extension error:', error);
      toast({
        title: 'Extension Failed',
        description: 'Unable to extend your trial. Please contact support.',
        variant: 'destructive',
      });
    } finally {
      setExtending(false);
    }
  };

  const trackExtension = async (days: number, reason: string) => {
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'trial_extended',
          properties: {
            extension_days: days,
            reason: reason,
            days_remaining: daysRemaining,
            eligibility_score: eligibility?.score,
          },
        }),
      });
    } catch (error) {
      console.error('Error tracking extension:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'Highly Engaged';
    if (score >= 60) return 'Moderately Engaged';
    return 'Low Engagement';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            Trial Extension Options
          </DialogTitle>
          <DialogDescription>
            Your trial ends in {daysRemaining} days. Based on your usage, you
            may be eligible for an extension.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : eligibility ? (
            <>
              {/* Eligibility Status */}
              <Card
                className={`p-4 ${eligibility.isEligible ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
              >
                <div className="flex items-start gap-3">
                  {eligibility.isEligible ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold mb-1">
                      {eligibility.isEligible
                        ? "You're Eligible for an Extension!"
                        : 'Extension Not Available'}
                    </div>
                    <div className="text-sm text-gray-600">
                      <ul className="space-y-1">
                        {eligibility.reasons.map((reason, index) => (
                          <li key={index} className="flex items-center gap-1">
                            <span className="text-xs">•</span> {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-2xl font-bold ${getScoreColor(eligibility.score)}`}
                    >
                      {eligibility.score}%
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {getScoreBadge(eligibility.score)}
                    </Badge>
                  </div>
                </div>
              </Card>

              {eligibility.isEligible && (
                <>
                  {/* Extension Options */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-gray-700">
                      Select Extension Option
                    </h4>
                    <RadioGroup
                      value={selectedOption}
                      onValueChange={setSelectedOption}
                    >
                      {extensionOptions.map((option) => (
                        <motion.div
                          key={option.value}
                          whileHover={{ scale: 1.01 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          <Card
                            className={`p-4 cursor-pointer transition-all ${
                              selectedOption === option.value
                                ? 'border-purple-500 bg-purple-50'
                                : 'hover:border-gray-300'
                            }`}
                          >
                            <Label
                              htmlFor={option.value}
                              className="cursor-pointer"
                            >
                              <div className="flex items-start gap-3">
                                <RadioGroupItem
                                  value={option.value}
                                  id={option.value}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold">
                                      {option.days} Day Extension
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      Until{' '}
                                      {format(
                                        addDays(
                                          new Date(currentTrialEndDate),
                                          option.days,
                                        ),
                                        'MMM d',
                                      )}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-gray-600 mb-2">
                                    {option.reason
                                      .replace(/_/g, ' ')
                                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Requirements:
                                    <ul className="mt-1 space-y-0.5">
                                      {option.requirements.map((req, idx) => (
                                        <li
                                          key={idx}
                                          className="flex items-center gap-1"
                                        >
                                          <CheckCircle className="h-3 w-3 text-green-500" />
                                          {req}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </Label>
                          </Card>
                        </motion.div>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Alternative Actions */}
                  <Alert className="bg-blue-50 border-blue-200">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <AlertDescription>
                      <strong>Pro Tip:</strong> Converting to a paid plan now
                      gives you immediate access to all features and locks in
                      our current pricing. You'll also get a{' '}
                      <span className="font-semibold text-blue-700">
                        20% discount
                      </span>{' '}
                      for the first 3 months!
                    </AlertDescription>
                  </Alert>
                </>
              )}

              {!eligibility.isEligible && (
                <div className="space-y-4">
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription>
                      While you're not eligible for an automatic extension, you
                      have other great options:
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-3">
                    <Card
                      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={onConvert}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Zap className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">
                            Convert to Paid Plan
                          </div>
                          <div className="text-sm text-gray-600">
                            Get full access immediately with our special trial
                            discount
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">Contact Sales</div>
                          <div className="text-sm text-gray-600">
                            Discuss custom options or enterprise plans
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {eligibility?.isEligible ? (
            <>
              <Button
                variant="outline"
                onClick={onConvert}
                className="text-purple-600 border-purple-600 hover:bg-purple-50"
              >
                Convert Instead
              </Button>
              <Button
                onClick={handleExtension}
                disabled={!selectedOption || extending}
              >
                {extending ? 'Extending...' : 'Request Extension'}
              </Button>
            </>
          ) : (
            <Button onClick={onConvert}>Convert to Paid Plan</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
