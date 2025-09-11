# 02-couple-signup.md

## What to Build

Streamlined registration for couples arriving from supplier invitations with automatic data pre-population.

## Key Components

### Registration Form

```
interface CoupleSignup {
  partner1_name: string;
  partner1_email: string;
  partner2_name: string;
  partner2_email?: string; // Optional
  password: string;
  wedding_date?: Date; // Can be set later
  invitation_code?: string; // From supplier
}
```

### OAuth Integration

- Google Sign-In (primary)
- Apple Sign-In (iOS users)
- Skip password for OAuth users
- Link OAuth to existing email if matched

### Invitation Processing

```
// Auto-link to inviting supplier
if (invitationCode) {
  const invitation = await getInvitation(invitationCode);
  await linkSupplierToCouple({
    couple_id: [newCouple.id](http://newCouple.id),
    supplier_id: invitation.supplier_id,
    status: 'connected'
  });
  // Pre-populate any shared data
  await syncCoreFields(invitation.shared_data);
}
```

## Database Structure

```
-- couples table insert
INSERT INTO couples (
  partner1_name, partner1_email,
  partner2_name, partner2_email,
  auth_user_id, created_via,
  invitation_supplier_id
) VALUES (...);

-- Auto-create core_fields record
INSERT INTO core_fields (couple_id) 
VALUES (new_couple_id);
```

## Critical Notes

- Don't require phone initially (reduce friction)
- Partner 2 optional (can add later)
- Auto-save progress if interrupted
- Mobile-first responsive design
- Skip steps if coming from invitation