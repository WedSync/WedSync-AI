#!/bin/bash

# PDF Analysis System Monitoring Alerts Setup
# WS-242: AI PDF Analysis System - Production Monitoring

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚨 Setting up PDF Analysis System Monitoring Alerts${NC}"
echo -e "${BLUE}===================================================${NC}\n"

# Create alerts configuration directory
ALERTS_DIR="docker/pdf-analysis/alerts"
mkdir -p "$ALERTS_DIR"

# Wedding Day Critical Alerts
cat > "$ALERTS_DIR/wedding_day_alerts.yml" << 'EOF'
groups:
  - name: wedding_day_critical
    interval: 10s
    rules:
      # PDF Analysis Service Down (CRITICAL for wedding day)
      - alert: PDFAnalysisServiceDown
        expr: up{job="pdf-analysis-service"} == 0
        for: 30s
        labels:
          severity: critical
          service: pdf-analysis
          wedding_impact: high
        annotations:
          summary: "PDF Analysis Service is DOWN"
          description: "The PDF Analysis service has been down for more than 30 seconds. This will prevent wedding form processing."
          impact: "Wedding suppliers cannot process client forms - IMMEDIATE ACTION REQUIRED"
          runbook_url: "https://docs.wedsync.com/runbooks/pdf-service-down"

      # High Error Rate (Wedding Day Disaster Prevention)
      - alert: HighPDFProcessingErrorRate
        expr: (rate(pdf_processing_errors_total[5m]) / rate(pdf_processing_requests_total[5m])) > 0.1
        for: 2m
        labels:
          severity: critical
          service: pdf-analysis
          wedding_impact: high
        annotations:
          summary: "High PDF processing error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"
          impact: "Wedding forms failing to process - check logs immediately"

      # Queue Backup (Wedding Season Overload)
      - alert: PDFProcessingQueueBackup
        expr: pdf_processing_queue_size > 100
        for: 5m
        labels:
          severity: warning
          service: pdf-analysis
          wedding_impact: medium
        annotations:
          summary: "PDF processing queue is backed up"
          description: "Processing queue has {{ $value }} jobs pending for more than 5 minutes"
          impact: "Wedding forms will be delayed - consider scaling up processors"

      # Cost Overrun Alert
      - alert: HighAIProcessingCosts
        expr: increase(ai_processing_cost_total[1h]) > 5000  # £50 per hour
        for: 10m
        labels:
          severity: warning
          service: pdf-analysis
          wedding_impact: low
        annotations:
          summary: "AI processing costs are high"
          description: "AI costs have increased by £{{ $value | div 100 }} in the last hour"
          impact: "Monitor costs - may need to optimize pattern matching"

  - name: performance_alerts
    interval: 30s
    rules:
      # Slow Processing Times
      - alert: SlowPDFProcessing
        expr: histogram_quantile(0.95, rate(pdf_processing_duration_seconds_bucket[5m])) > 300
        for: 5m
        labels:
          severity: warning
          service: pdf-analysis
          wedding_impact: medium
        annotations:
          summary: "PDF processing is slow"
          description: "95th percentile processing time is {{ $value }}s"
          impact: "Wedding suppliers experiencing delays"

      # Memory Usage High
      - alert: HighMemoryUsage
        expr: (container_memory_usage_bytes{name="wedsync-pdf-analysis"} / container_spec_memory_limit_bytes{name="wedsync-pdf-analysis"}) > 0.8
        for: 5m
        labels:
          severity: warning
          service: pdf-analysis
          wedding_impact: medium
        annotations:
          summary: "High memory usage in PDF Analysis service"
          description: "Memory usage is at {{ $value | humanizePercentage }}"
          impact: "Service may become unstable - consider restarting"

      # Disk Usage High
      - alert: HighDiskUsage
        expr: (node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_free_bytes{mountpoint="/"}) / node_filesystem_size_bytes{mountpoint="/"} > 0.8
        for: 5m
        labels:
          severity: warning
          service: system
          wedding_impact: medium
        annotations:
          summary: "High disk usage"
          description: "Disk usage is at {{ $value | humanizePercentage }}"
          impact: "May prevent file uploads and processing"

  - name: database_alerts
    interval: 60s
    rules:
      # Database Connection Issues
      - alert: DatabaseConnectionFailed
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
          service: database
          wedding_impact: high
        annotations:
          summary: "Database connection failed"
          description: "Cannot connect to the PDF analysis database"
          impact: "All PDF processing will fail - immediate database recovery needed"

      # Pattern Database Size
      - alert: PatternDatabaseLarge
        expr: pg_database_size_bytes{datname="wedsync_patterns"} > 1e9  # 1GB
        for: 30m
        labels:
          severity: info
          service: database
          wedding_impact: low
        annotations:
          summary: "Pattern database is growing large"
          description: "Database size is {{ $value | humanize1024 }}"
          impact: "Monitor and consider optimization"

  - name: security_alerts
    interval: 60s
    rules:
      # Rate Limiting Triggered
      - alert: RateLimitingActive
        expr: increase(nginx_requests_rate_limited_total[5m]) > 10
        for: 2m
        labels:
          severity: warning
          service: security
          wedding_impact: low
        annotations:
          summary: "Rate limiting is actively blocking requests"
          description: "{{ $value }} requests have been rate limited in the last 5 minutes"
          impact: "Some users may be experiencing upload restrictions"

      # Unusual Upload Pattern
      - alert: SuspiciousUploadActivity
        expr: rate(pdf_uploads_total[5m]) > 5
        for: 10m
        labels:
          severity: info
          service: security
          wedding_impact: low
        annotations:
          summary: "High upload activity detected"
          description: "Upload rate is {{ $value }} uploads per second"
          impact: "Monitor for potential abuse or viral growth"

  - name: business_alerts
    interval: 300s  # 5 minutes
    rules:
      # Low Pattern Match Rate
      - alert: LowPatternMatchRate
        expr: (pdf_pattern_matches_total / pdf_processing_requests_total) < 0.7
        for: 15m
        labels:
          severity: warning
          service: business
          wedding_impact: medium
        annotations:
          summary: "Pattern matching rate is low"
          description: "Only {{ $value | humanizePercentage }} of forms matched patterns"
          impact: "Increased AI costs and processing times - update patterns"

      # High Manual Review Rate
      - alert: HighManualReviewRate
        expr: (pdf_manual_review_required_total / pdf_processing_completed_total) > 0.3
        for: 30m
        labels:
          severity: info
          service: business
          wedding_impact: medium
        annotations:
          summary: "High manual review rate"
          description: "{{ $value | humanizePercentage }} of forms require manual review"
          impact: "Wedding suppliers spending more time on form validation"
