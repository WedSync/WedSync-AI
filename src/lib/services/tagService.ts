import { supabase } from '@/lib/supabase';
import { Tag, TagColor, TagCategory } from '@/components/tags/TagManager';

interface TagCreateInput {
  name: string;
  description?: string;
  color: TagColor;
  category: TagCategory;
}

interface TagUpdateInput {
  name?: string;
  description?: string;
  color?: TagColor;
  category?: TagCategory;
}

interface TagFilterOptions {
  category?: TagCategory;
  searchQuery?: string;
  sortBy?: 'name' | 'usage' | 'created' | 'updated';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

interface BulkTagOperation {
  action: 'add' | 'remove';
  tagIds: string[];
  clientIds: string[];
}

class TagService {
  // Cache for frequently accessed tags
  private tagCache: Map<string, { tag: Tag; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Create a new tag
   */
  async createTag(input: TagCreateInput, supplierId: string): Promise<Tag> {
    // Validate tag name (alphanumeric, spaces, dashes, underscores only)
    const validNamePattern = /^[a-zA-Z0-9\s\-_]+$/;
    if (!validNamePattern.test(input.name)) {
      throw new Error('Tag name contains invalid characters');
    }

    // Sanitize input to prevent XSS
    const sanitizedInput = {
      name: this.sanitizeInput(input.name),
      description: input.description
        ? this.sanitizeInput(input.description)
        : null,
      color: input.color,
      category: input.category,
      supplier_id: supplierId,
      usage_count: 0,
    };

    const { data, error } = await supabase
      .from('tags')
      .insert([sanitizedInput])
      .select()
      .single();

    if (error) {
      console.error('Error creating tag:', error);
      throw new Error('Failed to create tag');
    }

    // Clear cache after creation
    this.clearCache();

    return data as Tag;
  }

  /**
   * Update an existing tag
   */
  async updateTag(
    tagId: string,
    input: TagUpdateInput,
    supplierId: string,
  ): Promise<Tag> {
    // Validate and sanitize input
    const sanitizedInput: any = {};

    if (input.name) {
      const validNamePattern = /^[a-zA-Z0-9\s\-_]+$/;
      if (!validNamePattern.test(input.name)) {
        throw new Error('Tag name contains invalid characters');
      }
      sanitizedInput.name = this.sanitizeInput(input.name);
    }

    if (input.description !== undefined) {
      sanitizedInput.description = input.description
        ? this.sanitizeInput(input.description)
        : null;
    }

    if (input.color) {
      sanitizedInput.color = input.color;
    }

    if (input.category) {
      sanitizedInput.category = input.category;
    }

    sanitizedInput.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('tags')
      .update(sanitizedInput)
      .eq('id', tagId)
      .eq('supplier_id', supplierId)
      .select()
      .single();

    if (error) {
      console.error('Error updating tag:', error);
      throw new Error('Failed to update tag');
    }

    // Clear cache after update
    this.clearCache();

    return data as Tag;
  }

  /**
   * Delete a tag and remove all associations
   */
  async deleteTag(tagId: string, supplierId: string): Promise<void> {
    // Start a transaction to delete tag and all associations
    const { error: associationError } = await supabase
      .from('client_tags')
      .delete()
      .eq('tag_id', tagId);

    if (associationError) {
      console.error('Error removing tag associations:', associationError);
      throw new Error('Failed to remove tag associations');
    }

    const { error: tagError } = await supabase
      .from('tags')
      .delete()
      .eq('id', tagId)
      .eq('supplier_id', supplierId);

    if (tagError) {
      console.error('Error deleting tag:', tagError);
      throw new Error('Failed to delete tag');
    }

    // Clear cache after deletion
    this.clearCache();
  }

  /**
   * Get all tags for a supplier
   */
  async getTags(
    supplierId: string,
    options?: TagFilterOptions,
  ): Promise<Tag[]> {
    let query = supabase.from('tags').select('*').eq('supplier_id', supplierId);

    // Apply category filter
    if (options?.category) {
      query = query.eq('category', options.category);
    }

    // Apply search filter
    if (options?.searchQuery) {
      const searchPattern = `%${options.searchQuery}%`;
      query = query.or(
        `name.ilike.${searchPattern},description.ilike.${searchPattern}`,
      );
    }

    // Apply sorting
    const sortColumn = options?.sortBy || 'name';
    const sortOrder = options?.sortOrder || 'asc';
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1,
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tags:', error);
      throw new Error('Failed to fetch tags');
    }

    return data as Tag[];
  }

