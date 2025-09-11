'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  MessageSquare,
  Sparkles,
  Copy,
  Edit,
  Trash2,
  Plus,
  Search,
  TrendingUp,
  Heart,
  Clock,
  AlertTriangle,
  CheckCircle,
  Star,
  Wand2,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  responseManager,
  CannedResponse,
  ResponseSuggestion,
  TicketContext,
  ResponseVariable,
} from '@/lib/support/response-manager';

interface ResponseManagerProps {
  ticketContext?: TicketContext;
  organizationId: string;
  currentAgentId: string;
  onResponseSelect?: (processedResponse: string) => void;
}

export default function ResponseManager({
  ticketContext,
  organizationId,
  currentAgentId,
  onResponseSelect,
}: ResponseManagerProps) {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [suggestions, setSuggestions] = useState<ResponseSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedResponse, setSelectedResponse] =
    useState<CannedResponse | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    {},
  );
  const [previewMode, setPreviewMode] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // New response form state
  const [newResponse, setNewResponse] = useState({
    title: '',
    content: '',
    category: '',
    subcategory: '',
    tags: [] as string[],
    is_wedding_specific: false,
    urgency_level: 'medium' as any,
    requires_personalization: true,
    variables: [] as ResponseVariable[],
  });

  useEffect(() => {
    loadResponses();
    if (ticketContext) {
      loadSuggestions();
    }
  }, [organizationId, ticketContext]);

  const loadResponses = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await responseManager.getCannedResponses(organizationId, {
        is_active: true,
      });
      setResponses(data);
    } catch (error: any) {
      console.error('Error loading responses:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    if (!ticketContext) return;

    try {
      const suggestedResponses = await responseManager.getResponseSuggestions(
        ticketContext,
        organizationId,
      );
      setSuggestions(suggestedResponses);
    } catch (error: any) {
      console.error('Error loading suggestions:', error);
    }
  };

  const handleResponseSelect = (
    response: CannedResponse,
    suggestion?: ResponseSuggestion,
  ) => {
    setSelectedResponse(response);

    // Pre-populate variables with suggested values
    const initialValues: Record<string, string> = {};

    if (suggestion?.suggested_variables) {
      Object.assign(initialValues, suggestion.suggested_variables);
    }

    // Add default values
    response.variables.forEach((variable) => {
      if (variable.default_value && !initialValues[variable.name]) {
        initialValues[variable.name] = variable.default_value;
      }
    });

    setVariableValues(initialValues);
    setPreviewMode(true);
  };

  const handleVariableChange = (variableName: string, value: string) => {
    setVariableValues((prev) => ({
      ...prev,
      [variableName]: value,
    }));
  };

  const handleUseResponse = async () => {
    if (!selectedResponse) return;

    try {
      // Process the response with variables
      const processedResponse = responseManager.processResponseTemplate(
        selectedResponse,
        variableValues,
      );

      // Track usage
      await responseManager.trackResponseUsage(selectedResponse.id);

      // Call the callback if provided
      onResponseSelect?.(processedResponse);

      // Reset state
      setSelectedResponse(null);
      setVariableValues({});
      setPreviewMode(false);
    } catch (error) {
      console.error('Error using response:', error);
    }
  };

  const handleCreateResponse = async () => {
    try {
      await responseManager.createCannedResponse(
        {
          ...newResponse,
          is_active: true,
        },
        organizationId,
        currentAgentId,
      );

      setShowCreateDialog(false);
      setNewResponse({
        title: '',
        content: '',
        category: '',
        subcategory: '',
        tags: [],
        is_wedding_specific: false,
        urgency_level: 'medium',
        requires_personalization: true,
        variables: [],
      });

      loadResponses();
    } catch (error) {
      console.error('Error creating response:', error);
    }
  };

  // Filter responses based on search and category
  const filteredResponses = responses.filter((response) => {
    const matchesSearch =
      !searchQuery ||
      response.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      response.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      response.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesCategory =
      selectedCategory === 'all' || response.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = Array.from(
    new Set(responses.map((r) => r.category)),
  ).sort();

  const renderResponseCard = (
    response: CannedResponse,
    suggestion?: ResponseSuggestion,
  ) => (
    <Card
      key={response.id}
      className={`cursor-pointer transition-all duration-200 ${
        suggestion ? 'border-blue-200 bg-blue-50' : 'hover:shadow-md'
      }`}
      onClick={() => handleResponseSelect(response, suggestion)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {suggestion && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {Math.round(suggestion.relevance_score * 100)}% match
                </Badge>
              )}

              <Badge
                className={
                  response.is_wedding_specific
                    ? 'bg-pink-100 text-pink-800 border-pink-200'
                    : 'bg-gray-100 text-gray-800 border-gray-200'
                }
              >
                {response.is_wedding_specific && (
                  <Heart className="w-3 h-3 mr-1" />
                )}
                {response.category}
              </Badge>

              <Badge
                className={
                  response.urgency_level === 'wedding_day'
                    ? 'bg-red-100 text-red-800 border-red-200'
                    : response.urgency_level === 'critical'
                      ? 'bg-orange-100 text-orange-800 border-orange-200'
                      : response.urgency_level === 'high'
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        : 'bg-green-100 text-green-800 border-green-200'
                }
              >
                {response.urgency_level}
              </Badge>

              {response.usage_count > 10 && (
                <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                  <Star className="w-3 h-3 mr-1" />
                  Popular
                </Badge>
              )}
            </div>

            <CardTitle className="text-lg mb-2 line-clamp-2">
              {response.title}
            </CardTitle>

            <p className="text-sm text-gray-600 line-clamp-3 mb-2">
              {response.content.substring(0, 150)}...
            </p>

            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Used {response.usage_count} times
              </div>

              {response.requires_personalization && (
                <div className="flex items-center gap-1">
                  <Wand2 className="w-3 h-3" />
                  {response.variables.length} variables
                </div>
              )}

              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(response.updated_at), 'MMM dd')}
              </div>
            </div>

            {suggestion && suggestion.match_reasons.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-blue-700 mb-1">
                  Why this matches:
                </p>
                <div className="flex flex-wrap gap-1">
                  {suggestion.match_reasons.map((reason, index) => (
                    <Badge
                      key={index}
                      className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                    >
                      {reason}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Button variant="outline" size="sm" className="h-8">
              <MessageSquare className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );

  const renderVariableInput = (variable: ResponseVariable) => {
    const value = variableValues[variable.name] || '';

    const commonProps = {
      id: variable.name,
      value,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => handleVariableChange(variable.name, e.target.value),
      placeholder: variable.placeholder || variable.description,
      className: 'mt-1',
    };

    return (
      <div key={variable.name} className="space-y-2">
        <Label htmlFor={variable.name} className="text-sm font-medium">
          {variable.description}
          {variable.required && <span className="text-red-500 ml-1">*</span>}
        </Label>

        {variable.type === 'select' && variable.select_options ? (
          <Select
            value={value}
            onValueChange={(val) => handleVariableChange(variable.name, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={variable.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {variable.select_options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : variable.type === 'text' &&
          variable.description.toLowerCase().includes('action') ? (
          <Textarea {...commonProps} rows={3} />
        ) : (
          <Input
            {...commonProps}
            type={
              variable.type === 'email'
                ? 'email'
                : variable.type === 'phone'
                  ? 'tel'
                  : variable.type === 'date'
                    ? 'date'
                    : 'text'
            }
          />
        )}

        {variable.description && (
          <p className="text-xs text-gray-500">{variable.description}</p>
        )}
      </div>
    );
  };

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold">Response Manager</h2>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Response
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Canned Response</DialogTitle>
                <DialogDescription>
                  Create a reusable response template for your support team
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={newResponse.title}
                      onChange={(e) =>
                        setNewResponse((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="Response title"
                    />
                  </div>

                  <div>
                    <Label>Category</Label>
                    <Select
                      value={newResponse.category}
                      onValueChange={(value) =>
                        setNewResponse((prev) => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                        <SelectItem value="feature_request">
                          Feature Request
                        </SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="integration">Integration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Content</Label>
                  <Textarea
                    value={newResponse.content}
                    onChange={(e) =>
                      setNewResponse((prev) => ({
                        ...prev,
                        content: e.target.value,
                      }))
                    }
                    placeholder="Response template content..."
                    rows={8}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newResponse.is_wedding_specific}
                      onChange={(e) =>
                        setNewResponse((prev) => ({
                          ...prev,
                          is_wedding_specific: e.target.checked,
                        }))
                      }
                      className="rounded"
                    />
                    <Label>Wedding-specific response</Label>
                  </div>

                  <Select
                    value={newResponse.urgency_level}
                    onValueChange={(value: any) =>
                      setNewResponse((prev) => ({
                        ...prev,
                        urgency_level: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="wedding_day">Wedding Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateResponse}>
                    Create Response
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Preview Modal */}
      {previewMode && selectedResponse && (
        <Dialog open={previewMode} onOpenChange={setPreviewMode}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                {selectedResponse.title}
              </DialogTitle>
              <DialogDescription>
                Customize variables and preview your response
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-6 max-h-[60vh] overflow-hidden">
              {/* Variables Panel */}
              <div className="space-y-4">
                <h3 className="font-semibold">Customize Variables</h3>
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-4">
                    {selectedResponse.variables.map(renderVariableInput)}
                  </div>
                </ScrollArea>
              </div>

              {/* Preview Panel */}
              <div className="space-y-4">
                <h3 className="font-semibold">Preview</h3>
                <ScrollArea className="h-full">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm">
                      {responseManager.processResponseTemplate(
                        selectedResponse,
                        variableValues,
                      )}
                    </pre>
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPreviewMode(false)}>
                Cancel
              </Button>
              <Button onClick={handleUseResponse}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Use Response
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Search responses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            AI Suggested Responses
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map((suggestion, index) =>
              renderResponseCard(suggestion.response, suggestion),
            )}
          </div>

          {filteredResponses.length > 0 && <Separator className="my-6" />}
        </div>
      )}

      {/* All Responses */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          All Responses ({filteredResponses.length})
        </h3>

        {loading ? (
          <div className="text-center py-8 text-gray-500">
            Loading responses...
          </div>
        ) : filteredResponses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No responses found matching your criteria
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
              {filteredResponses.map((response) =>
                renderResponseCard(response),
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
