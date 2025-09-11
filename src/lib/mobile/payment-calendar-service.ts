import {
  format,
  parseISO,
  isBefore,
  addDays,
  differenceInDays,
} from 'date-fns';
import { PaymentSecurityManager } from '@/lib/security/payment-security';

export interface PaymentSchedule {
  id: string;
  weddingId: string;
  title: string;
  description?: string;
  amount: number;
  dueDate: string;
  vendor: {
    id: string;
    name: string;
    category: string;
    contact?: {
      email?: string;
      phone?: string;
    };
  };
  status: 'pending' | 'paid' | 'overdue' | 'upcoming';
  priority: 'low' | 'medium' | 'high' | 'critical';
  reminderSettings: {
    enabled: boolean;
    daysBefore: number[];
    notificationTypes: ('push' | 'email' | 'sms')[];
  };
  paymentMethod?: {
    type: 'check' | 'transfer' | 'card' | 'cash';
    reference?: string;
  };
  paidDate?: string;
  paidAmount?: number;
  attachments?: {
    id: string;
    name: string;
    type: string;
    url: string;
  }[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PaymentCalendarFilters {
  status?: PaymentSchedule['status'][];
  priority?: PaymentSchedule['priority'][];
  vendors?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export class PaymentCalendarService {
  private securityManager: PaymentSecurityManager;
  private baseUrl: string;

  constructor() {
    this.securityManager = new PaymentSecurityManager();
    this.baseUrl = '/api/payments';
  }

  /**
   * Fetch payment schedules with optional filters
   */
  async getPaymentSchedules(
    weddingId: string,
    filters?: PaymentCalendarFilters,
  ): Promise<PaymentSchedule[]> {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('weddingId', weddingId);

      if (filters) {
        if (filters.status?.length) {
          filters.status.forEach((status) =>
            searchParams.append('status', status),
          );
        }
        if (filters.priority?.length) {
          filters.priority.forEach((priority) =>
            searchParams.append('priority', priority),
          );
        }
        if (filters.vendors?.length) {
          filters.vendors.forEach((vendorId) =>
            searchParams.append('vendorId', vendorId),
          );
        }
        if (filters.dateRange) {
          searchParams.append('startDate', filters.dateRange.start);
          searchParams.append('endDate', filters.dateRange.end);
        }
      }

      const response = await fetch(
        `${this.baseUrl}/schedules?${searchParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch payment schedules: ${response.statusText}`,
        );
      }

      const data = await response.json();
      return this.processPaymentSchedules(data.schedules || []);
    } catch (error) {
      console.error('Error fetching payment schedules:', error);
      throw error;
    }
  }

  /**
   * Create a new payment schedule
   */
  async createPaymentSchedule(
    paymentData: Omit<PaymentSchedule, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<PaymentSchedule> {
    try {
      // Encrypt sensitive payment data before transmission
      const encryptedData = await this.securityManager.encryptPaymentData({
        amount: paymentData.amount,
        vendor: paymentData.vendor,
        paymentMethod: paymentData.paymentMethod,
      });

      const response = await fetch(`${this.baseUrl}/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...paymentData,
          encryptedData,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to create payment schedule: ${response.statusText}`,
        );
      }

      const data = await response.json();
      return data.schedule;
    } catch (error) {
      console.error('Error creating payment schedule:', error);
      throw error;
    }
  }

  /**
   * Update payment schedule status and details
   */
  async updatePaymentSchedule(
    scheduleId: string,
    updates: Partial<PaymentSchedule>,
  ): Promise<PaymentSchedule> {
    try {
      // Handle payment completion with security
      if (updates.status === 'paid' && updates.paidAmount && updates.paidDate) {
        const encryptedPaymentData =
          await this.securityManager.encryptPaymentData({
            paidAmount: updates.paidAmount,
            paidDate: updates.paidDate,
            paymentMethod: updates.paymentMethod,
          });

        updates = {
          ...updates,
          encryptedPaymentData,
        };
      }

      const response = await fetch(`${this.baseUrl}/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to update payment schedule: ${response.statusText}`,
        );
      }

      const data = await response.json();
      return data.schedule;
    } catch (error) {
      console.error('Error updating payment schedule:', error);
      throw error;
    }
  }

