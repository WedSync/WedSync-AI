'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  BarChart3,
  Target,
  Zap,
  Users,
  Mail,
  MessageSquare,
  Clock,
  TrendingUp,
  Sparkles,
  Brain,
} from 'lucide-react';

interface CampaignStep {
  id: string;
  type: 'email' | 'sms' | 'delay' | 'condition' | 'webhook';
  name: string;
  config: any;
  nextStepId?: string;
}

interface CampaignMetrics {
  estimatedReach: number;
  predictedConversionRate: number;
  expectedROI: number;
  viralPotential: number;
}

export function CampaignBuilder() {
  const { toast } = useToast();
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState<string>('');
  const [targetSegment, setTargetSegment] = useState<string>('');
  const [steps, setSteps] = useState<CampaignStep[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiContent, setAIContent] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('');

  const campaignTypes = [
    {
      value: 'viral_referral',
      label: 'Viral Referral',
      icon: <Users className="h-4 w-4" />,
    },
    {
      value: 'retention',
      label: 'Retention',
      icon: <Target className="h-4 w-4" />,
    },
    {
      value: 'onboarding',
      label: 'Onboarding',
      icon: <Zap className="h-4 w-4" />,
    },
    {
      value: 'milestone',
      label: 'Milestone',
      icon: <TrendingUp className="h-4 w-4" />,
    },
  ];

  const targetSegments = [
    {
      value: 'super_connectors',
      label: 'Super Connectors',
      description: 'High referral potential',
    },
    { value: 'at_risk', label: 'At Risk', description: 'Churn prevention' },
    { value: 'new_users', label: 'New Users', description: 'First 30 days' },
    {
      value: 'power_users',
      label: 'Power Users',
      description: 'Highly engaged',
    },
    { value: 'dormant', label: 'Dormant', description: 'Re-engagement needed' },
  ];

  const generateAIContent = async () => {
    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/marketing/ai-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignType,
          targetSegment,
          campaignName,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate AI content');

      const data = await response.json();
      setAIContent(data.variants);

      toast({
        title: 'AI Content Generated',
        description: `Generated ${data.variants.length} optimized variants`,
      });
    } catch (error) {
      console.error('Error generating AI content:', error);
      toast({
        title: 'Generation Failed',
        description: 'Could not generate AI content',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const calculateMetrics = async () => {
    try {
      const response = await fetch('/api/marketing/metrics/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignType,
          targetSegment,
          steps: steps.length,
        }),
      });

      if (!response.ok) throw new Error('Failed to calculate metrics');

      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error calculating metrics:', error);
    }
  };

  const addStep = (type: CampaignStep['type']) => {
    const newStep: CampaignStep = {
      id: `step_${Date.now()}`,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Step`,
      config: {},
    };
    setSteps([...steps, newStep]);
  };

  const launchCampaign = async () => {
    try {
      const response = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          type: campaignType,
          targetSegment,
          steps,
          aiVariant: selectedVariant,
          metrics,
        }),
      });

      if (!response.ok) throw new Error('Failed to launch campaign');

      const data = await response.json();

      toast({
        title: 'Campaign Launched!',
        description: `Campaign "${campaignName}" is now active with AI optimization`,
      });

      // Reset form
      setCampaignName('');
      setCampaignType('');
      setTargetSegment('');
      setSteps([]);
      setAIContent([]);
      setMetrics(null);
    } catch (error) {
      console.error('Error launching campaign:', error);
      toast({
        title: 'Launch Failed',
        description: 'Could not launch campaign',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (campaignType && targetSegment && steps.length > 0) {
      calculateMetrics();
    }
  }, [campaignType, targetSegment, steps]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI-Powered Campaign Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="basics" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basics">Basics</TabsTrigger>
              <TabsTrigger value="workflow">Workflow</TabsTrigger>
              <TabsTrigger value="ai-content">AI Content</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="basics" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., Summer Wedding Viral Campaign"
                />
              </div>

              <div className="space-y-2">
                <Label>Campaign Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {campaignTypes.map((type) => (
                    <Button
                      key={type.value}
                      variant={
                        campaignType === type.value ? 'default' : 'outline'
                      }
                      onClick={() => setCampaignType(type.value)}
                      className="justify-start"
                    >
                      {type.icon}
                      <span className="ml-2">{type.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Target Segment</Label>
                <Select value={targetSegment} onValueChange={setTargetSegment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target segment" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetSegments.map((segment) => (
                      <SelectItem key={segment.value} value={segment.value}>
                        <div>
                          <div className="font-medium">{segment.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {segment.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="workflow" className="space-y-4">
              <div className="flex gap-2 mb-4">
                <Button
                  onClick={() => addStep('email')}
                  variant="outline"
                  size="sm"
                >
                  <Mail className="h-4 w-4 mr-1" /> Add Email
                </Button>
                <Button
                  onClick={() => addStep('sms')}
                  variant="outline"
                  size="sm"
                >
                  <MessageSquare className="h-4 w-4 mr-1" /> Add SMS
                </Button>
                <Button
                  onClick={() => addStep('delay')}
                  variant="outline"
                  size="sm"
                >
                  <Clock className="h-4 w-4 mr-1" /> Add Delay
                </Button>
                <Button
                  onClick={() => addStep('condition')}
                  variant="outline"
                  size="sm"
                >
                  <Target className="h-4 w-4 mr-1" /> Add Condition
                </Button>
              </div>

              <div className="space-y-2">
                {steps.map((step, index) => (
                  <Card key={step.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <span className="font-medium">{step.name}</span>
                        <Badge>{step.type}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setSteps(steps.filter((s) => s.id !== step.id))
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="ai-content" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">AI Content Generation</h3>
                <Button
                  onClick={generateAIContent}
                  disabled={!campaignType || !targetSegment || isGeneratingAI}
                >
                  {isGeneratingAI ? (
                    <>Generating...</>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Generate AI Content
                    </>
                  )}
                </Button>
              </div>

              {aiContent.length > 0 && (
                <div className="space-y-3">
                  <Label>AI Generated Variants</Label>
                  {aiContent.map((variant, index) => (
                    <Card
                      key={index}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedVariant === variant.id
                          ? 'border-purple-600'
                          : ''
                      }`}
                      onClick={() => setSelectedVariant(variant.id)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge
                            variant={
                              variant.recommended ? 'default' : 'outline'
                            }
                          >
                            Variant {index + 1}
                            {variant.recommended && ' - Recommended'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Predicted CTR: {variant.predictedCTR}%
                          </span>
                        </div>
                        <h4 className="font-medium">{variant.subject}</h4>
                        <p className="text-sm text-muted-foreground">
                          {variant.preview}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              {metrics && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <Card className="p-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Estimated Reach
                      </p>
                      <p className="text-2xl font-bold">
                        {metrics.estimatedReach.toLocaleString()}
                      </p>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Predicted Conversion
                      </p>
                      <p className="text-2xl font-bold">
                        {metrics.predictedConversionRate}%
                      </p>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Expected ROI
                      </p>
                      <p className="text-2xl font-bold">
                        {metrics.expectedROI}%
                      </p>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Viral Potential
                      </p>
                      <p className="text-2xl font-bold">
                        {metrics.viralPotential.toFixed(2)}
                      </p>
                    </div>
                  </Card>
                </div>
              )}

              <Card className="p-6">
                <h3 className="text-lg font-medium mb-4">Campaign Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">
                      {campaignName || 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">
                      {campaignType || 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target:</span>
                    <span className="font-medium">
                      {targetSegment || 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Steps:</span>
                    <span className="font-medium">{steps.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AI Variant:</span>
                    <span className="font-medium">
                      {selectedVariant ? 'Selected' : 'None'}
                    </span>
                  </div>
                </div>
              </Card>

              <Button
                onClick={launchCampaign}
                disabled={
                  !campaignName ||
                  !campaignType ||
                  !targetSegment ||
                  steps.length === 0
                }
                className="w-full"
                size="lg"
              >
                Launch Campaign with AI Optimization
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
