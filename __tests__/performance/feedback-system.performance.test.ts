/**
 * WS-236 User Feedback System Performance Tests
 * Team D: Platform Implementation - Performance & Load Testing
 * 
 * Tests database query performance, index effectiveness,
 * and system scalability under load.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/testing-library/jest-dom';
import { supabase } from '@/lib/supabase';
import { performance } from 'perf_hooks';

// Performance test helpers
const measureQueryTime = async (queryFunction: () => Promise<any>): Promise<number> => {
  const start = performance.now();
  await queryFunction();
  const end = performance.now();
  return end - start;
};

const createBulkTestData = async (recordCount: number) => {
  const testUsers = [];
  const testSessions = [];
  const testResponses = [];
  const testNpsSurveys = [];

  // Create test users
  for (let i = 0; i < Math.min(recordCount / 10, 100); i++) {
    const { data: user } = await supabase.auth.signUp({
      email: `perf-test-${i}@example.com`,
      password: 'testpassword123'
    });
    
    if (user.user) {
      testUsers.push(user.user.id);
      
      await supabase.from('user_profiles').insert({
        user_id: user.user.id,
        user_type: i % 2 === 0 ? 'supplier' : 'couple',
        vendor_type: ['photographer', 'planner', 'venue', 'florist'][i % 4],
        business_name: `Performance Test Business ${i}`,
        tier: ['starter', 'professional', 'scale'][i % 3]
      });
    }
  }

  // Create feedback sessions
  const sessionPromises = [];
  for (let i = 0; i < recordCount; i++) {
    const userId = testUsers[i % testUsers.length];
    const sessionData = {
      user_id: userId,
      session_type: ['nps', 'feature', 'onboarding'][i % 3],
      trigger_reason: 'performance_test',
      user_type: i % 2 === 0 ? 'supplier' : 'couple',
      user_tier: ['starter', 'professional', 'scale'][i % 3],
      account_age_days: Math.floor(Math.random() * 365),
      engagement_score: Math.random(),
      device_type: ['desktop', 'mobile', 'tablet'][i % 3],
      browser: ['chrome', 'safari', 'firefox'][i % 3],
      page_url: `/test-page-${i % 10}`,
      completed_at: Math.random() > 0.3 ? new Date().toISOString() : null,
      questions_total: 5,
      questions_answered: Math.floor(Math.random() * 5) + 1,
      completion_rate: Math.random(),
      overall_sentiment: (Math.random() - 0.5) * 2 // -1 to 1
    };
    
    sessionPromises.push(
      supabase.from('feedback_sessions').insert(sessionData).select('id').single()
    );
  }

  const sessionResults = await Promise.all(sessionPromises);
  sessionResults.forEach(result => {
    if (result.data) testSessions.push(result.data.id);
  });

  // Create feedback responses
  const responsePromises = [];
  testSessions.forEach((sessionId, index) => {
    for (let j = 0; j < Math.floor(Math.random() * 5) + 1; j++) {
      const responseData = {
        session_id: sessionId,
        question_key: `question_${j}`,
        question_text: `Performance test question ${j}`,
        question_type: ['nps', 'rating', 'text', 'choice'][j % 4],
        nps_score: j === 0 ? Math.floor(Math.random() * 11) : null,
        rating_value: j === 1 ? Math.floor(Math.random() * 5) + 1 : null,
        text_value: j === 2 ? `Performance test feedback text ${index}-${j}` : null,
        choice_value: j === 3 ? ['option1', 'option2', 'option3'][Math.floor(Math.random() * 3)] : null,
        sentiment_score: j === 2 ? (Math.random() - 0.5) * 2 : null,
        keywords: j === 2 ? [`keyword${j}`, `test${index}`] : null,
        themes: j === 2 ? [`theme${j % 3}`, 'performance_test'] : null,
        time_to_respond_seconds: Math.floor(Math.random() * 300),
        question_order: j
      };
      
      responsePromises.push(
        supabase.from('feedback_responses').insert(responseData)
      );
    }
  });

  await Promise.all(responsePromises);

  // Create NPS surveys for sessions
  const npsPromises = testSessions
    .filter((_, index) => index % 3 === 0) // 1/3 of sessions have NPS
    .map((sessionId, index) => {
      const score = Math.floor(Math.random() * 11);
      return supabase.from('nps_surveys').insert({
        user_id: testUsers[index % testUsers.length],
        session_id: sessionId,
        score,
        category: score >= 9 ? 'promoter' : score >= 7 ? 'passive' : 'detractor',
        feedback_text: `Performance test NPS feedback ${index}`,
        trigger_reason: 'performance_test',
        completed_at: new Date().toISOString(),
        user_journey_stage: ['onboarding', 'active', 'power_user'][index % 3],
        vendor_type: ['photographer', 'planner', 'venue'][index % 3]
      });
    });

  await Promise.all(npsPromises);

  return {
    userCount: testUsers.length,
    sessionCount: testSessions.length,
    responseCount: responsePromises.length
  };
};

const cleanupTestData = async () => {
  await supabase.from('feedback_responses').delete().eq('question_key', 'question_0');
  await supabase.from('nps_surveys').delete().eq('trigger_reason', 'performance_test');
  await supabase.from('feedback_sessions').delete().eq('trigger_reason', 'performance_test');
  await supabase.from('user_profiles').delete().like('business_name', '%Performance Test%');
};

describe('WS-236 Feedback System Performance Tests', () => {
  let testDataStats: any;

  beforeAll(async () => {
    // Create substantial test dataset
    console.log('Creating performance test data...');
    testDataStats = await createBulkTestData(1000);
    console.log('Test data created:', testDataStats);
  });

  afterAll(async () => {
    // Cleanup test data
    console.log('Cleaning up performance test data...');
    await cleanupTestData();
  });

  describe('Query Performance with Indexes', () => {
    it('should perform fast user feedback session lookup', async () => {
      const { data: users } = await supabase
        .from('user_profiles')
        .select('user_id')
        .like('business_name', '%Performance Test%')
        .limit(1);

      if (!users || users.length === 0) {
        throw new Error('No test users found');
      }

      const userId = users[0].user_id;

      const queryTime = await measureQueryTime(async () => {
        await supabase
          .from('feedback_sessions')
          .select('*')
          .eq('user_id', userId)
          .order('started_at', { ascending: false })
          .limit(10);
      });

      // Should complete in under 100ms with proper indexing
      expect(queryTime).toBeLessThan(100);
    });

    it('should perform fast NPS analytics calculation', async () => {
      const queryTime = await measureQueryTime(async () => {
        await supabase.rpc('get_nps_metrics', {
          p_start_date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
          p_end_date: new Date().toISOString().split('T')[0]
        });
      });

      // NPS calculation should complete in under 200ms
      expect(queryTime).toBeLessThan(200);
    });

    it('should perform fast feedback analytics aggregation', async () => {
      const today = new Date().toISOString().split('T')[0];

      const queryTime = await measureQueryTime(async () => {
        await supabase.rpc('calculate_daily_feedback_analytics', {
          target_date: today
        });
      });

      // Daily analytics calculation should complete in under 500ms
      expect(queryTime).toBeLessThan(500);
    });

    it('should perform fast sentiment-based filtering', async () => {
      const queryTime = await measureQueryTime(async () => {
        await supabase
          .from('feedback_responses')
          .select('session_id, text_value, sentiment_score, themes')
          .not('sentiment_score', 'is', null)
          .lt('sentiment_score', -0.3) // Negative sentiment
          .order('responded_at', { ascending: false })
          .limit(50);
      });

      // Sentiment filtering should complete in under 150ms
      expect(queryTime).toBeLessThan(150);
    });

    it('should perform fast theme-based searches using GIN indexes', async () => {
      const queryTime = await measureQueryTime(async () => {
        await supabase
          .from('feedback_responses')
          .select('session_id, text_value, themes, keywords')
          .contains('themes', ['performance_test'])
          .order('responded_at', { ascending: false })
          .limit(100);
      });

      // GIN index search should complete in under 100ms
      expect(queryTime).toBeLessThan(100);
    });

    it('should perform fast feature-specific feedback lookup', async () => {
      const queryTime = await measureQueryTime(async () => {
        await supabase
          .from('feature_feedback')
          .select('*')
          .eq('feature_name', 'form_builder')
          .gte('satisfaction_rating', 4)
          .order('created_at', { ascending: false })
          .limit(20);
      });

      // Feature feedback lookup should complete in under 80ms
      expect(queryTime).toBeLessThan(80);
    });
  });

  describe('Concurrent Load Testing', () => {
    it('should handle multiple concurrent feedback session creations', async () => {
      const { data: users } = await supabase
        .from('user_profiles')
        .select('user_id')
        .like('business_name', '%Performance Test%')
        .limit(10);

      if (!users || users.length === 0) {
        throw new Error('No test users found for load testing');
      }

      const concurrentSessions = users.map((user, index) => {
        return supabase.from('feedback_sessions').insert({
          user_id: user.user_id,
          session_type: 'nps',
          trigger_reason: 'load_test',
          user_type: 'supplier',
          user_tier: 'professional',
          account_age_days: 30,
          engagement_score: 0.8,
          device_type: 'desktop',
          browser: 'chrome',
          page_url: `/load-test-${index}`
        });
      });

      const startTime = performance.now();
      await Promise.all(concurrentSessions);
      const totalTime = performance.now() - startTime;

      // 10 concurrent session creations should complete in under 1 second
      expect(totalTime).toBeLessThan(1000);

      // Cleanup
      await supabase.from('feedback_sessions').delete().eq('trigger_reason', 'load_test');
    });

    it('should handle multiple concurrent rate limit checks', async () => {
      const { data: users } = await supabase
        .from('user_profiles')
        .select('user_id')
        .like('business_name', '%Performance Test%')
        .limit(20);

      if (!users || users.length === 0) {
        throw new Error('No test users found for load testing');
      }

      const concurrentChecks = users.map(user => {
        return supabase.rpc('check_user_feedback_eligibility', {
          p_user_id: user.user_id,
          p_feedback_type: 'nps'
        });
      });

      const startTime = performance.now();
      const results = await Promise.all(concurrentChecks);
      const totalTime = performance.now() - startTime;

      // 20 concurrent eligibility checks should complete in under 500ms
      expect(totalTime).toBeLessThan(500);
      
      // All checks should return valid results
      results.forEach(result => {
        expect(result.error).toBeNull();
        expect(result.data).toBeDefined();
      });
    });
  });

  describe('Materialized View Performance', () => {
    it('should provide fast dashboard summary access', async () => {
      const queryTime = await measureQueryTime(async () => {
        await supabase
          .from('feedback_dashboard_summary')
          .select('*')
          .single();
      });

      // Materialized view access should be very fast (under 50ms)
      expect(queryTime).toBeLessThan(50);
    });

    it('should handle dashboard summary refresh efficiently', async () => {
      const refreshTime = await measureQueryTime(async () => {
        await supabase.rpc('refresh_feedback_dashboard');
      });

      // View refresh should complete in under 2 seconds even with large dataset
      expect(refreshTime).toBeLessThan(2000);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should handle large result sets efficiently', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Query large dataset
      const { data, error } = await supabase
        .from('feedback_responses')
        .select('session_id, question_type, responded_at, sentiment_score')
        .order('responded_at', { ascending: false })
        .limit(1000);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (under 50MB for 1000 records)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle complex aggregation queries efficiently', async () => {
      const queryTime = await measureQueryTime(async () => {
        await supabase
          .from('feedback_sessions')
          .select(`
            session_type,
            user_type,
            user_tier,
            completion_rate,
            overall_sentiment,
            nps_surveys(score, category),
            feedback_responses(sentiment_score, themes)
          `)
          .not('completed_at', 'is', null)
          .gte('started_at', new Date(Date.now() - 7 * 86400000).toISOString())
          .limit(100);
      });

      // Complex join query should complete in under 300ms
      expect(queryTime).toBeLessThan(300);
    });
  });

  describe('Database Cleanup Performance', () => {
    it('should perform efficient data cleanup', async () => {
      // Create some old test data
      const oldDate = new Date(Date.now() - 4 * 365 * 86400000); // 4 years ago
      const { data: oldSession } = await supabase
        .from('feedback_sessions')
        .insert({
          user_id: (await supabase.from('user_profiles').select('user_id').limit(1).single()).data.user_id,
          session_type: 'nps',
          trigger_reason: 'cleanup_test',
          user_type: 'supplier',
          user_tier: 'professional',
          account_age_days: 1460,
          engagement_score: 0.5,
          created_at: oldDate.toISOString(),
          started_at: oldDate.toISOString(),
          completed_at: oldDate.toISOString()
        })
        .select('id')
        .single();

      const cleanupTime = await measureQueryTime(async () => {
        await supabase.rpc('cleanup_old_feedback_data', {
          retention_days: 1095 // 3 years
        });
      });

      // Cleanup should complete in under 5 seconds
      expect(cleanupTime).toBeLessThan(5000);

      // Verify old data was cleaned up
      const { data: remainingSession } = await supabase
        .from('feedback_sessions')
        .select('id')
        .eq('id', oldSession.id)
        .single();

      expect(remainingSession).toBeNull();
    });
  });

  describe('Index Effectiveness', () => {
    it('should use indexes effectively for common query patterns', async () => {
      // Test various query patterns that should use our indexes
      const queries = [
        // User session lookup (should use idx_feedback_sessions_user_lookup)
        () => supabase
          .from('feedback_sessions')
          .select('*')
          .eq('user_id', '00000000-0000-0000-0000-000000000000')
          .eq('session_type', 'nps')
          .order('started_at', { ascending: false }),

        // NPS analytics (should use idx_nps_surveys_analytics)
        () => supabase
          .from('nps_surveys')
          .select('score, category')
          .not('completed_at', 'is', null)
          .gte('completed_at', new Date(Date.now() - 86400000).toISOString()),

        // Feature feedback lookup (should use idx_feature_feedback_feature_analytics)
        () => supabase
          .from('feature_feedback')
          .select('*')
          .eq('feature_name', 'form_builder')
          .order('created_at', { ascending: false }),

        // Sentiment analysis (should use idx_feedback_responses_analysis)
        () => supabase
          .from('feedback_responses')
          .select('*')
          .not('sentiment_score', 'is', null)
          .order('responded_at', { ascending: false }),

        // Theme search (should use idx_feedback_responses_themes_gin)
        () => supabase
          .from('feedback_responses')
          .select('*')
          .contains('themes', ['efficiency'])
      ];

      for (const query of queries) {
        const queryTime = await measureQueryTime(query);
        // Each indexed query should complete in under 100ms
        expect(queryTime).toBeLessThan(100);
      }
    });
  });
});

describe('WS-236 Wedding Industry Specific Performance', () => {
  describe('Peak Season Load Simulation', () => {
    it('should handle wedding season feedback surge', async () => {
      // Simulate wedding season with higher feedback volume
      const weddingSeasonData = Array.from({ length: 100 }, (_, i) => ({
        user_id: '00000000-0000-0000-0000-000000000000',
        session_type: 'nps',
        trigger_reason: 'wedding_season_surge',
        user_type: 'supplier',
        user_tier: 'professional',
        account_age_days: 180,
        engagement_score: 0.9,
        device_type: 'mobile', // More mobile usage during weddings
        wedding_context: {
          season: 'peak',
          month: 'june',
          vendor_workload: 'very_busy'
        }
      }));

      const startTime = performance.now();
      
      const sessionPromises = weddingSeasonData.map(data =>
        supabase.from('feedback_sessions').insert(data)
      );

      await Promise.all(sessionPromises);
      const totalTime = performance.now() - startTime;

      // Should handle 100 concurrent session creations in under 2 seconds
      expect(totalTime).toBeLessThan(2000);

      // Cleanup
      await supabase
        .from('feedback_sessions')
        .delete()
        .eq('trigger_reason', 'wedding_season_surge');
    });

    it('should efficiently aggregate vendor type performance metrics', async () => {
      const vendorTypes = ['photographer', 'planner', 'venue', 'florist', 'dj'];
      
      const queryTime = await measureQueryTime(async () => {
        const vendorMetrics = await Promise.all(
          vendorTypes.map(async (vendorType) => {
            const { data } = await supabase
              .from('nps_surveys')
              .select('score, category')
              .eq('vendor_type', vendorType)
              .not('completed_at', 'is', null)
              .gte('completed_at', new Date(Date.now() - 30 * 86400000).toISOString());
            
            return {
              vendorType,
              surveys: data?.length || 0,
              avgScore: data?.reduce((sum, s) => sum + s.score, 0) / (data?.length || 1)
            };
          })
        );

        return vendorMetrics;
      });

      // Vendor segmentation should complete in under 300ms
      expect(queryTime).toBeLessThan(300);
    });
  });

  describe('Real-time Wedding Day Performance', () => {
    it('should prioritize wedding day feedback collection', async () => {
      // Simulate wedding day with high-priority feedback needs
      const weddingDaySession = {
        user_id: '00000000-0000-0000-0000-000000000000',
        session_type: 'urgent',
        trigger_reason: 'wedding_day_issue',
        user_type: 'supplier',
        user_tier: 'professional',
        account_age_days: 365,
        engagement_score: 1.0,
        priority_level: 'critical',
        wedding_context: {
          phase: 'day_of',
          urgency: 'immediate',
          vendor_type: 'photographer'
        }
      };

      const queryTime = await measureQueryTime(async () => {
        await supabase
          .from('feedback_sessions')
          .insert(weddingDaySession);
      });

      // Critical wedding day feedback should be processed in under 50ms
      expect(queryTime).toBeLessThan(50);

      // Cleanup
      await supabase
        .from('feedback_sessions')
        .delete()
        .eq('trigger_reason', 'wedding_day_issue');
    });
  });
});