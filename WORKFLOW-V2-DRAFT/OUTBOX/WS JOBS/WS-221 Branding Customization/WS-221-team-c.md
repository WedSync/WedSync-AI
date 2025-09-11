# TEAM C - ROUND 1: WS-221 - Branding Customization
## 2025-01-30 - Development Round 1

**YOUR MISSION:** Handle real-time brand preview and integration workflows for branding customization
**FEATURE ID:** WS-221 (Track all work with this ID)

## =¨ CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**  MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/branding/
cat $WS_ROOT/wedsync/src/lib/integrations/branding/BrandSync.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test branding-integration
# MUST show: "All tests passing"
```

## =Ú ENHANCED SERENA + REF SETUP (Integration Focus)

### A. SERENA INTEGRATION ANALYSIS
```typescript
await mcp__serena__find_referencing_symbols("theme realtime brand");
await mcp__serena__search_for_pattern("css variables theme switching");
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/integrations/");
```

### B. INTEGRATION DOCUMENTATION
```typescript
# Use Ref MCP to search for:
# - "CSS custom-properties real-time"
# - "React context theme-switching"
# - "File storage CDN integration"
```

## CORE DELIVERABLES
- [ ] Real-time brand theme synchronization system
- [ ] Logo and asset delivery optimization
- [ ] Brand preview integration with client portals
- [ ] Cross-system brand consistency validation
- [ ] Integration health monitoring for brand assets

**EXECUTE IMMEDIATELY - Build brand synchronization system for real-time customization!**