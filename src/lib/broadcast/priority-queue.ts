/**
 * Priority Queue for WedSync Broadcast Events System
 * Handles priority-based message queuing for wedding industry contexts
 */

export type BroadcastPriority = 'critical' | 'high' | 'normal' | 'low';

export interface BroadcastMessage {
  id: string;
  type: string;
  priority: BroadcastPriority;
  title: string;
  message: string;
  action?: {
    label: string;
    url: string;
  };
  weddingContext?: {
    weddingId: string;
    coupleName: string;
    weddingDate: Date;
  };
  expiresAt?: Date;
  deliveredAt: Date;
  readAt?: Date;
  acknowledgedAt?: Date;
  targetRoles?: ('couple' | 'coordinator' | 'supplier' | 'photographer')[];
  metadata?: Record<string, any>;
}

interface PriorityQueueNode {
  message: BroadcastMessage;
  priority: number;
  timestamp: number;
}

/**
 * Wedding industry specific priority queue for broadcast messages
 * Ensures critical wedding updates are delivered first
 */
export class BroadcastPriorityQueue {
  private queue: PriorityQueueNode[] = [];
  private readonly priorityWeights = {
    critical: 1000, // Wedding cancellations, payment failures, security alerts
    high: 100, // Timeline changes within 48hrs, vendor no-shows
    normal: 10, // Feature announcements, timeline updates
    low: 1, // Marketing messages, tips
  };

