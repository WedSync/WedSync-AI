# WedSync Project Configuration

## 🎯 DOCUMENT NAVIGATION MAP
📁 .claude/
├── 📋 MASTER-INSTRUCTIONS.md (Complete specification - START HERE if new)
├── 📍 CLAUDE.md (You are here - daily working context)
├── 🎨 UNIFIED-STYLE-GUIDE.md (SINGLE SOURCE OF TRUTH for all UI/UX)
├── 📊 PROGRESS.md (Daily progress tracking)
├── 💬 COMMANDS.md (Copy-paste command library)
├── 🚨 EMERGENCY-PLAYBOOK.md (When things break)
├── 💾 database-schema.sql (Database structure)
├── 🐳 DOCKER-SETUP.md (Docker configuration & best practices)
├── 💰 STRIPE-IMPLEMENTATION.md (Payment details)
├── 📧 COMMUNICATION-TEMPLATES.md (Email/SMS templates)
├── 🎨 ui-components/ (Reference UI component library)
├── 🤖 agents/ (42 specialized subagents with MCP integration)
└── 🔧 hooks.md (Automation rules)

## 🔄 Daily Workflow
1. **Morning**: Read PROGRESS.md → Check this file → Start work
2. **When building**: Reference MASTER-INSTRUCTIONS.md for full specs
3. **When stuck**: Check EMERGENCY-PLAYBOOK.md
4. **Evening**: Update PROGRESS.md → Plan tomorrow

## ⚡ Quick Start for New Session
If starting fresh or confused:
1. Read MASTER-INSTRUCTIONS.md first (complete vision)
2. Then read this file (current context)
3. Check PROGRESS.md (where we left off)
4. Begin work

## ⚠️ CRITICAL: I AM NOT A DEVELOPER
- I'm a wedding photographer building this platform
- Make ALL technical decisions autonomously
- NEVER ask me technical questions - choose the best option
- Test everything (minimum 90% coverage)
- Explain in photography/wedding terms
- If something might break, add extra safety checks

## 📚 MANDATORY DOCUMENTATION PROTOCOL

### After EVERY coding session:
1. Use `documentation-chronicler` to create/update daily log
2. Document all features built with business reasoning
3. Record all technical decisions and trade-offs
4. Update API documentation for new endpoints
5. Create user guides for new features

### Documentation Rules:
- **NO FEATURE** is complete without documentation
- **NO DEPLOYMENT** without updated docs
- **NO DECISION** without an ADR (Architecture Decision Record)
- Explain everything in photography/wedding terms
- Include "why this matters to vendors" in every doc

### Documentation Structure:
docs/
├── features/           # What each feature does
├── api/               # API endpoint documentation
├── architecture/      # Technical decisions (ADRs)
├── user-guides/       # How vendors use features
├── troubleshooting/   # Common problems & solutions
└── metrics/           # Progress dashboards
.claude/logs/
├── daily/            # Daily development logs
├── weekly/           # Weekly summaries
└── deployments/      # Deployment records

## 🎯 Project Overview
**WedSync** (B2B): For wedding suppliers (photographers, venues, florists)  
**WedMe** (B2C): For couples (FREE - viral growth driver)

**Problem**: Wedding vendors waste 10+ hours per wedding on admin  
**Vision**: 400,000 users, £192M ARR potential

## 📚 Core Documentation
**MASTER REFERENCE**: Always refer to `.claude/MASTER-INSTRUCTIONS.md` for:
- Complete feature specifications
- Detailed pricing tiers
- Full technical requirements
- All verification cycles
- Growth strategy
- Complete database schema

## 📚 Complete Documentation System (383+ Files)
**Documentation Base Path**: `./docs/instruction-manual/` (or configured in `.path-config.local`)

### 📍 Documentation Navigation Structure
```
instruction-manual/
├── 📋 QUICK-REFERENCE-CARD.md         # START HERE for task-specific loading
├── 📚 00-MASTER-INDEX.md              # Complete navigation map
├── 📊 /summaries/                     # High-level overviews (load first)
│   ├── 01-technical-architecture-summary.md
│   ├── 02-supplier-platform-summary.md
│   ├── 03-couple-platform-summary.md
│   ├── 04-ai-marketplace-summary.md
│   └── 05-business-implementation-summary.md
├── 🎯 /bmad-bundles/                  # Role-specific packages
│   ├── 01-pm-john-bundle.md          # Product Manager
│   ├── 02-architect-winston-bundle.md # System Architect
│   └── 03-ux-sally-bundle.md         # UX Expert
└── 📂 /[detailed-docs]/               # 383 files organized by topic
```

