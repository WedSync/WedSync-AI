# 02-supplier-auth-flow.md

`### 02-supplier-auth-flow.md
```markdown
# Supplier Authentication Flow

## Signup Flow

### Step 1: Initial Registration
```typescript
// Capture business info upfront
interface SupplierSignup {
  email: string;
  password: string;
  business_name: string;
  business_type: 'photographer' | 'venue' | 'caterer' | ...;
  referral_code?: string; // Track viral source
}`

### Step 2: Email Verification

- Send verification email immediately
- Allow limited access before verification
- Full features unlock after verification

### Step 3: Create Supplier Record

sql

- `*- Triggered by auth.users insert*
INSERT INTO suppliers ( id, email, business_name, business_type, subscription_tier, trial_ends_at
) VALUES ( auth.uid(), NEW.email, NEW.raw_user_meta_data->>'business_name', NEW.raw_user_meta_data->>'business_type', 'trial', NOW() + INTERVAL '30 days'
);`

## Login Enhancement

typescript

`*// Remember device for 30 days*
if (rememberMe) {
  await supabase.auth.updateUser({
    data: { remember_device: true }
  });
}

*// Track login for analytics*
await trackActivity('supplier_login', {
  method: 'email', *// or 'google', 'magic_link'*
  device: navigator.userAgent
});`

## Security Requirements

- Password minimum 8 characters
- Rate limit: 5 attempts per 15 minutes
- IP-based blocking for suspicious activity
- Audit log all authentication events