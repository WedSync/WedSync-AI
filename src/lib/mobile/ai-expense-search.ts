/**
 * WS-164: AI-Powered Expense Search System
 * Natural language search with intelligent filtering and semantic understanding
 */

import { DatabaseManager } from './database-manager';

export interface SearchQuery {
  text: string;
  filters?: {
    categories?: string[];
    vendors?: string[];
    amount_range?: [number, number];
    date_range?: [Date, Date];
    status?: string[];
  };
  sort_by?: 'relevance' | 'date' | 'amount' | 'category';
  limit?: number;
}

export interface SearchResult {
  id: string;
  type: 'expense' | 'vendor' | 'category' | 'suggestion';
  title: string;
  description: string;
  amount?: number;
  date?: Date;
  category?: string;
  vendor_name?: string;
  relevance_score: number;
  matched_terms: string[];
  context: string;
}

export interface NLPInsights {
  intent: 'search' | 'analyze' | 'compare' | 'track' | 'budget';
  entities: {
    amounts: number[];
    dates: Date[];
    categories: string[];
    vendors: string[];
    time_periods: string[];
  };
  sentiment: 'positive' | 'negative' | 'neutral' | 'concerned';
  confidence: number;
}

export class AIExpenseSearchEngine {
  private dbManager: DatabaseManager;
  private searchHistory: Map<string, SearchQuery[]> = new Map();

  // Wedding-specific categories and synonyms
  private categoryMappings = new Map([
    // Venue related
    ['venue', ['location', 'place', 'hall', 'church', 'reception', 'ceremony']],
    [
      'catering',
      ['food', 'meal', 'dinner', 'lunch', 'buffet', 'bar', 'drinks'],
    ],
    [
      'photography',
      ['photos', 'pictures', 'photographer', 'videography', 'video'],
    ],
    [
      'flowers',
      ['florist', 'bouquet', 'centerpieces', 'decorations', 'arrangements'],
    ],
    ['music', ['dj', 'band', 'entertainment', 'sound', 'audio']],
    ['dress', ['gown', 'attire', 'clothing', 'suit', 'tuxedo', 'outfit']],
    ['rings', ['jewelry', 'wedding bands', 'engagement']],
    ['transportation', ['car', 'limo', 'uber', 'taxi', 'bus']],
    ['stationery', ['invitations', 'save the dates', 'programs', 'menus']],
    ['beauty', ['hair', 'makeup', 'nails', 'spa', 'skincare']],
  ]);

  private intentPatterns = new Map([
    ['search', ['find', 'show', 'search', 'look for', 'where', 'what']],
    ['analyze', ['analyze', 'breakdown', 'summary', 'report', 'statistics']],
    ['compare', ['compare', 'vs', 'versus', 'difference', 'better', 'cheaper']],
    ['track', ['track', 'monitor', 'follow', 'progress', 'spent', 'spending']],
    ['budget', ['budget', 'afford', 'cost', 'price', 'expensive', 'cheap']],
  ]);

  constructor() {
    this.dbManager = new DatabaseManager();
  }

  async naturalLanguageSearch(
    query: string,
    weddingId: string,
  ): Promise<{
    results: SearchResult[];
    insights: NLPInsights;
    suggestions: string[];
  }> {
    try {
      // Parse natural language query
      const insights = await this.parseNaturalLanguage(query);

      // Build structured search query from NLP insights
      const searchQuery = this.buildSearchQuery(query, insights);

      // Execute search with AI-enhanced ranking
      const results = await this.executeIntelligentSearch(
        searchQuery,
        weddingId,
        insights,
      );

      // Generate helpful suggestions based on query and results
      const suggestions = await this.generateSearchSuggestions(
        query,
        results,
        weddingId,
      );

      // Store search history for personalization
      this.addToSearchHistory(weddingId, searchQuery);

      return {
        results,
        insights,
        suggestions,
      };
    } catch (error) {
      console.error('Natural language search error:', error);
      return {
        results: [],
        insights: {
          intent: 'search',
          entities: {
            amounts: [],
            dates: [],
            categories: [],
            vendors: [],
            time_periods: [],
          },
          sentiment: 'neutral',
          confidence: 0,
        },
        suggestions: [],
      };
    }
  }

