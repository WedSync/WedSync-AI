# TEAM B - ROUND 1: WS-279 - Guest Communication Hub
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build robust backend API infrastructure for guest communication management and multi-channel messaging
**FEATURE ID:** WS-279 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about communication delivery reliability and guest data security

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/guests/communication/
cat $WS_ROOT/wedsync/src/app/api/guests/communication/messages/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test guest-communication-api
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**Core API Endpoints to Build:**

1. **POST /api/guests/communication/messages** - Send messages to guest segments
2. **GET /api/guests/communication/history** - Retrieve communication history
3. **POST /api/guests/communication/templates** - Create and manage message templates
4. **GET /api/guests/communication/analytics** - Communication delivery analytics
5. **POST /api/guests/rsvp/bulk-followup** - Automated RSVP follow-up sequences
6. **GET /api/guests/segmentation** - Advanced guest filtering and segmentation

### Key Backend Features:
- Multi-channel message dispatch (email, SMS, push notifications)
- Advanced guest segmentation and filtering
- Communication delivery tracking and analytics
- Message template system with personalization
- Automated RSVP follow-up workflows
- Comprehensive communication audit logging

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### REQUIRED SECURITY PATTERN:
```typescript
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { z } from 'zod';
import { secureStringSchema } from '$WS_ROOT/wedsync/src/lib/validation/schemas';

const guestMessageSchema = z.object({
  recipients: z.array(z.object({
    guestId: z.string().uuid(),
    channels: z.array(z.enum(['email', 'sms', 'push']))
  })).min(1),
  message: z.object({
    subject: secureStringSchema.max(200),
    body: secureStringSchema.max(5000),
    templateId: z.string().uuid().optional()
  }),
  sendAt: z.string().datetime().optional(),
  personalizations: z.record(secureStringSchema).optional()
});

export const POST = withSecureValidation(
  guestMessageSchema,
  async (request, validatedData) => {
    // Verify user owns the wedding
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate user has permission to message these guests
    const hasPermission = await GuestService.canMessageGuests(
      session.user.id, 
      validatedData.recipients.map(r => r.guestId)
    );
    
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Process message sending with audit logging
    const result = await CommunicationService.sendBulkMessage(
      validatedData,
      session.user.id
    );
    
    return NextResponse.json(result);
  }
);
```

## 📊 DATABASE SCHEMA REQUIREMENTS

### Communication Tables:
```sql
-- Guest communications log
CREATE TABLE guest_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id UUID REFERENCES weddings(id),
  sender_id UUID REFERENCES auth.users(id),
  message_id UUID NOT NULL, -- Unique message batch ID
  guest_id UUID REFERENCES guests(id),
  channel VARCHAR(20) NOT NULL, -- email, sms, push
  subject VARCHAR(500),
  body TEXT NOT NULL,
  template_id UUID REFERENCES communication_templates(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, failed, bounced
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX(wedding_id, created_at),
  INDEX(guest_id, status),
  INDEX(message_id)
);

-- Communication templates
CREATE TABLE communication_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id UUID REFERENCES weddings(id),
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL, -- save_the_date, rsvp_reminder, thank_you, etc.
  channels JSONB NOT NULL, -- ["email", "sms"]
  subject VARCHAR(500),
  body TEXT NOT NULL,
  personalization_fields JSONB, -- Available personalization variables
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Guest segments for targeting
CREATE TABLE guest_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id UUID REFERENCES weddings(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  filters JSONB NOT NULL, -- Complex filtering criteria
  guest_count INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RSVP tracking
CREATE TABLE rsvp_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id UUID REFERENCES guests(id) UNIQUE,
  response VARCHAR(20) NOT NULL, -- attending, not_attending, maybe, pending
  guest_count INTEGER DEFAULT 1,
  dietary_restrictions TEXT,
  special_requests TEXT,
  responded_at TIMESTAMP,
  response_method VARCHAR(20), -- website, email, phone, app
  follow_up_sent_count INTEGER DEFAULT 0,
  last_follow_up_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 💾 WHERE TO SAVE YOUR WORK
- API Routes: $WS_ROOT/wedsync/src/app/api/guests/communication/
- Services: $WS_ROOT/wedsync/src/lib/services/guest-communication/
- Types: $WS_ROOT/wedsync/src/types/guest-communication.ts
- Database: $WS_ROOT/wedsync/supabase/migrations/
- Tests: $WS_ROOT/wedsync/__tests__/api/guests/communication/
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/

---

**EXECUTE IMMEDIATELY - Build the communication backend that reliably reaches every guest!**