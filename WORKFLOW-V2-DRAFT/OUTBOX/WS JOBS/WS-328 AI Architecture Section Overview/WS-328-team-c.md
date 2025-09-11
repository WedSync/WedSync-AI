# WS-328 AI Architecture Section Overview - Team C: Integration & System Architecture

## CRITICAL OVERVIEW
🎯 **PRIMARY MISSION**: Build comprehensive integration layer connecting AI Architecture system with external monitoring tools, business intelligence platforms, and wedding vendor CRM systems while maintaining enterprise-grade security and real-time data synchronization.

🔗 **INTEGRATION EXCELLENCE IMPERATIVE**: Create seamless data flows between AI metrics, vendor management systems, wedding planning tools, and business analytics platforms, enabling wedding vendors to leverage AI insights within existing workflows.

⚡ **REAL-TIME SYNCHRONIZATION OBSESSION**: Establish bulletproof data pipelines ensuring AI performance metrics, cost analytics, and optimization recommendations are instantly available across all integrated systems.

## SEQUENTIAL THINKING MCP REQUIREMENT
**MANDATORY**: Use Sequential Thinking MCP for ALL integration architecture decisions:
- External monitoring platform integration strategy (DataDog, New Relic, Grafana)
- Wedding vendor CRM synchronization patterns and data mapping
- Business intelligence pipeline design for executive dashboards
- Real-time alert system integration with Slack, email, and SMS
- Cost optimization data export to accounting systems (QuickBooks, Xero)
- API rate limiting and authentication for external system access

## ENHANCED SERENA MCP ACTIVATION PROTOCOL
**Phase 1 - Integration Architecture Analysis**
```typescript
// MANDATORY: Activate enhanced Serena MCP session
mcp__serena__activate_project("wedsync")
mcp__serena__get_symbols_overview("src/lib/integrations/")
mcp__serena__find_symbol("IntegrationService", "", true) // Current integration patterns
mcp__serena__find_symbol("WebhookHandler", "", true) // Webhook processing
mcp__serena__search_for_pattern("axios|fetch|webhook|api") // API integration audit
```

**Phase 2 - Monitoring System Investigation**
```typescript
mcp__serena__find_referencing_symbols("MetricsExporter", "src/lib/") 
mcp__serena__get_symbols_overview("src/lib/monitoring/")
mcp__serena__find_symbol("AlertManager", "", true) // Alert system patterns
mcp__serena__search_for_pattern("cron|schedule|queue|worker") // Background job patterns
```

## CORE INTEGRATION SPECIFICATIONS

### 1. EXTERNAL MONITORING INTEGRATION
**File**: `src/lib/integrations/monitoring/monitoring-exporters.ts`

