// WS-157 Offline Helper Assignment Service
// Handles offline data storage, sync, and conflict resolution

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export interface HelperTask {
  id: string;
  title: string;
  description: string;
  deadline: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  category: string;
  estimatedDuration: number;
  assignedBy: {
    name: string;
    email: string;
  };
  wedding: {
    id: string;
    coupleName: string;
    date: Date;
  };
  budgetImpact?: number;
  vendorInfo?: {
    name: string;
    type: string;
    contact: string;
  };
  offline?: boolean;
  lastSynced?: Date;
  localVersion?: number;
}

export interface PendingChange {
  id: string;
  taskId: string;
  action: 'create' | 'update' | 'delete';
  data: Partial<HelperTask>;
  timestamp: Date;
  attempts: number;
  maxAttempts: number;
}

export interface SyncConflict {
  taskId: string;
  localVersion: HelperTask;
  serverVersion: HelperTask;
  conflictType: 'status' | 'data' | 'deleted';
}

export class OfflineHelperService {
  private db: IDBDatabase | null = null;
  private supabase = createClientComponentClient();
  private syncInProgress = false;
  private syncCallbacks: (() => void)[] = [];

  constructor() {
    this.initializeDB();
    this.setupNetworkListeners();
  }

  // Database initialization
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('HelperTasksDB', 2);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Tasks store
        if (!db.objectStoreNames.contains('tasks')) {
          const tasksStore = db.createObjectStore('tasks', { keyPath: 'id' });
          tasksStore.createIndex('status', 'status');
          tasksStore.createIndex('priority', 'priority');
          tasksStore.createIndex('deadline', 'deadline');
          tasksStore.createIndex('lastSynced', 'lastSynced');
        }

        // Pending changes store
        if (!db.objectStoreNames.contains('pending_changes')) {
          const changesStore = db.createObjectStore('pending_changes', {
            keyPath: 'id',
          });
          changesStore.createIndex('taskId', 'taskId');
          changesStore.createIndex('timestamp', 'timestamp');
          changesStore.createIndex('action', 'action');
        }