  /**
   * Get a single tag by ID
   */
  async getTag(tagId: string, supplierId: string): Promise<Tag | null> {
    // Check cache first
    const cached = this.getFromCache(tagId);
    if (cached) return cached;

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('id', tagId)
      .eq('supplier_id', supplierId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error fetching tag:', error);
      throw new Error('Failed to fetch tag');
    }

    // Cache the result
    this.addToCache(tagId, data as Tag);

    return data as Tag;
  }

  /**
   * Associate tags with a client
   */
  async addTagsToClient(
    clientId: string,
    tagIds: string[],
    supplierId: string,
  ): Promise<void> {
    // Validate that tags belong to the supplier
    const { data: tags, error: tagError } = await supabase
      .from('tags')
      .select('id')
      .eq('supplier_id', supplierId)
      .in('id', tagIds);

    if (tagError) {
      console.error('Error validating tags:', tagError);
      throw new Error('Failed to validate tags');
    }

    const validTagIds = tags.map((t) => t.id);
    if (validTagIds.length !== tagIds.length) {
      throw new Error(
        'Some tags are invalid or do not belong to this supplier',
      );
    }

    // Create associations
    const associations = validTagIds.map((tagId) => ({
      client_id: clientId,
      tag_id: tagId,
      supplier_id: supplierId,
    }));

    const { error } = await supabase
      .from('client_tags')
      .upsert(associations, { onConflict: 'client_id,tag_id' });

    if (error) {
      console.error('Error adding tags to client:', error);
      throw new Error('Failed to add tags to client');
    }

    // Update usage counts
    await this.updateUsageCounts(validTagIds);
  }

  /**
   * Remove tags from a client
   */
  async removeTagsFromClient(
    clientId: string,
    tagIds: string[],
    supplierId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('client_tags')
      .delete()
      .eq('client_id', clientId)
      .eq('supplier_id', supplierId)
      .in('tag_id', tagIds);

    if (error) {
      console.error('Error removing tags from client:', error);
      throw new Error('Failed to remove tags from client');
    }

    // Update usage counts
    await this.updateUsageCounts(tagIds);
  }

  /**
   * Get all tags for a client
   */
  async getClientTags(clientId: string, supplierId: string): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('client_tags')
      .select('tags(*)')
      .eq('client_id', clientId)
      .eq('supplier_id', supplierId);

    if (error) {
      console.error('Error fetching client tags:', error);
      throw new Error('Failed to fetch client tags');
    }

    return data.map((item) => item.tags) as Tag[];
  }

  /**
   * Get clients by tag IDs (with AND/OR logic)
   */
  async getClientsByTags(
    tagIds: string[],
    logic: 'AND' | 'OR',
    supplierId: string,
  ): Promise<string[]> {
    if (logic === 'OR') {
      // Get clients that have ANY of the specified tags
      const { data, error } = await supabase
        .from('client_tags')
        .select('client_id')
        .eq('supplier_id', supplierId)
        .in('tag_id', tagIds);

      if (error) {
        console.error('Error fetching clients by tags:', error);
        throw new Error('Failed to fetch clients by tags');
      }

      // Return unique client IDs
      return [...new Set(data.map((item) => item.client_id))];
    } else {
      // Get clients that have ALL of the specified tags
      const { data, error } = await supabase.rpc('get_clients_with_all_tags', {
        tag_ids: tagIds,
        supplier_id: supplierId,
      });

      if (error) {
        console.error('Error fetching clients by tags:', error);
        throw new Error('Failed to fetch clients by tags');
      }

      return data as string[];
    }
  }

