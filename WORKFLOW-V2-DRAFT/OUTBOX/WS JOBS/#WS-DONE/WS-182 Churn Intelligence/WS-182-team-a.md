# TEAM A - ROUND 1: WS-182 - Churn Intelligence
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Create churn prediction dashboard with at-risk supplier alerts and retention campaign management interface
**FEATURE ID:** WS-182 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about churn risk visualization clarity and retention action prioritization

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/admin/churn/
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/admin/churn/ChurnRiskDashboard.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test src/components/admin/churn/
# MUST show: "All tests passing"
```

## 📚 ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION
```typescript
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__search_for_pattern("churn.*prediction");
await mcp__serena__search_for_pattern("retention.*campaign");
await mcp__serena__get_symbols_overview("src/components/admin/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK
```typescript
await mcp__serena__read_file("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY

### C. REF MCP CURRENT DOCS
```typescript
await mcp__Ref__ref_search_documentation("React customer success dashboard churn prediction");
await mcp__Ref__ref_search_documentation("Next.js retention campaign management interface");
await mcp__Ref__ref_search_documentation("Real-time alerts dashboard components");
```

## 🧠 SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Churn intelligence dashboard requires urgent action-oriented design: 1) At-risk supplier list with color-coded risk levels (critical=red, high=orange, medium=yellow) 2) Risk score explanation showing behavioral factors (login frequency, feature usage, support tickets) 3) Automated retention action recommendations with one-click execution 4) Campaign tracking showing save rates and ROI 5) Real-time alerts for newly identified high-risk suppliers. Must enable immediate customer success intervention.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});
```

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### CHURN DASHBOARD SECURITY:
- [ ] **Customer success team authentication** - Verify customer success manager role
- [ ] **Supplier data privacy protection** - Mask sensitive supplier information appropriately
- [ ] **Audit logging for retention actions** - Log all customer success interventions
- [ ] **Campaign data access control** - Restrict retention campaign data to authorized users
- [ ] **Automated action authorization** - Require approval for high-impact retention actions

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY)

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Admin navigation link for "Customer Success" → "Churn Intelligence"
- [ ] Customer success section breadcrumbs: Admin → Customer Success → Churn
- [ ] Mobile customer success navigation support
- [ ] Emergency alert navigation mode for critical churn situations

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

### SPECIFIC DELIVERABLES FOR WS-182:

#### 1. ChurnRiskDashboard.tsx - Main churn monitoring interface
```typescript
interface ChurnRiskDashboardProps {
  atRiskSuppliers: AtRiskSupplier[];
  churnMetrics: ChurnMetrics;
  retentionCampaigns: RetentionCampaign[];
  realTimeUpdates: boolean;
}

// Key features:
// - Real-time churn risk monitoring with auto-refresh
// - Risk level summary cards (Critical: 15, High: 32, Medium: 48)
// - At-risk supplier list with risk scores and behavioral indicators
// - Quick action buttons for retention interventions
// - Performance metrics showing monthly save rates
```

#### 2. AtRiskSupplierCard.tsx - Individual supplier risk display
```typescript
interface AtRiskSupplierCardProps {
  supplier: AtRiskSupplier;
  riskFactors: ChurnRiskFactor[];
  recommendedActions: RetentionAction[];
  onActionExecute: (action: RetentionAction) => void;
}

// Key features:
// - Supplier profile with risk score prominently displayed
// - Risk factors breakdown (15 days since login, 3 support tickets, low feature usage)
// - Predicted churn date with urgency indicator
// - Recommended retention actions with success probability
// - One-click action execution (send discount, schedule call, assign CSM)
```

#### 3. ChurnTrendChart.tsx - Historical churn analysis
```typescript
interface ChurnTrendChartProps {
  churnData: ChurnTrendData[];
  timeRange: '30d' | '90d' | '365d';
  supplierSegments: SupplierSegment[];
}

// Key features:
// - Churn rate trends over time with seasonal patterns
// - Segmented analysis by supplier type (photographers, venues, planners)
// - Retention campaign impact visualization
// - Benchmark comparisons against industry standards
```

#### 4. RetentionCampaignManager.tsx - Campaign tracking and management
```typescript
interface RetentionCampaignManagerProps {
  activeCampaigns: RetentionCampaign[];
  campaignTemplates: CampaignTemplate[];
  onCampaignCreate: (campaign: RetentionCampaign) => void;
  onCampaignUpdate: (id: string, updates: Partial<RetentionCampaign>) => void;
}

// Key features:
// - Active retention campaign monitoring with progress tracking
// - Campaign performance metrics (open rates, response rates, save rates)
// - Template library for common retention scenarios
// - A/B testing setup for campaign optimization
```

#### 5. ChurnAlertPanel.tsx - Real-time risk notifications
```typescript
interface ChurnAlertPanelProps {
  alerts: ChurnAlert[];
  onAlertDismiss: (alertId: string) => void;
  onAlertAction: (alertId: string, action: string) => void;
}

// Key features:
// - Real-time notifications for newly identified high-risk suppliers
// - Critical alert prioritization with sound and visual indicators
// - Quick action buttons for immediate intervention
// - Alert history and follow-up tracking
```

## 📋 TECHNICAL SPECIFICATION INTEGRATION

Based on WS-182 technical specification:
- **Risk Scoring**: 0-100 scale with color-coded visual indicators
- **Risk Factors**: Login frequency, feature usage, support tickets, payment failures
- **Retention Actions**: Discount offers, personal calls, feature training, account reviews
- **Campaign Tracking**: Save rates, ROI metrics, conversion tracking

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### MUST CREATE:
- [ ] `/src/components/admin/churn/ChurnRiskDashboard.tsx` - Main dashboard
- [ ] `/src/components/admin/churn/AtRiskSupplierCard.tsx` - Individual supplier risk display
- [ ] `/src/components/admin/churn/ChurnTrendChart.tsx` - Historical analysis visualization
- [ ] `/src/components/admin/churn/RetentionCampaignManager.tsx` - Campaign management
- [ ] `/src/components/admin/churn/ChurnAlertPanel.tsx` - Real-time risk alerts
- [ ] `/src/components/admin/churn/index.ts` - Component exports

### MUST IMPLEMENT:
- [ ] Real-time at-risk supplier monitoring with auto-refresh
- [ ] Risk score visualization with color-coded severity levels
- [ ] One-click retention action execution with confirmation dialogs
- [ ] Campaign performance tracking with ROI calculations
- [ ] Responsive design for mobile customer success management
- [ ] Real-time alert system for critical churn situations

## 💾 WHERE TO SAVE YOUR WORK
- Components: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/admin/churn/`
- Charts: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/charts/churn/`
- Hooks: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/hooks/useChurnIntelligence.ts`
- Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/__tests__/components/admin/churn/`
- Types: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/types/churn-intelligence.ts`

## 🏁 COMPLETION CHECKLIST
- [ ] Churn risk dashboard created with real-time supplier monitoring
- [ ] At-risk supplier cards implemented with risk factor breakdown
- [ ] Retention campaign management interface functional
- [ ] Real-time alert system working with critical risk notifications
- [ ] Historical churn trend visualization complete
- [ ] Navigation integration with customer success section access

**WEDDING CONTEXT REMINDER:** Your churn intelligence dashboard helps customer success managers identify wedding suppliers at risk of canceling - like a photographer who hasn't logged in for 15 days or a venue with multiple support tickets. Early intervention through your interface can save valuable supplier relationships and maintain the vendor network that couples depend on for their special day.

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements!**