import { Page, Browser } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

export interface BroadcastData {
  id?: string;
  type: string;
  priority: 'normal' | 'high' | 'critical';
  title: string;
  message: string;
  weddingContext?: {
    weddingId: string;
    coupleName: string;
    weddingDate: Date | string;
  };
  action?: {
    label: string;
    url: string;
  };
  targeting?: {
    userIds?: string[];
    weddingIds?: string[];
    roles?: string[];
  };
  metadata?: Record<string, any>;
}

export interface DeliveryStatus {
  broadcastId: string;
  userId: string;
  deliveredAt: Date;
  acknowledgedAt?: Date;
  actionClicked?: boolean;
  readAt?: Date;
}

export class BroadcastTestHelper {
  private supabase: ReturnType<typeof createClient>;
  private testBroadcasts: string[] = [];

  async initialize(): Promise<void> {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        (() => {
          throw new Error(
            'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
          );
        })(),
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        (() => {
          throw new Error(
            'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
          );
        })(),
    );
  }

  async sendBroadcast(
    broadcastData: BroadcastData,
    recipients: string[],
  ): Promise<string> {
    const broadcastId =
      broadcastData.id ||
      `test-broadcast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Store broadcast data for testing
    const { error: broadcastError } = await this.supabase
      .from('broadcasts')
      .insert({
        id: broadcastId,
        type: broadcastData.type,
        priority: broadcastData.priority,
        title: broadcastData.title,
        message: broadcastData.message,
        wedding_context: broadcastData.weddingContext,
        action: broadcastData.action,
        targeting: broadcastData.targeting,
        metadata: broadcastData.metadata || {},
        created_at: new Date().toISOString(),
      });

    if (broadcastError) {
      throw new Error(
        `Failed to create test broadcast: ${broadcastError.message}`,
      );
    }

    // Create delivery records for recipients
    const deliveryRecords = recipients.map((userId) => ({
      broadcast_id: broadcastId,
      user_id: userId,
      status: 'pending',
      created_at: new Date().toISOString(),
    }));

    const { error: deliveryError } = await this.supabase
      .from('broadcast_deliveries')
      .insert(deliveryRecords);

    if (deliveryError) {
      throw new Error(
        `Failed to create delivery records: ${deliveryError.message}`,
      );
    }

    // Track for cleanup
    this.testBroadcasts.push(broadcastId);

    // Simulate broadcast processing (in real system, this would be handled by queue)
    await this.processBroadcast(broadcastId, recipients);

    return broadcastId;
  }

  private async processBroadcast(
    broadcastId: string,
    recipients: string[],
  ): Promise<void> {
    // Simulate broadcast processing delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Update delivery status to 'delivered'
    const { error } = await this.supabase
      .from('broadcast_deliveries')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      })
      .eq('broadcast_id', broadcastId)
      .in('user_id', recipients);

    if (error) {
      console.error('Failed to update delivery status:', error);
    }
  }

  async getDeliveryStatus(
    broadcastId: string,
    userId: string,
  ): Promise<DeliveryStatus> {
    const { data, error } = await this.supabase
      .from('broadcast_deliveries')
      .select('*')
      .eq('broadcast_id', broadcastId)
      .eq('user_id', userId)
      .single();

    if (error) {
      throw new Error(`Failed to get delivery status: ${error.message}`);
    }

    return {
      broadcastId: data.broadcast_id,
      userId: data.user_id,
      deliveredAt: new Date(data.delivered_at),
      acknowledgedAt: data.acknowledged_at
        ? new Date(data.acknowledged_at)
        : undefined,
      actionClicked: data.action_clicked || false,
      readAt: data.read_at ? new Date(data.read_at) : undefined,
    };
  }

  async markAsAcknowledged(broadcastId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('broadcast_deliveries')
      .update({
        acknowledged_at: new Date().toISOString(),
      })
      .eq('broadcast_id', broadcastId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to mark as acknowledged: ${error.message}`);
    }
  }

  async markAsRead(broadcastId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('broadcast_deliveries')
      .update({
        read_at: new Date().toISOString(),
      })
      .eq('broadcast_id', broadcastId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to mark as read: ${error.message}`);
    }
  }

  async trackActionClick(broadcastId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('broadcast_deliveries')
      .update({
        action_clicked: true,
        action_clicked_at: new Date().toISOString(),
      })
      .eq('broadcast_id', broadcastId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to track action click: ${error.message}`);
    }
  }

  async getUserPreferences(userId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // Not found error is OK
      throw new Error(`Failed to get user preferences: ${error.message}`);
    }

    return (
      data || {
        user_id: userId,
        email_frequency: 'immediate',
        sms_enabled: true,
        quiet_hours_enabled: false,
        quiet_start: '22:00',
        quiet_end: '08:00',
        emergency_only: false,
      }
    );
  }

  async setUserPreferences(userId: string, preferences: any): Promise<void> {
    const { error } = await this.supabase
      .from('user_notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
      });

    if (error) {
      throw new Error(`Failed to set user preferences: ${error.message}`);
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('broadcast_deliveries')
      .select('count')
      .eq('user_id', userId)
      .is('read_at', null)
      .single();

    if (error) {
      return 0;
    }

    return data?.count || 0;
  }

  async getBroadcastHistory(
    userId: string,
    limit: number = 50,
  ): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('broadcast_deliveries')
      .select(
        `
        *,
        broadcast:broadcasts(*)
      `,
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get broadcast history: ${error.message}`);
    }

    return data || [];
  }

  async waitForBroadcastDelivery(
    broadcastId: string,
    userId: string,
    timeoutMs: number = 10000,
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await this.getDeliveryStatus(broadcastId, userId);
        if (status.deliveredAt) {
          return true;
        }
      } catch (error) {
        // Delivery record might not exist yet
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return false;
  }

  async simulateWebSocketConnection(page: Page, userId: string): Promise<void> {
    await page.addInitScript((userId: string) => {
      // Mock WebSocket connection for real-time broadcasts
      window.mockBroadcastSocket = {
        userId,
        connected: true,
        listeners: new Map(),

        on(event: string, callback: Function) {
          if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
          }
          this.listeners.get(event).push(callback);
        },

        emit(event: string, data: any) {
          const callbacks = this.listeners.get(event) || [];
          callbacks.forEach((callback: Function) => callback(data));
        },
      };

      // Override any real WebSocket connections with mock
      (window as any).WebSocket = class MockWebSocket {
        constructor(url: string) {
          this.url = url;
          this.readyState = 1; // OPEN
          setTimeout(() => this.onopen?.(), 100);
        }
        send() {}
        close() {}
        addEventListener() {}
        removeEventListener() {}
      };
    }, userId);
  }

  async triggerRealtimeBroadcast(
    page: Page,
    broadcastData: BroadcastData,
  ): Promise<void> {
    await page.evaluate((broadcast) => {
      if ((window as any).mockBroadcastSocket) {
        (window as any).mockBroadcastSocket.emit('broadcast', broadcast);
      }
    }, broadcastData);
  }

  async cleanup(): Promise<void> {
    // Clean up test broadcasts and related data
    if (this.testBroadcasts.length > 0) {
      // Delete delivery records
      await this.supabase
        .from('broadcast_deliveries')
        .delete()
        .in('broadcast_id', this.testBroadcasts);

      // Delete broadcasts
      await this.supabase
        .from('broadcasts')
        .delete()
        .in('id', this.testBroadcasts);
    }

    this.testBroadcasts = [];
  }
}
