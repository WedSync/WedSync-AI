# 01-budget-categories.md

## What to Build

Customizable budget category system with standard wedding expense categories and the ability to add custom ones.

## Key Technical Requirements

### Category Structure

```
interface BudgetCategory {
  id: string;
  couple_id: string;
  name: string;
  icon: string;
  color: string;
  budget_allocated: number;
  spent: number;
  pending: number;
  parent_category?: string; // For subcategories
  priority: 'essential' | 'important' | 'nice_to_have';
  notes?: string;
}

const DEFAULT_CATEGORIES = [
  { name: 'Venue', icon: '🏛', color: '#8B5CF6', priority: 'essential' },
  { name: 'Catering', icon: '🍽', color: '#10B981', priority: 'essential' },
  { name: 'Photography', icon: '📸', color: '#3B82F6', priority: 'essential' },
  { name: 'Music/Entertainment', icon: '🎵', color: '#F59E0B', priority: 'important' },
  { name: 'Flowers', icon: '🌹', color: '#EC4899', priority: 'important' },
  { name: 'Attire', icon: '👗', color: '#6366F1', priority: 'important' },
  { name: 'Decor', icon: '✨', color: '#14B8A6', priority: 'nice_to_have' },
  { name: 'Favors', icon: '🎁', color: '#F97316', priority: 'nice_to_have' },
];
```

### UI Components

- Drag-and-drop category reordering
- Visual budget allocation pie chart
- Progress bars per category
- Quick add expense per category
- Subcategory support (Photography → Engagement, Wedding, Album)

## Critical Implementation Notes

- Import categories from common templates
- Auto-calculate percentage of total budget
- Color-coded overspend warnings
- Category spending trends
- Suggested allocations based on total budget

## Budget Calculations

```
const calculateCategoryHealth = (category: BudgetCategory) => ({
  spent_percentage: (category.spent / category.budget_allocated) * 100,
  remaining: category.budget_allocated - category.spent - category.pending,
  status: category.spent > category.budget_allocated ? 'over' : 
          category.spent > category.budget_allocated * 0.9 ? 'warning' : 'healthy'
});
```