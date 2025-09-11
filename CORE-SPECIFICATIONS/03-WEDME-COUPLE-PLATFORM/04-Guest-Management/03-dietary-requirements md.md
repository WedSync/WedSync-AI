# 03-dietary-requirements.md

## What to Build

Create a comprehensive dietary and allergen tracking system that interfaces with catering suppliers.

## Key Technical Requirements

### Dietary Data Model

```
// types/dietary.ts
interface DietaryRequirement {
  guest_id: string;
  type: DietaryType;
  severity: 'preference' | 'intolerance' | 'allergy' | 'life_threatening';
  notes?: string;
  verified: boolean;
}

type DietaryType = 
  // Allergies
  | 'nuts' | 'peanuts' | 'shellfish' | 'fish' | 'eggs' | 'dairy' | 'gluten'
  // Dietary Choices  
  | 'vegetarian' | 'vegan' | 'pescatarian' | 'halal' | 'kosher'
  // Medical
  | 'diabetic' | 'low_sodium' | 'fodmap';

interface DietaryMatrix {
  requirement: DietaryType;
  count: number;
  guestNames: string[];
  mealAffected: 'all' | 'main' | 'dessert';
  cateringNotes?: string;
}
```

### Dietary Input Component

```
// components/guests/DietaryInput.tsx
const DietaryRequirementsForm = ({ guestId }) => {
  return (
    <div className="dietary-form">
      <CheckboxGroup 
        label="Allergies (Life-threatening)"
        options={allergyOptions}
        onChange={(selected) => updateDietary(guestId, selected, 'life_threatening')}
      />
      
      <CheckboxGroup
        label="Dietary Preferences"
        options={dietaryOptions}
        onChange={(selected) => updateDietary(guestId, selected, 'preference')}
      />
      
      <TextArea 
        label="Additional Notes"
        placeholder="Cross-contamination concerns, specific brands, etc."
      />
      
      <Alert type="warning">
        ⚠️ This information will be shared with your caterer
      </Alert>
    </div>
  );
};
```

### Caterer Export View

```
// Generate matrix for caterer
const DietaryMatrix = () => {
  const matrix = useDietaryMatrix();
  
  return (
    <Table>
      <thead>
        <tr>
          <th>Requirement</th>
          <th>Count</th>
          <th>Severity</th>
          <th>Guest Names</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        {[matrix.map](http://matrix.map)(row => (
          <tr className={row.severity === 'life_threatening' ? 'bg-red-50' : ''}>
            <td>{row.requirement}</td>
            <td>{row.count}</td>
            <td><SeverityBadge severity={row.severity} /></td>
            <td>{row.guestNames.join(', ')}</td>
            <td>{row.notes}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};
```

## Critical Implementation Notes

- Highlight life-threatening allergies in red
- Auto-share with catering supplier when updated
- Generate printable cards for kitchen
- Track cross-contamination risks
- Allow bulk dietary assignment by table

## Database Schema

```
CREATE TABLE dietary_requirements (
  guest_id UUID REFERENCES guests(id),
  requirement_type VARCHAR(50),
  severity VARCHAR(30),
  notes TEXT,
  verified_at TIMESTAMPTZ,
  PRIMARY KEY (guest_id, requirement_type)
);
```