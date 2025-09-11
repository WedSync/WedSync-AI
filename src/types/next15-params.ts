/**
 * Next.js 15 Async Params Type Definitions
 * Critical: All params are now Promise-based in Next.js 15
 */

// Base types for Next.js 15 async params
export interface AsyncPageProps {
  params: Promise<Record<string, string | string[]>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Specific page prop types
export interface DynamicPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export interface FormBuilderPageProps {
  params: Promise<Record<string, never>>; // No dynamic segments
  searchParams: Promise<{
    template?: string;
    mode?: string;
    [key: string]: string | string[] | undefined;
  }>;
}

// API Route types for Next.js 15
export interface AsyncAPIRouteContext {
  params: Promise<Record<string, string | string[]>>;
}

export interface DynamicAPIRouteContext {
  params: Promise<{ id: string }>;
}

// Layout props for Next.js 15
export interface RootLayoutProps {
  children: React.ReactNode;
  params: Promise<Record<string, never>>;
}

// Utility type to extract params safely
export type AwaitedParams<T> = T extends Promise<infer U> ? U : never;

// Helper function for type-safe param extraction
export async function extractParams<T>(params: Promise<T>): Promise<T> {
  return await params;
}

// Helper function for search params extraction
export async function extractSearchParams<T>(
  searchParams: Promise<T>,
): Promise<T> {
  return await searchParams;
}

// Specific route param types
export interface SlugPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export interface ExecutionIdAPIRouteContext {
  params: Promise<{ executionId: string }>;
}

// Multi-level dynamic route types
export interface ClientEditPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export interface VendorPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export interface PDFMappingPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    step?: string;
    [key: string]: string | string[] | undefined;
  }>;
}
