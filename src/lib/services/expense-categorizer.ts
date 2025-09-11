// AI-Powered Expense Auto-Categorization for Wedding Budget System
// Uses machine learning and pattern matching to automatically categorize expenses

export interface CategoryRule {
  id: string;
  category: string;
  patterns: {
    vendor_names: string[];
    keywords: string[];
    description_patterns: RegExp[];
    amount_ranges?: { min?: number; max?: number }[];
  };
  confidence: number;
  priority: number;
  created_by: 'system' | 'user' | 'ai';
  last_used?: Date;
  usage_count: number;
}

export interface CategorizationResult {
  category: string;
  confidence: number;
  reasoning: string;
  alternative_categories: Array<{
    category: string;
    confidence: number;
    reason: string;
  }>;
  rule_used?: CategoryRule;
  manual_override?: boolean;
}

export interface TransactionContext {
  id?: string;
  vendor_name?: string;
  description: string;
  amount: number;
  date?: Date;
  merchant_category?: string;
  location?: string;
  payment_method?: string;
  user_corrections?: Array<{
    original_category: string;
    corrected_category: string;
    reason?: string;
  }>;
}

export interface CategoryTrainingData {
  vendor_patterns: Map<string, string>;
  keyword_patterns: Map<string, string>;
  amount_patterns: Map<string, { category: string; frequency: number }>;
  user_corrections: Array<{
    transaction: TransactionContext;
    correct_category: string;
    timestamp: Date;
  }>;
  confidence_thresholds: Map<string, number>;
}