EOF

# Wedding Day Emergency Procedures
cat > "$ALERTS_DIR/emergency_procedures.md" << 'EOF'
# PDF Analysis System Emergency Procedures

## Wedding Day Protocol 🚨

### CRITICAL: Service Down
1. **IMMEDIATE**: Check if wedding is scheduled for today
2. **ACTION**: Restart PDF Analysis service
   ```bash
   docker-compose restart pdf-analysis
   ```
3. **ESCALATE**: If restart fails, wake up senior developer
4. **COMMUNICATE**: Notify wedding suppliers immediately

### High Error Rate
1. **CHECK**: Recent deployments or configuration changes
2. **REVIEW**: Error logs for patterns
   ```bash
   docker-compose logs -f pdf-analysis | grep ERROR
   ```
3. **ACTION**: Rollback recent changes if identified
4. **MONITOR**: Error rate recovery

### Queue Backup
1. **SCALE**: Increase job processors
   ```bash
   docker-compose up -d --scale job-processor=5
   ```
2. **PRIORITIZE**: Wedding day forms over others
3. **COMMUNICATE**: Inform suppliers of potential delays

### Database Issues
1. **VERIFY**: Database connectivity
   ```bash
   docker-compose exec postgres pg_isready
   ```
2. **RESTART**: Database service if needed
   ```bash
   docker-compose restart postgres
   ```
3. **BACKUP**: Ensure recent backup exists before major fixes

## Contact Information

### Emergency Contacts
- **Wedding Day Hotline**: [Emergency Phone]
- **Senior Developer**: [On-call Phone]
- **Infrastructure Team**: [Team Channel]

### Escalation Matrix
1. **Level 1**: Service restart, basic troubleshooting
2. **Level 2**: Database issues, configuration problems
3. **Level 3**: Code changes, infrastructure scaling
4. **Level 4**: Data corruption, security incidents

## Wedding Day Checklist
- [ ] All services healthy
- [ ] Queue sizes normal (<10 jobs)
- [ ] Error rates low (<1%)
- [ ] Disk space sufficient (>20% free)
- [ ] Memory usage normal (<70%)
- [ ] Pattern database accessible
- [ ] AI services responding
- [ ] Monitoring alerts configured
EOF

