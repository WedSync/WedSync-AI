# 03-client-import-system.md

## Purpose

Enable suppliers to quickly import existing clients from various sources, critical for platform adoption and viral growth.

## Import Sources

### File Imports

- **CSV/Excel**: Drag-and-drop with preview
- **JSON**: For technical users or system migrations
- **vCard**: Contact file imports

### CRM Integrations

- HoneyBook (OAuth)
- Dubsado (API key)
- 17hats (OAuth)
- Studio Ninja (API)
- Generic Zapier webhook

### Manual Methods

- Copy/paste from any source
- Quick add form for individual clients
- Bulk text parser (name, email, date per line)

## Import Flow

### Step 1: Source Selection

- Visual source selector with icons
- 'Recently used' section for repeat imports
- Help text explaining each option

### Step 2: Field Mapping

- AI-powered automatic field detection
- Drag-and-drop mapping interface
- Preview first 10 rows
- Save mapping templates for reuse

### Step 3: Validation

- Highlight duplicates with merge options
- Flag invalid data (dates, emails)
- Show completion percentage
- Option to fix or skip problematic rows

### Step 4: Import Execution

- Progress bar with current client name
- Real-time success/error counts
- Background processing for large imports
- Email notification when complete

## Post-Import

- Summary report (imported, skipped, errors)
- Automatic tagging with import source and date
- Prompt to invite clients to WedMe
- Suggest journey assignment for imported clients

## Technical Requirements

- Support files up to 10MB
- Process imports in batches of 100
- Implement job queue for large imports
- Store import history for debugging