// Wedding-specific category patterns
const WEDDING_CATEGORY_RULES: CategoryRule[] = [
  // Venue
  {
    id: 'venue-1',
    category: 'venue',
    patterns: {
      vendor_names: [
        'venue',
        'hall',
        'ballroom',
        'resort',
        'hotel',
        'country club',
        'event center',
        'banquet',
        'reception',
        'estate',
        'garden',
        'barn',
        'winery',
        'museum',
        'church',
        'cathedral',
        'temple',
        'synagogue',
        'chapel',
      ],
      keywords: [
        'venue rental',
        'reception hall',
        'ceremony space',
        'event space',
        'wedding venue',
        'ballroom rental',
        'site fee',
        'facility rental',
      ],
      description_patterns: [
        /venue.{0,20}rental/i,
        /reception.{0,20}(hall|space)/i,
        /ceremony.{0,20}site/i,
        /event.{0,20}space/i,
      ],
      amount_ranges: [{ min: 1000, max: 50000 }],
    },
    confidence: 0.9,
    priority: 1,
    created_by: 'system',
    usage_count: 0,
  },

  // Catering
  {
    id: 'catering-1',
    category: 'catering',
    patterns: {
      vendor_names: [
        'catering',
        'caterer',
        'food service',
        'cuisine',
        'kitchen',
        'chef',
        'dining',
        'restaurant',
        'bistro',
        'cafe',
        'deli',
        'bakery',
      ],
      keywords: [
        'catering service',
        'wedding catering',
        'food and beverage',
        'meal service',
        'buffet',
        'plated dinner',
        'cocktail hour',
        'appetizers',
        "hors d'oeuvres",
        'wedding cake',
        'dessert',
        'bar service',
        'beverage service',
      ],
      description_patterns: [
        /catering.{0,20}(service|fee)/i,
        /food.{0,20}(service|beverage)/i,
        /wedding.{0,20}(cake|catering)/i,
        /bar.{0,20}service/i,
        /meal.{0,20}(service|planning)/i,
      ],
      amount_ranges: [{ min: 500, max: 30000 }],
    },
    confidence: 0.95,
    priority: 1,
    created_by: 'system',
    usage_count: 0,
  },

  // Photography
  {
    id: 'photography-1',
    category: 'photography',
    patterns: {
      vendor_names: [
        'photo',
        'photography',
        'photographer',
        'studio',
        'portraits',
        'images',
        'wedding photo',
        'bridal photo',
        'engagement photo',
      ],
      keywords: [
        'wedding photography',
        'engagement photos',
        'bridal portraits',
        'photo package',
        'photography service',
        'photo session',
        'album',
        'prints',
        'digital images',
      ],
      description_patterns: [
        /photo.{0,20}(graphy|session|package)/i,
        /wedding.{0,20}photo/i,
        /bridal.{0,20}(portrait|photo)/i,
        /engagement.{0,20}(photo|session)/i,
      ],
      amount_ranges: [{ min: 500, max: 15000 }],
    },
    confidence: 0.9,
    priority: 1,
    created_by: 'system',
    usage_count: 0,
  },

  // Videography
  {
    id: 'videography-1',
    category: 'videography',
    patterns: {
      vendor_names: [
        'video',
        'videography',
        'videographer',
        'film',
        'cinema',
        'wedding video',
        'bridal video',
        'multimedia',
      ],
      keywords: [
        'wedding videography',
        'video production',
        'wedding film',
        'video package',
        'cinematography',
        'video editing',
        'highlight reel',
        'ceremony video',
        'reception video',
      ],
      description_patterns: [
        /video.{0,20}(graphy|production|package)/i,
        /wedding.{0,20}(video|film)/i,
        /cinema.{0,20}(tography|package)/i,
      ],
      amount_ranges: [{ min: 800, max: 12000 }],
    },
    confidence: 0.9,
    priority: 1,
    created_by: 'system',
    usage_count: 0,
  },

  // Flowers & Decor
  {
    id: 'flowers-1',
    category: 'flowers',
    patterns: {
      vendor_names: [
        'florist',
        'flowers',
        'floral',
        'botanical',
        'garden',
        'greenhouse',
        'petals',
        'blooms',
        'arrangements',
        'bouquet',
      ],
      keywords: [
        'wedding flowers',
        'bridal bouquet',
        'centerpieces',
        'floral arrangements',
        'ceremony flowers',
        'reception flowers',
        'boutonnieres',
        'corsages',
        'floral design',
        'wedding decor',
      ],
      description_patterns: [
        /floral.{0,20}(design|arrangement)/i,
        /wedding.{0,20}flowers/i,
        /bridal.{0,20}bouquet/i,
        /center.{0,20}piece/i,
        /bouton.{0,20}niere/i,
      ],
      amount_ranges: [{ min: 200, max: 8000 }],
    },
    confidence: 0.85,
    priority: 1,
    created_by: 'system',
    usage_count: 0,
  },

  // Music & Entertainment
  {
    id: 'music-1',
    category: 'music',
    patterns: {
      vendor_names: [
        'dj',
        'music',
        'band',
        'entertainment',
        'sound',
        'audio',
        'musician',
        'orchestra',
        'quartet',
        'trio',
        'singer',
        'mc',
        'master of ceremonies',
      ],
      keywords: [
        'wedding dj',
        'live music',
        'band service',
        'entertainment package',
        'sound system',
        'audio equipment',
        'microphone',
        'speakers',
        'music service',
        'ceremony music',
        'reception music',
      ],
      description_patterns: [
        /dj.{0,20}service/i,
        /wedding.{0,20}(music|band|dj)/i,
        /sound.{0,20}(system|equipment)/i,
        /entertainment.{0,20}package/i,
      ],
      amount_ranges: [{ min: 300, max: 8000 }],
    },
    confidence: 0.85,
    priority: 1,
    created_by: 'system',
    usage_count: 0,
  },

  // Attire
  {
    id: 'attire-1',
    category: 'attire',
    patterns: {
      vendor_names: [
        'bridal',
        'dress',
        'gown',
        'tuxedo',
        'suit',
        'formal wear',
        'wedding dress',
        'bridal shop',
        'mens warehouse',
        'tailor',
        'alterations',
        'boutique',
      ],
      keywords: [
        'wedding dress',
        'bridal gown',
        'wedding suit',
        'tuxedo rental',
        'formal wear',
        'bridal attire',
        'groom attire',
        'alterations',
        'wedding shoes',
        'accessories',
        'veil',
        'jewelry',
      ],
      description_patterns: [
        /wedding.{0,20}(dress|gown|suit)/i,
        /bridal.{0,20}(gown|attire)/i,
        /tuxedo.{0,20}rental/i,
        /formal.{0,20}wear/i,
        /alter.{0,20}ations/i,
      ],
      amount_ranges: [{ min: 100, max: 10000 }],
    },
    confidence: 0.8,
    priority: 1,
    created_by: 'system',
    usage_count: 0,
  },

  // Transportation
  {
    id: 'transportation-1',
    category: 'transportation',
    patterns: {
      vendor_names: [
        'limo',
        'limousine',
        'car service',
        'transportation',
        'shuttle',
        'uber',
        'lyft',
        'taxi',
        'car rental',
        'chauffeur',
      ],
      keywords: [
        'wedding transportation',
        'limo service',
        'car service',
        'shuttle service',
        'transportation package',
        'chauffeur service',
        'wedding car',
        'bridal car',
        'guest transportation',
      ],
      description_patterns: [
        /limo.{0,20}service/i,
        /wedding.{0,20}(transportation|car)/i,
        /car.{0,20}service/i,
        /shuttle.{0,20}service/i,
      ],
      amount_ranges: [{ min: 50, max: 3000 }],
    },
    confidence: 0.8,
    priority: 1,
    created_by: 'system',
    usage_count: 0,
  },

  // Stationery
  {
    id: 'stationery-1',
    category: 'stationery',
    patterns: {
      vendor_names: [
        'invitations',
        'stationery',
        'printing',
        'paper',
        'cards',
        'design',
        'graphics',
        'calligraphy',
      ],
      keywords: [
        'wedding invitations',
        'save the date',
        'wedding stationery',
        'invitation suite',
        'rsvp cards',
        'menu cards',
        'programs',
        'place cards',
        'thank you cards',
        'printing service',
      ],
      description_patterns: [
        /wedding.{0,20}invitation/i,
        /save.{0,20}the.{0,20}date/i,
        /invitation.{0,20}(suite|package)/i,
        /wedding.{0,20}stationery/i,
      ],
      amount_ranges: [{ min: 100, max: 3000 }],
    },
    confidence: 0.75,
    priority: 2,
    created_by: 'system',
    usage_count: 0,
  },

  // Beauty & Wellness
  {
    id: 'beauty-1',
    category: 'beauty',
    patterns: {
      vendor_names: [
        'salon',
        'spa',
        'beauty',
        'makeup',
        'hair',
        'nail',
        'massage',
        'facial',
        'stylist',
        'cosmetics',
      ],
      keywords: [
        'bridal makeup',
        'wedding hair',
        'hair and makeup',
        'beauty service',
        'bridal beauty',
        'wedding day beauty',
        'makeup artist',
        'hair stylist',
        'manicure',
        'pedicure',
        'facial',
      ],
      description_patterns: [
        /bridal.{0,20}(makeup|beauty)/i,
        /wedding.{0,20}(hair|makeup)/i,
        /hair.{0,20}and.{0,20}makeup/i,
        /beauty.{0,20}service/i,
      ],
      amount_ranges: [{ min: 50, max: 2000 }],
    },
    confidence: 0.75,
    priority: 2,
    created_by: 'system',
    usage_count: 0,
  },

  // Miscellaneous/Other
  {
    id: 'other-1',
    category: 'other',
    patterns: {
      vendor_names: [],
      keywords: [
        'wedding planning',
        'coordinator',
        'day-of coordination',
        'wedding planner',
        'insurance',
        'marriage license',
        'officiant',
        'ceremony officiant',
        'wedding favors',
        'guest book',
        'unity candle',
        'ring bearer',
        'flower girl',
      ],
      description_patterns: [
        /wedding.{0,20}plan/i,
        /coordinat/i,
        /officiant/i,
        /marriage.{0,20}license/i,
        /wedding.{0,20}insurance/i,
      ],
    },
    confidence: 0.6,
    priority: 3,
    created_by: 'system',
    usage_count: 0,
  },
];

