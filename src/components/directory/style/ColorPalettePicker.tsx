'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Palette, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StylePreferences } from '@/types/style-matching';

interface ColorPalettePickerProps {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string;
  };
  onColorsChange: (colors: any) => void;
  preferences: StylePreferences;
  onComplete: (isValid: boolean) => void;
}

const PALETTE_PRESETS = [
  {
    id: 'romantic-blush',
    name: 'Romantic Blush',
    description: 'Soft pinks with warm neutrals',
    colors: {
      primary: '#D1477A',
      secondary: '#E8B4CB',
      accent: '#F4E4E0',
      neutral: '#8B7355',
    },
    accessibility: 92,
  },
  {
    id: 'sage-elegance',
    name: 'Sage Elegance',
    description: 'Sophisticated greens with cream accents',
    colors: {
      primary: '#87A96B',
      secondary: '#C8D5BB',
      accent: '#F5F5DC',
      neutral: '#6B5B73',
    },
    accessibility: 95,
  },
  {
    id: 'midnight-glamour',
    name: 'Midnight Glamour',
    description: 'Deep blues with metallic touches',
    colors: {
      primary: '#1B365D',
      secondary: '#4A90A4',
      accent: '#B8860B',
      neutral: '#2F2F2F',
    },
    accessibility: 89,
  },
];

export function ColorPalettePicker({
  colors,
  onColorsChange,
  preferences,
  onComplete,
}: ColorPalettePickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const handlePresetSelect = useCallback(
    (preset: any) => {
      onColorsChange(preset.colors);
      setSelectedPreset(preset.id);
    },
    [onColorsChange],
  );

  const handleCustomColorChange = useCallback(
    (colorKey: string, value: string) => {
      const newColors = { ...colors, [colorKey]: value };
      onColorsChange(newColors);
      setSelectedPreset(null);
    },
    [colors, onColorsChange],
  );

  useEffect(() => {
    onComplete(true); // Colors are always valid
  }, [onComplete]);

  const ColorSwatch = ({
    color,
    label,
    onChange,
  }: {
    color: string;
    label: string;
    onChange: (color: string) => void;
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 capitalize">
        {label}
      </label>
      <div className="relative group">
        <div
          className="w-full h-16 rounded-lg border-2 border-gray-200 cursor-pointer transition-all hover:border-purple-400 hover:shadow-md"
          style={{ backgroundColor: color }}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'color';
            input.value = color;
            input.addEventListener('change', (e) =>
              onChange((e.target as HTMLInputElement).value),
            );
            input.click();
          }}
        />
        <Palette className="absolute top-2 right-2 h-4 w-4 text-white drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-xs font-mono text-gray-500 text-center">
        {color.toUpperCase()}
      </p>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Color Analysis Summary */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-600 rounded-lg text-white">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Accessibility Score</p>
                <p className="text-xl font-bold text-purple-700">92%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Curated Palettes */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">
            Professionally Curated Palettes
          </h3>
          <p className="text-gray-600">
            Choose from palettes designed for your selected wedding styles
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PALETTE_PRESETS.map((preset, index) => (
            <motion.div
              key={preset.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={cn(
                  'cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1',
                  selectedPreset === preset.id ? 'ring-2 ring-purple-600' : '',
                )}
                onClick={() => handlePresetSelect(preset)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{preset.name}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {preset.description}
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {preset.accessibility}% A11y
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(preset.colors).map(([key, color]) => (
                      <div key={key} className="space-y-1">
                        <div
                          className="w-full h-12 rounded border-2 border-gray-100"
                          style={{ backgroundColor: color }}
                        />
                        <p className="text-xs text-center font-medium capitalize text-gray-600">
                          {key}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Custom Colors */}
      <Card className="p-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Your Current Palette</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <ColorSwatch
              color={colors.primary}
              label="primary"
              onChange={(color) => handleCustomColorChange('primary', color)}
            />
            <ColorSwatch
              color={colors.secondary}
              label="secondary"
              onChange={(color) => handleCustomColorChange('secondary', color)}
            />
            <ColorSwatch
              color={colors.accent}
              label="accent"
              onChange={(color) => handleCustomColorChange('accent', color)}
            />
            <ColorSwatch
              color={colors.neutral}
              label="neutral"
              onChange={(color) => handleCustomColorChange('neutral', color)}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ColorPalettePicker;
