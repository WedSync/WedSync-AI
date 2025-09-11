/**
 * WS-187: App Store System TypeScript Interfaces
 * Comprehensive types for asset generation, store submission, and analytics
 */

// ============================================================================
// CORE APP STORE ENTITIES
// ============================================================================

export interface AppStoreAsset {
  id: string;
  organization_id: string;
  asset_type: 'screenshot' | 'icon' | 'video' | 'metadata';
  platform: 'apple' | 'google_play' | 'microsoft' | 'web';
  version_number: string;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  dimensions: {
    width: number;
    height: number;
  } | null;
  localization: string;
  generated_at: string;
  status: 'pending' | 'processing' | 'ready' | 'failed' | 'archived';
  metadata: Record<string, any>;
  processing_config: Record<string, any> | null;
  quality_score: number | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssetGenerationJob {
  id: string;
  organization_id: string;
  job_type:
    | 'screenshot_generation'
    | 'icon_optimization'
    | 'metadata_update'
    | 'bulk_processing';
  platform: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress_percentage: number;
  total_assets: number;
  processed_assets: number;
  failed_assets: number;
  job_config: AssetJobConfig;
  error_log: Array<{
    timestamp: string;
    message: string;
    details?: any;
  }> | null;
  processing_time_ms: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface StoreSubmission {
  id: string;
  organization_id: string;
  platform: 'apple' | 'google_play' | 'microsoft';
  submission_type: 'initial' | 'update' | 'metadata_only';
  version_number: string;
  status:
    | 'draft'
    | 'submitted'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'published';
  submission_date: string | null;
  review_date: string | null;
  publication_date: string | null;
  store_id: string | null;
  asset_ids: string[];
  submission_notes: string | null;
  reviewer_feedback: Record<string, any> | null;
  compliance_status: Record<string, any> | null;
  automated_checks: Record<string, any> | null;
  rejection_reasons: string[] | null;
  estimated_review_time: number | null;
  priority_level: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ASSET GENERATION TYPES
// ============================================================================

export interface AssetJobConfig {
  asset_types: Array<'screenshots' | 'icons' | 'metadata'>;
  device_presets: string[];
  optimization_level: 'standard' | 'aggressive';
  branding?: {
    primary_color: string;
    secondary_color?: string;
    logo_url?: string;
  };
  quality_settings?: {
    screenshot_quality: number;
    icon_quality: number;
    compression_type: 'lossless' | 'optimized';
  };
}

export interface DevicePreset {
  name: string;
  width: number;
  height: number;
  device_type: 'mobile' | 'tablet';
  platform: 'apple' | 'google_play' | 'microsoft';
  scale_factor: number;
}

export interface GeneratedAsset {
  type: 'screenshot' | 'icon' | 'metadata';
  device_preset?: string;
  file_path: string;
  file_size: number;
  dimensions: { width: number; height: number };
  quality_score: number;
  metadata?: Record<string, any>;
}

export interface AssetOptimizationSettings {
  quality: number;
  format: 'png' | 'webp' | 'jpg';
  compression: 'lossless' | 'optimized';
  progressive?: boolean;
  palette?: boolean;
}

// ============================================================================
// STORE SUBMISSION TYPES
// ============================================================================

export interface StoreSubmissionRequest {
  platform: 'apple' | 'google_play' | 'microsoft';
  submission_type: 'initial' | 'update' | 'metadata_only';
  version_number: string;
  asset_ids: string[];
  submission_notes?: string;
  release_type: 'manual' | 'automatic';
  phased_release: boolean;
  metadata: AppStoreMetadata;
  pricing?: PricingConfiguration;
  credentials_id: string;
}

export interface AppStoreMetadata {
  app_title: string;
  app_subtitle?: string;
  app_description: string;
  keywords: string[];
  category: string;
  content_rating: string;
  privacy_policy_url: string;
  support_url: string;
  promotional_text?: string;
  release_notes?: string;
  // Apple-specific
  marketing_url?: string;
  // Google Play-specific
  short_description?: string;
  full_description?: string;
  graphic_image_url?: string;
  promo_video_url?: string;
}

export interface PricingConfiguration {
  price_tier: string;
  markets?: string[];
  availability_date?: string;
  free_trial?: {
    duration_days: number;
    trial_type: 'full' | 'limited';
  };
}

export interface StoreSubmissionResult {
  store_reference_id: string;
  estimated_review_hours: number;
  console_url?: string;
  validation_results: ValidationResults;
}

export interface ValidationResults {
  metadata_validated: boolean;
  assets_validated: boolean;
  binary_validated: boolean;
  policy_checks_passed?: boolean;
  technical_requirements_met?: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface AppStoreMetrics {
  id: string;
  organization_id: string;
  platform: string;
  metric_date: string;
  metric_type: 'downloads' | 'revenue' | 'rankings' | 'reviews' | 'conversions';
  total_downloads: number;
  new_downloads: number;
  update_downloads: number;
  gross_revenue: number;
  net_revenue: number;
  refunds: number;
  average_rating: number | null;
  rating_count: number;
  search_ranking: number | null;
  category_ranking: number | null;
  conversion_rate: number | null;
  bounce_rate: number | null;
  session_duration: number | null;
  retention_rates: {
    day1?: number;
    day7?: number;
    day30?: number;
  } | null;
  geographical_data: Record<string, any> | null;
  created_at: string;
}

export interface KeywordPerformance {
  id: string;
  organization_id: string;
  platform: string;
  keyword: string;
  search_volume: number | null;
  ranking_position: number | null;
  click_through_rate: number | null;
  conversion_rate: number | null;
  competition_level: 'low' | 'medium' | 'high' | null;
  cost_per_click: number | null;
  difficulty_score: number | null;
  trending_direction: 'up' | 'down' | 'stable' | null;
  related_keywords: string[] | null;
  last_updated: string;
  created_at: string;
}

export interface CompetitorAnalysis {
  id: string;
  organization_id: string;
  competitor_name: string;
  competitor_app_id: string | null;
  platform: string;
  analysis_date: string;
  market_position: number | null;
  download_estimates: {
    daily?: number;
    monthly?: number;
    yearly?: number;
  } | null;
  revenue_estimates: {
    daily?: number;
    monthly?: number;
    yearly?: number;
  } | null;
  rating_analysis: {
    average?: number;
    count?: number;
    recent_trend?: 'up' | 'down' | 'stable';
  } | null;
  feature_comparison: Record<string, any> | null;
  pricing_analysis: Record<string, any> | null;
  marketing_keywords: string[] | null;
  asset_analysis: Record<string, any> | null;
  user_acquisition_channels: Record<string, any> | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  opportunities: string[] | null;
  threats: string[] | null;
  created_at: string;
}

export interface UserAcquisitionFunnel {
  id: string;
  organization_id: string;
  platform: string;
  funnel_date: string;
  traffic_source: string;
  campaign_id: string | null;
  stage:
    | 'impression'
    | 'click'
    | 'store_visit'
    | 'download'
    | 'install'
    | 'registration'
    | 'first_use'
    | 'retention';
  user_count: number;
  conversion_rate: number | null;
  cost_per_acquisition: number | null;
  lifetime_value: number | null;
  cohort_group: string | null;
  user_attributes: Record<string, any> | null;
  device_info: Record<string, any> | null;
  created_at: string;
}

// ============================================================================
// OPTIMIZATION AND COMPLIANCE TYPES
// ============================================================================

export interface MetadataVersion {
  id: string;
  organization_id: string;
  platform: string;
  version_number: string;
  version_type: 'standard' | 'a_b_test' | 'seasonal' | 'localized';
  app_title: string | null;
  app_subtitle: string | null;
  app_description: string | null;
  keywords: string[] | null;
  promotional_text: string | null;
  release_notes: string | null;
  localization: string;
  a_b_test_group: string | null;
  test_parameters: Record<string, any> | null;
  performance_metrics: Record<string, any> | null;
  is_active: boolean;
  is_approved: boolean;
  activation_date: string | null;
  deactivation_date: string | null;
  created_by: string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceCheck {
  id: string;
  organization_id: string;
  check_type: 'automated' | 'manual' | 'policy_review' | 'security_scan';
  platform: string;
  target_id: string | null;
  target_type: 'asset' | 'submission' | 'metadata';
  policy_category: string;
  check_status: 'pending' | 'passed' | 'failed' | 'warning' | 'manual_review';
  severity_level: 'low' | 'medium' | 'high' | 'critical' | null;
  check_results: Record<string, any>;
  violations: Record<string, any> | null;
  recommendations: string[] | null;
  auto_fixable: boolean;
  fix_applied: boolean;
  reviewer_notes: string | null;
  check_date: string;
  resolved_date: string | null;
  created_by: string;
  created_at: string;
}

export interface PerformanceBenchmark {
  id: string;
  organization_id: string;
  benchmark_type:
    | 'download_rate'
    | 'conversion_rate'
    | 'rating_score'
    | 'revenue_target'
    | 'retention_rate';
  platform: string;
  category: string | null;
  target_value: number;
  current_value: number | null;
  baseline_value: number | null;
  measurement_period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  benchmark_date: string;
  performance_status:
    | 'above_target'
    | 'on_target'
    | 'below_target'
    | 'critical'
    | null;
  improvement_percentage: number | null;
  industry_percentile: number | null;
  optimization_actions: Record<string, any> | null;
  next_review_date: string | null;
  alert_threshold: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AssetGenerationResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  estimated_completion_minutes: number;
  progress_url: string;
  webhook_url: string;
}

export interface SubmissionStatusResponse {
  submission_id: string;
  status: string;
  store_status: string | null;
  submitted_at: string | null;
  last_status_update: string;
  review_notes: string[];
  rejection_reasons: string[];
  estimated_completion: string | null;
}

export interface AnalyticsQueryParams {
  metric_type?:
    | 'downloads'
    | 'revenue'
    | 'rankings'
    | 'reviews'
    | 'conversions'
    | 'keywords'
    | 'competitors';
  platform?: 'apple' | 'google_play' | 'microsoft';
  date_range?: {
    start_date: string;
    end_date: string;
  };
  granularity?: 'daily' | 'weekly' | 'monthly';
  group_by?: Array<'platform' | 'metric_type' | 'date'>;
  limit?: number;
}

export interface AnalyticsEventData {
  event_type:
    | 'store_view'
    | 'download_start'
    | 'download_complete'
    | 'install_complete'
    | 'first_launch'
    | 'registration';
  platform: 'apple' | 'google_play' | 'microsoft';
  user_attributes?: {
    country?: string;
    device_type?: string;
    os_version?: string;
    referrer?: string;
    campaign_id?: string;
  };
  timestamp?: string;
  session_id?: string;
  user_id?: string;
}

// ============================================================================
// STORE PLATFORM SPECIFIC TYPES
// ============================================================================

export interface AppleStoreCredentials {
  api_key_id: string;
  api_key: string; // Base64 encoded private key
  issuer_id: string;
  vendor_number?: string;
}

export interface GooglePlayCredentials {
  service_account_json: string; // JSON string
  package_name: string;
}

export interface MicrosoftStoreCredentials {
  tenant_id: string;
  client_id: string;
  client_secret: string;
  partner_center_account_id: string;
}

export interface StoreCredentials {
  id: string;
  user_id: string;
  store: 'apple' | 'google_play' | 'microsoft';
  credentials_encrypted: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface AppStoreError extends Error {
  code:
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'VALIDATION_ERROR'
    | 'STORE_API_ERROR'
    | 'GENERATION_ERROR'
    | 'SUBMISSION_ERROR'
    | 'ANALYTICS_ERROR';
  details?: any;
  timestamp?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface AppStoreConfig {
  platforms: {
    apple: {
      enabled: boolean;
      review_time_hours: number;
      max_screenshots: number;
      required_icon_sizes: number[];
    };
    google_play: {
      enabled: boolean;
      review_time_hours: number;
      max_screenshots: number;
      required_icon_sizes: number[];
    };
    microsoft: {
      enabled: boolean;
      review_time_hours: number;
      max_screenshots: number;
      required_icon_sizes: number[];
    };
  };
  asset_generation: {
    max_concurrent_jobs: number;
    default_quality: number;
    supported_formats: string[];
    max_file_size_mb: number;
  };
  analytics: {
    retention_days: number;
    aggregation_intervals: string[];
    benchmark_update_frequency: string;
  };
}

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

export interface AppStoreWebhookPayload {
  event_type:
    | 'asset_generation_completed'
    | 'asset_generation_failed'
    | 'submission_status_changed'
    | 'review_completed';
  timestamp: string;
  data: {
    submission_id?: string;
    job_id?: string;
    organization_id: string;
    platform: string;
    status: string;
    details: Record<string, any>;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type AssetType = 'screenshot' | 'icon' | 'video' | 'metadata';
export type Platform = 'apple' | 'google_play' | 'microsoft' | 'web';
export type SubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'published';
export type JobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';
export type OptimizationLevel = 'standard' | 'aggressive';
export type DeviceType = 'mobile' | 'tablet';
export type CompressionType = 'lossless' | 'optimized';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// All types are exported inline above, no need for duplicate export declarations
