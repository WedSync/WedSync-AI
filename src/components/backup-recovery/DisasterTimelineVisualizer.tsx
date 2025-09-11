'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Heart,
  MapPin,
  Play,
  Pause,
  Users,
  Zap,
  XCircle,
  ArrowRight,
  Activity,
  Database,
  Shield,
  RefreshCw,
} from 'lucide-react';

// Types for disaster recovery timeline
interface DisasterTimelineProps {
  incidentTimeline: IncidentTimeline;
  recoveryProgress: RecoveryProgress;
  estimatedCompletion: string;
  onRetryMilestone?: (milestoneId: string) => void;
  onSkipMilestone?: (milestoneId: string) => void;
  realTimeUpdates?: boolean;
}

interface IncidentTimeline {
  incidentId: string;
  startTime: string;
  incidentType:
    | 'data-corruption'
    | 'system-failure'
    | 'security-breach'
    | 'natural-disaster';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedWeddings: WeddingImpact[];
  rootCause?: string;
  detectedBy: string;
  initialResponse: string;
}

interface WeddingImpact {
  weddingId: string;
  coupleName: string;
  weddingDate: string;
  daysUntilWedding: number;
  impactLevel: 'none' | 'minimal' | 'moderate' | 'severe' | 'critical';
  affectedSystems: string[];
  priorityLevel: number;
}

interface RecoveryProgress {
  currentStep: number;
  totalSteps: number;
  milestones: RecoveryMilestone[];
  overallStatus:
    | 'not-started'
    | 'in-progress'
    | 'completed'
    | 'failed'
    | 'paused';
  startedAt: string;
  lastUpdated: string;
  nextMilestoneEta: string;
}

interface RecoveryMilestone {
  id: string;
  order: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';
  startTime?: string;
  completedAt?: string;
  eta?: string;
  duration?: string;
  dependencies: string[];
  weddingImpact: 'none' | 'low' | 'medium' | 'high';
  automatedStep: boolean;
  successCriteria: string[];
  failureReason?: string;
  retryCount?: number;
  maxRetries?: number;
}

