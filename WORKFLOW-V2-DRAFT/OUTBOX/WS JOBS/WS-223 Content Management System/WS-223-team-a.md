# TEAM A - ROUND 1: WS-223 - Content Management System
## 2025-01-30 - Development Round 1

**YOUR MISSION:** Create comprehensive content management interface for wedding suppliers to manage portal content, pages, and client communications
**FEATURE ID:** WS-223 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about content editing, media management, and client portal content workflows

## =¨ CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**  MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/cms/
cat $WS_ROOT/wedsync/src/components/cms/ContentEditor.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test cms
# MUST show: "All tests passing"
```

## =Ú STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION
```typescript
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__search_for_pattern("content editor rich-text media");
await mcp__serena__find_symbol("ContentManager Editor", "", true);
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
# - "Rich text editor React components"
# - "Media upload drag-drop interfaces"
# - "Content versioning and publishing"
```

## >Ð STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Content Management UI Architecture Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Content management system needs: rich text editor, media library, page templates, content scheduling, client portal preview. Wedding suppliers need to manage welcome messages, service descriptions, gallery content, and client communication templates.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});
```

## >ó NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY)

### Dashboard Navigation Integration:
```typescript
// MUST update dashboard navigation
{
  title: "Content Management",
  href: "/dashboard/content",
  icon: FileText
}
```

## <¯ SPECIFIC DELIVERABLES

### Core CMS Components:
- [ ] **ContentEditor.tsx** - Rich text editor with media embedding
- [ ] **MediaLibrary.tsx** - File management and organization system
- [ ] **PageBuilder.tsx** - Visual page construction interface
- [ ] **ContentScheduler.tsx** - Publishing and scheduling system
- [ ] **TemplateManager.tsx** - Reusable content template system
- [ ] **ContentPreview.tsx** - Real-time client portal preview
- [ ] **useContentState.ts** - Custom hook for content management

### Wedding Supplier Features:
- [ ] Welcome message and service description editing
- [ ] Photo gallery management and organization
- [ ] Client communication template creation
- [ ] Content publishing workflow with approval
- [ ] SEO optimization for public-facing content

## <­ PLAYWRIGHT TESTING

```javascript
// Content Management Testing
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard/content"});
const cmsInterface = await mcp__playwright__browser_snapshot();

// Test rich text editing
await mcp__playwright__browser_click({
  element: "content editor",
  ref: "[data-testid='rich-editor']"
});

// Test media upload
await mcp__playwright__browser_file_upload({
  paths: ["/path/to/test/image.jpg"]
});
```

## =¾ WHERE TO SAVE

- **Components**: `$WS_ROOT/wedsync/src/components/cms/`
- **Hooks**: `$WS_ROOT/wedsync/src/hooks/useContentState.ts`
- **Types**: `$WS_ROOT/wedsync/src/types/cms.ts`
- **Tests**: `$WS_ROOT/wedsync/src/components/cms/__tests__/`

##   CRITICAL WARNINGS

- Rich text editor must sanitize HTML to prevent XSS
- File uploads must be validated for type and size
- Content versioning must preserve previous versions
- Media library must handle large file collections efficiently

---

**Real Wedding Scenario:** A wedding photographer needs to update their client portal with a personalized welcome message, upload recent engagement photos to the gallery, create a timeline template for wedding day logistics, and schedule content to publish after the ceremony. The CMS allows them to manage all portal content from one interface.

**EXECUTE IMMEDIATELY - Build comprehensive content management system for supplier portal control!**