import { jest } from '@jest/globals';
import { ChatMessage, ConversationContext, WeddingContext } from '@/types/chatbot';

// Mock OpenAI API Response
export const mockOpenAIResponse = jest.fn();

// Mock WebSocket Connection
export const mockWebSocketConnection = jest.fn();

// Mock Wedding Scenarios for Testing
export const mockWeddingScenarios = {
  rusticWedding: {
    style: 'rustic',
    budget: 25000,
    guestCount: 120,
    season: 'fall',
    venue: { type: 'barn', name: 'Willow Creek Farm' }
  },
  elegantWedding: {
    style: 'elegant',
    budget: 50000,
    guestCount: 200,
    season: 'spring',
    venue: { type: 'ballroom', name: 'Grand Hotel' }
  },
  beachWedding: {
    style: 'beach',
    budget: 35000,
    guestCount: 80,
    season: 'summer',
    venue: { type: 'beach', name: 'Sunset Beach Resort' }
  },
  microWedding: {
    style: 'intimate',
    budget: 15000,
    guestCount: 20,
    season: 'winter',
    venue: { type: 'private-dining', name: 'Garden Restaurant' }
  }
};

// Mock Conversation Contexts
export const mockConversationContexts = {
  newUser: {
    userId: 'user-new-123',
    conversationId: 'conv-new-456',
    history: [],
    isFirstVisit: true
  },
  returningUser: {
    userId: 'user-returning-789',
    conversationId: 'conv-returning-012',
    history: [
      {
        id: 'msg-1',
        role: 'user' as const,
        content: 'I need help with wedding planning',
        timestamp: new Date('2024-01-10T10:00:00Z')
      },
      {
        id: 'msg-2',
        role: 'assistant' as const,
        content: 'I\'d be happy to help! What aspect would you like to focus on?',
        timestamp: new Date('2024-01-10T10:00:15Z')
      }
    ],
    sessionMemory: {
      weddingDate: '2024-06-15',
      preferredStyle: 'rustic'
    }
  },
  urgentUser: {
    userId: 'user-urgent-345',
    conversationId: 'conv-urgent-678',
    history: [],
    priority: 'emergency',
    weddingContext: {
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      daysUntilWedding: 7
    }
  }
};

// Mock AI Responses for Different Scenarios
export const mockAIResponses = {
  venueRecommendation: {
    message: 'Based on your preferences for a rustic wedding with 120 guests, I recommend Willow Creek Farm. It features beautiful exposed beams, outdoor ceremony space, and can accommodate up to 150 guests.',
    confidence: 0.92,
    sources: ['venue-database', 'wedding-guide'],
    metadata: {
      venues: [
        {
          id: 'venue-123',
          name: 'Willow Creek Farm',
          type: 'barn',
          capacity: 150,
          style: 'rustic',
          priceRange: '$3000-$5000',
          rating: 4.7,
          features: ['outdoor ceremony', 'exposed beams', 'catering kitchen']
        }
      ],
      searchCriteria: {
        guestCount: 120,
        style: 'rustic',
        budget: 25000
      }
    }
  },

  budgetPlanning: {
    message: 'For your $25,000 budget, here\'s a recommended allocation: Venue (32%) - $8,000, Catering (30%) - $7,500, Photography (14%) - $3,500, Flowers (8%) - $2,000, Other (16%) - $4,000.',
    confidence: 0.88,
    sources: ['budget-guide', 'wedding-cost-data'],
    metadata: {
      budgetBreakdown: {
        total: 25000,
        categories: {
          venue: { amount: 8000, percentage: 32 },
          catering: { amount: 7500, percentage: 30 },
          photography: { amount: 3500, percentage: 14 },
          flowers: { amount: 2000, percentage: 8 },
          other: { amount: 4000, percentage: 16 }
        }
      }
    }
  },

  timelineCreation: {
    message: 'Here\'s a suggested timeline for your wedding day: 8:00 AM - Hair & Makeup begins, 2:00 PM - First Look photos, 4:00 PM - Ceremony, 5:00 PM - Cocktail hour, 6:00 PM - Reception begins.',
    confidence: 0.95,
    sources: ['timeline-templates', 'wedding-planning-guide'],
    metadata: {
      timeline: [
        { time: '8:00 AM', activity: 'Hair & Makeup begins', duration: 180, priority: 'high' },
        { time: '2:00 PM', activity: 'First Look photos', duration: 30, priority: 'medium' },
        { time: '4:00 PM', activity: 'Ceremony', duration: 45, priority: 'high' },
        { time: '5:00 PM', activity: 'Cocktail hour', duration: 60, priority: 'medium' },
        { time: '6:00 PM', activity: 'Reception begins', duration: 300, priority: 'high' }
      ]
    }
  },

  vendorRecommendation: {
    message: 'I found several excellent photographers in your area. Sarah Photography specializes in rustic weddings and has fantastic reviews for outdoor ceremonies.',
    confidence: 0.89,
    sources: ['vendor-database', 'review-aggregator'],
    metadata: {
      vendors: [
        {
          id: 'vendor-photo-456',
          name: 'Sarah Photography',
          type: 'photographer',
          specialties: ['rustic', 'outdoor', 'portrait'],
          rating: 4.9,
          priceRange: '$2500-$4000',
          availability: 'available',
          portfolio: ['/images/sarah1.jpg', '/images/sarah2.jpg'],
          contact: { phone: '555-0123', email: 'sarah@sarahphoto.com' }
        }
      ]
    }
  },

  emergencyResponse: {
    message: 'I understand this is urgent! Venue cancellations are stressful, but we can find solutions. Let me immediately search for available backup venues in your area for your date.',
    confidence: 0.96,
    sources: ['emergency-protocols', 'vendor-availability'],
    metadata: {
      emergencyResponse: true,
      priority: 'critical',
      actionItems: [
        { task: 'Search backup venues', priority: 'immediate', estimated: '2 hours' },
        { task: 'Contact emergency coordinators', priority: 'immediate', estimated: '30 minutes' },
        { task: 'Review contracts for compensation', priority: 'high', estimated: '1 hour' }
      ],
      humanSupportOffered: true,
      escalation: {
        level: 'emergency',
        contactMethod: 'phone',
        expectedResponse: '15 minutes'
      }
    }
  }
};

