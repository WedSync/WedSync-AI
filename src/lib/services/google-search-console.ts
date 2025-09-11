import { google } from 'googleapis';
import { supabase } from '@/lib/supabase';

interface SearchConsoleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken?: string;
}

interface PerformanceData {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface QueryPerformance extends PerformanceData {
  query: string;
}

interface PagePerformance extends PerformanceData {
  page: string;
}

interface SearchAnalyticsQuery {
  startDate: string;
  endDate: string;
  dimensions?: string[];
  dimensionFilterGroups?: any[];
  rowLimit?: number;
  startRow?: number;
}

export class GoogleSearchConsoleService {
  private oauth2Client;
  private searchconsole;
  private supplierId: string;

  constructor(config: SearchConsoleConfig, supplierId: string) {
    this.supplierId = supplierId;

    // Initialize OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri,
    );

    if (config.refreshToken) {
      this.oauth2Client.setCredentials({
        refresh_token: config.refreshToken,
      });
    }

    // Initialize Search Console API
    this.searchconsole = google.searchconsole({
      version: 'v1',
      auth: this.oauth2Client,
    });
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthorizationUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    // Store refresh token securely
    if (tokens.refresh_token) {
      await this.storeRefreshToken(tokens.refresh_token);
    }

    return tokens;
  }

  /**
   * Store refresh token in database
   */
  private async storeRefreshToken(refreshToken: string) {
    const { error } = await supabase.from('supplier_integrations').upsert({
      supplier_id: this.supplierId,
      integration_type: 'google_search_console',
      credentials: {
        refresh_token: refreshToken,
      },
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error storing refresh token:', error);
      throw error;
    }
  }

  /**
   * Fetch search analytics data
   */
  async getSearchAnalytics(
    siteUrl: string,
    query: SearchAnalyticsQuery,
  ): Promise<any> {
    try {
      const response = await this.searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: query,
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching search analytics:', error);
      throw error;
    }
  }

  /**
   * Get keyword rankings
   */
  async getKeywordRankings(
    siteUrl: string,
    days: number = 7,
  ): Promise<QueryPerformance[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query: SearchAnalyticsQuery = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dimensions: ['query'],
      rowLimit: 1000,
    };

    const data = await this.getSearchAnalytics(siteUrl, query);

    return (
      data.rows?.map((row: any) => ({
        query: row.keys[0],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      })) || []
    );
  }

  /**
   * Get page performance data
   */
  async getPagePerformance(
    siteUrl: string,
    days: number = 30,
  ): Promise<PagePerformance[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query: SearchAnalyticsQuery = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dimensions: ['page'],
      rowLimit: 500,
    };

    const data = await this.getSearchAnalytics(siteUrl, query);