**DataDog Metrics Exporter**:
```typescript
export class DataDogAIMetricsExporter {
  private apiKey: string
  private appKey: string
  private baseUrl = 'https://api.datadoghq.com/api/v1'

  constructor() {
    this.apiKey = process.env.DATADOG_API_KEY!
    this.appKey = process.env.DATADOG_APP_KEY!
  }

  async exportAIMetrics(metrics: AIMetricsData): Promise<void> {
    const datadogMetrics = this.transformToDatadogFormat(metrics)
    
    try {
      await axios.post(`${this.baseUrl}/series`, {
        series: datadogMetrics
      }, {
        headers: {
          'DD-API-KEY': this.apiKey,
          'DD-APPLICATION-KEY': this.appKey,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('AI metrics exported to DataDog successfully')
      
    } catch (error) {
      console.error('Failed to export AI metrics to DataDog:', error)
      await this.handleExportFailure(error, metrics)
    }
  }

  private transformToDatadogFormat(metrics: AIMetricsData) {
    return [
      // AI Response Time Metric
      {
        metric: 'wedsync.ai.response_time',
        points: [[Math.floor(Date.now() / 1000), metrics.avgResponseTime]],
        tags: [
          `environment:${process.env.NODE_ENV}`,
          `region:${metrics.region}`,
          'service:ai_architecture'
        ]
      },
      
      // AI Cost Per Request
      {
        metric: 'wedsync.ai.cost_per_request',
        points: [[Math.floor(Date.now() / 1000), metrics.avgCostPerRequest]],
        tags: [
          `environment:${process.env.NODE_ENV}`,
          `provider:${metrics.primaryProvider}`,
          'service:ai_architecture'
        ]
      },
      
      // AI Success Rate
      {
        metric: 'wedsync.ai.success_rate',
        points: [[Math.floor(Date.now() / 1000), metrics.successRate]],
        tags: [
          `environment:${process.env.NODE_ENV}`,
          'service:ai_architecture',
          'unit:percentage'
        ]
      },

      // Wedding-Specific Metrics
      {
        metric: 'wedsync.ai.wedding_requests_per_hour',
        points: [[Math.floor(Date.now() / 1000), metrics.weddingRequestsPerHour]],
        tags: [
          `season:${this.getWeddingSeason()}`,
          'service:ai_architecture',
          'context:wedding_industry'
        ]
      }
    ]
  }

  private async handleExportFailure(error: Error, metrics: AIMetricsData): Promise<void> {
    // Store failed metrics for retry
    await FailedExportQueue.add({
      provider: 'datadog',
      metrics,
      error: error.message,
      timestamp: new Date()
    })
  }

  private getWeddingSeason(): string {
    const month = new Date().getMonth() + 1 // 1-12
    if (month >= 5 && month <= 9) return 'peak'
    if (month === 4 || month === 10) return 'shoulder'
    return 'off_season'
  }
}
```

### 2. BUSINESS INTELLIGENCE INTEGRATION
**File**: `src/lib/integrations/bi/executive-dashboard-sync.ts`

**Executive Dashboard Data Pipeline**:
```typescript
export class ExecutiveDashboardSync {
  private powerBiEndpoint: string
  private tableauEndpoint: string
  private lookerEndpoint: string

  constructor() {
    this.powerBiEndpoint = process.env.POWER_BI_ENDPOINT!
    this.tableauEndpoint = process.env.TABLEAU_ENDPOINT!
    this.lookerEndpoint = process.env.LOOKER_ENDPOINT!
  }

  async syncExecutiveMetrics(): Promise<void> {
    const executiveMetrics = await this.generateExecutiveMetrics()
    
    // Sync to multiple BI platforms in parallel
    await Promise.allSettled([
      this.syncToPowerBI(executiveMetrics),
      this.syncToTableau(executiveMetrics),
      this.syncToLooker(executiveMetrics)
    ])
  }

  private async generateExecutiveMetrics(): Promise<ExecutiveMetrics> {
    const [
      aiCostAnalysis,
      vendorAdoption,
      weddingImpact,
      seasonalTrends
    ] = await Promise.all([
      AIMetricsService.getCostAnalysis('executive'),
      AIMetricsService.getVendorAdoptionMetrics(),
      AIMetricsService.getWeddingImpactMetrics(),
      AIMetricsService.getSeasonalTrends()
    ])

    return {
      // Financial KPIs
      monthly_ai_cost: aiCostAnalysis.monthlyCost,
      cost_per_wedding: aiCostAnalysis.costPerWedding,
      roi_percentage: aiCostAnalysis.roiPercentage,
      cost_trend_30d: aiCostAnalysis.trend30d,
      
      // Adoption KPIs
      active_vendors_using_ai: vendorAdoption.activeVendors,
      ai_adoption_rate: vendorAdoption.adoptionRate,
      feature_usage_breakdown: vendorAdoption.featureBreakdown,
      
      // Wedding Industry KPIs
      weddings_ai_assisted: weddingImpact.totalWeddingsAssisted,
      vendor_efficiency_gain: weddingImpact.efficiencyGainPercentage,
      client_satisfaction_score: weddingImpact.clientSatisfactionScore,
      
      // Seasonal Intelligence
      peak_season_readiness: seasonalTrends.peakSeasonReadiness,
      capacity_utilization: seasonalTrends.capacityUtilization,
      seasonal_cost_variation: seasonalTrends.costVariation,
      
      // Technical Health
      system_uptime: await SystemHealthService.getUptime(),
      avg_response_time: await SystemHealthService.getAvgResponseTime(),
      error_rate: await SystemHealthService.getErrorRate(),
      
      // Competitive Intelligence
      ai_feature_parity: await CompetitiveAnalysis.getFeatureParity(),
      market_position: await CompetitiveAnalysis.getMarketPosition(),
      
      last_updated: new Date().toISOString()
    }
  }

  private async syncToPowerBI(metrics: ExecutiveMetrics): Promise<void> {
    try {
      const powerBiPayload = {
        rows: [{
          timestamp: new Date().toISOString(),
          monthly_ai_cost: metrics.monthly_ai_cost,
          cost_per_wedding: metrics.cost_per_wedding,
          roi_percentage: metrics.roi_percentage,
          active_vendors: metrics.active_vendors_using_ai,
          weddings_assisted: metrics.weddings_ai_assisted,
          system_uptime: metrics.system_uptime,
          efficiency_gain: metrics.vendor_efficiency_gain
        }]
      }

      await axios.post(this.powerBiEndpoint, powerBiPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getPowerBIToken()}`
        }
      })

    } catch (error) {
      console.error('Power BI sync failed:', error)
      await this.logSyncFailure('powerbi', error)
    }
  }

  private async syncToTableau(metrics: ExecutiveMetrics): Promise<void> {
    // Tableau-specific data format and API calls
    const tableauData = this.transformForTableau(metrics)
    
    try {
      await axios.post(`${this.tableauEndpoint}/data`, tableauData, {
        headers: {
          'X-Tableau-Auth': await this.getTableauToken()
        }
      })
    } catch (error) {
      console.error('Tableau sync failed:', error)
      await this.logSyncFailure('tableau', error)
    }
  }
}
```

### 3. WEDDING VENDOR CRM INTEGRATION
**File**: `src/lib/integrations/crm/vendor-crm-sync.ts`

**Multi-CRM AI Analytics Sync**:
```typescript
export class VendorCRMSync {
  private taveIntegration: TaveAIIntegration
  private honeyBookIntegration: HoneyBookAIIntegration  
  private lightBlueIntegration: LightBlueAIIntegration

