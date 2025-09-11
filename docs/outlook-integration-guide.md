# WedSync Outlook Calendar Integration Guide

**Complete Setup Guide for Wedding Professionals**

## 📋 Overview

WedSync's Outlook Calendar Integration allows wedding professionals to seamlessly synchronize their wedding bookings, client meetings, and venue coordination between Microsoft Outlook and WedSync. This guide provides step-by-step instructions for setup, troubleshooting, and best practices.

---

## 🚀 Quick Start

### Prerequisites
- Active WedSync Professional account or higher
- Microsoft Outlook with Exchange Online (Office 365)
- Administrative access to your organization's Microsoft 365 tenant (if applicable)

### Setup Time: ~10 minutes

---

## 📱 Step 1: Initial Setup

### 1.1 Access Calendar Integration Settings

1. **Log into WedSync**
   - Navigate to your WedSync dashboard
   - Click on **Settings** in the main navigation
   - Select **Integrations** from the left sidebar

2. **Locate Outlook Integration**
   - Find the "Outlook Calendar" card
   - Click **"Connect to Outlook"**

### 1.2 Microsoft OAuth Authentication

1. **OAuth Consent Screen**
   - You'll be redirected to Microsoft's secure login page
   - Enter your Microsoft credentials (the same ones you use for Outlook)
   - **Important**: Use your business Microsoft account, not personal

2. **Permission Authorization**
   - Review the permissions WedSync is requesting:
     - ✅ Read your calendars
     - ✅ Create and modify calendar events
     - ✅ Access your basic profile information
   - Click **"Accept"** to grant permissions

3. **Confirmation**
   - You'll be redirected back to WedSync
   - Look for the green ✅ "Connected to Outlook" status

---

## 📅 Step 2: Calendar Selection & Configuration

### 2.1 Choose Calendars to Sync

1. **Available Calendars**
   - WedSync will display all your Outlook calendars
   - Select which calendars to sync with WedSync:
     - **Recommended**: Create a dedicated "Wedding Bookings" calendar
     - **Optional**: Include "Client Meetings" or "Venue Visits" calendars

2. **Sync Direction Settings**
   - **Two-Way Sync** (Recommended): Changes in either system update both
   - **One-Way to WedSync**: Only pulls events from Outlook to WedSync
   - **One-Way to Outlook**: Only pushes WedSync events to Outlook

### 2.2 Event Categorization

Configure how events are categorized:

- **Wedding Events**: Ceremony, reception, full-day weddings
- **Client Meetings**: Consultations, planning sessions, final meetings
- **Venue Visits**: Site tours, setup meetings, rehearsals
- **Engagement Sessions**: Pre-wedding photography sessions
- **Administrative**: Editing, album design, delivery meetings

---

## ⚙️ Step 3: Advanced Configuration

### 3.1 Sync Settings

1. **Sync Frequency**
   - **Real-time** (Recommended): Instant sync via webhooks
   - **Every 15 minutes**: Good for most users
   - **Hourly**: For less active calendars
   - **Manual only**: Sync only when you click "Sync Now"

2. **Conflict Resolution**
   - **WedSync Priority**: WedSync data takes precedence in conflicts
   - **Outlook Priority**: Outlook data takes precedence
   - **Manual Resolution**: Prompt user to choose

3. **Time Zone Handling**
   - Ensure your WedSync profile timezone matches Outlook
   - Navigate to Profile → Settings → Timezone

### 3.2 Event Mapping Configuration

Configure how WedSync data maps to Outlook:

| WedSync Field | Outlook Field | Notes |
|---------------|---------------|-------|
| Wedding Title | Event Subject | Includes couple names |
| Venue | Location | Full address when available |
| Wedding Date/Time | Start/End Time | Includes setup time |
| Vendor Notes | Event Body | Private notes and details |
| Client Contact | Attendees | Couple's email addresses |
| Wedding Status | Categories | Confirmed, Tentative, Cancelled |

---

## 💡 Wedding Professional Workflows

### 4.1 Photographer Workflow

**Initial Consultation Setup:**
1. Create event in WedSync: "Johnson Wedding - Consultation"
2. Event automatically appears in Outlook calendar
3. Client receives calendar invitation from Outlook
4. Any schedule changes update both systems

**Wedding Day Coordination:**
1. WedSync creates detailed timeline with:
   - Getting ready shots (2 hours before)
   - Ceremony (30 minutes)
   - Cocktail hour (1 hour)
   - Reception (4 hours)
2. Each timeline item becomes separate Outlook event
3. Other vendors can see your availability

**Engagement Session Booking:**
1. Book session in WedSync
2. Set location as "Hyde Park - Engagement Session"
3. Outlook shows travel time automatically
4. Weather alerts integrated (premium feature)

### 4.2 Venue Coordinator Workflow