export class ExpenseCategorizer {
  private rules: CategoryRule[] = [...WEDDING_CATEGORY_RULES];
  private trainingData: CategoryTrainingData = {
    vendor_patterns: new Map(),
    keyword_patterns: new Map(),
    amount_patterns: new Map(),
    user_corrections: [],
    confidence_thresholds: new Map(),
  };
  private minimumConfidence = 0.6;

  constructor() {
    this.initializeTrainingData();
  }

  // Initialize with default training data
  private initializeTrainingData(): void {
    // Load any existing training data from storage
    this.loadTrainingData();

    // Set default confidence thresholds
    this.trainingData.confidence_thresholds.set('venue', 0.8);
    this.trainingData.confidence_thresholds.set('catering', 0.85);
    this.trainingData.confidence_thresholds.set('photography', 0.75);
    this.trainingData.confidence_thresholds.set('videography', 0.75);
    this.trainingData.confidence_thresholds.set('flowers', 0.7);
    this.trainingData.confidence_thresholds.set('music', 0.7);
    this.trainingData.confidence_thresholds.set('attire', 0.65);
    this.trainingData.confidence_thresholds.set('transportation', 0.65);
    this.trainingData.confidence_thresholds.set('stationery', 0.6);
    this.trainingData.confidence_thresholds.set('beauty', 0.6);
    this.trainingData.confidence_thresholds.set('other', 0.5);
  }

