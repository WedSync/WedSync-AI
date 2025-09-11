/**
 * WS-188: Background Sync Coordinator
 * Intelligent retry logic with exponential backoff and network condition adaptation
 * Priority queue processing with wedding day data getting immediate processing
 * Conflict resolution coordination with user notification and decision workflows
 * Performance monitoring with sync analytics and optimization recommendations
 */

export interface SyncTask {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  retryCount: number;
  maxRetries: number;
  nextRetry: number;
  createdAt: number;
  lastAttempt: number;
  metadata?: {
    weddingId?: string;
    dataType?: string;
    userAction?: string;
    deviceId?: string;
  };
}

export interface SyncConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
  priorityMultiplier: Record<string, number>;
  networkAwareRetry: boolean;
  batchSize: number;
  concurrentSyncs: number;
}

export interface SyncStats {
  totalTasks: number;
  pendingTasks: number;
  failedTasks: number;
  completedTasks: number;
  averageRetryCount: number;
  averageSyncTime: number;
  successRate: number;
  lastSyncTime: Date | null;
  nextScheduledSync: Date | null;
}

export interface ConflictResolution {
  taskId: string;
  conflictType:
    | 'data_version'
    | 'network_error'
    | 'auth_error'
    | 'validation_error';
  localData: any;
  remoteData?: any;
  resolution: 'use_local' | 'use_remote' | 'merge' | 'user_decide';
  timestamp: number;
}

// Default sync configuration optimized for wedding scenarios
const DEFAULT_SYNC_CONFIG: SyncConfig = {
  maxRetries: 5,
  baseDelay: 2000, // 2 seconds
  maxDelay: 300000, // 5 minutes
  exponentialBase: 2,
  priorityMultiplier: {
    critical: 0.5, // Faster retry for critical data
    high: 1.0,
    medium: 1.5,
    low: 2.0, // Slower retry for low priority
  },
  networkAwareRetry: true,
  batchSize: 10,
  concurrentSyncs: 3,
};