### 🎯 Documentation Quick Start
**For Any Development Task:**
1. **ALWAYS START WITH**: `./docs/instruction-manual/QUICK-REFERENCE-CARD.md`
2. Find your task type in the reference card
3. Load the recommended files in sequence
4. Only load detailed docs when implementing specific features

### 📁 Key Documentation Sections
**Platform Features:**
- Supplier Platform: `/wedsync-supplier-platform/`
- Couple Platform: `/wedme-couple-platform/`
- Marketplace: `/marketplace/`
- Directory: `/directory/`

**Technical Documentation:**
- Architecture: `/technical-architecture/`
- Database Schema: `/technical-architecture/database-schema/`
- API Design: `/technical-architecture/api-architecture/`
- Authentication: `/technical-architecture/authentication-system/`
- Infrastructure: `/technical-architecture/infrastructure/`

**Business & Operations:**
- Business Model: `/business-operations/`
- Implementation Phases: `/implementation-phases/`
- Admin Dashboard: `/admin-dashboard/`

### 💡 Context Management Strategy
- **Minimal** (Research): Index + 1 summary (3-5K tokens)
- **Standard** (Feature work): Index + summary + 3-5 docs (15-20K tokens)
- **Full** (Major changes): Index + multiple summaries + 8-10 docs (30-40K tokens)

## 🛠 Technical Stack (Use EXACTLY These Versions)
- Next.js 15.4.3 (App Router architecture) - **📚 See `/wedsync/docs/latest-tech-docs/nextjs-15-guide.md`**
- React 19.1.1 (Server Components, Suspense) - **📚 See `/wedsync/docs/latest-tech-docs/react-19-guide.md`**
- TypeScript 5.9.2 (strict mode - NO 'any' types EVER)
- Supabase 2.55.0 (PostgreSQL 15, Auth, Storage, Realtime) - **📚 See `/wedsync/docs/latest-tech-docs/supabase-nextjs-guide.md`**
- Untitled UI + Magic UI + Tailwind CSS 4.1.11 - **📚 See `/wedsync/docs/latest-tech-docs/tailwind-v4-guide.md`**
- @dnd-kit for drag-drop (COMPLETE DOCS AVAILABLE - see below)
- React Hook Form 7.62.0 + Zod 4.0.17 validation
- Stripe 18.4.0 for payments
- Resend 6.0.1 for email (replaces SendGrid)
- OpenAI 5.12.2 for AI features
- Zustand 5.0.7 + TanStack Query 5.85.0 for state management
- Docker & Docker Compose v2 for containerization
- Motion 12.23.12 for animations (replaced framer-motion)

**🎨 UI/UX REFERENCE**: See `.claude/UNIFIED-STYLE-GUIDE.md` for ALL styling rules

## 📚 LATEST TECH DOCUMENTATION (January 2025)
**CRITICAL**: These docs contain the latest patterns for our bleeding-edge tech stack:

### Quick Start
- **📖 `/wedsync/docs/latest-tech-docs/quick-reference.md`** - Start here for quick lookups

### Core Framework Documentation
- **⚛️ `/wedsync/docs/latest-tech-docs/react-19-guide.md`** - React 19 patterns (use hook, Server Components, Actions)
- **🔷 `/wedsync/docs/latest-tech-docs/nextjs-15-guide.md`** - Next.js 15 with Turbopack, App Router best practices
- **🎨 `/wedsync/docs/latest-tech-docs/tailwind-v4-guide.md`** - Tailwind v4 with Oxide engine (10x faster)
- **🗄️ `/wedsync/docs/latest-tech-docs/supabase-nextjs-guide.md`** - Modern Supabase with @supabase/ssr (NOT auth-helpers)

### Complete Tech Stack Reference
- **📦 `/wedsync/docs/tech-stack-complete.md`** - All installed packages with versions
- **🔄 `/wedsync/docs/tech-stack-current.md`** - Current state and update status
- **📈 `/wedsync/docs/tech-stack-updates.md`** - Documentation recommendations

