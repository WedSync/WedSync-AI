# TEAM B - ROUND 1: WS-178 - Backup Procedures Automation
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build automated backup engine with database operations and secure backup orchestration
**FEATURE ID:** WS-178 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about backup failure scenarios and data integrity validation

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/backup/
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/backup/backup-scheduler.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test src/lib/backup/
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query backup and database-related patterns
await mcp__serena__search_for_pattern("database.*backup");
await mcp__serena__search_for_pattern("cron.*job");
await mcp__serena__find_symbol("supabase", "", true);
await mcp__serena__get_symbols_overview("src/lib/");
```

### B. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to this feature
await mcp__Ref__ref_search_documentation("Node.js backup automation cron scheduling");
await mcp__Ref__ref_search_documentation("Supabase database backup procedures pg_dump");
await mcp__Ref__ref_search_documentation("PostgreSQL backup best practices");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Building a backup system requires careful orchestration: 1) Database dump creation using pg_dump or Supabase backup APIs 2) File compression and encryption for security 3) Upload to secure storage (S3/similar) 4) Verification by attempting restore to test database 5) Cleanup of old backups based on retention policy 6) Failure handling and alerting. Each step must be atomic and recoverable.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down backup workflow steps
2. **database-mcp-specialist** - Use Supabase MCP for backup queries
3. **security-compliance-officer** - Ensure encrypted backup storage
4. **code-quality-guardian** - Maintain Node.js/TypeScript standards
5. **test-automation-architect** - Comprehensive backup testing
6. **documentation-chronicler** - Evidence-based API documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Admin authentication check** - getServerSession() for admin-only routes
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit() for backup triggers
- [ ] **Backup encryption at rest** - Encrypt backup files before storage
- [ ] **Secure credential handling** - Use environment variables for storage credentials
- [ ] **Backup integrity validation** - Verify backup completeness before marking success
- [ ] **Error messages sanitized** - Never leak database connection details
- [ ] **Audit logging** - Log all backup operations with admin context

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**YOUR CORE RESPONSIBILITIES:**
- API endpoints with security validation middleware
- Database operations and backup orchestration
- withSecureValidation middleware implementation
- Authentication and authorization logic
- Error handling and comprehensive logging
- Business logic for backup scheduling

### SPECIFIC DELIVERABLES FOR WS-178:

#### 1. BackupScheduler.ts - Core backup orchestration engine
```typescript
export class BackupScheduler {
  async runDailyBackup(): Promise<void> {
    // Implementation from technical specification
    // Must handle: database dump, compression, upload, verification
  }
  
  async scheduleBackups(cronExpression: string): Promise<void> {
    // Cron job scheduling with proper error handling
  }
  
  private async createDatabaseDump(): Promise<string> {
    // Supabase/PostgreSQL dump creation
  }
  
  private async verifyBackup(location: string): Promise<boolean> {
    // Backup integrity verification
  }
}
```

#### 2. /api/admin/backup/route.ts - Admin backup management API
```typescript
// GET /api/admin/backup - List backup status and history
// POST /api/admin/backup/trigger - Manual backup trigger
// PUT /api/admin/backup/config - Update backup configuration
// DELETE /api/admin/backup/{id} - Delete specific backup

interface BackupTriggerRequest {
  backupType: 'full' | 'incremental' | 'differential';
  immediate: boolean;
}

interface BackupConfigRequest {
  schedule: string; // Cron expression
  retentionDays: number;
  notificationSettings: NotificationConfig;
}
```

#### 3. restore-manager.ts - Disaster recovery engine
```typescript
export class RestoreManager {
  async restoreFromBackup(backupId: string, targetDatabase?: string): Promise<RestoreResult> {
    // Backup restoration with progress tracking
  }
  
  async validateRestoreIntegrity(restoredData: any): Promise<ValidationResult> {
    // Verify restored data completeness
  }
}
```

#### 4. verification-engine.ts - Backup validation service
```typescript
export class VerificationEngine {
  async verifyBackupIntegrity(backupFile: string): Promise<VerificationResult> {
    // File integrity checks, size validation, format verification
  }
  
  async testRestore(backupLocation: string): Promise<TestResult> {
    // Attempt restore to temporary database for verification
  }
}
```

## 📋 DATABASE SCHEMA IMPLEMENTATION

### MUST CREATE MIGRATION:
```sql
-- From technical specification
CREATE TABLE IF NOT EXISTS backup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT CHECK (backup_type IN ('full', 'incremental', 'differential')),
  status TEXT CHECK (status IN ('running', 'completed', 'failed')),
  file_size BIGINT,
  backup_location TEXT,
  verification_status TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_backup_jobs_status ON backup_jobs(status);
CREATE INDEX idx_backup_jobs_started ON backup_jobs(started_at);
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### MUST CREATE:
- [ ] `/src/lib/backup/backup-scheduler.ts` - Core backup engine
- [ ] `/src/lib/backup/restore-manager.ts` - Restoration functionality
- [ ] `/src/lib/backup/verification-engine.ts` - Backup validation
- [ ] `/src/app/api/admin/backup/route.ts` - Backup API endpoints
- [ ] `/src/app/api/admin/backup/trigger/route.ts` - Manual backup trigger
- [ ] `/supabase/migrations/WS-178-backup-tables.sql` - Database schema
- [ ] `/__tests__/lib/backup/` - Test files for all services

### MUST IMPLEMENT:
- [ ] Automated daily backup scheduling using cron jobs
- [ ] Database dump creation using Supabase/PostgreSQL tools
- [ ] Secure backup file encryption and compression
- [ ] Upload to secure cloud storage with retry logic
- [ ] Backup verification through test restoration
- [ ] Cleanup of old backups based on retention policies
- [ ] Comprehensive error handling and logging
- [ ] Admin authentication and authorization checks

## 💾 WHERE TO SAVE YOUR WORK

- Services: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/backup/`
- APIs: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/admin/backup/`
- Migrations: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/supabase/migrations/`
- Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/__tests__/lib/backup/`
- Reports: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`

## 🏁 COMPLETION CHECKLIST

- [ ] Files created and verified to exist (run ls commands above)
- [ ] TypeScript compilation successful (npm run typecheck)
- [ ] All tests passing (npm test backup/)
- [ ] Security requirements implemented (encryption, admin auth)
- [ ] Database migration created and tested
- [ ] Backup verification working through test restoration
- [ ] Cron job scheduling implemented and tested
- [ ] Error handling covers all failure scenarios
- [ ] Evidence package prepared for senior dev review

### INTEGRATION WITH OTHER TEAMS:
- **Team A**: Will consume your backup status APIs for dashboard display
- **Team C**: Will integrate your backup engine with external storage services
- **Team D**: Will ensure backup operations don't impact platform performance
- **Team E**: Will test backup and restore procedures comprehensively

**WEDDING CONTEXT REMINDER:** Your backup system protects irreplaceable wedding memories and critical vendor coordination data. Every backup failure could mean lost wedding photos, guest lists, or timeline information that can't be recreated. Build with the reliability that couples and vendors depend on.

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements!**