import { createClient } from '@/lib/supabase/client';

export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  subcategory?: string;
  tags: string[];
  is_active: boolean;
  is_wedding_specific: boolean;
  urgency_level: 'low' | 'medium' | 'high' | 'critical' | 'wedding_day';
  requires_personalization: boolean;
  variables: ResponseVariable[];
  usage_count: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ResponseVariable {
  name: string;
  description: string;
  type: 'text' | 'date' | 'number' | 'email' | 'phone' | 'select';
  required: boolean;
  default_value?: string;
  select_options?: string[];
  placeholder?: string;
}

export interface ResponseSuggestion {
  response: CannedResponse;
  relevance_score: number;
  match_reasons: string[];
  suggested_variables?: Record<string, string>;
}

export interface TicketContext {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  priority: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  wedding_date?: string;
  days_until_wedding?: number;
  tags: string[];
  ai_sentiment?: 'positive' | 'neutral' | 'negative';
  organization_id: string;
}

export class ResponseManager {
  private supabase = createClient();

  // Wedding-specific canned responses templates
  private readonly WEDDING_RESPONSES: Partial<CannedResponse>[] = [
    {
      title: "Wedding Day Emergency Response",
      content: `Hi {{customer_name}},

I understand this is urgent as your wedding is {{wedding_urgency}}! I'm here to help resolve this immediately.

I've marked your ticket as a wedding day emergency and you'll have our fastest response time. 

{{emergency_action}}

I'll personally monitor this issue and keep you updated every step of the way.

