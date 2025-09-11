// WS-130: AI-Powered Photography Library - Photographer Matching Algorithm Tests
// Team C Batch 10 Round 1

import { PhotographerMatchingAlgorithm } from '@/lib/ml/photographer-matching-algorithm';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
describe('PhotographerMatchingAlgorithm', () => {
  let matchingAlgorithm: PhotographerMatchingAlgorithm;
  const mockPhotographers = [
    {
      id: 'photographer-1',
      name: 'Alice Smith',
      specialties: ['wedding', 'portrait'],
      preferred_styles: ['romantic', 'natural'],
      location: 'New York, NY',
      starting_price: 2500,
      rating: 4.8,
      review_count: 120,
      experience_years: 8,
      availability_status: 'available',
      travel_radius_km: 100,
      portfolio_quality_score: 0.92,
      response_time_hours: 2,
      booking_success_rate: 0.85
    },
      id: 'photographer-2',
      name: 'Bob Johnson',
      specialties: ['wedding', 'commercial'],
      preferred_styles: ['dramatic', 'artistic'],
      location: 'Brooklyn, NY',
      starting_price: 3000,
      rating: 4.9,
      review_count: 85,
      experience_years: 12,
      availability_status: 'busy',
      travel_radius_km: 75,
      portfolio_quality_score: 0.96,
      response_time_hours: 4,
      booking_success_rate: 0.92
      id: 'photographer-3',
      name: 'Carol Davis',
      specialties: ['engagement', 'lifestyle'],
      preferred_styles: ['natural', 'candid'],
      location: 'Manhattan, NY',
      starting_price: 1800,
      rating: 4.6,
      review_count: 65,
      experience_years: 5,
      travel_radius_km: 50,
      portfolio_quality_score: 0.78,
      response_time_hours: 1,
      booking_success_rate: 0.78
    }
  ];
  beforeEach(() => {
    matchingAlgorithm = new PhotographerMatchingAlgorithm();
  });
  describe('findMatches', () => {
    it('should find photographers matching style preferences', async () => {
      const criteria = {
        event_type: 'wedding',
        style_preferences: ['romantic', 'natural'],
        location: 'New York, NY',
        budget: 3500,
        event_date: '2024-06-15'
      };
      const matches = await matchingAlgorithm.findMatches(criteria, mockPhotographers);
      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBeGreaterThan(0);
      // Check that matches are sorted by score (descending)
      for (let i = 0; i < matches.length - 1; i++) {
        expect(matches[i].overall_score).toBeGreaterThanOrEqual(matches[i + 1].overall_score);
      }
      // Verify match structure
      matches.forEach(match => {
        expect(match).toHaveProperty('photographer');
        expect(match).toHaveProperty('overall_score');
        expect(match).toHaveProperty('factor_scores');
        expect(match).toHaveProperty('match_analysis');
        expect(match.overall_score).toBeGreaterThanOrEqual(0);
        expect(match.overall_score).toBeLessThanOrEqual(1);
      });
    });
    it('should apply location-based filtering correctly', async () => {
        max_travel_distance: 80,
        budget: 5000,
        event_date: '2024-07-01'
      // Should exclude photographers with travel_radius_km < max_travel_distance
      const includedPhotographer = matches.find(m => m.photographer.id === 'photographer-3');
      expect(includedPhotographer).toBeUndefined(); // Carol has 50km radius, below 80km requirement
    it('should handle budget constraints', async () => {
      const lowBudgetCriteria = {
        budget: 2000, // Low budget
        event_date: '2024-08-15'
      const matches = await matchingAlgorithm.findMatches(lowBudgetCriteria, mockPhotographers);
      // Should favor photographers within budget
      const carolMatch = matches.find(m => m.photographer.id === 'photographer-3');
      const bobMatch = matches.find(m => m.photographer.id === 'photographer-2');
      if (carolMatch && bobMatch) {
        // Carol ($1800) should score higher than Bob ($3000) for budget factor
        expect(carolMatch.factor_scores.budget).toBeGreaterThan(bobMatch.factor_scores.budget);
    it('should prioritize availability status', async () => {
        event_date: '2024-09-20',
        budget: 4000
      const availablePhotographers = matches.filter(m => m.photographer.availability_status === 'available');
      const busyPhotographers = matches.filter(m => m.photographer.availability_status === 'busy');
      if (availablePhotographers.length > 0 && busyPhotographers.length > 0) {
        // Available photographers should generally score higher on availability
        expect(availablePhotographers[0].factor_scores.availability)
          .toBeGreaterThan(busyPhotographers[0].factor_scores.availability);
    it('should handle empty photographer list', async () => {
        budget: 3000,
        event_date: '2024-10-10'
      const matches = await matchingAlgorithm.findMatches(criteria, []);
      expect(matches).toEqual([]);
    it('should validate input criteria', async () => {
      const invalidCriteria = {
        // Missing required fields
        budget: -1000, // Invalid budget
      await expect(matchingAlgorithm.findMatches(invalidCriteria as any, mockPhotographers))
        .rejects.toThrow('Invalid matching criteria');
  describe('calculateStyleCompatibility', () => {
    it('should calculate high compatibility for matching styles', () => {
      const photographerStyles = ['romantic', 'natural', 'elegant'];
      const clientPreferences = ['romantic', 'natural'];
      const compatibility = matchingAlgorithm.calculateStyleCompatibility(
        photographerStyles,
        clientPreferences
      );
      expect(compatibility).toBeGreaterThan(0.8); // High compatibility expected
    it('should calculate low compatibility for non-matching styles', () => {
      const photographerStyles = ['dramatic', 'artistic', 'moody'];
      expect(compatibility).toBeLessThan(0.3); // Low compatibility expected
    it('should handle partial style matches', () => {
      const photographerStyles = ['romantic', 'dramatic'];
      expect(compatibility).toBeGreaterThan(0.4);
      expect(compatibility).toBeLessThan(0.8); // Moderate compatibility
    it('should handle empty style arrays', () => {
      const compatibility1 = matchingAlgorithm.calculateStyleCompatibility([], ['romantic']);
      const compatibility2 = matchingAlgorithm.calculateStyleCompatibility(['romantic'], []);
      const compatibility3 = matchingAlgorithm.calculateStyleCompatibility([], []);
      expect(compatibility1).toBe(0);
      expect(compatibility2).toBe(0);
      expect(compatibility3).toBe(0);
  describe('calculateLocationScore', () => {
    it('should give high scores for local photographers', () => {
      const photographerLocation = 'New York, NY';
      const eventLocation = 'New York, NY';
      const travelRadius = 100;
      const score = matchingAlgorithm.calculateLocationScore(
        photographerLocation,
        eventLocation,
        travelRadius
      expect(score).toBeGreaterThan(0.9);
    it('should give lower scores for distant locations', () => {
      const photographerLocation = 'Los Angeles, CA';
      const travelRadius = 50; // Limited travel radius
      expect(score).toBeLessThan(0.3);
    it('should factor in travel radius appropriately', () => {
      const photographerLocation = 'Brooklyn, NY';
      const eventLocation = 'Manhattan, NY';
      
      const score1 = matchingAlgorithm.calculateLocationScore(photographerLocation, eventLocation, 25);
      const score2 = matchingAlgorithm.calculateLocationScore(photographerLocation, eventLocation, 100);
      expect(score2).toBeGreaterThan(score1); // Larger radius should yield higher score
  describe('calculateBudgetFit', () => {
    it('should give high scores for photographers within budget', () => {
      const photographerPrice = 2000;
      const clientBudget = 3000;
      const score = matchingAlgorithm.calculateBudgetFit(photographerPrice, clientBudget);
      expect(score).toBeGreaterThan(0.8);
    it('should give low scores for photographers over budget', () => {
      const photographerPrice = 4000;
      const clientBudget = 2500;
    it('should handle edge cases', () => {
      const exactMatchScore = matchingAlgorithm.calculateBudgetFit(3000, 3000);
      const zeroBuffetScore = matchingAlgorithm.calculateBudgetFit(1000, 0);
      expect(exactMatchScore).toBe(1);
      expect(zeroBuffetScore).toBe(0);
  describe('generateMatchAnalysis', () => {
    it('should provide comprehensive analysis for high-scoring match', () => {
      const match = {
        photographer: mockPhotographers[0], // Alice Smith - good match
        overall_score: 0.85,
        factor_scores: {
          style_compatibility: 0.9,
          location: 0.8,
          budget: 0.9,
          availability: 1.0,
          experience: 0.8,
          portfolio_quality: 0.92,
          reviews: 0.88,
          personal_compatibility: 0.75
        }
      const analysis = matchingAlgorithm.generateMatchAnalysis(match);
      expect(analysis).toHaveProperty('strengths');
      expect(analysis).toHaveProperty('concerns');
      expect(analysis).toHaveProperty('recommendation');
      expect(analysis).toHaveProperty('confidence_level');
      expect(analysis.strengths.length).toBeGreaterThan(0);
      expect(analysis.confidence_level).toBeGreaterThan(0.7);
    it('should identify concerns for low-scoring factors', () => {
        photographer: mockPhotographers[2], // Carol Davis - some concerns
        overall_score: 0.65,
          style_compatibility: 0.8,
          location: 0.4, // Low location score
          experience: 0.5, // Low experience score
          portfolio_quality: 0.78,
          reviews: 0.6,
          personal_compatibility: 0.7
      expect(analysis.concerns.length).toBeGreaterThan(0);
      expect(analysis.concerns.some(concern => concern.includes('location'))).toBe(true);
      expect(analysis.concerns.some(concern => concern.includes('experience'))).toBe(true);
    it('should provide appropriate recommendations', () => {
      const highScoreMatch = {
        photographer: mockPhotographers[1], // Bob Johnson - high quality
        overall_score: 0.92,
          location: 0.9,
          budget: 0.8,
          availability: 0.8,
          experience: 0.95,
          portfolio_quality: 0.96,
          reviews: 0.95,
          personal_compatibility: 0.85
      const analysis = matchingAlgorithm.generateMatchAnalysis(highScoreMatch);
      expect(analysis.recommendation).toContain('Highly recommended');
      expect(analysis.confidence_level).toBeGreaterThan(0.85);
  describe('getWeights', () => {
    it('should return default weights', () => {
      const weights = matchingAlgorithm.getWeights();
      expect(weights).toHaveProperty('style_compatibility');
      expect(weights).toHaveProperty('location');
      expect(weights).toHaveProperty('budget');
      expect(weights).toHaveProperty('availability');
      expect(weights).toHaveProperty('experience');
      expect(weights).toHaveProperty('portfolio_quality');
      expect(weights).toHaveProperty('reviews');
      expect(weights).toHaveProperty('personal_compatibility');
      // Weights should sum to 1
      const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
      expect(Math.abs(totalWeight - 1)).toBeLessThan(0.01);
    it('should allow custom weight configuration', () => {
      const customWeights = {
        style_compatibility: 0.4,
        location: 0.3,
        budget: 0.15,
        availability: 0.05,
        experience: 0.05,
        portfolio_quality: 0.03,
        reviews: 0.02,
        personal_compatibility: 0
      matchingAlgorithm.setWeights(customWeights);
      const retrievedWeights = matchingAlgorithm.getWeights();
      expect(retrievedWeights.style_compatibility).toBe(0.4);
      expect(retrievedWeights.location).toBe(0.3);
  describe('performance and edge cases', () => {
    it('should handle large photographer datasets efficiently', async () => {
      // Generate large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockPhotographers[0],
        id: `photographer-${i}`,
        name: `Photographer ${i}`,
        rating: 3 + Math.random() * 2,
        starting_price: 1500 + Math.random() * 3000
      }));
        style_preferences: ['romantic'],
        event_date: '2024-12-01'
      const startTime = Date.now();
      const matches = await matchingAlgorithm.findMatches(criteria, largeDataset);
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(matches.length).toBeLessThanOrEqual(largeDataset.length);
    it('should handle missing photographer data gracefully', async () => {
      const incompletePhotographers = [
        {
          id: 'incomplete-1',
          name: 'Incomplete Photographer',
          // Missing many fields
          rating: 4.0
      ];
        budget: 2000,
        event_date: '2024-11-15'
      const matches = await matchingAlgorithm.findMatches(criteria, incompletePhotographers as unknown);
      expect(matches.length).toBeGreaterThanOrEqual(0);
    it('should maintain score consistency across multiple runs', async () => {
        budget: 2500,
        event_date: '2024-05-20'
      const matches1 = await matchingAlgorithm.findMatches(criteria, mockPhotographers);
      const matches2 = await matchingAlgorithm.findMatches(criteria, mockPhotographers);
      expect(matches1.length).toBe(matches2.length);
      for (let i = 0; i < matches1.length; i++) {
        expect(matches1[i].overall_score).toBeCloseTo(matches2[i].overall_score, 5);
        expect(matches1[i].photographer.id).toBe(matches2[i].photographer.id);
});
