/**
 * AI Journey Suggestions Components
 * WS-208: Complete AI journey generation system
 */

export { JourneySuggestionsPanel } from './JourneySuggestionsPanel';
export { VendorSpecificControls } from './VendorSpecificControls';
export { GeneratedJourneyPreview } from './GeneratedJourneyPreview';
export { PerformancePredictionDisplay } from './PerformancePredictionDisplay';
export { OptimizationSuggestions } from './OptimizationSuggestions';

/**
 * AI Content Personalization Components
 * WS-209: AI Content Personalization Engine
 */

export { default as PersonalizationPreview } from './PersonalizationPreview';
export { default as PersonalizationControls } from './PersonalizationControls';
export { EmailPersonalizationPanel } from './EmailPersonalizationPanel';
export { EmailTemplateGenerator } from './EmailTemplateGenerator';
export { TemplateVariantSelector } from './TemplateVariantSelector';

/**
 * AI Knowledge Base Components
 * WS-210: AI Knowledge Base System
 */

export { default as KnowledgeBasePanel } from './KnowledgeBasePanel';
export { default as SmartSearch } from './SmartSearch';
export { default as ContentSuggestions } from './ContentSuggestions';
export { default as KnowledgeEditor } from './KnowledgeEditor';

// Export types for convenience
export type {
  JourneySuggestionsPanelProps,
  VendorSpecificControlsProps,
  GeneratedJourneyPreviewProps,
  PerformancePredictionDisplayProps,
  OptimizationSuggestionsProps,
  JourneySuggestionRequest,
  GeneratedJourney,
  JourneyNode,
  PerformanceMetrics,
  OptimizationSuggestion,
  VendorType,
  ServiceLevel,
} from '@/types/journey-ai';

export type {
  KnowledgeArticle,
  SearchConfig,
  SearchResult,
  ContentSuggestion,
  AutocompleteSuggestion,
  KnowledgeBaseAnalytics,
  AIRecommendation,
  SmartSearchProps,
  KnowledgeBasePanelProps,
  ContentSuggestionsProps,
  KnowledgeEditorProps,
  EditorConfig,
  CreateArticleRequest,
  UpdateArticleRequest,
} from '@/types/knowledge-base';