# Slack notification configuration
cat > "$ALERTS_DIR/slack_config.yml" << 'EOF'
# Slack notification configuration for wedding day alerts
global:
  slack_api_url: '${SLACK_WEBHOOK_URL}'

route:
  group_by: ['alertname', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'wedding-alerts'
  routes:
    - match:
        severity: critical
      receiver: 'emergency-wedding-alerts'
      repeat_interval: 5m
    - match:
        wedding_impact: high
      receiver: 'urgent-wedding-alerts'
      repeat_interval: 15m

receivers:
  - name: 'wedding-alerts'
    slack_configs:
      - channel: '#wedsync-pdf-analysis'
        title: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'emergency-wedding-alerts'
    slack_configs:
      - channel: '#wedsync-emergency'
        title: '🚨 WEDDING DAY EMERGENCY: {{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
        text: |
          **IMPACT**: {{ range .Alerts }}{{ .Annotations.impact }}{{ end }}
          **DESCRIPTION**: {{ range .Alerts }}{{ .Annotations.description }}{{ end }}
          **ACTION REQUIRED**: Immediate response needed
        color: 'danger'

  - name: 'urgent-wedding-alerts'
    slack_configs:
      - channel: '#wedsync-urgent'
        title: '⚠️ URGENT: {{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
        text: |
          **WEDDING IMPACT**: {{ range .Alerts }}{{ .Annotations.wedding_impact }}{{ end }}
          **DESCRIPTION**: {{ range .Alerts }}{{ .Annotations.description }}{{ end }}
        color: 'warning'
EOF

# Health check script for wedding day monitoring
cat > "scripts/monitoring/wedding_day_health_check.sh" << 'EOF'
#!/bin/bash

# Wedding Day Health Check Script
# Runs comprehensive checks before wedding processing begins

set -e

echo "🎯 Wedding Day Health Check - $(date)"
echo "========================================"

# Check all critical services
services=("pdf-analysis" "redis" "postgres" "nginx")
all_healthy=true

for service in "${services[@]}"; do
    if docker-compose ps "$service" | grep -q "Up"; then
        echo "✅ $service: Healthy"
    else
        echo "❌ $service: DOWN"
        all_healthy=false
    fi
done

# Check API endpoints
echo -e "\n🔍 API Endpoint Checks:"
if curl -f -s http://localhost:3000/api/pdf-analysis/upload >/dev/null; then
    echo "✅ Upload endpoint: Responding"
else
    echo "❌ Upload endpoint: Failed"
    all_healthy=false
fi

# Check queue sizes
echo -e "\n📊 Queue Status:"
queue_size=$(docker-compose exec -T redis redis-cli llen pdf_processing_queue 2>/dev/null || echo "0")
echo "📝 Processing queue: $queue_size jobs"

if [ "$queue_size" -gt 50 ]; then
    echo "⚠️ Queue is backed up"
    all_healthy=false
fi

# Check disk space
echo -e "\n💾 Disk Space:"
disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
echo "📊 Disk usage: ${disk_usage}%"

if [ "$disk_usage" -gt 80 ]; then
    echo "⚠️ Disk space low"
    all_healthy=false
fi

# Final status
echo -e "\n🎯 Overall Status:"
if [ "$all_healthy" = true ]; then
    echo "✅ ALL SYSTEMS GO - Ready for wedding day!"
    exit 0
else
    echo "❌ ISSUES DETECTED - Address before wedding processing"
    exit 1
fi
EOF

chmod +x scripts/monitoring/wedding_day_health_check.sh

echo -e "${GREEN}✅ Monitoring alerts configuration completed!${NC}"
echo -e "${BLUE}📋 Created files:${NC}"
echo -e "   • docker/pdf-analysis/alerts/wedding_day_alerts.yml"
echo -e "   • docker/pdf-analysis/alerts/emergency_procedures.md"
echo -e "   • docker/pdf-analysis/alerts/slack_config.yml"
echo -e "   • scripts/monitoring/wedding_day_health_check.sh"

echo -e "\n${YELLOW}⚠️  Remember to:${NC}"
echo -e "   1. Configure SLACK_WEBHOOK_URL environment variable"
echo -e "   2. Test alerts with: docker-compose exec prometheus promtool check rules alerts/"
echo -e "   3. Run wedding day health check: ./scripts/monitoring/wedding_day_health_check.sh"
echo -e "   4. Set up cron job for daily health checks"

echo -e "\n${GREEN}🎉 PDF Analysis System monitoring is ready for wedding season!${NC}"