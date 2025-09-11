# TEAM A - ROUND 1: WS-286 - Advanced Form Builder
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build advanced drag-drop form builder with wedding-specific field types and conditional logic
**FEATURE ID:** WS-286 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about wedding data collection needs and intelligent form automation

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/form-builder/advanced/
cat $WS_ROOT/wedsync/src/components/form-builder/advanced/AdvancedFormBuilder.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test advanced-form-builder
# MUST show: "All tests passing"
```

## 🧠 SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Advanced Form Builder Architecture
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Advanced form builder needs: drag-drop interface with wedding-specific fields (guest tables, dietary restrictions, song requests), conditional logic (show catering fields only if reception selected), smart validation (phone number formats, email verification), template system (RSVP, vendor intake, timeline), real-time preview with mobile responsive testing.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding form complexity: Forms need relationship mapping (guest +1s, family groups), conditional visibility (dietary options appear when RSVP yes), smart defaults (populate from wedding profile), validation rules (required fields based on wedding type), integration with existing wedding data (guest lists, vendor info).",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Form builder UI requirements: Visual drag-drop with @dnd-kit, field property panels, conditional logic builder, validation rule editor, mobile preview mode, template gallery, form analytics (completion rates, abandonment points), sharing and embedding options.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Technical architecture: React components with TypeScript, form schema validation with Zod, conditional logic engine, responsive preview system, wedding data integration APIs, template storage and management, analytics tracking system.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🎯 DELIVERABLES
- [ ] Drag-drop form builder with wedding-specific field types
- [ ] Conditional logic system for intelligent form behavior
- [ ] Wedding data integration (guest lists, vendor info)
- [ ] Template system with pre-built wedding forms
- [ ] Mobile-responsive preview and testing
- [ ] Form analytics and optimization insights

**✅ Ready for advanced wedding form creation and management**