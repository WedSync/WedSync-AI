# 03-user-analytics.md

## What to Build

Implement comprehensive user analytics to track engagement, feature adoption, and user journeys across WedSync supplier platform and WedMe couple platform. Use PostHog for product analytics and custom tracking for business-specific metrics.

## PostHog Configuration

```
// lib/analytics/posthog.ts
import posthog from 'posthog-js'
import { User } from '@supabase/supabase-js'

export function initPostHog() {
  if (typeof window !== 'undefined') {
    posthog.init([process.env.NEXT](http://process.env.NEXT)_PUBLIC_POSTHOG_KEY!, {
      api_host: [process.env.NEXT](http://process.env.NEXT)_PUBLIC_POSTHOG_HOST || '[https://app.posthog.com](https://app.posthog.com)',
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') posthog.opt_out_capturing()
      },
      autocapture: true,
      capture_pageview: false, // We'll handle this manually
      capture_pageleave: true,
      cross_subdomain_cookie: true,
      persistence: 'localStorage+cookie',
    })
  }
}

export function identifyUser(user: User, metadata?: any) {
  if (typeof window !== 'undefined') {
    posthog.identify([user.id](http://user.id), {
      email: [user.email](http://user.email),
      created_at: user.created_at,
      ...metadata,
      // Supplier-specific properties
      vendor_type: user.user_metadata?.vendor_type,
      subscription_tier: user.user_metadata?.tier,
      business_name: user.user_metadata?.business_name,
    })
    
    // Set super properties that get sent with every event
    posthog.register({
      platform: user.user_metadata?.is_couple ? 'wedme' : 'wedsync',
      user_type: user.user_metadata?.is_couple ? 'couple' : 'supplier',
    })
  }
}
```

## Event Tracking System

```
// lib/analytics/events.ts
export const trackEvent = (
  eventName: string,
  properties?: Record<string, any>
) => {
  if (typeof window !== 'undefined') {
    posthog.capture(eventName, {
      ...properties,
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      page_title: document.title,
    })
  }
}

// Predefined events for consistency
export const Events = {
  // Onboarding events
  SIGNUP_STARTED: 'signup_started',
  VENDOR_TYPE_SELECTED: 'vendor_type_selected',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  
  // Form events
  FORM_CREATED: 'form_created',
  FORM_PUBLISHED: 'form_published',
  FORM_SUBMISSION_RECEIVED: 'form_submission_received',
  FIELD_ADDED: 'form_field_added',
  
  // Client management
  CLIENT_ADDED: 'client_added',
  CLIENT_IMPORTED: 'clients_imported',
  CLIENT_CONNECTED: 'client_connected_wedme',
  
  // Journey events
  JOURNEY_CREATED: 'journey_created',
  JOURNEY_ACTIVATED: 'journey_activated',
  MODULE_ADDED: 'journey_module_added',
  
  // Engagement
  DASHBOARD_VIEWED: 'dashboard_viewed',
  FEATURE_DISCOVERED: 'feature_discovered',
  HELP_ACCESSED: 'help_accessed',
} as const
```

## Page View Tracking

```
// hooks/usePageTracking.ts
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import posthog from 'posthog-js'

export function usePageTracking() {
  const router = useRouter()
  
  useEffect(() => {
    // Track initial page view
    posthog.capture('$pageview')
    
    const handleRouteChange = (url: string) => {
      posthog.capture('$pageview', {
        url,
        referrer: document.referrer,
      })
    }
    
    [router.events](http://router.events).on('routeChangeComplete', handleRouteChange)
    
    return () => {
      [router.events](http://router.events).off('routeChangeComplete', handleRouteChange)
    }
  }, [[router.events](http://router.events)])
}
```

## Feature Adoption Tracking

```
// lib/analytics/feature-adoption.ts
interface FeatureAdoption {
  feature: string
  firstUsed: Date
  lastUsed: Date
  useCount: number
  userId: string
}

export class FeatureTracker {
  private features: Map<string, FeatureAdoption> = new Map()
  
  async trackFeatureUse(userId: string, feature: string) {
    const existing = this.features.get(`${userId}:${feature}`)
    
    if (existing) {
      existing.lastUsed = new Date()
      existing.useCount++
    } else {
      this.features.set(`${userId}:${feature}`, {
        feature,
        firstUsed: new Date(),
        lastUsed: new Date(),
        useCount: 1,
        userId,
      })
      
      // Track first use
      trackEvent('feature_first_use', { feature })
    }
    
    // Track usage
    trackEvent('feature_used', {
      feature,
      use_count: existing?.useCount || 1,
    })
    
    // Check for power user status
    if (existing?.useCount === 10) {
      trackEvent('feature_power_user', { feature })
    }
  }
  
  getAdoptionMetrics(userId: string) {
    const userFeatures = Array.from(this.features.values())
      .filter(f => f.userId === userId)
    
    return {
      totalFeatures: userFeatures.length,
      activeFeatures: userFeatures.filter(
        f => f.lastUsed > new Date([Date.now](http://Date.now)() - 7 * 24 * 60 * 60 * 1000)
      ).length,
      powerFeatures: userFeatures.filter(f => f.useCount >= 10),
    }
  }
}
```

## Funnel Analytics

