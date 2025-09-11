'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Palette,
  Upload,
  Image,
  Type,
  Eye,
  Save,
  RotateCcw,
  Download,
  Wand2,
  Sparkles,
  Copy,
  Check,
  X,
  Monitor,
  Smartphone,
  Tablet,
  Sun,
  Moon,
  Contrast,
  Droplets,
  Zap,
  Heart,
  Star,
  Crown,
  Flower,
  Camera,
  Music2,
  Utensils,
  MapPin,
  Settings,
  RefreshCw,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button-untitled';
import { Input } from '@/components/ui/input-untitled';
import { Card } from '@/components/ui/card-untitled';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// Branding configuration interface
export interface BrandingConfig {
  id?: string;
  supplier_id: string;
  name: string;
  description?: string;

  // Colors
  primary_color: string;
  secondary_color?: string;
  accent_color?: string;
  text_color: string;
  background_color: string;
  surface_color: string;
  border_color: string;
  success_color?: string;
  warning_color?: string;
  error_color?: string;

  // Typography
  font_family: string;
  heading_font?: string;
  font_size_base: number;
  font_weight_normal: number;
  font_weight_bold: number;
  line_height: number;
  letter_spacing?: number;

  // Logo and Images
  logo_url?: string;
  logo_dark_url?: string;
  favicon_url?: string;
  background_image_url?: string;
  background_pattern?: string;
  watermark_url?: string;

  // Layout
  border_radius: number;
  shadow_level: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  spacing_scale: number;
  container_width: 'sm' | 'md' | 'lg' | 'xl' | 'full';

  // Theme Settings
  theme_mode: 'light' | 'dark' | 'auto';
  color_scheme: 'vibrant' | 'muted' | 'monochrome' | 'pastel' | 'bold';
  contrast_level: 'standard' | 'high' | 'higher';

  // Custom CSS
  custom_css?: string;
  css_variables?: Record<string, string>;

  // Vendor Specific
  vendor_type: string;
  wedding_style: string;
  brand_personality: string[];

