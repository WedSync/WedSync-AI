#!/usr/bin/env node
// WedSync IDE Integration Script
// Provides real-time container status for development environments

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const WebSocket = require('ws');

const execAsync = promisify(exec);

class WedSyncIDEIntegration {
  constructor() {
    this.containerName = 'wedsync-ultra';
    this.statusFile = path.join(process.cwd(), '.wedsync-status.json');
    this.port = 8765;
    this.clients = new Set();
    
    // Initialize WebSocket server for real-time updates
    this.wss = new WebSocket.Server({ port: this.port });
    this.setupWebSocket();
    
    // Start monitoring
    this.startMonitoring();
    
    console.log('🚀 WedSync IDE Integration started');
    console.log(`📡 WebSocket server running on port ${this.port}`);
    console.log(`📄 Status file: ${this.statusFile}`);
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      console.log('🔌 IDE client connected');
      
      // Send current status immediately
      this.sendStatus(ws);
      
      ws.on('close', () => {
        this.clients.delete(ws);
        console.log('🔌 IDE client disconnected');
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }

  async getContainerStatus() {
    try {
      // Check if container exists and is running
      const { stdout: psOutput } = await execAsync(
        `docker ps -a --filter "name=${this.containerName}" --format "{{.Names}}\t{{.Status}}\t{{.Ports}}"`
      );
      
      if (!psOutput.trim()) {
        return {
          status: 'not_found',
          message: 'Container not found',
          health: 'unknown',
          uptime: null,
          ports: [],
          lastUpdated: new Date().toISOString()
        };
      }
      
      const [name, status, ports] = psOutput.trim().split('\t');
      const isRunning = status.includes('Up');
      
      let health = 'unknown';
      let healthMessage = '';
      
      if (isRunning) {
        try {
          const { stdout: healthOutput } = await execAsync(
            `docker inspect --format='{{.State.Health.Status}}' ${this.containerName}`
          );
          health = healthOutput.trim() || 'no-health-check';
        } catch (error) {
          health = 'no-health-check';
        }
        
        // Try to get health message
        if (health === 'unhealthy') {
          try {
            const { stdout: healthDetails } = await execAsync(
              `docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' ${this.containerName}`
            );
            healthMessage = healthDetails.trim();
          } catch (error) {
            healthMessage = 'Health check details unavailable';
          }
        }
      }
      
      // Get resource usage
      let resourceUsage = {};
      if (isRunning) {
        try {
          const { stdout: statsOutput } = await execAsync(
            `docker stats ${this.containerName} --no-stream --format "{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"`
          );
          const [cpu, memory, netIO, blockIO] = statsOutput.trim().split('\t');
          resourceUsage = { cpu, memory, netIO, blockIO };
        } catch (error) {
          resourceUsage = { error: 'Stats unavailable' };
        }
      }
      
      // Parse uptime
      let uptime = null;
      if (isRunning) {
        const uptimeMatch = status.match(/Up (.+?)( \(|$)/);
        if (uptimeMatch) {
          uptime = uptimeMatch[1];
        }
      }
      
      // Parse ports
      const portList = ports ? ports.split(', ').map(p => p.trim()) : [];
      
      return {
        status: isRunning ? 'running' : 'stopped',
        message: status,
        health,
        healthMessage,
        uptime,
        ports: portList,
        resourceUsage,
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        status: 'error',
        message: `Error checking container: ${error.message}`,
        health: 'unknown',
        uptime: null,
        ports: [],
        lastUpdated: new Date().toISOString()
      };
    }
  }

  async getApplicationStatus() {
    try {
      // Check if application is responding
      const response = await fetch('http://localhost:3000/api/health', {
        timeout: 5000
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          status: 'healthy',
          responseTime: Date.now() - startTime,
          data
        };
      } else {
        return {
          status: 'unhealthy',
          statusCode: response.status
        };
      }
    } catch (error) {
      // Try basic HTTP check
      try {
        const response = await fetch('http://localhost:3000', {
          timeout: 3000,
          method: 'HEAD'
        });
        
        return {
          status: response.ok ? 'running' : 'unhealthy',
          statusCode: response.status,
          note: 'Health endpoint unavailable, basic check used'
        };
      } catch (basicError) {
        return {
          status: 'unreachable',
          error: error.message
        };
      }
    }
  }

  async getDevelopmentMetrics() {
    try {
      // Get recent build times from logs
      const { stdout: logsOutput } = await execAsync(
        `docker logs ${this.containerName} --since 10m | grep -E "(compiled|error|warning)" | tail -10`
      );
      
      const recentLogs = logsOutput.split('\n').filter(line => line.trim());
      
      // Count errors and warnings
      const errors = recentLogs.filter(line => line.toLowerCase().includes('error')).length;
      const warnings = recentLogs.filter(line => line.toLowerCase().includes('warning')).length;
      const compilations = recentLogs.filter(line => line.toLowerCase().includes('compiled')).length;
      
      return {
        recentErrors: errors,
        recentWarnings: warnings,
        recentCompilations: compilations,
        lastLogs: recentLogs.slice(-5) // Last 5 log lines
      };
      
    } catch (error) {
      return {
        error: 'Unable to fetch development metrics',
        details: error.message
      };
    }
  }

  async getFullStatus() {
    const [containerStatus, appStatus, devMetrics] = await Promise.all([
      this.getContainerStatus(),
      this.getApplicationStatus(),
      this.getDevelopmentMetrics()
    ]);
    
    // Calculate overall status
    let overallStatus = 'unknown';
    let statusIcon = '❓';
    let statusMessage = 'Status unknown';
    
    if (containerStatus.status === 'running' && containerStatus.health === 'healthy' && appStatus.status === 'healthy') {
      overallStatus = 'healthy';
      statusIcon = '✅';
      statusMessage = 'All systems operational';
    } else if (containerStatus.status === 'running' && appStatus.status === 'running') {
      overallStatus = 'degraded';
      statusIcon = '⚠️';
      statusMessage = 'Running with issues';
    } else if (containerStatus.status === 'stopped') {
      overallStatus = 'stopped';
      statusIcon = '🔴';
      statusMessage = 'Container stopped';
    } else {
      overallStatus = 'error';
      statusIcon = '❌';
      statusMessage = 'System error detected';
    }
    
    // Development productivity score
    let productivityScore = 100;
    if (devMetrics.recentErrors > 0) productivityScore -= devMetrics.recentErrors * 10;
    if (devMetrics.recentWarnings > 0) productivityScore -= devMetrics.recentWarnings * 5;
    if (containerStatus.health === 'unhealthy') productivityScore -= 30;
    if (appStatus.status !== 'healthy') productivityScore -= 20;
    
    productivityScore = Math.max(0, productivityScore);
    
    return {
      overall: {
        status: overallStatus,
        icon: statusIcon,
        message: statusMessage,
        productivityScore
      },
      container: containerStatus,
      application: appStatus,
      development: devMetrics,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  async updateStatus() {
    try {
      const status = await this.getFullStatus();
      
      // Write to status file for IDE extensions
      fs.writeFileSync(this.statusFile, JSON.stringify(status, null, 2));
      
      // Broadcast to connected WebSocket clients
      this.broadcast(status);
      
      // Log status changes
      const prevStatus = this.lastStatus?.overall?.status;
      const currentStatus = status.overall.status;
      
      if (prevStatus !== currentStatus) {
        console.log(`📊 Status changed: ${prevStatus || 'unknown'} → ${currentStatus} ${status.overall.icon}`);
      }
      
      this.lastStatus = status;
      
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  sendStatus(client) {
    if (this.lastStatus && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(this.lastStatus));
    }
  }

  startMonitoring() {
    // Initial status check
    this.updateStatus();
    
    // Update every 10 seconds for responsive IDE integration
    this.intervalId = setInterval(() => {
      this.updateStatus();
    }, 10000);
    
    console.log('📊 Status monitoring started (10s intervals)');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    this.wss.close();
    
    // Clean up status file
    try {
      fs.unlinkSync(this.statusFile);
    } catch (error) {
      // File might not exist, ignore
    }
    
    console.log('🛑 WedSync IDE Integration stopped');
  }

  // CLI commands
  async handleCLICommand(command) {
    switch (command) {
      case 'status':
        const status = await this.getFullStatus();
        console.log('\n📊 WedSync Status:');
        console.log(`   ${status.overall.icon} ${status.overall.message}`);
        console.log(`   🏃 Container: ${status.container.status}`);
        console.log(`   🌐 Application: ${status.application.status}`);
        console.log(`   📈 Productivity: ${status.overall.productivityScore}%`);
        if (status.container.uptime) {
          console.log(`   ⏱️  Uptime: ${status.container.uptime}`);
        }
        if (status.container.ports.length > 0) {
          console.log(`   🔌 Ports: ${status.container.ports.join(', ')}`);
        }
        console.log('');
        break;
        
      case 'monitor':
        console.log('🔍 Starting continuous monitoring (Ctrl+C to stop)...\n');
        // Monitoring is already running
        break;
        
      case 'restart':
        console.log('🔄 Triggering container restart...');
        try {
          await execAsync(`docker restart ${this.containerName}`);
          console.log('✅ Container restart initiated');
        } catch (error) {
          console.error('❌ Restart failed:', error.message);
        }
        break;
        
      default:
        console.log('Usage: node ide-integration.js [status|monitor|restart]');
    }
  }
}

// Handle CLI usage
const command = process.argv[2];

if (command && ['status', 'restart'].includes(command)) {
  // One-time command
  const integration = new WedSyncIDEIntegration();
  integration.handleCLICommand(command).then(() => {
    if (command !== 'monitor') {
      process.exit(0);
    }
  });
} else {
  // Start monitoring service
  const integration = new WedSyncIDEIntegration();
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    integration.stop();
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    integration.stop();
    process.exit(0);
  });
}