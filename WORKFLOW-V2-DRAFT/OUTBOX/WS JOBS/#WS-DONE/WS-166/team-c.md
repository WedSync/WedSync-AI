# TEAM C - ROUND 1: WS-166 - Budget Reports & Export System - Integration & File Management

**Date:** 2025-01-20  
**Feature ID:** WS-166 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build file storage, delivery, and compression services for budget export system integration
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/budget-export/
cat $WS_ROOT/wedsync/src/lib/integrations/budget-export/file-manager.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test budget-export-integration
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

---

## 🎯 USER STORY & WEDDING CONTEXT

**As a:** Wedding couple managing their wedding budget
**I want to:** Generate and download comprehensive budget reports in PDF, CSV, or Excel formats with customizable filters
**So that:** I can share financial summaries with family, track spending against goals, and have professional documentation

**Real Wedding Problem This Solves:**
Sarah and Mike need to share their budget report with multiple stakeholders: parents contributing funds, their financial advisor, and wedding venues requiring payment documentation. The files need to be optimized for different delivery methods - email attachments for parents (compressed), cloud storage links for advisor (secure), and direct downloads for venue contracts (immediate access).

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION & REQUIREMENTS

**⚠️ CRITICAL: Load navigation and security requirements from centralized templates:**

```typescript
// MANDATORY: Load team prompt templates for requirements
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/03-DEV-MANAGER/TEAM-PROMPT-TEMPLATES.md");

// This contains:
// - Navigation Integration Requirements (MANDATORY for all UI features)
// - Security Requirements (MANDATORY for all API routes)  
// - UI Technology Stack requirements
// - All centralized checklists
```

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] **File Storage Service** - Supabase Storage integration for export files
- [ ] **File Compression Utility** - ZIP compression for large exports
- [ ] **Secure Download URLs** - Time-limited access tokens for file access
- [ ] **File Cleanup Service** - Automatic deletion of expired exports
- [ ] **Email Delivery Integration** - Send export files via email when requested
- [ ] **File Size Optimization** - Image compression and PDF optimization
- [ ] **Storage Quota Management** - Monitor and manage export storage usage
- [ ] **Integration Testing** - End-to-end file flow validation
- [ ] **Evidence package** - Proof of file creation, typecheck, and test results

### Round 2 (Enhancement & Polish):
- [ ] Advanced compression algorithms for different file types
- [ ] Batch file operations for multiple export requests
- [ ] CDN integration for faster global file delivery
- [ ] File metadata enrichment and tracking

### Round 3 (Integration & Finalization):
- [ ] Full integration with Teams A and B
- [ ] Complete E2E testing with Team E
- [ ] Documentation with Team E
- [ ] Production monitoring and alerts

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Export completion callbacks and file generation status - Required for storage triggers
- FROM Team B: Generated file buffers and metadata - Required for storage operations
- FROM existing system: Supabase storage configuration and authentication

### What other teams NEED from you:
- TO Team A: Secure download URLs and file status APIs - Blocking their download functionality
- TO Team B: File storage confirmation callbacks - Blocking their export completion
- TO Team D: File storage metrics and optimization hooks - Blocking their performance monitoring

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Integrations: `$WS_ROOT/wedsync/src/lib/integrations/budget-export/`
- Services: `$WS_ROOT/wedsync/src/lib/services/file-management/`
- Utilities: `$WS_ROOT/wedsync/src/lib/utils/compression.ts`
- Email: `$WS_ROOT/wedsync/src/lib/email/export-delivery.ts`
- Tests: `$WS_ROOT/wedsync/__tests__/integrations/budget-export/`

### Team Reports:
- **Output to:** `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-166-budget-export-integration-team-c-round-1-complete.md`
- **Update tracker:** Add entry to `$WS_ROOT/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`

## 🛠️ TECHNICAL SPECIFICATIONS

### Key Services to Build:

