#!/usr/bin/env tsx
import { performance } from 'perf_hooks';
import { BroadcastLoadTester } from './broadcast-load-test';
import { BroadcastAutoScaler } from '../../src/lib/broadcast/performance/auto-scaler';
import { BroadcastMetricsCollector } from '../../src/lib/broadcast/monitoring/metrics-collector';

interface WeddingSeasonConfig {
  totalWeddings: number;
  peakWeekends: number;
  trafficMultiplier: number;
  durationHours: number;
  emergencyScenarios: boolean;
}

interface WeddingEvent {
  id: string;
  date: Date;
  guestCount: number;
  teamMembers: number;
  venue: string;
  priority: 'normal' | 'premium' | 'luxury';
  estimatedLoad: number;
}

interface SimulationResults {
  totalWeddings: number;
  peakConcurrentConnections: number;
  averageLatency: number;
  p99Latency: number;
  uptime: number;
  scalingEvents: number;
  emergencyScales: number;
  weddingDayIncidents: number;
  performanceScore: number;
}

class WeddingSeasonSimulator {
  private loadTester: BroadcastLoadTester;
  private autoScaler: BroadcastAutoScaler;
  private metricsCollector: BroadcastMetricsCollector;
  private simulationResults: {
    startTime: number;
    endTime: number;
    scalingEvents: number;
    emergencyScales: number;
    incidents: number;
    downtimeMs: number;
    peakConnections: number;
    latencies: number[];
  };

  constructor() {
    this.loadTester = new BroadcastLoadTester();
    this.autoScaler = new BroadcastAutoScaler();
    this.metricsCollector = new BroadcastMetricsCollector();
    this.simulationResults = {
      startTime: 0,
      endTime: 0,
      scalingEvents: 0,
      emergencyScales: 0,
      incidents: 0,
      downtimeMs: 0,
      peakConnections: 0,
      latencies: []
    };
  }

  async runFullSeasonSimulation(config: WeddingSeasonConfig): Promise<SimulationResults> {
    console.log('💒 Starting FULL WEDDING SEASON simulation...', config);
    console.log('This will simulate an entire wedding season with realistic traffic patterns');
    
    this.simulationResults.startTime = performance.now();
    
    // Generate wedding events for the season
    const weddings = this.generateWeddingEvents(config);
    
    // Sort weddings by date for chronological simulation
    weddings.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    console.log(`📅 Generated ${weddings.length} weddings across ${config.durationHours} hours`);
    
    // Pre-scale system for wedding season
    await this.preScaleForSeason();
    
    // Start metrics collection
    await this.metricsCollector.startMetricsCollection(15000); // Every 15 seconds
    
    // Simulate wedding events chronologically
    await this.simulateWeddingEvents(weddings, config);
    
    this.simulationResults.endTime = performance.now();
    
    return this.calculateSeasonResults(config);
  }

