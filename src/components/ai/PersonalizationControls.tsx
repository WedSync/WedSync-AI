'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  MapPin,
  Calendar,
  DollarSign,
  Heart,
  Palette,
  Volume2,
  Zap,
  Target,
  Sliders,
  Plus,
  Minus,
  Save,
  RotateCcw,
  Wand2,
  Building,
  TreePine,
  Waves,
  Home,
  Crown,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WeddingContext {
  venue_type: string;
  venue_name: string;
  wedding_style: string;
  guest_count: number;
  budget_range: string;
  season: string;
  date: string;
  location: string;
}

interface CouplePreferences {
  communication_style: 'formal' | 'friendly' | 'casual';
  priorities: string[];
  special_requirements: string;
  tone_preferences: string[];
  avoid_topics: string[];
}

interface SupplierBrand {
  voice: 'professional' | 'warm' | 'modern' | 'traditional' | 'creative';
  style: 'concise' | 'detailed' | 'storytelling' | 'technical';
  values: string[];
  signature_phrases: string[];
  brand_colors?: string[];
}

interface PersonalizationSettings {
  intensity: number; // 0-100
  auto_populate: boolean;
  context_awareness: boolean;
  brand_consistency: boolean;
  emotional_tone: boolean;
  local_references: boolean;
}

interface TemplateVariable {
  id: string;
  name: string;
  token: string;
  value: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'list';
  required: boolean;
  auto_detected: boolean;
}

interface PersonalizationControlsProps {
  weddingContext: WeddingContext;
  couplePreferences: CouplePreferences;
  supplierBrand: SupplierBrand;
  personalizationSettings: PersonalizationSettings;
  templateVariables: TemplateVariable[];
  onWeddingContextUpdate: (context: Partial<WeddingContext>) => void;
  onCouplePreferencesUpdate: (preferences: Partial<CouplePreferences>) => void;
  onSupplierBrandUpdate: (brand: Partial<SupplierBrand>) => void;
  onPersonalizationSettingsUpdate: (
    settings: Partial<PersonalizationSettings>,
  ) => void;
  onTemplateVariableUpdate: (variableId: string, value: string) => void;
  onAddTemplateVariable: (variable: Omit<TemplateVariable, 'id'>) => void;
  onRemoveTemplateVariable: (variableId: string) => void;
  onSaveConfiguration: () => void;
  onResetToDefaults: () => void;
  className?: string;
}

const VENUE_TYPES = [
  { value: 'hotel', label: 'Hotel', icon: Building },
  { value: 'beach', label: 'Beach', icon: Waves },
  { value: 'barn', label: 'Barn/Rustic', icon: Home },
  { value: 'garden', label: 'Garden', icon: TreePine },
  { value: 'mansion', label: 'Mansion/Estate', icon: Crown },
  { value: 'other', label: 'Other', icon: MapPin },
];

const WEDDING_STYLES = [
  'Traditional',
  'Modern',
  'Rustic',
  'Elegant',
  'Bohemian',
  'Vintage',
  'Minimalist',
  'Romantic',
  'Glamorous',
  'Industrial',
];

const BUDGET_RANGES = [
  'Under £10k',
  '£10k-£20k',
  '£20k-£35k',
  '£35k-£50k',
  '£50k-£75k',
  '£75k-£100k',
  'Over £100k',
];

const COMMUNICATION_STYLES = [
  {
    value: 'formal',
    label: 'Professional & Formal',
    description: 'Traditional business communication',
  },
  {
    value: 'friendly',
    label: 'Warm & Friendly',
    description: 'Approachable and personable',
  },
  {
    value: 'casual',
    label: 'Casual & Relaxed',
    description: 'Conversational and laid-back',
  },
];

const BRAND_VOICES = [
  {
    value: 'professional',
    label: 'Professional',
    description: 'Authoritative and trustworthy',
  },
  { value: 'warm', label: 'Warm', description: 'Friendly and approachable' },
  { value: 'modern', label: 'Modern', description: 'Contemporary and trendy' },
  {
    value: 'traditional',
    label: 'Traditional',
    description: 'Classic and timeless',
  },
  { value: 'creative', label: 'Creative', description: 'Artistic and unique' },
];

