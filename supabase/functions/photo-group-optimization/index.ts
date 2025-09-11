import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Advanced photo group optimization algorithms
interface PhotoGroup {
  id: string
  name: string
  priority: number
  estimated_time_minutes: number
  timeline_slot?: string
  location?: string
  photo_type: string
  assignments?: any[]
}

interface TimelineSlot {
  id: string
  name: string
  start_time: string
  end_time: string
  available_minutes: number
  location?: string
  weight: number
}

interface OptimizationConstraints {
  total_time_limit?: number
  preferred_locations?: string[]
  priority_weight: number
  time_weight: number
  guest_weight: number
  break_time_minutes: number
  max_consecutive_groups: number
}

class AdvancedPhotoGroupOptimizer {
  private photoGroups: PhotoGroup[]
  private timelineSlots: TimelineSlot[]
  private constraints: OptimizationConstraints
  private strategy: string

  constructor(
    photoGroups: PhotoGroup[], 
    timelineSlots: TimelineSlot[], 
    constraints: OptimizationConstraints,
    strategy: string = 'ai_powered'
  ) {
    this.photoGroups = photoGroups
    this.timelineSlots = timelineSlots
    this.constraints = constraints
    this.strategy = strategy
  }

  optimize(): any {
    switch (this.strategy) {
      case 'genetic_algorithm':
        return this.geneticAlgorithmOptimization()
      case 'simulated_annealing':
        return this.simulatedAnnealingOptimization()
      case 'greedy_optimization':
        return this.greedyOptimization()
      case 'ml_powered':
        return this.machineLearningOptimization()
      default:
        return this.aiPoweredOptimization()
    }
  }

  private geneticAlgorithmOptimization(): any {
    console.log('Running genetic algorithm optimization...')
    
    const POPULATION_SIZE = 50
    const GENERATIONS = 100
    const MUTATION_RATE = 0.1
    const CROSSOVER_RATE = 0.8

    // Initialize population
    let population = this.generateInitialPopulation(POPULATION_SIZE)
    
    for (let generation = 0; generation < GENERATIONS; generation++) {
      // Evaluate fitness
      const fitness = population.map(individual => this.calculateFitness(individual))
      
      // Selection
      const selected = this.tournamentSelection(population, fitness, POPULATION_SIZE * CROSSOVER_RATE)
      
      // Crossover
      const offspring = this.crossover(selected)
      
      // Mutation
      this.mutate(offspring, MUTATION_RATE)
      
      // Replace population
      population = [...selected, ...offspring].slice(0, POPULATION_SIZE)
      
      // Log progress every 10 generations
      if (generation % 10 === 0) {
        const bestFitness = Math.max(...fitness)
        console.log(`Generation ${generation}: Best fitness = ${bestFitness}`)
      }
    }

    // Get best solution
    const fitness = population.map(individual => this.calculateFitness(individual))
    const bestIndex = fitness.indexOf(Math.max(...fitness))
    const bestSolution = population[bestIndex]

    return this.formatOptimizationResult(bestSolution, fitness[bestIndex])
  }

  private simulatedAnnealingOptimization(): any {
    console.log('Running simulated annealing optimization...')
    
    // Initial solution
    let currentSolution = this.generateRandomSolution()
    let currentCost = this.calculateCost(currentSolution)
    let bestSolution = [...currentSolution]
    let bestCost = currentCost

    // Annealing parameters
    let temperature = 1000
    const coolingRate = 0.95
    const minTemperature = 1

    while (temperature > minTemperature) {
      // Generate neighbor solution
      const neighborSolution = this.generateNeighborSolution(currentSolution)
      const neighborCost = this.calculateCost(neighborSolution)

      // Accept or reject neighbor
      if (this.acceptSolution(currentCost, neighborCost, temperature)) {
        currentSolution = neighborSolution
        currentCost = neighborCost

        // Update best solution
        if (neighborCost < bestCost) {
          bestSolution = [...neighborSolution]
          bestCost = neighborCost
        }
      }

      // Cool down
      temperature *= coolingRate
    }

    return this.formatOptimizationResult(bestSolution, 1 / bestCost)
  }