  constructor() {
    this.taveIntegration = new TaveAIIntegration()
    this.honeyBookIntegration = new HoneyBookAIIntegration()
    this.lightBlueIntegration = new LightBlueAIIntegration()
  }

  async syncVendorAIMetrics(organizationId: string): Promise<void> {
    const organization = await getOrganization(organizationId)
    const aiUsageData = await AIMetricsService.getOrganizationMetrics(organizationId, '30d')
    
    // Transform AI metrics to business metrics
    const businessMetrics = this.transformToCRMMetrics(aiUsageData)
    
    // Sync based on vendor's CRM preference
    switch (organization.crm_integration) {
      case 'tave':
        await this.syncToTave(organization, businessMetrics)
        break
      case 'honeybook':
        await this.syncToHoneyBook(organization, businessMetrics)
        break
      case 'lightblue':
        await this.syncToLightBlue(organization, businessMetrics)
        break
      case 'multiple':
        await this.syncToMultipleCRMs(organization, businessMetrics)
        break
    }
  }

  private transformToCRMMetrics(aiUsage: AIUsageData): CRMBusinessMetrics {
    return {
      // Business Value Metrics
      time_saved_hours: aiUsage.totalRequests * 0.25, // Avg 15 min saved per AI request
      cost_savings_gbp: aiUsage.totalRequests * 2.50, // £2.50 saved per request
      efficiency_improvement: this.calculateEfficiencyGain(aiUsage),
      
      // Client Impact Metrics
      faster_response_rate: this.calculateResponseImprovement(aiUsage),
      client_communication_quality: this.calculateQualityScore(aiUsage),
      contract_generation_speed: this.calculateContractSpeed(aiUsage),
      
      // Revenue Impact
      potential_revenue_increase: this.calculateRevenueImpact(aiUsage),
      client_retention_improvement: this.calculateRetentionImpact(aiUsage),
      
      // Operational Metrics
      ai_tools_used: this.getUniqueToolsUsed(aiUsage),
      peak_usage_times: this.getPeakUsageTimes(aiUsage),
      wedding_season_optimization: this.getSeasonalOptimization(aiUsage),
      
      // Next Month Projections
      projected_time_savings: this.projectNextMonth(aiUsage, 'time'),
      projected_cost_savings: this.projectNextMonth(aiUsage, 'cost'),
      projected_efficiency_gains: this.projectNextMonth(aiUsage, 'efficiency')
    }
  }

