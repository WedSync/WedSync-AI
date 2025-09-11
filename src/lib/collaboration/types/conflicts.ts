/**
 * WS-342 Real-Time Wedding Collaboration - Conflicts Types
 * Team B Backend Development - Conflict resolution and data synchronization
 */

import { CollaborationEvent, ResolutionStrategy } from './collaboration';

// Data Synchronization
export interface DataSynchronizationService {
  syncData(
    weddingId: string,
    dataType: string,
    operation: SyncOperation,
  ): Promise<SyncResult>;
  resolveConflicts(conflicts: DataConflict[]): Promise<ConflictResolution[]>;
  applyOperationalTransform(operation: OTOperation): Promise<TransformResult>;

  // Consistency management
  ensureConsistency(weddingId: string): Promise<ConsistencyReport>;
  repairInconsistencies(
    inconsistencies: DataInconsistency[],
  ): Promise<RepairResult>;

  // Wedding-specific sync operations
  syncWeddingTimeline(
    weddingId: string,
    changes: TimelineSyncOperation[],
  ): Promise<SyncResult>;
  syncBudgetData(
    weddingId: string,
    changes: BudgetSyncOperation[],
  ): Promise<SyncResult>;
  syncVendorData(
    weddingId: string,
    changes: VendorSyncOperation[],
  ): Promise<SyncResult>;
  syncGuestData(
    weddingId: string,
    changes: GuestSyncOperation[],
  ): Promise<SyncResult>;
}

export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  target: DataTarget;
  data: any;
  clientId: string;
  timestamp: Date;
  dependencies: string[];
  priority: OperationPriority;
  metadata: SyncMetadata;
}

export type SyncOperationType =
  | 'insert'
  | 'update'
  | 'delete'
  | 'move'
  | 'merge'
  | 'split';

export interface DataTarget {
  entity: string;
  entityId: string;
  field?: string;
  index?: number;
  subPath?: string;
}

export type OperationPriority =
  | 'low'
  | 'normal'
  | 'high'
  | 'critical'
  | 'wedding_day';

export interface SyncMetadata {
  source: SyncSource;
  userRole: string;
  deviceType: string;
  networkCondition: NetworkCondition;
  retryCount: number;
  originalTimestamp: Date;
}

export type SyncSource =
  | 'manual'
  | 'automatic'
  | 'import'
  | 'integration'
  | 'migration';
export type NetworkCondition =
  | 'excellent'
  | 'good'
  | 'fair'
  | 'poor'
  | 'offline';

export interface SyncResult {
  operationId: string;
  status: SyncStatus;
  appliedAt: Date;
  conflictsDetected: DataConflict[];
  transformationsApplied: OTOperation[];
  warnings: SyncWarning[];
  rollbackAvailable: boolean;
}

export type SyncStatus =
  | 'applied'
  | 'conflicted'
  | 'rejected'
  | 'deferred'
  | 'failed';

export interface SyncWarning {
  type: WarningType;
  message: string;
  suggestedAction: string;
  severity: WarningSeverity;
}

export type WarningType =
  | 'potential_conflict'
  | 'data_loss_risk'
  | 'performance_impact'
  | 'business_rule_violation'
  | 'temporal_inconsistency';

export type WarningSeverity = 'info' | 'caution' | 'warning' | 'critical';

// Conflict Resolution Engine
export interface ConflictResolutionEngine {
  detectConflicts(operations: SyncOperation[]): Promise<DataConflict[]>;
  resolveConflict(
    conflict: DataConflict,
    strategy: ResolutionStrategy,
  ): Promise<ConflictResolution>;
  applyResolution(resolution: ConflictResolution): Promise<ResolutionResult>;

  // Wedding-aware conflict resolution
  getWeddingPriority(conflict: DataConflict): Promise<PriorityLevel>;
  resolveVendorConflicts(conflict: VendorConflict): Promise<VendorResolution>;
  resolveTimelineConflicts(
    conflict: TimelineConflict,
  ): Promise<TimelineResolution>;
  resolveBudgetConflicts(conflict: BudgetConflict): Promise<BudgetResolution>;
}

export interface DataConflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  conflictingOperations: SyncOperation[];
  affectedData: ConflictedData;
  detectedAt: Date;
  weddingContext: WeddingConflictContext;
  autoResolvable: boolean;
  suggestedStrategy: ResolutionStrategy;
}

