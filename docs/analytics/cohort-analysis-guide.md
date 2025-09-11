# WedSync Cohort Analysis Guide

## Overview

The WedSync Cohort Analysis System (WS-181) provides comprehensive insights into supplier and customer lifecycle patterns within the wedding industry. This guide covers usage, interpretation, and best practices for leveraging cohort analysis to drive business decisions.

## What is Cohort Analysis?

Cohort analysis tracks groups of users who share common characteristics or experiences over time. In WedSync's wedding industry context, cohorts typically represent:

- **Supplier Cohorts**: Groups of wedding suppliers who joined during specific time periods
- **Customer Cohorts**: Groups of couples who engaged services during specific seasons
- **Feature Cohorts**: Users who adopted specific platform features together
- **Geographic Cohorts**: Users from specific markets or regions

## Key Metrics

### Retention Rates
- **Month 1**: Percentage of cohort active after 30 days
- **Month 3**: Percentage active after 90 days (critical wedding planning period)
- **Month 6**: Mid-term retention during active planning phase
- **Month 12**: Annual retention including post-wedding engagement

### Lifetime Value (LTV)
Calculated using wedding industry-specific multipliers:
```
LTV = (Average Monthly Revenue × Average Lifespan × Industry Multiplier)
```

**Industry Multipliers by Supplier Type:**
- Venues: 2.8x (highest investment, longest planning cycles)
- Photographers: 2.1x (moderate investment, strong referral patterns)
- Caterers: 2.5x (high value, seasonal variations)
- Florists: 1.8x (lower individual value, high volume potential)

### Seasonal Adjustments

Wedding industry shows strong seasonal patterns:
- **Spring (Mar-May)**: 23% higher LTV, peak engagement season
- **Summer (Jun-Aug)**: 15% higher LTV, peak wedding season
- **Fall (Sep-Nov)**: 18% higher LTV, second peak season
- **Winter (Dec-Feb)**: 15% lower LTV, planning and vendor selection period

## Using the Cohort Analysis Dashboard

### Accessing Cohort Data

1. **Executive Dashboard**: High-level cohort insights and trends
2. **Marketing Dashboard**: Acquisition and retention cohort analysis
3. **Product Dashboard**: Feature adoption and usage cohorts
4. **Supplier Dashboard**: Supplier lifecycle and performance cohorts

### Creating Custom Cohorts

```typescript
// Example: Create spring photographer cohort
const cohort = await createCohort({
  name: "Spring 2024 Photographers",
  startDate: "2024-03-01",
  endDate: "2024-05-31",
  filters: {
    supplierType: "photographer",
    acquisitionChannel: ["organic", "referral"]
  },
  metrics: ["retention", "ltv", "revenue", "referrals"]
});
```

### Interpreting Results

#### Retention Rate Analysis
- **>35% at 12 months**: Exceptional performance
- **25-35% at 12 months**: Above industry average
- **15-25% at 12 months**: Industry average
- **<15% at 12 months**: Below average, investigate causes

#### LTV Benchmarks by Supplier Type
- **Venues**: $4,200-5,800 (high-end market leaders)
- **Photographers**: $2,200-3,200 (quality and reputation dependent)
- **Caterers**: $3,500-4,500 (service level and market positioning)
- **Florists**: $1,800-2,400 (volume and specialization focused)

## Wedding Industry Patterns

### Seasonal Cohort Performance

**Spring Cohorts (March-May)**
- Highest LTV potential (23% above average)
- Peak supplier onboarding period
- Optimal time for marketing investment
- Higher retention rates due to immediate booking needs

**Fall Cohorts (September-November)**
- Second-highest performance (18% above average)
- Strong referral patterns from summer weddings
- Good balance of supply and demand
- Effective for long-term relationship building

**Winter Cohorts (December-February)**
- Lower immediate LTV but strong foundation building
- Focus on education and relationship development
- Opportunity for competitive advantage through superior service
- Higher churn risk requires proactive engagement

### Supplier Type Cohort Characteristics

**Photographer Cohorts**
- Quick initial engagement (high Month 1 retention)
- Strong referral networks boost long-term value
- Portfolio quality significantly impacts retention
- Seasonal availability affects booking patterns

**Venue Cohorts**
- Longest sales cycles but highest LTV
- Location and capacity drive retention patterns
- Strong network effects within geographic areas
- Premium venues show exceptional cohort performance

**Caterer Cohorts**
- Menu diversity impacts retention and expansion
- Strong seasonal patterns tied to wedding trends
- Local market dynamics heavily influence performance
- Quality consistency critical for long-term success

## Cohort Segmentation Strategies

### High-Value Segments
1. **Premium Spring Photographers**: 23% higher LTV, 15% better retention
2. **Metropolitan Venues**: Geographic premium, strong network effects
3. **Full-Service Planners**: High LTV, strong cross-sell opportunities
4. **Established Caterers**: Proven track record, consistent performance

### Growth Opportunities
1. **Emerging Markets**: Lower saturation, growth potential
2. **Specialty Services**: Unique offerings, premium pricing
3. **Technology Adopters**: Higher platform engagement, better metrics
4. **Referral Networks**: Existing relationship leverage

### At-Risk Segments
1. **Winter-Only Suppliers**: Seasonal dependency, limited growth
2. **Single-Service Providers**: Limited expansion opportunities
3. **Price-Focused Segments**: Low margins, high churn risk
4. **Inconsistent Quality**: Reputation risks, retention challenges

## Business Decision Framework

### Marketing Optimization
Use cohort analysis to optimize marketing spend:

