# 03-field-states.md

## What to Build

Implement a dynamic field state system showing completion status with visual indicators (✅ Completed, 🟡 Partial, ⚪ Pending, ❌ Not Applicable).

## Key Technical Requirements

### State Calculation Logic

```
// utils/fieldStates.ts
type FieldStatus = 'completed' | 'partial' | 'pending' | 'not_applicable';

interface FieldStateRules {
  [key: string]: {
    required: boolean;
    validator: (value: any) => boolean;
    dependencies?: string[]; // Other fields that affect this state
    partialValidator?: (value: any) => boolean;
  }
}

const fieldRules: FieldStateRules = {
  wedding_date: {
    required: true,
    validator: (val) => isValid(parseISO(val))
  },
  guest_count: {
    required: true,
    validator: (val) => val > 0,
    partialValidator: (val) => val !== null // Estimated count
  },
  dietary_requirements: {
    required: false,
    validator: (val) => val?.length > 0,
    dependencies: ['guest_count', 'catering_supplier']
  }
};
```

### Visual State Component

```
// components/couple/FieldStatus.tsx
const FieldStatusBadge = ({ status }: { status: FieldStatus }) => {
  const config = {
    completed: { icon: '✅', color: 'green', label: 'Complete' },
    partial: { icon: '🟡', color: 'yellow', label: 'Partial' },
    pending: { icon: '⚪', color: 'gray', label: 'Pending' },
    not_applicable: { icon: '❌', color: 'red', label: 'N/A' }
  };
  
  return (
    <span className={`badge badge-${config[status].color}`}>
      {config[status].icon} {config[status].label}
    </span>
  );
};
```

### State Transitions

```
// services/fieldStateTransitions.ts
class FieldStateManager {
  async transitionState(
    fieldKey: string, 
    newValue: any,
    context: { coupleId: string; supplierId?: string }
  ) {
    const oldState = await this.getFieldState(fieldKey);
    const newState = this.calculateState(fieldKey, newValue);
    
    if (oldState !== newState) {
      await this.recordTransition({
        fieldKey,
        from: oldState,
        to: newState,
        timestamp: new Date(),
        triggeredBy: context.supplierId || 'couple'
      });
      
      // Notify relevant parties
      this.broadcastStateChange(fieldKey, newState);
    }
  }
}
```

## Critical Implementation Notes

- Recalculate dependent field states on updates
- Show state history in tooltip on hover
- Allow couples to mark fields as N/A
- Batch state calculations for performance
- Cache state calculations with 1-minute TTL

## Database Structure

```
CREATE TABLE field_states (
  couple_id UUID,
  field_key VARCHAR(50),
  status VARCHAR(20),
  calculated_at TIMESTAMPTZ,
  reason TEXT, -- Why field is in this state
  PRIMARY KEY (couple_id, field_key)
);
```