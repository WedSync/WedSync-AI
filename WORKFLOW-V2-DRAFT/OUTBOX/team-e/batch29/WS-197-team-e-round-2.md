# TEAM E — BATCH 29 — ROUND 2 — WS-197 — Middleware Setup — Security Dashboard & Monitoring

**Date:** 2025-01-20  
**Feature ID:** WS-197 (Track all work with this ID)  
**Priority:** P0 from roadmap  
**Mission:** Build comprehensive security monitoring dashboard and real-time middleware analytics for platform oversight  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** WedSync platform security administrator monitoring system health and security events  
**I want to:** View real-time middleware security analytics, monitor authentication patterns, and receive alerts for suspicious activities  
**So that:** I can immediately detect when bot networks attempt to scrape wedding vendor data during peak browsing periods; monitor authentication success rates during couple onboarding campaigns; track CSRF protection effectiveness during form submission spikes; and receive instant alerts when security thresholds are breached, ensuring the platform remains secure while couples and suppliers conduct their wedding business without interruption

**Real Wedding Problem This Solves:**
During a major wedding show weekend with 5000+ attendees, the security dashboard shows real-time middleware analytics: 99.2% authentication success rate for legitimate users, 847 bot attempts blocked in the last hour, CSRF protection preventing 23 potential attacks, and rate limiting maintaining sub-200ms response times despite 400% traffic increase. When an unusual spike in failed authentication attempts is detected from a specific region, automated alerts notify the security team, who can investigate and implement additional protection without affecting legitimate couples and suppliers attending the show.

---

## 🎯 TECHNICAL REQUIREMENTS

**Building on Round 1 Foundation:**
- Real-time security monitoring dashboard with middleware analytics
- Authentication pattern analysis and anomaly detection
- Security event alerting with escalation workflows
- Performance monitoring integration with security metrics
- Administrative controls for security policy management

**Integration with Other Teams (Round 2):**
- Middleware: Advanced security features from Team A
- Error Handling: Security error analytics from Team B
- Rate Limiting: Adaptive intelligence insights from Team C
- API Performance: Security performance metrics from Team D

---

## 📚 STEP 1: ENHANCED DOCUMENTATION LOADING

```typescript
// ROUND 2 ADVANCED PATTERNS:
await mcp__Ref__ref_search_documentation({query: "grafana security-dashboards latest documentation"});
await mcp__Ref__ref_search_documentation({query: "elasticsearch security-analytics latest documentation"});
await mcp__Ref__ref_search_documentation({query: "react dashboard-components latest documentation"});

// Review Round 1 implementations:
await mcp__serena__find_symbol("security", "components", true);
await mcp__serena__get_symbols_overview("components/admin");
```


## 🌐 BROWSER MCP INTERACTIVE TESTING (NEW!)

**🚀 Real Browser Automation with Browser MCP:**

The Browser MCP provides interactive browser testing capabilities that complement Playwright MCP:

```javascript
// BROWSER MCP - Interactive Visual Testing
// Use for real-time UI validation and user flow testing

// 1. NAVIGATE AND CAPTURE STATE
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/dashboard"});
const snapshot = await mcp__browsermcp__browser_snapshot();

// 2. INTERACTIVE FORM TESTING
await mcp__browsermcp__browser_click({
  element: "Login button",
  ref: snapshot.querySelector('[data-testid="login-btn"]')
});

await mcp__browsermcp__browser_type({
  element: "Email input field", 
  ref: snapshot.querySelector('input[type="email"]'),
  text: "test@wedding.com",
  submit: false
});

// 3. VISUAL REGRESSION TESTING
await mcp__browsermcp__browser_screenshot(); // Captures current state

// 4. RESPONSIVE TESTING
for (const width of [375, 768, 1024, 1920]) {
  await mcp__browsermcp__browser_resize({width, height: 800});
  await mcp__browsermcp__browser_wait({time: 1});
  await mcp__browsermcp__browser_screenshot();
}

// 5. CONSOLE AND NETWORK MONITORING
const logs = await mcp__browsermcp__browser_get_console_logs();
const hasErrors = logs.some(log => log.level === 'error');

// 6. MULTI-TAB TESTING
await mcp__browsermcp__browser_tabs({action: "new"});
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/settings"});
await mcp__browsermcp__browser_tabs({action: "select", index: 0});
```

