'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Lightbulb,
  Mail,
  RefreshCw,
  Settings,
  Sparkles,
  Users,
  Wand2,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import {
  AIEmailGenerationRequest,
  AIEmailGenerationResponse,
  GeneratedEmailTemplate,
} from '@/lib/services/ai-email-generator';
import {
  PersonalizationRecommendation,
  ContextualInsight,
} from '@/lib/services/email-personalization-engine';

interface AIEmailTemplateEditorProps {
  clientId?: string;
  vendorId?: string;
  initialTemplate?: GeneratedEmailTemplate;
  onSave?: (template: GeneratedEmailTemplate) => void;
  onCancel?: () => void;
}

interface GenerationState {
  isGenerating: boolean;
  currentTemplate: GeneratedEmailTemplate | null;
  alternatives: GeneratedEmailTemplate[];
  recommendations: PersonalizationRecommendation[];
  insights: ContextualInsight[];
  generationProgress: number;
  error: string | null;
}

const TEMPLATE_TYPES = [
  {
    value: 'welcome',
    label: 'Welcome Message',
    description: 'First contact with new clients',
  },
  {
    value: 'payment_reminder',
    label: 'Payment Reminder',
    description: 'Gentle payment due notifications',
  },
  {
    value: 'meeting_confirmation',
    label: 'Meeting Confirmation',
    description: 'Confirm appointments and meetings',
  },
  {
    value: 'thank_you',
    label: 'Thank You',
    description: 'Express gratitude and appreciation',
  },
  {
    value: 'client_communication',
    label: 'Client Update',
    description: 'General client communications',
  },
  {
    value: 'custom',
    label: 'Custom Template',
    description: 'Create from scratch',
  },
];

const TONE_OPTIONS = [
  {
    value: 'formal',
    label: 'Formal',
    description: 'Professional and structured',
  },
  {
    value: 'friendly',
    label: 'Friendly',
    description: 'Warm and approachable',
  },
  {
    value: 'professional',
    label: 'Professional',
    description: 'Business-appropriate',
  },
  { value: 'warm', label: 'Warm', description: 'Personal and caring' },
  { value: 'urgent', label: 'Urgent', description: 'Time-sensitive matters' },
  {
    value: 'celebratory',
    label: 'Celebratory',
    description: 'Joyful occasions',
  },
];

const LENGTH_OPTIONS = [
  { value: 'short', label: 'Short', description: 'Concise and to the point' },
  { value: 'medium', label: 'Medium', description: 'Balanced detail level' },
  { value: 'long', label: 'Long', description: 'Comprehensive and detailed' },
];

