# 04-roi-reporting.md

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
  payback_period_months: number;
  cost_per_lead: number;
  cost_per_booking: number;
  revenue_per_inquiry: number;
  customer_acquisition_cost: number;
  lifetime_value_multiplier: number;
}
```

### Revenue Attribution System

```
export class RevenueAttributionEngine {
  async calculateAttributedRevenue(
    supplierId: string,
    timeRange: DateRange
  ): Promise<AttributedRevenue> {
    
    const inquiries = await this.getDirectoryInquiries(supplierId, timeRange);
    const bookings = await this.getAttributedBookings(supplierId, timeRange);
    
    return {
      direct_attribution: await this.calculateDirectAttribution(inquiries, bookings),
      assisted_attribution: await this.calculateAssistedAttribution(supplierId, timeRange),
      referral_attribution: await this.calculateReferralAttribution(supplierId, timeRange),
      brand_awareness_impact: await this.estimateBrandImpact(supplierId, timeRange)
    };
  }
  
  private async calculateDirectAttribution(
    inquiries: Inquiry[],
    bookings: Booking[]
  ): Promise<DirectAttribution> {
    
    const directBookings = bookings.filter(booking => 
      inquiries.some(inquiry => 
        inquiry.couple_id === booking.couple_id &&
        inquiry.created_at <= [booking.booking](http://booking.booking)_date
      )
    );
    
    return {
      booking_count: directBookings.length,
      total_revenue: directBookings.reduce((sum, b) => sum + [b.booking](http://b.booking)_value, 0),
      avg_booking_value: directBookings.length > 0 
        ? directBookings.reduce((sum, b) => sum + [b.booking](http://b.booking)_value, 0) / directBookings.length 
        : 0,
      conversion_rate: inquiries.length > 0 ? directBookings.length / inquiries.length : 0
    };
  }
  
  private async calculateAssistedAttribution(
    supplierId: string,
    timeRange: DateRange
  ): Promise<AssistedAttribution> {
    
    // Track bookings where directory played a supporting role
    const assistedBookings = await this.getAssistedBookings(supplierId, timeRange);
    
    return {
      assisted_booking_count: assistedBookings.length,
      assisted_revenue: assistedBookings.reduce((sum, b) => sum + ([b.booking](http://b.booking)_value * 0.3), 0), // 30% attribution
      touchpoint_influence: await this.calculateTouchpointInfluence(assistedBookings)
    };
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
  const [roiData, setROIData] = useState<ROIReport | null>(null);
  const [comparisonData, setComparisonData] = useState<ROIComparison | null>(null);
  
  useEffect(() => {
    Promise.all([
      loadROIReport(supplierId, timeRange),
      loadROIComparison(supplierId, timeRange)
    ]).then(([report, comparison]) => {
      setROIData(report);
      setComparisonData(comparison);
    });
  }, [supplierId, timeRange]);
  
  if (!roiData) return <ROIDashboardLoading />;
  
  return (
    <div className="roi-dashboard">
      <DashboardHeader>
        <h2>Directory ROI Analysis</h2>
        <TimeRangeSelector 
          value={timeRange} 
          onChange={setTimeRange}
          presets={[
            { label: 'Last 3 months', value: { start: subMonths(new Date(), 3), end: new Date() } },
            { label: 'Last 6 months', value: { start: subMonths(new Date(), 6), end: new Date() } },
            { label: 'Last 12 months', value: { start: subMonths(new Date(), 12), end: new Date() } }
          ]}
        />
      </DashboardHeader>
      
      <div className="roi-summary">
        <ROISummaryCard
          title="Total ROI"
          value={`${roiData.roi_[metrics.total](http://metrics.total)_roi_percentage.toFixed(1)}%`}
          trend={comparisonData?.roi_trend}
          status={roiData.roi_[metrics.total](http://metrics.total)_roi_percentage > 100 ? 'positive' : 'negative'}
        />
        
        <ROISummaryCard
          title="Payback Period"
          value={`${roiData.roi_metrics.payback_period_months.toFixed(1)} months`}
          benchmark={comparisonData?.industry_avg_payback}
        />
        
        <ROISummaryCard
          title="Cost per Booking"
          value={formatCurrency(roiData.roi_metrics.cost_per_booking)}
          trend={comparisonData?.cost_per_booking_trend}
        />
        
        <ROISummaryCard
          title="Revenue Generated"
          value={formatCurrency(roiData.generated_revenue.attributed_revenue)}
          subtitle={`From ${roiData.generated_[revenue.direct](http://revenue.direct)_bookings.length} bookings`}
        />
      </div>
      
      <div className="roi-analysis">
        <div className="revenue-breakdown">
          <RevenueBreakdownChart revenue={roiData.generated_revenue} />
        </div>
        
        <div className="cost-analysis">
          <CostAnalysisChart costs={roiData.cost_analysis} />
        </div>
      </div>
      
      <div className="performance-insights">
        <PerformanceBreakdownTable breakdown={roiData.performance_breakdown} />
        <ROIRecommendations recommendations={roiData.recommendations} />
      </div>
      
      <div className="detailed-attribution">
        <AttributionModelChart 
          directRevenue={roiData.generated_revenue.attributed_revenue}
          assistedRevenue={roiData.generated_revenue.pipeline_value}
          referralRevenue={roiData.generated_revenue.referral_revenue}
        />
      </div>
    </div>
  );
}
```

### Cost Analysis Engine

```
export class CostAnalysisEngine {
  async calculateTotalCosts(
    supplierId: string,
    timeRange: DateRange
  ): Promise<CostBreakdown> {
    
    const subscriptionCosts = await this.getSubscriptionCosts(supplierId, timeRange);
    const additionalCosts = await this.getAdditionalCosts(supplierId, timeRange);
    const opportunityCosts = await this.calculateOpportunityCosts(supplierId, timeRange);
    
    return {
      direct_costs: {
        subscription_fees: [subscriptionCosts.total](http://subscriptionCosts.total),
        premium_features: additionalCosts.premium_features,
        profile_optimization: additionalCosts.profile_optimization,
        additional_services: additionalCosts.additional_services
      },
      indirect_costs: {
        time_investment: await this.calculateTimeInvestment(supplierId, timeRange),
        opportunity_cost: opportunityCosts.estimated_value,
        content_creation: await this.estimateContentCreationCost(supplierId)
      },
      total_investment: [subscriptionCosts.total](http://subscriptionCosts.total) + [additionalCosts.total](http://additionalCosts.total) + opportunityCosts.estimated_value
    };
  }
  
  private async calculateTimeInvestment(
    supplierId: string,
    timeRange: DateRange
  ): Promise<TimeInvestmentCost> {
    
    const activities = await this.getSupplierActivities(supplierId, timeRange);
    
    const timeSpent = {
      profile_management: activities.filter(a => a.type === 'profile_update').length * 0.5, // 30 min avg
      inquiry_responses: activities.filter(a => a.type === 'inquiry_response').length * 0.25, // 15 min avg
      content_updates: activities.filter(a => a.type === 'content_update').length * 1, // 1 hour avg
      analytics_review: activities.filter(a => a.type === 'analytics_view').length * 0.17 // 10 min avg
    };
    
    const totalHours = Object.values(timeSpent).reduce((sum, hours) => sum + hours, 0);
    const hourlyRate = await this.getSupplierHourlyRate(supplierId);
    
    return {
      total_hours: totalHours,
      hourly_rate: hourlyRate,
      total_cost: totalHours * hourlyRate,
      activity_breakdown: timeSpent
    };
  }
}
```

### Predictive ROI Modeling

```
export class ROIPredictionEngine {
  async predictFutureROI(
    supplierId: string,
    projectionMonths: number
  ): Promise<ROIPrediction> {
    
    const historicalData = await this.getHistoricalROIData(supplierId, 12); // 12 months history
    const seasonalFactors = await this.getSeasonalFactors(supplierId);
    const marketTrends = await this.getMarketTrends();
    
    const predictions = [];
    
    for (let month = 1; month <= projectionMonths; month++) {
      const futureDate = addMonths(new Date(), month);
      const seasonalMultiplier = this.getSeasonalMultiplier(futureDate, seasonalFactors);
      const trendMultiplier = this.getTrendMultiplier(month, marketTrends);
      
      // Base prediction from historical average
      const basePrediction = this.calculateBasePrediction(historicalData);
      
      // Apply seasonal and trend adjustments
      const adjustedPrediction = {
        month: month,
        date: futureDate,
        predicted_inquiries: Math.round(basePrediction.avg_monthly_inquiries * seasonalMultiplier * trendMultiplier),
        predicted_bookings: Math.round(basePrediction.avg_monthly_bookings * seasonalMultiplier * trendMultiplier),
        predicted_revenue: basePrediction.avg_monthly_revenue * seasonalMultiplier * trendMultiplier,
        predicted_roi: this.calculatePredictedROI(basePrediction, seasonalMultiplier, trendMultiplier),
        confidence_level: this.calculateConfidence(month, historicalData.length)
      };
      
      predictions.push(adjustedPrediction);
    }
    
    return {
      supplier_id: supplierId,
      projection_months: projectionMonths,
      predictions: predictions,
      assumptions: this.getModelAssumptions(),
      confidence_factors: this.getConfidenceFactors(historicalData)
    };
  }
  
  private calculateConfidence(monthsOut: number, historicalDataPoints: number): number {
    // Confidence decreases with time and increases with historical data
    const timeDecay = Math.exp(-monthsOut / 12); // Exponential decay over time
    const dataConfidence = Math.min(historicalDataPoints / 12, 1); // Max confidence with 12+ months data
    
    return timeDecay * dataConfidence;
  }
}
```

### ROI Benchmarking System

```
export async function generateROIBenchmark(
  supplierId: string,
  timeRange: DateRange
): Promise<ROIBenchmark> {
  
  const supplier = await getSupplier(supplierId);
  const supplierROI = await calculateSupplierROI(supplierId, timeRange);
  
  // Get benchmark data for similar suppliers
  const peerGroup = await getPeerGroup(supplier.category, supplier.location, [supplier.business](http://supplier.business)_size);
  const peerROIData = await Promise.all(
    [peerGroup.map](http://peerGroup.map)(peer => calculateSupplierROI([peer.id](http://peer.id), timeRange))
  );
  
  const industryStats = {
    median_roi: calculateMedian([peerROIData.map](http://peerROIData.map)(p => [p.total](http://p.total)_roi_percentage)),
    percentile_25: calculatePercentile([peerROIData.map](http://peerROIData.map)(p => [p.total](http://p.total)_roi_percentage), 25),
    percentile_75: calculatePercentile([peerROIData.map](http://peerROIData.map)(p => [p.total](http://p.total)_roi_percentage), 75),
    top_10_percent: calculatePercentile([peerROIData.map](http://peerROIData.map)(p => [p.total](http://p.total)_roi_percentage), 90)
  };
  
  return {
    supplier_roi: [supplierROI.total](http://supplierROI.total)_roi_percentage,
    industry_median: industryStats.median_roi,
    percentile_rank: calculatePercentileRank(
      [supplierROI.total](http://supplierROI.total)_roi_percentage,
      [peerROIData.map](http://peerROIData.map)(p => [p.total](http://p.total)_roi_percentage)
    ),
    performance_tier: categorizePerformance(
      [supplierROI.total](http://supplierROI.total)_roi_percentage,
      industryStats
    ),
    improvement_potential: [industryStats.top](http://industryStats.top)_10_percent - [supplierROI.total](http://supplierROI.total)_roi_percentage,
    peer_comparison: {
      better_than_percent: calculateBetterThanPercent(
        [supplierROI.total](http://supplierROI.total)_roi_percentage,
        [peerROIData.map](http://peerROIData.map)(p => [p.total](http://p.total)_roi_percentage)
      ),
      key_differentiators: await identifyKeyDifferentiators(supplierId, peerGroup)
    }
  };
}
```

### Automated ROI Reporting

```
export class AutomatedROIReporting {
  async generateMonthlyROIReport(supplierId: string): Promise<void> {
    const lastMonth = {
      start: startOfMonth(subMonths(new Date(), 1)),
      end: endOfMonth(subMonths(new Date(), 1))
    };
    
    const roiReport = await this.generateROIReport(supplierId, lastMonth);
    const benchmark = await generateROIBenchmark(supplierId, lastMonth);
    
    // Generate insights and recommendations
    const insights = await this.generateROIInsights(roiReport, benchmark);
    
    // Create PDF report
    const pdfReport = await this.createPDFReport(roiReport, benchmark, insights);
    
    // Send to supplier
    await this.sendROIReportEmail(supplierId, pdfReport, insights);
    
    // Store in database for historical tracking
    await this.storeROIReport(supplierId, roiReport, benchmark);
  }
  
  private async generateROIInsights(
    roiReport: ROIReport,
    benchmark: ROIBenchmark
  ): Promise<ROIInsight[]> {
    
    const insights: ROIInsight[] = [];
    
    // Performance vs benchmark
    if (roiReport.roi_[metrics.total](http://metrics.total)_roi_percentage > benchmark.industry_median) {
      insights.push({
        type: 'positive',
        category: 'performance',
        title: 'Above Industry Average',
        description: `Your ROI of ${roiReport.roi_[metrics.total](http://metrics.total)_roi_percentage.toFixed(1)}% is ${(roiReport.roi_[metrics.total](http://metrics.total)_roi_percentage - benchmark.industry_median).toFixed(1)}% above the industry median.`,
        action_items: ['Maintain current strategy', 'Consider scaling successful tactics']
      });
    } else {
      insights.push({
        type: 'improvement',
        category: 'performance',
        title: 'Below Industry Average',
        description: `Your ROI is ${(benchmark.industry_median - roiReport.roi_[metrics.total](http://metrics.total)_roi_percentage).toFixed(1)}% below industry median. Potential for improvement.`,
        action_items: await this.generateImprovementActions(roiReport)
      });
    }
    
    // Cost efficiency insights
    if (roiReport.roi_metrics.cost_per_booking > benchmark.peer_comparison.avg_cost_per_booking) {
      insights.push({
        type: 'warning',
        category: 'efficiency',
        title: 'High Cost per Booking',
        description: `Your cost per booking (${formatCurrency(roiReport.roi_metrics.cost_per_booking)}) is above peer average.`,
        action_items: ['Optimize profile for better conversion', 'Review response time and quality', 'Consider premium features']
      });
    }
    
    return insights;
  }
}
```

### Database Schema

```
CREATE TABLE roi_reports (
  id UUID PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id),
  report_period_start DATE,
  report_period_end DATE,
  total_investment DECIMAL(10,2),
  attributed_revenue DECIMAL(10,2),
  roi_percentage DECIMAL(5,2),
  payback_period_months DECIMAL(4,2),
  cost_per_lead DECIMAL(8,2),
  cost_per_booking DECIMAL(8,2),
  booking_count INTEGER,
  inquiry_count INTEGER,
  report_data JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE revenue_attribution (
  id UUID PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id),
  booking_id UUID,
  inquiry_id UUID REFERENCES inquiries(id),
  attribution_type VARCHAR(20) CHECK (attribution_type IN ('direct', 'assisted', 'referral')),
  attribution_percentage DECIMAL(3,2),
  attributed_revenue DECIMAL(10,2),
  booking_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE roi_benchmarks (
  category VARCHAR(50),
  location_region VARCHAR(100),
  business_size VARCHAR(20),
  time_period DATE,
  median_roi DECIMAL(5,2),
  percentile_25_roi DECIMAL(5,2),
  percentile_75_roi DECIMAL(5,2),
  avg_cost_per_booking DECIMAL(8,2),
  avg_payback_months DECIMAL(4,2),
  sample_size INTEGER,
  PRIMARY KEY (category, location_region, business_size, time_period)
);

CREATE INDEX idx_roi_reports_supplier_period 
ON roi_reports(supplier_id, report_period_start, report_period_end);

CREATE INDEX idx_revenue_attribution_supplier 
ON revenue_attribution(supplier_id, booking_date);

CREATE INDEX idx_benchmarks_lookup 
ON roi_benchmarks(category, location_region, time_period);
```