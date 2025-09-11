# WedSync Branding Customization System - Technical Documentation

## Architecture Overview

The WedSync Branding Customization System is built on a modern React/Next.js architecture with TypeScript, providing a robust and type-safe branding solution.

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client UI     │    │   API Layer     │    │   Database      │
│                 │    │                 │    │                 │
│ BrandingCustomizer │──│ /api/branding   │──│ brands table    │
│ Brand Preview   │    │ /api/branding/  │    │ brand_assets    │
│ Asset Upload    │    │ upload          │    │ table           │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Technology Stack

- **Frontend**: React 19.1.1 with Next.js 15.4.3
- **Backend**: Next.js API Routes with Supabase
- **Database**: PostgreSQL 15 via Supabase
- **Storage**: Supabase Storage for brand assets
- **Authentication**: Supabase Auth
- **TypeScript**: 5.9.2 for type safety
- **Testing**: Vitest with Testing Library and Playwright

## Database Schema

### Tables

#### brands
```sql
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  logo_file_id UUID REFERENCES brand_assets(id),
  primary_color VARCHAR(7) NOT NULL CHECK (primary_color ~* '^#[0-9A-Fa-f]{6}$'),
  secondary_color VARCHAR(7) NOT NULL CHECK (secondary_color ~* '^#[0-9A-Fa-f]{6}$'),
  accent_color VARCHAR(7) NOT NULL CHECK (accent_color ~* '^#[0-9A-Fa-f]{6}$'),
  font_family VARCHAR(100) NOT NULL DEFAULT 'Inter',
  custom_css TEXT,
  brand_guidelines TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX brands_organization_id_idx ON brands(organization_id);
CREATE INDEX brands_is_active_idx ON brands(is_active);
CREATE UNIQUE INDEX brands_organization_active_idx ON brands(organization_id, is_active) WHERE is_active = true;
```

#### brand_assets
```sql
CREATE TABLE brand_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('logo', 'banner', 'icon', 'background')),
  filename VARCHAR(255) NOT NULL,
  storage_path VARCHAR(500) NOT NULL UNIQUE,
  url TEXT NOT NULL,
  size INTEGER NOT NULL CHECK (size > 0 AND size <= 5242880), -- 5MB limit
  mime_type VARCHAR(100) NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX brand_assets_brand_id_idx ON brand_assets(brand_id);
CREATE INDEX brand_assets_organization_id_idx ON brand_assets(organization_id);
CREATE INDEX brand_assets_type_idx ON brand_assets(type);
```

### Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;

-- Brands policies
CREATE POLICY brands_select_policy ON brands
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY brands_insert_policy ON brands
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY brands_update_policy ON brands
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

-- Brand assets policies
CREATE POLICY brand_assets_select_policy ON brand_assets
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY brand_assets_insert_policy ON brand_assets
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
  );
```

## API Documentation

### Brand Management Endpoints

#### GET /api/branding
Retrieve brands for the authenticated user's organization.

**Response:**
```typescript
{
  brands: Brand[]
}
```

**Example:**
```typescript
const response = await fetch('/api/branding');
const { brands } = await response.json();
```

#### POST /api/branding
Create a new brand.

**Request Body:**
```typescript
{
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  customCss?: string;
  brandGuidelines?: string;
}
```

**Response:**
```typescript
{
  brand: Brand
}
```

**Validation:**
- `name`: Required, 1-255 characters
- Colors: Must be valid hex format (#RRGGBB)
- `fontFamily`: Must be from approved list

#### PUT /api/branding
Update an existing brand.

**Request Body:**
```typescript
{
  brandId: string;
  name?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  customCss?: string;
  brandGuidelines?: string;
  isActive?: boolean;
}
```

#### DELETE /api/branding?id={brandId}
Soft delete a brand (sets `is_active` to false).

### Asset Upload Endpoints

#### POST /api/branding/upload
Upload a brand asset.

**Request**: `multipart/form-data`
- `file`: File (required)
- `type`: 'logo' | 'banner' | 'icon' | 'background' (required)
- `brandId`: string (optional)

**Response:**
```typescript
{
  success: boolean;
  asset?: BrandAsset;
  error?: string;
}
```

**File Constraints:**
- Maximum size: 5MB
- Allowed types: image/jpeg, image/png, image/svg+xml, image/webp
- Dimensions: 32x32px minimum, 2048x2048px maximum

#### DELETE /api/branding/upload?id={assetId}
Remove a brand asset from storage and database.

## Type Definitions

### Core Types

```typescript
// /src/types/branding.ts

