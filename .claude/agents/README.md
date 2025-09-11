# WedSync Sub-Agent Architecture (v2.0)
*Updated for Testing/Refactoring Phase - January 2025*

## Architecture Overview
**Total Agents**: 42 specialized sub-agents
**MCP Integration**: All agents enhanced with relevant MCP servers
**Phase Focus**: Testing, refactoring, security hardening, conversion optimization

## Available MCP Servers
- **filesystem** - File system operations
- **playwright** - E2E testing and browser automation  
- **sequential-thinking** - Structured problem-solving
- **browsermcp** - Interactive browser automation
- **biome** - Code formatting and linting
- **ref** - Library documentation retrieval
- **memory** - Persistent context management
- **postgres** - Direct PostgreSQL operations
- **posthog** - Analytics, feature flags, A/B testing
- **bugsnag** - Error tracking and monitoring
- **swagger** - API documentation and testing
- **serena** - Intelligent code analysis

## Agent Categories

### 🔐 SECURITY & AUTHENTICATION (Critical Priority)
1. **authentication-architecture-specialist** 
   - *Tools*: postgresql_mcp, bugsnag_mcp, posthog_mcp, playwright_mcp, memory_mcp
   - *Focus*: RLS policies, multi-tenant auth, security hardening 2/10→7/10

2. **security-compliance-officer**
   - *Tools*: read_file, write_file, grep, bash
   - *Focus*: GDPR, OWASP, enterprise security standards

### 📱 USER EXPERIENCE & CONVERSION
3. **mobile-first-ux-specialist** ⭐ *NEW*
   - *Tools*: playwright_mcp, posthog_mcp, memory_mcp, filesystem_mcp, biome_mcp
   - *Focus*: 60% mobile users, touch-first design, venue optimization

4. **conversion-optimization-specialist** ⭐ *NEW*
   - *Tools*: posthog_mcp, bugsnag_mcp, memory_mcp, playwright_mcp
   - *Focus*: Trial-to-paid conversion <5%→>5%, activation optimization

5. **user-communication-specialist** ⭐ *NEW* (Consolidated user-impact + plain-english)
   - *Tools*: memory_mcp, posthog_mcp
   - *Focus*: Technical→photographer translation, impact analysis

6. **ui-ux-designer**
   - *Tools*: read_file, write_file, list_directory
   - *Focus*: Design systems, user flow optimization

### 🧪 TESTING & QUALITY ASSURANCE
7. **test-automation-architect** ⭐ *ENHANCED*
   - *Tools*: playwright_mcp, postgresql_mcp, filesystem_mcp, bugsnag_mcp, posthog_mcp, memory_mcp, biome_mcp
   - *Focus*: Comprehensive testing with real browser automation

8. **wedding-day-reliability-engineer** ⭐ *NEW*
   - *Tools*: bugsnag_mcp, posthog_mcp, playwright_mcp, memory_mcp, postgresql_mcp
   - *Focus*: 100% Saturday uptime, venue-specific testing

9. **performance-optimization-expert**
   - *Tools*: read_file, write_file, bash, grep
   - *Focus*: <2s load times, mobile optimization

### 📊 BUSINESS INTELLIGENCE & ANALYTICS
10. **business-intelligence-specialist** ⭐ *NEW* (Consolidated metrics + business-metrics)
    - *Tools*: posthog_mcp, bugsnag_mcp, memory_mcp, postgresql_mcp
    - *Focus*: Path to 400k users/£192M ARR, conversion analytics

11. **verification-cycle-coordinator**
    - *Tools*: read_file, bash, grep
    - *Focus*: Multi-pass quality validation

### ⚙️ DEVELOPMENT CORE
12. **nextjs-fullstack-developer** ⭐ *ENHANCED*
    - *Tools*: context7_mcp
    - *Focus*: Next.js 15, React 19, App Router expertise

13. **supabase-specialist** ⭐ *ENHANCED*
    - *Tools*: context7_mcp
    - *Focus*: Supabase Auth, RLS, real-time features

