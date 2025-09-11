import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Advanced conflict analysis algorithms
interface PhotoGroup {
  id: string
  name: string
  priority: number
  estimated_time_minutes: number
  timeline_slot?: string
  location?: string
  photo_type: string
  assignments?: { guest_id: string; is_primary: boolean }[]
}

interface ConflictAnalysis {
  conflicts: DetectedConflict[]
  severity_summary: SeveritySummary
  recommendations: ConflictRecommendation[]
  risk_assessment: RiskAssessment
}

interface DetectedConflict {
  id: string
  photo_group_id: string
  conflicting_group_id: string
  conflict_type: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  description: string
  impact_score: number
  resolution_suggestions: ResolutionSuggestion[]
  affected_guests?: string[]
  time_overlap?: TimeOverlap
}

interface SeveritySummary {
  critical: number
  error: number
  warning: number
  info: number
  total: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
}

interface ConflictRecommendation {
  type: string
  description: string
  priority: 'high' | 'medium' | 'low'
  effort: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
  auto_resolvable: boolean
}

interface RiskAssessment {
  overall_risk: number
  risk_factors: string[]
  mitigation_strategies: string[]
  timeline_bottlenecks: string[]
}

interface TimeOverlap {
  overlap_minutes: number
  buffer_needed: number
  suggested_separation: number
}

interface ResolutionSuggestion {
  strategy: string
  description: string
  impact: 'low' | 'medium' | 'high'
  effort: 'low' | 'medium' | 'high'
  success_probability: number
}

class AdvancedConflictAnalyzer {
  private photoGroups: PhotoGroup[]
  private timelineSlots: { [key: string]: { available_minutes: number; location?: string } }

  constructor(photoGroups: PhotoGroup[]) {
    this.photoGroups = photoGroups
    this.timelineSlots = {
      'preparation': { available_minutes: 120 },
      'ceremony': { available_minutes: 90 },
      'golden_hour': { available_minutes: 90 },
      'reception': { available_minutes: 180 }
    }
  }

  analyzeConflicts(): ConflictAnalysis {
    const conflicts: DetectedConflict[] = []
    
    // Multi-dimensional conflict detection
    conflicts.push(...this.detectTimeConflicts())
    conflicts.push(...this.detectGuestConflicts())
    conflicts.push(...this.detectLocationConflicts())
    conflicts.push(...this.detectResourceConflicts())
    conflicts.push(...this.detectPriorityConflicts())
    conflicts.push(...this.detectCapacityConflicts())
    conflicts.push(...this.detectDependencyConflicts())
    conflicts.push(...this.detectPhotographerConflicts())

    // Advanced conflict analysis
    const enhancedConflicts = this.enhanceConflictsWithAI(conflicts)
    const severitySummary = this.calculateSeveritySummary(enhancedConflicts)
    const recommendations = this.generateRecommendations(enhancedConflicts)
    const riskAssessment = this.assessOverallRisk(enhancedConflicts)

    return {
      conflicts: enhancedConflicts,
      severity_summary: severitySummary,
      recommendations,
      risk_assessment: riskAssessment
    }
  }

  private detectTimeConflicts(): DetectedConflict[] {
    const conflicts: DetectedConflict[] = []
    const slotGroups = new Map<string, PhotoGroup[]>()

    // Group by timeline slots
    this.photoGroups.forEach(group => {
      if (group.timeline_slot) {
        if (!slotGroups.has(group.timeline_slot)) {
          slotGroups.set(group.timeline_slot, [])
        }
        slotGroups.get(group.timeline_slot)!.push(group)
      }
    })

    // Analyze each slot for time conflicts
    slotGroups.forEach((groups, slot) => {
      const slotInfo = this.timelineSlots[slot]
      if (!slotInfo) return

      const totalTime = groups.reduce((sum, g) => sum + g.estimated_time_minutes, 0)
      const bufferTime = groups.length * 10 // 10 minutes buffer per group
      const requiredTime = totalTime + bufferTime

      if (requiredTime > slotInfo.available_minutes) {
        const overlapMinutes = requiredTime - slotInfo.available_minutes
        const severity = this.calculateTimeSeverity(overlapMinutes, slotInfo.available_minutes)

        for (let i = 0; i < groups.length - 1; i++) {
          for (let j = i + 1; j < groups.length; j++) {
            const group1 = groups[i]
            const group2 = groups[j]

            conflicts.push({
              id: `time_${group1.id}_${group2.id}`,
              photo_group_id: group1.id,
              conflicting_group_id: group2.id,
              conflict_type: 'time_overlap',
              severity,
              description: `Time conflict in ${slot}: ${overlapMinutes} minutes over capacity`,
              impact_score: this.calculateImpactScore(group1, group2, overlapMinutes),
              time_overlap: {
                overlap_minutes: overlapMinutes,
                buffer_needed: bufferTime,
                suggested_separation: Math.ceil(overlapMinutes / 2)
              },
              resolution_suggestions: this.generateTimeResolutionSuggestions(group1, group2, slot)
            })
          }
        }
      }
    })

    return conflicts
  }