  private async syncToTave(
    organization: Organization, 
    metrics: CRMBusinessMetrics
  ): Promise<void> {
    try {
      // Tave API integration for business metrics
      await this.taveIntegration.updateVendorMetrics({
        vendor_id: organization.tave_vendor_id,
        ai_productivity_metrics: {
          monthly_time_saved: metrics.time_saved_hours,
          monthly_cost_savings: metrics.cost_savings_gbp,
          efficiency_rating: metrics.efficiency_improvement,
          client_response_speed: metrics.faster_response_rate
        },
        ai_business_impact: {
          revenue_opportunity: metrics.potential_revenue_increase,
          client_retention_score: metrics.client_retention_improvement,
          operational_efficiency: metrics.wedding_season_optimization
        },
        updated_at: new Date().toISOString()
      })

    } catch (error) {
      console.error('Tave CRM sync failed:', error)
      await this.queueForRetry('tave', organization.id, metrics)
    }
  }

  private async syncToHoneyBook(
    organization: Organization,
    metrics: CRMBusinessMetrics
  ): Promise<void> {
    try {
      // HoneyBook API integration with OAuth2
      const accessToken = await this.honeyBookIntegration.refreshAccessToken(
        organization.honeybook_refresh_token
      )

      await this.honeyBookIntegration.updateBusinessMetrics({
        business_id: organization.honeybook_business_id,
        ai_analytics: {
          productivity_boost: `${metrics.efficiency_improvement}%`,
          time_savings_monthly: `${metrics.time_saved_hours} hours`,
          cost_optimization: `£${metrics.cost_savings_gbp}`,
          client_satisfaction_impact: metrics.client_communication_quality
        },
        growth_metrics: {
          revenue_potential: metrics.potential_revenue_increase,
          retention_improvement: metrics.client_retention_improvement,
          operational_score: metrics.wedding_season_optimization
        }
      }, accessToken)

    } catch (error) {
      console.error('HoneyBook CRM sync failed:', error)
      await this.queueForRetry('honeybook', organization.id, metrics)
    }
  }
}
```

### 4. ALERT SYSTEM INTEGRATION
**File**: `src/lib/integrations/alerts/multi-channel-alerts.ts`

**Comprehensive Alert Distribution**:
```typescript
export class MultiChannelAlertSystem {
  private slackWebhook: string
  private emailService: EmailAlertService
  private smsService: SMSAlertService
  private pagerDutyService: PagerDutyService

  constructor() {
    this.slackWebhook = process.env.SLACK_ALERTS_WEBHOOK!
    this.emailService = new EmailAlertService()
    this.smsService = new SMSAlertService()
    this.pagerDutyService = new PagerDutyService()
  }

  async sendAISystemAlert(alert: AISystemAlert): Promise<void> {
    const alertContext = this.enrichAlertContext(alert)
    
    // Determine alert severity and appropriate channels
    const channels = this.determineAlertChannels(alert.severity, alert.type)
    
    // Send alerts to multiple channels in parallel
    const alertPromises = channels.map(channel => {
      switch (channel) {
        case 'slack':
          return this.sendSlackAlert(alertContext)
        case 'email':
          return this.sendEmailAlert(alertContext)
        case 'sms':
          return this.sendSMSAlert(alertContext)
        case 'pagerduty':
          return this.sendPagerDutyAlert(alertContext)
        case 'webhook':
          return this.sendWebhookAlert(alertContext)
      }
    })

    await Promise.allSettled(alertPromises)
    
    // Log alert distribution results
    await this.logAlertDistribution(alert, channels)
  }

