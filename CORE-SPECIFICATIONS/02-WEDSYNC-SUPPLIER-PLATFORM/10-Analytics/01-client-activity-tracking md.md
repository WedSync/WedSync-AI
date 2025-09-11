# 01-client-activity-tracking.md

# Client Activity Tracking

## What to Build

Real-time activity tracking system recording all client interactions with supplier content.

## Technical Requirements

- Event streaming via Supabase Realtime
- Activity aggregation per session
- Privacy-compliant tracking
- 90-day retention

## Implementation

typescript

`*// Activity events table*
client_activities {
  id: uuid
  client_id: uuid
  supplier_id: uuid
  session_id: uuid
  event_type: text *// 'page_view','form_start','email_open'*
  event_target: text *// form_id, document_id, etc*
  event_data: jsonb *// Additional context*
  ip_address: inet *// Hashed for privacy*
  user_agent: text
  created_at: timestamp
}

*// Real-time tracking*
const trackActivity = (event) => {
  *// Debounce rapid events (scroll, typing)// Batch send every 5 seconds// Include session context// Handle offline queue*
}

*// Activity types to track:*
- Dashboard login
- Form interactions (start/abandon/complete)
- Document downloads
- Email opens/clicks
- Journey progression
- Meeting bookings`

## Critical Notes

- Session timeout after 30 minutes inactivity
- Aggregate data hourly for performance
- GDPR: anonymize after 90 days
- Track time-on-page for engagement