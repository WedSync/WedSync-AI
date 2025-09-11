// Portfolio Integration Manager for WedSync Marketplace
// Manages wedding vendor portfolio integrations and media assets

export interface PortfolioProvider {
  id: string;
  name: string;
  type: 'pixieset' | 'shootproof' | 'cloudspot' | 'smugmug' | 'zenfolio';
  api_endpoint: string;
  auth_method: 'oauth' | 'api_key' | 'basic_auth';
  supported_formats: string[];
  sync_capabilities: {
    galleries: boolean;
    images: boolean;
    metadata: boolean;
    client_access: boolean;
  };
}

export interface PortfolioGallery {
  id: string;
  provider_id: string;
  external_id: string;
  title: string;
  description: string;
  wedding_date?: string;
  client_name?: string;
  image_count: number;
  cover_image_url?: string;
  is_public: boolean;
  password_protected: boolean;
  created_at: string;
  last_synced: string;
}

export interface PortfolioImage {
  id: string;
  gallery_id: string;
  external_id: string;
  filename: string;
  title?: string;
  description?: string;
  url: string;
  thumbnail_url: string;
  width: number;
  height: number;
  file_size: number;
  format: string;
  tags: string[];
  is_featured: boolean;
  order_index: number;
  metadata: Record<string, any>;
}

export class PortfolioIntegrationManager {
  private providers: Map<string, PortfolioProvider> = new Map();
  private galleries: Map<string, PortfolioGallery> = new Map();
  private images: Map<string, PortfolioImage> = new Map();

  /**
   * Add portfolio provider integration
   */
  addProvider(provider: PortfolioProvider): void {
    this.providers.set(provider.id, provider);
    console.log(`Added portfolio provider: ${provider.name}`);
  }