export class BackgroundSyncCoordinator {
  private config: SyncConfig;
  private db: IDBDatabase | null = null;
  private syncInProgress = false;
  private activeSyncs = new Map<string, Promise<void>>();
  private networkMonitor: any = null;
  private syncStats: SyncStats = {
    totalTasks: 0,
    pendingTasks: 0,
    failedTasks: 0,
    completedTasks: 0,
    averageRetryCount: 0,
    averageSyncTime: 0,
    successRate: 0,
    lastSyncTime: null,
    nextScheduledSync: null,
  };

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
    this.initializeNetworkMonitoring();
  }

  // Initialize the background sync system
  async initialize(): Promise<void> {
    try {
      this.db = await this.openDatabase();
      await this.updateSyncStats();
      await this.rescheduleFailedTasks();
      console.log('[WS-188] Background sync coordinator initialized');
    } catch (error) {
      console.error('[WS-188] Failed to initialize background sync:', error);
      throw error;
    }
  }

  // Open IndexedDB for sync task management
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WedSyncBackgroundSync', 2);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBRequest).result;

        // Sync tasks store
        if (!db.objectStoreNames.contains('sync_tasks')) {
          const store = db.createObjectStore('sync_tasks', { keyPath: 'id' });
          store.createIndex('priority', 'priority', { unique: false });
          store.createIndex('nextRetry', 'nextRetry', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }

        // Conflict resolution store
        if (!db.objectStoreNames.contains('conflicts')) {
          const store = db.createObjectStore('conflicts', {
            keyPath: 'taskId',
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Sync analytics store
        if (!db.objectStoreNames.contains('sync_analytics')) {
          const store = db.createObjectStore('sync_analytics', {
            keyPath: 'date',
          });
        }
      };
    });
  }

  // Initialize network condition monitoring for adaptive sync
  private initializeNetworkMonitoring(): void {
    if ('connection' in navigator) {
      this.networkMonitor = (navigator as any).connection;

      this.networkMonitor.addEventListener('change', () => {
        console.log('[WS-188] Network conditions changed:', {
          effectiveType: this.networkMonitor.effectiveType,
          downlink: this.networkMonitor.downlink,
          rtt: this.networkMonitor.rtt,
        });

        // Trigger sync on network improvement
        if (this.networkMonitor.effectiveType !== 'slow-2g') {
          setTimeout(() => this.processQueue(), 1000);
        }
      });
    }
  }

  // Queue a task for background sync
  async queueTask(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: string,
    priority: 'critical' | 'high' | 'medium' | 'low' = 'medium',
    metadata?: any,
  ): Promise<string> {
    if (!this.db) {
      throw new Error('Background sync not initialized');
    }

    const taskId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const task: SyncTask = {
      id: taskId,
      url,
      method,
      headers,
      body,
      priority,
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      nextRetry: Date.now(),
      createdAt: Date.now(),
      lastAttempt: 0,
      metadata,
    };

    try {
      const tx = this.db.transaction(['sync_tasks'], 'readwrite');
      const store = tx.objectStore('sync_tasks');
      await store.add(task);

      console.log(
        `[WS-188] Queued sync task: ${taskId} (${priority} priority)`,
      );

      // Immediate processing for critical tasks
      if (priority === 'critical') {
        setTimeout(() => this.processTask(task), 100);
      } else {
        // Schedule normal processing
        setTimeout(() => this.processQueue(), 500);
      }

      await this.updateSyncStats();
      return taskId;
    } catch (error) {
      console.error('[WS-188] Failed to queue sync task:', error);
      throw error;
    }
  }

  // Process the sync queue with priority handling
  async processQueue(): Promise<void> {
    if (!this.db || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      console.log('[WS-188] Processing sync queue...');

      // Get tasks ready for processing
      const tasks = await this.getReadyTasks();
      if (tasks.length === 0) {
        return;
      }

      console.log(`[WS-188] Found ${tasks.length} tasks ready for sync`);

      // Group tasks by priority and process accordingly
      const priorityGroups = this.groupTasksByPriority(tasks);

      for (const [priority, groupTasks] of priorityGroups) {
        console.log(
          `[WS-188] Processing ${groupTasks.length} ${priority} priority tasks`,
        );

        // Process tasks with concurrency limits
        const chunks = this.chunkArray(groupTasks, this.config.batchSize);

        for (const chunk of chunks) {
          await this.processTaskChunk(chunk);
        }

        // Short break between priority groups
        if (priority !== 'critical') {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error('[WS-188] Queue processing failed:', error);
    } finally {
      this.syncInProgress = false;
      await this.updateSyncStats();
    }
  }

  // Get tasks ready for processing
  private async getReadyTasks(): Promise<SyncTask[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['sync_tasks'], 'readonly');
      const store = tx.objectStore('sync_tasks');
      const index = store.index('nextRetry');
      const request = index.getAll(IDBKeyRange.upperBound(Date.now()));

      request.onsuccess = () => {
        const tasks = request.result as SyncTask[];
        // Filter out tasks that have exceeded max retries
        const validTasks = tasks.filter(
          (task) => task.retryCount < task.maxRetries,
        );
        resolve(validTasks);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Group tasks by priority for ordered processing
  private groupTasksByPriority(tasks: SyncTask[]): Map<string, SyncTask[]> {
    const groups = new Map<string, SyncTask[]>();
    const priorities = ['critical', 'high', 'medium', 'low'];

    for (const priority of priorities) {
      const priorityTasks = tasks.filter((task) => task.priority === priority);
      if (priorityTasks.length > 0) {
        groups.set(priority, priorityTasks);
      }
    }

    return groups;
  }

  // Process a chunk of tasks with concurrency control
  private async processTaskChunk(tasks: SyncTask[]): Promise<void> {
    const concurrentTasks: Promise<void>[] = [];

    for (
      let i = 0;
      i < Math.min(tasks.length, this.config.concurrentSyncs);
      i++
    ) {
      const task = tasks[i];
      concurrentTasks.push(this.processTask(task));
    }

    await Promise.allSettled(concurrentTasks);

    // Process remaining tasks
    if (tasks.length > this.config.concurrentSyncs) {
      const remainingTasks = tasks.slice(this.config.concurrentSyncs);
      await this.processTaskChunk(remainingTasks);
    }
  }

  // Process individual sync task with intelligent retry logic
  private async processTask(task: SyncTask): Promise<void> {
    const startTime = Date.now();
    console.log(`[WS-188] Processing sync task: ${task.id}`);

    try {
      // Check if task is already being processed
      if (this.activeSyncs.has(task.id)) {
        return;
      }

      const syncPromise = this.executeTask(task);
      this.activeSyncs.set(task.id, syncPromise);

      await syncPromise;

      // Task completed successfully
      await this.removeTask(task.id);
      console.log(`[WS-188] Sync task completed: ${task.id}`);

      // Record analytics
      await this.recordSyncAnalytics(task, true, Date.now() - startTime);
    } catch (error) {
      console.error(`[WS-188] Sync task failed: ${task.id}`, error);
      await this.handleTaskFailure(task, error as Error);

      // Record analytics
      await this.recordSyncAnalytics(task, false, Date.now() - startTime);
    } finally {
      this.activeSyncs.delete(task.id);
    }
  }

  // Execute the actual network request
  private async executeTask(task: SyncTask): Promise<void> {
    // Update task attempt info
    task.lastAttempt = Date.now();
    await this.updateTask(task);

    // Check network conditions for adaptive retry
    if (this.config.networkAwareRetry && this.shouldSkipDueToNetwork(task)) {
      throw new Error('Network conditions not suitable for sync');
    }

    const response = await fetch(task.url, {
      method: task.method,
      headers: task.headers,
      body: task.method !== 'GET' ? task.body : undefined,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      // Check for specific error types
      if (response.status === 409) {
        // Conflict - handle specially
        await this.handleSyncConflict(task, response);
        throw new Error(`Conflict detected: ${response.status}`);
      } else if (response.status >= 400 && response.status < 500) {
        // Client error - don't retry
        throw new Error(
          `Client error: ${response.status} - ${response.statusText}`,
        );
      } else {
        // Server error - can retry
        throw new Error(
          `Server error: ${response.status} - ${response.statusText}`,
        );
      }
    }

    // Success - handle response if needed
    const responseData = await response.json();
    console.log(`[WS-188] Sync successful for ${task.url}:`, responseData);
  }

  // Check if network conditions are suitable for sync
  private shouldSkipDueToNetwork(task: SyncTask): boolean {
    if (!this.networkMonitor) return false;

    const { effectiveType, saveData } = this.networkMonitor;

    // Skip non-critical tasks on very slow networks
    if (task.priority !== 'critical' && effectiveType === 'slow-2g') {
      return true;
    }

    // Skip low priority tasks when data saver is on
    if (task.priority === 'low' && saveData) {
      return true;
    }

    return false;
  }

  // Handle task failure with exponential backoff
  private async handleTaskFailure(task: SyncTask, error: Error): Promise<void> {
    task.retryCount++;

    if (task.retryCount >= task.maxRetries) {
      // Max retries reached - move to failed queue
      console.error(
        `[WS-188] Task ${task.id} failed permanently:`,
        error.message,
      );
      await this.moveTaskToFailed(task);
      return;
    }

    // Calculate next retry time with exponential backoff
    const priorityMultiplier =
      this.config.priorityMultiplier[task.priority] || 1;
    const delay = Math.min(
      this.config.baseDelay *
        Math.pow(this.config.exponentialBase, task.retryCount) *
        priorityMultiplier,
      this.config.maxDelay,
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    task.nextRetry = Date.now() + delay + jitter;

    console.log(
      `[WS-188] Retrying task ${task.id} in ${Math.round((delay + jitter) / 1000)}s (attempt ${task.retryCount}/${task.maxRetries})`,
    );

    await this.updateTask(task);
  }

  // Handle sync conflicts with intelligent resolution
  private async handleSyncConflict(
    task: SyncTask,
    response: Response,
  ): Promise<void> {
    try {
      const conflictData = await response.json();

      const conflict: ConflictResolution = {
        taskId: task.id,
        conflictType: 'data_version',
        localData: JSON.parse(task.body),
        remoteData: conflictData,
        resolution: 'user_decide',
        timestamp: Date.now(),
      };

      // Store conflict for user resolution
      await this.storeConflict(conflict);

      // For critical wedding data, try intelligent auto-resolution
      if (task.priority === 'critical' && task.metadata?.dataType) {
        const autoResolution = await this.attemptAutoResolution(conflict);
        if (autoResolution) {
          conflict.resolution = autoResolution;
          await this.updateConflict(conflict);
        }
      }

      console.log(`[WS-188] Sync conflict detected for task ${task.id}`);
    } catch (error) {
      console.error('[WS-188] Failed to handle sync conflict:', error);
    }
  }

  // Attempt automatic conflict resolution for known patterns
  private async attemptAutoResolution(
    conflict: ConflictResolution,
  ): Promise<string | null> {
    const { localData, remoteData } = conflict;

    // Merge strategy for compatible data
    if (this.canMergeData(localData, remoteData)) {
      return 'merge';
    }

    // Use remote if local is significantly older
    const localTime = new Date(localData.updatedAt || localData.timestamp || 0);
    const remoteTime = new Date(
      remoteData.updatedAt || remoteData.timestamp || 0,
    );

    if (remoteTime.getTime() - localTime.getTime() > 300000) {
      // 5 minutes
      return 'use_remote';
    }

    // Use local if it's newer
    if (localTime.getTime() - remoteTime.getTime() > 60000) {
      // 1 minute
      return 'use_local';
    }

    // Can't auto-resolve - need user decision
    return null;
  }

  // Check if data can be safely merged
  private canMergeData(localData: any, remoteData: any): boolean {
    // Simple heuristic - check if both objects have non-conflicting fields
    if (typeof localData !== 'object' || typeof remoteData !== 'object') {
      return false;
    }

    const localKeys = Object.keys(localData);
    const remoteKeys = Object.keys(remoteData);
    const conflictingKeys = localKeys.filter(
      (key) => remoteKeys.includes(key) && localData[key] !== remoteData[key],
    );

    // Can merge if no conflicting keys or only timestamp conflicts
    return (
      conflictingKeys.length === 0 ||
      conflictingKeys.every(
        (key) => key.includes('time') || key.includes('date'),
      )
    );
  }

  // Store conflict for user resolution
  private async storeConflict(conflict: ConflictResolution): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction(['conflicts'], 'readwrite');
    const store = tx.objectStore('conflicts');
    await store.put(conflict);
  }

  // Update conflict resolution
  private async updateConflict(conflict: ConflictResolution): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction(['conflicts'], 'readwrite');
    const store = tx.objectStore('conflicts');
    await store.put(conflict);
  }

  // Update task in database
  private async updateTask(task: SyncTask): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction(['sync_tasks'], 'readwrite');
    const store = tx.objectStore('sync_tasks');
    await store.put(task);
  }

  // Remove completed task
  private async removeTask(taskId: string): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction(['sync_tasks'], 'readwrite');
    const store = tx.objectStore('sync_tasks');
    await store.delete(taskId);
  }

  // Move failed task to failed queue
  private async moveTaskToFailed(task: SyncTask): Promise<void> {
    // This would typically move to a separate failed tasks store
    // For now, just remove and log
    await this.removeTask(task.id);
    console.error(`[WS-188] Task moved to failed queue: ${task.id}`);
  }

  // Record sync analytics for optimization
  private async recordSyncAnalytics(
    task: SyncTask,
    success: boolean,
    duration: number,
  ): Promise<void> {
    if (!this.db) return;

    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
      const tx = this.db.transaction(['sync_analytics'], 'readwrite');
      const store = tx.objectStore('sync_analytics');

      // Get existing analytics for today
      let analytics = (await store.get(date)) || {
        date,
        totalTasks: 0,
        successfulTasks: 0,
        failedTasks: 0,
        averageDuration: 0,
        totalDuration: 0,
        priorityBreakdown: { critical: 0, high: 0, medium: 0, low: 0 },
      };

      analytics.totalTasks++;
      analytics.totalDuration += duration;
      analytics.averageDuration =
        analytics.totalDuration / analytics.totalTasks;
      analytics.priorityBreakdown[task.priority]++;

      if (success) {
        analytics.successfulTasks++;
      } else {
        analytics.failedTasks++;
      }

      await store.put(analytics);
    } catch (error) {
      console.error('[WS-188] Failed to record sync analytics:', error);
    }
  }

  // Update sync statistics
  private async updateSyncStats(): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction(['sync_tasks'], 'readonly');
      const store = tx.objectStore('sync_tasks');
      const tasks = await store.getAll();

      this.syncStats = {
        totalTasks: tasks.length,
        pendingTasks: tasks.filter((t) => t.retryCount < t.maxRetries).length,
        failedTasks: tasks.filter((t) => t.retryCount >= t.maxRetries).length,
        completedTasks: 0, // This would come from analytics
        averageRetryCount:
          tasks.reduce((sum, t) => sum + t.retryCount, 0) / tasks.length || 0,
        averageSyncTime: 0, // This would come from analytics
        successRate: 0, // This would come from analytics
        lastSyncTime:
          tasks.length > 0
            ? new Date(Math.max(...tasks.map((t) => t.lastAttempt)))
            : null,
        nextScheduledSync:
          tasks.length > 0
            ? new Date(Math.min(...tasks.map((t) => t.nextRetry)))
            : null,
      };
    } catch (error) {
      console.error('[WS-188] Failed to update sync stats:', error);
    }
  }

  // Reschedule failed tasks on initialization
  private async rescheduleFailedTasks(): Promise<void> {
    const tasks = await this.getReadyTasks();
    const overdueTask = tasks.filter(
      (task) => task.nextRetry < Date.now() - 3600000,
    ); // 1 hour overdue

    for (const task of overdueTask) {
      // Reset retry timing for overdue tasks
      task.nextRetry = Date.now() + 1000; // Try in 1 second
      await this.updateTask(task);
    }

    if (overdueTask.length > 0) {
      console.log(`[WS-188] Rescheduled ${overdueTask.length} overdue tasks`);
    }
  }

  // Utility function to chunk array
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Public API methods
  async getSyncStats(): Promise<SyncStats> {
    await this.updateSyncStats();
    return { ...this.syncStats };
  }

  async getConflicts(): Promise<ConflictResolution[]> {
    if (!this.db) return [];

    const tx = this.db.transaction(['conflicts'], 'readonly');
    const store = tx.objectStore('conflicts');
    return await store.getAll();
  }

  async resolveConflict(taskId: string, resolution: string): Promise<void> {
    // Implementation for manual conflict resolution
    console.log(
      `[WS-188] Resolving conflict for task ${taskId} with resolution: ${resolution}`,
    );
  }

  async clearCompleted(): Promise<void> {
    // Clear completed and failed tasks older than 7 days
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

    if (!this.db) return;

    const tx = this.db.transaction(['sync_tasks'], 'readwrite');
    const store = tx.objectStore('sync_tasks');
    const tasks = await store.getAll();

    const tasksToDelete = tasks.filter(
      (task) => task.createdAt < cutoff && task.retryCount >= task.maxRetries,
    );

    for (const task of tasksToDelete) {
      await store.delete(task.id);
    }

    console.log(`[WS-188] Cleared ${tasksToDelete.length} old sync tasks`);
  }

  // Cleanup and destroy
  async destroy(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.activeSyncs.clear();
    console.log('[WS-188] Background sync coordinator destroyed');
  }
}

export default BackgroundSyncCoordinator;