  // Metadata
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Pre-defined color palettes for different wedding styles
const WEDDING_STYLE_PALETTES = {
  traditional: {
    name: 'Classic Elegance',
    colors: {
      primary: '#8B4513',
      secondary: '#D4AF37',
      accent: '#F5F5DC',
      text: '#2C1810',
      background: '#FEFEFE',
      surface: '#F9F7F4',
    },
  },
  modern: {
    name: 'Contemporary Chic',
    colors: {
      primary: '#2563EB',
      secondary: '#64748B',
      accent: '#F1F5F9',
      text: '#0F172A',
      background: '#FFFFFF',
      surface: '#F8FAFC',
    },
  },
  rustic: {
    name: 'Natural Warmth',
    colors: {
      primary: '#92400E',
      secondary: '#059669',
      accent: '#FEF3C7',
      text: '#1C1917',
      background: '#FFFBEB',
      surface: '#F5F5F4',
    },
  },
  luxury: {
    name: 'Opulent Gold',
    colors: {
      primary: '#7C2D12',
      secondary: '#D97706',
      accent: '#FEF3C7',
      text: '#1C1917',
      background: '#FFFBEB',
      surface: '#FDF4E6',
    },
  },
  destination: {
    name: 'Ocean Breeze',
    colors: {
      primary: '#0EA5E9',
      secondary: '#06B6D4',
      accent: '#E0F7FA',
      text: '#0F172A',
      background: '#FFFFFF',
      surface: '#F0FDFF',
    },
  },
  boho: {
    name: 'Bohemian Earth',
    colors: {
      primary: '#A16207',
      secondary: '#DC2626',
      accent: '#FEF3C7',
      text: '#1C1917',
      background: '#FFFBEB',
      surface: '#F5F5F4',
    },
  },
};

// Font options
const FONT_OPTIONS = [
  { value: 'system', label: 'System Default', category: 'system' },
  { value: 'inter', label: 'Inter', category: 'modern' },
  { value: 'roboto', label: 'Roboto', category: 'modern' },
  { value: 'opensans', label: 'Open Sans', category: 'modern' },
  { value: 'playfair', label: 'Playfair Display', category: 'elegant' },
  { value: 'crimson', label: 'Crimson Text', category: 'elegant' },
  { value: 'merriweather', label: 'Merriweather', category: 'traditional' },
  { value: 'lora', label: 'Lora', category: 'traditional' },
  { value: 'montserrat', label: 'Montserrat', category: 'contemporary' },
  { value: 'poppins', label: 'Poppins', category: 'contemporary' },
  { value: 'dancing', label: 'Dancing Script', category: 'script' },
  { value: 'sacramento', label: 'Sacramento', category: 'script' },
];

// Pattern options
const PATTERN_OPTIONS = [
  { value: 'none', label: 'None', preview: '' },
  {
    value: 'dots',
    label: 'Polka Dots',
    preview: 'radial-gradient(circle, #00000010 1px, transparent 1px)',
  },
  {
    value: 'diagonal',
    label: 'Diagonal Lines',
    preview:
      'repeating-linear-gradient(45deg, transparent, transparent 10px, #00000008 10px, #00000008 20px)',
  },
  {
    value: 'grid',
    label: 'Grid',
    preview:
      'linear-gradient(#00000008 1px, transparent 1px), linear-gradient(90deg, #00000008 1px, transparent 1px)',
  },
  {
    value: 'waves',
    label: 'Waves',
    preview: 'radial-gradient(ellipse at top, #00000008, transparent)',
  },
  {
    value: 'hexagon',
    label: 'Hexagonal',
    preview:
      'radial-gradient(circle at 50% 50%, #00000008 2px, transparent 2px)',
  },
];

// Brand personality options
const BRAND_PERSONALITIES = [
  { value: 'elegant', label: 'Elegant', icon: Crown },
  { value: 'warm', label: 'Warm & Welcoming', icon: Heart },
  { value: 'professional', label: 'Professional', icon: Settings },
  { value: 'creative', label: 'Creative & Artistic', icon: Sparkles },
  { value: 'luxury', label: 'Luxury & Premium', icon: Star },
  { value: 'friendly', label: 'Friendly & Approachable', icon: Sun },
  { value: 'sophisticated', label: 'Sophisticated', icon: Zap },
  { value: 'romantic', label: 'Romantic', icon: Flower },
];

interface BrandingCustomizerProps {
  supplierId: string;
  existingBranding?: BrandingConfig;
  vendorType?: string;
  onSave: (branding: BrandingConfig) => Promise<void>;
  onPreview?: (branding: BrandingConfig) => void;
  className?: string;
}

export default function BrandingCustomizer({
  supplierId,
  existingBranding,
  vendorType = '',
  onSave,
  onPreview,
  className,
}: BrandingCustomizerProps) {
  // State management
  const [branding, setBranding] = useState<BrandingConfig>({
    supplier_id: supplierId,
    name: 'My Brand Theme',
    primary_color: '#7F56D9',
    secondary_color: '#9CA3AF',
    accent_color: '#F3F4F6',
    text_color: '#111827',
    background_color: '#FFFFFF',
    surface_color: '#F9FAFB',
    border_color: '#E5E7EB',
    success_color: '#10B981',
    warning_color: '#F59E0B',
    error_color: '#EF4444',
    font_family: 'inter',
    heading_font: 'inter',
    font_size_base: 16,
    font_weight_normal: 400,
    font_weight_bold: 600,
    line_height: 1.5,
    letter_spacing: 0,
    border_radius: 8,
    shadow_level: 'md',
    spacing_scale: 1,
    container_width: 'lg',
    theme_mode: 'light',
    color_scheme: 'vibrant',
    contrast_level: 'standard',
    vendor_type: vendorType,
    wedding_style: '',
    brand_personality: [],
    is_active: true,
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...existingBranding,
  });

  const [activeTab, setActiveTab] = useState('colors');
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');
  const [previewDevice, setPreviewDevice] = useState<
    'desktop' | 'tablet' | 'mobile'
  >('desktop');
  const [isSaving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Generate CSS variables from branding config
  const cssVariables = useMemo(() => {
    return {
      '--color-primary': branding.primary_color,
      '--color-secondary': branding.secondary_color || branding.primary_color,
      '--color-accent': branding.accent_color || '#F3F4F6',
      '--color-text': branding.text_color,
      '--color-background': branding.background_color,
      '--color-surface': branding.surface_color,
      '--color-border': branding.border_color,
      '--color-success': branding.success_color || '#10B981',
      '--color-warning': branding.warning_color || '#F59E0B',
      '--color-error': branding.error_color || '#EF4444',
      '--font-family': branding.font_family,
      '--font-heading': branding.heading_font || branding.font_family,
      '--font-size-base': `${branding.font_size_base}px`,
      '--font-weight-normal': branding.font_weight_normal,
      '--font-weight-bold': branding.font_weight_bold,
      '--line-height': branding.line_height,
      '--border-radius': `${branding.border_radius}px`,
      '--spacing-scale': branding.spacing_scale,
      '--letter-spacing': `${branding.letter_spacing}px`,
    };
  }, [branding]);

  // Handlers
  const handleColorChange = (key: keyof BrandingConfig, value: string) => {
    setBranding((prev) => ({
      ...prev,
      [key]: value,
      updated_at: new Date().toISOString(),
    }));
  };

  const handleBrandingChange = (key: keyof BrandingConfig, value: any) => {
    setBranding((prev) => ({
      ...prev,
      [key]: value,
      updated_at: new Date().toISOString(),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(branding);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    onPreview?.(branding);
  };

  const handleReset = () => {
    if (existingBranding) {
      setBranding(existingBranding);
    } else {
      setBranding((prev) => ({
        ...prev,
        primary_color: '#7F56D9',
        secondary_color: '#9CA3AF',
        text_color: '#111827',
        background_color: '#FFFFFF',
        surface_color: '#F9FAFB',
        font_family: 'inter',
        border_radius: 8,
        updated_at: new Date().toISOString(),
      }));
    }
  };

  const applyStylePalette = (
    stylePalette: (typeof WEDDING_STYLE_PALETTES)[keyof typeof WEDDING_STYLE_PALETTES],
  ) => {
    setBranding((prev) => ({
      ...prev,
      primary_color: stylePalette.colors.primary,
      secondary_color: stylePalette.colors.secondary,
      accent_color: stylePalette.colors.accent,
      text_color: stylePalette.colors.text,
      background_color: stylePalette.colors.background,
      surface_color: stylePalette.colors.surface,
      border_color: stylePalette.colors.surface,
      updated_at: new Date().toISOString(),
    }));
  };

  const copyColorValue = async (colorValue: string, colorName: string) => {
    try {
      await navigator.clipboard.writeText(colorValue);
      setCopied(colorName);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy color value:', error);
    }
  };

  const generateRandomPalette = () => {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 60 + Math.random() * 30; // 60-90%
    const lightness = 45 + Math.random() * 20; // 45-65%

    const primary = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    const secondary = `hsl(${(hue + 120) % 360}, ${saturation * 0.8}%, ${lightness + 10}%)`;
    const accent = `hsl(${hue}, ${saturation * 0.3}%, 95%)`;

    setBranding((prev) => ({
      ...prev,
      primary_color: primary,
      secondary_color: secondary,
      accent_color: accent,
      updated_at: new Date().toISOString(),
    }));
  };

  return (
    <div className={cn('max-w-7xl mx-auto p-6 space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Brand Customization
          </h1>
          <p className="text-gray-600 mt-1">
            Customize your client dashboard to match your wedding business brand
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            leftIcon={<RotateCcw className="h-4 w-4" />}
            onClick={handleReset}
          >
            Reset
          </Button>

          {onPreview && (
            <Button
              variant="secondary"
              leftIcon={<Eye className="h-4 w-4" />}
              onClick={handlePreview}
            >
              Preview
            </Button>
          )}

          <Button
            variant="primary"
            leftIcon={<Save className="h-4 w-4" />}
            loading={isSaving}
            onClick={handleSave}
          >
            Save Branding
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="colors" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Colors</span>
              </TabsTrigger>
              <TabsTrigger
                value="typography"
                className="flex items-center gap-2"
              >
                <Type className="h-4 w-4" />
                <span className="hidden sm:inline">Typography</span>
              </TabsTrigger>
              <TabsTrigger value="images" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                <span className="hidden sm:inline">Images</span>
              </TabsTrigger>
              <TabsTrigger value="layout" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Layout</span>
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                <span className="hidden sm:inline">Advanced</span>
              </TabsTrigger>
            </TabsList>

            {/* Colors Tab */}
            <TabsContent value="colors" className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Color Palette
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<RefreshCw className="h-4 w-4" />}
                      onClick={generateRandomPalette}
                    >
                      Random
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Sparkles className="h-4 w-4" />}
                    >
                      AI Suggest
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4">
                  {/* Primary Colors */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Primary Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={branding.primary_color}
                          onChange={(e) =>
                            handleColorChange('primary_color', e.target.value)
                          }
                          className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                        />
                        <Input
                          value={branding.primary_color}
                          onChange={(e) =>
                            handleColorChange('primary_color', e.target.value)
                          }
                          className="flex-1 font-mono text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyColorValue(branding.primary_color, 'primary')
                          }
                        >
                          {copied === 'primary' ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Secondary Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={
                            branding.secondary_color || branding.primary_color
                          }
                          onChange={(e) =>
                            handleColorChange('secondary_color', e.target.value)
                          }
                          className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                        />
                        <Input
                          value={branding.secondary_color || ''}
                          onChange={(e) =>
                            handleColorChange('secondary_color', e.target.value)
                          }
                          placeholder="Optional"
                          className="flex-1 font-mono text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyColorValue(
                              branding.secondary_color ||
                                branding.primary_color,
                              'secondary',
                            )
                          }
                        >
                          {copied === 'secondary' ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Background Colors */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Background
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={branding.background_color}
                          onChange={(e) =>
                            handleColorChange(
                              'background_color',
                              e.target.value,
                            )
                          }
                          className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                        />
                        <Input
                          value={branding.background_color}
                          onChange={(e) =>
                            handleColorChange(
                              'background_color',
                              e.target.value,
                            )
                          }
                          className="flex-1 font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Surface
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={branding.surface_color}
                          onChange={(e) =>
                            handleColorChange('surface_color', e.target.value)
                          }
                          className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                        />
                        <Input
                          value={branding.surface_color}
                          onChange={(e) =>
                            handleColorChange('surface_color', e.target.value)
                          }
                          className="flex-1 font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Text
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={branding.text_color}
                          onChange={(e) =>
                            handleColorChange('text_color', e.target.value)
                          }
                          className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                        />
                        <Input
                          value={branding.text_color}
                          onChange={(e) =>
                            handleColorChange('text_color', e.target.value)
                          }
                          className="flex-1 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Wedding Style Palettes */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Wedding Style Palettes
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(WEDDING_STYLE_PALETTES).map(
                    ([style, palette]) => (
                      <div
                        key={style}
                        className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-primary-300 transition-colors"
                        onClick={() => applyStylePalette(palette)}
                      >
                        <h4 className="font-medium text-sm mb-2">
                          {palette.name}
                        </h4>
                        <div className="flex gap-2 mb-2">
                          {Object.values(palette.colors)
                            .slice(0, 4)
                            .map((color, index) => (
                              <div
                                key={index}
                                className="w-6 h-6 rounded-full border border-gray-200"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                        </div>
                        <p className="text-xs text-gray-600 capitalize">
                          {style} style
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* Typography Tab */}
            <TabsContent value="typography" className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Typography Settings
                </h3>

                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Body Font
                      </label>
                      <select
                        value={branding.font_family}
                        onChange={(e) =>
                          handleBrandingChange('font_family', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300"
                      >
                        {FONT_OPTIONS.map((font) => (
                          <option key={font.value} value={font.value}>
                            {font.label} ({font.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Heading Font
                      </label>
                      <select
                        value={branding.heading_font || branding.font_family}
                        onChange={(e) =>
                          handleBrandingChange('heading_font', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300"
                      >
                        {FONT_OPTIONS.map((font) => (
                          <option key={font.value} value={font.value}>
                            {font.label} ({font.category})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Base Size (px)
                      </label>
                      <Input
                        type="number"
                        value={branding.font_size_base}
                        onChange={(e) =>
                          handleBrandingChange(
                            'font_size_base',
                            parseInt(e.target.value),
                          )
                        }
                        min="12"
                        max="24"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Line Height
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        value={branding.line_height}
                        onChange={(e) =>
                          handleBrandingChange(
                            'line_height',
                            parseFloat(e.target.value),
                          )
                        }
                        min="1"
                        max="2"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Letter Spacing (px)
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        value={branding.letter_spacing || 0}
                        onChange={(e) =>
                          handleBrandingChange(
                            'letter_spacing',
                            parseFloat(e.target.value),
                          )
                        }
                        min="-2"
                        max="2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Normal Weight
                      </label>
                      <select
                        value={branding.font_weight_normal}
                        onChange={(e) =>
                          handleBrandingChange(
                            'font_weight_normal',
                            parseInt(e.target.value),
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300"
                      >
                        <option value="300">Light (300)</option>
                        <option value="400">Regular (400)</option>
                        <option value="500">Medium (500)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Bold Weight
                      </label>
                      <select
                        value={branding.font_weight_bold}
                        onChange={(e) =>
                          handleBrandingChange(
                            'font_weight_bold',
                            parseInt(e.target.value),
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300"
                      >
                        <option value="500">Medium (500)</option>
                        <option value="600">Semi Bold (600)</option>
                        <option value="700">Bold (700)</option>
                        <option value="800">Extra Bold (800)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Images Tab */}
            <TabsContent value="images" className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Brand Assets
                </h3>

                <div className="grid gap-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Logo (Light Theme)
                      </label>
                      <div className="border border-dashed border-gray-300 rounded-lg p-4">
                        {branding.logo_url ? (
                          <div className="flex items-center justify-between">
                            <img
                              src={branding.logo_url}
                              alt="Logo"
                              className="h-12 object-contain"
                              onError={(e) =>
                                (e.currentTarget.style.display = 'none')
                              }
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Trash2 className="h-4 w-4" />}
                              onClick={() =>
                                handleBrandingChange('logo_url', '')
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600">Upload logo</p>
                          </div>
                        )}
                      </div>
                      <Input
                        placeholder="Or enter logo URL"
                        value={branding.logo_url || ''}
                        onChange={(e) =>
                          handleBrandingChange('logo_url', e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Logo (Dark Theme)
                      </label>
                      <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-900">
                        {branding.logo_dark_url ? (
                          <div className="flex items-center justify-between">
                            <img
                              src={branding.logo_dark_url}
                              alt="Dark Logo"
                              className="h-12 object-contain"
                              onError={(e) =>
                                (e.currentTarget.style.display = 'none')
                              }
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Trash2 className="h-4 w-4" />}
                              onClick={() =>
                                handleBrandingChange('logo_dark_url', '')
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-gray-400">
                              Upload dark logo
                            </p>
                          </div>
                        )}
                      </div>
                      <Input
                        placeholder="Or enter dark logo URL"
                        value={branding.logo_dark_url || ''}
                        onChange={(e) =>
                          handleBrandingChange('logo_dark_url', e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Background Image
                    </label>
                    <Input
                      placeholder="Background image URL (optional)"
                      value={branding.background_image_url || ''}
                      onChange={(e) =>
                        handleBrandingChange(
                          'background_image_url',
                          e.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Background Pattern
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PATTERN_OPTIONS.map((pattern) => (
                        <div
                          key={pattern.value}
                          className={cn(
                            'p-4 border rounded-lg cursor-pointer transition-colors',
                            branding.background_pattern === pattern.value
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300',
                          )}
                          onClick={() =>
                            handleBrandingChange(
                              'background_pattern',
                              pattern.value,
                            )
                          }
                        >
                          <div
                            className="w-full h-12 rounded mb-2 border border-gray-200"
                            style={{
                              backgroundImage: pattern.preview,
                              backgroundSize: '20px 20px',
                            }}
                          />
                          <p className="text-xs text-center">{pattern.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Layout Tab */}
            <TabsContent value="layout" className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Layout & Spacing
                </h3>

                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Border Radius (px)
                      </label>
                      <Input
                        type="number"
                        value={branding.border_radius}
                        onChange={(e) =>
                          handleBrandingChange(
                            'border_radius',
                            parseInt(e.target.value),
                          )
                        }
                        min="0"
                        max="24"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Shadow Level
                      </label>
                      <select
                        value={branding.shadow_level}
                        onChange={(e) =>
                          handleBrandingChange('shadow_level', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300"
                      >
                        <option value="none">None</option>
                        <option value="sm">Small</option>
                        <option value="md">Medium</option>
                        <option value="lg">Large</option>
                        <option value="xl">Extra Large</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Spacing Scale
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        value={branding.spacing_scale}
                        onChange={(e) =>
                          handleBrandingChange(
                            'spacing_scale',
                            parseFloat(e.target.value),
                          )
                        }
                        min="0.5"
                        max="2"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Container Width
                      </label>
                      <select
                        value={branding.container_width}
                        onChange={(e) =>
                          handleBrandingChange(
                            'container_width',
                            e.target.value,
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300"
                      >
                        <option value="sm">Small (640px)</option>
                        <option value="md">Medium (768px)</option>
                        <option value="lg">Large (1024px)</option>
                        <option value="xl">Extra Large (1280px)</option>
                        <option value="full">Full Width</option>
                      </select>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Brand Personality */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Brand Personality
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Select traits that describe your brand personality (affects
                  color schemes and layouts)
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {BRAND_PERSONALITIES.map((personality) => {
                    const IconComponent = personality.icon;
                    const isSelected = branding.brand_personality.includes(
                      personality.value,
                    );

                    return (
                      <div
                        key={personality.value}
                        className={cn(
                          'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                          isSelected
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300',
                        )}
                        onClick={() => {
                          const newPersonalities = isSelected
                            ? branding.brand_personality.filter(
                                (p) => p !== personality.value,
                              )
                            : [
                                ...branding.brand_personality,
                                personality.value,
                              ];
                          handleBrandingChange(
                            'brand_personality',
                            newPersonalities,
                          );
                        }}
                      >
                        <IconComponent className="h-5 w-5 text-gray-600" />
                        <span className="text-sm font-medium">
                          {personality.label}
                        </span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary-600 ml-auto" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Advanced Settings
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Theme Mode
                      </label>
                      <select
                        value={branding.theme_mode}
                        onChange={(e) =>
                          handleBrandingChange('theme_mode', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto (System)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Color Scheme
                      </label>
                      <select
                        value={branding.color_scheme}
                        onChange={(e) =>
                          handleBrandingChange('color_scheme', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300"
                      >
                        <option value="vibrant">Vibrant</option>
                        <option value="muted">Muted</option>
                        <option value="monochrome">Monochrome</option>
                        <option value="pastel">Pastel</option>
                        <option value="bold">Bold</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Contrast Level
                      </label>
                      <select
                        value={branding.contrast_level}
                        onChange={(e) =>
                          handleBrandingChange('contrast_level', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300"
                      >
                        <option value="standard">Standard</option>
                        <option value="high">High Contrast</option>
                        <option value="higher">Higher Contrast</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Custom CSS
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300 font-mono text-sm"
                      rows={6}
                      value={branding.custom_css || ''}
                      onChange={(e) =>
                        handleBrandingChange('custom_css', e.target.value)
                      }
                      placeholder="/* Add custom CSS here */
.dashboard-header {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
}

.client-card {
  border-left: 4px solid var(--color-primary);
}"
                    />
                    <p className="text-xs text-gray-500">
                      Use CSS variables like <code>var(--color-primary)</code>{' '}
                      to reference your brand colors
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-1">
          <Card className="p-4 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Live Preview
              </h3>
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={cn(
                    'p-1 rounded transition-colors',
                    previewDevice === 'desktop'
                      ? 'bg-white shadow-sm'
                      : 'hover:bg-gray-200',
                  )}
                >
                  <Monitor className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setPreviewDevice('tablet')}
                  className={cn(
                    'p-1 rounded transition-colors',
                    previewDevice === 'tablet'
                      ? 'bg-white shadow-sm'
                      : 'hover:bg-gray-200',
                  )}
                >
                  <Tablet className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={cn(
                    'p-1 rounded transition-colors',
                    previewDevice === 'mobile'
                      ? 'bg-white shadow-sm'
                      : 'hover:bg-gray-200',
                  )}
                >
                  <Smartphone className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Preview Container */}
            <div
              className={cn(
                'border rounded-lg overflow-hidden transition-all',
                previewDevice === 'mobile' && 'max-w-xs mx-auto',
                previewDevice === 'tablet' && 'max-w-md mx-auto',
              )}
              style={cssVariables}
            >
              {/* Header Preview */}
              <div
                className="p-4 text-white"
                style={{
                  backgroundColor: branding.primary_color,
                  backgroundImage:
                    branding.background_pattern &&
                    branding.background_pattern !== 'none'
                      ? PATTERN_OPTIONS.find(
                          (p) => p.value === branding.background_pattern,
                        )?.preview
                      : undefined,
                }}
              >
                {branding.logo_url && (
                  <img
                    src={branding.logo_url}
                    alt="Logo Preview"
                    className="h-6 mb-2"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
                <h2
                  className="font-bold"
                  style={{
                    fontFamily: branding.heading_font || branding.font_family,
                    fontWeight: branding.font_weight_bold,
                    fontSize: `${branding.font_size_base * 1.125}px`,
                    letterSpacing: `${branding.letter_spacing}px`,
                  }}
                >
                  {branding.name}
                </h2>
                <p
                  className="opacity-90 text-sm"
                  style={{
                    fontFamily: branding.font_family,
                    fontWeight: branding.font_weight_normal,
                    fontSize: `${branding.font_size_base * 0.875}px`,
                  }}
                >
                  Client Dashboard
                </p>
              </div>

              {/* Content Preview */}
              <div
                className="p-4 space-y-4"
                style={{
                  backgroundColor: branding.background_color,
                  color: branding.text_color,
                  fontFamily: branding.font_family,
                  fontSize: `${branding.font_size_base}px`,
                  lineHeight: branding.line_height,
                }}
              >
                {/* Card Preview */}
                <div
                  className="p-4 border shadow-sm"
                  style={{
                    backgroundColor: branding.surface_color,
                    borderColor: branding.border_color,
                    borderRadius: `${branding.border_radius}px`,
                    boxShadow:
                      branding.shadow_level === 'none'
                        ? 'none'
                        : branding.shadow_level === 'sm'
                          ? '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                          : branding.shadow_level === 'md'
                            ? '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            : branding.shadow_level === 'lg'
                              ? '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                              : '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                  }}
                >
                  <h3
                    className="font-medium mb-2"
                    style={{
                      fontWeight: branding.font_weight_bold,
                      fontSize: `${branding.font_size_base * 1.125}px`,
                    }}
                  >
                    Wedding Timeline
                  </h3>
                  <p className="text-sm opacity-75">
                    Track your wedding planning progress with our interactive
                    timeline.
                  </p>
                  <div
                    className="mt-3 px-3 py-1 rounded text-white text-sm inline-block"
                    style={{
                      backgroundColor: branding.primary_color,
                      borderRadius: `${branding.border_radius * 0.5}px`,
                    }}
                  >
                    View Details
                  </div>
                </div>

                {/* Secondary Card */}
                <div
                  className="p-3 border"
                  style={{
                    backgroundColor: branding.surface_color,
                    borderColor: branding.border_color,
                    borderRadius: `${branding.border_radius}px`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Budget Tracker</span>
                    <span
                      className="text-sm"
                      style={{ color: branding.secondary_color }}
                    >
                      £12,500 / £25,000
                    </span>
                  </div>
                  <div
                    className="mt-2 h-2 rounded-full"
                    style={{ backgroundColor: branding.border_color }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: branding.primary_color,
                        width: '50%',
                        borderRadius: `${branding.border_radius * 0.5}px`,
                      }}
                    />
                  </div>
                </div>

                {/* Color Swatches */}
                <div className="flex gap-2 pt-2">
                  <div
                    className="w-6 h-6 rounded border"
                    style={{
                      backgroundColor: branding.primary_color,
                      borderRadius: `${branding.border_radius * 0.25}px`,
                    }}
                  />
                  <div
                    className="w-6 h-6 rounded border"
                    style={{
                      backgroundColor: branding.secondary_color,
                      borderRadius: `${branding.border_radius * 0.25}px`,
                    }}
                  />
                  <div
                    className="w-6 h-6 rounded border border-gray-200"
                    style={{
                      backgroundColor: branding.accent_color,
                      borderRadius: `${branding.border_radius * 0.25}px`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Preview Controls */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setPreviewMode(previewMode === 'light' ? 'dark' : 'light')
                    }
                    className="flex items-center gap-1 hover:text-gray-900"
                  >
                    {previewMode === 'light' ? (
                      <Moon className="h-4 w-4" />
                    ) : (
                      <Sun className="h-4 w-4" />
                    )}
                    {previewMode === 'light' ? 'Dark' : 'Light'}
                  </button>
                </div>
                <div className="text-xs">Live Preview</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