export type ConflictType =
  | 'concurrent_modification'
  | 'delete_update_conflict'
  | 'unique_constraint_violation'
  | 'foreign_key_violation'
  | 'business_rule_conflict'
  | 'temporal_conflict'
  | 'permission_conflict'
  | 'capacity_conflict'
  | 'resource_allocation_conflict';

export type ConflictSeverity =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'blocking';

export interface ConflictedData {
  entity: string;
  entityId: string;
  field: string;
  currentValue: any;
  conflictingValues: ConflictingValue[];
  lastKnownGoodValue?: any;
  dataType: DataType;
}

export interface ConflictingValue {
  value: any;
  source: ConflictSource;
  timestamp: Date;
  confidence: number;
  metadata: ValueMetadata;
}

export interface ConflictSource {
  userId: string;
  clientId: string;
  operationId: string;
  userRole: string;
  authority: AuthorityLevel;
}

export type AuthorityLevel = 'low' | 'medium' | 'high' | 'absolute';

export interface ValueMetadata {
  editDuration: number;
  changeFrequency: number;
  validationStatus: ValidationStatus;
  businessImpact: BusinessImpact;
}

export type ValidationStatus = 'valid' | 'warning' | 'error' | 'unknown';
export type BusinessImpact =
  | 'minimal'
  | 'moderate'
  | 'significant'
  | 'critical';

export type DataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object'
  | 'currency'
  | 'duration'
  | 'location'
  | 'contact';

export interface WeddingConflictContext {
  weddingId: string;
  weddingDate: Date;
  daysUntilWedding: number;
  weddingPhase: WeddingPhase;
  criticalPath: boolean;
  affectedStakeholders: string[];
  businessImpact: WeddingBusinessImpact;
}

export type WeddingPhase =
  | 'early_planning'
  | 'vendor_selection'
  | 'detail_finalization'
  | 'final_preparations'
  | 'wedding_week'
  | 'wedding_day'
  | 'post_wedding';

export interface WeddingBusinessImpact {
  financial: number;
  timeline: TimelineImpact;
  guest: GuestImpact;
  vendor: VendorImpact;
  reputation: ReputationImpact;
}

export interface TimelineImpact {
  delayMinutes: number;
  cascadingEffects: number;
  criticalPathAffected: boolean;
  recoveryTime: number;
}

export interface GuestImpact {
  affectedGuests: number;
  notificationRequired: boolean;
  rsvpChanges: number;
  accommodationImpact: boolean;
}

