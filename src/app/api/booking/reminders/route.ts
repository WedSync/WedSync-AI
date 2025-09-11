import { NextRequest, NextResponse } from 'next/server';
import { BookingConfirmationService } from '@/lib/notifications/booking-confirmations';
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();
const confirmationService = new BookingConfirmationService();

// Send immediate reminder
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, hoursBeforeReminder = 24 } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 },
      );
    }

    // Validate hours before reminder
    const validHours = [24, 2, 0.25]; // 24h, 2h, 15min
    if (!validHours.includes(hoursBeforeReminder)) {
      return NextResponse.json(
        { error: 'Invalid reminder timing. Must be 24, 2, or 0.25 hours' },
        { status: 400 },
      );
    }

    // Send reminder
    const results = await confirmationService.sendBookingReminder(
      bookingId,
      hoursBeforeReminder,
    );

    const successfulReminders = results.filter((r) => r.success);
    const failedReminders = results.filter((r) => !r.success);

    return NextResponse.json({
      success: successfulReminders.length > 0,
      message:
        successfulReminders.length > 0
          ? 'Reminder sent successfully'
          : 'Failed to send reminder',
      results: {
        successful: successfulReminders.length,
        failed: failedReminders.length,
        channels: successfulReminders.map((s) => s.channel),
        errors: failedReminders.map((f) => f.error),
      },
    });
  } catch (error: any) {
    console.error('Reminder API error:', error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Internal server error',
      },
      { status: 500 },
    );
  }
}

// Get reminder status for a booking
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

    // Get scheduled reminders
    const { data: scheduledReminders, error: scheduledError } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('notification_type', 'reminder')
      .order('scheduled_for');

    if (scheduledError) {
      return NextResponse.json(
        { error: 'Failed to fetch scheduled reminders' },
        { status: 500 },
      );
    }

    // Get sent reminders
    const { data: sentReminders, error: sentError } = await supabase
      .from('booking_notifications')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('type', 'reminder')
      .order('sent_at', { ascending: false });

    if (sentError) {
      return NextResponse.json(
        { error: 'Failed to fetch sent reminders' },
        { status: 500 },
      );
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('scheduled_for, status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const reminderStatus = {
      bookingId,
      meetingTime: booking.scheduled_for,
      status: booking.status,
      scheduled:
        scheduledReminders?.map((sr) => ({
          id: sr.id,
          scheduledFor: sr.scheduled_for,
          hoursBefore: sr.hours_before,
          status: sr.status,
          processedAt: sr.processed_at,
        })) || [],
      sent:
        sentReminders?.map((sr) => ({
          sentAt: sr.sent_at,
          channel: sr.channel,
          success: sr.success,
          messageId: sr.message_id,
          hoursBefore: sr.hours_before,
          error: sr.error_message,
        })) || [],
    };

    return NextResponse.json(reminderStatus);
  } catch (error) {
    console.error('Reminder status API error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}

// Process scheduled reminders (cron job endpoint)
export async function PUT(request: NextRequest) {
  try {
    // Verify this is called from our cron job or authorized source
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Process all scheduled notifications
    await confirmationService.processScheduledNotifications();

    return NextResponse.json({
      success: true,
      message: 'Scheduled notifications processed',
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Scheduled notifications processing error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to process scheduled notifications',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 },
    );
  }
}

// Cancel scheduled reminders
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');
    const reminderType = searchParams.get('type'); // '24h', '2h', '15min'

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 },
      );
    }

    let query = supabase
      .from('scheduled_notifications')
      .update({
        status: 'cancelled',
        processed_at: new Date().toISOString(),
      })
      .eq('booking_id', bookingId)
      .eq('status', 'pending');

    // Filter by specific reminder type if provided
    if (reminderType) {
      const hoursMap: Record<string, number> = {
        '24h': 24,
        '2h': 2,
        '15min': 0.25,
      };

      const hours = hoursMap[reminderType];
      if (hours) {
        query = query.eq('hours_before', hours);
      }
    }

    const { data, error } = await query.select('id');

    if (error) {
      return NextResponse.json(
        { error: 'Failed to cancel reminders' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Cancelled ${data?.length || 0} scheduled reminders`,
      cancelledCount: data?.length || 0,
    });
  } catch (error) {
    console.error('Cancel reminders API error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
