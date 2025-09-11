import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limiter';

// Wedding-specific search enhancement mapping
const weddingTermsMap: Record<string, string[]> = {
  venue: [
    'place',
    'location',
    'hall',
    'church',
    'where',
    'reception',
    'ceremony',
  ],
  budget: [
    'money',
    'cost',
    'price',
    'expensive',
    'cheap',
    'afford',
    'spend',
    'financial',
  ],
  photography: [
    'photo',
    'picture',
    'camera',
    'photographer',
    'shots',
    'album',
    'engagement',
  ],
  catering: [
    'food',
    'eat',
    'dinner',
    'menu',
    'catering',
    'meal',
    'appetizer',
    'dessert',
  ],
  music: [
    'music',
    'DJ',
    'band',
    'song',
    'dance',
    'party',
    'playlist',
    'first dance',
  ],
  flowers: [
    'flower',
    'bouquet',
    'floral',
    'centerpiece',
    'bloom',
    'petals',
    'arrangement',
  ],
  dress: [
    'dress',
    'gown',
    'outfit',
    'attire',
    'wear',
    'clothing',
    'bridal',
    'tuxedo',
  ],
  timeline: [
    'when',
    'schedule',
    'time',
    'plan',
    'order',
    'timeline',
    'checklist',
  ],
  guests: [
    'guest',
    'invite',
    'invitation',
    'RSVP',
    'plus one',
    'seating',
    'family',
  ],
  vendors: [
    'vendor',
    'supplier',
    'service',
    'provider',
    'professional',
    'business',
  ],
};

// Wedding timeline phase patterns
const timelinePhases: Record<string, string[]> = {
  'early-planning': [
    '12 months',
    '18 months',
    'year before',
    'early',
    'start planning',
  ],
  'active-planning': [
    '6 months',
    '8 months',
    'middle',
    'planning phase',
    'details',
  ],
  'final-details': [
    '2 months',
    '1 month',
    'final',
    'last minute',
    'finishing touches',
  ],
  'wedding-week': [
    'week before',
    'days before',
    'wedding week',
    'final week',
    'rehearsal',
  ],
};

// Mock wedding articles database (in real app, this would be from Supabase)
const mockArticles = [
  {
    id: '1',
    title: 'How to Choose the Perfect Wedding Venue',
    slug: 'choose-perfect-wedding-venue',
    excerpt:
      'Essential questions to ask when touring wedding venues, from capacity to catering options.',
    content:
      'When choosing your wedding venue, consider location, capacity, available dates, catering options, and backup plans for weather...',
    category: 'venue',
    tags: ['venue', 'location', 'planning', 'questions'],
    weddingTimelineTags: ['early-planning'],
    estimatedReadTime: 8,
    helpful: 92,
    isOfflineAvailable: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Wedding Budget Breakdown: Where to Spend Your Money',
    slug: 'wedding-budget-breakdown',
    excerpt:
      'Learn how to allocate your wedding budget across different categories for maximum impact.',
    content:
      'A typical wedding budget should allocate 40-50% to venue and catering, 10% to photography, 8% to flowers...',
    category: 'budget',
    tags: ['budget', 'money', 'planning', 'priorities'],
    weddingTimelineTags: ['early-planning'],
    estimatedReadTime: 12,
    helpful: 95,
    isOfflineAvailable: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Photography Timeline for Your Wedding Day',
    slug: 'photography-timeline-wedding-day',
    excerpt:
      'Plan the perfect photography timeline to capture every special moment.',
    content:
      'Start with getting ready photos 2 hours before ceremony, first look 1 hour before, ceremony photos...',
    category: 'photography',
    tags: ['photography', 'timeline', 'wedding day', 'planning'],
    weddingTimelineTags: ['final-details', 'wedding-week'],
    estimatedReadTime: 6,
    helpful: 89,
    isOfflineAvailable: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    title: 'What Questions to Ask Your Wedding Caterer',
    slug: 'questions-wedding-caterer',
    excerpt:
      'Essential questions to ensure your wedding catering exceeds expectations.',
    content:
      'Ask about menu flexibility, dietary restrictions, service style, tastings, and backup plans...',
    category: 'catering',
    tags: ['catering', 'food', 'questions', 'vendor'],
    weddingTimelineTags: ['active-planning'],
    estimatedReadTime: 5,
    helpful: 91,
    isOfflineAvailable: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: '5',
    title: 'DIY Wedding Flowers: Save Money and Add Personal Touch',
    slug: 'diy-wedding-flowers',
    excerpt:
      'Create beautiful wedding florals yourself with these expert tips and tricks.',
    content:
      'Choose flowers that are in season, order wholesale, prep the night before, and focus on key areas...',
    category: 'flowers',
    tags: ['flowers', 'diy', 'budget', 'decorations'],
    weddingTimelineTags: ['final-details'],
    estimatedReadTime: 10,
    helpful: 87,
    isOfflineAvailable: true,
    createdAt: new Date().toISOString(),
  },
];

