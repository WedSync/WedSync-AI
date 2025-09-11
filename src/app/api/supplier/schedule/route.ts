import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Get the current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get supplier profile
    const { data: supplier, error: supplierError } = await supabase
      .from('vendors')
      .select('id')
      .eq('user_id', session.user.id)
      .single();

    if (supplierError || !supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 },
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const selectedDate = searchParams.get('date');
    const today = new Date().toISOString().split('T')[0];

    // Get today's events
    const { data: todayEvents, error: todayError } = await supabase
      .from('timeline_events')
      .select(
        `
        id,
        title,
        description,
        start_time,
        end_time,
        location,
        status,
        requirements,
        assigned_to,
        created_at,
        updated_at,
        weddings:wedding_id (
          id,
          couple_id,
          user_profiles:couple_id (
            first_name,
            last_name,
            phone,
            email
          )
        )
      `,
      )
      .eq('vendor_id', supplier.id)
      .gte('start_time', today + 'T00:00:00')
      .lt('start_time', today + 'T23:59:59')
      .order('start_time', { ascending: true });

    if (todayError) {
      console.error('Error fetching today events:', todayError);
    }

    // Transform today's events to include client information
    const transformedTodayEvents = (todayEvents || []).map((event) => ({
      ...event,
      client_name: event.weddings?.user_profiles
        ? `${event.weddings.user_profiles.first_name} ${event.weddings.user_profiles.last_name}`
        : 'Unknown Client',
      client_contact: event.weddings?.user_profiles?.phone || null,
      event_type: 'timeline_event',
      special_requirements: Array.isArray(event.requirements)
        ? event.requirements
        : [],
    }));

    // Get upcoming bookings (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: upcomingBookings, error: bookingsError } = await supabase
      .from('supplier_bookings')
      .select(
        `
        id,
        wedding_id,
        vendor_id,
        service_details,
        booking_date,
        start_time,
        end_time,
        setup_time,
        breakdown_time,
        special_requirements,
        contract_terms,
        pricing,
        status,
        notes,
        created_at,
        updated_at,
        weddings:wedding_id (
          id,
          couple_id,
          user_profiles:couple_id (
            first_name,
            last_name,
            phone,
            email
          )
        )
      `,
      )
      .eq('vendor_id', supplier.id)
      .gte('booking_date', today)
      .lte('booking_date', thirtyDaysFromNow.toISOString().split('T')[0])
      .in('status', ['draft', 'confirmed'])
      .order('booking_date', { ascending: true });

    if (bookingsError) {
      console.error('Error fetching upcoming bookings:', bookingsError);
    }

    // Transform bookings to match expected format
    const transformedBookings = (upcomingBookings || []).map((booking) => ({
      ...booking,
      client_name: booking.weddings?.user_profiles
        ? `${booking.weddings.user_profiles.first_name} ${booking.weddings.user_profiles.last_name}`
        : 'Unknown Client',
      total_amount: booking.pricing?.total || 0,
      deposit_amount: booking.pricing?.deposit || 0,
      balance_due:
        (booking.pricing?.total || 0) - (booking.pricing?.deposit || 0),
      booking_status: booking.status,
      contract_status: 'pending', // Mock data - would come from contracts table
      payment_status: 'pending', // Mock data - would come from payments table
      wedding_date: booking.booking_date,
    }));

    // Generate weekly schedule (current week)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)

    const weeklyDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // Get events for this specific date
      const { data: dayEvents, error: dayError } = await supabase
        .from('timeline_events')
        .select(
          `
          id,
          title,
          description,
          start_time,
          end_time,
          location,
          status,
          requirements,
          weddings:wedding_id (
            user_profiles:couple_id (
              first_name,
              last_name,
              phone
            )
          )
        `,
        )
        .eq('vendor_id', supplier.id)
        .gte('start_time', dateStr + 'T00:00:00')
        .lt('start_time', dateStr + 'T23:59:59')
        .order('start_time', { ascending: true });

      if (dayError) {
        console.error(`Error fetching events for ${dateStr}:`, dayError);
      }

      // Transform events
      const transformedDayEvents = (dayEvents || []).map((event) => ({
        ...event,
        client_name: event.weddings?.user_profiles
          ? `${event.weddings.user_profiles.first_name} ${event.weddings.user_profiles.last_name}`
          : 'Unknown Client',
        client_contact: event.weddings?.user_profiles?.phone || null,
        event_type: 'timeline_event',
        special_requirements: Array.isArray(event.requirements)
          ? event.requirements
          : [],
      }));

      weeklyDays.push({
        date: date.toISOString(),
        events: transformedDayEvents,
        availability: {
          date: dateStr,
          available: transformedDayEvents.length === 0,
          working_hours: { start: '09:00', end: '17:00' }, // Mock data
          booked_slots: [], // Would be calculated from events
          available_slots: [], // Would be calculated from availability
        },
        conflicts: [], // Mock data - would come from conflicts detection
      });
    }

    const schedule = {
      id: `schedule-${supplier.id}`,
      vendor_id: supplier.id,
      date: selectedDate || today,
      todayEvents: transformedTodayEvents,
      upcomingBookings: transformedBookings,
      weeklySchedule: {
        week_start: weekStart.toISOString(),
        days: weeklyDays,
      },
      conflicts: [], // Mock data - would need conflicts table
      availability: [], // Mock data - would be calculated
      last_updated: new Date().toISOString(),
    };

    return NextResponse.json({
      schedule,
      todayEvents: transformedTodayEvents,
      upcomingBookings: transformedBookings,
      conflicts: [],
    });
  } catch (error) {
    console.error('Error in supplier schedule API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
