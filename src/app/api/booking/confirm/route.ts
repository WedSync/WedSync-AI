import { NextRequest, NextResponse } from 'next/server';
import { BookingConfirmationService } from '@/lib/notifications/booking-confirmations';
import { createClient } from '@/lib/supabase/server';
import {
  generateSecureBookingToken,
  validateRateLimit,
} from '@/lib/security/booking-security';

const supabase = await createClient();
const confirmationService = new BookingConfirmationService();

export async function POST(request: NextRequest) {
  try {
    const clientIP =
      request.ip || request.headers.get('x-forwarded-for') || 'unknown';

    // Rate limiting: 5 confirmations per minute per IP
    const rateLimitResult = await validateRateLimit(
      clientIP,
      'booking_confirmation',
      5,
      60,
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 },
      );
    }

    // Fetch booking details with related data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(
        `
        *,
        clients(name, phone, notification_preferences),
        wedding_planners(name, phone, time_zone)
      `,
      )
      .eq('id', bookingId)
      .eq('status', 'confirmed')
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found or not confirmed' },
        { status: 404 },
      );
    }

    // Generate secure tokens for reschedule/cancel links
    const rescheduleToken = generateSecureBookingToken();
    const cancelToken = generateSecureBookingToken();

    // Update booking with tokens
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        reschedule_token: rescheduleToken,
        cancel_token: cancelToken,
        tokens_generated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Failed to update booking with tokens:', updateError);
      return NextResponse.json(
        { error: 'Failed to generate secure tokens' },
        { status: 500 },
      );
    }

    // Prepare confirmation data
    const confirmationData = {
      bookingId: booking.id,
      clientName: booking.clients.name,
      clientPhone: booking.clients.phone,
      plannerName: booking.wedding_planners.name,
      plannerPhone: booking.wedding_planners.phone,
      meetingType: booking.meeting_type,
      scheduledFor: new Date(booking.scheduled_for),
      location: booking.location,
      notes: booking.notes,
      timeZone: booking.wedding_planners.time_zone || 'UTC',
      rescheduleToken,
      cancelToken,
    };

    // Send confirmations
    const results =
      await confirmationService.sendBookingConfirmation(confirmationData);

    // Check if any confirmations were successful
    const successfulConfirmations = results.filter((r) => r.success);
    const failedConfirmations = results.filter((r) => !r.success);

    if (successfulConfirmations.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to send any confirmations',
          errors: failedConfirmations.map((f) => f.error),
        },
        { status: 500 },
      );
    }

    // Record confirmation activity
    await supabase.from('booking_activities').insert({
      booking_id: bookingId,
      activity_type: 'confirmations_sent',
      activity_data: {
        successful_channels: successfulConfirmations.map((s) => s.channel),
        failed_channels: failedConfirmations.map((f) => f.channel),
        message_ids: successfulConfirmations
          .map((s) => s.messageId)
          .filter(Boolean),
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Booking confirmations sent successfully',
      results: {
        successful: successfulConfirmations.length,
        failed: failedConfirmations.length,
        channels: successfulConfirmations.map((s) => s.channel),
        messageIds: successfulConfirmations
          .map((s) => s.messageId)
          .filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Booking confirmation API error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 },
      );
    }

    // Get confirmation status for the booking
    const { data: notifications, error } = await supabase
      .from('booking_notifications')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('type', 'confirmation')
      .order('sent_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch confirmation status' },
        { status: 500 },
      );
    }

    // Group by channel
    const confirmationStatus = {
      sms: {
        attempted: false,
        successful: false,
        messageId: null,
        sentAt: null,
        error: null,
      },
      whatsapp: {
        attempted: false,
        successful: false,
        messageId: null,
        sentAt: null,
        error: null,
      },
    };

    notifications?.forEach((notification) => {
      const channel = notification.channel as 'sms' | 'whatsapp';
      if (confirmationStatus[channel]) {
        confirmationStatus[channel] = {
          attempted: true,
          successful: notification.success,
          messageId: notification.message_id,
          sentAt: notification.sent_at,
          error: notification.error_message,
        };
      }
    });

    return NextResponse.json({
      bookingId,
      confirmationStatus,
      lastAttempt: notifications?.[0]?.sent_at || null,
    });
  } catch (error) {
    console.error('Confirmation status API error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
