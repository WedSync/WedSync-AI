'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDownIcon,
  MapPinIcon,
  ClockIcon,
  UsersIcon,
  InfoIcon,
  CalendarIcon,
  HeartIcon,
} from 'lucide-react';
import {
  type WeddingMarketLocale,
  type CeremonyType,
  type WeddingTraditionType,
  type TextDirection,
  type Season,
} from '@/types/i18n';

// =============================================================================
// CEREMONY TYPE CONFIGURATIONS
// =============================================================================

const CEREMONY_LOCALIZATIONS: Record<
  CeremonyType,
  {
    name: Record<WeddingMarketLocale | 'default', string>;
    description: Record<WeddingMarketLocale | 'default', string>;
    duration: { min: number; max: number; unit: 'minutes' | 'hours' };
    guestCount: { min: number; max: number; typical: number };
    season: Season[];
    timeOfDay: ('morning' | 'afternoon' | 'evening' | 'night')[];
    venues: string[];
    traditions: WeddingTraditionType[];
    requirements: string[];
    culturalNotes: Record<WeddingMarketLocale | 'default', string[]>;
    cost: { min: number; max: number; currency: 'percentage' }; // Percentage of total budget
    preparation: { weeks: number; description: string };
    icon: string;
    color: string;
  }
> = {
  church_wedding: {
    name: {
      default: 'Church Wedding',
      'en-US': 'Church Wedding',
      'en-GB': 'Church Wedding',
      'es-ES': 'Boda Religiosa',
      'fr-FR': 'Mariage Religieux',
      'de-DE': 'Kirchliche Hochzeit',
      'it-IT': 'Matrimonio in Chiesa',
    },
    description: {
      default: 'Traditional religious ceremony in a church setting',
      'en-US':
        'Christian wedding ceremony in a church with religious officiant',
      'es-ES': 'Ceremonia religiosa cristiana en iglesia',
      'fr-FR': 'Cérémonie religieuse chrétienne dans une église',
    },
    duration: { min: 30, max: 90, unit: 'minutes' },
    guestCount: { min: 50, max: 500, typical: 150 },
    season: ['spring', 'summer', 'autumn'],
    timeOfDay: ['morning', 'afternoon'],
    venues: ['Church', 'Cathedral', 'Chapel', 'Historic church'],
    traditions: ['western', 'orthodox'],
    requirements: [
      'Religious preparation classes',
      'Church membership',
      'Marriage license',
    ],
    culturalNotes: {
      default: [
        'White dress traditional',
        'Exchange of rings',
        'Unity candle ceremony',
      ],
      'en-US': [
        'Protestant or Catholic variations',
        'Processional music',
        'Biblical readings',
      ],
      'en-GB': [
        'Church of England traditions',
        'Banns of marriage',
        'Anglican ceremony',
      ],
    },
    cost: { min: 5, max: 15, currency: 'percentage' },
    preparation: {
      weeks: 12,
      description: 'Religious preparation and church booking',
    },
    icon: '⛪',
    color: 'blue',
  },
  civil_ceremony: {
    name: {
      default: 'Civil Ceremony',
      'en-US': 'Civil Ceremony',
      'en-GB': 'Registry Office Wedding',
      'es-ES': 'Ceremonia Civil',
      'fr-FR': 'Cérémonie Civile',
      'de-DE': 'Standesamtliche Trauung',
      'it-IT': 'Matrimonio Civile',
    },
    description: {
      default: 'Legal ceremony performed by civil officiant',
      'en-US': 'Non-religious ceremony performed by judge or officiant',
      'es-ES': 'Ceremonia legal realizada por autoridad civil',
    },
    duration: { min: 15, max: 45, unit: 'minutes' },
    guestCount: { min: 2, max: 200, typical: 50 },
    season: ['spring', 'summer', 'autumn', 'winter'],
    timeOfDay: ['morning', 'afternoon'],
    venues: ['City Hall', 'Courthouse', 'Registry Office', 'Civic center'],
    traditions: ['secular', 'interfaith'],
    requirements: ['Marriage license', 'Witnesses', 'Valid ID'],
    culturalNotes: {
      default: [
        'Legal focus',
        'Personal vows allowed',
        'No religious elements',
      ],
      'en-US': [
        'Justice of the peace',
        'Civil officiant',
        'Legal witnesses required',
      ],
      'en-GB': ['Register office', 'Registrar ceremony', 'Legal formalities'],
    },
    cost: { min: 1, max: 5, currency: 'percentage' },
    preparation: { weeks: 2, description: 'Legal paperwork and license' },
    icon: '🏛️',
    color: 'gray',
  },
  nikah: {
    name: {
      default: 'Nikah',
      'ar-AE': 'نكاح',
      'ar-SA': 'نكاح',
      'ar-EG': 'نكاح',
      'hi-IN': 'निकाह',
      'en-US': 'Islamic Marriage (Nikah)',
    },
    description: {
      default: 'Islamic marriage contract ceremony',
      'ar-AE': 'عقد الزواج الإسلامي مع الشهود والمهر',
      'en-US': 'Islamic marriage contract with witnesses and mahr (dower)',
    },
    duration: { min: 30, max: 60, unit: 'minutes' },
    guestCount: { min: 10, max: 300, typical: 100 },
    season: ['spring', 'summer', 'autumn', 'winter'],
    timeOfDay: ['morning', 'afternoon', 'evening'],
    venues: ['Mosque', 'Community center', 'Home', 'Islamic center'],
    traditions: ['islamic'],
    requirements: [
      'Islamic officiant (Imam)',
      'Two witnesses',
      'Mahr agreement',
    ],
    culturalNotes: {
      default: [
        'Segregated seating',
        'Quranic recitations',
        'Mahr (dower) ceremony',
      ],
      'ar-AE': ['إمام أو عالم شرعي', 'شهود مسلمين', 'عقد النكاح'],
      'en-US': [
        'Islamic marriage contract',
        'Mahr negotiation',
        'Religious ceremony',
      ],
    },
    cost: { min: 2, max: 8, currency: 'percentage' },
    preparation: {
      weeks: 6,
      description: 'Religious preparation and mahr agreement',
    },
    icon: '🕌',
    color: 'green',
  },
  hindu_ceremony: {
    name: {
      default: 'Hindu Wedding',
      'hi-IN': 'हिंदू विवाह',
      'en-US': 'Hindu Wedding Ceremony',
      'en-GB': 'Hindu Wedding',
    },
    description: {
      default: 'Traditional Hindu wedding with Vedic rituals',
      'hi-IN': 'वैदिक रीति-रिवाज़ों के साथ पारंपरिक हिंदू विवाह',
      'en-US': 'Multi-day Hindu wedding with sacred fire ceremony',
    },
    duration: { min: 180, max: 480, unit: 'minutes' },
    guestCount: { min: 200, max: 1000, typical: 500 },
    season: ['winter', 'spring'],
    timeOfDay: ['morning', 'afternoon'],
    venues: ['Temple', 'Banquet hall', 'Home', 'Outdoor mandap'],
    traditions: ['hindu'],
    requirements: [
      'Hindu priest (Pandit)',
      'Sacred fire (Agni)',
      'Astrological matching',
    ],
    culturalNotes: {
      default: [
        'Sacred fire ceremony',
        'Seven vows (Saptapadi)',
        'Mangalsutra ceremony',
      ],
      'hi-IN': ['अग्नि साक्षी', 'सप्तपदी', 'मंगलसूत्र धारण'],
      'en-US': [
        'Multiple day celebrations',
        'Mehndi and Sangeet',
        'Traditional attire',
      ],
    },
    cost: { min: 15, max: 35, currency: 'percentage' },
    preparation: {
      weeks: 16,
      description: 'Astrological consultation and multi-day planning',
    },
    icon: '🕉️',
    color: 'orange',
  },
  jewish_ceremony: {
    name: {
      default: 'Jewish Wedding',
      'en-US': 'Jewish Wedding Ceremony',
      'en-GB': 'Jewish Wedding',
      'fr-FR': 'Mariage Juif',
      'de-DE': 'Jüdische Hochzeit',
    },
    description: {
      default: 'Jewish wedding ceremony under the chuppah',
      'en-US': 'Traditional Jewish wedding with chuppah and breaking of glass',
      'fr-FR': 'Cérémonie juive traditionnelle sous la houppa',
    },
    duration: { min: 45, max: 90, unit: 'minutes' },
    guestCount: { min: 50, max: 400, typical: 180 },
    season: ['spring', 'summer', 'autumn'],
    timeOfDay: ['afternoon', 'evening'],
    venues: [
      'Synagogue',
      'Hotel ballroom',
      'Outdoor venue',
      'Community center',
    ],
    traditions: ['jewish'],
    requirements: [
      'Rabbi or cantor',
      'Chuppah (canopy)',
      'Ketubah (marriage contract)',
    ],
    culturalNotes: {
      default: ['Chuppah ceremony', 'Breaking of glass', 'Seven blessings'],
      'en-US': [
        'Orthodox, Conservative, or Reform variations',
        'Hora dancing',
        'Ketubah signing',
      ],
      'fr-FR': ['Traditions séfarades ou ashkénazes', 'Houppa', 'Ketubah'],
    },
    cost: { min: 8, max: 18, currency: 'percentage' },
    preparation: {
      weeks: 12,
      description: 'Religious preparation and Ketubah creation',
    },
    icon: '✡️',
    color: 'purple',
  },
  tea_ceremony: {
    name: {
      default: 'Tea Ceremony',
      'zh-CN': '茶礼',
      'en-US': 'Chinese Tea Ceremony',
      'en-GB': 'Tea Ceremony',
    },
    description: {
      default: 'Traditional Chinese tea ceremony for family respect',
      'zh-CN': '传统中式茶礼敬茶仪式',
      'en-US': 'Traditional Chinese ceremony of serving tea to elders',
    },
    duration: { min: 30, max: 120, unit: 'minutes' },
    guestCount: { min: 20, max: 100, typical: 50 },
    season: ['spring', 'summer', 'autumn', 'winter'],
    timeOfDay: ['morning', 'afternoon'],
    venues: ['Home', 'Restaurant', 'Tea house', 'Banquet hall'],
    traditions: ['chinese'],
    requirements: [
      'Traditional tea set',
      'Chinese wedding attire',
      'Red packets (hongbao)',
    ],
    culturalNotes: {
      default: ['Respect to elders', 'Red decorations', 'Traditional attire'],
      'zh-CN': ['向长辈敬茶', '红色装饰', '传统服装'],
      'en-US': [
        'Kneeling ceremony',
        'Family hierarchy respect',
        'Red envelopes exchange',
      ],
    },
    cost: { min: 3, max: 10, currency: 'percentage' },
    preparation: {
      weeks: 4,
      description: 'Family coordination and traditional items',
    },
    icon: '🍵',
    color: 'red',
  },
  outdoor_ceremony: {
    name: {
      default: 'Outdoor Ceremony',
      'en-US': 'Outdoor Wedding',
      'en-GB': 'Garden Wedding',
      'es-ES': 'Boda al Aire Libre',
      'fr-FR': 'Cérémonie Extérieure',
      'de-DE': 'Freie Trauung',
    },
    description: {
      default: 'Wedding ceremony in natural outdoor setting',
      'en-US': 'Outdoor wedding in garden, beach, or natural setting',
      'es-ES': 'Ceremonia de boda en jardín o entorno natural',
    },
    duration: { min: 20, max: 60, unit: 'minutes' },
    guestCount: { min: 20, max: 300, typical: 100 },
    season: ['spring', 'summer', 'autumn'],
    timeOfDay: ['morning', 'afternoon'],
    venues: ['Garden', 'Beach', 'Park', 'Vineyard', 'Mountain setting'],
    traditions: ['western', 'secular', 'interfaith'],
    requirements: ['Weather backup plan', 'Outdoor permits', 'Sound system'],
    culturalNotes: {
      default: ['Natural backdrop', 'Weather dependent', 'Casual atmosphere'],
      'en-US': [
        'Seasonal considerations',
        'Tent rental possible',
        'Natural beauty',
      ],
      'en-GB': [
        'Weather contingency required',
        'Garden party style',
        'Outdoor licenses',
      ],
    },
    cost: { min: 8, max: 20, currency: 'percentage' },
    preparation: {
      weeks: 10,
      description: 'Weather planning and outdoor logistics',
    },
    icon: '🌸',
    color: 'green',
  },
  destination_wedding: {
    name: {
      default: 'Destination Wedding',
      'en-US': 'Destination Wedding',
      'en-GB': 'Destination Wedding',
      'es-ES': 'Boda de Destino',
      'fr-FR': 'Mariage de Destination',
      'de-DE': 'Hochzeit im Ausland',
    },
    description: {
      default: 'Wedding ceremony at a travel destination',
      'en-US': 'Wedding at a special destination away from home',
      'es-ES': 'Boda celebrada en un destino especial de viaje',
    },
    duration: { min: 30, max: 120, unit: 'minutes' },
    guestCount: { min: 10, max: 100, typical: 50 },
    season: ['spring', 'summer', 'autumn', 'winter'],
    timeOfDay: ['morning', 'afternoon', 'evening'],
    venues: ['Resort', 'Beach', 'Castle', 'Villa', 'Exotic location'],
    traditions: ['western', 'secular', 'interfaith'],
    requirements: [
      'Travel arrangements',
      'Local marriage laws',
      'Guest accommodations',
    ],
    culturalNotes: {
      default: ['Intimate celebration', 'Travel required', 'Unique location'],
      'en-US': [
        'Legal requirements vary by location',
        'Guest travel costs',
        'Extended celebration',
      ],
      'en-GB': [
        'International marriage laws',
        'Passport requirements',
        'Cultural considerations',
      ],
    },
    cost: { min: 20, max: 50, currency: 'percentage' },
    preparation: {
      weeks: 20,
      description: 'Travel planning and international legalities',
    },
    icon: '✈️',
    color: 'blue',
  },
  elopement: {
    name: {
      default: 'Elopement',
      'en-US': 'Elopement',
      'en-GB': 'Elopement',
      'es-ES': 'Boda Íntima',
      'fr-FR': 'Fugue Amoureuse',
      'de-DE': 'Geheime Hochzeit',
    },
    description: {
      default: 'Private intimate wedding ceremony',
      'en-US': 'Small private wedding ceremony with minimal guests',
      'es-ES': 'Ceremonia de boda privada e íntima',
    },
    duration: { min: 15, max: 45, unit: 'minutes' },
    guestCount: { min: 2, max: 10, typical: 4 },
    season: ['spring', 'summer', 'autumn', 'winter'],
    timeOfDay: ['morning', 'afternoon', 'evening'],
    venues: ['City Hall', 'Small chapel', 'Intimate venue', 'Outdoor location'],
    traditions: ['secular', 'interfaith', 'western'],
    requirements: ['Marriage license', 'Witnesses', 'Officiant'],
    culturalNotes: {
      default: ['Intimate and private', 'Minimal planning', 'Focus on couple'],
      'en-US': [
        'Budget-friendly option',
        'Spontaneous or planned',
        'Just the couple',
      ],
      'en-GB': [
        'Registry office option',
        'Quick and simple',
        'Private celebration',
      ],
    },
    cost: { min: 1, max: 5, currency: 'percentage' },
    preparation: {
      weeks: 2,
      description: 'Minimal planning for intimate ceremony',
    },
    icon: '💕',
    color: 'pink',
  },
};

