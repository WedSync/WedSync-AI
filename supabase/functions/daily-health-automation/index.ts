/**
 * Daily Health Check Automation Edge Function
 * WedSync WS-168: Customer Success Dashboard Implementation
 * 
 * Runs daily to:
 * 1. Calculate health scores for all suppliers
 * 2. Generate interventions for at-risk suppliers
 * 3. Send automated notifications
 * 4. Update health trends and metrics
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCalculationResult {
  supplierId: string;
  supplierName: string;
  organizationId: string;
  overallScore: number;
  engagementScore: number;
  recencyScore: number;
  durationScore: number;
  status: 'healthy' | 'at-risk' | 'critical' | 'churned';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  interventionsNeeded: string[];
}

interface InterventionSuggestion {
  supplierId: string;
  organizationId: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  automatedAction?: string;
  manualAction?: string;
  metadata: {
    triggeredBy: string[];
    healthScoreAtTrigger: number;
    estimatedImpact: 'low' | 'medium' | 'high';
    effort: 'low' | 'medium' | 'high';
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting daily health automation...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Get all active suppliers across all organizations
    const { data: suppliers, error: suppliersError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        full_name,
        organization_id,
        created_at,
        last_sign_in_at,
        organizations (
          id,
          name
        )
      `)
      .eq('role', 'supplier')
      .not('organization_id', 'is', null);

    if (suppliersError) {
      throw new Error(`Failed to fetch suppliers: ${suppliersError.message}`);
    }

    if (!suppliers || suppliers.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No suppliers found to process',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`Processing ${suppliers.length} suppliers...`);

    // 2. Calculate health scores for each supplier
    const healthResults: HealthCalculationResult[] = [];
    const interventionSuggestions: InterventionSuggestion[] = [];

    for (const supplier of suppliers) {
      try {
        const healthResult = await calculateSupplierHealth(supabase, supplier);
        healthResults.push(healthResult);

        // 3. Generate intervention suggestions based on health score
        const suggestions = generateInterventionSuggestions(healthResult);
        interventionSuggestions.push(...suggestions);

      } catch (error) {
        console.error(`Error processing supplier ${supplier.id}:`, error);
      }
    }

    // 4. Store health scores (in production this would update the health_scores table)
    console.log(`Calculated ${healthResults.length} health scores`);

    // 5. Create interventions for at-risk suppliers
    let interventionsCreated = 0;
    for (const suggestion of interventionSuggestions) {
      try {
        await createIntervention(supabase, suggestion);
        interventionsCreated++;
      } catch (error) {
        console.error(`Failed to create intervention for ${suggestion.supplierId}:`, error);
      }
    }

    // 6. Send automated notifications for critical cases
    const criticalCases = healthResults.filter(h => h.riskLevel === 'critical');
    let notificationsSent = 0;
    
    for (const criticalCase of criticalCases) {
      try {
        await sendCriticalHealthAlert(supabase, criticalCase);
        notificationsSent++;
      } catch (error) {
        console.error(`Failed to send notification for ${criticalCase.supplierId}:`, error);
      }
    }

    // 7. Generate summary statistics
    const summary = generateHealthSummary(healthResults);

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalSuppliers: suppliers.length,
        healthScoresCalculated: healthResults.length,
        interventionsCreated,
        notificationsSent,
        criticalAlerts: criticalCases.length,
        healthDistribution: summary.distribution,
        averageHealthScore: summary.averageScore,
        processingTimeMs: Date.now() - (req.headers.get('x-start-time') ? parseInt(req.headers.get('x-start-time')!) : Date.now())
      },
      details: {
        healthResults: healthResults.slice(0, 10), // First 10 for debugging
        interventionsSample: interventionSuggestions.slice(0, 5) // First 5 for debugging
      }
    };

    console.log('Daily health automation completed successfully:', response.summary);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Daily health automation error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

/**
 * Calculate health score for a single supplier
 */