  // Main categorization method
  categorizeTransaction(transaction: TransactionContext): CategorizationResult {
    const candidates: Array<{
      category: string;
      confidence: number;
      rule: CategoryRule;
      reasoning: string;
    }> = [];

    // Check against all rules
    for (const rule of this.rules) {
      const match = this.evaluateRule(transaction, rule);
      if (match.confidence > 0) {
        candidates.push({
          category: rule.category,
          confidence: match.confidence,
          rule,
          reasoning: match.reasoning,
        });
      }
    }

    // Apply ML-based adjustments
    const mlAdjusted = this.applyMLAdjustments(transaction, candidates);

    // Sort by confidence and get the best match
    mlAdjusted.sort((a, b) => b.confidence - a.confidence);

    if (
      mlAdjusted.length === 0 ||
      mlAdjusted[0].confidence < this.minimumConfidence
    ) {
      return {
        category: 'other',
        confidence: 0.3,
        reasoning: 'No confident category match found, defaulting to "other"',
        alternative_categories: mlAdjusted.slice(0, 3).map((c) => ({
          category: c.category,
          confidence: c.confidence,
          reason: c.reasoning,
        })),
      };
    }

    const bestMatch = mlAdjusted[0];

    // Update rule usage
    bestMatch.rule.usage_count++;
    bestMatch.rule.last_used = new Date();

    return {
      category: bestMatch.category,
      confidence: bestMatch.confidence,
      reasoning: bestMatch.reasoning,
      rule_used: bestMatch.rule,
      alternative_categories: mlAdjusted.slice(1, 4).map((c) => ({
        category: c.category,
        confidence: c.confidence,
        reason: c.reasoning,
      })),
    };
  }

  // Evaluate a single rule against a transaction
  private evaluateRule(
    transaction: TransactionContext,
    rule: CategoryRule,
  ): {
    confidence: number;
    reasoning: string;
  } {
    let confidence = 0;
    const reasons: string[] = [];
    const description = transaction.description.toLowerCase();
    const vendorName = (transaction.vendor_name || '').toLowerCase();

    // Check vendor name patterns
    for (const pattern of rule.patterns.vendor_names) {
      if (vendorName.includes(pattern.toLowerCase())) {
        confidence += 0.4;
        reasons.push(`Vendor name contains "${pattern}"`);
        break;
      }
    }

    // Check keyword patterns
    for (const keyword of rule.patterns.keywords) {
      if (
        description.includes(keyword.toLowerCase()) ||
        vendorName.includes(keyword.toLowerCase())
      ) {
        confidence += 0.3;
        reasons.push(`Contains keyword "${keyword}"`);
        break;
      }
    }

    // Check regex patterns
    for (const pattern of rule.patterns.description_patterns) {
      if (pattern.test(description) || pattern.test(vendorName)) {
        confidence += 0.4;
        reasons.push(`Matches pattern ${pattern.source}`);
        break;
      }
    }

    // Check amount ranges
    if (rule.patterns.amount_ranges) {
      for (const range of rule.patterns.amount_ranges) {
        const minMatch = !range.min || transaction.amount >= range.min;
        const maxMatch = !range.max || transaction.amount <= range.max;

        if (minMatch && maxMatch) {
          confidence += 0.2;
          reasons.push(`Amount ${transaction.amount} fits expected range`);
          break;
        }
      }
    }

    // Apply rule priority and base confidence
    confidence *= rule.confidence;
    confidence *= rule.priority === 1 ? 1.0 : rule.priority === 2 ? 0.9 : 0.8;

    return {
      confidence: Math.min(confidence, 1.0),
      reasoning: reasons.join('; '),
    };
  }

