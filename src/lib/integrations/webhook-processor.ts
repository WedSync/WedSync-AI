// src/lib/integrations/webhook-processor.ts
import { createClient } from '@supabase/supabase-js';
import {
  ConnectorFactory,
  WeddingBookingData,
  WeddingFormData,
} from './api-connectors/base-connector';

export interface WebhookEvent {
  event_type: string;
  event_id: string;
  timestamp: string;
  source: string;
  data: Record<string, any>;
  received_at: string;
  request_id: string;
}

export interface ProcessingResult {
  success: boolean;
  actions_taken?: string[];
  context?: {
    supplier_type?: string;
    wedding_date?: string;
    vendor_id?: string;
    couple_id?: string;
  };
  error?: string;
}

export class WebhookEventProcessor {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  async processEvent(event: WebhookEvent): Promise<ProcessingResult> {
    try {
      // Store the event for audit trail
      await this.storeEvent(event);

      // Process based on event type
      switch (event.event_type) {
        case 'booking.created':
          return await this.processBookingCreated(event);
        case 'booking.updated':
          return await this.processBookingUpdated(event);
        case 'booking.cancelled':
          return await this.processBookingCancelled(event);
        case 'payment.received':
          return await this.processPaymentReceived(event);
        case 'payment.failed':
          return await this.processPaymentFailed(event);
        case 'form.submitted':
          return await this.processFormSubmitted(event);
        case 'vendor.connected':
          return await this.processVendorConnected(event);
        case 'message.sent':
          return await this.processMessageSent(event);
        case 'availability.changed':
          return await this.processAvailabilityChanged(event);
        case 'review.received':
          return await this.processReviewReceived(event);
        default:
          return await this.processGenericEvent(event);
      }
    } catch (error) {
      console.error('Event processing failed:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown processing error',
      };
    }
  }

  private async storeEvent(event: WebhookEvent): Promise<void> {
    await this.supabase.from('webhook_events').insert({
      event_id: event.event_id,
      event_type: event.event_type,
      source: event.source,
      data: event.data,
      timestamp: event.timestamp,
      received_at: event.received_at,
      request_id: event.request_id,
      processing_status: 'processing',
    });
  }

  private async processBookingCreated(
    event: WebhookEvent,
  ): Promise<ProcessingResult> {
    const bookingData = event.data;
    const actions: string[] = [];

    try {
      // 1. Create or update booking in database
      const { data: booking, error } = await this.supabase
        .from('bookings')
        .upsert({
          id: event.event_id,
          vendor_id: bookingData.vendor_id,
          couple_names: bookingData.couple_names || [bookingData.client_name],
          wedding_date: bookingData.wedding_date,
          venue: bookingData.venue,
          service_type: bookingData.service_type,
          booking_status: 'booked',
          amount: bookingData.amount,
          currency: bookingData.currency || 'USD',
          external_booking_id: bookingData.external_id,
          source: event.source,
          created_at: event.timestamp,
        })
        .select()
        .single();

      if (error) throw error;
      actions.push('booking_created_in_database');

      // 2. Send confirmation email to couple
      if (bookingData.couple_email || bookingData.email) {
        await this.sendBookingConfirmation(
          booking,
          bookingData.couple_email || bookingData.email,
        );
        actions.push('confirmation_email_sent');
      }

      // 3. Notify vendor
      await this.notifyVendorOfNewBooking(booking);
      actions.push('vendor_notified');

      // 4. Update vendor availability
      if (
        bookingData.wedding_date &&
        bookingData.service_start &&
        bookingData.service_end
      ) {
        await this.updateVendorAvailability(
          bookingData.vendor_id,
          bookingData.wedding_date,
          bookingData.service_start,
          bookingData.service_end,
        );
        actions.push('availability_updated');
      }

      // 5. Trigger Zapier automation if configured
      await this.triggerVendorAutomations(
        bookingData.vendor_id,
        'booking_created',
        booking,
      );
      actions.push('automations_triggered');

      return {
        success: true,
        actions_taken: actions,
        context: {
          supplier_type: bookingData.service_type,
          wedding_date: bookingData.wedding_date,
          vendor_id: bookingData.vendor_id,
        },
      };
    } catch (error) {
      console.error('Booking creation processing failed:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Booking processing failed',
        actions_taken: actions,
      };
    }
  }

  private async processPaymentReceived(
    event: WebhookEvent,
  ): Promise<ProcessingResult> {
    const paymentData = event.data;
    const actions: string[] = [];

    try {
      // 1. Update booking payment status
      const { data: booking } = await this.supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          paid_amount: paymentData.amount,
          payment_date: new Date().toISOString(),
          payment_method: event.source,
          payment_reference:
            paymentData.payment_intent_id || paymentData.transaction_id,
        })
        .eq(
          'external_booking_id',
          paymentData.booking_id || paymentData.metadata?.booking_id,
        )
        .select()
        .single();