  private detectGuestConflicts(): DetectedConflict[] {
    const conflicts: DetectedConflict[] = []
    const guestAssignments = new Map<string, PhotoGroup[]>()

    // Map guests to their assigned groups
    this.photoGroups.forEach(group => {
      group.assignments?.forEach(assignment => {
        if (!guestAssignments.has(assignment.guest_id)) {
          guestAssignments.set(assignment.guest_id, [])
        }
        guestAssignments.get(assignment.guest_id)!.push(group)
      })
    })

    // Detect overlapping assignments
    guestAssignments.forEach((groups, guestId) => {
      if (groups.length > 1) {
        // Check for same-slot conflicts
        const sameSlotGroups = new Map<string, PhotoGroup[]>()
        groups.forEach(group => {
          if (group.timeline_slot) {
            if (!sameSlotGroups.has(group.timeline_slot)) {
              sameSlotGroups.set(group.timeline_slot, [])
            }
            sameSlotGroups.get(group.timeline_slot)!.push(group)
          }
        })

        sameSlotGroups.forEach((slotGroups, slot) => {
          if (slotGroups.length > 1) {
            for (let i = 0; i < slotGroups.length - 1; i++) {
              for (let j = i + 1; j < slotGroups.length; j++) {
                const group1 = slotGroups[i]
                const group2 = slotGroups[j]

                conflicts.push({
                  id: `guest_${group1.id}_${group2.id}_${guestId}`,
                  photo_group_id: group1.id,
                  conflicting_group_id: group2.id,
                  conflict_type: 'guest_overlap',
                  severity: this.calculateGuestSeverity(groups.length, slot),
                  description: `Guest assigned to multiple groups in ${slot}`,
                  impact_score: this.calculateGuestImpactScore(group1, group2, guestId),
                  affected_guests: [guestId],
                  resolution_suggestions: this.generateGuestResolutionSuggestions(group1, group2, guestId)
                })
              }
            }
          }
        })
      }
    })

    return conflicts
  }

  private detectLocationConflicts(): DetectedConflict[] {
    const conflicts: DetectedConflict[] = []
    const locationGroups = new Map<string, Map<string, PhotoGroup[]>>()

    // Group by location and timeline slot
    this.photoGroups.forEach(group => {
      if (group.location && group.timeline_slot) {
        if (!locationGroups.has(group.location)) {
          locationGroups.set(group.location, new Map())
        }
        if (!locationGroups.get(group.location)!.has(group.timeline_slot)) {
          locationGroups.get(group.location)!.set(group.timeline_slot, [])
        }
        locationGroups.get(group.location)!.get(group.timeline_slot)!.push(group)
      }
    })

    // Detect location conflicts
    locationGroups.forEach((slotGroups, location) => {
      slotGroups.forEach((groups, slot) => {
        if (groups.length > 1) {
          // Multiple groups at same location and time
          for (let i = 0; i < groups.length - 1; i++) {
            for (let j = i + 1; j < groups.length; j++) {
              const group1 = groups[i]
              const group2 = groups[j]

              conflicts.push({
                id: `location_${group1.id}_${group2.id}`,
                photo_group_id: group1.id,
                conflicting_group_id: group2.id,
                conflict_type: 'location_conflict',
                severity: 'error',
                description: `Location conflict at ${location} during ${slot}`,
                impact_score: this.calculateLocationImpactScore(group1, group2),
                resolution_suggestions: this.generateLocationResolutionSuggestions(group1, group2, location)
              })
            }
          }
        }
      })
    })

    return conflicts
  }

