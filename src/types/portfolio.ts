// WS-119: Portfolio Management System Types
// Team B Batch 9 Round 2

export interface PortfolioProject {
  id: string;
  vendor_id: string;
  title: string;
  slug: string;
  description?: string;
  event_type?: string;
  event_date?: string;
  location?: string;
  client_name?: string;
  featured: boolean;
  status: 'draft' | 'published' | 'archived';
  cover_image_id?: string;
  cover_image?: PortfolioMedia;
  view_count: number;
  tags: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  published_at?: string;
  organization_id: string;
  media?: PortfolioMedia[];
  testimonials?: PortfolioTestimonial[];
}

export interface PortfolioMedia {
  id: string;
  project_id: string;
  vendor_id: string;
  media_type: 'image' | 'video' | 'panorama';
  media_url: string;
  thumbnail_url?: string;
  title?: string;
  caption?: string;
  alt_text?: string;
  file_size?: number;
  width?: number;
  height?: number;
  duration?: number;
  mime_type?: string;
  display_order: number;
  is_cover: boolean;
  tags: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  organization_id: string;
}

export interface PortfolioTestimonial {
  id: string;
  project_id?: string;
  vendor_id: string;
  client_name: string;
  client_role?: string;
  testimonial_text: string;
  rating?: number;
  avatar_url?: string;
  event_date?: string;
  featured: boolean;
  verified: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  organization_id: string;
}

export interface PortfolioGalleryLayout {
  id: string;
  vendor_id: string;
  name: string;
  layout_type: 'grid' | 'masonry' | 'carousel' | 'slideshow' | 'timeline';
  configuration: {
    columns?: number;
    gap?: number;
    aspectRatio?: string;
    autoplay?: boolean;
    autoplayInterval?: number;
    showThumbnails?: boolean;
    showCaptions?: boolean;
    enableZoom?: boolean;
    enableFullscreen?: boolean;
    [key: string]: any;
  };
  is_default: boolean;
  created_at: string;
  updated_at: string;
  organization_id: string;
}

export interface PortfolioCollection {
  id: string;
  vendor_id: string;
  name: string;
  slug: string;
  description?: string;
  cover_image_url?: string;
  display_order: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  organization_id: string;
  projects?: PortfolioProject[];
}

export interface PortfolioSettings {
  id: string;
  vendor_id: string;
  watermark_enabled: boolean;
  watermark_text?: string;
  watermark_logo_url?: string;
  watermark_position?:
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'center';
  watermark_opacity: number;
  download_enabled: boolean;
  right_click_disabled: boolean;
  social_sharing_enabled: boolean;
  lazy_loading_enabled: boolean;
  image_optimization_enabled: boolean;
  max_upload_size_mb: number;
  allowed_file_types: string[];
  cdn_enabled: boolean;
  cdn_url?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  organization_id: string;
}

export interface PortfolioAnalytics {
  id: string;
  vendor_id: string;
  project_id?: string;
  media_id?: string;
  event_type: 'view' | 'click' | 'share' | 'download';
  visitor_id?: string;
  referrer?: string;
  user_agent?: string;
  ip_hash?: string;
  metadata: Record<string, any>;
  created_at: string;
  organization_id: string;
}

export interface PortfolioStats {
  total_projects: number;
  total_media: number;
  total_views: number;
  total_testimonials: number;
  avg_rating?: number;
}

export interface MediaUploadOptions {
  file: File;
  project_id?: string;
  vendor_id: string;
  title?: string;
  caption?: string;
  alt_text?: string;
  tags?: string[];
  is_cover?: boolean;
  onProgress?: (progress: number) => void;
}

export interface PortfolioFilters {
  event_type?: string;
  tags?: string[];
  date_range?: {
    start: string;
    end: string;
  };
  featured_only?: boolean;
  status?: 'draft' | 'published' | 'archived';
}

export interface GalleryViewOptions {
  layout: 'grid' | 'masonry' | 'carousel' | 'slideshow' | 'timeline';
  columns?: number;
  spacing?: number;
  showCaptions?: boolean;
  enableLightbox?: boolean;
  enableSharing?: boolean;
  lazyLoad?: boolean;
}

// ========================================
// WS-186: Portfolio Image Management Types
// Team B Round 1 - Backend Infrastructure
// ========================================

export type PortfolioImageStatus =
  | 'active'
  | 'processing'
  | 'failed'
  | 'archived'
  | 'deleted';
export type ProcessingStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';
export type ImageCategory =
  | 'ceremony'
  | 'reception'
  | 'portraits'
  | 'details'
  | 'venue';
