// WS-334 Team D: Generate Shareable Content API
// Create shareable content for couple notifications and milestones

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, coupleId, weddingId } = body;

    if (!notificationId || !coupleId || !weddingId) {
      return NextResponse.json(
        {
          error: 'Missing required fields: notificationId, coupleId, weddingId',
        },
        { status: 400 },
      );
    }

    // Verify access
    const { data: couple, error: coupleError } = await supabase
      .from('couples')
      .select('id, wedding_id')
      .eq('id', coupleId)
      .eq('wedding_id', weddingId)
      .single();

    if (coupleError || !couple) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch notification or milestone
    let notification = null;

    // Try regular notifications first
    const { data: regularNotification } = await supabase
      .from('couple_notifications')
      .select('*')
      .eq('notification_id', notificationId)
      .eq('couple_id', coupleId)
      .single();

    if (regularNotification) {
      notification = regularNotification;
    } else {
      // Try milestone notifications
      const { data: milestoneNotification } = await supabase
        .from('milestone_notifications')
        .select('*')
        .eq('milestone_id', notificationId)
        .eq('couple_id', coupleId)
        .single();

      notification = milestoneNotification;
    }

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 },
      );
    }

    // Generate shareable content
    const shareableContent = await generateShareableContent(
      notification,
      couple,
    );

    return NextResponse.json({
      success: true,
      data: {
        shareableContent,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/share/${shareableContent.shareId}`,
        platforms: ['instagram', 'facebook', 'twitter', 'whatsapp'],
      },
    });
  } catch (error) {
    console.error('Error generating shareable content:', error);
    return NextResponse.json(
      { error: 'Failed to generate shareable content' },
      { status: 500 },
    );
  }
}

async function generateShareableContent(notification: any, couple: any) {
  // Generate unique share ID
  const shareId = `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Create shareable content based on notification type
  const content = {
    shareId,
    type: notification.milestone_type ? 'milestone' : 'notification',
    title: notification.milestone_type
      ? notification.celebration_content?.title
      : notification.content?.title,
    description: notification.milestone_type
      ? notification.celebration_content?.celebrationMessage
      : notification.content?.message,
    imageUrl: await generateShareImage(notification, couple),
    platforms: {
      instagram: {
        format: 'story',
        dimensions: { width: 1080, height: 1920 },
        template: 'wedding_milestone_story',
      },
      facebook: {
        format: 'post',
        dimensions: { width: 1200, height: 630 },
        template: 'wedding_milestone_post',
      },
      twitter: {
        format: 'post',
        dimensions: { width: 1200, height: 675 },
        template: 'wedding_milestone_tweet',
      },
    },
    hashtags: generateHashtags(notification),
    createdAt: new Date().toISOString(),
  };

  // Store shareable content
  await supabase.from('shareable_content').insert({
    share_id: shareId,
    couple_id: couple.id,
    notification_id: notification.notification_id || notification.milestone_id,
    content_type: content.type,
    content_data: content,
    created_at: new Date().toISOString(),
  });

  return content;
}

async function generateShareImage(
  notification: any,
  couple: any,
): Promise<string> {
  // In production, this would generate a custom image using a service like Bannerbear, Canva API, etc.
  // For now, return a placeholder that would be replaced with actual image generation

  const imageParams = new URLSearchParams({
    type: notification.milestone_type || 'notification',
    coupleNames: `${couple.partner_a_name} & ${couple.partner_b_name}`,
    title:
      notification.celebration_content?.title ||
      notification.content?.title ||
      '',
    theme: 'romantic',
  });

  return `/api/generate/share-image?${imageParams.toString()}`;
}

function generateHashtags(notification: any): string[] {
  const baseHashtags = ['#WedMePlanning', '#WeddingJourney', '#LoveWins'];

  if (notification.milestone_type) {
    const milestoneHashtags = {
      venue_booked: ['#VenueBooked', '#WeddingVenue', '#DreamVenue'],
      vendor_confirmed: ['#WeddingVendors', '#DreamTeam', '#WeddingPlanning'],
      budget_milestone: ['#BudgetGoals', '#SmartPlanning', '#WeddingBudget'],
      timeline_complete: [
        '#WeddingTimeline',
        '#OrganizedCouple',
        '#PlanningComplete',
      ],
      guest_responses: ['#RSVPs', '#WeddingGuests', '#CelebrationTime'],
      final_details: ['#FinalDetails', '#AlmostThere', '#WeddingReady'],
    };

    return [
      ...baseHashtags,
      ...(milestoneHashtags[
        notification.milestone_type as keyof typeof milestoneHashtags
      ] || []),
    ];
  }

  return baseHashtags;
}