  private detectResourceConflicts(): DetectedConflict[] {
    const conflicts: DetectedConflict[] = []
    
    // Detect photographer resource conflicts
    const photographerLoad = new Map<string, number>()
    
    this.photoGroups.forEach(group => {
      if (group.timeline_slot) {
        const currentLoad = photographerLoad.get(group.timeline_slot) || 0
        photographerLoad.set(group.timeline_slot, currentLoad + 1)
      }
    })

    // High photographer load detection
    photographerLoad.forEach((load, slot) => {
      if (load > 3) { // More than 3 groups per slot might be challenging
        const slotGroups = this.photoGroups.filter(g => g.timeline_slot === slot)
        
        // Create conflicts for groups that might strain resources
        for (let i = 3; i < slotGroups.length; i++) {
          const group = slotGroups[i]
          
          conflicts.push({
            id: `resource_${group.id}_${slot}`,
            photo_group_id: group.id,
            conflicting_group_id: '',
            conflict_type: 'resource_conflict',
            severity: 'warning',
            description: `High photographer load in ${slot} (${load} groups)`,
            impact_score: 0.6,
            resolution_suggestions: [{
              strategy: 'redistribute_load',
              description: `Consider moving to less crowded time slot`,
              impact: 'medium',
              effort: 'low',
              success_probability: 0.8
            }]
          })
        }
      }
    })

    return conflicts
  }

  private detectPriorityConflicts(): DetectedConflict[] {
    const conflicts: DetectedConflict[] = []
    const priorityGroups = new Map<number, PhotoGroup[]>()

    // Group by priority
    this.photoGroups.forEach(group => {
      if (!priorityGroups.has(group.priority)) {
        priorityGroups.set(group.priority, [])
      }
      priorityGroups.get(group.priority)!.push(group)
    })

    // Detect high-priority conflicts
    const highPriorityGroups = this.photoGroups.filter(g => g.priority <= 3)
    const slotCapacity = new Map<string, number>()

    highPriorityGroups.forEach(group => {
      if (group.timeline_slot) {
        const current = slotCapacity.get(group.timeline_slot) || 0
        slotCapacity.set(group.timeline_slot, current + 1)
      }
    })

    slotCapacity.forEach((count, slot) => {
      if (count > 2) { // Too many high-priority groups in one slot
        const slotHighPriorityGroups = highPriorityGroups.filter(g => g.timeline_slot === slot)
        
        for (let i = 2; i < slotHighPriorityGroups.length; i++) {
          const group = slotHighPriorityGroups[i]
          
          conflicts.push({
            id: `priority_${group.id}_${slot}`,
            photo_group_id: group.id,
            conflicting_group_id: '',
            conflict_type: 'priority_conflict',
            severity: 'warning',
            description: `Multiple high-priority groups in ${slot}`,
            impact_score: 0.7,
            resolution_suggestions: [{
              strategy: 'priority_rebalancing',
              description: 'Consider adjusting priorities or redistributing across slots',
              impact: 'medium',
              effort: 'medium',
              success_probability: 0.7
            }]
          })
        }
      }
    })

    return conflicts
  }

  private detectCapacityConflicts(): DetectedConflict[] {
    const conflicts: DetectedConflict[] = []

    // Analyze each timeline slot for capacity issues
    Object.keys(this.timelineSlots).forEach(slot => {
      const slotGroups = this.photoGroups.filter(g => g.timeline_slot === slot)
      const slotInfo = this.timelineSlots[slot]
      
      if (slotGroups.length === 0) return

      const totalGuestCount = slotGroups.reduce((sum, g) => 
        sum + (g.assignments?.length || 0), 0
      )
      
      // Capacity thresholds
      const maxGuestsPerSlot = {
        'preparation': 15,
        'ceremony': 30,
        'golden_hour': 20,
        'reception': 50
      }

      const maxGuests = maxGuestsPerSlot[slot as keyof typeof maxGuestsPerSlot] || 25

      if (totalGuestCount > maxGuests) {
        slotGroups.forEach(group => {
          conflicts.push({
            id: `capacity_${group.id}_${slot}`,
            photo_group_id: group.id,
            conflicting_group_id: '',
            conflict_type: 'capacity_conflict',
            severity: 'warning',
            description: `High guest count in ${slot} (${totalGuestCount} guests, max ${maxGuests})`,
            impact_score: 0.5,
            resolution_suggestions: [{
              strategy: 'guest_redistribution',
              description: 'Consider splitting large groups or moving to less crowded slots',
              impact: 'medium',
              effort: 'medium',
              success_probability: 0.75
            }]
          })
        })
      }
    })

    return conflicts
  }

