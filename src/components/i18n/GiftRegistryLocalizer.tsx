'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Gift,
  Heart,
  Star,
  DollarSign,
  Info,
  AlertCircle,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  type WeddingMarketLocale,
  type WeddingTraditionType,
  type CurrencyCode,
} from '@/types/i18n';
import { cn } from '@/lib/utils';

// =============================================================================
// GIFT REGISTRY TYPES & INTERFACES
// =============================================================================

export type GiftTradition =
  | 'monetary' // Cash gifts (Chinese, Korean, Indian)
  | 'registry_list' // Western gift registry
  | 'gold_jewelry' // Gold and jewelry (Indian, Middle Eastern)
  | 'household_items' // Practical household items
  | 'experiences' // Experience gifts (honeymoon, activities)
  | 'charity_donations' // Donations to charity
  | 'handmade_crafts' // Handmade or artisanal gifts
  | 'family_heirlooms' // Traditional family items
  | 'blessing_wishes'; // Non-material blessings and wishes

export type GiftCategory =
  | 'kitchen_dining' // Kitchen and dining items
  | 'home_decor' // Decorative items
  | 'bedding_bath' // Bedroom and bathroom
  | 'electronics' // Technology and electronics
  | 'outdoor_garden' // Garden and outdoor items
  | 'travel_luggage' // Travel accessories
  | 'art_collectibles' // Art and collectibles
  | 'books_media' // Books and entertainment
  | 'clothing_accessories' // Personal items
  | 'jewelry_watches' // Jewelry and timepieces
  | 'experiences_services' // Services and experiences
  | 'monetary_contributions'; // Cash and monetary gifts

export interface CulturalGiftTradition {
  readonly culture: WeddingTraditionType;
  readonly preferred_traditions: readonly GiftTradition[];
  readonly typical_amounts: {
    readonly currency: CurrencyCode;
    readonly min: number;
    readonly max: number;
    readonly average: number;
    readonly calculation_basis:
      | 'per_person'
      | 'per_couple'
      | 'relationship_based';
  };
  readonly cultural_significance: Record<WeddingMarketLocale, string>;
  readonly gift_timing:
    | 'before_wedding'
    | 'during_ceremony'
    | 'after_wedding'
    | 'flexible';
  readonly presentation_customs: Record<WeddingMarketLocale, string>;
  readonly taboos_avoid: readonly string[];
  readonly relationship_considerations: {
    readonly immediate_family: {
      readonly expected_amount_multiplier: number;
      readonly special_items: readonly string[];
    };
    readonly extended_family: {
      readonly expected_amount_multiplier: number;
      readonly special_items: readonly string[];
    };
    readonly close_friends: {
      readonly expected_amount_multiplier: number;
      readonly special_items: readonly string[];
    };
    readonly colleagues: {
      readonly expected_amount_multiplier: number;
      readonly special_items: readonly string[];
    };
  };
}

export interface GiftSuggestion {
  readonly id: string;
  readonly name: Record<WeddingMarketLocale, string>;
  readonly description: Record<WeddingMarketLocale, string>;
  readonly category: GiftCategory;
  readonly price_range: {
    readonly min: number;
    readonly max: number;
    readonly currency: CurrencyCode;
  };
  readonly cultural_appropriateness: Record<
    WeddingTraditionType,
    'highly_appropriate' | 'appropriate' | 'neutral' | 'inappropriate'
  >;
  readonly relationship_suitability: {
    readonly immediate_family: boolean;
    readonly extended_family: boolean;
    readonly close_friends: boolean;
    readonly colleagues: boolean;
  };
  readonly availability_regions: readonly WeddingMarketLocale[];
  readonly symbolic_meaning: Record<WeddingMarketLocale, string>;
  readonly practical_rating: 1 | 2 | 3 | 4 | 5;
  readonly uniqueness_rating: 1 | 2 | 3 | 4 | 5;
  readonly tags: readonly string[];
}

export interface GiftRegistrySettings {
  readonly display_prices: boolean;
  readonly allow_monetary_gifts: boolean;
  readonly show_cultural_guidance: boolean;
  readonly enable_group_gifting: boolean;
  readonly preferred_delivery_timing:
    | 'before_wedding'
    | 'after_wedding'
    | 'flexible';
  readonly privacy_level: 'public' | 'friends_only' | 'family_only' | 'private';
  readonly cultural_customizations: readonly WeddingTraditionType[];
  readonly preferred_currencies: readonly CurrencyCode[];
}

