# 09-photo-management.md

## Purpose

Visual identification system for clients, particularly valuable for photographers and venues managing many couples.

## Photo Sources

### Upload Methods

- **Direct Upload**: Drag-drop or browse (JPEG, PNG, WebP)
- **Social Import**: Instagram, Facebook (with OAuth)
- **URL Import**: Direct image URL
- **Mobile Camera**: Direct capture on mobile
- **Gallery Selection**: From existing wedding photos

### Automatic Sources

- Pull from WedMe if connected
- Import from CRM profile pictures
- Gravatar fallback for emails
- Initial generation based on names

## Image Processing

### Optimization

- Resize to 400x400 for profiles
- Generate thumbnails (100x100)
- Convert to WebP for performance
- Compress to <100KB
- Lazy loading implementation

### Smart Cropping

- Face detection for center focus
- Manual crop adjustment tool
- Preset aspect ratios
- Zoom and rotate controls

## Display Contexts

### Usage Areas

- Client list (small thumbnail)
- Client profile (large header)
- Grid view (medium cards)
- Timeline events (tiny avatar)
- Email signatures (embedded)

### Fallbacks

- Initials with background color
- Generic couple silhouette
- Venue photo if no couple photo
- Gradient based on names

## Privacy Controls

- Permission levels (public, team, private)
- Separate engagement/wedding photos
- Hide from directory option
- Watermark capability
- Right-click protection option

## Organization

- Multiple photos per client
- Set primary photo
- Photo history/timeline
- Albums for related images
- Tags for photo categories

## Technical Requirements

- CDN delivery for performance
- Responsive image sizing
- Progressive loading
- Offline caching
- Maximum 5MB upload size