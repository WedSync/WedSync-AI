'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDownIcon,
  SearchIcon,
  HeartIcon,
  InfoIcon,
  CheckIcon,
} from 'lucide-react';
import {
  type WeddingMarketLocale,
  type WeddingTraditionType,
  type CeremonyType,
  type TextDirection,
} from '@/types/i18n';

// =============================================================================
// WEDDING TRADITION CONFIGURATIONS
// =============================================================================

const WEDDING_TRADITIONS_CONFIG: Record<
  WeddingTraditionType,
  {
    name: Record<WeddingMarketLocale | 'default', string>;
    description: Record<WeddingMarketLocale | 'default', string>;
    icon: string;
    color: string;
    popularIn: WeddingMarketLocale[];
    ceremonies: CeremonyType[];
    keyElements: string[];
    seasonalPreferences: string[];
    colorSymbolism: Record<string, string>;
    musicStyle: string[];
    foodTraditions: string[];
  }
> = {
  western: {
    name: {
      default: 'Western',
      'en-US': 'Western Christian',
      'en-GB': 'Western',
      'es-ES': 'Occidental',
      'fr-FR': 'Occidentale',
      'de-DE': 'Westlich',
      'it-IT': 'Occidentale',
    },
    description: {
      default: 'Traditional Christian wedding ceremony with modern elements',
      'en-US':
        'Traditional American/European wedding with church ceremony and reception',
      'en-GB': 'Classic British wedding traditions with church ceremony',
      'es-ES': 'Tradición de boda occidental con ceremonia religiosa',
      'fr-FR': 'Tradition de mariage occidental avec cérémonie religieuse',
    },
    icon: '⛪',
    color: 'blue',
    popularIn: ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT'],
    ceremonies: ['church_wedding', 'civil_ceremony', 'outdoor_ceremony'],
    keyElements: [
      'White dress',
      'Wedding rings',
      'Bouquet toss',
      'First dance',
      'Wedding cake',
    ],
    seasonalPreferences: [
      'Spring and summer preferred',
      'Avoid winter in northern climates',
    ],
    colorSymbolism: {
      White: 'Purity and new beginnings',
      Blue: 'Loyalty and faithfulness',
    },
    musicStyle: ['Classical', 'Contemporary', 'String quartet', 'DJ'],
    foodTraditions: [
      'Wedding cake',
      'Cocktail hour',
      'Plated dinner',
      'Dancing reception',
    ],
  },
  islamic: {
    name: {
      default: 'Islamic',
      'ar-AE': 'إسلامي',
      'ar-SA': 'إسلامي',
      'ar-EG': 'إسلامي',
      'hi-IN': 'इस्लामी',
      'en-US': 'Islamic/Muslim',
    },
    description: {
      default: 'Islamic wedding following religious customs and Sharia law',
      'ar-AE': 'زفاف إسلامي يتبع التقاليد الدينية والشريعة',
      'en-US':
        'Muslim wedding ceremony with Nikah contract and traditional celebrations',
    },
    icon: '🕌',
    color: 'green',
    popularIn: ['ar-AE', 'ar-SA', 'ar-EG', 'hi-IN'],
    ceremonies: ['nikah', 'walima', 'henna_party'],
    keyElements: [
      'Nikah contract',
      'Mahr (dower)',
      'Henna ceremony',
      'Separate celebrations',
    ],
    seasonalPreferences: [
      'Avoid Ramadan',
      'Avoid Hajj period',
      'Consider Islamic calendar',
    ],
    colorSymbolism: {
      Green: 'Islam and paradise',
      Gold: 'Prosperity and blessing',
    },
    musicStyle: ['Traditional Islamic music', 'Nasheed', 'Cultural folk music'],
    foodTraditions: [
      'Halal cuisine',
      'Traditional sweets',
      'Dates and milk',
      'Biryani',
    ],
  },
  hindu: {
    name: {
      default: 'Hindu',
      'hi-IN': 'हिंदू',
      'en-US': 'Hindu',
      'en-GB': 'Hindu',
    },
    description: {
      default: 'Traditional Hindu wedding with multiple ceremonies and rituals',
      'hi-IN': 'पारंपरिक हिंदू विवाह कई समारोहों और रीति-रिवाजों के साथ',
      'en-US':
        'Hindu wedding with Vedic rituals, multiple days of celebrations',
    },
    icon: '🕉️',
    color: 'orange',
    popularIn: ['hi-IN'],
    ceremonies: ['hindu_ceremony', 'mehendi', 'sangeet', 'haldi'],
    keyElements: [
      'Sacred fire (Agni)',
      'Seven vows (Saptapadi)',
      'Mangalsutra',
      'Sindoor',
    ],
    seasonalPreferences: [
      'Avoid monsoon season',
      'Consider Hindu calendar',
      'Auspicious dates',
    ],
    colorSymbolism: {
      Red: 'Purity and fertility',
      Yellow: 'Prosperity',
      Orange: 'Sacred',
    },
    musicStyle: [
      'Classical Indian',
      'Bollywood',
      'Regional folk',
      'Devotional',
    ],
    foodTraditions: [
      'Vegetarian feast',
      'Traditional sweets',
      'Regional specialties',
      'Prasad',
    ],
  },
  jewish: {
    name: {
      default: 'Jewish',
      'en-US': 'Jewish',
      'en-GB': 'Jewish',
      'fr-FR': 'Juive',
      'de-DE': 'Jüdisch',
    },
    description: {
      default:
        'Jewish wedding ceremony under the chuppah with traditional blessings',
      'en-US': 'Jewish wedding with chuppah ceremony and traditional customs',
      'fr-FR': 'Mariage juif avec cérémonie sous la houppa',
    },
    icon: '✡️',
    color: 'purple',
    popularIn: ['en-US', 'en-GB', 'fr-FR'],
    ceremonies: ['jewish_ceremony', 'civil_ceremony'],
    keyElements: [
      'Chuppah (canopy)',
      'Breaking of glass',
      'Ketubah contract',
      'Seven blessings',
    ],
    seasonalPreferences: [
      'Avoid Sabbath',
      'Consider Jewish holidays',
      'Evening ceremonies',
    ],
    colorSymbolism: { Blue: 'Divinity', White: 'Purity', Gold: 'Eternal love' },
    musicStyle: [
      'Traditional Jewish',
      'Klezmer',
      'Hebrew songs',
      'Folk dancing',
    ],
    foodTraditions: [
      'Kosher cuisine',
      'Challah bread',
      'Wine blessing',
      'Traditional dances',
    ],
  },
  chinese: {
    name: {
      default: 'Chinese',
      'zh-CN': '中式',
      'en-US': 'Chinese',
      'en-GB': 'Chinese',
    },
    description: {
      default:
        'Traditional Chinese wedding with tea ceremony and cultural customs',
      'zh-CN': '传统中式婚礼与茶道及文化习俗',
      'en-US': 'Chinese wedding with tea ceremony and traditional celebrations',
    },
    icon: '🏮',
    color: 'red',
    popularIn: ['zh-CN'],
    ceremonies: ['tea_ceremony', 'traditional_ceremony'],
    keyElements: [
      'Red decorations',
      'Tea ceremony',
      'Dragon and phoenix',
      'Gold jewelry',
    ],
    seasonalPreferences: [
      'Avoid ghost month',
      'Consider lunar calendar',
      'Lucky dates',
    ],
    colorSymbolism: {
      Red: 'Good luck and joy',
      Gold: 'Prosperity',
      Phoenix: 'Feminine power',
    },
    musicStyle: [
      'Traditional Chinese',
      'Erhu music',
      'Lion dance',
      'Cultural performances',
    ],
    foodTraditions: [
      'Banquet dining',
      'Longevity noodles',
      'Fish for abundance',
      'Red dates',
    ],
  },
  sikh: {
    name: {
      default: 'Sikh',
      'hi-IN': 'सिख',
      'en-US': 'Sikh',
      'en-GB': 'Sikh',
    },
    description: {
      default: 'Sikh wedding ceremony in Gurdwara with Anand Karaj ritual',
      'hi-IN': 'गुरुद्वारे में आनंद कारज रीति के साथ सिख विवाह समारोह',
      'en-US': 'Sikh wedding with Anand Karaj ceremony in Gurdwara',
    },
    icon: '☬',
    color: 'yellow',
    popularIn: ['hi-IN', 'en-GB', 'en-US'],
    ceremonies: ['sikh_ceremony', 'sangeet'],
    keyElements: [
      'Anand Karaj',
      'Four rounds (Laavan)',
      'Guru Granth Sahib',
      'Turban ceremony',
    ],
    seasonalPreferences: [
      'Any season suitable',
      'Morning ceremonies preferred',
    ],
    colorSymbolism: {
      Orange: 'Courage and sacrifice',
      White: 'Peace and purity',
    },
    musicStyle: ['Gurbani kirtan', 'Traditional folk', 'Bhangra', 'Devotional'],
    foodTraditions: [
      'Langar (community kitchen)',
      'Vegetarian feast',
      'Karah prasad',
      'Traditional sweets',
    ],
  },
  buddhist: {
    name: {
      default: 'Buddhist',
      'zh-CN': '佛教',
      'ja-JP': '仏教',
      'en-US': 'Buddhist',
    },
    description: {
      default:
        'Buddhist wedding ceremony with meditation and traditional blessings',
      'en-US':
        'Buddhist wedding with mindful ceremony and traditional blessings',
    },
    icon: '☸️',
    color: 'gold',
    popularIn: ['zh-CN', 'ja-JP'],
    ceremonies: ['buddhist_ceremony', 'tea_ceremony'],
    keyElements: [
      'Meditation',
      'Lotus flowers',
      'Incense ceremony',
      'Buddhist blessings',
    ],
    seasonalPreferences: [
      'Consider Buddhist calendar',
      'Peaceful seasons preferred',
    ],
    colorSymbolism: {
      Gold: 'Enlightenment',
      White: 'Purity',
      Lotus: 'Spiritual growth',
    },
    musicStyle: [
      'Traditional Buddhist chants',
      'Meditation music',
      'Temple bells',
    ],
    foodTraditions: [
      'Vegetarian cuisine',
      'Tea ceremony',
      'Lotus-themed desserts',
      'Mindful eating',
    ],
  },
  mexican: {
    name: {
      default: 'Mexican',
      'es-MX': 'Mexicano',
      'en-US': 'Mexican',
      'es-ES': 'Mexicano',
    },
    description: {
      default:
        'Traditional Mexican wedding with vibrant celebrations and cultural elements',
      'es-MX':
        'Boda tradicional mexicana con celebraciones vibrantes y elementos culturales',
      'en-US':
        'Mexican wedding with mariachi, traditional foods, and colorful decorations',
    },
    icon: '🌮',
    color: 'green',
    popularIn: ['es-MX', 'en-US'],
    ceremonies: ['church_wedding', 'traditional_ceremony'],
    keyElements: [
      'Las arras (coins)',
      'El lazo (lasso)',
      'Mariachi music',
      'Papel picado',
    ],
    seasonalPreferences: [
      'Year-round suitable',
      'Dia de los Muertos consideration',
    ],
    colorSymbolism: {
      Green: 'Mexican flag',
      Red: 'Passion and life',
      White: 'Purity',
    },
    musicStyle: [
      'Mariachi',
      'Regional Mexican',
      'Folk music',
      'Traditional dances',
    ],
    foodTraditions: [
      'Traditional Mexican cuisine',
      'Tres leches cake',
      'Aguas frescas',
      'Family recipes',
    ],
  },
  interfaith: {
    name: {
      default: 'Interfaith',
      'en-US': 'Interfaith/Multi-faith',
      'en-GB': 'Interfaith',
      'fr-FR': 'Interconfessionnel',
      'de-DE': 'Überkonfessionell',
    },
    description: {
      default: 'Wedding blending multiple religious or cultural traditions',
      'en-US':
        'Wedding ceremony incorporating elements from different faiths and cultures',
    },
    icon: '🤝',
    color: 'rainbow',
    popularIn: ['en-US', 'en-GB', 'en-AU', 'en-CA'],
    ceremonies: ['interfaith_ceremony', 'civil_ceremony'],
    keyElements: [
      'Blended traditions',
      'Multiple blessings',
      'Cultural fusion',
      'Family unity',
    ],
    seasonalPreferences: ['Flexible based on traditions involved'],
    colorSymbolism: {
      Multiple: 'Unity in diversity',
      White: 'Universal peace',
    },
    musicStyle: [
      'Diverse cultural music',
      'Fusion styles',
      'Multicultural performances',
    ],
    foodTraditions: [
      'Fusion cuisine',
      'Multiple cultural dishes',
      'Diverse celebration styles',
    ],
  },
  secular: {
    name: {
      default: 'Secular',
      'en-US': 'Secular/Non-religious',
      'en-GB': 'Secular',
      'fr-FR': 'Laïque',
      'de-DE': 'Säkular',
    },
    description: {
      default: 'Non-religious wedding ceremony focused on personal commitment',
      'en-US':
        'Modern secular wedding without religious elements, focused on personal vows',
    },
    icon: '💕',
    color: 'pink',
    popularIn: ['en-US', 'en-GB', 'fr-FR', 'de-DE'],
    ceremonies: ['civil_ceremony', 'commitment_ceremony'],
    keyElements: [
      'Personal vows',
      'Celebration of love',
      'Modern elements',
      'Individual expression',
    ],
    seasonalPreferences: [
      'Complete flexibility',
      'Based on personal preference',
    ],
    colorSymbolism: {
      'Personal choice': 'Individual meaning',
      Modern: 'Contemporary values',
    },
    musicStyle: [
      'Contemporary',
      'Personal favorites',
      'Modern love songs',
      'Individual choice',
    ],
    foodTraditions: [
      'Personal preference',
      'Modern catering',
      'Favorite cuisines',
      'Individual style',
    ],
  },
};