export interface Brand {
  id: string;
  organizationId: string;
  name: string;
  logoUrl?: string;
  logoFileId?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  customCss?: string;
  brandGuidelines?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BrandAsset {
  id: string;
  brandId: string;
  type: 'logo' | 'banner' | 'icon' | 'background';
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface BrandTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  border: string;
  muted: string;
}
```

### Request/Response Types

```typescript
export interface CreateBrandRequest {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  customCss?: string;
  brandGuidelines?: string;
}

export interface UpdateBrandRequest extends Partial<CreateBrandRequest> {
  isActive?: boolean;
}

export interface BrandUploadResponse {
  success: boolean;
  asset?: BrandAsset;
  error?: string;
}
```

## React Components

### BrandingCustomizer Component

Main component for brand customization interface.

```typescript
interface BrandingCustomizerProps {
  brand?: Brand;
  onSave: (brandData: CreateBrandRequest) => Promise<void>;
  onUploadAsset: (file: File, type: 'logo' | 'banner') => Promise<BrandUploadResponse>;
  isLoading?: boolean;
}
```

**Key Features:**
- Form validation with real-time feedback
- Live brand preview
- File upload with progress tracking
- Color picker integration
- Responsive design

**Usage:**
```typescript
import BrandingCustomizer from '@/components/branding/BrandingCustomizer';

function BrandingPage() {
  const handleSave = async (brandData: CreateBrandRequest) => {
    const response = await fetch('/api/branding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(brandData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to save brand');
    }
  };

  const handleUpload = async (file: File, type: 'logo' | 'banner') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await fetch('/api/branding/upload', {
      method: 'POST',
      body: formData
    });

    return await response.json();
  };

  return (
    <BrandingCustomizer
      onSave={handleSave}
      onUploadAsset={handleUpload}
    />
  );
}
```

## Testing Strategy

### Unit Tests

Located in: `/src/components/branding/__tests__/BrandingCustomizer.test.tsx`

**Test Coverage:**
- Component rendering with/without props
- Form validation and error handling
- File upload validation
- Color picker functionality
- Form submission handling
- Accessibility compliance

**Key Test Utilities:**
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BrandingCustomizer from '../BrandingCustomizer';

// Mock file creation
const createMockFile = (name = 'test.png', size = 1024, type = 'image/png') => {
  const file = new File(['test'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};
```

### Integration Tests

Located in: `/src/__tests__/integration/branding-integration.test.tsx`

**Test Scenarios:**
- API + UI component integration
- File upload + brand storage flow
- Real-time brand preview updates
- End-to-end brand customization workflows

### E2E Tests

Located in: `/src/__tests__/e2e/branding-e2e.spec.ts`

**Test Coverage:**
- Complete branding workflows across browsers
- Mobile device compatibility
- Performance benchmarks
- Cross-browser compatibility

**Playwright Configuration:**
```typescript
// playwright.config.ts
export default {
  testDir: './src/__tests__/e2e',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },
  ],
};
```

### Performance Tests

Located in: `/src/__tests__/performance/brand-asset-performance.test.ts`

**Performance Metrics:**
- Asset upload times by file size
- Brand preview rendering performance
- Memory usage tracking
- Network optimization validation

## Security Considerations

### Input Validation

**Server-side Validation:**
```typescript
// Color validation
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

function validateBrandData(data: CreateBrandRequest) {
  const errors: string[] = [];
  
  if (!data.name?.trim()) {
    errors.push('Brand name is required');
  }
  
  if (!HEX_COLOR_REGEX.test(data.primaryColor)) {
    errors.push('Invalid primary color format');
  }
  
  // Additional validations...
  
  return errors;
}
```

**File Upload Security:**
```typescript
// File validation
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/svg+xml',
  'image/webp'
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large' };
  }
  
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type' };
  }
  
  return { valid: true };
}
```

### Authentication & Authorization

**API Route Protection:**
```typescript
async function getCurrentUser(supabase: SupabaseClient) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  return user;
}

// Usage in API routes
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseClient();
  const user = await getCurrentUser(supabase);
  
  // Verify user belongs to organization
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();
    
  // Continue with authorized operations...
}
```

### SQL Injection Prevention

All database queries use parameterized queries through Supabase client:

