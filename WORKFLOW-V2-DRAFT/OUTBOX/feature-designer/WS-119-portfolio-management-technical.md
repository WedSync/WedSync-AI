# WS-119: Portfolio Management System - Technical Specification

## Feature Overview
A comprehensive portfolio management system enabling wedding suppliers to showcase their work with intelligent organization, auto-tagging, and performance optimization.

## User Stories

### Wedding Photographer Portfolio Management
**As a wedding photographer**, I want to efficiently organize and display my portfolio so that couples can easily browse my work and book my services.

**Scenario**: Sarah, a wedding photographer, has 500+ images from 20 weddings she wants to organize into a compelling portfolio.

**User Journey**:
1. Sarah uploads 30 images from a recent barn wedding
2. The system auto-tags them as "rustic", "outdoor ceremony", "golden hour"
3. She organizes them into "Featured Work" collection titled "Sunset Barn Wedding"
4. The system optimizes images for web and generates SEO-friendly alt text
5. She reorders images using drag-and-drop to tell the wedding story
6. Portfolio automatically updates with structured data for better search visibility

### Venue Portfolio Showcase
**As a wedding venue manager**, I want to showcase different spaces and seasonal looks so couples can envision their perfect day.

**Scenario**: Mountain View Estate wants to highlight their ceremony garden, reception hall, and bridal suite across all seasons.

**User Journey**:
1. Venue manager uploads 100 images across four seasons
2. System categorizes by location (ceremony garden, reception hall, bridal suite)
3. Auto-tagging identifies seasons and lighting conditions
4. Manager creates featured collections: "Spring Garden Ceremonies", "Winter Reception Magic"
5. Performance optimization ensures fast loading for potential clients
6. SEO optimization helps venue appear in local wedding searches

## Database Schema

### Core Portfolio Tables

```sql
-- Main portfolio images table
CREATE TABLE portfolio_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES supplier_profiles(id) ON DELETE CASCADE,
    original_url TEXT NOT NULL,
    alt_text TEXT NOT NULL,
    caption TEXT,
    upload_date TIMESTAMPTZ DEFAULT NOW(),
    is_hero BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    wedding_date DATE,
    venue_name VARCHAR(255),
    couple_names VARCHAR(255),
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimized image variants
CREATE TABLE portfolio_image_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_image_id UUID REFERENCES portfolio_images(id) ON DELETE CASCADE,
    variant_type VARCHAR(50) NOT NULL, -- 'thumbnail', 'medium', 'large', 'webp_thumb', etc.
    url TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    file_size INTEGER,
    format VARCHAR(10), -- 'jpeg', 'webp', 'png'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Featured work collections
CREATE TABLE portfolio_featured_work (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES supplier_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    venue_name VARCHAR(255),
    wedding_date DATE,
    couple_names VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Association between featured work and images
CREATE TABLE portfolio_featured_work_images (
    featured_work_id UUID REFERENCES portfolio_featured_work(id) ON DELETE CASCADE,
    portfolio_image_id UUID REFERENCES portfolio_images(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    PRIMARY KEY (featured_work_id, portfolio_image_id)
);

-- Image tags for categorization
CREATE TABLE portfolio_image_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50), -- 'style', 'venue_type', 'season', 'time_of_day', etc.
    color VARCHAR(7), -- Hex color for UI display
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Many-to-many relationship between images and tags
CREATE TABLE portfolio_image_tag_assignments (
    portfolio_image_id UUID REFERENCES portfolio_images(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES portfolio_image_tags(id) ON DELETE CASCADE,
    confidence_score DECIMAL(3,2), -- AI tagging confidence (0.00-1.00)
    is_manual BOOLEAN DEFAULT FALSE, -- User-added vs AI-generated tag
    PRIMARY KEY (portfolio_image_id, tag_id)
);

-- Portfolio performance analytics
CREATE TABLE portfolio_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES supplier_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    image_interactions INTEGER DEFAULT 0,
    featured_work_views INTEGER DEFAULT 0,
    inquiry_conversions INTEGER DEFAULT 0,
    PRIMARY KEY (supplier_id, date)
);
```

### Indexes for Performance