### Key Pattern Changes (MUST READ)
1. **No more forwardRef** - React 19 uses ref as prop
2. **useActionState** for forms - Replaces useState + handlers
3. **Server Components by default** - Client Components only when needed
4. **Async cookies/headers** - Must await in Next.js 15
5. **CSS-based Tailwind config** - No more tailwind.config.js
6. **@supabase/ssr** - auth-helpers is deprecated

## 🎮 DND Kit - Drag & Drop Implementation
**Complete Documentation Available**: `/docs/` directory
- **Comprehensive Guide**: `dnd-kit-guide.md` - Full API reference and patterns (includes MCP server setup)
- **Production Components**: `dnd-kit-wedsync-components.tsx` - Ready-to-use WedSync components
- **Quick Start**: `dnd-kit-quick-start.md` - Copy-paste examples

### 🔌 MCP Server Integration
**Direct GitHub Repository Access**: The dnd-kit repository is accessible via MCP for accurate implementation
```json
{
  "mcpServers": {
    "dnd-kit Docs": {
      "url": "https://gitmcp.io/clauderic/dnd-kit"
    }
  }
}
```
- Use MCP when building drag-drop features for source code reference
- Check MCP for troubleshooting and advanced patterns
- Verify prop types and TypeScript interfaces from source

### WedSync DND Kit Use Cases:
1. **Vendor Service Ordering** - Drag to reorder service packages
2. **Wedding Timeline Builder** - Drag events to build wedding day schedule
3. **Guest Seating Arrangement** - Drag guests to assign tables
4. **Photo Gallery Organization** - Drag photos into categories
5. **Form Builder** - Drag fields to create custom forms
6. **Journey Builder** - Drag steps to create customer journeys

### Key Packages:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @dnd-kit/modifiers
```

## 🐳 Docker Infrastructure
**Official Documentation**: https://docs.docker.com/manuals/
**Setup Guide**: See `.claude/DOCKER-SETUP.md` for complete Docker configuration
- Multi-container architecture with Docker Compose
- PostgreSQL 15 with persistent volumes
- Next.js with hot reload in development
- Supabase services (auth, storage, realtime)
- Security best practices and health checks

## 🔐 Environment Variables
**Required in `.env.local`**:
```env
# Supabase (Get from: supabase.com/dashboard)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe (Get from: dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Price IDs (Create in Stripe Dashboard)
STRIPE_STARTER_MONTHLY_PRICE_ID=price_...
STRIPE_STARTER_YEARLY_PRICE_ID=price_...
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=price_...
STRIPE_PROFESSIONAL_YEARLY_PRICE_ID=price_...
STRIPE_SCALE_MONTHLY_PRICE_ID=price_...
STRIPE_SCALE_YEARLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_...

# Email (Get from: resend.com)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@wedsync.com

