'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  WeddingBasicsSchema,
  WeddingBasicsRequest,
  WeddingBasicsData,
  getWeddingDateWarnings,
  getGuestCountRecommendations,
} from '@/lib/validations/wedding-basics';
import { VenueAutocomplete } from './VenueAutocomplete';
import { GuestCountSelector } from './GuestCountSelector';
import { WeddingStyleSelector } from './WeddingStyleSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  MapPin,
  Users,
  Palette,
  Save,
  ArrowRight,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface WeddingBasicsFormProps {
  initialData?: WeddingBasicsData | null;
  onSubmit: (data: WeddingBasicsRequest) => Promise<void>;
  onSaveDraft: (data: Partial<WeddingBasicsRequest>) => Promise<void>;
  isSubmitting?: boolean;
  disabled?: boolean;
}

export function WeddingBasicsForm({
  initialData,
  onSubmit,
  onSaveDraft,
  isSubmitting = false,
  disabled = false,
}: WeddingBasicsFormProps) {
  const [sameVenue, setSameVenue] = useState(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [dateWarnings, setDateWarnings] = useState<string[]>([]);
  const [guestRecommendations, setGuestRecommendations] = useState<string[]>(
    [],
  );

  const form = useForm<WeddingBasicsRequest>({
    resolver: zodResolver(WeddingBasicsSchema),
    defaultValues: {
      weddingDate: initialData?.weddingDate || '',
      ceremonyVenue: initialData?.ceremonyVenue || { name: '', address: '' },
      receptionVenue: initialData?.receptionVenue || {
        name: '',
        address: '',
        sameAsCeremony: true,
      },
      guestCountEstimated: initialData?.guestCountEstimated || 100,
      weddingStyle: initialData?.weddingStyle || [],
    },
    mode: 'onBlur',
  });

  // Auto-save functionality
  const watchedValues = form.watch();
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!disabled && !isSubmitting) {
        setAutoSaveStatus('saving');
        onSaveDraft(watchedValues)
          .then(() => setAutoSaveStatus('saved'))
          .catch(() => setAutoSaveStatus('error'))
          .finally(() => {
            setTimeout(() => setAutoSaveStatus('idle'), 2000);
          });
      }
    }, 3000); // Auto-save after 3 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [watchedValues, onSaveDraft, disabled, isSubmitting]);

  // Wedding date validation and warnings
  const weddingDate = form.watch('weddingDate');
  useEffect(() => {
    if (weddingDate) {
      try {
        const warnings = getWeddingDateWarnings(weddingDate);
        setDateWarnings(warnings);
      } catch (error) {
        setDateWarnings([]);
      }
    } else {
      setDateWarnings([]);
    }
  }, [weddingDate]);

  // Guest count recommendations
  const guestCount = form.watch('guestCountEstimated');
  useEffect(() => {
    if (guestCount > 0) {
      const recommendations = getGuestCountRecommendations(guestCount);
      setGuestRecommendations(recommendations);
    } else {
      setGuestRecommendations([]);
    }
  }, [guestCount]);

  // Handle same venue checkbox
  const handleSameVenueChange = (checked: boolean) => {
    setSameVenue(checked);
    if (checked) {
      const ceremonyVenue = form.getValues('ceremonyVenue');
      form.setValue('receptionVenue', {
        ...ceremonyVenue,
        sameAsCeremony: true,
      });
    } else {
      form.setValue('receptionVenue', {
        name: '',
        address: '',
        sameAsCeremony: false,
      });
    }
  };

  // Form submission
  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  });

  // Get minimum date (30 days from today)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 30);
  const minDateString = minDate.toISOString().split('T')[0];

  // Get maximum date (3 years from today)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 3);
  const maxDateString = maxDate.toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Auto-save status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>
            {autoSaveStatus === 'saving' && 'Saving...'}
            {autoSaveStatus === 'saved' && (
              <span className="text-green-600 flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Saved
              </span>
            )}
            {autoSaveStatus === 'error' && (
              <span className="text-red-600">Save failed</span>
            )}
            {autoSaveStatus === 'idle' && 'Auto-save enabled'}
          </span>
        </div>
      </div>

      {/* Wedding Date Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-pink-500" />
            Wedding Date
          </CardTitle>
          <CardDescription>
            When is your special day? This helps us create your timeline and
            find available vendors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="weddingDate">Wedding Date *</Label>
            <Input
              id="weddingDate"
              type="date"
              min={minDateString}
              max={maxDateString}
              disabled={disabled}
              {...form.register('weddingDate')}
              className="mt-1"
            />
            {form.formState.errors.weddingDate && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.weddingDate.message}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Wedding must be at least 30 days in the future
            </p>
          </div>

          {/* Date Warnings */}
          {dateWarnings.length > 0 && (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {dateWarnings.map((warning, index) => (
                    <p key={index} className="text-sm">
                      {warning}
                    </p>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Venue Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-blue-500" />
            Wedding Venues
          </CardTitle>
          <CardDescription>
            Where will you celebrate? We'll use this to find nearby vendors and
            calculate logistics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ceremony Venue */}
          <div>
            <Label className="text-base font-medium">Ceremony Venue *</Label>
            <p className="text-sm text-gray-600 mb-3">
              Where will you exchange vows?
            </p>
            <VenueAutocomplete
              value={form.watch('ceremonyVenue')}
              onChange={(venue) => {
                form.setValue('ceremonyVenue', venue);
                if (sameVenue) {
                  form.setValue('receptionVenue', {
                    ...venue,
                    sameAsCeremony: true,
                  });
                }
              }}
              placeholder="Search for your ceremony venue..."
              disabled={disabled}
            />
            {form.formState.errors.ceremonyVenue && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.ceremonyVenue.message}
              </p>
            )}
          </div>

          {/* Same Venue Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="same-venue"
              checked={sameVenue}
              onCheckedChange={handleSameVenueChange}
              disabled={disabled}
            />
            <Label htmlFor="same-venue" className="text-sm font-normal">
              Reception is at the same location as ceremony
            </Label>
          </div>

          {/* Reception Venue */}
          {!sameVenue && (
            <div>
              <Label className="text-base font-medium">Reception Venue *</Label>
              <p className="text-sm text-gray-600 mb-3">
                Where will you celebrate with dinner and dancing?
              </p>
              <VenueAutocomplete
                value={
                  form.watch('receptionVenue') || { name: '', address: '' }
                }
                onChange={(venue) => {
                  form.setValue('receptionVenue', {
                    ...venue,
                    sameAsCeremony: false,
                  });
                }}
                placeholder="Search for your reception venue..."
                disabled={disabled}
              />
              {form.formState.errors.receptionVenue && (
                <p className="mt-1 text-sm text-red-600">
                  {form.formState.errors.receptionVenue.message}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guest Count Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-green-500" />
            Guest Count
          </CardTitle>
          <CardDescription>
            Approximately how many guests will attend? This helps us match you
            with appropriately sized vendors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base font-medium">
              Estimated Guest Count *
            </Label>
            <div className="mt-3">
              <GuestCountSelector
                value={form.watch('guestCountEstimated')}
                onChange={(count) =>
                  form.setValue('guestCountEstimated', count)
                }
                disabled={disabled}
              />
            </div>
            {form.formState.errors.guestCountEstimated && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.guestCountEstimated.message}
              </p>
            )}
          </div>

          {/* Guest Count Recommendations */}
          {guestRecommendations.length > 0 && (
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {guestRecommendations.map((recommendation, index) => (
                    <p key={index} className="text-sm">
                      {recommendation}
                    </p>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Wedding Style Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Palette className="w-5 h-5 mr-2 text-purple-500" />
            Wedding Style
          </CardTitle>
          <CardDescription>
            What's your wedding vibe? Select all styles that resonate with your
            vision.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base font-medium">Wedding Styles *</Label>
            <p className="text-sm text-gray-600 mb-3">
              Choose 1-5 styles that match your dream wedding
            </p>
            <WeddingStyleSelector
              selectedStyles={form.watch('weddingStyle')}
              onChange={(styles) => form.setValue('weddingStyle', styles)}
              disabled={disabled}
            />
            {form.formState.errors.weddingStyle && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.weddingStyle.message}
              </p>
            )}
          </div>

          {/* Selected Styles */}
          {form.watch('weddingStyle').length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Selected styles:
              </p>
              <div className="flex flex-wrap gap-2">
                {form.watch('weddingStyle').map((style) => (
                  <Badge key={style} variant="secondary">
                    {style}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Section */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
          disabled={disabled || isSubmitting}
        >
          ← Back
        </Button>

        <div className="flex items-center space-x-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onSaveDraft(form.getValues())}
            disabled={disabled || isSubmitting}
          >
            <Save className="w-4 h-4 mr-2" />
            Save & Continue Later
          </Button>

          <Button
            type="submit"
            disabled={disabled || isSubmitting || !form.formState.isValid}
            className="min-w-[140px]"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
