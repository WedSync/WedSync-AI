# WS-314 Team A - Advanced Automation Rules Engine
## Frontend/UI Development

### BUSINESS CONTEXT
Wedding photographers need sophisticated automation rules to handle complex client workflows - like automatically sending contract reminders 2 weeks after engagement shoots, or triggering gallery delivery emails when the final payment is received. These automation rules need visual editors that non-technical vendors can easily configure and modify.

### TECHNICAL REQUIREMENTS
- Next.js 15.4.3 with App Router architecture
- React 19.1.1 with Server Components and Suspense
- TypeScript 5.9.2 with strict mode (zero 'any' types)
- Tailwind CSS 4.1.11 with CSS-based configuration
- @dnd-kit for drag-and-drop rule building
- React Hook Form 7.62.0 with Zod 4.0.17 validation
- Untitled UI + Magic UI component system
- Motion 12.23.12 for smooth animations
- Zustand 5.0.7 for rule builder state management
- Real-time rule execution preview capability

### DELIVERABLES
1. `src/components/automation/RuleBuilderCanvas.tsx` - Visual drag-drop rule builder
2. `src/components/automation/RuleTriggerPicker.tsx` - Event trigger selection component
3. `src/components/automation/RuleActionBuilder.tsx` - Action configuration interface
4. `src/components/automation/RuleConditionEditor.tsx` - Visual condition builder with logic operators
5. `src/components/automation/RulePreviewEngine.tsx` - Live rule execution preview
6. `src/components/automation/RuleTemplateLibrary.tsx` - Pre-built rule templates gallery
7. `src/components/automation/RuleFlowDiagram.tsx` - Visual rule flow representation
8. `src/components/automation/RuleTestingConsole.tsx` - Rule debugging and testing interface
9. `src/components/automation/AutomationDashboard.tsx` - Rule performance analytics
10. `src/components/automation/RuleSchedulingPanel.tsx` - Time-based rule scheduling
11. `src/app/automation/rules/page.tsx` - Main automation rules management page
12. `src/app/automation/templates/page.tsx` - Rule templates marketplace
13. `src/lib/automation/rule-validation.ts` - Frontend rule validation logic
14. `src/lib/automation/rule-preview-engine.ts` - Client-side rule simulation
15. `src/types/automation.ts` - Complete TypeScript automation types
16. `src/__tests__/components/automation/RuleBuilder.test.tsx` - Comprehensive component tests

### ACCEPTANCE CRITERIA
- [ ] Visual rule builder supports drag-and-drop with 15+ trigger types
- [ ] Rule conditions support complex logic (AND, OR, NOT operators)
- [ ] Real-time preview shows rule execution with sample data
- [ ] Mobile-responsive rule builder works on tablets (768px+)
- [ ] Template library contains 25+ wedding-specific automation recipes
- [ ] Rule testing console provides step-by-step execution debugging

### WEDDING INDUSTRY CONSIDERATIONS
- Support wedding timeline milestones (booking, contract, payments, delivery)
- Handle seasonal variations (peak wedding season vs. off-season rules)
- Include guest list size and wedding date as rule condition variables
- Support multi-vendor coordination rules (photographer + venue + catering)

### INTEGRATION POINTS
- Team B: Rule execution API endpoints and webhook management
- Team C: Automation rules database schema and execution logs
- Team D: Integration with email/SMS providers and third-party systems
- Existing: Customer journey builder, form system, payment processing