**Multi-Wedding Management:**
1. Main calendar shows all weddings for venue
2. Room-specific calendars for setup coordination:
   - Main Hall events
   - Garden Pavilion events
   - Bridal suite bookings
3. Vendor access control by event type

**Setup Coordination:**
1. Create vendor arrival timeline:
   - Florist: 8:00 AM (3 hours setup)
   - Catering: 10:00 AM (4 hours setup)
   - Photography: 2:00 PM (ceremony start)
   - DJ/Band: 5:00 PM (reception)
2. Each vendor sees only their tasks
3. Setup conflict detection

**Emergency Handling:**
1. Weather delays automatically adjust all timelines
2. Vendor notifications sent instantly
3. Client communication coordinated

### 4.3 Wedding Planner Workflow

**Client Wedding Timeline:**
1. Master timeline in WedSync
2. Vendor-specific views in Outlook
3. Timeline sharing with couples
4. Real-time updates during wedding day

**Multi-Client Management:**
1. Color-coded calendars by client
2. Wedding season overview
3. Vendor coordination across weddings
4. Resource allocation tracking

---

## 🔧 Troubleshooting Guide

### 5.1 Connection Issues

**Problem**: "Failed to connect to Outlook"
**Solutions**:
1. Check your Microsoft account credentials
2. Ensure you're using business account (not personal)
3. Verify Office 365 subscription is active
4. Try incognito/private browser mode
5. Contact IT administrator for organization permissions

**Problem**: "Calendar not appearing in WedSync"
**Solutions**:
1. Refresh the calendar list (Settings → Integrations → Refresh)
2. Check calendar permissions in Outlook
3. Ensure calendar is not hidden
4. Verify calendar is in Exchange Online (not local)

### 5.2 Sync Issues

**Problem**: "Events not syncing between systems"
**Solutions**:
1. Check sync status indicator (green = active)
2. Verify internet connection
3. Force manual sync (Settings → Integrations → Sync Now)
4. Check event time zones match
5. Review sync direction settings

**Problem**: "Duplicate events appearing"
**Solutions**:
1. Check for multiple WedSync integrations
2. Review calendar selection settings
3. Remove and re-add integration if necessary
4. Contact WedSync support for data cleanup

### 5.3 Permission Issues

**Problem**: "Access denied" errors
**Solutions**:
1. Verify OAuth permissions were granted
2. Check with IT administrator about app restrictions
3. Re-authorize integration (disconnect and reconnect)
4. Ensure Microsoft 365 tenant allows third-party apps

**Problem**: "Can't modify calendar events"
**Solutions**:
1. Check calendar permissions in Outlook
2. Verify you're the calendar owner
3. Ensure WedSync has write permissions
4. Review shared calendar restrictions

---

## 🔒 Security & Privacy

### 6.1 Data Protection

**What WedSync Accesses**:
- ✅ Calendar events and metadata
- ✅ Basic profile information (name, email)
- ✅ Calendar permissions and settings

**What WedSync Does NOT Access**:
- ❌ Your emails or inbox
- ❌ Other Office 365 applications
- ❌ Personal files or documents
- ❌ Password or authentication details

### 6.2 Data Storage & Encryption

- **Encryption**: All data encrypted at rest using AES-256
- **Transit**: TLS 1.3 encryption for all API communications
- **Tokens**: OAuth tokens encrypted and stored securely
- **Retention**: Data deleted within 30 days of account closure

### 6.3 Compliance

- **GDPR Compliant**: Full data portability and right to erasure
- **SOC 2 Type II**: Annual security audits
- **ISO 27001**: Information security management
- **Privacy Policy**: Transparent data handling practices

---

## 📊 Advanced Features

### 7.1 Wedding Season Analytics

**Booking Trends**:
- Peak season visualization
- Venue capacity planning
- Revenue forecasting
- Client communication patterns

**Performance Metrics**:
- Average booking lead time
- Consultation to booking conversion
- Seasonal demand patterns
- Vendor coordination efficiency

### 7.2 Automated Workflows

**Wedding Day Automation**:
1. Weather monitoring with automatic alerts
2. Vendor check-in confirmations
3. Timeline adjustments cascade to all participants
4. Emergency contact notifications

**Client Communication**:
1. Automatic reminder emails
2. Calendar invitation management
3. Schedule change notifications
4. Post-wedding follow-up scheduling

### 7.3 Multi-Location Management

**Venue Networks**:
- Central booking calendar
- Location-specific availability
- Staff scheduling coordination
- Resource allocation tracking

**Photographer Multi-Location**:
- Travel time calculation
- Equipment logistics
- Assistant coordination
- Client location history

---

## 🎯 Best Practices

### 8.1 Calendar Organization

