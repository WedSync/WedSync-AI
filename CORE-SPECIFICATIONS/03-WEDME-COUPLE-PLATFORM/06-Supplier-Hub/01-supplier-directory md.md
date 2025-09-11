# 01-supplier-directory.md

## What to Build

Create a visual directory showing all connected suppliers with their status, service type, and key information. This is the couple's command center for vendor management.

## Key Technical Requirements

### Data Structure

```
interface SupplierConnection {
  id: string;
  supplier_id: string;
  couple_id: string;
  service_type: 'photography' | 'catering' | 'venue' | 'florist' | 'dj' | 'planning';
  connection_status: 'invited' | 'connected' | 'declined' | 'inactive';
  supplier_info: {
    business_name: string;
    contact_name: string;
    email: string;
    phone: string;
    profile_image?: string;
  };
  package_details?: string;
  contract_status: 'pending' | 'signed' | 'none';
  last_interaction: Date;
  next_milestone?: string;
}
```

### UI Components

- Grid/list toggle view
- Supplier cards with photo, name, service type
- Status badges (Connected, Pending, Not Connected)
- Quick actions per supplier (Message, View Forms, Call)
- Filter by service type and status
- Search by name or service

## Critical Implementation Notes

- Auto-import from couple's email (detect vendor emails)
- Suggested suppliers based on venue/style
- Visual service type icons for quick scanning
- Mobile swipe actions for common tasks
- Show mutual connections with other couples

## API Endpoints

```
// GET /api/wedme/suppliers/:couple_id
// POST /api/wedme/suppliers/invite
// PUT /api/wedme/suppliers/:connection_id/status
```