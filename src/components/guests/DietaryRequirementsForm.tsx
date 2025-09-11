'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import { debounce } from 'lodash';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  InformationCircleIcon,
  HeartIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/utils/toast';
import { cn } from '@/lib/utils';

interface DietaryFormData {
  allergies: {
    peanuts: boolean;
    tree_nuts: boolean;
    milk: boolean;
    eggs: boolean;
    wheat: boolean;
    soy: boolean;
    fish: boolean;
    shellfish: boolean;
    sesame: boolean;
  };
  preferences: {
    vegetarian: boolean;
    vegan: boolean;
    kosher: boolean;
    halal: boolean;
    gluten_free: boolean;
    dairy_free: boolean;
    low_sodium: boolean;
    diabetic: boolean;
  };
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  epipen_required: boolean;
  emergency_contact: string;
  medical_notes: string;
  caterer_instructions: string;
}

interface DietaryRequirementsFormProps {
  guestId: string;
  guestName?: string;
  onSave?: (data: DietaryFormData) => void;
  onExport?: () => void;
}

const SEVERITY_CONFIG = {
  mild: {
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: InformationCircleIcon,
    label: 'Mild',
    description: 'Preference or minor discomfort',
  },
  moderate: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: ExclamationTriangleIcon,
    label: 'Moderate',
    description: 'Causes digestive issues',
  },
  severe: {
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: ShieldExclamationIcon,
    label: 'Severe',
    description: 'Significant health issues',
  },
  life_threatening: {
    color: 'bg-red-100 text-red-800 border-red-500',
    icon: ShieldExclamationIcon,
    label: 'Life Threatening',
    description: 'Can cause anaphylaxis or death',
  },
};