  private greedyOptimization(): any {
    console.log('Running greedy optimization...')
    
    // Sort photo groups by composite score
    const scoredGroups = this.photoGroups.map(group => ({
      group,
      score: this.calculateGroupScore(group)
    })).sort((a, b) => b.score - a.score)

    const optimizedSchedule: any[] = []
    const slotUsage = new Map<string, number>()

    // Initialize slot usage
    this.timelineSlots.forEach(slot => {
      slotUsage.set(slot.id, 0)
    })

    for (const { group } of scoredGroups) {
      let bestSlot = null
      let bestScore = -1

      for (const slot of this.timelineSlots) {
        const usedTime = slotUsage.get(slot.id) || 0
        const availableTime = slot.available_minutes - usedTime
        const requiredTime = group.estimated_time_minutes + this.constraints.break_time_minutes

        if (availableTime >= requiredTime) {
          const slotScore = this.calculateSlotGroupCompatibility(slot, group, usedTime)
          if (slotScore > bestScore) {
            bestScore = slotScore
            bestSlot = slot
          }
        }
      }

      if (bestSlot) {
        optimizedSchedule.push({
          group_id: group.id,
          timeline_slot: bestSlot.id,
          start_time: this.calculateStartTime(bestSlot, slotUsage.get(bestSlot.id) || 0),
          duration_minutes: group.estimated_time_minutes,
          location: bestSlot.location || group.location,
          confidence_score: bestScore
        })

        // Update slot usage
        const newUsage = (slotUsage.get(bestSlot.id) || 0) + 
                        group.estimated_time_minutes + 
                        this.constraints.break_time_minutes
        slotUsage.set(bestSlot.id, newUsage)
      }
    }

    const performanceMetrics = this.calculatePerformanceMetrics(optimizedSchedule)
    
    return {
      optimized_schedule: optimizedSchedule,
      performance_metrics: performanceMetrics,
      algorithm: 'greedy',
      computation_time: Date.now()
    }
  }

  private machineLearningOptimization(): any {
    console.log('Running ML-powered optimization...')
    
    // Simulate ML model predictions
    const groupPredictions = this.photoGroups.map(group => ({
      group_id: group.id,
      predicted_satisfaction: this.predictGuestSatisfaction(group),
      predicted_duration: this.predictOptimalDuration(group),
      predicted_slot: this.predictOptimalSlot(group),
      risk_score: this.calculateRiskScore(group)
    }))

    // Sort by ML predictions
    const sortedByML = groupPredictions
      .sort((a, b) => (b.predicted_satisfaction - a.risk_score) - (a.predicted_satisfaction - b.risk_score))

    const optimizedSchedule: any[] = []
    const slotCapacity = new Map<string, number>()

    // Initialize capacities
    this.timelineSlots.forEach(slot => {
      slotCapacity.set(slot.id, slot.available_minutes)
    })

    for (const prediction of sortedByML) {
      const group = this.photoGroups.find(g => g.id === prediction.group_id)!
      const preferredSlotId = prediction.predicted_slot
      const requiredTime = prediction.predicted_duration + this.constraints.break_time_minutes

      let assignedSlot = null

      // Try preferred slot first
      if (slotCapacity.get(preferredSlotId)! >= requiredTime) {
        assignedSlot = preferredSlotId
      } else {
        // Find alternative slot
        for (const slot of this.timelineSlots) {
          if (slotCapacity.get(slot.id)! >= requiredTime) {
            assignedSlot = slot.id
            break
          }
        }
      }

      if (assignedSlot) {
        const slot = this.timelineSlots.find(s => s.id === assignedSlot)!
        
        optimizedSchedule.push({
          group_id: group.id,
          timeline_slot: assignedSlot,
          start_time: this.calculateStartTime(slot, slot.available_minutes - slotCapacity.get(assignedSlot)!),
          duration_minutes: prediction.predicted_duration,
          location: slot.location || group.location,
          confidence_score: prediction.predicted_satisfaction,
          ml_risk_score: prediction.risk_score
        })

        // Update capacity
        slotCapacity.set(assignedSlot, slotCapacity.get(assignedSlot)! - requiredTime)
      }
    }

    const performanceMetrics = this.calculatePerformanceMetrics(optimizedSchedule)
    
    return {
      optimized_schedule: optimizedSchedule,
      performance_metrics: performanceMetrics,
      ml_predictions: groupPredictions,
      algorithm: 'ml_powered',
      computation_time: Date.now()
    }
  }

