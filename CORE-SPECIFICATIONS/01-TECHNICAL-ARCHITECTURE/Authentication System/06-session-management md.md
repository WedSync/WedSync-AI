# 06-session-management.md

## Overview

Handle user sessions securely across both WedSync (suppliers) and WedMe (couples) platforms with appropriate timeout and refresh strategies.

## Session Configuration

### Duration Settings

- **Suppliers**: 7-day session (frequent users)
- **Couples**: 30-day session (infrequent access)
- **Admin**: 24-hour session with 2FA
- **Refresh Token**: 30 days for all users

### Supabase Session Handling

```
// Check and refresh session
const { data: { session } } = await supabase.auth.getSession()
if (session?.expires_at) {
  const expiresIn = session.expires_at - [Date.now](http://Date.now)()
  if (expiresIn < 3600) { // Refresh if less than 1 hour
    await supabase.auth.refreshSession()
  }
}
```

## Multi-Device Management

- Allow simultaneous sessions on 3 devices
- Show active sessions in security settings
- One-click "Sign out all devices" option
- Device fingerprinting for security alerts

## Session Security

- HttpOnly, Secure, SameSite cookies
- CSRF token validation
- Session invalidation on password change
- Anomaly detection (location/device changes)

## State Persistence

- Save form progress in localStorage
- Sync dashboard preferences to database
- Remember last viewed section
- Preserve filters and sort preferences

## Timeout Handling

- Warning modal at 5 minutes before expiry
- Auto-save any unsaved work
- Graceful re-authentication flow
- Preserve current page context after re-login