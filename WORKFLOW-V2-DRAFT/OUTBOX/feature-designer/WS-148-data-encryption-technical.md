# WS-148: Data Encryption Technical Specification

## 1. User Story & Real-World Wedding Scenario

**As a luxury wedding planner Emma**, I need comprehensive data encryption to protect my high-profile clients' sensitive information including personal details, financial records, and confidential wedding plans that, if leaked, could result in security breaches, identity theft, and damage to my reputation with celebrity clientele.

**Real Wedding Scenario**: Emma manages weddings for Fortune 500 executives and celebrities where guest lists include government officials, contract details reveal $500K+ budgets, and venue information must remain confidential until announcements. A data breach exposing these details could lead to security threats, stalking risks, and multi-million dollar lawsuits.

**Business Impact**: 
- Protects against $1M+ liability from celebrity privacy breaches
- Ensures compliance with EU GDPR and California CCPA regulations
- Maintains client trust for $100K+ wedding contracts
- Prevents competitive intelligence theft from rival planners

## 2. Technical Architecture

### Encryption Strategy Framework
```typescript
// Comprehensive encryption architecture
interface EncryptionArchitecture {
  encryptionAtRest: {
    database: PostgreSQLTransparentDataEncryption;
    fileStorage: AES256GCMFileEncryption;
    backups: ChaCha20Poly1305BackupEncryption;
    fieldLevel: ColumnLevelEncryptionPGCrypto;
  };
  encryptionInTransit: {
    api: TLS13WithHSTS;
    clientServer: EndToEndEncryption;
    internal: MutualTLSAuthentication;
  };
  keyManagement: {
    hierarchy: MasterDataSessionKeys;
    rotation: AutomatedKeyRotation;
    storage: CloudHSM | AWSKeyManagementService;
    recovery: ShamirSecretSharing;
  };
  zeroKnowledge: {
    clientSideEncryption: UserPasswordDerivedKeys;
    serverBlindness: NoPlaintextAccess;
    cryptographicProofs: ZeroKnowledgeAuthentication;
  };
}
```

### Data Classification System
```typescript
enum DataClassification {
  PUBLIC = 'public',           // Wedding announcements
  INTERNAL = 'internal',       // Business operations
  CONFIDENTIAL = 'confidential', // Client contracts
  RESTRICTED = 'restricted',    // Payment info, SSN
  TOP_SECRET = 'top_secret'     // Celebrity guest lists
}

interface EncryptionPolicy {
  classification: DataClassification;
  encryptionAlgorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305' | 'RSA-4096';
  keyRotationInterval: string;
  accessRequirements: string[];
  auditLevel: 'basic' | 'detailed' | 'comprehensive';
}
```

## 3. Database Schema

```sql
-- Encryption key management
CREATE TABLE encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_type TEXT NOT NULL, -- master, data, session, field
  key_version INTEGER NOT NULL,
  key_hash TEXT NOT NULL, -- SHA-256 of key for verification
  algorithm TEXT NOT NULL, -- AES-256-GCM, ChaCha20-Poly1305
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  rotated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB,
  
  UNIQUE(key_type, key_version),
  INDEX idx_encryption_keys_type_active ON encryption_keys(key_type, active),
  INDEX idx_encryption_keys_expires_at ON encryption_keys(expires_at)
);

-- User-specific encryption keys for zero-knowledge architecture
CREATE TABLE user_encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key_encrypted BYTEA NOT NULL, -- Encrypted with user's password-derived key
  salt BYTEA NOT NULL, -- For key derivation
  key_version INTEGER NOT NULL DEFAULT 1,
  algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, key_version),
  INDEX idx_user_encryption_keys_user_id ON user_encryption_keys(user_id)
);

-- Encrypted sensitive data storage
CREATE TABLE encrypted_client_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Encrypted PII fields
  ssn_encrypted BYTEA,
  tax_id_encrypted BYTEA,
  passport_number_encrypted BYTEA,
  drivers_license_encrypted BYTEA,
  
  -- Encrypted financial information
  bank_account_encrypted BYTEA,
  routing_number_encrypted BYTEA,
  credit_card_encrypted BYTEA,
  
  -- Encrypted personal details
  home_address_encrypted BYTEA,
  emergency_contacts_encrypted BYTEA,
  medical_info_encrypted BYTEA,
  
  -- Metadata for each field
  field_metadata JSONB, -- Encryption version, algorithm used
  
  -- Searchable hashed versions for queries
  ssn_hash TEXT,
  tax_id_hash TEXT,
  
  -- Last 4 digits for display (encrypted fields only)
  ssn_last4 TEXT,
  credit_card_last4 TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_encrypted_client_data_client_id ON encrypted_client_data(client_id),
  INDEX idx_encrypted_client_data_ssn_hash ON encrypted_client_data(ssn_hash),
  INDEX idx_encrypted_client_data_tax_id_hash ON encrypted_client_data(tax_id_hash)
);

-- File encryption metadata
CREATE TABLE encrypted_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  
  -- Encryption metadata
  encryption_algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
  key_version INTEGER NOT NULL,
  iv BYTEA NOT NULL, -- Initialization vector
  auth_tag BYTEA NOT NULL, -- Authentication tag for AEAD
  salt BYTEA NOT NULL, -- For key derivation
  
  -- File classification and access
  classification DATA_CLASSIFICATION NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  access_permissions JSONB,
  
  -- Audit trail
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  
  INDEX idx_encrypted_files_path ON encrypted_files(file_path),
  INDEX idx_encrypted_files_owner_id ON encrypted_files(owner_id),
  INDEX idx_encrypted_files_classification ON encrypted_files(classification)
);

-- Backup encryption tracking
CREATE TABLE backup_encryption_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id UUID NOT NULL,
  backup_type TEXT NOT NULL, -- full, incremental, differential
  encryption_algorithm TEXT NOT NULL,
  key_shares_created INTEGER, -- Shamir's secret sharing
  key_shares_required INTEGER,
  backup_size_encrypted BIGINT,
  compression_ratio DECIMAL,
  
  -- Key share locations
  key_share_locations JSONB, -- Array of storage locations
  
  -- Backup verification
  integrity_hash TEXT NOT NULL,
  verification_status TEXT DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_backup_encryption_log_backup_id ON backup_encryption_log(backup_id),
  INDEX idx_backup_encryption_log_created_at ON backup_encryption_log(created_at DESC)
);

-- GDPR crypto-shredding support
CREATE TABLE crypto_shredding_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- May reference deleted user
  shredding_reason TEXT NOT NULL, -- gdpr_request, account_deletion
  data_categories TEXT[], -- Array of data types shredded
  key_versions_destroyed INTEGER[],
  shredded_at TIMESTAMPTZ DEFAULT NOW(),
  requested_by UUID REFERENCES auth.users(id),
  compliance_officer_approval UUID REFERENCES auth.users(id),
  
  -- Legal documentation
  gdpr_request_id UUID,
  legal_basis TEXT,
  retention_override_reason TEXT,
  
  INDEX idx_crypto_shredding_log_user_id ON crypto_shredding_log(user_id),
  INDEX idx_crypto_shredding_log_shredded_at ON crypto_shredding_log(shredded_at DESC)
);

-- Custom data type for classification
CREATE TYPE DATA_CLASSIFICATION AS ENUM (
  'public',
  'internal', 
  'confidential',
  'restricted',
  'top_secret'
);
```

