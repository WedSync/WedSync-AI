/**
 * TypeScript types for AI Journey Suggestions System
 * WS-208: AI Journey Suggestions with vendor-specific controls
 */

// Core vendor types and service levels
export type VendorType =
  | 'photographer'
  | 'caterer'
  | 'dj'
  | 'venue'
  | 'planner';
export type ServiceLevel = 'basic' | 'premium' | 'luxury';
export type CommunicationStyle = 'professional' | 'friendly' | 'casual';
export type CommunicationFrequency = 'minimal' | 'regular' | 'frequent';

// Vendor configuration with wedding-specific metadata
export interface VendorTypeConfig {
  icon: string;
  label: string;
  description: string;
  commonTimelines: number[]; // months before wedding
  serviceDescriptions: Record<ServiceLevel, string>;
  typicalTouchpoints: string[];
  industryBenchmarks: {
    completionRate: number;
    engagementScore: number;
    averageResponseTime: number; // hours
  };
}

// Client preferences for journey generation
export interface ClientPreferences {
  communicationStyle: CommunicationStyle;
  frequency: CommunicationFrequency;
  preferredChannels: ('email' | 'sms' | 'phone' | 'in_person')[];
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'any';
  specialRequirements?: string[];
  budgetSensitive?: boolean;
  timelinePressure?: 'relaxed' | 'standard' | 'urgent';
}

// Main request structure for AI journey generation
export interface JourneySuggestionRequest {
  vendorType: VendorType;
  serviceLevel: ServiceLevel;
  weddingTimeline: number; // months before wedding
  clientPreferences: ClientPreferences;
  additionalContext?: {
    weddingStyle?: string;
    weddingSize?: 'intimate' | 'medium' | 'large';
    weddingBudget?: 'economy' | 'mid_range' | 'luxury';
    seasonality?: 'spring' | 'summer' | 'fall' | 'winter';
    location?: 'local' | 'destination';
  };
  customRequirements?: string;
}

// Individual journey node structure
export interface JourneyNode {
  id: string;
  type:
    | 'start'
    | 'email'
    | 'sms'
    | 'form'
    | 'meeting'
    | 'condition'
    | 'split'
    | 'timeline'
    | 'review'
    | 'referral'
    | 'end';
  position: {
    x: number;
    y: number;
  };
  data: {
    title: string;
    description?: string;
    timing: {
      delay: number; // days from previous node or wedding date
      fromWedding?: boolean; // if true, delay is from wedding date
    };
    content?: {
      subject?: string; // for email/sms nodes
      body?: string;
      template?: string;
    };
    conditions?: {
      field: string;
      operator:
        | 'equals'
        | 'not_equals'
        | 'contains'
        | 'greater_than'
        | 'less_than';
      value: string | number | boolean;
    }[];
    metadata: {
      aiGenerated: true;
      confidence: number; // 0-1
      reasoning: string;
      alternatives?: string[];
    };
  };
  connections: {
    to: string; // node id
    condition?: string;
    label?: string;
  }[];
}

// Journey connection structure
export interface JourneyConnection {
  id: string;
  from: string; // node id
  to: string; // node id
  type: 'default' | 'conditional' | 'split';
  condition?: {
    field: string;
    operator: string;
    value: any;
  };
  label?: string;
}

// Performance prediction metrics
export interface PerformanceMetrics {
  completionRate: number; // 0-1
  engagementScore: number; // 0-100
  estimatedTimeToCompletion: number; // days
  clientSatisfactionScore: number; // 0-10
  industryBenchmark: {
    completionRate: number;
    engagementScore: number;
    avgTimeToCompletion: number;
  };
  confidenceIntervals: {
    completionRate: {
      lower: number;
      upper: number;
    };
    engagementScore: {
      lower: number;
      upper: number;
    };
  };
}

// AI-generated optimization suggestions
export interface OptimizationSuggestion {
  id: string;
  type: 'timing' | 'content' | 'frequency' | 'channel' | 'personalization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  reasoning: string;
  expectedImprovement: {
    metric: keyof PerformanceMetrics;
    increase: number; // percentage improvement
  };
  implementation: {
    difficulty: 'easy' | 'medium' | 'hard';
    timeRequired: number; // minutes
    steps: string[];
  };
  applicableToNodes?: string[]; // specific node ids
}

// Complete generated journey structure
export interface GeneratedJourney {
  id: string;
  metadata: {
    generatedAt: Date;
    aiModel: string;
    version: string;
    confidence: number; // overall confidence 0-1
    estimatedPerformance: PerformanceMetrics;
    generationRequest: JourneySuggestionRequest;
    industryTemplate?: string;
  };
  journey: {
    nodes: JourneyNode[];
    connections: JourneyConnection[];
    settings: {
      name: string;
      description: string;
      tags: string[];
      isActive: boolean;
    };
  };
  optimizationSuggestions: OptimizationSuggestion[];
  alternatives?: {
    title: string;
    description: string;
    journeyId: string;
    confidence: number;
  }[];
}

// UI state management types
export interface JourneyGenerationState {
  // Current generation request
  currentRequest: JourneySuggestionRequest;

  // Generation process state
  isGenerating: boolean;
  generationProgress?: {
    stage: 'analyzing' | 'generating' | 'optimizing' | 'validating';
    progress: number; // 0-100
    message: string;
  };

  // Results
  generatedJourney: GeneratedJourney | null;
  previousGenerations: GeneratedJourney[];

  // UI interaction state
  selectedNodes: string[];
  editingNode: JourneyNode | null;
  selectedOptimizations: string[];
  previewMode: 'timeline' | 'canvas' | 'list';

  // Error handling
  error: string | null;
  warnings: string[];