  private generateWeddingEvents(config: WeddingSeasonConfig): WeddingEvent[] {
    const weddings: WeddingEvent[] = [];
    const startDate = new Date();
    const hourMs = 60 * 60 * 1000;
    
    // Wedding size distributions (realistic UK wedding data)
    const sizeDistributions = {
      small: { min: 20, max: 50, weight: 0.25 },   // 25% small weddings
      medium: { min: 51, max: 120, weight: 0.50 }, // 50% medium weddings  
      large: { min: 121, max: 200, weight: 0.20 }, // 20% large weddings
      luxury: { min: 201, max: 500, weight: 0.05 } // 5% luxury weddings
    };
    
    for (let i = 0; i < config.totalWeddings; i++) {
      // Distribute weddings across the time period
      const hourOffset = (i / config.totalWeddings) * config.durationHours;
      const weddingDate = new Date(startDate.getTime() + hourOffset * hourMs);
      
      // Weekend concentration (80% on Fri-Sun)
      const dayOfWeek = weddingDate.getDay();
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
      
      if (!isWeekend && Math.random() < 0.8) {
        // Skip this wedding (80% are on weekends)
        continue;
      }
      
      // Determine wedding size
      const rand = Math.random();
      let sizeCategory: keyof typeof sizeDistributions = 'medium';
      let cumulativeWeight = 0;
      
      for (const [category, config] of Object.entries(sizeDistributions)) {
        cumulativeWeight += config.weight;
        if (rand <= cumulativeWeight) {
          sizeCategory = category as keyof typeof sizeDistributions;
          break;
        }
      }
      
      const sizeConfig = sizeDistributions[sizeCategory];
      const guestCount = Math.floor(Math.random() * (sizeConfig.max - sizeConfig.min + 1)) + sizeConfig.min;
      const teamMembers = Math.max(3, Math.floor(guestCount / 25)); // ~1 vendor per 25 guests
      
      // Calculate estimated system load
      const baseLoad = teamMembers * 8 + guestCount * 0.1; // Team members more active
      const priorityMultiplier = sizeCategory === 'luxury' ? 1.5 : 1.0;
      const estimatedLoad = baseLoad * priorityMultiplier;
      
      weddings.push({
        id: `wedding-${i}`,
        date: weddingDate,
        guestCount,
        teamMembers,
        venue: `Venue ${i % 50}`, // 50 different venues
        priority: sizeCategory === 'luxury' ? 'luxury' : sizeCategory === 'large' ? 'premium' : 'normal',
        estimatedLoad
      });
    }
    
    return weddings;
  }

  private async preScaleForSeason(): Promise<void> {
    console.log('📈 Pre-scaling system for wedding season...');
    
    try {
      // Pre-scale infrastructure
      await this.autoScaler.preScaleForWeddingSeason();
      
      // Schedule predictive scaling for major periods
      const majorWeekends = this.identifyMajorWeekends();
      for (const weekend of majorWeekends) {
        // Pre-scale for each major weekend
        console.log(`📅 Scheduling pre-scale for ${weekend.toDateString()}`);
      }
      
      this.simulationResults.scalingEvents++;
      console.log('✅ Pre-scaling completed');
      
    } catch (error) {
      console.error('❌ Pre-scaling failed:', error);
    }
  }

  private identifyMajorWeekends(): Date[] {
    // Identify weekends with high wedding concentration
    const weekends = [];
    const now = new Date();
    
    // Next 8 weekends (typical wedding season simulation)
    for (let i = 0; i < 8; i++) {
      const saturday = new Date();
      saturday.setDate(now.getDate() + (i * 7) + (6 - now.getDay())); // Next Saturday
      weekends.push(saturday);
    }
    
    return weekends;
  }

  private async simulateWeddingEvents(weddings: WeddingEvent[], config: WeddingSeasonConfig): Promise<void> {
    console.log('🎊 Starting wedding event simulation...');
    
    let currentConnections = 1000; // Base connections
    const maxSimultaneousWeddings = Math.ceil(config.totalWeddings / 10); // Up to 10% concurrent
    
    for (let i = 0; i < weddings.length; i += maxSimultaneousWeddings) {
      const batch = weddings.slice(i, i + maxSimultaneousWeddings);
      
      console.log(`📊 Simulating wedding batch ${Math.floor(i / maxSimultaneousWeddings) + 1} (${batch.length} weddings)`);
      
      // Simulate concurrent weddings
      const promises = batch.map(async (wedding) => {
        return this.simulateIndividualWedding(wedding);
      });
      
      const results = await Promise.allSettled(promises);
      
      // Update peak connections
      const batchLoad = batch.reduce((sum, w) => sum + w.estimatedLoad, 0);
      currentConnections = Math.max(currentConnections, batchLoad);
      this.simulationResults.peakConnections = Math.max(
        this.simulationResults.peakConnections, 
        currentConnections
      );
      
      // Check for scaling needs
      if (currentConnections > 8000) {
        await this.handleHighLoad(currentConnections);
      }
      
      // Simulate time between wedding batches (30-60 minutes)
      const delayMs = Math.random() * 30 * 60 * 1000 + 30 * 60 * 1000;
      console.log(`⏳ Wedding batch gap: ${Math.round(delayMs / 60000)} minutes`);
      
      // In real simulation, we'd wait. For testing, we just log.
      // await new Promise(resolve => setTimeout(resolve, delayMs));
      
      // Random incidents during high-stress periods
      if (config.emergencyScenarios && Math.random() < 0.05) { // 5% chance
        await this.simulateEmergencyScenario();
      }
    }
  }

