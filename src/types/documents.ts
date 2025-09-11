/**
 * Document Storage System Types
 * WS-068: Wedding Business Compliance Hub
 */

export type ComplianceStatus = 'valid' | 'expiring' | 'expired' | 'invalid';
export type SecurityLevel = 'low' | 'standard' | 'high' | 'critical';
export type DocumentStatus = 'active' | 'archived' | 'deleted';
export type VirusScanStatus = 'pending' | 'clean' | 'infected' | 'failed';
export type AccessLevel = 'view' | 'download' | 'share' | 'manage';
export type LinkType = 'view' | 'download' | 'preview';
export type AlertType =
  | 'expiry_warning'
  | 'expired'
  | 'compliance_check'
  | 'renewal_required';
export type ShareAction = 'view' | 'download' | 'preview';

// Document Categories
export interface DocumentCategory {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  color: string;
  sort_order: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

// Main Business Documents Table
export interface BusinessDocument {
  id: string;
  user_id: string;
  category_id: string;

  // File Information
  original_filename: string;
  stored_filename: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  file_hash: string;

  // Document Metadata
  title?: string;
  description?: string;
  tags?: string[];

  // Compliance & Expiry Tracking
  issued_date?: string;
  expiry_date?: string;
  expiry_warning_days: number;
  is_compliance_required: boolean;
  compliance_status: ComplianceStatus;

  // Security & Access
  security_level: SecurityLevel;
  encryption_key_id?: string;
  virus_scan_status: VirusScanStatus;
  virus_scan_date?: string;

  // Status & Audit
  status: DocumentStatus;
  version: number;
  created_at: string;
  updated_at: string;
}

// Document with Category Information (from view)
export interface DocumentWithCategory extends BusinessDocument {
  category_name: string;
  category_icon?: string;
  category_color: string;
}

// Document Access Control
export interface DocumentAccessControl {
  id: string;
  document_id: string;
  user_id: string;
  access_level: AccessLevel;
  granted_by?: string;

  // Access Restrictions
  ip_restrictions?: string[];
  time_restrictions?: {
    start_time: string;
    end_time: string;
    days: number[];
  };
  expires_at?: string;
  max_downloads?: number;
  current_downloads: number;

  // Audit
  created_at: string;
  last_accessed_at?: string;
}

// Document Sharing Links
export interface DocumentSharingLink {
  id: string;
  document_id: string;
  created_by: string;

  // Link Configuration
  link_token: string;
  link_type: LinkType;

  // Security Settings
  password_hash?: string;
  require_email: boolean;
  allowed_emails?: string[];
  max_uses?: number;
  current_uses: number;

  // Time Controls
  expires_at?: string;

  // Status
  is_active: boolean;

  // Audit
  created_at: string;
  last_used_at?: string;
}

// Document Sharing Logs
export interface DocumentSharingLog {
  id: string;
  sharing_link_id?: string;
  document_id: string;

  // Access Details
  accessed_by_email?: string;
  ip_address?: string;
  user_agent?: string;
  referer?: string;

  // Action Information
  action: ShareAction;
  success: boolean;
  error_message?: string;

  // Metadata
  file_size_downloaded?: number;
  download_duration_ms?: number;

  // Timestamp
  accessed_at: string;
}

// Document Compliance Alerts
export interface DocumentComplianceAlert {
  id: string;
  document_id: string;
  user_id: string;

  // Alert Configuration
  alert_type: AlertType;
  trigger_days_before?: number;

  // Alert Status
  is_active: boolean;
  last_triggered_at?: string;
  next_trigger_at?: string;
  trigger_count: number;

  // Notification Settings
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// Document Versions
export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;

  // Previous Version Data
  previous_filename?: string;
  previous_file_path?: string;
  previous_file_hash?: string;

  // Change Information
  change_reason?: string;
  changed_by?: string;