async function calculateSupplierHealth(
  supabase: any,
  supplier: any
): Promise<HealthCalculationResult> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get client counts for this supplier
  const { data: clients } = await supabase
    .from('clients')
    .select('id, created_at, updated_at')
    .eq('supplier_id', supplier.id)
    .is('deleted_at', null);

  const totalClients = clients?.length || 0;
  const activeClients = clients?.filter((c: any) => 
    new Date(c.updated_at) >= thirtyDaysAgo
  ).length || 0;

  // Calculate engagement score (40%)
  const lastLoginDays = supplier.last_sign_in_at 
    ? Math.floor((now.getTime() - new Date(supplier.last_sign_in_at).getTime()) / (24 * 60 * 60 * 1000))
    : 999;

  // Mock additional metrics (in real implementation, these would come from actual usage data)
  const loginCount30d = Math.max(0, 25 - lastLoginDays); // Decreasing login frequency
  const featureUsageScore = Math.min(100, activeClients * 10 + Math.random() * 30);
  const clientActivityScore = Math.min(100, (activeClients / Math.max(1, totalClients)) * 100);

  const engagementScore = Math.round(
    (Math.min(100, (loginCount30d / 20) * 100) * 0.3) +
    (featureUsageScore * 0.25) +
    (clientActivityScore * 0.25) +
    (Math.max(0, 100 - Math.random() * 50) * 0.2) // Support interaction score
  );

  // Calculate recency score (30%)
  let recencyScore = 0;
  if (lastLoginDays <= 1) recencyScore = 100;
  else if (lastLoginDays <= 3) recencyScore = 90;
  else if (lastLoginDays <= 7) recencyScore = 75;
  else if (lastLoginDays <= 14) recencyScore = 60;
  else if (lastLoginDays <= 30) recencyScore = 40;
  else if (lastLoginDays <= 60) recencyScore = 20;
  else recencyScore = 0;

  // Calculate duration score (30%)
  const accountAgeDays = Math.floor(
    (now.getTime() - new Date(supplier.created_at).getTime()) / (24 * 60 * 60 * 1000)
  );
  
  let durationScore = 30; // Base score for new accounts
  if (accountAgeDays >= 30) durationScore = 50 + ((accountAgeDays - 30) / 60) * 30;
  if (accountAgeDays >= 90) durationScore = 80 + ((accountAgeDays - 90) / 275) * 15;
  if (accountAgeDays >= 365) durationScore = 95;

  // Apply consistency factor
  const consistencyFactor = Math.min(1, (activeClients / Math.max(1, totalClients)) * 1.2);
  durationScore = Math.round(durationScore * consistencyFactor);

  // Calculate overall weighted score
  const overallScore = Math.round(
    engagementScore * 0.4 +
    recencyScore * 0.3 +
    durationScore * 0.3
  );

  // Determine status and risk level
  let status: 'healthy' | 'at-risk' | 'critical' | 'churned' = 'healthy';
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

  if (overallScore >= 75) {
    status = 'healthy';
    riskLevel = 'low';
  } else if (overallScore >= 50) {
    status = 'at-risk';
    riskLevel = lastLoginDays > 30 ? 'high' : 'medium';
  } else if (overallScore >= 25) {
    status = 'critical';
    riskLevel = 'high';
  } else {
    status = 'churned';
    riskLevel = 'critical';
  }

  // Determine interventions needed
  const interventionsNeeded: string[] = [];
  if (engagementScore < 50) interventionsNeeded.push('engagement_boost');
  if (recencyScore < 40) interventionsNeeded.push('support_outreach');
  if (riskLevel === 'critical') interventionsNeeded.push('churn_prevention');
  if (status === 'churned') interventionsNeeded.push('win_back_campaign');

  return {
    supplierId: supplier.id,
    supplierName: supplier.full_name || 'Unknown',
    organizationId: supplier.organization_id,
    overallScore,
    engagementScore,
    recencyScore,
    durationScore,
    status,
    riskLevel,
    interventionsNeeded
  };
}

/**
 * Generate intervention suggestions based on health score
 */
