# 03-couple-auth-flow.md

`### 03-couple-auth-flow.md
```markdown
# Couple Authentication Flow

## Invitation-Driven Signup

### Entry Point: Supplier Invitation
```typescript
// URL structure for invitations
// wedme.app/invite/{invitation_code}

interface InvitationData {
  supplier_id: string;
  supplier_name: string;
  couple_names?: string;
  wedding_date?: string;
  expires_at: Date;
}`

### Simplified Registration

typescript

`*// Minimal friction for couples*
const coupleSignup = async ({
  email,
  password, *// Optional with social login*
  partner1_name,
  partner2_name,
  invitation_code
}) => {
  *// Create account*
  const { user } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        user_type: 'couple',
        invited_by: invitationData.supplier_id,
        partner1_name,
        partner2_name
      }
    }
  });
  
  *// Auto-connect to inviting supplier*
  await connectSupplier(user.id, invitationData.supplier_id);
};`

## Social Login Priority

- Show Google/Apple login prominently
- Email/password as secondary option
- One-click signup from invitation

## Partner Access

typescript

`*// Both partners can access with one account// Future: Separate logins with shared data*
interface CoupleAccess {
  primary_email: string;
  partner_email?: string; *// Can invite partner*
  shared_access: boolean;
}`

## Key Differences from Supplier Auth

- No email verification required
- No business information needed
- Faster onboarding (2 steps vs 5)
- Social login prioritized