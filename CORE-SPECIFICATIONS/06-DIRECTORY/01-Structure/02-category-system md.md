# 02-category-system.md

## What to Build

A hierarchical category organization system for wedding suppliers with standardized taxonomy and tagging.

## Key Technical Requirements

### Database Schema

```
CREATE TABLE supplier_categories (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  parent_id UUID REFERENCES supplier_categories(id),
  icon VARCHAR(50),
  display_order INTEGER,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE supplier_category_assignments (
  supplier_id UUID REFERENCES suppliers(id),
  category_id UUID REFERENCES supplier_categories(id),
  is_primary BOOLEAN DEFAULT false,
  PRIMARY KEY (supplier_id, category_id)
);
```

### Core Categories

- Photography (Documentary, Fine Art, Traditional)
- Videography (Cinematic, Documentary)
- Venues (Hotels, Barns, Historic, Beach)
- Catering (Full Service, BBQ, Fine Dining)
- Music (DJs, Bands, Solo Artists)
- Florals (Bouquets, Centerpieces, Installations)
- Beauty (Hair, Makeup, Nails)
- Planning (Full Planning, Day-of, Partial)

## Critical Implementation Notes

### Multi-Category Support

- Suppliers can belong to multiple categories
- One primary category for main directory placement
- Secondary categories for cross-listing
- Validate maximum 3 categories per supplier

### Style Tags System

```
interface StyleTag {
  id: string;
  name: string;
  category_id: string;
  color: string;
}
```

### API Endpoints

- `GET /api/categories` - Hierarchical category tree
- `POST /api/suppliers/{id}/categories` - Assign categories
- `GET /api/categories/{slug}/suppliers` - Get suppliers by category