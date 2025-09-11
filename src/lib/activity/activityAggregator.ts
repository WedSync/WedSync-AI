'use client';

import { ActivityFeed as ActivityFeedType } from '@/types/communications';
import {
  addMinutes,
  isAfter,
  isBefore,
  isEqual,
  parseISO,
  formatDistanceToNow,
} from 'date-fns';

export interface AggregatedActivity {
  id: string;
  type: 'single' | 'grouped';
  activities: ActivityFeedType[];
  title: string;
  description: string;
  icon: string;
  color: string;
  count: number;
  actors: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  entities: Array<{
    type: string;
    id: string;
    count: number;
  }>;
  timeRange: {
    start: string;
    end: string;
  };
  isRead: boolean;
  created_at: string;
  updated_at: string;
}

export interface AggregationOptions {
  timeWindowMinutes?: number;
  minGroupSize?: number;
  maxGroupSize?: number;
  groupByActor?: boolean;
  groupByEntity?: boolean;
  groupByActivityType?: boolean;
  enableSmartGrouping?: boolean;
  priorityThreshold?: number;
}

export interface AggregationRules {
  [key: string]: {
    canGroup: boolean;
    timeWindow: number;
    maxItems: number;
    groupTitle: (activities: ActivityFeedType[]) => string;
    groupDescription: (activities: ActivityFeedType[]) => string;
    priority: number;
  };
}

const DEFAULT_AGGREGATION_RULES: AggregationRules = {
  // Message activities
  message_sent: {
    canGroup: true,
    timeWindow: 5, // 5 minutes
    maxItems: 10,
    groupTitle: (activities) => {
      const actor = activities[0].actor_name || 'Someone';
      return activities.length === 1
        ? `${actor} sent a message`
        : `${actor} sent ${activities.length} messages`;
    },
    groupDescription: (activities) => {
      const recipients = new Set(
        activities.map((a) => a.data?.recipient_name).filter(Boolean),
      );
      return recipients.size === 1
        ? `to ${Array.from(recipients)[0]}`
        : `to ${recipients.size} recipients`;
    },
    priority: 3,
  },

  // Form submissions
  form_submitted: {
    canGroup: true,
    timeWindow: 15, // 15 minutes
    maxItems: 20,
    groupTitle: (activities) => {
      return activities.length === 1
        ? `New form submission`
        : `${activities.length} new form submissions`;
    },
    groupDescription: (activities) => {
      const forms = new Set(
        activities.map((a) => a.data?.form_name).filter(Boolean),
      );
      return forms.size === 1
        ? `for ${Array.from(forms)[0]}`
        : `across ${forms.size} forms`;
    },
    priority: 2,
  },

  // Client activities
  client_created: {
    canGroup: true,
    timeWindow: 30, // 30 minutes
    maxItems: 15,
    groupTitle: (activities) => {
      return activities.length === 1
        ? `New client added`
        : `${activities.length} new clients added`;
    },
    groupDescription: (activities) => {
      const actors = new Set(
        activities.map((a) => a.actor_name).filter(Boolean),
      );
      return actors.size === 1
        ? `by ${Array.from(actors)[0]}`
        : `by ${actors.size} team members`;
    },
    priority: 4,
  },

  // Payment activities
  payment_received: {
    canGroup: true,
    timeWindow: 60, // 1 hour
    maxItems: 10,
    groupTitle: (activities) => {
      if (activities.length === 1) {
        const amount = activities[0].data?.amount;
        const currency = activities[0].data?.currency || '$';
        return `Payment received: ${currency}${amount}`;
      }

      const totalAmount = activities.reduce(
        (sum, a) => sum + (a.data?.amount || 0),
        0,
      );
      const currency = activities[0].data?.currency || '$';
      return `${activities.length} payments received: ${currency}${totalAmount}`;
    },
    groupDescription: (activities) => {
      const clients = new Set(
        activities.map((a) => a.data?.client_name).filter(Boolean),
      );
      return clients.size === 1
        ? `from ${Array.from(clients)[0]}`
        : `from ${clients.size} clients`;
    },
    priority: 1,
  },

  // System notifications
  system_notification: {
    canGroup: true,
    timeWindow: 10, // 10 minutes
    maxItems: 5,
    groupTitle: (activities) => {
      return activities.length === 1
        ? activities[0].title
        : `${activities.length} system notifications`;
    },
    groupDescription: (activities) => {
      return activities.length === 1
        ? activities[0].description || ''
        : 'Multiple system updates';
    },
    priority: 5,
  },

  // Email activities
  email_sent: {
    canGroup: true,
    timeWindow: 10, // 10 minutes
    maxItems: 20,
    groupTitle: (activities) => {
      return activities.length === 1
        ? `Email sent`
        : `${activities.length} emails sent`;
    },
    groupDescription: (activities) => {
      const recipients = new Set(
        activities.map((a) => a.data?.recipient_email).filter(Boolean),
      );
      return `to ${recipients.size} recipient${recipients.size === 1 ? '' : 's'}`;
    },
    priority: 4,
  },
};

