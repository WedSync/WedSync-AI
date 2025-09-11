// WS-214 Team D: Mobile Vendor Networking System - TypeScript Types

export type ConnectionStatus =
  | 'pending'
  | 'connected'
  | 'declined'
  | 'blocked'
  | 'dormant';
export type ConnectionType =
  | 'professional'
  | 'referral_partner'
  | 'collaboration'
  | 'mentor'
  | 'peer';
export type VisibilityLevel =
  | 'public'
  | 'network_only'
  | 'invite_only'
  | 'private';
export type ReferralStatus =
  | 'sent'
  | 'viewed'
  | 'contacted'
  | 'quoted'
  | 'booked'
  | 'declined'
  | 'expired';
export type ReferralOutcome =
  | 'pending'
  | 'successful'
  | 'unsuccessful'
  | 'no_response'
  | 'not_suitable';
export type MessageType =
  | 'direct'
  | 'referral'
  | 'collaboration'
  | 'system'
  | 'broadcast';

export interface VendorConnection {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: ConnectionStatus;
  connection_type: ConnectionType;
  trust_level: number;
  common_clients_count: number;
  successful_referrals_count: number;
  last_interaction_at?: string;
  initial_message?: string;
  notes?: string;
  requested_at: string;
  connected_at?: string;
  last_updated_at: string;
}

export interface VendorNetworkingProfile {
  vendor_id: string;
  open_to_networking: boolean;
  seeking_referrals: boolean;
  offering_referrals: boolean;
  collaboration_interests: string[];
  networking_goals?: string;
  expertise_keywords: string[];
  looking_for: string[];
  preferred_contact_method: string;
  response_time_hours: number;
  availability_schedule?: Record<string, any>;
  total_connections: number;
  active_connections: number;
  referrals_sent: number;
  referrals_received: number;
  network_score: number;
  profile_visibility: VisibilityLevel;
  auto_accept_connections: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorReferral {
  id: string;
  referring_vendor_id?: string;
  referred_vendor_id?: string;
  client_id: string;
  referral_type: string;
  referral_reason?: string;
  client_requirements?: Record<string, any>;
  status: ReferralStatus;
  contacted_at?: string;
  response_at?: string;
  outcome?: ReferralOutcome;
  conversion_value?: number;
  commission_percentage: number;
  referral_message?: string;
  vendor_response?: string;
  client_feedback?: string;
  created_at: string;
  completed_at?: string;
}

export interface VendorNetworkMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  message_type: MessageType;
  subject?: string;
  content: string;
  attachments?: any[];
  is_read: boolean;
  is_important: boolean;
  thread_id?: string;
  related_project_id?: string;
  related_referral_id?: string;
  sent_at: string;
  read_at?: string;
}

export interface PublicVendorInfo {
  id: string;
  business_name: string;
  primary_category: string;
  secondary_categories?: string[];
  city: string;
  county: string;
  years_in_business?: number;
  team_size?: number;
  featured_image?: string;
  portfolio_images?: any[];
  description: string;
  latitude?: number;
  longitude?: number;
}

export interface NetworkingVendor extends PublicVendorInfo {
  networking_profile?: VendorNetworkingProfile;
  network_score: number;
  total_connections: number;
  relevance_score: number;
  open_to_networking: boolean;
  seeking_referrals: boolean;
  offering_referrals: boolean;
  collaboration_interests: string[];
  expertise_keywords: string[];
}

export interface ConnectionRequest extends VendorConnection {
  other_vendor: PublicVendorInfo;
  perspective: 'sent' | 'received';
}

export interface NetworkingStats {
  total_connections: number;
  pending_requests: number;
  active_referrals: number;
  network_score: number;
  recent_activity: number;
  connections_this_month: number;
  referrals_this_month: number;
  response_rate: number;
}

