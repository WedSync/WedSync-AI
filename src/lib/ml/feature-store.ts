import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database';

export interface FeatureSet {
  entity_type: 'supplier' | 'couple' | 'transaction';
  entity_id: string;
  feature_set: string;
  features: Record<string, any>;
  feature_version?: number;
  expires_at?: string;
}

export interface SupplierFeatures {
  supplierId: string;
  vendorType: string;
  daysSinceLogin: number;
  totalForms: number;
  recentForms: number;
  totalClients: number;
  activeClients: number;
  couplesInvited: number;
  couplesActivated: number;
  avgSessionDuration: number;
  activeDaysLastMonth: number;
  negativeTickets: number;
  failedPayments: number;
  competitorMentions: number;
  mrr: number;
  ltv: number;
  seasonalityFactor: number;
  engagementScore: number;
  viralCoefficient: number;
  customerHealthScore: number;
}

export interface CoupleFeatures {
  coupleId: string;
  weddingDate: string;
  daysTillWedding: number;
  totalBudget: number;
  budgetSpent: number;
  vendorsConnected: number;
  tasksCompleted: number;
  totalTasks: number;
  engagementLevel: number;
  lastActivityDays: number;
  planningStress: number;
  satisfactionScore: number;
}

export interface TransactionFeatures {
  transactionId: string;
  supplierId: string;
  amount: number;
  transactionType: string;
  daysSinceLastTransaction: number;
  totalTransactionValue: number;
  averageTransactionValue: number;
  transactionFrequency: number;
  seasonalityAdjustment: number;
  riskScore: number;
}

export class FeatureStore {
  private supabase = createClientComponentClient<Database>();