const DisasterTimelineVisualizer: React.FC<DisasterTimelineProps> = ({
  incidentTimeline,
  recoveryProgress,
  estimatedCompletion,
  onRetryMilestone,
  onSkipMilestone,
  realTimeUpdates = true,
}) => {
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(
    null,
  );
  const [timelineView, setTimelineView] = useState<'compact' | 'detailed'>(
    'detailed',
  );
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time for real-time calculations
  useEffect(() => {
    if (!realTimeUpdates) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [realTimeUpdates]);

  const getIncidentSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-danger bg-danger/10 text-danger';
      case 'high':
        return 'border-warning bg-warning/10 text-warning';
      case 'medium':
        return 'border-accent bg-accent/10 text-accent';
      case 'low':
        return 'border-muted bg-muted/10 text-muted-foreground';
      default:
        return 'border-border bg-background text-foreground';
    }
  };

  const getWeddingImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical':
        return 'bg-danger text-danger-foreground';
      case 'severe':
        return 'bg-danger/80 text-danger-foreground';
      case 'moderate':
        return 'bg-warning text-warning-foreground';
      case 'minimal':
        return 'bg-accent text-accent-foreground';
      case 'none':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-border text-foreground';
    }
  };

  const getMilestoneStatusIcon = (milestone: RecoveryMilestone) => {
    const iconProps = { className: 'h-4 w-4' };

    switch (milestone.status) {
      case 'completed':
        return <CheckCircle2 {...iconProps} className="h-4 w-4 text-success" />;
      case 'in-progress':
        return (
          <RefreshCw
            {...iconProps}
            className="h-4 w-4 text-accent animate-spin"
          />
        );
      case 'failed':
        return <XCircle {...iconProps} className="h-4 w-4 text-danger" />;
      case 'skipped':
        return (
          <ArrowRight
            {...iconProps}
            className="h-4 w-4 text-muted-foreground"
          />
        );
      default:
        return (
          <Clock {...iconProps} className="h-4 w-4 text-muted-foreground" />
        );
    }
  };

  const getMilestoneProgressPercentage = () => {
    const completedSteps = recoveryProgress.milestones.filter(
      (m) => m.status === 'completed' || m.status === 'skipped',
    ).length;
    return Math.round((completedSteps / recoveryProgress.totalSteps) * 100);
  };

  const calculateElapsedTime = (startTime: string) => {
    const start = new Date(startTime);
    const now = currentTime;
    const diffMs = now.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  const calculateTimeUntilWedding = (weddingDate: string) => {
    const wedding = new Date(weddingDate);
    const now = currentTime;
    const diffMs = wedding.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Past';
    if (diffDays === 0) return 'TODAY';
    if (diffDays === 1) return 'Tomorrow';
    return `${diffDays} days`;
  };

  const getUrgentWeddings = () => {
    return incidentTimeline.affectedWeddings
      .filter(
        (wedding) =>
          wedding.daysUntilWedding <= 7 && wedding.impactLevel !== 'none',
      )
      .sort((a, b) => a.daysUntilWedding - b.daysUntilWedding);
  };

  const filteredMilestones = showOnlyActive
    ? recoveryProgress.milestones.filter(
        (m) => m.status === 'in-progress' || m.status === 'failed',
      )
    : recoveryProgress.milestones;

  return (
    <div className="disaster-timeline-visualizer bg-background border border-border rounded-lg shadow-lg">
      {/* Timeline Header */}
      <div className="border-b border-border bg-elevated p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium ${getIncidentSeverityColor(incidentTimeline.severity)}`}
              >
                {incidentTimeline.severity.toUpperCase()} INCIDENT
              </div>
              <div className="text-sm text-muted-foreground">
                ID: {incidentTimeline.incidentId}
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-foreground mb-1">
              Disaster Recovery Timeline
            </h2>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Started: {new Date(incidentTimeline.startTime).toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Elapsed: {calculateElapsedTime(incidentTimeline.startTime)}
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                ETA: {new Date(estimatedCompletion).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-3xl font-bold text-accent">
              {getMilestoneProgressPercentage()}%
            </div>
            <div className="text-sm text-muted-foreground">
              Recovery Progress
            </div>
            <div
              className={`text-sm mt-1 font-medium ${
                recoveryProgress.overallStatus === 'completed'
                  ? 'text-success'
                  : recoveryProgress.overallStatus === 'failed'
                    ? 'text-danger'
                    : recoveryProgress.overallStatus === 'paused'
                      ? 'text-warning'
                      : 'text-accent'
              }`}
            >
              {recoveryProgress.overallStatus.toUpperCase().replace('-', ' ')}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Step {recoveryProgress.currentStep} of{' '}
              {recoveryProgress.totalSteps}
            </span>
            <span className="text-sm text-muted-foreground">
              Next milestone ETA: {recoveryProgress.nextMilestoneEta}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className="bg-accent rounded-full h-3 transition-all duration-500"
              style={{ width: `${getMilestoneProgressPercentage()}%` }}
            />
          </div>
        </div>
      </div>

      {/* Wedding Impact Alerts */}
      {getUrgentWeddings().length > 0 && (
        <div className="border-b border-border bg-danger/5 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-danger" />
            <h3 className="text-lg font-semibold text-danger">
              Urgent Wedding Impact
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getUrgentWeddings().map((wedding) => (
              <div
                key={wedding.weddingId}
                className="bg-background border border-danger/20 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-foreground">
                      {wedding.coupleName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(wedding.weddingDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-sm font-bold ${
                        wedding.daysUntilWedding === 0
                          ? 'text-danger'
                          : wedding.daysUntilWedding <= 2
                            ? 'text-warning'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {calculateTimeUntilWedding(wedding.weddingDate)}
                    </div>
                    <div
                      className={`text-xs px-2 py-1 rounded ${getWeddingImpactColor(wedding.impactLevel)}`}
                    >
                      {wedding.impactLevel.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  Affected: {wedding.affectedSystems.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Controls */}
      <div className="border-b border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setTimelineView(
                    timelineView === 'compact' ? 'detailed' : 'compact',
                  )
                }
                className="px-3 py-1 text-sm border border-border rounded-md hover:border-muted-foreground transition-colors"
              >
                {timelineView === 'compact' ? 'Detailed View' : 'Compact View'}
              </button>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showOnlyActive}
                  onChange={(e) => setShowOnlyActive(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-accent"
                />
                Show only active
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-success rounded-full"></div>
              Completed
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-accent rounded-full animate-pulse"></div>
              In Progress
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-danger rounded-full"></div>
              Failed
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-muted-foreground rounded-full"></div>
              Pending
            </div>
          </div>
        </div>
      </div>

      {/* Recovery Milestones Timeline */}
      <div className="p-6">
        <div className="space-y-4">
          {filteredMilestones.map((milestone, index) => (
            <div
              key={milestone.id}
              className={`border rounded-lg transition-all ${
                milestone.status === 'in-progress'
                  ? 'border-accent bg-accent/5'
                  : milestone.status === 'completed'
                    ? 'border-success bg-success/5'
                    : milestone.status === 'failed'
                      ? 'border-danger bg-danger/5'
                      : 'border-border bg-background'
              }`}
            >
              {/* Milestone Header */}
              <div
                className="p-4 cursor-pointer"
                onClick={() =>
                  setExpandedMilestone(
                    expandedMilestone === milestone.id ? null : milestone.id,
                  )
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Status Indicator */}
                    <div className="flex flex-col items-center mt-1">
                      {getMilestoneStatusIcon(milestone)}
                      {index < filteredMilestones.length - 1 && (
                        <div
                          className={`w-0.5 h-8 mt-2 ${
                            milestone.status === 'completed'
                              ? 'bg-success'
                              : milestone.status === 'in-progress'
                                ? 'bg-accent'
                                : milestone.status === 'failed'
                                  ? 'bg-danger'
                                  : 'bg-muted'
                          }`}
                        />
                      )}
                    </div>

                    {/* Milestone Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-foreground">
                          {milestone.order}. {milestone.title}
                        </h4>

                        <div className="flex items-center gap-2">
                          {milestone.automatedStep && (
                            <div className="px-2 py-1 bg-accent/20 text-accent text-xs rounded font-medium">
                              AUTO
                            </div>
                          )}

                          {milestone.weddingImpact !== 'none' && (
                            <div
                              className={`px-2 py-1 text-xs rounded font-medium ${
                                milestone.weddingImpact === 'high'
                                  ? 'bg-danger/20 text-danger'
                                  : milestone.weddingImpact === 'medium'
                                    ? 'bg-warning/20 text-warning'
                                    : 'bg-accent/20 text-accent'
                              }`}
                            >
                              {milestone.weddingImpact.toUpperCase()} IMPACT
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">
                        {milestone.description}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {milestone.startTime && (
                          <div className="flex items-center gap-1">
                            <Play className="h-3 w-3" />
                            Started:{' '}
                            {new Date(milestone.startTime).toLocaleTimeString()}
                          </div>
                        )}

                        {milestone.completedAt && (
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed:{' '}
                            {new Date(
                              milestone.completedAt,
                            ).toLocaleTimeString()}
                          </div>
                        )}

                        {milestone.eta && milestone.status === 'pending' && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            ETA: {milestone.eta}
                          </div>
                        )}

                        {milestone.duration &&
                          milestone.status === 'completed' && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Duration: {milestone.duration}
                            </div>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {milestone.status === 'failed' && onRetryMilestone && (
                    <div className="flex items-center gap-2">
                      {milestone.retryCount && milestone.maxRetries && (
                        <span className="text-xs text-muted-foreground">
                          {milestone.retryCount}/{milestone.maxRetries} retries
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRetryMilestone(milestone.id);
                        }}
                        className="px-3 py-1 text-sm bg-accent text-accent-foreground rounded hover:bg-accent/90 transition-colors"
                      >
                        Retry
                      </button>

                      {onSkipMilestone && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSkipMilestone(milestone.id);
                          }}
                          className="px-3 py-1 text-sm border border-border rounded hover:border-muted-foreground transition-colors"
                        >
                          Skip
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedMilestone === milestone.id && (
                <div className="border-t border-border bg-muted/20 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Success Criteria */}
                    <div>
                      <h5 className="font-medium text-foreground mb-2">
                        Success Criteria
                      </h5>
                      <ul className="space-y-1">
                        {milestone.successCriteria.map((criteria, idx) => (
                          <li
                            key={idx}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <CheckCircle2 className="h-3 w-3 mt-0.5 text-success flex-shrink-0" />
                            {criteria}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Dependencies & Status */}
                    <div>
                      {milestone.dependencies.length > 0 && (
                        <div className="mb-4">
                          <h5 className="font-medium text-foreground mb-2">
                            Dependencies
                          </h5>
                          <div className="space-y-1">
                            {milestone.dependencies.map((dep, idx) => (
                              <div
                                key={idx}
                                className="text-sm text-muted-foreground flex items-center gap-2"
                              >
                                <ArrowRight className="h-3 w-3" />
                                {dep}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {milestone.failureReason && (
                        <div>
                          <h5 className="font-medium text-danger mb-2">
                            Failure Reason
                          </h5>
                          <p className="text-sm text-danger bg-danger/10 p-3 rounded border border-danger/20">
                            {milestone.failureReason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Footer */}
      <div className="border-t border-border bg-elevated p-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Last updated:{' '}
            {new Date(recoveryProgress.lastUpdated).toLocaleString()}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              {incidentTimeline.affectedWeddings.length} weddings affected
            </div>

            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              {
                recoveryProgress.milestones.filter(
                  (m) => m.status === 'completed',
                ).length
              }{' '}
              steps completed
            </div>

            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Recovery initiated by {incidentTimeline.detectedBy}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisasterTimelineVisualizer;
