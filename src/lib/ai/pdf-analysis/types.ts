/**
 * WS-242: AI PDF Analysis System - Core Types
 * Team D: AI/ML Engineering & Optimization
 *
 * Comprehensive type definitions for wedding industry PDF field extraction
 */

// Core field extraction types
export interface ExtractedField {
  id: string;
  label_text: string;
  field_position: FieldPosition;
  field_type: WeddingFieldType;
  wedding_category: WeddingCategory;
  confidence: number;
  validation_rules?: ValidationRule[];
  visual_features?: VisualFeatures;
  extracted_value?: string;
  suggestions?: string[];
}

export interface FieldPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  page_number: number;
}

export interface LabelFieldPair {
  label_text: string;
  field_position: FieldPosition;
  layout_section: string;
  context_words: string[];
}

export interface ClassifiedField {
  id: string;
  label_text: string;
  field_position: FieldPosition;
  wedding_category: WeddingCategory;
  wedding_field_type: WeddingFieldType;
  confidence: number;
  raw_features: Record<string, any>;
}

// Wedding industry specific categories
export type WeddingCategory =
  | 'wedding_details'
  | 'guest_management'
  | 'vendor_services'
  | 'timeline_planning'
  | 'budget_financial'
  | 'legal_contractual'
  | 'personal_information'
  | 'preferences_styling'
  | 'logistics';

export type WeddingFieldType =
  | 'wedding_date'
  | 'ceremony_time'
  | 'reception_time'
  | 'venue_name'
  | 'wedding_style'
  | 'guest_count'
  | 'guest_list'
  | 'dietary_restrictions'
  | 'seating_arrangements'
  | 'photography_package'
  | 'catering_menu'
  | 'floral_arrangement'
  | 'music_entertainment'
  | 'ceremony_duration'
  | 'cocktail_hour'
  | 'reception_timeline'
  | 'vendor_arrival_times'
  | 'total_budget'
  | 'deposit_amount'
  | 'payment_schedule'
  | 'invoice_details'
  | 'terms_conditions'
  | 'cancellation_policy'
  | 'liability_clauses'
  | 'signatures'
  | 'couple_names'
  | 'contact_info'
  | 'emergency_contacts'
  | 'special_requests'
  | 'color_scheme'
  | 'decoration_style'
  | 'theme_preferences'
  | 'special_traditions'
  | 'transportation'
  | 'accommodation'
  | 'parking_info'
  | 'accessibility_needs'
  | 'general_field';

// Classification and analysis types
export interface ClassificationResult {
  category: WeddingCategory;
  field_type: WeddingFieldType;
  confidence: number;
}

export interface VisualFeatures {
  has_checkbox: boolean;
  has_text_input: boolean;
  has_dropdown: boolean;
  has_date_picker: boolean;
  has_signature_line: boolean;
  field_width: number;
  field_height: number;
  visual_indicators: Record<string, number>;
}

export interface ValidationRule {
  type: string;
  format?: string;
  min?: number;
  max?: number;
  currency?: string;
  country?: string;
  allow_past?: boolean;
  weight?: number;
}

export interface WeddingValidation {
  suggested_type: string;
  validation_rules: ValidationRule[];
  confidence: number;
}

// Field type detection types
export interface FieldTypeResult {
  field_type: WeddingFieldType;
  confidence: number;
  visual_analysis: VisualFeatures;
  text_analysis: TextPatternAnalysis;
  wedding_validation: WeddingValidation;
}

export interface TextPatternAnalysis {
  detected_patterns: string[];
  pattern_confidence: Record<string, number>;
  suggested_formats: string[];
}

// Processing and optimization types
export interface AnalysisRequest {
  pdf_id: string;
  user_id: string;
  user_tier: string;
  urgency_level: 'low' | 'normal' | 'high' | 'urgent';
  pages: PageAnalysisRequest[];
  processing_options?: ProcessingOptions;
}

export interface PageAnalysisRequest {
  page_number: number;
  image_data: string; // Base64 encoded
  image_format: string;
  dpi?: number;
}

export interface ProcessingOptions {
  accuracy_level: 'fast' | 'balanced' | 'accurate';
  cost_optimization: boolean;
  batch_processing: boolean;
  wedding_season_mode: boolean;
}

export interface ProcessingResult {
  request_id: string;
  extracted_fields: ExtractedField[];
  processing_time: number;
  accuracy_score: number;
  cost_incurred: number;
  confidence_distribution: Record<string, number>;
  suggestions: ProcessingSuggestion[];
}

export interface ProcessingSuggestion {
  type: 'field_type_suggestion' | 'validation_warning' | 'accuracy_improvement';
  message: string;
  field_id?: string;
  confidence: number;
}

