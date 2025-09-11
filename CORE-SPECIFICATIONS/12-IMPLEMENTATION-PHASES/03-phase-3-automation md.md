# 03-phase-3-automation.md

## What to Build

Advanced customer journey automation, multi-channel communications (SMS/WhatsApp), meeting scheduler, and automated review/referral systems.

## Week 9: Advanced Journey Builder

### Technical Requirements

```
interface AdvancedJourney {
  modules: [
    'email',
    'sms',
    'whatsapp',
    'form',
    'meeting',
    'wait',
    'condition',
    'split_test'
  ]
  triggers: {
    form_submission: boolean
    date_based: boolean
    tag_added: boolean
    custom_event: boolean
  }
  execution: {
    parallel_paths: true
    time_windows: boolean
    timezone_aware: true
  }
}
```

### Visual Journey Canvas

```
// Using React Flow for node-based UI
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls 
} from 'reactflow'

const JourneyCanvas = () => {
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  
  const nodeTypes = {
    email: EmailNode,
    sms: SMSNode,
    condition: ConditionNode,
    wait: WaitNode,
    split: SplitTestNode
  }
  
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onConnect={onConnect}
      fitView
    >
      <Background />
      <Controls />
    </ReactFlow>
  )
}
```

### Journey Execution Engine

```
// Background job processor
class JourneyExecutor {
  async processNode(execution: JourneyExecution, node: JourneyNode) {
    switch(node.type) {
      case 'email':
        await this.sendEmail(execution, node)
        break
      case 'sms':
        await this.sendSMS(execution, node)
        break
      case 'wait':
        await this.scheduleNextStep(execution, node)
        break
      case 'condition':
        const result = await this.evaluateCondition(execution, node)
        const nextNodeId = result ? node.truePath : node.falsePath
        await this.moveToNode(execution, nextNodeId)
        break
    }
  }
  
  async evaluateCondition(execution: JourneyExecution, node: ConditionNode) {
    const { field, operator, value } = node.config
    const clientData = await this.getClientData(execution.client_id)
    
    switch(operator) {
      case 'equals':
        return clientData[field] === value
      case 'contains':
        return clientData[field]?.includes(value)
      case 'greater_than':
        return clientData[field] > value
      default:
        return false
    }
  }
}
```

## Week 10: SMS/WhatsApp Integration

### Twilio Setup

```
// Twilio configuration
interface TwilioConfig {
  accountSid: string // User's Twilio account
  authToken: string // Encrypted storage
  phoneNumber: string // Their Twilio number
  whatsapp: {
    enabled: boolean
    number: string // WhatsApp Business number
  }
}

// SMS sending service
class SMSService {
  private client: Twilio
  
  constructor(config: TwilioConfig) {
    this.client = new Twilio(config.accountSid, config.authToken)
  }
  
  async sendSMS(to: string, body: string, metadata?: any) {
    try {
      const message = await this.client.messages.create({
        body: this.replaceMergeTags(body, metadata),
        from: this.config.phoneNumber,
        to: to
      })
      
      await this.logMessage(message.sid, 'sms', 'sent')
      return message
    } catch (error) {
      await this.logError(error)
      throw error
    }
  }
  
  async sendWhatsApp(to: string, body: string) {
    return this.client.messages.create({
      body: body,
      from: `whatsapp:${this.config.whatsapp.number}`,
      to: `whatsapp:${to}`
    })
  }
}
```

### Database Schema

```
CREATE TABLE sms_configurations (
  supplier_id UUID PRIMARY KEY REFERENCES suppliers(id),
  twilio_account_sid TEXT,
  twilio_auth_token TEXT, -- Encrypted
  twilio_phone_number TEXT,
  whatsapp_enabled BOOLEAN DEFAULT false,
  whatsapp_number TEXT,
  monthly_limit INTEGER DEFAULT 1000,
  current_usage INTEGER DEFAULT 0
);

CREATE TABLE message_logs (
  id UUID PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id),
  client_id UUID REFERENCES clients(id),
  channel TEXT, -- 'sms', 'whatsapp'
  message_sid TEXT,
  content TEXT,
  status TEXT, -- 'queued', 'sent', 'delivered', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Week 11: Meeting Scheduler

### Calendar Integration

```
// Google Calendar integration
class CalendarService {
  async getAvailability(supplierId: string, dateRange: DateRange) {
    const calendar = await this.getCalendarClient(supplierId)
    
    const events = await [calendar.events](http://calendar.events).list({
      calendarId: 'primary',
      timeMin: dateRange.start,
      timeMax: dateRange.end,
      singleEvents: true
    })
    
