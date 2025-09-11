// WS-342: Real-Time Wedding Collaboration - Connection Pool Manager
// Team B Backend Development - Batch 1 Round 1

import { EventEmitter } from 'events';
import WebSocket from 'ws';

interface ConnectionPoolConfig {
  maxConnections: number;
  maxConnectionsPerUser: number;
  maxConnectionsPerWedding: number;
  connectionTimeout: number;
  heartbeatInterval: number;
  loadBalancingStrategy: 'round_robin' | 'least_connections' | 'weighted';
  enableConnectionReuse: boolean;
  enableCompression: boolean;
}

interface PooledConnection {
  id: string;
  socket: WebSocket;
  userId: string;
  weddingId: string;
  createdAt: Date;
  lastActivity: Date;
  messageCount: number;
  isAuthenticated: boolean;
  metadata: {
    userRole: string;
    permissions: any;
    clientInfo: any;
  };
}

interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  connectionsPerWedding: Map<string, number>;
  connectionsPerUser: Map<string, number>;
  avgResponseTime: number;
  messagesThroughput: number;
  errorRate: number;
  lastUpdated: Date;
}

interface LoadBalancerNode {
  id: string;
  url: string;
  weight: number;
  activeConnections: number;
  responseTime: number;
  isHealthy: boolean;
  lastHealthCheck: Date;
}

export class ConnectionPoolManager extends EventEmitter {
  private config: ConnectionPoolConfig;
  private connections: Map<string, PooledConnection> = new Map();
  private weddingConnections: Map<string, Set<string>> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private loadBalancerNodes: Map<string, LoadBalancerNode> = new Map();
  private stats: ConnectionStats;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(config: ConnectionPoolConfig) {
    super();
    this.config = {
      maxConnections: 50000,
      maxConnectionsPerUser: 10,
      maxConnectionsPerWedding: 1000,
      connectionTimeout: 30000,
      heartbeatInterval: 30000,
      loadBalancingStrategy: 'least_connections',
      enableConnectionReuse: true,
      enableCompression: true,
      ...config,
    };

    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      connectionsPerWedding: new Map(),
      connectionsPerUser: new Map(),
      avgResponseTime: 0,
      messagesThroughput: 0,
      errorRate: 0,
      lastUpdated: new Date(),
    };

