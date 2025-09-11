import { NextSeoProps } from 'next-seo';

export interface WeddingSEOConfig {
  coupleName: string;
  weddingDate: string;
  venue: {
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
  };
  description: string;
  keywords: string[];
  images: {
    main: string;
    gallery: string[];
  };
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

export interface WeddingData {
  coupleName: string;
  bride: string;
  groom: string;
  weddingDate: string;
  venue: {
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
  };
  description: string;
  ceremonyTime: string;
  receptionTime: string;
  website: string;
}

export interface SEOAnalysis {
  score: number;
  recommendations: string[];
  warnings: string[];
  issues: string[];
}

export class WeddingSEOManager {
  private config: WeddingSEOConfig;
  private baseUrl: string;

  constructor(config: WeddingSEOConfig, baseUrl: string) {
    this.config = config;
    this.baseUrl = baseUrl;
  }

  /**
   * Generate Next.js SEO configuration optimized for wedding websites
   */
  generateNextSEO(): NextSeoProps {
    const { coupleName, weddingDate, venue, description, images } = this.config;

    // Generate wedding-specific SEO title targeting search queries
    const title = `${coupleName} Wedding - ${new Date(
      weddingDate,
    ).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })} - ${venue.city}, ${venue.state}`;

    // Generate comprehensive meta description
    const metaDescription = `Join ${coupleName} for their wedding celebration on ${new Date(
      weddingDate,
    ).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })} at ${venue.name} in ${venue.city}, ${venue.state}. ${description}`;

    // Generate wedding-specific keywords
    const weddingKeywords = this.generateWeddingKeywords();

    return {
      title,
      description: metaDescription,
      canonical: this.baseUrl,
      additionalMetaTags: [
        {
          name: 'keywords',
          content: weddingKeywords.join(', '),
        },
        {
          name: 'author',
          content: coupleName,
        },
        {
          name: 'robots',
          content: 'index, follow',
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
      ],
      openGraph: {
        type: 'website',
        locale: 'en_US',
        url: this.baseUrl,
        siteName: `${coupleName} Wedding`,
        title,
        description: metaDescription,
        images: [
          {
            url: images.main,
            width: 1200,
            height: 630,
            alt: `${coupleName} Wedding Photo`,
            type: 'image/jpeg',
          },
          ...images.gallery.slice(0, 3).map((img, index) => ({
            url: img,
            width: 800,
            height: 600,
            alt: `${coupleName} Wedding Gallery Photo ${index + 1}`,
            type: 'image/jpeg',
          })),
        ],
      },
      twitter: {
        handle: '@wedding',
        site: '@wedding',
        cardType: 'summary_large_image',
      },
    };
  }

  /**
   * Generate wedding-specific keywords for SEO targeting
   */
  private generateWeddingKeywords(): string[] {
    const { coupleName, weddingDate, venue } = this.config;
    const [bride, groom] = coupleName.split(' & ').map((name) => name.trim());
    const dateObj = new Date(weddingDate);
    const month = dateObj.toLocaleDateString('en-US', { month: 'long' });
    const year = dateObj.getFullYear();

    return [
      // Primary search terms
      `${coupleName} wedding`,
      `${bride} ${groom} wedding`,
      `${coupleName} wedding ${month} ${year}`,
      `${bride} ${groom} wedding ${month} ${year}`,

      // Location-based keywords
      `${venue.city} wedding`,
      `${venue.name} wedding`,
      `wedding ${venue.city} ${venue.state}`,
      `${venue.city} ${venue.state} wedding venues`,

      // Date-specific keywords
      `${month} ${year} wedding`,
      `wedding ${dateObj.getDate()} ${month} ${year}`,

      // Generic wedding keywords
      'wedding website',
      'wedding invitation',
      'wedding RSVP',
      'wedding registry',
      'wedding photos',
      'wedding celebration',

      // Additional custom keywords
      ...this.config.keywords,
    ];
  }

  /**
   * Generate structured data (JSON-LD) for wedding events
   */
  generateStructuredData(weddingData: WeddingData): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: `${weddingData.coupleName} Wedding`,
      description: weddingData.description,
      startDate: new Date(
        `${weddingData.weddingDate}T${weddingData.ceremonyTime}`,
      ).toISOString(),
      endDate: new Date(`${weddingData.weddingDate}T23:59`).toISOString(),
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: weddingData.venue.name,
        address: {
          '@type': 'PostalAddress',
          streetAddress: weddingData.venue.address,
          addressLocality: weddingData.venue.city,
          addressRegion: weddingData.venue.state,
          addressCountry: weddingData.venue.country,
        },
      },
      organizer: {
        '@type': 'Person',
        name: weddingData.coupleName,
      },
      url: weddingData.website,
      image: this.config.images.main,
      offers: {
        '@type': 'Offer',
        availability: 'https://schema.org/InStock',
        price: '0',
        priceCurrency: 'USD',
        url: weddingData.website,
      },
    };
  }

  /**
   * Analyze SEO performance and provide recommendations
   */
  analyzeSEO(): SEOAnalysis {
    const analysis: SEOAnalysis = {
      score: 0,
      recommendations: [],
      warnings: [],
      issues: [],
    };

    let score = 0;
    const maxScore = 100;

    // Check title length (50-60 chars optimal)
    const seoConfig = this.generateNextSEO();
    const titleLength = seoConfig.title?.length || 0;
    if (titleLength >= 50 && titleLength <= 60) {
      score += 15;
    } else if (titleLength > 60) {
      analysis.warnings.push(
        'Title is too long (>60 characters). Consider shortening it.',
      );
      score += 5;
    } else {
      analysis.issues.push(
        'Title is too short (<50 characters). Add more descriptive keywords.',
      );
    }

    // Check description length (150-160 chars optimal)
    const descLength = seoConfig.description?.length || 0;
    if (descLength >= 150 && descLength <= 160) {
      score += 15;
    } else if (descLength > 160) {
      analysis.warnings.push('Meta description is too long (>160 characters).');
      score += 8;
    } else {
      analysis.issues.push('Meta description is too short (<150 characters).');
    }

    // Check keywords
    const keywords = this.generateWeddingKeywords();
    if (keywords.length >= 10) {
      score += 10;
    } else {
      analysis.recommendations.push(
        'Add more relevant wedding keywords for better search visibility.',
      );
    }

    // Check images
    if (this.config.images.main) {
      score += 10;
    } else {
      analysis.issues.push(
        'Missing main wedding image for social media sharing.',
      );
    }

    if (this.config.images.gallery.length >= 3) {
      score += 10;
    } else {
      analysis.recommendations.push(
        'Add more wedding photos to gallery for better engagement.',
      );
    }

    // Check venue information
    if (
      this.config.venue.name &&
      this.config.venue.city &&
      this.config.venue.state
    ) {
      score += 15;
    } else {
      analysis.issues.push('Incomplete venue information affects local SEO.');
    }

    // Check wedding date
    if (this.config.weddingDate) {
      score += 10;
    } else {
      analysis.issues.push('Missing wedding date affects event SEO.');
    }

    // Check structured data requirements
    score += 15; // Always present in our implementation

    analysis.score = Math.min(score, maxScore);

    // Add general recommendations
    if (analysis.score < 80) {
      analysis.recommendations.push(
        'Consider adding more detailed wedding information.',
      );
      analysis.recommendations.push(
        'Optimize images with descriptive alt text.',
      );
      analysis.recommendations.push(
        'Add social media integration for better sharing.',
      );
    }

    if (analysis.score >= 90) {
      analysis.recommendations.push(
        'Excellent SEO setup! Consider A/B testing different titles.',
      );
    }

    return analysis;
  }

  /**
   * Generate sitemap entries for wedding website
   */
  generateSitemapEntries(): Array<{
    url: string;
    lastmod: string;
    priority: number;
  }> {
    const baseDate = new Date().toISOString();

    return [
      {
        url: this.baseUrl,
        lastmod: baseDate,
        priority: 1.0,
      },
      {
        url: `${this.baseUrl}/rsvp`,
        lastmod: baseDate,
        priority: 0.9,
      },
      {
        url: `${this.baseUrl}/photos`,
        lastmod: baseDate,
        priority: 0.8,
      },
      {
        url: `${this.baseUrl}/details`,
        lastmod: baseDate,
        priority: 0.8,
      },
      {
        url: `${this.baseUrl}/registry`,
        lastmod: baseDate,
        priority: 0.7,
      },
      {
        url: `${this.baseUrl}/travel`,
        lastmod: baseDate,
        priority: 0.6,
      },
    ];
  }

  /**
   * Update SEO configuration
   */
  updateConfig(newConfig: Partial<WeddingSEOConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current SEO configuration
   */
  getConfig(): WeddingSEOConfig {
    return { ...this.config };
  }
}