1. **ExportFileManager**:
```typescript
class ExportFileManager {
  static async storeExportFile(
    exportId: string,
    fileBuffer: Buffer,
    fileName: string,
    contentType: string
  ): Promise<{ url: string; expiresAt: Date }>;

  static async generateSecureDownloadUrl(
    exportId: string,
    expirationHours: number = 24
  ): Promise<string>;

  static async deleteExpiredExports(): Promise<void>;

  static async getFileMetadata(exportId: string): Promise<FileMetadata>;
}
```

2. **FileCompressionService**:
```typescript
class FileCompressionService {
  static async compressFile(
    fileBuffer: Buffer,
    compressionLevel: number = 6
  ): Promise<{ compressed: Buffer; originalSize: number; compressedSize: number }>;

  static async createZipArchive(
    files: Array<{ name: string; buffer: Buffer }>
  ): Promise<Buffer>;

  static async optimizePDF(pdfBuffer: Buffer): Promise<Buffer>;
}
```

3. **ExportEmailService**:
```typescript
class ExportEmailService {
  static async sendExportEmail(
    coupleId: string,
    exportData: ExportMetadata,
    attachmentUrl: string
  ): Promise<boolean>;

  static async sendExportFailureNotification(
    coupleId: string,
    exportId: string,
    error: string
  ): Promise<boolean>;
}
```

### Integration Points:

1. **Supabase Storage Configuration**:
```typescript
// Storage bucket: 'budget-exports'
// Path structure: /{couple_id}/{export_id}/{filename}
// Retention policy: 7 days auto-deletion
// Access control: Authenticated users only, own files only

const storageConfig = {
  bucket: 'budget-exports',
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: ['application/pdf', 'text/csv', 'application/vnd.ms-excel'],
  retentionDays: 7
};
```

2. **File Processing Workflow**:
```typescript
interface FileProcessingWorkflow {
  // 1. Receive generated file from Team B
  onFileGenerated(exportId: string, fileBuffer: Buffer, metadata: FileMetadata): Promise<void>;
  
  // 2. Compress if necessary (files > 5MB)
  compressIfNeeded(fileBuffer: Buffer): Promise<Buffer>;
  
  // 3. Store in Supabase Storage
  storeSecurely(exportId: string, fileBuffer: Buffer): Promise<string>;
  
  // 4. Generate secure download URL
  createDownloadUrl(storageUrl: string): Promise<string>;
  
  // 5. Notify Team B of completion
  notifyStorageComplete(exportId: string, downloadUrl: string): Promise<void>;
  
  // 6. Send email if requested
  sendEmailIfRequested(exportData: ExportRequest): Promise<void>;
}
```

### Security & Performance Requirements:

1. **File Access Security**:
```typescript
// Implement Row Level Security for storage access
// Verify couple_id matches authenticated user
// Generate time-limited signed URLs (24-hour expiration)
// Prevent direct file access without authentication
```

2. **Storage Optimization**:
```typescript
// Implement file deduplication for identical exports
// Compress files > 1MB automatically
// Use progressive loading for large file downloads
// Monitor storage quotas per couple (100MB limit)
```

3. **Email Delivery Integration**:
```typescript
// Use existing email service from WedSync
// Support attachments up to 10MB
// Fallback to download links for larger files
// Track delivery status and bounce handling
```

### Error Handling & Monitoring:

1. **Storage Failures**:
```typescript
// Retry failed uploads with exponential backoff
// Alert on storage quota exceeded
// Handle network timeouts gracefully
// Provide meaningful error messages to users
```

2. **File Corruption Protection**:
```typescript
// Validate file integrity before and after compression
// Store checksums for verification
// Implement file recovery mechanisms
// Log all file operations for audit trail
```

### Integration Testing Requirements:
- Test complete file flow from generation to download
- Validate compression ratios and file integrity
- Test email delivery with various file sizes
- Verify cleanup processes remove expired files
- Test concurrent export processing
- Validate security access controls

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY