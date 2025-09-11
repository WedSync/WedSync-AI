# 04-Lead-Management

# ROI Reporting System

## What to Build

A comprehensive ROI tracking and reporting system that measures the financial performance of the directory for suppliers and provides actionable business intelligence.

## Key Technical Requirements

### ROI Data Structure

```
interface ROIReport {
  supplier_id: string;
  report_period: DateRange;
  directory_investment: DirectoryInvestment;
  generated_revenue: GeneratedRevenue;
  roi_metrics: ROIMetrics;
  performance_breakdown: PerformanceBreakdown;
  cost_analysis: CostAnalysis;
  recommendations: ROIRecommendation[];
}

interface DirectoryInvestment {
  subscription_cost: number;
  profile_optimization_cost?: number;
  premium_placement_cost?: number;
  additional_services_cost?: number;
  total_investment: number;
}

interface GeneratedRevenue {
  direct_bookings: BookingRevenue[];
  attributed_revenue: number;
  pipeline_value: number;
  lifetime_value_impact: number;
  referral_revenue: number;
}

interface ROIMetrics {
  total_roi_percentage: number;
  cost_per_lead: number;
  cost_per_booking: number;
  revenue_per_dollar_spent: number;
  payback_period_months: number;
  customer_acquisition_cost: number;
  directory_attribution_rate: number;
}
```

### Revenue Attribution Engine

```
export class RevenueAttributionEngine {
  async calculateAttributedRevenue(
    supplierId: string,
    timeRange: DateRange
  ): Promise<AttributedRevenue> {
    
    // Get all inquiries from directory
    const directoryInquiries = await this.getDirectoryInquiries(supplierId, timeRange);
    
    // Track conversion to bookings
    const conversions = await this.trackInquiryConversions(directoryInquiries);
    
    // Calculate direct attribution
    const directRevenue = conversions
      .filter(c => c.attribution_confidence > 0.8)
      .reduce((sum, c) => sum + [c.booking](http://c.booking)_value, 0);
    
    // Calculate assisted conversions
    const assistedRevenue = await this.calculateAssistedConversions(
      supplierId, 
      timeRange
    );
    
    // Calculate pipeline value
    const pipelineValue = await this.calculatePipelineValue(
      supplierId,
      timeRange
    );
    
    return {
      direct_attributed: directRevenue,
      assisted_conversions: assistedRevenue,
      pipeline_value: pipelineValue,
      total_attributed: directRevenue + assistedRevenue,
      attribution_confidence: this.calculateOverallConfidence(conversions)
    };
  }
  
  private async trackInquiryConversions(
    inquiries: Inquiry[]
  ): Promise<ConversionTracking[]> {
    
    const conversions: ConversionTracking[] = [];
    
    for (const inquiry of inquiries) {
      // Check for direct booking
      const booking = await this.findBookingFromInquiry([inquiry.id](http://inquiry.id));
      
      if (booking) {
        conversions.push({
          inquiry_id: [inquiry.id](http://inquiry.id),
          booking_id: [booking.id](http://booking.id),
          booking_value: [booking.total](http://booking.total)_value,
          conversion_date: [booking.booking](http://booking.booking)_date,
          attribution_confidence: 0.95, // High confidence for direct path
          attribution_method: 'direct_inquiry'
        });
      } else {
        // Check for indirect conversion (same email/phone)
        const indirectBooking = await this.findIndirectBooking(
          [inquiry.contact](http://inquiry.contact)_info,
          inquiry.supplier_id
        );
        
        if (indirectBooking) {
          const confidence = this.calculateAttributionConfidence(
            inquiry,
            indirectBooking
          );
          
          conversions.push({
            inquiry_id: [inquiry.id](http://inquiry.id),
            booking_id: [indirectBooking.id](http://indirectBooking.id),
            booking_value: [indirectBooking.total](http://indirectBooking.total)_value,
            conversion_date: [indirectBooking.booking](http://indirectBooking.booking)_date,
            attribution_confidence: confidence,
            attribution_method: 'indirect_match'
          });
        }
      }
    }
    
    return conversions;
  }
}
```

## Critical Implementation Notes

### ROI Dashboard Component

```
export function ROIDashboard({ supplierId }: Props) {
  const [timeRange, setTimeRange] = useState<DateRange>({
    start: subMonths(new Date(), 12),
    end: new Date()
  });
  const [roiData, setRoiData] = useState<ROIReport | null>(null);
  const [comparisonData, setComparisonData] = useState<ROIComparison | null>(null);
  
  useEffect(() => {
    Promise.all([
      generateROIReport(supplierId, timeRange),
      getROIBenchmarkComparison(supplierId, timeRange)
    ]).then(([report, comparison]) => {
      setRoiData(report);
      setComparisonData(comparison);
    });
  }, [supplierId, timeRange]);
  
  if (!roiData) return <ROIDashboardLoading />;
  
  return (
    <div className="roi-dashboard">
      <div className="roi-header">
        <h2>Directory ROI Report</h2>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        <ExportButton onExport={() => exportROIReport(roiData)} />
      </div>
      
      <div className="roi-summary">
        <ROISummaryCard
          title="Total ROI"
          value={`${roiData.roi_[metrics.total](http://metrics.total)_roi_percentage.toFixed(1)}%`}
          trend={comparisonData?.roi_trend}
          status={roiData.roi_[metrics.total](http://metrics.total)_roi_percentage > 100 ? 'positive' : 'negative'}
        />
        
        <ROISummaryCard
          title="Revenue Generated"
          value={formatCurrency(roiData.generated_revenue.attributed_revenue)}
          subtitle={`From ${roiData.generated_[revenue.direct](http://revenue.direct)_bookings.length} bookings`}
        />
        
        <ROISummaryCard
          title="Cost Per Booking"
          value={formatCurrency(roiData.roi_metrics.cost_per_booking)}
          benchmark={comparisonData?.industry_avg_cost_per_booking}
        />
        
        <ROISummaryCard
          title="Payback Period"
          value={`${roiData.roi_metrics.payback_period_months.toFixed(1)} months`}
          status={roiData.roi_metrics.payback_period_months < 6 ? 'positive' : 'warning'}
        />
      </div>
      
      <div className="roi-charts">
        <div className="chart-section">
          <h3>Revenue Attribution Breakdown</h3>
          <RevenueAttributionChart data={roiData.generated_revenue} />
        </div>
        
        <div className="chart-section">
          <h3>ROI Trend Over Time</h3>
          <ROITrendChart 
            data={roiData.performance_breakdown.monthly_performance}
            timeRange={timeRange}
          />
        </div>
      </div>
      
      <div className="detailed-analysis">
        <CostAnalysisTable analysis={roiData.cost_analysis} />
        <PerformanceBreakdownTable breakdown={roiData.performance_breakdown} />
        <ROIRecommendationsPanel recommendations={roiData.recommendations} />
      </div>
    </div>
  );
}
```

### Cost Analysis Calculator

```
export class CostAnalysisCalculator {
  async calculateTotalCosts(
    supplierId: string,
    timeRange: DateRange
  ): Promise<CostAnalysis> {
    
    // Base subscription costs
    const subscriptionCosts = await this.getSubscriptionCosts(supplierId, timeRange);
    
    // Additional service costs
    const additionalCosts = await this.getAdditionalServiceCosts(supplierId, timeRange);
    
    // Opportunity costs (time spent on directory activities)
    const opportunityCosts = await this.calculateOpportunityCosts(supplierId, timeRange);
    
    // Calculate cost allocation
    const costAllocation = this.allocateCostsByChannel({
      subscription: subscriptionCosts,
      additional_services: additionalCosts,
      opportunity: opportunityCosts
    });
    
    return {
      total_direct_costs: subscriptionCosts + additionalCosts,
      opportunity_costs: opportunityCosts,
      total_investment: subscriptionCosts + additionalCosts + opportunityCosts,
      cost_breakdown: costAllocation,
      cost_per_inquiry: await this.calculateCostPerInquiry(supplierId, timeRange),
      cost_efficiency_score: await this.calculateCostEfficiency(supplierId, timeRange)
    };
  }
  
  private async calculateOpportunityCosts(
    supplierId: string,
    timeRange: DateRange
  ): Promise<number> {
    
    // Get supplier's hourly rate or average
    const hourlyRate = await this.getSupplierHourlyRate(supplierId) || 75; // Default
    
    // Time spent on directory activities
    const profileManagementTime = 2; // hours per month
    const inquiryResponseTime = await this.calculateInquiryResponseTime(supplierId, timeRange);
    const portfolioUpdateTime = 1; // hours per month
    
    const totalHours = (profileManagementTime + portfolioUpdateTime) * 
      this.getMonthsInRange(timeRange) + inquiryResponseTime;
    
    return totalHours * hourlyRate;
  }
}
```

### Revenue Forecasting

```
export class ROIForecaster {
  async generateROIForecast(
    supplierId: string,
    forecastPeriod: number // months
  ): Promise<ROIForecast> {
    
    // Get historical performance data
    const historicalData = await this.getHistoricalROIData(supplierId, 12);
    
    // Calculate trend patterns
    const trends = this.analyzeTrends(historicalData);
    
    // Generate forecast scenarios
    const scenarios = {
      conservative: this.generateConservativeForecast(trends, forecastPeriod),
      likely: this.generateLikelyForecast(trends, forecastPeriod),
      optimistic: this.generateOptimisticForecast(trends, forecastPeriod)
    };
    
    return {
      forecast_period_months: forecastPeriod,
      scenarios: scenarios,
      confidence_interval: this.calculateConfidenceInterval(historicalData),
      key_assumptions: this.getKeyAssumptions(trends),
      sensitivity_analysis: await this.performSensitivityAnalysis(supplierId, trends)
    };
  }
  
  private generateLikelyForecast(
    trends: TrendAnalysis,
    months: number
  ): ForecastScenario {
    
    const monthlyInquiries = trends.avg_monthly_inquiries;
    const conversionRate = trends.avg_conversion_rate;
    const avgBookingValue = trends.avg_booking_value;
    const monthlyCost = trends.avg_monthly_cost;
    
    let cumulativeROI = 0;
    const monthlyForecasts: MonthlyForecast[] = [];
    
    for (let month = 1; month <= months; month++) {
      // Apply seasonal adjustments
      const seasonalMultiplier = this.getSeasonalMultiplier(month);
      const adjustedInquiries = monthlyInquiries * seasonalMultiplier;
      
      // Calculate expected bookings and revenue
      const expectedBookings = adjustedInquiries * conversionRate;
      const expectedRevenue = expectedBookings * avgBookingValue;
      
      // Calculate monthly ROI
      const monthlyROI = ((expectedRevenue - monthlyCost) / monthlyCost) * 100;
      cumulativeROI += monthlyROI;
      
      monthlyForecasts.push({
        month: month,
        expected_inquiries: Math.round(adjustedInquiries),
        expected_bookings: Math.round(expectedBookings),
        expected_revenue: expectedRevenue,
        monthly_cost: monthlyCost,
        monthly_roi: monthlyROI,
        cumulative_roi: cumulativeROI / month
      });
    }
    
    return {
      scenario_name: 'likely',
      total_expected_revenue: monthlyForecasts.reduce((sum, m) => sum + m.expected_revenue, 0),
      total_investment: monthlyCost * months,
      projected_roi: cumulativeROI / months,
      monthly_breakdown: monthlyForecasts
    };
  }
}
```

### ROI Reporting API

```
// API endpoints for ROI reporting
export const roiRouter = express.Router();

// Generate comprehensive ROI report
roiRouter.get('/report/:supplierId', requireAuth, async (req, res) => {
  const { supplierId } = req.params;
  const { start_date, end_date } = req.query;
  
  // Verify supplier ownership
  await verifySupplierOwnership([req.user.id](http://req.user.id), supplierId);
  
  const timeRange = {
    start: new Date(start_date as string),
    end: new Date(end_date as string)
  };
  
  const report = await generateROIReport(supplierId, timeRange);
  res.json(report);
});

// Get ROI benchmark comparison
roiRouter.get('/benchmark/:supplierId', requireAuth, async (req, res) => {
  const { supplierId } = req.params;
  const { category, region } = req.query;
  
  const benchmark = await getROIBenchmark({
    supplier_id: supplierId,
    category: category as string,
    region: region as string
  });
  
  res.json(benchmark);
});

// Export ROI report
[roiRouter.post](http://roiRouter.post)('/export/:supplierId', requireAuth, async (req, res) => {
  const { supplierId } = req.params;
  const { format, timeRange } = req.body;
  
  const report = await generateROIReport(supplierId, timeRange);
  
  switch (format) {
    case 'pdf':
      const pdf = await generateROIPDF(report);
      res.contentType('application/pdf');
      res.send(pdf);
      break;
      
    case 'excel':
      const excel = await generateROIExcel(report);
      res.contentType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(excel);
      break;
      
    default:
      res.json(report);
  }
});
```

### Database Schema

```
CREATE TABLE roi_reports (
  id UUID PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id),
  report_period_start DATE,
  report_period_end DATE,
  total_investment DECIMAL(12,2),
  attributed_revenue DECIMAL(12,2),
  direct_bookings_count INTEGER,
  roi_percentage DECIMAL(5,2),
  cost_per_lead DECIMAL(8,2),
  cost_per_booking DECIMAL(8,2),
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE revenue_attribution (
  id UUID PRIMARY KEY,
  inquiry_id UUID REFERENCES inquiries(id),
  booking_id UUID,
  supplier_id UUID REFERENCES suppliers(id),
  attributed_revenue DECIMAL(10,2),
  attribution_confidence DECIMAL(3,2),
  attribution_method VARCHAR(50),
  conversion_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE roi_benchmarks (
  id UUID PRIMARY KEY,
  category VARCHAR(50),
  region VARCHAR(50),
  time_period DATE,
  avg_roi_percentage DECIMAL(5,2),
  avg_cost_per_lead DECIMAL(8,2),
  avg_cost_per_booking DECIMAL(8,2),
  avg_conversion_rate DECIMAL(4,3),
  sample_size INTEGER
);

CREATE INDEX idx_roi_reports_supplier_period 
ON roi_reports(supplier_id, report_period_start, report_period_end);

CREATE INDEX idx_revenue_attribution_inquiry 
ON revenue_attribution(inquiry_id);

CREATE INDEX idx_benchmarks_category_region 
ON roi_benchmarks(category, region, time_period);
```

[04-roi-reporting.md](04-Lead-Management%2024bca879f68d81888833f22e5e436321/04-roi-reporting%20md%2024bca879f68d816c8bbee5da50772026.md)