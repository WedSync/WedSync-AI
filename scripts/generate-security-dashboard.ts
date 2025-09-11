#!/usr/bin/env tsx

/**
 * Generate Security Dashboard Report
 * Creates comprehensive security dashboard data and reports
 * 
 * USAGE: npm run security:dashboard
 */

import { createClient } from '@supabase/supabase-js';
import { securityEventMonitor } from '../src/lib/security-event-monitor';
import { writeFileSync } from 'fs';

interface SecurityDashboardData {
  overview: {
    securityScore: number;
    totalEvents24h: number;
    activeAlerts: number;
    criticalIssues: number;
    lastUpdated: Date;
  };
  events: {
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    byHour: Array<{ hour: string; count: number }>;
    topSourceIPs: Array<{ ip: string; count: number; risk: string }>;
  };
  alerts: {
    active: number;
    resolved: number;
    falsePositives: number;
    byType: Record<string, number>;
  };
  performance: {
    averageResponseTime: number;
    rlsOverhead: number;
    apiThroughput: number;
    errorRate: number;
  };
  recommendations: string[];
}

async function generateSecurityDashboard() {
  console.log('📊 Generating Security Dashboard Report...\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get organizations for testing (in production, this would be parameterized)
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(5);

    if (!orgs || orgs.length === 0) {
      console.log('⚠️ No organizations found for dashboard generation');
      return;
    }

    const dashboards: Record<string, SecurityDashboardData> = {};

    for (const org of orgs) {
      console.log(`📈 Generating dashboard for: ${org.name}`);
      
      const dashboard = await generateOrgDashboard(supabase, org.id, org.name);
      dashboards[org.id] = dashboard;
    }

    // Generate consolidated dashboard
    const consolidatedDashboard = generateConsolidatedDashboard(Object.values(dashboards));

    // Save individual dashboards
    for (const [orgId, dashboard] of Object.entries(dashboards)) {
      const filename = `security-dashboard-${orgId}.json`;
      writeFileSync(filename, JSON.stringify(dashboard, null, 2));
      console.log(`💾 Saved dashboard: ${filename}`);
    }

    // Save consolidated dashboard
    writeFileSync('security-dashboard-consolidated.json', JSON.stringify(consolidatedDashboard, null, 2));
    console.log('💾 Saved consolidated dashboard: security-dashboard-consolidated.json');

    // Generate HTML report
    await generateHTMLReport(consolidatedDashboard, dashboards);

    // Print summary
    printDashboardSummary(consolidatedDashboard);

  } catch (error) {
    console.error('💥 Dashboard generation failed:', error);
    process.exit(1);
  }
}