export interface VendorImpact {
  affectedVendors: number;
  contractChanges: number;
  financialImplications: number;
  serviceDeliveryRisk: RiskLevel;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'severe';

export interface ReputationImpact {
  publicVisibility: VisibilityLevel;
  stakeholderConcern: ConcernLevel;
  recoveryComplexity: ComplexityLevel;
}

export type VisibilityLevel = 'private' | 'limited' | 'public' | 'viral';
export type ConcernLevel = 'none' | 'minor' | 'moderate' | 'major' | 'severe';
export type ComplexityLevel =
  | 'simple'
  | 'moderate'
  | 'complex'
  | 'extremely_complex';

// Wedding-specific conflict types
export interface VendorConflict extends DataConflict {
  vendorData: {
    vendorId: string;
    conflictType: VendorConflictType;
    services: string[];
    timeSlots: ConflictingTimeSlot[];
    resources: ConflictingResource[];
  };
}

export type VendorConflictType =
  | 'double_booking'
  | 'service_overlap'
  | 'resource_conflict'
  | 'timeline_clash'
  | 'location_conflict'
  | 'dependency_violation';

export interface ConflictingTimeSlot {
  start: Date;
  end: Date;
  service: string;
  conflicts: TimeSlotConflict[];
}

export interface TimeSlotConflict {
  conflictingVendorId: string;
  conflictingService: string;
  overlapMinutes: number;
  severity: ConflictSeverity;
}

export interface ConflictingResource {
  resourceId: string;
  resourceType: ResourceType;
  requestedBy: string[];
  availability: ResourceAvailability;
}

export type ResourceType =
  | 'equipment'
  | 'space'
  | 'personnel'
  | 'vehicle'
  | 'power'
  | 'internet'
  | 'storage';

export interface ResourceAvailability {
  available: boolean;
  capacity: number;
  allocated: number;
  remaining: number;
  nextAvailable?: Date;
}

export interface TimelineConflict extends DataConflict {
  timelineData: {
    milestoneId: string;
    conflictType: TimelineConflictType;
    originalTime: Date;
    conflictingTimes: Date[];
    dependencies: TimelineDependency[];
    criticalPath: boolean;
  };
}

export type TimelineConflictType =
  | 'dependency_violation'
  | 'resource_unavailable'
  | 'venue_conflict'
  | 'vendor_unavailable'
  | 'weather_impact'
  | 'regulation_conflict';

export interface TimelineDependency {
  dependsOn: string;
  dependencyType: DependencyType;
  minimumGap: number;
  flexible: boolean;
}

export type DependencyType =
  | 'must_precede'
  | 'must_follow'
  | 'simultaneous'
  | 'exclusive';

export interface BudgetConflict extends DataConflict {
  budgetData: {
    categoryId: string;
    conflictType: BudgetConflictType;
    requestedAmount: number;
    availableAmount: number;
    shortfall: number;
    alternatives: BudgetAlternative[];
  };
}

export type BudgetConflictType =
  | 'over_allocation'
  | 'category_exceeded'
  | 'total_budget_exceeded'
  | 'vendor_price_change'
  | 'currency_fluctuation'
  | 'approval_required';

export interface BudgetAlternative {
  description: string;
  adjustmentAmount: number;
  affectedCategories: string[];
  tradeOffs: string[];
  feasibility: FeasibilityScore;
}

export type FeasibilityScore = 'low' | 'medium' | 'high' | 'excellent';

// Resolution Results
export interface ConflictResolution {
  conflictId: string;
  strategy: ResolutionStrategy;
  chosenValue: any;
  rationale: string;
  appliedAt: Date;
  approvedBy?: string;
  automaticResolution: boolean;
  rollbackPlan: RollbackPlan;
}

export interface RollbackPlan {
  available: boolean;
  steps: RollbackStep[];
  timeWindow: number;
  riskAssessment: RiskAssessment;
}

export interface RollbackStep {
  order: number;
  action: RollbackAction;
  description: string;
  estimatedTime: number;
  dependencies: string[];
}

export type RollbackAction =
  | 'restore_value'
  | 'notify_users'
  | 'revert_dependencies'
  | 'clear_cache'
  | 'trigger_recalculation'
  | 'manual_intervention';

export interface RiskAssessment {
  overallRisk: RiskLevel;
  dataLossRisk: RiskLevel;
  serviceInterruptionRisk: RiskLevel;
  userImpactRisk: RiskLevel;
  mitigationStrategies: string[];
}

export interface VendorResolution extends ConflictResolution {
  vendorActions: VendorAction[];
  clientNotifications: ClientNotification[];
  contractModifications: ContractModification[];
}

export interface VendorAction {
  vendorId: string;
  action: VendorActionType;
  deadline: Date;
  priority: ActionPriority;
  assignedTo: string;
}

export type VendorActionType =
  | 'reschedule_service'
  | 'reallocate_resources'
  | 'provide_alternative'
  | 'coordinate_with_other'
  | 'update_timeline'
  | 'modify_contract';

export type ActionPriority = 'low' | 'medium' | 'high' | 'urgent' | 'immediate';

export interface ClientNotification {
  recipientType: RecipientType;
  recipients: string[];
  message: string;
  urgency: NotificationUrgency;
  channel: NotificationChannel;
  requiresResponse: boolean;
}

export type RecipientType =
  | 'couple'
  | 'family'
  | 'bridal_party'
  | 'all_vendors'
  | 'specific_vendors';
export type NotificationUrgency =
  | 'info'
  | 'standard'
  | 'high'
  | 'urgent'
  | 'emergency';
export type NotificationChannel =
  | 'email'
  | 'sms'
  | 'push'
  | 'in_app'
  | 'phone_call';

export interface ContractModification {
  contractId: string;
  modificationType: ModificationType;
  changes: ContractChange[];
  approvalRequired: boolean;
  legalReview: boolean;
}

export type ModificationType =
  | 'amendment'
  | 'addendum'
  | 'cancellation'
  | 'renewal'
  | 'transfer';

export interface ContractChange {
  field: string;
  oldValue: any;
  newValue: any;
  effectiveDate: Date;
  reason: string;
}

export interface TimelineResolution extends ConflictResolution {
  timelineAdjustments: TimelineAdjustment[];
  dependencyUpdates: DependencyUpdate[];
  stakeholderApprovals: StakeholderApproval[];
}

export interface TimelineAdjustment {
  milestoneId: string;
  newTime: Date;
  reason: string;
  cascadingEffects: CascadingEffect[];
  bufferTimeAdded: number;
}

export interface CascadingEffect {
  affectedMilestoneId: string;
  timeChange: number;
  automatic: boolean;
  requiresApproval: boolean;
}

export interface DependencyUpdate {
  fromMilestone: string;
  toMilestone: string;
  newDependencyType: DependencyType;
  minimumGap: number;
  rationale: string;
}

export interface StakeholderApproval {
  stakeholderId: string;
  stakeholderRole: string;
  approvalStatus: ApprovalStatus;
  comments?: string;
  approvedAt?: Date;
}

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'conditional';

export interface BudgetResolution extends ConflictResolution {
  budgetAdjustments: BudgetAdjustment[];
  approvalWorkflow: ApprovalWorkflow;
  financialImpact: FinancialImpact;
}

export interface BudgetAdjustment {
  categoryId: string;
  adjustment: number;
  justification: string;
  sourceOfFunds?: string;
  impactedVendors: string[];
}

export interface ApprovalWorkflow {
  approvers: WorkflowApprover[];
  currentStage: number;
  deadline: Date;
  escalationRules: EscalationRule[];
}

export interface WorkflowApprover {
  userId: string;
  role: ApproverRole;
  order: number;
  required: boolean;
  delegateId?: string;
}

export type ApproverRole =
  | 'primary'
  | 'secondary'
  | 'financial'
  | 'executive'
  | 'legal';

export interface EscalationRule {
  triggerCondition: EscalationTrigger;
  action: EscalationAction;
  timeout: number;
  escalateTo: string;
}

export type EscalationTrigger =
  | 'timeout'
  | 'rejection'
  | 'high_value'
  | 'critical_impact';
export type EscalationAction =
  | 'notify'
  | 'delegate'
  | 'auto_approve'
  | 'manual_review';

export interface FinancialImpact {
  totalImpact: number;
  categoryBreakdown: CategoryImpact[];
  cashFlowImpact: CashFlowImpact;
  riskAssessment: FinancialRisk;
}

export interface CategoryImpact {
  categoryId: string;
  impact: number;
  percentage: number;
  reason: string;
}

export interface CashFlowImpact {
  immediateImpact: number;
  shortTermImpact: number;
  longTermImpact: number;
  paymentScheduleChanges: PaymentScheduleChange[];
}

export interface PaymentScheduleChange {
  vendorId: string;
  originalDue: Date;
  newDue: Date;
  amount: number;
  reason: string;
}

export interface FinancialRisk {
  riskLevel: RiskLevel;
  riskFactors: string[];
  mitigation: string[];
  contingencyFunds: number;
}

// Operational Transform Types
export interface OTOperation {
  id: string;
  type: OTOperationType;
  position: number;
  content?: any;
  retain?: number;
  delete?: number;
  attributes?: Record<string, any>;
  authorId: string;
  timestamp: Date;
}

export type OTOperationType = 'retain' | 'insert' | 'delete' | 'format';

export interface TransformResult {
  transformedOperation: OTOperation;
  conflictsResolved: number;
  additionalOperations: OTOperation[];
  consistency: ConsistencyStatus;
}

export type ConsistencyStatus =
  | 'consistent'
  | 'eventually_consistent'
  | 'inconsistent';

// Consistency and Repair
export interface ConsistencyReport {
  weddingId: string;
  overallStatus: ConsistencyStatus;
  inconsistencies: DataInconsistency[];
  repairRecommendations: RepairRecommendation[];
  generatedAt: Date;
}

export interface DataInconsistency {
  id: string;
  type: InconsistencyType;
  entity: string;
  field: string;
  expectedValue: any;
  actualValue: any;
  confidence: number;
  impact: InconsistencyImpact;
}

export type InconsistencyType =
  | 'missing_data'
  | 'duplicate_data'
  | 'invalid_reference'
  | 'constraint_violation'
  | 'temporal_inconsistency'
  | 'calculation_mismatch';

export interface InconsistencyImpact {
  userExperience: ImpactLevel;
  dataIntegrity: ImpactLevel;
  businessLogic: ImpactLevel;
  systemPerformance: ImpactLevel;
}

export type ImpactLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface RepairRecommendation {
  inconsistencyId: string;
  strategy: RepairStrategy;
  confidence: number;
  estimatedTime: number;
  riskLevel: RiskLevel;
  prerequisite: string[];
}

export type RepairStrategy =
  | 'automatic_repair'
  | 'guided_repair'
  | 'manual_repair'
  | 'data_refresh'
  | 'rollback'
  | 'ignore';

export interface RepairResult {
  inconsistencyId: string;
  repaired: boolean;
  strategy: RepairStrategy;
  timeTaken: number;
  sideEffects: SideEffect[];
  verificationStatus: VerificationStatus;
}

export interface SideEffect {
  type: SideEffectType;
  description: string;
  affectedEntities: string[];
  severity: SideEffectSeverity;
}

export type SideEffectType =
  | 'data_modification'
  | 'business_rule_change'
  | 'user_notification'
  | 'workflow_trigger'
  | 'cache_invalidation';

export type SideEffectSeverity =
  | 'benign'
  | 'minor'
  | 'moderate'
  | 'significant'
  | 'major';

export type VerificationStatus =
  | 'verified'
  | 'partially_verified'
  | 'unverified'
  | 'failed';

// Wedding-specific sync operations
export interface TimelineSyncOperation extends SyncOperation {
  timelineData: {
    milestoneId: string;
    changeType: TimelineChangeType;
    newValue: any;
    dependencies: string[];
    validation: TimelineValidation;
  };
}

export type TimelineChangeType =
  | 'time_change'
  | 'venue_change'
  | 'vendor_change'
  | 'service_change'
  | 'milestone_add'
  | 'milestone_remove';

export interface TimelineValidation {
  businessRules: ValidationRule[];
  dependencies: DependencyValidation[];
  resourceAvailability: ResourceValidation[];
}

export interface ValidationRule {
  rule: string;
  passed: boolean;
  message?: string;
  severity: ValidationSeverity;
}

export type ValidationSeverity = 'info' | 'warning' | 'error' | 'blocking';

export interface DependencyValidation {
  dependentMilestone: string;
  validationStatus: ValidationStatus;
  conflicts: string[];
  suggestedResolution?: string;
}

export interface ResourceValidation {
  resourceId: string;
  available: boolean;
  conflictingBookings: string[];
  alternativeOptions: string[];
}

export interface BudgetSyncOperation extends SyncOperation {
  budgetData: {
    categoryId: string;
    changeType: BudgetChangeType;
    amount: number;
    approvalRequired: boolean;
    justification: string;
  };
}

export type BudgetChangeType =
  | 'allocation_increase'
  | 'allocation_decrease'
  | 'category_transfer'
  | 'new_category'
  | 'category_merge'
  | 'category_split';

export interface VendorSyncOperation extends SyncOperation {
  vendorData: {
    vendorId: string;
    changeType: VendorChangeType;
    serviceDetails: any;
    contractImpact: ContractImpact;
  };
}

export type VendorChangeType =
  | 'service_modification'
  | 'contract_update'
  | 'availability_change'
  | 'pricing_change'
  | 'contact_update'
  | 'performance_update';

export interface ContractImpact {
  requiresAmendment: boolean;
  financialImpact: number;
  approvalNeeded: boolean;
  legalReview: boolean;
}

export interface GuestSyncOperation extends SyncOperation {
  guestData: {
    guestId: string;
    changeType: GuestChangeType;
    guestInfo: any;
    rsvpImpact: RsvpImpact;
  };
}

export type GuestChangeType =
  | 'guest_add'
  | 'guest_remove'
  | 'rsvp_update'
  | 'dietary_update'
  | 'seating_change'
  | 'contact_update';

export interface RsvpImpact {
  headcountChange: number;
  cateringImpact: boolean;
  seatingImpact: boolean;
  budgetImpact: number;
}
