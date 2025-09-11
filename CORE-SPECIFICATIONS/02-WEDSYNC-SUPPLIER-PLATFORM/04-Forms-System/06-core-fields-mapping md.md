# 06-core-fields-mapping.md

## Overview

The revolutionary feature that eliminates repetitive data entry by auto-populating wedding details across all supplier forms.

## Core Field Categories

### Couple Information

```
interface CoupleFields {
  partner1_name: string
  partner2_name: string
  email: string
  phone: string
  address: Address
  preferred_contact: 'email' | 'phone' | 'text'
}
```

### Wedding Details

```
interface WeddingFields {
  wedding_date: Date
  ceremony_venue: Venue
  reception_venue: Venue
  guest_count: {
    adults: number
    children: number
    total: number
  }
  ceremony_time: Time
  reception_time: Time
  wedding_style: string[]
  color_scheme: string[]
}
```

### Key People

```
interface KeyPeople {
  wedding_party: Person[]
  parents: Person[]
  vip_guests: Person[]
  coordinator?: Person
  other_vendors: Vendor[]
}
```

## Mapping Implementation

### Auto-Detection

```
// Intelligent field matching
const mapCoreFields = (formField: FormField) => {
  // Check field name/label
  if (matchesPattern(formField, /wedding.*date/i)) {
    return linkToCoreField('wedding_date')
  }
  
  // Check field type + context
  if (formField.type === 'date' && nearField('ceremony')) {
    return linkToCoreField('ceremony_time')
  }
}
```

### Manual Override

- Supplier can manually link fields
- Visual indicator for linked fields
- Option to unlink if needed

## Data Flow

1. **Couple Updates Core Field** (WedMe)
2. **Broadcast Update** (Realtime)
3. **Supplier Forms Reflect Change** (WedSync)
4. **Validation & Confirmation** (If critical)

## Privacy Controls

- Couples control what's shared
- Suppliers see only relevant fields
- Sensitive data requires explicit permission
- Audit log of all data sharing

## UI/UX Indicators

- 🔄 Icon for synced fields
- Green highlight when populated
- Lock icon if read-only
- Tooltip explaining data source