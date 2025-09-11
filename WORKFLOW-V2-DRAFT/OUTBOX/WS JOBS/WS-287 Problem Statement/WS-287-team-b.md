# 🏗️ TEAM B - PROBLEM STATEMENT BACKEND: WS-287 IMPLEMENTATION MISSION

## 🎯 CRITICAL WEDDING INDUSTRY CONTEXT
**You are building the data infrastructure that tracks, measures, and quantifies the exact problems WedSync solves in the wedding industry.**

This is not abstract metrics tracking - it's a precision measurement system that captures:
- **Data entry repetition:** Currently 14x per wedding → Target 1x
- **Administrative time waste:** Currently 10+ hours → Target 2 hours  
- **Communication inefficiency:** Currently 200+ emails → Target 50 emails
- **Timeline coordination chaos:** Currently 47 changes → Target 10 changes
- **Collective industry waste:** Currently 140+ hours → Target 20 hours per wedding

Every API endpoint and database table you create helps quantify our revolutionary impact on wedding coordination.

## 🏆 YOUR SPECIALIZED MISSION
**IDENTITY:** You are the Senior Backend Engineer responsible for problem measurement infrastructure and analytics systems.

**GOAL:** Build robust backend systems that accurately track and measure wedding industry problem resolution:
1. **Problem Metrics API** providing real-time problem resolution tracking
2. **Analytics Database Schema** storing baseline and improvement measurements  
3. **Wedding Efficiency Tracking Service** monitoring admin time reduction
4. **Communication Analysis Engine** measuring email and coordination improvements
5. **Industry Impact Calculator** quantifying collective time and cost savings

## 🎯 FEATURE SCOPE: WS-287 PROBLEM STATEMENT BACKEND

### 📋 COMPREHENSIVE DELIVERABLES CHECKLIST

#### 🗄️ Problem Metrics Database Schema (Priority 1)
**File:** `/supabase/migrations/055_problem_metrics_schema.sql`

**CRITICAL REQUIREMENTS:**
- Comprehensive schema for tracking all wedding industry pain points
- Baseline measurements for current state problems
- Progress tracking for solution effectiveness
- Wedding-specific metrics and vendor type categorization
- Real-time updates and historical trend analysis