  // Apply machine learning adjustments based on historical data
  private applyMLAdjustments(
    transaction: TransactionContext,
    candidates: Array<{
      category: string;
      confidence: number;
      rule: CategoryRule;
      reasoning: string;
    }>,
  ): typeof candidates {
    // Apply vendor pattern learning
    if (transaction.vendor_name) {
      const learnedCategory = this.trainingData.vendor_patterns.get(
        transaction.vendor_name.toLowerCase(),
      );
      if (learnedCategory) {
        const existing = candidates.find((c) => c.category === learnedCategory);
        if (existing) {
          existing.confidence = Math.min(existing.confidence + 0.3, 1.0);
          existing.reasoning += '; Learned from previous transactions';
        } else {
          candidates.push({
            category: learnedCategory,
            confidence: 0.7,
            rule: this.rules.find((r) => r.category === learnedCategory)!,
            reasoning: 'Learned category from vendor history',
          });
        }
      }
    }

    // Apply user correction learning
    const corrections = this.trainingData.user_corrections.filter(
      (c) =>
        c.transaction.vendor_name?.toLowerCase() ===
          transaction.vendor_name?.toLowerCase() ||
        this.similarDescription(
          c.transaction.description,
          transaction.description,
        ),
    );

    if (corrections.length > 0) {
      const mostCommonCorrection = this.getMostCommonCorrection(corrections);
      const existing = candidates.find(
        (c) => c.category === mostCommonCorrection,
      );
      if (existing) {
        existing.confidence = Math.min(existing.confidence + 0.4, 1.0);
        existing.reasoning += '; Learned from user corrections';
      }
    }

    // Apply amount-based learning
    const amountCategory = this.predictCategoryByAmount(transaction.amount);
    if (amountCategory) {
      const existing = candidates.find(
        (c) => c.category === amountCategory.category,
      );
      if (existing) {
        existing.confidence = Math.min(
          existing.confidence + amountCategory.frequency * 0.1,
          1.0,
        );
      }
    }

    return candidates;
  }

  // Check if two descriptions are similar
  private similarDescription(desc1: string, desc2: string): boolean {
    const words1 = desc1.toLowerCase().split(/\s+/);
    const words2 = desc2.toLowerCase().split(/\s+/);

    const commonWords = words1.filter(
      (word) => words2.includes(word) && word.length > 3,
    );

    return commonWords.length >= Math.min(words1.length, words2.length) * 0.5;
  }

