/**
 * WS-177 Security Layer Interfaces
 * Team D Round 1 Implementation - Ultra Hard Thinking Standards
 *
 * Type definitions for multi-layered security architecture
 * Wedding management platform with celebrity client requirements
 */

export type ThreatLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type SecuritySeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type CelebrityTier = 'standard' | 'high_profile' | 'celebrity';
export type SupplierRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityContext {
  userId: string;
  token: string;
  userRole: WeddingRole;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  timestamp?: string;
}

export interface WeddingSecurityContext extends SecurityContext {
  weddingId: string;
  celebrityTier?: CelebrityTier;
  vendorAccess?: string[];
  guestDataAccess?: boolean;
  supplierRiskLevel?: SupplierRiskLevel;
  organizationId?: string;
  clientId?: string;
}

export interface AuditEvent {
  event_id?: string;
  event_type: string;
  user_id: string;
  wedding_id: string;
  severity: SecuritySeverity;
  details?: Record<string, any>;
  timestamp?: string;
  event_hash?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface ThreatAnalysisContext {
  userId: string;
  weddingId: string;
  activity: SecurityActivity;
  celebrityTier?: CelebrityTier;
  supplierRiskLevel?: SupplierRiskLevel;
  userBehaviorProfile?: UserBehaviorProfile;
  networkContext?: NetworkContext;
}

export interface SecurityActivity {
  type: ActivityType;
  resource: string;
  action: string;
  timestamp: string;
  metadata?: Record<string, any>;
  frequency?: number;
  duration?: number;
}

export interface UserBehaviorProfile {
  normalLoginTimes: string[];
  commonLocations: string[];
  typicalDevices: string[];
  averageSessionDuration: number;
  commonActions: string[];
  riskScore: number;
}

export interface NetworkContext {
  ipAddress: string;
  location?: GeographicLocation;
  vpnDetected?: boolean;
  torDetected?: boolean;
  proxyDetected?: boolean;
  ipReputationScore?: number;
  asn?: string;
  countryCode?: string;
}

export interface GeographicLocation {
  latitude?: number;
  longitude?: number;
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
}

export interface ComplianceValidationContext {
  userId: string;
  weddingId: string;
  operation: string;
  guestDataAccess?: boolean;
  celebrityTier?: CelebrityTier;
  dataTypes?: string[];
  crossBorderTransfer?: boolean;
  retentionPeriod?: number;
}

export interface ComplianceResult {
  compliant: boolean;
  gdpr: boolean;
  soc2: boolean;
  ccpa: boolean;
  violations: ComplianceViolation[];
  recommendations: string[];
}

export interface ComplianceViolation {
  framework: 'GDPR' | 'SOC2' | 'CCPA' | 'PCI_DSS' | 'WEDDING_INDUSTRY';
  rule: string;
  severity: SecuritySeverity;
  description: string;
  remediation: string;
}

export interface IncidentResponse {
  incidentId: string;
  severity: SecuritySeverity;
  threatLevel: ThreatLevel;
  responseActions: ResponseAction[];
  escalationRequired: boolean;
  notificationChannels: NotificationChannel[];
  timeToResponse: number;
  status: IncidentStatus;
}

export interface ResponseAction {
  action: ResponseActionType;
  automated: boolean;
  description: string;
  executedAt?: string;
  success?: boolean;
  details?: Record<string, any>;
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'slack' | 'pagerduty' | 'webhook';
  target: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  messageTemplate: string;
}

export enum WeddingRole {
  COUPLE = 'couple',
  WEDDING_PLANNER = 'wedding_planner',
  VENDOR = 'vendor',
  GUEST = 'guest',
  ADMIN = 'admin',
  SUPPLIER = 'supplier',
  PHOTOGRAPHER = 'photographer',
  CATERER = 'caterer',
  VENUE_MANAGER = 'venue_manager',
  ORGANIZATION_ADMIN = 'organization_admin',
}

export enum ActivityType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  FILE_UPLOAD = 'file_upload',
  FILE_DOWNLOAD = 'file_download',
  PAYMENT_PROCESSING = 'payment_processing',
  VENDOR_COMMUNICATION = 'vendor_communication',
  GUEST_DATA_ACCESS = 'guest_data_access',
  TIMELINE_MODIFICATION = 'timeline_modification',
  BUDGET_ACCESS = 'budget_access',
  PHOTO_ACCESS = 'photo_access',
  CONTRACT_ACCESS = 'contract_access',
}

export enum ResponseActionType {
  BLOCK_USER = 'block_user',
  REQUIRE_MFA = 'require_mfa',
  FORCE_LOGOUT = 'force_logout',
  RESTRICT_ACCESS = 'restrict_access',
  ALERT_ADMIN = 'alert_admin',
  LOG_INCIDENT = 'log_incident',
  BACKUP_DATA = 'backup_data',
  ESCALATE = 'escalate',
  QUARANTINE_SESSION = 'quarantine_session',
  NOTIFY_COUPLE = 'notify_couple',
  VENDOR_RESTRICTION = 'vendor_restriction',
}