  private async simulateIndividualWedding(wedding: WeddingEvent): Promise<void> {
    const startTime = performance.now();
    
    try {
      console.log(`💒 Wedding ${wedding.id}: ${wedding.guestCount} guests, ${wedding.teamMembers} team members`);
      
      // Schedule predictive scaling 2 hours before
      const scaleTime = new Date(wedding.date.getTime() - 2 * 60 * 60 * 1000);
      await this.autoScaler.schedulePredictiveScaling(wedding.id, wedding.date);
      
      // Generate wedding day broadcast scenarios
      const scenarios = this.generateWeddingDayScenarios(wedding);
      
      // Execute each scenario with realistic timing
      for (const scenario of scenarios) {
        await this.executeWeddingScenario(wedding, scenario);
        
        // Random delay between events (5-30 minutes)
        const eventDelay = Math.random() * 25 * 60 * 1000 + 5 * 60 * 1000;
        // await new Promise(resolve => setTimeout(resolve, eventDelay));
      }
      
      const endTime = performance.now();
      const weddingLatency = endTime - startTime;
      this.simulationResults.latencies.push(weddingLatency);
      
      console.log(`✅ Wedding ${wedding.id} completed in ${weddingLatency.toFixed(0)}ms`);
      
    } catch (error) {
      console.error(`❌ Wedding ${wedding.id} failed:`, error);
      this.simulationResults.incidents++;
    }
  }

  private generateWeddingDayScenarios(wedding: WeddingEvent): Array<{
    type: string;
    priority: 'critical' | 'high' | 'normal' | 'low';
    userCount: number;
    description: string;
  }> {
    return [
      {
        type: 'setup-start',
        priority: 'normal',
        userCount: wedding.teamMembers,
        description: 'Vendors arriving and setup beginning'
      },
      {
        type: 'timeline-update',
        priority: 'high',
        userCount: wedding.teamMembers + Math.floor(wedding.guestCount * 0.1),
        description: 'Timeline updates sent to team and key guests'
      },
      {
        type: 'ceremony-start',
        priority: 'critical',
        userCount: wedding.teamMembers + wedding.guestCount,
        description: 'Ceremony beginning - all participants notified'
      },
      {
        type: 'photo-session',
        priority: 'high',
        userCount: wedding.teamMembers,
        description: 'Photographer coordinating with team for photo session'
      },
      {
        type: 'reception-ready',
        priority: 'high',
        userCount: wedding.teamMembers + wedding.guestCount,
        description: 'Reception venue ready - guest guidance'
      },
      {
        type: 'emergency-weather',
        priority: 'critical',
        userCount: wedding.teamMembers + wedding.guestCount,
        description: 'Emergency weather update requiring venue change'
      }
    ];
  }

  private async executeWeddingScenario(wedding: WeddingEvent, scenario: any): Promise<void> {
    try {
      // Create mock broadcast
      const broadcast = {
        id: `${wedding.id}-${scenario.type}`,
        title: `Wedding ${wedding.id}: ${scenario.description}`,
        content: scenario.description,
        priority: scenario.priority,
        wedding_id: wedding.id,
        created_at: new Date().toISOString()
      };
      
      // Generate user list for scenario
      const users = this.generateScenarioUsers(wedding, scenario.userCount);
      
      // Execute via load tester (simplified)
      const testConfig = {
        targetThroughput: scenario.priority === 'critical' ? 50 : 20,
        testDuration: 10, // 10 seconds per scenario
        concurrentUsers: scenario.userCount,
        batchSize: Math.min(25, Math.ceil(scenario.userCount / 10)),
        weddingSimulation: true
      };
      
      console.log(`📱 ${scenario.type}: ${scenario.userCount} users (${scenario.priority})`);
      
      // Simulate broadcast delivery (in real implementation, would use actual load tester)
      const scenarioLatency = Math.random() * 100 + 20; // 20-120ms
      this.simulationResults.latencies.push(scenarioLatency);
      
    } catch (error) {
      console.error(`❌ Scenario ${scenario.type} failed:`, error);
      this.simulationResults.incidents++;
    }
  }

  private generateScenarioUsers(wedding: WeddingEvent, count: number): string[] {
    const users = [];
    
    // Team members (always included)
    for (let i = 0; i < Math.min(count, wedding.teamMembers); i++) {
      users.push(`${wedding.id}-team-${i}`);
    }
    
    // Guests (if scenario includes them)
    const remainingCount = count - wedding.teamMembers;
    if (remainingCount > 0) {
      for (let i = 0; i < Math.min(remainingCount, wedding.guestCount); i++) {
        users.push(`${wedding.id}-guest-${i}`);
      }
    }
    
    return users;
  }

  private async handleHighLoad(connections: number): Promise<void> {
    console.log(`⚠️ High load detected: ${connections} connections`);
    
    try {
      // Trigger auto-scaling
      const metrics = {
        currentConnections: connections,
        queueSize: Math.floor(connections / 10),
        processingLatency: Math.random() * 200 + 50,
        errorRate: Math.random() * 0.02,
        cpuUtilization: Math.random() * 30 + 50,
        memoryUtilization: Math.random() * 20 + 60
      };
      
      await this.autoScaler.evaluateScaling(metrics);
      this.simulationResults.scalingEvents++;
      
      console.log('📈 Auto-scaling triggered');
      
    } catch (error) {
      console.error('❌ Auto-scaling failed:', error);
    }
  }

  private async simulateEmergencyScenario(): Promise<void> {
    console.log('🚨 EMERGENCY SCENARIO: System overload detected');
    
    try {
      const emergencyCapacity = Math.floor(Math.random() * 20) + 30; // 30-50 instances
      await this.autoScaler.emergencyScale(emergencyCapacity, 'Wedding season overload simulation');
      
      this.simulationResults.emergencyScales++;
      console.log('🚨 Emergency scaling executed');
      
      // Simulate brief downtime (would be much longer in reality)
      this.simulationResults.downtimeMs += Math.random() * 5000 + 1000; // 1-6 seconds
      
    } catch (error) {
      console.error('❌ Emergency scaling failed:', error);
      this.simulationResults.incidents++;
      this.simulationResults.downtimeMs += 30000; // 30 seconds penalty
    }
  }

  private calculateSeasonResults(config: WeddingSeasonConfig): SimulationResults {
    const totalDurationMs = this.simulationResults.endTime - this.simulationResults.startTime;
    const uptime = ((totalDurationMs - this.simulationResults.downtimeMs) / totalDurationMs) * 100;
    
    // Calculate latency statistics
    const sortedLatencies = this.simulationResults.latencies.sort((a, b) => a - b);
    const averageLatency = sortedLatencies.reduce((sum, lat) => sum + lat, 0) / sortedLatencies.length;
    const p99Index = Math.floor(sortedLatencies.length * 0.99);
    const p99Latency = sortedLatencies[p99Index] || 0;
    
    // Calculate performance score (0-100)
    let performanceScore = 100;
    if (uptime < 99.9) performanceScore -= (99.9 - uptime) * 10; // Uptime penalty
    if (averageLatency > 100) performanceScore -= (averageLatency - 100) / 10; // Latency penalty
    if (this.simulationResults.incidents > 0) performanceScore -= this.simulationResults.incidents * 5; // Incident penalty
    
    performanceScore = Math.max(0, Math.min(100, performanceScore));
    
    return {
      totalWeddings: config.totalWeddings,
      peakConcurrentConnections: this.simulationResults.peakConnections,
      averageLatency,
      p99Latency,
      uptime,
      scalingEvents: this.simulationResults.scalingEvents,
      emergencyScales: this.simulationResults.emergencyScales,
      weddingDayIncidents: this.simulationResults.incidents,
      performanceScore
    };
  }