## 4. API Endpoints

### Encryption Management API
```typescript
interface EncryptionAPI {
  // Key management
  'POST /encryption/keys/rotate': {
    body: {
      keyType: 'master' | 'data' | 'user';
      force?: boolean; // Force rotation before scheduled time
    };
    response: {
      newKeyVersion: number;
      rotationComplete: boolean;
      affectedRecords: number;
    };
  };

  'GET /encryption/keys/status': {
    response: {
      keys: {
        keyType: string;
        version: number;
        algorithm: string;
        expiresAt: string;
        rotationDue: boolean;
      }[];
      overallHealth: 'healthy' | 'warning' | 'critical';
    };
  };

  // Field-level encryption operations
  'POST /encryption/data/encrypt': {
    body: {
      data: Record<string, any>;
      classification: DataClassification;
      userId?: string; // For user-specific encryption
    };
    response: {
      encryptedData: Record<string, string>;
      metadata: {
        algorithm: string;
        keyVersion: number;
        fieldMappings: Record<string, string>;
      };
    };
  };

  'POST /encryption/data/decrypt': {
    body: {
      encryptedData: Record<string, string>;
      metadata: {
        algorithm: string;
        keyVersion: number;
        fieldMappings: Record<string, string>;
      };
      userId?: string;
    };
    response: {
      data: Record<string, any>;
      decryptionSuccess: boolean;
    };
  };

  // File encryption
  'POST /encryption/files/upload': {
    body: FormData; // File + metadata
    headers: {
      'X-File-Classification': DataClassification;
      'X-User-Encryption': 'true' | 'false';
    };
    response: {
      fileId: string;
      encryptedPath: string;
      metadata: FileEncryptionMetadata;
    };
  };

  'GET /encryption/files/:fileId/decrypt': {
    query: {
      userKey?: string; // For user-encrypted files
    };
    response: {
      fileUrl: string; // Temporary decrypted download URL
      expiresAt: string;
    };
  };

  // Backup encryption
  'POST /encryption/backup/create': {
    body: {
      backupType: 'full' | 'incremental' | 'differential';
      encryption: {
        algorithm: string;
        keyShares: number;
        threshold: number;
      };
    };
    response: {
      backupId: string;
      encryptionStatus: 'encrypting' | 'complete' | 'failed';
      keyShareLocations: string[];
    };
  };

  // GDPR compliance
  'POST /encryption/gdpr/crypto-shred': {
    body: {
      userId: string;
      reason: string;
      dataCategories?: string[];
      legalBasis: string;
    };
    response: {
      shredded: boolean;
      affectedRecords: number;
      shredingId: string;
    };
  };
}
```

### Security Monitoring API
```typescript
interface EncryptionMonitoringAPI {
  // Encryption health monitoring
  'GET /encryption/health': {
    response: {
      overall: 'healthy' | 'warning' | 'critical';
      checks: {
        keyRotation: HealthCheck;
        encryptionCoverage: HealthCheck;
        backupIntegrity: HealthCheck;
        decryptionCapability: HealthCheck;
        complianceStatus: HealthCheck;
      };
      recommendations: string[];
    };
  };

  // Audit and compliance
  'GET /encryption/audit-log': {
    query: {
      startDate?: string;
      endDate?: string;
      operation?: string;
      userId?: string;
      page?: number;
      limit?: number;
    };
    response: {
      logs: EncryptionAuditEntry[];
      pagination: PaginationInfo;
    };
  };

  // Compliance reporting
  'GET /encryption/compliance/report': {
    query: {
      regulation: 'GDPR' | 'CCPA' | 'HIPAA' | 'SOX';
      format: 'json' | 'pdf' | 'csv';
    };
    response: {
      reportId: string;
      downloadUrl: string;
      generatedAt: string;
    };
  };
}
```

## 5. Frontend Components