const PersonalizationControls: React.FC<PersonalizationControlsProps> = ({
  weddingContext,
  couplePreferences,
  supplierBrand,
  personalizationSettings,
  templateVariables,
  onWeddingContextUpdate,
  onCouplePreferencesUpdate,
  onSupplierBrandUpdate,
  onPersonalizationSettingsUpdate,
  onTemplateVariableUpdate,
  onAddTemplateVariable,
  onRemoveTemplateVariable,
  onSaveConfiguration,
  onResetToDefaults,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState('wedding');
  const [newVariable, setNewVariable] = useState<Partial<TemplateVariable>>({
    name: '',
    token: '',
    value: '',
    type: 'text',
    required: false,
    auto_detected: false,
  });

  // Auto-generate token from variable name
  useEffect(() => {
    if (newVariable.name) {
      const token = `{${newVariable.name.toLowerCase().replace(/\s+/g, '_')}}`;
      setNewVariable((prev) => ({ ...prev, token }));
    }
  }, [newVariable.name]);

  const handleAddVariable = () => {
    if (newVariable.name && newVariable.token) {
      onAddTemplateVariable({
        name: newVariable.name,
        token: newVariable.token,
        value: newVariable.value || '',
        type: newVariable.type || 'text',
        required: newVariable.required || false,
        auto_detected: false,
      });
      setNewVariable({
        name: '',
        token: '',
        value: '',
        type: 'text',
        required: false,
        auto_detected: false,
      });
    }
  };

  const getVenueIcon = (venueType: string) => {
    const venueConfig = VENUE_TYPES.find((v) => v.value === venueType);
    const Icon = venueConfig?.icon || MapPin;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Settings className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold">Personalization Controls</h2>
            <p className="text-sm text-gray-600">
              Configure AI content personalization settings
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={onResetToDefaults}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={onSaveConfiguration}>
            <Save className="w-4 h-4 mr-2" />
            Save Configuration
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="wedding" className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Wedding
          </TabsTrigger>
          <TabsTrigger value="couple" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Couple
          </TabsTrigger>
          <TabsTrigger value="brand" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Brand
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="variables" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Variables
          </TabsTrigger>
        </TabsList>

        {/* Wedding Context Tab */}
        <TabsContent value="wedding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Wedding Context
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Venue Type</Label>
                  <Select
                    value={weddingContext.venue_type}
                    onValueChange={(value) =>
                      onWeddingContextUpdate({ venue_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VENUE_TYPES.map((venue) => (
                        <SelectItem key={venue.value} value={venue.value}>
                          <div className="flex items-center gap-2">
                            <venue.icon className="w-4 h-4" />
                            {venue.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Venue Name</Label>
                  <Input
                    value={weddingContext.venue_name}
                    onChange={(e) =>
                      onWeddingContextUpdate({ venue_name: e.target.value })
                    }
                    placeholder="Enter venue name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Wedding Style</Label>
                  <Select
                    value={weddingContext.wedding_style}
                    onValueChange={(value) =>
                      onWeddingContextUpdate({ wedding_style: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEDDING_STYLES.map((style) => (
                        <SelectItem key={style} value={style.toLowerCase()}>
                          {style}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Guest Count</Label>
                  <Input
                    type="number"
                    value={weddingContext.guest_count}
                    onChange={(e) =>
                      onWeddingContextUpdate({
                        guest_count: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="Number of guests"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Budget Range</Label>
                  <Select
                    value={weddingContext.budget_range}
                    onValueChange={(value) =>
                      onWeddingContextUpdate({ budget_range: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUDGET_RANGES.map((range) => (
                        <SelectItem key={range} value={range}>
                          {range}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Season</Label>
                  <Select
                    value={weddingContext.season}
                    onValueChange={(value) =>
                      onWeddingContextUpdate({ season: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spring">Spring</SelectItem>
                      <SelectItem value="summer">Summer</SelectItem>
                      <SelectItem value="autumn">Autumn</SelectItem>
                      <SelectItem value="winter">Winter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Wedding Date</Label>
                  <Input
                    type="date"
                    value={weddingContext.date}
                    onChange={(e) =>
                      onWeddingContextUpdate({ date: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={weddingContext.location}
                    onChange={(e) =>
                      onWeddingContextUpdate({ location: e.target.value })
                    }
                    placeholder="City, Country"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Couple Preferences Tab */}
        <TabsContent value="couple" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Couple Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Communication Style</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {COMMUNICATION_STYLES.map((style) => (
                    <Card
                      key={style.value}
                      className={`cursor-pointer transition-colors ${
                        couplePreferences.communication_style === style.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'hover:border-gray-300'
                      }`}
                      onClick={() =>
                        onCouplePreferencesUpdate({
                          communication_style: style.value as any,
                        })
                      }
                    >
                      <CardContent className="p-4">
                        <h4 className="font-medium">{style.label}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {style.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Special Requirements</Label>
                <Textarea
                  value={couplePreferences.special_requirements}
                  onChange={(e) =>
                    onCouplePreferencesUpdate({
                      special_requirements: e.target.value,
                    })
                  }
                  placeholder="Any special needs, accessibility requirements, dietary restrictions, etc."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority Areas (comma-separated)</Label>
                  <Input
                    value={couplePreferences.priorities.join(', ')}
                    onChange={(e) =>
                      onCouplePreferencesUpdate({
                        priorities: e.target.value
                          .split(',')
                          .map((p) => p.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="photography, music, catering"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Topics to Avoid</Label>
                  <Input
                    value={couplePreferences.avoid_topics.join(', ')}
                    onChange={(e) =>
                      onCouplePreferencesUpdate({
                        avoid_topics: e.target.value
                          .split(',')
                          .map((p) => p.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="ex-partners, family drama"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brand Settings Tab */}
        <TabsContent value="brand" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Supplier Brand Voice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Brand Voice</Label>
                  <Select
                    value={supplierBrand.voice}
                    onValueChange={(value) =>
                      onSupplierBrandUpdate({ voice: value as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAND_VOICES.map((voice) => (
                        <SelectItem key={voice.value} value={voice.value}>
                          <div>
                            <div className="font-medium">{voice.label}</div>
                            <div className="text-xs text-gray-500">
                              {voice.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Writing Style</Label>
                  <Select
                    value={supplierBrand.style}
                    onValueChange={(value) =>
                      onSupplierBrandUpdate({ style: value as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concise">Concise & Direct</SelectItem>
                      <SelectItem value="detailed">
                        Detailed & Thorough
                      </SelectItem>
                      <SelectItem value="storytelling">Storytelling</SelectItem>
                      <SelectItem value="technical">
                        Technical & Precise
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Brand Values (comma-separated)</Label>
                <Input
                  value={supplierBrand.values.join(', ')}
                  onChange={(e) =>
                    onSupplierBrandUpdate({
                      values: e.target.value
                        .split(',')
                        .map((v) => v.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="quality, creativity, reliability"
                />
              </div>

              <div className="space-y-2">
                <Label>Signature Phrases (comma-separated)</Label>
                <Textarea
                  value={supplierBrand.signature_phrases.join(', ')}
                  onChange={(e) =>
                    onSupplierBrandUpdate({
                      signature_phrases: e.target.value
                        .split(',')
                        .map((p) => p.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Capturing your perfect day, Excellence in every detail"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personalization Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sliders className="w-5 h-5" />
                Personalization Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Personalization Intensity</Label>
                  <Badge variant="outline">
                    {personalizationSettings.intensity}%
                  </Badge>
                </div>
                <Slider
                  value={[personalizationSettings.intensity]}
                  onValueChange={([value]) =>
                    onPersonalizationSettingsUpdate({ intensity: value })
                  }
                  max={100}
                  step={10}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Subtle</span>
                  <span>Moderate</span>
                  <span>Highly Personalized</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Auto-populate Variables</Label>
                    <p className="text-sm text-gray-500">
                      Automatically fill variables from available data
                    </p>
                  </div>
                  <Switch
                    checked={personalizationSettings.auto_populate}
                    onCheckedChange={(checked) =>
                      onPersonalizationSettingsUpdate({
                        auto_populate: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Context Awareness</Label>
                    <p className="text-sm text-gray-500">
                      Use wedding context for smarter suggestions
                    </p>
                  </div>
                  <Switch
                    checked={personalizationSettings.context_awareness}
                    onCheckedChange={(checked) =>
                      onPersonalizationSettingsUpdate({
                        context_awareness: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Brand Consistency</Label>
                    <p className="text-sm text-gray-500">
                      Maintain supplier brand voice and values
                    </p>
                  </div>
                  <Switch
                    checked={personalizationSettings.brand_consistency}
                    onCheckedChange={(checked) =>
                      onPersonalizationSettingsUpdate({
                        brand_consistency: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Emotional Tone</Label>
                    <p className="text-sm text-gray-500">
                      Adapt emotional tone based on context
                    </p>
                  </div>
                  <Switch
                    checked={personalizationSettings.emotional_tone}
                    onCheckedChange={(checked) =>
                      onPersonalizationSettingsUpdate({
                        emotional_tone: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Local References</Label>
                    <p className="text-sm text-gray-500">
                      Include location-specific references
                    </p>
                  </div>
                  <Switch
                    checked={personalizationSettings.local_references}
                    onCheckedChange={(checked) =>
                      onPersonalizationSettingsUpdate({
                        local_references: checked,
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Template Variables Tab */}
        <TabsContent value="variables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Template Variables
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Variables */}
              <div className="space-y-3">
                {templateVariables.map((variable) => (
                  <div
                    key={variable.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg"
                  >
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Name</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {variable.name}
                          </span>
                          {variable.auto_detected && (
                            <Badge variant="secondary" className="text-xs">
                              <Wand2 className="w-3 h-3 mr-1" />
                              Auto
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Token</Label>
                        <Badge variant="outline" className="text-xs font-mono">
                          {variable.token}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Value</Label>
                        <Input
                          value={variable.value}
                          onChange={(e) =>
                            onTemplateVariableUpdate(
                              variable.id,
                              e.target.value,
                            )
                          }
                          className="text-xs"
                          placeholder="Enter value"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <div className="flex items-center justify-between">
                          <Badge variant="ghost" className="text-xs">
                            {variable.type}
                          </Badge>
                          {!variable.auto_detected && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                onRemoveTemplateVariable(variable.id)
                              }
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Add New Variable */}
              <div className="space-y-3">
                <Label className="font-medium">Add New Variable</Label>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Variable Name</Label>
                    <Input
                      value={newVariable.name}
                      onChange={(e) =>
                        setNewVariable((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="e.g., Couple Names"
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Token (auto-generated)</Label>
                    <Input
                      value={newVariable.token}
                      onChange={(e) =>
                        setNewVariable((prev) => ({
                          ...prev,
                          token: e.target.value,
                        }))
                      }
                      className="text-sm font-mono"
                      placeholder="{token}"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Default Value</Label>
                    <Input
                      value={newVariable.value}
                      onChange={(e) =>
                        setNewVariable((prev) => ({
                          ...prev,
                          value: e.target.value,
                        }))
                      }
                      placeholder="Default value"
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={newVariable.type}
                        onValueChange={(value) =>
                          setNewVariable((prev) => ({
                            ...prev,
                            type: value as any,
                          }))
                        }
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="currency">Currency</SelectItem>
                          <SelectItem value="list">List</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={handleAddVariable}
                        disabled={!newVariable.name || !newVariable.token}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PersonalizationControls;
