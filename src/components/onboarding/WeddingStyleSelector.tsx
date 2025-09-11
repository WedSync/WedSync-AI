'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Palette,
  Heart,
  MapPin,
  Calendar,
  Sparkles,
  Search,
  Plus,
  X,
  Info,
} from 'lucide-react';

interface WeddingStyleSelectorProps {
  selectedStyles: string[];
  onChange: (styles: string[]) => void;
  disabled?: boolean;
}

interface StyleCategory {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  styles: WeddingStyle[];
}

interface WeddingStyle {
  name: string;
  description: string;
  keywords: string[];
  colorPalette: string[];
  popularWith: string[];
  emoji: string;
}

const WEDDING_STYLES: StyleCategory[] = [
  {
    id: 'themes',
    name: 'Themes',
    icon: Heart,
    description: 'Overall aesthetic and vibe for your wedding',
    styles: [
      {
        name: 'Rustic',
        description: 'Natural, country-inspired with barn or outdoor settings',
        keywords: [
          'barn',
          'mason jars',
          'burlap',
          'wildflowers',
          'string lights',
        ],
        colorPalette: ['#8B4513', '#F5DEB3', '#228B22', '#B22222'],
        popularWith: ['outdoor venues', 'farm settings', 'casual celebrations'],
        emoji: '🌾',
      },
      {
        name: 'Bohemian',
        description: 'Free-spirited, artistic style with eclectic decorations',
        keywords: ['macrame', 'pampas grass', 'dreamcatchers', 'vintage rugs'],
        colorPalette: ['#CD853F', '#F0E68C', '#DDA0DD', '#F5DEB3'],
        popularWith: [
          'outdoor ceremonies',
          'artistic couples',
          'unique venues',
        ],
        emoji: '🦋',
      },
      {
        name: 'Vintage',
        description: 'Classic, timeless style inspired by past eras',
        keywords: ['antique furniture', 'lace', 'pearls', 'vintage cars'],
        colorPalette: ['#F0E68C', '#DDA0DD', '#F5DEB3', '#B0C4DE'],
        popularWith: [
          'historic venues',
          'classic couples',
          'formal celebrations',
        ],
        emoji: '📜',
      },
      {
        name: 'Modern',
        description: 'Clean, contemporary style with sleek designs',
        keywords: ['geometric shapes', 'minimalist decor', 'metallic accents'],
        colorPalette: ['#FFFFFF', '#C0C0C0', '#000080', '#FFD700'],
        popularWith: [
          'urban venues',
          'contemporary couples',
          'city celebrations',
        ],
        emoji: '🏙️',
      },
      {
        name: 'Classic Elegant',
        description: 'Traditional, sophisticated style with refined touches',
        keywords: ['crystal chandeliers', 'white flowers', 'formal attire'],
        colorPalette: ['#FFFFFF', '#FFD700', '#C0C0C0', '#000000'],
        popularWith: ['ballrooms', 'hotels', 'formal celebrations'],
        emoji: '👑',
      },
      {
        name: 'Romantic',
        description: 'Soft, dreamy style focused on love and intimacy',
        keywords: ['soft lighting', 'roses', 'candles', 'flowing fabrics'],
        colorPalette: ['#FFB6C1', '#FFFFFF', '#F0E68C', '#DDA0DD'],
        popularWith: [
          'intimate venues',
          'garden settings',
          'emotional celebrations',
        ],
        emoji: '💕',
      },
    ],
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: MapPin,
    description: 'Where and how you want to celebrate',
    styles: [
      {
        name: 'Beach',
        description: 'Coastal wedding with ocean views and sandy settings',
        keywords: ['ocean views', 'sand', 'seashells', 'nautical elements'],
        colorPalette: ['#87CEEB', '#FFFFFF', '#FF7F50', '#F0FFFF'],
        popularWith: [
          'coastal venues',
          'destination weddings',
          'relaxed celebrations',
        ],
        emoji: '🏖️',
      },
      {
        name: 'Garden Party',
        description: 'Natural, outdoor style celebrating nature',
        keywords: ['outdoor venues', 'natural flowers', 'garden settings'],
        colorPalette: ['#228B22', '#FFFFFF', '#FFB6C1', '#F0E68C'],
        popularWith: ['botanical gardens', 'outdoor venues', 'spring weddings'],
        emoji: '🌺',
      },
      {
        name: 'Destination',
        description: 'Wedding in a special location away from home',
        keywords: ['travel', 'exotic locations', 'unique venues', 'adventure'],
        colorPalette: ['#FF6347', '#FFD700', '#87CEEB', '#F0E68C'],
        popularWith: [
          'resort venues',
          'adventurous couples',
          'intimate celebrations',
        ],
        emoji: '✈️',
      },
      {
        name: 'Industrial',
        description: 'Urban style featuring raw materials and modern elements',
        keywords: [
          'exposed brick',
          'metal fixtures',
          'concrete',
          'Edison bulbs',
        ],
        colorPalette: ['#696969', '#FFFFFF', '#FFD700', '#B22222'],
        popularWith: ['urban venues', 'loft spaces', 'modern couples'],
        emoji: '🏭',
      },
    ],
  },
  {
    id: 'seasons',
    name: 'Seasons',
    icon: Calendar,
    description: 'Seasonal themes and timing preferences',
    styles: [
      {
        name: 'Spring',
        description: 'Fresh and vibrant celebrating new beginnings',
        keywords: ['fresh flowers', 'pastels', 'growth themes', 'blooming'],
        colorPalette: ['#FFB6C1', '#98FB98', '#F0E68C', '#E6E6FA'],
        popularWith: ['garden venues', 'outdoor ceremonies', 'fresh starts'],
        emoji: '🌸',
      },
      {
        name: 'Summer',
        description: 'Warm, bright, and vibrant celebrations',
        keywords: ['bright colors', 'outdoor ceremonies', 'long days'],
        colorPalette: ['#FFD700', '#FF6347', '#87CEEB', '#98FB98'],
        popularWith: [
          'outdoor venues',
          'beach settings',
          'vibrant celebrations',
        ],
        emoji: '☀️',
      },
      {
        name: 'Fall',
        description: 'Warm colors and harvest-inspired themes',
        keywords: ['autumn leaves', 'warm colors', 'harvest themes', 'cozy'],
        colorPalette: ['#FF6347', '#FFD700', '#B22222', '#8B4513'],
        popularWith: ['rustic venues', 'barn settings', 'cozy celebrations'],
        emoji: '🍂',
      },
      {
        name: 'Winter',
        description: 'Cozy elegance with rich, warm elements',
        keywords: ['warm lighting', 'rich colors', 'cozy venues', 'elegance'],
        colorPalette: ['#B22222', '#FFD700', '#FFFFFF', '#2F4F4F'],
        popularWith: [
          'indoor venues',
          'elegant settings',
          'intimate celebrations',
        ],
        emoji: '❄️',
      },
    ],
  },
  {
    id: 'vibes',
    name: 'Vibes',
    icon: Sparkles,
    description: 'Overall feeling and atmosphere',
    styles: [
      {
        name: 'Minimalist',
        description: 'Simple, uncluttered focusing on essential elements',
        keywords: ['clean lines', 'neutral colors', 'simple decorations'],
        colorPalette: ['#FFFFFF', '#C0C0C0', '#F5F5F5', '#000000'],
        popularWith: [
          'modern venues',
          'contemporary couples',
          'sophisticated celebrations',
        ],
        emoji: '⚪',
      },
      {
        name: 'Glamorous',
        description: 'Luxurious with opulent decorations and details',
        keywords: ['sparkles', 'luxury materials', 'dramatic lighting'],
        colorPalette: ['#FFD700', '#C0C0C0', '#000000', '#FF69B4'],
        popularWith: [
          'luxury venues',
          'formal celebrations',
          'elegant settings',
        ],
        emoji: '✨',
      },
      {
        name: 'Cultural Traditional',
        description: 'Incorporating specific cultural traditions',
        keywords: ['cultural elements', 'traditional ceremonies', 'heritage'],
        colorPalette: ['#B22222', '#FFD700', '#228B22', '#4169E1'],
        popularWith: [
          'cultural venues',
          'traditional families',
          'heritage celebrations',
        ],
        emoji: '🎭',
      },
      {
        name: 'DIY',
        description: 'Handmade, personalized with custom elements',
        keywords: [
          'handmade decorations',
          'personal touches',
          'craft elements',
        ],
        colorPalette: ['#FF6347', '#F0E68C', '#98FB98', '#DDA0DD'],
        popularWith: [
          'creative couples',
          'budget-conscious',
          'personal celebrations',
        ],
        emoji: '🎨',
      },
    ],
  },
];

