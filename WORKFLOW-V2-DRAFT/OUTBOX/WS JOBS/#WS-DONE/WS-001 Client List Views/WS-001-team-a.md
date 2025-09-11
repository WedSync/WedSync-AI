# TEAM A - ROUND 1: WS-001 - Client List Views
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build responsive client list interface with 4 view types (list, grid, calendar, kanban) and real-time filtering
**FEATURE ID:** WS-001 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about performance with 500+ clients and mobile responsiveness

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/\(dashboard\)/clients/
ls -la $WS_ROOT/wedsync/src/components/clients/
cat $WS_ROOT/wedsync/src/components/clients/ClientListView.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test clients
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

// Query existing client-related patterns
await mcp__serena__search_for_pattern("ClientList|client-list");
await mcp__serena__find_symbol("Client", "", true);
await mcp__serena__get_symbols_overview("src/components/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY

**❌ DO NOT USE:**
- Radix UI, Catalyst UI, shadcn/ui, or any other component libraries

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
# Use Ref MCP to search for relevant documentation
await mcp__Ref__ref_search_documentation("Next.js App Router client components TypeScript");
await mcp__Ref__ref_search_documentation("React virtual scrolling react-window performance");
await mcp__Ref__ref_search_documentation("Tailwind CSS responsive design mobile first");
```

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**YOUR CORE RESPONSIBILITIES:**
- React components with TypeScript
- Responsive UI (375px, 768px, 1920px)
- Untitled UI + Magic UI components only
- Form validation and error handling
- Accessibility compliance (WCAG 2.1 AA)
- Component performance <200ms render time

### SPECIFIC DELIVERABLES FOR WS-001:

#### 1. Main Client List Page
**File:** `$WS_ROOT/wedsync/src/app/(dashboard)/clients/page.tsx`

#### 2. Client List View Component
**File:** `$WS_ROOT/wedsync/src/components/clients/ClientListView.tsx`

#### 3. Client Grid View Component  
**File:** `$WS_ROOT/wedsync/src/components/clients/ClientGridView.tsx`

#### 4. View Switcher Component
**File:** `$WS_ROOT/wedsync/src/components/clients/ClientViewSwitcher.tsx`

#### 5. Search and Filter Components
**File:** `$WS_ROOT/wedsync/src/components/clients/ClientFilters.tsx`

## 🏁 COMPLETION CHECKLIST
- [ ] Files created and verified to exist
- [ ] TypeScript compilation successful
- [ ] All tests passing
- [ ] Security requirements implemented
- [ ] Navigation integration complete
- [ ] Evidence package prepared
- [ ] Senior dev review prompt created

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements!**