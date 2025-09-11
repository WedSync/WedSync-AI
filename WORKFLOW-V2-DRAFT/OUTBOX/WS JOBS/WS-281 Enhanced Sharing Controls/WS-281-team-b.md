# TEAM B - ROUND 1: WS-281 - Enhanced Sharing Controls
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build secure backend API infrastructure for granular permission management and wedding data sharing
**FEATURE ID:** WS-281 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about privacy controls and secure wedding data sharing

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/sharing/
cat $WS_ROOT/wedsync/src/app/api/sharing/permissions/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test sharing-api
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query permission and sharing patterns
await mcp__serena__search_for_pattern("permission role access control sharing privacy");
await mcp__serena__find_symbol("PermissionService AccessControl SharingManager", "", true);
await mcp__serena__get_symbols_overview("src/lib/auth/");
```

### B. SECURITY & PERMISSION PATTERNS (MANDATORY FOR ALL SECURITY WORK)
```typescript
// CRITICAL: Load security and permission patterns
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/middleware.ts");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/schemas.ts");
await mcp__serena__search_for_pattern("withSecureValidation permission rbac role");
await mcp__serena__find_referencing_symbols("getServerSession auth middleware");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to sharing controls
# Use Ref MCP to search for:
# - "Permission-based access control Node.js"
# - "Supabase row-level security RLS sharing"
# - "Next.js API authentication authorization"
# - "RBAC role-based access control implementation"
# - "Privacy controls data sharing systems"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR SHARING PERMISSION ARCHITECTURE

### Use Sequential Thinking MCP for Backend Permission System
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Enhanced sharing controls need: Granular permission system for wedding data access, role-based permissions for different user types (couple, family, vendors, helpers), time-limited sharing links, content-specific permissions (photos, documents, contact info), audit logging for all sharing activities, privacy compliance features.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Permission complexity analysis: Multiple user roles with different access levels, permission inheritance from couple to family members, vendor-specific data access controls, guest list privacy settings, photo sharing permissions with expiration, document access controls, real-time permission updates.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Security requirements: Secure API endpoints with proper authentication, input validation for all permission changes, audit trails for permission modifications, GDPR compliance for data sharing, encrypted sharing tokens, rate limiting on sharing endpoints, prevention of privilege escalation.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Build permission service with role hierarchy, create secure API routes with validation, implement audit logging system, design database schema for permissions, create sharing token management, add real-time permission updates, ensure GDPR compliance.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

1. **task-tracker-coordinator** - Track sharing API development and permission workflows
2. **backend-security-specialist** - Build secure permission APIs with validation
3. **database-architect** - Design permission schema and RLS policies
4. **audit-logging-specialist** - Implement comprehensive sharing audit system
5. **test-automation-architect** - Permission testing and security validation
6. **documentation-chronicler** - Sharing API documentation and security guides

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for all protected routes
- [ ] **Authorization validation** - Verify user permissions for requested data
- [ ] **Rate limiting applied** - Prevent permission enumeration attacks
- [ ] **Audit logging** - Log all permission changes and access attempts
- [ ] **Input sanitization** - Validate all permission parameters
- [ ] **Token security** - Secure sharing token generation and validation
- [ ] **GDPR compliance** - Data sharing consent and audit trails