  // Get most common correction category
  private getMostCommonCorrection(
    corrections: typeof this.trainingData.user_corrections,
  ): string {
    const counts = new Map<string, number>();

    corrections.forEach((correction) => {
      const current = counts.get(correction.correct_category) || 0;
      counts.set(correction.correct_category, current + 1);
    });

    let maxCount = 0;
    let mostCommon = 'other';

    counts.forEach((count, category) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = category;
      }
    });

    return mostCommon;
  }

  // Predict category based on amount patterns
  private predictCategoryByAmount(
    amount: number,
  ): { category: string; frequency: number } | null {
    let bestMatch: { category: string; frequency: number } | null = null;
    let bestScore = 0;

    this.trainingData.amount_patterns.forEach((data, range) => {
      const [min, max] = range.split('-').map(Number);
      if (amount >= min && amount <= max && data.frequency > bestScore) {
        bestScore = data.frequency;
        bestMatch = data;
      }
    });

    return bestMatch;
  }

  // Learn from user correction
  learnFromCorrection(
    transaction: TransactionContext,
    originalCategory: string,
    correctedCategory: string,
    reason?: string,
  ): void {
    // Add to user corrections
    this.trainingData.user_corrections.push({
      transaction,
      correct_category: correctedCategory,
      timestamp: new Date(),
    });

    // Update vendor patterns
    if (transaction.vendor_name) {
      this.trainingData.vendor_patterns.set(
        transaction.vendor_name.toLowerCase(),
        correctedCategory,
      );
    }

    // Update keyword patterns
    const keywords = this.extractKeywords(transaction.description);
    keywords.forEach((keyword) => {
      this.trainingData.keyword_patterns.set(keyword, correctedCategory);
    });

    // Update amount patterns
    const amountRange = this.getAmountRange(transaction.amount);
    const existing = this.trainingData.amount_patterns.get(amountRange);
    if (existing && existing.category === correctedCategory) {
      existing.frequency++;
    } else {
      this.trainingData.amount_patterns.set(amountRange, {
        category: correctedCategory,
        frequency: 1,
      });
    }

    // Save training data
    this.saveTrainingData();
  }

  // Extract keywords from description
  private extractKeywords(description: string): string[] {
    const words = description
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3);

    // Remove common stop words
    const stopWords = new Set([
      'this',
      'that',
      'with',
      'from',
      'they',
      'have',
      'were',
      'been',
      'their',
    ]);
    return words.filter((word) => !stopWords.has(word));
  }

  // Get amount range for categorization
  private getAmountRange(amount: number): string {
    if (amount < 100) return '0-100';
    if (amount < 500) return '100-500';
    if (amount < 1000) return '500-1000';
    if (amount < 2500) return '1000-2500';
    if (amount < 5000) return '2500-5000';
    if (amount < 10000) return '5000-10000';
    return '10000+';
  }

  // Add custom rule
  addCustomRule(
    rule: Omit<CategoryRule, 'id' | 'created_by' | 'usage_count'>,
  ): void {
    const customRule: CategoryRule = {
      ...rule,
      id: `custom-${Date.now()}`,
      created_by: 'user',
      usage_count: 0,
    };

    this.rules.push(customRule);
    this.saveTrainingData();
  }

  // Get categorization statistics
  getCategorizationStats(): {
    total_rules: number;
    custom_rules: number;
    user_corrections: number;
    most_used_rules: Array<{ rule: CategoryRule; usage: number }>;
    accuracy_by_category: Map<string, number>;
  } {
    const customRules = this.rules.filter(
      (r) => r.created_by === 'user',
    ).length;
    const mostUsedRules = this.rules
      .filter((r) => r.usage_count > 0)
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 5)
      .map((rule) => ({ rule, usage: rule.usage_count }));

    // Calculate accuracy by category (mock implementation)
    const accuracyByCategory = new Map<string, number>();
    const categories = [...new Set(this.rules.map((r) => r.category))];
    categories.forEach((category) => {
      accuracyByCategory.set(category, 0.8 + Math.random() * 0.2); // Mock accuracy
    });

    return {
      total_rules: this.rules.length,
      custom_rules: customRules,
      user_corrections: this.trainingData.user_corrections.length,
      most_used_rules: mostUsedRules,
      accuracy_by_category: accuracyByCategory,
    };
  }

  // Bulk categorize transactions
  async bulkCategorize(
    transactions: TransactionContext[],
  ): Promise<Map<string, CategorizationResult>> {
    const results = new Map<string, CategorizationResult>();

    for (const transaction of transactions) {
      const result = this.categorizeTransaction(transaction);
      if (transaction.id) {
        results.set(transaction.id, result);
      }
    }

    return results;
  }

  // Export/import training data
  exportTrainingData(): string {
    return JSON.stringify(
      {
        rules: this.rules.filter((r) => r.created_by === 'user'),
        training_data: {
          vendor_patterns: Array.from(
            this.trainingData.vendor_patterns.entries(),
          ),
          keyword_patterns: Array.from(
            this.trainingData.keyword_patterns.entries(),
          ),
          amount_patterns: Array.from(
            this.trainingData.amount_patterns.entries(),
          ),
          user_corrections: this.trainingData.user_corrections,
          confidence_thresholds: Array.from(
            this.trainingData.confidence_thresholds.entries(),
          ),
        },
      },
      null,
      2,
    );
  }

  importTrainingData(data: string): void {
    try {
      const parsed = JSON.parse(data);

      // Import custom rules
      if (parsed.rules) {
        this.rules.push(...parsed.rules);
      }

      // Import training data
      if (parsed.training_data) {
        const td = parsed.training_data;

        if (td.vendor_patterns) {
          this.trainingData.vendor_patterns = new Map(td.vendor_patterns);
        }

        if (td.keyword_patterns) {
          this.trainingData.keyword_patterns = new Map(td.keyword_patterns);
        }

        if (td.amount_patterns) {
          this.trainingData.amount_patterns = new Map(td.amount_patterns);
        }

        if (td.user_corrections) {
          this.trainingData.user_corrections.push(...td.user_corrections);
        }

        if (td.confidence_thresholds) {
          this.trainingData.confidence_thresholds = new Map(
            td.confidence_thresholds,
          );
        }
      }

      this.saveTrainingData();
    } catch (error) {
      throw new Error('Failed to import training data: Invalid format');
    }
  }

  // Save training data to storage
  private saveTrainingData(): void {
    // In a real implementation, this would save to database or local storage
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'expense_categorizer_training',
        this.exportTrainingData(),
      );
    }
  }

  // Load training data from storage
  private loadTrainingData(): void {
    // In a real implementation, this would load from database or local storage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('expense_categorizer_training');
      if (saved) {
        try {
          this.importTrainingData(saved);
        } catch (error) {
          console.warn('Failed to load saved training data:', error);
        }
      }
    }
  }

  // Reset training data
  resetTrainingData(): void {
    this.trainingData = {
      vendor_patterns: new Map(),
      keyword_patterns: new Map(),
      amount_patterns: new Map(),
      user_corrections: [],
      confidence_thresholds: new Map(),
    };
    this.rules = [...WEDDING_CATEGORY_RULES];
    this.initializeTrainingData();

    if (typeof window !== 'undefined') {
      localStorage.removeItem('expense_categorizer_training');
    }
  }
}

// Export singleton instance
export const expenseCategorizer = new ExpenseCategorizer();
