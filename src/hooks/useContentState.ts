'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  ContentItem,
  ContentTemplate,
  ContentVersion,
  UseContentStateReturn,
} from '@/types/cms';

// Content Management State Hook for Wedding Suppliers
// WS-223 Team A - Round 1
// Custom hook for managing CMS content state and operations

export const useContentState = (): UseContentStateReturn => {
  // State
  const [items, setItems] = useState<ContentItem[]>([]);
  const [currentItem, setCurrentItem] = useState<ContentItem | null>(null);
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock data initialization
  useEffect(() => {
    // Initialize with mock data
    const mockItems: ContentItem[] = [
      {
        id: '1',
        organization_id: 'org1',
        title: 'Welcome to Our Wedding Photography',
        body: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Welcome to our magical wedding photography experience!',
                },
              ],
            },
          ],
        },
        html_content:
          '<p>Welcome to our magical wedding photography experience!</p>',
        plain_text: 'Welcome to our magical wedding photography experience!',
        status: 'draft',
        type: 'welcome_message',
        media_urls: [],
        created_by: 'user1',
        created_at: '2025-01-30T10:00:00Z',
        updated_at: '2025-01-30T10:00:00Z',
        version: 1,
        is_template: false,
      },
      {
        id: '2',
        organization_id: 'org1',
        title: 'Our Photography Packages',
        body: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Discover our comprehensive wedding photography packages...',
                },
              ],
            },
          ],
        },
        html_content:
          '<p>Discover our comprehensive wedding photography packages...</p>',
        plain_text:
          'Discover our comprehensive wedding photography packages...',
        status: 'published',
        type: 'service_description',
        media_urls: [],
        published_at: '2025-01-29T15:00:00Z',
        created_by: 'user1',
        created_at: '2025-01-29T12:00:00Z',
        updated_at: '2025-01-29T15:00:00Z',
        version: 2,
        is_template: false,
      },
    ];

    const mockTemplates: ContentTemplate[] = [
      {
        id: 't1',
        organization_id: 'org1',
        name: 'Spring Wedding Welcome',
        description: 'Perfect welcome message for spring weddings',
        type: 'welcome_message',
        template_data: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Welcome to our spring wedding photography experience! As the flowers bloom and love fills the air...',
                },
              ],
            },
          ],
        },
        category: 'welcome',
        is_system_template: true,
        usage_count: 15,
        created_by: 'system',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      },
    ];

    setItems(mockItems);
    setTemplates(mockTemplates);
  }, []);

  // Content Actions
  const fetchContent = useCallback(
    async (filters?: any) => {
      setIsLoading(true);
      setError(null);

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Apply filters if provided
        let filteredItems = items;
        if (filters?.status) {
          filteredItems = items.filter(
            (item) => item.status === filters.status,
          );
        }
        if (filters?.type) {
          filteredItems = filteredItems.filter(
            (item) => item.type === filters.type,
          );
        }
        if (filters?.search) {
          const query = filters.search.toLowerCase();
          filteredItems = filteredItems.filter(
            (item) =>
              item.title.toLowerCase().includes(query) ||
              item.plain_text?.toLowerCase().includes(query),
          );
        }

        setItems(filteredItems);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch content',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [items],
  );

  const createContent = useCallback(
    async (data: Partial<ContentItem>): Promise<ContentItem> => {
      setIsLoading(true);
      setError(null);

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 800));

        const newItem: ContentItem = {
          id: `content_${Date.now()}`,
          organization_id: data.organization_id || 'org1',
          title: data.title || 'Untitled Content',
          body: data.body || { type: 'doc', content: [] },
          html_content: data.html_content || '',
          plain_text: data.plain_text || '',
          status: data.status || 'draft',
          type: data.type || 'custom',
          media_urls: data.media_urls || [],
          tags: data.tags || [],
          seo_title: data.seo_title,
          seo_description: data.seo_description,
          featured_image: data.featured_image,
          created_by: data.created_by || 'current_user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
          is_template: data.is_template || false,
        };

        setItems((prev) => [...prev, newItem]);
        setCurrentItem(newItem);

        return newItem;
      } catch (err) {
        const error =
          err instanceof Error ? err.message : 'Failed to create content';
        setError(error);
        throw new Error(error);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const updateContent = useCallback(
    async (id: string, data: Partial<ContentItem>): Promise<ContentItem> => {
      setIsLoading(true);
      setError(null);

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 600));

        const updatedItem = items.find((item) => item.id === id);
        if (!updatedItem) {
          throw new Error('Content not found');
        }

        const updated: ContentItem = {
          ...updatedItem,
          ...data,
          updated_at: new Date().toISOString(),
          version: updatedItem.version + 1,
        };

        setItems((prev) =>
          prev.map((item) => (item.id === id ? updated : item)),
        );

        if (currentItem?.id === id) {
          setCurrentItem(updated);
        }

        return updated;
      } catch (err) {
        const error =
          err instanceof Error ? err.message : 'Failed to update content';
        setError(error);
        throw new Error(error);
      } finally {
        setIsLoading(false);
      }
    },
    [items, currentItem],
  );

  const deleteContent = useCallback(
    async (id: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 400));

        setItems((prev) => prev.filter((item) => item.id !== id));

        if (currentItem?.id === id) {
          setCurrentItem(null);
        }
      } catch (err) {
        const error =
          err instanceof Error ? err.message : 'Failed to delete content';
        setError(error);
        throw new Error(error);
      } finally {
        setIsLoading(false);
      }
    },
    [currentItem],
  );

  const publishContent = useCallback(
    async (id: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const published_at = new Date().toISOString();

        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'published',
                  published_at,
                  updated_at: published_at,
                  version: item.version + 1,
                }
              : item,
          ),
        );

        if (currentItem?.id === id) {
          setCurrentItem((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'published',
                  published_at,
                  updated_at: published_at,
                  version: prev.version + 1,
                }
              : null,
          );
        }
      } catch (err) {
        const error =
          err instanceof Error ? err.message : 'Failed to publish content';
        setError(error);
        throw new Error(error);
      } finally {
        setIsLoading(false);
      }
    },
    [currentItem],
  );

  const scheduleContent = useCallback(
    async (id: string, scheduledAt: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 600));

        const updated_at = new Date().toISOString();

        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'scheduled',
                  scheduled_at: scheduledAt,
                  updated_at,
                  version: item.version + 1,
                }
              : item,
          ),
        );

        if (currentItem?.id === id) {
          setCurrentItem((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'scheduled',
                  scheduled_at: scheduledAt,
                  updated_at,
                  version: prev.version + 1,
                }
              : null,
          );
        }
      } catch (err) {
        const error =
          err instanceof Error ? err.message : 'Failed to schedule content';
        setError(error);
        throw new Error(error);
      } finally {
        setIsLoading(false);
      }
    },
    [currentItem],
  );

  const duplicateContent = useCallback(
    async (id: string): Promise<ContentItem> => {
      setIsLoading(true);
      setError(null);

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        const originalItem = items.find((item) => item.id === id);
        if (!originalItem) {
          throw new Error('Content not found');
        }

        const duplicatedItem: ContentItem = {
          ...originalItem,
          id: `content_${Date.now()}`,
          title: `${originalItem.title} (Copy)`,
          status: 'draft',
          published_at: undefined,
          scheduled_at: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
        };

        setItems((prev) => [...prev, duplicatedItem]);

        return duplicatedItem;
      } catch (err) {
        const error =
          err instanceof Error ? err.message : 'Failed to duplicate content';
        setError(error);
        throw new Error(error);
      } finally {
        setIsLoading(false);
      }
    },
    [items],
  );

  // Template Actions
  const createTemplate = useCallback(
    async (data: Partial<ContentTemplate>): Promise<ContentTemplate> => {
      setIsLoading(true);
      setError(null);

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 700));

        const newTemplate: ContentTemplate = {
          id: `template_${Date.now()}`,
          organization_id: data.organization_id || 'org1',
          name: data.name || 'Untitled Template',
          description: data.description,
          type: data.type || 'custom',
          template_data: data.template_data || {},
          preview_image: data.preview_image,
          category: data.category || 'general',
          is_system_template: false,
          usage_count: 0,
          created_by: data.created_by || 'current_user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setTemplates((prev) => [...prev, newTemplate]);

        return newTemplate;
      } catch (err) {
        const error =
          err instanceof Error ? err.message : 'Failed to create template';
        setError(error);
        throw new Error(error);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const applyTemplate = useCallback(
    async (contentId: string, templateId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        const template = templates.find((t) => t.id === templateId);
        if (!template) {
          throw new Error('Template not found');
        }

        const updated_at = new Date().toISOString();

        setItems((prev) =>
          prev.map((item) =>
            item.id === contentId
              ? {
                  ...item,
                  body: template.template_data,
                  type: template.type,
                  template_id: templateId,
                  updated_at,
                  version: item.version + 1,
                }
              : item,
          ),
        );

        // Update template usage count
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === templateId ? { ...t, usage_count: t.usage_count + 1 } : t,
          ),
        );
      } catch (err) {
        const error =
          err instanceof Error ? err.message : 'Failed to apply template';
        setError(error);
        throw new Error(error);
      } finally {
        setIsLoading(false);
      }
    },
    [templates],
  );

  // Utility Actions
  const searchContent = useCallback(
    async (query: string): Promise<ContentItem[]> => {
      setIsLoading(true);
      setError(null);

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 300));

        const searchQuery = query.toLowerCase();
        const results = items.filter(
          (item) =>
            item.title.toLowerCase().includes(searchQuery) ||
            item.plain_text?.toLowerCase().includes(searchQuery) ||
            item.tags?.some((tag) => tag.toLowerCase().includes(searchQuery)),
        );

        return results;
      } catch (err) {
        const error =
          err instanceof Error ? err.message : 'Failed to search content';
        setError(error);
        throw new Error(error);
      } finally {
        setIsLoading(false);
      }
    },
    [items],
  );

  const getContentVersions = useCallback(
    async (id: string): Promise<ContentVersion[]> => {
      setIsLoading(true);
      setError(null);

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 400));

        const contentItem = items.find((item) => item.id === id);
        if (!contentItem) {
          throw new Error('Content not found');
        }

        // Mock versions
        const versions: ContentVersion[] = [];
        for (let i = contentItem.version; i >= 1; i--) {
          versions.push({
            id: `${id}_v${i}`,
            content_id: id,
            version: i,
            title: `${contentItem.title} (Version ${i})`,
            body: contentItem.body,
            created_by: contentItem.created_by,
            created_at: new Date(
              Date.now() - (contentItem.version - i) * 24 * 60 * 60 * 1000,
            ).toISOString(),
            change_summary:
              i === contentItem.version
                ? 'Current version'
                : `Version ${i} changes`,
          });
        }

        return versions;
      } catch (err) {
        const error =
          err instanceof Error ? err.message : 'Failed to get content versions';
        setError(error);
        throw new Error(error);
      } finally {
        setIsLoading(false);
      }
    },
    [items],
  );

  const restoreVersion = useCallback(
    async (contentId: string, versionId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 600));

        const updated_at = new Date().toISOString();

        setItems((prev) =>
          prev.map((item) =>
            item.id === contentId
              ? {
                  ...item,
                  updated_at,
                  version: item.version + 1,
                }
              : item,
          ),
        );

        if (currentItem?.id === contentId) {
          setCurrentItem((prev) =>
            prev
              ? {
                  ...prev,
                  updated_at,
                  version: prev.version + 1,
                }
              : null,
          );
        }
      } catch (err) {
        const error =
          err instanceof Error ? err.message : 'Failed to restore version';
        setError(error);
        throw new Error(error);
      } finally {
        setIsLoading(false);
      }
    },
    [currentItem],
  );

  return {
    // State
    items,
    currentItem,
    templates,
    isLoading,
    error,

    // Actions
    fetchContent,
    createContent,
    updateContent,
    deleteContent,
    publishContent,
    scheduleContent,
    duplicateContent,

    // Template actions
    createTemplate,
    applyTemplate,

    // Utility actions
    searchContent,
    getContentVersions,
    restoreVersion,
  };
};