    return (
      data.rows?.map((row: any) => ({
        page: row.keys[0],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      })) || []
    );
  }

  /**
   * Get device-specific performance
   */
  async getDevicePerformance(siteUrl: string, days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query: SearchAnalyticsQuery = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dimensions: ['device'],
      rowLimit: 10,
    };

    const data = await this.getSearchAnalytics(siteUrl, query);

    return (
      data.rows?.map((row: any) => ({
        device: row.keys[0],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      })) || []
    );
  }

  /**
   * Get country-specific performance
   */
  async getCountryPerformance(siteUrl: string, days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query: SearchAnalyticsQuery = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dimensions: ['country'],
      rowLimit: 50,
    };

    const data = await this.getSearchAnalytics(siteUrl, query);

    return (
      data.rows?.map((row: any) => ({
        country: row.keys[0],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      })) || []
    );
  }

  /**
   * Sync keyword rankings to database
   */
  async syncKeywordRankings(siteUrl: string) {
    try {
      const rankings = await this.getKeywordRankings(siteUrl);

      for (const ranking of rankings) {
        // First, ensure keyword exists
        const { data: keywordData, error: keywordError } = await supabase
          .from('seo_keywords')
          .upsert({
            supplier_id: this.supplierId,
            keyword: ranking.query,
            keyword_type: this.classifyKeywordType(ranking.query),
            is_tracked: true,
          })
          .select('id')
          .single();

        if (keywordError) {
          console.error('Error upserting keyword:', keywordError);
          continue;
        }

        // Then, insert ranking data
        const { error: rankingError } = await supabase
          .from('seo_rankings')
          .insert({
            keyword_id: keywordData.id,
            supplier_id: this.supplierId,
            position: Math.round(ranking.position),
            url: siteUrl,
            search_engine: 'google',
            device_type: 'all',
            tracked_at: new Date().toISOString(),
          });

        if (rankingError) {
          console.error('Error inserting ranking:', rankingError);
        }
      }

      return { success: true, count: rankings.length };
    } catch (error) {
      console.error('Error syncing keyword rankings:', error);
      throw error;
    }
  }

  /**
   * Sync organic traffic data to database
   */
  async syncOrganicTraffic(siteUrl: string) {
    try {
      const pagePerformance = await this.getPagePerformance(siteUrl);

      for (const page of pagePerformance) {
        const { error } = await supabase.from('seo_organic_traffic').upsert({
          supplier_id: this.supplierId,
          page_url: page.page,
          sessions: page.clicks,
          pageviews: page.impressions,
          bounce_rate: null, // Not available from Search Console
          source: 'organic',
          medium: 'search',
          device_category: 'all',
          date: new Date().toISOString().split('T')[0],
        });

        if (error) {
          console.error('Error inserting traffic data:', error);
        }
      }

      return { success: true, count: pagePerformance.length };
    } catch (error) {
      console.error('Error syncing organic traffic:', error);
      throw error;
    }
  }

  /**
   * Classify keyword type based on patterns
   */
  private classifyKeywordType(keyword: string): string {
    const lowerKeyword = keyword.toLowerCase();

    if (lowerKeyword.includes('near me') || lowerKeyword.includes('in ')) {
      return 'local';
    }
    if (keyword.split(' ').length >= 4) {
      return 'long_tail';
    }
    if (lowerKeyword.includes('wedding') || lowerKeyword.includes('venue')) {
      return 'primary';
    }

    return 'secondary';
  }

  /**
   * Get search performance trends
   */
  async getPerformanceTrends(siteUrl: string, days: number = 90) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query: SearchAnalyticsQuery = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dimensions: ['date'],
    };

    const data = await this.getSearchAnalytics(siteUrl, query);

    return (
      data.rows?.map((row: any) => ({
        date: row.keys[0],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      })) || []
    );
  }

  /**
   * Detect SEO opportunities from Search Console data
   */
  async detectOpportunities(siteUrl: string) {
    const rankings = await this.getKeywordRankings(siteUrl, 30);
    const opportunities = [];

    for (const ranking of rankings) {
      // High impressions but low CTR
      if (ranking.impressions > 100 && ranking.ctr < 0.02) {
        opportunities.push({
          type: 'low_ctr',
          keyword: ranking.query,
          impressions: ranking.impressions,
          currentCtr: ranking.ctr,
          recommendation: 'Improve meta title and description',
        });
      }

      // Good position but could be better
      if (
        ranking.position > 3 &&
        ranking.position <= 10 &&
        ranking.impressions > 50
      ) {
        opportunities.push({
          type: 'position_improvement',
          keyword: ranking.query,
          currentPosition: ranking.position,
          impressions: ranking.impressions,
          recommendation: 'Optimize content and build more links',
        });
      }

      // High position but low clicks
      if (
        ranking.position <= 3 &&
        ranking.clicks < 10 &&
        ranking.impressions > 100
      ) {
        opportunities.push({
          type: 'featured_snippet_opportunity',
          keyword: ranking.query,
          position: ranking.position,
          impressions: ranking.impressions,
          recommendation: 'Structure content for featured snippets',
        });
      }
    }

    return opportunities;
  }
}
