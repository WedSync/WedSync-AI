/**
 * WebSocket Progress Service
 * Handles real-time progress updates via WebSocket connections
 */

export interface ProgressUpdate {
  jobId: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
  data?: any;
  timestamp: string;
}

export interface WebSocketConnection {
  id: string;
  userId: string;
  socket: any; // WebSocket instance
  subscribedJobs: Set<string>;
  createdAt: string;
}

export class WebSocketProgressService {
  private connections = new Map<string, WebSocketConnection>();
  private jobSubscriptions = new Map<string, Set<string>>(); // jobId -> connectionIds

  constructor() {
    // Initialize WebSocket server if needed
    this.initializeWebSocketServer();
  }

  private initializeWebSocketServer(): void {
    // TODO: Initialize actual WebSocket server
    // This would typically use ws, socket.io, or similar
    console.log('WebSocket Progress Service initialized');
  }

  addConnection(connectionId: string, userId: string, socket: any): void {
    const connection: WebSocketConnection = {
      id: connectionId,
      userId,
      socket,
      subscribedJobs: new Set(),
      createdAt: new Date().toISOString(),
    };

    this.connections.set(connectionId, connection);
    console.log(
      `WebSocket connection added: ${connectionId} for user ${userId}`,
    );
  }

  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      // Unsubscribe from all jobs
      connection.subscribedJobs.forEach((jobId) => {
        this.unsubscribeFromJob(connectionId, jobId);
      });

      this.connections.delete(connectionId);
      console.log(`WebSocket connection removed: ${connectionId}`);
    }
  }

  subscribeToJob(connectionId: string, jobId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      console.warn(`Connection ${connectionId} not found`);
      return;
    }

    // Add to connection's subscriptions
    connection.subscribedJobs.add(jobId);

    // Add to job's subscribers
    if (!this.jobSubscriptions.has(jobId)) {
      this.jobSubscriptions.set(jobId, new Set());
    }
    this.jobSubscriptions.get(jobId)!.add(connectionId);

    console.log(`Connection ${connectionId} subscribed to job ${jobId}`);
  }

  unsubscribeFromJob(connectionId: string, jobId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.subscribedJobs.delete(jobId);
    }

    const subscribers = this.jobSubscriptions.get(jobId);
    if (subscribers) {
      subscribers.delete(connectionId);
      if (subscribers.size === 0) {
        this.jobSubscriptions.delete(jobId);
      }
    }

    console.log(`Connection ${connectionId} unsubscribed from job ${jobId}`);
  }

  sendProgressUpdate(update: ProgressUpdate): void {
    const subscribers = this.jobSubscriptions.get(update.jobId);
    if (!subscribers || subscribers.size === 0) {
      return; // No subscribers for this job
    }

    const message = JSON.stringify({
      type: 'progress_update',
      data: update,
    });

    subscribers.forEach((connectionId) => {
      const connection = this.connections.get(connectionId);
      if (connection && connection.socket) {
        try {
          // Send message via WebSocket
          if (connection.socket.readyState === 1) {
            // WebSocket.OPEN
            connection.socket.send(message);
          } else {
            // Connection is not open, remove it
            this.removeConnection(connectionId);
          }
        } catch (error) {
          console.error(
            `Failed to send progress update to ${connectionId}:`,
            error,
          );
          this.removeConnection(connectionId);
        }
      }
    });

    console.log(
      `Progress update sent for job ${update.jobId} to ${subscribers.size} subscribers`,
    );
  }

  broadcastToUser(userId: string, message: any): void {
    const userConnections = Array.from(this.connections.values()).filter(
      (conn) => conn.userId === userId,
    );

    const messageStr = JSON.stringify({
      type: 'broadcast',
      data: message,
    });

    userConnections.forEach((connection) => {
      try {
        if (connection.socket.readyState === 1) {
          connection.socket.send(messageStr);
        }
      } catch (error) {
        console.error(`Failed to broadcast to user ${userId}:`, error);
        this.removeConnection(connection.id);
      }
    });

    console.log(
      `Broadcast sent to user ${userId} (${userConnections.length} connections)`,
    );
  }

  getConnectionStats(): {
    totalConnections: number;
    activeJobs: number;
    connectionsPerUser: Record<string, number>;
  } {
    const connectionsPerUser: Record<string, number> = {};

    this.connections.forEach((conn) => {
      connectionsPerUser[conn.userId] =
        (connectionsPerUser[conn.userId] || 0) + 1;
    });

    return {
      totalConnections: this.connections.size,
      activeJobs: this.jobSubscriptions.size,
      connectionsPerUser,
    };
  }

  // Helper method to create progress updates
  createProgressUpdate(
    jobId: string,
    progress: number,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    message?: string,
    data?: any,
  ): ProgressUpdate {
    return {
      jobId,
      progress,
      status,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  // Cleanup method to remove stale connections
  cleanup(): void {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    this.connections.forEach((connection, connectionId) => {
      const connectionAge = now - new Date(connection.createdAt).getTime();

      if (connectionAge > staleThreshold) {
        // Check if connection is still alive
        try {
          if (connection.socket.readyState !== 1) {
            this.removeConnection(connectionId);
          }
        } catch (error) {
          this.removeConnection(connectionId);
        }
      }
    });
  }
}

export const websocketProgressService = new WebSocketProgressService();

// Cleanup stale connections every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      websocketProgressService.cleanup();
    },
    5 * 60 * 1000,
  );
}