  private detectDependencyConflicts(): DetectedConflict[] {
    const conflicts: DetectedConflict[] = []

    // Define logical dependencies between photo types
    const dependencies = {
      'bridal_party': ['preparation'],
      'family': ['ceremony'],
      'formal': ['preparation', 'ceremony']
    }

    // Check for missing dependencies
    this.photoGroups.forEach(group => {
      const requiredTypes = dependencies[group.photo_type as keyof typeof dependencies]
      
      if (requiredTypes) {
        requiredTypes.forEach(requiredType => {
          const hasRequiredType = this.photoGroups.some(g => 
            g.photo_type === requiredType && 
            g.timeline_slot && 
            this.getSlotOrder(g.timeline_slot) < this.getSlotOrder(group.timeline_slot)
          )

          if (!hasRequiredType) {
            conflicts.push({
              id: `dependency_${group.id}_${requiredType}`,
              photo_group_id: group.id,
              conflicting_group_id: '',
              conflict_type: 'dependency_conflict',
              severity: 'info',
              description: `${group.photo_type} photos typically follow ${requiredType} photos`,
              impact_score: 0.3,
              resolution_suggestions: [{
                strategy: 'add_prerequisite',
                description: `Consider adding ${requiredType} photo group before ${group.photo_type}`,
                impact: 'low',
                effort: 'medium',
                success_probability: 0.9
              }]
            })
          }
        })
      }
    })

    return conflicts
  }

  private detectPhotographerConflicts(): DetectedConflict[] {
    const conflicts: DetectedConflict[] = []

    // Simulate photographer workload analysis
    const photographerWorkload = new Map<string, { groups: PhotoGroup[], totalTime: number }>()

    this.photoGroups.forEach(group => {
      if (group.timeline_slot) {
        if (!photographerWorkload.has(group.timeline_slot)) {
          photographerWorkload.set(group.timeline_slot, { groups: [], totalTime: 0 })
        }
        const workload = photographerWorkload.get(group.timeline_slot)!
        workload.groups.push(group)
        workload.totalTime += group.estimated_time_minutes
      }
    })

    // Detect excessive workload
    photographerWorkload.forEach(({ groups, totalTime }, slot) => {
      const slotDuration = this.timelineSlots[slot]?.available_minutes || 60
      const utilizationRate = totalTime / slotDuration

      if (utilizationRate > 0.9) { // Over 90% utilization
        groups.forEach(group => {
          conflicts.push({
            id: `photographer_${group.id}_${slot}`,
            photo_group_id: group.id,
            conflicting_group_id: '',
            conflict_type: 'photographer_conflict',
            severity: utilizationRate > 1.1 ? 'error' : 'warning',
            description: `High photographer workload in ${slot} (${Math.round(utilizationRate * 100)}% utilization)`,
            impact_score: Math.min(utilizationRate, 1.0),
            resolution_suggestions: [{
              strategy: 'workload_balancing',
              description: 'Redistribute groups to balance photographer workload',
              impact: 'high',
              effort: 'medium',
              success_probability: 0.8
            }]
          })
        })
      }
    })

    return conflicts
  }

  private enhanceConflictsWithAI(conflicts: DetectedConflict[]): DetectedConflict[] {
    // AI enhancement of conflicts with additional context and predictions
    return conflicts.map(conflict => {
      // Add AI-predicted impact scores
      conflict.impact_score = this.enhanceImpactScore(conflict)
      
      // Enhance resolution suggestions with AI insights
      conflict.resolution_suggestions = this.enhanceResolutionSuggestions(conflict)
      
      // Add contextual information
      conflict.description = this.enhanceDescription(conflict)
      
      return conflict
    })
  }