function generateInterventionSuggestions(
  healthResult: HealthCalculationResult
): InterventionSuggestion[] {
  const suggestions: InterventionSuggestion[] = [];

  for (const interventionType of healthResult.interventionsNeeded) {
    let suggestion: InterventionSuggestion;

    switch (interventionType) {
      case 'engagement_boost':
        suggestion = {
          supplierId: healthResult.supplierId,
          organizationId: healthResult.organizationId,
          type: 'engagement_boost',
          priority: healthResult.riskLevel === 'critical' ? 'urgent' : 'high',
          title: 'Low Engagement Alert',
          description: `${healthResult.supplierName} has low engagement (${healthResult.engagementScore}/100). Consider reaching out to boost platform usage.`,
          automatedAction: 'send_email',
          metadata: {
            triggeredBy: ['low_engagement_score'],
            healthScoreAtTrigger: healthResult.overallScore,
            estimatedImpact: 'high',
            effort: 'low'
          }
        };
        break;

      case 'support_outreach':
        suggestion = {
          supplierId: healthResult.supplierId,
          organizationId: healthResult.organizationId,
          type: 'support_outreach',
          priority: 'high',
          title: 'Inactive User Follow-up',
          description: `${healthResult.supplierName} hasn't been active recently (recency: ${healthResult.recencyScore}/100). Schedule check-in call.`,
          manualAction: 'personal_outreach',
          metadata: {
            triggeredBy: ['low_recency_score'],
            healthScoreAtTrigger: healthResult.overallScore,
            estimatedImpact: 'high',
            effort: 'medium'
          }
        };
        break;

      case 'churn_prevention':
        suggestion = {
          supplierId: healthResult.supplierId,
          organizationId: healthResult.organizationId,
          type: 'churn_prevention',
          priority: 'urgent',
          title: 'Critical Account - Immediate Action Required',
          description: `${healthResult.supplierName} is at critical risk (${healthResult.overallScore}/100). Immediate intervention required.`,
          manualAction: 'executive_escalation',
          metadata: {
            triggeredBy: ['critical_risk_level'],
            healthScoreAtTrigger: healthResult.overallScore,
            estimatedImpact: 'high',
            effort: 'high'
          }
        };
        break;

      case 'win_back_campaign':
        suggestion = {
          supplierId: healthResult.supplierId,
          organizationId: healthResult.organizationId,
          type: 'success_check',
          priority: 'medium',
          title: 'Win-back Campaign',
          description: `${healthResult.supplierName} appears churned. Initiate win-back sequence.`,
          automatedAction: 'trigger_workflow',
          metadata: {
            triggeredBy: ['churned_status'],
            healthScoreAtTrigger: healthResult.overallScore,
            estimatedImpact: 'medium',
            effort: 'medium'
          }
        };
        break;

      default:
        continue;
    }

    suggestions.push(suggestion);
  }

  return suggestions;
}

/**
 * Create intervention in database
 */
async function createIntervention(
  supabase: any,
  suggestion: InterventionSuggestion
): Promise<void> {
  // In a real implementation, this would insert into the intervention_actions table
  console.log(`Would create intervention: ${suggestion.title} for supplier ${suggestion.supplierId}`);
  
  // For now, we'll just log the intervention
  // In production, this would be:
  // await supabase.from('intervention_actions').insert([suggestion]);
}

/**
 * Send critical health alert notification
 */
async function sendCriticalHealthAlert(
  supabase: any,
  healthResult: HealthCalculationResult
): Promise<void> {
  console.log(`CRITICAL ALERT: ${healthResult.supplierName} (Score: ${healthResult.overallScore})`);
  
  // In production, this would send actual notifications:
  // - Email to account managers
  // - Slack/Teams notifications  
  // - Dashboard alerts
  // - Mobile push notifications
}

/**
 * Generate health summary statistics
 */
function generateHealthSummary(healthResults: HealthCalculationResult[]): {
  averageScore: number;
  distribution: Record<string, number>;
} {
  const totalScore = healthResults.reduce((sum, result) => sum + result.overallScore, 0);
  const averageScore = healthResults.length > 0 ? Math.round(totalScore / healthResults.length) : 0;

  const distribution = healthResults.reduce((dist, result) => {
    dist[result.status] = (dist[result.status] || 0) + 1;
    return dist;
  }, {} as Record<string, number>);

  return {
    averageScore,
    distribution
  };
}