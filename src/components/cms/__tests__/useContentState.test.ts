import { renderHook, act } from '@testing-library/react';
import { useContentState } from '../../../hooks/useContentState';
import { ContentItem, ContentTemplate } from '@/types/cms';

// Mock useContentState hook tests
// WS-223 Team A - Round 1

describe('useContentState', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock setTimeout for simulated API calls
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useContentState());

    expect(result.current.items).toEqual([]);
    expect(result.current.currentItem).toBeNull();
    expect(result.current.templates).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('loads mock data on mount', async () => {
    const { result } = renderHook(() => useContentState());

    // Wait for mock data to load
    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current.items.length).toBeGreaterThan(0);
    expect(result.current.templates.length).toBeGreaterThan(0);
  });

  it('creates new content', async () => {
    const { result } = renderHook(() => useContentState());

    const newContentData = {
      title: 'New Test Content',
      type: 'welcome_message' as const,
      status: 'draft' as const,
      plain_text: 'This is test content',
    };

    let createdContent: ContentItem;

    await act(async () => {
      const promise = result.current.createContent(newContentData);
      jest.advanceTimersByTime(1000);
      createdContent = await promise;
    });

    expect(createdContent!.title).toBe('New Test Content');
    expect(result.current.items).toContainEqual(createdContent!);
    expect(result.current.currentItem).toEqual(createdContent!);
  });

  it('updates existing content', async () => {
    const { result } = renderHook(() => useContentState());

    // Wait for initial data
    act(() => {
      jest.advanceTimersByTime(0);
    });

    const firstItem = result.current.items[0];
    const updateData = {
      title: 'Updated Title',
      plain_text: 'Updated content',
    };

    let updatedContent: ContentItem;

    await act(async () => {
      const promise = result.current.updateContent(firstItem.id, updateData);
      jest.advanceTimersByTime(700);
      updatedContent = await promise;
    });

    expect(updatedContent!.title).toBe('Updated Title');
    expect(updatedContent!.version).toBe(firstItem.version + 1);
  });

  it('deletes content', async () => {
    const { result } = renderHook(() => useContentState());

    // Wait for initial data
    act(() => {
      jest.advanceTimersByTime(0);
    });

    const firstItem = result.current.items[0];
    const initialCount = result.current.items.length;

    await act(async () => {
      const promise = result.current.deleteContent(firstItem.id);
      jest.advanceTimersByTime(500);
      await promise;
    });

    expect(result.current.items.length).toBe(initialCount - 1);
    expect(result.current.items).not.toContainEqual(firstItem);
  });

  it('publishes content', async () => {
    const { result } = renderHook(() => useContentState());

    // Wait for initial data
    act(() => {
      jest.advanceTimersByTime(0);
    });

    const draftItem = result.current.items.find(
      (item) => item.status === 'draft',
    );
    if (!draftItem) return;

    await act(async () => {
      const promise = result.current.publishContent(draftItem.id);
      jest.advanceTimersByTime(1100);
      await promise;
    });

    const publishedItem = result.current.items.find(
      (item) => item.id === draftItem.id,
    );
    expect(publishedItem?.status).toBe('published');
    expect(publishedItem?.published_at).toBeDefined();
  });

  it('schedules content', async () => {
    const { result } = renderHook(() => useContentState());

    // Wait for initial data
    act(() => {
      jest.advanceTimersByTime(0);
    });

    const draftItem = result.current.items.find(
      (item) => item.status === 'draft',
    );
    if (!draftItem) return;

    const scheduleDate = '2025-02-15T14:30:00Z';

    await act(async () => {
      const promise = result.current.scheduleContent(
        draftItem.id,
        scheduleDate,
      );
      jest.advanceTimersByTime(700);
      await promise;
    });

    const scheduledItem = result.current.items.find(
      (item) => item.id === draftItem.id,
    );
    expect(scheduledItem?.status).toBe('scheduled');
    expect(scheduledItem?.scheduled_at).toBe(scheduleDate);
  });

  it('duplicates content', async () => {
    const { result } = renderHook(() => useContentState());

    // Wait for initial data
    act(() => {
      jest.advanceTimersByTime(0);
    });

    const firstItem = result.current.items[0];
    const initialCount = result.current.items.length;

    let duplicatedContent: ContentItem;

    await act(async () => {
      const promise = result.current.duplicateContent(firstItem.id);
      jest.advanceTimersByTime(600);
      duplicatedContent = await promise;
    });

    expect(result.current.items.length).toBe(initialCount + 1);
    expect(duplicatedContent!.title).toBe(`${firstItem.title} (Copy)`);
    expect(duplicatedContent!.status).toBe('draft');
    expect(duplicatedContent!.id).not.toBe(firstItem.id);
  });

  it('creates templates', async () => {
    const { result } = renderHook(() => useContentState());

    const templateData = {
      name: 'New Template',
      description: 'Test template',
      type: 'welcome_message' as const,
      category: 'welcome',
    };

    let createdTemplate: ContentTemplate;

    await act(async () => {
      const promise = result.current.createTemplate(templateData);
      jest.advanceTimersByTime(800);
      createdTemplate = await promise;
    });

    expect(createdTemplate!.name).toBe('New Template');
    expect(result.current.templates).toContainEqual(createdTemplate!);
  });

  it('applies template to content', async () => {
    const { result } = renderHook(() => useContentState());

    // Wait for initial data
    act(() => {
      jest.advanceTimersByTime(0);
    });

    const firstItem = result.current.items[0];
    const firstTemplate = result.current.templates[0];

    await act(async () => {
      const promise = result.current.applyTemplate(
        firstItem.id,
        firstTemplate.id,
      );
      jest.advanceTimersByTime(600);
      await promise;
    });

    const updatedItem = result.current.items.find(
      (item) => item.id === firstItem.id,
    );
    expect(updatedItem?.template_id).toBe(firstTemplate.id);
    expect(updatedItem?.body).toEqual(firstTemplate.template_data);

    const updatedTemplate = result.current.templates.find(
      (t) => t.id === firstTemplate.id,
    );
    expect(updatedTemplate?.usage_count).toBe(firstTemplate.usage_count + 1);
  });

  it('searches content', async () => {
    const { result } = renderHook(() => useContentState());

    // Wait for initial data
    act(() => {
      jest.advanceTimersByTime(0);
    });

    let searchResults: ContentItem[];

    await act(async () => {
      const promise = result.current.searchContent('wedding');
      jest.advanceTimersByTime(400);
      searchResults = await promise;
    });

    expect(searchResults!.length).toBeGreaterThan(0);
    searchResults!.forEach((item) => {
      expect(
        item.title.toLowerCase().includes('wedding') ||
          item.plain_text?.toLowerCase().includes('wedding'),
      ).toBe(true);
    });
  });

  it('gets content versions', async () => {
    const { result } = renderHook(() => useContentState());

    // Wait for initial data
    act(() => {
      jest.advanceTimersByTime(0);
    });

    const firstItem = result.current.items[0];
    let versions: any[];

    await act(async () => {
      const promise = result.current.getContentVersions(firstItem.id);
      jest.advanceTimersByTime(500);
      versions = await promise;
    });

    expect(versions!.length).toBe(firstItem.version);
    expect(versions![0].version).toBe(firstItem.version);
    expect(versions![0].content_id).toBe(firstItem.id);
  });

  it('restores content version', async () => {
    const { result } = renderHook(() => useContentState());

    // Wait for initial data
    act(() => {
      jest.advanceTimersByTime(0);
    });

    const firstItem = result.current.items[0];
    const versionId = `${firstItem.id}_v1`;

    await act(async () => {
      const promise = result.current.restoreVersion(firstItem.id, versionId);
      jest.advanceTimersByTime(700);
      await promise;
    });

    const restoredItem = result.current.items.find(
      (item) => item.id === firstItem.id,
    );
    expect(restoredItem?.version).toBe(firstItem.version + 1);
  });

  it('handles loading states', async () => {
    const { result } = renderHook(() => useContentState());

    expect(result.current.isLoading).toBe(false);

    const createPromise = result.current.createContent({ title: 'Test' });

    // Should be loading during async operation
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await createPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('handles error states', async () => {
    const { result } = renderHook(() => useContentState());

    // Mock a failed operation by calling with invalid ID
    await act(async () => {
      try {
        const promise = result.current.updateContent('invalid-id', {
          title: 'Test',
        });
        jest.advanceTimersByTime(700);
        await promise;
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe('Content not found');
  });

  it('fetches content with filters', async () => {
    const { result } = renderHook(() => useContentState());

    // Wait for initial data
    act(() => {
      jest.advanceTimersByTime(0);
    });

    const filters = { status: 'draft', type: 'welcome_message' };

    await act(async () => {
      const promise = result.current.fetchContent(filters);
      jest.advanceTimersByTime(600);
      await promise;
    });

    expect(result.current.isLoading).toBe(false);
    // Filtered results would be applied
  });

  it('clears errors on successful operations', async () => {
    const { result } = renderHook(() => useContentState());

    // Create an error state first
    await act(async () => {
      try {
        const promise = result.current.updateContent('invalid-id', {
          title: 'Test',
        });
        jest.advanceTimersByTime(700);
        await promise;
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBeTruthy();

    // Successful operation should clear error
    await act(async () => {
      const promise = result.current.createContent({ title: 'New Content' });
      jest.advanceTimersByTime(1000);
      await promise;
    });

    expect(result.current.error).toBeNull();
  });

  it('updates current item when editing', async () => {
    const { result } = renderHook(() => useContentState());

    // Create and set current item
    const newContentData = { title: 'Current Item' };

    let createdContent: ContentItem;
    await act(async () => {
      const promise = result.current.createContent(newContentData);
      jest.advanceTimersByTime(1000);
      createdContent = await promise;
    });

    expect(result.current.currentItem).toEqual(createdContent!);

    // Update the current item
    const updateData = { title: 'Updated Current Item' };

    await act(async () => {
      const promise = result.current.updateContent(
        createdContent!.id,
        updateData,
      );
      jest.advanceTimersByTime(700);
      await promise;
    });

    expect(result.current.currentItem?.title).toBe('Updated Current Item');
  });

  it('clears current item when deleting it', async () => {
    const { result } = renderHook(() => useContentState());

    // Create and set current item
    const newContentData = { title: 'To Delete' };

    let createdContent: ContentItem;
    await act(async () => {
      const promise = result.current.createContent(newContentData);
      jest.advanceTimersByTime(1000);
      createdContent = await promise;
    });

    expect(result.current.currentItem).toEqual(createdContent!);

    // Delete the current item
    await act(async () => {
      const promise = result.current.deleteContent(createdContent!.id);
      jest.advanceTimersByTime(500);
      await promise;
    });

    expect(result.current.currentItem).toBeNull();
  });
});
