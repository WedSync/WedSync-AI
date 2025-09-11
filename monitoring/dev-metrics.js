// WedSync Development Metrics Collector
// Tracks development-specific performance metrics

const express = require('express');
const client = require('prom-client');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 9091;

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({
  app: 'wedsync-dev-metrics',
  prefix: 'wedsync_dev_',
  timeout: 10000,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  register
});

// Custom development metrics
const buildDuration = new client.Histogram({
  name: 'wedsync_build_duration_seconds',
  help: 'Time taken for Next.js builds',
  buckets: [1, 5, 10, 30, 60, 120, 300]
});

const hotReloadDuration = new client.Histogram({
  name: 'wedsync_hot_reload_duration_seconds',
  help: 'Time taken for hot reload to complete',
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const typescriptErrors = new client.Gauge({
  name: 'wedsync_typescript_errors',
  help: 'Number of TypeScript compilation errors'
});

const eslintViolations = new client.Counter({
  name: 'wedsync_eslint_violations_total',
  help: 'Total ESLint violations detected'
});

const npmVulnerabilities = new client.Gauge({
  name: 'wedsync_npm_vulnerabilities',
  help: 'Number of npm security vulnerabilities'
});

const developmentProductivity = new client.Gauge({
  name: 'wedsync_development_productivity_score',
  help: 'Development productivity score (0-100)',
  labelNames: ['metric_type']
});

const containerRestarts = new client.Counter({
  name: 'wedsync_container_restarts_total',
  help: 'Total number of container restarts',
  labelNames: ['reason']
});

const fileWatcherEvents = new client.Counter({
  name: 'wedsync_file_watcher_events_total',
  help: 'Total file watcher events',
  labelNames: ['event_type']
});

const databaseConnections = new client.Gauge({
  name: 'wedsync_database_connections_active',
  help: 'Number of active database connections'
});

const databaseConnectionsFailed = new client.Counter({
  name: 'wedsync_database_connections_failed_total',
  help: 'Total failed database connections'
});

const externalServiceStatus = new client.Gauge({
  name: 'wedsync_external_service_up',
  help: 'External service availability (1=up, 0=down)',
  labelNames: ['service']
});

// Register all metrics
register.registerMetric(buildDuration);
register.registerMetric(hotReloadDuration);
register.registerMetric(typescriptErrors);
register.registerMetric(eslintViolations);
register.registerMetric(npmVulnerabilities);
register.registerMetric(developmentProductivity);
register.registerMetric(containerRestarts);
register.registerMetric(fileWatcherEvents);
register.registerMetric(databaseConnections);
register.registerMetric(databaseConnectionsFailed);
register.registerMetric(externalServiceStatus);

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (ex) {
    res.status(500).end(ex);
  }
});

// Development metrics collection functions
class DevMetricsCollector {
  constructor() {
    this.startTime = Date.now();
    this.lastBuildTime = 0;
    this.hotReloadStartTime = 0;
    
    this.startPeriodicCollection();
  }

  // Start periodic metric collection
  startPeriodicCollection() {
    // Collect TypeScript errors every 30 seconds
    setInterval(() => {
      this.collectTypescriptErrors();
    }, 30000);

    // Collect npm vulnerabilities every 5 minutes
    setInterval(() => {
      this.collectNpmVulnerabilities();
    }, 300000);

    // Calculate productivity score every minute
    setInterval(() => {
      this.calculateProductivityScore();
    }, 60000);

    // Monitor external services every 30 seconds
    setInterval(() => {
      this.monitorExternalServices();
    }, 30000);

    console.log('Periodic metric collection started');
  }

