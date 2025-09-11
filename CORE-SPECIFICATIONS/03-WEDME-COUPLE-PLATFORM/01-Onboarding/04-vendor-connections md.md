# 04-vendor-connections.md

## What to Build

Interface for couples to identify and invite their existing vendors to the platform.

## Connection Methods

### Search Existing Vendors

```
interface VendorSearch {
  searchTerm: string;
  location: string; // From core_fields
  category: VendorCategory;
  results: SupplierProfile[];
}

// Check if vendor already on platform
const existingVendor = await supabase
  .from('suppliers')
  .select('*')
  .textSearch('business_name', searchTerm)
  .single();
```

### Invite New Vendors

```
interface VendorInvite {
  business_name: string;
  vendor_type: VendorCategory;
  contact_email: string;
  contact_phone?: string;
  personal_message?: string;
}

// Send invitation email
await sendVendorInvitation({
  from_couple: couple.names,
  wedding_date: [couple.wedding](http://couple.wedding)_date,
  vendor_email: [invite.contact](http://invite.contact)_email,
  invitation_code: generateCode()
});
```

## UI Flow

```
// Progressive vendor addition
const commonVendors = [
  'Photographer', 'Venue', 'Caterer', 
  'Florist', 'DJ/Band', 'Planner'
];

// Show connected vendor from invitation first
// Then prompt for other common vendors
// Allow skip to dashboard
```

## Database Operations

```
-- Track vendor invitations
INSERT INTO vendor_invitations (
  couple_id, vendor_email, vendor_type,
  invitation_code, status
) VALUES ($1, $2, $3, $4, 'pending');

-- Link when vendor joins
UPDATE couple_supplier_connections
SET status = 'connected'
WHERE invitation_code = $1;
```

## Critical Notes

- Show value prop: "They'll see your details automatically"
- Allow bulk invite (paste multiple emails)
- Track invitation status
- Skip option prominent