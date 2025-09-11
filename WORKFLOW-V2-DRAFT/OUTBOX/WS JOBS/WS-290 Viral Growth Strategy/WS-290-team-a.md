# TEAM A - ROUND 1: WS-290 - Viral Growth Strategy
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build viral invitation UI components and referral dashboard for growth tracking
**FEATURE ID:** WS-290 (Track all work with this ID)  
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about viral growth UI patterns and invitation user experience

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/viral/
cat $WS_ROOT/wedsync/src/components/viral/ReferralDashboard.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test viral-growth
# MUST show: "All tests passing"
```

## 📚 LOAD FEATURE SPECIFICATION
```typescript
// Load the complete WS-290 Viral Growth Strategy specification
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/OUTBOX/feature-designer/WS-290-viral-growth-strategy-technical.md");
```

## 🎯 TEAM A FRONTEND SPECIALIZATION: Viral Growth UI Components

### Core Requirements from WS-290 Specification:
1. **InvitationTriggers Component** - Smart invitation prompts 
2. **ReferralDashboard Component** - Viral metrics visualization
3. **ViralAnalyticsDashboard Component** - K-factor tracking interface
4. **InvitationPrompts Component** - Context-aware invitation UI

### Key Frontend Deliverables:
- `/src/components/viral/InvitationTriggers.tsx` - Smart invitation prompts
- `/src/components/viral/ReferralDashboard.tsx` - Referral tracking dashboard  
- `/src/components/viral/ViralAnalyticsDashboard.tsx` - Viral metrics display
- `/src/hooks/useViralTriggers.ts` - Viral trigger management hook

### Technical Implementation Focus:
```typescript
// Viral Metrics Interface from WS-290 spec
interface ViralMetrics {
  k_factor: number;
  invitations_sent: number;
  invitation_open_rate: number;
  invitation_click_rate: number;  
  invitation_conversion_rate: number;
  time_to_first_invite_avg: number;
  time_to_activation_avg: number;
  doubling_time_days: number;
}

// Invitation Trigger Props
interface InvitationTriggerProps {
  userId: string;
  userType: 'supplier' | 'couple';
  triggerContext: string;
  weddingId?: string;
  onInvitationSent?: (count: number) => void;
}
```

### UI Requirements:
- **Smart invitation triggers** that appear at optimal moments
- **K-factor visualization** with target indicators (>1.5 target)
- **Referral progress tracking** with gamification elements  
- **Social sharing tools** for viral growth
- **Invitation history** with status tracking
- **Mobile-responsive** viral growth interface

## 🏁 COMPLETION CHECKLIST
- [ ] InvitationTriggers component created and functional
- [ ] ReferralDashboard component implemented  
- [ ] ViralAnalyticsDashboard component working
- [ ] useViralTriggers hook implemented
- [ ] K-factor visualization complete
- [ ] Mobile-responsive design verified
- [ ] All TypeScript errors resolved
- [ ] Tests written and passing

**EXECUTE IMMEDIATELY - Build the viral growth UI that drives exponential user acquisition!**
