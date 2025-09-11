# 02-manual-tracking.md

## What to Build

Simple manual entry system for tracking wedding expenses without any payment processing or financial integrations.

## Key Technical Requirements

### Expense Entry Model

```
interface Expense {
  id: string;
  couple_id: string;
  category_id: string;
  supplier_name: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'planned';
  payment_method?: 'cash' | 'card' | 'transfer' | 'check';
  date: Date;
  due_date?: Date;
  notes?: string;
  attachments?: string[]; // Receipt photos
  recurring?: {
    frequency: 'monthly' | 'quarterly';
    end_date: Date;
  };
}
```

### Quick Entry UI

- Single-tap amount entry
- Recent suppliers dropdown
- Photo receipt capture
- Quick status toggle (paid/pending)
- Duplicate expense for similar items
- Bulk entry mode for multiple expenses

## Critical Implementation Notes

- NO payment processing integration
- Manual status updates only
- Optional receipt photo storage
- Running total display
- Quick filters (paid, pending, by month)

## Entry Shortcuts

```
// Quick expense parser
const parseQuickEntry = (input: string) => {
  // "Flowers 500 pending" -> 
  const match = input.match(/(\w+)\s+(\d+)\s*(paid|pending)?/i);
  if (match) {
    return {
      category: findCategory(match[1]),
      amount: parseFloat(match[2]),
      status: match[3] || 'planned'
    };
  }
};

// Frequent expenses templates
const QUICK_TEMPLATES = [
  { name: 'Venue deposit', percentage: 25 },
  { name: 'Photographer deposit', percentage: 30 },
  { name: 'Final payments', percentage: 100 }
];
```