// Cost optimization types
export interface ProcessingStrategy {
  model_choice: string;
  use_batch_processing: boolean;
  preprocessing_level: 'minimal' | 'standard' | 'enhanced';
  expected_accuracy: number;
  estimated_cost: number;
}

export interface OptimizedImage {
  image: string; // Base64 encoded optimized image
  original_size: [number, number, number];
  optimized_size: [number, number, number];
  optimizations_applied: string[];
  estimated_cost_reduction: number;
}

// Continuous learning types
export interface UserCorrection {
  correction_id: string;
  field_id: string;
  original_prediction: ExtractedField;
  corrected_result: ExtractedField;
  user_confidence: number;
  correction_timestamp: Date;
  user_id: string;
}

export interface UserFeedback {
  feedback_id: string;
  correction_type:
    | 'field_type_correction'
    | 'field_boundary_correction'
    | 'validation_correction';
  visual_features: VisualFeatures;
  text_features: TextPatternAnalysis;
  context_features: Record<string, any>;
  corrected_value: any;
  original_value: any;
  wedding_context: {
    category: WeddingCategory;
    field_type: WeddingFieldType;
  };
  user_confidence: number;
  image_region?: string; // Base64 encoded image patch
  corrected_boundaries?: FieldPosition;
  original_boundaries?: FieldPosition;
  field_context?: Record<string, any>;
}

export interface LearningUpdate {
  corrections_processed: number;
  model_updates_applied: number;
  performance_improvement: PerformanceMetrics;
  next_training_scheduled: Date;
}

export interface TrainingDataset {
  examples: TrainingExample[];
  quality_score: number;
  wedding_coverage: Record<WeddingCategory, number>;
}

export interface TrainingExample {
  input_features: Record<string, any>;
  correct_output: any;
  original_prediction?: any;
  confidence_delta?: number;
  image_features?: Record<string, any>;
  text_features?: Record<string, any>;
  context_features?: Record<string, any>;
  correct_field_type?: WeddingFieldType;
  wedding_category?: WeddingCategory;
  user_confidence?: number;
  image_patch?: string;
  correct_boundaries?: FieldPosition;
  original_boundaries?: FieldPosition;
  field_context?: Record<string, any>;
}

// Performance monitoring types
export interface PerformanceMetrics {
  accuracy_score: number;
  processing_speed: number;
  cost_efficiency: number;
  user_satisfaction: number;
  model_confidence: number;
  field_type_accuracy: Record<WeddingFieldType, number>;
  category_accuracy: Record<WeddingCategory, number>;
}

export interface OptimizationResult {
  optimizations_applied: number;
  performance_improvement: PerformanceMetrics;
  cost_reduction: number;
  deployment_status: string;
}

// Layout and visual analysis types
export interface LayoutRegion {
  region_id: string;
  region_type:
    | 'header'
    | 'footer'
    | 'form_section'
    | 'signature_area'
    | 'terms'
    | 'content';
  bounds: FieldPosition;
  confidence: number;
  elements: LayoutElement[];
}

export interface LayoutElement {
  element_id: string;
  element_type:
    | 'text'
    | 'field'
    | 'checkbox'
    | 'signature_line'
    | 'table'
    | 'image';
  bounds: FieldPosition;
  content?: string;
  confidence: number;
}

export interface ContentArea {
  bounds: FieldPosition;
  coverage: number; // Percentage of page covered by content
  whitespace_regions: FieldPosition[];
}

// Wedding season optimization types
export interface SeasonalData {
  most_common_fields: WeddingFieldType[];
  peak_processing_times: string[];
  cost_optimization_opportunities: string[];
  accuracy_trends: Record<WeddingFieldType, number[]>;
}

// API and integration types
export interface AIModelConfig {
  model_name: string;
  version: string;
  endpoint: string;
  api_key?: string;
  max_requests_per_minute: number;
  cost_per_request: number;
  accuracy_benchmark: number;
}

export interface ModelDeployment {
  deployment_id: string;
  model_config: AIModelConfig;
  status: 'pending' | 'active' | 'deprecated';
  deployment_date: Date;
  performance_metrics: PerformanceMetrics;
}

// Error handling types
export interface AIProcessingError {
  error_id: string;
  error_type:
    | 'model_error'
    | 'processing_error'
    | 'validation_error'
    | 'cost_limit_error';
  message: string;
  field_id?: string;
  page_number?: number;
  timestamp: Date;
  recovery_suggestions?: string[];
}

export interface ProcessingStatus {
  request_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress_percentage: number;
  estimated_completion: Date;
  current_stage: string;
  errors: AIProcessingError[];
}
