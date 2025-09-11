import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface EmailServiceRequest {
  action: 'send_email' | 'test_template' | 'get_status' | 'get_analytics';
  template_id?: string;
  recipient?: {
    email: string;
    name?: string;
  };
  variables?: Record<string, any>;
  sender?: {
    email: string;
    name: string;
  };
  reply_to?: string;
  cc?: string[];
  bcc?: string[];
  priority?: 'low' | 'normal' | 'high';
  delivery_time?: string;
  track_opens?: boolean;
  track_clicks?: boolean;
  attachments?: Array<{
    filename: string;
    content_type: string;
    content: string;
  }>;
  sample_data?: Record<string, any>;
  journey_id?: string;
  start_date?: string;
  end_date?: string;
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: EmailServiceRequest = await req.json();

    switch (requestData.action) {
      case 'send_email':
        return await handleSendEmail(requestData);
      
      case 'test_template':
        return await handleTestTemplate(requestData);
      
      case 'get_status':
        return await handleGetStatus();
      
      case 'get_analytics':
        return await handleGetAnalytics(requestData);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Email service error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleSendEmail(request: EmailServiceRequest) {
  if (!request.template_id || !request.recipient) {
    throw new Error('Missing required fields: template_id and recipient');
  }

  // Get template
  const { data: template, error: templateError } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', request.template_id)
    .eq('is_active', true)
    .single();

  if (templateError || !template) {
    throw new Error(`Template not found: ${request.template_id}`);
  }

  // Replace variables in template
  const processedSubject = replaceVariables(template.subject_template, request.variables || {});
  const processedHtml = replaceVariables(template.html_template, request.variables || {});
  const processedText = template.text_template ? 
    replaceVariables(template.text_template, request.variables || {}) : undefined;

  // Send via Resend
  const resendPayload: any = {
    from: request.sender ? 
      `${request.sender.name} <${request.sender.email}>` : 
      `${Deno.env.get('DEFAULT_SENDER_NAME') || 'WedSync'} <${Deno.env.get('DEFAULT_SENDER_EMAIL') || 'noreply@wedsync.co'}>`,
    to: [`${request.recipient.name || ''} <${request.recipient.email}>`.trim()],
    subject: processedSubject,
    html: processedHtml,
    text: processedText,
    reply_to: request.reply_to,
    cc: request.cc,
    bcc: request.bcc,
    attachments: request.attachments?.map(att => ({
      filename: att.filename,
      content_type: att.content_type,
      content: att.content
    })),
    headers: {
      'X-Priority': request.priority === 'high' ? '1' : request.priority === 'low' ? '5' : '3'
    }
  };

  if (request.track_opens !== false) {
    resendPayload.headers['X-Track-Opens'] = 'true';
  }
  if (request.track_clicks !== false) {
    resendPayload.headers['X-Track-Links'] = 'true';
  }

  // Schedule for future delivery if specified
  if (request.delivery_time && new Date(request.delivery_time) > new Date()) {
    resendPayload.scheduled_at = request.delivery_time;
  }

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(resendPayload)
  });

  if (!resendResponse.ok) {
    const error = await resendResponse.json();
    throw new Error(`Resend API error: ${error.message || resendResponse.statusText}`);
  }

  const resendData = await resendResponse.json();

  return new Response(JSON.stringify({
    message_id: resendData.id,
    status: resendData.scheduled_at ? 'scheduled' : 'sent',
    delivery_timestamp: new Date().toISOString(),
    tracking_id: resendData.id
  }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200
  });
}

