export interface CohortData {
  cohort_start: string;
  cohort_size: number;
  retention_rates: number[];
  revenue_progression: number[];
  ltv_calculated: number;
  supplier_category?: string;
  seasonal_cohort?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  months_tracked: number;
}

export interface CohortAnalysisResult {
  cohorts: CohortData[];
  overall_metrics: {
    average_retention: number;
    best_cohort_month: string;
    worst_cohort_month: string;
    total_suppliers_analyzed: number;
    revenue_attribution_total: number;
  };
  seasonal_insights: {
    q1_average_retention: number;
    q2_average_retention: number;
    q3_average_retention: number;
    q4_average_retention: number;
    peak_season_performance: string;
  };
}

export interface CohortDetailMetrics {
  cohort: CohortData;
  individual_suppliers: {
    supplier_id: string;
    signup_date: string;
    current_status: 'active' | 'churned' | 'at_risk';
    revenue_contribution: number;
    retention_score: number;
    category: string;
  }[];
  retention_curve: {
    month: number;
    retention_percentage: number;
    revenue_per_supplier: number;
  }[];
  benchmark_comparison: {
    vs_average_retention: number;
    vs_previous_cohort: number;
    performance_percentile: number;
  };
}

export interface AutomatedInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'success' | 'trend';
  title: string;
  description: string;
  impact_score: number;
  actionable_recommendation: string;
  affected_cohorts: string[];
  confidence_level: number;
}

export interface CohortTrend {
  metric: 'retention' | 'revenue' | 'ltv';
  trend_direction: 'improving' | 'declining' | 'stable';
  period_comparison: string;
  change_percentage: number;
  statistical_significance: number;
}

export interface TimeRange {
  label: string;
  months: number;
  description: string;
}

export type CohortMetric = 'retention' | 'revenue' | 'ltv';

export interface CohortHeatmapCell {
  cohort_month: string;
  month_index: number;
  value: number;
  color_intensity: number;
  formatted_value: string;
  tooltip_data: {
    cohort_start: string;
    month_label: string;
    metric_value: number;
    cohort_size: number;
    benchmark_comparison: string;
  };
}

export interface CohortAnalysisFilters {
  date_range: {
    start: string;
    end: string;
  };
  supplier_categories: string[];
  min_cohort_size: number;
  selected_metric: CohortMetric;
  time_range_months: number;
}

export interface CohortExportData {
  export_type: 'full_analysis' | 'summary' | 'executive_report';
  data: CohortAnalysisResult;
  generated_at: string;
  filters_applied: CohortAnalysisFilters;
  insights_included: AutomatedInsight[];
}
