# 04-notification-preferences.md

# Notification Preferences

## What to Build

Granular notification control system with channel preferences and scheduling.

## Technical Requirements

- Multi-channel support (email, SMS, in-app)
- Notification categories with opt-in/out
- Quiet hours configuration
- Digest options

## Implementation

typescript

`*// Notification preferences*
notification_preferences {
  supplier_id: uuid
  category: text *// 'form_submission', 'payment', 'client_activity'*
  channel: enum('email','sms','push','in_app')
  enabled: boolean
  frequency: enum('instant','hourly','daily','weekly')
  quiet_hours: jsonb *// {start: "22:00", end: "08:00", timezone: "UTC"}*
}

*// Notification queue*
notification_queue {
  id: uuid
  recipient_id: uuid
  category: text
  channel: text
  subject: text
  content: text
  data: jsonb
  scheduled_at: timestamp
  sent_at: timestamp
  status: enum('pending','sent','failed')
}

*// Smart sending*
async function sendNotification(userId, category, data) {
  const prefs = await getPreferences(userId, category);
  
  for (const pref of prefs) {
    if (!pref.enabled) continue;
    
    *// Check quiet hours*
    if (isQuietHours(pref.quiet_hours)) {
      scheduleForLater(pref, data);
      continue;
    }
    
    *// Handle frequency*
    if (pref.frequency !== 'instant') {
      addToDigest(pref, data);
      continue;
    }
    
    await sendViaChannel(pref.channel, data);
  }
}`

## Critical Notes

- Default to sensible preferences on signup
- Unsubscribe link in all emails
- SMS requires explicit opt-in
- Track notification effectiveness