// WS-084: SMS Notification Edge Function
// Handles SMS sending for automated reminders

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface SMSRequest {
  to: string
  message: string
  type?: 'reminder' | 'notification' | 'alert'
  organizationId?: string
  metadata?: Record<string, any>
}

interface TwilioResponse {
  sid: string
  status: string
  to: string
  from: string
  body: string
  errorCode?: string
  errorMessage?: string
}

Deno.serve(async (req) => {
  try {
    // Parse request body
    const body = await req.json() as SMSRequest

    if (!body.to || !body.message) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: to, message'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400
      })
    }

    console.log(`📱 Sending SMS to ${body.to}`)

    // Send SMS via Twilio
    const result = await sendSMS({
      to: body.to,
      message: body.message,
      type: body.type || 'notification'
    })

    // Log SMS sending
    if (body.organizationId) {
      await logSMSSending({
        organizationId: body.organizationId,
        recipient: body.to,
        message: body.message,
        type: body.type || 'notification',
        status: result.status,
        providerId: result.sid,
        errorMessage: result.errorMessage,
        metadata: body.metadata
      })
    }

    console.log(`✅ SMS sent successfully: ${result.sid}`)

    return new Response(JSON.stringify({
      success: true,
      id: result.sid,
      status: result.status,
      to: result.to
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('❌ SMS sending failed:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

async function sendSMS({ to, message, type }: {
  to: string
  message: string
  type: string
}): Promise<TwilioResponse> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

  if (!accountSid || !authToken || !fromNumber) {
    // Simulate SMS sending for development
    console.warn('⚠️ Twilio not configured - simulating SMS send')
    console.log('Would send SMS:', { to, message: message.substring(0, 50) + '...' })
    
    return {
      sid: `SIM${Date.now()}`,
      status: 'delivered',
      to,
      from: fromNumber || '+15551234567',
      body: message
    }
  }

  // Validate phone number format
  const cleanPhone = cleanPhoneNumber(to)
  if (!isValidPhoneNumber(cleanPhone)) {
    throw new Error(`Invalid phone number format: ${to}`)
  }

  // Create Twilio client
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const credentials = btoa(`${accountSid}:${authToken}`)

  // Prepare message body
  const params = new URLSearchParams({
    To: cleanPhone,
    From: fromNumber,
    Body: message
  })

  // Send SMS via Twilio API
  const response = await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(`Twilio API error: ${result.message || 'Unknown error'}`)
  }

  return {
    sid: result.sid,
    status: result.status,
    to: result.to,
    from: result.from,
    body: result.body,
    errorCode: result.error_code,
    errorMessage: result.error_message
  }
}

async function logSMSSending({
  organizationId,
  recipient,
  message,
  type,
  status,
  providerId,
  errorMessage,
  metadata
}: {
  organizationId: string
  recipient: string
  message: string
  type: string
  status: string
  providerId: string
  errorMessage?: string
  metadata?: Record<string, any>
}) {
  try {
    const { error } = await supabase
      .from('sms_messages')
      .insert({
        organization_id: organizationId,
        recipient_phone: recipient,
        message,
        status,
        provider: 'twilio',
        provider_id: providerId,
        type,
        error_message: errorMessage,
        metadata: metadata || {},
        sent_at: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to log SMS sending:', error)
    }
  } catch (error) {
    console.error('Error logging SMS:', error)
  }
}

function cleanPhoneNumber(phone: string): string {
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '')
  
  // If starts with 1 and is 11 digits, add +
  if (cleaned.match(/^1\d{10}$/)) {
    cleaned = '+' + cleaned
  }
  // If 10 digits and no +, assume US number
  else if (cleaned.match(/^\d{10}$/)) {
    cleaned = '+1' + cleaned
  }
  // If doesn't start with +, add it
  else if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned
  }
  
  return cleaned
}

function isValidPhoneNumber(phone: string): boolean {
  // Basic validation for E.164 format
  const e164Regex = /^\+[1-9]\d{1,14}$/
  return e164Regex.test(phone)
}

// Add CORS headers for local development
function addCorsHeaders(response: Response): Response {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}