  private enhanceImpactScore(conflict: DetectedConflict): number {
    let baseScore = conflict.impact_score || 0.5
    
    // Enhance based on conflict type
    const typeMultipliers = {
      'time_overlap': 1.2,
      'location_conflict': 1.1,
      'guest_overlap': 0.9,
      'resource_conflict': 0.8,
      'priority_conflict': 1.0,
      'capacity_conflict': 0.7,
      'dependency_conflict': 0.5,
      'photographer_conflict': 1.15
    }
    
    baseScore *= typeMultipliers[conflict.conflict_type as keyof typeof typeMultipliers] || 1.0
    
    // Enhance based on affected groups' priorities
    const group1 = this.photoGroups.find(g => g.id === conflict.photo_group_id)
    const group2 = this.photoGroups.find(g => g.id === conflict.conflicting_group_id)
    
    if (group1 && group1.priority <= 3) baseScore *= 1.2
    if (group2 && group2.priority <= 3) baseScore *= 1.1
    
    return Math.min(baseScore, 1.0)
  }

  private enhanceResolutionSuggestions(conflict: DetectedConflict): ResolutionSuggestion[] {
    const enhanced = [...conflict.resolution_suggestions]
    
    // Add AI-powered suggestions
    switch (conflict.conflict_type) {
      case 'time_overlap':
        enhanced.push({
          strategy: 'ai_optimization',
          description: 'Use AI-powered schedule optimization to resolve timing conflicts',
          impact: 'high',
          effort: 'low',
          success_probability: 0.9
        })
        break
      case 'guest_overlap':
        enhanced.push({
          strategy: 'smart_grouping',
          description: 'AI suggests optimal guest groupings based on relationships',
          impact: 'medium',
          effort: 'low',
          success_probability: 0.85
        })
        break
    }
    
    return enhanced
  }

  private enhanceDescription(conflict: DetectedConflict): string {
    const group1 = this.photoGroups.find(g => g.id === conflict.photo_group_id)
    const group2 = this.photoGroups.find(g => g.id === conflict.conflicting_group_id)
    
    let enhanced = conflict.description
    
    if (group1) {
      enhanced += ` (${group1.name}, priority ${group1.priority})`
    }
    
    if (group2) {
      enhanced += ` vs (${group2.name}, priority ${group2.priority})`
    }
    
    return enhanced
  }

  private calculateSeveritySummary(conflicts: DetectedConflict[]): SeveritySummary {
    const summary = {
      critical: 0,
      error: 0,
      warning: 0,
      info: 0,
      total: conflicts.length,
      risk_level: 'low' as 'low' | 'medium' | 'high' | 'critical'
    }

    conflicts.forEach(conflict => {
      summary[conflict.severity]++
    })

    // Determine overall risk level
    if (summary.critical > 0) {
      summary.risk_level = 'critical'
    } else if (summary.error > 2) {
      summary.risk_level = 'high'
    } else if (summary.error > 0 || summary.warning > 3) {
      summary.risk_level = 'medium'
    }

    return summary
  }

  private generateRecommendations(conflicts: DetectedConflict[]): ConflictRecommendation[] {
    const recommendations: ConflictRecommendation[] = []

    // Global recommendations based on conflict patterns
    const conflictTypes = new Set(conflicts.map(c => c.conflict_type))
    
    if (conflictTypes.has('time_overlap')) {
      recommendations.push({
        type: 'schedule_optimization',
        description: 'Run AI-powered schedule optimization to resolve timing conflicts',
        priority: 'high',
        effort: 'low',
        impact: 'high',
        auto_resolvable: true
      })
    }

    if (conflictTypes.has('guest_overlap')) {
      recommendations.push({
        type: 'guest_management',
        description: 'Review and optimize guest assignments across photo groups',
        priority: 'medium',
        effort: 'medium',
        impact: 'medium',
        auto_resolvable: false
      })
    }

    if (conflictTypes.has('location_conflict')) {
      recommendations.push({
        type: 'venue_coordination',
        description: 'Coordinate with venue to ensure location availability',
        priority: 'high',
        effort: 'high',
        impact: 'high',
        auto_resolvable: false
      })
    }

    if (conflicts.length > 10) {
      recommendations.push({
        type: 'comprehensive_review',
        description: 'Schedule comprehensive review of photo group planning',
        priority: 'high',
        effort: 'high',
        impact: 'high',
        auto_resolvable: false
      })
    }

    return recommendations
  }