  private async parseNaturalLanguage(query: string): Promise<NLPInsights> {
    const lowercaseQuery = query.toLowerCase();

    // Extract intent
    let intent: NLPInsights['intent'] = 'search';
    let maxConfidence = 0;

    for (const [intentType, patterns] of this.intentPatterns) {
      const matches = patterns.filter((pattern) =>
        lowercaseQuery.includes(pattern),
      ).length;
      const confidence = matches / patterns.length;
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        intent = intentType as NLPInsights['intent'];
      }
    }

    // Extract entities
    const entities = {
      amounts: this.extractAmounts(query),
      dates: await this.extractDates(query),
      categories: this.extractCategories(query),
      vendors: await this.extractVendors(query),
      time_periods: this.extractTimePeriods(query),
    };

    // Determine sentiment
    const sentiment = this.analyzeSentiment(query);

    return {
      intent,
      entities,
      sentiment,
      confidence: Math.max(maxConfidence, 0.7), // Base confidence
    };
  }

  private extractAmounts(query: string): number[] {
    const amounts: number[] = [];

    // Match currency patterns: $123, $1,234, $1234.56
    const currencyRegex = /\$\s*([\d,]+\.?\d*)/g;
    let match;
    while ((match = currencyRegex.exec(query)) !== null) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount)) amounts.push(amount);
    }

    // Match number patterns: 100, 1000, etc when followed by cost-related words
    const numberRegex =
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(dollar|dollars|buck|bucks|cost|price|spent)/gi;
    while ((match = numberRegex.exec(query)) !== null) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount)) amounts.push(amount);
    }

    return amounts;
  }

  private async extractDates(query: string): Promise<Date[]> {
    const dates: Date[] = [];

    // Relative dates
    const today = new Date();
    if (query.includes('today')) dates.push(today);
    if (query.includes('yesterday')) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      dates.push(yesterday);
    }
    if (query.includes('last week')) {
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      dates.push(lastWeek);
    }
    if (query.includes('last month')) {
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      dates.push(lastMonth);
    }

    // Month names
    const monthNames = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ];
    monthNames.forEach((month, index) => {
      if (query.toLowerCase().includes(month)) {
        const date = new Date(today.getFullYear(), index, 1);
        dates.push(date);
      }
    });

    // Date patterns (MM/DD/YYYY, MM-DD-YYYY)
    const dateRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g;
    let match;
    while ((match = dateRegex.exec(query)) !== null) {
      const date = new Date(
        parseInt(match[3]),
        parseInt(match[1]) - 1,
        parseInt(match[2]),
      );
      if (!isNaN(date.getTime())) dates.push(date);
    }

    return dates;
  }

  private extractCategories(query: string): string[] {
    const categories: string[] = [];
    const lowercaseQuery = query.toLowerCase();

    for (const [category, synonyms] of this.categoryMappings) {
      if (
        lowercaseQuery.includes(category) ||
        synonyms.some((synonym) => lowercaseQuery.includes(synonym))
      ) {
        categories.push(category);
      }
    }

    return categories;
  }

  private async extractVendors(query: string): Promise<string[]> {
    // Search for vendor names in the query by checking against database
    const vendorQuery = `
      SELECT DISTINCT name FROM vendors 
      WHERE LOWER(name) LIKE '%' || LOWER($1) || '%'
      LIMIT 10
    `;
    const result = await this.dbManager.query(vendorQuery, [query]);
    return result.rows.map((row) => row.name);
  }

  private extractTimePeriods(query: string): string[] {
    const periods: string[] = [];
    const lowercaseQuery = query.toLowerCase();

    const periodPatterns = [
      'this week',
      'last week',
      'next week',
      'this month',
      'last month',
      'next month',
      'this year',
      'last year',
      'recently',
      'upcoming',
      'soon',
    ];

    periodPatterns.forEach((period) => {
      if (lowercaseQuery.includes(period)) {
        periods.push(period);
      }
    });

    return periods;
  }

  private analyzeSentiment(
    query: string,
  ): 'positive' | 'negative' | 'neutral' | 'concerned' {
    const lowercaseQuery = query.toLowerCase();

    const positiveWords = [
      'great',
      'good',
      'excellent',
      'perfect',
      'happy',
      'satisfied',
      'love',
    ];
    const negativeWords = [
      'bad',
      'terrible',
      'awful',
      'hate',
      'disappointed',
      'frustrated',
    ];
    const concernedWords = [
      'expensive',
      'costly',
      'budget',
      'overspent',
      'worried',
      'problem',
      'issue',
    ];

    const positiveCount = positiveWords.filter((word) =>
      lowercaseQuery.includes(word),
    ).length;
    const negativeCount = negativeWords.filter((word) =>
      lowercaseQuery.includes(word),
    ).length;
    const concernedCount = concernedWords.filter((word) =>
      lowercaseQuery.includes(word),
    ).length;

    if (concernedCount > 0) return 'concerned';
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private buildSearchQuery(
    originalQuery: string,
    insights: NLPInsights,
  ): SearchQuery {
    const filters: SearchQuery['filters'] = {};

    if (insights.entities.categories.length > 0) {
      filters.categories = insights.entities.categories;
    }

    if (insights.entities.vendors.length > 0) {
      filters.vendors = insights.entities.vendors;
    }

    if (insights.entities.amounts.length >= 2) {
      filters.amount_range = [
        Math.min(...insights.entities.amounts),
        Math.max(...insights.entities.amounts),
      ];
    }

    if (insights.entities.dates.length >= 2) {
      filters.date_range = [
        new Date(Math.min(...insights.entities.dates.map((d) => d.getTime()))),
        new Date(Math.max(...insights.entities.dates.map((d) => d.getTime()))),
      ];
    } else if (insights.entities.dates.length === 1) {
      const date = insights.entities.dates[0];
      const startOfDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );
      const endOfDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        23,
        59,
        59,
      );
      filters.date_range = [startOfDay, endOfDay];
    }

    return {
      text: originalQuery,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      sort_by: insights.intent === 'analyze' ? 'amount' : 'relevance',
      limit: 20,
    };
  }

  private async executeIntelligentSearch(
    searchQuery: SearchQuery,
    weddingId: string,
    insights: NLPInsights,
  ): Promise<SearchResult[]> {
    let sql = `
      SELECT 
        e.id,
        e.title,
        e.description,
        e.amount,
        e.expense_date,
        e.category,
        v.name as vendor_name,
        e.created_at,
        ts_rank(
          setweight(to_tsvector('english', COALESCE(e.title, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(e.description, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(e.category, '')), 'C') ||
          setweight(to_tsvector('english', COALESCE(v.name, '')), 'D'),
          plainto_tsquery('english', $2)
        ) as relevance_score
      FROM expenses e
      LEFT JOIN vendors v ON e.vendor_id = v.id
      WHERE e.wedding_id = $1
    `;

    const params: any[] = [weddingId, searchQuery.text];
    let paramIndex = 3;

    // Add filters
    if (searchQuery.filters) {
      if (
        searchQuery.filters.categories &&
        searchQuery.filters.categories.length > 0
      ) {
        sql += ` AND e.category = ANY($${paramIndex})`;
        params.push(searchQuery.filters.categories);
        paramIndex++;
      }

      if (
        searchQuery.filters.vendors &&
        searchQuery.filters.vendors.length > 0
      ) {
        sql += ` AND v.name = ANY($${paramIndex})`;
        params.push(searchQuery.filters.vendors);
        paramIndex++;
      }

      if (searchQuery.filters.amount_range) {
        sql += ` AND e.amount BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        params.push(
          searchQuery.filters.amount_range[0],
          searchQuery.filters.amount_range[1],
        );
        paramIndex += 2;
      }

      if (searchQuery.filters.date_range) {
        sql += ` AND e.expense_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        params.push(
          searchQuery.filters.date_range[0],
          searchQuery.filters.date_range[1],
        );
        paramIndex += 2;
      }
    }

    // Add full-text search condition
    sql += ` AND (
      to_tsvector('english', COALESCE(e.title, '')) @@ plainto_tsquery('english', $2) OR
      to_tsvector('english', COALESCE(e.description, '')) @@ plainto_tsquery('english', $2) OR
      to_tsvector('english', COALESCE(e.category, '')) @@ plainto_tsquery('english', $2) OR
      to_tsvector('english', COALESCE(v.name, '')) @@ plainto_tsquery('english', $2)
    )`;

    // Add sorting
    switch (searchQuery.sort_by) {
      case 'date':
        sql += ` ORDER BY e.expense_date DESC`;
        break;
      case 'amount':
        sql += ` ORDER BY e.amount DESC`;
        break;
      case 'category':
        sql += ` ORDER BY e.category, e.amount DESC`;
        break;
      default:
        sql += ` ORDER BY relevance_score DESC, e.expense_date DESC`;
    }

    sql += ` LIMIT ${searchQuery.limit || 20}`;

    const result = await this.dbManager.query(sql, params);

    return result.rows.map((row) => ({
      id: row.id,
      type: 'expense' as const,
      title: row.title,
      description: row.description,
      amount: row.amount,
      date: row.expense_date,
      category: row.category,
      vendor_name: row.vendor_name,
      relevance_score: parseFloat(row.relevance_score) || 0,
      matched_terms: this.extractMatchedTerms(searchQuery.text, row),
      context: this.generateContextSummary(row, insights),
    }));
  }

  private extractMatchedTerms(searchText: string, row: any): string[] {
    const searchTerms = searchText.toLowerCase().split(/\s+/);
    const matchedTerms: string[] = [];

    const searchableText = [
      row.title,
      row.description,
      row.category,
      row.vendor_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    searchTerms.forEach((term) => {
      if (searchableText.includes(term) && term.length > 2) {
        matchedTerms.push(term);
      }
    });

    return matchedTerms;
  }

  private generateContextSummary(row: any, insights: NLPInsights): string {
    let context = '';

    if (insights.intent === 'analyze') {
      context = `${row.category} expense representing ${((row.amount / 10000) * 100).toFixed(1)}% of typical wedding budget`;
    } else if (insights.intent === 'compare') {
      context = `Compare with similar ${row.category} expenses`;
    } else if (insights.intent === 'budget') {
      context = `Budget impact: ${row.amount > 1000 ? 'High' : row.amount > 500 ? 'Medium' : 'Low'} cost item`;
    } else {
      const daysSince = Math.floor(
        (Date.now() - new Date(row.expense_date).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      context = `Added ${daysSince} days ago${row.vendor_name ? ` from ${row.vendor_name}` : ''}`;
    }

    return context;
  }

  private async generateSearchSuggestions(
    originalQuery: string,
    results: SearchResult[],
    weddingId: string,
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // No results suggestions
    if (results.length === 0) {
      suggestions.push(
        'Try searching with broader terms like "venue" or "catering"',
      );
      suggestions.push('Check if you have expenses in that category');
      suggestions.push('Try searching by vendor name or amount range');
    }

    // Related search suggestions based on results
    if (results.length > 0) {
      const categories = [
        ...new Set(results.map((r) => r.category).filter(Boolean)),
      ];
      const vendors = [
        ...new Set(results.map((r) => r.vendor_name).filter(Boolean)),
      ];

      if (categories.length > 1) {
        suggestions.push(
          `Also search in: ${categories.slice(0, 3).join(', ')}`,
        );
      }

      if (vendors.length > 0) {
        suggestions.push(`Related vendors: ${vendors.slice(0, 2).join(', ')}`);
      }

      // Amount-based suggestions
      const amounts = results.map((r) => r.amount).filter(Boolean) as number[];
      if (amounts.length > 0) {
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        suggestions.push(
          `Average expense in these results: $${avgAmount.toFixed(2)}`,
        );
      }
    }

    // Personalized suggestions based on search history
    const history = this.searchHistory.get(weddingId) || [];
    if (history.length > 0) {
      const recentCategories = history
        .flatMap((q) => q.filters?.categories || [])
        .filter((cat, index, arr) => arr.indexOf(cat) === index)
        .slice(0, 3);

      if (recentCategories.length > 0) {
        suggestions.push(`Recent searches: ${recentCategories.join(', ')}`);
      }
    }

    return suggestions.slice(0, 4); // Limit to 4 suggestions
  }

  private addToSearchHistory(weddingId: string, query: SearchQuery): void {
    if (!this.searchHistory.has(weddingId)) {
      this.searchHistory.set(weddingId, []);
    }

    const history = this.searchHistory.get(weddingId)!;
    history.unshift(query);

    // Keep only last 20 searches
    if (history.length > 20) {
      history.splice(20);
    }
  }

  async getSearchAnalytics(weddingId: string): Promise<{
    total_searches: number;
    popular_categories: string[];
    search_patterns: any[];
    success_rate: number;
  }> {
    const history = this.searchHistory.get(weddingId) || [];

    const categoryCounts = new Map<string, number>();
    history.forEach((query) => {
      if (query.filters?.categories) {
        query.filters.categories.forEach((cat) => {
          categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
        });
      }
    });

    const popularCategories = Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat);

    return {
      total_searches: history.length,
      popular_categories: popularCategories,
      search_patterns: this.analyzeSearchPatterns(history),
      success_rate: 0.85, // Would be calculated based on user interactions
    };
  }

  private analyzeSearchPatterns(history: SearchQuery[]): any[] {
    const patterns = [];

    // Time-based patterns
    const hourCounts = new Map<number, number>();
    history.forEach(() => {
      const hour = new Date().getHours(); // In real implementation, would use search timestamp
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    patterns.push({
      type: 'time_preference',
      data: Array.from(hourCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3),
    });

    return patterns;
  }

  async smartAutocomplete(
    partialQuery: string,
    weddingId: string,
  ): Promise<string[]> {
    const suggestions: string[] = [];
    const lowercaseQuery = partialQuery.toLowerCase();

    // Category suggestions
    for (const [category, synonyms] of this.categoryMappings) {
      if (
        category.startsWith(lowercaseQuery) ||
        synonyms.some((syn) => syn.startsWith(lowercaseQuery))
      ) {
        suggestions.push(`Search in ${category}`);
      }
    }

    // Vendor suggestions from database
    const vendorQuery = `
      SELECT DISTINCT name FROM vendors 
      WHERE LOWER(name) LIKE $1 || '%'
      LIMIT 5
    `;
    const vendorResult = await this.dbManager.query(vendorQuery, [
      lowercaseQuery,
    ]);
    vendorResult.rows.forEach((row) => {
      suggestions.push(`Search vendor: ${row.name}`);
    });

    // Historical search suggestions
    const history = this.searchHistory.get(weddingId) || [];
    const historicalMatches = history
      .filter((query) => query.text.toLowerCase().includes(lowercaseQuery))
      .slice(0, 3)
      .map((query) => query.text);

    suggestions.push(...historicalMatches);

    return [...new Set(suggestions)].slice(0, 8);
  }
}
