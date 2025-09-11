/**
 * WS-133: Onboarding Analytics API
 * API endpoints for onboarding workflow analytics and insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { rateLimit } from '@/lib/ratelimit';

/**
 * GET /api/customer-success/onboarding/analytics
 * Get analytics data for onboarding workflows
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const identifier = request.ip ?? 'anonymous';
  const { success } = await rateLimit.limit(identifier);

  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '30d';
    const organizationId =
      searchParams.get('organizationId') || session.user.organizationId;

    // For admin users, they can access organization-wide analytics
    if (
      organizationId &&
      organizationId !== session.user.organizationId &&
      !session.user.isAdmin
    ) {
      return NextResponse.json(
        { error: 'Access denied to organization analytics' },
        { status: 403 },
      );
    }

    // Mock analytics data - in real implementation, this would query the database
    const mockAnalytics = {
      totalUsers: 1247,
      completionRate: 73.5,
      averageCompletionTimeHours: 36.8,

      // Stage drop-off analysis
      dropoffStages: [
        {
          stageName: 'Business Setup',
          dropoffRate: 18.3,
          commonExitPoints: [
            'Configure Business Settings task',
            'Add Your First Client task',
          ],
        },
        {
          stageName: 'Feature Exploration',
          dropoffRate: 12.7,
          commonExitPoints: [
            'Create a Task List task',
            'Set Up Communication Hub task',
          ],
        },
        {
          stageName: 'Welcome & Getting Started',
          dropoffRate: 8.2,
          commonExitPoints: ['Take the Welcome Tour task'],
        },
        {
          stageName: 'Mastery & Success',
          dropoffRate: 15.1,
          commonExitPoints: ['Complete Your First Wedding task'],
        },
      ],

      // Time to complete each stage
      timeToComplete: [
        {
          stage: 'Welcome & Getting Started',
          averageHours: 2.4,
          median: 1.8,
          p90: 4.2,
        },
        {
          stage: 'Business Setup',
          averageHours: 18.7,
          median: 12.3,
          p90: 36.5,
        },
        {
          stage: 'Feature Exploration',
          averageHours: 28.3,
          median: 22.1,
          p90: 45.8,
        },
        {
          stage: 'Mastery & Success',
          averageHours: 168.5,
          median: 120.2,
          p90: 312.7,
        },
      ],

      // Automation performance
      automationPerformance: [
        {
          ruleName: 'Welcome Email Sequence',
          triggerCount: 1247,
          successRate: 94.2,
          averageResponseTime: 2.3,
        },
        {
          ruleName: 'Milestone Celebration',
          triggerCount: 892,
          successRate: 88.7,
          averageResponseTime: 1.8,
        },
        {
          ruleName: 'Progress Nudge Reminders',
          triggerCount: 456,
          successRate: 67.4,
          averageResponseTime: 12.7,
        },
        {
          ruleName: 'Feature Spotlight',
          triggerCount: 334,
          successRate: 82.1,
          averageResponseTime: 3.4,
        },
        {
          ruleName: 'At-Risk User Intervention',
          triggerCount: 128,
          successRate: 56.2,
          averageResponseTime: 24.8,
        },
        {
          ruleName: 'Onboarding Completion Reward',
          triggerCount: 89,
          successRate: 96.6,
          averageResponseTime: 1.1,
        },
      ],

      // User journey insights
      userJourneyInsights: {
        mostEngagedStage: 'Welcome & Getting Started',
        leastEngagedStage: 'Mastery & Success',
        averageTasksPerSession: 2.3,
        peakActivityHours: [9, 10, 11, 14, 15, 16], // Hours in day (0-23)
        commonPaths: [
          {
            path: 'welcome → setup → features → completed',
            percentage: 58.2,
            averageTime: 156.3,
          },
          {
            path: 'welcome → setup → abandoned',
            percentage: 18.3,
            averageTime: 24.7,
          },
          {
            path: 'welcome → setup → features → abandoned',
            percentage: 12.7,
            averageTime: 78.2,
          },
        ],
      },

      // Task-level analytics
      taskAnalytics: {
        mostCompletedTasks: [
          { taskName: 'Complete Your Profile', completionRate: 96.8 },
          { taskName: 'Take the Welcome Tour', completionRate: 94.2 },
          { taskName: 'Configure Business Settings', completionRate: 89.3 },
        ],
        leastCompletedTasks: [
          { taskName: 'Complete Your First Wedding', completionRate: 23.4 },
          { taskName: 'Achieve Power User Status', completionRate: 18.7 },
          { taskName: 'Explore Collaboration Tools', completionRate: 56.8 },
        ],
        averageAttempts: {
          'Complete Your Profile': 1.2,
          'Add Your First Client': 2.1,
          'Create a Task List': 1.8,
          'Complete Your First Wedding': 3.4,
        },
      },

      // Performance trends
      trends: {
        completionRateByMonth: [
          { month: 'Jan 2024', rate: 68.2 },
          { month: 'Feb 2024', rate: 71.4 },
          { month: 'Mar 2024', rate: 73.1 },
          { month: 'Apr 2024', rate: 73.5 },
        ],
        userGrowthByStage: [
          { stage: 'Welcome', newUsers: 234, completed: 226 },
          { stage: 'Setup', newUsers: 226, completed: 189 },
          { stage: 'Features', newUsers: 189, completed: 143 },
          { stage: 'Mastery', newUsers: 143, completed: 89 },
        ],
      },

      // Recommendations
      recommendations: [
        {
          type: 'improvement',
          priority: 'high',
          title: 'Reduce Business Setup Drop-off',
          description:
            'Focus on simplifying the "Add Your First Client" task which shows highest abandonment',
          suggestedActions: [
            'Add inline help tooltips',
            'Provide sample client data',
            'Break task into smaller steps',
            'Add progress indicators',
          ],
        },
        {
          type: 'automation',
          priority: 'medium',
          title: 'Improve Progress Nudge Effectiveness',
          description:
            'Progress nudge automation has lower success rate compared to other triggers',
          suggestedActions: [
            'Personalize nudge content based on stuck point',
            'Experiment with different timing intervals',
            'A/B test email vs in-app notifications',
            'Add specific help resources to nudges',
          ],
        },
        {
          type: 'feature',
          priority: 'medium',
          title: 'Add Collaborative Onboarding',
          description:
            'Users who invite team members early show 34% higher completion rates',
          suggestedActions: [
            'Promote team invitation in setup stage',
            'Add team onboarding milestones',
            'Create shared progress dashboards',
            'Reward collaborative behavior',
          ],
        },
      ],

      // Cohort analysis
      cohortAnalysis: {
        byUserType: {
          wedding_planner: { completionRate: 78.2, averageTime: 32.4 },
          supplier: { completionRate: 69.7, averageTime: 28.9 },
          couple: { completionRate: 82.1, averageTime: 18.6 },
        },
        byAcquisitionChannel: {
          organic_search: { completionRate: 76.4, averageTime: 34.2 },
          social_media: { completionRate: 71.8, averageTime: 31.7 },
          referral: { completionRate: 84.3, averageTime: 28.9 },
          direct: { completionRate: 79.2, averageTime: 35.8 },
        },
        byGeography: {
          'North America': { completionRate: 74.8, averageTime: 33.2 },
          Europe: { completionRate: 72.1, averageTime: 35.7 },
          'Asia Pacific': { completionRate: 76.9, averageTime: 29.8 },
        },
      },

      // Metadata
      lastUpdated: new Date().toISOString(),
      timeframe,
      organizationId: organizationId || 'all',
      dataPoints: 1247,
      confidence: 0.95,
    };

    return NextResponse.json({
      success: true,
      data: mockAnalytics,
    });
  } catch (error) {
    console.error('Onboarding analytics API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to load analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/customer-success/onboarding/analytics/export
 * Export analytics data in various formats
 */