# SMS (Get from: twilio.com)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Never commit .env files!
```

## 💰 Critical Business Rules (Tier Limits)
FREE (After 30-day trial):
- 1 form only
- 1 login
- "Powered by WedSync" branding
- No SMS/automation

STARTER (£19/month):
- Unlimited forms
- 2 logins
- Email only
- Remove branding

PROFESSIONAL (£49/month) - Sweet spot:
- AI chatbot
- Marketplace selling (70% commission to seller)
- Unlimited journeys
- 3 logins

SCALE (£79/month):
- API access
- Referral automation
- 5 logins

ENTERPRISE (£149/month):
- Venue features
- White-label
- Unlimited logins

## 🚨 Wedding Day Protocol
- Saturdays = ABSOLUTELY NO DEPLOYMENTS
- Weddings are SACRED - nothing can break
- If wedding is today/tomorrow: READ-ONLY MODE
- Response time must be <500ms
- Always have offline fallback
- Friday 6PM = Feature freeze until Monday

## ✅ Verification Requirements
EVERY feature must pass ALL cycles:
1. Functionality - Works exactly as specified
2. Data Integrity - Zero data loss possible
3. Security - GDPR compliant, no vulnerabilities
4. Mobile - Perfect on iPhone SE (smallest screen)
5. Business Logic - Tier limits enforced correctly

## 🛠️ MCP SERVERS & CLI TOOLS (Available)

### 🔌 MCP Servers (12 Active)
- **filesystem** - File system operations for WedSync project directory
- **playwright** - E2E testing and browser automation for web applications  
- **sequential-thinking** - Structured problem-solving and reasoning capabilities
- **browsermcp** - Interactive browser automation for testing and debugging
- **biome** - Fast code formatting and linting using Biome toolchain
- **ref** - Up-to-date library documentation and code examples retrieval
- **memory** - Persistent context management and knowledge retention across sessions
- **postgres** - Direct PostgreSQL database operations and queries for WedSync data
- **posthog** - Analytics, feature flags, A/B testing, and user behavior tracking
- **bugsnag** - Error tracking and monitoring for production reliability
- **swagger** - API documentation generation, testing, and MCP tool creation
- **serena** - Intelligent code analysis and semantic editing with TypeScript support

### 🖥️ CLI Tools (3 Active)  
- **Supabase CLI v2.40.7** - Database migrations, Edge Functions, local development
- **GitHub CLI v2.76.0** - Repository management, PR creation, deployment automation
- **Claude CLI** - MCP server management and Claude Code configuration

### 🎯 Development Environment Status
- **Project Path**: `/Users/skyphotography/CODE/WedSync AI`
- **Database**: PostgreSQL 15 via Supabase (azhgptjkqiiqvvvhapml.supabase.co)
- **Tech Stack**: Next.js 15, React 19, TypeScript 5.9, Tailwind CSS 4.1
- **Analytics**: PostHog configured and operational
- **Error Tracking**: Bugsnag configured for production monitoring
- **Status**: All core MCP servers operational, ready for development

## 🤖 Subagent Usage Protocol v2.0 (MCP-Enhanced)

### AUTOMATIC AGENTS (Use without asking):
- **verification-cycle-coordinator** - After EVERY feature (uses playwright_mcp)
- **test-automation-architect** - After writing code (uses playwright_mcp + postgresql_mcp)
- **security-compliance-officer** - Before any deployment (uses postgresql_mcp)
- **user-communication-specialist** - After complex work (uses memory_mcp + posthog_mcp)
- **documentation-chronicler** - After every session (uses filesystem_mcp + memory_mcp)

### SPECIALIZED AGENTS (MCP-Enhanced):
- **nextjs-fullstack-developer** - Building features (uses ref_mcp for docs)
- **supabase-specialist** - Database/auth work (uses postgresql_mcp + ref_mcp)
- **authentication-architecture-specialist** - Security hardening (uses postgresql_mcp + bugsnag_mcp + posthog_mcp)
- **mobile-first-ux-specialist** - Mobile optimization (uses playwright_mcp + posthog_mcp)
- **conversion-optimization-specialist** - Growth metrics (uses posthog_mcp + bugsnag_mcp)
- **business-intelligence-specialist** - Analytics & insights (uses posthog_mcp + memory_mcp)

### EMERGENCY AGENTS (Saturday Zero-Tolerance):
- **production-guardian** - Wedding day issues (uses bugsnag_mcp + posthog_mcp)
- **wedding-day-reliability-engineer** - 100% uptime focus (uses all MCP servers)
- **deployment-safety-checker** - Before going live (uses playwright_mcp + postgresql_mcp)

### TESTING & QUALITY AGENTS:
- **wedding-day-reliability-engineer** - Saturday uptime (uses bugsnag_mcp + posthog_mcp + playwright_mcp)
- **mobile-first-ux-specialist** - Mobile UX (uses playwright_mcp + posthog_mcp)
- **test-automation-architect** - Comprehensive testing (uses playwright_mcp + postgresql_mcp + bugsnag_mcp)

## 🔄 MCP-Enhanced Subagent Workflow v2.0
1. **Plan with MCP context**: memory_mcp retrieves previous decisions
2. **Build features**: nextjs-fullstack-developer (with ref_mcp for docs)
3. **Secure implementation**: authentication-architecture-specialist (postgresql_mcp for RLS)
4. **Test comprehensively**: test-automation-architect (playwright_mcp + postgresql_mcp)
5. **Monitor performance**: business-intelligence-specialist (posthog_mcp analytics)
6. **Verify quality**: verification-cycle-coordinator (all relevant MCP servers)
7. **Document & learn**: documentation-chronicler (filesystem_mcp + memory_mcp)
8. **Translate impact**: user-communication-specialist (memory_mcp insights)

## 🔄 Hooks Integration
**Active Hooks File**: `.claude/hooks.md`
- Automatically triggers on keywords (production, deploy, wedding day)
- Runs verification cycles automatically
- Documents everything via documentation-chronicler
- See hooks.md for all triggers and automation rules

**Critical Hook Keywords:**
- "wedding day" → Maximum safety mode
- "deploy/production" → Full verification suite
- "payment/billing" → Triple verification
- "Saturday" → Read-only mode
- "integration/CRM" → Integration testing mode

## 📱 Mobile-First Requirements
- 60% of users are on mobile phones
- Test on iPhone SE (375px width minimum)
- Touch targets minimum 48x48px
- Bottom navigation for thumb reach
- Must work offline at venues (poor signal)
- Forms must auto-save every 30 seconds

## 🔄 Current Project Status

### ✅ Completed Features
- ✅ Project initialized
- ✅ Database schema created (31 tables with proper relationships)
- ✅ Multi-tenant architecture
- ✅ Authentication working (Supabase Auth)
- ✅ PDF → Form import (killer feature)
- ✅ Tave integration
- ✅ Customer journey builder
- ✅ Stripe payments (SECURED - January 14, 2025)
- ✅ Email system (Resend integration)
- ✅ Mobile responsive
- ✅ Docker containerization (PostgreSQL, Redis, Next.js)
- ✅ Real-time communications system
- ✅ Form Builder with Drag-and-Drop (@dnd-kit)
- ✅ Build system fixed (removed framer-motion, fixed tr46 issues)

### 🔒 Security Improvements (January 14, 2025)
**Payment System Hardened:**
- ✅ Created comprehensive payment tables (payment_history, webhook_events, invoices, etc.)
- ✅ Implemented idempotency protection for webhooks
- ✅ Added authentication to all payment endpoints
- ✅ Server-side price validation
- ✅ Proper environment variable handling
- ✅ Fixed database operations (using organizations table correctly)
- ✅ Rate limiting on payment endpoints (5 req/min)
- ✅ Comprehensive error handling and logging

**Files Created/Updated:**
- `/supabase/migrations/003_payment_tables.sql` - Payment database schema
- `/src/app/api/stripe/webhook/route.ts` - Secured webhook handler
- `/src/app/api/stripe/create-checkout-session/route.ts` - Authenticated checkout
- `/src/app/pricing/page.tsx` - Updated with auth flow
- `/PAYMENTS_REVIEW_REPORT.md` - Security audit documentation

### 🎯 Today's Focus
**Date**: January 14, 2025
**Status**: Ready for security hardening sprint
**Security Score**: Currently 2/10 → Target 7/10

**Next Priority**: Execute SECURITY-REMEDIATION-EPIC.md
1. Fix all P0 authentication vulnerabilities
2. Implement proper RLS policies for all 31 tables
3. Add server-side validation to all forms
4. Remove all TypeScript 'any' types
5. Implement comprehensive input sanitization

### 📊 Project Metrics
- **Build Status**: ✅ Compiles successfully
- **Security**: ⚠️ 2/10 (Critical vulnerabilities identified)
- **Payment Security**: ✅ 8/10 (Hardened on Jan 14)
- **Test Coverage**: ~30% (needs improvement)
- **Mobile Responsive**: ✅ Yes
- **Production Ready**: ❌ No (security issues must be fixed first)

## 🛡️ Critical Safety Rules
- NEVER lose customer data (wedding info is irreplaceable)
- ALWAYS backup before database changes
- NO raw SQL without parameterization
- EVERY form needs validation (client AND server)
- ALL money calculations in cents/pence
- TEST payment flows in Stripe test mode first
- Wedding dates are immutable once set
- Soft delete only (30-day recovery period)

## 📦 Git Workflow (NEVER SKIP)
**Every Morning:**
```bash
git pull
git checkout -b today-[YYYY-MM-DD]
```

**Every Hour:**
```bash
git add .
git commit -m "Progress: [what was built]"
git push origin today-[YYYY-MM-DD]
```

**End of Day:**
```bash
git checkout main
git merge today-[YYYY-MM-DD]
git push origin main
```

**If Something Breaks:**
```bash
git stash  # Save current mess
git checkout main  # Go back to working version
```

## 🔌 Integration Priorities
1. Tave - 25% of photographers use it (REST API v2)
2. Light Blue - Screen scraping required (no API)
3. HoneyBook - OAuth2 complex but important
4. Google Calendar - Critical for scheduling
5. Stripe - Payment processing ✅ SECURED
6. Resend - Transactional email ✅ WORKING
7. Twilio - SMS for premium tiers

## 🚀 Viral Growth Mechanics
1. Vendor imports 200+ existing clients
2. Invites couples to WedMe (free)
3. Couples see ALL their vendors
4. Couples invite missing vendors
5. Those vendors sign up for WedSync
6. Repeat exponentially

## 📊 Success Metrics to Track
- Import → Active: >60%
- Trial → Paid: >5%
- Monthly churn: <5%
- Support tickets: <5% of users
- Page load: <2 seconds
- Mobile usage: >60%
- Saturday uptime: 100%

## ⚡ Performance Requirements
**Critical Metrics (Non-negotiable):**
- First Contentful Paint: <1.2s
- Time to Interactive: <2.5s
- Lighthouse Score: >90
- Bundle size: <500KB initial
- API response (p95): <200ms
- Database query (p95): <50ms
- Form submission: <500ms
- CSV import (1000 rows): <10s

**Wedding Day Requirements:**
- Zero downtime (100% uptime)
- Response time: <500ms even on 3G
- 5000+ concurrent users
- Cache hit rate: >90%

## 🆘 When Things Break
- Don't ask me how to fix - solve it yourself
- Try alternative approach/library
- Add comprehensive logging
- Implement graceful degradation
- Document the solution
- Add tests to prevent recurrence
- Update EMERGENCY-PLAYBOOK.md

## 📝 Communication Style
- Use wedding industry terms
- Explain like I'm a photographer
- "This is like..." analogies welcome
- Reference real wedding scenarios
- Avoid technical jargon
- Be specific about what broke/works

## 🎯 Context Refresh Commands
**When you seem confused:**
"You seem lost. Re-read:
- MASTER-INSTRUCTIONS.md section on [FEATURE]
- Current CLAUDE.md
- Today's PROGRESS.md
We're building [SPECIFIC FEATURE]. Focus on that."

**Starting new session:**
"New session. Read MASTER-INSTRUCTIONS.md summary,
then CLAUDE.md for current status.
Continue from PROGRESS.md last entry."

## 🚑 Emergency Recovery Commands
**When Claude seems drunk/confused:**
"STOP. You're confused. Start fresh.
Read MASTER-INSTRUCTIONS.md section on [current feature].
We're building WedSync for wedding vendors.
I'm a photographer. Current task: [specific task].
Do ONLY this task."

**When tests are failing:**
"Tests are failing. Fix the code, not the tests.
Explain what's wrong in photography terms.
Make it work, then make it pretty."

**When deployment fails:**
"Deployment failed. Roll back immediately.
Check for Saturday weddings.
Fix on staging first.
Document what went wrong."

## 🧠 Claude's Memory Limits
**Context Window**: ~100k tokens (≈30-40 files)
**Solution**: Focus on one feature/directory per session

**When context is full:**
1. Start new session
2. Read MASTER-INSTRUCTIONS.md first
3. Continue from PROGRESS.md
4. Focus on specific directory only

## 💡 Remember
- You're the ENTIRE dev team
- Wedding industry knowledge > perfect code
- Ship working features > perfect features
- Data loss = business death
- Saturdays are sacred (wedding days)
- Mobile experience is critical
- We're competing with HoneyBook ($9B valuation)
- I trust you to make all technical decisions

## ✅ Daily Development Checklist
**Morning (Start here every day):**
- [ ] Read PROGRESS.md - where we left off
- [ ] Check git status - ensure clean branch
- [ ] Review today's weddings - any Saturday blocks?
- [ ] Run task-tracker-coordinator - priorities
- [ ] Start fresh git branch

**Before Each Feature:**
- [ ] Read relevant MASTER-INSTRUCTIONS.md section
- [ ] Check tier requirements
- [ ] Consider mobile-first
- [ ] Plan for offline mode

**After Each Feature:**
- [ ] Run verification cycles
- [ ] Test on mobile
- [ ] Document with documentation-chronicler
- [ ] Commit to git

**End of Day:**
- [ ] Update PROGRESS.md
- [ ] Run all tests
- [ ] Merge to main if stable
- [ ] Plan tomorrow's work

## 🏁 If You're Starting Fresh
1. First read `.claude/MASTER-INSTRUCTIONS.md` completely
2. Then return to this file for current context
3. Check `.claude/PROGRESS.md` for what was built
4. Run verification cycles on everything
5. Continue building from where we left off

**THIS WILL REVOLUTIONIZE THE WEDDING INDUSTRY!**