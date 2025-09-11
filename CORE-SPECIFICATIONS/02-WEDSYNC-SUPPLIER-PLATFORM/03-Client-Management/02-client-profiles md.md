# 02-client-profiles.md

## Purpose

Comprehensive individual client view containing all information, activity history, and management tools for a specific couple.

## Core Components

### Header Section

- Couple photo upload/display (400x400 minimum)
- Names with pronunciation notes if provided
- Wedding date with countdown
- Quick contact buttons (email, phone, SMS)
- Status badges (active, past, upcoming)
- WedMe connection indicator

### Information Tabs

- **Overview**: Essential details, venue, guest count, package
- **Details**: All form responses, custom fields, preferences
- **Timeline**: Chronological activity feed
- **Notes**: Private supplier notes with timestamps
- **Documents**: Contracts, forms, shared files
- **Journey**: Current position in customer journey
- **Communications**: Email/SMS history

### Core Fields Display

- Show which core fields are populated (✅/🟡/⚪)
- Link to request missing information
- Display last updated timestamps
- Show field source (manual, imported, WedMe sync)

### Actions Panel

- Edit client information
- Assign to journey
- Send message/email
- Add to task list
- Export client data
- Archive/delete (with confirmation)

## Data Management

- Auto-save all edits with optimistic updates
- Maintain edit history with rollback capability
- Sync changes to WedMe if connected
- Track all modifications in audit log

## Integration Points

- Pull activity from customer journey system
- Display form responses inline
- Show related suppliers if available
- Link to client's WedMe dashboard