#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const CONFIG = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  RESULTS_DIR: path.join(process.cwd(), 'db-analysis-results'),
  PERFORMANCE_THRESHOLD: {
    SLOW_QUERY_MS: 1000,
    HIGH_IO_OPERATIONS: 10000,
    LOW_CACHE_HIT_RATIO: 0.95,
    HIGH_LOCK_WAITS: 100,
  }
};

interface DatabaseMetrics {
  tableStats: any[];
  indexStats: any[];
  slowQueries: any[];
  connectionStats: any;
  lockStats: any[];
  cacheStats: any;
  diskUsage: any[];
}

interface AnalysisReport {
  timestamp: string;
  overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
  summary: {
    totalTables: number;
    totalIndexes: number;
    slowQueries: number;
    missedIndexes: number;
    performanceIssues: number;
  };
  recommendations: Recommendation[];
  metrics: DatabaseMetrics;
}

interface Recommendation {
  type: 'performance' | 'index' | 'query' | 'configuration' | 'maintenance';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  sqlCommand?: string;
}

class DatabaseAnalyzer {
  private supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);
  private recommendations: Recommendation[] = [];

  constructor() {
    this.ensureResultsDirectory();
  }

  private ensureResultsDirectory() {
    if (!fs.existsSync(CONFIG.RESULTS_DIR)) {
      fs.mkdirSync(CONFIG.RESULTS_DIR, { recursive: true });
    }
  }

  async analyze(): Promise<AnalysisReport> {
    console.log('🔍 Starting WedSync Database Analysis');
    console.log('=====================================');

    try {
      // Collect all metrics
      const metrics = await this.collectMetrics();
      
      // Analyze performance
      await this.analyzeTablePerformance(metrics.tableStats);
      await this.analyzeIndexUsage(metrics.indexStats);
      await this.analyzeSlowQueries(metrics.slowQueries);
      await this.analyzeCachePerformance(metrics.cacheStats);
      await this.analyzeConnectionUsage(metrics.connectionStats);
      
      // Generate recommendations for WedSync-specific optimizations
      await this.generateWedSyncRecommendations(metrics);
      
      const report = this.generateReport(metrics);
      await this.saveReport(report);
      
      return report;
      
    } catch (error) {
      console.error('❌ Database analysis failed:', error);
      throw error;
    }
  }

  private async collectMetrics(): Promise<DatabaseMetrics> {
    console.log('📊 Collecting database metrics...');

    const [
      tableStats,
      indexStats,
      slowQueries,
      connectionStats,
      lockStats,
      cacheStats,
      diskUsage
    ] = await Promise.allSettled([
      this.getTableStatistics(),
      this.getIndexStatistics(),
      this.getSlowQueries(),
      this.getConnectionStatistics(),
      this.getLockStatistics(),
      this.getCacheStatistics(),
      this.getDiskUsage()
    ]);

    return {
      tableStats: tableStats.status === 'fulfilled' ? tableStats.value : [],
      indexStats: indexStats.status === 'fulfilled' ? indexStats.value : [],
      slowQueries: slowQueries.status === 'fulfilled' ? slowQueries.value : [],
      connectionStats: connectionStats.status === 'fulfilled' ? connectionStats.value : {},
      lockStats: lockStats.status === 'fulfilled' ? lockStats.value : [],
      cacheStats: cacheStats.status === 'fulfilled' ? cacheStats.value : {},
      diskUsage: diskUsage.status === 'fulfilled' ? diskUsage.value : []
    };
  }

  private async getTableStatistics(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_table_stats');
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('⚠️ Could not fetch table statistics via RPC, using fallback');
      // Fallback query for standard PostgreSQL
      const { data } = await this.supabase
        .from('pg_stat_user_tables')
        .select(`
          schemaname,
          tablename,
          seq_scan,
          seq_tup_read,
          idx_scan,
          idx_tup_fetch,
          n_tup_ins,
          n_tup_upd,
          n_tup_del,
          n_live_tup,
          n_dead_tup
        `);
      return data || [];
    }
  }

  private async getIndexStatistics(): Promise<any[]> {
    try {
      const { data } = await this.supabase.rpc('get_index_stats');
      return data || [];
    } catch {
      // Fallback query
      const { data } = await this.supabase
        .from('pg_stat_user_indexes')
        .select(`
          schemaname,
          tablename,
          indexrelname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        `);
      return data || [];
    }
  }

  private async getSlowQueries(): Promise<any[]> {
    try {
      // This requires pg_stat_statements extension
      const { data } = await this.supabase.rpc('get_slow_queries', {
        min_duration: CONFIG.PERFORMANCE_THRESHOLD.SLOW_QUERY_MS
      });
      return data || [];
    } catch {
      console.warn('⚠️ Could not fetch slow queries (pg_stat_statements may not be enabled)');
      return [];
    }
  }

  private async getConnectionStatistics(): Promise<any> {
    try {
      // Use a simple query that should work in most PostgreSQL environments
      const { data } = await this.supabase
        .rpc('exec_sql', { 
          sql: `
            SELECT 
              state,
              count(*) as count
            FROM pg_stat_activity 
            WHERE state IS NOT NULL
            GROUP BY state
          `
        });
      
      const stats = { total: 0, active: 0, idle: 0, idle_in_transaction: 0 };
      if (data) {
        data.forEach((row: any) => {
          stats.total += row.count;
          if (row.state === 'active') stats.active = row.count;
          if (row.state === 'idle') stats.idle = row.count;
          if (row.state === 'idle in transaction') stats.idle_in_transaction = row.count;
        });
      }
      return stats;
    } catch {
      return { total: 0, active: 0, idle: 0, idle_in_transaction: 0 };
    }
  }

  private async getLockStatistics(): Promise<any[]> {
    try {
      const { data } = await this.supabase.rpc('get_lock_stats');
      return data || [];
    } catch {
      console.warn('⚠️ Could not fetch lock statistics');
      return [];
    }
  }

  private async getCacheStatistics(): Promise<any> {
    try {
      const { data } = await this.supabase.rpc('get_cache_stats');
      return data?.[0] || {};
    } catch {
      console.warn('⚠️ Could not fetch cache statistics');
      return {};
    }
  }

  private async getDiskUsage(): Promise<any[]> {
    try {
      const { data } = await this.supabase.rpc('get_table_sizes');
      return data || [];
    } catch {
      console.warn('⚠️ Could not fetch disk usage statistics');
      return [];
    }
  }

  private async analyzeTablePerformance(tableStats: any[]): Promise<void> {
    console.log('🔍 Analyzing table performance...');

    for (const table of tableStats) {
      // Check for tables with high sequential scans
      if (table.seq_scan > table.idx_scan * 10 && table.seq_scan > 1000) {
        this.recommendations.push({
          type: 'index',
          priority: 'high',
          title: `High sequential scans on ${table.tablename}`,
          description: `Table ${table.tablename} has ${table.seq_scan} sequential scans vs ${table.idx_scan} index scans`,
          action: 'Add appropriate indexes for common queries',
          sqlCommand: `-- Analyze queries on ${table.tablename} and add indexes accordingly
-- Example: CREATE INDEX idx_${table.tablename}_common_field ON ${table.tablename}(common_field);`
        });
      }

      // Check for tables with many dead tuples
      if (table.n_dead_tup > table.n_live_tup * 0.2 && table.n_dead_tup > 1000) {
        this.recommendations.push({
          type: 'maintenance',
          priority: 'medium',
          title: `High dead tuples in ${table.tablename}`,
          description: `Table has ${table.n_dead_tup} dead tuples vs ${table.n_live_tup} live tuples`,
          action: 'Run VACUUM and consider auto-vacuum tuning',
          sqlCommand: `VACUUM ANALYZE ${table.tablename};`
        });
      }
    }
  }

  private async analyzeIndexUsage(indexStats: any[]): Promise<void> {
    console.log('🔍 Analyzing index usage...');

    for (const index of indexStats) {
      // Check for unused indexes
      if (index.idx_scan === 0 && !index.indexrelname.includes('pkey')) {
        this.recommendations.push({
          type: 'index',
          priority: 'low',
          title: `Unused index: ${index.indexrelname}`,
          description: `Index ${index.indexrelname} on ${index.tablename} has never been used`,
          action: 'Consider dropping this index if it\'s not needed',
          sqlCommand: `-- Verify this index is not needed and drop it
-- DROP INDEX ${index.indexrelname};`
        });
      }

      // Check for low-efficiency indexes
      if (index.idx_scan > 0 && index.idx_tup_fetch / index.idx_scan > 100) {
        this.recommendations.push({
          type: 'index',
          priority: 'medium',
          title: `Low efficiency index: ${index.indexrelname}`,
          description: `Index returns too many rows per scan (${Math.round(index.idx_tup_fetch / index.idx_scan)} avg)`,
          action: 'Consider adding more selective indexes or composite indexes',
        });
      }
    }
  }

  private async analyzeSlowQueries(slowQueries: any[]): Promise<void> {
    console.log('🔍 Analyzing slow queries...');

    for (const query of slowQueries) {
      this.recommendations.push({
        type: 'query',
        priority: 'high',
        title: `Slow query detected`,
        description: `Query taking ${query.mean_time}ms on average (${query.calls} calls)`,
        action: 'Optimize query or add appropriate indexes',
      });
    }
  }

  private async analyzeCachePerformance(cacheStats: any): Promise<void> {
    console.log('🔍 Analyzing cache performance...');

    if (cacheStats.cache_hit_ratio && cacheStats.cache_hit_ratio < CONFIG.PERFORMANCE_THRESHOLD.LOW_CACHE_HIT_RATIO) {
      this.recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'Low cache hit ratio',
        description: `Cache hit ratio is ${(cacheStats.cache_hit_ratio * 100).toFixed(2)}%`,
        action: 'Consider increasing shared_buffers or optimizing queries',
      });
    }
  }

  private async analyzeConnectionUsage(connectionStats: any): Promise<void> {
    console.log('🔍 Analyzing connection usage...');

    if (connectionStats.idle_in_transaction > connectionStats.active * 2) {
      this.recommendations.push({
        type: 'configuration',
        priority: 'medium',
        title: 'High idle in transaction connections',
        description: `${connectionStats.idle_in_transaction} connections are idle in transaction`,
        action: 'Review application connection handling and implement connection pooling',
      });
    }
  }

  private async generateWedSyncRecommendations(metrics: DatabaseMetrics): Promise<void> {
    console.log('🔍 Generating WedSync-specific recommendations...');

    // WedSync-specific table analysis
    const wedSyncTables = ['clients', 'forms', 'form_submissions', 'pdf_documents', 'payments'];
    
    for (const tableName of wedSyncTables) {
      const tableStats = metrics.tableStats.find(t => t.tablename === tableName);
      if (tableStats) {
        await this.analyzeWedSyncTable(tableName, tableStats, metrics);
      }
    }

    // Form builder performance recommendations
    this.recommendations.push({
      type: 'performance',
      priority: 'medium',
      title: 'Form builder optimization',
      description: 'Optimize form field queries for better performance',
      action: 'Consider materialized views for complex form aggregations',
      sqlCommand: `-- Create materialized view for form statistics
CREATE MATERIALIZED VIEW form_stats AS
SELECT 
  form_id,
  COUNT(*) as submission_count,
  AVG(response_time) as avg_response_time
FROM form_submissions 
GROUP BY form_id;

CREATE INDEX idx_form_stats_form_id ON form_stats(form_id);`
    });

    // PDF processing recommendations
    this.recommendations.push({
      type: 'performance',
      priority: 'high',
      title: 'PDF processing optimization',
      description: 'Optimize PDF document storage and retrieval',
      action: 'Implement proper indexing for PDF metadata searches',
      sqlCommand: `-- Add indexes for PDF document searches
CREATE INDEX idx_pdf_documents_client_id ON pdf_documents(client_id);
CREATE INDEX idx_pdf_documents_created_at ON pdf_documents(created_at);
CREATE INDEX idx_pdf_documents_status ON pdf_documents(processing_status);`
    });

    // Payment flow recommendations
    this.recommendations.push({
      type: 'performance',
      priority: 'high',
      title: 'Payment flow optimization',
      description: 'Optimize payment queries for Stripe integration',
      action: 'Add composite indexes for payment status tracking',
      sqlCommand: `-- Add composite index for payment queries
CREATE INDEX idx_payments_status_created ON payments(status, created_at);
CREATE INDEX idx_payments_client_amount ON payments(client_id, amount);`
    });
  }

  private async analyzeWedSyncTable(tableName: string, tableStats: any, metrics: DatabaseMetrics): Promise<void> {
    switch (tableName) {
      case 'clients':
        if (tableStats.seq_scan > tableStats.idx_scan) {
          this.recommendations.push({
            type: 'index',
            priority: 'high',
            title: 'Client table needs indexing',
            description: 'Client lookups are using sequential scans',
            action: 'Add indexes for common client queries',
            sqlCommand: `CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_created_at ON clients(created_at);`
          });
        }
        break;

      case 'forms':
        this.recommendations.push({
          type: 'index',
          priority: 'medium',
          title: 'Form queries optimization',
          description: 'Optimize form listing and filtering queries',
          action: 'Add indexes for form status and client filtering',
          sqlCommand: `CREATE INDEX idx_forms_client_status ON forms(client_id, status);
CREATE INDEX idx_forms_created_at ON forms(created_at DESC);`
        });
        break;

      case 'form_submissions':
        this.recommendations.push({
          type: 'performance',
          priority: 'high',
          title: 'Form submission performance',
          description: 'Large form_submissions table may need partitioning',
          action: 'Consider partitioning by date for better performance',
          sqlCommand: `-- Consider partitioning form_submissions by month
-- This requires careful planning and migration`
        });
        break;
    }
  }

  private generateReport(metrics: DatabaseMetrics): AnalysisReport {
    const overallHealth = this.determineOverallHealth();
    
    return {
      timestamp: new Date().toISOString(),
      overallHealth,
      summary: {
        totalTables: metrics.tableStats.length,
        totalIndexes: metrics.indexStats.length,
        slowQueries: metrics.slowQueries.length,
        missedIndexes: this.recommendations.filter(r => r.type === 'index').length,
        performanceIssues: this.recommendations.filter(r => r.priority === 'high').length
      },
      recommendations: this.recommendations,
      metrics
    };
  }

  private determineOverallHealth(): 'excellent' | 'good' | 'warning' | 'critical' {
    const highPriorityIssues = this.recommendations.filter(r => r.priority === 'high').length;
    const mediumPriorityIssues = this.recommendations.filter(r => r.priority === 'medium').length;

    if (highPriorityIssues === 0 && mediumPriorityIssues <= 2) return 'excellent';
    if (highPriorityIssues <= 2 && mediumPriorityIssues <= 5) return 'good';
    if (highPriorityIssues <= 5) return 'warning';
    return 'critical';
  }

  private async saveReport(report: AnalysisReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save JSON report
    fs.writeFileSync(
      path.join(CONFIG.RESULTS_DIR, `analysis-${timestamp}.json`),
      JSON.stringify(report, null, 2)
    );

    // Generate HTML report
    await this.generateHtmlReport(report, timestamp);
    
    // Generate optimization SQL script
    await this.generateOptimizationScript(report, timestamp);

    console.log(`✅ Database analysis completed`);
    console.log(`📁 Reports saved to: ${CONFIG.RESULTS_DIR}`);
    
    this.printSummary(report);
  }

  private async generateHtmlReport(report: AnalysisReport, timestamp: string): Promise<void> {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>WedSync Database Analysis Report - ${timestamp}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            .header { background: #f0f0f0; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .health-${report.overallHealth} { 
                color: ${report.overallHealth === 'excellent' ? '#27ae60' : 
                        report.overallHealth === 'good' ? '#2ecc71' :
                        report.overallHealth === 'warning' ? '#f39c12' : '#e74c3c'};
                font-weight: bold;
                font-size: 24px;
            }
            .metric { display: inline-block; margin: 10px; padding: 15px; background: #f9f9f9; border-radius: 4px; }
            .recommendation { 
                margin: 15px 0; padding: 15px; border-radius: 4px; border-left: 4px solid;
            }
            .high { border-left-color: #e74c3c; background: #fdf2f2; }
            .medium { border-left-color: #f39c12; background: #fef9f3; }
            .low { border-left-color: #3498db; background: #f4f8fb; }
            .sql-command { 
                background: #2c3e50; color: #ecf0f1; padding: 10px; border-radius: 4px; 
                font-family: monospace; margin: 10px 0; overflow-x: auto;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>WedSync Database Analysis Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <p>Overall Health: <span class="health-${report.overallHealth}">${report.overallHealth.toUpperCase()}</span></p>
        </div>
        
        <h2>Summary</h2>
        <div class="metric">
            <strong>Total Tables:</strong><br>
            <span style="font-size: 24px;">${report.summary.totalTables}</span>
        </div>
        <div class="metric">
            <strong>Total Indexes:</strong><br>
            <span style="font-size: 24px;">${report.summary.totalIndexes}</span>
        </div>
        <div class="metric">
            <strong>Performance Issues:</strong><br>
            <span style="font-size: 24px; color: ${report.summary.performanceIssues > 0 ? '#e74c3c' : '#27ae60'};">
                ${report.summary.performanceIssues}
            </span>
        </div>
        <div class="metric">
            <strong>Index Recommendations:</strong><br>
            <span style="font-size: 24px;">${report.summary.missedIndexes}</span>
        </div>
        
        <h2>Recommendations</h2>
        ${report.recommendations.map(rec => `
            <div class="recommendation ${rec.priority}">
                <h3>${rec.title} <span style="float: right; font-size: 14px;">${rec.priority.toUpperCase()}</span></h3>
                <p><strong>Description:</strong> ${rec.description}</p>
                <p><strong>Action:</strong> ${rec.action}</p>
                ${rec.sqlCommand ? `<div class="sql-command">${rec.sqlCommand}</div>` : ''}
            </div>
        `).join('')}
    </body>
    </html>
    `;

    fs.writeFileSync(
      path.join(CONFIG.RESULTS_DIR, `analysis-report-${timestamp}.html`),
      html
    );
  }

  private async generateOptimizationScript(report: AnalysisReport, timestamp: string): Promise<void> {
    const sql = `-- WedSync Database Optimization Script
-- Generated: ${new Date().toISOString()}
-- Run these commands carefully in your database

-- ================================
-- HIGH PRIORITY OPTIMIZATIONS
-- ================================

${report.recommendations
  .filter(r => r.priority === 'high' && r.sqlCommand)
  .map(r => `-- ${r.title}\n-- ${r.description}\n${r.sqlCommand}\n`)
  .join('\n')}

-- ================================
-- MEDIUM PRIORITY OPTIMIZATIONS  
-- ================================

${report.recommendations
  .filter(r => r.priority === 'medium' && r.sqlCommand)
  .map(r => `-- ${r.title}\n-- ${r.description}\n${r.sqlCommand}\n`)
  .join('\n')}

-- ================================
-- MAINTENANCE TASKS
-- ================================

-- Update table statistics
ANALYZE;
`;

    fs.writeFileSync(
      path.join(CONFIG.RESULTS_DIR, `optimization-${timestamp}.sql`),
      sql
    );
  }

  private printSummary(report: AnalysisReport): void {
    console.log('\n🎯 DATABASE ANALYSIS SUMMARY');
    console.log('=============================');
    console.log(`📊 Overall Health: ${report.overallHealth.toUpperCase()}`);
    console.log(`🗃️  Total Tables: ${report.summary.totalTables}`);
    console.log(`📑 Total Indexes: ${report.summary.totalIndexes}`);
    console.log(`⚠️  Performance Issues: ${report.summary.performanceIssues}`);
    console.log(`💡 Index Recommendations: ${report.summary.missedIndexes}`);
    
    console.log('\n🔥 HIGH PRIORITY RECOMMENDATIONS');
    console.log('=================================');
    const highPriority = report.recommendations.filter(r => r.priority === 'high');
    if (highPriority.length === 0) {
      console.log('✅ No high priority issues found!');
    } else {
      highPriority.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec.title}`);
        console.log(`   ${rec.description}`);
        console.log(`   Action: ${rec.action}\n`);
      });
    }
    
    console.log(`📁 Detailed reports and optimization scripts saved to: ${CONFIG.RESULTS_DIR}`);
  }
}

// CLI execution
if (require.main === module) {
  const analyzer = new DatabaseAnalyzer();
  analyzer.analyze().catch(console.error);
}

export { DatabaseAnalyzer };