  private enrichAlertContext(alert: AISystemAlert): EnrichedAlert {
    return {
      ...alert,
      context: {
        current_wedding_day_mode: this.isWeddingDayModeActive(),
        affected_vendors: this.getAffectedVendors(alert),
        estimated_impact: this.calculateBusinessImpact(alert),
        recovery_actions: this.getRecoveryActions(alert),
        escalation_path: this.getEscalationPath(alert.severity),
        wedding_context: this.getWeddingContext(alert)
      },
      timestamp: new Date().toISOString(),
      alert_id: this.generateAlertId()
    }
  }

  private async sendSlackAlert(alert: EnrichedAlert): Promise<void> {
    const slackMessage = this.formatSlackMessage(alert)
    
    try {
      await axios.post(this.slackWebhook, {
        text: `🚨 AI System Alert: ${alert.title}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `🚨 ${this.getSeverityEmoji(alert.severity)} ${alert.title}`
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Severity:* ${alert.severity.toUpperCase()}`
              },
              {
                type: 'mrkdwn',
                text: `*Affected Vendors:* ${alert.context.affected_vendors.length}`
              },
              {
                type: 'mrkdwn',
                text: `*Wedding Day Mode:* ${alert.context.current_wedding_day_mode ? 'ACTIVE ⚠️' : 'Inactive'}`
              },
              {
                type: 'mrkdwn',
                text: `*Estimated Impact:* ${alert.context.estimated_impact}`
              }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Description:*\n${alert.description}`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Recovery Actions:*\n${alert.context.recovery_actions.map(action => `• ${action}`).join('\n')}`
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'View Dashboard'
                },
                url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/ai-architecture`,
                style: 'primary'
              },
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Acknowledge Alert'
                },
                url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/alerts/${alert.alert_id}`,
                style: 'danger'
              }
            ]
          }
        ]
      })

    } catch (error) {
      console.error('Slack alert failed:', error)
      await this.fallbackAlert(alert, 'slack_failed')
    }
  }

  private determineAlertChannels(severity: AlertSeverity, type: AlertType): AlertChannel[] {
    const baseChannels: AlertChannel[] = ['slack']
    
    switch (severity) {
      case 'critical':
        return [...baseChannels, 'email', 'sms', 'pagerduty']
      case 'high':
        return [...baseChannels, 'email', 'sms']
      case 'medium':
        return [...baseChannels, 'email']
      case 'low':
        return baseChannels
    }
    
    // Wedding day mode escalation
    if (this.isWeddingDayModeActive()) {
      return [...baseChannels, 'email', 'sms'] // Always escalate during weddings
    }
    
    return baseChannels
  }

  private getWeddingContext(alert: AISystemAlert): WeddingContext {
    return {
      weddings_today: this.getTodaysWeddingCount(),
      peak_hours: this.isPeakWeddingHours(),
      venue_locations: this.getAffectedVenueLocations(alert),
      vendor_types: this.getAffectedVendorTypes(alert),
      saturday_alert: this.isSaturdayWedding()
    }
  }
}
```

### 5. COST ACCOUNTING INTEGRATION
**File**: `src/lib/integrations/accounting/cost-export.ts`

**Accounting System AI Cost Export**:
```typescript
export class AccountingSystemIntegration {
  private quickBooksService: QuickBooksAIService
  private xeroService: XeroAIService
  private freshBooksService: FreshBooksAIService

  async exportMonthlyCosts(month: string, year: string): Promise<void> {
    const aiCosts = await this.generateAICostReport(month, year)
    
    // Export to multiple accounting systems
    await Promise.allSettled([
      this.exportToQuickBooks(aiCosts),
      this.exportToXero(aiCosts),
      this.exportToFreshBooks(aiCosts)
    ])
  }