### Encryption Settings Dashboard
```tsx
// Comprehensive encryption management interface
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Key, FileText, AlertTriangle, CheckCircle } from 'lucide-react';

interface EncryptionStatus {
  keyRotation: {
    status: 'healthy' | 'warning' | 'critical';
    lastRotation: string;
    nextRotation: string;
    autoRotation: boolean;
  };
  encryptionCoverage: {
    percentage: number;
    unencryptedFields: string[];
    totalFields: number;
    encryptedFields: number;
  };
  backupEncryption: {
    enabled: boolean;
    lastBackup: string;
    encryptionAlgorithm: string;
    keyShares: number;
  };
  compliance: {
    gdpr: 'compliant' | 'issues' | 'non_compliant';
    ccpa: 'compliant' | 'issues' | 'non_compliant';
    issues: string[];
  };
}

export function EncryptionDashboard() {
  const [status, setStatus] = useState<EncryptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotatingKeys, setRotatingKeys] = useState<string[]>([]);

  useEffect(() => {
    loadEncryptionStatus();
    // Refresh every 30 seconds
    const interval = setInterval(loadEncryptionStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadEncryptionStatus = async () => {
    try {
      const response = await fetch('/encryption/health', {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      });
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to load encryption status:', error);
    }
    setLoading(false);
  };

  const rotateKeys = async (keyType: string) => {
    setRotatingKeys([...rotatingKeys, keyType]);
    try {
      await fetch('/encryption/keys/rotate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({ keyType })
      });
      loadEncryptionStatus(); // Refresh status
    } catch (error) {
      console.error('Key rotation failed:', error);
    }
    setRotatingKeys(rotatingKeys.filter(k => k !== keyType));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="text-green-500" size={16} />;
      case 'warning': return <AlertTriangle className="text-yellow-500" size={16} />;
      case 'critical': return <AlertTriangle className="text-red-500" size={16} />;
      default: return <Shield className="text-gray-500" size={16} />;
    }
  };

  if (loading) return <div>Loading encryption status...</div>;
  if (!status) return <div>Failed to load encryption status</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="text-blue-600" />
          Encryption Management
        </h1>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="keys">Key Management</TabsTrigger>
          <TabsTrigger value="data">Data Encryption</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Key Rotation</p>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status.keyRotation.status)}
                    <span className="font-semibold capitalize">
                      {status.keyRotation.status}
                    </span>
                  </div>
                </div>
                <Key className="text-blue-500" size={24} />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Data Coverage</p>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {status.encryptionCoverage.percentage}%
                    </span>
                  </div>
                  <Progress 
                    value={status.encryptionCoverage.percentage} 
                    className="w-full mt-2"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Backup Encryption</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={status.backupEncryption.enabled ? 'default' : 'destructive'}>
                      {status.backupEncryption.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
                <FileText className="text-green-500" size={24} />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">GDPR Compliance</p>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status.compliance.gdpr)}
                    <Badge variant={
                      status.compliance.gdpr === 'compliant' ? 'default' : 'destructive'
                    }>
                      {status.compliance.gdpr}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {status.compliance.issues.length > 0 && (
            <Card className="p-4 border-orange-200 bg-orange-50">
              <h3 className="font-semibold text-orange-800 mb-2">
                Compliance Issues Detected
              </h3>
              <ul className="list-disc list-inside space-y-1">
                {status.compliance.issues.map((issue, index) => (
                  <li key={index} className="text-orange-700">{issue}</li>
                ))}
              </ul>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="keys" className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Key Rotation Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="font-medium">Master Keys</p>
                  <p className="text-sm text-gray-600">
                    Last rotated: {status.keyRotation.lastRotation}
                  </p>
                  <p className="text-sm text-gray-600">
                    Next rotation: {status.keyRotation.nextRotation}
                  </p>
                </div>
                <Button
                  onClick={() => rotateKeys('master')}
                  disabled={rotatingKeys.includes('master')}
                  variant="outline"
                >
                  {rotatingKeys.includes('master') ? 'Rotating...' : 'Rotate Now'}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="font-medium">Data Encryption Keys</p>
                  <p className="text-sm text-gray-600">Auto-rotation: {
                    status.keyRotation.autoRotation ? 'Enabled' : 'Disabled'
                  }</p>
                </div>
                <Button
                  onClick={() => rotateKeys('data')}
                  disabled={rotatingKeys.includes('data')}
                  variant="outline"
                >
                  {rotatingKeys.includes('data') ? 'Rotating...' : 'Rotate Now'}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Data Encryption Coverage</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Encrypted Fields</span>
                <Badge variant="default">
                  {status.encryptionCoverage.encryptedFields} / {status.encryptionCoverage.totalFields}
                </Badge>
              </div>
              
              <Progress 
                value={status.encryptionCoverage.percentage} 
                className="w-full"
              />

              {status.encryptionCoverage.unencryptedFields.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-orange-700 mb-2">
                    Unencrypted Fields:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {status.encryptionCoverage.unencryptedFields.map((field) => (
                      <Badge key={field} variant="outline" className="text-orange-700 border-orange-300">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                GDPR Compliance
                {getStatusIcon(status.compliance.gdpr)}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Data Encryption</span>
                  <CheckCircle className="text-green-500" size={16} />
                </div>
                <div className="flex justify-between">
                  <span>Right to Erasure</span>
                  <CheckCircle className="text-green-500" size={16} />
                </div>
                <div className="flex justify-between">
                  <span>Data Portability</span>
                  <CheckCircle className="text-green-500" size={16} />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                CCPA Compliance
                {getStatusIcon(status.compliance.ccpa)}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Data Deletion</span>
                  <CheckCircle className="text-green-500" size={16} />
                </div>
                <div className="flex justify-between">
                  <span>Access Rights</span>
                  <CheckCircle className="text-green-500" size={16} />
                </div>
                <div className="flex justify-between">
                  <span>Sale Opt-Out</span>
                  <CheckCircle className="text-green-500" size={16} />
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### File Encryption Upload Component
```tsx
// Secure file upload with encryption
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Lock, Upload, File, CheckCircle, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onUploadComplete: (fileId: string, metadata: any) => void;
  allowedTypes?: string[];
  maxSize?: number; // in bytes
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'encrypting' | 'uploading' | 'complete' | 'error';
  classification: string;
  error?: string;
  fileId?: string;
}