**Browser MCP vs Playwright MCP:**
- **Browser MCP**: Interactive, visual, real-time testing during development
- **Playwright MCP**: Automated, programmatic, CI/CD testing
- **Use Both**: Browser MCP for exploration, Playwright MCP for automation


---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Security Monitoring & Analytics):
- [ ] Security dashboard in `/wedsync/components/admin/SecurityDashboard.tsx`
- [ ] Middleware analytics in `/wedsync/components/admin/MiddlewareAnalytics.tsx`
- [ ] Real-time monitoring in `/wedsync/components/admin/RealTimeMonitor.tsx`
- [ ] Security alerts in `/wedsync/components/admin/SecurityAlerts.tsx`
- [ ] Admin controls in `/wedsync/components/admin/SecurityControls.tsx`
- [ ] Security API endpoints for dashboard data
- [ ] Real-time WebSocket integration for live updates
- [ ] Comprehensive dashboard testing with security scenarios

---

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS

**Critical Navigation Context:**
This feature must integrate seamlessly with WedSync's navigation system to provide intuitive user flows and maintain consistent user experience across all wedding management workflows.

### Navigation Implementation Requirements

**1. Breadcrumb Integration**
```tsx
// Add breadcrumb support to all new pages/components
import { Breadcrumb } from '@/components/ui/breadcrumb'

// Example breadcrumb hierarchy for this feature:
// Dashboard > Helpers > Schedules > [Helper Name] > [Schedule Details]
const breadcrumbItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Helpers', href: '/helpers' },
  { label: 'Schedules', href: '/helpers/schedules' },
  { label: helperName, href: `/helpers/schedules/${helperId}` },
  { label: 'Details', href: undefined } // current page
]
```

**2. Menu Integration Points**
- **Main Navigation**: Add/update relevant menu items in main navigation
- **Contextual Menus**: Implement context-sensitive navigation options
- **Quick Actions**: Provide navigation shortcuts for common workflows

**3. Mobile Navigation Considerations**
```tsx
// Ensure mobile-first responsive navigation
// Use progressive disclosure for complex navigation trees
// Implement touch-friendly navigation controls
// Consider swipe gestures for timeline/schedule navigation
```

**4. Navigation State Management**
```tsx
// Implement navigation state persistence
// Handle deep linking and shareable URLs
// Maintain navigation context across page refreshes
// Support browser back/forward functionality
```

**5. User Flow Integration**
- **Entry Points**: Define how users access this feature from existing workflows
- **Exit Points**: Provide clear paths to related features and main dashboard
- **Cross-Feature Navigation**: Enable seamless transitions between related features

**6. Wedding Context Navigation**
```tsx
// Maintain wedding context in navigation
// Support multi-wedding navigation switching
// Preserve user's current wedding selection across feature navigation
// Implement wedding-specific navigation shortcuts
```

**Navigation Testing Requirements:**
- Test all breadcrumb paths and hierarchy
- Verify mobile navigation responsiveness
- Validate deep linking functionality
- Test navigation state persistence
- Ensure keyboard navigation accessibility
- Verify screen reader navigation support

---

## 🔗 DEPENDENCIES & INTEGRATION

### Integration with Round 1 Outputs:
- FROM Team A: Advanced security context - Required for security dashboard data
- FROM Team B: Error analytics - Dependency for security error monitoring
- FROM Team C: Adaptive rate limiting - Required for rate limiting dashboard integration
- FROM Team D: API performance metrics - Need for security performance monitoring

### Advanced Features to Provide:
- TO Team A: Dashboard feedback for security policy adjustments
- TO Team B: Security error requirements for enhanced error monitoring
- TO Team C: Dashboard insights for rate limiting optimization
- TO Team D: Performance requirements for security API optimization

