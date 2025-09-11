export interface SocialCardConfig {
  title: string;
  description: string;
  image: string;
  url: string;
  siteName: string;
  type?: 'website' | 'article' | 'profile';
  locale?: string;
}

export interface TwitterCardConfig {
  card: 'summary' | 'summary_large_image' | 'app' | 'player';
  site?: string;
  creator?: string;
  title: string;
  description: string;
  image: string;
  imageAlt?: string;
}

export interface WeddingCardData {
  coupleName: string;
  weddingDate: string;
  venue: string;
  mainImage: string;
  description: string;
  websiteUrl: string;
}

export class SocialMediaCardsGenerator {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate Open Graph meta tags for wedding websites
   */
  generateOpenGraphTags(weddingData: WeddingCardData): Record<string, string> {
    const weddingDate = new Date(weddingData.weddingDate);
    const formattedDate = weddingDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return {
      'og:type': 'website',
      'og:title': `${weddingData.coupleName} Wedding - ${formattedDate}`,
      'og:description': `Join ${weddingData.coupleName} for their wedding celebration at ${weddingData.venue}. ${weddingData.description}`,
      'og:image': weddingData.mainImage,
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:image:alt': `${weddingData.coupleName} Wedding Photo`,
      'og:url': weddingData.websiteUrl,
      'og:site_name': `${weddingData.coupleName} Wedding`,
      'og:locale': 'en_US',
    };
  }

  /**
   * Generate Twitter Card meta tags for wedding websites
   */
  generateTwitterCardTags(
    weddingData: WeddingCardData,
  ): Record<string, string> {
    const weddingDate = new Date(weddingData.weddingDate);
    const formattedDate = weddingDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    return {
      'twitter:card': 'summary_large_image',
      'twitter:title': `${weddingData.coupleName} Wedding`,
      'twitter:description': `Celebrating love on ${formattedDate} at ${weddingData.venue}. Join us for our special day!`,
      'twitter:image': weddingData.mainImage,
      'twitter:image:alt': `${weddingData.coupleName} Wedding Invitation`,
      'twitter:site': '@wedding',
      'twitter:creator': '@wedding',
    };
  }

  /**
   * Generate all social media meta tags
   */
  generateAllSocialTags(weddingData: WeddingCardData): Record<string, string> {
    return {
      ...this.generateOpenGraphTags(weddingData),
      ...this.generateTwitterCardTags(weddingData),
    };
  }

  /**
   * Generate Facebook-specific meta tags
   */
  generateFacebookTags(weddingData: WeddingCardData): Record<string, string> {
    return {
      'fb:app_id': process.env.FACEBOOK_APP_ID || '',
      'og:type': 'website',
      'og:title': `${weddingData.coupleName} Wedding`,
      'og:description': `You're invited to celebrate ${weddingData.coupleName}'s wedding on ${new Date(weddingData.weddingDate).toLocaleDateString()}`,
      'og:image': weddingData.mainImage,
      'og:url': weddingData.websiteUrl,
    };
  }

  /**
   * Generate LinkedIn-specific meta tags
   */
  generateLinkedInTags(weddingData: WeddingCardData): Record<string, string> {
    return {
      'og:type': 'article',
      'og:title': `${weddingData.coupleName} Wedding Celebration`,
      'og:description': `Join us for a beautiful wedding celebration at ${weddingData.venue}`,
      'og:image': weddingData.mainImage,
      'og:url': weddingData.websiteUrl,
      'article:author': weddingData.coupleName,
      'article:published_time': new Date().toISOString(),
    };
  }

  /**
   * Generate WhatsApp sharing optimized tags
   */
  generateWhatsAppTags(weddingData: WeddingCardData): Record<string, string> {
    return {
      'og:type': 'website',
      'og:title': `💒 ${weddingData.coupleName} Wedding Invitation`,
      'og:description': `You're invited! 💍 Join us for our wedding celebration 🎉`,
      'og:image': weddingData.mainImage,
      'og:url': weddingData.websiteUrl,
    };
  }

  /**
   * Validate social media image requirements
   */
  validateSocialImage(imageUrl: string): {
    isValid: boolean;
    recommendations: string[];
    warnings: string[];
  } {
    const recommendations: string[] = [];
    const warnings: string[] = [];
    let isValid = true;

    // Basic URL validation
    if (!imageUrl || !imageUrl.startsWith('http')) {
      isValid = false;
      warnings.push('Invalid image URL provided');
    }

    // Recommend optimal dimensions
    recommendations.push('Use 1200x630px for optimal Facebook/Twitter sharing');
    recommendations.push('Ensure image file size is under 8MB');
    recommendations.push('Use high-quality JPEG or PNG format');
    recommendations.push('Include couple names or wedding date in the image');

    return {
      isValid,
      recommendations,
      warnings,
    };
  }

  /**
   * Generate sharing URLs for different platforms
   */
  generateSharingUrls(weddingData: WeddingCardData): Record<string, string> {
    const encodedUrl = encodeURIComponent(weddingData.websiteUrl);
    const encodedTitle = encodeURIComponent(
      `${weddingData.coupleName} Wedding`,
    );
    const encodedDescription = encodeURIComponent(
      `Join us for our wedding celebration!`,
    );

    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%20${encodedUrl}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    };
  }

  /**
   * Generate structured data for social sharing
   */
  generateSocialStructuredData(weddingData: WeddingCardData): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: `${weddingData.coupleName} Wedding`,
      description: weddingData.description,
      startDate: weddingData.weddingDate,
      location: {
        '@type': 'Place',
        name: weddingData.venue,
      },
      image: weddingData.mainImage,
      url: weddingData.websiteUrl,
      organizer: {
        '@type': 'Person',
        name: weddingData.coupleName,
      },
    };
  }

  /**
   * Preview how the card will appear on different platforms
   */
  generateSocialPreview(weddingData: WeddingCardData): {
    facebook: object;
    twitter: object;
    linkedin: object;
    whatsapp: object;
  } {
    const weddingDate = new Date(weddingData.weddingDate).toLocaleDateString(
      'en-US',
      {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      },
    );

    return {
      facebook: {
        title: `${weddingData.coupleName} Wedding`,
        description: `Join us on ${weddingDate} at ${weddingData.venue}`,
        image: weddingData.mainImage,
        url: weddingData.websiteUrl,
        siteName: `${weddingData.coupleName} Wedding`,
      },
      twitter: {
        title: `${weddingData.coupleName} Wedding`,
        description: `Celebrating love on ${weddingDate} 💍`,
        image: weddingData.mainImage,
        card: 'summary_large_image',
      },
      linkedin: {
        title: `${weddingData.coupleName} Wedding Celebration`,
        description: `You're invited to join our special day at ${weddingData.venue}`,
        image: weddingData.mainImage,
      },
      whatsapp: {
        title: `💒 ${weddingData.coupleName} Wedding`,
        description: `You're invited! 💍 ${weddingDate} 🎉`,
        image: weddingData.mainImage,
      },
    };
  }
}
