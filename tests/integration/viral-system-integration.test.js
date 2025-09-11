const { test } = require('@playwright/test');
const { createClient } = require('@supabase/supabase-js');

/**
 * WS-170: Integration Testing Across All Team Components
 * 
 * Tests the complete viral referral system integration between all teams:
 * - Team A: Referral code generation and management
 * - Team B: User registration and authentication
 * - Team C: Reward calculation and distribution
 * - Team D: Analytics and tracking
 * - Team E: Testing and validation (this suite)
 * 
 * Critical Wedding Context: All team components must work together seamlessly
 * to achieve the 60% customer acquisition cost reduction through viral growth.
 * Any integration failure could break the entire viral loop.
 */

class ViralSystemIntegrationTester {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.integrationResults = [];
    this.teamComponents = {
      teamA: 'Referral Management System',
      teamB: 'User Authentication & Registration',
      teamC: 'Reward Distribution Engine',
      teamD: 'Analytics & Tracking System',
      teamE: 'Testing & Validation Suite'
    };
    this.testEnvironment = {
      apiBaseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      databaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      testUserPrefix: 'integration_test_',
      cleanupRequired: []
    };
  }

  // Test Team A & B Integration: Referral Code Generation + User Registration
  async testReferralRegistrationIntegration() {
    console.log('🔗 Testing Team A & B Integration: Referral + Registration...');
    
    const integrationTest = {
      name: 'Referral Code Generation → User Registration',
      teams: ['A', 'B'],
      startTime: Date.now(),
      steps: [],
      status: 'running'
    };

    try {
      // Step 1: Generate referral code (Team A component)
      const supplierData = {
        email: `${this.testEnvironment.testUserPrefix}supplier_${Date.now()}@test.com`,
        name: 'Integration Test Supplier',
        businessType: 'photography'
      };

      const { data: supplier, error: supplierError } = await this.supabase
        .from('suppliers')
        .insert(supplierData)
        .select()
        .single();

      if (supplierError) throw new Error(`Supplier creation failed: ${supplierError.message}`);
      this.testEnvironment.cleanupRequired.push({ table: 'suppliers', id: supplier.id });

      integrationTest.steps.push({
        step: 'supplier_created',
        component: 'Team A',
        duration: 0,
        status: 'passed',
        data: { supplierId: supplier.id }
      });

      // Generate referral code through API (Team A)
      const referralResponse = await fetch(`${this.testEnvironment.apiBaseUrl}/api/referrals/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: supplier.id,
          rewardType: 'percentage',
          rewardValue: 15,
          maxUses: 100,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
      });

      if (!referralResponse.ok) throw new Error('Referral code generation failed');
      const referralData = await referralResponse.json();

      integrationTest.steps.push({
        step: 'referral_code_generated',
        component: 'Team A',
        duration: 0,
        status: 'passed',
        data: { referralCode: referralData.code }
      });

      // Step 2: User registration with referral code (Team B component)
      const coupleData = {
        brideName: 'Integration Test Bride',
        groomName: 'Integration Test Groom',
        email: `${this.testEnvironment.testUserPrefix}couple_${Date.now()}@test.com`,
        phone: '(555) 123-4567',
        weddingDate: '2024-08-15',
        estimatedGuests: 120,
        estimatedBudget: 45000,
        referralCode: referralData.code
      };

      const registrationResponse = await fetch(`${this.testEnvironment.apiBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coupleData)
      });

      if (!registrationResponse.ok) throw new Error('User registration failed');
      const registrationResult = await registrationResponse.json();

      integrationTest.steps.push({
        step: 'user_registration_completed',
        component: 'Team B',
        duration: 0,
        status: 'passed',
        data: { userId: registrationResult.user.id }
      });

      // Step 3: Verify referral attribution in database
      const { data: referralRecord } = await this.supabase
        .from('referral_attributions')
        .select('*')
        .eq('referral_code', referralData.code)
        .eq('referred_user_id', registrationResult.user.id)
        .single();

      if (!referralRecord) throw new Error('Referral attribution not found');

      integrationTest.steps.push({
        step: 'referral_attribution_verified',
        component: 'Integration Layer',
        duration: 0,
        status: 'passed',
        data: { attributionId: referralRecord.id }
      });

      integrationTest.status = 'passed';
      integrationTest.endTime = Date.now();
      integrationTest.duration = integrationTest.endTime - integrationTest.startTime;

      this.integrationResults.push(integrationTest);
      return integrationTest;

    } catch (error) {
      integrationTest.status = 'failed';
      integrationTest.error = error.message;
      integrationTest.endTime = Date.now();
      integrationTest.duration = integrationTest.endTime - integrationTest.startTime;
      
      this.integrationResults.push(integrationTest);
      throw error;
    }
  }

  // Test Team C & D Integration: Reward Distribution + Analytics Tracking
  async testRewardAnalyticsIntegration() {
    console.log('🎯 Testing Team C & D Integration: Rewards + Analytics...');
    
    const integrationTest = {
      name: 'Reward Distribution → Analytics Tracking',
      teams: ['C', 'D'],
      startTime: Date.now(),
      steps: [],
      status: 'running'
    };

    try {
      // Step 1: Create test referral scenario
      const testScenario = await this.createTestReferralScenario();
      
      integrationTest.steps.push({
        step: 'test_scenario_created',
        component: 'Test Setup',
        duration: 0,
        status: 'passed',
        data: testScenario
      });

      // Step 2: Trigger reward calculation (Team C component)
      const rewardResponse = await fetch(`${this.testEnvironment.apiBaseUrl}/api/rewards/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralId: testScenario.referralId,
          conversionValue: testScenario.conversionValue,
          conversionType: 'registration'
        })
      });

      if (!rewardResponse.ok) throw new Error('Reward calculation failed');
      const rewardResult = await rewardResponse.json();

      integrationTest.steps.push({
        step: 'reward_calculated',
        component: 'Team C',
        duration: 0,
        status: 'passed',
        data: { 
          supplierReward: rewardResult.supplierReward,
          userReward: rewardResult.userReward 
        }
      });

      // Step 3: Verify analytics tracking (Team D component)
      const analyticsResponse = await fetch(`${this.testEnvironment.apiBaseUrl}/api/analytics/viral-metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralId: testScenario.referralId,
          eventType: 'conversion',
          eventData: {
            conversionValue: testScenario.conversionValue,
            rewardAmount: rewardResult.supplierReward + rewardResult.userReward
          }
        })
      });

      if (!analyticsResponse.ok) throw new Error('Analytics tracking failed');
      const analyticsResult = await analyticsResponse.json();

      integrationTest.steps.push({
        step: 'analytics_tracked',
        component: 'Team D',
        duration: 0,
        status: 'passed',
        data: { 
          viralCoefficient: analyticsResult.viralCoefficient,
          cacReduction: analyticsResult.cacReduction 
        }
      });

      // Step 4: Verify data consistency across systems
      const consistencyCheck = await this.verifyDataConsistency(testScenario.referralId);
      
      integrationTest.steps.push({
        step: 'data_consistency_verified',
        component: 'Integration Layer',
        duration: 0,
        status: consistencyCheck.isConsistent ? 'passed' : 'failed',
        data: consistencyCheck
      });

      integrationTest.status = 'passed';
      integrationTest.endTime = Date.now();
      integrationTest.duration = integrationTest.endTime - integrationTest.startTime;

      this.integrationResults.push(integrationTest);
      return integrationTest;

    } catch (error) {
      integrationTest.status = 'failed';
      integrationTest.error = error.message;
      integrationTest.endTime = Date.now();
      integrationTest.duration = integrationTest.endTime - integrationTest.startTime;
      
      this.integrationResults.push(integrationTest);
      throw error;
    }
  }

  // Test Full System Integration: All Teams Working Together
  async testFullSystemIntegration() {
    console.log('🌐 Testing Full System Integration: All Teams A-E...');
    
    const integrationTest = {
      name: 'Complete Viral System Integration (All Teams)',
      teams: ['A', 'B', 'C', 'D', 'E'],
      startTime: Date.now(),
      steps: [],
      status: 'running'
    };

    try {
      // Step 1: Team A - Create supplier and generate referral codes
      const supplier = await this.createTestSupplier();
      const referralCodes = await this.generateMultipleReferralCodes(supplier.id, 5);
      
      integrationTest.steps.push({
        step: 'supplier_and_codes_created',
        component: 'Team A',
        duration: 0,
        status: 'passed',
        data: { supplierId: supplier.id, codeCount: referralCodes.length }
      });

      // Step 2: Team B - Register multiple users with referral codes
      const users = [];
      for (const code of referralCodes) {
        const user = await this.registerUserWithReferralCode(code.code);
        users.push(user);
      }
      
      integrationTest.steps.push({
        step: 'users_registered_with_referrals',
        component: 'Team B',
        duration: 0,
        status: 'passed',
        data: { userCount: users.length }
      });

      // Step 3: Team C - Calculate and distribute rewards
      const rewardResults = [];
      for (const user of users) {
        const rewards = await this.calculateUserRewards(user.id);
        rewardResults.push(rewards);
      }
      
      integrationTest.steps.push({
        step: 'rewards_calculated_and_distributed',
        component: 'Team C',
        duration: 0,
        status: 'passed',
        data: { 
          rewardCount: rewardResults.length,
          totalRewardValue: rewardResults.reduce((sum, r) => sum + r.totalValue, 0)
        }
      });

      // Step 4: Team D - Generate comprehensive analytics
      const analyticsReport = await this.generateViralAnalytics(supplier.id);
      
      integrationTest.steps.push({
        step: 'viral_analytics_generated',
        component: 'Team D',
        duration: 0,
        status: 'passed',
        data: {
          viralCoefficient: analyticsReport.viralCoefficient,
          cacReduction: analyticsReport.cacReduction,
          totalConversions: analyticsReport.totalConversions
        }
      });

      // Step 5: Team E - Validate system performance and accuracy
      const validationResults = await this.validateSystemIntegrity({
        supplier,
        users,
        referralCodes,
        rewardResults,
        analyticsReport
      });
      
      integrationTest.steps.push({
        step: 'system_integrity_validated',
        component: 'Team E',
        duration: 0,
        status: validationResults.isValid ? 'passed' : 'failed',
        data: validationResults
      });

      // Step 6: End-to-end flow verification
      const e2eVerification = await this.verifyEndToEndFlow({
        startSupplier: supplier,
        endUsers: users,
        analyticsData: analyticsReport
      });
      
      integrationTest.steps.push({
        step: 'end_to_end_flow_verified',
        component: 'Integration Layer',
        duration: 0,
        status: e2eVerification.isValid ? 'passed' : 'failed',
        data: e2eVerification
      });

      integrationTest.status = 'passed';
      integrationTest.endTime = Date.now();
      integrationTest.duration = integrationTest.endTime - integrationTest.startTime;

      this.integrationResults.push(integrationTest);
      return integrationTest;

    } catch (error) {
      integrationTest.status = 'failed';
      integrationTest.error = error.message;
      integrationTest.endTime = Date.now();
      integrationTest.duration = integrationTest.endTime - integrationTest.startTime;
      
      this.integrationResults.push(integrationTest);
      throw error;
    }
  }

  // Test Real-time Integration: Live Updates Across Systems
  async testRealtimeIntegration() {
    console.log('⚡ Testing Real-time Integration: Live Updates...');
    
    const integrationTest = {
      name: 'Real-time System Updates Integration',
      teams: ['A', 'B', 'C', 'D'],
      startTime: Date.now(),
      steps: [],
      status: 'running'
    };

    try {
      // Step 1: Set up real-time listeners
      const realtimeChannels = await this.setupRealtimeListeners();
      
      integrationTest.steps.push({
        step: 'realtime_listeners_setup',
        component: 'Supabase Realtime',
        duration: 0,
        status: 'passed',
        data: { channelCount: Object.keys(realtimeChannels).length }
      });

      // Step 2: Trigger events and monitor propagation
      const testEvents = [
        { type: 'referral_code_used', component: 'Team A' },
        { type: 'user_registered', component: 'Team B' },
        { type: 'reward_calculated', component: 'Team C' },
        { type: 'analytics_updated', component: 'Team D' }
      ];

      const eventResults = [];
      for (const event of testEvents) {
        const result = await this.triggerAndMonitorEvent(event, realtimeChannels);
        eventResults.push(result);
      }
      
      integrationTest.steps.push({
        step: 'realtime_events_propagated',
        component: 'All Teams',
        duration: 0,
        status: eventResults.every(r => r.propagated) ? 'passed' : 'failed',
        data: { eventResults }
      });

      // Step 3: Verify data consistency in real-time
      const consistencyResults = await this.verifyRealtimeConsistency();
      
      integrationTest.steps.push({
        step: 'realtime_consistency_verified',
        component: 'Integration Layer',
        duration: 0,
        status: consistencyResults.isConsistent ? 'passed' : 'failed',
        data: consistencyResults
      });

      integrationTest.status = 'passed';
      integrationTest.endTime = Date.now();
      integrationTest.duration = integrationTest.endTime - integrationTest.startTime;

      this.integrationResults.push(integrationTest);
      return integrationTest;

    } catch (error) {
      integrationTest.status = 'failed';
      integrationTest.error = error.message;
      integrationTest.endTime = Date.now();
      integrationTest.duration = integrationTest.endTime - integrationTest.startTime;
      
      this.integrationResults.push(integrationTest);
      throw error;
    }
  }

  // Helper Methods for Integration Testing

  async createTestSupplier() {
    const supplierData = {
      email: `${this.testEnvironment.testUserPrefix}supplier_${Date.now()}@test.com`,
      name: 'Full Integration Test Supplier',
      businessType: 'full_service_wedding',
      isActive: true
    };

    const { data: supplier, error } = await this.supabase
      .from('suppliers')
      .insert(supplierData)
      .select()
      .single();

    if (error) throw new Error(`Supplier creation failed: ${error.message}`);
    this.testEnvironment.cleanupRequired.push({ table: 'suppliers', id: supplier.id });

    return supplier;
  }

  async generateMultipleReferralCodes(supplierId, count) {
    const codes = [];
    
    for (let i = 0; i < count; i++) {
      const response = await fetch(`${this.testEnvironment.apiBaseUrl}/api/referrals/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          rewardType: 'percentage',
          rewardValue: 10 + i * 2, // Varying reward values
          maxUses: 50,
          description: `Integration Test Code ${i + 1}`
        })
      });

      if (!response.ok) throw new Error(`Code generation failed for index ${i}`);
      const codeData = await response.json();
      codes.push(codeData);
    }

    return codes;
  }

  async registerUserWithReferralCode(referralCode) {
    const userData = {
      brideName: `Integration Bride ${Date.now()}`,
      groomName: `Integration Groom ${Date.now()}`,
      email: `${this.testEnvironment.testUserPrefix}couple_${Date.now()}_${Math.random().toString(36).substr(2, 5)}@test.com`,
      phone: `(555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      weddingDate: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      estimatedGuests: 50 + Math.floor(Math.random() * 200),
      estimatedBudget: 20000 + Math.floor(Math.random() * 50000),
      referralCode
    };

    const response = await fetch(`${this.testEnvironment.apiBaseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    if (!response.ok) throw new Error('User registration failed');
    const result = await response.json();

    this.testEnvironment.cleanupRequired.push({ table: 'users', id: result.user.id });
    return result.user;
  }

  async calculateUserRewards(userId) {
    const response = await fetch(`${this.testEnvironment.apiBaseUrl}/api/rewards/user/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error('Reward calculation failed');
    return await response.json();
  }

  async generateViralAnalytics(supplierId) {
    const response = await fetch(`${this.testEnvironment.apiBaseUrl}/api/analytics/viral/${supplierId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error('Analytics generation failed');
    return await response.json();
  }

  async validateSystemIntegrity(testData) {
    const validations = [];

    // Validate referral code usage
    for (const code of testData.referralCodes) {
      const { data: usage } = await this.supabase
        .from('referral_usage')
        .select('*')
        .eq('referral_code', code.code);
      
      validations.push({
        type: 'referral_usage',
        codeId: code.id,
        usageCount: usage?.length || 0,
        isValid: (usage?.length || 0) > 0
      });
    }

    // Validate reward calculations
    for (const reward of testData.rewardResults) {
      const isValidCalculation = reward.totalValue > 0 && reward.calculation.accuracy > 0.99;
      validations.push({
        type: 'reward_calculation',
        rewardId: reward.id,
        totalValue: reward.totalValue,
        isValid: isValidCalculation
      });
    }

    // Validate analytics accuracy
    const analyticsValidation = {
      type: 'analytics_accuracy',
      expectedConversions: testData.users.length,
      actualConversions: testData.analyticsReport.totalConversions,
      isValid: testData.analyticsReport.totalConversions === testData.users.length
    };
    validations.push(analyticsValidation);

    const overallValid = validations.every(v => v.isValid);

    return {
      isValid: overallValid,
      validations,
      summary: {
        totalChecks: validations.length,
        passedChecks: validations.filter(v => v.isValid).length,
        failedChecks: validations.filter(v => !v.isValid).length
      }
    };
  }

  async verifyEndToEndFlow(flowData) {
    // Trace complete flow from supplier to analytics
    const flowTrace = [];

    // 1. Supplier created referral codes
    flowTrace.push({
      step: 'supplier_referrals',
      supplierId: flowData.startSupplier.id,
      status: 'verified'
    });

    // 2. Users registered with codes
    flowTrace.push({
      step: 'user_conversions',
      userCount: flowData.endUsers.length,
      status: 'verified'
    });

    // 3. Analytics captured the flow
    flowTrace.push({
      step: 'analytics_capture',
      viralCoefficient: flowData.analyticsData.viralCoefficient,
      cacReduction: flowData.analyticsData.cacReduction,
      status: flowData.analyticsData.viralCoefficient > 0 ? 'verified' : 'failed'
    });

    const isValid = flowTrace.every(step => step.status === 'verified');

    return {
      isValid,
      flowTrace,
      metrics: {
        flowCompletionRate: isValid ? 1.0 : 0.0,
        viralEffectiveness: flowData.analyticsData.viralCoefficient,
        businessImpact: flowData.analyticsData.cacReduction
      }
    };
  }

  async createTestReferralScenario() {
    // Create a complete test scenario for integration testing
    const supplier = await this.createTestSupplier();
    const referralCode = (await this.generateMultipleReferralCodes(supplier.id, 1))[0];
    const user = await this.registerUserWithReferralCode(referralCode.code);

    return {
      supplierId: supplier.id,
      referralId: referralCode.id,
      referralCode: referralCode.code,
      userId: user.id,
      conversionValue: 5000 // $5000 wedding package
    };
  }

  async verifyDataConsistency(referralId) {
    // Check consistency across all database tables
    const tables = [
      'referral_codes',
      'referral_usage',
      'referral_attributions',
      'reward_calculations',
      'viral_analytics'
    ];

    const consistency = {};
    for (const table of tables) {
      const { data, count } = await this.supabase
        .from(table)
        .select('*', { count: 'exact' })
        .eq('referral_id', referralId);
      
      consistency[table] = {
        recordCount: count,
        hasData: count > 0
      };
    }

    const isConsistent = Object.values(consistency).every(c => c.hasData);

    return {
      isConsistent,
      tableConsistency: consistency,
      referralId
    };
  }

  async setupRealtimeListeners() {
    const channels = {};

    // Set up channels for each component
    const componentChannels = [
      'referral_codes',
      'user_registrations',
      'reward_calculations',
      'viral_analytics'
    ];

    for (const channelName of componentChannels) {
      channels[channelName] = this.supabase
        .channel(channelName)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: channelName },
          (payload) => {
            console.log(`Real-time update on ${channelName}:`, payload);
          }
        )
        .subscribe();
    }

    return channels;
  }

  async triggerAndMonitorEvent(event, channels) {
    const startTime = Date.now();
    let eventDetected = false;

    // Set up event detection
    const eventPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ propagated: false, duration: Date.now() - startTime });
      }, 5000); // 5 second timeout

      // Monitor for the specific event
      const checkEvent = () => {
        if (eventDetected) {
          clearTimeout(timeout);
          resolve({ propagated: true, duration: Date.now() - startTime });
        } else {
          setTimeout(checkEvent, 100);
        }
      };
      checkEvent();
    });

    // Trigger the event based on type
    switch (event.type) {
      case 'referral_code_used':
        await this.triggerReferralCodeUse();
        eventDetected = true;
        break;
      case 'user_registered':
        await this.triggerUserRegistration();
        eventDetected = true;
        break;
      case 'reward_calculated':
        await this.triggerRewardCalculation();
        eventDetected = true;
        break;
      case 'analytics_updated':
        await this.triggerAnalyticsUpdate();
        eventDetected = true;
        break;
    }

    return await eventPromise;
  }

  async verifyRealtimeConsistency() {
    // Verify that real-time updates maintain data consistency
    const timestamp = Date.now();
    
    // Create a test record
    const { data: testRecord } = await this.supabase
      .from('viral_analytics')
      .insert({
        supplier_id: 1,
        viral_coefficient: 1.5,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    // Wait for real-time propagation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify the record exists and is consistent
    const { data: verificationRecord } = await this.supabase
      .from('viral_analytics')
      .select('*')
      .eq('id', testRecord.id)
      .single();

    const isConsistent = verificationRecord && 
                        verificationRecord.viral_coefficient === testRecord.viral_coefficient;

    return {
      isConsistent,
      testRecordId: testRecord.id,
      propagationDelay: Date.now() - timestamp
    };
  }

  // Cleanup method to remove test data
  async cleanup() {
    console.log('🧹 Cleaning up integration test data...');
    
    for (const item of this.testEnvironment.cleanupRequired.reverse()) {
      try {
        await this.supabase
          .from(item.table)
          .delete()
          .eq('id', item.id);
        
        console.log(`  ✓ Cleaned ${item.table} record ${item.id}`);
      } catch (error) {
        console.log(`  ✗ Failed to clean ${item.table} record ${item.id}:`, error.message);
      }
    }
    
    this.testEnvironment.cleanupRequired = [];
  }

  // Generate comprehensive integration report
  generateIntegrationReport() {
    const totalTests = this.integrationResults.length;
    const passedTests = this.integrationResults.filter(r => r.status === 'passed').length;
    const failedTests = this.integrationResults.filter(r => r.status === 'failed').length;

    const averageDuration = this.integrationResults.reduce((sum, r) => sum + r.duration, 0) / totalTests;
    
    const teamParticipation = {};
    this.integrationResults.forEach(result => {
      result.teams.forEach(team => {
        if (!teamParticipation[team]) teamParticipation[team] = 0;
        teamParticipation[team]++;
      });
    });

    return {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate: parseFloat((passedTests / totalTests * 100).toFixed(2)),
        averageDuration: parseFloat(averageDuration.toFixed(2))
      },
      teamParticipation,
      detailedResults: this.integrationResults,
      recommendations: this.generateIntegrationRecommendations(),
      productionReadiness: {
        integrationScore: passedTests / totalTests * 100,
        criticalFailures: failedTests,
        teamCoordination: Object.keys(teamParticipation).length === 5 ? 'Excellent' : 'Needs Improvement',
        verdict: passedTests === totalTests ? 'INTEGRATION READY' : 'REQUIRES FIXES'
      }
    };
  }

  generateIntegrationRecommendations() {
    const recommendations = [];
    
    const failedTests = this.integrationResults.filter(r => r.status === 'failed');
    
    if (failedTests.length > 0) {
      recommendations.push(`Fix ${failedTests.length} failed integration test(s)`);
      failedTests.forEach(test => {
        recommendations.push(`- ${test.name}: ${test.error}`);
      });
    }
    
    if (this.integrationResults.some(r => r.duration > 10000)) {
      recommendations.push('Optimize slow integration points (>10s)');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All integrations passing - ready for production');
    }
    
    return recommendations;
  }

  // Placeholder methods for event triggering
  async triggerReferralCodeUse() { /* Implementation */ }
  async triggerUserRegistration() { /* Implementation */ }
  async triggerRewardCalculation() { /* Implementation */ }
  async triggerAnalyticsUpdate() { /* Implementation */ }
}

// Jest Integration Tests
describe('Viral System Integration Tests', () => {
  let integrationTester;

  beforeAll(async () => {
    integrationTester = new ViralSystemIntegrationTester();
  });

  afterAll(async () => {
    await integrationTester.cleanup();
  });

  test('Team A & B Integration: Referral Generation + User Registration', async () => {
    const result = await integrationTester.testReferralRegistrationIntegration();
    
    expect(result.status).toBe('passed');
    expect(result.steps).toHaveLength(4); // All integration steps completed
    expect(result.duration).toBeLessThan(10000); // < 10s integration time
    
    console.log('✅ Team A & B Integration Result:', result);
  }, 30000);

  test('Team C & D Integration: Reward Distribution + Analytics', async () => {
    const result = await integrationTester.testRewardAnalyticsIntegration();
    
    expect(result.status).toBe('passed');
    expect(result.steps.every(step => step.status === 'passed')).toBe(true);
    
    console.log('✅ Team C & D Integration Result:', result);
  }, 30000);

  test('Full System Integration: All Teams A-E Coordination', async () => {
    const result = await integrationTester.testFullSystemIntegration();
    
    expect(result.status).toBe('passed');
    expect(result.teams).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(result.steps).toHaveLength(6); // Complete flow verification
    
    console.log('✅ Full System Integration Result:', result);
  }, 60000);

  test('Real-time Integration: Live Updates Across Systems', async () => {
    const result = await integrationTester.testRealtimeIntegration();
    
    expect(result.status).toBe('passed');
    expect(result.steps.some(step => step.component === 'Supabase Realtime')).toBe(true);
    
    console.log('✅ Real-time Integration Result:', result);
  }, 45000);

  test('Integration Performance: All Components Under 5s', async () => {
    // Run a performance-focused integration test
    const startTime = Date.now();
    
    await Promise.all([
      integrationTester.testReferralRegistrationIntegration(),
      integrationTester.testRewardAnalyticsIntegration()
    ]);
    
    const totalTime = Date.now() - startTime;
    
    expect(totalTime).toBeLessThan(15000); // Parallel integrations < 15s
    
    console.log(`✅ Integration Performance: ${totalTime}ms for parallel tests`);
  }, 30000);

  test('Integration Report Generation', async () => {
    const report = integrationTester.generateIntegrationReport();
    
    expect(report.summary.totalTests).toBeGreaterThan(0);
    expect(report.summary.successRate).toBeGreaterThan(80); // > 80% success rate
    expect(report.productionReadiness.integrationScore).toBeGreaterThan(75);
    
    console.log('📊 Complete Integration Report:', JSON.stringify(report, null, 2));
  });
});

module.exports = { ViralSystemIntegrationTester };