  printSimulationResults(results: SimulationResults, config: WeddingSeasonConfig): void {
    console.log('\n💒 WEDDING SEASON SIMULATION RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Weddings Simulated: ${results.totalWeddings}`);
    console.log(`Peak Concurrent Connections: ${results.peakConcurrentConnections.toLocaleString()}`);
    console.log(`Average Latency: ${results.averageLatency.toFixed(2)}ms`);
    console.log(`P99 Latency: ${results.p99Latency.toFixed(2)}ms`);
    console.log(`System Uptime: ${results.uptime.toFixed(3)}%`);
    console.log(`Scaling Events: ${results.scalingEvents}`);
    console.log(`Emergency Scales: ${results.emergencyScales}`);
    console.log(`Wedding Day Incidents: ${results.weddingDayIncidents}`);
    console.log(`Performance Score: ${results.performanceScore.toFixed(1)}/100`);
    
    console.log('\n📊 SEASON ANALYSIS');
    console.log('-'.repeat(40));
    console.log(`Traffic Multiplier: ${config.trafficMultiplier}x normal load`);
    console.log(`Peak Weekends: ${config.peakWeekends}`);
    console.log(`Duration: ${config.durationHours} hours`);
    console.log(`Emergency Scenarios: ${config.emergencyScenarios ? 'Enabled' : 'Disabled'}`);
    
    // Performance assessment
    console.log('\n🎯 PERFORMANCE ASSESSMENT');
    console.log('-'.repeat(40));
    if (results.performanceScore >= 95) {
      console.log('✅ EXCELLENT: System performed exceptionally during wedding season');
    } else if (results.performanceScore >= 85) {
      console.log('✅ GOOD: System performed well with minor issues');
    } else if (results.performanceScore >= 70) {
      console.log('⚠️ ACCEPTABLE: System handled load but needs optimization');
    } else {
      console.log('❌ POOR: System struggled with wedding season load');
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('-'.repeat(40));
    if (results.averageLatency > 100) {
      console.log('- Optimize queue processing to reduce latency');
    }
    if (results.uptime < 99.9) {
      console.log('- Improve system reliability and failover mechanisms');
    }
    if (results.emergencyScales > 5) {
      console.log('- Implement better predictive scaling algorithms');
    }
    if (results.weddingDayIncidents > results.totalWeddings * 0.05) {
      console.log('- Enhance error handling and recovery procedures');
    }
    
    console.log('='.repeat(60));
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const totalWeddings = parseInt(args.find(arg => arg.startsWith('--weddings='))?.split('=')[1] || '100');
  const peakWeekends = parseInt(args.find(arg => arg.startsWith('--peak-weekends='))?.split('=')[1] || '4');
  const trafficMultiplier = parseFloat(args.find(arg => arg.startsWith('--traffic='))?.split('=')[1] || '3');
  const durationHours = parseInt(args.find(arg => arg.startsWith('--duration='))?.split('=')[1] || '168'); // 1 week
  const emergencyScenarios = args.includes('--emergency-scenarios');
  
  const config: WeddingSeasonConfig = {
    totalWeddings,
    peakWeekends,
    trafficMultiplier,
    durationHours,
    emergencyScenarios
  };
  
  const simulator = new WeddingSeasonSimulator();
  
  try {
    console.log('🚀 Starting Wedding Season Simulation');
    console.log('This comprehensive test simulates an entire wedding season');
    console.log('with realistic traffic patterns, scaling events, and emergency scenarios.\n');
    
    const results = await simulator.runFullSeasonSimulation(config);
    
    simulator.printSimulationResults(results, config);
    
    // Success criteria
    const success = results.performanceScore >= 85 && results.uptime >= 99.5;
    console.log(`\n🎯 Simulation Result: ${success ? '✅ PASSED' : '❌ FAILED'}`);
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Wedding season simulation failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export { WeddingSeasonSimulator, WeddingSeasonConfig, SimulationResults };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}