  // Metadata
  created_at: string;
}

// View Types
export interface ExpiringDocument extends DocumentWithCategory {
  days_until_expiry: number;
}

export interface DocumentStatistics {
  user_id: string;
  total_documents: number;
  documents_with_expiry: number;
  expired_documents: number;
  expiring_documents: number;
  total_storage_used: number;
  last_upload_date?: string;
}

// API Request/Response Types
export interface DocumentUploadRequest {
  file: File;
  category_id: string;
  title?: string;
  description?: string;
  tags?: string[];
  issued_date?: string;
  expiry_date?: string;
  expiry_warning_days?: number;
  is_compliance_required?: boolean;
  security_level?: SecurityLevel;
}

export interface DocumentUploadProgress {
  uploadId: string;
  filename: string;
  progress: number;
  status: 'uploading' | 'validating' | 'processing' | 'completed' | 'failed';
  error?: string;
  fileSize: number;
  virusScanStatus?: VirusScanStatus;
  securityLevel?: SecurityLevel;
}

export interface DocumentValidationResult {
  isValid: boolean;
  isSafe: boolean;
  threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  issues: string[];
  warnings: string[];
  metadata: {
    originalName: string;
    sanitizedName: string;
    size: number;
    mimeType: string;
    extension: string;
    hash: string;
    uploadTimestamp: number;
  };
  virusScan?: {
    clean: boolean;
    threats: string[];
    scanTime: number;
  };
}

export interface CreateSharingLinkRequest {
  document_id: string;
  link_type: LinkType;
  password?: string;
  require_email?: boolean;
  allowed_emails?: string[];
  max_uses?: number;
  expires_in_hours?: number;
}

export interface CreateSharingLinkResponse {
  link: DocumentSharingLink;
  share_url: string;
  qr_code?: string;
}

export interface DocumentLibraryFilters {
  category_ids?: string[];
  tags?: string[];
  compliance_status?: ComplianceStatus[];
  expiry_date_from?: string;
  expiry_date_to?: string;
  search?: string;
  security_level?: SecurityLevel[];
  sort_by?: 'created_at' | 'updated_at' | 'expiry_date' | 'title' | 'file_size';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface DocumentLibraryResponse {
  documents: DocumentWithCategory[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
  statistics: DocumentStatistics;
  categories: DocumentCategory[];
}

export interface ComplianceDashboardData {
  overview: {
    total_documents: number;
    expired_documents: number;
    expiring_soon: number;
    compliance_rate: number;
  };
  expiring_documents: ExpiringDocument[];
  categories: Array<{
    category: DocumentCategory;
    document_count: number;
    expired_count: number;
    expiring_count: number;
    compliance_rate: number;
  }>;
  recent_uploads: DocumentWithCategory[];
  alerts: DocumentComplianceAlert[];
}

// Document Manager State Types
export interface DocumentManagerState {
  documents: DocumentWithCategory[];
  categories: DocumentCategory[];
  filters: DocumentLibraryFilters;
  loading: boolean;
  uploading: boolean;
  uploads: DocumentUploadProgress[];
  selectedDocuments: string[];
  view: 'grid' | 'list';
  error?: string;
}

export interface DocumentLibraryActions {
  setFilters: (filters: Partial<DocumentLibraryFilters>) => void;
  setView: (view: 'grid' | 'list') => void;
  selectDocument: (documentId: string) => void;
  selectMultiple: (documentIds: string[]) => void;
  clearSelection: () => void;
  uploadDocument: (request: DocumentUploadRequest) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  updateDocument: (
    documentId: string,
    updates: Partial<BusinessDocument>,
  ) => Promise<void>;
  createSharingLink: (
    request: CreateSharingLinkRequest,
  ) => Promise<CreateSharingLinkResponse>;
  refreshDocuments: () => Promise<void>;
}

// Component Props Types
export interface DocumentCardProps {
  document: DocumentWithCategory;
  selected?: boolean;
  onSelect?: (documentId: string) => void;
  onShare?: (documentId: string) => void;
  onEdit?: (documentId: string) => void;
  onDelete?: (documentId: string) => void;
  onView?: (documentId: string) => void;
  compact?: boolean;
}

export interface DocumentUploaderProps {
  onUploadComplete?: (uploadId: string) => void;
  onUploadStart?: (uploadId: string) => void;
  onUploadError?: (error: string) => void;
  disabled?: boolean;
  maxFileSize?: number;
  allowedCategories?: string[];
  defaultCategory?: string;
  className?: string;
  multiple?: boolean;
}

export interface ExpiryTrackerProps {
  documents: DocumentWithCategory[];
  onRenew?: (documentId: string) => void;
  onSetAlert?: (documentId: string) => void;
  compact?: boolean;
}

export interface AccessControlPanelProps {
  document: BusinessDocument;
  onUpdateAccess?: (access: DocumentAccessControl[]) => void;
  onCreateLink?: (request: CreateSharingLinkRequest) => void;
}

// Utility Types
export type DocumentFormData = Omit<
  BusinessDocument,
  | 'id'
  | 'user_id'
  | 'stored_filename'
  | 'file_path'
  | 'file_hash'
  | 'file_size'
  | 'mime_type'
  | 'compliance_status'
  | 'virus_scan_status'
  | 'virus_scan_date'
  | 'status'
  | 'version'
  | 'created_at'
  | 'updated_at'
>;

export type CreateDocumentRequest = Pick<
  DocumentUploadRequest,
  | 'category_id'
  | 'title'
  | 'description'
  | 'tags'
  | 'issued_date'
  | 'expiry_date'
  | 'expiry_warning_days'
  | 'is_compliance_required'
  | 'security_level'
> & {
  file: File;
};

export type UpdateDocumentRequest = Partial<
  Pick<
    BusinessDocument,
    | 'title'
    | 'description'
    | 'tags'
    | 'issued_date'
    | 'expiry_date'
    | 'expiry_warning_days'
    | 'is_compliance_required'
    | 'security_level'
  >
>;

// Error Types
export interface DocumentError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export interface ValidationError extends DocumentError {
  field: string;
  value?: any;
}

// Constants
export const DEFAULT_DOCUMENT_CATEGORIES: DocumentCategory[] = [
  {
    id: 'credentials_insurance',
    name: 'credentials_insurance',
    display_name: 'Credentials & Insurance',
    description:
      'Professional liability insurance, public indemnity, and certifications',
    icon: 'Shield',
    color: '#10B981',
    sort_order: 1,
    is_system: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'certifications_licenses',
    name: 'certifications_licenses',
    display_name: 'Certifications & Licenses',
    description:
      'Professional certifications, music licenses, and regulatory permits',
    icon: 'Award',
    color: '#3B82F6',
    sort_order: 2,
    is_system: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'contracts_agreements',
    name: 'contracts_agreements',
    display_name: 'Contracts & Agreements',
    description: 'Client contracts, vendor agreements, and legal documents',
    icon: 'FileText',
    color: '#8B5CF6',
    sort_order: 3,
    is_system: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'equipment_safety',
    name: 'equipment_safety',
    display_name: 'Equipment & Safety',
    description:
      'PAT testing certificates, equipment warranties, and safety documentation',
    icon: 'Settings',
    color: '#F59E0B',
    sort_order: 4,
    is_system: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'business_registration',
    name: 'business_registration',
    display_name: 'Business Registration',
    description: 'Company registration, tax documents, and business permits',
    icon: 'Building2',
    color: '#EF4444',
    sort_order: 5,
    is_system: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'marketing_materials',
    name: 'marketing_materials',
    display_name: 'Marketing Materials',
    description: 'Brochures, portfolios, and promotional documents',
    icon: 'Image',
    color: '#EC4899',
    sort_order: 6,
    is_system: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'financial_documents',
    name: 'financial_documents',
    display_name: 'Financial Documents',
    description: 'Invoices, receipts, and financial statements',
    icon: 'CreditCard',
    color: '#06B6D4',
    sort_order: 7,
    is_system: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'other',
    name: 'other',
    display_name: 'Other Documents',
    description: 'Miscellaneous business documents',
    icon: 'FileQuestion',
    color: '#6B7280',
    sort_order: 8,
    is_system: true,
    created_at: '',
    updated_at: '',
  },
];

export const SECURITY_LEVELS: Record<
  SecurityLevel,
  { label: string; description: string; color: string }
> = {
  low: {
    label: 'Low Security',
    description: 'Standard documents with basic access control',
    color: '#10B981',
  },
  standard: {
    label: 'Standard Security',
    description: 'Business documents with standard protection',
    color: '#3B82F6',
  },
  high: {
    label: 'High Security',
    description: 'Sensitive documents with enhanced protection',
    color: '#F59E0B',
  },
  critical: {
    label: 'Critical Security',
    description: 'Highly confidential documents with maximum protection',
    color: '#EF4444',
  },
};

export const COMPLIANCE_STATUS_INFO: Record<
  ComplianceStatus,
  { label: string; description: string; color: string; icon: string }
> = {
  valid: {
    label: 'Valid',
    description: 'Document is current and compliant',
    color: '#10B981',
    icon: 'CheckCircle',
  },
  expiring: {
    label: 'Expiring Soon',
    description: 'Document expires within 30 days',
    color: '#F59E0B',
    icon: 'Clock',
  },
  expired: {
    label: 'Expired',
    description: 'Document has expired and needs renewal',
    color: '#EF4444',
    icon: 'XCircle',
  },
  invalid: {
    label: 'Invalid',
    description: 'Document is invalid or corrupted',
    color: '#6B7280',
    icon: 'AlertCircle',
  },
};

export const MAX_FILE_SIZES = {
  pdf: 50 * 1024 * 1024, // 50MB
  image: 10 * 1024 * 1024, // 10MB
  document: 25 * 1024 * 1024, // 25MB
  default: 50 * 1024 * 1024, // 50MB
} as const;