  /**
   * Delete payment schedule
   */
  async deletePaymentSchedule(scheduleId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/schedules/${scheduleId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(
          `Failed to delete payment schedule: ${response.statusText}`,
        );
      }
    } catch (error) {
      console.error('Error deleting payment schedule:', error);
      throw error;
    }
  }

  /**
   * Get upcoming payment reminders
   */
  async getUpcomingReminders(
    weddingId: string,
    days: number = 30,
  ): Promise<PaymentSchedule[]> {
    const endDate = addDays(new Date(), days);
    const filters: PaymentCalendarFilters = {
      status: ['pending', 'upcoming'],
      dateRange: {
        start: new Date().toISOString(),
        end: endDate.toISOString(),
      },
    };

    const schedules = await this.getPaymentSchedules(weddingId, filters);

    // Filter schedules that need reminders
    return schedules.filter((schedule) => {
      if (!schedule.reminderSettings.enabled) return false;

      const dueDate = parseISO(schedule.dueDate);
      const daysUntilDue = differenceInDays(dueDate, new Date());

      return schedule.reminderSettings.daysBefore.includes(daysUntilDue);
    });
  }

  /**
   * Send payment reminder notifications
   */
  async sendPaymentReminders(weddingId: string): Promise<{
    sent: number;
    failed: number;
    skipped: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/reminders/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ weddingId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send reminders: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending payment reminders:', error);
      throw error;
    }
  }

  /**
   * Get payment analytics and insights
   */
  async getPaymentAnalytics(weddingId: string): Promise<{
    totalScheduled: number;
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
    averagePaymentAmount: number;
    paymentsByVendorCategory: {
      category: string;
      amount: number;
      count: number;
    }[];
    paymentTimeline: { date: string; amount: number; type: 'due' | 'paid' }[];
    upcomingPayments: { date: string; count: number; amount: number }[];
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/analytics?weddingId=${weddingId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch payment analytics: ${response.statusText}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching payment analytics:', error);
      throw error;
    }
  }

  /**
   * Bulk update payment schedules
   */
  async bulkUpdatePaymentSchedules(
    updates: { scheduleId: string; updates: Partial<PaymentSchedule> }[],
  ): Promise<{ successful: number; failed: number; errors: any[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/schedules/bulk`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        throw new Error(`Bulk update failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in bulk update:', error);
      throw error;
    }
  }

  /**
   * Export payment schedules for offline use
   */
  async exportPaymentSchedules(
    weddingId: string,
    format: 'json' | 'csv' = 'json',
  ): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/export?weddingId=${weddingId}&format=${format}`,
        {
          method: 'GET',
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      if (format === 'json') {
        const data = await response.json();
        return JSON.stringify(data, null, 2);
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error('Error exporting payment schedules:', error);
      throw error;
    }
  }

  /**
   * Process payment schedules to add computed fields and status updates
   */
  private processPaymentSchedules(
    schedules: PaymentSchedule[],
  ): PaymentSchedule[] {
    const now = new Date();

    return schedules.map((schedule) => {
      const dueDate = parseISO(schedule.dueDate);

      // Auto-update status based on due date
      if (schedule.status === 'pending' && isBefore(dueDate, now)) {
        schedule.status = 'overdue';
      } else if (
        schedule.status === 'pending' &&
        differenceInDays(dueDate, now) > 7
      ) {
        schedule.status = 'upcoming';
      }

      return schedule;
    });
  }

  /**
   * Sync offline payment updates
   */
  async syncOfflineUpdates(
    offlineUpdates: {
      type: 'create' | 'update' | 'delete';
      scheduleId?: string;
      data: any;
      timestamp: number;
    }[],
  ): Promise<{
    synced: number;
    failed: number;
    conflicts: any[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ updates: offlineUpdates }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error syncing offline updates:', error);
      throw error;
    }
  }

  /**
   * Configure payment reminder preferences
   */
  async updateReminderPreferences(
    weddingId: string,
    preferences: {
      globalEnabled: boolean;
      defaultDaysBefore: number[];
      defaultNotificationTypes: ('push' | 'email' | 'sms')[];
      quietHours?: {
        start: string; // "09:00"
        end: string; // "18:00"
      };
    },
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/reminder-preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ weddingId, preferences }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to update reminder preferences: ${response.statusText}`,
        );
      }
    } catch (error) {
      console.error('Error updating reminder preferences:', error);
      throw error;
    }
  }
}

// Singleton instance for app-wide use
export const paymentCalendarService = new PaymentCalendarService();
