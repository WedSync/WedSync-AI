# TEAM C - ROUND 1: Journey Builder Service Connections - Email/SMS Integration

**Date:** 2025-01-21  
**Priority:** P0 from roadmap  
**Mission:** Complete Journey Builder service connections for email/SMS integration  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
Complete service connections (50% complete - email partial, SMS not connected):
- Email service integration with templates
- SMS service integration with Twilio
- Service connector architecture
- Template management system
- Delivery tracking and status updates
- Integration with Team B execution engine

**Dependencies:** Requires Team B Journey Execution Engine completion first

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION

```typescript
await mcp__context7__get-library-docs("/supabase/supabase", "edge-functions email", 5000);
await mcp__context7__get-library-docs("/twilio/twilio-node", "sms messaging", 3000);
await mcp__serena__find_symbol("email", "src/lib", true);
await mcp__serena__find_symbol("journey", "src/lib", false);
```

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Service Integration):
- [ ] Email service connector with template system
- [ ] SMS service connector with Twilio integration  
- [ ] Service delivery tracking
- [ ] Integration with Team B execution engine
- [ ] Template management API
- [ ] Unit tests with >80% coverage

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY