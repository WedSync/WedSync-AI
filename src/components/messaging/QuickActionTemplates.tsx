/**
 * WS-155: Quick Action Templates with Swipe-based Actions
 * Mobile-optimized quick messaging actions with gesture support
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, PanInfo } from 'framer-motion';
// useMotionValue // useMotionValue removed - use useState
// useAnimation // useAnimation removed - use motion controls
import {
  Send,
  Clock,
  CheckCircle,
  XCircle,
  ThumbsUp,
  Calendar,
  MapPin,
  AlertCircle,
  Heart,
  MessageCircle,
  Phone,
  Mail,
  Copy,
  Archive,
  Trash2,
  Edit,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { smartMessageComposer } from '@/lib/services/smart-message-composer';
import { pushNotificationSystem } from '@/lib/services/push-notification-system';
import { advancedOfflineSync } from '@/lib/services/advanced-offline-sync';

// Quick action types
interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  action: (guestId: string) => Promise<void>;
  requiresConfirmation?: boolean;
  swipeDirection?: 'left' | 'right';
}

// Template action
interface TemplateAction {
  id: string;
  name: string;
  description: string;
  template: string;
  category: string;
  icon: React.ReactNode;
  variables?: string[];
}

interface QuickActionTemplatesProps {
  guestId: string;
  weddingId: string;
  onActionComplete?: (actionId: string, result: any) => void;
  className?: string;
}

export function QuickActionTemplates({
  guestId,
  weddingId,
  onActionComplete,
  className,
}: QuickActionTemplatesProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateAction | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState<QuickAction | null>(
    null,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const controls = useAnimation();

  // Define quick actions
  const quickActions: QuickAction[] = [
    {
      id: 'send_reminder',
      label: 'Send RSVP Reminder',
      icon: <Clock className="w-5 h-5" />,
      color: 'bg-blue-500',
      action: async (guestId) => await sendRSVPReminder(guestId),
      swipeDirection: 'right',
    },
    {
      id: 'thank_you',
      label: 'Send Thank You',
      icon: <Heart className="w-5 h-5" />,
      color: 'bg-pink-500',
      action: async (guestId) => await sendThankYou(guestId),
      swipeDirection: 'right',
    },
    {
      id: 'event_update',
      label: 'Send Event Update',
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'bg-yellow-500',
      action: async (guestId) => await sendEventUpdate(guestId),
      requiresConfirmation: true,
      swipeDirection: 'right',
    },
    {
      id: 'location_details',
      label: 'Send Location Details',
      icon: <MapPin className="w-5 h-5" />,
      color: 'bg-green-500',
      action: async (guestId) => await sendLocationDetails(guestId),
      swipeDirection: 'left',
    },
    {
      id: 'schedule_call',
      label: 'Schedule Call',
      icon: <Phone className="w-5 h-5" />,
      color: 'bg-purple-500',
      action: async (guestId) => await scheduleCall(guestId),
      swipeDirection: 'left',
    },
    {
      id: 'archive_conversation',
      label: 'Archive Conversation',
      icon: <Archive className="w-5 h-5" />,
      color: 'bg-gray-500',
      action: async (guestId) => await archiveConversation(guestId),
      requiresConfirmation: true,
      swipeDirection: 'left',
    },
  ];

  // Template actions
  const templateActions: TemplateAction[] = [
    {
      id: 'invite_template',
      name: 'Wedding Invitation',
      description: 'Formal invitation with all event details',
      template: `Dear {guest_name},

We are delighted to invite you to celebrate our wedding on {event_date} at {venue_name}.

Please RSVP by {rsvp_deadline} at {website_url}.

With love,
{couple_names}`,
      category: 'invitation',
      icon: <Mail className="w-5 h-5" />,
      variables: [
        'guest_name',
        'event_date',
        'venue_name',
        'rsvp_deadline',
        'website_url',
        'couple_names',
      ],
    },
    {
      id: 'reminder_template',
      name: 'RSVP Reminder',
      description: 'Gentle reminder to RSVP',
      template: `Hi {guest_name}!

Just a friendly reminder to RSVP for our wedding on {event_date}.

Please let us know if you'll be able to join us: {website_url}

Thank you!
{couple_names}`,
      category: 'reminder',
      icon: <Clock className="w-5 h-5" />,
      variables: ['guest_name', 'event_date', 'website_url', 'couple_names'],
    },
    {
      id: 'thank_template',
      name: 'Thank You Message',
      description: 'Express gratitude after the event',
      template: `Dear {guest_name},

Thank you so much for being part of our special day! Your presence made our wedding even more memorable.

With appreciation,
{couple_names}`,
      category: 'thank_you',
      icon: <Heart className="w-5 h-5" />,
      variables: ['guest_name', 'couple_names'],
    },
  ];

  // Handle swipe gesture
  const handleDragEnd = useCallback(
    async (event: any, info: PanInfo) => {
      const threshold = 100;
      const velocity = info.velocity.x;
      const offset = info.offset.x;

      if (Math.abs(offset) > threshold || Math.abs(velocity) > 500) {
        const direction = offset > 0 ? 'right' : 'left';

        // Find action for this swipe direction
        const action = quickActions.find(
          (a) => a.swipeDirection === direction && !a.requiresConfirmation,
        );

        if (action) {
          await executeQuickAction(action);
        }

        // Animate card off screen
        await controls.start({
          x: offset > 0 ? 300 : -300,
          opacity: 0,
          transition: { duration: 0.2 },
        });

        // Reset position
        setTimeout(() => {
          controls.start({
            x: 0,
            opacity: 1,
            transition: { duration: 0.3 },
          });
        }, 200);
      } else {
        // Spring back to center
        controls.start({
          x: 0,
          transition: { type: 'spring', stiffness: 300, damping: 20 },
        });
      }
    },
    [quickActions, controls],
  );

  // Execute quick action
  const executeQuickAction = async (action: QuickAction) => {
    if (action.requiresConfirmation) {
      setShowConfirmation(action);
      return;
    }

    setIsProcessing(true);
    setActiveAction(action.id);

    try {
      const result = await action.action(guestId);

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      // Show success animation
      await showSuccessAnimation();

      onActionComplete?.(action.id, result);
    } catch (error) {
      console.error(`Quick action ${action.id} failed:`, error);
      await showErrorAnimation();
    } finally {
      setIsProcessing(false);
      setActiveAction(null);
    }
  };

  // Send RSVP reminder
  const sendRSVPReminder = async (guestId: string) => {
    const suggestions = await smartMessageComposer.generateSuggestions({
      guestId,
      weddingId,
      context: 'reminder',
      tone: 'friendly',
      language: 'en',
      includeDetails: {
        eventDate: true,
        venue: true,
        rsvpStatus: true,
        personalizedGreeting: true,
      },
    });

    if (suggestions.length > 0) {
      const message = suggestions[0].message;

      // Queue for offline sync
      await advancedOfflineSync.queueOperation(
        'CREATE',
        'messages',
        `msg_${Date.now()}`,
        {
          guest_id: guestId,
          wedding_id: weddingId,
          content: message,
          type: 'reminder',
          sent_at: new Date().toISOString(),
        },
      );

      // Send push notification
      await pushNotificationSystem.sendNotification(guestId, 'RSVP_REMINDER', {
        title: 'RSVP Reminder',
        body: 'Please respond to our wedding invitation',
        data: { guestId, weddingId },
      });
    }
  };

  // Send thank you message
  const sendThankYou = async (guestId: string) => {
    const suggestions = await smartMessageComposer.generateSuggestions({
      guestId,
      weddingId,
      context: 'thank_you',
      tone: 'friendly',
      language: 'en',
    });

    if (suggestions.length > 0) {
      const message = suggestions[0].message;

      await advancedOfflineSync.queueOperation(
        'CREATE',
        'messages',
        `msg_${Date.now()}`,
        {
          guest_id: guestId,
          wedding_id: weddingId,
          content: message,
          type: 'thank_you',
          sent_at: new Date().toISOString(),
        },
      );
    }
  };

  // Send event update
  const sendEventUpdate = async (guestId: string) => {
    const suggestions = await smartMessageComposer.generateSuggestions({
      guestId,
      weddingId,
      context: 'update',
      tone: 'professional',
      language: 'en',
      includeDetails: {
        eventDate: true,
        venue: true,
        rsvpStatus: false,
        personalizedGreeting: true,
      },
    });

    if (suggestions.length > 0) {
      const message = suggestions[0].message;

      await advancedOfflineSync.queueOperation(
        'CREATE',
        'messages',
        `msg_${Date.now()}`,
        {
          guest_id: guestId,
          wedding_id: weddingId,
          content: message,
          type: 'update',
          priority: true,
          sent_at: new Date().toISOString(),
        },
        { priority: 10 },
      );

      // Send urgent push notification
      await pushNotificationSystem.sendNotification(
        guestId,
        'EVENT_REMINDER',
        {
          title: 'Important Wedding Update',
          body: 'Please check for updated event information',
          requireInteraction: true,
          data: { guestId, weddingId },
        },
        { priority: 10 },
      );
    }
  };

  // Send location details
  const sendLocationDetails = async (guestId: string) => {
    const { data: wedding } = await supabase
      .from('weddings')
      .select('venue_name, venue_address, venue_coordinates')
      .eq('id', weddingId)
      .single();

    if (wedding) {
      const message = `📍 Venue Details:
${wedding.venue_name}
${wedding.venue_address}

Get directions: https://maps.google.com/?q=${wedding.venue_coordinates}`;

      await advancedOfflineSync.queueOperation(
        'CREATE',
        'messages',
        `msg_${Date.now()}`,
        {
          guest_id: guestId,
          wedding_id: weddingId,
          content: message,
          type: 'location',
          sent_at: new Date().toISOString(),
        },
      );
    }
  };

  // Schedule a call
  const scheduleCall = async (guestId: string) => {
    // Open calendar or scheduling interface
    window.dispatchEvent(
      new CustomEvent('schedule-call', {
        detail: { guestId, weddingId },
      }),
    );
  };

  // Archive conversation
  const archiveConversation = async (guestId: string) => {
    await supabase
      .from('conversations')
      .update({ archived: true, archived_at: new Date().toISOString() })
      .eq('guest_id', guestId)
      .eq('wedding_id', weddingId);
  };

  // Show success animation
  const showSuccessAnimation = async () => {
    return new Promise<void>((resolve) => {
      // Animate success indicator
      setTimeout(resolve, 500);
    });
  };

  // Show error animation
  const showErrorAnimation = async () => {
    return new Promise<void>((resolve) => {
      // Animate error indicator
      controls.start({
        x: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.5 },
      });
      setTimeout(resolve, 500);
    });
  };

  // Apply template
  const applyTemplate = async (template: TemplateAction) => {
    setIsProcessing(true);

    try {
      // Get guest and wedding data
      const { data: guest } = await supabase
        .from('guests')
        .select('*')
        .eq('id', guestId)
        .single();

      const { data: wedding } = await supabase
        .from('weddings')
        .select('*')
        .eq('id', weddingId)
        .single();

      // Process template variables
      let message = template.template;
      const replacements: Record<string, string> = {
        '{guest_name}': guest?.name || 'Guest',
        '{couple_names}': wedding?.couple_names || 'The Couple',
        '{event_date}': wedding?.event_date || 'the wedding date',
        '{venue_name}': wedding?.venue_name || 'the venue',
        '{rsvp_deadline}': wedding?.rsvp_deadline || 'soon',
        '{website_url}': wedding?.website_url || '',
      };

      Object.entries(replacements).forEach(([variable, value]) => {
        message = message.replace(new RegExp(variable, 'g'), value);
      });

      // Send message
      await advancedOfflineSync.queueOperation(
        'CREATE',
        'messages',
        `msg_${Date.now()}`,
        {
          guest_id: guestId,
          wedding_id: weddingId,
          content: message,
          template_id: template.id,
          sent_at: new Date().toISOString(),
        },
      );

      onActionComplete?.(template.id, { message });
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Failed to apply template:', error);
      await showErrorAnimation();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* Swipeable Quick Actions Card */}
      <motion.div
        ref={containerRef}
        drag="x"
        dragConstraints={{ left: -200, right: 200 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-4 cursor-grab active:cursor-grabbing"
      >
        {/* Swipe Indicators */}
        <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
          <div
            className={cn(
              'flex items-center gap-2 transition-opacity',
              swipeOffset > 50 ? 'opacity-100' : 'opacity-0',
            )}
          >
            <CheckCircle className="w-6 h-6 text-green-500" />
            <span className="text-green-500 font-medium">Send Reminder</span>
          </div>
          <div
            className={cn(
              'flex items-center gap-2 transition-opacity',
              swipeOffset < -50 ? 'opacity-100' : 'opacity-0',
            )}
          >
            <span className="text-blue-500 font-medium">Location</span>
            <MapPin className="w-6 h-6 text-blue-500" />
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-3 gap-2">
          {quickActions.slice(0, 6).map((action) => (
            <button
              key={action.id}
              onClick={() => executeQuickAction(action)}
              disabled={isProcessing}
              className={cn(
                'flex flex-col items-center justify-center p-3 rounded-lg transition-all',
                action.color,
                'text-white hover:opacity-90 active:scale-95',
                activeAction === action.id && 'ring-2 ring-white ring-offset-2',
                isProcessing && 'opacity-50 cursor-not-allowed',
              )}
            >
              {action.icon}
              <span className="text-xs mt-1 text-center">{action.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Template Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Message Templates
        </h3>
        <div className="space-y-2">
          {templateActions.map((template) => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template)}
              disabled={isProcessing}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg',
                'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600',
                'transition-colors text-left',
                selectedTemplate?.id === template.id && 'ring-2 ring-blue-500',
                isProcessing && 'opacity-50 cursor-not-allowed',
              )}
            >
              <div className="flex-shrink-0">{template.icon}</div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {template.name}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {template.description}
                </p>
              </div>
              <Send className="w-4 h-4 text-gray-400" />
            </button>
          ))}
        </div>
      </div>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-semibold mb-4">
              {selectedTemplate.name}
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                {selectedTemplate.template}
              </pre>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => applyTemplate(selectedTemplate)}
                disabled={isProcessing}
                className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                Send Message
              </button>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6"
          >
            <h3 className="text-lg font-semibold mb-2">Confirm Action</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to {showConfirmation.label.toLowerCase()}?
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const action = showConfirmation;
                  setShowConfirmation(null);
                  await executeQuickAction(action);
                }}
                className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowConfirmation(null)}
                className="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
