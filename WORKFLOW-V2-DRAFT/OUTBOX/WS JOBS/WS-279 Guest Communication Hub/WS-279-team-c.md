# TEAM C - ROUND 1: WS-279 - Guest Communication Hub
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build real-time communication integrations and multi-channel messaging systems
**FEATURE ID:** WS-279 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about reliable message delivery and real-time communication synchronization

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/communication/
cat $WS_ROOT/wedsync/src/lib/integrations/communication/message-dispatcher.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test communication-integration
# MUST show: "All tests passing"
```

## 🎯 TEAM C SPECIALIZATION: INTEGRATION & REAL-TIME FOCUS

**Core Integration Components:**

1. **MultiChannelMessageDispatcher** - Unified message sending across email/SMS/push
2. **RealtimeCommunicationSync** - Real-time updates for message delivery status
3. **ExternalProviderIntegration** - Integration with email and SMS providers
4. **CommunicationWebhookHandler** - Handle delivery status webhooks
5. **MessageDeliveryTracker** - Track and retry failed message deliveries
6. **RSVPRealtimeUpdates** - Real-time RSVP response synchronization

### Key Integration Features:
- Multi-provider email integration (Resend, SendGrid fallback)
- SMS integration with delivery confirmation (Twilio)
- Push notification integration (Firebase, Apple Push)
- Real-time communication status via WebSocket
- Webhook handling for delivery confirmations
- Circuit breaker pattern for provider failures

## 💾 WHERE TO SAVE YOUR WORK
- Integrations: $WS_ROOT/wedsync/src/lib/integrations/communication/
- Webhooks: $WS_ROOT/wedsync/src/app/api/webhooks/communication/
- Types: $WS_ROOT/wedsync/src/types/communication-integration.ts
- Tests: $WS_ROOT/wedsync/__tests__/integrations/communication/
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/

---

**EXECUTE IMMEDIATELY - Build the communication integrations that ensure every message reaches its destination!**