```
ROI by Acquisition Channel = (Cohort LTV - Customer Acquisition Cost) / CAC
```

**Channel Performance Rankings:**
1. **Referrals**: 3.2x ROI, highest retention rates
2. **Organic Search**: 2.8x ROI, strong intent signals  
3. **Industry Events**: 2.4x ROI, quality relationships
4. **Paid Social**: 1.9x ROI, scalable but requires optimization
5. **Paid Search**: 1.6x ROI, competitive landscape challenges

### Product Development Priorities
Prioritize features based on cohort impact:

1. **High-Impact, High-Adoption**: Core platform improvements
2. **High-Impact, Low-Adoption**: Focus on user education and onboarding
3. **Low-Impact, High-Adoption**: Maintain but don't over-invest
4. **Low-Impact, Low-Adoption**: Consider deprecation or major redesign

### Supplier Success Programs
Design intervention programs based on cohort performance:

**Month 1**: Onboarding optimization
- 95%+ retention target
- Profile completion requirements
- Initial booking facilitation

**Month 3**: Engagement acceleration
- 68%+ retention target
- Performance coaching
- Network introduction programs

**Month 6**: Value demonstration
- 45%+ retention target
- Success story development
- Expansion opportunity identification

**Month 12**: Long-term partnership
- 32%+ retention target
- Advanced feature adoption
- Referral program enrollment

## Advanced Analysis Techniques

### Cohort Comparison Analysis
Compare cohorts across multiple dimensions:

```sql
-- Example: Compare seasonal photographer cohorts
WITH seasonal_cohorts AS (
  SELECT 
    season,
    AVG(ltv) as avg_ltv,
    AVG(retention_12_month) as retention_12m,
    COUNT(*) as cohort_size
  FROM cohort_analysis
  WHERE supplier_type = 'photographer'
  AND cohort_date >= '2023-01-01'
  GROUP BY season
)
SELECT * FROM seasonal_cohorts
ORDER BY avg_ltv DESC;
```

### Predictive Cohort Modeling
Use historical cohort data to predict future performance:

1. **Retention Prediction**: Model likelihood of Month 6 retention based on Month 1 behavior
2. **LTV Forecasting**: Predict 12-month LTV based on early engagement patterns
3. **Churn Prevention**: Identify at-risk cohort members for targeted intervention

### Cross-Cohort Analysis
Analyze interactions between different cohort types:

- **Geographic × Seasonal**: Market-specific seasonal patterns
- **Supplier Type × Acquisition Channel**: Channel effectiveness by service type
- **Feature Adoption × Performance**: Impact of platform usage on business outcomes

## Common Patterns and Insights

### Success Indicators
- **Early Engagement**: High Month 1 activity predicts long-term success
- **Network Effects**: Suppliers with peer connections show 40% higher retention
- **Platform Integration**: Full feature adoption correlates with 60% higher LTV
- **Quality Metrics**: Customer review scores directly impact supplier cohort performance

### Warning Signs
- **Declining Month 1 Retention**: Indicates onboarding issues
- **Seasonal Dependency**: Over-reliance on peak seasons creates vulnerability
- **Geographic Concentration**: Market risk from localized dependencies
- **Single-Channel Acquisition**: Lack of diversification limits growth

### Optimization Opportunities
- **Spring Campaign Focus**: 23% LTV boost justifies increased marketing spend
- **Referral Programs**: Highest ROI acquisition channel
- **Education Content**: Improves retention for complex service types
- **Performance Coaching**: Targeted support for underperforming cohorts

## Best Practices

### Analysis Frequency
- **Executive Reports**: Monthly cohort performance summaries
- **Operational Reviews**: Weekly cohort health monitoring
- **Strategic Planning**: Quarterly deep-dive cohort analysis
- **Campaign Optimization**: Real-time cohort performance tracking

### Data Quality Maintenance
- Regular validation of cohort calculation accuracy
- Seasonal adjustment factor updates
- Benchmark comparison with industry standards
- Anomaly detection and investigation

### Stakeholder Communication
- **Executives**: Focus on business impact and ROI
- **Marketing**: Emphasize acquisition and retention insights
- **Product**: Highlight feature adoption and user journey patterns
- **Customer Success**: Provide actionable supplier health indicators

## Troubleshooting Common Issues

### Low Retention Rates
1. **Analyze Onboarding Flow**: Identify friction points in initial experience
2. **Review Support Quality**: Assess customer success touchpoints
3. **Examine Competition**: Compare value proposition with alternatives
4. **Investigate Product-Market Fit**: Validate offering alignment with needs

### Inconsistent LTV Calculations
1. **Verify Data Quality**: Check for missing or incorrect revenue data
2. **Validate Time Periods**: Ensure consistent measurement windows
3. **Review Seasonal Adjustments**: Confirm appropriate multipliers
4. **Cross-Reference External Data**: Validate against industry benchmarks

### Seasonal Pattern Anomalies
1. **External Factor Analysis**: Consider market conditions and events
2. **Competitive Landscape**: Assess impact of new market entrants
3. **Product Changes**: Evaluate impact of platform updates
4. **Data Collection Issues**: Investigate potential measurement problems

## Getting Help

- **Technical Support**: Contact the analytics team for calculation questions
- **Business Insights**: Consult with customer success for interpretation guidance
- **Custom Analysis**: Request specialized cohort studies from data science team
- **Training Resources**: Access video tutorials and best practice documentation

---

*This guide is maintained by the WedSync Analytics Team. Last updated: January 2025*