// =============================================================================
// COMPONENT INTERFACES
// =============================================================================

export interface WeddingTraditionSelectorProps {
  locale: WeddingMarketLocale;
  direction?: TextDirection;
  selectedTraditions?: WeddingTraditionType[];
  onChange?: (traditions: WeddingTraditionType[]) => void;
  multiSelect?: boolean;
  showDescriptions?: boolean;
  showCulturalInfo?: boolean;
  className?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  maxSelections?: number;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const WeddingTraditionSelector: React.FC<
  WeddingTraditionSelectorProps
> = ({
  locale,
  direction = 'ltr',
  selectedTraditions = [],
  onChange,
  multiSelect = true,
  showDescriptions = true,
  showCulturalInfo = true,
  className = '',
  placeholder = 'Select wedding traditions...',
  required = false,
  disabled = false,
  maxSelections,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTradition, setExpandedTradition] =
    useState<WeddingTraditionType | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter traditions based on search and locale popularity
  const filteredTraditions = Object.entries(WEDDING_TRADITIONS_CONFIG)
    .filter(([key, config]) => {
      const name = config.name[locale] || config.name.default;
      const description =
        config.description[locale] || config.description.default;

      return (
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        key.toLowerCase().includes(searchTerm.toLowerCase())
      );
    })
    .sort(([keyA, configA], [keyB, configB]) => {
      // Prioritize traditions popular in current locale
      const aPopular = configA.popularIn.includes(locale);
      const bPopular = configB.popularIn.includes(locale);

      if (aPopular && !bPopular) return -1;
      if (!aPopular && bPopular) return 1;

      // Then sort alphabetically
      const nameA = configA.name[locale] || configA.name.default;
      const nameB = configB.name[locale] || configB.name.default;
      return nameA.localeCompare(nameB);
    });

  // Handle tradition selection
  const handleTraditionSelect = (tradition: WeddingTraditionType) => {
    if (disabled) return;

    let newSelections: WeddingTraditionType[];

    if (multiSelect) {
      if (selectedTraditions.includes(tradition)) {
        newSelections = selectedTraditions.filter((t) => t !== tradition);
      } else {
        if (maxSelections && selectedTraditions.length >= maxSelections) {
          return; // Max selections reached
        }
        newSelections = [...selectedTraditions, tradition];
      }
    } else {
      newSelections = [tradition];
      setIsOpen(false);
    }

    onChange?.(newSelections);
  };

  const isRTL = direction === 'rtl';
  const popularTraditions = filteredTraditions.filter(([_, config]) =>
    config.popularIn.includes(locale),
  );
  const otherTraditions = filteredTraditions.filter(
    ([_, config]) => !config.popularIn.includes(locale),
  );

  // Get display text
  const getDisplayText = () => {
    if (selectedTraditions.length === 0) return placeholder;
    if (selectedTraditions.length === 1) {
      const config = WEDDING_TRADITIONS_CONFIG[selectedTraditions[0]];
      return config.name[locale] || config.name.default;
    }
    return `${selectedTraditions.length} traditions selected`;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Selection Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-3 border border-gray-300 rounded-lg bg-white
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          hover:border-gray-400 transition-colors duration-200
          ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'cursor-pointer'}
          ${isRTL ? 'text-right' : 'text-left'}
          flex items-center justify-between
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-required={required}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <HeartIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <span
            className={`truncate ${selectedTraditions.length === 0 ? 'text-gray-400' : 'text-gray-900'}`}
          >
            {getDisplayText()}
          </span>
        </div>

        {/* Selected traditions preview */}
        {selectedTraditions.length > 0 && (
          <div className="flex items-center gap-1 mr-2">
            {selectedTraditions.slice(0, 3).map((tradition) => {
              const config = WEDDING_TRADITIONS_CONFIG[tradition];
              return (
                <span
                  key={tradition}
                  className="text-lg"
                  title={config.name[locale] || config.name.default}
                >
                  {config.icon}
                </span>
              );
            })}
            {selectedTraditions.length > 3 && (
              <span className="text-xs text-gray-500">
                +{selectedTraditions.length - 3}
              </span>
            )}
          </div>
        )}

        <ChevronDownIcon
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden"
          >
            {/* Search Input */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search traditions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {/* Popular Traditions */}
              {popularTraditions.length > 0 && searchTerm === '' && (
                <div className="py-2">
                  <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Popular in Your Region
                  </div>
                  {popularTraditions.map(([tradition, config]) => (
                    <TraditionItem
                      key={tradition}
                      tradition={tradition as WeddingTraditionType}
                      config={config}
                      locale={locale}
                      isSelected={selectedTraditions.includes(
                        tradition as WeddingTraditionType,
                      )}
                      isExpanded={expandedTradition === tradition}
                      onClick={() =>
                        handleTraditionSelect(tradition as WeddingTraditionType)
                      }
                      onToggleExpand={() =>
                        setExpandedTradition(
                          expandedTradition === tradition
                            ? null
                            : (tradition as WeddingTraditionType),
                        )
                      }
                      showDescriptions={showDescriptions}
                      showCulturalInfo={showCulturalInfo}
                      direction={direction}
                    />
                  ))}
                </div>
              )}

              {/* Other Traditions */}
              {otherTraditions.length > 0 && (
                <div className="py-2">
                  {searchTerm === '' && popularTraditions.length > 0 && (
                    <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Other Traditions
                    </div>
                  )}
                  {otherTraditions.map(([tradition, config]) => (
                    <TraditionItem
                      key={tradition}
                      tradition={tradition as WeddingTraditionType}
                      config={config}
                      locale={locale}
                      isSelected={selectedTraditions.includes(
                        tradition as WeddingTraditionType,
                      )}
                      isExpanded={expandedTradition === tradition}
                      onClick={() =>
                        handleTraditionSelect(tradition as WeddingTraditionType)
                      }
                      onToggleExpand={() =>
                        setExpandedTradition(
                          expandedTradition === tradition
                            ? null
                            : (tradition as WeddingTraditionType),
                        )
                      }
                      showDescriptions={showDescriptions}
                      showCulturalInfo={showCulturalInfo}
                      direction={direction}
                    />
                  ))}
                </div>
              )}

              {/* No Results */}
              {filteredTraditions.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  <HeartIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <div className="text-sm">No traditions found</div>
                  <div className="text-xs text-gray-400">
                    Try a different search term
                  </div>
                </div>
              )}
            </div>

            {/* Selection Limit Info */}
            {maxSelections && multiSelect && (
              <div className="border-t border-gray-100 p-3">
                <div className="text-xs text-gray-500">
                  {selectedTraditions.length}/{maxSelections} traditions
                  selected
                  {selectedTraditions.length >= maxSelections && (
                    <span className="text-amber-600 ml-2">Maximum reached</span>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// =============================================================================
// TRADITION ITEM COMPONENT
// =============================================================================

interface TraditionItemProps {
  tradition: WeddingTraditionType;
  config: (typeof WEDDING_TRADITIONS_CONFIG)[WeddingTraditionType];
  locale: WeddingMarketLocale;
  isSelected: boolean;
  isExpanded: boolean;
  onClick: () => void;
  onToggleExpand: () => void;
  showDescriptions: boolean;
  showCulturalInfo: boolean;
  direction: TextDirection;
}

const TraditionItem: React.FC<TraditionItemProps> = ({
  tradition,
  config,
  locale,
  isSelected,
  isExpanded,
  onClick,
  onToggleExpand,
  showDescriptions,
  showCulturalInfo,
  direction,
}) => {
  const name = config.name[locale] || config.name.default;
  const description = config.description[locale] || config.description.default;
  const isRTL = direction === 'rtl';

  return (
    <div className={`border-b border-gray-50 last:border-b-0`}>
      <div
        className={`
          px-3 py-3 hover:bg-gray-50 cursor-pointer transition-colors duration-150
          ${isSelected ? 'bg-primary-50' : ''}
          ${isRTL ? 'text-right' : 'text-left'}
        `}
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl flex-shrink-0">{config.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`font-medium ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}
              >
                {name}
              </span>
              {config.popularIn.includes(locale) && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  Popular
                </span>
              )}
            </div>
            {showDescriptions && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showCulturalInfo && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Show cultural information"
              >
                <InfoIcon className="w-4 h-4" />
              </button>
            )}

            {isSelected && <CheckIcon className="w-5 h-5 text-primary-600" />}
          </div>
        </div>
      </div>

      {/* Expanded Cultural Information */}
      <AnimatePresence>
        {isExpanded && showCulturalInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gray-50 px-3 py-4 border-t border-gray-100"
          >
            <div className="space-y-3 text-sm">
              {/* Key Elements */}
              <div>
                <h4 className="font-medium text-gray-700 mb-1">
                  Key Elements:
                </h4>
                <div className="flex flex-wrap gap-1">
                  {config.keyElements.map((element, index) => (
                    <span
                      key={index}
                      className="bg-white px-2 py-1 rounded text-xs text-gray-600 border"
                    >
                      {element}
                    </span>
                  ))}
                </div>
              </div>

              {/* Seasonal Preferences */}
              {config.seasonalPreferences.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">
                    Seasonal Preferences:
                  </h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {config.seasonalPreferences.map((pref, index) => (
                      <li key={index}>• {pref}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Color Symbolism */}
              {Object.keys(config.colorSymbolism).length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">
                    Color Symbolism:
                  </h4>
                  <div className="space-y-1">
                    {Object.entries(config.colorSymbolism).map(
                      ([color, meaning]) => (
                        <div
                          key={color}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span className="font-medium text-gray-600">
                            {color}:
                          </span>
                          <span className="text-gray-500">{meaning}</span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* Music & Food */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">Music:</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {config.musicStyle.slice(0, 3).map((style, index) => (
                      <li key={index}>• {style}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-1">Food:</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {config.foodTraditions.slice(0, 3).map((food, index) => (
                      <li key={index}>• {food}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WeddingTraditionSelector;