14. **react-ui-specialist** ⭐ *ENHANCED*
    - *Tools*: playwright_mcp, filesystem_mcp, memory_mcp
    - *Focus*: React 19 components, accessibility

15. **postgresql-database-expert**
    - *Tools*: read_file, write_file, bash, grep
    - *Focus*: Database design, optimization, RLS

### 🏗️ ARCHITECTURE & INFRASTRUCTURE
16. **api-architect**
    - *Tools*: read_file, write_file, bash
    - *Focus*: REST, GraphQL, API governance

17. **integration-specialist**
    - *Tools*: read_file, write_file, bash
    - *Focus*: Tave, HoneyBook, payment systems

18. **docker-containerization-expert**
    - *Tools*: read_file, write_file, bash, grep
    - *Focus*: Multi-stage builds, production deployment

19. **devops-sre-engineer**
    - *Tools*: bash, read_file, write_file, grep
    - *Focus*: CI/CD, monitoring, reliability

### 📊 DATA & ANALYTICS
20. **data-analytics-engineer**
    - *Tools*: read_file, write_file, bash
    - *Focus*: ETL, data warehousing, BI

21. **database-mcp-specialist**
    - *Tools*: postgresql_mcp
    - *Focus*: Direct database operations, migrations

### 🎭 TESTING SPECIALISTS  
22. **playwright-visual-testing-specialist** ⭐ *ENHANCED*
    - *Tools*: playwright_mcp
    - *Focus*: Visual regression, cross-browser testing

### 🛠️ CODE QUALITY & MAINTENANCE
23. **code-quality-guardian**
    - *Tools*: read_file, grep, bash
    - *Focus*: Clean code, security, maintainability

24. **code-cleaner-refactoring**
    - *Tools*: read_file, write_file, grep, bash
    - *Focus*: Technical debt reduction, optimization

25. **filesystem-mcp-specialist** ⭐ *ENHANCED*
    - *Tools*: filesystem_mcp, memory_mcp
    - *Focus*: Advanced file operations, bulk processing

### 📝 DOCUMENTATION & COMMUNICATION
26. **documentation-chronicler** ⭐ *ENHANCED*
    - *Tools*: read_file, write_file, list_directory
    - *Focus*: Automated documentation, ADRs

27. **context7-documentation-specialist**
    - *Tools*: context7_mcp
    - *Focus*: Real-time library documentation

28. **slack-communication-specialist** ⭐ *ENHANCED*
    - *Tools*: slack_mcp, vercel_mcp, playwright_mcp
    - *Focus*: Team notifications, deployment alerts

### 🔄 ORCHESTRATION & COORDINATION
29. **master-workflow-orchestrator**
    - *Tools*: read_file, list_directory, bash
    - *Focus*: Complex project coordination

30. **mcp-orchestrator** ⭐ *ENHANCED*
    - *Tools*: context7_mcp, playwright_mcp, postgresql_mcp, filesystem_mcp, memory_mcp
    - *Focus*: MCP server coordination

31. **memory-mcp-specialist** ⭐ *ENHANCED*
    - *Tools*: memory_mcp, filesystem_mcp
    - *Focus*: Cross-session continuity, learning

32. **task-tracker-coordinator**
    - *Tools*: read_file, write_file, list_directory
    - *Focus*: Task management, dependencies

### 🚀 DEPLOYMENT & OPERATIONS
33. **deployment-safety-checker**
    - *Tools*: read_file, bash, grep
    - *Focus*: Pre-deployment validation

34. **production-guardian**
    - *Tools*: read_file, bash, grep
    - *Focus*: Wedding day disaster prevention

35. **vercel-deployment-specialist** ⭐ *ENHANCED*
    - *Tools*: vercel_mcp, slack_mcp
    - *Focus*: Automated deployments, monitoring

### 🏢 BUSINESS & DOMAIN EXPERTISE
36. **wedding-domain-expert**
    - *Tools*: read_file, write_file
    - *Focus*: Wedding industry knowledge, vendor requirements