async function generateOrgDashboard(
  supabase: any, 
  orgId: string, 
  orgName: string
): Promise<SecurityDashboardData> {
  
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Get security events for last 24 hours
  const { data: events } = await supabase
    .from('enhanced_security_audit_logs')
    .select('*')
    .eq('organization_id', orgId)
    .gte('created_at', twentyFourHoursAgo);

  // Get active alerts
  const { data: alerts } = await supabase
    .from('security_alerts')
    .select('*')
    .eq('organization_id', orgId);

  // Calculate metrics
  const totalEvents24h = events?.length || 0;
  const criticalEvents = events?.filter(e => e.severity === 'CRITICAL').length || 0;
  const activeAlerts = alerts?.filter(a => a.status === 'ACTIVE').length || 0;
  
  // Calculate security score (simplified algorithm)
  let securityScore = 100;
  securityScore -= criticalEvents * 10;
  securityScore -= (events?.filter(e => e.severity === 'HIGH').length || 0) * 5;
  securityScore -= activeAlerts * 15;
  securityScore = Math.max(0, securityScore);

  // Group events by category and severity
  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  
  events?.forEach(event => {
    byCategory[event.event_category] = (byCategory[event.event_category] || 0) + 1;
    bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
  });

  // Generate hourly breakdown
  const byHour: Array<{ hour: string; count: number }> = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourStr = hour.toISOString().slice(0, 13) + ':00:00Z';
    const count = events?.filter(e => 
      new Date(e.created_at).getTime() >= hour.getTime() - 60 * 60 * 1000 &&
      new Date(e.created_at).getTime() < hour.getTime()
    ).length || 0;
    byHour.push({
      hour: hour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      count
    });
  }

  // Analyze source IPs
  const ipCounts: Record<string, number> = {};
  events?.forEach(event => {
    if (event.ip_address) {
      ipCounts[event.ip_address] = (ipCounts[event.ip_address] || 0) + 1;
    }
  });

  const topSourceIPs = Object.entries(ipCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([ip, count]) => ({
      ip,
      count,
      risk: count > 10 ? 'HIGH' : count > 5 ? 'MEDIUM' : 'LOW'
    }));

  // Alert statistics
  const alertsByType: Record<string, number> = {};
  alerts?.forEach(alert => {
    alertsByType[alert.alert_type] = (alertsByType[alert.alert_type] || 0) + 1;
  });

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (criticalEvents > 0) {
    recommendations.push(`Address ${criticalEvents} critical security events immediately`);
  }
  
  if (activeAlerts > 5) {
    recommendations.push('High number of active alerts - review alert thresholds');
  }
  
  if (securityScore < 70) {
    recommendations.push('Security score is below 70 - implement additional security measures');
  }
  
  if (topSourceIPs.filter(ip => ip.risk === 'HIGH').length > 0) {
    recommendations.push('Suspicious IP activity detected - consider implementing IP blocking');
  }

  if (recommendations.length === 0) {
    recommendations.push('Security posture is good - continue monitoring');
  }

  return {
    overview: {
      securityScore,
      totalEvents24h,
      activeAlerts,
      criticalIssues: criticalEvents,
      lastUpdated: new Date()
    },
    events: {
      byCategory,
      bySeverity,
      byHour,
      topSourceIPs
    },
    alerts: {
      active: activeAlerts,
      resolved: alerts?.filter(a => a.status === 'RESOLVED').length || 0,
      falsePositives: alerts?.filter(a => a.status === 'FALSE_POSITIVE').length || 0,
      byType: alertsByType
    },
    performance: {
      averageResponseTime: 150, // Mock data - would come from monitoring
      rlsOverhead: 12, // Mock data - would come from performance tests
      apiThroughput: 450, // Mock data - requests per minute
      errorRate: 0.5 // Mock data - percentage
    },
    recommendations
  };
}

function generateConsolidatedDashboard(orgDashboards: SecurityDashboardData[]): SecurityDashboardData {
  const consolidated: SecurityDashboardData = {
    overview: {
      securityScore: 0,
      totalEvents24h: 0,
      activeAlerts: 0,
      criticalIssues: 0,
      lastUpdated: new Date()
    },
    events: {
      byCategory: {},
      bySeverity: {},
      byHour: [],
      topSourceIPs: []
    },
    alerts: {
      active: 0,
      resolved: 0,
      falsePositives: 0,
      byType: {}
    },
    performance: {
      averageResponseTime: 0,
      rlsOverhead: 0,
      apiThroughput: 0,
      errorRate: 0
    },
    recommendations: []
  };

  if (orgDashboards.length === 0) return consolidated;

  // Aggregate overview metrics
  consolidated.overview.securityScore = orgDashboards.reduce((sum, d) => sum + d.overview.securityScore, 0) / orgDashboards.length;
  consolidated.overview.totalEvents24h = orgDashboards.reduce((sum, d) => sum + d.overview.totalEvents24h, 0);
  consolidated.overview.activeAlerts = orgDashboards.reduce((sum, d) => sum + d.overview.activeAlerts, 0);
  consolidated.overview.criticalIssues = orgDashboards.reduce((sum, d) => sum + d.overview.criticalIssues, 0);

  // Aggregate events by category and severity
  orgDashboards.forEach(dashboard => {
    Object.entries(dashboard.events.byCategory).forEach(([category, count]) => {
      consolidated.events.byCategory[category] = (consolidated.events.byCategory[category] || 0) + count;
    });
    
    Object.entries(dashboard.events.bySeverity).forEach(([severity, count]) => {
      consolidated.events.bySeverity[severity] = (consolidated.events.bySeverity[severity] || 0) + count;
    });
  });

  // Aggregate performance metrics
  consolidated.performance.averageResponseTime = orgDashboards.reduce((sum, d) => sum + d.performance.averageResponseTime, 0) / orgDashboards.length;
  consolidated.performance.rlsOverhead = orgDashboards.reduce((sum, d) => sum + d.performance.rlsOverhead, 0) / orgDashboards.length;
  consolidated.performance.apiThroughput = orgDashboards.reduce((sum, d) => sum + d.performance.apiThroughput, 0);
  consolidated.performance.errorRate = orgDashboards.reduce((sum, d) => sum + d.performance.errorRate, 0) / orgDashboards.length;

  // Generate consolidated recommendations
  const allRecommendations = orgDashboards.flatMap(d => d.recommendations);
  consolidated.recommendations = [...new Set(allRecommendations)]; // Deduplicate

  return consolidated;
}

