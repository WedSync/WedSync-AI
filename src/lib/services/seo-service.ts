import { Metadata } from 'next';
import { SEOSettings } from '@/types/wedding-website';

export class SEOService {
  generateMetaTags(settings: SEOSettings): string {
    const tags: string[] = [];

    tags.push(`<title>${this.escapeHtml(settings.title)}</title>`);

    if (settings.description) {
      tags.push(
        `<meta name="description" content="${this.escapeHtml(settings.description)}" />`,
      );
    }

    if (settings.keywords && settings.keywords.length > 0) {
      tags.push(
        `<meta name="keywords" content="${this.escapeHtml(settings.keywords.join(', '))}" />`,
      );
    }

    tags.push(
      `<meta property="og:title" content="${this.escapeHtml(settings.og_title || settings.title)}" />`,
    );

    if (settings.og_description || settings.description) {
      tags.push(
        `<meta property="og:description" content="${this.escapeHtml(settings.og_description || settings.description)}" />`,
      );
    }

    if (settings.og_image) {
      tags.push(
        `<meta property="og:image" content="${this.escapeHtml(settings.og_image)}" />`,
      );
    }

    tags.push(`<meta property="og:type" content="website" />`);

    if (settings.canonical_url) {
      tags.push(
        `<link rel="canonical" href="${this.escapeHtml(settings.canonical_url)}" />`,
      );
    }

    if (settings.twitter_card) {
      tags.push(
        `<meta name="twitter:card" content="${settings.twitter_card}" />`,
      );
    }

    if (settings.twitter_title || settings.title) {
      tags.push(
        `<meta name="twitter:title" content="${this.escapeHtml(settings.twitter_title || settings.title)}" />`,
      );
    }

    if (settings.twitter_description || settings.description) {
      tags.push(
        `<meta name="twitter:description" content="${this.escapeHtml(settings.twitter_description || settings.description)}" />`,
      );
    }

    if (settings.twitter_image || settings.og_image) {
      tags.push(
        `<meta name="twitter:image" content="${this.escapeHtml(settings.twitter_image || settings.og_image || '')}" />`,
      );
    }

    if (settings.robots) {
      tags.push(
        `<meta name="robots" content="${this.escapeHtml(settings.robots)}" />`,
      );
    }

    tags.push(
      `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
    );
    tags.push(`<meta charset="utf-8" />`);

    return tags.join('\n');
  }

  generateNextMetadata(settings: SEOSettings, websiteUrl?: string): Metadata {
    const metadata: Metadata = {
      title: settings.title,
      description: settings.description,
      keywords: settings.keywords,
      openGraph: {
        title: settings.og_title || settings.title,
        description: settings.og_description || settings.description,
        type: 'website',
        images: settings.og_image ? [settings.og_image] : undefined,
        url: websiteUrl,
      },
      twitter: {
        card: settings.twitter_card || 'summary_large_image',
        title: settings.twitter_title || settings.title,
        description: settings.twitter_description || settings.description,
        images:
          settings.twitter_image || settings.og_image
            ? [settings.twitter_image || settings.og_image || '']
            : undefined,
      },
      robots: settings.robots || 'index, follow',
      alternates: {
        canonical: settings.canonical_url,
      },
    };

    return metadata;
  }

  generateStructuredData(weddingData: {
    brideName: string;
    groomName: string;
    weddingDate: string;
    venueName?: string;
    venueAddress?: string;
    imageUrl?: string;
  }): string {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      '@id': '#wedding',
      name: `${weddingData.brideName} & ${weddingData.groomName}'s Wedding`,
      startDate: weddingData.weddingDate,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: weddingData.venueName
        ? {
            '@type': 'Place',
            name: weddingData.venueName,
            address: weddingData.venueAddress
              ? {
                  '@type': 'PostalAddress',
                  streetAddress: weddingData.venueAddress,
                }
              : undefined,
          }
        : undefined,
      image: weddingData.imageUrl,
      description: `Wedding celebration of ${weddingData.brideName} and ${weddingData.groomName}`,
      organizer: {
        '@type': 'Person',
        name: `${weddingData.brideName} & ${weddingData.groomName}`,
      },
    };

    return `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>`;
  }

  analyzeSEO(settings: SEOSettings): {
    score: number;
    recommendations: string[];
    warnings: string[];
  } {
    const recommendations: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    if (!settings.title) {
      warnings.push('Missing page title');
      score -= 20;
    } else if (settings.title.length < 30) {
      recommendations.push('Title is too short. Aim for 50-60 characters.');
      score -= 5;
    } else if (settings.title.length > 60) {
      recommendations.push('Title is too long. Keep it under 60 characters.');
      score -= 5;
    }

    if (!settings.description) {
      warnings.push('Missing meta description');
      score -= 15;
    } else if (settings.description.length < 120) {
      recommendations.push(
        'Meta description is too short. Aim for 150-160 characters.',
      );
      score -= 5;
    } else if (settings.description.length > 160) {
      recommendations.push(
        'Meta description is too long. Keep it under 160 characters.',
      );
      score -= 5;
    }

    if (!settings.keywords || settings.keywords.length === 0) {
      recommendations.push('Add relevant keywords for better SEO.');
      score -= 5;
    } else if (settings.keywords.length > 10) {
      recommendations.push(
        'Too many keywords. Focus on 5-10 most relevant ones.',
      );
      score -= 3;
    }

    if (!settings.og_image) {
      recommendations.push(
        'Add an Open Graph image for better social media sharing.',
      );
      score -= 10;
    }

    if (!settings.canonical_url) {
      recommendations.push(
        'Set a canonical URL to avoid duplicate content issues.',
      );
      score -= 5;
    }

    return {
      score: Math.max(0, score),
      recommendations,
      warnings,
    };
  }

  generateSitemap(
    pages: Array<{ url: string; lastModified?: Date; priority?: number }>,
  ): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${this.escapeHtml(page.url)}</loc>
    <lastmod>${page.lastModified ? page.lastModified.toISOString() : new Date().toISOString()}</lastmod>
    <priority>${page.priority || 0.5}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

    return xml;
  }

  generateRobotsTxt(sitemapUrl?: string, disallowPaths?: string[]): string {
    const lines = ['User-agent: *', 'Allow: /'];

    if (disallowPaths && disallowPaths.length > 0) {
      disallowPaths.forEach((path) => {
        lines.push(`Disallow: ${path}`);
      });
    }

    if (sitemapUrl) {
      lines.push('');
      lines.push(`Sitemap: ${sitemapUrl}`);
    }

    return lines.join('\n');
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}

export const seoService = new SEOService();
