'use client';

/**
 * WS-202: Supabase Realtime Integration - Toast Notification Component
 * Wedding industry realtime notification toasts
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UIRealtimeToastProps, WeddingUIEventType } from '@/types/realtime';
import {
  FileText,
  MapPin,
  Calendar,
  Users,
  CreditCard,
  FileCheck,
  CheckCircle,
  AlertTriangle,
  Heart,
  X,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Wedding-specific toast content configuration
const getToastContent = (
  type: WeddingUIEventType,
  data: Record<string, unknown>,
) => {
  switch (type) {
    case 'form_response':
      return {
        icon: FileText,
        title: 'New Form Response',
        description: `${data.clientName || 'Client'} submitted ${data.formName || 'a form'}`,
        action: 'View Response',
        color: 'blue',
        urgency: 'medium' as const,
      };
    case 'journey_update':
      return {
        icon: MapPin,
        title: 'Journey Progress',
        description: `${data.clientName || 'Client'} completed ${data.stepName || 'a step'}`,
        action: 'View Progress',
        color: 'green',
        urgency: 'medium' as const,
      };
    case 'wedding_change':
      return {
        icon: Calendar,
        title: 'Wedding Details Updated',
        description: `${data.field || 'Details'} changed${data.newValue ? ` to ${data.newValue}` : ''}`,
        action: 'View Changes',
        color: 'amber',
        urgency: 'high' as const,
      };
    case 'client_update':
      return {
        icon: Users,
        title: 'Client Information Updated',
        description: `${data.clientName || 'Client'} updated their profile`,
        action: 'View Profile',
        color: 'indigo',
        urgency: 'low' as const,
      };
    case 'vendor_checkin':
      return {
        icon: CheckCircle,
        title: 'Vendor Checked In',
        description: `${data.vendorName || 'Vendor'} arrived at ${data.location || 'venue'}`,
        action: 'View Status',
        color: 'green',
        urgency: 'medium' as const,
      };
    case 'timeline_change':
      return {
        icon: Clock,
        title: 'Timeline Updated',
        description: `${data.eventName || 'Event'} time changed to ${data.newTime || 'TBA'}`,
        action: 'View Timeline',
        color: 'orange',
        urgency: 'high' as const,
      };
    case 'emergency_alert':
      return {
        icon: AlertTriangle,
        title: 'Emergency Alert',
        description: (data.message as string) || 'Urgent attention required',
        action: 'Take Action',
        color: 'red',
        urgency: 'critical' as const,
      };
    case 'payment_processed':
      return {
        icon: CreditCard,
        title: 'Payment Processed',
        description: `${data.clientName || 'Client'} made a payment of ${data.amount || '£0'}`,
        action: 'View Payment',
        color: 'green',
        urgency: 'medium' as const,
      };
    case 'document_signed':
      return {
        icon: FileCheck,
        title: 'Document Signed',
        description: `${data.clientName || 'Client'} signed ${data.documentName || 'a document'}`,
        action: 'View Document',
        color: 'blue',
        urgency: 'medium' as const,
      };
    default:
      return {
        icon: Heart,
        title: 'Wedding Update',
        description: 'Something wonderful happened!',
        action: 'View Update',
        color: 'pink',
        urgency: 'low' as const,
      };
  }
};

// Color scheme configurations for different toast types
const colorSchemes = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    title: 'text-blue-900',
    description: 'text-blue-700',
    button: 'text-blue-600 hover:text-blue-700 hover:bg-blue-100',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-600',
    title: 'text-green-900',
    description: 'text-green-700',
    button: 'text-green-600 hover:text-green-700 hover:bg-green-100',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-600',
    title: 'text-amber-900',
    description: 'text-amber-700',
    button: 'text-amber-600 hover:text-amber-700 hover:bg-amber-100',
  },
  indigo: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    icon: 'text-indigo-600',
    title: 'text-indigo-900',
    description: 'text-indigo-700',
    button: 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100',
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: 'text-orange-600',
    title: 'text-orange-900',
    description: 'text-orange-700',
    button: 'text-orange-600 hover:text-orange-700 hover:bg-orange-100',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    title: 'text-red-900',
    description: 'text-red-700',
    button: 'text-red-600 hover:text-red-700 hover:bg-red-100',
  },
  pink: {
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    icon: 'text-pink-600',
    title: 'text-pink-900',
    description: 'text-pink-700',
    button: 'text-pink-600 hover:text-pink-700 hover:bg-pink-100',
  },
};

export function RealtimeToast({
  id,
  type,
  data,
  timestamp,
  onDismiss,
  onAction,
  visible,
  dismissible = true,
  autoHide = true,
  hideDelay = 5000,
  priority = 'medium',
}: UIRealtimeToastProps) {
  const [isVisible, setIsVisible] = useState(visible);
  const [isHovered, setIsHovered] = useState(false);

  const content = getToastContent(type, data);
  const colorScheme = colorSchemes[content.color as keyof typeof colorSchemes];
  const Icon = content.icon;

  // Auto-hide logic
  useEffect(() => {
    if (autoHide && visible && !isHovered) {
      const timer = setTimeout(
        () => {
          handleDismiss();
        },
        content.urgency === 'critical' ? hideDelay * 2 : hideDelay,
      );

      return () => clearTimeout(timer);
    }
  }, [autoHide, visible, isHovered, hideDelay, content.urgency]);

  // Handle dismiss with animation
  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 300); // Wait for exit animation
  };

  // Handle action click
  const handleAction = () => {
    onAction?.();
    if (dismissible) {
      handleDismiss();
    }
  };

  // Don't render if not visible
  if (!visible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 300, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 300, scale: 0.95 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 20,
            duration: 0.3,
          }}
          className={cn(
            'flex items-start gap-3 p-4 rounded-lg shadow-lg border-l-4',
            'backdrop-blur-sm bg-white/95',
            'min-w-[320px] max-w-[420px]',
            'sm:min-w-0 sm:w-full', // Mobile responsive
            colorScheme.bg,
            colorScheme.border,
            content.urgency === 'critical' &&
              'ring-2 ring-red-300 animate-pulse',
            'hover:shadow-xl transition-all duration-200',
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          role="alert"
          aria-live={content.urgency === 'critical' ? 'assertive' : 'polite'}
          aria-label={`${content.title}: ${content.description}`}
          data-testid="realtime-toast"
          data-toast-id={id}
          data-toast-type={type}
        >
          {/* Icon */}
          <div
            className={cn(
              'flex-shrink-0 p-1 rounded-full',
              content.urgency === 'critical' && 'animate-bounce',
            )}
          >
            <Icon
              className={cn('h-5 w-5', colorScheme.icon)}
              aria-hidden="true"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className={cn('font-semibold text-sm', colorScheme.title)}>
                {content.title}
              </h4>

              {/* Priority badge */}
              {priority === 'critical' && (
                <Badge variant="destructive" className="text-xs font-bold">
                  URGENT
                </Badge>
              )}
              {priority === 'high' && (
                <Badge
                  variant="outline"
                  className="text-xs border-amber-300 text-amber-700"
                >
                  HIGH
                </Badge>
              )}
            </div>

            <p
              className={cn(
                'text-sm leading-relaxed mb-2',
                colorScheme.description,
              )}
            >
              {content.description}
            </p>

            <div className="flex items-center justify-between">
              {/* Timestamp */}
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(timestamp)} ago
              </span>

              {/* Action button */}
              {onAction && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAction}
                  className={cn(
                    'h-auto p-1 text-xs font-medium',
                    colorScheme.button,
                    'flex items-center gap-1',
                  )}
                  aria-label={content.action}
                >
                  {content.action}
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Wedding day special indicator */}
            {data.isWeddingDay && (
              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-pink-200">
                <Heart className="h-3 w-3 text-pink-500" />
                <span className="text-xs font-medium text-pink-600">
                  Wedding Day Update
                </span>
              </div>
            )}
          </div>

          {/* Dismiss button */}
          {dismissible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="flex-shrink-0 h-6 w-6 p-0 hover:bg-gray-100 rounded-full"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4 text-gray-400" />
            </Button>
          )}

          {/* Progress bar for auto-hide */}
          {autoHide && !isHovered && (
            <motion.div
              className="absolute bottom-0 left-0 h-1 bg-current opacity-20 rounded-bl-lg"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{
                duration:
                  (content.urgency === 'critical' ? hideDelay * 2 : hideDelay) /
                  1000,
                ease: 'linear',
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Toast container for managing multiple toasts
export function RealtimeToastContainer({
  toasts,
  position = 'top-right',
}: {
  toasts: UIRealtimeToastProps[];
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center';
}) {
  const positionClasses = {
    'top-right': 'fixed top-4 right-4 z-50',
    'top-left': 'fixed top-4 left-4 z-50',
    'bottom-right': 'fixed bottom-4 right-4 z-50',
    'bottom-left': 'fixed bottom-4 left-4 z-50',
    'top-center': 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50',
    'bottom-center': 'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50',
  };

  // Mobile responsive positioning
  const mobilePositionClasses = {
    'top-right': 'sm:right-4 right-2 sm:top-4 top-16', // Account for mobile header
    'top-left': 'sm:left-4 left-2 sm:top-4 top-16',
    'bottom-right': 'sm:right-4 right-2 sm:bottom-4 bottom-20', // Account for mobile nav
    'bottom-left': 'sm:left-4 left-2 sm:bottom-4 bottom-20',
    'top-center':
      'sm:left-1/2 left-2 right-2 sm:transform sm:-translate-x-1/2 sm:top-4 top-16',
    'bottom-center':
      'sm:left-1/2 left-2 right-2 sm:transform sm:-translate-x-1/2 sm:bottom-4 bottom-20',
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-2 pointer-events-none',
        'max-h-screen overflow-y-auto',
        'sm:max-w-md w-full sm:w-auto', // Mobile full width
        positionClasses[position],
        mobilePositionClasses[position],
      )}
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts
          .sort((a, b) => {
            // Sort by priority and timestamp
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            const aPriority = priorityOrder[a.priority || 'medium'];
            const bPriority = priorityOrder[b.priority || 'medium'];

            if (aPriority !== bPriority) return bPriority - aPriority;
            return (
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
          })
          .slice(0, 5) // Limit to 5 toasts max
          .map((toast, index) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, scale: 0.8, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{
                layout: { type: 'spring', stiffness: 300, damping: 30 },
                duration: 0.2,
              }}
              className="pointer-events-auto"
              style={{ zIndex: 1000 + (toasts.length - index) }}
            >
              <RealtimeToast {...toast} />
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
}

// Wedding-specific toast with preset configurations
export function WeddingRealtimeToast({
  weddingId,
  ...props
}: { weddingId: string } & UIRealtimeToastProps) {
  // Add wedding context to data
  const enhancedData = {
    ...props.data,
    weddingId,
    isWeddingDay: new Date().getDay() === 6, // Saturday detection
  };

  return (
    <RealtimeToast
      {...props}
      data={enhancedData}
      autoHide={props.priority !== 'critical'}
      hideDelay={props.priority === 'critical' ? 10000 : 5000}
    />
  );
}