```
// lib/analytics/funnels.ts
export class FunnelTracker {
  private funnelSteps: Map<string, string[]> = new Map()
  
  defineFunnel(name: string, steps: string[]) {
    this.funnelSteps.set(name, steps)
  }
  
  trackStep(funnelName: string, step: string, properties?: any) {
    const steps = this.funnelSteps.get(funnelName)
    if (!steps) return
    
    const stepIndex = steps.indexOf(step)
    if (stepIndex === -1) return
    
    trackEvent(`funnel_${funnelName}_step`, {
      step_name: step,
      step_index: stepIndex,
      total_steps: steps.length,
      ...properties,
    })
    
    // Track completion
    if (stepIndex === steps.length - 1) {
      trackEvent(`funnel_${funnelName}_completed`, properties)
    }
  }
}

// Define key funnels
const funnels = new FunnelTracker()

funnels.defineFunnel('supplier_onboarding', [
  'signup_started',
  'vendor_type_selected',
  'account_created',
  'clients_imported',
  'first_form_created',
  'onboarding_completed',
])

funnels.defineFunnel('form_creation', [
  'form_builder_opened',
  'first_field_added',
  'form_saved',
  'form_published',
  'first_submission_received',
])
```

## Session Recording

```
// lib/analytics/session-recording.ts
export function initSessionRecording(user: User) {
  // Only record for specific user segments
  if (user.user_metadata?.tier === 'free') {
    posthog.startSessionRecording()
  }
  
  // Mask sensitive data
  posthog.set_config({
    session_recording: {
      maskAllInputs: false,
      maskInputOptions: {
        password: true,
        email: true,
        credit_card: true,
      },
      maskTextSelector: '.sensitive-data',
    },
  })
}
```

## Cohort Analysis

```
// lib/analytics/cohorts.ts
export async function analyzeCohorts() {
  const cohorts = await fetch('/api/analytics/cohorts').then(r => r.json())
  
  return {
    weeklySignups: groupByWeek(cohorts.signups),
    retentionByWeek: calculateRetention(cohorts.activity),
    featureAdoptionByTier: groupByTier(cohorts.features),
    conversionBySource: groupBySource(cohorts.conversions),
  }
}

function calculateRetention(activity: any[]) {
  const cohorts = new Map()
  
  activity.forEach(user => {
    const signupWeek = getWeek(user.created_at)
    const activeWeeks = user.active_weeks
    
    if (!cohorts.has(signupWeek)) {
      cohorts.set(signupWeek, [])
    }
    
    cohorts.get(signupWeek).push(activeWeeks.length)
  })
  
  return Array.from(cohorts.entries()).map(([week, users]) => ({
    week,
    week1: users.filter(w => w >= 1).length / users.length,
    week2: users.filter(w => w >= 2).length / users.length,
    week4: users.filter(w => w >= 4).length / users.length,
    week8: users.filter(w => w >= 8).length / users.length,
  }))
}
```

## A/B Testing Framework

```
// lib/analytics/ab-testing.ts
export class ABTest {
  private experiments: Map<string, Experiment> = new Map()
  
  defineExperiment(name: string, variants: string[]) {
    this.experiments.set(name, {
      name,
      variants,
      assignments: new Map(),
    })
  }
  
  getVariant(experimentName: string, userId: string): string {
    const experiment = this.experiments.get(experimentName)
    if (!experiment) return 'control'
    
    // Check existing assignment
    if (experiment.assignments.has(userId)) {
      return experiment.assignments.get(userId)!
    }
    
    // Assign variant
    const variant = this.assignVariant(experiment, userId)
    experiment.assignments.set(userId, variant)
    
    // Track assignment
    trackEvent('experiment_assigned', {
      experiment: experimentName,
      variant,
      user_id: userId,
    })
    
    return variant
  }
  
  private assignVariant(experiment: Experiment, userId: string): string {
    // Simple hash-based assignment
    const hash = userId.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0)
    }, 0)
    
    const index = hash % experiment.variants.length
    return experiment.variants[index]
  }
  
  trackConversion(experimentName: string, userId: string) {
    const variant = this.getVariant(experimentName, userId)
    
    trackEvent('experiment_conversion', {
      experiment: experimentName,
      variant,
      user_id: userId,
    })
  }
}
```

## Analytics Dashboard

```
// app/admin/analytics/page.tsx
export default async function AnalyticsDashboard() {
  const metrics = await getAnalyticsMetrics()
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">User Analytics</h1>
      
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard title="DAU" value={metrics.dau} trend={metrics.dauTrend} />
        <MetricCard title="WAU" value={metrics.wau} trend={metrics.wauTrend} />
        <MetricCard title="MAU" value={metrics.mau} trend={metrics.mauTrend} />
        <MetricCard title="Stickiness" value={`${metrics.stickiness}%`} />
      </div>
      
      <FunnelChart 
        data={metrics.onboardingFunnel}
        title="Onboarding Funnel"
      />
      
      <RetentionChart 
        data={metrics.retention}
        title="User Retention"
      />
      
      <FeatureAdoptionTable 
        features={metrics.featureAdoption}
      />
    </div>
  )
}
```

## Critical Implementation Notes

- **Privacy first** - Always get consent and allow opt-out
- **Mask sensitive data** - Never track passwords, credit cards, or PII
- **Track meaningful events** - Focus on business value, not vanity metrics
- **Segment users** - Analyze by tier, vendor type, and engagement level
- **Monitor data quality** - Validate events are firing correctly
- **Set up alerts** - Notify on significant metric changes
- **Regular reviews** - Weekly analytics review meetings
- **Act on insights** - Use data to drive product decisions