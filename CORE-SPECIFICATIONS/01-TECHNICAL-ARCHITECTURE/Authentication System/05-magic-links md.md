# 05-magic-links.md

## Overview

Passwordless authentication via email links for quick access and reduced friction. Essential for wedding couples who may only use the platform occasionally.

## Implementation Strategy

### When to Use Magic Links

- **Couples**: Primary auth method (they use platform infrequently)
- **Suppliers**: Secondary option for password recovery
- **Invitations**: Auto-login when accepting collaboration invite

### Supabase Configuration

```
// Enable in supabase auth settings
const { data, error } = await supabase.auth.signInWithOtp({
  email: userEmail,
  options: {
    emailRedirectTo: window.location.origin + '/auth/callback',
    data: { 
      user_type: 'couple', // or 'supplier'
      invitation_id: inviteId // if coming from invitation
    }
  }
})
```

## Email Template Customization

- **Subject Line**: "Your secure login link for WedSync"
- **Branding**: Include supplier's logo if invitation-based
- **Expiry**: 15 minutes for security
- **Deep Linking**: Direct to specific form/dashboard section

## Security Measures

- Single-use tokens only
- IP verification for sensitive actions
- Rate limiting: Max 3 requests per email per hour
- Domain validation to prevent phishing

## UX Optimizations

- Show email sent confirmation immediately
- Provide "Resend" option after 30 seconds
- Check spam folder reminder
- Alternative login methods visible

## Mobile Considerations

- Deep link handling for native app (future)
- Copy link option for different device login
- QR code generation for desktop-to-mobile