// =============================================================================
// COMPONENT INTERFACES
// =============================================================================

export interface CeremonyTypeLocalizerProps {
  locale: WeddingMarketLocale;
  direction?: TextDirection;
  selectedCeremony?: CeremonyType;
  selectedTraditions?: WeddingTraditionType[];
  onChange?: (ceremony: CeremonyType) => void;
  showDetails?: boolean;
  showCosts?: boolean;
  showCulturalNotes?: boolean;
  className?: string;
  weddingBudget?: number;
  weddingDate?: Date;
  guestCount?: number;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CeremonyTypeLocalizer: React.FC<CeremonyTypeLocalizerProps> = ({
  locale,
  direction = 'ltr',
  selectedCeremony,
  selectedTraditions = [],
  onChange,
  showDetails = true,
  showCosts = true,
  showCulturalNotes = true,
  className = '',
  weddingBudget,
  weddingDate,
  guestCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCeremony, setExpandedCeremony] = useState<CeremonyType | null>(
    null,
  );

  const isRTL = direction === 'rtl';

  // Filter ceremonies based on selected traditions
  const relevantCeremonies = useMemo(() => {
    const ceremonies = Object.entries(CEREMONY_LOCALIZATIONS) as [
      CeremonyType,
      (typeof CEREMONY_LOCALIZATIONS)[CeremonyType],
    ][];

    if (selectedTraditions.length === 0) {
      return ceremonies;
    }

    return ceremonies
      .filter(([_, config]) =>
        config.traditions.some((tradition) =>
          selectedTraditions.includes(tradition),
        ),
      )
      .concat(
        ceremonies.filter(
          ([_, config]) =>
            !config.traditions.some((tradition) =>
              selectedTraditions.includes(tradition),
            ),
        ),
      );
  }, [selectedTraditions]);

  // Get current season if wedding date provided
  const currentSeason: Season | undefined = useMemo(() => {
    if (!weddingDate) return undefined;
    const month = weddingDate.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }, [weddingDate]);

  const getLocalizedName = (ceremony: CeremonyType): string => {
    const config = CEREMONY_LOCALIZATIONS[ceremony];
    return config.name[locale] || config.name.default;
  };

  const getLocalizedDescription = (ceremony: CeremonyType): string => {
    const config = CEREMONY_LOCALIZATIONS[ceremony];
    return config.description[locale] || config.description.default;
  };

  const getCulturalNotes = (ceremony: CeremonyType): string[] => {
    const config = CEREMONY_LOCALIZATIONS[ceremony];
    return config.culturalNotes[locale] || config.culturalNotes.default;
  };

  const isRecommended = (ceremony: CeremonyType): boolean => {
    const config = CEREMONY_LOCALIZATIONS[ceremony];

    // Check tradition compatibility
    if (
      selectedTraditions.length > 0 &&
      !config.traditions.some((tradition) =>
        selectedTraditions.includes(tradition),
      )
    ) {
      return false;
    }

    // Check season compatibility
    if (currentSeason && !config.season.includes(currentSeason)) {
      return false;
    }

    // Check guest count compatibility
    if (
      guestCount &&
      (guestCount < config.guestCount.min || guestCount > config.guestCount.max)
    ) {
      return false;
    }

    return true;
  };

  return (
    <div className={`${className}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Ceremony Types
          </h3>
          <p className="text-sm text-gray-600">
            Choose a ceremony type that matches your traditions and preferences
          </p>
        </div>

        {/* Ceremony Options Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {relevantCeremonies.map(([ceremony, config]) => {
            const isSelected = selectedCeremony === ceremony;
            const recommended = isRecommended(ceremony);
            const isExpanded = expandedCeremony === ceremony;

            return (
              <motion.div
                key={ceremony}
                className={`
                  relative bg-white border-2 rounded-lg p-4 cursor-pointer transition-all duration-200
                  ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50'
                      : recommended
                        ? 'border-green-300 hover:border-green-400'
                        : 'border-gray-200 hover:border-gray-300'
                  }
                `}
                onClick={() => onChange?.(ceremony)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Recommended Badge */}
                {recommended && !isSelected && (
                  <div className="absolute top-2 right-2 bg-green-100 text-green-700 text-xs px-2 py-1 rounded">
                    Recommended
                  </div>
                )}

                {/* Ceremony Header */}
                <div
                  className={`flex items-start gap-3 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <span className="text-2xl flex-shrink-0">{config.icon}</span>
                  <div className="flex-1">
                    <h4
                      className={`font-medium mb-1 ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}
                    >
                      {getLocalizedName(ceremony)}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {getLocalizedDescription(ceremony)}
                    </p>

                    {/* Quick Info */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        <span>
                          {config.duration.min}-{config.duration.max}{' '}
                          {config.duration.unit}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <UsersIcon className="w-3 h-3" />
                        <span>{config.guestCount.typical} guests</span>
                      </div>
                    </div>

                    {/* Traditions */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {config.traditions.map((tradition) => (
                        <span
                          key={tradition}
                          className={`
                            text-xs px-2 py-1 rounded
                            ${
                              selectedTraditions.includes(tradition)
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                            }
                          `}
                        >
                          {tradition.replace('_', ' ')}
                        </span>
                      ))}
                    </div>

                    {/* Cost Estimate */}
                    {showCosts && weddingBudget && (
                      <div className="text-xs text-gray-600 mb-2">
                        <strong>Est. Cost:</strong>{' '}
                        {new Intl.NumberFormat(locale, {
                          style: 'currency',
                          currency: locale.includes('GB')
                            ? 'GBP'
                            : locale.includes('EU')
                              ? 'EUR'
                              : 'USD',
                        }).format((weddingBudget * config.cost.min) / 100)}{' '}
                        -{' '}
                        {new Intl.NumberFormat(locale, {
                          style: 'currency',
                          currency: locale.includes('GB')
                            ? 'GBP'
                            : locale.includes('EU')
                              ? 'EUR'
                              : 'USD',
                        }).format((weddingBudget * config.cost.max) / 100)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Details Toggle */}
                {showDetails && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCeremony(isExpanded ? null : ceremony);
                    }}
                    className="w-full mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
                  >
                    <InfoIcon className="w-3 h-3" />
                    {isExpanded ? 'Less details' : 'More details'}
                    <ChevronDownIcon
                      className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Expanded Details */}
        <AnimatePresence>
          {expandedCeremony && showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-50 rounded-lg p-6"
            >
              {(() => {
                const config = CEREMONY_LOCALIZATIONS[expandedCeremony];
                return (
                  <div
                    className={`space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{config.icon}</span>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {getLocalizedName(expandedCeremony)}
                      </h4>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Requirements */}
                      <div>
                        <h5 className="font-medium text-gray-700 mb-2">
                          Requirements:
                        </h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {config.requirements.map((req, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Venues */}
                      <div>
                        <h5 className="font-medium text-gray-700 mb-2">
                          Typical Venues:
                        </h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {config.venues.map((venue, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <MapPinIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              {venue}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Timing */}
                      <div>
                        <h5 className="font-medium text-gray-700 mb-2">
                          Timing:
                        </h5>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-2">
                            <ClockIcon className="w-3 h-3" />
                            Duration: {config.duration.min}-
                            {config.duration.max} {config.duration.unit}
                          </div>
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-3 h-3" />
                            Best seasons: {config.season.join(', ')}
                          </div>
                          <div>Time of day: {config.timeOfDay.join(', ')}</div>
                        </div>
                      </div>

                      {/* Guest Count */}
                      <div>
                        <h5 className="font-medium text-gray-700 mb-2">
                          Guest Count:
                        </h5>
                        <div className="text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <UsersIcon className="w-3 h-3" />
                            Range: {config.guestCount.min} -{' '}
                            {config.guestCount.max}
                          </div>
                          <div>Typical: {config.guestCount.typical} guests</div>
                        </div>
                      </div>
                    </div>

                    {/* Cultural Notes */}
                    {showCulturalNotes &&
                      getCulturalNotes(expandedCeremony).length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-700 mb-2">
                            Cultural Notes:
                          </h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {getCulturalNotes(expandedCeremony).map(
                              (note, index) => (
                                <li
                                  key={index}
                                  className="flex items-start gap-2"
                                >
                                  <HeartIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  {note}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}

                    {/* Preparation Time */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h5 className="font-medium text-blue-900 mb-1">
                        Preparation Time:
                      </h5>
                      <p className="text-sm text-blue-800">
                        <strong>{config.preparation.weeks} weeks:</strong>{' '}
                        {config.preparation.description}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CeremonyTypeLocalizer;
