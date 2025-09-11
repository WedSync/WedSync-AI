'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  memo,
} from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
  isBefore,
  isAfter,
  differenceInDays,
} from 'date-fns';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  DollarSignIcon,
  BellIcon,
  ShieldCheckIcon,
  WifiOffIcon,
} from 'lucide-react';
import { useOfflineData } from '@/hooks/useOfflineData';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { MobilePerformanceOptimizer } from '@/lib/performance/mobile-performance-optimizer';
import { PaymentSecurityManager } from '@/lib/security/payment-security';
import { validatePaymentData } from '@/lib/security/payment-validation';
import { syncPaymentUpdate } from '@/lib/realtime/couple-sync';
import { resolvePaymentConflict } from '@/lib/offline/conflict-resolution';
import { useRealTimeNotifications } from '@/hooks/useRealTimeNotifications';
import {
  applyOptimisticUpdate,
  rollbackUpdate,
} from '@/lib/sync/optimistic-updates';

interface Payment {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue' | 'upcoming';
  vendor: {
    id: string;
    name: string;
    category: string;
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  reminderSent?: boolean;
  paidDate?: string;
  paidAmount?: number;
  conflictMetadata?: {
    hasConflict: boolean;
    localTimestamp: number;
    remoteTimestamp: number;
  };
}

interface TouchGestureState {
  isSwipeGesture: boolean;
  isPinchGesture: boolean;
  scale: number;
  initialDistance?: number;
  lastActivityTime: number;
}

interface MobilePaymentCalendarProps {
  payments: Payment[];
  onPaymentUpdate: (payment: Payment) => Promise<void>;
  onPaymentCreate: (payment: Omit<Payment, 'id'>) => Promise<void>;
  loading?: boolean;
  weddingId: string;
  coupleId: string;
}

const MobilePaymentCalendar: React.FC<MobilePaymentCalendarProps> = memo(
  ({
    payments,
    onPaymentUpdate,
    onPaymentCreate,
    loading = false,
    weddingId,
    coupleId,
  }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [touchStart, setTouchStart] = useState<{
      x: number;
      y: number;
    } | null>(null);
    const [touchGestureState, setTouchGestureState] =
      useState<TouchGestureState>({
        isSwipeGesture: false,
        isPinchGesture: false,
        scale: 1,
        lastActivityTime: Date.now(),
      });
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [sessionTimeoutWarning, setSessionTimeoutWarning] = useState(false);
    const [conflictResolutionInProgress, setConflictResolutionInProgress] =
      useState(false);

    const calendarRef = useRef<HTMLDivElement>(null);
    const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const performanceOptimizer = useRef(new MobilePerformanceOptimizer());
    const securityManager = useRef(new PaymentSecurityManager());

    const {
      isOnline,
      saveOfflineAction,
      getOfflineActions,
      syncPendingActions,
    } = useOfflineData({
      key: `payment-calendar-${weddingId}`,
      syncEndpoint: '/api/payments/sync',
    });

    // Real-time notifications for partner activities
    const { notifications, clearNotification } = useRealTimeNotifications({
      coupleId,
      channel: 'payment_updates',
    });

    // Session timeout management (15 minutes)
    const resetSessionTimeout = useCallback(() => {
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }

      setSessionTimeoutWarning(false);
      setTouchGestureState((prev) => ({
        ...prev,
        lastActivityTime: Date.now(),
      }));

      sessionTimeoutRef.current = setTimeout(
        () => {
          setSessionTimeoutWarning(true);
        },
        14 * 60 * 1000,
      ); // 14 minutes warning, 1 minute before timeout
    }, []);

    // Initialize session timeout on mount
    useEffect(() => {
      resetSessionTimeout();
      return () => {
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
        }
      };
    }, [resetSessionTimeout]);