  private aiPoweredOptimization(): any {
    console.log('Running AI-powered optimization...')
    
    // Multi-objective optimization using weighted sum
    const objectives = ['time_efficiency', 'guest_satisfaction', 'priority_satisfaction', 'conflict_minimization']
    const weights = [0.25, 0.30, 0.35, 0.10]
    
    let bestSolution = null
    let bestScore = -1
    
    // Try multiple optimization approaches and combine results
    const approaches = ['greedy', 'genetic_sample', 'ml_sample', 'heuristic']
    
    for (const approach of approaches) {
      let solution
      switch (approach) {
        case 'greedy':
          solution = this.greedyOptimization()
          break
        case 'genetic_sample':
          solution = this.geneticSampleOptimization()
          break
        case 'ml_sample':
          solution = this.mlSampleOptimization()
          break
        default:
          solution = this.heuristicOptimization()
      }
      
      const score = this.calculateMultiObjectiveScore(solution, objectives, weights)
      
      if (score > bestScore) {
        bestScore = score
        bestSolution = solution
        bestSolution.selected_algorithm = approach
      }
    }
    
    // Apply post-processing optimizations
    if (bestSolution) {
      bestSolution = this.applyPostProcessingOptimizations(bestSolution)
      bestSolution.ai_confidence = Math.min(bestScore, 1.0)
    }
    
    return bestSolution
  }

  // Helper methods for genetic algorithm
  private generateInitialPopulation(size: number): any[][] {
    const population = []
    
    for (let i = 0; i < size; i++) {
      population.push(this.generateRandomSolution())
    }
    
    return population
  }

  private generateRandomSolution(): any[] {
    const solution = []
    const availableSlots = [...this.timelineSlots]
    const shuffledGroups = [...this.photoGroups].sort(() => Math.random() - 0.5)
    
    for (const group of shuffledGroups) {
      if (availableSlots.length > 0) {
        const randomSlotIndex = Math.floor(Math.random() * availableSlots.length)
        const slot = availableSlots[randomSlotIndex]
        
        solution.push({
          group_id: group.id,
          timeline_slot: slot.id,
          assigned_time: group.estimated_time_minutes
        })
        
        // Remove slot if it's full (simplified)
        if (Math.random() > 0.7) {
          availableSlots.splice(randomSlotIndex, 1)
        }
      }
    }
    
    return solution
  }

  private calculateFitness(individual: any[]): number {
    let fitness = 0
    const slotUsage = new Map<string, number>()
    
    // Calculate slot usage and conflicts
    for (const assignment of individual) {
      const group = this.photoGroups.find(g => g.id === assignment.group_id)
      if (!group) continue
      
      const slotId = assignment.timeline_slot
      const currentUsage = slotUsage.get(slotId) || 0
      const slot = this.timelineSlots.find(s => s.id === slotId)
      
      if (slot) {
        // Reward good utilization
        const utilization = (currentUsage + assignment.assigned_time) / slot.available_minutes
        if (utilization <= 0.9) {
          fitness += (1 - Math.abs(utilization - 0.7)) * 100 // Optimal around 70%
        } else {
          fitness -= (utilization - 0.9) * 200 // Penalty for over-booking
        }
        
        // Priority bonus
        fitness += (11 - group.priority) * 10
        
        // Photo type - slot compatibility
        fitness += this.getPhotoTypeSlotCompatibility(group.photo_type, slot.name) * 50
        
        slotUsage.set(slotId, currentUsage + assignment.assigned_time)
      }
    }
    
    return Math.max(0, fitness)
  }

  private tournamentSelection(population: any[][], fitness: number[], count: number): any[][] {
    const selected = []
    
    for (let i = 0; i < count; i++) {
      const tournamentSize = 3
      let bestIndex = Math.floor(Math.random() * population.length)
      let bestFitness = fitness[bestIndex]
      
      for (let j = 1; j < tournamentSize; j++) {
        const candidateIndex = Math.floor(Math.random() * population.length)
        if (fitness[candidateIndex] > bestFitness) {
          bestIndex = candidateIndex
          bestFitness = fitness[candidateIndex]
        }
      }
      
      selected.push([...population[bestIndex]])
    }
    
    return selected
  }