export class ActivityAggregator {
  private rules: AggregationRules;
  private options: Required<AggregationOptions>;

  constructor(
    customRules: Partial<AggregationRules> = {},
    options: AggregationOptions = {},
  ) {
    this.rules = { ...DEFAULT_AGGREGATION_RULES, ...customRules };
    this.options = {
      timeWindowMinutes: options.timeWindowMinutes ?? 15,
      minGroupSize: options.minGroupSize ?? 2,
      maxGroupSize: options.maxGroupSize ?? 50,
      groupByActor: options.groupByActor ?? true,
      groupByEntity: options.groupByEntity ?? false,
      groupByActivityType: options.groupByActivityType ?? true,
      enableSmartGrouping: options.enableSmartGrouping ?? true,
      priorityThreshold: options.priorityThreshold ?? 3,
    };
  }

  aggregate(
    activities: ActivityFeedType[],
    userId?: string,
  ): AggregatedActivity[] {
    if (activities.length === 0) {
      return [];
    }

    // Sort activities by creation time (newest first)
    const sortedActivities = [...activities].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const aggregated: AggregatedActivity[] = [];
    const processed = new Set<string>();

    for (const activity of sortedActivities) {
      if (processed.has(activity.id)) {
        continue;
      }

      const rule = this.rules[activity.activity_type];

      // If no rule exists or grouping is disabled, create single activity
      if (!rule || !rule.canGroup) {
        aggregated.push(this.createSingleActivity(activity, userId));
        processed.add(activity.id);
        continue;
      }

      // Find activities that can be grouped with this one
      const groupCandidates = this.findGroupCandidates(
        activity,
        sortedActivities,
        processed,
        rule,
      );

      if (groupCandidates.length >= this.options.minGroupSize) {
        // Create grouped activity
        const grouped = this.createGroupedActivity(
          groupCandidates,
          rule,
          userId,
        );
        aggregated.push(grouped);

        // Mark all as processed
        groupCandidates.forEach((a) => processed.add(a.id));
      } else {
        // Create single activity
        aggregated.push(this.createSingleActivity(activity, userId));
        processed.add(activity.id);
      }
    }

    // Sort by priority and time
    return aggregated.sort((a, b) => {
      // First by read status (unread first)
      if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
      }

      // Then by time (newest first)
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }

  private findGroupCandidates(
    baseActivity: ActivityFeedType,
    allActivities: ActivityFeedType[],
    processed: Set<string>,
    rule: AggregationRules[string],
  ): ActivityFeedType[] {
    const candidates = [baseActivity];
    const baseTime = parseISO(baseActivity.created_at);
    const timeWindow = addMinutes(baseTime, -rule.timeWindow);

    for (const activity of allActivities) {
      if (
        processed.has(activity.id) ||
        activity.id === baseActivity.id ||
        candidates.length >= rule.maxItems
      ) {
        continue;
      }

      if (this.canGroup(baseActivity, activity, rule, timeWindow)) {
        candidates.push(activity);
      }
    }

    return candidates;
  }

  private canGroup(
    baseActivity: ActivityFeedType,
    candidateActivity: ActivityFeedType,
    rule: AggregationRules[string],
    timeWindow: Date,
  ): boolean {
    const candidateTime = parseISO(candidateActivity.created_at);

    // Check time window
    if (isBefore(candidateTime, timeWindow)) {
      return false;
    }

    // Must be same activity type
    if (baseActivity.activity_type !== candidateActivity.activity_type) {
      return false;
    }

    // Check grouping criteria
    if (this.options.groupByActor) {
      if (baseActivity.actor_id !== candidateActivity.actor_id) {
        return false;
      }
    }

    if (this.options.groupByEntity) {
      if (
        baseActivity.entity_type !== candidateActivity.entity_type ||
        baseActivity.entity_id !== candidateActivity.entity_id
      ) {
        return false;
      }
    }

    // Smart grouping checks
    if (this.options.enableSmartGrouping) {
      // For messages, group by conversation or recipient
      if (baseActivity.activity_type === 'message_sent') {
        const baseConversation = baseActivity.data?.conversation_id;
        const candidateConversation = candidateActivity.data?.conversation_id;
        if (
          baseConversation &&
          candidateConversation &&
          baseConversation !== candidateConversation
        ) {
          return false;
        }
      }

      // For form submissions, group by form
      if (baseActivity.activity_type === 'form_submitted') {
        const baseForm = baseActivity.data?.form_id;
        const candidateForm = candidateActivity.data?.form_id;
        if (baseForm && candidateForm && baseForm !== candidateForm) {
          return false;
        }
      }
    }

    return true;
  }

  private createSingleActivity(
    activity: ActivityFeedType,
    userId?: string,
  ): AggregatedActivity {
    return {
      id: activity.id,
      type: 'single',
      activities: [activity],
      title: activity.title,
      description: activity.description || '',
      icon: activity.icon || 'activity',
      color: activity.color || '#6b7280',
      count: 1,
      actors: activity.actor_name
        ? [
            {
              id: activity.actor_id || '',
              name: activity.actor_name,
              type: activity.actor_type,
            },
          ]
        : [],
      entities: [
        {
          type: activity.entity_type,
          id: activity.entity_id,
          count: 1,
        },
      ],
      timeRange: {
        start: activity.created_at,
        end: activity.created_at,
      },
      isRead: userId ? activity.read_by?.includes(userId) || false : false,
      created_at: activity.created_at,
      updated_at: activity.created_at,
    };
  }

  private createGroupedActivity(
    activities: ActivityFeedType[],
    rule: AggregationRules[string],
    userId?: string,
  ): AggregatedActivity {
    const sortedActivities = activities.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const firstActivity = sortedActivities[0];
    const lastActivity = sortedActivities[sortedActivities.length - 1];

    // Extract unique actors
    const actors = Array.from(
      new Map(
        activities
          .filter((a) => a.actor_name)
          .map((a) => [
            a.actor_id,
            {
              id: a.actor_id || '',
              name: a.actor_name!,
              type: a.actor_type,
            },
          ]),
      ).values(),
    );

    // Extract entity information
    const entityCounts = activities.reduce(
      (acc, activity) => {
        const key = `${activity.entity_type}:${activity.entity_id}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const entities = Object.entries(entityCounts).map(([key, count]) => {
      const [type, id] = key.split(':');
      return { type, id, count };
    });

    // Check if all activities are read
    const isRead = userId
      ? activities.every((a) => a.read_by?.includes(userId))
      : false;

    // Generate unique ID for the group
    const groupId = `group_${firstActivity.activity_type}_${activities
      .map((a) => a.id)
      .sort()
      .join('_')}`;

    return {
      id: groupId,
      type: 'grouped',
      activities: sortedActivities,
      title: rule.groupTitle(activities),
      description: rule.groupDescription(activities),
      icon: firstActivity.icon || 'activity',
      color: firstActivity.color || '#6b7280',
      count: activities.length,
      actors,
      entities,
      timeRange: {
        start: firstActivity.created_at,
        end: lastActivity.created_at,
      },
      isRead,
      created_at: lastActivity.created_at, // Use latest for sorting
      updated_at: lastActivity.created_at,
    };
  }

  // Get aggregation statistics
  getAggregationStats(
    originalActivities: ActivityFeedType[],
    aggregatedActivities: AggregatedActivity[],
  ): {
    originalCount: number;
    aggregatedCount: number;
    reductionPercentage: number;
    groupedActivities: number;
    singleActivities: number;
    largestGroupSize: number;
    avgGroupSize: number;
  } {
    const groupedActivities = aggregatedActivities.filter(
      (a) => a.type === 'grouped',
    );
    const singleActivities = aggregatedActivities.filter(
      (a) => a.type === 'single',
    );

    const totalGroupedItems = groupedActivities.reduce(
      (sum, group) => sum + group.count,
      0,
    );
    const largestGroupSize =
      groupedActivities.length > 0
        ? Math.max(...groupedActivities.map((g) => g.count))
        : 0;
    const avgGroupSize =
      groupedActivities.length > 0
        ? totalGroupedItems / groupedActivities.length
        : 0;

    const reductionPercentage =
      originalActivities.length > 0
        ? ((originalActivities.length - aggregatedActivities.length) /
            originalActivities.length) *
          100
        : 0;

    return {
      originalCount: originalActivities.length,
      aggregatedCount: aggregatedActivities.length,
      reductionPercentage: Math.round(reductionPercentage * 100) / 100,
      groupedActivities: groupedActivities.length,
      singleActivities: singleActivities.length,
      largestGroupSize,
      avgGroupSize: Math.round(avgGroupSize * 100) / 100,
    };
  }

  // Update aggregation rules
  updateRules(newRules: Partial<AggregationRules>): void {
    this.rules = { ...this.rules, ...newRules };
  }

  // Update options
  updateOptions(newOptions: Partial<AggregationOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  // Get current rules
  getRules(): AggregationRules {
    return { ...this.rules };
  }

  // Get current options
  getOptions(): AggregationOptions {
    return { ...this.options };
  }
}