export function DietaryRequirementsForm({
  guestId,
  guestName,
  onSave,
  onExport,
}: DietaryRequirementsFormProps) {
  const [loading, setLoading] = useState(true);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const supabase = createClient();

  const {
    register,
    watch,
    setValue,
    getValues,
    formState: { isDirty },
  } = useForm<DietaryFormData>({
    defaultValues: {
      allergies: {
        peanuts: false,
        tree_nuts: false,
        milk: false,
        eggs: false,
        wheat: false,
        soy: false,
        fish: false,
        shellfish: false,
        sesame: false,
      },
      preferences: {
        vegetarian: false,
        vegan: false,
        kosher: false,
        halal: false,
        gluten_free: false,
        dairy_free: false,
        low_sodium: false,
        diabetic: false,
      },
      severity: 'moderate',
      epipen_required: false,
      emergency_contact: '',
      medical_notes: '',
      caterer_instructions: '',
    },
  });

  const watchedValues = watch();
  const currentSeverity = watch('severity');
  const isLifeThreatening = currentSeverity === 'life_threatening';
  const hasAnyAllergy = Object.values(watchedValues.allergies).some((v) => v);

  // Auto-save functionality with 2-second debounce
  const autoSave = useCallback(
    debounce(async (data: DietaryFormData) => {
      if (!guestId) return;

      setAutoSaving(true);
      try {
        const { error } = await supabase.from('dietary_requirements').upsert(
          {
            guest_id: guestId,
            allergies: data.allergies,
            preferences: data.preferences,
            severity: data.severity,
            epipen_required: data.epipen_required,
            emergency_contact: data.emergency_contact,
            medical_notes: data.medical_notes,
            caterer_instructions: data.caterer_instructions,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'guest_id',
          },
        );

        if (error) throw error;

        setLastSaved(new Date());
        onSave?.(data);
      } catch (error) {
        console.error('Auto-save error:', error);
      } finally {
        setAutoSaving(false);
      }
    }, 2000),
    [guestId, onSave, supabase],
  );

  // Watch for changes and trigger auto-save
  useEffect(() => {
    if (isDirty && !loading) {
      autoSave(watchedValues);
    }
  }, [watchedValues, isDirty, loading, autoSave]);

  // Load existing data
  useEffect(() => {
    loadExistingData();
  }, [guestId]);

  const loadExistingData = async () => {
    if (!guestId) return;

    setLoading(true);
    try {
      const { data } = await supabase
        .from('dietary_requirements')
        .select('*')
        .eq('guest_id', guestId)
        .single();

      if (data) {
        setValue('allergies', data.allergies || {});
        setValue('preferences', data.preferences || {});
        setValue('severity', data.severity || 'moderate');
        setValue('epipen_required', data.epipen_required || false);
        setValue('emergency_contact', data.emergency_contact || '');
        setValue('medical_notes', data.medical_notes || '');
        setValue('caterer_instructions', data.caterer_instructions || '');
      }
    } catch (error) {
      console.error('Error loading dietary data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = getValues();
      const exportData = {
        guest: guestName || 'Unknown Guest',
        ...data,
        exported_at: new Date().toISOString(),
      };

      // Create CSV content
      const csvContent = generateCSV(exportData);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dietary-requirements-${guestId}.csv`;
      a.click();

      toast.success('Dietary requirements exported');
      onExport?.();
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export dietary requirements');
    }
  };

  const generateCSV = (data: any) => {
    const headers = ['Field', 'Value'];
    const rows = [
      ['Guest Name', data.guest],
      ['Severity', data.severity],
      ['EpiPen Required', data.epipen_required ? 'Yes' : 'No'],
      ['Emergency Contact', data.emergency_contact],
      ['', ''],
      ['ALLERGIES', ''],
      ...Object.entries(data.allergies).map(([key, value]) => [
        key.replace('_', ' ').toUpperCase(),
        value ? 'Yes' : 'No',
      ]),
      ['', ''],
      ['PREFERENCES', ''],
      ...Object.entries(data.preferences).map(([key, value]) => [
        key.replace('_', ' ').toUpperCase(),
        value ? 'Yes' : 'No',
      ]),
      ['', ''],
      ['Medical Notes', data.medical_notes],
      ['Caterer Instructions', data.caterer_instructions],
    ];

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  };

  const SeverityIcon = SEVERITY_CONFIG[currentSeverity].icon;

  if (loading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Life-threatening warning banner */}
      {isLifeThreatening && (
        <Alert className="bg-red-50 border-red-500 border-2">
          <ShieldExclamationIcon className="h-6 w-6 text-red-600" />
          <div>
            <div className="font-bold text-red-900 text-lg">
              ⚠️ LIFE-THREATENING ALLERGY ALERT ⚠️
            </div>
            <div className="text-red-800 mt-1">
              This guest has allergies that can cause anaphylaxis or death.
              Extreme caution required. Ensure all kitchen staff are informed.
            </div>
          </div>
        </Alert>
      )}

      <Card className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-semibold">Dietary Requirements Form</h3>
            {guestName && (
              <p className="text-gray-600 mt-1">For: {guestName}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {autoSaving && (
              <Badge variant="outline" className="animate-pulse">
                Auto-saving...
              </Badge>
            )}
            {lastSaved && !autoSaving && (
              <Badge variant="outline" className="text-green-600">
                <CheckCircleIcon className="h-3 w-3 mr-1" />
                Saved {lastSaved.toLocaleTimeString()}
              </Badge>
            )}
            <Button
              onClick={handleExport}
              variant="outline"
              className="flex items-center gap-2"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              Export for Caterer
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Severity Level Selection */}
          <div>
            <Label className="text-base font-semibold mb-4 block">
              Severity Level
            </Label>
            <RadioGroup
              value={currentSeverity}
              onValueChange={(value: any) => setValue('severity', value)}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(SEVERITY_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <label
                      key={key}
                      className={cn(
                        'flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all',
                        currentSeverity === key
                          ? config.color
                          : 'border-gray-200 hover:border-gray-300',
                      )}
                    >
                      <RadioGroupItem value={key} className="sr-only" />
                      <Icon className="h-8 w-8 mb-2" />
                      <span className="font-medium">{config.label}</span>
                      <span className="text-xs text-center mt-1">
                        {config.description}
                      </span>
                    </label>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          {/* Common Allergies */}
          <div>
            <Label className="text-base font-semibold mb-4 block">
              Common Allergies
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(watchedValues.allergies).map(([key, value]) => (
                <label
                  key={key}
                  className={cn(
                    'flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-all',
                    value
                      ? 'bg-orange-50 border-orange-300'
                      : 'border-gray-200 hover:border-gray-300',
                  )}
                >
                  <Checkbox
                    checked={value}
                    onCheckedChange={(checked) =>
                      setValue(
                        `allergies.${key as keyof DietaryFormData['allergies']}`,
                        !!checked,
                      )
                    }
                  />
                  <span className="font-medium capitalize">
                    {key.replace('_', ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Dietary Preferences */}
          <div>
            <Label className="text-base font-semibold mb-4 block">
              Dietary Preferences
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(watchedValues.preferences).map(([key, value]) => (
                <label
                  key={key}
                  className={cn(
                    'flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-all',
                    value
                      ? 'bg-green-50 border-green-300'
                      : 'border-gray-200 hover:border-gray-300',
                  )}
                >
                  <Checkbox
                    checked={value}
                    onCheckedChange={(checked) =>
                      setValue(
                        `preferences.${key as keyof DietaryFormData['preferences']}`,
                        !!checked,
                      )
                    }
                  />
                  <span className="font-medium capitalize">
                    {key.replace('_', ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Life-threatening specific fields */}
          {(isLifeThreatening || hasAnyAllergy) && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-900 mb-4">
                Emergency Information
              </h4>
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <Checkbox
                    checked={watchedValues.epipen_required}
                    onCheckedChange={(checked) =>
                      setValue('epipen_required', !!checked)
                    }
                  />
                  <span className="font-medium text-red-800">
                    EpiPen Required
                  </span>
                </label>

                <div>
                  <Label htmlFor="emergency_contact">
                    Emergency Contact (Name & Phone)
                  </Label>
                  <input
                    {...register('emergency_contact')}
                    className="w-full p-2 mt-1 border rounded-lg"
                    placeholder="e.g., John Doe - 555-0123"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Additional Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="medical_notes">Medical Notes</Label>
              <Textarea
                {...register('medical_notes')}
                rows={4}
                placeholder="Any additional medical information..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="caterer_instructions">Caterer Instructions</Label>
              <Textarea
                {...register('caterer_instructions')}
                rows={4}
                placeholder="Special preparation instructions..."
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