### REQUIRED SECURITY PATTERN:
```typescript
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { z } from 'zod';
import { secureStringSchema } from '$WS_ROOT/wedsync/src/lib/validation/schemas';

const sharingPermissionSchema = z.object({
  resourceId: z.string().uuid(),
  resourceType: z.enum(['wedding', 'guest_list', 'photos', 'documents', 'timeline']),
  permissions: z.array(z.enum(['view', 'edit', 'share', 'download'])),
  recipients: z.array(z.object({
    email: z.string().email(),
    role: z.enum(['family', 'vendor', 'helper', 'guest'])
  })),
  expiresAt: z.string().datetime().optional(),
  message: secureStringSchema.max(500).optional()
});

export const POST = withSecureValidation(
  sharingPermissionSchema,
  async (request, validatedData) => {
    // Verify user owns the resource
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate user has permission to share this resource
    const hasPermission = await PermissionService.canShare(
      session.user.id, 
      validatedData.resourceId, 
      validatedData.resourceType
    );
    
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Create sharing permissions with audit logging
    const sharingResult = await SharingService.createSharingPermissions(
      validatedData,
      session.user.id
    );
    
    // Log the sharing activity
    await AuditLogger.log({
      action: 'SHARING_PERMISSIONS_CREATED',
      userId: session.user.id,
      resourceId: validatedData.resourceId,
      details: {
        recipients: validatedData.recipients.length,
        permissions: validatedData.permissions,
        expiresAt: validatedData.expiresAt
      }
    });
    
    return NextResponse.json(sharingResult);
  }
);
```

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**Core API Endpoints to Build:**

1. **POST /api/sharing/permissions** - Create new sharing permissions
2. **GET /api/sharing/permissions** - List user's sharing permissions
3. **PUT /api/sharing/permissions/[id]** - Update existing sharing permissions
4. **DELETE /api/sharing/permissions/[id]** - Revoke sharing permissions
5. **POST /api/sharing/links/generate** - Generate secure sharing links
6. **GET /api/sharing/links/[token]** - Validate and access shared content
7. **GET /api/sharing/audit** - Access sharing audit logs
8. **POST /api/sharing/bulk** - Bulk permission management

### Key Backend Features:
- Granular permission system with role-based access
- Secure sharing token generation and validation
- Time-limited sharing links with expiration
- Comprehensive audit logging for all sharing activities
- Bulk permission management for efficiency
- Real-time permission updates via WebSocket

## 📊 DATABASE SCHEMA REQUIREMENTS

### Sharing Control Tables:
```sql
-- Core sharing permissions
CREATE TABLE sharing_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL,
  resource_type VARCHAR(50) NOT NULL, -- wedding, guest_list, photos, etc.
  owner_id UUID REFERENCES auth.users(id),
  recipient_email VARCHAR(255) NOT NULL,
  recipient_role VARCHAR(20) NOT NULL, -- family, vendor, helper, guest
  permissions JSONB NOT NULL, -- ["view", "edit", "share", "download"]
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  INDEX(resource_id, resource_type),
  INDEX(recipient_email),
  INDEX(expires_at)
);

-- Secure sharing links
CREATE TABLE sharing_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token VARCHAR(255) UNIQUE NOT NULL, -- Secure random token
  resource_id UUID NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  permissions JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  access_count INTEGER DEFAULT 0,
  max_access_count INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX(token),
  INDEX(expires_at)
);

-- Sharing audit log
CREATE TABLE sharing_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  resource_id UUID,
  resource_type VARCHAR(50),
  recipient_email VARCHAR(255),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX(user_id, created_at),
  INDEX(resource_id, action),
  INDEX(created_at)
);

-- Permission inheritance rules
CREATE TABLE permission_inheritance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_resource_id UUID NOT NULL,
  child_resource_id UUID NOT NULL,
  inheritance_type VARCHAR(20) NOT NULL, -- full, partial, custom
  inherited_permissions JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(parent_resource_id, child_resource_id)
);
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] Secure sharing permission API endpoints with validation
- [ ] Database schema for granular permission control
- [ ] Sharing link generation with token security
- [ ] Comprehensive audit logging system
- [ ] Role-based permission validation
- [ ] Bulk permission management APIs
- [ ] Permission inheritance system
- [ ] Real-time permission update notifications
- [ ] GDPR compliance features for data sharing
- [ ] Unit and integration tests for all endpoints

## 🔐 PERMISSION SYSTEM ARCHITECTURE

### Role-Based Permission Hierarchy:
```typescript
enum UserRole {
  OWNER = 'owner',           // Full access to everything
  FAMILY = 'family',         // Access to most wedding details
  VENDOR = 'vendor',         // Access to relevant vendor info
  HELPER = 'helper',         // Limited access for wedding tasks
  GUEST = 'guest'           // Minimal access to basic info
}

