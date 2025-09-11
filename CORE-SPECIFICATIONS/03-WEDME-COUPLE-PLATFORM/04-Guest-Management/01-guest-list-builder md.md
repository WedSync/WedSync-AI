# 01-guest-list-builder.md

## What to Build

Create an intuitive interface for building and organizing wedding guest lists with household grouping and categorization.

## Key Technical Requirements

### Guest Data Model

```
// types/guests.ts
interface Guest {
  id: string;
  household_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: Address;
  category: 'family' | 'friends' | 'work' | 'other';
  side: 'partner1' | 'partner2' | 'mutual';
  plus_one: boolean;
  plus_one_name?: string;
  age_group: 'adult' | 'child' | 'infant';
  table_number?: number;
  helper_role?: string; // For task delegation
}

interface Household {
  id: string;
  name: string;
  members: Guest[];
  address: Address;
  invitation_sent: boolean;
}
```

### Import Component

```
// components/couple/GuestImport.tsx
const GuestImporter = () => {
  const handleCSVImport = async (file: File) => {
    const text = await file.text();
    const parsed = Papa.parse(text, { 
      header: true,
      dynamicTyping: true 
    });
    
    // Smart field mapping
    const guests = [parsed.data.map](http://parsed.data.map)(row => ({
      first_name: row['First Name'] || row['first'],
      last_name: row['Last Name'] || row['last'],
      email: row['Email'] || row['email'],
      // Auto-detect household by last name + address
      household_id: generateHouseholdId(row)
    }));
    
    await bulkCreateGuests(guests);
  };
  
  return <CSVDropzone onUpload={handleCSVImport} />;
};
```

### Quick Add Interface

```
const QuickAddGuest = () => {
  // Parse natural language input
  // "John and Jane Smith, [john@email.com](mailto:john@email.com)"
  const parseGuestInput = (input: string) => {
    const patterns = [
      /([A-Z][a-z]+) and ([A-Z][a-z]+) ([A-Z][a-z]+)/,
      /([A-Z][a-z]+) ([A-Z][a-z]+), (.+@.+)/
    ];
    // Extract and create guest records
  };
};
```

## Critical Implementation Notes

- Auto-group households by last name/address
- Drag-and-drop between categories
- Bulk operations (invite all, mark attending)
- Export to CSV for printing
- Show count summaries (Adults: 95, Children: 12)

## Database

```
CREATE TABLE guests (
  id UUID PRIMARY KEY,
  couple_id UUID REFERENCES couples(id),
  household_id UUID,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  category VARCHAR(50),
  side VARCHAR(20),
  age_group VARCHAR(20)
);
```