export function WeddingStyleSelector({
  selectedStyles,
  onChange,
  disabled = false,
}: WeddingStyleSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('themes');

  // Filter styles based on search query
  const filteredStyles = React.useMemo(() => {
    if (!searchQuery.trim()) return WEDDING_STYLES;

    const query = searchQuery.toLowerCase();
    return WEDDING_STYLES.map((category) => ({
      ...category,
      styles: category.styles.filter(
        (style) =>
          style.name.toLowerCase().includes(query) ||
          style.description.toLowerCase().includes(query) ||
          style.keywords.some((keyword) =>
            keyword.toLowerCase().includes(query),
          ),
      ),
    })).filter((category) => category.styles.length > 0);
  }, [searchQuery]);

  // Handle style selection
  const handleStyleToggle = (styleName: string) => {
    if (disabled) return;

    const isSelected = selectedStyles.includes(styleName);

    if (isSelected) {
      // Remove style
      onChange(selectedStyles.filter((s) => s !== styleName));
    } else {
      // Add style (max 5)
      if (selectedStyles.length < 5) {
        onChange([...selectedStyles, styleName]);
      }
    }
  };

  // Remove style
  const handleStyleRemove = (styleName: string) => {
    onChange(selectedStyles.filter((s) => s !== styleName));
  };

  // Get style object by name
  const getStyleByName = (name: string) => {
    for (const category of WEDDING_STYLES) {
      const style = category.styles.find((s) => s.name === name);
      if (style) return style;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search wedding styles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
          className="pl-10"
        />
      </div>

      {/* Selected Styles */}
      {selectedStyles.length > 0 && (
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            Selected Styles ({selectedStyles.length}/5)
          </Label>
          <div className="flex flex-wrap gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            {selectedStyles.map((styleName) => {
              const style = getStyleByName(styleName);
              return (
                <Badge
                  key={styleName}
                  variant="secondary"
                  className="pl-2 pr-1 py-1 flex items-center space-x-2"
                >
                  <span>
                    {style?.emoji} {styleName}
                  </span>
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStyleRemove(styleName)}
                      className="h-4 w-4 p-0 hover:bg-gray-200"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Style Categories */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {filteredStyles.map((category) => {
            const Icon = category.icon;
            return (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="flex items-center space-x-1 text-xs"
              >
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{category.name}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {filteredStyles.map((category) => (
          <TabsContent
            key={category.id}
            value={category.id}
            className="space-y-4"
          >
            <div className="text-center">
              <h3 className="text-lg font-semibold flex items-center justify-center space-x-2">
                <category.icon className="w-5 h-5" />
                <span>{category.name}</span>
              </h3>
              <p className="text-sm text-gray-600">{category.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {category.styles.map((style) => {
                const isSelected = selectedStyles.includes(style.name);
                const canSelect = !isSelected && selectedStyles.length < 5;

                return (
                  <Card
                    key={style.name}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-2 ring-blue-500 bg-blue-50'
                        : canSelect || disabled
                          ? 'hover:shadow-md hover:bg-gray-50'
                          : 'opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() =>
                      canSelect || isSelected
                        ? handleStyleToggle(style.name)
                        : null
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{style.emoji}</span>
                          <h4 className="font-medium text-gray-900">
                            {style.name}
                          </h4>
                        </div>
                        {isSelected && (
                          <Badge className="bg-blue-500 text-white">
                            Selected
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-3">
                        {style.description}
                      </p>

                      {/* Color Palette */}
                      <div className="flex items-center space-x-1 mb-2">
                        <span className="text-xs text-gray-500">Colors:</span>
                        {style.colorPalette.slice(0, 4).map((color, index) => (
                          <div
                            key={index}
                            className="w-4 h-4 rounded-full border border-gray-200"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>

                      {/* Keywords */}
                      <div className="flex flex-wrap gap-1">
                        {style.keywords.slice(0, 3).map((keyword, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs py-0 px-2"
                          >
                            {keyword}
                          </Badge>
                        ))}
                        {style.keywords.length > 3 && (
                          <Badge
                            variant="outline"
                            className="text-xs py-0 px-2"
                          >
                            +{style.keywords.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Selection Limit Warning */}
      {selectedStyles.length >= 5 && (
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            You've selected the maximum of 5 styles. Remove some to select
            others.
          </AlertDescription>
        </Alert>
      )}

      {/* No Results */}
      {searchQuery && filteredStyles.length === 0 && (
        <Alert>
          <Search className="w-4 h-4" />
          <AlertDescription>
            No styles found matching "{searchQuery}". Try different search
            terms.
          </AlertDescription>
        </Alert>
      )}

      {/* Helper Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm text-gray-600">
            <p className="font-medium">How to choose your wedding styles:</p>
            <ul className="space-y-1 ml-4">
              <li>• Select 1-5 styles that resonate with your vision</li>
              <li>
                • Mix themes, settings, and vibes for a unique celebration
              </li>
              <li>• Consider your venue and season when selecting</li>
              <li>• These help us recommend the right vendors for you</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Popular Combinations */}
      {selectedStyles.length > 0 && (
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-yellow-800">
                Your style combination works great with:
              </p>
              <div className="flex flex-wrap gap-2">
                {/* This could be populated with AI-driven recommendations */}
                <Badge variant="outline" className="bg-white">
                  Outdoor venues
                </Badge>
                <Badge variant="outline" className="bg-white">
                  Farm-to-table catering
                </Badge>
                <Badge variant="outline" className="bg-white">
                  Natural photography
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
