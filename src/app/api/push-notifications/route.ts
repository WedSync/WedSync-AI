import { NextRequest, NextResponse } from 'next/server';
import { PushNotificationService } from '@/lib/services/push-notification-service';

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json();
    const pushService = new PushNotificationService();

    switch (action) {
      case 'register_subscription':
        const { userId, subscription, deviceInfo } = data;

        if (!userId || !subscription) {
          return NextResponse.json(
            { error: 'User ID and subscription are required' },
            { status: 400 },
          );
        }

        const registeredSubscription =
          await pushService.registerPushSubscription(
            userId,
            subscription,
            deviceInfo,
          );

        return NextResponse.json({
          success: true,
          subscription: registeredSubscription,
        });

      case 'unregister_subscription':
        const { userId: unregisterUserId, endpoint } = data;

        if (!unregisterUserId || !endpoint) {
          return NextResponse.json(
            { error: 'User ID and endpoint are required' },
            { status: 400 },
          );
        }

        await pushService.unregisterPushSubscription(
          unregisterUserId,
          endpoint,
        );

        return NextResponse.json({
          success: true,
          message: 'Subscription unregistered successfully',
        });

      case 'send_notification':
        const { notification } = data;

        if (!notification || !notification.user_id || !notification.title) {
          return NextResponse.json(
            { error: 'Notification with user_id and title are required' },
            { status: 400 },
          );
        }

        const sentNotification =
          await pushService.sendPushNotification(notification);

        return NextResponse.json({
          success: true,
          notification: sentNotification,
        });

      case 'send_task_reminder':
        const { taskId, reminderType = 'deadline' } = data;

        if (!taskId) {
          return NextResponse.json(
            { error: 'Task ID is required' },
            { status: 400 },
          );
        }

        await pushService.sendTaskReminder(taskId, reminderType);

        return NextResponse.json({
          success: true,
          message: 'Task reminder sent successfully',
        });

      case 'send_bulk_reminders':
        const { taskIds, reminderType: bulkReminderType = 'deadline' } = data;

        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
          return NextResponse.json(
            { error: 'Task IDs array is required' },
            { status: 400 },
          );
        }

        const bulkResults = await pushService.sendBulkTaskReminders(
          taskIds,
          bulkReminderType,
        );

        return NextResponse.json({
          success: true,
          results: bulkResults,
        });

      case 'send_assignment_notification':
        const {
          taskId: assignTaskId,
          assignedToUserId,
          assignedByUserId,
        } = data;

        if (!assignTaskId || !assignedToUserId || !assignedByUserId) {
          return NextResponse.json(
            {
              error:
                'Task ID, assigned to user ID, and assigned by user ID are required',
            },
            { status: 400 },
          );
        }

        await pushService.sendTaskAssignmentNotification(
          assignTaskId,
          assignedToUserId,
          assignedByUserId,
        );

        return NextResponse.json({
          success: true,
          message: 'Assignment notification sent successfully',
        });

      case 'send_system_notification':
        const { userId: systemUserId, title, body, options = {} } = data;

        if (!systemUserId || !title || !body) {
          return NextResponse.json(
            { error: 'User ID, title, and body are required' },
            { status: 400 },
          );
        }

        await pushService.sendSystemNotification(
          systemUserId,
          title,
          body,
          options,
        );

        return NextResponse.json({
          success: true,
          message: 'System notification sent successfully',
        });

      case 'update_preferences':
        const { userId: prefUserId, preferences } = data;

        if (!prefUserId || !preferences) {
          return NextResponse.json(
            { error: 'User ID and preferences are required' },
            { status: 400 },
          );
        }

        await pushService.updateUserNotificationPreferences(
          prefUserId,
          preferences,
        );

        return NextResponse.json({
          success: true,
          message: 'Notification preferences updated successfully',
        });

      case 'cancel_notification':
        const { notificationId } = data;

        if (!notificationId) {
          return NextResponse.json(
            { error: 'Notification ID is required' },
            { status: 400 },
          );
        }

        await pushService.cancelScheduledNotification(notificationId);

        return NextResponse.json({
          success: true,
          message: 'Notification cancelled successfully',
        });

      case 'test_notification':
        const { userId: testUserId, notificationType = 'test' } = data;

        if (!testUserId) {
          return NextResponse.json(
            { error: 'User ID is required' },
            { status: 400 },
          );
        }

        await pushService.sendSystemNotification(
          testUserId,
          'Test Notification',
          'This is a test notification to verify your push notification setup is working correctly.',
          {
            priority: 'normal',
            tag: 'test-notification',
            data: { test: true, timestamp: new Date().toISOString() },
          },
        );

        return NextResponse.json({
          success: true,
          message: 'Test notification sent successfully',
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Push notification API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const weddingId = searchParams.get('weddingId');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const pushService = new PushNotificationService();

    switch (action) {
      case 'get_preferences':
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required' },
            { status: 400 },
          );
        }

        const preferences =
          await pushService.getUserNotificationPreferences(userId);

        return NextResponse.json({
          success: true,
          preferences,
        });

      case 'get_history':
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required' },
            { status: 400 },
          );
        }

        const limitNum = limit ? parseInt(limit) : 50;
        const offsetNum = offset ? parseInt(offset) : 0;

        const history = await pushService.getNotificationHistory(
          userId,
          limitNum,
          offsetNum,
        );

        return NextResponse.json({
          success: true,
          notifications: history,
          pagination: {
            limit: limitNum,
            offset: offsetNum,
            total: history.length,
          },
        });

      case 'get_analytics':
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const analytics = await pushService.getNotificationAnalytics(
          userId || undefined,
          weddingId || undefined,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined,
        );

        return NextResponse.json({
          success: true,
          analytics,
        });

      case 'vapid_public_key':
        // Return VAPID public key for web push setup
        return NextResponse.json({
          success: true,
          vapid_public_key: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        });

      case 'check_subscription_status':
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required' },
            { status: 400 },
          );
        }

        const subscriptionStatus = await checkUserSubscriptionStatus(userId);

        return NextResponse.json({
          success: true,
          subscription_status: subscriptionStatus,
        });

      case 'notification_templates':
        const templates = getNotificationTemplates();

        return NextResponse.json({
          success: true,
          templates,
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Push notification GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Check user subscription status
async function checkUserSubscriptionStatus(userId: string) {
  try {
    const { createClient } = require('@supabase/supabase-js');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('device_type, is_active, last_used_at')
      .eq('user_id', userId);

    if (error) throw error;

    const activeSubscriptions =
      subscriptions?.filter((sub) => sub.is_active) || [];

    return {
      total_subscriptions: subscriptions?.length || 0,
      active_subscriptions: activeSubscriptions.length,
      devices: activeSubscriptions.map((sub) => ({
        type: sub.device_type,
        last_used: sub.last_used_at,
      })),
      has_web_push: activeSubscriptions.some(
        (sub) => sub.device_type === 'web',
      ),
      has_mobile_push: activeSubscriptions.some(
        (sub) => sub.device_type === 'ios' || sub.device_type === 'android',
      ),
      last_activity:
        activeSubscriptions.length > 0
          ? Math.max(
              ...activeSubscriptions.map((sub) =>
                new Date(sub.last_used_at || 0).getTime(),
              ),
            )
          : null,
    };
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return {
      total_subscriptions: 0,
      active_subscriptions: 0,
      devices: [],
      has_web_push: false,
      has_mobile_push: false,
      last_activity: null,
      error: 'Failed to check status',
    };
  }
}

// Get available notification templates
function getNotificationTemplates() {
  return {
    task_reminder: {
      name: 'Task Reminder',
      description: 'Reminds users about upcoming task deadlines',
      variables: ['task_title', 'deadline', 'wedding_name', 'days_until'],
      example:
        'Task "Venue booking" is due in 3 days for Sarah & John\'s Wedding',
    },
    task_overdue: {
      name: 'Overdue Task',
      description: 'Alerts users about overdue tasks',
      variables: ['task_title', 'deadline', 'wedding_name', 'days_overdue'],
      example:
        'Task "Catering contract" was due 2 days ago for Sarah & John\'s Wedding',
    },
    task_assignment: {
      name: 'Task Assignment',
      description: 'Notifies users when they are assigned a new task',
      variables: ['task_title', 'assigner_name', 'wedding_name', 'deadline'],
      example:
        'Emily assigned "Photography planning" to you for Sarah & John\'s Wedding',
    },
    wedding_milestone: {
      name: 'Wedding Milestone',
      description: 'Celebrates completion of major wedding milestones',
      variables: ['milestone_name', 'wedding_name', 'completion_date'],
      example:
        "Venue booked! 🎉 Major milestone completed for Sarah & John's Wedding",
    },
    system_alert: {
      name: 'System Alert',
      description: 'Important system notifications and updates',
      variables: ['alert_type', 'message', 'action_required'],
      example: 'System maintenance scheduled for tonight at 2 AM EST',
    },
  };
}

// Endpoint for handling notification actions (e.g., mark complete, snooze)
export async function PATCH(request: NextRequest) {
  try {
    const { notificationId, action, data } = await request.json();

    if (!notificationId || !action) {
      return NextResponse.json(
        { error: 'Notification ID and action are required' },
        { status: 400 },
      );
    }

    const result = await handleNotificationAction(notificationId, action, data);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Notification action error:', error);
    return NextResponse.json(
      { error: 'Failed to handle notification action' },
      { status: 500 },
    );
  }
}

// Handle notification actions
async function handleNotificationAction(
  notificationId: string,
  action: string,
  data: any,
) {
  const { createClient } = require('@supabase/supabase-js');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Get notification details
  const { data: notification, error } = await supabase
    .from('push_notifications')
    .select('*')
    .eq('id', notificationId)
    .single();

  if (error || !notification) {
    throw new Error('Notification not found');
  }

  switch (action) {
    case 'mark_complete':
      if (notification.task_id) {
        await supabase
          .from('tasks')
          .update({
            status: 'completed',
            completion_date: new Date().toISOString(),
          })
          .eq('id', notification.task_id);
      }
      break;

    case 'snooze':
      const snoozeMinutes = data?.minutes || 60;
      const snoozeUntil = new Date(Date.now() + snoozeMinutes * 60 * 1000);

      // Create a new scheduled notification
      await supabase.from('push_notifications').insert({
        ...notification,
        id: undefined,
        scheduled_for: snoozeUntil.toISOString(),
        delivery_status: 'pending',
        sent_at: null,
        title: `[Snoozed] ${notification.title}`,
        tag: `${notification.tag}-snoozed`,
      });
      break;

    case 'reschedule':
      if (notification.task_id && data?.new_deadline) {
        await supabase
          .from('tasks')
          .update({ deadline: data.new_deadline })
          .eq('id', notification.task_id);
      }
      break;

    case 'dismiss':
      // Just mark as read/handled
      break;

    default:
      throw new Error(`Unknown action: ${action}`);
  }

  // Log the action
  await supabase.from('notification_actions').insert({
    notification_id: notificationId,
    action,
    action_data: data,
    performed_at: new Date().toISOString(),
  });

  return { action, performed_at: new Date().toISOString() };
}
