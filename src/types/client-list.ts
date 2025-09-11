// Client list types for WS-031 feature
export type ViewType = 'list' | 'grid' | 'calendar' | 'kanban';

export interface ClientData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  partner_first_name: string | null;
  partner_last_name: string | null;
  email: string | null;
  phone: string | null;
  wedding_date: string | null;
  venue_name: string | null;
  status: 'lead' | 'booked' | 'completed' | 'archived';
  package_name: string | null;
  package_price: number | null;
  is_wedme_connected: boolean;
  created_at: string;
  updated_at?: string;
  organization_id?: string;
  client_activities?: Array<{
    id: string;
    activity_type: string;
    created_at: string;
  }>;
  tags?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  notes?: Array<{
    id: string;
    content: string;
    created_at: string;
  }>;
}

export interface FilterConfig {
  status: string[];
  tags: string[];
  dateRange: {
    start?: string;
    end?: string;
  };
  hasWedMe?: boolean;
  venue?: string;
  package?: string;
}

export interface SortConfig {
  field: keyof ClientData;
  direction: 'asc' | 'desc';
}

export interface BulkOperation {
  type: 'status' | 'tags' | 'delete' | 'export';
  clientIds: string[];
  payload?: any;
}

export interface ClientListMetrics {
  totalClients: number;
  leadCount: number;
  bookedCount: number;
  completedCount: number;
  archivedCount: number;
  connectedCount: number;
  totalRevenue: number;
  averagePackagePrice: number;
  upcomingWeddings: number;
}

export interface ClientActivity {
  id: string;
  client_id: string;
  activity_type:
    | 'email_sent'
    | 'email_received'
    | 'note_added'
    | 'status_changed'
    | 'wedme_connected'
    | 'package_selected';
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
  created_by?: string;
}
