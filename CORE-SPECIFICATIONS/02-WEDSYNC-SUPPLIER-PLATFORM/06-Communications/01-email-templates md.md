# 01-email-templates.md

## Overview

Email template management system with rich editor, personalization, and reusable content blocks.

## Template Structure

```
interface EmailTemplate {
  id: string
  name: string
  category: 'welcome' | 'reminder' | 'follow_up' | 'custom'
  subject: string
  htmlContent: string
  plainTextContent: string
  mergeFields: string[]
  attachments?: Attachment[]
  folder?: string
}
```

## Rich Editor Features

- **WYSIWYG Editor**: Visual email design
- **HTML Mode**: Direct code editing
- **Responsive Preview**: Desktop/mobile views
- **Brand Kit**: Colors, fonts, logos

## Personalization

```
// Merge field system
const mergeFields = {
  '{{couple_names}}': client.coupleNames,
  '{{wedding_date}}': formatDate(client.weddingDate),
  '{{venue_name}}': client.venue,
  '{{days_until}}': calculateDays(client.weddingDate),
  '{{package_name}}': client.packageName
}
```

## Content Blocks

- Reusable headers/footers
- Signature blocks
- Social media links
- Call-to-action buttons
- Image galleries

## Template Organization

- Folder structure
- Search and filter
- Favorite templates
- Version history
- Clone and modify

## AI Enhancement

- Subject line suggestions
- Content optimization
- Tone adjustment
- Grammar checking