  /**
   * Store features in the feature store with optional expiration
   */
  async storeFeatures(featureSet: FeatureSet): Promise<boolean> {
    try {
      const { error } = await this.supabase.from('ml_feature_store').upsert(
        {
          entity_type: featureSet.entity_type,
          entity_id: featureSet.entity_id,
          feature_set: featureSet.feature_set,
          features: featureSet.features,
          feature_version: featureSet.feature_version || 1,
          expires_at: featureSet.expires_at,
          calculated_at: new Date().toISOString(),
        },
        {
          onConflict: 'entity_type,entity_id,feature_set,feature_version',
        },
      );

      if (error) {
        console.error('Error storing features:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Feature store error:', error);
      return false;
    }
  }

  /**
   * Retrieve features from the feature store
   */
  async getFeatures(
    entityType: string,
    entityId: string,
    featureSet: string,
    version?: number,
  ): Promise<Record<string, any> | null> {
    try {
      let query = this.supabase
        .from('ml_feature_store')
        .select('features')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('feature_set', featureSet);

      if (version) {
        query = query.eq('feature_version', version);
      } else {
        query = query.order('feature_version', { ascending: false }).limit(1);
      }

      // Check if features haven't expired
      query = query.or('expires_at.is.null,expires_at.gt.now()');

      const { data, error } = await query.single();

      if (error || !data) {
        return null;
      }

      return data.features;
    } catch (error) {
      console.error('Error retrieving features:', error);
      return null;
    }
  }

  /**
   * Extract comprehensive supplier features for ML models
   */
  async extractSupplierFeatures(
    supplierId: string,
  ): Promise<SupplierFeatures | null> {
    try {
      // Check if we have cached features (within last hour)
      const cached = await this.getFeatures(
        'supplier',
        supplierId,
        'churn_prediction',
      );
      if (cached) {
        return cached as SupplierFeatures;
      }

      // Extract features using Supabase function
      const { data, error } = await this.supabase.rpc(
        'extract_supplier_features',
        {
          supplier_id: supplierId,
        },
      );

      if (error || !data) {
        console.error('Error extracting supplier features:', error);
        return null;
      }

      const features: SupplierFeatures = {
        supplierId,
        vendorType: data.vendor_type || 'photographer',
        daysSinceLogin: data.days_since_login || 0,
        totalForms: data.total_forms || 0,
        recentForms: data.recent_forms || 0,
        totalClients: data.total_clients || 0,
        activeClients: data.active_clients || 0,
        couplesInvited: data.couples_invited || 0,
        couplesActivated: data.couples_activated || 0,
        avgSessionDuration: data.avg_session_duration || 0,
        activeDaysLastMonth: data.active_days_last_month || 0,
        negativeTickets: data.negative_tickets || 0,
        failedPayments: data.failed_payments || 0,
        competitorMentions: data.competitor_mentions || 0,
        mrr: data.mrr || 0,
        ltv: data.estimated_ltv || 0,
        seasonalityFactor: this.calculateSeasonalityFactor(),
        engagementScore: this.calculateEngagementScore(data),
        viralCoefficient: data.viral_coefficient || 0,
        customerHealthScore: this.calculateHealthScore(data),
      };

      // Cache features for 1 hour
      await this.storeFeatures({
        entity_type: 'supplier',
        entity_id: supplierId,
        feature_set: 'churn_prediction',
        features,
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      });

      return features;
    } catch (error) {
      console.error('Error extracting supplier features:', error);
      return null;
    }
  }

  /**
   * Extract couple features for engagement and satisfaction models
   */
  async extractCoupleFeatures(
    coupleId: string,
  ): Promise<CoupleFeatures | null> {
    try {
      // Check cache first
      const cached = await this.getFeatures(
        'couple',
        coupleId,
        'engagement_prediction',
      );
      if (cached) {
        return cached as CoupleFeatures;
      }

      const { data, error } = await this.supabase.rpc(
        'extract_couple_features',
        {
          couple_id: coupleId,
        },
      );

      if (error || !data) {
        console.error('Error extracting couple features:', error);
        return null;
      }

      const weddingDate = new Date(data.wedding_date);
      const daysTillWedding = Math.ceil(
        (weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );

      const features: CoupleFeatures = {
        coupleId,
        weddingDate: data.wedding_date,
        daysTillWedding,
        totalBudget: data.total_budget || 0,
        budgetSpent: data.budget_spent || 0,
        vendorsConnected: data.vendors_connected || 0,
        tasksCompleted: data.tasks_completed || 0,
        totalTasks: data.total_tasks || 0,
        engagementLevel: this.calculateCoupleEngagement(data),
        lastActivityDays: data.last_activity_days || 0,
        planningStress: this.calculatePlanningStress(daysTillWedding, data),
        satisfactionScore: data.satisfaction_score || 5,
      };

      // Cache for 6 hours
      await this.storeFeatures({
        entity_type: 'couple',
        entity_id: coupleId,
        feature_set: 'engagement_prediction',
        features,
        expires_at: new Date(Date.now() + 21600000).toISOString(), // 6 hours
      });

      return features;
    } catch (error) {
      console.error('Error extracting couple features:', error);
      return null;
    }
  }

  /**
   * Extract transaction features for revenue and LTV models
   */
  async extractTransactionFeatures(
    transactionId: string,
  ): Promise<TransactionFeatures | null> {
    try {
      const { data, error } = await this.supabase.rpc(
        'extract_transaction_features',
        {
          transaction_id: transactionId,
        },
      );

      if (error || !data) {
        console.error('Error extracting transaction features:', error);
        return null;
      }

      const features: TransactionFeatures = {
        transactionId,
        supplierId: data.supplier_id,
        amount: data.amount,
        transactionType: data.transaction_type,
        daysSinceLastTransaction: data.days_since_last_transaction || 0,
        totalTransactionValue: data.total_transaction_value || 0,
        averageTransactionValue: data.average_transaction_value || 0,
        transactionFrequency: data.transaction_frequency || 0,
        seasonalityAdjustment: this.calculateSeasonalityFactor(),
        riskScore: this.calculateTransactionRisk(data),
      };

      // Cache transaction features for 24 hours
      await this.storeFeatures({
        entity_type: 'transaction',
        entity_id: transactionId,
        feature_set: 'revenue_prediction',
        features,
        expires_at: new Date(Date.now() + 86400000).toISOString(), // 24 hours
      });

      return features;
    } catch (error) {
      console.error('Error extracting transaction features:', error);
      return null;
    }
  }

  /**
   * Calculate wedding seasonality factor
   */
  private calculateSeasonalityFactor(): number {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12

    // Wedding season multipliers
    const seasonalMultipliers: Record<number, number> = {
      1: 0.6, // January - off season
      2: 0.7, // February
      3: 0.8, // March
      4: 1.1, // April - spring weddings start
      5: 1.3, // May - popular
      6: 1.6, // June - peak season
      7: 1.4, // July - high season
      8: 1.3, // August - still popular
      9: 1.2, // September - fall weddings
      10: 1.1, // October - fall season
      11: 0.8, // November - slower
      12: 0.6, // December - holiday conflict
    };

    return seasonalMultipliers[month] || 1.0;
  }

  /**
   * Calculate supplier engagement score
   */
  private calculateEngagementScore(data: any): number {
    const loginRecency = Math.max(0, 30 - (data.days_since_login || 30)) / 30;
    const formActivity = Math.min(1, (data.recent_forms || 0) / 5);
    const clientActivity = Math.min(1, (data.active_clients || 0) / 10);
    const sessionQuality = Math.min(1, (data.avg_session_duration || 0) / 1800); // 30 min target

    return (
      (loginRecency * 0.3 +
        formActivity * 0.25 +
        clientActivity * 0.3 +
        sessionQuality * 0.15) *
      10
    );
  }

  /**
   * Calculate customer health score
   */
  private calculateHealthScore(data: any): number {
    const paymentHealth = (data.failed_payments || 0) === 0 ? 1 : 0.5;
    const supportHealth = (data.negative_tickets || 0) === 0 ? 1 : 0.7;
    const usageHealth = Math.min(1, (data.active_days_last_month || 0) / 20);
    const growthHealth =
      (data.couples_activated || 0) > (data.couples_invited || 1) * 0.3
        ? 1
        : 0.6;

    return (
      (paymentHealth * 0.3 +
        supportHealth * 0.2 +
        usageHealth * 0.3 +
        growthHealth * 0.2) *
      10
    );
  }

  /**
   * Calculate couple engagement level
   */
  private calculateCoupleEngagement(data: any): number {
    const taskCompletion =
      (data.total_tasks || 1) > 0
        ? (data.tasks_completed || 0) / data.total_tasks
        : 0;
    const vendorEngagement = Math.min(1, (data.vendors_connected || 0) / 8); // Target 8 vendors
    const budgetEngagement =
      (data.total_budget || 1) > 0
        ? Math.min(1, (data.budget_spent || 0) / data.total_budget)
        : 0;
    const activityRecency = Math.max(0, 7 - (data.last_activity_days || 7)) / 7;

    return (
      (taskCompletion * 0.3 +
        vendorEngagement * 0.25 +
        budgetEngagement * 0.25 +
        activityRecency * 0.2) *
      10
    );
  }

  /**
   * Calculate planning stress level
   */
  private calculatePlanningStress(daysTillWedding: number, data: any): number {
    const timeStress =
      daysTillWedding < 30 ? 1 : daysTillWedding < 90 ? 0.7 : 0.3;
    const budgetStress =
      (data.total_budget || 1) > 0
        ? Math.min(1, (data.budget_spent || 0) / data.total_budget)
        : 0;
    const taskStress =
      (data.total_tasks || 1) > 0
        ? 1 - (data.tasks_completed || 0) / data.total_tasks
        : 0.5;

    return (timeStress * 0.4 + budgetStress * 0.3 + taskStress * 0.3) * 10;
  }

  /**
   * Calculate transaction risk score
   */
  private calculateTransactionRisk(data: any): number {
    const frequencyRisk = (data.transaction_frequency || 0) < 1 ? 0.8 : 0.2;
    const amountRisk =
      data.amount > (data.average_transaction_value || 0) * 3 ? 0.6 : 0.2;
    const recencyRisk =
      (data.days_since_last_transaction || 0) > 90 ? 0.7 : 0.1;

    return (frequencyRisk * 0.4 + amountRisk * 0.3 + recencyRisk * 0.3) * 10;
  }

  /**
   * Clean expired features from the store
   */
  async cleanExpiredFeatures(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('ml_feature_store')
        .delete()
        .lt('expires_at', new Date().toISOString());

      return !error;
    } catch (error) {
      console.error('Error cleaning expired features:', error);
      return false;
    }
  }

  /**
   * Get feature store statistics
   */
  async getFeatureStoreStats(): Promise<{
    totalFeatures: number;
    byEntityType: Record<string, number>;
    byFeatureSet: Record<string, number>;
    expiredFeatures: number;
  } | null> {
    try {
      const { data: stats, error } = await this.supabase.rpc(
        'get_feature_store_stats',
      );

      if (error || !stats) {
        return null;
      }

      return stats;
    } catch (error) {
      console.error('Error getting feature store stats:', error);
      return null;
    }
  }
}

export default FeatureStore;
