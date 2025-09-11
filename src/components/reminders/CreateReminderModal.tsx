'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  User,
  MessageSquare,
  Mail,
  Phone,
  Bell,
} from 'lucide-react';
import type {
  ReminderTemplate,
  CreateReminderRequest,
} from '@/lib/services/reminder-service';

interface CreateReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: CreateReminderRequest) => Promise<void>;
  templates: ReminderTemplate[];
  clients?: Array<{ id: string; name: string; email?: string; phone?: string }>;
}

export function CreateReminderModal({
  isOpen,
  onClose,
  onSubmit,
  templates,
  clients = [],
}: CreateReminderModalProps) {
  const [formData, setFormData] = useState({
    templateId: '',
    entityType: 'milestone',
    entityName: '',
    triggerDate: '',
    advanceDays: 0,
    selectedRecipients: [] as string[],
    customRecipient: {
      email: '',
      phone: '',
      name: '',
    },
    channels: {
      email: true,
      sms: false,
      inApp: true,
    },
    isRecurring: false,
    recurrencePattern: 'weekly' as 'daily' | 'weekly' | 'monthly',
    recurrenceEnd: '',
  });

  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ReminderTemplate | null>(null);

  useEffect(() => {
    if (formData.templateId) {
      const template = templates.find((t) => t.id === formData.templateId);
      setSelectedTemplate(template || null);
    }
  }, [formData.templateId, templates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.templateId || !formData.entityName || !formData.triggerDate) {
      alert('Please fill in all required fields');
      return;
    }

    if (
      formData.selectedRecipients.length === 0 &&
      !formData.customRecipient.email &&
      !formData.customRecipient.phone
    ) {
      alert('Please select at least one recipient or add custom recipient');
      return;
    }

    setLoading(true);

    try {
      // Build recipients array
      const recipients = [];

      // Add selected clients
      for (const clientId of formData.selectedRecipients) {
        const client = clients.find((c) => c.id === clientId);
        if (client) {
          recipients.push({
            id: client.id,
            type: 'client' as const,
            email: client.email,
            phone: client.phone,
          });
        }
      }

      // Add custom recipient if provided
      if (formData.customRecipient.email || formData.customRecipient.phone) {
        recipients.push({
          id: 'custom-' + Date.now(),
          type: 'client' as const,
          email: formData.customRecipient.email,
          phone: formData.customRecipient.phone,
        });
      }

      const request: CreateReminderRequest = {
        templateId: formData.templateId,
        entityType: formData.entityType,
        entityId: 'manual-' + Date.now(), // Generate ID for manual reminders
        entityName: formData.entityName,
        triggerDate: formData.triggerDate,
        advanceDays: formData.advanceDays,
        recipients,
        channels: formData.channels,
        isRecurring: formData.isRecurring,
        recurrencePattern: formData.isRecurring
          ? formData.recurrencePattern
          : undefined,
        recurrenceEnd: formData.isRecurring
          ? formData.recurrenceEnd
          : undefined,
      };

      await onSubmit(request);

      // Reset form
      setFormData({
        templateId: '',
        entityType: 'milestone',
        entityName: '',
        triggerDate: '',
        advanceDays: 0,
        selectedRecipients: [],
        customRecipient: { email: '', phone: '', name: '' },
        channels: { email: true, sms: false, inApp: true },
        isRecurring: false,
        recurrencePattern: 'weekly',
        recurrenceEnd: '',
      });

      onClose();
    } catch (error) {
      console.error('Failed to create reminder:', error);
      alert('Failed to create reminder. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleRecipient = (clientId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedRecipients: prev.selectedRecipients.includes(clientId)
        ? prev.selectedRecipients.filter((id) => id !== clientId)
        : [...prev.selectedRecipients, clientId],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl max-w-2xl w-full mx-4 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Create New Reminder
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 max-h-96 overflow-y-auto"
        >
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template *
            </label>
            <select
              value={formData.templateId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, templateId: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
              required
            >
              <option value="">Select a template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.category})
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <p className="mt-1 text-sm text-gray-500">
                {selectedTemplate.description}
              </p>
            )}
          </div>

          {/* Entity Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                value={formData.entityType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    entityType: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
              >
                <option value="milestone">Milestone</option>
                <option value="payment">Payment</option>
                <option value="vendor_task">Vendor Task</option>
                <option value="couple_task">Couple Task</option>
                <option value="deadline">Deadline</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.entityName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    entityName: e.target.value,
                  }))
                }
                placeholder="e.g., Final venue payment"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                required
              />
            </div>
          </div>

          {/* Timing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trigger Date *
              </label>
              <input
                type="datetime-local"
                value={formData.triggerDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    triggerDate: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send Days Before
              </label>
              <input
                type="number"
                min="0"
                max="365"
                value={formData.advanceDays}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    advanceDays: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
              />
            </div>
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipients *
            </label>

            {clients.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Select from existing clients:
                </p>
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {clients.map((client) => (
                    <label
                      key={client.id}
                      className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedRecipients.includes(
                          client.id,
                        )}
                        onChange={() => toggleRecipient(client.id)}
                        className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {client.name} ({client.email || client.phone})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-600 mb-2">
                Or add custom recipient:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="email"
                  placeholder="Email address"
                  value={formData.customRecipient.email}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      customRecipient: {
                        ...prev.customRecipient,
                        email: e.target.value,
                      },
                    }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                />
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={formData.customRecipient.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      customRecipient: {
                        ...prev.customRecipient,
                        phone: e.target.value,
                      },
                    }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                />
              </div>
            </div>
          </div>

          {/* Channels */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notification Channels
            </label>
            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.channels.email}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      channels: { ...prev.channels, email: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <Mail className="h-4 w-4 ml-2 mr-1 text-blue-500" />
                <span className="text-sm text-gray-700">Email</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.channels.sms}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      channels: { ...prev.channels, sms: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <Phone className="h-4 w-4 ml-2 mr-1 text-green-500" />
                <span className="text-sm text-gray-700">SMS</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.channels.inApp}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      channels: { ...prev.channels, inApp: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <Bell className="h-4 w-4 ml-2 mr-1 text-purple-500" />
                <span className="text-sm text-gray-700">In-App</span>
              </label>
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <label className="flex items-center mb-3">
              <input
                type="checkbox"
                checked={formData.isRecurring}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isRecurring: e.target.checked,
                  }))
                }
                className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                Recurring reminder
              </span>
            </label>

            {formData.isRecurring && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Pattern
                  </label>
                  <select
                    value={formData.recurrencePattern}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        recurrencePattern: e.target.value as
                          | 'daily'
                          | 'weekly'
                          | 'monthly',
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.recurrenceEnd}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        recurrenceEnd: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                  />
                </div>
              </div>
            )}
          </div>
        </form>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Reminder'}
          </button>
        </div>
      </div>
    </div>
  );
}
