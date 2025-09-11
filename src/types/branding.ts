/**
 * Branding Customization Types for WedSync
 * Defines the data structures for supplier branding functionality
 */

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

export interface BrandPreview {
  brand: Brand;
  previewUrl?: string;
  cssVariables: Record<string, string>;
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

export interface BrandSettings {
  showLogo: boolean;
  logoPosition: 'top-left' | 'top-center' | 'top-right';
  showBrandName: boolean;
  customFavicon: boolean;
  brandedEmails: boolean;
  customDomain?: string;
}

export interface BrandUploadResponse {
  success: boolean;
  asset?: BrandAsset;
  error?: string;
}

export interface BrandValidationError {
  field: string;
  message: string;
}

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

// Font family options for branding
export const BRAND_FONT_FAMILIES = [
  'Inter',
  'Roboto',
  'Poppins',
  'Montserrat',
  'Playfair Display',
  'Lato',
  'Open Sans',
  'Nunito',
  'Source Sans Pro',
  'Merriweather',
] as const;

export type BrandFontFamily = (typeof BRAND_FONT_FAMILIES)[number];

// Color validation regex
export const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

// File upload constraints
export const BRAND_ASSET_CONSTRAINTS = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
  maxDimensions: { width: 2048, height: 2048 },
  minDimensions: { width: 32, height: 32 },
} as const;
