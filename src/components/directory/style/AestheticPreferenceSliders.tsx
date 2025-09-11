'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Crown, Heart, Sun, Leaf, Zap, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AestheticPreferences {
  elegance: number;
  modernity: number;
  intimacy: number;
  luxury: number;
  naturalness: number;
  boldness: number;
}

interface AestheticPreferenceSlidersProps {
  preferences: AestheticPreferences;
  onPreferencesChange: (preferences: AestheticPreferences) => void;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string;
  };
  categories: string[];
  onComplete: (isValid: boolean) => void;
}

const PREFERENCE_DEFINITIONS = [
  {
    key: 'elegance' as keyof AestheticPreferences,
    name: 'Elegance',
    description: 'Classic sophistication vs. relaxed charm',
    icon: Crown,
    lowLabel: 'Relaxed',
    highLabel: 'Sophisticated',
    color: 'purple',
  },
  {
    key: 'modernity' as keyof AestheticPreferences,
    name: 'Modernity',
    description: 'Contemporary design vs. timeless tradition',
    icon: TrendingUp,
    lowLabel: 'Traditional',
    highLabel: 'Contemporary',
    color: 'blue',
  },
  {
    key: 'intimacy' as keyof AestheticPreferences,
    name: 'Intimacy',
    description: 'Cozy gatherings vs. grand celebrations',
    icon: Heart,
    lowLabel: 'Grand',
    highLabel: 'Intimate',
    color: 'pink',
  },
  {
    key: 'luxury' as keyof AestheticPreferences,
    name: 'Luxury',
    description: 'Budget-conscious vs. premium experiences',
    icon: Sun,
    lowLabel: 'Budget-Friendly',
    highLabel: 'Luxurious',
    color: 'gold',
  },
  {
    key: 'naturalness' as keyof AestheticPreferences,
    name: 'Naturalness',
    description: 'Organic elements vs. structured design',
    icon: Leaf,
    lowLabel: 'Structured',
    highLabel: 'Natural',
    color: 'green',
  },
  {
    key: 'boldness' as keyof AestheticPreferences,
    name: 'Boldness',
    description: 'Subtle refinement vs. dramatic statements',
    icon: Zap,
    lowLabel: 'Subtle',
    highLabel: 'Dramatic',
    color: 'red',
  },
];

export function AestheticPreferenceSliders({
  preferences,
  onPreferencesChange,
  colors,
  categories,
  onComplete,
}: AestheticPreferenceSlidersProps) {
  const [hoveredPreference, setHoveredPreference] = useState<string | null>(
    null,
  );

  const stylePersonality = useMemo(() => {
    const { elegance, modernity, intimacy, luxury, naturalness, boldness } =
      preferences;
    const personality: string[] = [];

    if (elegance > 70) personality.push('Sophisticated');
    if (modernity > 70) personality.push('Contemporary');
    if (intimacy > 70) personality.push('Intimate');
    if (luxury > 70) personality.push('Luxurious');
    if (naturalness > 70) personality.push('Natural');
    if (boldness > 70) personality.push('Dramatic');

    if (personality.length === 0) personality.push('Balanced');

    return personality;
  }, [preferences]);

  const handleSliderChange = useCallback(
    (key: keyof AestheticPreferences, values: number[]) => {
      const newPreferences = {
        ...preferences,
        [key]: values[0],
      };
      onPreferencesChange(newPreferences);
    },
    [preferences, onPreferencesChange],
  );

  useEffect(() => {
    onComplete(true); // Always valid
  }, [onComplete]);

  const getColorForPreference = (preference: any, value: number) => {
    return colors.primary; // Simplified - use primary color
  };

  return (
    <div className="space-y-8">
      {/* Style Personality Summary */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <h3 className="text-xl font-semibold text-gray-900">
          Your Wedding Style Personality
        </h3>
        <div className="flex flex-wrap justify-center gap-2">
          {stylePersonality.map((trait) => (
            <Badge
              key={trait}
              variant="secondary"
              className="px-3 py-1 text-sm"
            >
              {trait}
            </Badge>
          ))}
        </div>
      </motion.div>

      {/* Preference Sliders */}
      <div className="space-y-6">
        {PREFERENCE_DEFINITIONS.map((pref, index) => {
          const value = preferences[pref.key];
          const isHovered = hoveredPreference === pref.key;

          return (
            <motion.div
              key={pref.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onHoverStart={() => setHoveredPreference(pref.key)}
              onHoverEnd={() => setHoveredPreference(null)}
            >
              <Card
                className={cn(
                  'transition-all duration-200',
                  isHovered ? 'shadow-lg border-purple-300' : '',
                  value > 70 || value < 30 ? 'ring-1 ring-purple-200' : '',
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="p-2 rounded-lg text-white"
                        style={{
                          backgroundColor: getColorForPreference(pref, value),
                        }}
                      >
                        <pref.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{pref.name}</CardTitle>
                        <p className="text-sm text-gray-600">
                          {pref.description}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {value}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{pref.lowLabel}</span>
                      <span>{pref.highLabel}</span>
                    </div>

                    <div className="relative">
                      <Slider
                        value={[value]}
                        onValueChange={(values) =>
                          handleSliderChange(pref.key, values)
                        }
                        max={100}
                        step={5}
                        className="w-full"
                      />

                      {/* Value indicator */}
                      <motion.div
                        className="absolute -top-8 px-2 py-1 bg-gray-900 text-white text-xs rounded transform -translate-x-1/2"
                        style={{ left: `${value}%` }}
                        animate={{ opacity: isHovered ? 1 : 0 }}
                      >
                        {value}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
                      </motion.div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default AestheticPreferenceSliders;
