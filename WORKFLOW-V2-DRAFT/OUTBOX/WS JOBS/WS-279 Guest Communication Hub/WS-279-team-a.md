# TEAM A - ROUND 1: WS-279 - Guest Communication Hub
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build comprehensive frontend UI for centralized guest communication and RSVP management
**FEATURE ID:** WS-279 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about guest experience and efficient communication workflows

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/guests/communication/
cat $WS_ROOT/wedsync/src/components/guests/communication/GuestCommunicationHub.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test guest-communication
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query guest management and communication patterns
await mcp__serena__search_for_pattern("guest communication rsvp message template email");
await mcp__serena__find_symbol("GuestManager CommunicationService RSVPManager", "", true);
await mcp__serena__get_symbols_overview("src/components/guests/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to guest communication
# Use Ref MCP to search for:
# - "React communication dashboard patterns"
# - "RSVP management UI components"
# - "Guest list management interfaces"
# - "Message template editor components"
# - "Bulk communication UI patterns"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR GUEST COMMUNICATION SYSTEM

### Use Sequential Thinking MCP for Communication Hub Design
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Guest communication hub needs: Centralized guest list management with communication history, RSVP tracking with visual indicators, bulk messaging with personalization options, message template library for common communications, automated follow-up sequences, real-time delivery status tracking, guest segmentation for targeted messaging.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "UI complexity analysis: Multi-channel communication interface (email, SMS, in-app), advanced guest filtering and segmentation, visual RSVP status dashboard, message composition with templates, delivery analytics and engagement metrics, mobile-responsive communication tools, accessibility for diverse user abilities.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding communication scenarios: Save-the-date campaigns with timing automation, RSVP reminder sequences with escalation, dietary requirement collection with follow-ups, day-of-wedding logistics communication, post-wedding thank you message coordination, vendor coordination through guest hub integration.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Build modular communication components with consistent design, implement real-time updates for delivery status, create intuitive guest segmentation interface, design template system with personalization, add mobile-optimized communication tools, ensure accessibility compliance throughout.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

1. **task-tracker-coordinator** - Track guest communication UI development and RSVP workflows
2. **react-ui-specialist** - Build communication dashboard components with Untitled UI
3. **ux-accessibility-specialist** - Ensure guest communication tools are accessible to all users
4. **code-quality-guardian** - Maintain consistent UI patterns and performance
5. **test-automation-architect** - Guest communication testing and RSVP simulation
6. **documentation-chronicler** - Guest communication system documentation and user guides

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY)

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Desktop navigation link in guest management section
- [ ] Mobile navigation support for communication hub
- [ ] Navigation states (active/current) implemented
- [ ] Breadcrumbs for guest communication workflows
- [ ] Quick access communication tools in main dashboard

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**Core UI Components to Build:**

1. **GuestCommunicationHub** - Main communication dashboard with overview
2. **GuestListManager** - Enhanced guest list with communication history
3. **MessageComposer** - Multi-channel message creation and editing
4. **RSVPTracker** - Visual RSVP status dashboard with analytics
5. **CommunicationTemplates** - Template library with personalization
6. **BulkMessagingInterface** - Bulk communication with segmentation

### Key Features:
- Unified guest communication dashboard with real-time updates
- Advanced guest filtering and segmentation tools
- Multi-channel message composition (email, SMS, push)
- RSVP tracking with visual status indicators
- Communication template system with personalization
- Delivery analytics and engagement metrics

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] Core guest communication dashboard components built with Untitled UI
- [ ] Guest list management interface with communication history
- [ ] Message composition tools for multi-channel communication
- [ ] RSVP tracking dashboard with visual status indicators
- [ ] Communication template system with personalization
- [ ] Bulk messaging interface with guest segmentation
- [ ] Navigation integration complete
- [ ] Real-time communication status updates
- [ ] Mobile-responsive communication tools
- [ ] Evidence package with communication hub screenshots

## 🎨 UI COMPONENT ARCHITECTURE

### Guest Communication Dashboard:
```typescript
const GuestCommunicationHub = () => {
  const { guests, communications, rsvpStats } = useGuestCommunications();
  const { isLoading } = useGuestData();
  
  return (
    <div className="space-y-6">
      {/* Communication Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Guests"
          value={guests.length}
          icon={Users}
          trend={"+12 this week"}
        />
        <MetricCard
          title="RSVP Rate"
          value={`${rsvpStats.responseRate}%`}
          icon={CheckCircle}
          trend={`${rsvpStats.recentResponses} recent`}
        />
        <MetricCard
          title="Messages Sent"
          value={communications.sent}
          icon={Mail}
          trend={"Last 7 days"}
        />
        <MetricCard
          title="Delivery Rate"
          value={`${communications.deliveryRate}%`}
          icon={TrendingUp}
          trend={"Real-time"}
        />
      </div>
      
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Button 
          onClick={() => openMessageComposer()}
          icon={Edit}
          variant="primary"
        >
          Send Message
        </Button>
        <Button 
          onClick={() => openRSVPFollowup()}
          icon={Clock}
          variant="secondary"
        >
          RSVP Follow-up
        </Button>
        <Button 
          onClick={() => exportGuestData()}
          icon={Download}
          variant="outline"
        >
          Export Data
        </Button>
      </div>
      
      {/* Communication Timeline */}
      <CommunicationTimeline 
        communications={communications.recent}
        onResend={handleResendMessage}
        onViewDetails={openCommunicationDetails}
      />
    </div>
  );
};
```