async function handleTestTemplate(request: EmailServiceRequest) {
  if (!request.template_id || !request.sample_data) {
    throw new Error('Missing required fields: template_id and sample_data');
  }

  // Get template
  const { data: template, error: templateError } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', request.template_id)
    .single();

  if (templateError || !template) {
    throw new Error(`Template not found: ${request.template_id}`);
  }

  // Process template with sample data
  const processedSubject = replaceVariables(template.subject_template, request.sample_data);
  const processedHtml = replaceVariables(template.html_template, request.sample_data);
  const processedText = template.text_template ? 
    replaceVariables(template.text_template, request.sample_data) : undefined;

  // Find used and missing variables
  const variablesUsed = extractVariables(template.subject_template)
    .concat(extractVariables(template.html_template))
    .concat(template.text_template ? extractVariables(template.text_template) : []);

  const uniqueVariables = [...new Set(variablesUsed)];
  const providedVariables = Object.keys(request.sample_data);
  const missingVariables = uniqueVariables.filter(v => !providedVariables.includes(v));

  return new Response(JSON.stringify({
    subject: processedSubject,
    html: processedHtml,
    text: processedText,
    variables_used: uniqueVariables,
    missing_variables: missingVariables
  }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200
  });
}

async function handleGetStatus() {
  // Get basic service status
  const isConfigured = !!resendApiKey;
  
  // Get usage stats from database
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  const [
    { count: dailySent },
    { count: monthlySent }
  ] = await Promise.all([
    supabase
      .from('email_deliveries')
      .select('id', { count: 'exact', head: true })
      .gte('sent_at', today),
    supabase
      .from('email_deliveries')
      .select('id', { count: 'exact', head: true })
      .gte('sent_at', thisMonth)
  ]);

  return new Response(JSON.stringify({
    provider: 'resend',
    is_configured: isConfigured,
    daily_quota: 100, // Adjust based on your Resend plan
    daily_sent: dailySent || 0,
    monthly_quota: 3000, // Adjust based on your Resend plan
    monthly_sent: monthlySent || 0
  }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200
  });
}

async function handleGetAnalytics(request: EmailServiceRequest) {
  let query = supabase
    .from('delivery_events')
    .select('event_type, message_id')
    .eq('message_type', 'email');

  if (request.journey_id) {
    query = query.eq('journey_id', request.journey_id);
  }
  if (request.start_date) {
    query = query.gte('timestamp', request.start_date);
  }
  if (request.end_date) {
    query = query.lte('timestamp', request.end_date);
  }

  const { data: events } = await query;

  const metrics = {
    total_sent: 0,
    total_delivered: 0,
    total_opened: 0,
    total_clicked: 0,
    total_bounced: 0
  };

  const uniqueMessages = new Set<string>();

  events?.forEach(event => {
    if (event.event_type === 'sent') {
      if (!uniqueMessages.has(event.message_id)) {
        metrics.total_sent++;
        uniqueMessages.add(event.message_id);
      }
    } else if (event.event_type === 'delivered') {
      metrics.total_delivered++;
    } else if (event.event_type === 'opened') {
      metrics.total_opened++;
    } else if (event.event_type === 'clicked') {
      metrics.total_clicked++;
    } else if (event.event_type === 'bounced') {
      metrics.total_bounced++;
    }
  });

  const deliveryRate = metrics.total_sent > 0 ? 
    (metrics.total_delivered / metrics.total_sent) * 100 : 0;
  const openRate = metrics.total_delivered > 0 ? 
    (metrics.total_opened / metrics.total_delivered) * 100 : 0;
  const clickRate = metrics.total_opened > 0 ? 
    (metrics.total_clicked / metrics.total_opened) * 100 : 0;
  const bounceRate = metrics.total_sent > 0 ? 
    (metrics.total_bounced / metrics.total_sent) * 100 : 0;

  return new Response(JSON.stringify({
    ...metrics,
    delivery_rate: Math.round(deliveryRate * 100) / 100,
    open_rate: Math.round(openRate * 100) / 100,
    click_rate: Math.round(clickRate * 100) / 100,
    bounce_rate: Math.round(bounceRate * 100) / 100
  }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200
  });
}

function replaceVariables(template: string, variables: Record<string, any>): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{${key}}`, 'g');
    result = result.replace(regex, String(value));
  });
  return result;
}

function extractVariables(template: string): string[] {
  const matches = template.match(/{(\w+)}/g);
  return matches ? matches.map(match => match.slice(1, -1)) : [];
}