  private assessOverallRisk(conflicts: DetectedConflict[]): RiskAssessment {
    const criticalConflicts = conflicts.filter(c => c.severity === 'critical').length
    const errorConflicts = conflicts.filter(c => c.severity === 'error').length
    const warningConflicts = conflicts.filter(c => c.severity === 'warning').length

    // Calculate overall risk score (0-1)
    let riskScore = 0
    riskScore += criticalConflicts * 0.4
    riskScore += errorConflicts * 0.25
    riskScore += warningConflicts * 0.1
    riskScore = Math.min(riskScore, 1.0)

    const riskFactors: string[] = []
    const mitigationStrategies: string[] = []
    const timelineBottlenecks: string[] = []

    if (criticalConflicts > 0) {
      riskFactors.push('Critical timing or location conflicts present')
      mitigationStrategies.push('Immediate schedule restructuring required')
    }

    if (errorConflicts > 2) {
      riskFactors.push('Multiple high-severity conflicts')
      mitigationStrategies.push('Professional photographer consultation recommended')
    }

    if (warningConflicts > 5) {
      riskFactors.push('High number of minor conflicts')
      mitigationStrategies.push('Systematic review and optimization needed')
    }

    // Identify timeline bottlenecks
    const slotConflicts = new Map<string, number>()
    conflicts.forEach(conflict => {
      const group = this.photoGroups.find(g => g.id === conflict.photo_group_id)
      if (group?.timeline_slot) {
        const count = slotConflicts.get(group.timeline_slot) || 0
        slotConflicts.set(group.timeline_slot, count + 1)
      }
    })

    slotConflicts.forEach((count, slot) => {
      if (count > 2) {
        timelineBottlenecks.push(`${slot} (${count} conflicts)`)
      }
    })

    return {
      overall_risk: Math.round(riskScore * 100) / 100,
      risk_factors: riskFactors,
      mitigation_strategies: mitigationStrategies,
      timeline_bottlenecks: timelineBottlenecks
    }
  }

  // Utility methods
  private calculateTimeSeverity(overlapMinutes: number, totalAvailable: number): 'info' | 'warning' | 'error' | 'critical' {
    const overlapPercentage = overlapMinutes / totalAvailable
    
    if (overlapPercentage > 0.5) return 'critical'
    if (overlapPercentage > 0.3) return 'error'
    if (overlapPercentage > 0.1) return 'warning'
    return 'info'
  }

  private calculateGuestSeverity(groupCount: number, slot: string): 'info' | 'warning' | 'error' | 'critical' {
    if (groupCount > 4) return 'error'
    if (groupCount > 2) return 'warning'
    return 'info'
  }

  private calculateImpactScore(group1: PhotoGroup, group2: PhotoGroup, overlapMinutes: number): number {
    let score = 0.5
    
    // Priority impact
    if (group1.priority <= 3 || group2.priority <= 3) score += 0.2
    
    // Time impact
    score += Math.min(overlapMinutes / 60, 0.3)
    
    return Math.min(score, 1.0)
  }

  private calculateGuestImpactScore(group1: PhotoGroup, group2: PhotoGroup, guestId: string): number {
    let score = 0.4
    
    // Check if primary guest
    const isPrimary1 = group1.assignments?.some(a => a.guest_id === guestId && a.is_primary)
    const isPrimary2 = group2.assignments?.some(a => a.guest_id === guestId && a.is_primary)
    
    if (isPrimary1 || isPrimary2) score += 0.3
    
    return score
  }

  private calculateLocationImpactScore(group1: PhotoGroup, group2: PhotoGroup): number {
    let score = 0.6
    
    if (group1.priority <= 3 && group2.priority <= 3) score += 0.2
    
    return score
  }