// Mock Wedding Knowledge Base Responses
export const mockKnowledgeBase = {
  weddingTerminology: {
    'first look': {
      definition: 'A private moment before the ceremony when the couple sees each other for the first time on their wedding day',
      category: 'photography',
      tips: ['Creates intimate photos', 'Reduces ceremony nerves', 'Allows more time for photos']
    },
    'cocktail hour': {
      definition: 'Social hour between ceremony and reception where guests enjoy drinks and appetizers',
      category: 'reception',
      tips: ['Typical duration: 60-90 minutes', 'Great time for photos', 'Keep guests entertained']
    },
    'wedding party': {
      definition: 'Group of friends and family who participate in the wedding ceremony',
      category: 'ceremony',
      tips: ['Choose close friends/family', 'Consider costs for their attire', 'Plan activities together']
    }
  },

  venueTypes: {
    barn: {
      style: 'rustic',
      capacity: '50-200',
      features: ['exposed beams', 'outdoor space', 'country setting'],
      considerations: ['weather backup', 'restroom facilities', 'catering logistics']
    },
    ballroom: {
      style: 'elegant',
      capacity: '100-500',
      features: ['formal setting', 'built-in amenities', 'climate controlled'],
      considerations: ['formal dress code', 'higher costs', 'limited decor flexibility']
    },
    beach: {
      style: 'casual',
      capacity: '20-150',
      features: ['ocean views', 'natural beauty', 'sunset photos'],
      considerations: ['weather dependent', 'sand logistics', 'sound permits']
    }
  },

  seasonalConsiderations: {
    spring: {
      pros: ['mild weather', 'blooming flowers', 'good availability'],
      cons: ['rain possibility', 'pollen allergies', 'variable temperatures'],
      flowers: ['tulips', 'daffodils', 'cherry blossoms', 'peonies']
    },
    summer: {
      pros: ['warm weather', 'long days', 'outdoor options'],
      cons: ['peak season pricing', 'heat concerns', 'limited availability'],
      flowers: ['roses', 'sunflowers', 'hydrangeas', 'lavender']
    },
    fall: {
      pros: ['beautiful foliage', 'comfortable temperatures', 'harvest themes'],
      cons: ['shorter days', 'weather unpredictability', 'holiday conflicts'],
      flowers: ['mums', 'dahlias', 'marigolds', 'sunflowers']
    },
    winter: {
      pros: ['romantic atmosphere', 'lower costs', 'good availability'],
      cons: ['cold weather', 'travel concerns', 'limited daylight'],
      flowers: ['amaryllis', 'poinsettias', 'evergreens', 'white roses']
    }
  }
};

// Test Helper Functions
export const createMockMessage = (content: string, role: 'user' | 'assistant' = 'user'): ChatMessage => ({
  id: `msg-${Date.now()}`,
  role,
  content,
  timestamp: new Date(),
  status: 'sent'
});

export const createMockConversation = (messages: ChatMessage[] = []): ConversationContext => ({
  userId: `user-${Date.now()}`,
  conversationId: `conv-${Date.now()}`,
  history: messages,
  startTime: new Date(),
  lastActivity: new Date()
});

export const createMockWeddingContext = (overrides: Partial<WeddingContext> = {}): WeddingContext => ({
  date: '2024-06-15',
  guestCount: 100,
  budget: 25000,
  style: 'rustic',
  venue: {
    name: 'Test Venue',
    type: 'barn',
    capacity: 120
  },
  ...overrides
});