export interface GiftGivingGuidance {
  readonly tradition: WeddingTraditionType;
  readonly relationship:
    | 'immediate_family'
    | 'extended_family'
    | 'close_friends'
    | 'colleagues';
  readonly recommended_amount: {
    readonly min: number;
    readonly max: number;
    readonly currency: CurrencyCode;
    readonly reasoning: Record<WeddingMarketLocale, string>;
  };
  readonly alternative_suggestions: readonly GiftSuggestion[];
  readonly cultural_etiquette: Record<WeddingMarketLocale, string>;
  readonly timing_advice: Record<WeddingMarketLocale, string>;
  readonly presentation_tips: Record<WeddingMarketLocale, string>;
}

// =============================================================================
// CULTURAL GIFT TRADITIONS DATA
// =============================================================================

const CULTURAL_GIFT_TRADITIONS: Record<
  WeddingTraditionType,
  CulturalGiftTradition
> = {
  western: {
    culture: 'western',
    preferred_traditions: [
      'registry_list',
      'household_items',
      'experiences',
      'monetary',
    ],
    typical_amounts: {
      currency: 'USD',
      min: 50,
      max: 500,
      average: 150,
      calculation_basis: 'relationship_based',
    },
    cultural_significance: {
      'en-US':
        'Gift registries help couples start their new life together with needed household items',
      'en-GB':
        'Wedding gifts traditionally help couples establish their new home',
      'fr-FR':
        'Les cadeaux de mariage aident les couples à établir leur nouveau foyer',
      'de-DE':
        'Hochzeitsgeschenke helfen Paaren, ihr neues Zuhause einzurichten',
    },
    gift_timing: 'flexible',
    presentation_customs: {
      'en-US':
        'Gifts can be brought to the wedding or sent to the couples home',
      'en-GB':
        'Traditional to send gifts before the wedding or bring cards with monetary gifts',
    },
    taboos_avoid: [
      'overly personal items',
      'used items',
      'extremely expensive items that overshadow',
    ],
    relationship_considerations: {
      immediate_family: {
        expected_amount_multiplier: 3,
        special_items: ['family heirlooms', 'major appliances', 'jewelry'],
      },
      extended_family: {
        expected_amount_multiplier: 2,
        special_items: ['kitchen items', 'home decor'],
      },
      close_friends: {
        expected_amount_multiplier: 1.5,
        special_items: ['personalized items', 'experience gifts'],
      },
      colleagues: {
        expected_amount_multiplier: 0.8,
        special_items: ['gift cards', 'small household items'],
      },
    },
  },

  chinese: {
    culture: 'chinese',
    preferred_traditions: ['monetary', 'gold_jewelry', 'household_items'],
    typical_amounts: {
      currency: 'CNY',
      min: 200,
      max: 10000,
      average: 800,
      calculation_basis: 'relationship_based',
    },
    cultural_significance: {
      'zh-CN': '红包是中式婚礼的传统，象征祝福和财运',
      'en-US':
        'Red envelopes (hongbao) are traditional Chinese wedding gifts symbolizing blessings and prosperity',
      'zh-HK': '紅包代表對新人的祝福和好運',
    },
    gift_timing: 'during_ceremony',
    presentation_customs: {
      'zh-CN': '用红色信封装钱，避免单数金额',
      'en-US':
        'Money presented in red envelopes, avoid odd amounts, favor numbers with 8',
      'zh-HK': '用紅色利是封包錢，避免不吉利數字',
    },
    taboos_avoid: ['amounts with 4', 'white flowers', 'clocks', 'mirrors'],
    relationship_considerations: {
      immediate_family: {
        expected_amount_multiplier: 5,
        special_items: ['gold jewelry', 'jade items', 'tea sets'],
      },
      extended_family: {
        expected_amount_multiplier: 3,
        special_items: ['household appliances', 'decorative items'],
      },
      close_friends: {
        expected_amount_multiplier: 2,
        special_items: ['lucky ornaments', 'practical gifts'],
      },
      colleagues: {
        expected_amount_multiplier: 1,
        special_items: ['gift certificates', 'flowers'],
      },
    },
  },

  islamic: {
    culture: 'islamic',
    preferred_traditions: [
      'monetary',
      'gold_jewelry',
      'household_items',
      'blessing_wishes',
    ],
    typical_amounts: {
      currency: 'SAR',
      min: 100,
      max: 5000,
      average: 500,
      calculation_basis: 'relationship_based',
    },
    cultural_significance: {
      'ar-SA': 'الهدايا في الإسلام تعبر عن المحبة والبركة للعروسين',
      'en-US':
        'Islamic wedding gifts express love and blessings for the couple',
      'ar-AE': 'الهدايا تقوي الروابط الاجتماعية وتدل على التقدير',
    },
    gift_timing: 'flexible',
    presentation_customs: {
      'ar-SA': 'يُستحب تقديم الهدايا بيد مباشرة مع الدعاء للعروسين',
      'en-US':
        'Gifts are ideally presented in person with prayers and blessings for the couple',
    },
    taboos_avoid: [
      'alcohol-related items',
      'pork products',
      'immodest decorations',
    ],
    relationship_considerations: {
      immediate_family: {
        expected_amount_multiplier: 4,
        special_items: ['gold jewelry', 'prayer items', 'Quran sets'],
      },
      extended_family: {
        expected_amount_multiplier: 2.5,
        special_items: ['home decorations', 'kitchen items'],
      },
      close_friends: {
        expected_amount_multiplier: 1.8,
        special_items: ['perfumes', 'modest clothing'],
      },
      colleagues: {
        expected_amount_multiplier: 1,
        special_items: ['gift cards', 'flowers'],
      },
    },
  },

  hindu: {
    culture: 'hindu',
    preferred_traditions: [
      'monetary',
      'gold_jewelry',
      'household_items',
      'blessing_wishes',
    ],
    typical_amounts: {
      currency: 'INR',
      min: 500,
      max: 100000,
      average: 5000,
      calculation_basis: 'relationship_based',
    },
    cultural_significance: {
      'hi-IN':
        'हिंदू परंपरा में उपहार देना शुभ माना जाता है और नव दम्पति को समृद्धि का आशीर्वाद देता है',
      'en-US':
        'In Hindu tradition, gift-giving is considered auspicious and blesses the couple with prosperity',
    },
    gift_timing: 'during_ceremony',
    presentation_customs: {
      'hi-IN': 'शगुन की रस्म में पैसे या सोना देना, नारियल और मिठाई के साथ',
      'en-US':
        'Gifts presented during shagun ceremony, often money or gold with coconut and sweets',
    },
    taboos_avoid: [
      'leather items',
      'non-vegetarian items for some families',
      'alcohol',
    ],
    relationship_considerations: {
      immediate_family: {
        expected_amount_multiplier: 5,
        special_items: ['gold jewelry', 'silver items', 'religious artifacts'],
      },
      extended_family: {
        expected_amount_multiplier: 3,
        special_items: ['brass items', 'silk clothing', 'sweets'],
      },
      close_friends: {
        expected_amount_multiplier: 2,
        special_items: ['decorative items', 'plants', 'books'],
      },
      colleagues: {
        expected_amount_multiplier: 1.2,
        special_items: ['gift vouchers', 'flowers', 'sweets'],
      },
    },
  },

  jewish: {
    culture: 'jewish',
    preferred_traditions: [
      'monetary',
      'household_items',
      'charity_donations',
      'registry_list',
    ],
    typical_amounts: {
      currency: 'USD',
      min: 54, // Multiples of 18 (chai)
      max: 1800,
      average: 180,
      calculation_basis: 'relationship_based',
    },
    cultural_significance: {
      'he-IL':
        'מתנות החתונה מסמלות תמיכה בזוג החדש ומסייעות להם להקים בית יהודי',
      'en-US':
        'Wedding gifts symbolize support for the new couple and help them establish a Jewish home',
    },
    gift_timing: 'flexible',
    presentation_customs: {
      'he-IL': 'נהוג לתת בכפולות של 18 (חי), סמל לחיים',
      'en-US':
        'Traditional to give in multiples of 18 (chai), symbolizing life',
    },
    taboos_avoid: [
      'non-kosher items for observant families',
      'items for Shabbat if not kosher',
    ],
    relationship_considerations: {
      immediate_family: {
        expected_amount_multiplier: 4,
        special_items: ['Judaica items', 'kosher wine', 'Shabbat candlesticks'],
      },
      extended_family: {
        expected_amount_multiplier: 2.5,
        special_items: ['kosher cookbook', 'serving items', 'home decor'],
      },
      close_friends: {
        expected_amount_multiplier: 2,
        special_items: ['books', 'picture frames', 'gift cards'],
      },
      colleagues: {
        expected_amount_multiplier: 1,
        special_items: ['flowers', 'charitable donations'],
      },
    },
  },

  korean: {
    culture: 'korean',
    preferred_traditions: ['monetary', 'household_items', 'gold_jewelry'],
    typical_amounts: {
      currency: 'KRW',
      min: 50000,
      max: 1000000,
      average: 200000,
      calculation_basis: 'relationship_based',
    },
    cultural_significance: {
      'ko-KR': '축의금은 새로운 부부의 시작을 축하하고 도움을 주는 한국의 전통',
      'en-US':
        'Congratulatory money (chukuigeum) is a Korean tradition to celebrate and support the new couple',
    },
    gift_timing: 'during_ceremony',
    presentation_customs: {
      'ko-KR': '하얀 봉투에 현금을 넣어 전달, 방명록 작성',
      'en-US': 'Cash presented in white envelopes with guest book signing',
    },
    taboos_avoid: ['odd amounts', 'used items', 'overly personal gifts'],
    relationship_considerations: {
      immediate_family: {
        expected_amount_multiplier: 5,
        special_items: ['hanbok', 'traditional items', 'jewelry'],
      },
      extended_family: {
        expected_amount_multiplier: 3,
        special_items: ['household appliances', 'kitchenware'],
      },
      close_friends: {
        expected_amount_multiplier: 2,
        special_items: ['personal items', 'experience gifts'],
      },
      colleagues: {
        expected_amount_multiplier: 1,
        special_items: ['gift certificates', 'flowers'],
      },
    },
  },
};

