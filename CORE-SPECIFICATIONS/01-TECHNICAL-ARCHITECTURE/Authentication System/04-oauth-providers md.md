# 04-oauth-providers.md

## Overview

Implement OAuth authentication for seamless signup/login using existing accounts. Priority on Google and Apple for trust and conversion.

## Provider Configuration

### Google OAuth

- **Priority**: Highest - most wedding vendors use Google Workspace
- **Setup**: Configure in Supabase Dashboard > Authentication > Providers
- **Required Scopes**: email, profile, calendar.readonly (for future calendar sync)
- **Client ID/Secret**: Store in environment variables
- **Redirect URLs**: Configure for [localhost](http://localhost) (dev) and production domain

### Apple Sign-In

- **Priority**: High for iOS users
- **Requirements**: Apple Developer account, configure Services ID
- **Implementation**: Use Supabase's built-in Apple provider
- **Special Considerations**: Handle email relay service, name only provided on first auth

### Facebook (Optional - Phase 2)

- **Use Case**: Social proof and easy sharing to wedding groups
- **Scopes**: email, public_profile

## Implementation Notes

### User Type Detection

```
// Determine if supplier or couple based on:
// 1. Invitation source (supplier invite = couple)
// 2. Landing page ([wedsync.com](http://wedsync.com) vs [wedme.app](http://wedme.app))
// 3. Post-auth questionnaire if unclear
```

### Account Linking

- Allow linking multiple OAuth providers to same account
- Handle email conflicts gracefully
- Merge accounts if user signs up twice

## Security Considerations

- Validate email ownership
- Check for business email domains for suppliers
- Implement rate limiting on OAuth callbacks
- Log all authentication events for audit