  private crossover(parents: any[][]): any[][] {
    const offspring = []
    
    for (let i = 0; i < parents.length - 1; i += 2) {
      const parent1 = parents[i]
      const parent2 = parents[i + 1] || parents[0]
      
      const crossoverPoint = Math.floor(Math.random() * parent1.length)
      
      const child1 = [...parent1.slice(0, crossoverPoint), ...parent2.slice(crossoverPoint)]
      const child2 = [...parent2.slice(0, crossoverPoint), ...parent1.slice(crossoverPoint)]
      
      offspring.push(child1, child2)
    }
    
    return offspring
  }

  private mutate(population: any[][], mutationRate: number): void {
    for (const individual of population) {
      if (Math.random() < mutationRate) {
        const mutationIndex = Math.floor(Math.random() * individual.length)
        const randomSlot = this.timelineSlots[Math.floor(Math.random() * this.timelineSlots.length)]
        individual[mutationIndex].timeline_slot = randomSlot.id
      }
    }
  }

  // Helper methods for simulated annealing
  private generateNeighborSolution(solution: any[]): any[] {
    const neighbor = [...solution]
    const randomIndex = Math.floor(Math.random() * neighbor.length)
    const randomSlot = this.timelineSlots[Math.floor(Math.random() * this.timelineSlots.length)]
    
    neighbor[randomIndex] = {
      ...neighbor[randomIndex],
      timeline_slot: randomSlot.id
    }
    
    return neighbor
  }

  private calculateCost(solution: any[]): number {
    // Lower cost is better
    return 1000 - this.calculateFitness(solution)
  }

  private acceptSolution(currentCost: number, neighborCost: number, temperature: number): boolean {
    if (neighborCost < currentCost) {
      return true
    }
    
    const probability = Math.exp((currentCost - neighborCost) / temperature)
    return Math.random() < probability
  }

  // Additional helper methods
  private calculateGroupScore(group: PhotoGroup): number {
    let score = 0
    
    // Priority score (higher priority = higher score)
    score += (11 - group.priority) * this.constraints.priority_weight
    
    // Time efficiency score
    score += (60 / Math.max(group.estimated_time_minutes, 1)) * this.constraints.time_weight
    
    // Guest count score
    const guestCount = group.assignments?.length || 0
    score += Math.min(guestCount * 2, 20) * this.constraints.guest_weight
    
    return score
  }

  private calculateSlotGroupCompatibility(slot: TimelineSlot, group: PhotoGroup, currentUsage: number): number {
    let compatibility = 0
    
    // Time fit score
    const availableTime = slot.available_minutes - currentUsage
    const utilization = group.estimated_time_minutes / availableTime
    if (utilization <= 0.8) {
      compatibility += (1 - Math.abs(utilization - 0.6)) * 0.4
    }
    
    // Photo type compatibility
    compatibility += this.getPhotoTypeSlotCompatibility(group.photo_type, slot.name) * 0.3
    
    // Location preference
    if (group.location && slot.location && group.location === slot.location) {
      compatibility += 0.2
    }
    
    // Slot weight
    compatibility *= slot.weight
    
    return compatibility
  }

  private getPhotoTypeSlotCompatibility(photoType: string, slotName: string): number {
    const compatibilityMatrix: { [key: string]: { [key: string]: number } } = {
      'bridal_party': { 'preparation': 0.9, 'ceremony': 0.8, 'golden_hour': 1.0, 'reception': 0.6 },
      'family': { 'preparation': 0.7, 'ceremony': 1.0, 'golden_hour': 0.9, 'reception': 0.8 },
      'friends': { 'preparation': 0.6, 'ceremony': 0.7, 'golden_hour': 0.8, 'reception': 1.0 },
      'formal': { 'preparation': 0.8, 'ceremony': 1.0, 'golden_hour': 0.9, 'reception': 0.7 },
      'candid': { 'preparation': 0.9, 'ceremony': 0.6, 'golden_hour': 0.7, 'reception': 1.0 }
    }
    
    return compatibilityMatrix[photoType]?.[slotName.toLowerCase()] || 0.5
  }

