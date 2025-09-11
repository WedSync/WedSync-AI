# AB-Testing

## What to Build

A/B testing and experimentation framework with feature flags, allowing data-driven product decisions and controlled feature rollouts.

## Key Technical Requirements

### Experiment Structure

```tsx
interface Experiment {
  id: string
  name: string
  hypothesis: string
  status: 'draft' | 'running' | 'completed' | 'aborted'
  variants: Variant[]
  metrics: ExperimentMetric[]
  allocation: AllocationStrategy
  results?: ExperimentResults
  startDate: Date
  endDate?: Date
}

interface Variant {
  id: string
  name: string
  description: string
  allocation: number // percentage
  config: any // variant-specific configuration
  participants: number
  conversions: number
}

interface ExperimentMetric {
  name: string
  type: 'primary' | 'secondary'
  goalType: 'increase' | 'decrease'
  currentValue: number
  targetValue: number
  statisticalSignificance?: number
}

interface FeatureFlag {
  key: string
  enabled: boolean
  rolloutPercentage: number
  targetingRules: TargetingRule[]
  variants: Record<string, any>
}

```

### Experiment Engine Implementation

```tsx
class ExperimentationEngine {
  private experiments: Map<string, Experiment> = new Map()

  async createExperiment(config: ExperimentConfig): Promise<Experiment> {
    const experiment: Experiment = {
      id: generateId(),
      name: config.name,
      hypothesis: config.hypothesis,
      status: 'draft',
      variants: config.variants,
      metrics: config.metrics,
      allocation: config.allocation || 'equal',
      startDate: config.startDate
    }

    // Validate experiment
    await this.validateExperiment(experiment)

    // Calculate sample size
    const sampleSize = this.calculateSampleSize(experiment)

    // Store experiment
    await db.experiments.create(experiment)

    return {
      ...experiment,
      estimatedDuration: this.estimateDuration(sampleSize),
      minimumSampleSize: sampleSize
    }
  }

  async assignUserToVariant(userId: string, experimentId: string): Promise<string> {
    const experiment = await this.getExperiment(experimentId)

    // Check if user already assigned
    const existing = await this.getUserAssignment(userId, experimentId)
    if (existing) return existing.variantId

    // Apply targeting rules
    if (!await this.isEligible(userId, experiment)) {
      return 'control'
    }

    // Assign based on allocation strategy
    const variant = this.selectVariant(userId, experiment)

    // Record assignment
    await db.experiment_assignments.create({
      user_id: userId,
      experiment_id: experimentId,
      variant_id: variant.id,
      assigned_at: new Date()
    })

    // Track in analytics
    await analytics.track('experiment_exposure', {
      userId,
      experimentId,
      variantId: variant.id
    })

    return variant.id
  }

  private calculateSampleSize(experiment: Experiment): number {
    // Statistical power calculation
    const alpha = 0.05 // significance level
    const power = 0.8 // statistical power
    const mde = 0.1 // minimum detectable effect

    const baseline = experiment.metrics[0].currentValue
    const variance = baseline * (1 - baseline) // for proportion metrics

    const zAlpha = 1.96 // for 95% confidence
    const zBeta = 0.84 // for 80% power

    const sampleSize =
      (2 * variance * Math.pow(zAlpha + zBeta, 2)) /
      Math.pow(mde, 2)

    return Math.ceil(sampleSize * experiment.variants.length)
  }
}

```

### A/B Testing Dashboard

```tsx
const ABTestingDashboard = () => {
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment>()

  return (
    <div className="ab-testing-dashboard">
      {/* Active Experiments */}
      <div className="experiments-grid">
        {experiments.map(experiment => (
          <ExperimentCard
            key={experiment.id}
            experiment={experiment}
            onClick={() => setSelectedExperiment(experiment)}
          />
        ))}
      </div>

      {/* Experiment Details */}
      {selectedExperiment && (
        <ExperimentDetails
          experiment={selectedExperiment}
          onAction={(action) => handleExperimentAction(selectedExperiment, action)}
        />
      )}

      {/* Feature Flags */}
      <FeatureFlagManager
        flags={featureFlags}
        onToggle={(flag) => toggleFeatureFlag(flag)}
        onEdit={(flag) => editFeatureFlag(flag)}
      />
    </div>
  )
}

const ExperimentResults = ({ experiment }: { experiment: Experiment }) => {
  const results = useExperimentResults(experiment.id)

  return (
    <div className="experiment-results">
      {/* Conversion Rates by Variant */}
      <div className="variant-performance">
        {experiment.variants.map(variant => (
          <VariantCard key={variant.id}>
            <h4>{variant.name}</h4>
            <div className="metrics">
              <Metric
                label="Participants"
                value={results[variant.id].participants}
              />
              <Metric
                label="Conversion Rate"
                value={`${results[variant.id].conversionRate}%`}
                change={results[variant.id].lift}
              />
              <Metric
                label="Statistical Significance"
                value={`${results[variant.id].significance}%`}
                status={results[variant.id].significance > 95 ? 'significant' : 'not-significant'}
              />
            </div>
          </VariantCard>
        ))}
      </div>

      {/* Conversion Over Time */}
      <ConversionChart
        data={results.timeSeriesData}
        variants={experiment.variants}
      />

      {/* Statistical Analysis */}
      <StatisticalAnalysis
        control={results.control}
        variants={results.variants}
        metrics={experiment.metrics}
      />

      {/* Recommendation */}
      <ExperimentRecommendation
        winner={results.winner}
        confidence={results.confidence}
        expectedImpact={results.expectedImpact}
      />
    </div>
  )
}

```

