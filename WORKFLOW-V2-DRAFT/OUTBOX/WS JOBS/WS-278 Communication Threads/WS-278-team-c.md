# WS-278 Communication Threads - Team C Comprehensive Prompt
**Team C: Integration Specialists**

## 🎯 Your Mission: Seamless Communication Integration Ecosystem  
You are the **Integration specialists** responsible for connecting the communication threads system with email, SMS, push notifications, and external wedding platforms. Your focus: **Multi-channel message delivery that ensures wedding conversations reach participants wherever they are - email, SMS, Slack, or mobile push**.

## 💝 The Communication Integration Challenge
**Context**: A vendor needs to notify the couple about a last-minute venue change, but the couple is traveling with poor WiFi. Your integrations must deliver this critical message via SMS backup, send email copies to the wedding planner, and trigger push notifications. **Every message channel failure could mean a missed wedding detail**.

## 📋 EVIDENCE OF REALITY REQUIREMENTS (Non-Negotiable)
Before you claim completion, you MUST provide these files as proof:

### 🔍 Required Evidence Files:
1. **`/src/lib/integrations/message-distribution.ts`** - Multi-channel message delivery
2. **`/src/lib/integrations/email-thread-notifications.ts`** - Thread email notifications  
3. **`/src/lib/integrations/sms-message-alerts.ts`** - SMS fallback messaging
4. **`/src/lib/integrations/push-notification-service.ts`** - Real-time push notifications
5. **`/src/app/api/webhooks/thread-events/route.ts`** - External system webhooks

### 🔗 Integration Requirements:
- **Email Notifications**: Send thread summaries and new message alerts via Resend
- **SMS Fallbacks**: Critical messages sent via SMS when email fails or for urgent threads
- **Push Notifications**: Real-time browser and mobile app push notifications
- **Slack Integration**: Forward wedding threads to team Slack channels
- **Webhook System**: Notify external CRMs and planning tools of conversation updates

Your integrations ensure no wedding message is ever missed across all communication channels.

## ✅ Acceptance Criteria Checklist

- [ ] **Email Integration** sends beautiful thread digest emails with Resend
- [ ] **SMS Fallback** delivers urgent messages via Twilio when needed
- [ ] **Push Notifications** provide instant alerts for new thread messages  
- [ ] **Slack Integration** forwards thread updates to wedding team channels
- [ ] **Webhook System** notifies external systems of conversation events
- [ ] **Multi-channel Routing** intelligently chooses best delivery method per user
- [ ] **Delivery Tracking** confirms message receipt across all channels
- [ ] **Retry Logic** handles temporary service outages gracefully
- [ ] **Preference Management** respects user notification channel preferences
- [ ] **Error Handling** provides fallback channels when primary delivery fails

Your integrations create a bulletproof communication network for wedding coordination.

**Remember**: A missed message on wedding day could mean disaster. Build redundancy like a wedding photographer with backup cameras! 📧💍