  /**
   * Bulk tag operations
   */
  async bulkTagOperation(
    operation: BulkTagOperation,
    supplierId: string,
  ): Promise<void> {
    if (operation.action === 'add') {
      // Add tags to multiple clients
      const associations = [];
      for (const clientId of operation.clientIds) {
        for (const tagId of operation.tagIds) {
          associations.push({
            client_id: clientId,
            tag_id: tagId,
            supplier_id: supplierId,
          });
        }
      }

      const { error } = await supabase
        .from('client_tags')
        .upsert(associations, { onConflict: 'client_id,tag_id' });

      if (error) {
        console.error('Error in bulk add operation:', error);
        throw new Error('Failed to add tags in bulk');
      }
    } else {
      // Remove tags from multiple clients
      const { error } = await supabase
        .from('client_tags')
        .delete()
        .eq('supplier_id', supplierId)
        .in('client_id', operation.clientIds)
        .in('tag_id', operation.tagIds);

      if (error) {
        console.error('Error in bulk remove operation:', error);
        throw new Error('Failed to remove tags in bulk');
      }
    }

    // Update usage counts
    await this.updateUsageCounts(operation.tagIds);
  }

  /**
   * Get tag analytics
   */
  async getTagAnalytics(
    supplierId: string,
    timeRange: '7d' | '30d' | '90d' | 'all',
  ): Promise<any> {
    // Calculate date range
    let startDate: Date | null = null;
    const now = new Date();

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get tag usage statistics
    const { data, error } = await supabase.rpc('get_tag_analytics', {
      supplier_id: supplierId,
      start_date: startDate?.toISOString() || null,
    });

    if (error) {
      console.error('Error fetching tag analytics:', error);
      throw new Error('Failed to fetch tag analytics');
    }

    return data;
  }

  /**
   * Export tag analytics
   */
  async exportTagAnalytics(
    supplierId: string,
    timeRange: '7d' | '30d' | '90d' | 'all',
    format: 'csv' | 'json',
  ): Promise<Blob> {
    const analytics = await this.getTagAnalytics(supplierId, timeRange);

    if (format === 'csv') {
      // Convert to CSV
      const headers = [
        'Tag Name',
        'Category',
        'Usage Count',
        'Growth Rate',
        'Last Used',
      ];
      const rows = analytics.map((item: any) => [
        item.tag.name,
        item.tag.category,
        item.usage_count,
        item.growth_rate,
        item.last_used,
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      return new Blob([csv], { type: 'text/csv' });
    } else {
      // Return as JSON
      return new Blob([JSON.stringify(analytics, null, 2)], {
        type: 'application/json',
      });
    }
  }

  /**
   * Update usage counts for tags
   */
  private async updateUsageCounts(tagIds: string[]): Promise<void> {
    for (const tagId of tagIds) {
      const { data, error } = await supabase
        .from('client_tags')
        .select('id', { count: 'exact' })
        .eq('tag_id', tagId);

      if (!error && data) {
        await supabase
          .from('tags')
          .update({ usage_count: data.length })
          .eq('id', tagId);
      }
    }
  }

  /**
   * Sanitize input to prevent XSS
   */
  private sanitizeInput(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }

  /**
   * Cache management
   */
  private getFromCache(tagId: string): Tag | null {
    const cached = this.tagCache.get(tagId);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTimeout) {
      this.tagCache.delete(tagId);
      return null;
    }

    return cached.tag;
  }

  private addToCache(tagId: string, tag: Tag): void {
    this.tagCache.set(tagId, {
      tag,
      timestamp: Date.now(),
    });
  }

  private clearCache(): void {
    this.tagCache.clear();
  }
}

// Export singleton instance
export const tagService = new TagService();

// Export types
export type {
  TagCreateInput,
  TagUpdateInput,
  TagFilterOptions,
  BulkTagOperation,
};
