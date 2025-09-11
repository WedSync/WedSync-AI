'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Bell,
  MessageSquare,
  Mail,
  Phone,
} from 'lucide-react';
import type {
  ReminderSchedule,
  ReminderTemplate,
} from '@/lib/services/reminder-service';
import { createReminderService } from '@/lib/services/reminder-service';
import { createClient } from '@/lib/supabase/client';

const supabase = await createClient();
const reminderService = createReminderService(supabase);

export default function RemindersPage() {
  const [reminders, setReminders] = useState<ReminderSchedule[]>([]);
  const [templates, setTemplates] = useState<ReminderTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get organization from user session (simplified)
      const organizationId = 'temp-org-id'; // Replace with actual org ID from auth

      const [remindersData, templatesData] = await Promise.all([
        reminderService.getReminders(organizationId),
        reminderService.getTemplates(organizationId),
      ]);

      setReminders(remindersData);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReminders = reminders.filter((reminder) => {
    const matchesSearch = reminder.entity_name
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || reminder.status === statusFilter;
    const matchesCategory = categoryFilter === 'all'; // Add category filtering when templates are joined

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleSnoozeReminder = async (id: string) => {
    try {
      const snoozeUntil = new Date();
      snoozeUntil.setHours(snoozeUntil.getHours() + 24); // Snooze for 24 hours

      await reminderService.snoozeReminder(id, snoozeUntil.toISOString());
      await loadData();
    } catch (error) {
      console.error('Failed to snooze reminder:', error);
    }
  };

  const handleCancelReminder = async (id: string) => {
    try {
      await reminderService.cancelReminder(id);
      await loadData();
    } catch (error) {
      console.error('Failed to cancel reminder:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
      processing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      sent: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
      snoozed: 'bg-purple-100 text-purple-800 border-purple-200',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.scheduled}`}
      >
        {status}
      </span>
    );
  };

  const getChannelIcons = (reminder: ReminderSchedule) => {
    return (
      <div className="flex items-center space-x-2">
        {reminder.send_email && (
          <Mail className="h-4 w-4 text-blue-500" title="Email enabled" />
        )}
        {reminder.send_sms && (
          <Phone className="h-4 w-4 text-green-500" title="SMS enabled" />
        )}
        {reminder.send_in_app && (
          <Bell className="h-4 w-4 text-purple-500" title="In-app enabled" />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Automated Reminders
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage wedding milestone notifications and deadline reminders
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Reminder
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search reminders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="processing">Processing</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="snoozed">Snoozed</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
          >
            <option value="all">All Categories</option>
            <option value="payment">Payment</option>
            <option value="milestone">Milestone</option>
            <option value="vendor_task">Vendor Task</option>
            <option value="couple_task">Couple Task</option>
            <option value="deadline">Deadline</option>
          </select>
        </div>
      </div>

      {/* Reminders List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredReminders.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No reminders found</p>
            <p className="text-sm text-gray-400 mt-1">
              Create your first reminder to get started
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredReminders.map((reminder) => (
              <div
                key={reminder.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {reminder.entity_name}
                      </h3>
                      {getStatusBadge(reminder.status || 'scheduled')}
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {reminder.trigger_date
                          ? new Date(reminder.trigger_date).toLocaleDateString()
                          : 'No date'}
                      </div>
                      <div className="flex items-center">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        {reminder.entity_type}
                      </div>
                      <div>
                        To:{' '}
                        {reminder.recipient_email ||
                          reminder.recipient_phone ||
                          'Unknown'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      {getChannelIcons(reminder)}

                      <div className="flex items-center space-x-2">
                        {reminder.status === 'scheduled' && (
                          <>
                            <button
                              onClick={() => handleSnoozeReminder(reminder.id!)}
                              className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200 transition-colors"
                            >
                              Snooze 24h
                            </button>
                            <button
                              onClick={() => handleCancelReminder(reminder.id!)}
                              className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded-full hover:bg-red-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        <button className="px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 transition-colors">
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Scheduled</p>
              <p className="text-2xl font-semibold text-gray-900">
                {reminders.filter((r) => r.status === 'scheduled').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Bell className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Sent</p>
              <p className="text-2xl font-semibold text-gray-900">
                {reminders.filter((r) => r.status === 'sent').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <MessageSquare className="h-5 w-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Failed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {reminders.filter((r) => r.status === 'failed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Filter className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-semibold text-gray-900">
                {reminders.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
