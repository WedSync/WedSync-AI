# TEAM A - ROUND 1: WS-222 - Custom Domains System
## 2025-01-30 - Development Round 1

**YOUR MISSION:** Create comprehensive custom domain management interface for wedding suppliers to use their own domains for client portals
**FEATURE ID:** WS-222 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about domain configuration, SSL management, and DNS setup user experience

## =¨ CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**  MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/domains/
cat $WS_ROOT/wedsync/src/components/domains/DomainManager.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test domains
# MUST show: "All tests passing"
```

## =Ú STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION
```typescript
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__search_for_pattern("domain configuration DNS SSL");
await mcp__serena__find_symbol("DomainSetup Configuration", "", true);
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK
```typescript
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**=¨ CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY

### C. REF MCP CURRENT DOCS
```typescript
# Use Ref MCP to search for:
# - "DNS management domain-validation"
# - "SSL certificate automation"
# - "Next.js custom-domains routing"
```

## >Ð STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Custom Domain UI Architecture Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Custom domain system needs: domain input validation, DNS record configuration display, SSL certificate status monitoring, subdomain management, domain verification process. Each supplier needs their professional domain (like clients.photographystudio.com) pointing to their WedSync portal.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});
```

## >ó NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY)

### Settings Navigation Integration:
```typescript
// MUST update settings navigation
{
  title: "Custom Domain",
  href: "/settings/domain",
  icon: Globe
}
```

## <¯ SPECIFIC DELIVERABLES

### Core Domain Components:
- [ ] **DomainManager.tsx** - Main domain configuration interface
- [ ] **DomainVerification.tsx** - DNS and domain verification process
- [ ] **SSLStatus.tsx** - Certificate status and renewal monitoring
- [ ] **DNSInstructions.tsx** - Step-by-step DNS setup guide
- [ ] **DomainPreview.tsx** - Live preview of custom domain portal
- [ ] **useDomainStatus.ts** - Custom hook for domain health monitoring

### Wedding Supplier Features:
- [ ] Domain validation and availability checking
- [ ] Automated SSL certificate provisioning
- [ ] DNS record configuration assistance
- [ ] Custom subdomain options (clients.domain.com)
- [ ] Domain health monitoring and alerts

## <­ PLAYWRIGHT TESTING

```javascript
// Custom Domain Testing
await mcp__playwright__browser_navigate({url: "http://localhost:3000/settings/domain"});
const domainInterface = await mcp__playwright__browser_snapshot();

// Test domain input and validation
await mcp__playwright__browser_type({
  element: "domain input",
  ref: "[data-testid='domain-input']",
  text: "clients.photographystudio.com"
});

await mcp__playwright__browser_click({
  element: "verify domain button",
  ref: "[data-testid='verify-domain']"
});
```

## =¾ WHERE TO SAVE

- **Components**: `$WS_ROOT/wedsync/src/components/domains/`
- **Hooks**: `$WS_ROOT/wedsync/src/hooks/useDomainStatus.ts`
- **Types**: `$WS_ROOT/wedsync/src/types/domains.ts`
- **Tests**: `$WS_ROOT/wedsync/src/components/domains/__tests__/`

##   CRITICAL WARNINGS

- Domain validation must prevent subdomain takeover attacks
- SSL certificate renewal must be automated
- DNS changes should include clear rollback instructions
- Domain verification must be secure and reliable

---

**Real Wedding Scenario:** A luxury wedding planning company wants their clients to access their portal at "clients.elegantevents.com" instead of a generic WedSync URL. The domain system guides them through DNS setup, automatically provisions SSL certificates, and provides a seamless branded experience for their wedding clients.

**EXECUTE IMMEDIATELY - Build comprehensive custom domain system for supplier branding!**