    this.startHealthChecking();
    this.startMetricsCollection();
  }

  // Add connection to pool
  async addConnection(
    socket: WebSocket,
    userId: string,
    weddingId: string,
    metadata: any,
  ): Promise<{ success: boolean; connectionId?: string; error?: string }> {
    try {
      // Check connection limits
      const limitCheck = this.checkConnectionLimits(userId, weddingId);
      if (!limitCheck.allowed) {
        socket.close(1013, limitCheck.reason);
        return { success: false, error: limitCheck.reason };
      }

      const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const pooledConnection: PooledConnection = {
        id: connectionId,
        socket: socket,
        userId: userId,
        weddingId: weddingId,
        createdAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        isAuthenticated: true,
        metadata: metadata,
      };

      // Configure socket
      this.configureSocket(socket, connectionId);

      // Store connection
      this.connections.set(connectionId, pooledConnection);

      // Update mappings
      this.updateConnectionMappings(connectionId, userId, weddingId, 'add');

      // Update statistics
      this.updateConnectionStats();

      // Emit connection added event
      this.emit('connection_added', {
        connectionId,
        userId,
        weddingId,
        totalConnections: this.connections.size,
      });

      return { success: true, connectionId };
    } catch (error) {
      console.error('Failed to add connection to pool:', error);
      return { success: false, error: 'Failed to add connection' };
    }
  }

  // Remove connection from pool
  async removeConnection(connectionId: string): Promise<{ success: boolean }> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        return { success: false };
      }

      // Update mappings
      this.updateConnectionMappings(
        connectionId,
        connection.userId,
        connection.weddingId,
        'remove',
      );

      // Remove from connections
      this.connections.delete(connectionId);

      // Close socket if still open
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.close();
      }

      // Update statistics
      this.updateConnectionStats();

      // Emit connection removed event
      this.emit('connection_removed', {
        connectionId,
        userId: connection.userId,
        weddingId: connection.weddingId,
        totalConnections: this.connections.size,
        connectionDuration: Date.now() - connection.createdAt.getTime(),
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to remove connection from pool:', error);
      return { success: false };
    }
  }

  // Get optimal connection for load balancing
  getOptimalConnection(weddingId: string): PooledConnection | null {
    const weddingConnectionIds = this.weddingConnections.get(weddingId);
    if (!weddingConnectionIds || weddingConnectionIds.size === 0) {
      return null;
    }

    const connections = Array.from(weddingConnectionIds)
      .map((id) => this.connections.get(id))
      .filter((conn) => conn && conn.socket.readyState === WebSocket.OPEN);

    if (connections.length === 0) {
      return null;
    }

    // Apply load balancing strategy
    switch (this.config.loadBalancingStrategy) {
      case 'round_robin':
        return this.selectRoundRobin(connections);

      case 'least_connections':
        return this.selectLeastConnections(connections);

      case 'weighted':
        return this.selectWeighted(connections);

      default:
        return connections[0];
    }
  }

  // Broadcast message to wedding connections with load balancing
  async broadcastToWedding(
    weddingId: string,
    message: any,
    excludeConnectionId?: string,
  ): Promise<{ success: boolean; sentCount: number; failedCount: number }> {
    const weddingConnectionIds = this.weddingConnections.get(weddingId);
    if (!weddingConnectionIds) {
      return { success: true, sentCount: 0, failedCount: 0 };
    }

    let sentCount = 0;
    let failedCount = 0;
    const messageStr = JSON.stringify(message);

    // Batch send for performance
    const sendPromises = Array.from(weddingConnectionIds)
      .filter((id) => id !== excludeConnectionId)
      .map(async (connectionId) => {
        const connection = this.connections.get(connectionId);
        if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
          failedCount++;
          return;
        }

        try {
          connection.socket.send(messageStr);
          connection.lastActivity = new Date();
          connection.messageCount++;
          sentCount++;
        } catch (error) {
          console.error(
            `Failed to send message to connection ${connectionId}:`,
            error,
          );
          failedCount++;
          // Mark connection for cleanup
          this.scheduleConnectionCleanup(connectionId);
        }
      });

    await Promise.allSettled(sendPromises);

    return { success: true, sentCount, failedCount };
  }

  // Get connection pool statistics
  getConnectionStats(): ConnectionStats {
    return { ...this.stats };
  }

  // Get connection details
  getConnection(connectionId: string): PooledConnection | null {
    return this.connections.get(connectionId) || null;
  }

  // Get all connections for a wedding
  getWeddingConnections(weddingId: string): PooledConnection[] {
    const connectionIds = this.weddingConnections.get(weddingId);
    if (!connectionIds) return [];

    return Array.from(connectionIds)
      .map((id) => this.connections.get(id))
      .filter((conn) => conn !== undefined) as PooledConnection[];
  }

  // Get all connections for a user
  getUserConnections(userId: string): PooledConnection[] {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds) return [];

    return Array.from(connectionIds)
      .map((id) => this.connections.get(id))
      .filter((conn) => conn !== undefined) as PooledConnection[];
  }

  // Cleanup stale connections
  async cleanupStaleConnections(): Promise<{ cleaned: number }> {
    const now = new Date();
    const staleThreshold = new Date(
      now.getTime() - this.config.connectionTimeout,
    );
    let cleanedCount = 0;

    for (const [connectionId, connection] of this.connections.entries()) {
      // Check if connection is stale
      if (
        connection.lastActivity < staleThreshold ||
        connection.socket.readyState !== WebSocket.OPEN
      ) {
        await this.removeConnection(connectionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.emit('connections_cleaned', { count: cleanedCount });
    }

    return { cleaned: cleanedCount };
  }

  // Handle connection scaling
  async scaleConnections(
    targetCapacity: number,
  ): Promise<{ success: boolean; currentCapacity: number }> {
    const currentCapacity = this.connections.size;

    if (targetCapacity > this.config.maxConnections) {
      console.warn(
        `Target capacity ${targetCapacity} exceeds max connections ${this.config.maxConnections}`,
      );
      return { success: false, currentCapacity };
    }

    // Emit scaling event for external systems to handle
    this.emit('scaling_requested', {
      currentCapacity,
      targetCapacity,
      scaleDirection: targetCapacity > currentCapacity ? 'up' : 'down',
    });

    return { success: true, currentCapacity };
  }

  // Shutdown connection pool gracefully
  async shutdown(): Promise<void> {
    console.log('Shutting down connection pool...');

    // Stop intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Close all connections gracefully
    const closePromises = Array.from(this.connections.values()).map(
      (connection) => {
        return new Promise<void>((resolve) => {
          if (connection.socket.readyState === WebSocket.OPEN) {
            connection.socket.close(1001, 'Server shutting down');
            connection.socket.once('close', () => resolve());
            // Force close after timeout
            setTimeout(() => resolve(), 5000);
          } else {
            resolve();
          }
        });
      },
    );

    await Promise.allSettled(closePromises);

    // Clear all maps
    this.connections.clear();
    this.weddingConnections.clear();
    this.userConnections.clear();

    console.log('Connection pool shutdown complete');
  }

  // Private helper methods
  private checkConnectionLimits(
    userId: string,
    weddingId: string,
  ): { allowed: boolean; reason?: string } {
    // Check total connections limit
    if (this.connections.size >= this.config.maxConnections) {
      return { allowed: false, reason: 'Maximum connections reached' };
    }

    // Check per-user limit
    const userConnections = this.userConnections.get(userId);
    if (
      userConnections &&
      userConnections.size >= this.config.maxConnectionsPerUser
    ) {
      return { allowed: false, reason: 'Maximum connections per user reached' };
    }

    // Check per-wedding limit
    const weddingConnections = this.weddingConnections.get(weddingId);
    if (
      weddingConnections &&
      weddingConnections.size >= this.config.maxConnectionsPerWedding
    ) {
      return {
        allowed: false,
        reason: 'Maximum connections per wedding reached',
      };
    }

    return { allowed: true };
  }

  private configureSocket(socket: WebSocket, connectionId: string): void {
    // Enable compression if configured
    if (this.config.enableCompression) {
      // WebSocket compression is handled at server level
    }

    // Set up heartbeat
    const heartbeatInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.ping();
      } else {
        clearInterval(heartbeatInterval);
      }
    }, this.config.heartbeatInterval);

    // Handle pong responses
    socket.on('pong', () => {
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.lastActivity = new Date();
      }
    });

    // Handle socket close
    socket.on('close', () => {
      clearInterval(heartbeatInterval);
      this.removeConnection(connectionId);
    });

    // Handle socket error
    socket.on('error', (error) => {
      console.error(`Socket error for connection ${connectionId}:`, error);
      this.removeConnection(connectionId);
    });
  }

  private updateConnectionMappings(
    connectionId: string,
    userId: string,
    weddingId: string,
    action: 'add' | 'remove',
  ): void {
    if (action === 'add') {
      // Add to wedding connections
      if (!this.weddingConnections.has(weddingId)) {
        this.weddingConnections.set(weddingId, new Set());
      }
      this.weddingConnections.get(weddingId)!.add(connectionId);

      // Add to user connections
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(connectionId);
    } else {
      // Remove from wedding connections
      const weddingConns = this.weddingConnections.get(weddingId);
      if (weddingConns) {
        weddingConns.delete(connectionId);
        if (weddingConns.size === 0) {
          this.weddingConnections.delete(weddingId);
        }
      }

      // Remove from user connections
      const userConns = this.userConnections.get(userId);
      if (userConns) {
        userConns.delete(connectionId);
        if (userConns.size === 0) {
          this.userConnections.delete(userId);
        }
      }
    }
  }

  private updateConnectionStats(): void {
    const now = new Date();
    const activeConnections = Array.from(this.connections.values()).filter(
      (conn) => conn.socket.readyState === WebSocket.OPEN,
    ).length;

    // Update statistics
    this.stats.totalConnections = this.connections.size;
    this.stats.activeConnections = activeConnections;
    this.stats.connectionsPerWedding = new Map(
      Array.from(this.weddingConnections.entries()).map(
        ([weddingId, connections]) => [weddingId, connections.size],
      ),
    );
    this.stats.connectionsPerUser = new Map(
      Array.from(this.userConnections.entries()).map(
        ([userId, connections]) => [userId, connections.size],
      ),
    );
    this.stats.lastUpdated = now;
  }

  private selectRoundRobin(connections: PooledConnection[]): PooledConnection {
    // Simple round-robin selection
    const timestamp = Date.now();
    const index = timestamp % connections.length;
    return connections[index];
  }

  private selectLeastConnections(
    connections: PooledConnection[],
  ): PooledConnection {
    // Select connection with least message count
    return connections.reduce((prev, current) =>
      current.messageCount < prev.messageCount ? current : prev,
    );
  }

  private selectWeighted(connections: PooledConnection[]): PooledConnection {
    // Weight by last activity (more recent = higher weight)
    const now = Date.now();
    const weighted = connections.map((conn) => ({
      connection: conn,
      weight: 1 / (now - conn.lastActivity.getTime() + 1),
    }));

    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of weighted) {
      random -= item.weight;
      if (random <= 0) {
        return item.connection;
      }
    }

    return connections[0]; // Fallback
  }

  private scheduleConnectionCleanup(connectionId: string): void {
    // Schedule cleanup in next tick to avoid blocking
    setImmediate(() => {
      this.removeConnection(connectionId);
    });
  }

  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(() => {
      this.cleanupStaleConnections();
      this.checkLoadBalancerHealth();
    }, this.config.heartbeatInterval);
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.collectPerformanceMetrics();
      this.updateConnectionStats();
    }, 10000); // Collect metrics every 10 seconds
  }

  private checkLoadBalancerHealth(): void {
    // Check health of load balancer nodes
    for (const [nodeId, node] of this.loadBalancerNodes.entries()) {
      const timeSinceLastCheck = Date.now() - node.lastHealthCheck.getTime();
      if (timeSinceLastCheck > 60000) {
        // 1 minute
        // Mark as unhealthy if no recent health check
        node.isHealthy = false;
      }
    }
  }

  private collectPerformanceMetrics(): void {
    // Calculate performance metrics
    const connections = Array.from(this.connections.values());
    const activeConnections = connections.filter(
      (c) => c.socket.readyState === WebSocket.OPEN,
    );

    // Calculate average response time (simplified)
    this.stats.avgResponseTime =
      activeConnections.length > 0
        ? activeConnections.reduce(
            (sum, conn) => sum + (Date.now() - conn.lastActivity.getTime()),
            0,
          ) / activeConnections.length
        : 0;

    // Calculate message throughput
    const totalMessages = connections.reduce(
      (sum, conn) => sum + conn.messageCount,
      0,
    );
    const timespan =
      Date.now() - (this.stats.lastUpdated?.getTime() || Date.now());
    this.stats.messagesThroughput = totalMessages / (timespan / 1000); // messages per second

    // Emit metrics
    this.emit('metrics_updated', this.stats);
  }
}