### Message Composer Interface:
```typescript
const MessageComposer = ({ onSend, onCancel }: MessageComposerProps) => {
  const [message, setMessage] = useState<MessageDraft>({});
  const [selectedGuests, setSelectedGuests] = useState<Guest[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Channel Selection */}
      <div className="flex space-x-4">
        <ChannelToggle
          channel="email"
          selected={message.channels?.includes('email')}
          onChange={(selected) => toggleChannel('email', selected)}
          icon={Mail}
          label="Email"
        />
        <ChannelToggle
          channel="sms"
          selected={message.channels?.includes('sms')}
          onChange={(selected) => toggleChannel('sms', selected)}
          icon={MessageSquare}
          label="SMS"
        />
        <ChannelToggle
          channel="app"
          selected={message.channels?.includes('app')}
          onChange={(selected) => toggleChannel('app', selected)}
          icon={Bell}
          label="App Push"
        />
      </div>
      
      {/* Guest Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Recipients</CardTitle>
          <CardDescription>
            Select guests or use filters to target specific groups
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GuestSelector
            guests={selectedGuests}
            onChange={setSelectedGuests}
            filters={guestFilters}
            showSegmentation={true}
          />
        </CardContent>
      </Card>
      
      {/* Message Content */}
      <Card>
        <CardHeader>
          <CardTitle>Message Content</CardTitle>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(true)}
            >
              Use Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPersonalization(true)}
            >
              Add Personalization
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              placeholder="Subject line"
              value={message.subject}
              onChange={(e) => updateMessage('subject', e.target.value)}
            />
            <RichTextEditor
              value={message.body}
              onChange={(content) => updateMessage('body', content)}
              placeholder="Write your message..."
              toolbar={['bold', 'italic', 'link', 'personalization']}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Preview and Send */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            onClick={() => openPreview()}
          >
            Preview
          </Button>
          <Button
            onClick={() => onSend(message, selectedGuests)}
            disabled={!isMessageValid}
          >
            Send Message
          </Button>
        </div>
      </div>
    </div>
  );
};
```

### RSVP Tracking Dashboard:
```typescript
const RSVPTracker = () => {
  const { rsvpData, updateRSVP } = useRSVPTracking();
  const { sendFollowup } = useCommunications();
  
  return (
    <div className="space-y-6">
      {/* RSVP Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RSVPStatusCard
          title="Confirmed"
          count={rsvpData.confirmed.length}
          percentage={rsvpData.confirmedPercentage}
          color="green"
          guests={rsvpData.confirmed}
        />
        <RSVPStatusCard
          title="Declined"
          count={rsvpData.declined.length}
          percentage={rsvpData.declinedPercentage}
          color="red"
          guests={rsvpData.declined}
        />
        <RSVPStatusCard
          title="Pending"
          count={rsvpData.pending.length}
          percentage={rsvpData.pendingPercentage}
          color="yellow"
          guests={rsvpData.pending}
          action={
            <Button
              size="sm"
              onClick={() => sendFollowup(rsvpData.pending)}
            >
              Send Reminder
            </Button>
          }
        />
      </div>
      
      {/* Detailed RSVP List */}
      <Card>
        <CardHeader>
          <CardTitle>Guest RSVP Details</CardTitle>
          <div className="flex space-x-2">
            <RSVPFilter
              filters={rsvpFilters}
              onChange={setRSVPFilters}
            />
            <Button
              variant="outline"
              onClick={() => exportRSVPData()}
            >
              Export List
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <RSVPTable
            guests={filteredGuests}
            onUpdateRSVP={updateRSVP}
            onSendReminder={sendIndividualReminder}
            showCommunicationHistory={true}
          />
        </CardContent>
      </Card>
    </div>
  );
};
```

## 💾 WHERE TO SAVE YOUR WORK
- Components: $WS_ROOT/wedsync/src/components/guests/communication/
- Types: $WS_ROOT/wedsync/src/types/guest-communication.ts
- Hooks: $WS_ROOT/wedsync/src/hooks/useGuestCommunications.ts
- Tests: $WS_ROOT/wedsync/__tests__/components/guests/communication/
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/

## 🏁 COMPLETION CHECKLIST
- [ ] Files created and verified to exist
- [ ] TypeScript compilation successful
- [ ] All UI tests passing with Playwright
- [ ] Guest communication components working
- [ ] RSVP tracking dashboard functional
- [ ] Message composer interface operational
- [ ] Navigation integration complete
- [ ] Mobile communication interface optimized
- [ ] Evidence package prepared with screenshots
- [ ] Senior dev review prompt created

---

**EXECUTE IMMEDIATELY - Build the communication hub that keeps wedding coordination seamless!**