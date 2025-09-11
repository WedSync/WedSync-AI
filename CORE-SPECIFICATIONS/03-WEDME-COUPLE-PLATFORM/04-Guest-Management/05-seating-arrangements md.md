# 05-seating-arrangements.md

## What to Build

Visual table planning interface with drag-and-drop guest placement and dietary/relationship considerations.

## Key Technical Requirements

### Seating Data Model

```
// types/seating.ts
interface Table {
  id: string;
  number: number;
  name?: string; // "Bride's Family"
  capacity: number;
  shape: 'round' | 'rectangle' | 'square';
  position: { x: number; y: number }; // For floor plan
  guests: string[]; // guest IDs
}

interface SeatingRule {
  type: 'must_sit_together' | 'keep_apart' | 'near_exit' | 'accessibility';
  guest_ids: string[];
  reason?: string;
}

interface SeatingPlan {
  tables: Table[];
  rules: SeatingRule[];
  venue_layout?: string; // Floor plan image
  validated: boolean;
}
```

### Table Builder Component

```
// components/seating/TableBuilder.tsx
const SeatingChart = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [unseated, setUnseated] = useState<Guest[]>([]);
  
  return (
    <div className="seating-container">
      <TableConfiguration 
        onAddTable={(config) => addTable(config)}
        defaultCapacity={10}
      />
      
      <div className="seating-grid">
        {[tables.map](http://tables.map)(table => (
          <TableView
            key={[table.id](http://table.id)}
            table={table}
            onDropGuest={(guestId) => seatGuest(guestId, [table.id](http://table.id))}
            warnings={getTableWarnings(table)}
          />
        ))}
      </div>
      
      <UnseatedGuestsList 
        guests={unseated}
        groupBy="household"
      />
    </div>
  );
};
```

### Conflict Detection

```
// utils/seatingValidation.ts
const validateSeating = (plan: SeatingPlan): ValidationResult => {
  const issues = [];
  
  // Check capacity
  plan.tables.forEach(table => {
    if (table.guests.length > table.capacity) {
      issues.push({
        type: 'overcapacity',
        table: table.number,
        message: `Table ${table.number} is over capacity`
      });
    }
  });
  
  // Check rules
  plan.rules.forEach(rule => {
    if (rule.type === 'keep_apart') {
      if (guestsAtSameTable(rule.guest_ids)) {
        issues.push({
          type: 'rule_violation',
          message: 'Guests who should be separated are at same table'
        });
      }
    }
  });
  
  return { valid: issues.length === 0, issues };
};
```

## Critical Implementation Notes

- Auto-suggest seating based on relationships
- Show dietary icons on guest cards
- Export to PDF for venue/caterer
- Calculate tables needed based on guest count
- Visual warnings for conflicts (red borders)

## Database

```
CREATE TABLE seating_arrangements (
  couple_id UUID REFERENCES couples(id),
  table_id UUID,
  table_number INT,
  capacity INT,
  guest_assignments JSONB,
  PRIMARY KEY (couple_id, table_id)
);
```