```typescript
// Safe parameterized query
const { data } = await supabase
  .from('brands')
  .select('*')
  .eq('organization_id', organizationId)
  .eq('is_active', true);

// ❌ Never use raw SQL with user input
// const query = `SELECT * FROM brands WHERE organization_id = '${organizationId}'`;
```

## Performance Optimization

### Image Optimization

**Upload Processing:**
```typescript
// Optimize images on upload
async function optimizeImage(file: File): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const img = new Image();
  
  return new Promise((resolve) => {
    img.onload = () => {
      // Calculate optimal dimensions
      const maxWidth = 2048;
      const maxHeight = 2048;
      
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(resolve, 'image/png', 0.9);
    };
    
    img.src = URL.createObjectURL(file);
  });
}
```

### Caching Strategy

**Browser Caching:**
```typescript
// Set cache headers for brand assets
export async function GET(request: NextRequest) {
  const response = new NextResponse(assetData);
  
  response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  response.headers.set('ETag', assetHash);
  
  return response;
}
```

**Memory Caching:**
```typescript
// Simple brand cache implementation
const brandCache = new Map<string, Brand>();

async function getCachedBrand(organizationId: string): Promise<Brand | null> {
  if (brandCache.has(organizationId)) {
    return brandCache.get(organizationId)!;
  }
  
  const brand = await fetchBrandFromDatabase(organizationId);
  if (brand) {
    brandCache.set(organizationId, brand);
  }
  
  return brand;
}
```

### Bundle Size Optimization

**Code Splitting:**
```typescript
// Lazy load branding components
const BrandingCustomizer = lazy(() => import('@/components/branding/BrandingCustomizer'));

function BrandingPage() {
  return (
    <Suspense fallback={<div>Loading branding tools...</div>}>
      <BrandingCustomizer />
    </Suspense>
  );
}
```

## Monitoring & Analytics

### Performance Monitoring

**Metrics Collection:**
```typescript
// Track branding performance metrics
const performanceMetrics = {
  uploadTime: 0,
  renderTime: 0,
  fileSize: 0,
  errorRate: 0
};

function trackBrandingMetric(metric: keyof typeof performanceMetrics, value: number) {
  performanceMetrics[metric] = value;
  
  // Send to analytics service
  analytics.track('branding_performance', {
    metric,
    value,
    timestamp: Date.now()
  });
}
```

### Error Tracking

**Error Handling:**
```typescript
class BrandingError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'BrandingError';
  }
}

function handleBrandingError(error: Error) {
  console.error('Branding error:', error);
  
  // Send to error tracking service
  errorTracker.captureException(error, {
    tags: { feature: 'branding' },
    extra: error instanceof BrandingError ? error.context : {}
  });
}
```

## Deployment Considerations

### Environment Variables

```bash
# Required environment variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Optional: Storage configuration
SUPABASE_STORAGE_BUCKET=brand-assets
```

### Migration Scripts

**Database Migration:**
```sql
-- Migration: 001_create_branding_tables.sql
BEGIN;

-- Create brands table
CREATE TABLE brands (
  -- Table definition here
);

-- Create brand_assets table  
CREATE TABLE brand_assets (
  -- Table definition here
);

-- Create indexes
-- Index definitions here

-- Enable RLS
-- RLS policies here

COMMIT;
```

### Storage Setup

**Supabase Storage Bucket:**
```sql
-- Create storage bucket for brand assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true);

-- Set up storage policies
CREATE POLICY brand_assets_upload_policy ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'brand-assets' AND
    auth.role() = 'authenticated'
  );
```

## Future Enhancements

### Planned Features

1. **Multi-Brand Support**: Organizations with multiple sub-brands
2. **Brand Templates**: Pre-designed brand templates for quick setup
3. **Advanced Typography**: Custom font uploads and Google Fonts integration
4. **Brand Analytics**: Usage analytics and brand performance metrics
5. **White Label**: Complete white-label solution for enterprise clients

### Technical Roadmap

1. **GraphQL Integration**: Migrate from REST to GraphQL for better query flexibility
2. **Real-time Updates**: WebSocket integration for collaborative brand editing
3. **AI Brand Assistant**: AI-powered brand suggestions and optimization
4. **Advanced Caching**: Implement Redis caching layer for better performance
5. **CDN Integration**: CloudFlare or AWS CloudFront for global asset delivery

---

For technical support or contributions to the branding system, contact the development team or submit pull requests to the main repository.