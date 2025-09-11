/**
 * Template Selector Component
 * WS-235: Support Operations Ticket Management System
 *
 * Allows support agents to select, preview, and customize templates
 * Features:
 * - Intelligent template suggestions based on ticket context
 * - Variable substitution with real-time preview
 * - Search and filter capabilities
 * - Usage tracking and rating system
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Search,
  Star,
  Clock,
  User,
  Tag,
  AlertTriangle,
  CheckCircle,
  Eye,
  Copy,
  Sparkles,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface Template {
  id: string;
  name: string;
  category: string;
  subject?: string;
  content: string;
  variables: TemplateVariable[];
  tags: string[];
  tier_access: string;
  vendor_type?: string;
  usage_count: number;
  avg_rating?: number;
  created_at: string;
  relevance_score?: number;
  match_reasons?: string[];
}

interface TemplateVariable {
  name: string;
  type: 'text' | 'date' | 'number' | 'email' | 'phone';
  description: string;
  required: boolean;
  default_value?: string;
}

interface ProcessedTemplate {
  subject: string;
  content: string;
  variables_replaced: Record<string, string>;
  missing_variables: string[];
}

interface TemplateSelectorProps {
  ticketId?: string;
  ticketCategory?: string;
  ticketType?: string;
  vendorType?: string;
  isWeddingEmergency?: boolean;
  customerName?: string;
  customerEmail?: string;
  onTemplateSelected: (template: ProcessedTemplate) => void;
  trigger?: React.ReactNode;
}

// Category colors for visual organization
const categoryColors: Record<string, string> = {
  wedding_emergency: 'bg-red-100 text-red-800 border-red-200',
  billing: 'bg-green-100 text-green-800 border-green-200',
  technical_support: 'bg-blue-100 text-blue-800 border-blue-200',
  onboarding: 'bg-purple-100 text-purple-800 border-purple-200',
  data_recovery: 'bg-orange-100 text-orange-800 border-orange-200',
  general: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function TemplateSelector({
  ticketId,
  ticketCategory,
  ticketType,
  vendorType,
  isWeddingEmergency = false,
  customerName,
  customerEmail,
  onTemplateSelected,
  trigger,
}: TemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [suggestions, setSuggestions] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ProcessedTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize variables with defaults
  const initializeVariables = useCallback(
    (template: Template) => {
      const initialVars: Record<string, string> = {};

      template.variables.forEach((variable) => {
        if (variable.default_value) {
          initialVars[variable.name] = variable.default_value;
        }

        // Auto-fill common variables from ticket context
        if (variable.name === 'customer_name' && customerName) {
          initialVars[variable.name] = customerName;
        }
        if (variable.name === 'customer_email' && customerEmail) {
          initialVars[variable.name] = customerEmail;
        }
        if (variable.name === 'agent_name') {
          initialVars[variable.name] = 'Support Agent'; // TODO: Get actual agent name
        }
      });

      setVariables(initialVars);
    },
    [customerName, customerEmail],
  );

  // Load templates and suggestions when dialog opens
  const loadTemplatesAndSuggestions = useCallback(async () => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);

    try {
      // Load all available templates
      const templatesResponse = await fetch('/api/templates');
      if (!templatesResponse.ok) {
        throw new Error('Failed to load templates');
      }
      const templatesData = await templatesResponse.json();
      setTemplates(templatesData.templates || []);

      // Get intelligent suggestions if we have ticket context
      if (ticketCategory && ticketType) {
        const suggestionsResponse = await fetch('/api/templates/suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ticket_category: ticketCategory,
            ticket_type: ticketType,
            vendor_type: vendorType,
            is_wedding_emergency: isWeddingEmergency,
            limit: 5,
          }),
        });

        if (suggestionsResponse.ok) {
          const suggestionsData = await suggestionsResponse.json();
          setSuggestions(suggestionsData.suggestions || []);
        }
      }
    } catch (err) {
      console.error('Error loading templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [isOpen, ticketCategory, ticketType, vendorType, isWeddingEmergency]);

  useEffect(() => {
    loadTemplatesAndSuggestions();
  }, [loadTemplatesAndSuggestions]);

  // Generate preview when template or variables change
  useEffect(() => {
    if (!selectedTemplate) {
      setPreview(null);
      return;
    }

    const generatePreview = async () => {
      try {
        const response = await fetch(
          `/api/templates/${selectedTemplate.id}/process`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              variables,
              validate_only: true,
            }),
          },
        );

        if (response.ok) {
          const result = await response.json();
          setPreview({
            subject: result.preview.subject,
            content: selectedTemplate.content.replace(
              /\{\{(\w+)\}\}/g,
              (match, varName) => {
                return variables[varName] || match;
              },
            ),
            variables_replaced: result.validation.variables_replaced,
            missing_variables: result.validation.missing_variables,
          });
        }
      } catch (err) {
        console.error('Error generating preview:', err);
      }
    };

    generatePreview();
  }, [selectedTemplate, variables]);

  // Filter templates based on search and category
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      searchTerm === '' ||
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase()),
      );

    const matchesCategory =
      selectedCategory === 'all' || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Get unique categories for filter
  const categories = ['all', ...new Set(templates.map((t) => t.category))];

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    initializeVariables(template);
  };

  const handleVariableChange = (varName: string, value: string) => {
    setVariables((prev) => ({
      ...prev,
      [varName]: value,
    }));
  };

  const handleUseTemplate = async () => {
    if (!selectedTemplate || !preview) return;

    try {
      // Process template with actual usage tracking
      const response = await fetch(
        `/api/templates/${selectedTemplate.id}/process`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            variables,
            ticket_id: ticketId,
            validate_only: false,
          }),
        },
      );

      if (response.ok) {
        const result = await response.json();
        onTemplateSelected(result.processed_template);
        setIsOpen(false);
        setSelectedTemplate(null);
        setVariables({});
        setPreview(null);
      } else {
        throw new Error('Failed to process template');
      }
    } catch (err) {
      console.error('Error using template:', err);
      setError(err instanceof Error ? err.message : 'Failed to use template');
    }
  };

  const renderTemplateCard = (template: Template) => (
    <Card
      key={template.id}
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        selectedTemplate?.id === template.id && 'ring-2 ring-blue-500',
      )}
      onClick={() => handleTemplateSelect(template)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-sm font-medium">
              {template.name
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase())}
            </CardTitle>
            <CardDescription className="text-xs">
              {template.content.substring(0, 100)}...
            </CardDescription>
          </div>
          {template.relevance_score !== undefined && (
            <Badge variant="secondary" className="ml-2">
              <Sparkles className="w-3 h-3 mr-1" />
              {template.relevance_score}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              className={cn(
                'text-xs',
                categoryColors[template.category] || categoryColors.general,
              )}
            >
              {template.category.replace(/_/g, ' ')}
            </Badge>
            {template.vendor_type && (
              <Badge variant="outline" className="text-xs">
                <User className="w-3 h-3 mr-1" />
                {template.vendor_type}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {template.usage_count}
            </div>
            {template.avg_rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-current text-yellow-500" />
                {template.avg_rating.toFixed(1)}
              </div>
            )}
          </div>
        </div>

        {template.match_reasons && template.match_reasons.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {template.match_reasons.map((reason, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {reason}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderVariableForm = () => {
    if (!selectedTemplate) return null;

    return (
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Template Variables</h4>
        {selectedTemplate.variables.map((variable) => (
          <div key={variable.name} className="space-y-2">
            <Label htmlFor={variable.name} className="text-xs">
              {variable.description}
              {variable.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>

            {variable.type === 'text' && variable.name !== 'content' ? (
              <Input
                id={variable.name}
                value={variables[variable.name] || ''}
                onChange={(e) =>
                  handleVariableChange(variable.name, e.target.value)
                }
                placeholder={variable.default_value || `Enter ${variable.name}`}
                className="text-xs"
              />
            ) : (
              <Textarea
                id={variable.name}
                value={variables[variable.name] || ''}
                onChange={(e) =>
                  handleVariableChange(variable.name, e.target.value)
                }
                placeholder={variable.default_value || `Enter ${variable.name}`}
                rows={variable.name.includes('content') ? 4 : 2}
                className="text-xs"
              />
            )}

            {variable.type === 'email' &&
              variables[variable.name] &&
              !variables[variable.name].includes('@') && (
                <p className="text-xs text-red-500">
                  Please enter a valid email address
                </p>
              )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-2" />
            Use Template
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Select Support Template
            {isWeddingEmergency && (
              <Badge className="bg-red-100 text-red-800">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Wedding Emergency
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="suggestions" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="suggestions">
                Smart Suggestions ({suggestions.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All Templates ({templates.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden mt-4">
              <div className="grid grid-cols-3 gap-4 h-full">
                {/* Template Selection */}
                <div className="space-y-4 overflow-auto">
                  <TabsContent value="suggestions" className="mt-0 space-y-3">
                    {loading ? (
                      <div className="text-center py-8">
                        Loading suggestions...
                      </div>
                    ) : suggestions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No suggestions available
                      </div>
                    ) : (
                      suggestions.map(renderTemplateCard)
                    )}
                  </TabsContent>

                  <TabsContent value="all" className="mt-0 space-y-3">
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Search templates..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 text-xs"
                          />
                        </div>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="px-3 py-2 text-xs border border-input bg-background rounded-md"
                        >
                          {categories.map((category) => (
                            <option key={category} value={category}>
                              {category === 'all'
                                ? 'All Categories'
                                : category
                                    .replace(/_/g, ' ')
                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {loading ? (
                      <div className="text-center py-8">
                        Loading templates...
                      </div>
                    ) : filteredTemplates.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No templates found
                      </div>
                    ) : (
                      filteredTemplates.map(renderTemplateCard)
                    )}
                  </TabsContent>
                </div>

                {/* Variable Form */}
                <div className="border-x px-4 overflow-auto">
                  {selectedTemplate ? (
                    renderVariableForm()
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Select a template to customize
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div className="overflow-auto">
                  {preview ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          Preview
                        </h4>
                        {preview.missing_variables.length === 0 ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Ready
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            {preview.missing_variables.length} missing
                          </Badge>
                        )}
                      </div>

                      {preview.subject && (
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Subject
                          </Label>
                          <div className="mt-1 p-2 bg-muted rounded text-xs">
                            {preview.subject}
                          </div>
                        </div>
                      )}

                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Content
                        </Label>
                        <div className="mt-1 p-3 bg-muted rounded text-xs whitespace-pre-wrap max-h-60 overflow-auto">
                          {preview.content}
                        </div>
                      </div>

                      {preview.missing_variables.length > 0 && (
                        <div className="text-xs text-red-600">
                          Missing variables:{' '}
                          {preview.missing_variables.join(', ')}
                        </div>
                      )}
                    </div>
                  ) : selectedTemplate ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Fill in variables to see preview
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Select a template to see preview
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Tabs>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUseTemplate}
            disabled={
              !selectedTemplate ||
              !preview ||
              preview.missing_variables.length > 0
            }
          >
            Use Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