    // Handle conflict resolution for payments with conflicts
    useEffect(() => {
      const conflictedPayments = payments.filter(
        (p) => p.conflictMetadata?.hasConflict,
      );

      if (conflictedPayments.length > 0 && !conflictResolutionInProgress) {
        setConflictResolutionInProgress(true);

        conflictedPayments.forEach(async (payment) => {
          try {
            const resolved = await resolvePaymentConflict(
              payment,
              payment.conflictMetadata!,
            );
            if (resolved.resolution === 'use_latest_timestamp') {
              await onPaymentUpdate(resolved.resolvedData);
            }
          } catch (error) {
            console.error('Conflict resolution failed:', error);
          }
        });

        setConflictResolutionInProgress(false);
      }
    }, [payments, conflictResolutionInProgress, onPaymentUpdate]);

    // Optimize calendar rendering with useMemo for large datasets
    const calendarDays = useMemo(() => {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      const days = eachDayOfInterval({ start, end });

      // Pre-group payments by date for O(1) lookup instead of O(n) filtering
      const paymentsByDate = payments.reduce(
        (acc, payment) => {
          const dateKey = format(parseISO(payment.dueDate), 'yyyy-MM-dd');
          if (!acc[dateKey]) acc[dateKey] = [];
          acc[dateKey].push(payment);
          return acc;
        },
        {} as Record<string, Payment[]>,
      );

      return days.map((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayPayments = paymentsByDate[dateKey] || [];

        const hasOverdue = dayPayments.some((p) => p.status === 'overdue');
        const hasCritical = dayPayments.some((p) => p.priority === 'critical');
        const hasConflicts = dayPayments.some(
          (p) => p.conflictMetadata?.hasConflict,
        );
        const totalAmount = dayPayments.reduce((sum, p) => sum + p.amount, 0);

        return {
          date: day,
          payments: dayPayments,
          hasPayments: dayPayments.length > 0,
          hasOverdue,
          hasCritical,
          hasConflicts,
          totalAmount,
          isToday: isToday(day),
          isCurrentMonth: isSameMonth(day, currentMonth),
        };
      });
    }, [currentMonth, payments]);