  /**
   * Add a message to the priority queue
   */
  enqueue(message: BroadcastMessage): void {
    // Check if message is expired
    if (message.expiresAt && new Date() > message.expiresAt) {
      console.warn(`Dropping expired broadcast message: ${message.id}`);
      return;
    }

    // Check for duplicates
    if (this.hasMessage(message.id)) {
      console.warn(`Duplicate broadcast message ignored: ${message.id}`);
      return;
    }

    const priority = this.calculatePriority(message);
    const node: PriorityQueueNode = {
      message,
      priority,
      timestamp: Date.now(),
    };

    // Insert at correct position to maintain priority order
    let inserted = false;
    for (let i = 0; i < this.queue.length; i++) {
      if (this.shouldInsertBefore(node, this.queue[i])) {
        this.queue.splice(i, 0, node);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.queue.push(node);
    }

    // Log for analytics in wedding contexts
    if (message.weddingContext) {
      this.logWeddingBroadcast(message);
    }
  }

  /**
   * Remove and return the highest priority message
   */
  dequeue(): BroadcastMessage | null {
    if (this.queue.length === 0) {
      return null;
    }

    const node = this.queue.shift();
    return node?.message || null;
  }

  /**
   * Peek at the highest priority message without removing it
   */
  peek(): BroadcastMessage | null {
    if (this.queue.length === 0) {
      return null;
    }

    return this.queue[0].message;
  }

  /**
   * Check if queue has more messages
   */
  hasNext(): boolean {
    return this.queue.length > 0;
  }

  /**
   * Get current queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Remove expired messages from queue
   */
  cleanExpired(): number {
    const now = new Date();
    const initialSize = this.queue.length;

    this.queue = this.queue.filter((node) => {
      const isExpired = node.message.expiresAt && now > node.message.expiresAt;
      if (isExpired) {
        console.log(`Removing expired broadcast: ${node.message.id}`);
      }
      return !isExpired;
    });

    return initialSize - this.queue.length; // Number of removed messages
  }

  /**
   * Get messages by priority level
   */
  getMessagesByPriority(priority: BroadcastPriority): BroadcastMessage[] {
    return this.queue
      .filter((node) => node.message.priority === priority)
      .map((node) => node.message);
  }

  /**
   * Get all messages for specific wedding
   */
  getMessagesForWedding(weddingId: string): BroadcastMessage[] {
    return this.queue
      .filter((node) => node.message.weddingContext?.weddingId === weddingId)
      .map((node) => node.message);
  }

  /**
   * Remove message by ID
   */
  removeMessage(messageId: string): boolean {
    const initialSize = this.queue.length;
    this.queue = this.queue.filter((node) => node.message.id !== messageId);
    return this.queue.length < initialSize;
  }

  /**
   * Clear all messages
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Get queue statistics for monitoring
   */
  getStats(): {
    total: number;
    byCritical: number;
    byHigh: number;
    byNormal: number;
    byLow: number;
    weddingRelated: number;
    expired: number;
    oldestTimestamp: number | null;
    newestTimestamp: number | null;
  } {
    const stats = {
      total: this.queue.length,
      byCritical: 0,
      byHigh: 0,
      byNormal: 0,
      byLow: 0,
      weddingRelated: 0,
      expired: 0,
      oldestTimestamp: null as number | null,
      newestTimestamp: null as number | null,
    };

    const now = new Date();

    this.queue.forEach((node) => {
      // Count by priority
      switch (node.message.priority) {
        case 'critical':
          stats.byCritical++;
          break;
        case 'high':
          stats.byHigh++;
          break;
        case 'normal':
          stats.byNormal++;
          break;
        case 'low':
          stats.byLow++;
          break;
      }

      // Count wedding-related
      if (node.message.weddingContext) {
        stats.weddingRelated++;
      }

      // Count expired
      if (node.message.expiresAt && now > node.message.expiresAt) {
        stats.expired++;
      }

      // Track timestamps
      if (!stats.oldestTimestamp || node.timestamp < stats.oldestTimestamp) {
        stats.oldestTimestamp = node.timestamp;
      }
      if (!stats.newestTimestamp || node.timestamp > stats.newestTimestamp) {
        stats.newestTimestamp = node.timestamp;
      }
    });

    return stats;
  }

  /**
   * Calculate priority score for a message
   */
  private calculatePriority(message: BroadcastMessage): number {
    let priority = this.priorityWeights[message.priority];

    // Boost priority for wedding-related contexts
    if (message.weddingContext) {
      const weddingDate = new Date(message.weddingContext.weddingDate);
      const now = new Date();
      const daysUntilWedding = Math.ceil(
        (weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Higher priority as wedding approaches
      if (daysUntilWedding <= 7) {
        priority *= 2; // Double priority for weddings within a week
      } else if (daysUntilWedding <= 30) {
        priority *= 1.5; // 1.5x priority for weddings within a month
      }

      // Saturday weddings get highest priority (wedding day protocol)
      if (weddingDate.getDay() === 6) {
        priority *= 3;
      }
    }

    // Boost priority for critical wedding industry types
    const criticalTypes = [
      'wedding.cancelled',
      'payment.failure',
      'security.alert',
      'venue.emergency',
      'weather.alert',
    ];

    if (criticalTypes.includes(message.type)) {
      priority *= 5; // Multiply by 5 for critical wedding types
    }

    // Time-sensitive boost for recent messages
    const messageAge = Date.now() - message.deliveredAt.getTime();
    const ageBoost = Math.max(1, 1.2 - messageAge / (1000 * 60 * 60)); // Decay over 1 hour
    priority *= ageBoost;

    return Math.floor(priority);
  }

  /**
   * Determine if node should be inserted before another node
   */
  private shouldInsertBefore(
    newNode: PriorityQueueNode,
    existingNode: PriorityQueueNode,
  ): boolean {
    // Higher priority goes first
    if (newNode.priority > existingNode.priority) {
      return true;
    }

    // If same priority, newer messages go first (LIFO for same priority)
    if (newNode.priority === existingNode.priority) {
      return newNode.timestamp > existingNode.timestamp;
    }

    return false;
  }

  /**
   * Check if message ID already exists in queue
   */
  private hasMessage(messageId: string): boolean {
    return this.queue.some((node) => node.message.id === messageId);
  }

  /**
   * Log wedding-specific broadcast for analytics
   */
  private logWeddingBroadcast(message: BroadcastMessage): void {
    // In production, this would send to analytics service
    if (process.env.NODE_ENV === 'development') {
      console.log(`Wedding broadcast queued:`, {
        messageId: message.id,
        priority: message.priority,
        wedding: message.weddingContext?.coupleName,
        date: message.weddingContext?.weddingDate,
        type: message.type,
      });
    }

    // Could extend to send to wedding industry specific tracking
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'wedding_broadcast_queued', {
        priority: message.priority,
        message_type: message.type,
        has_wedding_context: !!message.weddingContext,
        days_until_wedding: message.weddingContext
          ? Math.ceil(
              (new Date(message.weddingContext.weddingDate).getTime() -
                Date.now()) /
                (1000 * 60 * 60 * 24),
            )
          : null,
      });
    }
  }
}

/**
 * Factory function to create a priority queue with wedding industry defaults
 */
export function createWeddingBroadcastQueue(): BroadcastPriorityQueue {
  const queue = new BroadcastPriorityQueue();

  // Set up automatic cleanup of expired messages every 5 minutes
  if (typeof window !== 'undefined') {
    const cleanupInterval = setInterval(
      () => {
        const removedCount = queue.cleanExpired();
        if (removedCount > 0) {
          console.log(`Cleaned ${removedCount} expired broadcast messages`);
        }
      },
      5 * 60 * 1000,
    );

    // Clean up interval on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(cleanupInterval);
    });
  }

  return queue;
}

/**
 * Helper to create a test broadcast message
 */
export function createTestBroadcast(
  priority: BroadcastPriority = 'normal',
  type: string = 'test.message',
  weddingId?: string,
): BroadcastMessage {
  return {
    id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    priority,
    title: `Test ${priority} priority message`,
    message: `This is a test message with ${priority} priority`,
    deliveredAt: new Date(),
    weddingContext: weddingId
      ? {
          weddingId,
          coupleName: 'Test Couple',
          weddingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        }
      : undefined,
    metadata: {
      testMessage: true,
      generatedAt: new Date().toISOString(),
    },
  };
}
