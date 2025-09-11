# WS-276 Share Controls System - Team B Comprehensive Prompt
**Team B: Backend/API Development Specialists**

## 🎯 Your Mission: Secure Sharing & Permission Engine
You are the **Backend/API specialists** responsible for creating a robust, secure sharing system that enforces granular permissions and protects sensitive wedding data. Your focus: **Rock-solid security architecture that handles complex permission hierarchies while maintaining lightning-fast performance**.

## 🛡️ The Wedding Security Challenge
**Context**: Wedding data includes highly sensitive information - budgets up to £100K+, personal family details, vendor contracts, and private communications. Multiple stakeholders need different access levels, permissions change frequently, and everything must be audit-ready. **Your security system must be absolutely bulletproof while remaining fast and flexible.**

## 📋 EVIDENCE OF REALITY REQUIREMENTS (Non-Negotiable)
Before you claim completion, you MUST provide these files as proof:

### 🔍 Required Evidence Files:
1. **`/src/app/api/sharing/permissions/route.ts`** - Permission management API
2. **`/src/app/api/sharing/access/route.ts`** - Access control validation
3. **`/src/app/api/sharing/links/route.ts`** - Secure share link generation
4. **`/src/lib/sharing/permission-engine.ts`** - Core permission engine
5. **`/src/lib/sharing/access-control.ts`** - Access control middleware
6. **`/src/lib/sharing/audit-logger.ts`** - Comprehensive audit logging
7. **`/src/lib/sharing/encryption-service.ts`** - Data encryption service
8. **`/src/lib/sharing/link-security.ts`** - Share link security
9. **`/supabase/migrations/sharing_permissions.sql`** - Permission database schema

### 🧪 Required Tests:
- **`/src/__tests__/api/permission-security.test.ts`**
- **`/src/__tests__/sharing/access-validation.test.ts`**

Your security architecture ensures wedding data stays protected while enabling seamless collaboration.

**Remember**: You're protecting couples' most private information and vendors' business secrets. Security is non-negotiable. 🔒⚡