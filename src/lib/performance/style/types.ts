// WS-184: Shared Type Definitions for Style Processing System

export interface ProcessingOptions {
  priority: 'low' | 'medium' | 'high';
  timeout: number;
  batchSize: number;
  qualityLevel: 'fast' | 'balanced' | 'high';
  cacheEnabled: boolean;
  parallelWorkers: number;
}

export interface StyleVector {
  id: string;
  dimensions: number[];
  metadata: {
    colorPalette: string[];
    dominantColors: string[];
    style: string;
    venue?: string;
    season?: string;
    formality?: string;
    weddingType?: string;
    timestamp: number;
  };
  confidence: number;
  timestamp: number;
}

export interface ProcessingJob {
  id: string;
  imageUrl: string;
  options: ProcessingOptions;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startTime: number;
  estimatedCompletion?: number;
  result?: StyleVector;
  error?: string;
}

export interface StyleProcessingResult {
  jobId: string;
  processedVectors: StyleVector[];
  processingTime: number;
  quality: {
    accuracy: number;
    confidence: number;
    vectorDensity: number;
  };
  performance: {
    throughput: number;
    memoryUsage: number;
    cpuUtilization: number;
  };
  cacheStats: {
    hitRate: number;
    missRate: number;
    totalRequests: number;
  };
}

export interface WeddingStyleProfile {
  vectors: StyleVector[];
  processingTime: number;
  cacheHitRatio: number;
  qualityMetrics: {
    accuracy: number;
    confidence: number;
    colorAccuracy: number;
  };
}

export interface WeddingContext {
  weddingType: 'indoor' | 'outdoor' | 'beach' | 'garden' | 'church' | 'venue';
  season: 'spring' | 'summer' | 'fall' | 'winter';
  style: 'classic' | 'modern' | 'rustic' | 'bohemian' | 'elegant' | 'casual';
  formality: 'formal' | 'semi-formal' | 'casual';
  colorScheme?: string[];
  theme?: string;
}

export interface SimilarityMatch {
  vector: StyleVector;
  similarity: number;
  weddingCompatibility: number;
}