export enum IncidentStatus {
  DETECTED = 'detected',
  INVESTIGATING = 'investigating',
  RESPONDING = 'responding',
  CONTAINED = 'contained',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export interface SecurityLayerInterface {
  authenticateUser(context: WeddingSecurityContext): Promise<boolean>;
  authorizeAccess(
    context: WeddingSecurityContext,
    resource: string,
    action: string,
  ): Promise<boolean>;
  encryptSensitiveData(
    data: any,
    context: WeddingSecurityContext,
  ): Promise<string>;
  decryptSensitiveData(
    encryptedData: string,
    context: WeddingSecurityContext,
  ): Promise<any>;
  detectThreats(
    context: WeddingSecurityContext,
    activity: SecurityActivity,
  ): Promise<ThreatLevel>;
  validateCompliance(
    context: WeddingSecurityContext,
    operation: string,
  ): Promise<boolean>;
  startSecurityMonitoring(context: WeddingSecurityContext): Promise<void>;
}

export interface ThreatDetectionInterface {
  analyzeThreat(context: ThreatAnalysisContext): Promise<ThreatLevel>;
  updateBehaviorProfile(
    userId: string,
    activity: SecurityActivity,
  ): Promise<void>;
  checkSuspiciousActivity(
    userId: string,
    activities: SecurityActivity[],
  ): Promise<boolean>;
  generateThreatReport(
    weddingId: string,
    timeRange: DateRange,
  ): Promise<ThreatReport>;
}

export interface ComplianceValidatorInterface {
  validateOperation(
    context: ComplianceValidationContext,
  ): Promise<ComplianceResult>;
  checkGDPRCompliance(context: ComplianceValidationContext): Promise<boolean>;
  checkSOC2Compliance(context: ComplianceValidationContext): Promise<boolean>;
  checkCCPACompliance(context: ComplianceValidationContext): Promise<boolean>;
  generateComplianceReport(weddingId: string): Promise<ComplianceReport>;
}

export interface IncidentResponseInterface {
  handleIncident(
    event: AuditEvent,
    context: WeddingSecurityContext,
  ): Promise<IncidentResponse>;
  respondToThreat(
    context: WeddingSecurityContext,
    threatLevel: ThreatLevel,
    activity: SecurityActivity,
  ): Promise<void>;
  escalateIncident(incidentId: string): Promise<void>;
  notifyStakeholders(incident: IncidentResponse): Promise<void>;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ThreatReport {
  weddingId: string;
  reportId: string;
  generatedAt: string;
  timeRange: DateRange;
  totalThreats: number;
  threatsByLevel: Record<ThreatLevel, number>;
  topThreatTypes: Array<{ type: string; count: number }>;
  affectedUsers: string[];
  incidentsGenerated: number;
  recommendations: string[];
}

export interface ComplianceReport {
  weddingId: string;
  reportId: string;
  generatedAt: string;
  overallCompliance: boolean;
  frameworkCompliance: {
    gdpr: ComplianceFrameworkStatus;
    soc2: ComplianceFrameworkStatus;
    ccpa: ComplianceFrameworkStatus;
  };
  violations: ComplianceViolation[];
  remediationPlan: RemediationPlan[];
}

export interface ComplianceFrameworkStatus {
  compliant: boolean;
  score: number;
  controlsEvaluated: number;
  controlsPassing: number;
  lastAuditDate: string;
}

export interface RemediationPlan {
  violation: ComplianceViolation;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedEffort: string;
  dueDate: string;
  assignedTo: string;
  status: 'pending' | 'in_progress' | 'completed';
}

// Wedding-specific security extensions
export interface WeddingVendorAccess {
  vendorId: string;
  vendorType: VendorType;
  accessLevel: VendorAccessLevel;
  allowedResources: string[];
  timeRestrictions?: TimeRestrictions;
  dataAccessLimits: DataAccessLimits;
}

export enum VendorType {
  PHOTOGRAPHER = 'photographer',
  CATERER = 'caterer',
  FLORIST = 'florist',
  VENUE = 'venue',
  DJ = 'dj',
  VIDEOGRAPHER = 'videographer',
  WEDDING_PLANNER = 'wedding_planner',
  TRANSPORTATION = 'transportation',
  BEAUTY = 'beauty',
}

export enum VendorAccessLevel {
  READ_ONLY = 'read_only',
  LIMITED_EDIT = 'limited_edit',
  FULL_ACCESS = 'full_access',
  ADMIN = 'admin',
}

export interface TimeRestrictions {
  allowedDays: string[];
  allowedHours: {
    start: string;
    end: string;
  };
  timezone: string;
}

export interface DataAccessLimits {
  guestListAccess: boolean;
  financialDataAccess: boolean;
  photoAccess: boolean;
  contractAccess: boolean;
  timelineAccess: boolean;
  vendorContactsAccess: boolean;
}

export interface CelebrityProtectionProfile {
  tier: CelebrityTier;
  additionalMFARequired: boolean;
  ipWhitelistRequired: boolean;
  deviceRegistrationRequired: boolean;
  accessLogRetention: number; // days
  realTimeMonitoring: boolean;
  photographyRestrictions: boolean;
  guestListProtection: boolean;
  vendorNDARequired: boolean;
}

export default SecurityLayerInterface;