export default function AIEmailTemplateEditor({
  clientId,
  vendorId,
  initialTemplate,
  onSave,
  onCancel,
}: AIEmailTemplateEditorProps) {
  // State management
  const [generationRequest, setGenerationRequest] =
    useState<AIEmailGenerationRequest>({
      context: {
        communication_purpose: '',
        relationship_stage: 'existing_client',
        client_name: '',
        vendor_name: '',
        wedding_date: '',
        venue_name: '',
      },
      style_preferences: {
        use_emojis: false,
        include_personal_touches: true,
        formal_language: false,
        include_vendor_branding: true,
        template_structure: 'standard',
      },
      personalization_data: {},
      template_type: 'welcome',
      tone: 'professional',
      length: 'medium',
      include_call_to_action: true,
    });

  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false,
    currentTemplate: initialTemplate || null,
    alternatives: [],
    recommendations: [],
    insights: [],
    generationProgress: 0,
    error: null,
  });

  const [activeTab, setActiveTab] = useState('generate');
  const [refinementInstructions, setRefinementInstructions] = useState('');
  const [selectedAlternative, setSelectedAlternative] = useState<number>(-1);

  // Load personalization data on component mount
  useEffect(() => {
    if (clientId) {
      loadPersonalizationData();
    }
  }, [clientId]);

  // Load personalization recommendations and insights
  const loadPersonalizationData = useCallback(async () => {
    if (!clientId) return;

    try {
      const [recommendationsRes, insightsRes] = await Promise.all([
        fetch(
          `/api/ai-email-templates?action=recommendations&client_id=${clientId}&vendor_id=${vendorId || ''}&template_type=${generationRequest.template_type}`,
        ),
        fetch(
          `/api/ai-email-templates?action=insights&client_id=${clientId}&vendor_id=${vendorId || ''}&template_type=${generationRequest.template_type}`,
        ),
      ]);

      if (recommendationsRes.ok) {
        const {
          data: { recommendations },
        } = await recommendationsRes.json();
        setGenerationState((prev) => ({ ...prev, recommendations }));
      }

      if (insightsRes.ok) {
        const {
          data: { insights },
        } = await insightsRes.json();
        setGenerationState((prev) => ({ ...prev, insights }));
      }
    } catch (error) {
      console.error('Failed to load personalization data:', error);
    }
  }, [clientId, vendorId, generationRequest.template_type]);

  // Generate AI email template
  const generateTemplate = async () => {
    setGenerationState((prev) => ({
      ...prev,
      isGenerating: true,
      error: null,
      generationProgress: 0,
    }));

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setGenerationState((prev) => ({
        ...prev,
        generationProgress: Math.min(prev.generationProgress + 10, 90),
      }));
    }, 200);

    try {
      const response = await fetch('/api/ai-email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          client_id: clientId,
          vendor_id: vendorId,
          ...generationRequest,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setGenerationState((prev) => ({
          ...prev,
          currentTemplate: result.data.generated_template,
          alternatives: result.data.alternatives || [],
          generationProgress: 100,
        }));

        toast({
          title: 'Template Generated!',
          description: `Generated in ${result.data.generation_metadata.generation_time_ms}ms with ${result.data.personalization_score * 100}% personalization.`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setGenerationState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Generation failed',
      }));

      toast({
        title: 'Generation Failed',
        description: 'Please try again with different parameters.',
        variant: 'destructive',
      });
    } finally {
      clearInterval(progressInterval);
      setGenerationState((prev) => ({ ...prev, isGenerating: false }));
    }
  };

  // Refine existing template
  const refineTemplate = async () => {
    if (!generationState.currentTemplate || !refinementInstructions.trim()) {
      toast({
        title: 'Refinement Required',
        description: 'Please provide refinement instructions.',
        variant: 'destructive',
      });
      return;
    }

    setGenerationState((prev) => ({
      ...prev,
      isGenerating: true,
      error: null,
    }));

    try {
      const response = await fetch('/api/ai-email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refine',
          template: generationState.currentTemplate,
          refinement_instructions: refinementInstructions,
          context: generationRequest.context,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setGenerationState((prev) => ({
          ...prev,
          currentTemplate: result.data.generated_template,
        }));
        setRefinementInstructions('');

        toast({
          title: 'Template Refined!',
          description: 'Your template has been successfully updated.',
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Refinement Failed',
        description:
          error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGenerationState((prev) => ({ ...prev, isGenerating: false }));
    }
  };

  // Generate template variations
  const generateVariations = async () => {
    setGenerationState((prev) => ({ ...prev, isGenerating: true }));

    try {
      const response = await fetch('/api/ai-email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'variations',
          base_request: generationRequest,
          variation_count: 3,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setGenerationState((prev) => ({
          ...prev,
          alternatives: result.data.variations,
        }));

        toast({
          title: 'Variations Generated!',
          description: `Generated ${result.data.variations.length} alternative templates.`,
        });
      }
    } catch (error) {
      toast({
        title: 'Variation Generation Failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGenerationState((prev) => ({ ...prev, isGenerating: false }));
    }
  };

  // Select alternative template
  const selectAlternative = (index: number) => {
    if (generationState.alternatives[index]) {
      setGenerationState((prev) => ({
        ...prev,
        currentTemplate: prev.alternatives[index],
      }));
      setSelectedAlternative(index);

      toast({
        title: 'Template Selected',
        description: 'Alternative template is now active.',
      });
    }
  };

  // Save template
  const handleSave = () => {
    if (generationState.currentTemplate && onSave) {
      onSave(generationState.currentTemplate);
    }
  };

  // Update generation request
  const updateRequest = (updates: Partial<AIEmailGenerationRequest>) => {
    setGenerationRequest((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-blue-600" />
            AI Email Template Generator
          </h1>
          <p className="text-gray-600 mt-1">
            Create personalized, engaging email templates with AI assistance
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!generationState.currentTemplate}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Save Template
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="refine" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Refine
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Template Configuration</CardTitle>
                <CardDescription>
                  Configure the basic parameters for your email template
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-type">Template Type</Label>
                  <Select
                    value={generationRequest.template_type}
                    onValueChange={(value) =>
                      updateRequest({ template_type: value as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-sm text-gray-500">
                              {type.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tone">Tone</Label>
                  <Select
                    value={generationRequest.tone}
                    onValueChange={(value) =>
                      updateRequest({ tone: value as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TONE_OPTIONS.map((tone) => (
                        <SelectItem key={tone.value} value={tone.value}>
                          <div>
                            <div className="font-medium">{tone.label}</div>
                            <div className="text-sm text-gray-500">
                              {tone.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="length">Content Length</Label>
                  <Select
                    value={generationRequest.length}
                    onValueChange={(value) =>
                      updateRequest({ length: value as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select length" />
                    </SelectTrigger>
                    <SelectContent>
                      {LENGTH_OPTIONS.map((length) => (
                        <SelectItem key={length.value} value={length.value}>
                          <div>
                            <div className="font-medium">{length.label}</div>
                            <div className="text-sm text-gray-500">
                              {length.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">Communication Purpose</Label>
                  <Textarea
                    id="purpose"
                    placeholder="Describe the purpose of this email..."
                    value={generationRequest.context.communication_purpose}
                    onChange={(e) =>
                      updateRequest({
                        context: {
                          ...generationRequest.context,
                          communication_purpose: e.target.value,
                        },
                      })
                    }
                    rows={3}
                  />
                </div>

                <div className="space-y-4">
                  <Label>Style Preferences</Label>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Include Emojis</span>
                    <Switch
                      checked={generationRequest.style_preferences.use_emojis}
                      onCheckedChange={(checked) =>
                        updateRequest({
                          style_preferences: {
                            ...generationRequest.style_preferences,
                            use_emojis: checked,
                          },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Personal Touches</span>
                    <Switch
                      checked={
                        generationRequest.style_preferences
                          .include_personal_touches
                      }
                      onCheckedChange={(checked) =>
                        updateRequest({
                          style_preferences: {
                            ...generationRequest.style_preferences,
                            include_personal_touches: checked,
                          },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Include Call-to-Action</span>
                    <Switch
                      checked={generationRequest.include_call_to_action}
                      onCheckedChange={(checked) =>
                        updateRequest({ include_call_to_action: checked })
                      }
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex gap-2">
                <Button
                  onClick={generateTemplate}
                  disabled={generationState.isGenerating}
                  className="flex-1"
                >
                  {generationState.isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Template
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={generateVariations}
                  disabled={
                    generationState.isGenerating ||
                    !generationState.currentTemplate
                  }
                >
                  Create Variations
                </Button>
              </CardFooter>
            </Card>

            {/* Context Information */}
            <Card>
              <CardHeader>
                <CardTitle>Context Information</CardTitle>
                <CardDescription>
                  Provide context to make the email more personal and relevant
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client-name">Client Name</Label>
                    <input
                      id="client-name"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Enter client name"
                      value={generationRequest.context.client_name || ''}
                      onChange={(e) =>
                        updateRequest({
                          context: {
                            ...generationRequest.context,
                            client_name: e.target.value,
                          },
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vendor-name">Vendor Name</Label>
                    <input
                      id="vendor-name"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Enter vendor name"
                      value={generationRequest.context.vendor_name || ''}
                      onChange={(e) =>
                        updateRequest({
                          context: {
                            ...generationRequest.context,
                            vendor_name: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wedding-date">Wedding Date</Label>
                    <input
                      id="wedding-date"
                      type="date"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={generationRequest.context.wedding_date || ''}
                      onChange={(e) =>
                        updateRequest({
                          context: {
                            ...generationRequest.context,
                            wedding_date: e.target.value,
                          },
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="venue-name">Venue Name</Label>
                    <input
                      id="venue-name"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Enter venue name"
                      value={generationRequest.context.venue_name || ''}
                      onChange={(e) =>
                        updateRequest({
                          context: {
                            ...generationRequest.context,
                            venue_name: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relationship-stage">Relationship Stage</Label>
                  <Select
                    value={generationRequest.context.relationship_stage}
                    onValueChange={(value) =>
                      updateRequest({
                        context: {
                          ...generationRequest.context,
                          relationship_stage: value as any,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new_client">New Client</SelectItem>
                      <SelectItem value="existing_client">
                        Existing Client
                      </SelectItem>
                      <SelectItem value="post_wedding">Post Wedding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {clientId && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 mb-2">
                      <Users className="w-4 h-4" />
                      <span className="font-medium">
                        Personalization Active
                      </span>
                    </div>
                    <p className="text-sm text-blue-600">
                      This template will be personalized based on client data
                      and interaction history.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Generation Progress */}
          {generationState.isGenerating && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Generating your email template...</span>
                    <span>{generationState.generationProgress}%</span>
                  </div>
                  <Progress
                    value={generationState.generationProgress}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {generationState.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{generationState.error}</AlertDescription>
            </Alert>
          )}

          {/* Generated Template and Alternatives */}
          {generationState.currentTemplate && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Generated Template
                    </CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="secondary">
                        Engagement:{' '}
                        {Math.round(
                          generationState.currentTemplate
                            .estimated_engagement_score * 100,
                        )}
                        %
                      </Badge>
                      <Badge variant="outline">
                        {generationState.currentTemplate.variables_used.length}{' '}
                        Variables
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">
                          Subject Line
                        </Label>
                        <div className="mt-1 p-3 bg-gray-50 rounded border">
                          {generationState.currentTemplate.subject}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">
                          Email Content (HTML)
                        </Label>
                        <div className="mt-1 max-h-96 overflow-auto">
                          <div
                            className="p-4 bg-white border rounded"
                            dangerouslySetInnerHTML={{
                              __html: generationState.currentTemplate.body_html,
                            }}
                          />
                        </div>
                      </div>

                      {generationState.currentTemplate.call_to_action && (
                        <div>
                          <Label className="text-sm font-medium">
                            Call to Action
                          </Label>
                          <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded">
                            {generationState.currentTemplate.call_to_action}
                          </div>
                        </div>
                      )}

                      <div>
                        <Label className="text-sm font-medium">
                          Key Points Covered
                        </Label>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {generationState.currentTemplate.key_points.map(
                            (point, index) => (
                              <Badge key={index} variant="outline">
                                {point}
                              </Badge>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Alternative Templates */}
              {generationState.alternatives.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Alternative Versions</CardTitle>
                    <CardDescription>
                      Choose from different variations of your template
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3">
                      {generationState.alternatives.map((alt, index) => (
                        <div
                          key={index}
                          className={`p-3 border rounded cursor-pointer transition-colors ${
                            selectedAlternative === index
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => selectAlternative(index)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">
                              Version {index + 1}
                            </span>
                            <Badge variant="secondary">
                              {Math.round(alt.estimated_engagement_score * 100)}
                              %
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">
                            {alt.subject}
                          </p>
                          <div className="text-xs text-gray-500">
                            {alt.key_points.slice(0, 2).join(', ')}
                            {alt.key_points.length > 2 && '...'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="refine" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Refine Template</CardTitle>
              <CardDescription>
                Provide specific instructions to improve your generated template
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="refinement">Refinement Instructions</Label>
                  <Textarea
                    id="refinement"
                    placeholder="Example: Make the tone more formal, add urgency to the call-to-action, include more personalization..."
                    value={refinementInstructions}
                    onChange={(e) => setRefinementInstructions(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button
                  onClick={refineTemplate}
                  disabled={
                    generationState.isGenerating ||
                    !generationState.currentTemplate ||
                    !refinementInstructions.trim()
                  }
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Refine Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          {generationState.currentTemplate ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>HTML Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="border rounded p-4 bg-white max-h-96 overflow-auto"
                    dangerouslySetInnerHTML={{
                      __html: generationState.currentTemplate.body_html,
                    }}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Plain Text Version</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded border max-h-96 overflow-auto">
                    {generationState.currentTemplate.body_text}
                  </pre>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-gray-500">
                  Generate a template to see the preview
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personalization Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Personalization Recommendations
                </CardTitle>
                <CardDescription>
                  AI-powered suggestions to improve your template's
                  effectiveness
                </CardDescription>
              </CardHeader>

              <CardContent>
                {generationState.recommendations.length > 0 ? (
                  <div className="space-y-3">
                    {generationState.recommendations.map((rec, index) => (
                      <div key={index} className="p-3 border rounded">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm capitalize">
                            {rec.field.replace('_', ' ')}
                          </span>
                          <Badge variant="secondary">
                            {Math.round(rec.confidence * 100)}% confidence
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">
                          {rec.recommendation}
                        </p>
                        <p className="text-xs text-gray-500">{rec.reasoning}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    {clientId
                      ? 'Loading personalization recommendations...'
                      : 'Connect a client to see personalization recommendations'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Contextual Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Contextual Insights
                </CardTitle>
                <CardDescription>
                  Smart insights based on client behavior and wedding context
                </CardDescription>
              </CardHeader>

              <CardContent>
                {generationState.insights.length > 0 ? (
                  <div className="space-y-3">
                    {generationState.insights.map((insight, index) => (
                      <div key={index} className="p-3 border rounded">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm capitalize">
                            {insight.type}
                          </span>
                          <Badge
                            variant={
                              insight.priority === 'high'
                                ? 'destructive'
                                : insight.priority === 'medium'
                                  ? 'default'
                                  : 'secondary'
                            }
                          >
                            {insight.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">
                          {insight.insight}
                        </p>
                        <p className="text-xs text-blue-600">
                          {insight.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    {clientId
                      ? 'Loading contextual insights...'
                      : 'Connect a client to see contextual insights'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
