# Calendar Integration User Guide
*WedSync Calendar Integration - Comprehensive User Documentation*

## 📋 Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Connecting Your Calendar](#connecting-your-calendar)
4. [Wedding Timeline Sync](#wedding-timeline-sync)
5. [Managing Calendar Events](#managing-calendar-events)
6. [Mobile Integration](#mobile-integration)
7. [Troubleshooting](#troubleshooting)
8. [Security & Privacy](#security--privacy)
9. [FAQs](#frequently-asked-questions)

## Overview

WedSync Calendar Integration seamlessly connects your professional calendar with your wedding vendor workflow, ensuring you never miss a ceremony, consultation, or important wedding milestone.

### ✨ Key Benefits
- **Automatic Sync**: Wedding timelines automatically appear in your Google Calendar, Outlook, or Apple Calendar
- **Real-Time Updates**: Timeline changes sync instantly across all your devices
- **Conflict Prevention**: Automatically detect scheduling conflicts between weddings
- **Client Coordination**: Share timeline updates with couples and other vendors instantly
- **Mobile Access**: Access your wedding schedule anywhere via the WedMe app

### 🎯 Perfect For
- **Wedding Photographers**: Never miss a ceremony or reception moment
- **Venue Coordinators**: Keep track of multiple weddings per day
- **Caterers**: Coordinate meal timing with ceremony schedules
- **Florists**: Plan delivery around setup times
- **Wedding Planners**: Orchestrate entire wedding day timelines

---

## Getting Started

### Prerequisites
Before connecting your calendar, ensure you have:
- ✅ Active WedSync vendor account (Starter plan or higher)
- ✅ Google Calendar, Outlook 365, or Apple iCloud account
- ✅ Smartphone for mobile access (optional but recommended)

### Supported Calendar Providers
| Provider | Features | Sync Direction |
|----------|----------|----------------|
| **Google Calendar** | Full integration, webhooks, shared calendars | Bidirectional |
| **Outlook 365** | Full integration, teams integration | Bidirectional |
| **Apple iCloud** | Event sync, iOS integration | Push from WedSync |

---

## Connecting Your Calendar

### Step 1: Access Calendar Settings
1. Log into your WedSync dashboard
2. Navigate to **Settings** → **Calendar Integration**
3. Click **"Connect New Calendar"**

![Calendar Settings Screenshot](./screenshots/calendar-settings.png)

### Step 2: Choose Your Provider

#### For Google Calendar:
1. Click **"Connect Google Calendar"**
2. You'll be redirected to Google's authorization page
3. **Grant permissions:**
   - ✅ **Read calendar events** (to check for conflicts)
   - ✅ **Create calendar events** (to add wedding events)
   - ✅ **Update calendar events** (to sync timeline changes)
   - ✅ **Receive notifications** (for real-time updates)

#### For Outlook/Office 365:
1. Click **"Connect Outlook Calendar"**
2. Sign in with your Office 365 account
3. **Grant permissions:**
   - ✅ **Access your calendars**
   - ✅ **Read and write calendar events**
   - ✅ **Receive change notifications**

#### For Apple iCloud:
1. Click **"Connect Apple Calendar"**
2. Enter your Apple ID credentials
3. **Enable two-factor authentication** if prompted
4. Grant calendar access permissions

### Step 3: Configure Sync Settings

Once connected, configure your sync preferences:

#### **Auto-Sync Options:**
- **Immediate Sync**: Changes sync within 30 seconds (recommended)
- **Hourly Sync**: Changes sync every hour (battery-saving)
- **Manual Only**: Sync only when you click "Sync Now"

#### **Sync Direction:**
- **Push Only**: WedSync → Your Calendar (recommended for most vendors)
- **Bidirectional**: Changes sync both ways (advanced users)

#### **Event Categories:**
Choose which events to sync:
- ✅ **Wedding Ceremonies** (essential)
- ✅ **Consultations** (recommended)
- ✅ **Setup/Preparation Times** (recommended for photographers/coordinators)
- ✅ **Travel Time** (adds buffer time automatically)
- ⚪ **Administrative Tasks** (optional)

### Step 4: Test Your Connection
1. Click **"Test Sync"** button
2. WedSync will create a test event in your calendar
3. Verify the event appears correctly
4. Delete the test event once confirmed

![Connection Success](./screenshots/connection-success.png)

---

## Wedding Timeline Sync

### Creating a Wedding Timeline

#### Basic Wedding Timeline Setup:
1. Navigate to **Weddings** → **[Select Wedding]** → **Timeline**
2. Click **"Create Timeline"**
3. Fill in basic wedding details:
   - **Wedding Date**: June 15, 2024
   - **Venue**: Grand Hotel Ballroom
   - **Start Time**: 2:00 PM
   - **End Time**: 11:00 PM

#### Adding Timeline Events:
Click **"Add Event"** for each wedding moment:

**Example Photography Timeline:**
```
10:00 AM - Getting Ready Photos (2 hours)
12:30 PM - First Look Session (30 minutes)
1:00 PM - Bridal Party Photos (1 hour)
2:00 PM - Ceremony Coverage (1 hour)
3:00 PM - Family Photos (45 minutes)
4:00 PM - Cocktail Hour (1 hour)
6:00 PM - Reception Entrance (30 minutes)
6:30 PM - Dinner Coverage (1.5 hours)
8:00 PM - Speeches & Toasts (45 minutes)
9:00 PM - Dancing & Party Photos (2 hours)
```

### Automatic Calendar Sync

Once your timeline is created:

1. **Enable Calendar Sync**: Toggle "Sync to Calendar" ON
2. **Choose Sync Provider**: Select your connected calendar
3. **Set Notifications**: 
   - 1 hour before event (recommended)
   - 15 minutes before event (for ceremony/critical moments)
4. **Add Location Details**: Include venue address for GPS navigation

### Advanced Timeline Features

#### **Conflict Detection:**
WedSync automatically detects scheduling conflicts:
- 🔴 **Hard Conflict**: Overlapping wedding ceremonies (will block sync)
- 🟡 **Soft Conflict**: Tight scheduling between events (warning shown)
- 🟢 **No Conflict**: Schedule looks good!

#### **Travel Time Calculation:**
- Enable **"Auto-calculate travel time"**
- WedSync adds buffer time between venues
- Uses real-time traffic data for accurate estimates

#### **Weather Integration:**
- Outdoor wedding alerts for rain/weather changes
- Automatic backup indoor timeline suggestions

---

## Managing Calendar Events

### Event Details and Customization

Each synced calendar event includes:

#### **Basic Information:**
- **Title**: "Johnson Wedding - Ceremony Photography"
- **Date/Time**: June 15, 2024, 2:00 PM - 3:00 PM
- **Location**: Grand Hotel, 123 Wedding Lane, City
- **Description**: Wedding photography for Emma & James Johnson

#### **WedSync-Specific Details:**
- **Client Contact**: emma.johnson@example.com
- **Vendor Type**: Photography
- **Package Details**: Premium wedding package
- **Special Instructions**: "Bride prefers candid shots during ceremony"

### Updating Timeline Events

#### **From WedSync Dashboard:**
1. Go to **Weddings** → **Timeline**
2. Click on any event to edit
3. Changes automatically sync to your calendar within 30 seconds

#### **From Your Calendar:**
- **Time Changes**: Update start/end times directly in your calendar
- **Notes**: Add vendor-specific notes (syncs back to WedSync)
- **Status Updates**: Mark events as "Completed" or "Running Late"

### Sharing Timelines

#### **With Wedding Couples:**
1. Select **"Share Timeline"**
2. Enter couple's email addresses
3. They receive timeline in their WedMe app
4. Real-time updates keep everyone coordinated

#### **With Other Vendors:**
1. Click **"Invite Vendors"**
2. Add photographer, caterer, florist, etc.
3. Each vendor sees only relevant timeline events
4. Coordinated setup and breakdown times

---

## Mobile Integration

### WedMe Mobile App

The **WedMe mobile app** provides wedding timeline access for couples and vendors on-the-go.

#### **For Wedding Vendors:**
- 📱 **Real-time timeline access** on your phone
- 📸 **Photo upload** with automatic timeline tagging
- 🚗 **GPS navigation** to venues
- 📞 **Quick contact** for clients and other vendors
- ⏰ **Push notifications** for timeline changes

#### **For Wedding Couples:**
- 👰 **Complete wedding timeline** in their pocket
- 📋 **Real-time updates** from all vendors
- 📷 **Photo sharing** with timeline moments
- 🎵 **Music cue coordination** with DJ/band
- 💬 **Direct messaging** with vendor team

### Mobile Features

#### **Offline Access:**
- Timeline cached for offline viewing
- Critical events stored locally
- Auto-sync when connection restored

#### **Location Services:**
- **Venue navigation** with turn-by-turn directions
- **Arrival notifications** sent to clients
- **Travel time tracking** for accurate ETAs

#### **Quick Actions:**
- **"Running Late"** notifications
- **Event completion** check-offs
- **Emergency contacts** one-tap calling

---

## Troubleshooting

### Common Issues and Solutions

#### **🔧 Calendar Not Syncing**

**Symptoms:**
- Events not appearing in calendar after 5 minutes
- Timeline changes not reflecting
- Sync status shows "Error"

**Solutions:**
1. **Check Internet Connection**: Ensure stable WiFi/data
2. **Verify Calendar Permissions**: 
   - Go to calendar provider settings
   - Confirm WedSync has full calendar access
3. **Manual Sync**: Click "Sync Now" button in WedSync
4. **Reconnect Calendar**: Disconnect and reconnect your calendar

#### **🔧 Duplicate Events**

**Symptoms:**
- Same wedding event appears multiple times
- Timeline events duplicated in calendar

**Solutions:**
1. **Clear Duplicate Events**: Go to Settings → Calendar → "Remove Duplicates"
2. **Disable Multiple Sync Sources**: Ensure only one sync method is active
3. **Reset Calendar Sync**: Disconnect calendar, wait 5 minutes, reconnect

#### **🔧 OAuth Connection Failed**

**Symptoms:**
- "Authorization failed" error message
- Redirect loop during calendar connection
- "Access denied" errors

**Solutions:**
1. **Clear Browser Cache**: Clear cookies and cache, try again
2. **Disable Ad Blockers**: Temporarily disable browser extensions
3. **Use Different Browser**: Try Chrome, Safari, or Firefox
4. **Check Firewall Settings**: Ensure OAuth redirects aren't blocked

#### **🔧 Mobile App Sync Issues**

**Symptoms:**
- Timeline not updating on phone
- Photos not uploading to timeline
- Push notifications not working

**Solutions:**
1. **Update WedMe App**: Ensure latest version installed
2. **Enable Notifications**: Check phone notification settings
3. **Background App Refresh**: Enable for WedMe app
4. **Force Close and Restart**: Close app completely, restart

### Getting Help

#### **In-App Support:**
- 💬 **Live Chat**: Click chat bubble in bottom-right corner
- 📧 **Support Ticket**: Settings → Help → Submit Ticket
- 📱 **Phone Support**: Professional/Scale plans include phone support

#### **Help Resources:**
- 📚 **Knowledge Base**: wedsync.com/help
- 🎥 **Video Tutorials**: Available in dashboard Help section
- 👥 **Community Forum**: Connect with other wedding vendors

#### **Emergency Support:**
For wedding day emergencies:
- 📞 **Emergency Hotline**: 1-800-WEDSYNC (24/7 during wedding season)
- 🚨 **Priority Support**: Instant escalation for active weddings

---

## Security & Privacy

### Data Protection

WedSync takes wedding vendor and client privacy seriously:

#### **Calendar Token Security:**
- 🔐 **Encrypted Storage**: All calendar access tokens encrypted at rest
- 🔄 **Auto Token Refresh**: Tokens refreshed automatically before expiration
- 🚫 **No Data Mining**: We never read your personal calendar events
- 🗑️ **Easy Revocation**: Disconnect calendar anytime in settings

#### **Wedding Data Privacy:**
- 🏠 **Client Information**: Wedding details stored securely
- 👥 **Vendor-Only Access**: Only relevant vendors see timeline details
- 📧 **Email Protection**: Client emails never shared between vendors
- 🔒 **GDPR Compliant**: Full data deletion available on request

### Calendar Permissions

WedSync requests minimal necessary permissions:

#### **Google Calendar Permissions:**
- ✅ **calendar.events** - Create and update wedding events
- ✅ **calendar.readonly** - Check for scheduling conflicts
- ❌ **contacts.readonly** - WE DO NOT request contact access
- ❌ **gmail.readonly** - WE DO NOT access your email

#### **Outlook Permissions:**
- ✅ **Calendars.ReadWrite** - Manage wedding calendar events
- ✅ **Calendars.Read** - Conflict detection
- ❌ **Mail.Read** - WE DO NOT access your email
- ❌ **Contacts.Read** - WE DO NOT access your contacts

### Revoking Access

To disconnect calendar integration:

1. **In WedSync Dashboard:**
   - Settings → Calendar Integration
   - Click **"Disconnect [Provider]"**
   - Confirm disconnection

2. **In Calendar Provider:**
   - **Google**: myaccount.google.com → Security → Third-party apps
   - **Outlook**: account.microsoft.com → Security → App permissions
   - **Apple**: appleid.apple.com → Security → Apps using Apple ID

---

## Frequently Asked Questions

### General Questions

**Q: Does calendar integration work with free WedSync accounts?**
A: Calendar integration requires a paid subscription (Starter plan or higher). Free accounts include basic timeline features only.

**Q: How many calendars can I connect?**
A: You can connect one calendar per provider (Google, Outlook, Apple). Professional plans support multiple calendars per provider.

**Q: Can I sync to multiple calendars simultaneously?**
A: Yes! Professional+ plans can sync the same wedding timeline to multiple calendar accounts.

### Technical Questions

**Q: What happens if I change calendar providers?**
A: Your wedding timelines remain in WedSync. Simply connect your new calendar provider and existing events will sync over.

**Q: Do timeline changes sync instantly?**
A: Changes typically sync within 30 seconds. During peak hours (wedding season), it may take up to 2 minutes.

**Q: Can I sync past wedding events?**
A: Yes, you can sync historical timelines for portfolio or reference purposes. They'll appear in your calendar with "Completed" status.

### Wedding Day Questions

**Q: What if my phone dies during a wedding?**
A: Timeline events are synced to your calendar and available on any device. Use a backup phone, tablet, or ask other vendors for timeline access.

**Q: How do I handle last-minute timeline changes?**
A: Update the timeline in WedSync or directly in your calendar. Changes sync automatically. Other vendors and the couple receive push notifications.

**Q: What if the venue WiFi is poor?**
A: The WedMe mobile app works offline. Timeline changes are queued and sync when connection is restored. Critical events are cached locally.

### Billing & Subscription Questions

**Q: Can I cancel calendar integration anytime?**
A: Yes, you can disconnect calendars anytime. Your WedSync data remains intact, but calendar sync stops immediately.

**Q: What happens if I downgrade my plan?**
A: Calendar integration is disabled on free plans. Existing calendar events remain, but no new syncing occurs until you upgrade.

---

## Support & Resources

### 📞 Contact Information
- **General Support**: support@wedsync.com
- **Technical Issues**: tech@wedsync.com
- **Wedding Day Emergency**: Call 1-800-WEDSYNC (24/7)

### 🔗 Helpful Links
- **WedSync Dashboard**: [dashboard.wedsync.com](https://dashboard.wedsync.com)
- **WedMe Mobile App**: Download from [App Store](https://apps.apple.com/wedsync) or [Google Play](https://play.google.com/wedsync)
- **Video Tutorials**: [wedsync.com/tutorials](https://wedsync.com/tutorials)
- **Community Forum**: [community.wedsync.com](https://community.wedsync.com)

### 📚 Additional Resources
- **Wedding Timeline Templates**: Pre-built timelines for different vendor types
- **Best Practices Guide**: Tips for managing multiple weddings per day
- **Integration API Docs**: For custom calendar integrations
- **Vendor Success Stories**: Real examples from successful wedding vendors

---

*Last updated: September 8, 2025*
*Calendar Integration Version: 2.1*

**Need more help?** Contact our support team at support@wedsync.com or use the live chat in your dashboard.