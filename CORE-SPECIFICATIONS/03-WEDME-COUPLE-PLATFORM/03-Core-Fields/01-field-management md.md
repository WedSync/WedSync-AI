# 01-field-management.md

## What to Build

Implement a centralized field management system where couples enter wedding details once, and data automatically propagates to all supplier forms.

## Key Technical Requirements

### Core Field Types

```
// types/coreFields.ts
interface CoreField {
  id: string;
  key: CoreFieldKey;
  value: any;
  status: 'completed' | 'partial' | 'pending' | 'not_applicable';
  lastUpdated: Date;
  updatedBy: 'couple' | 'supplier';
  locked: boolean; // Supplier can't override
}

type CoreFieldKey = 
  // Essential Info
  | 'wedding_date'
  | 'ceremony_venue' 
  | 'reception_venue'
  | 'guest_count'
  | 'ceremony_time'
  // Couple Details
  | 'partner1_name'
  | 'partner1_email'
  | 'partner1_phone'
  | 'partner2_name'
  | 'partner2_email'
  | 'partner2_phone';
```

### State Management

```
// stores/coreFieldsStore.ts
const useCoreFieldsStore = create((set) => ({
  fields: {},
  updateField: async (key, value) => {
    // Update local state
    set(state => ({ 
      fields: { ...state.fields, [key]: value }
    }));
    
    // Sync to database
    await supabase
      .from('core_fields')
      .upsert({ couple_id, key, value });
    
    // Broadcast to suppliers
    broadcastFieldUpdate(key, value);
  }
}));
```

## Critical Implementation Notes

- Validate field formats (dates, emails, phones)
- Auto-save after 2 seconds of inactivity
- Show completion percentage in UI
- Lock critical fields after supplier confirmations
- Maintain audit trail of all changes

## Database Schema

```
CREATE TABLE core_fields (
  couple_id UUID REFERENCES couples(id),
  field_key VARCHAR(50),
  field_value JSONB,
  status VARCHAR(20),
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (couple_id, field_key)
);
```