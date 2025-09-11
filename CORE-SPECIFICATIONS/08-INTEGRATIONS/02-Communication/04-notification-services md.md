# 04-notification-services.md

# [04-notification-services.md](http://04-notification-services.md)

## What to Build

Implement a unified notification system that handles in-app notifications, push notifications, and email digests across both WedSync and WedMe platforms.

## Key Technical Requirements

### Notification Service Architecture

```
// app/lib/notifications/notification-service.ts
export class NotificationService {
  async send(notification: Notification) {
    const { userId, type, channel, data } = notification;
    
    // Store in database
    const notificationId = await this.storeNotification(notification);
    
    // Send via requested channels
    const promises = [];
    
    if (channel.includes('in_app')) {
      promises.push(this.sendInAppNotification(userId, notification));
    }
    
    if (channel.includes('push')) {
      promises.push(this.sendPushNotification(userId, notification));
    }
    
    if (channel.includes('email')) {
      promises.push(this.queueEmailNotification(userId, notification));
    }
    
    await Promise.allSettled(promises);
    
    return notificationId;
  }
  
  private async sendInAppNotification(
    userId: string,
    notification: Notification
  ) {
    // Broadcast via Supabase Realtime
    const channel = [supabase.channel](http://supabase.channel)(`user:${userId}`);
    
    await channel.send({
      type: 'broadcast',
      event: 'notification',
      payload: {
        id: [notification.id](http://notification.id),
        title: notification.title,
        body: notification.body,
        actionUrl: notification.actionUrl,
        timestamp: new Date().toISOString()
      }
    });
  }
}
```

### Database Schema

```
-- Notification storage
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL, -- 'form_submitted', 'payment_due', 'journey_milestone', etc
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  channels TEXT[] DEFAULT ARRAY['in_app'],
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User notification preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT false,
  sms_enabled BOOLEAN DEFAULT false,
  email_frequency TEXT DEFAULT 'instant', -- 'instant', 'daily', 'weekly'
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  categories JSONB DEFAULT '{}', -- Per-category preferences
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push notification tokens
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  device_info JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Real-time Notification Hook

```
// app/hooks/useNotifications.ts
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    // Subscribe to real-time notifications
    const channel = supabase
      .channel(`user:${userId}`)
      .on('broadcast', { event: 'notification' }, (payload) => {
        // Add to notifications list
        setNotifications(prev => [payload.payload, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show toast notification
        toast({
          title: payload.payload.title,
          description: payload.payload.body,
          action: payload.payload.actionUrl ? (
            <ToastAction altText="View" onClick={() => {
              router.push(payload.payload.actionUrl);
            }}>
              View
            </ToastAction>
          ) : undefined
        });
      })
      .subscribe();
    
    // Load existing notifications
    loadNotifications();
    
    return () => {
      channel.unsubscribe();
    };
  }, [userId]);
  
  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);
    
    setNotifications(prev => 
      [prev.map](http://prev.map)(n => [n.id](http://n.id) === notificationId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };
  
  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  };
};
```

### Push Notification Setup (PWA)

```
// app/lib/notifications/push-manager.ts
export class PushNotificationManager {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('Browser doesn\'t support notifications');
      return false;
    }
    
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      await this.subscribeUser();
      return true;
    }
    
    return false;
  }
  
  private async subscribeUser() {
    const registration = await navigator.serviceWorker.ready;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(
        [process.env.NEXT](http://process.env.NEXT)_PUBLIC_VAPID_PUBLIC_KEY!
      )
    });
    
    // Save subscription to database
    await this.saveSubscription(subscription);
  }
  
  private async saveSubscription(subscription: PushSubscription) {
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        platform: 'web',
        deviceInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language
        }
      })
    });
    
    return response.json();
  }
}
```

### Service Worker for Push

```
// public/sw.js
self.addEventListener('push', function(event) {
  const data = [event.data](http://event.data).json();
  
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: [Date.now](http://Date.now)(),
      primaryKey: [data.id](http://data.id),
      actionUrl: data.actionUrl
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/images/view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/images/dismiss.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.openWindow([event.notification.data](http://event.notification.data).actionUrl || '/')
    );
  }
});
```

### Email Digest System

```
// app/lib/notifications/email-digest.ts
export class EmailDigestService {
  async sendDigest(userId: string, frequency: 'daily' | 'weekly') {
    const since = frequency === 'daily' 
      ? subDays(new Date(), 1)
      : subDays(new Date(), 7);
    
    // Get unread notifications
    const notifications = await this.getUnreadNotifications(userId, since);
    
    if (notifications.length === 0) return;
    
    // Group by category
    const grouped = this.groupNotifications(notifications);
    
    // Generate email HTML
    const html = await this.generateDigestHTML(grouped, frequency);
    
    // Send via SendGrid
    await sendEmail({
      to: [user.email](http://user.email),
      subject: `Your ${frequency} WedSync summary`,
      html,
      categories: ['digest', frequency]
    });
    
    // Mark notifications as emailed
    await this.markAsEmailed([notifications.map](http://notifications.map)(n => [n.id](http://n.id)));
  }
  
  private groupNotifications(notifications: Notification[]) {
    return notifications.reduce((groups, notification) => {
      const category = notification.type;
      if (!groups[category]) groups[category] = [];
      groups[category].push(notification);
      return groups;
    }, {} as Record<string, Notification[]>);
  }
}
```

### Notification Center Component

```
// app/components/NotificationCenter.tsx
export const NotificationCenter = () => {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white 
                           rounded-full h-5 w-5 text-xs flex items-center 
                           justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80">
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No notifications
            </p>
          ) : (
            [notifications.map](http://notifications.map)(notification => (
              <NotificationItem
                key={[notification.id](http://notification.id)}
                notification={notification}
                onRead={() => markAsRead([notification.id](http://notification.id))}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
```

## Critical Implementation Notes

1. **Permission Handling**: Always request notification permission at the right moment (after user action)
2. **Quiet Hours**: Respect user timezone and quiet hours preferences
3. **Batching**: Batch multiple notifications to avoid spam
4. **Fallback Channels**: If push fails, fall back to email
5. **Unsubscribe**: Easy unsubscribe/preference management
6. **GDPR Compliance**: Clear consent and data management
7. **Rate Limiting**: Prevent notification flooding
8. **Priority Levels**: Critical vs informational notifications

## Testing Checklist

- [ ]  Test permission request flow
- [ ]  Verify real-time delivery
- [ ]  Test push notification on mobile
- [ ]  Confirm email digest scheduling
- [ ]  Test notification preferences
- [ ]  Verify quiet hours respect
- [ ]  Test mark as read functionality
- [ ]  Validate notification grouping