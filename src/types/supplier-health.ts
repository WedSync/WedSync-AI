// WS-168: Customer Success Dashboard - Supplier Health Metrics Types
// Following WedSync TypeScript patterns and database conventions

import { Database } from './database';

// Base supplier health metrics from database
export interface SupplierHealthRow {
  id: string;
  supplier_id: string;
  organization_id: string;

  // Core Health Metrics (0-100 scale)
  health_score: number;
  risk_level: 'green' | 'yellow' | 'red';

  // Activity Metrics
  last_activity: string; // ISO timestamp
  active_clients: number;
  completed_projects: number;
  avg_response_time: number; // in hours

  // Satisfaction & Performance
  client_satisfaction: number; // 0-5 scale
  revenue: number;

  // Trend & Historical Data
  trends_data: HealthTrendPoint[]; // JSONB array

  // Required Actions
  interventions_needed: InterventionAction[]; // JSONB array

  // Contact Information
  last_contact_date: string | null;
  notes: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface SupplierHealthInsert
  extends Omit<SupplierHealthRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupplierHealthUpdate extends Partial<SupplierHealthInsert> {}

// Enhanced supplier health metrics with relations
export interface SupplierHealthMetrics
  extends Omit<SupplierHealthRow, 'trends_data' | 'interventions_needed'> {
  supplier_name: string;
  supplier_category:
    | 'photographer'
    | 'planner'
    | 'venue'
    | 'caterer'
    | 'florist'
    | 'music'
    | 'other';
  supplier_email: string | null;
  supplier_business_name: string | null;
  trendsData: HealthTrendPoint[];
  interventionsNeeded: InterventionAction[];
}

// Health trend data points for visualization
export interface HealthTrendPoint {
  date: string; // ISO date string
  healthScore: number;
  activeClients: number;
  revenue: number;
  clientSatisfaction: number;
  avgResponseTime: number;
}

// Intervention actions for customer success
export interface InterventionAction {
  id: string;
  type: 'follow_up' | 'training' | 'support' | 'upsell' | 'retention';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  dueDate: string; // ISO date string
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
}

// Dashboard filtering options
export interface HealthDashboardFilters {
  riskLevels: ('green' | 'yellow' | 'red')[];
  categories: string[];
  dateRange: {
    start: Date;
    end: Date;
  };
  healthScoreRange: {
    min: number;
    max: number;
  };
  sortBy:
    | 'health_score'
    | 'revenue'
    | 'last_activity'
    | 'active_clients'
    | 'client_satisfaction';
  sortOrder: 'asc' | 'desc';
  searchQuery?: string;
}

// Dashboard summary statistics
export interface DashboardSummary {
  totalSuppliers: number;
  avgHealthScore: number;
  riskDistribution: {
    green: number;
    yellow: number;
    red: number;
  };
  totalRevenue: number;
  totalActiveClients: number;
  avgClientSatisfaction: number;
  criticalInterventions: number;
  overdueInterventions: number;
}

// Export data structure
export interface HealthExportData {
  suppliers: SupplierHealthMetrics[];
  generatedAt: Date;
  filters: HealthDashboardFilters;
  summary: DashboardSummary;
  reportType: 'csv' | 'pdf' | 'xlsx';
}

// Chart configuration for visualizations
export interface ChartConfiguration {
  selectedMetric:
    | 'healthScore'
    | 'activeClients'
    | 'revenue'
    | 'clientSatisfaction';
  chartType: 'line' | 'area';
  timeRange: '7d' | '30d' | '90d' | '1y';
  selectedSupplier: string | null;
}

// Admin permissions for health dashboard access
export interface AdminHealthPermissions {
  canViewAllSuppliers: boolean;
  canExportData: boolean;
  canExecuteInterventions: boolean;
  canViewFinancialData: boolean;
  canModifyHealthScores: boolean;
}

// Real-time update events
export interface HealthUpdateEvent {
  type:
    | 'supplier_health_updated'
    | 'intervention_completed'
    | 'risk_level_changed';
  supplier_id: string;
  data: Partial<SupplierHealthMetrics>;
  timestamp: string;
}

// Wedding industry specific metrics
export interface WeddingSupplierContext {
  seasonality: {
    peakMonths: string[]; // ["May", "June", "July", "August", "September", "October"]
    offPeakPerformance: number;
    peakPerformance: number;
  };
  weddingTypes: (
    | 'traditional'
    | 'destination'
    | 'elopement'
    | 'micro'
    | 'luxury'
  )[];
  avgWeddingValue: number;
  referralRate: number;
  portfolioCompleteness: number; // 0-100%
}

// API response types following WedSync patterns
export interface SupplierHealthResponse {
  success: boolean;
  data: SupplierHealthMetrics[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
  error?: string;
}

export interface HealthDashboardResponse {
  success: boolean;
  data: {
    suppliers: SupplierHealthMetrics[];
    summary: DashboardSummary;
    filters: HealthDashboardFilters;
  };
  error?: string;
}

// Batch operations for admin actions
export interface BatchHealthOperation {
  operationType: 'update_scores' | 'assign_interventions' | 'export_data';
  supplierIds: string[];
  parameters: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}