```sql
-- Performance indexes
CREATE INDEX idx_portfolio_images_supplier_featured ON portfolio_images(supplier_id, is_featured);
CREATE INDEX idx_portfolio_images_sort_order ON portfolio_images(supplier_id, sort_order);
CREATE INDEX idx_portfolio_image_variants_lookup ON portfolio_image_variants(portfolio_image_id, variant_type);
CREATE INDEX idx_portfolio_tags_category ON portfolio_image_tags(category);
CREATE INDEX idx_portfolio_analytics_date ON portfolio_analytics(supplier_id, date);

-- Full-text search
CREATE INDEX idx_portfolio_images_search ON portfolio_images USING gin(to_tsvector('english', coalesce(alt_text, '') || ' ' || coalesce(caption, '') || ' ' || coalesce(venue_name, '')));
```

### Row Level Security

```sql
-- RLS policies for portfolio access
ALTER TABLE portfolio_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_featured_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_analytics ENABLE ROW LEVEL SECURITY;

-- Suppliers can manage their own portfolios
CREATE POLICY portfolio_supplier_access ON portfolio_images
    FOR ALL USING (
        supplier_id IN (
            SELECT id FROM supplier_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY featured_work_supplier_access ON portfolio_featured_work
    FOR ALL USING (
        supplier_id IN (
            SELECT id FROM supplier_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Public read access for approved suppliers
CREATE POLICY portfolio_public_read ON portfolio_images
    FOR SELECT USING (
        supplier_id IN (
            SELECT id FROM supplier_profiles 
            WHERE status = 'approved' AND is_active = true
        )
    );
```

## API Endpoints

### Portfolio Management

```typescript
// Upload and process portfolio images
POST /api/suppliers/[id]/portfolio/upload
interface UploadPortfolioRequest {
  files: File[];
  wedding_date?: string;
  venue_name?: string;
  couple_names?: string;
  tags?: string[];
}

interface UploadPortfolioResponse {
  images: {
    id: string;
    original_url: string;
    variants: ImageVariant[];
    ai_tags: string[];
    alt_text: string;
  }[];
  processing_jobs: string[]; // Background job IDs
}

// Get supplier portfolio
GET /api/suppliers/[id]/portfolio?category=featured&limit=20&offset=0
interface PortfolioResponse {
  images: PortfolioImage[];
  featured_work: FeaturedWork[];
  stats: {
    total_images: number;
    total_views: number;
    last_updated: string;
  };
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

// Update image metadata
PATCH /api/portfolio/images/[id]
interface UpdateImageRequest {
  alt_text?: string;
  caption?: string;
  tags?: string[];
  is_hero?: boolean;
  is_featured?: boolean;
}

// Reorder portfolio images
PUT /api/suppliers/[id]/portfolio/reorder
interface ReorderRequest {
  image_orders: {
    image_id: string;
    sort_order: number;
  }[];
}

// Create featured work collection
POST /api/suppliers/[id]/portfolio/featured-work
interface CreateFeaturedWorkRequest {
  title: string;
  description?: string;
  venue_name?: string;
  wedding_date?: string;
  couple_names?: string;
  image_ids: string[];
}

// Portfolio analytics
GET /api/suppliers/[id]/portfolio/analytics?period=30d
interface PortfolioAnalyticsResponse {
  overview: {
    total_views: number;
    unique_visitors: number;
    conversion_rate: number;
    top_performing_images: string[];
  };
  trends: {
    date: string;
    views: number;
    interactions: number;
  }[];
}
```

## React Components

### Main Portfolio Manager