        // Sync metadata store
        if (!db.objectStoreNames.contains('sync_metadata')) {
          const metadataStore = db.createObjectStore('sync_metadata', {
            keyPath: 'key',
          });
        }
      };
    });
  }

  // Network status management
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.handleOnlineStatus(true);
    });

    window.addEventListener('offline', () => {
      this.handleOnlineStatus(false);
    });
  }

  private async handleOnlineStatus(isOnline: boolean): Promise<void> {
    if (isOnline && !this.syncInProgress) {
      await this.syncPendingChanges();
    }
  }

  // Task management
  async saveTasks(tasks: HelperTask[]): Promise<void> {
    if (!this.db) await this.initializeDB();

    const transaction = this.db!.transaction(['tasks'], 'readwrite');
    const store = transaction.objectStore('tasks');

    for (const task of tasks) {
      const taskWithMeta = {
        ...task,
        lastSynced: new Date(),
        localVersion: 1,
        offline: false,
      };
      await store.put(taskWithMeta);
    }

    await this.updateSyncMetadata('lastFullSync', new Date());
  }

  async getTasks(filter?: {
    status?: string;
    priority?: string;
    offline?: boolean;
  }): Promise<HelperTask[]> {
    if (!this.db) await this.initializeDB();

    const transaction = this.db!.transaction(['tasks'], 'readonly');
    const store = transaction.objectStore('tasks');

    let tasks: HelperTask[] = await store.getAll();

    // Apply filters
    if (filter) {
      tasks = tasks.filter((task) => {
        if (filter.status && task.status !== filter.status) return false;
        if (filter.priority && task.priority !== filter.priority) return false;
        if (
          filter.offline !== undefined &&
          Boolean(task.offline) !== filter.offline
        )
          return false;
        return true;
      });
    }

    // Sort by deadline
    tasks.sort(
      (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
    );

    return tasks;
  }

  async updateTaskStatus(taskId: string, status: string): Promise<void> {
    if (!this.db) await this.initializeDB();

    // Update local task
    const transaction = this.db!.transaction(['tasks'], 'readwrite');
    const store = transaction.objectStore('tasks');

    const task = await store.get(taskId);
    if (task) {
      task.status = status;
      task.localVersion = (task.localVersion || 1) + 1;
      task.offline = true;
      await store.put(task);
    }

    // Queue change for sync
    await this.queuePendingChange({
      id: `${taskId}_${Date.now()}`,
      taskId,
      action: 'update',
      data: { status },
      timestamp: new Date(),
      attempts: 0,
      maxAttempts: 3,
    });

    // Try immediate sync if online
    if (navigator.onLine) {
      this.syncPendingChanges();
    }
  }

  async createTask(task: Omit<HelperTask, 'id'>): Promise<string> {
    if (!this.db) await this.initializeDB();

    const taskId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTask: HelperTask = {
      ...task,
      id: taskId,
      offline: true,
      localVersion: 1,
      lastSynced: undefined,
    };

    // Save to local storage
    const transaction = this.db!.transaction(['tasks'], 'readwrite');
    const store = transaction.objectStore('tasks');
    await store.put(newTask);

    // Queue for sync
    await this.queuePendingChange({
      id: `${taskId}_create_${Date.now()}`,
      taskId,
      action: 'create',
      data: newTask,
      timestamp: new Date(),
      attempts: 0,
      maxAttempts: 3,
    });

    return taskId;
  }

  // Sync management
  private async queuePendingChange(change: PendingChange): Promise<void> {
    if (!this.db) await this.initializeDB();

    const transaction = this.db!.transaction(['pending_changes'], 'readwrite');
    const store = transaction.objectStore('pending_changes');
    await store.put(change);
  }

  async getPendingChanges(): Promise<PendingChange[]> {
    if (!this.db) await this.initializeDB();

    const transaction = this.db!.transaction(['pending_changes'], 'readonly');
    const store = transaction.objectStore('pending_changes');
    return await store.getAll();
  }

  async syncPendingChanges(): Promise<{
    success: boolean;
    conflicts: SyncConflict[];
    errors: string[];
  }> {
    if (this.syncInProgress || !navigator.onLine) {
      return {
        success: false,
        conflicts: [],
        errors: ['Sync already in progress or offline'],
      };
    }

    this.syncInProgress = true;
    const conflicts: SyncConflict[] = [];
    const errors: string[] = [];
    let success = true;

    try {
      const pendingChanges = await this.getPendingChanges();

      for (const change of pendingChanges) {
        try {
          const result = await this.processPendingChange(change);

          if (result.conflict) {
            conflicts.push(result.conflict);
          } else if (result.success) {
            await this.removePendingChange(change.id);
            await this.markTaskSynced(change.taskId);
          } else {
            // Increment attempt count
            change.attempts++;
            if (change.attempts >= change.maxAttempts) {
              errors.push(
                `Failed to sync task ${change.taskId} after ${change.maxAttempts} attempts`,
              );
              await this.removePendingChange(change.id);
            } else {
              await this.queuePendingChange(change);
            }
          }
        } catch (error) {
          errors.push(`Error syncing change ${change.id}: ${error}`);
          success = false;
        }
      }

      // Trigger callbacks
      this.syncCallbacks.forEach((callback) => callback());
    } catch (error) {
      errors.push(`Sync error: ${error}`);
      success = false;
    } finally {
      this.syncInProgress = false;
    }

    return { success, conflicts, errors };
  }

  private async processPendingChange(change: PendingChange): Promise<{
    success: boolean;
    conflict?: SyncConflict;
  }> {
    try {
      switch (change.action) {
        case 'create':
          return await this.syncCreateTask(change);
        case 'update':
          return await this.syncUpdateTask(change);
        case 'delete':
          return await this.syncDeleteTask(change);
        default:
          return { success: false };
      }
    } catch (error) {
      console.error('Error processing pending change:', error);
      return { success: false };
    }
  }

  private async syncCreateTask(change: PendingChange): Promise<{
    success: boolean;
    conflict?: SyncConflict;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('workflow_tasks')
        .insert({
          title: change.data.title,
          description: change.data.description,
          deadline: change.data.deadline?.toISOString(),
          priority: change.data.priority,
          status: change.data.status,
          category: change.data.category,
          estimated_duration: change.data.estimatedDuration,
          budget_impact: change.data.budgetImpact,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local task with server ID
      if (data) {
        await this.updateLocalTaskId(change.taskId, data.id);
      }

      return { success: true };
    } catch (error) {
      console.error('Error syncing create task:', error);
      return { success: false };
    }
  }

  private async syncUpdateTask(change: PendingChange): Promise<{
    success: boolean;
    conflict?: SyncConflict;
  }> {
    try {
      // Check for conflicts by fetching current server version
      const { data: serverTask, error: fetchError } = await this.supabase
        .from('workflow_tasks')
        .select('*')
        .eq('id', change.taskId)
        .single();

      if (fetchError) throw fetchError;

      const localTask = await this.getLocalTask(change.taskId);

      if (!localTask || !serverTask) {
        return { success: false };
      }

      // Simple conflict detection based on updated_at
      const serverUpdatedAt = new Date(serverTask.updated_at);
      const localUpdatedAt = localTask.lastSynced || new Date(0);

      if (serverUpdatedAt > localUpdatedAt) {
        // Conflict detected
        const conflict: SyncConflict = {
          taskId: change.taskId,
          localVersion: localTask,
          serverVersion: this.transformServerTask(serverTask),
          conflictType: 'status',
        };

        return { success: false, conflict };
      }

      // No conflict, proceed with update
      const { error } = await this.supabase
        .from('workflow_tasks')
        .update({
          status: change.data.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', change.taskId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error syncing update task:', error);
      return { success: false };
    }
  }

  private async syncDeleteTask(change: PendingChange): Promise<{
    success: boolean;
    conflict?: SyncConflict;
  }> {
    try {
      const { error } = await this.supabase
        .from('workflow_tasks')
        .delete()
        .eq('id', change.taskId);

      if (error) throw error;

      // Remove from local storage
      await this.removeLocalTask(change.taskId);

      return { success: true };
    } catch (error) {
      console.error('Error syncing delete task:', error);
      return { success: false };
    }
  }

  // Helper methods
  private async getLocalTask(taskId: string): Promise<HelperTask | null> {
    if (!this.db) await this.initializeDB();

    const transaction = this.db!.transaction(['tasks'], 'readonly');
    const store = transaction.objectStore('tasks');
    return (await store.get(taskId)) || null;
  }

  private async updateLocalTaskId(oldId: string, newId: string): Promise<void> {
    if (!this.db) await this.initializeDB();

    const transaction = this.db!.transaction(['tasks'], 'readwrite');
    const store = transaction.objectStore('tasks');

    const task = await store.get(oldId);
    if (task) {
      await store.delete(oldId);
      task.id = newId;
      task.offline = false;
      await store.put(task);
    }
  }

  private async markTaskSynced(taskId: string): Promise<void> {
    if (!this.db) await this.initializeDB();

    const transaction = this.db!.transaction(['tasks'], 'readwrite');
    const store = transaction.objectStore('tasks');

    const task = await store.get(taskId);
    if (task) {
      task.offline = false;
      task.lastSynced = new Date();
      await store.put(task);
    }
  }

  private async removePendingChange(changeId: string): Promise<void> {
    if (!this.db) await this.initializeDB();

    const transaction = this.db!.transaction(['pending_changes'], 'readwrite');
    const store = transaction.objectStore('pending_changes');
    await store.delete(changeId);
  }

  private async removeLocalTask(taskId: string): Promise<void> {
    if (!this.db) await this.initializeDB();

    const transaction = this.db!.transaction(['tasks'], 'readwrite');
    const store = transaction.objectStore('tasks');
    await store.delete(taskId);
  }

  private transformServerTask(serverTask: any): HelperTask {
    return {
      id: serverTask.id,
      title: serverTask.title,
      description: serverTask.description || '',
      deadline: new Date(serverTask.deadline),
      priority: serverTask.priority,
      status: serverTask.status,
      category: serverTask.category,
      estimatedDuration: serverTask.estimated_duration,
      assignedBy: {
        name: 'Unknown', // Would need to join with team_members
        email: '',
      },
      wedding: {
        id: 'unknown',
        coupleName: 'Unknown',
        date: new Date(),
      },
      budgetImpact: serverTask.budget_impact,
      offline: false,
      lastSynced: new Date(),
    };
  }

  private async updateSyncMetadata(key: string, value: any): Promise<void> {
    if (!this.db) await this.initializeDB();

    const transaction = this.db!.transaction(['sync_metadata'], 'readwrite');
    const store = transaction.objectStore('sync_metadata');
    await store.put({ key, value, timestamp: new Date() });
  }

  // Public utility methods
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    pendingChanges: number;
    lastSync: Date | null;
    conflicts: number;
  }> {
    const pendingChanges = await this.getPendingChanges();

    // Get last sync from metadata
    let lastSync: Date | null = null;
    if (this.db) {
      const transaction = this.db.transaction(['sync_metadata'], 'readonly');
      const store = transaction.objectStore('sync_metadata');
      const metadata = await store.get('lastFullSync');
      if (metadata) {
        lastSync = new Date(metadata.value);
      }
    }

    return {
      isOnline: navigator.onLine,
      pendingChanges: pendingChanges.length,
      lastSync,
      conflicts: 0, // Would need to track conflicts in metadata
    };
  }

  onSyncComplete(callback: () => void): void {
    this.syncCallbacks.push(callback);
  }

  offSyncComplete(callback: () => void): void {
    const index = this.syncCallbacks.indexOf(callback);
    if (index > -1) {
      this.syncCallbacks.splice(index, 1);
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.db) await this.initializeDB();

    const transaction = this.db!.transaction(
      ['tasks', 'pending_changes', 'sync_metadata'],
      'readwrite',
    );

    const tasksStore = transaction.objectStore('tasks');
    const changesStore = transaction.objectStore('pending_changes');
    const metadataStore = transaction.objectStore('sync_metadata');

    await tasksStore.clear();
    await changesStore.clear();
    await metadataStore.clear();
  }
}

// Singleton instance
export const offlineHelperService = new OfflineHelperService();
