// WS-130: AI-Powered Photography Library - Shot List Generator Tests
// Team C Batch 10 Round 1

import { ShotListGenerator } from '@/lib/ml/shot-list-generator';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
// Mock OpenAI service
vi.mock('@/lib/services/openai-service', () => ({
  OpenAIService: {
    getInstance: vi.fn().mockReturnValue({
      generateCompletion: vi.fn(),
    }),
  },
}));
describe('ShotListGenerator', () => {
  let shotListGenerator: ShotListGenerator;
  beforeEach(() => {
    shotListGenerator = new ShotListGenerator();
    vi.clearAllMocks();
  });
  describe('generateShotList', () => {
    it('should generate a wedding shot list with required categories', async () => {
      // Mock OpenAI response
      const mockOpenAIResponse = {
        shots: [
          {
            id: 'prep-1',
            title: 'Bride getting ready',
            description: 'Bride having makeup applied',
            category: 'preparation',
            priority: 'high',
            timing: 'pre-ceremony',
            duration: 15,
            location: 'bridal suite',
            equipment: ['85mm lens', 'reflector'],
            techniques: ['natural light', 'shallow depth of field']
          },
            id: 'ceremony-1',
            title: 'Walking down the aisle',
            description: 'Bride walking down the aisle with father',
            category: 'ceremony',
            priority: 'essential',
            timing: 'ceremony',
            duration: 5,
            location: 'ceremony venue',
            equipment: ['70-200mm lens', 'backup camera'],
            techniques: ['telephoto compression', 'burst mode']
          }
        ],
        timeline: [
          { time: '14:00', activity: 'Preparation shots begin', duration: 60 },
          { time: '15:30', activity: 'Ceremony coverage', duration: 45 }
        equipment: [
          { name: '85mm f/1.4 lens', category: 'lenses', priority: 'essential' },
          { name: 'Reflector', category: 'lighting', priority: 'recommended' }
        ]
      };
      const mockOpenAI = require('@/lib/services/openai-service').OpenAIService.getInstance();
      mockOpenAI.generateCompletion.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockOpenAIResponse) } }]
      });
      const params = {
        eventType: 'wedding',
        venueType: 'outdoor',
        guestCount: 100,
        duration: 8,
        stylePreferences: ['romantic', 'natural'],
        specialRequests: ['drone shots'],
        budgetLevel: 'high'
      const result = await shotListGenerator.generateShotList(params);
      expect(result).toHaveProperty('shots');
      expect(result).toHaveProperty('timeline');
      expect(result).toHaveProperty('equipment');
      expect(result.shots).toHaveLength(2);
      
      // Check shot structure
      expect(result.shots[0]).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        category: expect.any(String),
        priority: expect.stringMatching(/^(essential|high|medium|low)$/),
      // Check timeline structure
      expect(result.timeline[0]).toHaveProperty('time');
      expect(result.timeline[0]).toHaveProperty('activity');
      expect(result.timeline[0]).toHaveProperty('duration');
      // Check equipment structure
      expect(result.equipment[0]).toHaveProperty('name');
      expect(result.equipment[0]).toHaveProperty('category');
      expect(result.equipment[0]).toHaveProperty('priority');
    });
    it('should handle different event types correctly', async () => {
        choices: [{ message: { content: JSON.stringify({
          shots: [
            {
              id: 'portrait-1',
              title: 'Individual headshot',
              category: 'portraits',
              priority: 'essential'
            }
          ],
          timeline: [],
          equipment: []
        }) } }]
        eventType: 'portrait',
        venueType: 'studio',
        guestCount: 1,
        duration: 2,
        stylePreferences: ['professional'],
        specialRequests: [],
        budgetLevel: 'medium'
      expect(result.shots[0].category).toBe('portraits');
    it('should validate input parameters', async () => {
      const invalidParams = {
        eventType: '', // Invalid empty event type
        venueType: 'indoor',
        guestCount: -5, // Invalid negative guest count
        duration: 0, // Invalid zero duration
        stylePreferences: [],
        budgetLevel: 'invalid' as any // Invalid budget level
      await expect(shotListGenerator.generateShotList(invalidParams))
        .rejects.toThrow('Invalid event type');
    it('should handle OpenAI API errors gracefully', async () => {
      mockOpenAI.generateCompletion.mockRejectedValue(new Error('OpenAI API error'));
        guestCount: 50,
        duration: 6,
        stylePreferences: ['classic'],
      await expect(shotListGenerator.generateShotList(params))
        .rejects.toThrow('Failed to generate shot list');
    it('should include all required shot categories for weddings', async () => {
            { id: 'prep-1', category: 'preparation', priority: 'high', title: 'Getting ready' },
            { id: 'ceremony-1', category: 'ceremony', priority: 'essential', title: 'Vows' },
            { id: 'reception-1', category: 'reception', priority: 'high', title: 'First dance' },
            { id: 'portrait-1', category: 'portraits', priority: 'medium', title: 'Couple portraits' },
            { id: 'detail-1', category: 'details', priority: 'medium', title: 'Ring shots' }
        guestCount: 75,
        stylePreferences: ['traditional'],
      const categories = result.shots.map(shot => shot.category);
      const requiredCategories = ['preparation', 'ceremony', 'reception', 'portraits', 'details'];
      requiredCategories.forEach(category => {
        expect(categories).toContain(category);
    it('should optimize timeline based on event duration', async () => {
          shots: [],
          timeline: [
            { time: '14:00', activity: 'Start', duration: 120 },
            { time: '16:00', activity: 'Break', duration: 30 },
            { time: '16:30', activity: 'Resume', duration: 90 }
        duration: 4, // Short duration
      const totalDuration = result.timeline.reduce((sum, item) => sum + item.duration, 0);
      expect(totalDuration).toBeLessThanOrEqual(params.duration * 60); // Convert hours to minutes
  describe('getShotListTemplates', () => {
    it('should return available templates', async () => {
      const templates = await shotListGenerator.getShotListTemplates();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('eventType');
        expect(template).toHaveProperty('shots');
    it('should filter templates by event type', async () => {
      const weddingTemplates = await shotListGenerator.getShotListTemplates('wedding');
      const portraitTemplates = await shotListGenerator.getShotListTemplates('portrait');
      expect(weddingTemplates.every(t => t.eventType === 'wedding')).toBe(true);
      expect(portraitTemplates.every(t => t.eventType === 'portrait')).toBe(true);
  describe('validateShotList', () => {
    it('should validate a complete shot list', () => {
      const validShotList = {
            id: 'shot-1',
            title: 'Test shot',
            duration: 10,
            location: 'altar'
          { time: '15:00', activity: 'Start ceremony', duration: 30 }
          { name: 'Camera', category: 'camera', priority: 'essential' }
      const validation = shotListGenerator.validateShotList(validShotList);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    it('should identify missing required fields', () => {
      const invalidShotList = {
            // Missing title
            priority: 'high'
        timeline: [],
        equipment: []
      const validation = shotListGenerator.validateShotList(invalidShotList);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('title');
    it('should validate priority levels', () => {
      const shotListWithInvalidPriority = {
            priority: 'invalid-priority' // Invalid priority
      const validation = shotListGenerator.validateShotList(shotListWithInvalidPriority);
      expect(validation.errors.some(error => error.includes('priority'))).toBe(true);
  describe('estimateShootingTime', () => {
    it('should calculate total shooting time correctly', () => {
      const shots = [
        { duration: 15, priority: 'essential' },
        { duration: 30, priority: 'high' },
        { duration: 10, priority: 'medium' }
      ];
      const estimatedTime = shotListGenerator.estimateShootingTime(shots);
      expect(estimatedTime).toHaveProperty('total');
      expect(estimatedTime).toHaveProperty('byPriority');
      expect(estimatedTime.total).toBe(55);
      expect(estimatedTime.byPriority.essential).toBe(15);
      expect(estimatedTime.byPriority.high).toBe(30);
      expect(estimatedTime.byPriority.medium).toBe(10);
    it('should handle missing duration values', () => {
        { priority: 'high' }, // Missing duration
      expect(estimatedTime.total).toBe(35); // 15 + 10 + default 10 for missing
});
