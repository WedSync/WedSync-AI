// WS-130: AI-Powered Photography Library - Mood Board Builder Tests
// Team C Batch 10 Round 1

import { MoodBoardBuilder } from '@/lib/ml/mood-board-builder';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
// Mock OpenAI service
vi.mock('@/lib/services/openai-service', () => ({
  OpenAIService: {
    getInstance: vi.fn().mockReturnValue({
      generateCompletion: vi.fn(),
    }),
  },
}));
describe('MoodBoardBuilder', () => {
  let moodBoardBuilder: MoodBoardBuilder;
  beforeEach(() => {
    moodBoardBuilder = new MoodBoardBuilder();
    vi.clearAllMocks();
  });
  describe('createMoodBoard', () => {
    it('should create a mood board with specified parameters', async () => {
      // Mock image search results
      const mockImageResults = [
        {
          url: 'https://example.com/image1.jpg',
          description: 'Romantic wedding photo',
          styleTags: ['romantic', 'soft lighting'],
          colorPalette: ['#FFE5E5', '#F8D7DA'],
          source: 'unsplash'
        },
          url: 'https://example.com/image2.jpg',
          description: 'Elegant venue setup',
          styleTags: ['elegant', 'minimalist'],
          colorPalette: ['#F5F5F5', '#E0E0E0'],
        }
      ];
      // Mock OpenAI response for image analysis
      const mockOpenAI = require('@/lib/services/openai-service').OpenAIService.getInstance();
      mockOpenAI.generateCompletion.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({
          colorPalette: ['#FFE5E5', '#F8D7DA', '#F5F5F5'],
          styleAnalysis: {
            consistencyScore: 0.85,
            breakdown: [
              { style: 'romantic', percentage: 60 },
              { style: 'elegant', percentage: 40 }
            ]
          },
          moodDescription: 'Romantic and elegant with soft, dreamy atmosphere',
          recommendations: ['Add more texture elements', 'Consider warmer lighting']
        }) } }]
      });
      // Mock searchImages method
      vi.spyOn(moodBoardBuilder as any, 'searchImages').mockResolvedValue(mockImageResults);
      const params = {
        stylePreferences: ['romantic', 'elegant'],
        colorPreferences: ['blush', 'ivory'],
        moodKeywords: ['dreamy', 'soft'],
        eventType: 'wedding',
        layoutType: 'grid',
        boardDimensions: { width: 1920, height: 1080 },
        includeTextOverlays: true
      };
      const result = await moodBoardBuilder.createMoodBoard(params);
      expect(result).toHaveProperty('images');
      expect(result).toHaveProperty('colorPalette');
      expect(result).toHaveProperty('layout');
      expect(result).toHaveProperty('styleAnalysis');
      expect(result).toHaveProperty('exports');
      expect(result.images).toHaveLength(mockImageResults.length);
      expect(result.colorPalette).toContain('#FFE5E5');
      expect(result.styleAnalysis.consistencyScore).toBe(0.85);
    });
    it('should handle different layout types', async () => {
      const mockImages = [
        { url: 'test1.jpg', styleTags: ['modern'], colorPalette: ['#000000'] },
        { url: 'test2.jpg', styleTags: ['minimal'], colorPalette: ['#FFFFFF'] }
      vi.spyOn(moodBoardBuilder as any, 'searchImages').mockResolvedValue(mockImages);
          colorPalette: ['#000000', '#FFFFFF'],
          styleAnalysis: { consistencyScore: 0.9, breakdown: [] }
      const layoutTypes = ['grid', 'collage', 'magazine', 'minimal', 'organic'];
      
      for (const layoutType of layoutTypes) {
        const params = {
          stylePreferences: ['modern'],
          layoutType: layoutType as any,
          boardDimensions: { width: 800, height: 600 }
        };
        const result = await moodBoardBuilder.createMoodBoard(params);
        expect(result.layout.type).toBe(layoutType);
      }
    it('should validate input parameters', async () => {
      const invalidParams = {
        stylePreferences: [], // Empty style preferences
        boardDimensions: { width: 0, height: 0 }, // Invalid dimensions
        layoutType: 'invalid-layout' as any // Invalid layout type
      await expect(moodBoardBuilder.createMoodBoard(invalidParams))
        .rejects.toThrow('Invalid board dimensions');
    it('should handle insufficient image results', async () => {
      // Mock insufficient images
      vi.spyOn(moodBoardBuilder as any, 'searchImages').mockResolvedValue([]);
        stylePreferences: ['nonexistent-style'],
        boardDimensions: { width: 800, height: 600 }
      await expect(moodBoardBuilder.createMoodBoard(params))
        .rejects.toThrow('Insufficient images found');
    it('should generate appropriate color palettes', async () => {
        { 
          url: 'test1.jpg', 
          colorPalette: ['#FF6B6B', '#4ECDC4', '#45B7D1'],
          styleTags: ['vibrant'] 
          url: 'test2.jpg', 
          colorPalette: ['#FFA07A', '#20B2AA', '#4169E1'],
          styleTags: ['colorful'] 
          colorPalette: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#20B2AA'],
          styleAnalysis: { consistencyScore: 0.75, breakdown: [] }
        stylePreferences: ['vibrant'],
        colorPreferences: ['blue', 'coral'],
      expect(result.colorPalette).toBeDefined();
      expect(result.colorPalette.length).toBeGreaterThan(0);
      expect(result.colorAnalysis).toHaveProperty('harmony');
      expect(result.colorAnalysis).toHaveProperty('dominantColors');
  describe('generateLayout', () => {
    it('should generate grid layout correctly', () => {
      const images = [
        { url: 'img1.jpg', width: 400, height: 300 },
        { url: 'img2.jpg', width: 300, height: 400 },
        { url: 'img3.jpg', width: 500, height: 300 },
        { url: 'img4.jpg', width: 400, height: 400 }
      const layout = moodBoardBuilder.generateLayout(images, 'grid', { width: 1200, height: 800 });
      expect(layout.type).toBe('grid');
      expect(layout.positions).toHaveLength(images.length);
      layout.positions.forEach(position => {
        expect(position).toHaveProperty('x');
        expect(position).toHaveProperty('y');
        expect(position).toHaveProperty('width');
        expect(position).toHaveProperty('height');
        expect(position.x).toBeGreaterThanOrEqual(0);
        expect(position.y).toBeGreaterThanOrEqual(0);
    it('should generate collage layout with overlapping elements', () => {
        { url: 'img2.jpg', width: 300, height: 400 }
      const layout = moodBoardBuilder.generateLayout(images, 'collage', { width: 800, height: 600 });
      expect(layout.type).toBe('collage');
      expect(layout.allowOverlap).toBe(true);
    it('should respect aspect ratios in organic layout', () => {
        { url: 'img1.jpg', width: 800, height: 600 }, // 4:3 aspect ratio
        { url: 'img2.jpg', width: 600, height: 800 }  // 3:4 aspect ratio
      const layout = moodBoardBuilder.generateLayout(images, 'organic', { width: 1000, height: 800 });
      expect(layout.type).toBe('organic');
      layout.positions.forEach((position, index) => {
        const originalAspectRatio = images[index].width / images[index].height;
        const layoutAspectRatio = position.width / position.height;
        expect(Math.abs(originalAspectRatio - layoutAspectRatio)).toBeLessThan(0.1);
  describe('analyzeColorHarmony', () => {
    it('should analyze complementary colors', () => {
      const colors = ['#FF0000', '#00FF00', '#0000FF']; // RGB primaries
      const harmony = moodBoardBuilder.analyzeColorHarmony(colors);
      expect(harmony).toHaveProperty('harmonyType');
      expect(harmony).toHaveProperty('score');
      expect(harmony).toHaveProperty('dominantHue');
      expect(harmony.score).toBeGreaterThanOrEqual(0);
      expect(harmony.score).toBeLessThanOrEqual(1);
    it('should identify monochromatic harmony', () => {
      const monochromaticColors = ['#FF6B6B', '#FF8E8E', '#FFB1B1'];
      const harmony = moodBoardBuilder.analyzeColorHarmony(monochromaticColors);
      expect(harmony.harmonyType).toBe('monochromatic');
      expect(harmony.score).toBeGreaterThan(0.7); // Should score high for monochromatic
    it('should handle invalid color formats gracefully', () => {
      const invalidColors = ['not-a-color', '#GGG', ''];
      const harmony = moodBoardBuilder.analyzeColorHarmony(invalidColors);
      expect(harmony.score).toBe(0);
      expect(harmony.harmonyType).toBe('none');
  describe('optimizeImagePlacement', () => {
    it('should optimize placement to avoid overlaps in grid layout', () => {
      const positions = [
        { x: 0, y: 0, width: 200, height: 150 },
        { x: 150, y: 0, width: 200, height: 150 }, // Overlapping
        { x: 400, y: 0, width: 200, height: 150 }
      const optimized = moodBoardBuilder.optimizeImagePlacement(positions, 'grid');
      // Check that no positions overlap significantly
      for (let i = 0; i < optimized.length; i++) {
        for (let j = i + 1; j < optimized.length; j++) {
          const pos1 = optimized[i];
          const pos2 = optimized[j];
          
          const overlapX = Math.max(0, Math.min(pos1.x + pos1.width, pos2.x + pos2.width) - Math.max(pos1.x, pos2.x));
          const overlapY = Math.max(0, Math.min(pos1.y + pos1.height, pos2.y + pos2.height) - Math.max(pos1.y, pos2.y));
          const overlapArea = overlapX * overlapY;
          expect(overlapArea).toBeLessThan(100); // Minimal overlap allowed
    it('should maintain relative positions in organic layout', () => {
      const originalPositions = [
        { x: 100, y: 100, width: 200, height: 150 },
        { x: 400, y: 200, width: 150, height: 200 }
      const optimized = moodBoardBuilder.optimizeImagePlacement(originalPositions, 'organic');
      // Organic layout should preserve relative positioning
      expect(optimized[0].x).toBeLessThan(optimized[1].x);
      expect(optimized[0].y).toBeLessThan(optimized[1].y);
  describe('exportMoodBoard', () => {
    it('should generate multiple export formats', async () => {
      const mockMoodBoard = {
        images: [
          { url: 'test1.jpg', position: { x: 0, y: 0, width: 400, height: 300 } },
          { url: 'test2.jpg', position: { x: 400, y: 0, width: 400, height: 300 } }
        ],
        colorPalette: ['#FF6B6B', '#4ECDC4'],
      const exports = await moodBoardBuilder.exportMoodBoard(mockMoodBoard, {
        formats: ['png', 'jpg', 'pdf'],
        quality: 'high'
      expect(exports).toHaveProperty('highRes');
      expect(exports).toHaveProperty('webRes');
      expect(exports).toHaveProperty('thumbnail');
      expect(exports).toHaveProperty('pdf');
      expect(exports.highRes).toContain('.png');
      expect(exports.webRes).toContain('.jpg');
      expect(exports.thumbnail).toContain('.jpg');
    it('should handle export errors gracefully', async () => {
      const invalidMoodBoard = {
        images: [], // No images
        colorPalette: [],
        boardDimensions: { width: 0, height: 0 } // Invalid dimensions
      await expect(moodBoardBuilder.exportMoodBoard(invalidMoodBoard, {}))
        .rejects.toThrow('Cannot export mood board: invalid configuration');
  describe('updateMoodBoard', () => {
    it('should update existing mood board with new preferences', async () => {
      const existingBoard = {
        images: [{ url: 'old1.jpg', styleTags: ['romantic'] }],
        colorPalette: ['#FFE5E5'],
        stylePreferences: ['romantic'],
        layout: { type: 'grid', positions: [] }
      const mockNewImages = [
        { url: 'new1.jpg', styleTags: ['modern'] },
        { url: 'new2.jpg', styleTags: ['minimal'] }
      vi.spyOn(moodBoardBuilder as any, 'searchImages').mockResolvedValue(mockNewImages);
      const updates = {
        stylePreferences: ['modern', 'minimal'],
        regenerateLayout: true
      const updated = await moodBoardBuilder.updateMoodBoard(existingBoard, updates);
      expect(updated.images).not.toEqual(existingBoard.images);
      expect(updated.styleAnalysis).toBeDefined();
      expect(updated.layout.type).toBeDefined();
  describe('validateMoodBoardConfig', () => {
    it('should validate correct configuration', () => {
      const validConfig = {
        stylePreferences: ['modern'],
        boardDimensions: { width: 800, height: 600 },
        layoutType: 'grid'
      const validation = moodBoardBuilder.validateMoodBoardConfig(validConfig);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    it('should identify missing required fields', () => {
      const invalidConfig = {
        stylePreferences: [], // Empty
        boardDimensions: { width: 0, height: 600 }, // Invalid width
        layoutType: 'invalid' as any // Invalid layout
      const validation = moodBoardBuilder.validateMoodBoardConfig(invalidConfig);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
});