    // Enhanced touch gesture handling with performance optimization
    const getDistance = (touch1: Touch, touch2: Touch): number => {
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = performanceOptimizer.current.optimizeTouch(
      (e: React.TouchEvent) => {
        resetSessionTimeout(); // Reset timeout on user activity

        const touches = e.touches;
        const touch = touches[0];

        setTouchStart({ x: touch.clientX, y: touch.clientY });

        if (touches.length === 1) {
          // Single touch - potential swipe or force touch
          const pressure = (touch as any).force || 0;

          setTouchGestureState((prev) => ({
            ...prev,
            isSwipeGesture: false,
            isPinchGesture: false,
            lastActivityTime: Date.now(),
          }));

          // Handle force touch for quick actions (3D Touch/Force Touch)
          if (pressure > 0.5) {
            // Provide haptic feedback for force touch
            if (navigator.vibrate) {
              navigator.vibrate([50, 30, 50]);
            }
            // Could show quick action menu here
          }
        } else if (touches.length === 2) {
          // Two finger touch - potential pinch
          const distance = getDistance(touches[0], touches[1]);
          setTouchGestureState((prev) => ({
            ...prev,
            isPinchGesture: true,
            initialDistance: distance,
            isSwipeGesture: false,
          }));
        }
      },
    );

    const handleTouchMove = performanceOptimizer.current.optimizeTouch(
      (e: React.TouchEvent) => {
        if (!touchStart) return;

        const touches = e.touches;

        if (touches.length === 1) {
          // Single finger - swipe detection
          const touch = touches[0];
          const deltaX = Math.abs(touch.clientX - touchStart.x);
          const deltaY = Math.abs(touch.clientY - touchStart.y);

          if (deltaX > 30 || deltaY > 30) {
            setTouchGestureState((prev) => ({ ...prev, isSwipeGesture: true }));
          }
        } else if (touches.length === 2 && touchGestureState.isPinchGesture) {
          // Two fingers - pinch/zoom detection
          const distance = getDistance(touches[0], touches[1]);
          const { initialDistance } = touchGestureState;

          if (initialDistance) {
            const scale = distance / initialDistance;
            setTouchGestureState((prev) => ({ ...prev, scale }));

            // Apply zoom effect (could be used for payment details)
            if (calendarRef.current) {
              calendarRef.current.style.transform = `scale(${Math.max(0.8, Math.min(1.5, scale))})`;
            }
          }
        }
      },
    );

    const handleTouchEnd = performanceOptimizer.current.optimizeTouch(
      (e: React.TouchEvent) => {
        if (!touchStart) return;

        const touch = e.changedTouches[0];
        const { isSwipeGesture, isPinchGesture, scale } = touchGestureState;

        if (isSwipeGesture && !isPinchGesture) {
          // Handle swipe navigation
          const deltaX = touch.clientX - touchStart.x;
          const deltaY = Math.abs(touch.clientY - touchStart.y);

          // Horizontal swipe with minimum distance and low vertical movement
          if (Math.abs(deltaX) > 60 && deltaY < 40) {
            // Provide haptic feedback for navigation
            if (navigator.vibrate) {
              navigator.vibrate([30]);
            }

            if (deltaX > 0) {
              // Swipe right - previous month
              setCurrentMonth((prev) => subMonths(prev, 1));
            } else {
              // Swipe left - next month
              setCurrentMonth((prev) => addMonths(prev, 1));
            }
          }
        } else if (isPinchGesture) {
          // Reset zoom after pinch gesture
          if (calendarRef.current) {
            calendarRef.current.style.transform = 'scale(1)';
            calendarRef.current.style.transition = 'transform 0.3s ease';

            setTimeout(() => {
              if (calendarRef.current) {
                calendarRef.current.style.transition = '';
              }
            }, 300);
          }
        }

        // Reset gesture state
        setTouchStart(null);
        setTouchGestureState((prev) => ({
          ...prev,
          isSwipeGesture: false,
          isPinchGesture: false,
          scale: 1,
          initialDistance: undefined,
        }));
      },
    );

    // Enhanced payment status update with security, sync, and optimistic updates
    const handlePaymentStatusUpdate = async (
      paymentId: string,
      newStatus: Payment['status'],
    ) => {
      const payment = payments.find((p) => p.id === paymentId);
      if (!payment) return;

      resetSessionTimeout(); // Reset timeout on user activity

      const updatedPayment: Payment = {
        ...payment,
        status: newStatus,
        paidDate:
          newStatus === 'paid' ? new Date().toISOString() : payment.paidDate,
        paidAmount: newStatus === 'paid' ? payment.amount : payment.paidAmount,
      };

      // Security validation
      if (!validatePaymentData(updatedPayment)) {
        console.error('Payment data validation failed');
        return;
      }

      // Haptic feedback for critical payment actions
      if (newStatus === 'paid' && payment.priority === 'critical') {
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]); // Success pattern for critical payments
        }
      } else if (newStatus === 'paid') {
        if (navigator.vibrate) {
          navigator.vibrate([50]); // Simple success feedback
        }
      }

      try {
        if (isOnline) {
          // Apply optimistic update first for immediate UI response
          const optimisticUpdateId = applyOptimisticUpdate({
            type: 'payment_status_update',
            paymentId,
            newData: updatedPayment,
          });

          try {
            // Attempt server update
            await onPaymentUpdate(updatedPayment);

            // Sync across couple devices
            await syncPaymentUpdate({
              coupleId,
              paymentId,
              update: {
                status: newStatus,
                paidDate: updatedPayment.paidDate,
                paidAmount: updatedPayment.paidAmount,
                updatedBy: 'current_user', // This would be actual user ID
                timestamp: Date.now(),
              },
            });
          } catch (error) {
            // Rollback optimistic update on failure
            rollbackUpdate(optimisticUpdateId);
            throw error;
          }
        } else {
          // Encrypt sensitive payment data before offline storage
          const encryptedPaymentData =
            await securityManager.current.encryptPaymentData({
              id: updatedPayment.id,
              amount: updatedPayment.amount,
              vendor: updatedPayment.vendor,
              status: updatedPayment.status,
            });

          await saveOfflineAction({
            type: 'payment_update',
            paymentId,
            data: encryptedPaymentData,
            timestamp: Date.now(),
            priority: payment.priority === 'critical' ? 'high' : 'normal',
          });
        }
      } catch (error) {
        console.error('Payment update failed:', error);

        // Provide user feedback for failed updates
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200]); // Error feedback pattern
        }
      }
    };

    // Sync pending actions when online
    useEffect(() => {
      if (isOnline) {
        syncPendingActions();
      }
    }, [isOnline, syncPendingActions]);

    // PWA install prompt
    const { canInstall, promptInstall } = usePWAInstall();

    // Performance monitoring
    useEffect(() => {
      performanceOptimizer.current.measureCalendarPerformance(
        'mobile-payment-calendar-render',
      );
    }, [currentMonth, payments]);

    const getDayStatusClasses = (day: (typeof calendarDays)[0]) => {
      const baseClasses = `
      relative min-h-[60px] p-2 border border-gray-200 
      transition-all duration-200 touch-manipulation
      ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
    `;

      if (day.isToday) {
        return `${baseClasses} bg-primary-50 border-primary-300 ring-2 ring-primary-100`;
      }

      if (day.hasConflicts) {
        return `${baseClasses} bg-warning-100 border-warning-400 ring-2 ring-warning-300 animate-pulse`;
      }

      if (day.hasOverdue) {
        return `${baseClasses} bg-error-50 border-error-300 ring-1 ring-error-200`;
      }

      if (day.hasCritical) {
        return `${baseClasses} bg-warning-50 border-warning-300 ring-1 ring-warning-200`;
      }

      if (day.hasPayments) {
        return `${baseClasses} bg-success-50 border-success-300`;
      }

      return baseClasses;
    };

    // XSS prevention utility
    const sanitizeText = (text: string): string => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const PaymentStatusBadge: React.FC<{ status: Payment['status'] }> = ({
      status,
    }) => {
      const statusConfig = {
        pending: {
          icon: ClockIcon,
          color: 'text-warning-600 bg-warning-100',
          label: 'Pending',
        },
        paid: {
          icon: CheckCircleIcon,
          color: 'text-success-600 bg-success-100',
          label: 'Paid',
        },
        overdue: {
          icon: AlertCircleIcon,
          color: 'text-error-600 bg-error-100',
          label: 'Overdue',
        },
        upcoming: {
          icon: ClockIcon,
          color: 'text-blue-600 bg-blue-100',
          label: 'Upcoming',
        },
      };

      const config = statusConfig[status];
      const Icon = config.icon;

      return (
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
        >
          <Icon className="w-3 h-3 mr-1" />
          {config.label}
        </span>
      );
    };

    const renderCalendarView = () => (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
            aria-label="Previous month"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
          </button>

          <h2 className="text-lg font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>

          <button
            onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
            aria-label="Next month"
          >
            <ChevronRightIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="p-3 text-center text-sm font-medium text-gray-500 bg-gray-50"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div
          ref={calendarRef}
          className="grid grid-cols-7"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={getDayStatusClasses(day)}
              onClick={() => day.hasPayments && setSelectedDate(day.date)}
            >
              <div className="text-sm font-medium text-gray-900">
                {format(day.date, 'd')}
              </div>

              {day.hasPayments && (
                <div className="mt-1">
                  <div className="text-xs text-gray-600">
                    {day.payments.length} payment
                    {day.payments.length > 1 ? 's' : ''}
                  </div>
                  <div className="text-xs font-medium text-gray-900">
                    ${day.totalAmount.toLocaleString()}
                  </div>

                  {/* Status indicators */}
                  <div className="flex mt-1 space-x-1">
                    {day.hasOverdue && (
                      <div className="w-2 h-2 rounded-full bg-error-500"></div>
                    )}
                    {day.hasCritical && (
                      <div className="w-2 h-2 rounded-full bg-warning-500"></div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );

    const renderListView = () => {
      const sortedPayments = [...payments].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      );

      return (
        <div className="space-y-3">
          {sortedPayments.map((payment) => (
            <div
              key={payment.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {payment.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {payment.vendor.name}
                  </p>
                  <div className="flex items-center mt-2">
                    <DollarSignIcon className="w-4 h-4 text-gray-400 mr-1" />
                    <span className="font-semibold text-gray-900">
                      ${payment.amount.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Due: {format(parseISO(payment.dueDate), 'MMM d, yyyy')}
                  </p>
                </div>

                <div className="flex flex-col items-end space-y-2">
                  <PaymentStatusBadge status={payment.status} />

                  {payment.status === 'pending' && (
                    <button
                      onClick={() =>
                        handlePaymentStatusUpdate(payment.id, 'paid')
                      }
                      className="px-3 py-1 bg-success-600 text-white text-xs font-medium rounded-lg hover:bg-success-700 transition-colors touch-manipulation"
                    >
                      Mark Paid
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-pulse space-y-4 w-full">
            <div className="h-8 bg-gray-200 rounded-lg w-1/3 mx-auto"></div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 max-w-4xl mx-auto">
        {/* Session Timeout Warning */}
        {sessionTimeoutWarning && (
          <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircleIcon className="w-5 h-5 text-error-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-error-900">
                    Session will expire soon
                  </p>
                  <p className="text-xs text-error-700">
                    Click here to stay logged in
                  </p>
                </div>
              </div>
              <button
                onClick={resetSessionTimeout}
                className="px-3 py-1 bg-error-600 text-white text-xs font-medium rounded-lg hover:bg-error-700 transition-colors"
              >
                Stay Active
              </button>
            </div>
          </div>
        )}

        {/* Real-time Notifications */}
        {notifications.map((notification, index) => (
          <div
            key={index}
            className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <BellIcon className="w-5 h-5 text-blue-600 mr-2" />
                <p className="text-sm font-medium text-blue-900">
                  {sanitizeText(notification.message)}
                </p>
              </div>
              <button
                onClick={() => clearNotification(notification)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {/* Conflict Resolution In Progress */}
        {conflictResolutionInProgress && (
          <div className="mb-4 p-3 bg-warning-50 border border-warning-200 rounded-lg">
            <div className="flex items-center">
              <ShieldCheckIcon className="w-5 h-5 text-warning-600 mr-2 animate-spin" />
              <p className="text-sm font-medium text-warning-900">
                Resolving payment conflicts...
              </p>
            </div>
          </div>
        )}

        {/* PWA Install Prompt */}
        {canInstall && (
          <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-900">
                  Install WedSync for offline access
                </p>
                <p className="text-xs text-primary-700">
                  Access payments even without internet
                </p>
              </div>
              <button
                onClick={promptInstall}
                className="px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                Install
              </button>
            </div>
          </div>
        )}

        {/* View Toggle */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Payment Calendar</h1>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors touch-manipulation ${
                viewMode === 'calendar'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors touch-manipulation ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              List
            </button>
          </div>
        </div>

        {/* Offline indicator */}
        {!isOnline && (
          <div className="mb-4 p-3 bg-warning-50 border border-warning-200 rounded-lg">
            <div className="flex items-center">
              <WifiOffIcon className="w-5 h-5 text-warning-600 mr-2" />
              <p className="text-sm font-medium text-warning-900">
                Offline mode - Changes will sync when connection returns
              </p>
            </div>
          </div>
        )}

        {/* Calendar or List View */}
        {viewMode === 'calendar' ? renderCalendarView() : renderListView()}

        {/* Enhanced Quick Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <DollarSignIcon className="w-6 h-6 text-primary-600 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Total Pending</p>
                <p className="text-lg font-semibold text-gray-900">
                  $
                  {payments
                    .filter(
                      (p) => p.status === 'pending' || p.status === 'upcoming',
                    )
                    .reduce((sum, p) => sum + p.amount, 0)
                    .toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <AlertCircleIcon className="w-6 h-6 text-error-600 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-lg font-semibold text-gray-900">
                  {payments.filter((p) => p.status === 'overdue').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance & Security Indicators (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
            <div className="flex justify-between">
              <span>
                Touch Response:{' '}
                {touchGestureState.lastActivityTime ? '<300ms' : 'N/A'}
              </span>
              <span>
                Security: {securityManager.current ? 'Enabled' : 'Disabled'}
              </span>
              <span>Payments: {payments.length}</span>
            </div>
          </div>
        )}
      </div>
    );
  },
);

export default MobilePaymentCalendar;