  /**
   * Sync wedding galleries from portfolio provider
   */
  async syncGalleries(
    providerId: string,
    vendorId: string,
  ): Promise<{
    synced_galleries: number;
    new_galleries: number;
    updated_galleries: number;
    sync_errors: string[];
  }> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Portfolio provider not found: ${providerId}`);
    }

    console.log(`Syncing galleries from ${provider.name}...`);

    // Simulate API call to portfolio provider
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockGalleries = this.generateMockGalleries(providerId, vendorId);
    let newGalleries = 0;
    let updatedGalleries = 0;

    for (const gallery of mockGalleries) {
      const existingGallery = this.galleries.get(gallery.id);
      if (existingGallery) {
        updatedGalleries++;
      } else {
        newGalleries++;
      }
      this.galleries.set(gallery.id, gallery);
    }

    return {
      synced_galleries: mockGalleries.length,
      new_galleries: newGalleries,
      updated_galleries: updatedGalleries,
      sync_errors: [],
    };
  }

  /**
   * Sync images from a specific gallery
   */
  async syncGalleryImages(galleryId: string): Promise<{
    synced_images: number;
    new_images: number;
    updated_images: number;
    sync_errors: string[];
  }> {
    const gallery = this.galleries.get(galleryId);
    if (!gallery) {
      throw new Error(`Gallery not found: ${galleryId}`);
    }

    console.log(`Syncing images for gallery: ${gallery.title}`);

    // Simulate image sync
    await new Promise((resolve) => setTimeout(resolve, 300));

    const mockImages = this.generateMockImages(galleryId);
    let newImages = 0;
    let updatedImages = 0;

    for (const image of mockImages) {
      const existingImage = this.images.get(image.id);
      if (existingImage) {
        updatedImages++;
      } else {
        newImages++;
      }
      this.images.set(image.id, image);
    }

    return {
      synced_images: mockImages.length,
      new_images: newImages,
      updated_images: updatedImages,
      sync_errors: [],
    };
  }

  /**
   * Get vendor's portfolio galleries
   */
  async getVendorGalleries(vendorId: string): Promise<PortfolioGallery[]> {
    return Array.from(this.galleries.values())
      .filter((gallery) => gallery.id.includes(vendorId))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }

  /**
   * Get featured wedding images for vendor
   */
  async getFeaturedImages(
    vendorId: string,
    limit: number = 12,
  ): Promise<PortfolioImage[]> {
    const vendorGalleries = await this.getVendorGalleries(vendorId);
    const galleryIds = vendorGalleries.map((g) => g.id);

    return Array.from(this.images.values())
      .filter(
        (image) => galleryIds.includes(image.gallery_id) && image.is_featured,
      )
      .sort((a, b) => b.order_index - a.order_index)
      .slice(0, limit);
  }

  /**
   * Create portfolio showcase for vendor profile
   */
  async createPortfolioShowcase(vendorId: string): Promise<{
    showcase_id: string;
    featured_galleries: PortfolioGallery[];
    featured_images: PortfolioImage[];
    total_images: number;
    styles_represented: string[];
  }> {
    const galleries = await this.getVendorGalleries(vendorId);
    const featuredImages = await this.getFeaturedImages(vendorId);

    // Extract styles from gallery metadata and tags
    const styles = new Set<string>();
    galleries.forEach((gallery) => {
      if (gallery.description) {
        // Extract potential style keywords
        const styleKeywords = [
          'rustic',
          'modern',
          'vintage',
          'boho',
          'classic',
          'destination',
        ];
        styleKeywords.forEach((style) => {
          if (gallery.description.toLowerCase().includes(style)) {
            styles.add(style.charAt(0).toUpperCase() + style.slice(1));
          }
        });
      }
    });

    const totalImages = galleries.reduce(
      (sum, gallery) => sum + gallery.image_count,
      0,
    );

    return {
      showcase_id: `showcase_${vendorId}_${Date.now()}`,
      featured_galleries: galleries.slice(0, 6),
      featured_images: featuredImages,
      total_images: totalImages,
      styles_represented: Array.from(styles),
    };
  }

  /**
   * Generate portfolio analytics
   */
  async getPortfolioAnalytics(vendorId: string): Promise<{
    total_galleries: number;
    total_images: number;
    most_popular_gallery: string;
    average_images_per_gallery: number;
    client_engagement_score: number;
    style_distribution: Record<string, number>;
    monthly_uploads: Array<{ month: string; count: number }>;
  }> {
    const galleries = await this.getVendorGalleries(vendorId);
    const totalImages = galleries.reduce(
      (sum, gallery) => sum + gallery.image_count,
      0,
    );
    const averageImagesPerGallery =
      galleries.length > 0 ? totalImages / galleries.length : 0;

    const mostPopularGallery =
      galleries.reduce((popular, current) => {
        return current.image_count > popular.image_count ? current : popular;
      }, galleries[0])?.title || 'N/A';

    return {
      total_galleries: galleries.length,
      total_images: totalImages,
      most_popular_gallery: mostPopularGallery,
      average_images_per_gallery: Math.round(averageImagesPerGallery),
      client_engagement_score: Math.random() * 5, // 0-5 score
      style_distribution: {
        Modern: 35,
        Rustic: 28,
        Classic: 20,
        Boho: 12,
        Vintage: 5,
      },
      monthly_uploads: this.generateMonthlyUploadStats(),
    };
  }

  /**
   * Generate mock galleries for testing
   */
  private generateMockGalleries(
    providerId: string,
    vendorId: string,
  ): PortfolioGallery[] {
    const galleryNames = [
      'Sarah & James Wedding',
      'Emma & Michael Engagement',
      'Alice & David Reception',
      'Sophie & Thomas Ceremony',
      'Lucy & Oliver Portrait Session',
    ];

    return galleryNames.map((name, index) => ({
      id: `gallery_${vendorId}_${index}`,
      provider_id: providerId,
      external_id: `ext_${index}_${Math.random().toString(36).substr(2, 9)}`,
      title: name,
      description: `Beautiful wedding photography capturing precious moments`,
      wedding_date: new Date(
        Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .split('T')[0],
      client_name: name.split('&')[0].trim(),
      image_count: Math.floor(Math.random() * 200) + 50,
      cover_image_url: `https://example.com/cover_${index}.jpg`,
      is_public: Math.random() > 0.3,
      password_protected: Math.random() > 0.7,
      created_at: new Date(
        Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      last_synced: new Date().toISOString(),
    }));
  }

  /**
   * Generate mock images for testing
   */
  private generateMockImages(galleryId: string): PortfolioImage[] {
    const imageCount = Math.floor(Math.random() * 50) + 10;

    return Array.from({ length: imageCount }, (_, index) => ({
      id: `img_${galleryId}_${index}`,
      gallery_id: galleryId,
      external_id: `ext_img_${index}_${Math.random().toString(36).substr(2, 9)}`,
      filename: `wedding_${index}.jpg`,
      title: `Wedding Photo ${index + 1}`,
      description: 'Beautiful wedding moment captured',
      url: `https://example.com/images/wedding_${index}.jpg`,
      thumbnail_url: `https://example.com/thumbs/wedding_${index}_thumb.jpg`,
      width: 1920,
      height: 1280,
      file_size: Math.floor(Math.random() * 5000000) + 500000,
      format: 'JPEG',
      tags: ['wedding', 'ceremony', 'reception', 'bride', 'groom'].slice(
        0,
        Math.floor(Math.random() * 3) + 1,
      ),
      is_featured: Math.random() > 0.8,
      order_index: index,
      metadata: {
        camera: 'Canon EOS R5',
        lens: '24-70mm f/2.8',
        iso: Math.floor(Math.random() * 3200) + 100,
        aperture: 'f/2.8',
        shutter_speed: '1/125',
      },
    }));
  }

  /**
   * Generate monthly upload statistics
   */
  private generateMonthlyUploadStats(): Array<{
    month: string;
    count: number;
  }> {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    return months.map((month) => ({
      month,
      count: Math.floor(Math.random() * 20) + 5,
    }));
  }
}

export default PortfolioIntegrationManager;
