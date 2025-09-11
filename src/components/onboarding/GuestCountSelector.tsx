'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Plus, Minus, AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GuestCountSelectorProps {
  value: number;
  onChange: (count: number) => void;
  disabled?: boolean;
}

const GUEST_COUNT_PRESETS = [
  { label: '25-50', value: 40, description: 'Intimate celebration' },
  { label: '50-75', value: 62, description: 'Small wedding' },
  { label: '75-100', value: 87, description: 'Medium wedding' },
  { label: '100-125', value: 112, description: 'Large celebration' },
  { label: '125-150', value: 137, description: 'Big wedding' },
  { label: '150-200', value: 175, description: 'Grand celebration' },
  { label: '200+', value: 225, description: 'Very large wedding' },
];

const GUEST_COUNT_TIPS = {
  micro: {
    // 2-25
    icon: '💎',
    title: 'Micro Wedding',
    tips: [
      'Perfect for intimate venues and unique experiences',
      'Allows for higher per-person budget',
      'More flexibility with non-traditional venues',
      'Easier to coordinate and less stressful',
    ],
  },
  small: {
    // 26-75
    icon: '🌸',
    title: 'Small Wedding',
    tips: [
      'Great balance of intimacy and celebration',
      'Most venues can accommodate this size',
      'Budget-friendly option',
      'Easier logistics and planning',
    ],
  },
  medium: {
    // 76-150
    icon: '🎉',
    title: 'Medium Wedding',
    tips: [
      'Classic wedding size - most popular choice',
      'Good variety of venue options',
      'Can include extended family and friends',
      'Requires more detailed planning',
    ],
  },
  large: {
    // 151-300
    icon: '🏰',
    title: 'Large Wedding',
    tips: [
      'Grand celebration with all your loved ones',
      'Requires venues with large capacity',
      'Consider additional coordination staff',
      'Book vendors early - higher demand',
    ],
  },
  mega: {
    // 300+
    icon: '👑',
    title: 'Mega Wedding',
    tips: [
      'Epic celebration requiring extensive planning',
      'Limited venue options - book early',
      'Consider hiring a wedding planner',
      'May need multiple photographers/videographers',
    ],
  },
};

function getGuestCountCategory(count: number): keyof typeof GUEST_COUNT_TIPS {
  if (count <= 25) return 'micro';
  if (count <= 75) return 'small';
  if (count <= 150) return 'medium';
  if (count <= 300) return 'large';
  return 'mega';
}

export function GuestCountSelector({
  value,
  onChange,
  disabled = false,
}: GuestCountSelectorProps) {
  const [customMode, setCustomMode] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());

  // Check if current value matches a preset
  const currentPreset = GUEST_COUNT_PRESETS.find(
    (preset) => preset.value === value,
  );
  const isCustomValue = !currentPreset && value > 0;

  React.useEffect(() => {
    if (!customMode) {
      setInputValue(value.toString());
    }
  }, [value, customMode]);

  const handlePresetSelect = (presetValue: number) => {
    setCustomMode(false);
    onChange(presetValue);
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    setInputValue(inputVal);

    const numValue = parseInt(inputVal) || 0;
    if (numValue >= 2 && numValue <= 500) {
      onChange(numValue);
    }
  };

  const handleCustomToggle = () => {
    if (!customMode) {
      setCustomMode(true);
      setInputValue(value.toString());
    } else {
      setCustomMode(false);
      // If current value matches a preset, select it
      const matchingPreset = GUEST_COUNT_PRESETS.find((p) => p.value === value);
      if (!matchingPreset && value > 0) {
        // Keep custom value but exit custom mode
        setCustomMode(false);
      }
    }
  };

  const incrementGuests = () => {
    if (value < 500) {
      onChange(value + 1);
    }
  };

  const decrementGuests = () => {
    if (value > 2) {
      onChange(value - 1);
    }
  };

  const category = getGuestCountCategory(value);
  const categoryInfo = GUEST_COUNT_TIPS[category];

  return (
    <div className="space-y-6">
      {/* Quick Presets */}
      <div>
        <Label className="text-sm font-medium text-gray-700 mb-3 block">
          Choose a guest count range
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {GUEST_COUNT_PRESETS.map((preset) => (
            <Button
              key={preset.value}
              type="button"
              variant={
                value === preset.value && !customMode ? 'default' : 'outline'
              }
              onClick={() => handlePresetSelect(preset.value)}
              disabled={disabled}
              className="h-auto p-3 flex flex-col items-center space-y-1"
            >
              <span className="font-semibold">{preset.label}</span>
              <span className="text-xs opacity-75">{preset.description}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Input Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-medium text-gray-700">
            Or enter exact number
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCustomToggle}
            disabled={disabled}
          >
            {customMode || isCustomValue ? 'Use presets' : 'Custom count'}
          </Button>
        </div>

        {(customMode || isCustomValue) && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={decrementGuests}
                    disabled={disabled || value <= 2}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>

                  <div className="flex-1 max-w-[120px]">
                    <Input
                      type="number"
                      min="2"
                      max="500"
                      value={inputValue}
                      onChange={handleCustomInputChange}
                      disabled={disabled}
                      className="text-center"
                      placeholder="Guest count"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={incrementGuests}
                    disabled={disabled || value >= 500}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center text-gray-600">
                  <Users className="w-4 h-4 mr-1" />
                  <span className="text-sm">guests</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Current Selection Display */}
      {value > 0 && (
        <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-900">{value}</div>
            <div className="text-sm text-blue-700">guests expected</div>
          </div>
        </div>
      )}

      {/* Category Information */}
      {value > 0 && (
        <Alert>
          <div className="flex items-start space-x-3">
            <span className="text-2xl">{categoryInfo.icon}</span>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Info className="w-4 h-4" />
                <span className="font-medium">{categoryInfo.title}</span>
              </div>
              <AlertDescription>
                <ul className="space-y-1 text-sm">
                  {categoryInfo.tips.map((tip, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {/* Validation Warnings */}
      {value > 350 && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Large guest count considerations:</p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Limited venue options - book 12-18 months in advance</li>
                <li>• Consider hiring a professional wedding planner</li>
                <li>• Budget for additional coordination and logistics</li>
                <li>• Multiple catering stations may be needed</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {value < 10 && value > 0 && (
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Micro wedding benefits:</p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Higher per-person budget for luxury experiences</li>
                <li>• Unique venue options (private dining rooms, etc.)</li>
                <li>• More time to spend with each guest</li>
                <li>• Less stress and easier coordination</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Input Validation */}
      {value < 2 && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Guest count must be at least 2 (you and your partner!)
          </AlertDescription>
        </Alert>
      )}

      {value > 500 && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Guest count cannot exceed 500. For larger events, consider breaking
            into multiple celebrations.
          </AlertDescription>
        </Alert>
      )}

      {/* Helper Text */}
      <div className="text-xs text-gray-500 text-center space-y-1">
        <p>💡 Don't worry about being exact - you can adjust this later</p>
        <p>
          Most couples' final guest count is within ±20% of their initial
          estimate
        </p>
      </div>
    </div>
  );
}