function enhanceWeddingQuery(query: string): string {
  let enhancedQuery = query.toLowerCase();

  // Map common spoken terms to wedding terminology
  for (const [weddingTerm, spokenTerms] of Object.entries(weddingTermsMap)) {
    for (const spokenTerm of spokenTerms) {
      if (
        enhancedQuery.includes(spokenTerm) &&
        !enhancedQuery.includes(weddingTerm)
      ) {
        enhancedQuery = enhancedQuery.replace(
          new RegExp(`\\b${spokenTerm}\\b`, 'gi'),
          `${spokenTerm} ${weddingTerm}`,
        );
      }
    }
  }

  // Add wedding context if not present
  if (
    !enhancedQuery.includes('wedding') &&
    !enhancedQuery.includes('marriage')
  ) {
    enhancedQuery = `wedding ${enhancedQuery}`;
  }

  return enhancedQuery;
}

function searchArticles(query: string, limit: number = 10): any[] {
  const searchTerms = query
    .toLowerCase()
    .split(' ')
    .filter((term) => term.length > 2);

  return mockArticles
    .map((article) => {
      let relevanceScore = 0;

      // Title match (highest weight)
      searchTerms.forEach((term) => {
        if (article.title.toLowerCase().includes(term)) {
          relevanceScore += 10;
        }
        if (article.excerpt.toLowerCase().includes(term)) {
          relevanceScore += 5;
        }
        if (article.content.toLowerCase().includes(term)) {
          relevanceScore += 2;
        }
        if (article.tags.some((tag) => tag.toLowerCase().includes(term))) {
          relevanceScore += 8;
        }
        if (article.category.toLowerCase().includes(term)) {
          relevanceScore += 7;
        }
      });

      return { ...article, relevanceScore };
    })
    .filter((article) => article.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

function generateSuggestions(query: string): string[] {
  const category = categorizeQuery(query);

  const suggestions = {
    venue: [
      'What questions should I ask when touring venues?',
      'How far in advance should I book my venue?',
      "What's the average cost of a wedding venue?",
    ],
    budget: [
      'How much should I spend on photography?',
      'What percentage of budget goes to venue?',
      'How to save money on wedding flowers?',
    ],
    photography: [
      'When should I book my wedding photographer?',
      'What style of wedding photography is best?',
      'How long does wedding photo editing take?',
    ],
    catering: [
      'How much food do I need per person?',
      'What are the most popular wedding menu options?',
      'Should I do a buffet or plated dinner?',
    ],
    timeline: [
      'What should I do 6 months before my wedding?',
      'When should I send wedding invitations?',
      'What happens during the week of the wedding?',
    ],
  };

  return (
    suggestions[category as keyof typeof suggestions] || [
      'How do I choose a wedding theme?',
      "What's the best time of year to get married?",
      'How many guests should I invite?',
    ]
  );
}

function categorizeQuery(query: string): string {
  const lowerQuery = query.toLowerCase();

  for (const [category, keywords] of Object.entries(weddingTermsMap)) {
    if (keywords.some((keyword) => lowerQuery.includes(keyword))) {
      return category;
    }
  }

  return 'general';
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (5 requests per minute for voice search)
    const rateLimitResult = await rateLimit(request, {
      windowMs: 60 * 1000, // 1 minute
      max: 5, // 5 requests per minute
      message: 'Too many voice search requests, please try again later',
    });

    if (rateLimitResult.success === false) {
      return NextResponse.json(
        { error: rateLimitResult.message },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { query, originalQuery } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 },
      );
    }

    // Enhance the query with wedding-specific terminology
    const enhancedQuery = enhanceWeddingQuery(query);

    // Search articles
    const articles = searchArticles(enhancedQuery, 5);

    // Generate suggestions
    const suggestions = generateSuggestions(query);

    // Generate voice response
    const voiceResponse = generateVoiceResponse(
      originalQuery || query,
      articles,
    );

    return NextResponse.json({
      articles,
      suggestions,
      enhancedQuery,
      originalQuery: originalQuery || query,
      voiceResponse,
      searchInfo: {
        totalResults: articles.length,
        searchTime: Date.now(),
        category: categorizeQuery(query),
      },
    });
  } catch (error) {
    console.error('Voice search error:', error);

    return NextResponse.json(
      {
        error: 'Voice search failed',
        articles: [],
        suggestions: [
          'How do I choose a venue?',
          "What's a good wedding budget?",
          'When should I book my photographer?',
        ],
      },
      { status: 500 },
    );
  }
}

function generateVoiceResponse(originalQuery: string, articles: any[]): string {
  if (articles.length === 0) {
    return `I couldn't find specific articles about "${originalQuery}", but I can help you with other wedding planning questions. Try asking about venues, photography, or budget planning.`;
  }

  const topArticle = articles[0];
  const articleCount = articles.length;

  if (articleCount === 1) {
    return `I found an article that should help: "${topArticle.title}". This covers exactly what you're looking for with ${topArticle.helpful}% of couples finding it helpful.`;
  }

  return `I found ${articleCount} helpful articles about "${originalQuery}". The top result is "${topArticle.title}" with a ${topArticle.helpful}% helpfulness rating. These should give you great guidance for your wedding planning.`;
}

// Export GET method for health checks
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'voice-search',
    version: '1.0.0',
    supportedLanguages: ['en-US'],
    features: [
      'wedding-terminology',
      'context-enhancement',
      'timeline-awareness',
    ],
  });
}
