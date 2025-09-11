// Next.js 15 Page and Route Types (CRITICAL FIX FOR PARAMS PROMISE ISSUE)
import { ReactNode } from 'react';

// Page Props for Next.js 15 App Router (NEW: params are now Promise-based)
export interface PageProps {
  params: Promise<{ [key: string]: string | string[] | undefined }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Specific page props for common patterns
export interface ClientPageProps {
  params: Promise<{ id: string }>;
}

export interface VendorPageProps {
  params: Promise<{ id: string }>;
}

export interface FormPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session?: string }>;
}

export interface JourneyPageProps {
  params: Promise<{ executionId: string }>;
}

export interface SupplierPageProps {
  params: Promise<{ id: string }>;
}

export interface MessagePageProps {
  params: Promise<{ id: string }>;
}

export interface FormSyncPageProps {
  params: Promise<{ id: string }>;
}

// Layout Props for Next.js 15
export interface LayoutProps {
  children: ReactNode;
  params: Promise<{ [key: string]: string | string[] | undefined }>;
}

// API Route Context for Next.js 15 (NEW: params in context are Promise-based)
export interface RouteContext {
  params: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Specific API route contexts
export interface ClientRouteContext {
  params: Promise<{ id: string }>;
}

export interface VendorRouteContext {
  params: Promise<{ id: string }>;
}

export interface FormRouteContext {
  params: Promise<{ id: string }>;
}

export interface JourneyRouteContext {
  params: Promise<{ executionId: string }>;
}

export interface SupplierRouteContext {
  params: Promise<{ id: string }>;
}

export interface MessageRouteContext {
  params: Promise<{ id: string }>;
}

// Helper type for API route handlers with proper Next.js 15 typing
export type ApiRouteHandler<T = unknown> = (
  request: Request,
  context: RouteContext,
) => Promise<Response>;

// Specific API handlers
export type ClientApiHandler<T = unknown> = (
  request: Request,
  context: ClientRouteContext,
) => Promise<Response>;

export type VendorApiHandler<T = unknown> = (
  request: Request,
  context: VendorRouteContext,
) => Promise<Response>;

export type FormApiHandler<T = unknown> = (
  request: Request,
  context: FormRouteContext,
) => Promise<Response>;

export type JourneyApiHandler<T = unknown> = (
  request: Request,
  context: JourneyRouteContext,
) => Promise<Response>;

export type SupplierApiHandler<T = unknown> = (
  request: Request,
  context: SupplierRouteContext,
) => Promise<Response>;

export type MessageApiHandler<T = unknown> = (
  request: Request,
  context: MessageRouteContext,
) => Promise<Response>;

// Utility types for working with Promise-based params
export type AwaitedParams<T extends Promise<any>> = Awaited<T>;

// Helper function types for extracting params safely
export type ParamExtractor<T> = (params: Promise<T>) => Promise<T>;

// Common param validation patterns
export interface ParamValidationResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
}

export type ValidateParams<T> = (params: T) => ParamValidationResult<T>;

// Dynamic route param types
export type DynamicRouteParams = {
  [key: string]: string | string[] | undefined;
};

// Metadata generation types for Next.js 15
export interface MetadataProps {
  params: Promise<DynamicRouteParams>;
  searchParams: Promise<DynamicRouteParams>;
}

// Server component props
export interface ServerComponentProps {
  params: Promise<DynamicRouteParams>;
  searchParams: Promise<DynamicRouteParams>;
  children?: ReactNode;
}

// Client component props (these don't get params directly)
export interface ClientComponentProps {
  children?: ReactNode;
  className?: string;
}