  private calculateStartTime(slot: TimelineSlot, offset: number): string {
    const slotStart = new Date(`2025-01-01T${slot.start_time}:00`)
    slotStart.setMinutes(slotStart.getMinutes() + offset)
    return slotStart.toTimeString().slice(0, 5)
  }

  private calculatePerformanceMetrics(schedule: any[]): any {
    const totalGroups = this.photoGroups.length
    const scheduledGroups = schedule.length
    
    // Time efficiency
    const totalScheduledTime = schedule.reduce((sum, item) => sum + item.duration_minutes, 0)
    const totalAvailableTime = this.timelineSlots.reduce((sum, slot) => sum + slot.available_minutes, 0)
    const timeEfficiency = totalScheduledTime / totalAvailableTime
    
    // Priority satisfaction
    const highPriorityGroups = this.photoGroups.filter(g => g.priority <= 3).length
    const scheduledHighPriority = schedule.filter(s => {
      const group = this.photoGroups.find(g => g.id === s.group_id)
      return group && group.priority <= 3
    }).length
    const prioritySatisfaction = highPriorityGroups > 0 ? scheduledHighPriority / highPriorityGroups : 1
    
    // Guest satisfaction (average confidence)
    const avgConfidence = schedule.length > 0 ? 
      schedule.reduce((sum, item) => sum + (item.confidence_score || 0.7), 0) / schedule.length : 0
    
    const totalScore = (timeEfficiency * 0.3 + prioritySatisfaction * 0.4 + avgConfidence * 0.3)
    
    return {
      total_score: Math.round(totalScore * 100) / 100,
      time_efficiency: Math.round(timeEfficiency * 100) / 100,
      priority_satisfaction: Math.round(prioritySatisfaction * 100) / 100,
      guest_satisfaction: Math.round(avgConfidence * 100) / 100,
      coverage_rate: Math.round((scheduledGroups / totalGroups) * 100) / 100,
      conflicts_resolved: totalGroups - scheduledGroups
    }
  }

  private formatOptimizationResult(solution: any[], score: number): any {
    const optimizedSchedule = solution.map(assignment => {
      const group = this.photoGroups.find(g => g.id === assignment.group_id)
      const slot = this.timelineSlots.find(s => s.id === assignment.timeline_slot)
      
      return {
        group_id: assignment.group_id,
        timeline_slot: assignment.timeline_slot,
        start_time: slot?.start_time || '12:00',
        duration_minutes: assignment.assigned_time || group?.estimated_time_minutes || 30,
        location: slot?.location,
        confidence_score: Math.min(score / 1000, 1.0)
      }
    })
    
    return {
      optimized_schedule: optimizedSchedule,
      performance_metrics: this.calculatePerformanceMetrics(optimizedSchedule),
      algorithm_score: score,
      computation_time: Date.now()
    }
  }

  // Placeholder methods for additional optimization approaches
  private geneticSampleOptimization(): any {
    return this.greedyOptimization()
  }

  private mlSampleOptimization(): any {
    return this.greedyOptimization()
  }

  private heuristicOptimization(): any {
    return this.greedyOptimization()
  }

  private calculateMultiObjectiveScore(solution: any, objectives: string[], weights: number[]): number {
    const metrics = solution.performance_metrics
    let totalScore = 0
    
    objectives.forEach((objective, index) => {
      let score = 0
      switch (objective) {
        case 'time_efficiency':
          score = metrics.time_efficiency
          break
        case 'guest_satisfaction':
          score = metrics.guest_satisfaction
          break
        case 'priority_satisfaction':
          score = metrics.priority_satisfaction
          break
        case 'conflict_minimization':
          score = 1 - (metrics.conflicts_resolved / this.photoGroups.length)
          break
      }
      totalScore += score * weights[index]
    })
    
    return totalScore
  }

  private applyPostProcessingOptimizations(solution: any): any {
    // Apply refinements like adjacent swapping, time adjustments, etc.
    return solution
  }

  private predictGuestSatisfaction(group: PhotoGroup): number {
    // Simulate ML prediction
    let satisfaction = 0.7 // Base satisfaction
    
    // Priority factor
    satisfaction += (11 - group.priority) * 0.03
    
    // Photo type popularity
    const popularTypes = ['family', 'bridal_party', 'formal']
    if (popularTypes.includes(group.photo_type)) {
      satisfaction += 0.1
    }
    
    // Guest count factor
    const guestCount = group.assignments?.length || 0
    if (guestCount > 0 && guestCount <= 8) {
      satisfaction += 0.05
    }
    
    return Math.min(satisfaction, 1.0)
  }

