import { Node, Edge } from '@xyflow/react';

export type VendorCategory =
  | 'photography'
  | 'videography'
  | 'venue'
  | 'catering'
  | 'dj'
  | 'band'
  | 'florist'
  | 'planner'
  | 'hair_makeup'
  | 'transportation'
  | 'cake'
  | 'rentals';

export type TemplateTier =
  | 'free'
  | 'starter'
  | 'professional'
  | 'scale'
  | 'enterprise';

export interface TemplateVariable {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'email' | 'phone' | 'url';
  defaultValue?: string;
  required?: boolean;
  description?: string;
}

export interface SuccessMetric {
  name: string;
  target: number;
  unit: string;
  description?: string;
}

export interface JourneyTemplate {
  id: string;
  name: string;
  category: VendorCategory;
  description: string;
  tier: TemplateTier;
  nodes: Node[];
  edges: Edge[];
  variables: TemplateVariable[];
  estimatedDuration: string;
  successMetrics: SuccessMetric[];
  tags: string[];
  popularity: number;
  createdAt?: Date;
  updatedAt?: Date;
  version?: string;
  thumbnail?: string;
  features?: string[];
}

export interface TemplateSearchFilters {
  category?: VendorCategory;
  tier?: TemplateTier;
  searchTerm?: string;
  tags?: string[];
  sortBy?: 'popularity' | 'name' | 'recent';
}

export interface TemplateLibraryStats {
  totalTemplates: number;
  templatesByCategory: Record<VendorCategory, number>;
  templatesByTier: Record<TemplateTier, number>;
  mostPopular: string[];
}
