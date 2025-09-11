'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Copy,
  Eye,
  Download,
  Star,
  Calendar,
  Users,
  FileText,
} from 'lucide-react';
import { toast } from '@/lib/toast-helper';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  name: string;
  description: string;
  category: 'forms' | 'journeys' | 'workflows' | 'communications';
  fields?: any[];
  steps?: any[];
  createdAt: string;
  usageCount: number;
  featured: boolean;
  preview?: string;
}

interface TemplateModalProps {
  template: Template | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: Template) => void;
  onPreview?: (template: Template) => void;
}

const categoryIcons = {
  forms: FileText,
  journeys: Calendar,
  workflows: Users,
  communications: Star,
};

const categoryColors = {
  forms: 'bg-blue-100 text-blue-800 border-blue-200',
  journeys: 'bg-green-100 text-green-800 border-green-200',
  workflows: 'bg-purple-100 text-purple-800 border-purple-200',
  communications: 'bg-orange-100 text-orange-800 border-orange-200',
};

export function TemplateModal({
  template,
  isOpen,
  onClose,
  onSelect,
  onPreview,
}: TemplateModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!template) return null;

  const CategoryIcon = categoryIcons[template.category];

  const handleSelect = async () => {
    setIsLoading(true);

    try {
      // Show loading toast
      const loadingToast = toast.promise(
        new Promise((resolve) => setTimeout(resolve, 1500)), // Simulate loading
        {
          loading: `Loading ${template.name}...`,
          success: `${template.name} loaded successfully!`,
          error: `Failed to load ${template.name}`,
        },
      );

      // Simulate template loading process
      await new Promise((resolve) => setTimeout(resolve, 1500));

      onSelect(template);
      onClose();
    } catch (error) {
      toast.error('Failed to load template');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = () => {
    onPreview?.(template);
  };

  const handleDownload = () => {
    toast.success(`Downloaded ${template.name} template`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2 rounded-lg border',
                categoryColors[template.category],
              )}
            >
              <CategoryIcon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{template.name}</DialogTitle>
              <DialogDescription className="mt-1">
                {template.description}
              </DialogDescription>
            </div>
            {template.featured && (
              <Badge
                variant="secondary"
                className="bg-yellow-100 text-yellow-800"
              >
                <Star className="h-3 w-3 mr-1" />
                Featured
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 my-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <Users className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {template.usageCount}
                </div>
                <div className="text-sm text-gray-600">Times used</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <Calendar className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {new Date(template.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-sm text-gray-600">Last updated</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {template.fields?.length || template.steps?.length || 0}
                </div>
                <div className="text-sm text-gray-600">
                  {template.category === 'forms' ? 'Fields' : 'Steps'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="preview" className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="structure">Structure</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Template Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {template.category === 'forms' && template.fields ? (
                    <div className="space-y-4">
                      {template.fields.map((field, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium">
                              {field.label}
                              {field.required && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </label>
                            <Badge variant="outline" className="text-xs">
                              {field.type}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500">
                            {field.type === 'select' && field.options && (
                              <span>Options: {field.options.join(', ')}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : template.steps ? (
                    <div className="space-y-4">
                      {template.steps.map((step, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">
                                {step.name || step.template}
                              </div>
                              {step.days && (
                                <div className="text-sm text-gray-600">
                                  {step.days} days before wedding
                                </div>
                              )}
                              {step.delay && (
                                <div className="text-sm text-gray-600">
                                  {step.delay} day{step.delay > 1 ? 's' : ''}{' '}
                                  after previous step
                                </div>
                              )}
                              {step.type && (
                                <Badge
                                  variant="outline"
                                  className="text-xs mt-1"
                                >
                                  {step.type}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Preview not available for this template type</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="structure" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Template Structure</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Category:</span>
                      <Badge variant="outline" className="ml-2">
                        {template.category}
                      </Badge>
                    </div>

                    {template.fields && (
                      <div className="text-sm">
                        <span className="font-medium">Field Types:</span>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {[...new Set(template.fields.map((f) => f.type))].map(
                            (type) => (
                              <Badge
                                key={type}
                                variant="secondary"
                                className="text-xs"
                              >
                                {type}
                              </Badge>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    {template.steps && (
                      <div className="text-sm">
                        <span className="font-medium">Step Types:</span>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {[
                            ...new Set(
                              template.steps.map((s) => s.type).filter(Boolean),
                            ),
                          ].map((type) => (
                            <Badge
                              key={type}
                              variant="secondary"
                              className="text-xs"
                            >
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-sm">
                      <span className="font-medium">Complexity:</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'ml-2',
                          (template.fields?.length ||
                            template.steps?.length ||
                            0) > 10
                            ? 'text-red-600 border-red-200'
                            : (template.fields?.length ||
                                  template.steps?.length ||
                                  0) > 5
                              ? 'text-yellow-600 border-yellow-200'
                              : 'text-green-600 border-green-200',
                        )}
                      >
                        {(template.fields?.length ||
                          template.steps?.length ||
                          0) > 10
                          ? 'Complex'
                          : (template.fields?.length ||
                                template.steps?.length ||
                                0) > 5
                            ? 'Medium'
                            : 'Simple'}
                      </Badge>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Template Details</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-gray-600">
                        {template.description}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Usage Statistics</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>
                          Used {template.usageCount} times across all accounts
                        </div>
                        <div>
                          Last updated on{' '}
                          {new Date(template.createdAt).toLocaleDateString()}
                        </div>
                        <div>
                          {template.featured
                            ? 'Featured template'
                            : 'Community template'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">What's included</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {template.category === 'forms' && (
                          <>
                            <li>• Pre-configured form fields</li>
                            <li>• Validation rules</li>
                            <li>• Responsive design</li>
                            <li>• Email notifications</li>
                          </>
                        )}
                        {template.category === 'workflows' && (
                          <>
                            <li>• Step-by-step process</li>
                            <li>• Timeline management</li>
                            <li>• Progress tracking</li>
                            <li>• Automated reminders</li>
                          </>
                        )}
                        {template.category === 'communications' && (
                          <>
                            <li>• Email templates</li>
                            <li>• SMS templates</li>
                            <li>• Automated sequences</li>
                            <li>• Personalization variables</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={isLoading}
            >
              <Eye className="h-4 w-4 mr-2" />
              Live Preview
            </Button>

            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={isLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>

            <Button
              onClick={handleSelect}
              disabled={isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  Loading...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Use Template
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