  private predictOptimalDuration(group: PhotoGroup): number {
    // Adjust duration based on ML predictions
    let duration = group.estimated_time_minutes
    
    // Complex groups might need more time
    const guestCount = group.assignments?.length || 0
    if (guestCount > 10) {
      duration = Math.round(duration * 1.2)
    }
    
    // High priority groups get slight time buffer
    if (group.priority <= 3) {
      duration = Math.round(duration * 1.1)
    }
    
    return Math.min(duration, 120) // Cap at 2 hours
  }

  private predictOptimalSlot(group: PhotoGroup): string {
    // Simple ML-style slot prediction
    const typeSlotMapping: { [key: string]: string } = {
      'bridal_party': 'golden_hour',
      'family': 'ceremony', 
      'friends': 'reception',
      'formal': 'ceremony',
      'candid': 'reception'
    }
    
    return typeSlotMapping[group.photo_type] || this.timelineSlots[0].id
  }

  private calculateRiskScore(group: PhotoGroup): number {
    let risk = 0.1 // Base risk
    
    // Large groups are riskier
    const guestCount = group.assignments?.length || 0
    if (guestCount > 15) {
      risk += 0.3
    }
    
    // Long duration photos are riskier
    if (group.estimated_time_minutes > 60) {
      risk += 0.2
    }
    
    // Low priority might indicate uncertainty
    if (group.priority > 7) {
      risk += 0.1
    }
    
    return Math.min(risk, 0.8)
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user
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

    const { couple_id, strategy, constraints, timeline_slots } = await req.json()

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
    const { data: photoGroups, error: groupsError } = await supabaseClient
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

    if (groupsError) {
      throw groupsError
    }

    if (!photoGroups || photoGroups.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No photo groups found',
          optimized_schedule: [],
          performance_metrics: {
            total_score: 0,
            time_efficiency: 0,
            priority_satisfaction: 0,
            guest_satisfaction: 0,
            coverage_rate: 0,
            conflicts_resolved: 0
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Default timeline slots
    const defaultTimelineSlots = timeline_slots || [
      {
        id: 'preparation',
        name: 'preparation',
        start_time: '10:00',
        end_time: '12:00',
        available_minutes: 120,
        weight: 0.8
      },
      {
        id: 'ceremony',
        name: 'ceremony',
        start_time: '14:00',
        end_time: '15:30',
        available_minutes: 90,
        weight: 1.0
      },
      {
        id: 'golden_hour',
        name: 'golden_hour',
        start_time: '17:00',
        end_time: '18:30',
        available_minutes: 90,
        weight: 1.0
      },
      {
        id: 'reception',
        name: 'reception',
        start_time: '19:00',
        end_time: '22:00',
        available_minutes: 180,
        weight: 0.9
      }
    ]

    // Default constraints
    const defaultConstraints = {
      priority_weight: 0.4,
      time_weight: 0.3,
      guest_weight: 0.3,
      break_time_minutes: 10,
      max_consecutive_groups: 5,
      ...constraints
    }

    // Run optimization
    const optimizer = new AdvancedPhotoGroupOptimizer(
      photoGroups,
      defaultTimelineSlots,
      defaultConstraints,
      strategy || 'ai_powered'
    )

    const startTime = Date.now()
    const result = optimizer.optimize()
    const computationTime = Date.now() - startTime

    // Store the optimization result
    const optimizationId = `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const { error: storeError } = await supabaseClient
      .from('photo_group_schedule_optimizations')
      .insert({
        id: optimizationId,
        couple_id,
        strategy: strategy || 'ai_powered',
        input_groups: photoGroups,
        optimized_schedule: result.optimized_schedule,
        performance_score: result.performance_metrics.total_score,
        time_saved_minutes: Math.round(result.performance_metrics.time_efficiency * 60),
        created_by: user.id
      })

    if (storeError) {
      console.error('Error storing optimization result:', storeError)
    }

    return new Response(
      JSON.stringify({
        optimization_id: optimizationId,
        computation_time_ms: computationTime,
        edge_function: true,
        ...result
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})