### Feature Flag Implementation

```tsx
class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map()

  async evaluateFlag(
    flagKey: string,
    userId: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    const flag = await this.getFlag(flagKey)

    if (!flag || !flag.enabled) {
      return false
    }

    // Check targeting rules
    for (const rule of flag.targetingRules) {
      if (await this.evaluateRule(rule, userId, context)) {
        return true
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const hash = this.hashUserId(userId, flagKey)
      return hash <= flag.rolloutPercentage
    }

    return true
  }

  private async evaluateRule(
    rule: TargetingRule,
    userId: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    switch (rule.type) {
      case 'user_segment':
        return await this.checkUserSegment(userId, rule.segment)

      case 'user_attribute':
        return await this.checkUserAttribute(userId, rule.attribute, rule.value)

      case 'context':
        return this.checkContext(context, rule.key, rule.value)

      case 'percentage':
        return this.hashUserId(userId, rule.salt) <= rule.percentage

      default:
        return false
    }
  }

  async createGradualRollout(
    flagKey: string,
    schedule: RolloutSchedule
  ) {
    const flag = await this.getFlag(flagKey)

    // Schedule progressive rollout
    for (const step of schedule.steps) {
      await this.scheduleRolloutStep(flag, step)
    }

    // Monitor for issues
    this.monitorRollout(flag, schedule)
  }
}

```

### Experiment Analysis

```tsx
class ExperimentAnalyzer {
  async analyzeResults(experimentId: string): Promise<ExperimentResults> {
    const experiment = await this.getExperiment(experimentId)
    const assignments = await this.getAssignments(experimentId)

    // Calculate conversion rates
    const variantResults = await Promise.all(
      experiment.variants.map(async (variant) => {
        const participants = assignments.filter(a => a.variant_id === variant.id)
        const conversions = await this.getConversions(participants, experiment.metrics[0])

        return {
          variantId: variant.id,
          participants: participants.length,
          conversions: conversions.length,
          conversionRate: conversions.length / participants.length,
          confidence: this.calculateConfidence(conversions.length, participants.length)
        }
      })
    )

    // Perform statistical tests
    const significance = this.performChiSquareTest(variantResults)

    // Determine winner
    const winner = this.determineWinner(variantResults, significance)

    return {
      variantResults,
      significance,
      winner,
      recommendation: this.generateRecommendation(winner, significance)
    }
  }

  private performChiSquareTest(results: any[]): number {
    // Chi-square test implementation
    // Returns p-value
    return 0.03 // placeholder
  }
}

```

## Critical Implementation Notes

- Never change experiment configuration mid-flight
- Ensure consistent user assignment (sticky sessions)
- Monitor for Simpson's Paradox in results
- Consider novelty effects in early results
- Implement guardrail metrics to prevent harm
- Document all experiments for knowledge sharing
- Use feature flags for emergency rollback capability

## Database Structure

```sql
-- Experiments table
CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  hypothesis TEXT,
  status TEXT CHECK (status IN ('draft', 'running', 'completed', 'aborted')),
  variants JSONB NOT NULL,
  metrics JSONB NOT NULL,
  allocation_strategy TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  results JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Experiment assignments
CREATE TABLE experiment_assignments (
  user_id UUID REFERENCES users(id),
  experiment_id UUID REFERENCES experiments(id),
  variant_id TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, experiment_id)
);

CREATE INDEX idx_assignments_experiment ON experiment_assignments(experiment_id, variant_id);

-- Feature flags
CREATE TABLE feature_flags (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0,
  targeting_rules JSONB,
  variants JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature flag evaluations (for analysis)
CREATE TABLE flag_evaluations (
  flag_key TEXT REFERENCES feature_flags(key),
  user_id UUID,
  result BOOLEAN,
  context JSONB,
  evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_flag_evaluations ON flag_evaluations(flag_key, evaluated_at DESC);

```