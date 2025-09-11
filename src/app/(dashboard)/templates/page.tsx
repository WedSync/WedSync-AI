'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplateGallery } from '@/components/templates/TemplateGallery';
import { TemplateModal } from '@/components/templates/TemplateModal';
import { Plus, Sparkles, TrendingUp, Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast-helper';

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
}

export default function TemplatesPage() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setIsModalOpen(true);
  };

  const handleTemplatePreview = (template: Template) => {
    toast.info(`Opening preview for ${template.name}`);
  };

  const handleUseTemplate = (template: Template) => {
    toast.success(`${template.name} loaded successfully!`);

    // Navigate to form builder with template
    if (template.category === 'forms') {
      router.push(`/forms/builder?template=${template.id}`);
    } else if (
      template.category === 'journeys' ||
      template.category === 'workflows'
    ) {
      router.push(`/journeys?template=${template.id}`);
    }

    setIsModalOpen(false);
  };

  const stats = [
    {
      title: 'Total Templates',
      value: '24',
      icon: Sparkles,
      trend: '+3 this month',
      color: 'text-blue-600',
    },
    {
      title: 'Times Used',
      value: '1,247',
      icon: TrendingUp,
      trend: '+127 this week',
      color: 'text-green-600',
    },
    {
      title: 'Favorites',
      value: '8',
      icon: Heart,
      trend: '+2 this week',
      color: 'text-red-600',
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
          <p className="text-gray-600 mt-1">
            Pre-built templates to streamline your wedding photography workflows
          </p>
        </div>

        <Button onClick={() => router.push('/forms/builder')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{stat.trend}</p>
                </div>
                <div className={`p-3 rounded-full bg-gray-100 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Template Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Templates</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
          <TabsTrigger value="favorites">My Favorites</TabsTrigger>
          <TabsTrigger value="recent">Recently Used</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <TemplateGallery
                onSelect={handleTemplateSelect}
                onPreview={handleTemplatePreview}
                showSearch={true}
                showFilters={true}
                columns={3}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="featured">
          <Card>
            <CardHeader>
              <CardTitle>Featured Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <TemplateGallery
                templates={[]} // Would filter for featured templates
                onSelect={handleTemplateSelect}
                onPreview={handleTemplatePreview}
                showSearch={false}
                showFilters={false}
                columns={3}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="favorites">
          <Card>
            <CardHeader>
              <CardTitle>My Favorite Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Heart className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No favorites yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Click the heart icon on any template to add it to your
                  favorites.
                </p>
                <Button variant="outline" onClick={() => router.push('#all')}>
                  Browse Templates
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recently Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No recent templates
                </h3>
                <p className="text-gray-600 mb-4">
                  Templates you've used recently will appear here for quick
                  access.
                </p>
                <Button variant="outline" onClick={() => router.push('#all')}>
                  Browse Templates
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Modal */}
      <TemplateModal
        template={selectedTemplate}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleUseTemplate}
        onPreview={handleTemplatePreview}
      />
    </div>
  );
}
