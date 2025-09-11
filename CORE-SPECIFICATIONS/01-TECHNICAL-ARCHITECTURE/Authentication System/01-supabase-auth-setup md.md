# 01-supabase-auth-setup.md

````markdown
# Supabase Auth Setup

## Configuration

### Auth Providers
```typescript
// Primary: Email/Password
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password',
  options: {
    data: {
      user_type: 'supplier', // or 'couple'
      business_name: 'Photography Studio'
    }
  }
});

// OAuth Providers (configured in Supabase dashboard)
- Google (primary OAuth)
- Apple (iOS users)
- Magic Links (passwordless)`

### User Metadata Structure

typescript

`interface AuthMetadata {
  user_type: 'supplier' | 'couple';
  supplier_id?: string;
  couple_id?: string;
  onboarding_step?: number;
  invited_by?: string; *// For viral tracking*
}`

## Session Management

typescript

`*// Auto-refresh tokens*
const { data: { session } } = await supabase.auth.getSession();

*// Listen for auth changes*
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    *// Route to appropriate dashboard*
    const userType = session?.user?.user_metadata?.user_type;
    router.push(userType === 'supplier' ? '/dashboard' : '/wedme');
  }
});`

## Critical Implementation

- Separate auth flows for suppliers vs couples
- Email verification required for suppliers
- Social login optional but encouraged
- Session timeout: 1 week (extend on activity)
- MFA optional for enterprise tier