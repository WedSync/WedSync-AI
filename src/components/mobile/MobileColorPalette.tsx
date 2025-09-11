'use client';

import { useState, useEffect } from 'react';
import { useHaptic } from '@/hooks/useTouch';
import { MobileColorPicker } from './MobileColorPicker';

interface ColorPalette {
  primary_colors: { hex: string; name: string; description: string }[];
  accent_colors: { hex: string; name: string; description: string }[];
  neutral_colors: { hex: string; name: string; description: string }[];
  palette_name: string;
  offline?: boolean;
}

interface MobileColorPaletteProps {
  weddingId?: string;
  isOffline: boolean;
  onPaletteGenerated?: (palette: ColorPalette) => void;
}

export function MobileColorPalette({
  weddingId,
  isOffline,
  onPaletteGenerated,
}: MobileColorPaletteProps) {
  const [baseColors, setBaseColors] = useState<string[]>(['#FF69B4']);
  const [selectedStyle, setSelectedStyle] = useState('romantic');
  const [selectedSeason, setSelectedSeason] = useState('spring');
  const [generatedPalette, setGeneratedPalette] = useState<ColorPalette | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const { light: lightHaptic, success: successHaptic } = useHaptic();

  const styles = [
    {
      id: 'romantic',
      label: '💕 Romantic',
      description: 'Soft pastels and warm tones',
    },
    {
      id: 'elegant',
      label: '✨ Elegant',
      description: 'Classic and sophisticated',
    },
    {
      id: 'rustic',
      label: '🌿 Rustic',
      description: 'Natural and earthy tones',
    },
    { id: 'modern', label: '🎨 Modern', description: 'Bold and contemporary' },
    { id: 'vintage', label: '📻 Vintage', description: 'Muted and nostalgic' },
    { id: 'boho', label: '🌸 Boho', description: 'Free-spirited and artistic' },
  ];

  const seasons = [
    {
      id: 'spring',
      label: '🌸 Spring',
      colors: ['#FFB6C1', '#98FB98', '#F0E68C'],
    },
    {
      id: 'summer',
      label: '☀️ Summer',
      colors: ['#FF6347', '#00CED1', '#FFD700'],
    },
    { id: 'fall', label: '🍂 Fall', colors: ['#D2691E', '#B22222', '#DAA520'] },
    {
      id: 'winter',
      label: '❄️ Winter',
      colors: ['#4169E1', '#2F4F4F', '#C0C0C0'],
    },
  ];

  const generatePalette = async () => {
    setLoading(true);

    try {
      // In offline mode or for demo, generate a basic palette
      if (isOffline) {
        const palette = generateOfflinePalette();
        setGeneratedPalette(palette);
        onPaletteGenerated?.(palette);
      } else {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const palette = await generateAIPalette();
        setGeneratedPalette(palette);
        onPaletteGenerated?.(palette);
      }

      successHaptic();
    } catch (error) {
      console.error('Palette generation failed:', error);
      // Fallback to offline palette
      const palette = generateOfflinePalette();
      setGeneratedPalette(palette);
    } finally {
      setLoading(false);
    }
  };

  const generateOfflinePalette = (): ColorPalette => {
    const baseColor = baseColors[0] || '#FF69B4';

    return {
      primary_colors: [
        { hex: baseColor, name: 'Primary', description: 'Main wedding color' },
        {
          hex: lightenColor(baseColor, 30),
          name: 'Light Primary',
          description: 'Lighter shade',
        },
      ],
      accent_colors: [
        {
          hex: complementaryColor(baseColor),
          name: 'Accent',
          description: 'Complementary accent',
        },
      ],
      neutral_colors: [
        {
          hex: '#F5F5F5',
          name: 'Soft White',
          description: 'Neutral background',
        },
        { hex: '#8B8B8B', name: 'Medium Gray', description: 'Subtle contrast' },
      ],
      palette_name: `${selectedStyle} ${selectedSeason} (Offline)`,
      offline: true,
    };
  };

  const generateAIPalette = async (): Promise<ColorPalette> => {
    // This would call your AI API in production
    const baseColor = baseColors[0] || '#FF69B4';

    return {
      primary_colors: [
        {
          hex: baseColor,
          name: 'Blush Pink',
          description: 'Romantic and warm',
        },
        {
          hex: lightenColor(baseColor, 20),
          name: 'Soft Blush',
          description: 'Delicate variation',
        },
        {
          hex: darkenColor(baseColor, 15),
          name: 'Deep Rose',
          description: 'Rich accent',
        },
      ],
      accent_colors: [
        {
          hex: complementaryColor(baseColor),
          name: 'Sage Green',
          description: 'Natural complement',
        },
        {
          hex: analogousColor(baseColor, 30),
          name: 'Coral',
          description: 'Warm harmony',
        },
      ],
      neutral_colors: [
        { hex: '#F9F7F4', name: 'Ivory', description: 'Warm neutral' },
        { hex: '#E8E2DB', name: 'Champagne', description: 'Elegant base' },
        {
          hex: '#5D5A56',
          name: 'Charcoal',
          description: 'Sophisticated depth',
        },
      ],
      palette_name: `AI ${selectedStyle} ${selectedSeason} Palette`,
    };
  };

  const lightenColor = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return (
      '#' +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  };

  const darkenColor = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = ((num >> 8) & 0x00ff) - amt;
    const B = (num & 0x0000ff) - amt;
    return (
      '#' +
      (
        0x1000000 +
        (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
        (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
        (B > 255 ? 255 : B < 0 ? 0 : B)
      )
        .toString(16)
        .slice(1)
    );
  };

  const complementaryColor = (hex: string): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const R = 255 - (num >> 16);
    const G = 255 - ((num >> 8) & 0x00ff);
    const B = 255 - (num & 0x0000ff);
    return '#' + ((R << 16) | (G << 8) | B).toString(16).padStart(6, '0');
  };

  const analogousColor = (hex: string, degrees: number): string => {
    // Simplified analogous color generation
    const num = parseInt(hex.replace('#', ''), 16);
    let R = num >> 16;
    let G = (num >> 8) & 0x00ff;
    let B = num & 0x0000ff;

    // Shift colors based on degrees
    R = Math.min(255, R + degrees);
    G = Math.max(0, G - degrees / 2);

    return '#' + ((R << 16) | (G << 8) | B).toString(16).padStart(6, '0');
  };

  const addBaseColor = () => {
    if (baseColors.length < 3) {
      setBaseColors([...baseColors, '#FFFFFF']);
      lightHaptic();
    }
  };

  const removeBaseColor = (index: number) => {
    if (baseColors.length > 1) {
      setBaseColors(baseColors.filter((_, i) => i !== index));
      lightHaptic();
    }
  };

  const updateBaseColor = (index: number, color: string) => {
    const newColors = [...baseColors];
    newColors[index] = color;
    setBaseColors(newColors);
  };

  const copyToClipboard = async (color: string) => {
    try {
      await navigator.clipboard.writeText(color);
      successHaptic();
    } catch (error) {
      console.log('Clipboard API not available');
    }
  };

  return (
    <div className="mobile-color-palette space-y-6">
      {isOffline && (
        <div className="bg-amber-100 border-amber-400 border rounded-lg p-3">
          <p className="text-amber-800 text-sm">
            🎨 Offline Mode: Basic palette generation available
          </p>
        </div>
      )}

      {/* Base Colors */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Base Colors ({baseColors.length}/3)
          </label>
          {baseColors.length < 3 && (
            <button
              onClick={addBaseColor}
              className="text-blue-500 text-sm font-medium min-h-[44px] min-w-[44px] touch-manipulation"
              style={{ touchAction: 'manipulation' }}
            >
              + Add
            </button>
          )}
        </div>

        <div className="space-y-2">
          {baseColors.map((color, index) => (
            <div key={index} className="flex items-center space-x-3">
              <MobileColorPicker
                value={color}
                onChange={(newColor) => updateBaseColor(index, newColor)}
                showHistory={false}
              />
              <span className="text-sm font-mono">{color}</span>
              {baseColors.length > 1 && (
                <button
                  onClick={() => removeBaseColor(index)}
                  className="text-red-500 text-sm min-h-[44px] min-w-[44px] touch-manipulation"
                  style={{ touchAction: 'manipulation' }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Style Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Wedding Style
        </label>
        <div className="grid grid-cols-2 gap-2">
          {styles.map((style) => (
            <button
              key={style.id}
              onClick={() => {
                setSelectedStyle(style.id);
                lightHaptic();
              }}
              className={`
                p-3 rounded-lg text-left min-h-[60px] touch-manipulation
                transition-all duration-200
                ${
                  selectedStyle === style.id
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-50 text-gray-700 active:bg-gray-100'
                }
              `}
              style={{ touchAction: 'manipulation' }}
            >
              <div className="font-medium text-sm">{style.label}</div>
              <div className="text-xs opacity-75 mt-1">{style.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Season Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Wedding Season
        </label>
        <div className="grid grid-cols-2 gap-2">
          {seasons.map((season) => (
            <button
              key={season.id}
              onClick={() => {
                setSelectedSeason(season.id);
                lightHaptic();
              }}
              className={`
                p-3 rounded-lg text-center min-h-[60px] touch-manipulation
                transition-all duration-200
                ${
                  selectedSeason === season.id
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-50 text-gray-700 active:bg-gray-100'
                }
              `}
              style={{ touchAction: 'manipulation' }}
            >
              <div className="font-medium text-sm mb-2">{season.label}</div>
              <div className="flex justify-center space-x-1">
                {season.colors.map((color, index) => (
                  <div
                    key={index}
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={generatePalette}
        disabled={loading}
        className="w-full bg-blue-500 text-white py-4 rounded-lg font-medium text-lg min-h-[56px] touch-manipulation active:bg-blue-600 disabled:bg-gray-400"
        style={{ touchAction: 'manipulation' }}
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <span className="animate-spin mr-2">⏳</span>
            Generating Palette...
          </span>
        ) : (
          '🎨 Generate AI Palette'
        )}
      </button>

      {/* Generated Palette */}
      {generatedPalette && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">
              {generatedPalette.palette_name}
            </h3>
            {generatedPalette.offline && (
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                Offline
              </span>
            )}
          </div>

          {/* Primary Colors */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700">
              Primary Colors
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {generatedPalette.primary_colors.map((color, index) => (
                <button
                  key={index}
                  onClick={() => copyToClipboard(color.hex)}
                  className="flex items-center p-3 bg-gray-50 rounded-lg touch-manipulation active:bg-gray-100"
                  style={{ touchAction: 'manipulation' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg mr-3 border"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm">{color.name}</div>
                    <div className="text-xs text-gray-500">
                      {color.description}
                    </div>
                    <div className="text-xs font-mono text-gray-600">
                      {color.hex}
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm">📋</span>
                </button>
              ))}
            </div>
          </div>

          {/* Accent Colors */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700">Accent Colors</h4>
            <div className="grid grid-cols-1 gap-2">
              {generatedPalette.accent_colors.map((color, index) => (
                <button
                  key={index}
                  onClick={() => copyToClipboard(color.hex)}
                  className="flex items-center p-3 bg-gray-50 rounded-lg touch-manipulation active:bg-gray-100"
                  style={{ touchAction: 'manipulation' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg mr-3 border"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm">{color.name}</div>
                    <div className="text-xs text-gray-500">
                      {color.description}
                    </div>
                    <div className="text-xs font-mono text-gray-600">
                      {color.hex}
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm">📋</span>
                </button>
              ))}
            </div>
          </div>

          {/* Neutral Colors */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700">
              Neutral Colors
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {generatedPalette.neutral_colors.map((color, index) => (
                <button
                  key={index}
                  onClick={() => copyToClipboard(color.hex)}
                  className="flex items-center p-3 bg-gray-50 rounded-lg touch-manipulation active:bg-gray-100"
                  style={{ touchAction: 'manipulation' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg mr-3 border"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm">{color.name}</div>
                    <div className="text-xs text-gray-500">
                      {color.description}
                    </div>
                    <div className="text-xs font-mono text-gray-600">
                      {color.hex}
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm">📋</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
