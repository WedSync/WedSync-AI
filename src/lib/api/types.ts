/**
 * API Types and Interfaces
 * Shared types for API routes and middleware
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  details?: any;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId?: string;
  role?: 'admin' | 'user' | 'vendor';
  tier?: 'free' | 'starter' | 'professional' | 'scale' | 'enterprise';
  permissions?: string[];
}

export interface RouteContext {
  user: AuthenticatedUser;
  params?: Record<string, string>;
  searchParams?: URLSearchParams;
  headers?: Record<string, string>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  category?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ListResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters?: FilterParams;
  sort?: SortParams;
}

// Wedding-specific types
export interface WeddingContext {
  weddingId: string;
  weddingDate: string;
  guestCount: number;
  venue?: {
    id: string;
    name: string;
    capacity: number;
  };
  couple: {
    partner1: string;
    partner2: string;
  };
}

// Music API specific types
export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  genres: string[];
  explicit: boolean;
  spotifyId?: string;
  previewUrl?: string;
}

export interface PlaylistGeneration {
  weddingId: string;
  theme?: string;
  genres: string[];
  mood: 'romantic' | 'upbeat' | 'elegant' | 'mixed';
  duration: number; // in minutes
  excludeExplicit: boolean;
}

// Form and validation types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface BulkOperationResult<T> {
  successful: T[];
  failed: Array<{
    item: T;
    error: string;
    code: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// Rate limiting types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// Error response structure
export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}
