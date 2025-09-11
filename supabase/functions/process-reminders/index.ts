// WS-084: Automated Reminder Processing Engine
// Processes queued reminders and sends notifications via email/SMS

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@4'

// Types
interface QueuedReminder {
  id: string
  schedule_id: string
  organization_id: string
  scheduled_for: string
  priority: number
  resolved_subject?: string
  resolved_email_content?: string
  resolved_sms_content?: string
  recipients: ReminderRecipient[]
  attempts: number
}

interface ReminderRecipient {
  id: string
  type: 'client' | 'vendor' | 'team' | 'couple'
  email?: string
  phone?: string
  name?: string
}

interface ReminderSchedule {
  id: string
  template_id: string
  entity_type: string
  entity_id: string
  entity_name: string
  send_email: boolean
  send_sms: boolean
  metadata: any
}

interface ReminderTemplate {
  id: string
  subject_template: string
  email_template: string
  sms_template: string
  variables: string[]
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const resend = new Resend(Deno.env.get('RESEND_API_KEY') ?? '')

Deno.serve(async (req) => {
  try {
    console.log('🔄 Starting reminder processing...')

    // Get pending reminders from queue (limit to 50 per run)
    const { data: queuedReminders, error: queueError } = await supabase
      .from('reminder_queue')
      .select('*')
      .eq('status', 'processing')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: true })
      .order('scheduled_for', { ascending: true })
      .limit(50)

    if (queueError) {
      throw new Error(`Failed to fetch queued reminders: ${queueError.message}`)
    }

    if (!queuedReminders || queuedReminders.length === 0) {
      console.log('✅ No reminders to process')
      return new Response(JSON.stringify({ 
        success: true, 
        processed: 0, 
        message: 'No reminders to process' 
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    }

    console.log(`📋 Found ${queuedReminders.length} reminders to process`)

    let processed = 0
    let errors: string[] = []

    // Process each reminder
    for (const reminder of queuedReminders) {
      try {
        await processReminder(reminder as QueuedReminder)
        processed++
        console.log(`✅ Processed reminder ${reminder.id}`)
      } catch (error) {
        const errorMsg = `Failed to process reminder ${reminder.id}: ${error.message}`
        console.error(`❌ ${errorMsg}`)
        errors.push(errorMsg)
        
        // Update queue item with error
        await supabase
          .from('reminder_queue')
          .update({
            status: 'failed',
            error_message: error.message,
            attempts: reminder.attempts + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', reminder.id)
      }
    }

    console.log(`🏁 Completed processing: ${processed} successful, ${errors.length} errors`)

    return new Response(JSON.stringify({
      success: true,
      processed,
      errors: errors.length,
      errorMessages: errors
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('💥 Fatal error in reminder processing:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

async function processReminder(queuedReminder: QueuedReminder) {
  console.log(`🔄 Processing reminder ${queuedReminder.id}`)

  // Get the reminder schedule and template data
  const { data: schedule, error: scheduleError } = await supabase
    .from('reminder_schedules')
    .select(`
      *,
      reminder_templates (
        id,
        subject_template,
        email_template,
        sms_template,
        variables
      )
    `)
    .eq('id', queuedReminder.schedule_id)
    .single()

  if (scheduleError || !schedule) {
    throw new Error(`Failed to fetch reminder schedule: ${scheduleError?.message}`)
  }

  const template = schedule.reminder_templates as ReminderTemplate

  // Resolve template variables if not already resolved
  let resolvedSubject = queuedReminder.resolved_subject
  let resolvedEmailContent = queuedReminder.resolved_email_content
  let resolvedSmsContent = queuedReminder.resolved_sms_content

  if (!resolvedSubject || !resolvedEmailContent || !resolvedSmsContent) {
    const templateData = await getTemplateData(schedule as ReminderSchedule)
    
    resolvedSubject = resolveTemplate(template.subject_template, templateData)
    resolvedEmailContent = resolveTemplate(template.email_template, templateData)
    resolvedSmsContent = resolveTemplate(template.sms_template, templateData)

    // Update queue with resolved content
    await supabase
      .from('reminder_queue')
      .update({
        resolved_subject: resolvedSubject,
        resolved_email_content: resolvedEmailContent,
        resolved_sms_content: resolvedSmsContent
      })
      .eq('id', queuedReminder.id)
  }

  // Send notifications to each recipient
  for (const recipient of queuedReminder.recipients) {
    try {
      // Send email if enabled and recipient has email
      if (schedule.send_email && recipient.email && resolvedEmailContent) {
        await sendEmail({
          to: recipient.email,
          subject: resolvedSubject,
          content: resolvedEmailContent,
          recipientName: recipient.name || ''
        })

        // Record in history
        await recordReminderHistory({
          scheduleId: queuedReminder.schedule_id,
          queueId: queuedReminder.id,
          organizationId: queuedReminder.organization_id,
          channel: 'email',
          subject: resolvedSubject,
          content: resolvedEmailContent,
          recipient,
          provider: 'resend'
        })
      }

      // Send SMS if enabled and recipient has phone
      if (schedule.send_sms && recipient.phone && resolvedSmsContent) {
        await sendSMS({
          to: recipient.phone,
          content: resolvedSmsContent
        })

        // Record in history
        await recordReminderHistory({
          scheduleId: queuedReminder.schedule_id,
          queueId: queuedReminder.id,
          organizationId: queuedReminder.organization_id,
          channel: 'sms',
          subject: resolvedSubject,
          content: resolvedSmsContent,
          recipient,
          provider: 'twilio'
        })
      }

    } catch (error) {
      console.error(`Failed to send to recipient ${recipient.id}:`, error)
      // Continue processing other recipients
    }
  }

  // Mark queue item as completed
  await supabase
    .from('reminder_queue')
    .update({
      status: 'completed',
      processing_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', queuedReminder.id)

  // Update reminder schedule status and handle recurrence
  if (schedule.is_recurring && schedule.recurrence_pattern) {
    await handleRecurringReminder(schedule as ReminderSchedule)
  } else {
    // Mark one-time reminder as sent
    await supabase
      .from('reminder_schedules')
      .update({
        status: 'sent',
        updated_at: new Date().toISOString()
      })
      .eq('id', queuedReminder.schedule_id)
  }

  console.log(`✅ Successfully processed reminder ${queuedReminder.id}`)
}

async function getTemplateData(schedule: ReminderSchedule): Promise<Record<string, any>> {
  // Fetch relevant data based on entity type
  let entityData: any = {}

  try {
    switch (schedule.entity_type) {
      case 'payment':
        // Fetch payment/invoice data
        const { data: payment } = await supabase
          .from('payment_schedules')
          .select('*')
          .eq('id', schedule.entity_id)
          .single()
        
        entityData = {
          amount: payment?.amount ? `$${payment.amount}` : '$0.00',
          serviceName: payment?.description || schedule.entity_name,
          dueDate: payment?.due_date ? new Date(payment.due_date).toLocaleDateString() : 'TBD'
        }
        break

      case 'milestone':
        entityData = {
          milestoneName: schedule.entity_name,
          milestoneDescription: schedule.metadata?.description || 'Wedding milestone approaching',
          daysRemaining: Math.max(0, Math.ceil((new Date(schedule.metadata?.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
          todoItems: schedule.metadata?.todos ? schedule.metadata.todos.map((item: string) => `<li>${item}</li>`).join('') : ''
        }
        break

      case 'vendor_task':
      case 'couple_task':
        entityData = {
          taskName: schedule.entity_name,
          taskDescription: schedule.metadata?.description || 'Task details',
          dueDate: schedule.metadata?.due_date ? new Date(schedule.metadata.due_date).toLocaleDateString() : 'TBD'
        }
        break

      default:
        entityData = {
          itemName: schedule.entity_name,
          description: schedule.metadata?.description || 'Item description',
          dueDate: schedule.metadata?.due_date ? new Date(schedule.metadata.due_date).toLocaleDateString() : 'TBD'
        }
    }

    // Get recipient data
    if (schedule.metadata?.recipient_id) {
      const { data: recipient } = await supabase
        .from('contacts')
        .select('first_name, last_name, email, phone')
        .eq('id', schedule.metadata.recipient_id)
        .single()

      if (recipient) {
        entityData.clientName = `${recipient.first_name} ${recipient.last_name}`.trim()
        entityData.coupleName = entityData.clientName
        entityData.vendorName = entityData.clientName
      }
    }

    return entityData

  } catch (error) {
    console.error('Error fetching template data:', error)
    return {
      clientName: 'Valued Client',
      coupleName: 'Valued Client',
      vendorName: 'Valued Vendor',
      itemName: schedule.entity_name,
      dueDate: 'TBD'
    }
  }
}

function resolveTemplate(template: string, data: Record<string, any>): string {
  if (!template) return ''
  
  let resolved = template
  
  // Replace template variables like {variableName}
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`\\{${key}\\}`, 'g')
    resolved = resolved.replace(regex, String(data[key] || ''))
  })
  
  return resolved
}

async function sendEmail({ to, subject, content, recipientName }: {
  to: string
  subject: string
  content: string
  recipientName: string
}) {
  try {
    const result = await resend.emails.send({
      from: Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@wedsync.com',
      to: [to],
      subject,
      html: content,
      replyTo: Deno.env.get('RESEND_REPLY_TO') || 'support@wedsync.com'
    })

    console.log(`📧 Email sent to ${to}:`, result.data?.id)
    return result.data?.id

  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error)
    throw error
  }
}

async function sendSMS({ to, content }: { to: string, content: string }) {
  try {
    // Use existing SMS service integration
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: {
        to,
        message: content,
        type: 'reminder'
      }
    })

    if (error) throw error

    console.log(`📱 SMS sent to ${to}`)
    return data?.id

  } catch (error) {
    console.error(`Failed to send SMS to ${to}:`, error)
    throw error
  }
}

async function recordReminderHistory({
  scheduleId,
  queueId,
  organizationId,
  channel,
  subject,
  content,
  recipient,
  provider
}: {
  scheduleId: string
  queueId: string
  organizationId: string
  channel: string
  subject: string
  content: string
  recipient: ReminderRecipient
  provider: string
}) {
  const { error } = await supabase
    .from('reminder_history')
    .insert({
      schedule_id: scheduleId,
      queue_id: queueId,
      organization_id: organizationId,
      subject,
      content,
      channel,
      recipient_id: recipient.id,
      recipient_email: recipient.email,
      recipient_phone: recipient.phone,
      recipient_name: recipient.name,
      provider,
      sent_at: new Date().toISOString()
    })

  if (error) {
    console.error('Failed to record reminder history:', error)
  }
}

async function handleRecurringReminder(schedule: ReminderSchedule) {
  // Calculate next occurrence based on recurrence pattern
  let nextTriggerDate: Date

  const currentDate = new Date(schedule.trigger_date)
  
  switch (schedule.recurrence_pattern) {
    case 'daily':
      nextTriggerDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
      break
    case 'weekly':
      nextTriggerDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000)
      break
    case 'monthly':
      nextTriggerDate = new Date(currentDate)
      nextTriggerDate.setMonth(nextTriggerDate.getMonth() + 1)
      break
    default:
      console.log(`Unknown recurrence pattern: ${schedule.recurrence_pattern}`)
      return
  }

  // Check if recurrence should end
  if (schedule.recurrence_end && nextTriggerDate > new Date(schedule.recurrence_end)) {
    await supabase
      .from('reminder_schedules')
      .update({ status: 'completed' })
      .eq('id', schedule.id)
    return
  }

  // Update schedule with next trigger date
  await supabase
    .from('reminder_schedules')
    .update({
      trigger_date: nextTriggerDate.toISOString(),
      status: 'scheduled'
    })
    .eq('id', schedule.id)

  console.log(`🔄 Scheduled next occurrence for ${nextTriggerDate.toISOString()}`)
}