  private generateTimeResolutionSuggestions(group1: PhotoGroup, group2: PhotoGroup, slot: string): ResolutionSuggestion[] {
    return [
      {
        strategy: 'reschedule_lower_priority',
        description: `Move lower priority group to different slot`,
        impact: 'medium',
        effort: 'low',
        success_probability: 0.8
      },
      {
        strategy: 'reduce_duration',
        description: 'Reduce estimated time for one or both groups',
        impact: 'low',
        effort: 'low',
        success_probability: 0.6
      },
      {
        strategy: 'combine_groups',
        description: 'Consider combining compatible groups',
        impact: 'medium',
        effort: 'medium',
        success_probability: 0.4
      }
    ]
  }

  private generateGuestResolutionSuggestions(group1: PhotoGroup, group2: PhotoGroup, guestId: string): ResolutionSuggestion[] {
    return [
      {
        strategy: 'assign_to_higher_priority',
        description: 'Keep guest in higher priority group only',
        impact: 'low',
        effort: 'low',
        success_probability: 0.9
      },
      {
        strategy: 'schedule_separately',
        description: 'Schedule groups in different time slots',
        impact: 'medium',
        effort: 'medium',
        success_probability: 0.7
      }
    ]
  }

  private generateLocationResolutionSuggestions(group1: PhotoGroup, group2: PhotoGroup, location: string): ResolutionSuggestion[] {
    return [
      {
        strategy: 'alternate_location',
        description: 'Find alternative location for one group',
        impact: 'medium',
        effort: 'medium',
        success_probability: 0.6
      },
      {
        strategy: 'time_separation',
        description: 'Schedule groups at different times in same location',
        impact: 'high',
        effort: 'low',
        success_probability: 0.8
      }
    ]
  }

  private getSlotOrder(slot?: string): number {
    const order = {
      'preparation': 1,
      'ceremony': 2,
      'golden_hour': 3,
      'reception': 4
    }
    return order[slot as keyof typeof order] || 999
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const { couple_id, photo_group_ids } = await req.json()

    if (!couple_id) {
      return new Response(
        JSON.stringify({ error: 'couple_id is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Fetch photo groups
    let query = supabaseClient
      .from('photo_groups')
      .select(`
        id,
        name,
        priority,
        estimated_time_minutes,
        timeline_slot,
        location,
        photo_type,
        assignments:photo_group_assignments(
          guest_id,
          is_primary
        )
      `)
      .eq('couple_id', couple_id)

    if (photo_group_ids && photo_group_ids.length > 0) {
      query = query.in('id', photo_group_ids)
    }

    const { data: photoGroups, error: groupsError } = await query

    if (groupsError) {
      throw groupsError
    }

    if (!photoGroups || photoGroups.length === 0) {
      return new Response(
        JSON.stringify({
          conflicts: [],
          severity_summary: {
            critical: 0,
            error: 0,
            warning: 0,
            info: 0,
            total: 0,
            risk_level: 'low'
          },
          recommendations: [],
          risk_assessment: {
            overall_risk: 0,
            risk_factors: [],
            mitigation_strategies: [],
            timeline_bottlenecks: []
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const startTime = Date.now()
    
    // Run conflict analysis
    const analyzer = new AdvancedConflictAnalyzer(photoGroups)
    const analysis = analyzer.analyzeConflicts()
    
    const computationTime = Date.now() - startTime

    // Store conflicts in database
    if (analysis.conflicts.length > 0) {
      const conflictsToStore = analysis.conflicts.map(conflict => ({
        id: conflict.id,
        photo_group_id: conflict.photo_group_id,
        conflicting_group_id: conflict.conflicting_group_id || null,
        conflict_type: conflict.conflict_type,
        severity: conflict.severity,
        description: conflict.description,
        resolution_suggestions: conflict.resolution_suggestions
      }))

      const { error: storeError } = await supabaseClient
        .from('photo_group_conflicts')
        .upsert(conflictsToStore, {
          onConflict: 'id',
          ignoreDuplicates: false
        })

      if (storeError) {
        console.error('Error storing conflicts:', storeError)
      }
    }

    return new Response(
      JSON.stringify({
        ...analysis,
        computation_time_ms: computationTime,
        analyzed_groups: photoGroups.length,
        edge_function: true,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Conflict analysis error:', error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})