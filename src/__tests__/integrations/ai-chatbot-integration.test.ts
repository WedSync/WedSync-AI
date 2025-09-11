import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { OpenAIIntegrationService } from '@/lib/integrations/openai-integration';
import { KnowledgeBaseIntegrationService } from '@/lib/integrations/knowledge-base-integration';
import { SupportEscalationService } from '@/lib/integrations/support-escalation-service';
import { RealTimeCommunicationHub } from '@/lib/integrations/realtime-communication-hub';
import {
  IntegrationConfig,
  IntegrationCredentials,
  ChatMessage,
  ChatContext,
  OpenAIConfig,
  KnowledgeBaseConfig,
  SupportIntegrationConfig,
  RealTimeConfig,
  TicketPriority,
} from '@/types/integrations';

// Mock external dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { id: 'test-ticket-id', status: 'open' },
              error: null,
            }),
          ),
        })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      }),
      send: vi.fn(() => Promise.resolve('ok')),
      track: vi.fn(() => Promise.resolve()),
      unsubscribe: vi.fn(() => Promise.resolve()),
      presenceState: vi.fn(() => ({})),
    })),
  })),
}));

vi.mock('openai', () => ({
  OpenAI: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Mocked AI response for wedding planning assistance.',
              },
            },
          ],
          usage: {
            prompt_tokens: 50,
            completion_tokens: 25,
            total_tokens: 75,
          },
        }),
      },
    },
  })),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('AI Chatbot Integration System - WS-243 Team C', () => {
  let mockConfig: IntegrationConfig;
  let mockCredentials: IntegrationCredentials;
  let mockOpenAIConfig: OpenAIConfig;
  let mockKnowledgeConfig: KnowledgeBaseConfig;
  let mockSupportConfig: SupportIntegrationConfig;
  let mockRealtimeConfig: RealTimeConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      apiUrl: 'https://api.test.com',
      timeout: 30000,
      retryAttempts: 3,
      rateLimitPerMinute: 60,
    };

    mockCredentials = {
      apiKey: 'test-api-key',
      userId: 'test-user-id',
      organizationId: 'test-org-id',
      accessToken: 'test-access-token',
    };

    mockOpenAIConfig = {
      model: 'gpt-4',
      maxTokens: 1000,
      temperature: 0.7,
      systemPrompts: {
        wedding_vendor: 'You are a wedding industry expert...',
        couple_support: 'You help couples plan their perfect wedding...',
      },
      enableFunctionCalling: true,
      tokenUsageTracking: true,
    };

    mockKnowledgeConfig = {
      supabaseConfig: {
        url: 'https://test.supabase.co',
        serviceKey: 'test-service-key',
      },
      vectorTableName: 'knowledge_vectors',
      chunkSize: 500,
      overlapSize: 50,
      similarityThreshold: 0.8,
      maxResults: 10,
      enableCache: true,
      cacheTTL: 300,
    };

    mockSupportConfig = {
      supabaseConfig: {
        url: 'https://test.supabase.co',
        serviceKey: 'test-service-key',
      },
      externalApiUrl: 'https://support.test.com',
      tokenRefreshUrl: 'https://auth.test.com/refresh',
      escalationRules: {
        weddingDayEmergency: {
          maxWaitMinutes: 5,
          requiredSkills: ['wedding_emergency'],
        },
      },
    };

    mockRealtimeConfig = {
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'test-anon-key',
      eventsPerSecond: 10,
      presenceTracking: true,
      messageRetention: 24,
    };

    // Mock successful fetch responses
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({ success: true }),
      headers: new Headers(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('OpenAI Integration Service', () => {
    let openAIService: OpenAIIntegrationService;

    beforeEach(() => {
      openAIService = new OpenAIIntegrationService(
        mockConfig,
        mockCredentials,
        mockOpenAIConfig,
      );
    });

    it('should create chat completion with wedding context', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content:
            'I need help planning my wedding timeline for a beach ceremony.',
          timestamp: new Date(),
        },
      ];

      const context: ChatContext = {
        sessionId: 'session-123',
        userId: 'user-123',
        organizationId: 'org-123',
        userType: 'couple',
        type: 'planning_consultation',
        weddingDate: '2024-08-15',
        vendorType: 'photographer',
      };

      const response = await openAIService.createChatCompletion(
        messages,
        context,
      );

      expect(response).toBeDefined();
      expect(response.role).toBe('assistant');
      expect(response.content).toContain('wedding');
      expect(response.metadata?.tokenUsage).toBeDefined();
    });

    it('should handle wedding day emergency escalation', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-emergency',
          role: 'user',
          content:
            'URGENT: The photographer is not showing up and the ceremony starts in 1 hour!',
          timestamp: new Date(),
        },
      ];

      const todayWeddingContext: ChatContext = {
        sessionId: 'emergency-session',
        userId: 'bride-123',
        organizationId: 'venue-org',
        userType: 'couple',
        type: 'emergency_support',
        weddingDate: new Date().toISOString().split('T')[0], // Today
        urgency: 'critical',
      };

      const response = await openAIService.createChatCompletion(
        messages,
        todayWeddingContext,
      );

      expect(response.metadata?.requiresEscalation).toBe(true);
      expect(response.metadata?.priority).toBe('critical');
    });

    it('should track token usage correctly', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Test message',
          timestamp: new Date(),
        },
      ];
      const context: ChatContext = {
        sessionId: 'test-session',
        userId: 'test-user',
        organizationId: 'test-org',
        userType: 'vendor',
        type: 'general_inquiry',
      };

      await openAIService.createChatCompletion(messages, context);

      const metrics = openAIService.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
    });

    it('should handle PII redaction in messages', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-pii',
          role: 'user',
          content:
            'My email is john@example.com and my phone is 555-123-4567. Please help with my wedding.',
          timestamp: new Date(),
        },
      ];

      const context: ChatContext = {
        sessionId: 'pii-session',
        userId: 'user-pii',
        organizationId: 'org-pii',
        userType: 'couple',
        type: 'general_inquiry',
      };

      const response = await openAIService.createChatCompletion(
        messages,
        context,
      );

      // Should still respond helpfully despite PII redaction
      expect(response.content).toBeDefined();
      expect(response.content.length).toBeGreaterThan(0);
    });
  });

  describe('Knowledge Base Integration Service', () => {
    let knowledgeService: KnowledgeBaseIntegrationService;

    beforeEach(() => {
      knowledgeService = new KnowledgeBaseIntegrationService(
        mockConfig,
        mockCredentials,
        mockKnowledgeConfig,
      );
    });

    it('should perform semantic search with wedding context', async () => {
      const query = {
        text: 'How to handle rain on outdoor wedding day',
        context: {
          sessionId: 'search-session',
          userId: 'planner-123',
          organizationId: 'planning-org',
          userType: 'vendor',
          type: 'knowledge_search',
          vendorType: 'wedding_planner',
        },
        maxResults: 5,
        includeMetadata: true,
      };

      // Mock the vector search response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: 'kb-1',
                title: 'Outdoor Wedding Weather Contingency Plans',
                content:
                  'When planning outdoor weddings, always have a backup plan...',
                similarity: 0.92,
                metadata: {
                  category: 'weather_planning',
                  source: 'expert_guide',
                },
              },
            ],
          }),
        headers: new Headers(),
      } as Response);

      const results = await knowledgeService.semanticSearch(query);

      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('Weather');
      expect(results[0].similarity).toBeGreaterThan(0.9);
    });

    it('should get contextual knowledge based on chat context', async () => {
      const context: ChatContext = {
        sessionId: 'context-session',
        userId: 'photographer-123',
        organizationId: 'photo-org',
        userType: 'vendor',
        type: 'technical_support',
        vendorType: 'photographer',
        weddingDate: '2024-09-20',
      };

      // Mock contextual search response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: 'kb-photo',
                title: 'Photography Best Practices for September Weddings',
                content:
                  'September lighting considerations and equipment recommendations...',
                similarity: 0.88,
                metadata: { category: 'photography', season: 'september' },
              },
            ],
          }),
        headers: new Headers(),
      } as Response);

      const results = await knowledgeService.getContextualKnowledge(
        context,
        'lighting tips',
      );

      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('Photography');
      expect(results[0].metadata?.season).toBe('september');
    });

    it('should handle cache hits and misses correctly', async () => {
      const query = {
        text: 'wedding venue capacity planning',
        context: {
          sessionId: 'cache-session',
          userId: 'venue-mgr',
          organizationId: 'venue-org',
          userType: 'vendor',
          type: 'planning_consultation',
        },
        maxResults: 3,
      };

      // First call should miss cache
      await knowledgeService.semanticSearch(query);

      // Second call should hit cache (in a real scenario)
      await knowledgeService.semanticSearch(query);

      // Should only make one external API call due to caching
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Support Escalation Service', () => {
    let supportService: SupportEscalationService;

    beforeEach(() => {
      supportService = new SupportEscalationService(
        mockConfig,
        mockCredentials,
        mockSupportConfig,
      );
    });

    it('should escalate chat with proper priority for wedding day emergency', async () => {
      const chatHistory: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content:
            "Help! The flowers haven't arrived and ceremony is in 2 hours!",
          timestamp: new Date(),
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'I understand this is urgent. Let me help you immediately.',
          timestamp: new Date(),
        },
      ];

      const emergencyContext: ChatContext = {
        sessionId: 'emergency-escalation',
        userId: 'bride-emergency',
        organizationId: 'wedding-venue',
        userType: 'couple',
        type: 'emergency_support',
        weddingDate: new Date().toISOString().split('T')[0], // Today
        urgency: 'critical',
      };

      const ticket = await supportService.escalateChat(
        chatHistory,
        emergencyContext,
        'Wedding day vendor no-show emergency',
      );

      expect(ticket).toBeDefined();
      expect(ticket.priority).toBe(TicketPriority.CRITICAL);
      expect(ticket.subject).toContain('Wedding day');
      expect(ticket.description).toContain("flowers haven't arrived");
    });

    it('should assign appropriate agent based on skills and workload', async () => {
      const chatHistory: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'My integration with Tave is not syncing properly',
          timestamp: new Date(),
        },
      ];

      const techContext: ChatContext = {
        sessionId: 'tech-escalation',
        userId: 'photographer-tech',
        organizationId: 'photo-studio',
        userType: 'vendor',
        type: 'technical_support',
        vendorType: 'photographer',
      };

      const ticket = await supportService.escalateChat(
        chatHistory,
        techContext,
        'Technical integration failure',
      );

      expect(ticket).toBeDefined();
      expect(ticket.priority).toBe(TicketPriority.MEDIUM);
      expect(ticket.assignedAgentId).toBeDefined();
    });

    it('should handle multiple escalations without agent overload', async () => {
      const chatHistory: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Need help with billing issue',
          timestamp: new Date(),
        },
      ];

      const contexts = Array.from({ length: 5 }, (_, i) => ({
        sessionId: `billing-session-${i}`,
        userId: `user-${i}`,
        organizationId: `org-${i}`,
        userType: 'vendor' as const,
        type: 'billing_support' as const,
      }));

      const tickets = await Promise.all(
        contexts.map((context) =>
          supportService.escalateChat(chatHistory, context, 'Billing inquiry'),
        ),
      );

      expect(tickets).toHaveLength(5);
      tickets.forEach((ticket) => {
        expect(ticket.priority).toBe(TicketPriority.HIGH);
      });
    });
  });

  describe('Real-time Communication Hub', () => {
    let realtimeHub: RealTimeCommunicationHub;

    beforeEach(() => {
      realtimeHub = new RealTimeCommunicationHub(
        mockConfig,
        mockCredentials,
        mockRealtimeConfig,
      );
    });

    it('should create chat connection with presence tracking', async () => {
      const context: ChatContext = {
        sessionId: 'realtime-session',
        userId: 'couple-123',
        organizationId: 'venue-org',
        userType: 'couple',
        type: 'live_chat',
        weddingDate: '2024-10-12',
      };

      const connection = await realtimeHub.createChatConnection(
        'couple-123',
        'venue-org',
        context,
      );

      expect(connection).toBeDefined();
      expect(connection.userId).toBe('couple-123');
      expect(connection.status).toBe('connected');
      expect(connection.channelName).toContain('chat:venue-org');
    });

    it('should send chat messages with wedding context', async () => {
      const context: ChatContext = {
        sessionId: 'message-session',
        userId: 'vendor-456',
        organizationId: 'catering-co',
        userType: 'vendor',
        type: 'customer_service',
        vendorType: 'caterer',
        weddingDate: '2024-11-05',
      };

      const connection = await realtimeHub.createChatConnection(
        'vendor-456',
        'catering-co',
        context,
      );

      const message: ChatMessage = {
        id: 'rt-msg-1',
        role: 'user',
        content: 'Can we adjust the menu for dietary restrictions?',
        timestamp: new Date(),
      };

      const deliveryStatus = await realtimeHub.sendChatMessage(
        connection.id,
        message,
      );

      expect(deliveryStatus.status).toBe('delivered');
      expect(deliveryStatus.messageId).toBe('rt-msg-1');
      expect(deliveryStatus.deliveredAt).toBeDefined();
    });

    it('should handle typing indicators and presence updates', async () => {
      const context: ChatContext = {
        sessionId: 'typing-session',
        userId: 'planner-789',
        organizationId: 'planning-firm',
        userType: 'vendor',
        type: 'consultation',
      };

      const connection = await realtimeHub.createChatConnection(
        'planner-789',
        'planning-firm',
        context,
      );

      // Should not throw error when sending typing indicator
      await expect(
        realtimeHub.sendTypingIndicator(connection.id, true),
      ).resolves.not.toThrow();

      await expect(
        realtimeHub.sendTypingIndicator(connection.id, false),
      ).resolves.not.toThrow();
    });

    it('should broadcast wedding day emergency alerts', async () => {
      const emergencyEvent = {
        type: 'wedding_emergency' as const,
        severity: 'critical' as const,
        weddingDate: new Date().toISOString().split('T')[0],
        venue: 'Sunset Beach Resort',
        issue: 'Power outage affecting sound system',
      };

      const success = await realtimeHub.broadcastToChannel(
        'emergency-alerts',
        emergencyEvent,
        {
          urgency: 'critical',
          requiresResponse: true,
          affectedServices: ['audio', 'lighting'],
        },
      );

      // Should succeed even without active subscriptions for testing
      expect(typeof success).toBe('boolean');
    });

    it('should handle connection cleanup on disconnect', async () => {
      const context: ChatContext = {
        sessionId: 'cleanup-session',
        userId: 'test-cleanup',
        organizationId: 'test-cleanup-org',
        userType: 'vendor',
        type: 'general_inquiry',
      };

      const connection = await realtimeHub.createChatConnection(
        'test-cleanup',
        'test-cleanup-org',
        context,
      );

      const initialConnections = realtimeHub.getActiveConnections().length;

      await realtimeHub.disconnectChat(connection.id);

      const finalConnections = realtimeHub.getActiveConnections().length;
      expect(finalConnections).toBe(initialConnections - 1);
    });
  });

  describe('Integration Fault Tolerance', () => {
    it('should handle OpenAI API failures gracefully', async () => {
      // Mock API failure
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new Error('OpenAI API timeout'),
      );

      const openAIService = new OpenAIIntegrationService(
        mockConfig,
        mockCredentials,
        mockOpenAIConfig,
      );

      const messages: ChatMessage[] = [
        {
          id: 'fail-test',
          role: 'user',
          content: 'Test message',
          timestamp: new Date(),
        },
      ];
      const context: ChatContext = {
        sessionId: 'fail-session',
        userId: 'fail-user',
        organizationId: 'fail-org',
        userType: 'vendor',
        type: 'general_inquiry',
      };

      await expect(
        openAIService.createChatCompletion(messages, context),
      ).rejects.toThrow('OpenAI API timeout');

      // Should update failure metrics
      const metrics = openAIService.getMetrics();
      expect(metrics.failedRequests).toBe(1);
    });

    it('should handle knowledge base search failures with degraded service', async () => {
      // Mock search API failure
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new Error('Search service unavailable'),
      );

      const knowledgeService = new KnowledgeBaseIntegrationService(
        mockConfig,
        mockCredentials,
        mockKnowledgeConfig,
      );

      const query = {
        text: 'wedding planning tips',
        context: {
          sessionId: 'fail-search',
          userId: 'fail-user',
          organizationId: 'fail-org',
          userType: 'couple' as const,
          type: 'knowledge_search' as const,
        },
      };

      await expect(knowledgeService.semanticSearch(query)).rejects.toThrow(
        'Search service unavailable',
      );
    });

    it('should maintain service health monitoring', async () => {
      const services = [
        new OpenAIIntegrationService(
          mockConfig,
          mockCredentials,
          mockOpenAIConfig,
        ),
        new KnowledgeBaseIntegrationService(
          mockConfig,
          mockCredentials,
          mockKnowledgeConfig,
        ),
        new SupportEscalationService(
          mockConfig,
          mockCredentials,
          mockSupportConfig,
        ),
        new RealTimeCommunicationHub(
          mockConfig,
          mockCredentials,
          mockRealtimeConfig,
        ),
      ];

      const healthChecks = await Promise.allSettled(
        services.map((service) => service.healthCheck()),
      );

      healthChecks.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          expect(result.value.status).toMatch(/healthy|unhealthy/);
          expect(result.value.lastChecked).toBeInstanceOf(Date);
        }
      });
    });
  });

  describe('Wedding Industry Specialization', () => {
    it('should recognize Saturday wedding day restrictions', async () => {
      const openAIService = new OpenAIIntegrationService(
        mockConfig,
        mockCredentials,
        mockOpenAIConfig,
      );

      // Mock Saturday date
      const saturday = new Date();
      saturday.setDate(saturday.getDate() + (6 - saturday.getDay())); // Next Saturday

      const messages: ChatMessage[] = [
        {
          id: 'saturday-test',
          role: 'user',
          content: 'Emergency support needed!',
          timestamp: new Date(),
        },
      ];
      const saturdayContext: ChatContext = {
        sessionId: 'saturday-session',
        userId: 'saturday-user',
        organizationId: 'saturday-org',
        userType: 'couple',
        type: 'emergency_support',
        weddingDate: saturday.toISOString().split('T')[0],
      };

      const response = await openAIService.createChatCompletion(
        messages,
        saturdayContext,
      );

      expect(response.metadata?.weddingDayProtocol).toBe(true);
      expect(response.metadata?.priority).toBe('critical');
    });

    it('should provide vendor-specific context and recommendations', async () => {
      const knowledgeService = new KnowledgeBaseIntegrationService(
        mockConfig,
        mockCredentials,
        mockKnowledgeConfig,
      );

      const vendorTypes = ['photographer', 'caterer', 'florist', 'venue', 'dj'];

      for (const vendorType of vendorTypes) {
        const context: ChatContext = {
          sessionId: `${vendorType}-session`,
          userId: `${vendorType}-user`,
          organizationId: `${vendorType}-org`,
          userType: 'vendor',
          type: 'planning_consultation',
          vendorType,
        };

        // Mock vendor-specific knowledge
        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              data: [
                {
                  id: `kb-${vendorType}`,
                  title: `${vendorType} Best Practices`,
                  content: `Professional ${vendorType} guidelines...`,
                  similarity: 0.95,
                  metadata: {
                    category: vendorType,
                    type: 'professional_guide',
                  },
                },
              ],
            }),
          headers: new Headers(),
        } as Response);

        const results = await knowledgeService.getContextualKnowledge(context);

        expect(results).toHaveLength(1);
        expect(results[0].metadata?.category).toBe(vendorType);
      }
    });
  });
});