  // Collect TypeScript compilation errors
  async collectTypescriptErrors() {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const { stdout, stderr } = await execAsync('cd /app && npx tsc --noEmit --skipLibCheck', {
        timeout: 30000
      });
      
      // Count errors in TypeScript output
      const errorCount = (stderr.match(/error TS\d+:/g) || []).length;
      typescriptErrors.set(errorCount);
      
      console.log(`TypeScript errors: ${errorCount}`);
    } catch (error) {
      // TypeScript compilation failed, count as errors
      const errorOutput = error.stdout || error.stderr || '';
      const errorCount = (errorOutput.match(/error TS\d+:/g) || []).length;
      typescriptErrors.set(errorCount > 0 ? errorCount : 1); // At least 1 if compilation failed
      
      console.log(`TypeScript compilation failed with ${errorCount} errors`);
    }
  }

  // Collect npm security vulnerabilities
  async collectNpmVulnerabilities() {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync('cd /app && npm audit --json', {
        timeout: 60000
      });
      
      const auditResult = JSON.parse(stdout);
      const vulnerabilityCount = auditResult.metadata?.vulnerabilities?.total || 0;
      
      npmVulnerabilities.set(vulnerabilityCount);
      console.log(`npm vulnerabilities: ${vulnerabilityCount}`);
    } catch (error) {
      console.log('npm audit check failed:', error.message);
    }
  }

  // Calculate development productivity score
  calculateProductivityScore() {
    try {
      // Factors affecting productivity
      const tsErrors = typescriptErrors.get() || 0;
      const buildTime = this.lastBuildTime;
      const uptime = (Date.now() - this.startTime) / 1000 / 60; // minutes
      
      // Calculate base score
      let score = 100;
      
      // Penalize for TypeScript errors
      score -= Math.min(tsErrors * 2, 30);
      
      // Penalize for slow builds
      if (buildTime > 30) score -= 20;
      else if (buildTime > 10) score -= 10;
      
      // Reward for stability (longer uptime)
      if (uptime > 60) score += 5;
      
      score = Math.max(0, Math.min(100, score));
      
      developmentProductivity.set({ metric_type: 'overall' }, score);
      developmentProductivity.set({ metric_type: 'build_performance' }, buildTime > 0 ? Math.max(0, 100 - buildTime * 2) : 100);
      developmentProductivity.set({ metric_type: 'code_quality' }, Math.max(0, 100 - tsErrors * 5));
      
      console.log(`Productivity scores - Overall: ${score}, Build: ${100 - buildTime * 2}, Quality: ${100 - tsErrors * 5}`);
    } catch (error) {
      console.error('Error calculating productivity score:', error);
    }
  }

  // Monitor external services
  async monitorExternalServices() {
    const services = [
      { name: 'supabase', url: 'https://azhgptjkqiiqvvvhapml.supabase.co/rest/v1/' },
      { name: 'database', url: 'postgres://aws-0-us-west-1.pooler.supabase.com:6543' }
    ];

    for (const service of services) {
      try {
        if (service.name === 'database') {
          // For database, we'll simulate a check (actual implementation would use pg client)
          externalServiceStatus.set({ service: service.name }, 1);
        } else {
          // HTTP service check
          const response = await fetch(service.url, { 
            method: 'HEAD', 
            timeout: 5000 
          });
          externalServiceStatus.set({ service: service.name }, response.ok ? 1 : 0);
        }
      } catch (error) {
        externalServiceStatus.set({ service: service.name }, 0);
        console.log(`Service ${service.name} check failed:`, error.message);
      }
    }
  }

  // Record build duration
  recordBuildDuration(duration) {
    buildDuration.observe(duration);
    this.lastBuildTime = duration;
    console.log(`Build completed in ${duration}s`);
  }

  // Record hot reload duration
  recordHotReloadDuration(duration) {
    hotReloadDuration.observe(duration);
    console.log(`Hot reload completed in ${duration}s`);
  }

  // Record container restart
  recordContainerRestart(reason) {
    containerRestarts.inc({ reason });
    console.log(`Container restart recorded: ${reason}`);
  }

  // Record file watcher event
  recordFileWatcherEvent(eventType) {
    fileWatcherEvents.inc({ event_type: eventType });
  }

  // Record ESLint violations
  recordEslintViolations(count) {
    eslintViolations.inc(count);
    console.log(`ESLint violations recorded: ${count}`);
  }
}

// Initialize metrics collector
const metricsCollector = new DevMetricsCollector();

// API endpoints for recording metrics
app.post('/api/metrics/build', (req, res) => {
  const { duration } = req.body;
  if (duration) {
    metricsCollector.recordBuildDuration(duration);
  }
  res.json({ status: 'recorded' });
});

app.post('/api/metrics/hot-reload', (req, res) => {
  const { duration } = req.body;
  if (duration) {
    metricsCollector.recordHotReloadDuration(duration);
  }
  res.json({ status: 'recorded' });
});

app.post('/api/metrics/container-restart', (req, res) => {
  const { reason } = req.body;
  if (reason) {
    metricsCollector.recordContainerRestart(reason);
  }
  res.json({ status: 'recorded' });
});

app.post('/api/metrics/eslint', (req, res) => {
  const { violations } = req.body;
  if (violations) {
    metricsCollector.recordEslintViolations(violations);
  }
  res.json({ status: 'recorded' });
});

// File watcher endpoint
app.post('/api/metrics/file-watcher', (req, res) => {
  const { eventType, count = 1 } = req.body;
  if (eventType) {
    for (let i = 0; i < count; i++) {
      metricsCollector.recordFileWatcherEvent(eventType);
    }
  }
  res.json({ status: 'recorded' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`WedSync Development Metrics Collector running on port ${port}`);
  console.log(`Metrics available at: http://localhost:${port}/metrics`);
  console.log(`Health check at: http://localhost:${port}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Development metrics collector shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Development metrics collector shutting down...');
  process.exit(0);
});