'use client';

import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  Bar,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

import {
  WeddingTimelineData,
  WeddingPhase,
  TimelineMetrics,
  WEDDING_COLORS,
  formatCurrency,
  formatDate,
  CHART_ANIMATIONS,
} from './types';

interface WeddingTimelineChartProps {
  data: WeddingTimelineData[];
  height?: number;
  showPhases?: boolean;
  showMilestones?: boolean;
  showProgress?: boolean;
  weddingDate?: Date;
  onPhaseClick?: (phase: WeddingPhase) => void;
  onMilestoneHover?: (milestone: any) => void;
  className?: string;
}

const PHASE_COLORS: Record<WeddingPhase, string> = {
  planning: WEDDING_COLORS.accent,
  booking: WEDDING_COLORS.primary,
  coordination: WEDDING_COLORS.secondary,
  execution: WEDDING_COLORS.success,
  completion: WEDDING_COLORS.muted,
};

const PHASE_LABELS: Record<WeddingPhase, string> = {
  planning: 'Initial Planning',
  booking: 'Vendor Booking',
  coordination: 'Final Coordination',
  execution: 'Wedding Day',
  completion: 'Post-Wedding',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white p-4 rounded-lg shadow-xl border border-gray-200 min-w-64"
    >
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-wedding-primary" />
        <p className="font-semibold text-gray-900">
          {formatDate(new Date(label))}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Phase:</span>
          <span className="font-medium text-gray-900">
            {PHASE_LABELS[data.phase as WeddingPhase]}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Progress:</span>
          <div className="flex items-center gap-1">
            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-wedding-primary transition-all duration-300"
                style={{ width: `${data.progress}%` }}
              />
            </div>
            <span className="text-sm font-medium">{data.progress}%</span>
          </div>
        </div>

        {data.tasksCompleted !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Tasks:</span>
            <span className="font-medium text-gray-900">
              {data.tasksCompleted}/{data.totalTasks}
            </span>
          </div>
        )}

        {data.budget && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Budget Used:</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(data.budget.used)} /{' '}
              {formatCurrency(data.budget.total)}
            </span>
          </div>
        )}

        {data.vendorsBooked !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Vendors:</span>
            <span className="font-medium text-gray-900">
              {data.vendorsBooked} booked
            </span>
          </div>
        )}

        {data.milestones?.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-1">
              Milestones:
            </p>
            <div className="space-y-1">
              {data.milestones.map((milestone, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  {milestone.completed ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <Clock className="h-3 w-3 text-yellow-500" />
                  )}
                  <span
                    className={
                      milestone.completed ? 'text-green-700' : 'text-yellow-700'
                    }
                  >
                    {milestone.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const PhaseIndicator = ({
  phase,
  isActive,
  onClick,
}: {
  phase: WeddingPhase;
  isActive: boolean;
  onClick: () => void;
}) => {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
        isActive
          ? 'bg-wedding-primary text-white shadow-md'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {PHASE_LABELS[phase]}
    </motion.button>
  );
};

const TimelineMetricsCard = ({
  metrics,
  className,
}: {
  metrics: TimelineMetrics;
  className?: string;
}) => {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-gray-600">Completed</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">{metrics.completed}</p>
        <p className="text-xs text-gray-500">tasks done</p>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium text-gray-600">In Progress</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">{metrics.inProgress}</p>
        <p className="text-xs text-gray-500">active tasks</p>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <span className="text-sm font-medium text-gray-600">Overdue</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">{metrics.overdue}</p>
        <p className="text-xs text-gray-500">need attention</p>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-600">Progress</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {metrics.overallProgress}%
        </p>
        <p className="text-xs text-gray-500">overall</p>
      </div>
    </div>
  );
};

export const WeddingTimelineChart: React.FC<WeddingTimelineChartProps> = ({
  data,
  height = 400,
  showPhases = true,
  showMilestones = true,
  showProgress = true,
  weddingDate,
  onPhaseClick,
  onMilestoneHover,
  className = '',
}) => {
  const [selectedPhase, setSelectedPhase] = useState<WeddingPhase | null>(null);
  const [showMetrics, setShowMetrics] = useState(true);

  const { chartData, phases, milestoneEvents, metrics } = useMemo(() => {
    const phases = [...new Set(data.map((d) => d.phase))];

    const milestoneEvents = data
      .filter((d) => d.milestones?.length > 0)
      .flatMap(
        (d) =>
          d.milestones?.map((m) => ({
            date: d.date,
            milestone: m,
            phase: d.phase,
          })) || [],
      );

    const metrics: TimelineMetrics = {
      completed: data.reduce((sum, d) => sum + (d.tasksCompleted || 0), 0),
      inProgress: data.reduce(
        (sum, d) =>
          sum + Math.max(0, (d.totalTasks || 0) - (d.tasksCompleted || 0)),
        0,
      ),
      overdue: data.reduce((sum, d) => sum + (d.overdueTasks || 0), 0),
      overallProgress: Math.round(
        data.reduce((sum, d) => sum + d.progress, 0) / data.length,
      ),
    };

    const chartData = data.map((d) => ({
      ...d,
      progressLine: d.progress,
      tasksBar: d.tasksCompleted,
      budgetUsed: d.budget?.used || 0,
      isCurrentPhase: selectedPhase ? d.phase === selectedPhase : true,
    }));

    return { chartData, phases, milestoneEvents, metrics };
  }, [data, selectedPhase]);

  const handlePhaseClick = (phase: WeddingPhase) => {
    const newPhase = selectedPhase === phase ? null : phase;
    setSelectedPhase(newPhase);
    onPhaseClick?.(phase);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Phase Filters */}
      {showPhases && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gray-900 mr-2">
              Wedding Timeline
            </h3>
            {phases.map((phase) => (
              <PhaseIndicator
                key={phase}
                phase={phase}
                isActive={selectedPhase === phase}
                onClick={() => handlePhaseClick(phase)}
              />
            ))}
            {selectedPhase && (
              <button
                onClick={() => setSelectedPhase(null)}
                className="text-xs text-gray-500 hover:text-gray-700 ml-2"
              >
                Clear Filter
              </button>
            )}
          </div>

          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className="text-sm text-wedding-primary hover:text-wedding-primary/80 font-medium"
          >
            {showMetrics ? 'Hide' : 'Show'} Metrics
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      <AnimatePresence>
        {showMetrics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <TimelineMetricsCard metrics={metrics} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickFormatter={(value) => formatDate(new Date(value))}
            />

            <YAxis
              yAxisId="progress"
              orientation="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{
                value: 'Progress (%)',
                angle: -90,
                position: 'insideLeft',
              }}
            />

            <YAxis
              yAxisId="tasks"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{
                value: 'Tasks Completed',
                angle: 90,
                position: 'insideRight',
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />

            {/* Wedding Date Reference Line */}
            {weddingDate && (
              <ReferenceLine
                x={weddingDate.toISOString()}
                stroke={WEDDING_COLORS.accent}
                strokeDasharray="5 5"
                label={{ value: 'Wedding Day', position: 'top' }}
              />
            )}

            {/* Progress Line */}
            {showProgress && (
              <Line
                yAxisId="progress"
                type="monotone"
                dataKey="progressLine"
                stroke={WEDDING_COLORS.primary}
                strokeWidth={3}
                dot={{ fill: WEDDING_COLORS.primary, strokeWidth: 2, r: 4 }}
                activeDot={{
                  r: 6,
                  stroke: WEDDING_COLORS.primary,
                  strokeWidth: 2,
                }}
                name="Progress %"
                connectNulls={false}
                {...CHART_ANIMATIONS.line}
              />
            )}

            {/* Tasks Completed Bars */}
            <Bar
              yAxisId="tasks"
              dataKey="tasksBar"
              fill={WEDDING_COLORS.secondary}
              fillOpacity={0.7}
              name="Tasks Completed"
              radius={[2, 2, 0, 0]}
              {...CHART_ANIMATIONS.bar}
            />

            {/* Milestone Markers */}
            {showMilestones &&
              milestoneEvents.map((event, idx) => (
                <ReferenceLine
                  key={idx}
                  x={event.date}
                  stroke={PHASE_COLORS[event.phase as WeddingPhase]}
                  strokeDasharray="2 2"
                  strokeWidth={1}
                  label={{
                    value: event.milestone.title,
                    angle: -45,
                    fontSize: 10,
                    position: 'topLeft',
                  }}
                />
              ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Phase Progress Summary */}
      {selectedPhase && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-wedding-primary/5 to-wedding-secondary/5 p-4 rounded-lg border border-wedding-primary/20"
        >
          <h4 className="font-medium text-gray-900 mb-2">
            {PHASE_LABELS[selectedPhase]} Summary
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Average Progress:</span>
              <span className="font-medium ml-2">
                {Math.round(
                  chartData
                    .filter((d) => d.phase === selectedPhase)
                    .reduce((sum, d) => sum + d.progress, 0) /
                    chartData.filter((d) => d.phase === selectedPhase).length,
                )}
                %
              </span>
            </div>
            <div>
              <span className="text-gray-600">Total Tasks:</span>
              <span className="font-medium ml-2">
                {chartData
                  .filter((d) => d.phase === selectedPhase)
                  .reduce((sum, d) => sum + (d.totalTasks || 0), 0)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Completed Tasks:</span>
              <span className="font-medium ml-2">
                {chartData
                  .filter((d) => d.phase === selectedPhase)
                  .reduce((sum, d) => sum + (d.tasksCompleted || 0), 0)}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default WeddingTimelineChart;