async function generateHTMLReport(
  consolidated: SecurityDashboardData, 
  orgDashboards: Record<string, SecurityDashboardData>
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WedSync Security Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2rem; font-weight: bold; color: #1f2937; }
        .metric-label { color: #6b7280; font-size: 0.9rem; margin-top: 5px; }
        .chart-container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .recommendations { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .recommendation { padding: 10px; margin: 5px 0; background: #f0f9ff; border-left: 4px solid #0ea5e9; }
        .score-good { color: #10b981; }
        .score-warning { color: #f59e0b; }
        .score-danger { color: #ef4444; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ WedSync Security Dashboard</h1>
            <p>Generated: ${consolidated.overview.lastUpdated.toLocaleString()}</p>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value ${consolidated.overview.securityScore >= 80 ? 'score-good' : consolidated.overview.securityScore >= 60 ? 'score-warning' : 'score-danger'}">
                    ${Math.round(consolidated.overview.securityScore)}
                </div>
                <div class="metric-label">Security Score</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${consolidated.overview.totalEvents24h}</div>
                <div class="metric-label">Events (24h)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${consolidated.overview.activeAlerts}</div>
                <div class="metric-label">Active Alerts</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${consolidated.overview.criticalIssues}</div>
                <div class="metric-label">Critical Issues</div>
            </div>
        </div>

        <div class="chart-container">
            <h3>Events by Severity</h3>
            <canvas id="severityChart" width="400" height="200"></canvas>
        </div>

        <div class="chart-container">
            <h3>Performance Metrics</h3>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${Math.round(consolidated.performance.averageResponseTime)}ms</div>
                    <div class="metric-label">Avg Response Time</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${consolidated.performance.rlsOverhead.toFixed(1)}%</div>
                    <div class="metric-label">RLS Overhead</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${Math.round(consolidated.performance.apiThroughput)}</div>
                    <div class="metric-label">API Throughput (req/min)</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${consolidated.performance.errorRate.toFixed(2)}%</div>
                    <div class="metric-label">Error Rate</div>
                </div>
            </div>
        </div>

        <div class="recommendations">
            <h3>🎯 Security Recommendations</h3>
            ${consolidated.recommendations.map(rec => `<div class="recommendation">${rec}</div>`).join('')}
        </div>
    </div>

    <script>
        // Events by Severity Chart
        const ctx = document.getElementById('severityChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ${JSON.stringify(Object.keys(consolidated.events.bySeverity))},
                datasets: [{
                    data: ${JSON.stringify(Object.values(consolidated.events.bySeverity))},
                    backgroundColor: [
                        '#ef4444', // Critical - Red
                        '#f59e0b', // High - Orange  
                        '#eab308', // Medium - Yellow
                        '#10b981'  // Low - Green
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    </script>
</body>
</html>
  `;

  writeFileSync('security-dashboard-report.html', html);
  console.log('🌐 Generated HTML report: security-dashboard-report.html');
}

function printDashboardSummary(dashboard: SecurityDashboardData): void {
  console.log('\n📊 Security Dashboard Summary');
  console.log('==============================');
  console.log(`Security Score: ${Math.round(dashboard.overview.securityScore)}/100`);
  console.log(`Total Events (24h): ${dashboard.overview.totalEvents24h}`);
  console.log(`Active Alerts: ${dashboard.overview.activeAlerts}`);
  console.log(`Critical Issues: ${dashboard.overview.criticalIssues}`);

  if (Object.keys(dashboard.events.bySeverity).length > 0) {
    console.log('\nEvents by Severity:');
    Object.entries(dashboard.events.bySeverity).forEach(([severity, count]) => {
      console.log(`  ${severity}: ${count}`);
    });
  }

  if (dashboard.recommendations.length > 0) {
    console.log('\n🎯 Top Recommendations:');
    dashboard.recommendations.slice(0, 3).forEach(rec => {
      console.log(`  • ${rec}`);
    });
  }

  console.log('\n📄 Generated Files:');
  console.log('  • security-dashboard-consolidated.json - JSON data');
  console.log('  • security-dashboard-report.html - Visual report');
  console.log('  • Individual organization dashboards');

  console.log('\n🌐 Open security-dashboard-report.html in your browser to view the visual dashboard');
}

// Main execution
if (require.main === module) {
  generateSecurityDashboard();
}