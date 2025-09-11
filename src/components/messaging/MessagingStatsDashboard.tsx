/**
 * WS-155: Messaging Stats Dashboard Integration
 * Real-time messaging statistics integrated into WedMe main dashboard
 */

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Users,
  Clock,
  CheckCheck,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface MessagingStats {
  totalMessages: number;
  sentMessages: number;
  deliveredMessages: number;
  readMessages: number;
  responseRate: number;
  averageResponseTime: number;
  activeConversations: number;
  pendingResponses: number;
  messagesByType: Record<string, number>;
  messagesByDay: Array<{ date: string; count: number }>;
  guestEngagement: Array<{
    guestId: string;
    name: string;
    messageCount: number;
    lastActivity: string;
  }>;
  peakHours: Array<{ hour: number; count: number }>;
}

interface MessagingStatsDashboardProps {
  weddingId: string;
  className?: string;
  view?: 'compact' | 'expanded';
  refreshInterval?: number;
}

export function MessagingStatsDashboard({
  weddingId,
  className,
  view = 'compact',
  refreshInterval = 30000, // 30 seconds
}: MessagingStatsDashboardProps) {
  const [stats, setStats] = useState<MessagingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(7); // Days
  const [realTimeUpdates, setRealTimeUpdates] = useState<any[]>([]);

  // Fetch messaging statistics
  const fetchStats = async () => {
    try {
      const now = new Date();
      const startDate = startOfDay(subDays(now, dateRange));
      const endDate = endOfDay(now);

      // Fetch total messages
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('wedding_id', weddingId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (messagesError) throw messagesError;

      // Calculate statistics
      const totalMessages = messages?.length || 0;
      const sentMessages =
        messages?.filter((m) => m.status === 'sent').length || 0;
      const deliveredMessages =
        messages?.filter((m) => m.status === 'delivered').length || 0;
      const readMessages =
        messages?.filter((m) => m.status === 'read').length || 0;

      // Calculate response rate
      const { data: responses } = await supabase
        .from('messages')
        .select('*')
        .eq('wedding_id', weddingId)
        .eq('is_response', true);

      const responseRate =
        totalMessages > 0
          ? ((responses?.length || 0) / totalMessages) * 100
          : 0;

      // Calculate average response time
      const responseTimes =
        responses
          ?.map((r) => {
            const originalMessage = messages?.find((m) => m.id === r.reply_to);
            if (originalMessage) {
              const originalTime = new Date(
                originalMessage.created_at,
              ).getTime();
              const responseTime = new Date(r.created_at).getTime();
              return (responseTime - originalTime) / 1000 / 60; // Minutes
            }
            return 0;
          })
          .filter((t) => t > 0) || [];

      const averageResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0;

      // Get active conversations
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('wedding_id', weddingId)
        .eq('status', 'active');

      const activeConversations = conversations?.length || 0;

      // Get pending responses
      const { data: pending } = await supabase
        .from('messages')
        .select('*')
        .eq('wedding_id', weddingId)
        .eq('requires_response', true)
        .is('response_id', null);

      const pendingResponses = pending?.length || 0;

      // Messages by type
      const messagesByType: Record<string, number> = {};
      messages?.forEach((m) => {
        const type = m.type || 'general';
        messagesByType[type] = (messagesByType[type] || 0) + 1;
      });

      // Messages by day
      const messagesByDay: Array<{ date: string; count: number }> = [];
      for (let i = dateRange - 1; i >= 0; i--) {
        const date = subDays(now, i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const dayMessages = messages?.filter((m) => {
          const messageDate = new Date(m.created_at);
          return messageDate >= dayStart && messageDate <= dayEnd;
        });

        messagesByDay.push({
          date: format(date, 'MMM dd'),
          count: dayMessages?.length || 0,
        });
      }

      // Guest engagement
      const guestEngagement: Array<{
        guestId: string;
        name: string;
        messageCount: number;
        lastActivity: string;
      }> = [];
      const guestMessages: Record<string, any[]> = {};

      messages?.forEach((m) => {
        if (m.guest_id) {
          if (!guestMessages[m.guest_id]) {
            guestMessages[m.guest_id] = [];
          }
          guestMessages[m.guest_id].push(m);
        }
      });

      for (const [guestId, msgs] of Object.entries(guestMessages)) {
        const { data: guest } = await supabase
          .from('guests')
          .select('name')
          .eq('id', guestId)
          .single();

        const lastMessage = msgs.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )[0];

        guestEngagement.push({
          guestId,
          name: guest?.name || 'Unknown Guest',
          messageCount: msgs.length,
          lastActivity: lastMessage.created_at,
        });
      }

      // Sort by message count
      guestEngagement.sort((a, b) => b.messageCount - a.messageCount);

      // Peak hours analysis
      const peakHours: Array<{ hour: number; count: number }> = [];
      const hourCounts: Record<number, number> = {};

      messages?.forEach((m) => {
        const hour = new Date(m.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      for (let hour = 0; hour < 24; hour++) {
        peakHours.push({
          hour,
          count: hourCounts[hour] || 0,
        });
      }

      setStats({
        totalMessages,
        sentMessages,
        deliveredMessages,
        readMessages,
        responseRate,
        averageResponseTime,
        activeConversations,
        pendingResponses,
        messagesByType,
        messagesByDay,
        guestEngagement: guestEngagement.slice(0, 10), // Top 10
        peakHours,
      });
    } catch (error) {
      console.error('Error fetching messaging stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Setup real-time subscription
  useEffect(() => {
    fetchStats();

    // Set up refresh interval
    const interval = setInterval(fetchStats, refreshInterval);

    // Set up real-time subscription
    const subscription = supabase
      .channel(`messaging-stats-${weddingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `wedding_id=eq.${weddingId}`,
        },
        (payload) => {
          // Add to real-time updates
          setRealTimeUpdates((prev) => [...prev.slice(-4), payload]);

          // Refresh stats
          fetchStats();
        },
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [weddingId, dateRange, refreshInterval]);

  // Calculate trend
  const calculateTrend = (
    current: number,
    previous: number,
  ): 'up' | 'down' | 'stable' => {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'stable';
  };

  // Render stat card
  const StatCard = ({
    title,
    value,
    icon,
    trend,
    color = 'blue',
    onClick,
  }: any) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm cursor-pointer',
        'border border-gray-200 dark:border-gray-700',
        'hover:shadow-md transition-all',
        selectedMetric === title && 'ring-2 ring-blue-500',
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div
          className={cn(
            'p-2 rounded-lg',
            `bg-${color}-100 dark:bg-${color}-900/20`,
          )}
        >
          {icon}
        </div>
        {trend && (
          <div className="flex items-center gap-1">
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : trend === 'down' ? (
              <TrendingDown className="w-4 h-4 text-red-500" />
            ) : null}
          </div>
        )}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
    </motion.div>
  );

  if (loading) {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={cn('text-center py-8', className)}>
        <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-2" />
        <p className="text-gray-500 dark:text-gray-400">
          No messaging data available
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Messaging Analytics
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Activity className="w-4 h-4 text-green-500 animate-pulse" />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Messages"
          value={stats.totalMessages}
          icon={<MessageSquare className="w-5 h-5 text-blue-500" />}
          trend={calculateTrend(stats.totalMessages, 0)}
          color="blue"
          onClick={() => setSelectedMetric('total')}
        />
        <StatCard
          title="Delivered"
          value={`${Math.round((stats.deliveredMessages / stats.totalMessages) * 100)}%`}
          icon={<CheckCheck className="w-5 h-5 text-green-500" />}
          trend={calculateTrend(stats.deliveredMessages, stats.sentMessages)}
          color="green"
          onClick={() => setSelectedMetric('delivery')}
        />
        <StatCard
          title="Response Rate"
          value={`${Math.round(stats.responseRate)}%`}
          icon={<Users className="w-5 h-5 text-purple-500" />}
          trend={calculateTrend(stats.responseRate, 50)}
          color="purple"
          onClick={() => setSelectedMetric('response')}
        />
        <StatCard
          title="Avg Response"
          value={`${Math.round(stats.averageResponseTime)}m`}
          icon={<Clock className="w-5 h-5 text-orange-500" />}
          trend={calculateTrend(30, stats.averageResponseTime)}
          color="orange"
          onClick={() => setSelectedMetric('time')}
        />
      </div>

      {/* Expanded View */}
      {view === 'expanded' && (
        <>
          {/* Messages Over Time Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Message Volume
            </h3>
            <div className="h-48 flex items-end gap-2">
              {stats.messagesByDay.map((day, index) => {
                const maxCount = Math.max(
                  ...stats.messagesByDay.map((d) => d.count),
                );
                const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;

                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center"
                  >
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: index * 0.05 }}
                      className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {day.date}
                    </span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {day.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Message Types Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Message Types */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-500" />
                Message Types
              </h3>
              <div className="space-y-3">
                {Object.entries(stats.messagesByType).map(([type, count]) => {
                  const percentage = (count / stats.totalMessages) * 100;
                  const colors: Record<string, string> = {
                    invitation: 'bg-blue-500',
                    reminder: 'bg-yellow-500',
                    update: 'bg-orange-500',
                    thank_you: 'bg-pink-500',
                    general: 'bg-gray-500',
                  };

                  return (
                    <div key={type} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm capitalize text-gray-700 dark:text-gray-300">
                            {type.replace('_', ' ')}
                          </span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {count}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            className={cn(
                              'h-2 rounded-full',
                              colors[type] || colors.general,
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Engaged Guests */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                Top Engaged Guests
              </h3>
              <div className="space-y-2">
                {stats.guestEngagement.slice(0, 5).map((guest, index) => (
                  <div
                    key={guest.guestId}
                    className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {guest.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Last active:{' '}
                          {format(
                            new Date(guest.lastActivity),
                            'MMM dd, HH:mm',
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {guest.messageCount}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        messages
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Peak Hours Heatmap */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              Peak Messaging Hours
            </h3>
            <div className="grid grid-cols-24 gap-1">
              {stats.peakHours.map((hour) => {
                const maxCount = Math.max(
                  ...stats.peakHours.map((h) => h.count),
                );
                const intensity = maxCount > 0 ? hour.count / maxCount : 0;

                return (
                  <div key={hour.hour} className="relative group">
                    <div
                      className={cn(
                        'w-full h-8 rounded',
                        intensity === 0 && 'bg-gray-100 dark:bg-gray-700',
                        intensity > 0 &&
                          intensity <= 0.25 &&
                          'bg-blue-200 dark:bg-blue-900',
                        intensity > 0.25 &&
                          intensity <= 0.5 &&
                          'bg-blue-400 dark:bg-blue-700',
                        intensity > 0.5 &&
                          intensity <= 0.75 &&
                          'bg-blue-500 dark:bg-blue-600',
                        intensity > 0.75 && 'bg-blue-600 dark:bg-blue-500',
                      )}
                    />
                    <div className="absolute inset-x-0 -bottom-6 text-xs text-center text-gray-500 dark:text-gray-400">
                      {hour.hour % 6 === 0 && hour.hour}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded">
                        {hour.hour}:00 - {hour.count} msgs
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-time Activity Feed */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              Real-time Activity
              <span className="ml-auto text-xs text-green-500 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live
              </span>
            </h3>
            <div className="space-y-2">
              <AnimatePresence>
                {realTimeUpdates.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Waiting for new activity...
                  </p>
                ) : (
                  realTimeUpdates.map((update, index) => (
                    <motion.div
                      key={`${update.table}-${update.id}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-3 py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
                    >
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full',
                          update.eventType === 'INSERT' && 'bg-green-500',
                          update.eventType === 'UPDATE' && 'bg-blue-500',
                          update.eventType === 'DELETE' && 'bg-red-500',
                        )}
                      />
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Message {update.eventType.toLowerCase()}d
                      </p>
                      <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                        Just now
                      </span>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => (window.location.href = '/communications')}
          className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          Compose Message
        </button>
        <button
          onClick={fetchStats}
          className="py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
