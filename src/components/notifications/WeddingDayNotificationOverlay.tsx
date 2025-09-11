'use client';

// WedSync Wedding Day Notification Overlay
// Special interface for critical wedding day alerts and coordination

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  MapPinIcon,
  CloudIcon,
  ClockIcon,
  CheckIcon,
  XMarkIcon,
  BellAlertIcon,
  SunIcon,
  CloudRainIcon,
  WindIcon,
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartSolidIcon,
  ExclamationTriangleIcon as ExclamationTriangleSolidIcon,
} from '@heroicons/react/24/solid';
import type {
  Notification,
  WeddingDayContext,
  WeatherNotification,
  NotificationAction,
} from '@/types';

// Wedding countdown component
interface WeddingCountdownProps {
  targetTime: Date;
}

function WeddingCountdown({ targetTime }: WeddingCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const difference = +targetTime - +new Date();

    if (difference > 0) {
      return {
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return { hours: 0, minutes: 0, seconds: 0 };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime]);

  const isImminent = timeLeft.hours === 0 && timeLeft.minutes < 30;

  return (
    <motion.div
      className={`flex items-center space-x-4 px-4 py-3 rounded-lg ${
        isImminent
          ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white'
          : 'bg-gradient-to-r from-rose-50 to-pink-50 text-rose-800'
      }`}
      animate={{
        scale: isImminent ? [1, 1.02, 1] : 1,
      }}
      transition={{
        repeat: isImminent ? Infinity : 0,
        duration: 2,
      }}
    >
      <ClockIcon
        className={`w-6 h-6 ${isImminent ? 'text-white' : 'text-rose-600'}`}
      />
      <div className="text-center">
        <p
          className={`text-sm font-medium ${isImminent ? 'text-rose-100' : 'text-rose-700'}`}
        >
          Ceremony begins in
        </p>
        <div className="flex items-center space-x-2 text-2xl font-bold">
          <span>{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="animate-pulse">:</span>
          <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="animate-pulse">:</span>
          <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
        </div>
        <p
          className={`text-xs ${isImminent ? 'text-rose-100' : 'text-rose-600'}`}
        >
          Hours : Minutes : Seconds
        </p>
      </div>
    </motion.div>
  );
}

// Critical wedding alert card
interface CriticalAlertCardProps {
  notification: Notification;
  isWeddingDay: boolean;
  onDismiss: () => void;
  onAction?: (action: NotificationAction) => void;
}

function CriticalAlertCard({
  notification,
  isWeddingDay,
  onDismiss,
  onAction,
}: CriticalAlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getAlertStyles = () => {
    switch (notification.type) {
      case 'emergency':
        return 'border-red-500 bg-red-50 text-red-900';
      case 'weather':
        return 'border-orange-500 bg-orange-50 text-orange-900';
      case 'timeline':
        return 'border-yellow-500 bg-yellow-50 text-yellow-900';
      default:
        return 'border-rose-500 bg-rose-50 text-rose-900';
    }
  };

  const getAlertIcon = () => {
    switch (notification.type) {
      case 'emergency':
        return (
          <ExclamationTriangleSolidIcon className="w-6 h-6 text-red-600 animate-pulse" />
        );
      case 'weather':
        return <CloudIcon className="w-6 h-6 text-orange-600" />;
      case 'timeline':
        return <ClockIcon className="w-6 h-6 text-yellow-600" />;
      default:
        return <BellAlertIcon className="w-6 h-6 text-rose-600" />;
    }
  };

  return (
    <motion.div
      className={`border-l-4 rounded-lg p-4 shadow-lg ${getAlertStyles()}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {getAlertIcon()}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold">{notification.title}</h3>
            <p className="mt-1 text-sm">{notification.message}</p>

            {notification.relatedWedding && (
              <div className="mt-2 flex items-center space-x-2 text-sm font-medium">
                <HeartSolidIcon className="w-4 h-4" />
                <span>{notification.relatedWedding.coupleName}</span>
                {notification.relatedWedding.venue && (
                  <>
                    <span>•</span>
                    <MapPinIcon className="w-4 h-4" />
                    <span>{notification.relatedWedding.venue}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="ml-4 p-1 hover:bg-white hover:bg-opacity-50 rounded-full transition-colors"
          aria-label="Dismiss alert"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {notification.actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {notification.actions.map((action) => (
            <motion.button
              key={action.actionId}
              onClick={() => onAction?.(action)}
              className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                action.style === 'primary'
                  ? 'bg-white text-current hover:bg-opacity-90'
                  : action.style === 'destructive'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-white bg-opacity-50 hover:bg-opacity-75'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {action.type === 'emergency_call' && (
                <PhoneIcon className="w-4 h-4 mr-2" />
              )}
              {action.type === 'contact_vendor' && (
                <ChatBubbleLeftIcon className="w-4 h-4 mr-2" />
              )}
              {action.type === 'view_details' && (
                <MapPinIcon className="w-4 h-4 mr-2" />
              )}
              {action.label}
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Weather alert card
interface WeatherAlertCardProps {
  weatherData: WeatherNotification;
  weddingLocation: string;
  onViewDetails: () => void;
}

function WeatherAlertCard({
  weatherData,
  weddingLocation,
  onViewDetails,
}: WeatherAlertCardProps) {
  const getWeatherIcon = () => {
    const condition = weatherData.weatherData.condition.toLowerCase();

    if (condition.includes('rain') || condition.includes('drizzle')) {
      return <CloudRainIcon className="w-8 h-8 text-blue-600" />;
    }
    if (condition.includes('wind')) {
      return <WindIcon className="w-8 h-8 text-gray-600" />;
    }
    if (condition.includes('sun') || condition.includes('clear')) {
      return <SunIcon className="w-8 h-8 text-yellow-500" />;
    }
    return <CloudIcon className="w-8 h-8 text-gray-500" />;
  };

  const getAlertSeverity = () => {
    const chanceOfRain = weatherData.weatherData.chanceOfRain;
    const windSpeed = weatherData.weatherData.windSpeed;

    if (chanceOfRain > 70 || windSpeed > 25) {
      return { color: 'border-red-500 bg-red-50', severity: 'High Risk' };
    }
    if (chanceOfRain > 40 || windSpeed > 15) {
      return {
        color: 'border-orange-500 bg-orange-50',
        severity: 'Moderate Risk',
      };
    }
    return { color: 'border-yellow-500 bg-yellow-50', severity: 'Low Risk' };
  };

  const { color, severity } = getAlertSeverity();

  return (
    <motion.div
      className={`border-l-4 rounded-lg p-4 shadow-lg ${color}`}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          {getWeatherIcon()}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Weather Alert
            </h3>
            <p className="text-sm text-gray-700">
              {weatherData.weatherData.condition} •{' '}
              {weatherData.weatherData.temperature}°C
            </p>
            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
              <span>Rain: {weatherData.weatherData.chanceOfRain}%</span>
              <span>Wind: {weatherData.weatherData.windSpeed}mph</span>
              <span className="font-medium">{severity}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 p-3 bg-white bg-opacity-50 rounded-md">
        <h4 className="font-medium text-gray-900 mb-2">Venue Information</h4>
        <div className="text-sm text-gray-700">
          <p className="flex items-center space-x-2">
            <MapPinIcon className="w-4 h-4" />
            <span>{weatherData.weatherData.venue.name}</span>
          </p>
          <p className="mt-1">
            Type:{' '}
            {weatherData.weatherData.venue.isOutdoor ? 'Outdoor' : 'Indoor'}{' '}
            Venue
          </p>
          {weatherData.weatherData.venue.backup && (
            <p className="mt-1 text-blue-700 font-medium">
              Backup Plan: {weatherData.weatherData.venue.backup}
            </p>
          )}
        </div>
      </div>

      {weatherData.recommendations.length > 0 && (
        <div className="mt-3">
          <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
          <ul className="space-y-1 text-sm text-gray-700">
            {weatherData.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start space-x-2">
                <CheckIcon className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onViewDetails}
        className="mt-4 w-full bg-white text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        View Full Weather Details
      </button>
    </motion.div>
  );
}

// Quick action button
interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  action: string;
  variant: 'critical' | 'primary' | 'secondary';
  onClick?: () => void;
}

function QuickActionButton({
  icon,
  label,
  action,
  variant,
  onClick,
}: QuickActionButtonProps) {
  const getButtonStyles = () => {
    switch (variant) {
      case 'critical':
        return 'bg-red-600 text-white hover:bg-red-700 ring-2 ring-red-200';
      case 'primary':
        return 'bg-rose-600 text-white hover:bg-rose-700 ring-2 ring-rose-200';
      default:
        return 'bg-white text-gray-700 hover:bg-gray-50 ring-2 ring-gray-200';
    }
  };

  return (
    <motion.button
      onClick={onClick}
      className={`flex flex-col items-center p-4 rounded-xl shadow-sm transition-all duration-200 min-w-[100px] ${getButtonStyles()}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="w-8 h-8 mb-2">{icon}</div>
      <span className="text-sm font-medium text-center">{label}</span>
    </motion.button>
  );
}

// Main WeddingDayNotificationOverlay component
interface WeddingDayNotificationOverlayProps {
  weddingId: string;
  weddingDate: Date;
  isWeddingDay: boolean;
  notifications: Notification[];
  weddingContext?: WeddingDayContext;
  onDismissAlert: (notificationId: string) => void;
  onNotificationAction: (
    notificationId: string,
    action: NotificationAction,
  ) => void;
  onEmergencyCall: () => void;
  onVendorChat: () => void;
  onVenueDetails: () => void;
}

export function WeddingDayNotificationOverlay({
  weddingId,
  weddingDate,
  isWeddingDay,
  notifications,
  weddingContext,
  onDismissAlert,
  onNotificationAction,
  onEmergencyCall,
  onVendorChat,
  onVenueDetails,
}: WeddingDayNotificationOverlayProps) {
  const [criticalAlerts, setCriticalAlerts] = useState<Notification[]>([]);
  const [weatherAlert, setWeatherAlert] = useState<WeatherNotification | null>(
    null,
  );

  useEffect(() => {
    // Filter critical wedding day notifications
    const critical = notifications.filter(
      (n) =>
        n.category === 'wedding_day' &&
        n.priority === 'critical' &&
        !n.readStatus,
    );
    setCriticalAlerts(critical);

    // Check for weather alerts
    const weather = notifications.find(
      (n) => n.type === 'weather',
    ) as WeatherNotification;
    if (weather) {
      setWeatherAlert(weather);
    }
  }, [notifications]);

  if (!isWeddingDay && criticalAlerts.length === 0) {
    return null;
  }

  return (
    <motion.div
      className="fixed inset-x-0 top-0 z-50 p-4 pointer-events-none"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-4xl mx-auto space-y-4 pointer-events-auto">
        {/* Wedding Day Header */}
        {isWeddingDay && (
          <motion.div
            className="bg-white rounded-xl shadow-lg border border-rose-200 overflow-hidden"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-4">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center space-x-3">
                  <HeartSolidIcon className="w-8 h-8" />
                  <div>
                    <h1 className="text-2xl font-bold">Wedding Day!</h1>
                    {weddingContext && (
                      <p className="text-rose-100">
                        {weddingContext.currentPhase
                          .replace('_', ' ')
                          .toUpperCase()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {weddingContext && (
                    <div className="text-sm">
                      <p className="font-medium">
                        Next: {weddingContext.timeline[0]?.name}
                      </p>
                      <p className="text-rose-100">
                        {new Date(
                          weddingContext.timeline[0]?.startTime,
                        ).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6">
              <WeddingCountdown targetTime={weddingDate} />

              {/* Quick Actions */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <QuickActionButton
                    icon={<PhoneIcon />}
                    label="Emergency Contact"
                    action="emergency_call"
                    variant="critical"
                    onClick={onEmergencyCall}
                  />
                  <QuickActionButton
                    icon={<ChatBubbleLeftIcon />}
                    label="Vendor Chat"
                    action="vendor_chat"
                    variant="primary"
                    onClick={onVendorChat}
                  />
                  <QuickActionButton
                    icon={<MapPinIcon />}
                    label="Venue Info"
                    action="venue_details"
                    variant="secondary"
                    onClick={onVenueDetails}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Critical Alerts */}
        <AnimatePresence>
          {criticalAlerts.map((alert, index) => (
            <motion.div
              key={alert.notificationId}
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <CriticalAlertCard
                notification={alert}
                isWeddingDay={isWeddingDay}
                onDismiss={() => onDismissAlert(alert.notificationId)}
                onAction={(action) =>
                  onNotificationAction(alert.notificationId, action)
                }
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Weather Alert */}
        {weatherAlert && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <WeatherAlertCard
              weatherData={weatherAlert}
              weddingLocation={
                weatherAlert.metadata.weddingContext?.venue || ''
              }
              onViewDetails={() => {
                // Open detailed weather view
                window.open(`/weather/${weddingId}`, '_blank');
              }}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default WeddingDayNotificationOverlay;