---

## 🔒 ADVANCED SECURITY DASHBOARD IMPLEMENTATION

```typescript
// ✅ ROUND 2 PATTERN - Real-time Security Dashboard:
export const SecurityDashboard = () => {
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics>();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    // Real-time security data subscription
    const subscription = securityWebSocket.subscribe({
      onSecurityEvent: (event: SecurityEvent) => {
        updateSecurityMetrics(event);
        if (event.severity >= 'high') {
          addAlert(event);
        }
      },
      onMiddlewareMetrics: (metrics: MiddlewareMetrics) => {
        updateMiddlewareData(metrics);
      },
      onThreatDetection: (threat: ThreatEvent) => {
        handleThreatDetection(threat);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="security-dashboard">
      <SecurityOverview metrics={securityMetrics} />
      <RealTimeAlerts alerts={alerts} />
      <MiddlewareMetrics data={securityMetrics?.middleware} />
      <SecurityAnalytics timeRange="24h" />
      <ThreatIntelligence threats={securityMetrics?.threats} />
    </div>
  );
};

// ✅ ROUND 2 PATTERN - Security Analytics Component:
export const SecurityAnalytics = ({ timeRange }: { timeRange: string }) => {
  const analytics = useSecurityAnalytics(timeRange);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Authentication Success Rate"
        value={`${analytics?.authSuccessRate || 0}%`}
        trend={analytics?.authTrend}
        threshold={{ warning: 95, critical: 90 }}
      />
      <MetricCard
        title="CSRF Protection Blocks"
        value={analytics?.csrfBlocks || 0}
        trend={analytics?.csrfTrend}
        type="security-blocks"
      />
      <MetricCard
        title="Bot Detection Rate"
        value={`${analytics?.botDetectionRate || 0}%`}
        trend={analytics?.botTrend}
        type="detection-rate"
      />
      <MetricCard
        title="Middleware Performance"
        value={`${analytics?.avgResponseTime || 0}ms`}
        trend={analytics?.performanceTrend}
        threshold={{ warning: 50, critical: 100 }}
      />
    </div>
  );
};
```

---

## ✅ ROUND 2 SUCCESS CRITERIA

### Advanced Technical Implementation:
- [ ] Security dashboard with real-time middleware analytics
- [ ] Authentication pattern monitoring with anomaly detection
- [ ] Security alert system with escalation workflows
- [ ] Performance monitoring integration with security metrics
- [ ] Administrative controls for security policy management
- [ ] Advanced test coverage >90% including security scenarios
- [ ] Real-time WebSocket integration for live updates
- [ ] Dashboard performance <100ms for metric updates

### Monitoring & Analytics Metrics:
- [ ] Real-time dashboard updating security metrics within 5 seconds
- [ ] Authentication anomaly detection with >90% accuracy
- [ ] Security alerts triggering within 30 seconds of threat detection
- [ ] Middleware performance monitoring with sub-second granularity
- [ ] Dashboard supporting concurrent admin users without degradation

---

## 💾 ROUND 2 FILE LOCATIONS

### Advanced Code Files:
- Dashboard: `/wedsync/components/admin/SecurityDashboard.tsx`
- Analytics: `/wedsync/components/admin/MiddlewareAnalytics.tsx`
- Monitor: `/wedsync/components/admin/RealTimeMonitor.tsx`
- Alerts: `/wedsync/components/admin/SecurityAlerts.tsx`
- Controls: `/wedsync/components/admin/SecurityControls.tsx`
- API: `/wedsync/src/app/api/admin/security/`
- WebSocket: `/wedsync/lib/websocket/security-events.ts`
- Advanced Tests: `/wedsync/tests/admin/security/`

### CRITICAL - Round 2 Report:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch29/WS-197-team-e-round-2-complete.md`

---

**🚨 ROUND 2 FOCUS: Comprehensive security monitoring and real-time analytics. Provide visibility into all middleware security operations.**

END OF ROUND 2 PROMPT - EXECUTE IMMEDIATELY