// =============================================================================
// GIFT SUGGESTIONS DATABASE
// =============================================================================

const GIFT_SUGGESTIONS: readonly GiftSuggestion[] = [
  {
    id: 'monetary-envelope',
    name: {
      'en-US': 'Monetary Gift',
      'zh-CN': '红包礼金',
      'ar-SA': 'هدية نقدية',
      'hi-IN': 'नकद उपहार',
      'ko-KR': '축의금',
    },
    description: {
      'en-US': 'Traditional cash gift for the couple to use as they wish',
      'zh-CN': '传统现金礼物，新人可自由使用',
      'ar-SA': 'هدية نقدية تقليدية للزوجين لاستخدامها كما يشاءان',
    },
    category: 'monetary_contributions',
    price_range: {
      min: 50,
      max: 5000,
      currency: 'USD',
    },
    cultural_appropriateness: {
      western: 'appropriate',
      chinese: 'highly_appropriate',
      islamic: 'highly_appropriate',
      hindu: 'highly_appropriate',
      jewish: 'highly_appropriate',
      korean: 'highly_appropriate',
    },
    relationship_suitability: {
      immediate_family: true,
      extended_family: true,
      close_friends: true,
      colleagues: true,
    },
    availability_regions: ['en-US', 'zh-CN', 'ar-SA', 'hi-IN', 'ko-KR'],
    symbolic_meaning: {
      'en-US': 'Practical support for the couples new life together',
      'zh-CN': '对新人的祝福和财富祝愿',
      'ar-SA': 'الدعم العملي والبركة للزوجين',
    },
    practical_rating: 5,
    uniqueness_rating: 2,
    tags: ['traditional', 'practical', 'flexible', 'universal'],
  },

  {
    id: 'gold-jewelry-set',
    name: {
      'en-US': 'Gold Jewelry Set',
      'zh-CN': '黄金首饰套装',
      'ar-SA': 'طقم مجوهرات ذهبية',
      'hi-IN': 'सोने के आभूषण का सेट',
    },
    description: {
      'en-US':
        'Traditional gold jewelry set for the bride, symbolizing prosperity and beauty',
      'zh-CN': '传统黄金首饰套装，为新娘带来繁荣和美丽',
      'ar-SA': 'طقم مجوهرات ذهبية تقليدية للعروس، يرمز للازدهار والجمال',
    },
    category: 'jewelry_watches',
    price_range: {
      min: 500,
      max: 10000,
      currency: 'USD',
    },
    cultural_appropriateness: {
      western: 'neutral',
      chinese: 'highly_appropriate',
      islamic: 'highly_appropriate',
      hindu: 'highly_appropriate',
      jewish: 'appropriate',
      korean: 'appropriate',
    },
    relationship_suitability: {
      immediate_family: true,
      extended_family: true,
      close_friends: false,
      colleagues: false,
    },
    availability_regions: ['zh-CN', 'ar-SA', 'hi-IN', 'en-US'],
    symbolic_meaning: {
      'zh-CN': '黄金代表财富和幸运',
      'ar-SA': 'الذهب يرمز للثروة والبركة',
      'hi-IN': 'सोना समृद्धि और शुभता का प्रतीक है',
    },
    practical_rating: 3,
    uniqueness_rating: 4,
    tags: ['luxury', 'traditional', 'family-gift', 'cultural'],
  },

  {
    id: 'kitchen-appliance-set',
    name: {
      'en-US': 'Kitchen Appliance Set',
      'fr-FR': "Ensemble d'électroménager",
      'de-DE': 'Küchengeräte-Set',
      'es-ES': 'Conjunto de electrodomésticos',
    },
    description: {
      'en-US': 'Complete set of essential kitchen appliances for the new home',
      'fr-FR':
        "Ensemble complet d'appareils de cuisine essentiels pour le nouveau foyer",
      'de-DE': 'Komplettes Set wichtiger Küchengeräte für das neue Zuhause',
    },
    category: 'kitchen_dining',
    price_range: {
      min: 200,
      max: 2000,
      currency: 'USD',
    },
    cultural_appropriateness: {
      western: 'highly_appropriate',
      chinese: 'appropriate',
      islamic: 'appropriate',
      hindu: 'appropriate',
      jewish: 'appropriate',
      korean: 'appropriate',
    },
    relationship_suitability: {
      immediate_family: true,
      extended_family: true,
      close_friends: true,
      colleagues: false,
    },
    availability_regions: ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'es-ES'],
    symbolic_meaning: {
      'en-US': 'Helping the couple create their first home together',
      'fr-FR': 'Aider le couple à créer leur premier foyer ensemble',
    },
    practical_rating: 5,
    uniqueness_rating: 2,
    tags: ['practical', 'household', 'registry-popular', 'useful'],
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export interface GiftRegistryLocalizerProps {
  locale?: WeddingMarketLocale;
  traditions?: readonly WeddingTraditionType[];
  onGiftSelect?: (gift: GiftSuggestion) => void;
  onGetGuidance?: (guidance: GiftGivingGuidance) => void;
  settings?: Partial<GiftRegistrySettings>;
  relationship?:
    | 'immediate_family'
    | 'extended_family'
    | 'close_friends'
    | 'colleagues';
  budget?: {
    min: number;
    max: number;
    currency: CurrencyCode;
  };
  showCulturalGuidance?: boolean;
  className?: string;
}

export const GiftRegistryLocalizer: React.FC<GiftRegistryLocalizerProps> = ({
  locale = 'en-US',
  traditions = ['western'],
  onGiftSelect,
  onGetGuidance,
  settings = {},
  relationship = 'close_friends',
  budget,
  showCulturalGuidance = true,
  className = '',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<
    GiftCategory | 'all'
  >('all');
  const [selectedTradition, setSelectedTradition] =
    useState<WeddingTraditionType>(traditions[0] || 'western');
  const [showGuidanceModal, setShowGuidanceModal] = useState(false);
  const [currentGuidance, setCurrentGuidance] =
    useState<GiftGivingGuidance | null>(null);

  const registrySettings: GiftRegistrySettings = {
    display_prices: true,
    allow_monetary_gifts: true,
    show_cultural_guidance: true,
    enable_group_gifting: false,
    preferred_delivery_timing: 'flexible',
    privacy_level: 'friends_only',
    cultural_customizations: traditions,
    preferred_currencies: ['USD'],
    ...settings,
  };

  // Get cultural tradition data
  const culturalTradition = useMemo(() => {
    return (
      CULTURAL_GIFT_TRADITIONS[selectedTradition] ||
      CULTURAL_GIFT_TRADITIONS.western
    );
  }, [selectedTradition]);

  // Filter gift suggestions based on criteria
  const filteredGifts = useMemo(() => {
    let filtered = GIFT_SUGGESTIONS.filter((gift) => {
      // Category filter
      if (selectedCategory !== 'all' && gift.category !== selectedCategory)
        return false;

      // Cultural appropriateness
      const appropriateness = gift.cultural_appropriateness[selectedTradition];
      if (appropriateness === 'inappropriate') return false;

      // Relationship suitability
      if (!gift.relationship_suitability[relationship]) return false;

      // Budget filter
      if (budget) {
        if (
          gift.price_range.min > budget.max ||
          gift.price_range.max < budget.min
        )
          return false;
      }

      // Region availability
      const isAvailable = gift.availability_regions.some(
        (region) =>
          region === locale || locale.startsWith(region.split('-')[0]),
      );
      if (!isAvailable) return false;

      return true;
    });

    // Sort by cultural appropriateness and then by practical rating
    return filtered.sort((a, b) => {
      const aScore =
        a.cultural_appropriateness[selectedTradition] === 'highly_appropriate'
          ? 2
          : a.cultural_appropriateness[selectedTradition] === 'appropriate'
            ? 1
            : 0;
      const bScore =
        b.cultural_appropriateness[selectedTradition] === 'highly_appropriate'
          ? 2
          : b.cultural_appropriateness[selectedTradition] === 'appropriate'
            ? 1
            : 0;

      if (aScore !== bScore) return bScore - aScore;
      return b.practical_rating - a.practical_rating;
    });
  }, [selectedCategory, selectedTradition, relationship, budget, locale]);

  // Get gift giving guidance
  const getGuidanceForRelationship = useCallback(() => {
    const tradition = culturalTradition;
    const relationshipData =
      tradition.relationship_considerations[relationship];

    const baseAmount = tradition.typical_amounts.average;
    const adjustedAmount =
      baseAmount * relationshipData.expected_amount_multiplier;

    const guidance: GiftGivingGuidance = {
      tradition: selectedTradition,
      relationship,
      recommended_amount: {
        min: Math.round(adjustedAmount * 0.7),
        max: Math.round(adjustedAmount * 1.5),
        currency: tradition.typical_amounts.currency,
        reasoning: {
          [locale]: `Based on ${selectedTradition} traditions and your ${relationship.replace('_', ' ')} relationship`,
        },
      },
      alternative_suggestions: filteredGifts.slice(0, 3),
      cultural_etiquette: tradition.cultural_significance,
      timing_advice: {
        [locale]: `Gift timing: ${tradition.gift_timing.replace('_', ' ')}`,
      },
      presentation_tips: tradition.presentation_customs,
    };

    setCurrentGuidance(guidance);
    setShowGuidanceModal(true);

    if (onGetGuidance) {
      onGetGuidance(guidance);
    }
  }, [
    culturalTradition,
    relationship,
    selectedTradition,
    locale,
    filteredGifts,
    onGetGuidance,
  ]);

  // Handle gift selection
  const handleGiftSelect = (gift: GiftSuggestion) => {
    if (onGiftSelect) {
      onGiftSelect(gift);
    }
  };

  // Get category names
  const getCategoryName = (category: GiftCategory): string => {
    const names: Record<GiftCategory, Record<string, string>> = {
      kitchen_dining: {
        en: 'Kitchen & Dining',
        ar: 'المطبخ والطعام',
        zh: '厨房餐具',
      },
      home_decor: { en: 'Home Decor', ar: 'ديكور المنزل', zh: '家居装饰' },
      bedding_bath: {
        en: 'Bedding & Bath',
        ar: 'الفراش والحمام',
        zh: '床上用品',
      },
      electronics: { en: 'Electronics', ar: 'الإلكترونيات', zh: '电子产品' },
      outdoor_garden: {
        en: 'Outdoor & Garden',
        ar: 'الحديقة والخارج',
        zh: '户外园艺',
      },
      travel_luggage: {
        en: 'Travel & Luggage',
        ar: 'السفر والحقائب',
        zh: '旅行行李',
      },
      art_collectibles: {
        en: 'Art & Collectibles',
        ar: 'الفن والمقتنيات',
        zh: '艺术收藏',
      },
      books_media: {
        en: 'Books & Media',
        ar: 'الكتب والإعلام',
        zh: '图书媒体',
      },
      clothing_accessories: {
        en: 'Clothing & Accessories',
        ar: 'الملابس والاكسسوارات',
        zh: '服装配饰',
      },
      jewelry_watches: {
        en: 'Jewelry & Watches',
        ar: 'المجوهرات والساعات',
        zh: '珠宝手表',
      },
      experiences_services: {
        en: 'Experiences & Services',
        ar: 'التجارب والخدمات',
        zh: '体验服务',
      },
      monetary_contributions: {
        en: 'Monetary Gifts',
        ar: 'الهدايا النقدية',
        zh: '现金礼金',
      },
    };

    const langCode = locale.startsWith('ar')
      ? 'ar'
      : locale.startsWith('zh')
        ? 'zh'
        : 'en';

    return names[category][langCode] || names[category]['en'];
  };

  // Gift categories for filter
  const categories: GiftCategory[] = [
    'monetary_contributions',
    'jewelry_watches',
    'kitchen_dining',
    'home_decor',
    'bedding_bath',
    'electronics',
    'experiences_services',
  ];

  return (
    <div
      className={cn(
        'gift-registry-localizer bg-white rounded-lg shadow-sm border p-6',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Gift className="w-6 h-6 text-rose-600" />
          <h3 className="text-xl font-semibold text-gray-900">
            {locale.startsWith('ar')
              ? 'قائمة الهدايا الثقافية'
              : locale.startsWith('zh')
                ? '文化礼品指南'
                : 'Cultural Gift Guide'}
          </h3>
        </div>

        {showCulturalGuidance && (
          <button
            onClick={getGuidanceForRelationship}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Info className="w-4 h-4" />
            <span className="text-sm font-medium">
              {locale.startsWith('ar') ? 'دليل الهدايا' : 'Gift Guidance'}
            </span>
          </button>
        )}
      </div>

      {/* Tradition and Filter Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Tradition Selector */}
        {traditions.length > 1 && (
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">
              {locale.startsWith('ar') ? 'التقليد:' : 'Tradition:'}
            </label>
            <select
              value={selectedTradition}
              onChange={(e) =>
                setSelectedTradition(e.target.value as WeddingTraditionType)
              }
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            >
              {traditions.map((tradition) => (
                <option key={tradition} value={tradition}>
                  {tradition.charAt(0).toUpperCase() + tradition.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">
            {locale.startsWith('ar') ? 'الفئة:' : 'Category:'}
          </label>
          <select
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(e.target.value as GiftCategory | 'all')
            }
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
          >
            <option value="all">
              {locale.startsWith('ar') ? 'جميع الفئات' : 'All Categories'}
            </option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {getCategoryName(category)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cultural Context Info */}
      {showCulturalGuidance && (
        <motion.div
          className="mb-6 p-4 bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-lg"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start space-x-3">
            <Heart className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-rose-900 mb-1">
                {selectedTradition.charAt(0).toUpperCase() +
                  selectedTradition.slice(1)}{' '}
                Wedding Tradition
              </h4>
              <p className="text-sm text-rose-800">
                {culturalTradition.cultural_significance[locale] ||
                  culturalTradition.cultural_significance['en-US']}
              </p>

              {registrySettings.display_prices && (
                <div className="mt-2 text-xs text-rose-700">
                  <span className="font-medium">
                    {locale.startsWith('ar')
                      ? 'المبلغ المتوقع:'
                      : 'Expected Range:'}
                  </span>
                  <span className="ml-2">
                    {culturalTradition.typical_amounts.currency}{' '}
                    {culturalTradition.typical_amounts.min} -{' '}
                    {culturalTradition.typical_amounts.max}
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Gift Suggestions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredGifts.map((gift, index) => (
            <motion.div
              key={gift.id}
              className="gift-card p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer"
              onClick={() => handleGiftSelect(gift)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Gift Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="w-5 h-5 text-gray-600" />
                  <h4 className="font-medium text-gray-900 text-sm">
                    {gift.name[locale] || gift.name['en-US']}
                  </h4>
                </div>

                {/* Cultural Appropriateness Indicator */}
                <span
                  className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    gift.cultural_appropriateness[selectedTradition] ===
                      'highly_appropriate'
                      ? 'bg-green-100 text-green-800'
                      : gift.cultural_appropriateness[selectedTradition] ===
                          'appropriate'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800',
                  )}
                >
                  {gift.cultural_appropriateness[selectedTradition] ===
                  'highly_appropriate'
                    ? '★★★'
                    : gift.cultural_appropriateness[selectedTradition] ===
                        'appropriate'
                      ? '★★'
                      : '★'}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {gift.description[locale] || gift.description['en-US']}
              </p>

              {/* Price Range */}
              {registrySettings.display_prices && (
                <div className="flex items-center space-x-2 mb-3">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    {gift.price_range.currency} {gift.price_range.min} -{' '}
                    {gift.price_range.max}
                  </span>
                </div>
              )}

              {/* Ratings */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <span>Practical:</span>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'w-3 h-3',
                          i < gift.practical_rating
                            ? 'text-yellow-500 fill-current'
                            : 'text-gray-300',
                        )}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <span>Unique:</span>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'w-3 h-3',
                          i < gift.uniqueness_rating
                            ? 'text-purple-500 fill-current'
                            : 'text-gray-300',
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Symbolic Meaning */}
              {gift.symbolic_meaning[locale] && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-600 italic">
                    {gift.symbolic_meaning[locale]}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* No Results Message */}
      {filteredGifts.length === 0 && (
        <div className="text-center py-12">
          <Gift className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-gray-900 mb-1">
            {locale.startsWith('ar') ? 'لا توجد هدايا متاحة' : 'No gifts found'}
          </h4>
          <p className="text-gray-600">
            {locale.startsWith('ar')
              ? 'جرب تغيير معايير البحث'
              : 'Try adjusting your search criteria'}
          </p>
        </div>
      )}

      {/* Cultural Guidance Modal */}
      <AnimatePresence>
        {showGuidanceModal && currentGuidance && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {locale.startsWith('ar')
                      ? 'دليل الهدايا الثقافي'
                      : 'Cultural Gift Guidance'}
                  </h3>
                  <button
                    onClick={() => setShowGuidanceModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                {/* Recommended Amount */}
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-1">
                    {locale.startsWith('ar')
                      ? 'المبلغ الموصى به'
                      : 'Recommended Amount'}
                  </h4>
                  <p className="text-green-800">
                    {currentGuidance.recommended_amount.currency}{' '}
                    {currentGuidance.recommended_amount.min} -{' '}
                    {currentGuidance.recommended_amount.max}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    {currentGuidance.recommended_amount.reasoning[locale]}
                  </p>
                </div>

                {/* Cultural Etiquette */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    {locale.startsWith('ar')
                      ? 'آداب الهدايا'
                      : 'Gift Etiquette'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {currentGuidance.cultural_etiquette[locale] ||
                      currentGuidance.cultural_etiquette['en-US']}
                  </p>
                </div>

                {/* Timing Advice */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    {locale.startsWith('ar') ? 'توقيت الهدية' : 'Gift Timing'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {currentGuidance.timing_advice[locale]}
                  </p>
                </div>

                {/* Alternative Suggestions */}
                {currentGuidance.alternative_suggestions.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      {locale.startsWith('ar')
                        ? 'اقتراحات بديلة'
                        : 'Alternative Suggestions'}
                    </h4>
                    <div className="space-y-2">
                      {currentGuidance.alternative_suggestions.map(
                        (suggestion) => (
                          <div
                            key={suggestion.id}
                            className="p-2 border border-gray-200 rounded text-sm"
                          >
                            <span className="font-medium">
                              {suggestion.name[locale] ||
                                suggestion.name['en-US']}
                            </span>
                            {registrySettings.display_prices && (
                              <span className="text-gray-600 ml-2">
                                ({suggestion.price_range.currency}{' '}
                                {suggestion.price_range.min}+)
                              </span>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GiftRegistryLocalizer;