  // Comparison mode
  comparingJourneys?: {
    original: string;
    alternative: string;
  };
}

// Component prop types
export interface JourneySuggestionsPanelProps {
  isOpen?: boolean;
  onJourneyGenerated: (journey: GeneratedJourney) => void;
  onJourneySaved: (journey: GeneratedJourney) => void;
  onClose?: () => void;
  existingJourneys?: GeneratedJourney[];
}

export interface VendorSpecificControlsProps {
  request: JourneySuggestionRequest;
  onChange: (request: JourneySuggestionRequest) => void;
  isLoading?: boolean;
  errors?: Record<string, string>;
}

export interface GeneratedJourneyPreviewProps {
  journey: GeneratedJourney;
  selectedNodes?: string[];
  onNodeSelect: (nodeId: string) => void;
  onNodeEdit: (node: JourneyNode) => void;
  onSave: (journey: GeneratedJourney) => void;
  onCustomize: () => void;
  showOptimizations?: boolean;
}

export interface PerformancePredictionDisplayProps {
  performance: PerformanceMetrics;
  showComparison?: boolean;
  comparisonBaseline?: PerformanceMetrics;
  isLoading?: boolean;
}

export interface OptimizationSuggestionsProps {
  suggestions: OptimizationSuggestion[];
  selectedSuggestions: string[];
  onToggleSelection: (suggestionId: string) => void;
  onApplySuggestion: (suggestionId: string) => void;
  onDismissSuggestion: (suggestionId: string) => void;
  journey: GeneratedJourney;
}

// API types
export interface GenerateJourneyAPIRequest {
  request: JourneySuggestionRequest;
  options?: {
    includeAlternatives?: boolean;
    includeOptimizations?: boolean;
    templateId?: string;
  };
}

export interface GenerateJourneyAPIResponse {
  success: boolean;
  journey?: GeneratedJourney;
  error?: string;
  warnings?: string[];
  usage?: {
    tokensUsed: number;
    estimatedCost: number;
    processingTime: number;
  };
}

// Validation schemas (for use with Zod)
export interface JourneyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: {
    completeness: number; // 0-1
    coherence: number; // 0-1
    optimization: number; // 0-1
    overall: number; // 0-1
  };
}

// Export all vendor configurations
export const VENDOR_TYPE_CONFIGS: Record<VendorType, VendorTypeConfig> = {
  photographer: {
    icon: 'Camera',
    label: 'Wedding Photography',
    description: 'Capture moments and memories',
    commonTimelines: [3, 6, 12, 18],
    serviceDescriptions: {
      basic: 'Essential coverage and edited photos',
      premium: 'Full day coverage with engagement session',
      luxury: 'Multiple photographers and premium albums',
    },
    typicalTouchpoints: [
      'Initial consultation',
      'Engagement session planning',
      'Timeline coordination',
      'Final preparations',
      'Wedding day coverage',
      'Photo delivery',
    ],
    industryBenchmarks: {
      completionRate: 0.92,
      engagementScore: 87,
      averageResponseTime: 4,
    },
  },
  caterer: {
    icon: 'ChefHat',
    label: 'Wedding Catering',
    description: 'Create memorable dining experiences',
    commonTimelines: [6, 12, 18],
    serviceDescriptions: {
      basic: 'Buffet service with standard menu',
      premium: 'Plated service with menu customization',
      luxury: 'Multi-course tasting with specialty options',
    },
    typicalTouchpoints: [
      'Initial consultation',
      'Menu tasting',
      'Final headcount',
      'Service coordination',
      'Wedding day service',
      'Post-event cleanup',
    ],
    industryBenchmarks: {
      completionRate: 0.89,
      engagementScore: 83,
      averageResponseTime: 6,
    },
  },
  dj: {
    icon: 'Music',
    label: 'Wedding DJ & Entertainment',
    description: 'Provide music and entertainment',
    commonTimelines: [3, 6, 12],
    serviceDescriptions: {
      basic: 'Music and basic lighting',
      premium: 'MC services with enhanced audio',
      luxury: 'Full entertainment with custom lighting',
    },
    typicalTouchpoints: [
      'Music consultation',
      'Playlist planning',
      'Timeline coordination',
      'Sound check',
      'Wedding entertainment',
      'Equipment breakdown',
    ],
    industryBenchmarks: {
      completionRate: 0.94,
      engagementScore: 91,
      averageResponseTime: 3,
    },
  },
  venue: {
    icon: 'Building2',
    label: 'Wedding Venue',
    description: 'Provide the perfect setting',
    commonTimelines: [12, 18, 24],
    serviceDescriptions: {
      basic: 'Venue space with basic amenities',
      premium: 'Venue with coordination services',
      luxury: 'Full-service venue with premium features',
    },
    typicalTouchpoints: [
      'Venue tour',
      'Contract signing',
      'Planning meetings',
      'Setup coordination',
      'Wedding day management',
      'Venue cleanup',
    ],
    industryBenchmarks: {
      completionRate: 0.88,
      engagementScore: 85,
      averageResponseTime: 8,
    },
  },
  planner: {
    icon: 'ClipboardList',
    label: 'Wedding Planning',
    description: 'Coordinate the perfect day',
    commonTimelines: [6, 12, 18, 24],
    serviceDescriptions: {
      basic: 'Day-of coordination',
      premium: 'Partial planning with vendor management',
      luxury: 'Full-service planning with design',
    },
    typicalTouchpoints: [
      'Initial consultation',
      'Vendor selection',
      'Timeline development',
      'Regular check-ins',
      'Final preparations',
      'Wedding day coordination',
    ],
    industryBenchmarks: {
      completionRate: 0.96,
      engagementScore: 93,
      averageResponseTime: 2,
    },
  },
};

// Export utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
