# 01-document-storage.md

## Overview

Centralized repository for supplier credentials, contracts, guides, and marketing materials. Reduces repetitive document requests and builds trust.

## Document Categories

### Credentials & Insurance

- **Insurance Certificates**: PLI, equipment coverage, vehicle insurance
- **Professional Memberships**: Industry associations, certifications
- **Legal Documents**: DBS checks, licenses, permits
- **Venue Requirements**: PAT testing (DJs), food hygiene (caterers), drone licenses

### Client Resources

- **Welcome Guides**: Service overview, process explanation
- **Preparation Guides**: Timeline templates, checklists
- **Inspiration Materials**: Portfolio PDFs, lookbooks
- **Technical Specifications**: Equipment lists, space requirements

## Storage Architecture

### File Management

- Supabase Storage buckets per supplier
- 5GB storage per supplier (upgradeable)
- Automatic file compression and optimization
- Version control with history tracking

### Security & Access

- **Public Documents**: Viewable by all prospects
- **Client-Only**: Visible after booking confirmation
- **Venue-Required**: Auto-shared with venue coordinators
- **Private**: Internal reference only

## Auto-Expiry System

- Track certificate expiration dates
- Email alerts 30, 14, 7 days before expiry
- Dashboard warnings for expired documents
- Compliance status indicators

## Integration Points

- Auto-attach to emails in customer journeys
- Embed in client dashboards
- Share via secure links
- Bulk send to venue requirements