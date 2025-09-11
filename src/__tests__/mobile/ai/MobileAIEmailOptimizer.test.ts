import { jest } from '@jest/globals';
import { MobileAIEmailOptimizer } from '@/lib/mobile/ai-email-optimization';

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}));

// Mock environment
process.env.OPENAI_API_KEY = 'test-api-key';

// Mock navigator APIs
Object.defineProperty(global.navigator, 'onLine', {
  value: true,
  writable: true,
});

Object.defineProperty(global.navigator, 'connection', {
  value: {
    effectiveType: '4g',
    saveData: false,
    addEventListener: jest.fn(),
  },
  writable: true,
});

// Mock Battery API
Object.defineProperty(global.navigator, 'getBattery', {
  value: jest.fn().mockResolvedValue({
    level: 0.8,
    charging: false,
    dischargingTime: Infinity,
    addEventListener: jest.fn(),
  }),
  writable: true,
});

// Mock btoa/atob for cache key generation
global.btoa = jest.fn((str: string) => Buffer.from(str).toString('base64'));
global.atob = jest.fn((str: string) => Buffer.from(str, 'base64').toString());

describe('MobileAIEmailOptimizer', () => {
  let optimizer: MobileAIEmailOptimizer;
  let mockOpenAI: any;

  const mockClientContext = {
    name: 'John Smith',
    weddingDate: '2024-06-15',
    venue: 'Grand Hotel',
    inquiryType: 'booking' as const,
    urgency: 'medium' as const,
    personalNotes: 'Looking for outdoor ceremony coverage',
  };

  const mockAIResponse = {
    choices: [
      {
        message: {
          content: JSON.stringify([
            {
              subject: 'Thank you for your wedding inquiry!',
              content:
                'Hi John,\n\nThank you for reaching out about wedding photography for your June 15th celebration at Grand Hotel...',
              tone: 'professional',
              stage: 'booking',
              confidence: 0.9,
            },
            {
              subject: "Let's capture your special day! ✨",
              content:
                "Hello John!\n\nI'm so excited about your upcoming wedding at Grand Hotel...",
              tone: 'friendly',
              stage: 'booking',
              confidence: 0.85,
            },
          ]),
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const OpenAI = require('openai').OpenAI;
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue(mockAIResponse),
        },
      },
    };

    OpenAI.mockImplementation(() => mockOpenAI);

    optimizer = new MobileAIEmailOptimizer();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('initializes with network and battery monitoring', () => {
      expect(optimizer).toBeInstanceOf(MobileAIEmailOptimizer);
      expect(navigator.getBattery).toHaveBeenCalled();
    });

    it('handles OpenAI initialization failure gracefully', () => {
      const OpenAI = require('openai').OpenAI;
      OpenAI.mockImplementation(() => {
        throw new Error('API key not found');
      });

      expect(() => new MobileAIEmailOptimizer()).not.toThrow();
    });
  });

  describe('Template Generation', () => {
    it('generates mobile-optimized templates successfully', async () => {
      const request = {
        clientContext: mockClientContext,
        maxVariants: 3,
        mobileOptimized: true,
        touchFriendly: true,
      };

      const templates =
        await optimizer.generateMobileOptimizedTemplates(request);

      expect(templates).toHaveLength(2);
      expect(templates[0]).toMatchObject({
        id: expect.stringMatching(/mobile-ai-/),
        subject: 'Thank you for your wedding inquiry!',
        tone: 'professional',
        stage: 'booking',
        confidence: 0.9,
        mobileOptimized: true,
        touchFriendly: true,
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('mobile viewing'),
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('John Smith'),
          }),
        ]),
        max_tokens: 300,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      });
    });

    it('returns cached templates when available', async () => {
      const request = {
        clientContext: mockClientContext,
        mobileOptimized: true,
      };

      // First call
      const templates1 =
        await optimizer.generateMobileOptimizedTemplates(request);

      // Second call should return cached results
      const templates2 =
        await optimizer.generateMobileOptimizedTemplates(request);

      expect(templates1).toEqual(templates2);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it('falls back to offline templates when AI generation fails', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('API Error'),
      );

      const request = {
        clientContext: mockClientContext,
        mobileOptimized: true,
      };

      const templates =
        await optimizer.generateMobileOptimizedTemplates(request);

      expect(templates).toHaveLength(3); // Default offline templates for booking
      expect(templates[0]).toMatchObject({
        id: expect.stringMatching(/offline-booking-/),
        mobileOptimized: true,
        touchFriendly: true,
        confidence: 0.75, // Lower confidence for offline templates
      });
    });

    it('returns offline templates when network is unavailable', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      const request = {
        clientContext: mockClientContext,
        mobileOptimized: true,
      };

      const templates =
        await optimizer.generateMobileOptimizedTemplates(request);

      expect(templates).toHaveLength(3);
      expect(templates[0].id).toMatch(/offline-booking-/);
      expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
    });
  });

  describe('Mobile Optimizations', () => {
    it('reduces variants on slow network connections', async () => {
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '2g', saveData: false },
        writable: true,
      });

      const request = {
        clientContext: mockClientContext,
        maxVariants: 5,
        mobileOptimized: true,
      };

      await optimizer.generateMobileOptimizedTemplates(request);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Generate 2 email templates'), // Reduced from 5 to 2
            }),
          ]),
        }),
      );
    });

    it('optimizes for low battery conditions', async () => {
      // Mock low battery
      (navigator.getBattery as jest.Mock).mockResolvedValue({
        level: 0.15,
        charging: false,
        dischargingTime: 3600,
        addEventListener: jest.fn(),
      });

      // Reinitialize optimizer to pick up new battery state
      optimizer = new MobileAIEmailOptimizer();

      // Wait for battery monitoring to initialize
      await new Promise((resolve) => setTimeout(resolve, 10));

      const request = {
        clientContext: mockClientContext,
        maxVariants: 3,
        maxTokens: 300,
        mobileOptimized: true,
      };

      await optimizer.generateMobileOptimizedTemplates(request);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 150, // Reduced from 300 to 150
        }),
      );
    });

    it('enables data saving mode when requested', async () => {
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '4g', saveData: true },
        writable: true,
      });

      const request = {
        clientContext: mockClientContext,
        maxVariants: 3,
        maxTokens: 300,
        mobileOptimized: true,
      };

      await optimizer.generateMobileOptimizedTemplates(request);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 200, // Reduced for data saving
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Generate 2 email templates'), // Reduced variants
            }),
          ]),
        }),
      );
    });
  });

  describe('Progressive Template Generation', () => {
    it('generates templates progressively with progress callbacks', async () => {
      const progressCallback = jest.fn();

      const request = {
        clientContext: mockClientContext,
        maxVariants: 3,
        mobileOptimized: true,
      };

      // Mock multiple calls for progressive generation
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  {
                    subject: 'Template 1',
                    content: 'Content 1',
                    tone: 'professional',
                    stage: 'inquiry',
                    confidence: 0.9,
                  },
                ]),
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  {
                    subject: 'Template 2',
                    content: 'Content 2',
                    tone: 'friendly',
                    stage: 'inquiry',
                    confidence: 0.85,
                  },
                ]),
              },
            },
          ],
        });

      const templates = await optimizer.generateTemplatesProgressively(
        request,
        progressCallback,
      );

      expect(templates).toHaveLength(2);
      expect(progressCallback).toHaveBeenCalledTimes(2);
      expect(progressCallback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ subject: 'Template 1' }),
        ]),
        1 / 3,
      );
    });

    it('handles errors gracefully during progressive generation', async () => {
      const progressCallback = jest.fn();

      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce(mockAIResponse)
        .mockRejectedValueOnce(new Error('Network error'));

      const request = {
        clientContext: mockClientContext,
        maxVariants: 3,
        mobileOptimized: true,
      };

      const templates = await optimizer.generateTemplatesProgressively(
        request,
        progressCallback,
      );

      // Should have templates from successful calls only
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.length).toBeLessThan(3);
    });
  });

  describe('Offline Template Generation', () => {
    it('generates context-specific offline templates', async () => {
      const bookingContext = {
        ...mockClientContext,
        inquiryType: 'booking' as const,
      };

      const followUpContext = {
        ...mockClientContext,
        inquiryType: 'follow-up' as const,
      };

      const bookingTemplates = await optimizer.generateMobileOptimizedTemplates(
        {
          clientContext: bookingContext,
          offlineMode: true,
        },
      );

      const followUpTemplates =
        await optimizer.generateMobileOptimizedTemplates({
          clientContext: followUpContext,
          offlineMode: true,
        });

      expect(bookingTemplates[0].subject).toContain(mockClientContext.name);
      expect(followUpTemplates[0].subject).toContain('follow');

      // Different templates for different inquiry types
      expect(bookingTemplates[0].subject).not.toEqual(
        followUpTemplates[0].subject,
      );
    });

    it('includes wedding details in offline templates when provided', async () => {
      const contextWithDetails = {
        ...mockClientContext,
        weddingDate: '2024-06-15',
        venue: 'Grand Hotel',
      };

      const templates = await optimizer.generateMobileOptimizedTemplates({
        clientContext: contextWithDetails,
        offlineMode: true,
      });

      expect(templates[0].content).toContain('2024-06-15');
      expect(templates[0].content).toContain('Grand Hotel');
    });
  });

  describe('Cache Management', () => {
    it('generates consistent cache keys for similar contexts', () => {
      const context1 = { ...mockClientContext };
      const context2 = { ...mockClientContext };

      const key1 = (optimizer as any).generateCacheKey({
        clientContext: context1,
      });
      const key2 = (optimizer as any).generateCacheKey({
        clientContext: context2,
      });

      expect(key1).toEqual(key2);
    });

    it('generates different cache keys for different contexts', () => {
      const context1 = { ...mockClientContext, name: 'John Smith' };
      const context2 = { ...mockClientContext, name: 'Jane Doe' };

      const key1 = (optimizer as any).generateCacheKey({
        clientContext: context1,
      });
      const key2 = (optimizer as any).generateCacheKey({
        clientContext: context2,
      });

      expect(key1).not.toEqual(key2);
    });

    it('limits cache size for memory management', async () => {
      // Generate many different templates to fill cache
      for (let i = 0; i < 55; i++) {
        const context = { ...mockClientContext, name: `Client ${i}` };
        await optimizer.generateMobileOptimizedTemplates({
          clientContext: context,
          mobileOptimized: true,
        });
      }

      const cacheSize = (optimizer as any).cache.size;
      expect(cacheSize).toBeLessThanOrEqual(50); // Cache limit
    });

    it('clears cache on demand', () => {
      optimizer.clearCache();
      const cacheSize = (optimizer as any).cache.size;
      expect(cacheSize).toBe(0);
    });
  });

  describe('Performance State Monitoring', () => {
    it('returns current performance metrics', () => {
      const state = optimizer.getPerformanceState();

      expect(state).toMatchObject({
        networkState: expect.objectContaining({
          isOnline: expect.any(Boolean),
          connectionSpeed: expect.any(String),
          saveData: expect.any(Boolean),
        }),
        cacheSize: expect.any(Number),
        queueSize: expect.any(Number),
      });
    });

    it('updates performance metrics over time', async () => {
      const initialState = optimizer.getPerformanceState();

      await optimizer.generateMobileOptimizedTemplates({
        clientContext: mockClientContext,
        mobileOptimized: true,
      });

      const updatedState = optimizer.getPerformanceState();
      expect(updatedState.cacheSize).toBeGreaterThan(initialState.cacheSize);
    });
  });

  describe('Request Queuing', () => {
    it('queues requests when offline', () => {
      const request = {
        clientContext: mockClientContext,
        mobileOptimized: true,
      };

      optimizer.queueForLater(request);

      const state = optimizer.getPerformanceState();
      expect(state.queueSize).toBe(1);
    });
  });

  describe('Read Time Calculation', () => {
    it('calculates reading time accurately', () => {
      const optimizer = new MobileAIEmailOptimizer();
      const calculateReadTime = (optimizer as any).calculateReadTime;

      expect(calculateReadTime('Short text')).toBe('< 1 min read');
      expect(calculateReadTime('A '.repeat(200))).toBe('1 min read');
      expect(calculateReadTime('A '.repeat(400))).toBe('2 min read');
    });
  });

  describe('Mobile Prompt Building', () => {
    it('builds mobile-optimized prompts with all context', () => {
      const buildPrompt = (optimizer as any).buildMobileOptimizedPrompt;

      const prompt = buildPrompt(mockClientContext);

      expect(prompt).toContain(mockClientContext.name);
      expect(prompt).toContain(mockClientContext.weddingDate);
      expect(prompt).toContain(mockClientContext.venue);
      expect(prompt).toContain(mockClientContext.inquiryType);
      expect(prompt).toContain('Mobile Optimization Requirements');
      expect(prompt).toContain('bullet points');
      expect(prompt).toContain('50 characters'); // Subject line length limit
    });

    it('handles missing optional context gracefully', () => {
      const minimalContext = {
        name: 'John',
        inquiryType: 'general' as const,
        urgency: 'medium' as const,
      };

      const buildPrompt = (optimizer as any).buildMobileOptimizedPrompt;
      const prompt = buildPrompt(minimalContext);

      expect(prompt).toContain('John');
      expect(prompt).toContain('general');
      expect(prompt).not.toContain('undefined');
    });
  });

  describe('Error Handling', () => {
    it('handles malformed AI responses gracefully', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Invalid JSON response',
            },
          },
        ],
      });

      const request = {
        clientContext: mockClientContext,
        mobileOptimized: true,
      };

      const templates =
        await optimizer.generateMobileOptimizedTemplates(request);

      // Should fall back to offline templates
      expect(templates).toHaveLength(3);
      expect(templates[0].id).toMatch(/offline-booking-/);
    });

    it('handles empty AI responses', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: '[]',
            },
          },
        ],
      });

      const request = {
        clientContext: mockClientContext,
        mobileOptimized: true,
      };

      const templates =
        await optimizer.generateMobileOptimizedTemplates(request);

      // Should fall back to offline templates
      expect(templates).toHaveLength(3);
    });
  });
});