    return this.calculateFreeSlots([events.data](http://events.data).items, dateRange)
  }
  
  async bookMeeting(meeting: MeetingRequest) {
    const event = {
      summary: `${meeting.type} - ${meeting.clientName}`,
      description: meeting.notes,
      start: { dateTime: meeting.startTime },
      end: { dateTime: meeting.endTime },
      attendees: [
        { email: meeting.clientEmail }
      ],
      conferenceData: meeting.virtual ? {
        createRequest: { requestId: [meeting.id](http://meeting.id) }
      } : null
    }
    
    return [calendar.events](http://calendar.events).insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: meeting.virtual ? 1 : 0
    })
  }
}
```

### Meeting Booking Widget

```
const MeetingScheduler = ({ supplierId, meetingType }) => {
  const [availability, setAvailability] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Calendar view */}
      <div>
        <Calendar
          onChange={handleDateSelect}
          tileDisabled={({date}) => !hasAvailability(date)}
        />
      </div>
      
      {/* Time slots */}
      <div>
        <h3>Available Times</h3>
        <div className="grid grid-cols-2 gap-2">
          {[availability.map](http://availability.map)(slot => (
            <button
              key={[slot.id](http://slot.id)}
              onClick={() => setSelectedSlot(slot)}
              className={cn(
                'p-2 border rounded',
                selectedSlot?.id === [slot.id](http://slot.id) && 'bg-blue-500 text-white'
              )}
            >
              {formatTime(slot.start)}
            </button>
          ))}
        </div>
        
        {selectedSlot && (
          <BookingForm 
            slot={selectedSlot}
            onSubmit={handleBooking}
          />
        )}
      </div>
    </div>
  )
}
```

## Week 12: Review & Referral Automation

### Review Collection System

```
interface ReviewCampaign {
  trigger: {
    daysAfterWedding: number
    condition?: 'positive_experience' | 'any'
  }
  sequence: [
    { day: 0, channel: 'email', template: 'review_request' },
    { day: 7, channel: 'sms', template: 'review_reminder' },
    { day: 14, channel: 'email', template: 'final_review_request' }
  ]
  platforms: ['google', 'facebook', 'weddingwire']
}

// Review request handler
const sendReviewRequest = async (client: Client, platform: string) => {
  const reviewLinks = {
    google: `[https://g.page/r/${supplier.google_place_id}/review`](https://g.page/r/${supplier.google_place_id}/review`),
    facebook: `[https://facebook.com/${supplier.fb_page}/reviews`](https://facebook.com/${supplier.fb_page}/reviews`),
    weddingwire: supplier.weddingwire_url
  }
  
  const email = await renderTemplate('review_request', {
    couple_names: client.couple_names,
    review_link: reviewLinks[platform],
    personal_message: [supplier.review](http://supplier.review)_message
  })
  
  await sendEmail([client.email](http://client.email), email)
  await trackReviewRequest([client.id](http://client.id), platform)
}
```

### Referral Program Setup

```
CREATE TABLE referral_programs (
  id UUID PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id),
  name TEXT,
  referrer_reward JSONB, -- {type: 'credit', amount: 100}
  referee_reward JSONB,  -- {type: 'discount', percentage: 10}
  conditions JSONB,
  status TEXT DEFAULT 'active'
);

CREATE TABLE referrals (
  id UUID PRIMARY KEY,
  program_id UUID REFERENCES referral_programs(id),
  referrer_id UUID REFERENCES clients(id),
  referee_email TEXT,
  code TEXT UNIQUE,
  status TEXT, -- 'sent', 'clicked', 'signed_up', 'booked'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Referral Tracking

```
// Referral link generation
const generateReferralLink = (client: Client, program: ReferralProgram) => {
  const code = generateUniqueCode(6)
  
  await supabase.from('referrals').insert({
    program_id: [program.id](http://program.id),
    referrer_id: [client.id](http://client.id),
    code: code,
    status: 'created'
  })
  
  return `${[process.env.NEXT](http://process.env.NEXT)_PUBLIC_URL}/refer/${code}`
}

// Landing page for referrals
export default function ReferralLanding({ params }) {
  const { code } = params
  const referral = await getReferralByCode(code)
  
  useEffect(() => {
    // Track click
    updateReferralStatus(code, 'clicked')
  }, [])
  
  return (
    <div>
      <h1>You've been referred by {referral.referrer.couple_names}!</h1>
      <p>Sign up now and get {referral.program.referee_reward.percentage}% off</p>
      <SignupForm referralCode={code} />
    </div>
  )
}
```

## API Endpoints

```
const automationEndpoints = [
  // Journey
  'POST /api/journeys/:id/nodes',
  'PUT /api/journeys/:id/nodes/:nodeId',
  'POST /api/journeys/:id/execute',
  'GET /api/journeys/:id/analytics',
  
  // SMS/WhatsApp
  'POST /api/sms/configure',
  'POST /api/sms/send',
  'GET /api/sms/usage',
  
  // Meetings
  'GET /api/meetings/availability',
  'POST /api/meetings/book',
  'PUT /api/meetings/:id/reschedule',
  
  // Reviews & Referrals
  'POST /api/reviews/campaigns',
  'POST /api/reviews/request',
  'POST /api/referrals/programs',
  'GET /api/referrals/:code'
]
```

## Background Jobs

```
// Using Supabase Edge Functions or Vercel Cron
const backgroundJobs = [
  {
    name: 'process_journey_nodes',
    schedule: '*/5 * * * *', // Every 5 minutes
    handler: processJourneyNodes
  },
  {
    name: 'send_scheduled_messages',
    schedule: '*/1 * * * *', // Every minute
    handler: sendScheduledMessages
  },
  {
    name: 'check_review_triggers',
    schedule: '0 10 * * *', // Daily at 10 AM
    handler: checkReviewTriggers
  }
]
```

## Critical Implementation Notes

1. **SMS costs are pass-through** - User provides own Twilio
2. **Calendar sync is read-only first** - Write requires more permissions
3. **Journey execution must be idempotent** - Can retry safely
4. **Rate limit external APIs** - Especially Google/Twilio
5. **Track all automation metrics** - For ROI reporting

## Success Criteria

1. Complex journeys with 10+ nodes execute correctly
2. SMS delivery rate >95%
3. Meeting bookings sync to calendar
4. Review requests generate responses
5. Referral tracking works end-to-end
6. All automations respect timezone

## Performance Targets

- Journey node processing: <1 second
- SMS delivery: <5 seconds
- Calendar sync: <2 seconds
- Meeting availability calculation: <500ms