// Mock API Responses
export const setupMockResponses = () => {
  mockOpenAIResponse.mockImplementation((query: string, context: any) => {
    if (query.toLowerCase().includes('venue')) {
      return Promise.resolve(mockAIResponses.venueRecommendation);
    }
    if (query.toLowerCase().includes('budget')) {
      return Promise.resolve(mockAIResponses.budgetPlanning);
    }
    if (query.toLowerCase().includes('timeline')) {
      return Promise.resolve(mockAIResponses.timelineCreation);
    }
    if (query.toLowerCase().includes('photographer')) {
      return Promise.resolve(mockAIResponses.vendorRecommendation);
    }
    if (query.toLowerCase().includes('emergency') || query.toLowerCase().includes('canceled')) {
      return Promise.resolve(mockAIResponses.emergencyResponse);
    }
    
    return Promise.resolve({
      message: 'I\'d be happy to help with your wedding planning!',
      confidence: 0.8,
      sources: [],
      metadata: {}
    });
  });
};

// Mock WebSocket for Real-time Testing
export const mockWebSocket = {
  readyState: WebSocket.OPEN,
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  onopen: null,
  onclose: null,
  onmessage: null,
  onerror: null
};

// Error Simulation Helpers
export const simulateNetworkError = () => {
  mockOpenAIResponse.mockRejectedValue(new Error('Network error: Unable to connect'));
};

export const simulateRateLimitError = () => {
  mockOpenAIResponse.mockRejectedValue(new Error('Rate limit exceeded. Please try again later.'));
};

export const simulateServerError = () => {
  mockOpenAIResponse.mockRejectedValue(new Error('Internal server error'));
};

// Performance Testing Helpers
export const measureResponseTime = async (fn: () => Promise<any>): Promise<{ result: any; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return { result, duration: end - start };
};

// Wedding Industry Test Data
export const weddingTestData = {
  venues: [
    {
      id: 'venue-001',
      name: 'Sunset Gardens',
      type: 'outdoor',
      capacity: 150,
      priceRange: '$$',
      location: 'California',
      features: ['garden ceremony', 'reception hall', 'catering kitchen'],
      rating: 4.8
    },
    {
      id: 'venue-002',
      name: 'Grand Ballroom',
      type: 'ballroom',
      capacity: 300,
      priceRange: '$$$',
      location: 'New York',
      features: ['elegant decor', 'built-in bar', 'valet parking'],
      rating: 4.6
    }
  ],
  
  vendors: [
    {
      id: 'vendor-001',
      name: 'Sarah Photography',
      type: 'photographer',
      specialties: ['wedding', 'portrait', 'outdoor'],
      rating: 4.9,
      priceRange: '$2500-$4000',
      location: 'Los Angeles'
    },
    {
      id: 'vendor-002',
      name: 'Elegant Florals',
      type: 'florist',
      specialties: ['bridal bouquets', 'centerpieces', 'ceremony decor'],
      rating: 4.7,
      priceRange: '$1200-$2500',
      location: 'San Francisco'
    }
  ],
  
  commonQuestions: [
    'How do I choose a wedding venue?',
    'What should my wedding budget be?',
    'How far in advance should I book vendors?',
    'What is a good timeline for wedding planning?',
    'How do I create a wedding day timeline?',
    'What flowers are best for my season?',
    'How many guests should I invite?',
    'What should I include in my wedding registry?'
  ],
  
  emergencyScenarios: [
    'Vendor cancellation 1 week before wedding',
    'Weather emergency for outdoor wedding',
    'Guest count change 2 weeks before wedding',
    'Budget shortage discovered late in planning',
    'Venue double-booking discovered',
    'Key family member can\'t attend due to emergency'
  ]
};

// Accessibility Testing Helpers
export const mockScreenReader = {
  announce: jest.fn(),
  readContent: jest.fn(),
  navigateToNext: jest.fn(),
  navigateToPrevious: jest.fn()
};

export const mockAccessibilityFeatures = {
  highContrast: false,
  reducedMotion: false,
  fontSize: 'normal',
  screenReader: false
};

// Performance Benchmarks
export const performanceBenchmarks = {
  messageResponse: 2000, // 2 seconds max
  componentRender: 100, // 100ms max
  searchQuery: 500, // 500ms max
  fileUpload: 5000, // 5 seconds max
  typing: 200 // 200ms typing delay max
};

// Export all utilities
export default {
  mockOpenAIResponse,
  mockWebSocketConnection,
  mockWeddingScenarios,
  mockConversationContexts,
  mockAIResponses,
  mockKnowledgeBase,
  createMockMessage,
  createMockConversation,
  createMockWeddingContext,
  setupMockResponses,
  mockWebSocket,
  simulateNetworkError,
  simulateRateLimitError,
  simulateServerError,
  measureResponseTime,
  weddingTestData,
  mockScreenReader,
  mockAccessibilityFeatures,
  performanceBenchmarks
};