// Calendar Integration API Endpoints
// Handles Google Calendar, Outlook, Apple Calendar, and other calendar platform connections

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CalendarSyncEngine } from '@/lib/integrations/marketplace/calendar-sync-engine';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const calendarEngine = new CalendarSyncEngine();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const vendorId = searchParams.get('vendorId');
    const platform = searchParams.get('platform');

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID required' },
        { status: 400 },
      );
    }

    switch (action) {
      case 'calendars':
        // Get all calendar connections for vendor
        const calendars = await calendarEngine.getAllCalendars(vendorId);
        return NextResponse.json({ success: true, data: calendars });

      case 'events':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Get events from specific calendar platform
        const events = await calendarEngine.getEvents(vendorId, platform, {
          startDate,
          endDate,
        });
        return NextResponse.json({ success: true, data: events });

      case 'availability':
        const date = searchParams.get('date');
        if (!date) {
          return NextResponse.json({ error: 'Date required' }, { status: 400 });
        }

        // Check availability for specific date
        const availability = await calendarEngine.checkAvailability(
          vendorId,
          date,
        );
        return NextResponse.json({ success: true, data: availability });

      case 'sync-status':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Get sync status for calendar platform
        const syncStatus = await calendarEngine.getSyncStatus(
          vendorId,
          platform,
        );
        return NextResponse.json({ success: true, data: syncStatus });

      case 'platforms':
        // Get supported calendar platforms
        const platforms = await calendarEngine.getSupportedPlatforms();
        return NextResponse.json({ success: true, data: platforms });

      case 'conflicts':
        // Get scheduling conflicts
        const conflicts = await calendarEngine.getSchedulingConflicts(vendorId);
        return NextResponse.json({ success: true, data: conflicts });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Calendar API GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, vendorId, platform, eventData, calendarData, attendees } =
      body;

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID required' },
        { status: 400 },
      );
    }

    switch (action) {
      case 'connect':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Connect to calendar platform
        const connection = await calendarEngine.connectCalendarPlatform(
          platform,
          vendorId,
        );
        return NextResponse.json({
          success: true,
          data: connection,
          message: `Successfully connected to ${platform}`,
        });

      case 'create-event':
        if (!eventData) {
          return NextResponse.json(
            { error: 'Event data required' },
            { status: 400 },
          );
        }

        // Create new calendar event
        const event = await calendarEngine.createEvent(
          vendorId,
          platform || 'google', // Default to Google Calendar
          eventData,
        );
        return NextResponse.json({
          success: true,
          data: event,
          message: 'Event created successfully',
        });

      case 'bulk-create-events':
        if (!eventData || !Array.isArray(eventData)) {
          return NextResponse.json(
            { error: 'Event data array required' },
            { status: 400 },
          );
        }

        // Create multiple events
        const bulkResult = await calendarEngine.bulkCreateEvents(
          vendorId,
          platform || 'google',
          eventData,
        );
        return NextResponse.json({
          success: true,
          data: bulkResult,
          message: `Created ${bulkResult.eventsCreated} events successfully`,
        });

      case 'schedule-consultation':
        // Schedule client consultation
        const consultation = await calendarEngine.scheduleConsultation(
          vendorId,
          eventData,
          attendees,
        );
        return NextResponse.json({
          success: true,
          data: consultation,
          message: 'Consultation scheduled successfully',
        });

      case 'sync':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Sync calendar data
        const syncResult = await calendarEngine.syncCalendarData(
          vendorId,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: syncResult,
          message: `Synced ${syncResult.eventsSynced} events from ${platform}`,
        });

      case 'create-booking-link':
        // Create public booking link
        const bookingLink = await calendarEngine.createBookingLink(
          vendorId,
          calendarData,
        );
        return NextResponse.json({
          success: true,
          data: bookingLink,
          message: 'Booking link created successfully',
        });

      case 'import-ical':
        if (!calendarData?.icalUrl) {
          return NextResponse.json(
            { error: 'iCal URL required' },
            { status: 400 },
          );
        }

        // Import iCal calendar
        const importResult = await calendarEngine.importICalendar(
          vendorId,
          calendarData.icalUrl,
        );
        return NextResponse.json({
          success: true,
          data: importResult,
          message: `Imported ${importResult.eventsImported} events from iCal`,
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Calendar API POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, vendorId, platform, eventId, eventData, settings } = body;

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID required' },
        { status: 400 },
      );
    }

    switch (action) {
      case 'update-event':
        if (!eventId || !eventData) {
          return NextResponse.json(
            { error: 'Event ID and data required' },
            { status: 400 },
          );
        }

        // Update calendar event
        const updatedEvent = await calendarEngine.updateEvent(
          vendorId,
          eventId,
          eventData,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: updatedEvent,
          message: 'Event updated successfully',
        });

      case 'reschedule-event':
        if (!eventId || !eventData.newDateTime) {
          return NextResponse.json(
            { error: 'Event ID and new date/time required' },
            { status: 400 },
          );
        }

        // Reschedule event
        const rescheduled = await calendarEngine.rescheduleEvent(
          vendorId,
          eventId,
          eventData.newDateTime,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: rescheduled,
          message: 'Event rescheduled successfully',
        });

      case 'update-sync-settings':
        // Update calendar sync settings
        const updateResult = await calendarEngine.updateSyncSettings(
          vendorId,
          platform,
          settings,
        );
        return NextResponse.json({
          success: true,
          data: updateResult,
          message: 'Sync settings updated successfully',
        });

      case 'set-availability':
        // Set availability hours/rules
        const availability = await calendarEngine.setAvailability(
          vendorId,
          settings.availabilityRules,
        );
        return NextResponse.json({
          success: true,
          data: availability,
          message: 'Availability settings updated successfully',
        });

      case 'toggle-auto-sync':
        const connectionId = body.connectionId;
        if (!connectionId) {
          return NextResponse.json(
            { error: 'Connection ID required' },
            { status: 400 },
          );
        }

        // Toggle automatic sync
        const toggleResult = await calendarEngine.toggleAutoSync(connectionId);
        return NextResponse.json({
          success: true,
          data: toggleResult,
          message: `Auto-sync ${toggleResult.enabled ? 'enabled' : 'disabled'}`,
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Calendar API PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const vendorId = searchParams.get('vendorId');
    const platform = searchParams.get('platform');
    const connectionId = searchParams.get('connectionId');
    const action = searchParams.get('action');

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID required' },
        { status: 400 },
      );
    }

    switch (action) {
      case 'delete-event':
        if (!eventId) {
          return NextResponse.json(
            { error: 'Event ID required' },
            { status: 400 },
          );
        }

        // Delete calendar event
        const result = await calendarEngine.deleteEvent(
          vendorId,
          eventId,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: result,
          message: 'Event deleted successfully',
        });

      case 'cancel-event':
        if (!eventId) {
          return NextResponse.json(
            { error: 'Event ID required' },
            { status: 400 },
          );
        }

        // Cancel event (sends notifications)
        const cancelResult = await calendarEngine.cancelEvent(
          vendorId,
          eventId,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: cancelResult,
          message: 'Event cancelled successfully',
        });

      case 'disconnect':
        if (!connectionId) {
          return NextResponse.json(
            { error: 'Connection ID required' },
            { status: 400 },
          );
        }

        // Disconnect calendar platform
        const disconnectResult = await calendarEngine.disconnectCalendar(
          connectionId,
          vendorId,
        );
        return NextResponse.json({
          success: true,
          data: disconnectResult,
          message: 'Calendar disconnected successfully',
        });

      case 'clear-sync-data':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Clear local sync data
        const clearResult = await calendarEngine.clearSyncData(
          vendorId,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: clearResult,
          message: 'Sync data cleared successfully',
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Calendar API DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}
