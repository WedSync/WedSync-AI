/**
 * WS-155: Message Search Service
 * Team E - Round 2
 * Advanced full-text search capabilities for guest communications
 */

import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';
import { cache } from 'react';

type Message = Database['public']['Tables']['messages']['Row'];
type SearchFilters = {
  status?: string;
  messageType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  clientId?: string;
  tags?: string[];
};

export interface SearchResult {
  messageId: string;
  subject: string;
  content: string;
  sender: string;
  recipient: string;
  sentAt: Date;
  status: string;
  relevanceScore: number;
  highlights: {
    subject?: string;
    content?: string;
  };
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'status';
  sortOrder?: 'asc' | 'desc';
}

class MessageSearchService {
  private supabase = createClient();

  /**
   * Perform full-text search across messages
   */
  async searchMessages(
    query: string,
    filters: SearchFilters = {},
    options: SearchOptions = {},
  ): Promise<{
    results: SearchResult[];
    totalCount: number;
    executionTime: number;
  }> {
    const startTime = Date.now();
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    try {
      // Call the database function for optimized search
      const { data, error, count } = await this.supabase
        .rpc('search_messages', {
          p_organization_id: await this.getCurrentOrgId(),
          p_query: query,
          p_filters: filters,
          p_limit: limit,
          p_offset: offset,
        })
        .select('*', { count: 'exact' });

      if (error) throw error;

      const executionTime = Date.now() - startTime;

      // Log slow queries
      if (executionTime > 50) {
        await this.logSlowQuery(query, executionTime, data?.length || 0);
      }

      return {
        results: (data || []).map(this.mapToSearchResult),
        totalCount: count || 0,
        executionTime,
      };
    } catch (error) {
      console.error('Message search failed:', error);
      throw new Error('Failed to search messages');
    }
  }

  /**
   * Advanced fuzzy search with typo tolerance
   */
  async fuzzySearch(
    query: string,
    threshold: number = 0.3,
  ): Promise<SearchResult[]> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('*')
        .textSearch('content', query, {
          type: 'websearch',
          config: 'english',
        })
        .gte('similarity', threshold)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return (data || []).map(this.mapToSearchResult);
    } catch (error) {
      console.error('Fuzzy search failed:', error);
      throw new Error('Failed to perform fuzzy search');
    }
  }

  /**
   * Search with natural language processing
   */
  async semanticSearch(
    query: string,
    useAI: boolean = false,
  ): Promise<SearchResult[]> {
    try {
      if (useAI) {
        // Enhance query with AI
        const enhancedQuery = await this.enhanceQueryWithAI(query);
        return this.searchMessages(enhancedQuery).then((res) => res.results);
      }

      // Use trigram similarity for semantic matching
      const { data, error } = await this.supabase.rpc(
        'semantic_message_search',
        {
          p_query: query,
          p_organization_id: await this.getCurrentOrgId(),
        },
      );

      if (error) throw error;

      return (data || []).map(this.mapToSearchResult);
    } catch (error) {
      console.error('Semantic search failed:', error);
      throw new Error('Failed to perform semantic search');
    }
  }

  /**
   * Get search suggestions based on partial input
   */
  async getSearchSuggestions(
    partial: string,
    limit: number = 5,
  ): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('subject, content')
        .ilike('subject', `${partial}%`)
        .limit(limit);

      if (error) throw error;

      const suggestions = new Set<string>();
      data?.forEach((msg) => {
        if (msg.subject?.toLowerCase().includes(partial.toLowerCase())) {
          suggestions.add(msg.subject);
        }
      });

      return Array.from(suggestions).slice(0, limit);
    } catch (error) {
      console.error('Failed to get search suggestions:', error);
      return [];
    }
  }

  /**
   * Search within specific conversation threads
   */
  async searchInThread(
    threadId: string,
    query: string,
  ): Promise<SearchResult[]> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .textSearch('search_vector', query)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(this.mapToSearchResult);
    } catch (error) {
      console.error('Thread search failed:', error);
      throw new Error('Failed to search in thread');
    }
  }

  /**
   * Get frequently searched terms
   */
  async getPopularSearches(limit: number = 10): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('search_history')
        .select('query, count')
        .order('count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((item) => item.query);
    } catch (error) {
      console.error('Failed to get popular searches:', error);
      return [];
    }
  }

  /**
   * Save search query for analytics
   */
  private async saveSearchQuery(
    query: string,
    resultCount: number,
  ): Promise<void> {
    try {
      await this.supabase.from('search_history').insert({
        query,
        result_count: resultCount,
        organization_id: await this.getCurrentOrgId(),
        searched_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to save search query:', error);
    }
  }

  /**
   * Enhance search query with AI
   */
  private async enhanceQueryWithAI(query: string): Promise<string> {
    try {
      const response = await fetch('/api/ai/enhance-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) return query;

      const { enhancedQuery } = await response.json();
      return enhancedQuery || query;
    } catch {
      return query;
    }
  }

  /**
   * Map database row to search result
   */
  private mapToSearchResult(row: any): SearchResult {
    return {
      messageId: row.message_id || row.id,
      subject: row.subject || '',
      content: row.content || '',
      sender: row.sender || row.sender_name || '',
      recipient: row.recipient || row.recipient_name || '',
      sentAt: new Date(row.sent_at || row.created_at),
      status: row.status || 'unknown',
      relevanceScore: row.relevance_score || row.rank || 0,
      highlights: row.highlights || {},
    };
  }

  /**
   * Get current organization ID
   */
  private async getCurrentOrgId(): Promise<string> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data } = await this.supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!data?.organization_id) throw new Error('Organization not found');
    return data.organization_id;
  }

  /**
   * Log slow query for monitoring
   */
  private async logSlowQuery(
    query: string,
    executionTime: number,
    rowCount: number,
  ): Promise<void> {
    try {
      await this.supabase.rpc('log_slow_query', {
        p_query_text: query,
        p_execution_time_ms: executionTime,
        p_rows_returned: rowCount,
        p_organization_id: await this.getCurrentOrgId(),
      });
    } catch (error) {
      console.error('Failed to log slow query:', error);
    }
  }
}

// Export cached version for optimal performance
export const messageSearchService = new MessageSearchService();

// React cache for server components
export const searchMessages = cache(
  async (query: string, filters?: SearchFilters, options?: SearchOptions) => {
    return messageSearchService.searchMessages(query, filters, options);
  },
);

export const getSearchSuggestions = cache(
  async (partial: string, limit?: number) => {
    return messageSearchService.getSearchSuggestions(partial, limit);
  },
);
