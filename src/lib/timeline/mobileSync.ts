import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface TimelineNode {
  id: string;
  title: string;
  description: string;
  scheduledDate: Date;
  actualDate?: Date;
  status: 'pending' | 'active' | 'completed' | 'delayed';
  type: 'email' | 'form' | 'reminder' | 'meeting' | 'payment';
  clientId: string;
  clientName: string;
  weddingDate: Date;
  isAutomated: boolean;
  triggerCondition?: string;
  daysBeforeWedding?: number;
  content?: string;
  lastModified: Date;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

interface SyncAction {
  id: string;
  nodeId: string;
  action: 'create' | 'update' | 'delete';
  data: Partial<TimelineNode>;
  timestamp: Date;
  retry_count: number;
}

interface TimelineDB extends DBSchema {
  nodes: {
    key: string;
    value: TimelineNode;
    indexes: {
      'by-client': string;
      'by-status': string;
      'by-sync-status': string;
    };
  };
  sync_queue: {
    key: string;
    value: SyncAction;
  };
  sync_meta: {
    key: string;
    value: {
      last_sync: Date;
      server_version: number;
      offline_changes: number;
    };
  };
}

class TimelineMobileSync {
  private db: IDBPDatabase<TimelineDB> | null = null;
  private isOnline = navigator.onLine;
  private syncInProgress = false;

  async init() {
    this.db = await openDB<TimelineDB>('timeline-sync-db', 1, {
      upgrade(db) {
        // Timeline nodes store
        const nodesStore = db.createObjectStore('nodes', { keyPath: 'id' });
        nodesStore.createIndex('by-client', 'clientId');
        nodesStore.createIndex('by-status', 'status');
        nodesStore.createIndex('by-sync-status', 'syncStatus');

        // Sync queue for offline actions
        db.createObjectStore('sync_queue', { keyPath: 'id' });

        // Sync metadata
        db.createObjectStore('sync_meta', { keyPath: 'key' });
      },
    });

    // Set up network listeners
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Initial sync if online
    if (this.isOnline) {
      this.syncWithServer();
    }
  }

  private handleOnline() {
    this.isOnline = true;
    console.log('📶 Back online - starting sync');
    this.syncWithServer();
  }

  private handleOffline() {
    this.isOnline = false;
    console.log('📱 Offline mode activated');
  }

  // Save node (works offline and online)
  async saveNode(node: TimelineNode): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Mark as pending sync if offline
    const nodeToSave = {
      ...node,
      lastModified: new Date(),
      syncStatus: this.isOnline ? 'synced' : ('pending' as const),
    };

    await this.db.put('nodes', nodeToSave);

    // Queue sync action if offline
    if (!this.isOnline) {
      await this.queueSyncAction({
        id: `sync_${Date.now()}_${Math.random()}`,
        nodeId: node.id,
        action: 'update',
        data: node,
        timestamp: new Date(),
        retry_count: 0,
      });
    } else {
      // Try immediate sync
      this.syncNodeToServer(node);
    }
  }

  // Get nodes (always from local cache)
  async getNodes(clientId?: string): Promise<TimelineNode[]> {
    if (!this.db) throw new Error('Database not initialized');

    if (clientId) {
      return await this.db.getAllFromIndex('nodes', 'by-client', clientId);
    }
    return await this.db.getAll('nodes');
  }

  // Get single node
  async getNode(nodeId: string): Promise<TimelineNode | undefined> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.get('nodes', nodeId);
  }

  // Delete node
  async deleteNode(nodeId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.delete('nodes', nodeId);

    // Queue sync action
    if (!this.isOnline) {
      await this.queueSyncAction({
        id: `sync_${Date.now()}_${Math.random()}`,
        nodeId,
        action: 'delete',
        data: {},
        timestamp: new Date(),
        retry_count: 0,
      });
    } else {
      this.deleteNodeFromServer(nodeId);
    }
  }

  // Queue offline action
  private async queueSyncAction(action: SyncAction): Promise<void> {
    if (!this.db) return;
    await this.db.put('sync_queue', action);

    // Update offline changes counter
    const meta = (await this.db.get('sync_meta', 'main')) || {
      last_sync: new Date(),
      server_version: 0,
      offline_changes: 0,
    };

    await this.db.put('sync_meta', {
      ...meta,
      key: 'main',
      offline_changes: meta.offline_changes + 1,
    });
  }

  // Sync with server
  async syncWithServer(): Promise<void> {
    if (!this.db || this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    console.log('🔄 Starting timeline sync...');

    try {
      // Get all pending sync actions
      const pendingActions = await this.db.getAll('sync_queue');

      for (const action of pendingActions) {
        try {
          await this.processSyncAction(action);
          await this.db.delete('sync_queue', action.id);
        } catch (error) {
          console.error('Sync action failed:', action, error);

          // Increment retry count
          action.retry_count++;
          if (action.retry_count < 3) {
            await this.db.put('sync_queue', action);
          } else {
            // Mark as failed, keep in queue for manual review
            console.error('Sync action failed permanently:', action);
          }
        }
      }

      // Fetch latest from server
      await this.fetchLatestFromServer();

      // Update sync metadata
      await this.db.put('sync_meta', {
        key: 'main',
        last_sync: new Date(),
        server_version: Date.now(),
        offline_changes: 0,
      });

      console.log('✅ Timeline sync completed');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Process individual sync action
  private async processSyncAction(action: SyncAction): Promise<void> {
    switch (action.action) {
      case 'create':
      case 'update':
        await this.syncNodeToServer(action.data as TimelineNode);
        break;
      case 'delete':
        await this.deleteNodeFromServer(action.nodeId);
        break;
    }
  }

  // Sync node to server
  private async syncNodeToServer(node: Partial<TimelineNode>): Promise<void> {
    const response = await fetch('/api/timeline/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(node),
    });

    if (!response.ok) {
      throw new Error(`Server sync failed: ${response.statusText}`);
    }

    // Mark as synced in local DB
    if (this.db && node.id) {
      const existingNode = await this.db.get('nodes', node.id);
      if (existingNode) {
        await this.db.put('nodes', {
          ...existingNode,
          syncStatus: 'synced',
        });
      }
    }
  }

  // Delete node from server
  private async deleteNodeFromServer(nodeId: string): Promise<void> {
    const response = await fetch(`/api/timeline/nodes/${nodeId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Server delete failed: ${response.statusText}`);
    }
  }

  // Fetch latest from server
  private async fetchLatestFromServer(): Promise<void> {
    const response = await fetch('/api/timeline/nodes');
    if (!response.ok) return;

    const serverNodes: TimelineNode[] = await response.json();

    for (const serverNode of serverNodes) {
      const localNode = await this.db!.get('nodes', serverNode.id);

      // Simple conflict resolution: server wins for now
      // TODO: Implement more sophisticated conflict resolution
      if (!localNode || localNode.syncStatus === 'synced') {
        await this.db!.put('nodes', {
          ...serverNode,
          syncStatus: 'synced',
        });
      }
    }
  }

  // Get sync status
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    lastSync: Date | null;
    pendingChanges: number;
    hasConflicts: boolean;
  }> {
    if (!this.db) {
      return {
        isOnline: this.isOnline,
        lastSync: null,
        pendingChanges: 0,
        hasConflicts: false,
      };
    }

    const meta = await this.db.get('sync_meta', 'main');
    const pendingActions = await this.db.getAll('sync_queue');
    const conflictNodes = await this.db.getAllFromIndex(
      'nodes',
      'by-sync-status',
      'conflict',
    );

    return {
      isOnline: this.isOnline,
      lastSync: meta?.last_sync || null,
      pendingChanges: pendingActions.length,
      hasConflicts: conflictNodes.length > 0,
    };
  }

  // Force sync
  async forcSync(): Promise<void> {
    if (this.isOnline) {
      await this.syncWithServer();
    }
  }

  // Clear all local data (for debugging)
  async clearAllData(): Promise<void> {
    if (!this.db) return;

    await this.db.clear('nodes');
    await this.db.clear('sync_queue');
    await this.db.clear('sync_meta');
  }
}

// Singleton instance
export const timelineSync = new TimelineMobileSync();

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  timelineSync.init().catch(console.error);
}

export type { TimelineNode, SyncAction };
export default timelineSync;