enum ResourceType {
  WEDDING = 'wedding',
  GUEST_LIST = 'guest_list',
  PHOTOS = 'photos',
  DOCUMENTS = 'documents',
  TIMELINE = 'timeline',
  BUDGET = 'budget',
  VENDOR_CONTACTS = 'vendor_contacts'
}

enum Permission {
  VIEW = 'view',
  EDIT = 'edit',
  SHARE = 'share',
  DOWNLOAD = 'download',
  DELETE = 'delete'
}

interface PermissionMatrix {
  [ResourceType.WEDDING]: {
    [UserRole.OWNER]: Permission[];
    [UserRole.FAMILY]: Permission[];
    [UserRole.VENDOR]: Permission[];
    [UserRole.HELPER]: Permission[];
    [UserRole.GUEST]: Permission[];
  };
  // Define permissions for each resource type and role
}
```

### Secure Sharing Service:
```typescript
class SharingService {
  static async createSharingPermissions(
    data: SharingPermissionRequest,
    ownerId: string
  ): Promise<SharingPermissionResponse> {
    // Validate owner permissions
    const ownerPermissions = await this.getUserResourcePermissions(
      ownerId, 
      data.resourceId, 
      data.resourceType
    );
    
    if (!ownerPermissions.includes(Permission.SHARE)) {
      throw new Error('Insufficient permissions to share this resource');
    }
    
    // Create sharing permissions with audit trail
    const permissions = await db.transaction(async (trx) => {
      const sharing = await trx.insert(sharingPermissions).values({
        ...data,
        ownerId,
        createdBy: ownerId
      }).returning();
      
      // Log the sharing activity
      await trx.insert(sharingAuditLog).values({
        action: 'PERMISSIONS_CREATED',
        userId: ownerId,
        resourceId: data.resourceId,
        details: { recipients: data.recipients.length }
      });
      
      return sharing;
    });
    
    // Send notification to recipients
    await NotificationService.notifySharedAccess(data.recipients, {
      resourceType: data.resourceType,
      sharedBy: ownerId,
      permissions: data.permissions
    });
    
    return permissions;
  }
  
  static async generateSecureLink(
    resourceId: string,
    resourceType: ResourceType,
    permissions: Permission[],
    expiresAt: Date,
    createdBy: string
  ): Promise<SharingLink> {
    // Generate cryptographically secure token
    const token = crypto.randomBytes(32).toString('hex');
    
    const link = await db.insert(sharingLinks).values({
      token,
      resourceId,
      resourceType,
      permissions,
      expiresAt,
      createdBy
    }).returning();
    
    return link[0];
  }
}
```

## 💾 WHERE TO SAVE YOUR WORK
- API Routes: $WS_ROOT/wedsync/src/app/api/sharing/
- Services: $WS_ROOT/wedsync/src/lib/services/sharing/
- Types: $WS_ROOT/wedsync/src/types/sharing.ts
- Database: $WS_ROOT/wedsync/supabase/migrations/
- Tests: $WS_ROOT/wedsync/__tests__/api/sharing/
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/

## ⚠️ CRITICAL WARNINGS
- Never expose internal user IDs in sharing tokens
- Validate all permission changes against role hierarchy
- Log ALL sharing activities for audit compliance
- Implement rate limiting to prevent permission enumeration
- Ensure sharing links expire and cannot be reused maliciously
- Validate GDPR consent before sharing personal data

## 🏁 COMPLETION CHECKLIST
- [ ] Sharing permission API endpoints secured and tested
- [ ] Database schema for permission control implemented
- [ ] Secure sharing token system operational
- [ ] Comprehensive audit logging functional
- [ ] Role-based permission validation working
- [ ] Bulk permission management APIs complete
- [ ] GDPR compliance features implemented
- [ ] Real-time permission updates functional
- [ ] Unit and integration tests passing
- [ ] Evidence package with API security validation

---

**EXECUTE IMMEDIATELY - Build the secure sharing foundation that protects wedding privacy!**