  private async generateAICostReport(month: string, year: string): Promise<AICostReport> {
    const costData = await AIMetricsService.getCostBreakdown(month, year)
    
    return {
      period: `${year}-${month}`,
      total_cost_gbp: costData.totalCost,
      cost_breakdown: {
        openai_costs: costData.providerCosts.openai,
        anthropic_costs: costData.providerCosts.anthropic,
        google_costs: costData.providerCosts.google,
        infrastructure_costs: costData.infrastructureCosts
      },
      organization_breakdown: costData.organizationBreakdown.map(org => ({
        organization_id: org.id,
        organization_name: org.name,
        monthly_cost: org.monthlyCost,
        usage_hours: org.usageHours,
        cost_per_hour: org.costPerHour,
        vendor_type: org.vendorType
      })),
      cost_categories: {
        email_generation: costData.categories.email,
        form_generation: costData.categories.forms,
        content_writing: costData.categories.content,
        contract_generation: costData.categories.contracts
      },
      tax_implications: {
        vat_applicable: costData.tax.vatApplicable,
        vat_amount: costData.tax.vatAmount,
        deductible_business_expense: true,
        expense_category: 'Software and Technology'
      }
    }
  }

  private async exportToQuickBooks(costReport: AICostReport): Promise<void> {
    try {
      const quickBooksEntry = {
        date: `${costReport.period}-01`,
        account: 'Technology Expenses',
        description: `AI Services - ${costReport.period}`,
        amount: costReport.total_cost_gbp,
        category: 'Software Subscription',
        vendor: 'WedSync AI Services',
        memo: `AI usage costs breakdown: OpenAI £${costReport.cost_breakdown.openai_costs}, Anthropic £${costReport.cost_breakdown.anthropic_costs}`,
        tax_code: costReport.tax_implications.vat_applicable ? 'VAT' : 'NO_VAT'
      }

      await this.quickBooksService.createExpense(quickBooksEntry)
      
    } catch (error) {
      console.error('QuickBooks export failed:', error)
      await this.queueForRetry('quickbooks', costReport)
    }
  }
}
```

## WEBHOOK HANDLERS FOR EXTERNAL INTEGRATIONS

### Incoming Webhook Router
```typescript
// src/app/api/webhooks/ai-integrations/route.ts
export async function POST(request: Request) {
  try {
    const signature = request.headers.get('x-webhook-signature')
    const source = request.headers.get('x-webhook-source')
    const body = await request.json()
    
    // Verify webhook authenticity
    if (!await this.verifyWebhookSignature(signature, body, source)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    
    // Route to appropriate handler
    switch (source) {
      case 'datadog':
        await this.handleDataDogWebhook(body)
        break
      case 'pagerduty':
        await this.handlePagerDutyWebhook(body)
        break
      case 'slack':
        await this.handleSlackWebhook(body)
        break
      default:
        console.warn(`Unknown webhook source: ${source}`)
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
```

## SUCCESS CRITERIA & VALIDATION

### Integration Health Metrics
- ✅ External monitoring sync success rate > 99%
- ✅ CRM data synchronization latency < 5 minutes
- ✅ Alert delivery time < 30 seconds
- ✅ BI dashboard update frequency < 1 minute
- ✅ Webhook processing success rate > 99.5%
- ✅ Cost accounting export accuracy 100%

### Wedding Industry Integration Requirements
- ✅ Peak season handling for 10x data volume
- ✅ Wedding day mode alert escalation < 15 seconds
- ✅ Vendor CRM sync during high usage periods
- ✅ Real-time business metrics for executive dashboards
- ✅ Seasonal cost optimization recommendations

## EVIDENCE-BASED REALITY REQUIREMENTS

### Integration Service Proof
```bash
# Integration services created and functional
ls -la src/lib/integrations/monitoring/
ls -la src/lib/integrations/crm/
ls -la src/lib/integrations/alerts/

# Webhook handlers implemented
ls -la src/app/api/webhooks/ai-integrations/
```

### External System Connectivity Proof
```bash
# Test external system connections
npm run test:integrations:datadog
npm run test:integrations:slack
npm run test:integrations:crm
```

### Data Pipeline Validation
```bash
# Verify data transformation accuracy
npm run test:data-pipelines
npm run validate:bi-exports
npm run validate:cost-exports
```

**INTEGRATION REALITY**: Wedding vendors rely on established CRM systems and business processes. AI architecture insights must seamlessly integrate with existing workflows, providing business value without disrupting proven vendor operations.

**EXECUTIVE INSIGHT IMPERATIVE**: Wedding industry executives need clear, actionable insights about AI investment ROI, vendor adoption rates, and operational efficiency gains delivered through familiar business intelligence platforms.