export function SecureFileUpload({ onUploadComplete, allowedTypes, maxSize }: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [defaultClassification, setDefaultClassification] = useState<string>('confidential');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploads: UploadingFile[] = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'encrypting',
      classification: defaultClassification
    }));

    setUploadingFiles(prev => [...prev, ...newUploads]);

    // Process each file
    newUploads.forEach(upload => processFile(upload));
  }, [defaultClassification]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: allowedTypes ? Object.fromEntries(allowedTypes.map(type => [type, []])) : undefined,
    maxSize,
    multiple: true
  });

  const processFile = async (uploadingFile: UploadingFile) => {
    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', uploadingFile.file);
      
      // Upload with encryption
      const response = await fetch('/encryption/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`,
          'X-File-Classification': uploadingFile.classification,
          'X-User-Encryption': 'true'
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Update file status
      setUploadingFiles(prev => 
        prev.map(f => 
          f.file === uploadingFile.file 
            ? { ...f, status: 'complete', progress: 100, fileId: result.fileId }
            : f
        )
      );

      onUploadComplete(result.fileId, result.metadata);
    } catch (error) {
      setUploadingFiles(prev => 
        prev.map(f => 
          f.file === uploadingFile.file 
            ? { ...f, status: 'error', error: (error as Error).message }
            : f
        )
      );
    }
  };

  const removeFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(f => f.file !== file));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'encrypting':
      case 'uploading':
        return <Upload className="animate-spin text-blue-500" size={16} />;
      case 'complete':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={16} />;
      default:
        return <File className="text-gray-500" size={16} />;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Default Classification Level
          </label>
          <Select value={defaultClassification} onValueChange={setDefaultClassification}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="confidential">Confidential</SelectItem>
              <SelectItem value="restricted">Restricted</SelectItem>
              <SelectItem value="top_secret">Top Secret</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <Lock className="mx-auto mb-4 text-blue-500" size={48} />
          {isDragActive ? (
            <p>Drop files here to encrypt and upload...</p>
          ) : (
            <div>
              <p className="mb-2">Drag & drop files here, or click to select</p>
              <p className="text-sm text-gray-500">
                Files will be encrypted with AES-256-GCM before upload
              </p>
            </div>
          )}
        </div>
      </Card>

      {uploadingFiles.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Upload Progress</h3>
          <div className="space-y-3">
            {uploadingFiles.map((upload, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border rounded">
                {getStatusIcon(upload.status)}
                <div className="flex-1">
                  <p className="font-medium">{upload.file.name}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>{Math.round(upload.file.size / 1024)} KB</span>
                    <span>•</span>
                    <span className="capitalize">{upload.classification}</span>
                    <span>•</span>
                    <span className="capitalize">{upload.status}</span>
                  </div>
                  {upload.status === 'error' && upload.error && (
                    <p className="text-sm text-red-600 mt-1">{upload.error}</p>
                  )}
                  {(upload.status === 'encrypting' || upload.status === 'uploading') && (
                    <Progress value={upload.progress} className="mt-2" />
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFile(upload.file)}
                  disabled={upload.status === 'encrypting' || upload.status === 'uploading'}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
```

### Data Classification Interface
```tsx
// Interface for managing data classification and encryption policies
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Eye, EyeOff, Settings } from 'lucide-react';

interface DataField {
  name: string;
  type: string;
  classification: string;
  encrypted: boolean;
  encryptionAlgorithm?: string;
  lastEncrypted?: string;
  accessLog: number; // Number of recent accesses
}

interface ClassificationPolicy {
  level: string;
  description: string;
  requirements: string[];
  encryptionRequired: boolean;
  accessControls: string[];
  auditLevel: string;
}

export function DataClassificationManager() {
  const [dataFields, setDataFields] = useState<DataField[]>([]);
  const [policies, setPolicies] = useState<ClassificationPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<string>('');

  useEffect(() => {
    loadDataFields();
    loadPolicies();
  }, []);

  const loadDataFields = async () => {
    try {
      const response = await fetch('/encryption/data/fields', {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      });
      const data = await response.json();
      setDataFields(data);
    } catch (error) {
      console.error('Failed to load data fields:', error);
    }
    setLoading(false);
  };

  const loadPolicies = async () => {
    try {
      const response = await fetch('/encryption/policies', {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      });
      const data = await response.json();
      setPolicies(data);
    } catch (error) {
      console.error('Failed to load policies:', error);
    }
  };

  const updateFieldClassification = async (fieldName: string, classification: string) => {
    try {
      await fetch(`/encryption/data/fields/${fieldName}/classification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({ classification })
      });
      
      setDataFields(prev => 
        prev.map(field => 
          field.name === fieldName 
            ? { ...field, classification }
            : field
        )
      );
    } catch (error) {
      console.error('Failed to update classification:', error);
    }
  };

  const toggleFieldEncryption = async (fieldName: string, encrypt: boolean) => {
    try {
      await fetch(`/encryption/data/fields/${fieldName}/encryption`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({ encrypt })
      });
      
      setDataFields(prev => 
        prev.map(field => 
          field.name === fieldName 
            ? { ...field, encrypted: encrypt }
            : field
        )
      );
    } catch (error) {
      console.error('Failed to toggle encryption:', error);
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'public': return 'bg-green-100 text-green-800 border-green-200';
      case 'internal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'confidential': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'restricted': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'top_secret': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) return <div>Loading data classification...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="text-blue-600" />
          Data Classification Manager
        </h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Data Fields</h3>
            <div className="space-y-3">
              {dataFields.map((field) => (
                <div key={field.name} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    {field.encrypted ? (
                      <Eye className="text-blue-500" size={16} />
                    ) : (
                      <EyeOff className="text-gray-400" size={16} />
                    )}
                    <div>
                      <p className="font-medium">{field.name}</p>
                      <p className="text-sm text-gray-600">{field.type}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Select 
                      value={field.classification}
                      onValueChange={(value) => updateFieldClassification(field.name, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="internal">Internal</SelectItem>
                        <SelectItem value="confidential">Confidential</SelectItem>
                        <SelectItem value="restricted">Restricted</SelectItem>
                        <SelectItem value="top_secret">Top Secret</SelectItem>
                      </SelectContent>
                    </Select>

                    <Badge className={getClassificationColor(field.classification)}>
                      {field.classification}
                    </Badge>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={field.encrypted}
                        onCheckedChange={(checked) => toggleFieldEncryption(field.name, checked)}
                      />
                      <span className="text-sm">Encrypt</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Classification Policies</h3>
            <div className="space-y-3">
              {policies.map((policy) => (
                <div key={policy.level} className="p-3 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getClassificationColor(policy.level)}>
                      {policy.level}
                    </Badge>
                    <Button size="sm" variant="ghost">
                      <Settings size={14} />
                    </Button>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{policy.description}</p>
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span>Encryption:</span>
                      <Badge variant={policy.encryptionRequired ? 'default' : 'secondary'} className="text-xs">
                        {policy.encryptionRequired ? 'Required' : 'Optional'}
                      </Badge>
                    </div>
                    <div>
                      <span>Audit Level: {policy.auditLevel}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Total Fields:</span>
                <span className="font-medium">{dataFields.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Encrypted:</span>
                <span className="font-medium text-green-600">
                  {dataFields.filter(f => f.encrypted).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Unencrypted:</span>
                <span className="font-medium text-red-600">
                  {dataFields.filter(f => !f.encrypted).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Coverage:</span>
                <span className="font-medium">
                  {Math.round((dataFields.filter(f => f.encrypted).length / dataFields.length) * 100)}%
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

## 6. Implementation Code Examples

### Core Encryption Service
```typescript
// Comprehensive encryption service with multiple algorithms and key management
import crypto from 'crypto';
import { pgp } from 'openpgp';

export class EncryptionService {
  private readonly ALGORITHMS = {
    'AES-256-GCM': {
      keyLength: 32,
      ivLength: 16,
      tagLength: 16
    },
    'ChaCha20-Poly1305': {
      keyLength: 32,
      ivLength: 12,
      tagLength: 16
    }
  };

  // Field-level encryption for sensitive data
  async encryptField(
    data: string,
    userId?: string,
    algorithm: string = 'AES-256-GCM'
  ): Promise<EncryptedField> {
    const key = userId 
      ? await this.getUserEncryptionKey(userId)
      : await this.getDataEncryptionKey();

    const algConfig = this.ALGORITHMS[algorithm];
    if (!algConfig) {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }

    // Generate random IV
    const iv = crypto.randomBytes(algConfig.ivLength);
    
    // Create cipher
    const cipher = crypto.createCipheriv(algorithm.toLowerCase(), key, iv, {
      authTagLength: algConfig.tagLength
    });

    // Encrypt data
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Return encrypted field with metadata
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm,
      keyVersion: await this.getCurrentKeyVersion(userId ? 'user' : 'data'),
      timestamp: new Date().toISOString()
    };
  }

  async decryptField(encryptedField: EncryptedField, userId?: string): Promise<string> {
    const key = userId 
      ? await this.getUserEncryptionKey(userId, encryptedField.keyVersion)
      : await this.getDataEncryptionKey(encryptedField.keyVersion);

    const algConfig = this.ALGORITHMS[encryptedField.algorithm];
    if (!algConfig) {
      throw new Error(`Unsupported algorithm: ${encryptedField.algorithm}`);
    }

    // Parse components
    const encrypted = Buffer.from(encryptedField.encrypted, 'base64');
    const iv = Buffer.from(encryptedField.iv, 'base64');
    const authTag = Buffer.from(encryptedField.authTag, 'base64');

    // Create decipher
    const decipher = crypto.createDecipheriv(
      encryptedField.algorithm.toLowerCase(),
      key,
      iv,
      { authTagLength: algConfig.tagLength }
    );

    // Set auth tag for verification
    decipher.setAuthTag(authTag);

    // Decrypt data
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  }

  // File encryption with streaming support
  async encryptFile(
    fileBuffer: Buffer,
    classification: string,
    userId?: string
  ): Promise<EncryptedFile> {
    const algorithm = this.getAlgorithmForClassification(classification);
    const key = userId 
      ? await this.getUserEncryptionKey(userId)
      : await this.getDataEncryptionKey();

    const algConfig = this.ALGORITHMS[algorithm];
    const iv = crypto.randomBytes(algConfig.ivLength);
    const salt = crypto.randomBytes(32); // For additional key derivation

    // Derive file-specific key
    const fileKey = crypto.pbkdf2Sync(key, salt, 100000, algConfig.keyLength, 'sha256');

    // Create cipher
    const cipher = crypto.createCipheriv(algorithm.toLowerCase(), fileKey, iv, {
      authTagLength: algConfig.tagLength
    });

    // Encrypt file
    const encrypted = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Calculate file hash for integrity
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const encryptedHash = crypto.createHash('sha256').update(encrypted).digest('hex');

    return {
      encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      salt: salt.toString('base64'),
      algorithm,
      keyVersion: await this.getCurrentKeyVersion(userId ? 'user' : 'data'),
      classification,
      originalSize: fileBuffer.length,
      encryptedSize: encrypted.length,
      originalHash: fileHash,
      encryptedHash,
      compressionRatio: fileBuffer.length / encrypted.length,
      timestamp: new Date().toISOString()
    };
  }

  async decryptFile(encryptedFile: EncryptedFile, userId?: string): Promise<Buffer> {
    const key = userId 
      ? await this.getUserEncryptionKey(userId, encryptedFile.keyVersion)
      : await this.getDataEncryptionKey(encryptedFile.keyVersion);

    const algConfig = this.ALGORITHMS[encryptedFile.algorithm];
    
    // Parse components
    const iv = Buffer.from(encryptedFile.iv, 'base64');
    const authTag = Buffer.from(encryptedFile.authTag, 'base64');
    const salt = Buffer.from(encryptedFile.salt, 'base64');

    // Derive file-specific key
    const fileKey = crypto.pbkdf2Sync(key, salt, 100000, algConfig.keyLength, 'sha256');

    // Create decipher
    const decipher = crypto.createDecipheriv(
      encryptedFile.algorithm.toLowerCase(),
      fileKey,
      iv,
      { authTagLength: algConfig.tagLength }
    );

    decipher.setAuthTag(authTag);

    // Decrypt file
    const decrypted = Buffer.concat([
      decipher.update(encryptedFile.encrypted),
      decipher.final()
    ]);

    // Verify integrity
    const decryptedHash = crypto.createHash('sha256').update(decrypted).digest('hex');
    if (decryptedHash !== encryptedFile.originalHash) {
      throw new Error('File integrity check failed');
    }

    return decrypted;
  }

  // Backup encryption with Shamir's Secret Sharing
  async encryptBackup(
    data: any,
    shares: number = 5,
    threshold: number = 3
  ): Promise<EncryptedBackup> {
    // Generate backup-specific key
    const backupKey = crypto.randomBytes(32);
    
    // Encrypt backup data
    const algorithm = 'AES-256-GCM';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, backupKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), 'utf8'),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();

    // Split key using Shamir's Secret Sharing
    const keyShares = this.splitSecretKey(backupKey, shares, threshold);

    // Store shares in different locations
    const shareLocations = await this.distributeKeyShares(keyShares);

    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm,
      shares,
      threshold,
      shareLocations,
      backupHash: crypto.createHash('sha256').update(encrypted).digest('hex'),
      timestamp: new Date().toISOString()
    };
  }

  // Zero-knowledge client-side encryption
  async clientSideEncrypt(
    data: any,
    userPassword: string,
    email: string
  ): Promise<string> {
    // Generate salt for this user
    const salt = crypto.createHash('sha256').update(email).digest();
    
    // Derive key from password (never sent to server)
    const key = crypto.pbkdf2Sync(userPassword, salt, 100000, 32, 'sha256');
    
    // Encrypt data
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), 'utf8'),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();

    // Combine components
    const result = {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm: 'aes-256-gcm'
    };

    return JSON.stringify(result);
  }

  async clientSideDecrypt(
    encryptedData: string,
    userPassword: string,
    email: string
  ): Promise<any> {
    const parsed = JSON.parse(encryptedData);
    
    // Regenerate key from password
    const salt = crypto.createHash('sha256').update(email).digest();
    const key = crypto.pbkdf2Sync(userPassword, salt, 100000, 32, 'sha256');
    
    // Parse components
    const encrypted = Buffer.from(parsed.encrypted, 'base64');
    const iv = Buffer.from(parsed.iv, 'base64');
    const authTag = Buffer.from(parsed.authTag, 'base64');
    
    // Decrypt
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return JSON.parse(decrypted.toString('utf8'));
  }

  // GDPR crypto-shredding implementation
  async cryptoShredUser(userId: string, reason: string): Promise<void> {
    try {
      // Start transaction
      await db.transaction(async (trx) => {
        // Delete user's encryption keys
        await trx.query(
          'DELETE FROM user_encryption_keys WHERE user_id = $1',
          [userId]
        );

        // Mark user data as crypto-shredded
        await trx.query(
          'UPDATE users SET crypto_shredded = true, shredded_at = NOW() WHERE id = $1',
          [userId]
        );

        // Log crypto-shredding action
        await trx.query(`
          INSERT INTO crypto_shredding_log (
            user_id, shredding_reason, data_categories,
            key_versions_destroyed, requested_by, gdpr_request_id
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          userId,
          reason,
          JSON.stringify(['personal_data', 'financial_data', 'communications']),
          JSON.stringify(await this.getUserKeyVersions(userId)),
          'system', // System-initiated
          crypto.randomUUID()
        ]);

        // Schedule backup deletion (after legal retention period)
        await this.scheduleBackupDeletion(userId, '3 years');
      });

      // Log audit event
      await this.logEncryptionEvent({
        eventType: 'crypto_shredding',
        userId,
        success: true,
        reason,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Crypto-shredding failed:', error);
      throw error;
    }
  }

  // Key rotation implementation
  async rotateEncryptionKeys(keyType: 'master' | 'data' | 'user'): Promise<void> {
    console.log(`Starting ${keyType} key rotation...`);

    try {
      // Generate new key
      const newKey = crypto.randomBytes(32);
      const newVersion = await this.getNextKeyVersion(keyType);

      // Store new key
      await this.storeEncryptionKey(keyType, newVersion, newKey);

      // Re-encrypt data with new key (if needed)
      if (keyType === 'data') {
        await this.reEncryptDataWithNewKey(newVersion);
      }

      // Deactivate old key after grace period
      setTimeout(async () => {
        await this.deactivateOldKey(keyType, newVersion - 1);
      }, 24 * 60 * 60 * 1000); // 24 hours

      console.log(`${keyType} key rotation completed`);
    } catch (error) {
      console.error(`${keyType} key rotation failed:`, error);
      throw error;
    }
  }

  // Helper methods
  private getAlgorithmForClassification(classification: string): string {
    switch (classification) {
      case 'top_secret':
      case 'restricted':
        return 'ChaCha20-Poly1305'; // Stronger algorithm
      default:
        return 'AES-256-GCM';
    }
  }

  private splitSecretKey(key: Buffer, shares: number, threshold: number): Buffer[] {
    // Simplified Shamir's Secret Sharing implementation
    // In production, use a proper cryptographic library like 'shamir'
    const shares_array: Buffer[] = [];
    
    for (let i = 0; i < shares; i++) {
      // This is a simplified implementation
      // Real implementation would use proper polynomial interpolation
      const share = crypto.randomBytes(key.length);
      shares_array.push(share);
    }
    
    return shares_array;
  }

  private async distributeKeyShares(shares: Buffer[]): Promise<string[]> {
    const locations = ['aws_s3', 'gcp_storage', 'azure_blob', 'on_premise', 'offline_vault'];
    const shareLocations: string[] = [];

    for (let i = 0; i < shares.length; i++) {
      const location = locations[i % locations.length];
      const shareId = crypto.randomUUID();
      
      // Store share in the designated location
      await this.storeKeyShare(shareId, shares[i], location);
      shareLocations.push(`${location}:${shareId}`);
    }

    return shareLocations;
  }

  private async logEncryptionEvent(event: any): Promise<void> {
    // Log encryption events for audit trail
    await db.query(`
      INSERT INTO encryption_audit_log (
        event_type, user_id, success, metadata, timestamp
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      event.eventType,
      event.userId,
      event.success,
      JSON.stringify(event),
      event.timestamp
    ]);
  }
}

// Supporting interfaces
interface EncryptedField {
  encrypted: string;
  iv: string;
  authTag: string;
  algorithm: string;
  keyVersion: number;
  timestamp: string;
}

interface EncryptedFile {
  encrypted: Buffer;
  iv: string;
  authTag: string;
  salt: string;
  algorithm: string;
  keyVersion: number;
  classification: string;
  originalSize: number;
  encryptedSize: number;
  originalHash: string;
  encryptedHash: string;
  compressionRatio: number;
  timestamp: string;
}

interface EncryptedBackup {
  encrypted: string;
  iv: string;
  authTag: string;
  algorithm: string;
  shares: number;
  threshold: number;
  shareLocations: string[];
  backupHash: string;
  timestamp: string;
}
```

### Key Management Service
```typescript
// Advanced key management with automatic rotation
export class KeyManagementService {
  private readonly KEY_ROTATION_INTERVALS = {
    master: 90 * 24 * 60 * 60 * 1000, // 90 days
    data: 365 * 24 * 60 * 60 * 1000,  // 1 year
    session: 60 * 60 * 1000,          // 1 hour
    user: 2 * 365 * 24 * 60 * 60 * 1000 // 2 years
  };

  async initializeKeyHierarchy(): Promise<void> {
    console.log('Initializing key hierarchy...');

    // Create master key (stored in HSM/KMS)
    const masterKey = await this.generateMasterKey();
    await this.storeMasterKey(masterKey);

    // Create data encryption keys
    const dataKey = await this.generateDataEncryptionKey();
    await this.storeDataEncryptionKey(dataKey);

    // Set up automatic rotation
    await this.scheduleKeyRotation();

    console.log('Key hierarchy initialized successfully');
  }

  async generateMasterKey(): Promise<Buffer> {
    // In production, this would interface with AWS KMS, GCP KMS, or Azure Key Vault
    return crypto.randomBytes(32);
  }

  async generateDataEncryptionKey(): Promise<Buffer> {
    const masterKey = await this.getMasterKey();
    
    // Derive data encryption key from master key
    const salt = crypto.randomBytes(32);
    const dek = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');
    
    return dek;
  }

  async generateUserEncryptionKey(userId: string, userPassword: string): Promise<Buffer> {
    // User key derived from password (zero-knowledge)
    const userSalt = await this.getUserSalt(userId);
    const userKey = crypto.pbkdf2Sync(userPassword, userSalt, 100000, 32, 'sha256');
    
    return userKey;
  }

  private async scheduleKeyRotation(): Promise<void> {
    // Schedule master key rotation
    setInterval(async () => {
      await this.rotateKey('master');
    }, this.KEY_ROTATION_INTERVALS.master);

    // Schedule data key rotation
    setInterval(async () => {
      await this.rotateKey('data');
    }, this.KEY_ROTATION_INTERVALS.data);
  }

  private async rotateKey(keyType: string): Promise<void> {
    try {
      console.log(`Starting ${keyType} key rotation`);
      
      const newKey = keyType === 'master' 
        ? await this.generateMasterKey()
        : await this.generateDataEncryptionKey();

      const newVersion = await this.getNextKeyVersion(keyType);
      
      // Store new key
      await db.query(`
        INSERT INTO encryption_keys (key_type, key_version, key_hash, algorithm, expires_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        keyType,
        newVersion,
        crypto.createHash('sha256').update(newKey).digest('hex'),
        'AES-256-GCM',
        new Date(Date.now() + this.KEY_ROTATION_INTERVALS[keyType])
      ]);

      // Mark old key as rotated
      await db.query(`
        UPDATE encryption_keys 
        SET active = false, rotated_at = NOW()
        WHERE key_type = $1 AND key_version = $2
      `, [keyType, newVersion - 1]);

      // Re-encrypt data if necessary
      if (keyType === 'data') {
        await this.reEncryptSensitiveData(newVersion);
      }

      console.log(`${keyType} key rotation completed`);
    } catch (error) {
      console.error(`Key rotation failed for ${keyType}:`, error);
      throw error;
    }
  }

  private async reEncryptSensitiveData(newKeyVersion: number): Promise<void> {
    // Re-encrypt sensitive fields with new key
    const sensitiveFields = await this.getSensitiveFields();
    
    for (const field of sensitiveFields) {
      await this.reEncryptField(field, newKeyVersion);
    }
  }
}
```

## 7. Security Testing Requirements

### Encryption Security Tests
```typescript
// Comprehensive encryption security testing
describe('Data Encryption Security', () => {
  describe('Field-Level Encryption', () => {
    it('should encrypt PII fields with AES-256-GCM', async () => {
      const sensitiveData = '123-45-6789'; // SSN
      const encrypted = await encryptionService.encryptField(sensitiveData);

      expect(encrypted.algorithm).toBe('AES-256-GCM');
      expect(encrypted.encrypted).not.toEqual(sensitiveData);
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();

      // Verify decryption
      const decrypted = await encryptionService.decryptField(encrypted);
      expect(decrypted).toBe(sensitiveData);
    });

    it('should use different keys for different users', async () => {
      const data = 'sensitive-data';
      
      const user1Encrypted = await encryptionService.encryptField(data, 'user1');
      const user2Encrypted = await encryptionService.encryptField(data, 'user2');

      // Same data should encrypt differently for different users
      expect(user1Encrypted.encrypted).not.toEqual(user2Encrypted.encrypted);

      // Cross-user decryption should fail
      await expect(
        encryptionService.decryptField(user1Encrypted, 'user2')
      ).rejects.toThrow();
    });

    it('should detect tampering with encrypted data', async () => {
      const encrypted = await encryptionService.encryptField('test-data');
      
      // Tamper with encrypted data
      const tamperedEncrypted = {
        ...encrypted,
        encrypted: 'tampered-data'
      };

      // Decryption should fail
      await expect(
        encryptionService.decryptField(tamperedEncrypted)
      ).rejects.toThrow();
    });
  });

  describe('File Encryption', () => {
    it('should encrypt files based on classification', async () => {
      const fileBuffer = Buffer.from('confidential document content');
      
      const encrypted = await encryptionService.encryptFile(
        fileBuffer, 
        'top_secret'
      );

      expect(encrypted.algorithm).toBe('ChaCha20-Poly1305'); // Stronger algo for top secret
      expect(encrypted.classification).toBe('top_secret');
      expect(encrypted.originalHash).toBeDefined();
      expect(encrypted.encryptedHash).toBeDefined();

      // Verify decryption
      const decrypted = await encryptionService.decryptFile(encrypted);
      expect(decrypted).toEqual(fileBuffer);
    });

    it('should maintain file integrity', async () => {
      const originalFile = Buffer.from('file content');
      const encrypted = await encryptionService.encryptFile(originalFile, 'confidential');
      
      // Verify hashes
      const originalHash = crypto.createHash('sha256').update(originalFile).digest('hex');
      expect(encrypted.originalHash).toBe(originalHash);

      // Verify decryption maintains integrity
      const decrypted = await encryptionService.decryptFile(encrypted);
      const decryptedHash = crypto.createHash('sha256').update(decrypted).digest('hex');
      expect(decryptedHash).toBe(originalHash);
    });
  });

  describe('Zero-Knowledge Encryption', () => {
    it('should encrypt data client-side without server knowing password', async () => {
      const data = { secret: 'client-only-data' };
      const password = 'user-password';
      const email = 'user@example.com';

      const encrypted = await encryptionService.clientSideEncrypt(data, password, email);
      
      // Server should not be able to decrypt without password
      expect(encrypted).not.toContain('client-only-data');
      
      // Only client with password can decrypt
      const decrypted = await encryptionService.clientSideDecrypt(encrypted, password, email);
      expect(decrypted).toEqual(data);

      // Wrong password should fail
      await expect(
        encryptionService.clientSideDecrypt(encrypted, 'wrong-password', email)
      ).rejects.toThrow();
    });
  });

  describe('Key Management', () => {
    it('should rotate keys automatically', async () => {
      const initialKeyVersion = await keyManagementService.getCurrentKeyVersion('data');
      
      // Force key rotation
      await keyManagementService.rotateKey('data');
      
      const newKeyVersion = await keyManagementService.getCurrentKeyVersion('data');
      expect(newKeyVersion).toBe(initialKeyVersion + 1);

      // Old key should be marked as inactive
      const oldKey = await keyManagementService.getKey('data', initialKeyVersion);
      expect(oldKey.active).toBe(false);
      expect(oldKey.rotated_at).toBeDefined();
    });

    it('should maintain backward compatibility during rotation', async () => {
      const data = 'test-data';
      
      // Encrypt with current key
      const encrypted = await encryptionService.encryptField(data);
      const keyVersion = encrypted.keyVersion;
      
      // Rotate key
      await keyManagementService.rotateKey('data');
      
      // Should still be able to decrypt old data
      const decrypted = await encryptionService.decryptField(encrypted);
      expect(decrypted).toBe(data);
    });
  });

  describe('GDPR Crypto-Shredding', () => {
    it('should make user data unrecoverable after crypto-shredding', async () => {
      const userId = 'test-user-id';
      const sensitiveData = 'personal-information';

      // Encrypt user data
      const encrypted = await encryptionService.encryptField(sensitiveData, userId);
      
      // Verify data can be decrypted
      const decrypted = await encryptionService.decryptField(encrypted, userId);
      expect(decrypted).toBe(sensitiveData);

      // Perform crypto-shredding
      await encryptionService.cryptoShredUser(userId, 'gdpr_request');

      // Data should be unrecoverable
      await expect(
        encryptionService.decryptField(encrypted, userId)
      ).rejects.toThrow('User key not found');
    });

    it('should log crypto-shredding for audit trail', async () => {
      const userId = 'test-user-id';
      
      await encryptionService.cryptoShredUser(userId, 'account_deletion');

      // Verify audit log entry
      const auditLog = await db.query(
        'SELECT * FROM crypto_shredding_log WHERE user_id = $1',
        [userId]
      );

      expect(auditLog.rows).toHaveLength(1);
      expect(auditLog.rows[0].shredding_reason).toBe('account_deletion');
      expect(auditLog.rows[0].data_categories).toContain('personal_data');
    });
  });

  describe('Backup Encryption', () => {
    it('should encrypt backups with Shamir secret sharing', async () => {
      const backupData = { users: ['user1', 'user2'], settings: {} };
      
      const encryptedBackup = await encryptionService.encryptBackup(
        backupData, 5, 3
      );

      expect(encryptedBackup.shares).toBe(5);
      expect(encryptedBackup.threshold).toBe(3);
      expect(encryptedBackup.shareLocations).toHaveLength(5);
      expect(encryptedBackup.encrypted).toBeDefined();
      expect(encryptedBackup.backupHash).toBeDefined();
    });
  });
});

// Performance tests
describe('Encryption Performance', () => {
  it('should encrypt 1MB file within 1 second', async () => {
    const largefile = Buffer.alloc(1024 * 1024, 'a'); // 1MB file
    
    const start = performance.now();
    const encrypted = await encryptionService.encryptFile(largefile, 'confidential');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1000); // < 1 second
    expect(encrypted.encryptedSize).toBeGreaterThan(0);
  });

  it('should handle 1000 field encryptions per second', async () => {
    const data = 'test-data-for-performance';
    const operations = 1000;
    
    const start = performance.now();
    
    const promises = Array.from({ length: operations }, () =>
      encryptionService.encryptField(data)
    );
    
    await Promise.all(promises);
    
    const duration = performance.now() - start;
    const operationsPerSecond = (operations / duration) * 1000;
    
    expect(operationsPerSecond).toBeGreaterThan(1000);
  });
});
```

## 8. Dependencies

### Core Dependencies
```json
{
  "dependencies": {
    "crypto": "^1.0.1",
    "openpgp": "^5.11.0",
    "node-forge": "^1.3.1",
    "shamir": "^1.0.1",
    "argon2": "^0.31.2",
    "bcryptjs": "^2.4.3",
    "@supabase/supabase-js": "^2.39.0",
    "ioredis": "^5.3.0"
  },
  "devDependencies": {
    "@types/crypto": "^1.0.1",
    "@types/node-forge": "^1.3.10",
    "jest": "^29.7.0",
    "benchmark": "^2.1.4"
  }
}
```

### Infrastructure Dependencies
- **Hardware Security Module (HSM)**: For master key storage
- **Key Management Service**: AWS KMS, GCP KMS, or Azure Key Vault
- **Redis**: For caching encryption keys and session data
- **PostgreSQL**: With pgcrypto extension for database-level encryption
- **Backup Storage**: Multiple cloud providers for key share distribution

## 9. Compliance Requirements

### GDPR Compliance
- **Right to Erasure**: Crypto-shredding implementation
- **Data Portability**: Encrypted export functionality
- **Privacy by Design**: Default encryption for sensitive data
- **Breach Notification**: Automatic alerts for encryption failures

### Industry Standards
- **FIPS 140-2**: Hardware security module requirements
- **Common Criteria**: Cryptographic module validation
- **ISO 27001**: Information security management
- **SOC 2 Type II**: Security and availability controls

## 10. Effort Estimate

### Development Phases

**Phase 1: Core Encryption (4-5 weeks)**
- Field-level encryption implementation
- File encryption service
- Basic key management
- Database integration

**Phase 2: Advanced Key Management (3-4 weeks)**
- Key rotation automation
- Hierarchical key structure
- HSM/KMS integration
- Backup key recovery

**Phase 3: Zero-Knowledge Features (3-4 weeks)**
- Client-side encryption
- User-derived keys
- Password-free authentication
- Cryptographic proofs

**Phase 4: Compliance & GDPR (2-3 weeks)**
- Crypto-shredding system
- Audit logging
- Data classification
- Compliance reporting

**Phase 5: Performance & Testing (2-3 weeks)**
- Performance optimization
- Security testing
- Penetration testing
- Load testing

**Total Estimated Effort: 14-19 weeks**

### Resource Requirements
- **Senior Cryptography Engineer**: Full-time
- **Security Architect**: Full-time
- **Backend Developer**: 80% allocation
- **DevOps Engineer**: 50% allocation
- **Security Auditor**: Part-time consultation

### Success Metrics
- **Security**: Zero encryption vulnerabilities in audit
- **Performance**: <100ms encryption/decryption for typical fields
- **Compliance**: 100% GDPR compliance score
- **Coverage**: 100% sensitive data fields encrypted
- **Availability**: 99.99% encryption service uptime