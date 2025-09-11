// Multi-jurisdiction Compliance Types for International Weddings

export interface ComplianceJurisdiction {
  id: string;
  countryCode: string;
  countryName: string;
  region: string;
  dataProtectionFramework: string;
  authorityName: string;
  authorityWebsite: string;
  breachNotificationDeadlineHours: number;
  authorityEmail?: string;
  authorityPhone?: string;
  guestDataRequirements: Record<string, any>;
  photoConsentRequirements: Record<string, any>;
  internationalTransferRules: Record<string, any>;
  vendorDataSharingRules: Record<string, any>;
  primaryLanguage: string;
  notificationTemplates: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeddingJurisdictionCompliance {
  id: string;
  organizationId: string;
  weddingId?: string;
  ceremonyCountryCode?: string;
  receptionCountryCode?: string;
  coupleResidenceCountries: string[];
  guestCountries: string[];
  vendorCountries: string[];
  dataProcessingCountries: string[];
  dataStorageLocations: string[];
  applicableJurisdictions: string[];
  primaryJurisdiction?: string;
  crossBorderProcessingRisk: 'low' | 'medium' | 'high' | 'critical';
  complianceComplexityScore: number;
  legalBasisDocumentation: Record<string, any>;
  transferMechanismDocumentation: Record<string, any>;
  consentDocumentation: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface MultiJurisdictionBreachNotification {
  id: string;
  securityIncidentId: string;
  weddingJurisdictionId?: string;
  jurisdictionId: string;
  notificationRequired: boolean;
  notificationDeadlineHours: number;
  notificationStatus: 'pending' | 'sent' | 'acknowledged' | 'failed';
  notificationSentAt?: string;
  acknowledgmentReceivedAt?: string;
  localizedContent: Record<string, any>;
  authorityReferenceNumber?: string;
  followUpRequired: boolean;
  followUpDeadline?: string;
  followUpCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrossBorderDataTransfer {
  id: string;
  organizationId: string;
  weddingJurisdictionId?: string;
  dataCategory: 'guest_data' | 'photos' | 'payment_data' | 'vendor_data';
  sourceCountry: string;
  destinationCountry: string;
  transferMechanism: 'adequacy_decision' | 'sccs' | 'bcrs' | 'consent';
  legalBasis: string;
  transferDocumentation?: string;
  affectedDataSubjectsCount: number;
  dataSubjectCategories: string[];
  transferRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskMitigationMeasures?: string;
  transferDate: string;
  lastReviewedAt: string;
  nextReviewDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MultiJurisdictionComplianceAudit {
  id: string;
  organizationId: string;
  weddingJurisdictionId?: string;
  auditType: 'assessment' | 'notification' | 'transfer' | 'review';
  actionTaken: string;
  jurisdictionId?: string;
  userId?: string;
  actionContext: Record<string, any>;
  complianceRequirementsChecked: string[];
  complianceStatus: 'compliant' | 'non_compliant' | 'under_review';
  issuesIdentified: string[];
  recommendations: string[];
  auditTimestamp: string;
  createdAt: string;
}

export interface JurisdictionAssessmentRequest {
  organizationId: string;
  weddingId?: string;
  ceremonyCountry?: string;
  receptionCountry?: string;
  coupleResidenceCountries: string[];
  expectedGuestCountries: string[];
  vendorCountries: string[];
  dataProcessingRequirements: {
    guestListProcessing: boolean;
    photoProcessing: boolean;
    paymentProcessing: boolean;
    vendorDataSharing: boolean;
  };
}

export interface ComplianceAssessmentResult {
  weddingJurisdictionId: string;
  applicableJurisdictions: ComplianceJurisdiction[];
  primaryJurisdiction: ComplianceJurisdiction;
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    complexityScore: number;
    crossBorderRisks: string[];
    mitigationRequirements: string[];
  };
  requiredDocumentation: {
    legalBasisRequired: string[];
    consentRequirements: string[];
    transferDocumentation: string[];
  };
  complianceActions: ComplianceAction[];
}

export interface ComplianceAction {
  id: string;
  type:
    | 'legal_basis'
    | 'consent_collection'
    | 'documentation'
    | 'transfer_mechanism'
    | 'notification_setup';
  title: string;
  description: string;
  jurisdiction: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  assignedTo?: string;
  completedAt?: string;
  documentation?: string[];
}

export interface BreachNotificationRequirement {
  jurisdictionId: string;
  jurisdiction: ComplianceJurisdiction;
  notificationRequired: boolean;
  deadlineHours: number;
  authorityContact: {
    email?: string;
    phone?: string;
    website: string;
  };
  requiredInformation: string[];
  localizedTemplate: {
    language: string;
    subject: string;
    body: string;
    followUpInstructions: string;
  };
  followUpRequirements: {
    required: boolean;
    deadlineDays?: number;
    format: string;
  };
}

export interface InternationalWeddingComplexity {
  score: number;
  factors: {
    numberOfJurisdictions: number;
    crossBorderDataTransfers: number;
    conflictingRegulations: string[];
    highRiskCombinations: string[];
  };
  recommendations: {
    primaryCompliance: string;
    transferMechanisms: string[];
    documentationRequirements: string[];
    ongoingObligations: string[];
  };
}

export interface LocalizedNotificationContent {
  language: string;
  jurisdiction: string;
  authorityName: string;
  templates: {
    subject: string;
    greeting: string;
    incidentSummary: string;
    dataSubjectsAffected: string;
    categoriesOfData: string;
    likelyConsequences: string;
    measuresTaken: string;
    contactInformation: string;
    closing: string;
  };
  legalReferences: string[];
  requiredFields: string[];
}

// Wedding-specific compliance contexts
export interface WeddingDataCategories {
  guestPersonalData: {
    names: boolean;
    contactInfo: boolean;
    dietaryRequirements: boolean;
    accessibility: boolean;
    relationships: boolean;
  };
  weddingPhotos: {
    ceremonyPhotos: boolean;
    receptionPhotos: boolean;
    guestPhotos: boolean;
    professionalPhotos: boolean;
    socialMediaSharing: boolean;
  };
  paymentInformation: {
    couplePayments: boolean;
    guestPayments: boolean;
    vendorPayments: boolean;
    refundProcessing: boolean;
  };
  vendorData: {
    contractualData: boolean;
    performanceData: boolean;
    communicationData: boolean;
    financialData: boolean;
  };
}

export interface WeddingSpecificRisks {
  guestPrivacyRisks: string[];
  photographyRisks: string[];
  crossBorderRisks: string[];
  vendorDataRisks: string[];
  paymentRisks: string[];
  socialMediaRisks: string[];
}

export interface ComplianceMonitoringMetrics {
  totalWeddings: number;
  internationalWeddings: number;
  jurisdictionsCovered: number;
  activeCompliance: number;
  pendingActions: number;
  overdueDates: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  recentAudits: number;
  complianceScore: number;
}