export type WatermarkPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center';
export type ColorTemperature = 'warm' | 'cool' | 'neutral';
export type PhotographyStyle =
  | 'traditional'
  | 'photojournalistic'
  | 'artistic'
  | 'vintage'
  | 'contemporary'
  | 'dramatic'
  | 'romantic'
  | 'candid'
  | 'posed';

// Database Entity Types for Image Processing
export interface PortfolioImage {
  id: string;
  supplier_id: string;
  upload_job_id?: string;
  original_filename: string;
  title?: string;
  description?: string;
  file_path: string;
  thumbnail_path?: string;
  medium_path?: string;
  large_path?: string;
  category: ImageCategory;
  tags: string[];
  featured: boolean;
  display_order: number;
  views_count: number;
  likes_count: number;
  status: PortfolioImageStatus;
  processing_status: ProcessingStatus;
  ai_analysis_complete: boolean;
  ai_analysis?: AIAnalysisData;
  ai_analysis_error?: string;
  ai_generated_alt_text?: string;
  aesthetic_score?: number;
  metadata: ImageMetadata;
  created_at: string;
  updated_at: string;
}

export interface PortfolioUploadJob {
  id: string;
  supplier_id: string;
  user_id: string;
  category: ImageCategory;
  status:
    | 'preparing'
    | 'ready'
    | 'uploading'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'cancelled';
  total_files: number;
  processed_files: number;
  failed_files: number;
  upload_urls?: Array<{
    index: number;
    fileName: string;
    originalName: string;
  }>;
  metadata: UploadJobMetadata;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface PortfolioActivityLog {
  id: string;
  supplier_id: string;
  user_id: string;
  action: string;
  resource_id?: string;
  details: Record<string, any>;
  created_at: string;
}

export interface PortfolioAIAnalysis {
  id: string;
  image_id: string;
  scene_primary: string;
  scene_confidence: number;
  scene_secondary: string[];
  aesthetic_score: number;
  style: PhotographyStyle;
  style_confidence: number;
  style_characteristics: string[];
  objects_detected: ObjectDetection[];
  dominant_colors: DominantColor[];
  color_mood: string;
  color_temperature: ColorTemperature;
  alt_text: string;
  description: string;
  tags: string[];
  processing_time_ms: number;
  model_used: string;
  overall_confidence: number;
  analysis_version: string;
  created_at: string;
}

// API Request/Response Types for WS-186
export interface UploadRequestData {
  supplier_id: string;
  category: ImageCategory;
  files: Array<{
    name: string;
    size: number;
    type: string;
  }>;
  metadata?: UploadJobMetadata;
}

export interface UploadResponse {
  success: boolean;
  jobId: string;
  uploadUrls: Array<{
    index: number;
    uploadUrl: string;
    fileName: string;
  }>;
  status: string;
  totalFiles: number;
  expiresIn: number;
}

export interface PortfolioQueryParams {
  page?: number;
  limit?: number;
  category?: ImageCategory;
  featured?: boolean;
  tags?: string;
  search?: string;
  sortBy?: 'created_at' | 'views' | 'likes' | 'ai_score' | 'title';
  sortOrder?: 'asc' | 'desc';
  status?: PortfolioImageStatus;
  cursor?: string;
  include_analytics?: boolean;
}

export interface PortfolioResponse {
  images: PortfolioImageView[];
  pagination: PaginationInfo;
  summary: PortfolioSummary;
  supplier: SupplierInfo;
  query: PortfolioQueryParams;
}

export interface ImageUpdateData {
  title?: string;
  description?: string;
  tags?: string[];
  featured?: boolean;
  category?: ImageCategory;
  alt_text?: string;
  display_order?: number;
  watermark_position?: WatermarkPosition;
}

export interface BatchOperationData {
  operation:
    | 'delete'
    | 'archive'
    | 'feature'
    | 'unfeature'
    | 'update_category'
    | 'reorder';
  image_ids: string[];
  data?: Record<string, any>;
}

// View/Display Types for WS-186
export interface PortfolioImageView {
  id: string;
  title?: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  category: ImageCategory;
  tags: string[];
  featured: boolean;
  displayOrder: number;
  viewsCount: number;
  likesCount: number;
  aiAnalysis?: AIAnalysisData;
  processingStatus: ProcessingStatus;
  createdAt: string;
  updatedAt: string;
  metadata: ImageMetadata;
  analytics?: PortfolioImageAnalytics;
}

export interface PortfolioSummary {
  totalImages: number;
  featuredImages: number;
  processedImages: number;
  categoryCounts: Record<ImageCategory, number>;
}

export interface SupplierInfo {
  id: string;
  businessName: string;
  category: string;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
}

// Metadata Types for Image Processing
export interface ImageMetadata {
  originalSize: number;
  optimizedSize: number;
  optimizationRatio: number;
  processingTime: number;
  dimensions: {
    width: number;
    height: number;
  };
  format: string;
  exif?: ExifMetadata;
  versions: {
    thumbnail: ImageVersionInfo;
    medium: ImageVersionInfo;
    large: ImageVersionInfo;
    original: ImageVersionInfo;
  };
}

export interface ImageVersionInfo {
  width: number;
  height: number;
  size: number;
}

export interface UploadJobMetadata {
  event_name?: string;
  event_date?: string;
  venue_name?: string;
  couple_names?: string;
  description?: string;
  tags?: string[];
  enable_ai_processing?: boolean;
  watermark_enabled?: boolean;
}

export interface ExifMetadata {
  camera?: {
    make?: string;
    model?: string;
    lens?: string;
  };
  settings?: {
    iso?: number;
    aperture?: string;
    shutterSpeed?: string;
    focalLength?: string;
  };
  timestamp?: string;
  locationFiltered: boolean;
}

// AI Analysis Types for WS-186
export interface AIAnalysisData {
  sceneDetection: {
    primary: string;
    confidence: number;
    secondary?: string[];
  };
  aestheticScore: number;
  styleClassification: {
    style: PhotographyStyle;
    confidence: number;
    characteristics: string[];
  };
  objectDetection: ObjectDetection[];
  colorAnalysis: {
    dominantColors: DominantColor[];
    mood: string;
    temperature: ColorTemperature;
  };
  accessibility: {
    altText: string;
    description: string;
  };
  tags: string[];
  metadata: {
    processingTime: number;
    model: string;
    confidence: number;
  };
}

export interface ObjectDetection {
  object: string;
  confidence: number;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DominantColor {
  hex: string;
  percentage: number;
}

// Enhanced Analytics Types for WS-186
export interface PortfolioImageAnalytics {
  views: AnalyticsMetric[];
  likes: AnalyticsMetric[];
  shares: AnalyticsMetric[];
  downloads: AnalyticsMetric[];
}

export interface AnalyticsMetric {
  date: string;
  count: number;
  source?: string;
}

export interface PortfolioPerformanceStats {
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  averageAestheticScore: number;
  topPerformingImages: PortfolioImageView[];
  categoryPerformance: Record<ImageCategory, CategoryPerformance>;
  timeRange: {
    start: string;
    end: string;
  };
}

export interface CategoryPerformance {
  imageCount: number;
  totalViews: number;
  averageViews: number;
  averageAestheticScore: number;
  topTags: Array<{
    tag: string;
    count: number;
  }>;
}

// Processing Queue Types
export interface ProcessingQueueItem {
  id: string;
  type: 'image_processing' | 'ai_analysis' | 'optimization';
  priority: number;
  data: any;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  processedAt?: string;
  error?: string;
}

// Rate Limiting Types
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

// Error Types for WS-186
export interface PortfolioError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface ProcessingError extends PortfolioError {
  imageId: string;
  supplierId: string;
  processingStage: string;
}

export interface AIAnalysisError extends PortfolioError {
  imageId: string;
  supplierId: string;
  model: string;
  retryable: boolean;
}

// Configuration Types for WS-186
export interface PortfolioConfig {
  maxFileSize: number;
  maxFilesPerUpload: number;
  supportedFormats: string[];
  imageVersions: {
    thumbnail: { width: number; height: number; quality: number };
    medium: { width: number; height: number; quality: number };
    large: { width: number; height: number; quality: number };
    original: { quality: number };
  };
  aiAnalysis: {
    enabled: boolean;
    provider: string;
    model: string;
    retryAttempts: number;
  };
  watermark: {
    enabled: boolean;
    defaultPosition: WatermarkPosition;
    opacity: number;
  };
}

// Search and Filter Types for WS-186
export interface PortfolioSearchFilters {
  categories?: ImageCategory[];
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  aestheticScoreRange?: {
    min: number;
    max: number;
  };
  featured?: boolean;
  hasAIAnalysis?: boolean;
  processingStatus?: ProcessingStatus[];
}

// Utility Types for WS-186
export type PartialPortfolioImage = Partial<PortfolioImage>;
export type CreatePortfolioImageData = Omit<
  PortfolioImage,
  'id' | 'created_at' | 'updated_at'
>;
export type UpdatePortfolioImageData = Partial<
  Pick<
    PortfolioImage,
    'title' | 'description' | 'tags' | 'featured' | 'category' | 'display_order'
  >
>;