export interface DiscoveryFilters {
  category?: string;
  location?: string;
  radius?: number;
  seeking?: 'referrals' | 'collaboration' | 'mentorship';
  experience_level?: 'new' | 'established' | 'veteran';
  network_score_min?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface NetworkingApiResponse<T> {
  data?: T;
  error?: string;
  pagination?: PaginationInfo;
}

export interface ConnectionsResponse
  extends NetworkingApiResponse<ConnectionRequest[]> {
  connections: ConnectionRequest[];
}

export interface VendorsDiscoveryResponse
  extends NetworkingApiResponse<NetworkingVendor[]> {
  vendors: NetworkingVendor[];
  filters: DiscoveryFilters;
}

export interface NetworkingProfileResponse
  extends NetworkingApiResponse<VendorNetworkingProfile> {
  profile: VendorNetworkingProfile & {
    vendor: PublicVendorInfo;
  };
}

export interface CreateConnectionRequest {
  recipient_id: string;
  connection_type?: ConnectionType;
  initial_message?: string;
}

export interface UpdateConnectionRequest {
  connection_id: string;
  status: ConnectionStatus;
  notes?: string;
  trust_level?: number;
}

export interface UpdateNetworkingProfileRequest {
  open_to_networking?: boolean;
  seeking_referrals?: boolean;
  offering_referrals?: boolean;
  collaboration_interests?: string[];
  networking_goals?: string;
  expertise_keywords?: string[];
  looking_for?: string[];
  preferred_contact_method?: string;
  response_time_hours?: number;
  availability_schedule?: Record<string, any>;
  profile_visibility?: VisibilityLevel;
  auto_accept_connections?: boolean;
}

// Utility types for React components
export interface MobileNetworkingProps {
  className?: string;
  onConnect?: (vendorId: string) => Promise<void>;
  onMessage?: (vendorId: string) => void;
  onViewProfile?: (vendorId: string) => void;
}

export interface ConnectionCardProps extends MobileNetworkingProps {
  connection: ConnectionRequest;
  onAccept?: (connectionId: string) => Promise<void>;
  onDecline?: (connectionId: string) => Promise<void>;
}

export interface VendorDiscoveryProps extends MobileNetworkingProps {
  filters?: DiscoveryFilters;
  onFiltersChange?: (filters: DiscoveryFilters) => void;
}

// API Error types
export interface NetworkingApiError {
  error: string;
  code?: string;
  details?: Record<string, any>;
}

// Hook return types
export interface UseVendorNetworkingReturn {
  connections: ConnectionRequest[];
  stats: NetworkingStats | null;
  profile: VendorNetworkingProfile | null;
  loading: boolean;
  error: string | null;
  refreshConnections: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  connectToVendor: (request: CreateConnectionRequest) => Promise<void>;
  updateConnection: (request: UpdateConnectionRequest) => Promise<void>;
  updateProfile: (request: UpdateNetworkingProfileRequest) => Promise<void>;
}

export interface UseVendorDiscoveryReturn {
  vendors: NetworkingVendor[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  filters: DiscoveryFilters;
  searchVendors: (filters?: DiscoveryFilters) => Promise<void>;
  loadMore: () => Promise<void>;
  connectToVendor: (
    vendorId: string,
    connectionType?: ConnectionType,
  ) => Promise<void>;
}

// Constants
export const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  professional: 'Professional',
  referral_partner: 'Referral Partner',
  collaboration: 'Collaboration',
  mentor: 'Mentor',
  peer: 'Peer',
};

export const CONNECTION_STATUS_LABELS: Record<ConnectionStatus, string> = {
  pending: 'Pending',
  connected: 'Connected',
  declined: 'Declined',
  blocked: 'Blocked',
  dormant: 'Dormant',
};

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  sent: 'Sent',
  viewed: 'Viewed',
  contacted: 'Contacted',
  quoted: 'Quoted',
  booked: 'Booked',
  declined: 'Declined',
  expired: 'Expired',
};

export const WEDDING_VENDOR_CATEGORIES = [
  'Photography',
  'Videography',
  'Venue',
  'Catering',
  'Florist',
  'Music',
  'DJ',
  'Band',
  'Makeup',
  'Hair',
  'Planning',
  'Coordination',
  'Transport',
  'Car Hire',
  'Cake',
  'Bakery',
  'Stationery',
  'Favours',
  'Decor',
  'Lighting',
  'Entertainment',
  'Photo Booth',
  'Security',
  'Cleaners',
  'Other',
] as const;

export type VendorCategory = (typeof WEDDING_VENDOR_CATEGORIES)[number];

// Validation schemas (for use with libraries like zod if needed)
export const CONNECTION_REQUEST_SCHEMA = {
  recipient_id: 'required|uuid',
  connection_type:
    'optional|in:professional,referral_partner,collaboration,mentor,peer',
  initial_message: 'optional|string|max:1000',
};

export const UPDATE_PROFILE_SCHEMA = {
  open_to_networking: 'optional|boolean',
  seeking_referrals: 'optional|boolean',
  offering_referrals: 'optional|boolean',
  collaboration_interests: 'optional|array',
  networking_goals: 'optional|string|max:500',
  expertise_keywords: 'optional|array',
  looking_for: 'optional|array',
  preferred_contact_method: 'optional|string|max:50',
  response_time_hours: 'optional|integer|min:1|max:168',
  profile_visibility: 'optional|in:public,network_only,invite_only,private',
  auto_accept_connections: 'optional|boolean',
};