export async function POST(request: NextRequest) {
  // Apply stricter rate limiting for export operations
  const identifier = request.ip ?? 'anonymous';
  const { success } = await rateLimit.limit(identifier, {
    requests: 5,
    window: '1m',
  });

  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded for export operations' },
      { status: 429 },
    );
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required for data export' },
        { status: 403 },
      );
    }

    const { format, timeframe, filters } = await request.json();

    // Validate format
    if (!['csv', 'json', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'Unsupported export format. Use csv, json, or pdf' },
        { status: 400 },
      );
    }

    // Generate export data
    const exportData = {
      exportId: `export-${Date.now()}`,
      format,
      timeframe: timeframe || '30d',
      filters: filters || {},
      status: 'processing',
      estimatedCompletionTime: new Date(Date.now() + 30000), // 30 seconds
      downloadUrl: null, // Will be populated when ready
      expiresAt: new Date(Date.now() + 86400000), // 24 hours
    };

    // In a real implementation, this would:
    // 1. Queue the export job
    // 2. Generate the file asynchronously
    // 3. Store it in secure storage
    // 4. Send notification when ready

    return NextResponse.json(
      {
        success: true,
        data: exportData,
        message: 'Export job queued successfully',
      },
      { status: 202 },
    );
  } catch (error) {
    console.error('Analytics export API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to queue export',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