```typescript
'use client';

import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, Star, Eye, Edit3, Trash2, Tag } from 'lucide-react';

interface PortfolioManagerProps {
  supplierId: string;
  initialImages?: PortfolioImage[];
  initialFeaturedWork?: FeaturedWork[];
}

export function PortfolioManager({ 
  supplierId, 
  initialImages = [], 
  initialFeaturedWork = [] 
}: PortfolioManagerProps) {
  const [images, setImages] = useState<PortfolioImage[]>(initialImages);
  const [featuredWork, setFeaturedWork] = useState<FeaturedWork[]>(initialFeaturedWork);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'featured'>('grid');

  const handleFileUpload = useCallback(async (files: FileList) => {
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('files', file));

    try {
      const response = await fetch(`/api/suppliers/${supplierId}/portfolio/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const result: UploadPortfolioResponse = await response.json();
      setImages(prev => [...prev, ...result.images]);
      
      // Show success notification
      // Monitor background processing jobs
      result.processing_jobs.forEach(jobId => {
        pollProcessingStatus(jobId);
      });
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }, [supplierId]);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;

    const reorderedImages = Array.from(images);
    const [removed] = reorderedImages.splice(result.source.index, 1);
    reorderedImages.splice(result.destination.index, 0, removed);

    // Update sort orders
    const imageOrders = reorderedImages.map((image, index) => ({
      image_id: image.id,
      sort_order: index
    }));

    setImages(reorderedImages);

    // Save to backend
    try {
      await fetch(`/api/suppliers/${supplierId}/portfolio/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_orders: imageOrders })
      });
    } catch (error) {
      console.error('Failed to save order:', error);
    }
  }, [images, supplierId]);

  const toggleImageSelection = useCallback((imageId: string) => {
    setSelectedImages(prev => {
      const updated = new Set(prev);
      if (updated.has(imageId)) {
        updated.delete(imageId);
      } else {
        updated.add(imageId);
      }
      return updated;
    });
  }, []);

  const createFeaturedWork = useCallback(async (data: {
    title: string;
    description?: string;
    venue_name?: string;
    wedding_date?: string;
    couple_names?: string;
  }) => {
    if (selectedImages.size === 0) return;

    try {
      const response = await fetch(`/api/suppliers/${supplierId}/portfolio/featured-work`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          image_ids: Array.from(selectedImages)
        })
      });

      if (!response.ok) throw new Error('Failed to create featured work');

      const newFeaturedWork = await response.json();
      setFeaturedWork(prev => [...prev, newFeaturedWork]);
      setSelectedImages(new Set());
    } catch (error) {
      console.error('Failed to create featured work:', error);
    }
  }, [selectedImages, supplierId]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Portfolio Management</h2>
          <p className="text-gray-600">
            {images.length} images • {featuredWork.length} featured collections
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            onClick={() => setViewMode('grid')}
          >
            Grid View
          </Button>
          <Button
            variant={viewMode === 'featured' ? 'default' : 'outline'}
            onClick={() => setViewMode('featured')}
          >
            Featured Work
          </Button>
        </div>
      </div>

      {/* Upload Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
            onDrop={(e) => {
              e.preventDefault();
              handleFileUpload(e.dataTransfer.files);
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Drop images here or click to upload</p>
            <p className="text-gray-500 mb-4">Support for JPEG, PNG, WebP up to 10MB each</p>
            <Input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              id="portfolio-upload"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            />
            <Label htmlFor="portfolio-upload">
              <Button variant="outline" asChild>
                <span>Choose Files</span>
              </Button>
            </Label>
          </div>
        </CardContent>
      </Card>

      {viewMode === 'grid' && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="portfolio-grid">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {images.map((image, index) => (
                  <Draggable key={image.id} draggableId={image.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <PortfolioImageCard
                          image={image}
                          isSelected={selectedImages.has(image.id)}
                          onSelect={() => toggleImageSelection(image.id)}
                          isDragging={snapshot.isDragging}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {viewMode === 'featured' && (
        <div className="space-y-6">
          <FeaturedWorkManager
            featuredWork={featuredWork}
            onCreateCollection={createFeaturedWork}
            selectedImageCount={selectedImages.size}
          />
        </div>
      )}

      {selectedImages.size > 0 && (
        <div className="fixed bottom-6 right-6 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{selectedImages.size} selected</Badge>
            <Button
              size="sm"
              onClick={() => {
                // Open featured work creation modal
              }}
            >
              Create Featured Collection
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedImages(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface PortfolioImageCardProps {
  image: PortfolioImage;
  isSelected: boolean;
  onSelect: () => void;
  isDragging: boolean;
}

function PortfolioImageCard({ image, isSelected, onSelect, isDragging }: PortfolioImageCardProps) {
  return (
    <Card className={`overflow-hidden transition-all ${isDragging ? 'rotate-3 scale-105' : ''} ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="relative group">
        <img
          src={image.variants.find(v => v.variant_type === 'medium')?.url || image.original_url}
          alt={image.alt_text}
          className="w-full h-48 object-cover"
        />
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all">
          <div className="absolute top-2 right-2 flex gap-1">
            {image.is_hero && (
              <Badge className="bg-yellow-500 text-white">
                <Star className="w-3 h-3" />
              </Badge>
            )}
            {image.is_featured && (
              <Badge className="bg-blue-500 text-white">Featured</Badge>
            )}
          </div>
          
          <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={onSelect}
                className="flex-1"
              >
                {isSelected ? 'Deselect' : 'Select'}
              </Button>
              <Button size="sm" variant="secondary">
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="secondary">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <CardContent className="p-3">
        {image.caption && (
          <p className="text-sm text-gray-600 mb-2">{image.caption}</p>
        )}
        
        <div className="flex flex-wrap gap-1 mb-2">
          {image.tags?.slice(0, 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {image.view_count}
          </span>
          {image.wedding_date && (
            <span>{new Date(image.wedding_date).toLocaleDateString()}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

## Integration Services

### Image Processing Service

```typescript
// lib/services/portfolio-service.ts
import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';

interface ImageProcessingResult {
  original_url: string;
  variants: ImageVariant[];
  ai_tags: string[];
  alt_text: string;
  metadata: ImageMetadata;
}

export class PortfolioService {
  private supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

  async processPortfolioUpload(
    files: File[],
    supplierId: string,
    metadata: {
      wedding_date?: string;
      venue_name?: string;
      couple_names?: string;
    }
  ): Promise<ImageProcessingResult[]> {
    const results: ImageProcessingResult[] = [];

    for (const file of files) {
      try {
        // 1. Upload to Cloudinary with transformations
        const uploadResult = await this.uploadToCloudinary(file);
        
        // 2. AI analysis for auto-tagging
        const aiAnalysis = await this.analyzeImageContent(uploadResult.secure_url);
        
        // 3. Generate optimized variants
        const variants = await this.generateImageVariants(uploadResult);
        
        // 4. Extract EXIF metadata
        const exifData = await this.extractImageMetadata(file);
        
        // 5. Generate SEO-friendly alt text
        const altText = this.generateAltText(aiAnalysis, metadata);
        
        // 6. Save to database
        const { data: portfolioImage } = await this.supabase
          .from('portfolio_images')
          .insert({
            supplier_id: supplierId,
            original_url: uploadResult.secure_url,
            alt_text: altText,
            wedding_date: metadata.wedding_date,
            venue_name: metadata.venue_name,
            couple_names: metadata.couple_names,
          })
          .select()
          .single();

        if (portfolioImage) {
          // Save image variants
          await this.saveImageVariants(portfolioImage.id, variants);
          
          // Save AI tags
          await this.saveImageTags(portfolioImage.id, aiAnalysis.tags);
        }

        results.push({
          original_url: uploadResult.secure_url,
          variants,
          ai_tags: aiAnalysis.tags,
          alt_text: altText,
          metadata: exifData
        });

      } catch (error) {
        console.error(`Failed to process image ${file.name}:`, error);
      }
    }

    return results;
  }

  private async uploadToCloudinary(file: File) {
    return cloudinary.uploader.upload(file.path, {
      folder: 'wedding-portfolios',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
        { width: 1200, height: 800, crop: 'limit' }
      ],
      eager: [
        { width: 300, height: 200, crop: 'thumb', format: 'webp' },
        { width: 600, height: 400, crop: 'fill', format: 'webp' },
        { width: 1200, height: 800, crop: 'limit', format: 'webp' },
        { width: 300, height: 200, crop: 'thumb', format: 'jpg' },
        { width: 600, height: 400, crop: 'fill', format: 'jpg' }
      ]
    });
  }

  private async analyzeImageContent(imageUrl: string) {
    // Integration with AI service for image analysis
    // This would typically use services like Google Vision AI, AWS Rekognition, etc.
    const mockAnalysis = {
      tags: ['outdoor', 'ceremony', 'golden-hour', 'romantic'],
      venue_type: 'garden',
      style: 'documentary',
      season: 'summer',
      confidence_scores: {
        'outdoor': 0.95,
        'ceremony': 0.88,
        'golden-hour': 0.82
      }
    };

    return mockAnalysis;
  }

  private generateAltText(aiAnalysis: any, metadata: any): string {
    const components = [];
    
    if (metadata.couple_names) {
      components.push(`${metadata.couple_names} wedding`);
    } else {
      components.push('Wedding');
    }
    
    if (aiAnalysis.tags.includes('ceremony')) {
      components.push('ceremony');
    } else if (aiAnalysis.tags.includes('reception')) {
      components.push('reception');
    }
    
    if (metadata.venue_name) {
      components.push(`at ${metadata.venue_name}`);
    }
    
    if (aiAnalysis.style) {
      components.push(`- ${aiAnalysis.style} photography`);
    }

    return components.join(' ');
  }

  async reorderPortfolioImages(supplierId: string, imageOrders: { image_id: string; sort_order: number; }[]) {
    const updates = imageOrders.map(({ image_id, sort_order }) => 
      this.supabase
        .from('portfolio_images')
        .update({ sort_order })
        .eq('id', image_id)
        .eq('supplier_id', supplierId)
    );

    await Promise.all(updates);
  }

  async createFeaturedWork(supplierId: string, data: {
    title: string;
    description?: string;
    venue_name?: string;
    wedding_date?: string;
    couple_names?: string;
    image_ids: string[];
  }) {
    const { data: featuredWork } = await this.supabase
      .from('portfolio_featured_work')
      .insert({
        supplier_id: supplierId,
        title: data.title,
        description: data.description,
        venue_name: data.venue_name,
        wedding_date: data.wedding_date,
        couple_names: data.couple_names,
      })
      .select()
      .single();

    if (featuredWork) {
      const imageAssignments = data.image_ids.map((imageId, index) => ({
        featured_work_id: featuredWork.id,
        portfolio_image_id: imageId,
        sort_order: index
      }));

      await this.supabase
        .from('portfolio_featured_work_images')
        .insert(imageAssignments);
    }

    return featuredWork;
  }

  async getPortfolioAnalytics(supplierId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: analytics } = await this.supabase
      .from('portfolio_analytics')
      .select('*')
      .eq('supplier_id', supplierId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    return analytics || [];
  }
}
```

## MCP Integration

### Portfolio Database Operations

```typescript
// For MCP server integration - portfolio operations
export const portfolioMCPOperations = {
  // Get portfolio overview with performance metrics
  async getPortfolioOverview(supplierId: string) {
    return `
      SELECT 
        pi.id,
        pi.alt_text,
        pi.is_hero,
        pi.is_featured,
        pi.view_count,
        pi.wedding_date,
        pi.venue_name,
        COUNT(pita.tag_id) as tag_count,
        ARRAY_AGG(pit.name) FILTER (WHERE pit.name IS NOT NULL) as tags
      FROM portfolio_images pi
      LEFT JOIN portfolio_image_tag_assignments pita ON pi.id = pita.portfolio_image_id
      LEFT JOIN portfolio_image_tags pit ON pita.tag_id = pit.id
      WHERE pi.supplier_id = '${supplierId}'
      GROUP BY pi.id, pi.alt_text, pi.is_hero, pi.is_featured, pi.view_count, pi.wedding_date, pi.venue_name
      ORDER BY pi.sort_order, pi.created_at DESC;
    `;
  },

  // Get performance analytics for portfolio optimization
  async getPortfolioPerformance(supplierId: string) {
    return `
      WITH image_performance AS (
        SELECT 
          pi.id,
          pi.alt_text,
          pi.view_count,
          COUNT(pita.tag_id) as tag_count,
          AVG(pita.confidence_score) as avg_confidence
        FROM portfolio_images pi
        LEFT JOIN portfolio_image_tag_assignments pita ON pi.id = pita.portfolio_image_id
        WHERE pi.supplier_id = '${supplierId}'
        GROUP BY pi.id, pi.alt_text, pi.view_count
      )
      SELECT 
        ip.*,
        RANK() OVER (ORDER BY ip.view_count DESC) as performance_rank
      FROM image_performance ip
      ORDER BY ip.view_count DESC
      LIMIT 20;
    `;
  },

  // Track portfolio engagement trends
  async trackPortfolioEngagement(supplierId: string) {
    return `
      SELECT 
        pa.date,
        pa.total_views,
        pa.unique_visitors,
        pa.image_interactions,
        pa.inquiry_conversions,
        ROUND(
          CASE 
            WHEN pa.unique_visitors > 0 
            THEN (pa.inquiry_conversions::DECIMAL / pa.unique_visitors) * 100 
            ELSE 0 
          END, 2
        ) as conversion_rate
      FROM portfolio_analytics pa
      WHERE pa.supplier_id = '${supplierId}'
        AND pa.date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY pa.date;
    `;
  }
};
```

## Testing Requirements

### Unit Tests

```typescript
// __tests__/portfolio-service.test.ts
import { PortfolioService } from '@/lib/services/portfolio-service';

describe('PortfolioService', () => {
  let portfolioService: PortfolioService;

  beforeEach(() => {
    portfolioService = new PortfolioService();
  });

  test('should process uploaded images with AI tagging', async () => {
    const mockFiles = [new File([''], 'wedding.jpg', { type: 'image/jpeg' })];
    const result = await portfolioService.processPortfolioUpload(
      mockFiles,
      'supplier-123',
      { venue_name: 'Garden Venue', wedding_date: '2024-06-15' }
    );

    expect(result).toHaveLength(1);
    expect(result[0].ai_tags).toContain('outdoor');
    expect(result[0].alt_text).toContain('wedding');
  });

  test('should reorder portfolio images correctly', async () => {
    const imageOrders = [
      { image_id: 'img-1', sort_order: 2 },
      { image_id: 'img-2', sort_order: 1 },
    ];

    await expect(
      portfolioService.reorderPortfolioImages('supplier-123', imageOrders)
    ).resolves.not.toThrow();
  });

  test('should create featured work collections', async () => {
    const featuredWorkData = {
      title: 'Sunset Garden Wedding',
      description: 'Beautiful outdoor ceremony at golden hour',
      venue_name: 'Rose Garden',
      image_ids: ['img-1', 'img-2', 'img-3']
    };

    const result = await portfolioService.createFeaturedWork('supplier-123', featuredWorkData);
    expect(result.title).toBe('Sunset Garden Wedding');
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/portfolio-flow.test.ts
import { test, expect } from '@playwright/test';

test('supplier can manage portfolio end-to-end', async ({ page }) => {
  // Login as supplier
  await page.goto('/login');
  await page.fill('[name=email]', 'photographer@example.com');
  await page.fill('[name=password]', 'password123');
  await page.click('[type=submit]');

  // Navigate to portfolio management
  await page.goto('/dashboard/portfolio');
  
  // Upload images
  await page.setInputFiles('[type=file]', ['test/fixtures/wedding1.jpg', 'test/fixtures/wedding2.jpg']);
  await expect(page.locator('.upload-progress')).toBeVisible();
  await expect(page.locator('.portfolio-image')).toHaveCount(2);

  // Create featured collection
  await page.click('[data-testid=image-1]'); // Select first image
  await page.click('[data-testid=image-2]'); // Select second image
  await page.click('[data-testid=create-featured-collection]');
  
  await page.fill('[name=title]', 'Romantic Garden Wedding');
  await page.fill('[name=description]', 'Beautiful outdoor ceremony with natural lighting');
  await page.click('[data-testid=create-collection]');

  await expect(page.locator('[data-testid=featured-collection]')).toBeVisible();
  await expect(page.locator('[data-testid=collection-title]')).toHaveText('Romantic Garden Wedding');

  // Reorder images using drag and drop
  await page.dragAndDrop('[data-testid=image-2]', '[data-testid=image-1]');
  
  // Verify order changed
  const firstImage = page.locator('[data-testid=portfolio-grid] > div:first-child');
  await expect(firstImage).toHaveAttribute('data-image-id', 'image-2');
});
```

## Acceptance Criteria

### Core Functionality
- ✅ Suppliers can upload multiple images with drag-and-drop
- ✅ Images are automatically optimized for web performance
- ✅ AI-powered auto-tagging with confidence scores
- ✅ Drag-and-drop reordering with persistent state
- ✅ Featured work collections with custom titles and descriptions
- ✅ SEO-optimized alt text and structured data

### Performance Requirements
- ✅ Image uploads process in under 30 seconds for 10 images
- ✅ Portfolio pages load in under 2 seconds on 3G connection
- ✅ WebP format with JPEG fallbacks for compatibility
- ✅ Lazy loading for gallery views
- ✅ CDN distribution for global performance

### User Experience
- ✅ Intuitive drag-and-drop interface
- ✅ Real-time upload progress indicators
- ✅ Bulk selection and operations
- ✅ Mobile-responsive portfolio management
- ✅ Preview mode matching public portfolio view

### Analytics & Optimization
- ✅ View count tracking per image
- ✅ Engagement analytics dashboard
- ✅ Conversion tracking from portfolio to inquiries
- ✅ Performance recommendations based on analytics
- ✅ A/B testing for portfolio layouts

---

**Completion Status**: ✅ Ready for Development
**Estimated Development Time**: 3-4 weeks
**Dependencies**: Image processing infrastructure, AI tagging service
**Business Value**: Essential for supplier directory success - high-quality portfolios drive customer engagement and booking conversions