```sql
-- Problem Metrics Database Schema
-- Tracks wedding industry problems and our solution effectiveness

-- Main problem metrics tracking table
CREATE TABLE IF NOT EXISTS problem_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL CHECK (category IN ('couple_pain', 'supplier_pain', 'efficiency', 'coordination', 'industry_impact')),
  baseline_value DECIMAL(10,2) NOT NULL,
  target_value DECIMAL(10,2) NOT NULL,
  current_value DECIMAL(10,2) DEFAULT NULL,
  measurement_unit VARCHAR(50) NOT NULL,
  description TEXT,
  real_world_example TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Wedding-specific problem tracking
CREATE TABLE IF NOT EXISTS wedding_problem_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  problem_metric_id UUID REFERENCES problem_metrics(id) ON DELETE CASCADE,
  measured_value DECIMAL(10,2) NOT NULL,
  measurement_date TIMESTAMP DEFAULT NOW(),
  vendor_id UUID REFERENCES user_profiles(id), -- Which vendor experienced this
  vendor_type VARCHAR(50), -- photographer, venue, florist, etc.
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Supplier efficiency tracking
CREATE TABLE IF NOT EXISTS supplier_efficiency_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  admin_hours_before DECIMAL(4,2) DEFAULT 10.0,
  admin_hours_after DECIMAL(4,2),
  data_entry_repetitions_before INTEGER DEFAULT 14,
  data_entry_repetitions_after INTEGER DEFAULT 1,
  email_communications_before INTEGER DEFAULT 200,
  email_communications_after INTEGER,
  timeline_changes_before INTEGER DEFAULT 47,
  timeline_changes_after INTEGER,
  measurement_period_start TIMESTAMP,
  measurement_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Communication efficiency tracking
CREATE TABLE IF NOT EXISTS communication_efficiency_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  communication_type VARCHAR(50) CHECK (communication_type IN ('email', 'sms', 'automated', 'manual')),
  sender_id UUID REFERENCES user_profiles(id),
  recipient_id UUID REFERENCES user_profiles(id),
  subject VARCHAR(255),
  is_duplicate_request BOOLEAN DEFAULT FALSE,
  information_requested TEXT[], -- Array of what was requested
  automated_response BOOLEAN DEFAULT FALSE,
  time_to_response INTERVAL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Industry impact calculations
CREATE TABLE IF NOT EXISTS industry_impact_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculation_date DATE DEFAULT CURRENT_DATE,
  total_weddings_processed INTEGER,
  collective_time_saved_hours DECIMAL(10,2),
  collective_cost_saved DECIMAL(12,2),
  average_admin_reduction_percentage DECIMAL(5,2),
  average_communication_reduction_percentage DECIMAL(5,2),
  stress_reduction_score DECIMAL(3,1), -- 1-10 scale
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert baseline problem metrics
INSERT INTO problem_metrics (metric_name, category, baseline_value, target_value, measurement_unit, description, real_world_example) VALUES
('data_entry_repetition', 'couple_pain', 14.0, 1.0, 'times', 'Number of times couples enter same wedding information across vendors', 'Couples currently tell ceremony time to photographer, venue, florist, caterer, band, planner separately'),
('admin_hours_per_wedding', 'supplier_pain', 10.0, 2.0, 'hours', 'Administrative time vendors spend per wedding coordination', 'Photographer spends hours asking couples for guest count, dietary requirements, timeline details'),
('communication_emails', 'efficiency', 200.0, 50.0, 'emails', 'Total email exchanges required per wedding coordination', '"What time is the ceremony again?" asked by 15 different vendors individually'),
('timeline_changes', 'coordination', 47.0, 10.0, 'changes', 'Average timeline modifications during wedding planning', 'Ceremony moved 30 minutes requires individually notifying 12+ vendors via email'),
('collective_wasted_time', 'industry_impact', 140.0, 20.0, 'hours', 'Total time wasted across all vendors per wedding', '14 vendors × 10 hours each = 140 hours of duplicate administrative work'),
('vendor_coordination_calls', 'coordination', 25.0, 5.0, 'calls', 'Phone calls required between vendors for coordination', 'Photographer calls venue, venue calls caterer, caterer calls florist for timeline coordination'),
('information_accuracy_errors', 'coordination', 15.0, 2.0, 'errors', 'Mistakes due to outdated or incorrect wedding information', 'Wrong guest count given to caterer because couple updated photographer but not caterer'),
('couple_stress_level', 'couple_pain', 8.5, 3.0, 'scale_1_10', 'Couple stress level during wedding planning coordination', 'Couples overwhelmed managing 14+ vendor relationships and constant information requests');

-- Create indexes for performance
CREATE INDEX idx_problem_metrics_category ON problem_metrics(category);
CREATE INDEX idx_wedding_problem_instances_wedding_id ON wedding_problem_instances(wedding_id);
CREATE INDEX idx_wedding_problem_instances_date ON wedding_problem_instances(measurement_date);
CREATE INDEX idx_supplier_efficiency_wedding_id ON supplier_efficiency_metrics(wedding_id);
CREATE INDEX idx_supplier_efficiency_supplier_id ON supplier_efficiency_metrics(supplier_id);
CREATE INDEX idx_communication_log_wedding_id ON communication_efficiency_log(wedding_id);
CREATE INDEX idx_communication_log_date ON communication_efficiency_log(created_at);
CREATE INDEX idx_industry_impact_date ON industry_impact_calculations(calculation_date);

-- Set up Row Level Security
ALTER TABLE problem_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_problem_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_efficiency_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_efficiency_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_impact_calculations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin and analytics access
CREATE POLICY "Admin can manage all problem metrics" ON problem_metrics
  FOR ALL USING (EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid() 
    AND user_profiles.role = 'admin'
  ));

CREATE POLICY "Suppliers can view their own efficiency metrics" ON supplier_efficiency_metrics
  FOR SELECT USING (supplier_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Wedding stakeholders can view problem instances" ON wedding_problem_instances
  FOR SELECT USING (wedding_id IN (
    SELECT w.id FROM weddings w
    JOIN wedding_parties wp ON wp.wedding_id = w.id
    JOIN user_profiles up ON up.id = wp.user_profile_id
    WHERE up.user_id = auth.uid()
  ));

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER problem_metrics_updated_at
  BEFORE UPDATE ON problem_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER supplier_efficiency_updated_at
  BEFORE UPDATE ON supplier_efficiency_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

#### 📊 Problem Metrics API (Priority 1)
**File:** `/src/app/api/analytics/problem-metrics/route.ts`

**COMPREHENSIVE PROBLEM TRACKING:**
- Real-time problem metric retrieval and updates
- Wedding-specific problem instance tracking
- Supplier efficiency measurement endpoints
- Industry impact calculation services
- Historical trend analysis and reporting

```typescript
// Problem Metrics API Implementation
import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Validation schemas
const problemMetricUpdateSchema = z.object({
  metricName: z.string().min(1),
  currentValue: z.number().min(0),
  weddingId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  notes: z.string().optional()
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const { searchParams } = new URL(request.url);
    
    const category = searchParams.get('category');
    const weddingId = searchParams.get('weddingId');
    const timeframe = searchParams.get('timeframe') || '30'; // days
    
    // Get problem metrics with current values
    let metricsQuery = supabase
      .from('problem_metrics')
      .select('*');
      
    if (category) {
      metricsQuery = metricsQuery.eq('category', category);
    }
    
    const { data: metrics, error: metricsError } = await metricsQuery;
    
    if (metricsError) {
      throw new Error(`Failed to fetch problem metrics: ${metricsError.message}`);
    }

    // Calculate current values from recent measurements
    const metricsWithCurrentValues = await Promise.all(
      metrics.map(async (metric) => {
        const { data: recentMeasurements } = await supabase
          .from('wedding_problem_instances')
          .select('measured_value, measurement_date')
          .eq('problem_metric_id', metric.id)
          .gte('measurement_date', new Date(Date.now() - parseInt(timeframe) * 24 * 60 * 60 * 1000).toISOString())
          .order('measurement_date', { ascending: false })
          .limit(100);

        const currentValue = recentMeasurements && recentMeasurements.length > 0
          ? recentMeasurements.reduce((sum, m) => sum + m.measured_value, 0) / recentMeasurements.length
          : metric.baseline_value;

        const improvement = ((metric.baseline_value - currentValue) / metric.baseline_value) * 100;

        return {
          ...metric,
          current_value: Math.round(currentValue * 100) / 100,
          improvement: Math.max(0, Math.round(improvement * 100) / 100),
          trend_data: recentMeasurements?.slice(0, 10) || []
        };
      })
    );

    // If specific wedding requested, get wedding-specific metrics
    let weddingSpecificMetrics = null;
    if (weddingId) {
      const { data: weddingMetrics } = await supabase
        .from('wedding_problem_instances')
        .select(`
          *,
          problem_metrics(metric_name, category, baseline_value, target_value, measurement_unit)
        `)
        .eq('wedding_id', weddingId)
        .order('measurement_date', { ascending: false });

      weddingSpecificMetrics = weddingMetrics;
    }

    // Get industry impact summary
    const { data: latestImpact } = await supabase
      .from('industry_impact_calculations')
      .select('*')
      .order('calculation_date', { ascending: false })
      .limit(1);

    return NextResponse.json({
      metrics: metricsWithCurrentValues,
      weddingSpecific: weddingSpecificMetrics,
      industryImpact: latestImpact?.[0] || null,
      summary: {
        totalMetrics: metricsWithCurrentValues.length,
        averageImprovement: metricsWithCurrentValues.reduce((sum, m) => sum + m.improvement, 0) / metricsWithCurrentValues.length,
        metricsOnTrack: metricsWithCurrentValues.filter(m => m.current_value <= m.target_value).length,
        timeframe: parseInt(timeframe)
      }
    });
  } catch (error) {
    console.error('Problem metrics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch problem metrics', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const body = await request.json();
    
    // Validate input
    const validatedData = problemMetricUpdateSchema.parse(body);
    
    // Get the problem metric
    const { data: problemMetric, error: metricError } = await supabase
      .from('problem_metrics')
      .select('*')
      .eq('metric_name', validatedData.metricName)
      .single();
      
    if (metricError || !problemMetric) {
      return NextResponse.json(
        { error: 'Problem metric not found' },
        { status: 404 }
      );
    }

    // Record the measurement
    const { data: measurement, error: measurementError } = await supabase
      .from('wedding_problem_instances')
      .insert({
        wedding_id: validatedData.weddingId,
        problem_metric_id: problemMetric.id,
        measured_value: validatedData.currentValue,
        vendor_id: validatedData.vendorId,
        notes: validatedData.notes
      })
      .select()
      .single();

    if (measurementError) {
      throw new Error(`Failed to record measurement: ${measurementError.message}`);
    }

    // Update current value in problem_metrics table
    const { error: updateError } = await supabase
      .from('problem_metrics')
      .update({ 
        current_value: validatedData.currentValue,
        updated_at: new Date().toISOString()
      })
      .eq('id', problemMetric.id);

    if (updateError) {
      console.error('Failed to update current value:', updateError);
    }

    // Trigger industry impact recalculation if significant measurement
    if (validatedData.weddingId) {
      await recalculateIndustryImpact(supabase);
    }

    return NextResponse.json({
      success: true,
      measurement,
      improvement: ((problemMetric.baseline_value - validatedData.currentValue) / problemMetric.baseline_value) * 100
    });
  } catch (error) {
    console.error('Problem metrics update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update problem metric', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to recalculate industry impact
async function recalculateIndustryImpact(supabase: any) {
  try {
    // Get all recent measurements for calculation
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentMeasurements } = await supabase
      .from('wedding_problem_instances')
      .select(`
        *,
        problem_metrics(metric_name, baseline_value, target_value)
      `)
      .gte('measurement_date', thirtyDaysAgo);

    if (!recentMeasurements || recentMeasurements.length === 0) {
      return;
    }

    // Calculate aggregate improvements
    const uniqueWeddings = new Set(recentMeasurements.map(m => m.wedding_id)).size;
    
    const adminTimeReductions = recentMeasurements
      .filter(m => m.problem_metrics.metric_name === 'admin_hours_per_wedding')
      .map(m => m.problem_metrics.baseline_value - m.measured_value);
    
    const communicationReductions = recentMeasurements
      .filter(m => m.problem_metrics.metric_name === 'communication_emails')
      .map(m => m.problem_metrics.baseline_value - m.measured_value);

    const collectiveTimeSaved = adminTimeReductions.reduce((sum, reduction) => sum + reduction, 0) * uniqueWeddings;
    const averageAdminReduction = adminTimeReductions.length > 0 
      ? (adminTimeReductions.reduce((sum, r) => sum + r, 0) / adminTimeReductions.length / 10) * 100
      : 0;
    
    const averageCommunicationReduction = communicationReductions.length > 0
      ? (communicationReductions.reduce((sum, r) => sum + r, 0) / communicationReductions.length / 200) * 100
      : 0;

    // Insert industry impact calculation
    const { error: impactError } = await supabase
      .from('industry_impact_calculations')
      .insert({
        total_weddings_processed: uniqueWeddings,
        collective_time_saved_hours: Math.round(collectiveTimeSaved * 100) / 100,
        collective_cost_saved: Math.round(collectiveTimeSaved * 150 * 100) / 100, // Assume £150/hour average
        average_admin_reduction_percentage: Math.round(averageAdminReduction * 100) / 100,
        average_communication_reduction_percentage: Math.round(averageCommunicationReduction * 100) / 100,
        stress_reduction_score: Math.min(10, Math.max(1, averageAdminReduction / 10)) // Scale 1-10
      });

    if (impactError) {
      console.error('Failed to record industry impact calculation:', impactError);
    }
  } catch (error) {
    console.error('Industry impact recalculation error:', error);
  }
}
```

#### 📈 Wedding Efficiency Tracking Service (Priority 2)
**File:** `/src/lib/analytics/wedding-efficiency-tracker.ts`

**EFFICIENCY MEASUREMENT ENGINE:**
- Real-time admin time tracking for suppliers
- Before/after efficiency comparison calculations
- Wedding coordination workflow analysis
- Automated efficiency improvement detection
- Supplier performance benchmarking

```typescript
// Wedding Efficiency Tracking Service
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database';

type SupabaseClient = ReturnType<typeof createClientComponentClient<Database>>;

export interface EfficiencyMetrics {
  supplierId: string;
  weddingId: string;
  adminHoursBefore: number;
  adminHoursAfter: number;
  dataEntryReductionPercentage: number;
  communicationEfficiencyGain: number;
  timelineCoordinationImprovement: number;
  overallEfficiencyScore: number;
}

export interface WeddingEfficiencyAnalysis {
  totalTimeSaved: number;
  efficiencyGainPercentage: number;
  supplierImprovements: EfficiencyMetrics[];
  industryBenchmark: number;
  weddingComplexityScore: number;
}

export class WeddingEfficiencyTracker {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClientComponentClient();
  }

  async trackSupplierEfficiency(
    supplierId: string,
    weddingId: string,
    efficiencyData: Partial<EfficiencyMetrics>
  ): Promise<EfficiencyMetrics> {
    try {
      // Get existing efficiency record or create new one
      let { data: existingRecord } = await this.supabase
        .from('supplier_efficiency_metrics')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('wedding_id', weddingId)
        .single();

      if (!existingRecord) {
        const { data: newRecord, error: insertError } = await this.supabase
          .from('supplier_efficiency_metrics')
          .insert({
            supplier_id: supplierId,
            wedding_id: weddingId,
            admin_hours_before: 10.0, // Default baseline
            data_entry_repetitions_before: 14,
            email_communications_before: 200,
            timeline_changes_before: 47
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(`Failed to create efficiency record: ${insertError.message}`);
        }

        existingRecord = newRecord;
      }

      // Update with new efficiency data
      const updatedData: any = {};
      
      if (efficiencyData.adminHoursAfter !== undefined) {
        updatedData.admin_hours_after = efficiencyData.adminHoursAfter;
      }
      
      if (efficiencyData.dataEntryReductionPercentage !== undefined) {
        const newRepetitions = Math.max(1, Math.round(14 * (1 - efficiencyData.dataEntryReductionPercentage / 100)));
        updatedData.data_entry_repetitions_after = newRepetitions;
      }

      if (Object.keys(updatedData).length > 0) {
        const { error: updateError } = await this.supabase
          .from('supplier_efficiency_metrics')
          .update(updatedData)
          .eq('id', existingRecord.id);

        if (updateError) {
          throw new Error(`Failed to update efficiency metrics: ${updateError.message}`);
        }
      }

      // Calculate efficiency improvements
      const adminImprovement = existingRecord.admin_hours_before - (updatedData.admin_hours_after || existingRecord.admin_hours_after || existingRecord.admin_hours_before);
      const adminReductionPercentage = (adminImprovement / existingRecord.admin_hours_before) * 100;
      
      const dataEntryImprovement = existingRecord.data_entry_repetitions_before - (updatedData.data_entry_repetitions_after || existingRecord.data_entry_repetitions_after || existingRecord.data_entry_repetitions_before);
      const dataEntryReductionPercentage = (dataEntryImprovement / existingRecord.data_entry_repetitions_before) * 100;

      const overallEfficiencyScore = Math.min(100, (adminReductionPercentage + dataEntryReductionPercentage) / 2);

      // Record problem metric improvements
      await this.recordProblemMetricImprovements(weddingId, {
        adminHours: updatedData.admin_hours_after || existingRecord.admin_hours_after,
        dataEntryRepetitions: updatedData.data_entry_repetitions_after || existingRecord.data_entry_repetitions_after
      });

      return {
        supplierId,
        weddingId,
        adminHoursBefore: existingRecord.admin_hours_before,
        adminHoursAfter: updatedData.admin_hours_after || existingRecord.admin_hours_after || existingRecord.admin_hours_before,
        dataEntryReductionPercentage: Math.max(0, dataEntryReductionPercentage),
        communicationEfficiencyGain: 0, // TODO: Calculate based on communication log
        timelineCoordinationImprovement: 0, // TODO: Calculate based on timeline changes
        overallEfficiencyScore: Math.max(0, overallEfficiencyScore)
      };
    } catch (error) {
      console.error('Error tracking supplier efficiency:', error);
      throw error;
    }
  }

  async analyzeWeddingEfficiency(weddingId: string): Promise<WeddingEfficiencyAnalysis> {
    try {
      // Get all supplier efficiency metrics for this wedding
      const { data: supplierMetrics, error: metricsError } = await this.supabase
        .from('supplier_efficiency_metrics')
        .select('*')
        .eq('wedding_id', weddingId);

      if (metricsError) {
        throw new Error(`Failed to get supplier metrics: ${metricsError.message}`);
      }

      if (!supplierMetrics || supplierMetrics.length === 0) {
        return {
          totalTimeSaved: 0,
          efficiencyGainPercentage: 0,
          supplierImprovements: [],
          industryBenchmark: 100, // 100% current inefficiency
          weddingComplexityScore: 0
        };
      }

      // Calculate total time saved across all suppliers
      const totalTimeSaved = supplierMetrics.reduce((total, metric) => {
        const adminTimeSaved = metric.admin_hours_before - (metric.admin_hours_after || metric.admin_hours_before);
        return total + Math.max(0, adminTimeSaved);
      }, 0);

      // Calculate overall efficiency gain
      const totalAdminTimeBefore = supplierMetrics.reduce((total, metric) => total + metric.admin_hours_before, 0);
      const totalAdminTimeAfter = supplierMetrics.reduce((total, metric) => total + (metric.admin_hours_after || metric.admin_hours_before), 0);
      const efficiencyGainPercentage = totalAdminTimeBefore > 0 ? ((totalAdminTimeBefore - totalAdminTimeAfter) / totalAdminTimeBefore) * 100 : 0;

      // Build supplier improvements array
      const supplierImprovements: EfficiencyMetrics[] = supplierMetrics.map(metric => {
        const adminImprovement = metric.admin_hours_before - (metric.admin_hours_after || metric.admin_hours_before);
        const adminReductionPercentage = (adminImprovement / metric.admin_hours_before) * 100;
        
        const dataEntryImprovement = metric.data_entry_repetitions_before - (metric.data_entry_repetitions_after || metric.data_entry_repetitions_before);
        const dataEntryReductionPercentage = (dataEntryImprovement / metric.data_entry_repetitions_before) * 100;

        return {
          supplierId: metric.supplier_id,
          weddingId: metric.wedding_id,
          adminHoursBefore: metric.admin_hours_before,
          adminHoursAfter: metric.admin_hours_after || metric.admin_hours_before,
          dataEntryReductionPercentage: Math.max(0, dataEntryReductionPercentage),
          communicationEfficiencyGain: 0, // TODO: Calculate from communication log
          timelineCoordinationImprovement: 0, // TODO: Calculate from timeline changes
          overallEfficiencyScore: Math.max(0, (adminReductionPercentage + dataEntryReductionPercentage) / 2)
        };
      });

      // Get industry benchmark (average efficiency across all weddings)
      const { data: allMetrics } = await this.supabase
        .from('supplier_efficiency_metrics')
        .select('admin_hours_before, admin_hours_after')
        .not('admin_hours_after', 'is', null);

      let industryBenchmark = 100;
      if (allMetrics && allMetrics.length > 0) {
        const industryEfficiencyGain = allMetrics.reduce((total, metric) => {
          const improvement = metric.admin_hours_before - metric.admin_hours_after;
          return total + (improvement / metric.admin_hours_before) * 100;
        }, 0) / allMetrics.length;

        industryBenchmark = Math.max(0, 100 - industryEfficiencyGain);
      }

      // Calculate wedding complexity score (more suppliers = more complex)
      const weddingComplexityScore = Math.min(100, supplierMetrics.length * 7); // Max 14+ suppliers

      return {
        totalTimeSaved: Math.round(totalTimeSaved * 100) / 100,
        efficiencyGainPercentage: Math.round(efficiencyGainPercentage * 100) / 100,
        supplierImprovements,
        industryBenchmark: Math.round(industryBenchmark * 100) / 100,
        weddingComplexityScore
      };
    } catch (error) {
      console.error('Error analyzing wedding efficiency:', error);
      throw error;
    }
  }

  private async recordProblemMetricImprovements(weddingId: string, improvements: any) {
    try {
      // Record admin hours improvement
      if (improvements.adminHours !== undefined) {
        const { data: adminMetric } = await this.supabase
          .from('problem_metrics')
          .select('id')
          .eq('metric_name', 'admin_hours_per_wedding')
          .single();

        if (adminMetric) {
          await this.supabase
            .from('wedding_problem_instances')
            .insert({
              wedding_id: weddingId,
              problem_metric_id: adminMetric.id,
              measured_value: improvements.adminHours
            });
        }
      }

      // Record data entry repetition improvement
      if (improvements.dataEntryRepetitions !== undefined) {
        const { data: dataEntryMetric } = await this.supabase
          .from('problem_metrics')
          .select('id')
          .eq('metric_name', 'data_entry_repetition')
          .single();

        if (dataEntryMetric) {
          await this.supabase
            .from('wedding_problem_instances')
            .insert({
              wedding_id: weddingId,
              problem_metric_id: dataEntryMetric.id,
              measured_value: improvements.dataEntryRepetitions
            });
        }
      }
    } catch (error) {
      console.error('Error recording problem metric improvements:', error);
    }
  }

  async getSupplierEfficiencyBenchmark(supplierType: string): Promise<{
    averageAdminHours: number;
    averageDataEntryReductions: number;
    topPerformerBenchmark: number;
  }> {
    try {
      // Get efficiency metrics for similar supplier types
      const { data: benchmarkData } = await this.supabase
        .from('supplier_efficiency_metrics')
        .select(`
          admin_hours_before,
          admin_hours_after,
          data_entry_repetitions_before,
          data_entry_repetitions_after,
          user_profiles!supplier_efficiency_metrics_supplier_id_fkey(supplier_type)
        `)
        .not('admin_hours_after', 'is', null);

      if (!benchmarkData || benchmarkData.length === 0) {
        return {
          averageAdminHours: 10, // Default baseline
          averageDataEntryReductions: 0,
          topPerformerBenchmark: 0
        };
      }

      // Filter by supplier type
      const typeSpecificData = benchmarkData.filter(
        (metric: any) => metric.user_profiles?.supplier_type === supplierType
      );

      const relevantData = typeSpecificData.length > 0 ? typeSpecificData : benchmarkData;

      // Calculate averages
      const averageAdminHours = relevantData.reduce((sum: number, metric: any) => {
        return sum + (metric.admin_hours_after || metric.admin_hours_before);
      }, 0) / relevantData.length;

      const averageDataEntryReductions = relevantData.reduce((sum: number, metric: any) => {
        const reduction = metric.data_entry_repetitions_before - (metric.data_entry_repetitions_after || metric.data_entry_repetitions_before);
        return sum + (reduction / metric.data_entry_repetitions_before) * 100;
      }, 0) / relevantData.length;

      // Get top performer benchmark (top 10%)
      const efficiencyScores = relevantData.map((metric: any) => {
        const adminReduction = (metric.admin_hours_before - (metric.admin_hours_after || metric.admin_hours_before)) / metric.admin_hours_before * 100;
        const dataReduction = (metric.data_entry_repetitions_before - (metric.data_entry_repetitions_after || metric.data_entry_repetitions_before)) / metric.data_entry_repetitions_before * 100;
        return (adminReduction + dataReduction) / 2;
      }).sort((a: number, b: number) => b - a);

      const topPerformerIndex = Math.floor(efficiencyScores.length * 0.1);
      const topPerformerBenchmark = efficiencyScores[topPerformerIndex] || 0;

      return {
        averageAdminHours: Math.round(averageAdminHours * 100) / 100,
        averageDataEntryReductions: Math.round(averageDataEntryReductions * 100) / 100,
        topPerformerBenchmark: Math.round(topPerformerBenchmark * 100) / 100
      };
    } catch (error) {
      console.error('Error getting supplier efficiency benchmark:', error);
      return {
        averageAdminHours: 10,
        averageDataEntryReductions: 0,
        topPerformerBenchmark: 0
      };
    }
  }
}
```

### 🚨 MANDATORY TESTING & VALIDATION

#### 📊 Evidence of Reality Requirements
After implementing the problem statement backend, you MUST verify with these exact commands:

```bash
# Database schema verification
npx supabase db diff --use-migra
npx supabase db reset --linked

# API endpoint testing
curl -X GET http://localhost:3000/api/analytics/problem-metrics
curl -X POST http://localhost:3000/api/analytics/problem-metrics \
  -H "Content-Type: application/json" \
  -d '{"metricName":"admin_hours_per_wedding","currentValue":5.0,"weddingId":"uuid-here"}'

# Service testing
npm test WeddingEfficiencyTracker

# Database performance testing
psql -d wedsync -c "EXPLAIN ANALYZE SELECT * FROM problem_metrics WHERE category = 'couple_pain';"
```

## 🏆 SUCCESS METRICS & VALIDATION

Your implementation will be judged on:

1. **Data Accuracy & Integrity** (40 points)
   - Accurate baseline measurements and problem quantification
   - Reliable efficiency tracking and improvement calculations
   - Robust data validation and error handling
   - Consistent measurement units and calculation methods

2. **API Performance & Scalability** (35 points)
   - Fast response times for analytics queries (<100ms)
   - Efficient database queries with proper indexing
   - Scalable architecture handling multiple weddings simultaneously
   - Real-time updates without performance degradation

3. **Wedding Industry Authenticity** (25 points)
   - Realistic baseline metrics matching actual industry problems
   - Accurate measurement of admin time and coordination efficiency
   - Meaningful improvement calculations that reflect real impact
   - Wedding-specific tracking that captures industry nuances

## 🎊 FINAL MISSION REMINDER

You are building the measurement engine that proves WedSync's revolutionary impact on the wedding industry.

**Every API endpoint and database table you create helps quantify the transformation from 140+ hours of wasted coordination time to 20 hours of efficient collaboration per wedding.**

**SUCCESS DEFINITION:** When stakeholders see the data from your backend systems, they have undeniable proof that WedSync eliminates specific, quantified inefficiencies that plague the wedding industry.

Now go build the most accurate problem measurement infrastructure ever created! 🚀📊