/**
 * Unit Tests for Engagement Scoring Algorithm
 * Feature ID: WS-052
 * 
 * Tests the engagement scoring calculation, risk detection, and recommendation generation
 */

import { 
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
  EngagementScoringAlgorithm, 
  EngagementMetrics 
} from '@/lib/analytics/engagement-algorithm';
describe('EngagementScoringAlgorithm', () => {
  let algorithm: EngagementScoringAlgorithm;
  
  beforeEach(() => {
    algorithm = new EngagementScoringAlgorithm();
  });
  describe('calculateScore', () => {
    it('should calculate perfect score for maximum engagement', () => {
      const metrics: EngagementMetrics = {
        emailOpens: 50,
        emailClicks: 45,
        emailResponseRate: 1.0,
        averageResponseTime: 0.5,
        portalLogins: 15,
        portalPageViews: 100,
        averageSessionDuration: 15,
        documentsDownloaded: 10,
        formsViewed: 10,
        formsStarted: 10,
        formsCompleted: 10,
        formCompletionRate: 1.0,
        callsScheduled: 5,
        callsAttended: 5,
        meetingsScheduled: 5,
        meetingsAttended: 5,
        paymentsOnTime: 10,
        paymentDelays: 0,
        contractsSigned: 3,
        daysSinceLastActivity: 1,
        daysUntilWedding: 60,
        accountAge: 90,
        satisfactionRating: 5,
        npsScore: 100,
        referralsGiven: 3
      };
      
      const score = algorithm.calculateScore(metrics);
      expect(score).toBeGreaterThanOrEqual(95);
      expect(score).toBeLessThanOrEqual(100);
    });
    
    it('should calculate low score for minimal engagement', () => {
        emailOpens: 2,
        emailClicks: 0,
        emailResponseRate: 0,
        averageResponseTime: 96,
        portalLogins: 0,
        portalPageViews: 0,
        averageSessionDuration: 0,
        documentsDownloaded: 0,
        formsViewed: 5,
        formsStarted: 2,
        formsCompleted: 0,
        formCompletionRate: 0,
        callsScheduled: 2,
        callsAttended: 0,
        meetingsScheduled: 1,
        meetingsAttended: 0,
        paymentsOnTime: 0,
        paymentDelays: 3,
        contractsSigned: 0,
        daysSinceLastActivity: 45,
        daysUntilWedding: 30,
        accountAge: 120,
        referralsGiven: 0
      expect(score).toBeLessThan(30);
      expect(score).toBeGreaterThanOrEqual(0);
    it('should calculate moderate score for average engagement', () => {
        emailOpens: 15,
        emailClicks: 8,
        emailResponseRate: 0.5,
        averageResponseTime: 24,
        portalLogins: 5,
        portalPageViews: 25,
        averageSessionDuration: 5,
        documentsDownloaded: 3,
        formsViewed: 8,
        formsStarted: 6,
        formsCompleted: 4,
        formCompletionRate: 0.67,
        callsScheduled: 3,
        callsAttended: 2,
        meetingsScheduled: 2,
        meetingsAttended: 1,
        paymentsOnTime: 4,
        paymentDelays: 1,
        contractsSigned: 1,
        daysSinceLastActivity: 7,
        daysUntilWedding: 90,
        accountAge: 60,
      expect(score).toBeGreaterThanOrEqual(50);
      expect(score).toBeLessThanOrEqual(70);
    it('should apply wedding proximity boost', () => {
      const baseMetrics: EngagementMetrics = {
        emailOpens: 10,
        emailClicks: 5,
        portalPageViews: 20,
        documentsDownloaded: 2,
        formsStarted: 4,
        formsCompleted: 3,
        formCompletionRate: 0.75,
        paymentsOnTime: 3,
        daysSinceLastActivity: 3,
        daysUntilWedding: 200,
        accountAge: 30,
      const scoreDistant = algorithm.calculateScore(baseMetrics);
      const closeMetrics = { ...baseMetrics, daysUntilWedding: 25 };
      const scoreClose = algorithm.calculateScore(closeMetrics);
      expect(scoreClose).toBeGreaterThan(scoreDistant);
    it('should apply new account grace period', () => {
        emailOpens: 1,
        averageResponseTime: 48,
        portalLogins: 1,
        portalPageViews: 3,
        averageSessionDuration: 2,
        formsViewed: 2,
        formsStarted: 1,
        callsScheduled: 0,
        meetingsScheduled: 0,
        daysUntilWedding: 180,
        accountAge: 3, // New account
      expect(score).toBeGreaterThanOrEqual(50); // Grace period minimum
    it('should apply inactivity penalty', () => {
      const activeMetrics: EngagementMetrics = {
        emailOpens: 20,
        emailClicks: 10,
        emailResponseRate: 0.7,
        averageResponseTime: 12,
        portalLogins: 8,
        portalPageViews: 40,
        averageSessionDuration: 8,
        documentsDownloaded: 5,
        formsStarted: 8,
        formsCompleted: 6,
        callsAttended: 3,
        meetingsAttended: 2,
        paymentsOnTime: 5,
        contractsSigned: 2,
        daysSinceLastActivity: 2,
        daysUntilWedding: 120,
        referralsGiven: 1
      const scoreActive = algorithm.calculateScore(activeMetrics);
      const inactiveMetrics = { ...activeMetrics, daysSinceLastActivity: 40 };
      const scoreInactive = algorithm.calculateScore(inactiveMetrics);
      expect(scoreInactive).toBeLessThan(scoreActive * 0.8); // Penalty applied
  describe('getEngagementSegment', () => {
    it('should return correct segment for champion score', () => {
      const segment = algorithm.getEngagementSegment(90);
      expect(segment).toBe('champion');
    it('should return correct segment for highly engaged score', () => {
      const segment = algorithm.getEngagementSegment(75);
      expect(segment).toBe('highly_engaged');
    it('should return correct segment for normal score', () => {
      const segment = algorithm.getEngagementSegment(60);
      expect(segment).toBe('normal');
    it('should return correct segment for at-risk score', () => {
      const segment = algorithm.getEngagementSegment(35);
      expect(segment).toBe('at_risk');
    it('should return correct segment for ghost score', () => {
      const segment = algorithm.getEngagementSegment(20);
      expect(segment).toBe('ghost');
  describe('getRiskLevel', () => {
    it('should identify no risk for engaged client', () => {
        emailOpens: 30,
        emailClicks: 20,
        emailResponseRate: 0.8,
        averageResponseTime: 6,
        portalLogins: 10,
        portalPageViews: 50,
        averageSessionDuration: 10,
        documentsDownloaded: 8,
        formsCompleted: 9,
        formCompletionRate: 0.9,
        callsScheduled: 4,
        callsAttended: 4,
        meetingsScheduled: 3,
        meetingsAttended: 3,
        paymentsOnTime: 6,
      const risk = algorithm.getRiskLevel(metrics, 85);
      expect(risk.level).toBe('none');
      expect(risk.reasons).toHaveLength(0);
    it('should identify critical risk for inactive client near wedding', () => {
        emailOpens: 5,
        emailClicks: 1,
        emailResponseRate: 0.1,
        averageResponseTime: 72,
        averageSessionDuration: 1,
        formsStarted: 3,
        paymentDelays: 4,
        daysSinceLastActivity: 35,
        daysUntilWedding: 45,
      const risk = algorithm.getRiskLevel(metrics, 25);
      expect(risk.level).toBe('critical');
      expect(risk.reasons.length).toBeGreaterThan(3);
      expect(risk.reasons).toContain('No activity for over 30 days');
      expect(risk.reasons).toContain('Low engagement close to wedding date');
    it('should identify medium risk for form abandonment', () => {
        formsCompleted: 2,
        formCompletionRate: 0.25, // Low completion rate
        daysSinceLastActivity: 5,
      const risk = algorithm.getRiskLevel(metrics, 65);
      expect(risk.level).toBe('medium');
      expect(risk.reasons).toContain('High form abandonment rate');
  describe('getRecommendedActions', () => {
    it('should recommend urgent actions for ghost clients', () => {
        formsViewed: 3,
        callsScheduled: 1,
        paymentDelays: 2,
        daysSinceLastActivity: 40,
      const actions = algorithm.getRecommendedActions(metrics, 15);
      expect(actions).toContain('Schedule a personal check-in call immediately');
      expect(actions).toContain('Send a personalized re-engagement email');
      expect(actions).toContain('Escalate to senior planner for intervention');
    it('should recommend referral request for champions', () => {
        emailOpens: 40,
        emailClicks: 35,
        emailResponseRate: 0.95,
        averageResponseTime: 2,
        portalLogins: 20,
        documentsDownloaded: 12,
        formsViewed: 15,
        formsStarted: 15,
        formsCompleted: 14,
        formCompletionRate: 0.93,
        meetingsScheduled: 4,
        meetingsAttended: 4,
        paymentsOnTime: 8,
        npsScore: 90,
        referralsGiven: 2
      const actions = algorithm.getRecommendedActions(metrics, 95);
      expect(actions).toContain('Request testimonial or referral');
      expect(actions).toContain('Offer premium services or upgrades');
    it('should recommend form assistance for low completion', () => {
        emailResponseRate: 0.6,
        averageResponseTime: 20,
        portalLogins: 6,
        portalPageViews: 30,
        averageSessionDuration: 6,
        formsViewed: 12,
        formCompletionRate: 0.3, // Low completion
        daysSinceLastActivity: 4,
        daysUntilWedding: 150,
        accountAge: 45,
      const actions = algorithm.getRecommendedActions(metrics, 70);
      expect(actions).toContain('Simplify forms or offer assistance with completion');
  describe('getBenchmarkComparison', () => {
    it('should identify top performers', () => {
      const comparison = algorithm.getBenchmarkComparison(92);
      expect(comparison.comparison).toBe('top_performer');
      expect(comparison.percentile).toBeGreaterThanOrEqual(80);
      expect(comparison.message).toContain('Top');
    it('should identify above average performers', () => {
      const comparison = algorithm.getBenchmarkComparison(72);
      expect(comparison.comparison).toBe('above_average');
      expect(comparison.percentile).toBeGreaterThan(50);
      expect(comparison.percentile).toBeLessThan(80);
      expect(comparison.message).toContain('Above industry average');
    it('should identify average performers', () => {
      const comparison = algorithm.getBenchmarkComparison(55);
      expect(comparison.comparison).toBe('average');
      expect(comparison.percentile).toBeGreaterThanOrEqual(20);
      expect(comparison.percentile).toBeLessThanOrEqual(50);
      expect(comparison.message).toContain('average performance');
    it('should identify below average performers', () => {
      const comparison = algorithm.getBenchmarkComparison(25);
      expect(comparison.comparison).toBe('below_average');
      expect(comparison.percentile).toBeLessThan(20);
      expect(comparison.message).toContain('Below industry average');
  describe('Edge cases', () => {
    it('should handle zero values gracefully', () => {
        emailOpens: 0,
        averageResponseTime: 0,
        formsViewed: 0,
        formsStarted: 0,
        daysSinceLastActivity: 999,
        daysUntilWedding: 0,
        accountAge: 0,
    it('should handle negative days until wedding', () => {
        daysUntilWedding: -5, // Wedding passed
        accountAge: 365,
    it('should handle very high engagement values', () => {
        emailOpens: 1000,
        emailClicks: 950,
        averageResponseTime: 0.1,
        portalLogins: 500,
        portalPageViews: 5000,
        averageSessionDuration: 60,
        documentsDownloaded: 100,
        formsViewed: 200,
        formsStarted: 200,
        formsCompleted: 195,
        formCompletionRate: 0.975,
        callsScheduled: 50,
        callsAttended: 50,
        meetingsScheduled: 30,
        meetingsAttended: 30,
        paymentsOnTime: 50,
        contractsSigned: 10,
        daysSinceLastActivity: 0,
        accountAge: 180,
        referralsGiven: 20
      expect(score).toBe(100); // Should cap at 100
});