**Naming Conventions**:
- Use consistent event naming: "[Couple Name] Wedding - [Event Type]"
- Include venue name for quick identification
- Add estimated guest count for planning
- Use status prefixes: "CONFIRMED:", "TENTATIVE:", "CANCELLED:"

**Example Event Names**:
- "CONFIRMED: Johnson Wedding - Full Day Photography (150 guests)"
- "TENTATIVE: Smith Engagement Session - Hyde Park"
- "Brown Wedding Consultation - Studio Meeting"

**Color Coding**:
- **Red**: Wedding day events
- **Blue**: Client consultations
- **Green**: Confirmed bookings
- **Yellow**: Tentative bookings
- **Orange**: Administrative tasks

### 8.2 Wedding Day Management

**Timeline Structure**:
1. **Pre-event** (Day before): Final preparations
2. **Getting Ready** (Morning): Preparation shots
3. **Ceremony** (Afternoon): Main event
4. **Reception** (Evening): Celebration
5. **Breakdown** (Late evening): Cleanup coordination

**Vendor Coordination**:
- Share relevant timeline segments only
- Use private notes for sensitive information
- Set up group notifications for delays
- Maintain backup contact methods

### 8.3 Client Communication

**Transparency Guidelines**:
- Share appropriate calendar details with clients
- Use private fields for business notes
- Set clear boundaries on calendar access
- Regular sync status communications

**Professional Presentation**:
- Use professional event descriptions
- Include contact information in events
- Maintain consistent formatting
- Regular calendar maintenance

---

## 📱 Mobile App Usage

### 9.1 WedSync Mobile App

**Outlook Integration Features**:
- Real-time sync status
- Emergency timeline updates
- One-tap vendor notifications
- Offline calendar access

**Wedding Day Tools**:
- Quick schedule adjustments
- Weather alerts
- Vendor check-ins
- Client communications

### 9.2 Outlook Mobile

**Enhanced Features**:
- WedSync event categories visible
- Deep links back to WedSync
- Integration with Teams for video calls
- Location services for travel time

---

## 🆘 Support & Resources

### 10.1 Getting Help

**WedSync Support**:
- Email: support@wedsync.com
- Chat: Available in app (Professional+ plans)
- Phone: +44 20 7946 0958 (UK business hours)
- Help Center: help.wedsync.com

**Microsoft Support**:
- Office 365 Admin Center
- Microsoft Support Portal
- Community Forums

### 10.2 Additional Resources

**Video Tutorials**:
- "Setting up Outlook Integration" (5 mins)
- "Managing Wedding Day Schedules" (8 mins)
- "Troubleshooting Common Issues" (6 mins)
- "Advanced Features Overview" (12 mins)

**Webinars**:
- Monthly "Ask the Experts" sessions
- Seasonal best practices
- New feature announcements
- Industry case studies

**Community**:
- WedSync Professional Facebook Group
- Wedding Industry Forums
- Local networking events
- Beta testing program

---

## 📈 Upgrading Your Integration

### 11.1 Plan Comparison

| Feature | Starter | Professional | Scale | Enterprise |
|---------|---------|--------------|--------|------------|
| Outlook Sync | ❌ | ✅ | ✅ | ✅ |
| Real-time Updates | ❌ | ✅ | ✅ | ✅ |
| Multi-Calendar | ❌ | 3 calendars | Unlimited | Unlimited |
| Advanced Analytics | ❌ | ❌ | ✅ | ✅ |
| Webhook Notifications | ❌ | ❌ | ✅ | ✅ |
| API Access | ❌ | ❌ | ❌ | ✅ |
| White-label | ❌ | ❌ | ❌ | ✅ |

### 11.2 Migration Assistance

**Upgrading Process**:
1. Current integration settings preserved
2. Additional features activated immediately
3. No service interruption during upgrade
4. Optional migration consultation call

---

## 🔄 Integration Updates & Maintenance

### 12.1 Regular Maintenance

**Weekly Tasks**:
- Review sync status
- Clean up completed events
- Update venue information
- Check for calendar conflicts

**Monthly Tasks**:
- Audit calendar permissions
- Review integration settings
- Update client contact information
- Backup critical calendar data

**Seasonal Tasks**:
- Prepare for peak wedding season
- Update venue capacity information
- Review and optimize workflows
- Plan for holiday scheduling

### 12.2 Feature Updates

WedSync regularly updates the Outlook integration with:
- Enhanced sync performance
- New automation features
- Improved mobile experience
- Additional security measures

**Stay Updated**:
- Enable automatic updates in settings
- Subscribe to feature announcement emails
- Follow @WedSync on social media
- Join the beta testing program

---

*This guide is regularly updated. Last revision: January 20, 2025*

**Need additional help?** Contact our wedding industry specialists at support@wedsync.com or book a personalized setup call at calendly.com/wedsync-setup.