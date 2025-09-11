/**
 * Advanced Budget Mobile System
 * Team D - Round 2 WS-163 Implementation
 *
 * Comprehensive mobile budget management for wedding planning with real-time collaboration,
 * smart analytics, and advanced mobile features.
 */

import { createClient } from '@supabase/supabase-js';
import { backgroundSync, weddingSync } from './background-sync';

// ==================== TYPES AND INTERFACES ====================

export interface WeddingBudget {
  id: string;
  wedding_id: string;
  total_budget: number;
  allocated_budget: number;
  spent_amount: number;
  remaining_budget: number;
  currency: string;
  created_by: string;
  last_updated: string;
  last_updated_by: string;
  version: number;
  categories: BudgetCategory[];
  collaborators: BudgetCollaborator[];
  milestones: BudgetMilestone[];
}

export interface BudgetCategory {
  id: string;
  name: string;
  allocated_amount: number;
  spent_amount: number;
  percentage_of_total: number;
  priority: CategoryPriority;
  color: string;
  icon: string;
  vendor_ids: string[];
  items: BudgetItem[];
}

export interface BudgetItem {
  id: string;
  category_id: string;
  name: string;
  description: string;
  estimated_cost: number;
  actual_cost?: number;
  vendor_id?: string;
  due_date?: string;
  status: ItemStatus;
  payment_status: PaymentStatus;
  receipts: Receipt[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetCollaborator {
  user_id: string;
  role: CollaboratorRole;
  permissions: CollaboratorPermissions;
  last_active: string;
  is_online: boolean;
}

export interface BudgetMilestone {
  id: string;
  name: string;
  target_date: string;
  target_amount: number;
  achieved_amount: number;
  is_achieved: boolean;
  category_breakdown: { [categoryId: string]: number };
}

export interface SpendingPattern {
  category_id: string;
  category_name: string;
  average_monthly_spend: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality_factor: number;
  predicted_total: number;
  confidence_score: number;
  anomalies: SpendingAnomaly[];
}

export interface SpendingAnomaly {
  date: string;
  amount: number;
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  auto_flagged: boolean;
}

export interface BudgetRecommendation {
  type: RecommendationType;
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number;
  category_id?: string;
  suggested_amount?: number;
  action_required: boolean;
  expires_at?: string;
}

export interface Receipt {
  id: string;
  image_url: string;
  total_amount: number;
  vendor_name: string;
  date: string;
  currency: string;
  items: ReceiptItem[];
  ocr_data: OCRData;
  verification_status: 'pending' | 'verified' | 'disputed';
}

export interface ReceiptItem {
  description: string;
  amount: number;
  category_suggestion?: string;
  confidence_score: number;
}

export interface OCRData {
  raw_text: string;
  extracted_data: {
    vendor_name: string;
    date: string;
    total: number;
    items: ReceiptItem[];
  };
  confidence_score: number;
  manual_corrections: string[];
}

export enum CategoryPriority {
  CRITICAL = 1, // Venue, catering
  HIGH = 2, // Photography, music
  MEDIUM = 3, // Decorations, favors
  LOW = 4, // Miscellaneous
}

export enum ItemStatus {
  PLANNED = 'planned',
  QUOTED = 'quoted',
  BOOKED = 'booked',
  PAID = 'paid',
  COMPLETED = 'completed',
}

export enum PaymentStatus {
  PENDING = 'pending',
  DEPOSIT_PAID = 'deposit_paid',
  PARTIAL_PAID = 'partial_paid',
  FULLY_PAID = 'fully_paid',
  OVERDUE = 'overdue',
}

export enum CollaboratorRole {
  OWNER = 'owner',
  EDITOR = 'editor',
  VIEWER = 'viewer',
  ADVISOR = 'advisor',
}

export interface CollaboratorPermissions {
  can_edit_budget: boolean;
  can_add_items: boolean;
  can_delete_items: boolean;
  can_approve_expenses: boolean;
  can_invite_collaborators: boolean;
  can_export_data: boolean;
}

export enum RecommendationType {
  BUDGET_INCREASE = 'budget_increase',
  BUDGET_DECREASE = 'budget_decrease',
  CATEGORY_REALLOCATION = 'category_reallocation',
  VENDOR_SUGGESTION = 'vendor_suggestion',
  PAYMENT_TIMING = 'payment_timing',
  COST_OPTIMIZATION = 'cost_optimization',
  MILESTONE_ADJUSTMENT = 'milestone_adjustment',
}

// ==================== ADVANCED BUDGET MANAGER ====================

export class AdvancedBudgetManager {
  private static instance: AdvancedBudgetManager;
  private supabase: any;
  private currentBudget: WeddingBudget | null = null;
  private realtimeSubscription: any = null;
  private collaboratorStates: Map<string, any> = new Map();
  private localChanges: Map<string, any> = new Map();
  private conflictResolver: BudgetConflictResolver;
  private analyticsEngine: SpendingAnalyticsEngine;
  private recommendationEngine: BudgetRecommendationEngine;

  private constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    this.conflictResolver = new BudgetConflictResolver();
    this.analyticsEngine = new SpendingAnalyticsEngine();
    this.recommendationEngine = new BudgetRecommendationEngine();
  }

  public static getInstance(): AdvancedBudgetManager {
    if (!AdvancedBudgetManager.instance) {
      AdvancedBudgetManager.instance = new AdvancedBudgetManager();
    }
    return AdvancedBudgetManager.instance;
  }

  // ==================== BUDGET LOADING AND INITIALIZATION ====================

  public async loadBudget(weddingId: string): Promise<WeddingBudget> {
    try {
      const { data, error } = await this.supabase
        .from('wedding_budgets')
        .select(
          `
          *,
          categories:budget_categories(*),
          collaborators:budget_collaborators(*),
          milestones:budget_milestones(*)
        `,
        )
        .eq('wedding_id', weddingId)
        .single();

      if (error) throw error;

      this.currentBudget = data;
      await this.setupRealtimeSubscription(weddingId);
      await this.loadCollaboratorStates();

      return data;
    } catch (error) {
      console.error('Failed to load budget:', error);
      throw error;
    }
  }

  private async setupRealtimeSubscription(weddingId: string): Promise<void> {
    if (this.realtimeSubscription) {
      this.realtimeSubscription.unsubscribe();
    }

    this.realtimeSubscription = this.supabase
      .channel(`budget_${weddingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wedding_budgets',
          filter: `wedding_id=eq.${weddingId}`,
        },
        (payload: any) => {
          this.handleRealtimeUpdate(payload);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budget_categories',
          filter: `wedding_id=eq.${weddingId}`,
        },
        (payload: any) => {
          this.handleCategoryUpdate(payload);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budget_items',
          filter: `wedding_id=eq.${weddingId}`,
        },
        (payload: any) => {
          this.handleItemUpdate(payload);
        },
      )
      .on('presence', { event: 'sync' }, () => {
        this.updateCollaboratorPresence();
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
        this.handleCollaboratorJoin(key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
        this.handleCollaboratorLeave(key, leftPresences);
      })
      .subscribe();
  }

  // ==================== REAL-TIME COLLABORATION ====================

  private async loadCollaboratorStates(): Promise<void> {
    if (!this.currentBudget) return;

    for (const collaborator of this.currentBudget.collaborators) {
      const state = await this.getCollaboratorState(collaborator.user_id);
      this.collaboratorStates.set(collaborator.user_id, state);
    }
  }

  private async getCollaboratorState(userId: string): Promise<any> {
    return {
      userId,
      currentCategory: null,
      currentItem: null,
      isEditing: false,
      cursor: null,
      lastActivity: Date.now(),
    };
  }

  private handleRealtimeUpdate(payload: any): void {
    console.log('Budget update received:', payload);

    if (payload.eventType === 'UPDATE' && this.currentBudget) {
      const incomingBudget = payload.new;

      // Check for conflicts with local changes
      if (this.hasLocalConflicts(incomingBudget)) {
        this.resolveConflicts(incomingBudget);
      } else {
        this.mergeBudgetUpdate(incomingBudget);
      }
    }
  }

  private handleCategoryUpdate(payload: any): void {
    console.log('Category update received:', payload);

    if (this.currentBudget) {
      switch (payload.eventType) {
        case 'INSERT':
          this.currentBudget.categories.push(payload.new);
          break;
        case 'UPDATE':
          this.updateCategory(payload.new);
          break;
        case 'DELETE':
          this.removeCategory(payload.old.id);
          break;
      }

      this.recalculateBudgetTotals();
      this.notifySubscribers('category_updated', payload);
    }
  }

  private handleItemUpdate(payload: any): void {
    console.log('Item update received:', payload);

    if (this.currentBudget) {
      switch (payload.eventType) {
        case 'INSERT':
          this.addItemToCategory(payload.new);
          break;
        case 'UPDATE':
          this.updateItem(payload.new);
          break;
        case 'DELETE':
          this.removeItem(payload.old.id);
          break;
      }

      this.recalculateBudgetTotals();
      this.notifySubscribers('item_updated', payload);
    }
  }

  private hasLocalConflicts(incomingBudget: WeddingBudget): boolean {
    if (!this.currentBudget) return false;

    // Check version conflicts
    if (incomingBudget.version <= this.currentBudget.version) {
      return true;
    }

    // Check for conflicting local changes
    return this.localChanges.size > 0;
  }

  private async resolveConflicts(incomingBudget: WeddingBudget): Promise<void> {
    const resolution = await this.conflictResolver.resolve(
      this.currentBudget!,
      incomingBudget,
      Array.from(this.localChanges.values()),
    );

    this.currentBudget = resolution.mergedBudget;
    this.localChanges.clear();

    // Sync resolved changes
    await this.saveBudget();

    this.notifySubscribers('conflict_resolved', resolution);
  }

  // ==================== BUDGET OPERATIONS ====================

  public async updateBudgetTotal(newTotal: number): Promise<void> {
    if (!this.currentBudget) throw new Error('No budget loaded');

    const oldTotal = this.currentBudget.total_budget;
    this.currentBudget.total_budget = newTotal;
    this.currentBudget.last_updated = new Date().toISOString();
    this.currentBudget.version++;

    // Recalculate category allocations proportionally
    if (oldTotal > 0) {
      const ratio = newTotal / oldTotal;
      this.currentBudget.categories.forEach((category) => {
        category.allocated_amount *= ratio;
      });
    }

    this.trackLocalChange('budget_total', { oldTotal, newTotal });

    // Queue for background sync
    weddingSync.syncBudgetUpdate(
      this.currentBudget.wedding_id,
      this.currentBudget.last_updated_by,
      this.currentBudget,
    );

    await this.saveBudget();
    this.notifySubscribers('budget_total_updated', { oldTotal, newTotal });
  }

  public async addCategory(
    categoryData: Partial<BudgetCategory>,
  ): Promise<BudgetCategory> {
    if (!this.currentBudget) throw new Error('No budget loaded');

    const newCategory: BudgetCategory = {
      id: `category_${Date.now()}`,
      name: categoryData.name || '',
      allocated_amount: categoryData.allocated_amount || 0,
      spent_amount: 0,
      percentage_of_total:
        ((categoryData.allocated_amount || 0) /
          this.currentBudget.total_budget) *
        100,
      priority: categoryData.priority || CategoryPriority.MEDIUM,
      color: categoryData.color || this.generateCategoryColor(),
      icon:
        categoryData.icon || this.generateCategoryIcon(categoryData.name || ''),
      vendor_ids: [],
      items: [],
    };

    this.currentBudget.categories.push(newCategory);
    this.currentBudget.allocated_budget += newCategory.allocated_amount;
    this.currentBudget.version++;

    this.trackLocalChange('add_category', newCategory);
    await this.saveBudget();
    this.notifySubscribers('category_added', newCategory);

    return newCategory;
  }

  public async updateCategory(
    categoryId: string,
    updates: Partial<BudgetCategory>,
  ): Promise<void> {
    if (!this.currentBudget) throw new Error('No budget loaded');

    const category = this.currentBudget.categories.find(
      (c) => c.id === categoryId,
    );
    if (!category) throw new Error('Category not found');

    const oldCategory = { ...category };
    Object.assign(category, updates);

    // Recalculate percentage
    category.percentage_of_total =
      (category.allocated_amount / this.currentBudget.total_budget) * 100;

    this.currentBudget.version++;

    this.trackLocalChange('update_category', {
      categoryId,
      oldCategory,
      newCategory: category,
    });
    await this.saveBudget();
    this.notifySubscribers('category_updated', { categoryId, updates });
  }

  public async addBudgetItem(
    categoryId: string,
    itemData: Partial<BudgetItem>,
  ): Promise<BudgetItem> {
    if (!this.currentBudget) throw new Error('No budget loaded');

    const category = this.currentBudget.categories.find(
      (c) => c.id === categoryId,
    );
    if (!category) throw new Error('Category not found');

    const newItem: BudgetItem = {
      id: `item_${Date.now()}`,
      category_id: categoryId,
      name: itemData.name || '',
      description: itemData.description || '',
      estimated_cost: itemData.estimated_cost || 0,
      actual_cost: itemData.actual_cost,
      vendor_id: itemData.vendor_id,
      due_date: itemData.due_date,
      status: itemData.status || ItemStatus.PLANNED,
      payment_status: itemData.payment_status || PaymentStatus.PENDING,
      receipts: [],
      notes: itemData.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    category.items.push(newItem);
    this.currentBudget.version++;

    this.trackLocalChange('add_item', newItem);
    await this.saveBudget();
    this.notifySubscribers('item_added', { categoryId, item: newItem });

    return newItem;
  }

  public async updateBudgetItem(
    itemId: string,
    updates: Partial<BudgetItem>,
  ): Promise<void> {
    if (!this.currentBudget) throw new Error('No budget loaded');

    const { category, item } = this.findItem(itemId);
    if (!item) throw new Error('Item not found');

    const oldItem = { ...item };
    Object.assign(item, updates);
    item.updated_at = new Date().toISOString();

    // Update category totals if cost changed
    if (
      updates.actual_cost !== undefined ||
      updates.estimated_cost !== undefined
    ) {
      this.recalculateCategoryTotals(category);
    }

    this.currentBudget.version++;

    this.trackLocalChange('update_item', { itemId, oldItem, newItem: item });
    await this.saveBudget();
    this.notifySubscribers('item_updated', { itemId, updates });
  }

  // ==================== ANALYTICS AND RECOMMENDATIONS ====================

  public async getSpendingAnalytics(): Promise<SpendingPattern[]> {
    if (!this.currentBudget) throw new Error('No budget loaded');

    return await this.analyticsEngine.analyzeSpendingPatterns(
      this.currentBudget,
    );
  }

  public async getBudgetRecommendations(): Promise<BudgetRecommendation[]> {
    if (!this.currentBudget) throw new Error('No budget loaded');

    const patterns = await this.getSpendingAnalytics();
    return await this.recommendationEngine.generateRecommendations(
      this.currentBudget,
      patterns,
    );
  }

  public async predictFinalCosts(): Promise<{ [categoryId: string]: number }> {
    const patterns = await this.getSpendingAnalytics();
    const predictions: { [categoryId: string]: number } = {};

    patterns.forEach((pattern) => {
      predictions[pattern.category_id] = pattern.predicted_total;
    });

    return predictions;
  }

  public async getSpendingAnomalies(): Promise<SpendingAnomaly[]> {
    if (!this.currentBudget) throw new Error('No budget loaded');

    const patterns = await this.getSpendingAnalytics();
    return patterns.flatMap((pattern) => pattern.anomalies);
  }

  // ==================== UTILITY METHODS ====================

  private findItem(itemId: string): {
    category: BudgetCategory;
    item: BudgetItem | undefined;
  } {
    if (!this.currentBudget) throw new Error('No budget loaded');

    for (const category of this.currentBudget.categories) {
      const item = category.items.find((i) => i.id === itemId);
      if (item) {
        return { category, item };
      }
    }

    throw new Error('Item not found');
  }

  private recalculateBudgetTotals(): void {
    if (!this.currentBudget) return;

    this.currentBudget.allocated_budget = this.currentBudget.categories.reduce(
      (sum, cat) => sum + cat.allocated_amount,
      0,
    );

    this.currentBudget.spent_amount = this.currentBudget.categories.reduce(
      (sum, cat) => sum + cat.spent_amount,
      0,
    );

    this.currentBudget.remaining_budget =
      this.currentBudget.total_budget - this.currentBudget.spent_amount;
  }

  private recalculateCategoryTotals(category: BudgetCategory): void {
    category.spent_amount = category.items.reduce(
      (sum, item) => sum + (item.actual_cost || 0),
      0,
    );
  }

  private updateCategory(categoryData: BudgetCategory): void {
    if (!this.currentBudget) return;

    const index = this.currentBudget.categories.findIndex(
      (c) => c.id === categoryData.id,
    );
    if (index !== -1) {
      this.currentBudget.categories[index] = categoryData;
    }
  }

  private removeCategory(categoryId: string): void {
    if (!this.currentBudget) return;

    this.currentBudget.categories = this.currentBudget.categories.filter(
      (c) => c.id !== categoryId,
    );
  }

  private addItemToCategory(itemData: BudgetItem): void {
    if (!this.currentBudget) return;

    const category = this.currentBudget.categories.find(
      (c) => c.id === itemData.category_id,
    );

    if (category) {
      category.items.push(itemData);
      this.recalculateCategoryTotals(category);
    }
  }

  private updateItem(itemData: BudgetItem): void {
    const { category, item } = this.findItem(itemData.id);
    if (item) {
      Object.assign(item, itemData);
      this.recalculateCategoryTotals(category);
    }
  }

  private removeItem(itemId: string): void {
    const { category } = this.findItem(itemId);
    category.items = category.items.filter((i) => i.id !== itemId);
    this.recalculateCategoryTotals(category);
  }

  private generateCategoryColor(): string {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FFEAA7',
      '#DDA0DD',
      '#98D8C8',
      '#F7DC6F',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private generateCategoryIcon(name: string): string {
    const iconMap: { [key: string]: string } = {
      venue: '🏛️',
      catering: '🍽️',
      photography: '📸',
      music: '🎵',
      flowers: '💐',
      decorations: '🎨',
      transportation: '🚗',
      attire: '👗',
      rings: '💍',
      honeymoon: '✈️',
    };

    const lowerName = name.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (lowerName.includes(key)) {
        return icon;
      }
    }

    return '💰';
  }

  private trackLocalChange(type: string, data: any): void {
    this.localChanges.set(Date.now().toString(), {
      type,
      data,
      timestamp: Date.now(),
    });
  }

  private async saveBudget(): Promise<void> {
    if (!this.currentBudget) return;

    const { error } = await this.supabase
      .from('wedding_budgets')
      .update(this.currentBudget)
      .eq('id', this.currentBudget.id);

    if (error) {
      console.error('Failed to save budget:', error);
      throw error;
    }
  }

  private mergeBudgetUpdate(incomingBudget: WeddingBudget): void {
    // Simple merge - in production, this would be more sophisticated
    this.currentBudget = incomingBudget;
  }

  private handleCollaboratorJoin(key: string, newPresences: any): void {
    console.log('Collaborator joined:', key, newPresences);
    this.notifySubscribers('collaborator_joined', {
      key,
      presences: newPresences,
    });
  }

  private handleCollaboratorLeave(key: string, leftPresences: any): void {
    console.log('Collaborator left:', key, leftPresences);
    this.notifySubscribers('collaborator_left', {
      key,
      presences: leftPresences,
    });
  }

  private updateCollaboratorPresence(): void {
    // Update presence state
    this.notifySubscribers('presence_updated', this.collaboratorStates);
  }

  private subscribers: Map<string, (event: string, data: any) => void> =
    new Map();

  public subscribe(
    id: string,
    callback: (event: string, data: any) => void,
  ): void {
    this.subscribers.set(id, callback);
  }

  public unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }

  private notifySubscribers(event: string, data: any): void {
    this.subscribers.forEach((callback) => callback(event, data));
  }

  public destroy(): void {
    if (this.realtimeSubscription) {
      this.realtimeSubscription.unsubscribe();
    }
    this.subscribers.clear();
    this.localChanges.clear();
    this.collaboratorStates.clear();
  }
}

// ==================== CONFLICT RESOLVER ====================

class BudgetConflictResolver {
  async resolve(
    localBudget: WeddingBudget,
    remoteBudget: WeddingBudget,
    localChanges: any[],
  ): Promise<{ mergedBudget: WeddingBudget; conflicts: any[] }> {
    const conflicts: any[] = [];
    const mergedBudget = { ...remoteBudget };

    // Resolve based on timestamps and change types
    for (const change of localChanges) {
      const conflict = await this.resolveChange(mergedBudget, change);
      if (conflict) {
        conflicts.push(conflict);
      }
    }

    return { mergedBudget, conflicts };
  }

  private async resolveChange(
    budget: WeddingBudget,
    change: any,
  ): Promise<any> {
    // Wedding-specific conflict resolution logic
    switch (change.type) {
      case 'budget_total':
        // Always prefer the higher total to avoid under-budgeting
        if (change.data.newTotal > budget.total_budget) {
          budget.total_budget = change.data.newTotal;
        }
        break;

      case 'add_category':
        // Add if doesn't exist
        if (!budget.categories.find((c) => c.id === change.data.id)) {
          budget.categories.push(change.data);
        }
        break;

      case 'update_item':
        // Prefer higher actual costs for conservative budgeting
        const item = this.findItemInBudget(budget, change.data.itemId);
        if (item && change.data.newItem.actual_cost > item.actual_cost) {
          item.actual_cost = change.data.newItem.actual_cost;
        }
        break;
    }

    return null; // No conflict
  }

  private findItemInBudget(
    budget: WeddingBudget,
    itemId: string,
  ): BudgetItem | undefined {
    for (const category of budget.categories) {
      const item = category.items.find((i) => i.id === itemId);
      if (item) return item;
    }
    return undefined;
  }
}

// ==================== ANALYTICS ENGINE ====================

class SpendingAnalyticsEngine {
  async analyzeSpendingPatterns(
    budget: WeddingBudget,
  ): Promise<SpendingPattern[]> {
    const patterns: SpendingPattern[] = [];

    for (const category of budget.categories) {
      const pattern = await this.analyzeCategoryPattern(category, budget);
      patterns.push(pattern);
    }

    return patterns;
  }

  private async analyzeCategoryPattern(
    category: BudgetCategory,
    budget: WeddingBudget,
  ): Promise<SpendingPattern> {
    // Calculate spending metrics
    const totalSpent = category.spent_amount;
    const averageItemCost =
      category.items.length > 0 ? totalSpent / category.items.length : 0;

    // Analyze trend
    const trend = this.calculateTrend(category.items);

    // Predict final costs
    const predictedTotal = this.predictFinalCost(category);

    // Detect anomalies
    const anomalies = this.detectAnomalies(category.items);

    return {
      category_id: category.id,
      category_name: category.name,
      average_monthly_spend: averageItemCost,
      trend,
      seasonality_factor: 1.0, // Simplified
      predicted_total: predictedTotal,
      confidence_score: 0.85, // Simplified
      anomalies,
    };
  }

  private calculateTrend(
    items: BudgetItem[],
  ): 'increasing' | 'decreasing' | 'stable' {
    if (items.length < 2) return 'stable';

    const recentItems = items
      .filter((item) => item.actual_cost)
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )
      .slice(0, 5);

    if (recentItems.length < 2) return 'stable';

    const firstHalf = recentItems.slice(0, Math.floor(recentItems.length / 2));
    const secondHalf = recentItems.slice(Math.floor(recentItems.length / 2));

    const firstAvg =
      firstHalf.reduce((sum, item) => sum + (item.actual_cost || 0), 0) /
      firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, item) => sum + (item.actual_cost || 0), 0) /
      secondHalf.length;

    const changePercentage = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (changePercentage > 10) return 'increasing';
    if (changePercentage < -10) return 'decreasing';
    return 'stable';
  }

  private predictFinalCost(category: BudgetCategory): number {
    const paidItems = category.items.filter((item) => item.actual_cost);
    const unpaidItems = category.items.filter((item) => !item.actual_cost);

    if (paidItems.length === 0) {
      return category.allocated_amount;
    }

    const averageCostPerItem =
      paidItems.reduce((sum, item) => sum + (item.actual_cost || 0), 0) /
      paidItems.length;
    const predictedUnpaidCosts = unpaidItems.reduce(
      (sum, item) => sum + (item.estimated_cost || averageCostPerItem),
      0,
    );

    return category.spent_amount + predictedUnpaidCosts;
  }

  private detectAnomalies(items: BudgetItem[]): SpendingAnomaly[] {
    const anomalies: SpendingAnomaly[] = [];
    const actualCosts = items
      .filter((item) => item.actual_cost)
      .map((item) => item.actual_cost!);

    if (actualCosts.length < 3) return anomalies;

    const mean =
      actualCosts.reduce((sum, cost) => sum + cost, 0) / actualCosts.length;
    const stdDev = Math.sqrt(
      actualCosts.reduce((sum, cost) => sum + Math.pow(cost - mean, 2), 0) /
        actualCosts.length,
    );

    items.forEach((item) => {
      if (item.actual_cost) {
        const zScore = Math.abs((item.actual_cost - mean) / stdDev);

        if (zScore > 2) {
          // More than 2 standard deviations
          anomalies.push({
            date: item.updated_at,
            amount: item.actual_cost,
            category: item.category_id,
            description: `${item.name} cost significantly ${item.actual_cost > mean ? 'higher' : 'lower'} than average`,
            severity: zScore > 3 ? 'high' : 'medium',
            auto_flagged: true,
          });
        }
      }
    });

    return anomalies;
  }
}

// ==================== RECOMMENDATION ENGINE ====================

class BudgetRecommendationEngine {
  async generateRecommendations(
    budget: WeddingBudget,
    patterns: SpendingPattern[],
  ): Promise<BudgetRecommendation[]> {
    const recommendations: BudgetRecommendation[] = [];

    // Check for budget overruns
    for (const pattern of patterns) {
      if (
        pattern.predicted_total >
        this.getCategoryAllocation(budget, pattern.category_id)
      ) {
        recommendations.push({
          type: RecommendationType.BUDGET_INCREASE,
          title: `${pattern.category_name} Budget Insufficient`,
          description: `Predicted total (${pattern.predicted_total}) exceeds allocated budget. Consider increasing allocation.`,
          impact: 'negative',
          confidence: pattern.confidence_score,
          category_id: pattern.category_id,
          suggested_amount: pattern.predicted_total,
          action_required: true,
        });
      }
    }

    // Check for underutilized categories
    for (const pattern of patterns) {
      const allocation = this.getCategoryAllocation(
        budget,
        pattern.category_id,
      );
      if (pattern.predicted_total < allocation * 0.8) {
        recommendations.push({
          type: RecommendationType.CATEGORY_REALLOCATION,
          title: `${pattern.category_name} Budget Underutilized`,
          description: `You may have ${allocation - pattern.predicted_total} available to reallocate to other categories.`,
          impact: 'positive',
          confidence: pattern.confidence_score,
          category_id: pattern.category_id,
          suggested_amount: allocation - pattern.predicted_total,
          action_required: false,
        });
      }
    }

    // Overall budget health
    const totalPredicted = patterns.reduce(
      (sum, p) => sum + p.predicted_total,
      0,
    );
    if (totalPredicted > budget.total_budget) {
      recommendations.push({
        type: RecommendationType.BUDGET_INCREASE,
        title: 'Overall Budget Insufficient',
        description: `Total predicted costs (${totalPredicted}) exceed your budget. Consider increasing total budget or reducing scope.`,
        impact: 'negative',
        confidence: 0.9,
        suggested_amount: totalPredicted,
        action_required: true,
      });
    }

    return recommendations;
  }

  private getCategoryAllocation(
    budget: WeddingBudget,
    categoryId: string,
  ): number {
    const category = budget.categories.find((c) => c.id === categoryId);
    return category?.allocated_amount || 0;
  }
}

// ==================== SINGLETON EXPORTS ====================

export const advancedBudgetManager = AdvancedBudgetManager.getInstance();
export default AdvancedBudgetManager;