37. **specification-compliance-overseer**
    - *Tools*: read_file, write_file, grep, list_directory
    - *Focus*: Feature compliance, scope management

### 🛡️ LEGAL & COMPLIANCE  
38. **legal-technical-guardian**
    - *Tools*: read_file, grep
    - *Focus*: Legal compliance implementation

### 🤝 TECHNICAL LEADERSHIP
39. **technical-lead-orchestrator**
    - *Tools*: read_file, list_directory, bash
    - *Focus*: Architecture decisions, team coordination

40. **ai-ml-engineer**
    - *Tools*: read_file, write_file, bash
    - *Focus*: LLM integration, embeddings, AI features

41. **data-analytics-engineer**
    - *Tools*: read_file, write_file, bash
    - *Focus*: Analytics infrastructure, reporting

## MCP Integration Strategy

### Tier 1 MCP Servers (Critical)
- **PostgreSQL MCP**: Database security, RLS policies, direct queries
- **Playwright MCP**: E2E testing, visual regression, mobile testing
- **PostHog MCP**: Analytics, A/B testing, conversion optimization
- **Bugsnag MCP**: Error monitoring, wedding day reliability
- **Memory MCP**: Cross-session learning, decision tracking

### Tier 2 MCP Servers (High Value)
- **Filesystem MCP**: Advanced file operations, bulk processing
- **Biome MCP**: Code quality, formatting, linting
- **Context7 MCP**: Up-to-date library documentation

### Agent Usage Patterns

#### For Feature Development:
1. **nextjs-fullstack-developer** - Core implementation
2. **test-automation-architect** - Comprehensive testing
3. **mobile-first-ux-specialist** - Mobile optimization
4. **authentication-architecture-specialist** - Security hardening
5. **verification-cycle-coordinator** - Quality validation
6. **documentation-chronicler** - Documentation
7. **user-communication-specialist** - Impact translation

#### For Bug Fixes:
1. **bugsnag** MCP - Error identification
2. **wedding-day-reliability-engineer** - Impact assessment
3. **test-automation-architect** - Regression testing
4. **production-guardian** - Deployment safety

#### For Conversion Optimization:
1. **conversion-optimization-specialist** - Strategy
2. **business-intelligence-specialist** - Metrics
3. **mobile-first-ux-specialist** - Mobile experience
4. **test-automation-architect** - A/B testing validation

## Phase-Specific Focus Areas

### Current Phase: Testing & Refactoring
**Primary Agents**:
- Authentication security hardening
- Mobile-first UX optimization  
- Conversion rate improvement
- Wedding day reliability
- Business intelligence & metrics

**Key Success Metrics**:
- Security score: 2/10 → 7/10
- Trial conversion: <5% → >5%
- Mobile performance: <2s load time
- Saturday uptime: 100%
- Test coverage: >90%

## Saturday Wedding Protocol
All agents follow **zero-tolerance Saturday rules**:
- Wedding day = read-only mode for non-critical features
- Emergency-only communications
- 100% uptime requirement
- <500ms response time guarantee
- Offline-first mobile capability

## Agent Selection Guide

### "I need to..." → Use this agent:
- **Secure authentication** → authentication-architecture-specialist
- **Optimize mobile UX** → mobile-first-ux-specialist  
- **Improve conversions** → conversion-optimization-specialist
- **Test everything** → test-automation-architect
- **Monitor wedding day** → wedding-day-reliability-engineer
- **Analyze business metrics** → business-intelligence-specialist
- **Build Next.js features** → nextjs-fullstack-developer
- **Implement Supabase** → supabase-specialist
- **Deploy safely** → deployment-safety-checker + production-guardian
- **Document decisions** → documentation-chronicler
- **Translate for photographers** → user-communication-specialist

**Agent Selection Principle**: Choose the most specialized agent for your specific task. When in doubt, start with the technical-lead-orchestrator for complex cross-domain work.