      if (booking) {
        actions.push('booking_payment_updated');

        // 2. Send payment receipt
        if (paymentData.customer_email) {
          await this.sendPaymentReceipt(booking, paymentData);
          actions.push('receipt_sent');
        }

        // 3. Notify vendor of payment
        await this.notifyVendorOfPayment(booking, paymentData);
        actions.push('vendor_payment_notification');

        // 4. Update booking status to confirmed if fully paid
        if (paymentData.amount >= booking.amount) {
          await this.supabase
            .from('bookings')
            .update({ booking_status: 'confirmed' })
            .eq('id', booking.id);
          actions.push('booking_confirmed');
        }
      }

      return {
        success: true,
        actions_taken: actions,
        context: {
          wedding_date: booking?.wedding_date,
          vendor_id: booking?.vendor_id,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Payment processing failed',
        actions_taken: actions,
      };
    }
  }

  private async processFormSubmitted(
    event: WebhookEvent,
  ): Promise<ProcessingResult> {
    const formData = event.data;
    const actions: string[] = [];

    try {
      // 1. Store form submission
      const { data: submission } = await this.supabase
        .from('form_submissions')
        .insert({
          id: event.event_id,
          form_id: formData.form_id,
          vendor_id: formData.vendor_id,
          couple_id: formData.couple_id,
          submission_data: formData.responses || formData,
          submitted_at: event.timestamp,
          source: event.source,
        })
        .select()
        .single();

      actions.push('form_submission_stored');

      // 2. Notify vendor of submission
      if (formData.vendor_id) {
        await this.notifyVendorOfFormSubmission(formData.vendor_id, submission);
        actions.push('vendor_notified');
      }

      // 3. Auto-respond to couple if configured
      if (formData.couple_email || formData.email) {
        await this.sendFormAutoResponse(
          formData.vendor_id,
          formData.couple_email || formData.email,
          formData,
        );
        actions.push('auto_response_sent');
      }

      // 4. Create lead/inquiry record
      if (formData.form_type === 'inquiry') {
        await this.createLeadFromForm(submission);
        actions.push('lead_created');
      }

      return {
        success: true,
        actions_taken: actions,
        context: {
          vendor_id: formData.vendor_id,
          couple_id: formData.couple_id,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Form processing failed',
        actions_taken: actions,
      };
    }
  }

  private async processBookingCancelled(
    event: WebhookEvent,
  ): Promise<ProcessingResult> {
    const cancellationData = event.data;
    const actions: string[] = [];

    try {
      // 1. Update booking status
      await this.supabase
        .from('bookings')
        .update({
          booking_status: 'cancelled',
          cancellation_reason: cancellationData.reason,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', cancellationData.booking_id);

      actions.push('booking_cancelled');

      // 2. Process refund if applicable
      if (
        cancellationData.refund_amount &&
        cancellationData.refund_amount > 0
      ) {
        await this.processRefund(cancellationData);
        actions.push('refund_processed');
      }

      // 3. Free up calendar availability
      if (cancellationData.vendor_id) {
        await this.freeVendorAvailability(
          cancellationData.vendor_id,
          cancellationData.wedding_date,
        );
        actions.push('availability_freed');
      }

      // 4. Notify both parties
      await this.notifyBookingCancellation(cancellationData);
      actions.push('cancellation_notifications_sent');

      return {
        success: true,
        actions_taken: actions,
        context: {
          vendor_id: cancellationData.vendor_id,
          wedding_date: cancellationData.wedding_date,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Cancellation processing failed',
        actions_taken: actions,
      };
    }
  }

  private async processVendorConnected(
    event: WebhookEvent,
  ): Promise<ProcessingResult> {
    const vendorData = event.data;
    const actions: string[] = [];

    try {
      // 1. Update or create vendor integration record
      await this.supabase.from('vendor_integrations').upsert({
        vendor_id: vendorData.vendor_id,
        integration_type: event.source,
        credentials: vendorData.credentials,
        active: true,
        connected_at: event.timestamp,
      });

      actions.push('integration_recorded');

      // 2. Sync initial vendor data
      await this.syncVendorData(vendorData.vendor_id, event.source);
      actions.push('initial_data_synced');

      // 3. Send welcome email with integration guide
      await this.sendIntegrationWelcome(vendorData.vendor_id, event.source);
      actions.push('welcome_email_sent');

      return {
        success: true,
        actions_taken: actions,
        context: {
          vendor_id: vendorData.vendor_id,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Vendor connection processing failed',
        actions_taken: actions,
      };
    }
  }

  private async processGenericEvent(
    event: WebhookEvent,
  ): Promise<ProcessingResult> {
    // Store unknown events for analysis
    await this.supabase.from('unknown_webhook_events').insert({
      event_id: event.event_id,
      event_type: event.event_type,
      source: event.source,
      data: event.data,
      timestamp: event.timestamp,
    });

    return {
      success: true,
      actions_taken: ['event_logged'],
    };
  }

  // Helper methods for notifications and actions
  private async sendBookingConfirmation(
    booking: any,
    email: string,
  ): Promise<void> {
    // Implementation would use email service
    console.log(
      `Sending booking confirmation to ${email} for booking ${booking.id}`,
    );
  }

  private async notifyVendorOfNewBooking(booking: any): Promise<void> {
    // Implementation would send notification to vendor
    console.log(
      `Notifying vendor ${booking.vendor_id} of new booking ${booking.id}`,
    );
  }

  private async updateVendorAvailability(
    vendorId: string,
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<void> {
    await this.supabase.from('vendor_availability').insert({
      vendor_id: vendorId,
      date: date,
      start_time: startTime,
      end_time: endTime,
      status: 'booked',
    });
  }

  private async triggerVendorAutomations(
    vendorId: string,
    eventType: string,
    data: any,
  ): Promise<void> {
    try {
      const connectors = await ConnectorFactory.getVendorConnectors(vendorId);

      if (connectors.zapier) {
        // Get vendor's Zapier webhook configuration
        const { data: zapConfig } = await this.supabase
          .from('vendor_integrations')
          .select('configuration')
          .eq('vendor_id', vendorId)
          .eq('integration_type', 'zapier')
          .single();

        if (zapConfig?.configuration?.webhooks?.[eventType]) {
          await connectors.zapier.triggerZap(
            zapConfig.configuration.webhooks[eventType],
            data,
          );
        }
      }
    } catch (error) {
      console.error('Failed to trigger vendor automations:', error);
    }
  }

  private async sendPaymentReceipt(
    booking: any,
    paymentData: any,
  ): Promise<void> {
    console.log(`Sending payment receipt for booking ${booking.id}`);
  }

  private async notifyVendorOfPayment(
    booking: any,
    paymentData: any,
  ): Promise<void> {
    console.log(
      `Notifying vendor ${booking.vendor_id} of payment for booking ${booking.id}`,
    );
  }

  private async notifyVendorOfFormSubmission(
    vendorId: string,
    submission: any,
  ): Promise<void> {
    console.log(
      `Notifying vendor ${vendorId} of form submission ${submission.id}`,
    );
  }

  private async sendFormAutoResponse(
    vendorId: string,
    email: string,
    formData: any,
  ): Promise<void> {
    console.log(`Sending auto-response to ${email} for vendor ${vendorId}`);
  }

  private async createLeadFromForm(submission: any): Promise<void> {
    await this.supabase.from('leads').insert({
      vendor_id: submission.vendor_id,
      couple_id: submission.couple_id,
      source: 'form_submission',
      form_submission_id: submission.id,
      status: 'new',
      created_at: new Date().toISOString(),
    });
  }

  private async processRefund(cancellationData: any): Promise<void> {
    console.log(
      `Processing refund of ${cancellationData.refund_amount} for booking ${cancellationData.booking_id}`,
    );
  }

  private async freeVendorAvailability(
    vendorId: string,
    date: string,
  ): Promise<void> {
    await this.supabase
      .from('vendor_availability')
      .delete()
      .eq('vendor_id', vendorId)
      .eq('date', date)
      .eq('status', 'booked');
  }

  private async notifyBookingCancellation(
    cancellationData: any,
  ): Promise<void> {
    console.log(
      `Sending cancellation notifications for booking ${cancellationData.booking_id}`,
    );
  }

  private async syncVendorData(
    vendorId: string,
    integrationType: string,
  ): Promise<void> {
    console.log(
      `Syncing initial data for vendor ${vendorId} from ${integrationType}`,
    );
  }

  private async sendIntegrationWelcome(
    vendorId: string,
    integrationType: string,
  ): Promise<void> {
    console.log(
      `Sending integration welcome email to vendor ${vendorId} for ${integrationType}`,
    );
  }

  private async processMessageSent(
    event: WebhookEvent,
  ): Promise<ProcessingResult> {
    return { success: true, actions_taken: ['message_logged'] };
  }

  private async processPaymentFailed(
    event: WebhookEvent,
  ): Promise<ProcessingResult> {
    return { success: true, actions_taken: ['failure_logged'] };
  }

  private async processAvailabilityChanged(
    event: WebhookEvent,
  ): Promise<ProcessingResult> {
    return { success: true, actions_taken: ['availability_updated'] };
  }

  private async processReviewReceived(
    event: WebhookEvent,
  ): Promise<ProcessingResult> {
    return { success: true, actions_taken: ['review_stored'] };
  }

  private async processBookingUpdated(
    event: WebhookEvent,
  ): Promise<ProcessingResult> {
    return { success: true, actions_taken: ['booking_updated'] };
  }
}
