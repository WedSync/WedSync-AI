'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Star,
  AlertCircle,
  Heart,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  type WeddingMarketLocale,
  type WeddingTraditionType,
  type SupportedLanguageCode,
} from '@/types/i18n';
import { cn } from '@/lib/utils';

// =============================================================================
// WEDDING CALENDAR TYPES & INTERFACES
// =============================================================================

export type CalendarSystem =
  | 'gregorian' // Western calendar
  | 'lunar' // Chinese, Korean lunar calendar
  | 'islamic' // Hijri calendar
  | 'hebrew' // Jewish calendar
  | 'hindu' // Hindu calendar systems
  | 'buddhist' // Buddhist calendar
  | 'thai'; // Thai solar calendar

export type DateSignificance =
  | 'auspicious' // Lucky/favorable dates
  | 'inauspicious' // Unlucky dates to avoid
  | 'neutral' // Regular dates
  | 'peak_season' // High-demand wedding season
  | 'off_season' // Lower-demand season
  | 'holiday'; // Cultural/religious holidays

export type SeasonalPreference =
  | 'spring_favored' // Spring weddings preferred
  | 'summer_peak' // Summer is peak season
  | 'autumn_harvest' // Fall harvest celebrations
  | 'winter_intimate' // Winter intimate ceremonies
  | 'monsoon_avoid' // Avoid monsoon seasons
  | 'heat_avoid'; // Avoid extreme heat

export interface CulturalDateRestriction {
  readonly date: Date;
  readonly significance: DateSignificance;
  readonly culture: WeddingTraditionType;
  readonly reason: Record<WeddingMarketLocale, string>;
  readonly alternative_suggestion?: Record<WeddingMarketLocale, string>;
  readonly severity:
    | 'strong_avoid'
    | 'mild_caution'
    | 'preferred'
    | 'highly_favored';
}

export interface WeddingSeasonData {
  readonly season: 'spring' | 'summer' | 'autumn' | 'winter';
  readonly months: readonly number[];
  readonly cultural_significance: Record<
    WeddingTraditionType,
    {
      readonly preference_level: 'avoid' | 'neutral' | 'good' | 'excellent';
      readonly description: Record<WeddingMarketLocale, string>;
      readonly typical_elements: readonly string[];
    }
  >;
  readonly pricing_impact: 'budget' | 'moderate' | 'premium' | 'peak';
  readonly weather_considerations: Record<WeddingMarketLocale, string>;
}

export interface LocalizedCalendarData {
  readonly locale: WeddingMarketLocale;
  readonly calendar_system: CalendarSystem;
  readonly week_starts_on: 0 | 1 | 6; // Sunday=0, Monday=1, Saturday=6
  readonly cultural_restrictions: readonly CulturalDateRestriction[];
  readonly seasonal_preferences: readonly SeasonalPreference[];
  readonly peak_months: readonly number[];
  readonly avoid_months: readonly number[];
  readonly holiday_calendar: readonly {
    readonly date: Date;
    readonly name: Record<WeddingMarketLocale, string>;
    readonly impact_on_weddings: 'avoid' | 'expensive' | 'popular' | 'neutral';
    readonly alternative_dates?: readonly Date[];
  }[];
}

export interface CalendarViewOptions {
  readonly show_cultural_dates: boolean;
  readonly show_pricing_indicators: boolean;
  readonly show_weather_info: boolean;
  readonly highlight_weekends: boolean;
  readonly show_month_overview: boolean;
  readonly selected_traditions: readonly WeddingTraditionType[];
}

export interface DateSelectionEvent {
  readonly date: Date;
  readonly cultural_significance: readonly CulturalDateRestriction[];
  readonly is_available: boolean;
  readonly pricing_tier: 'budget' | 'moderate' | 'premium' | 'peak';
  readonly recommendations: Record<WeddingMarketLocale, string>;
}

// =============================================================================
// CULTURAL CALENDAR DATA
// =============================================================================

const CULTURAL_CALENDAR_DATA: Record<
  WeddingTraditionType,
  LocalizedCalendarData
> = {
  western: {
    locale: 'en-US',
    calendar_system: 'gregorian',
    week_starts_on: 0, // Sunday
    cultural_restrictions: [],
    seasonal_preferences: ['spring_favored', 'summer_peak', 'autumn_harvest'],
    peak_months: [5, 6, 7, 8, 9], // May-September
    avoid_months: [1, 2, 12], // Winter months
    holiday_calendar: [
      {
        date: new Date(new Date().getFullYear(), 11, 25), // December 25
        name: {
          'en-US': 'Christmas Day',
          'en-GB': 'Christmas Day',
          'fr-FR': 'Jour de Noël',
          'es-ES': 'Navidad',
          'de-DE': 'Weihnachten',
        },
        impact_on_weddings: 'avoid',
      },
    ],
  },

  islamic: {
    locale: 'ar-SA',
    calendar_system: 'islamic',
    week_starts_on: 6, // Saturday
    cultural_restrictions: [
      {
        date: new Date(), // Ramadan dates (dynamic)
        significance: 'inauspicious',
        culture: 'islamic',
        reason: {
          'ar-SA': 'شهر رمضان المبارك - وقت للصيام والتأمل',
          'en-US': 'Holy month of Ramadan - time for fasting and reflection',
          'en-GB': 'Holy month of Ramadan - time for fasting and reflection',
          'fr-FR': 'Mois sacré du Ramadan - temps de jeûne et de réflexion',
        },
        alternative_suggestion: {
          'ar-SA': 'يُفضل التخطيط للزفاف بعد عيد الفطر',
          'en-US': 'Consider planning wedding after Eid al-Fitr',
          'en-GB': 'Consider planning wedding after Eid al-Fitr',
          'fr-FR': "Envisagez de planifier le mariage après l'Aïd al-Fitr",
        },
        severity: 'strong_avoid',
      },
    ],
    seasonal_preferences: ['autumn_harvest', 'winter_intimate'],
    peak_months: [10, 11, 12, 1, 2], // Cooler months
    avoid_months: [6, 7, 8], // Extremely hot months
    holiday_calendar: [],
  },

  hindu: {
    locale: 'hi-IN',
    calendar_system: 'hindu',
    week_starts_on: 0, // Sunday
    cultural_restrictions: [],
    seasonal_preferences: [
      'autumn_harvest',
      'winter_intimate',
      'spring_favored',
    ],
    peak_months: [10, 11, 12, 1, 2, 3], // Post-monsoon to spring
    avoid_months: [6, 7, 8, 9], // Monsoon season
    holiday_calendar: [],
  },

  jewish: {
    locale: 'he-IL',
    calendar_system: 'hebrew',
    week_starts_on: 0, // Sunday
    cultural_restrictions: [],
    seasonal_preferences: ['spring_favored', 'summer_peak', 'autumn_harvest'],
    peak_months: [5, 6, 7, 8, 9, 10],
    avoid_months: [9, 10], // High Holy Days period
    holiday_calendar: [],
  },

  chinese: {
    locale: 'zh-CN',
    calendar_system: 'lunar',
    week_starts_on: 1, // Monday
    cultural_restrictions: [],
    seasonal_preferences: ['spring_favored', 'autumn_harvest'],
    peak_months: [4, 5, 9, 10, 11], // Spring and autumn
    avoid_months: [1, 2], // Chinese New Year period
    holiday_calendar: [],
  },

  // Default for other traditions
  korean: {
    locale: 'ko-KR',
    calendar_system: 'lunar',
    week_starts_on: 0,
    cultural_restrictions: [],
    seasonal_preferences: ['spring_favored', 'autumn_harvest'],
    peak_months: [4, 5, 9, 10],
    avoid_months: [1, 2],
    holiday_calendar: [],
  },
} as const;

// =============================================================================
// WEDDING SEASON DATA
// =============================================================================

const WEDDING_SEASON_DATA: readonly WeddingSeasonData[] = [
  {
    season: 'spring',
    months: [3, 4, 5],
    cultural_significance: {
      western: {
        preference_level: 'excellent',
        description: {
          'en-US':
            'Perfect weather, blooming flowers, symbolizes new beginnings',
          'en-GB': 'Lovely weather, blooming gardens, represents fresh starts',
          'fr-FR':
            'Temps parfait, fleurs qui éclosent, symbolise les nouveaux commencements',
        },
        typical_elements: [
          'cherry blossoms',
          'tulips',
          'mild weather',
          'garden venues',
        ],
      },
      islamic: {
        preference_level: 'good',
        description: {
          'ar-SA': 'طقس معتدل ومناسب للاحتفالات',
          'en-US': 'Moderate weather suitable for celebrations',
        },
        typical_elements: ['pleasant temperatures', 'outdoor celebrations'],
      },
      hindu: {
        preference_level: 'excellent',
        description: {
          'hi-IN': 'शुभ मौसम, नए जीवन का प्रतीक',
          'en-US': 'Auspicious season, symbol of new life',
        },
        typical_elements: ['marigolds', 'pleasant weather', 'festival season'],
      },
      chinese: {
        preference_level: 'excellent',
        description: {
          'zh-CN': '万物复苏，寓意美好',
          'en-US': 'Season of renewal and hope',
        },
        typical_elements: ['peonies', 'red decorations', 'family gatherings'],
      },
      jewish: {
        preference_level: 'good',
        description: {
          'he-IL': 'עונת פריחה וחידוש',
          'en-US': 'Season of blossoming and renewal',
        },
        typical_elements: ['outdoor ceremonies', 'garden settings'],
      },
      korean: {
        preference_level: 'excellent',
        description: {
          'ko-KR': '꽃이 피는 계절, 새로운 시작',
          'en-US': 'Blooming season, new beginnings',
        },
        typical_elements: ['cherry blossoms', 'traditional gardens'],
      },
    },
    pricing_impact: 'premium',
    weather_considerations: {
      'en-US': 'Generally mild, occasional spring showers possible',
      'en-GB': 'Mild temperatures, some rain showers likely',
      'ar-SA': 'طقس معتدل مع إمكانية هطول أمطار خفيفة',
    },
  },

  {
    season: 'summer',
    months: [6, 7, 8],
    cultural_significance: {
      western: {
        preference_level: 'excellent',
        description: {
          'en-US': 'Peak wedding season, outdoor venues, long daylight hours',
          'en-GB': 'Peak wedding season, garden parties, extended daylight',
          'fr-FR':
            'Saison de pointe des mariages, venues en plein air, longues heures de jour',
        },
        typical_elements: [
          'outdoor venues',
          'garden parties',
          'beach weddings',
          'long days',
        ],
      },
      islamic: {
        preference_level: 'avoid',
        description: {
          'ar-SA': 'حر شديد، يُفضل تجنب هذا الوقت',
          'en-US': 'Extreme heat, generally avoided',
        },
        typical_elements: ['indoor venues', 'evening ceremonies'],
      },
      hindu: {
        preference_level: 'avoid',
        description: {
          'hi-IN': 'गर्मी का मौसम, मानसून से पहले',
          'en-US': 'Hot season, pre-monsoon period',
        },
        typical_elements: ['indoor celebrations', 'early morning ceremonies'],
      },
      chinese: {
        preference_level: 'neutral',
        description: {
          'zh-CN': '夏季炎热，需要考虑天气',
          'en-US': 'Hot summer, weather considerations needed',
        },
        typical_elements: ['indoor venues', 'evening celebrations'],
      },
      jewish: {
        preference_level: 'good',
        description: {
          'he-IL': 'קיץ חם, אבל פופולרי לחתונות',
          'en-US': 'Hot summer, but popular for weddings',
        },
        typical_elements: ['evening ceremonies', 'outdoor venues'],
      },
      korean: {
        preference_level: 'neutral',
        description: {
          'ko-KR': '더운 여름, 실내 행사 선호',
          'en-US': 'Hot summer, indoor events preferred',
        },
        typical_elements: ['indoor venues', 'air conditioning important'],
      },
    },
    pricing_impact: 'peak',
    weather_considerations: {
      'en-US': 'Hot temperatures, potential for storms, high demand',
      'en-GB': 'Warm weather, occasional thunderstorms',
      'ar-SA': 'حرارة مرتفعة جداً، ضرورة التكييف',
    },
  },
] as const;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export interface LocalizedWeddingCalendarProps {
  locale?: WeddingMarketLocale;
  selectedTraditions?: readonly WeddingTraditionType[];
  onDateSelect?: (event: DateSelectionEvent) => void;
  viewOptions?: Partial<CalendarViewOptions>;
  minDate?: Date;
  maxDate?: Date;
  selectedDate?: Date;
  showLegend?: boolean;
  showSeasonalAdvice?: boolean;
  className?: string;
}

export const LocalizedWeddingCalendar: React.FC<
  LocalizedWeddingCalendarProps
> = ({
  locale = 'en-US',
  selectedTraditions = ['western'],
  onDateSelect,
  viewOptions = {},
  minDate,
  maxDate,
  selectedDate,
  showLegend = true,
  showSeasonalAdvice = true,
  className = '',
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [selectedDateState, setSelectedDateState] = useState<Date | null>(
    selectedDate || null,
  );

  const options: CalendarViewOptions = {
    show_cultural_dates: true,
    show_pricing_indicators: true,
    show_weather_info: true,
    highlight_weekends: true,
    show_month_overview: true,
    selected_traditions: selectedTraditions,
    ...viewOptions,
  };

  // Get cultural data for selected traditions
  const culturalData = useMemo(() => {
    return selectedTraditions.map(
      (tradition) =>
        CULTURAL_CALENDAR_DATA[tradition] || CULTURAL_CALENDAR_DATA.western,
    );
  }, [selectedTraditions]);

  // Get current season data
  const currentSeason = useMemo(() => {
    const month = currentDate.getMonth() + 1;
    return (
      WEDDING_SEASON_DATA.find((season) => season.months.includes(month)) ||
      WEDDING_SEASON_DATA[0]
    );
  }, [currentDate]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      significance: DateSignificance[];
      cultural_restrictions: CulturalDateRestriction[];
      pricing_tier: 'budget' | 'moderate' | 'premium' | 'peak';
      is_weekend: boolean;
      is_holiday: boolean;
    }> = [];

    // Add days from previous month
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({
        date,
        isCurrentMonth: false,
        significance: [],
        cultural_restrictions: [],
        pricing_tier: 'budget',
        is_weekend: date.getDay() === 0 || date.getDay() === 6,
        is_holiday: false,
      });
    }

    // Add days from current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const monthNum = month + 1;

      // Determine pricing tier based on season and cultural preferences
      let pricing_tier: 'budget' | 'moderate' | 'premium' | 'peak' = 'moderate';

      for (const data of culturalData) {
        if (data.peak_months.includes(monthNum)) {
          pricing_tier = 'peak';
          break;
        } else if (data.avoid_months.includes(monthNum)) {
          pricing_tier = 'budget';
        }
      }

      // Apply seasonal pricing
      if (currentSeason.pricing_impact === 'peak') pricing_tier = 'peak';
      else if (
        currentSeason.pricing_impact === 'premium' &&
        pricing_tier === 'moderate'
      ) {
        pricing_tier = 'premium';
      }

      days.push({
        date,
        isCurrentMonth: true,
        significance: [],
        cultural_restrictions: [],
        pricing_tier,
        is_weekend: date.getDay() === 0 || date.getDay() === 6,
        is_holiday: false,
      });
    }

    // Add days from next month
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        significance: [],
        cultural_restrictions: [],
        pricing_tier: 'budget',
        is_weekend: date.getDay() === 0 || date.getDay() === 6,
        is_holiday: false,
      });
    }

    return days;
  }, [currentDate, culturalData, currentSeason]);

  // Handle date selection
  const handleDateSelect = useCallback(
    (date: Date) => {
      setSelectedDateState(date);

      if (onDateSelect) {
        const dayData = calendarDays.find(
          (day) => day.date.toDateString() === date.toDateString(),
        );

        const event: DateSelectionEvent = {
          date,
          cultural_significance: dayData?.cultural_restrictions || [],
          is_available: true,
          pricing_tier: dayData?.pricing_tier || 'moderate',
          recommendations: {
            [locale]: `Selected date: ${date.toLocaleDateString(locale)}`,
          },
        };

        onDateSelect(event);
      }
    },
    [onDateSelect, calendarDays, locale],
  );

  // Navigation handlers
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Month names in different locales
  const getMonthName = useCallback(
    (date: Date) => {
      return date.toLocaleDateString(locale, {
        month: 'long',
        year: 'numeric',
      });
    },
    [locale],
  );

  // Week day names
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - date.getDay() + i);
      days.push(date.toLocaleDateString(locale, { weekday: 'short' }));
    }
    return days;
  }, [locale]);

  // Pricing indicator colors
  const getPricingColor = (
    tier: 'budget' | 'moderate' | 'premium' | 'peak',
  ) => {
    switch (tier) {
      case 'budget':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'moderate':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'premium':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'peak':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  return (
    <div
      className={cn(
        'wedding-calendar bg-white rounded-lg shadow-sm border p-6',
        className,
      )}
    >
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            {locale.startsWith('ar') ? 'تقويم الزفاف' : 'Wedding Calendar'}
          </h3>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h4 className="text-xl font-medium text-gray-800 min-w-[200px] text-center">
            {getMonthName(currentDate)}
          </h4>

          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* View Options */}
        <div className="flex items-center space-x-2">
          {options.show_pricing_indicators && (
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <span className="w-3 h-3 bg-green-100 border border-green-200 rounded"></span>
              <span>Budget</span>
              <span className="w-3 h-3 bg-red-100 border border-red-200 rounded ml-2"></span>
              <span>Peak</span>
            </div>
          )}
        </div>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, index) => (
          <div
            key={index}
            className="p-2 text-center text-sm font-medium text-gray-600"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        <AnimatePresence mode="wait">
          {calendarDays.map((day, index) => (
            <motion.button
              key={`${day.date.toISOString()}-${index}`}
              onClick={() => day.isCurrentMonth && handleDateSelect(day.date)}
              className={cn(
                'relative p-2 h-12 text-sm border rounded-lg transition-all',
                'hover:shadow-sm',
                day.isCurrentMonth
                  ? 'text-gray-900 border-gray-200 hover:border-blue-300'
                  : 'text-gray-400 border-transparent',
                day.is_weekend && options.highlight_weekends
                  ? 'bg-blue-50'
                  : 'bg-white hover:bg-gray-50',
                selectedDateState?.toDateString() === day.date.toDateString()
                  ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50'
                  : '',
                options.show_pricing_indicators && day.isCurrentMonth
                  ? getPricingColor(day.pricing_tier)
                  : '',
                !day.isCurrentMonth ? 'opacity-30' : '',
              )}
              disabled={!day.isCurrentMonth}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: index * 0.01 }}
            >
              <span className="font-medium">{day.date.getDate()}</span>

              {/* Cultural significance indicators */}
              {options.show_cultural_dates &&
                day.cultural_restrictions.length > 0 && (
                  <div className="absolute top-1 right-1">
                    <Star className="w-3 h-3 text-amber-500" />
                  </div>
                )}

              {/* Holiday indicator */}
              {day.is_holiday && (
                <div className="absolute bottom-1 left-1">
                  <Heart className="w-3 h-3 text-red-500" />
                </div>
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Seasonal Advice */}
      {showSeasonalAdvice && (
        <motion.div
          className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">
                {currentSeason.season.charAt(0).toUpperCase() +
                  currentSeason.season.slice(1)}{' '}
                Wedding Season
              </h4>
              <p className="text-sm text-blue-800">
                {currentSeason.weather_considerations[locale] ||
                  currentSeason.weather_considerations['en-US']}
              </p>
              <div className="mt-2 text-xs text-blue-700">
                <span className="font-medium">Pricing: </span>
                <span
                  className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    currentSeason.pricing_impact === 'peak'
                      ? 'bg-red-100 text-red-800'
                      : currentSeason.pricing_impact === 'premium'
                        ? 'bg-orange-100 text-orange-800'
                        : currentSeason.pricing_impact === 'moderate'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800',
                  )}
                >
                  {currentSeason.pricing_impact}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Legend */}
      {showLegend && options.show_pricing_indicators && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h5 className="text-sm font-medium text-gray-700 mb-2">
            {locale.startsWith('ar') ? 'دليل الأسعار' : 'Pricing Guide'}
          </h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-green-100 border border-green-200 rounded"></span>
              <span>Budget Season</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></span>
              <span>Moderate</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></span>
              <span>Premium</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-red-100 border border-red-200 rounded"></span>
              <span>Peak Season</span>
            </div>
          </div>
        </div>
      )}

      {/* Selected Date Info */}
      {selectedDateState && (
        <motion.div
          className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
        >
          <h5 className="font-medium text-gray-900 mb-1">
            {selectedDateState.toLocaleDateString(locale, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </h5>
          <p className="text-sm text-gray-600">
            {locale.startsWith('ar')
              ? 'تاريخ محدد للزفاف'
              : 'Selected wedding date'}
          </p>
        </motion.div>
      )}
    </div>
  );
};

// =============================================================================
// ADDITIONAL UTILITY COMPONENTS
// =============================================================================

export interface WeddingDateRecommendationProps {
  locale?: WeddingMarketLocale;
  traditions?: readonly WeddingTraditionType[];
  budget?: 'low' | 'medium' | 'high';
  guestCount?: number;
  preferredSeason?: 'spring' | 'summer' | 'autumn' | 'winter' | 'any';
  className?: string;
}

export const WeddingDateRecommendation: React.FC<
  WeddingDateRecommendationProps
> = ({
  locale = 'en-US',
  traditions = ['western'],
  budget = 'medium',
  guestCount = 100,
  preferredSeason = 'any',
  className = '',
}) => {
  const recommendations = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const suggestions: Array<{
      month: number;
      monthName: string;
      reasons: string[];
      pricing: 'budget' | 'moderate' | 'premium' | 'peak';
    }> = [];

    // Generate recommendations based on preferences
    WEDDING_SEASON_DATA.forEach((season) => {
      if (preferredSeason !== 'any' && season.season !== preferredSeason)
        return;

      season.months.forEach((month) => {
        const monthName = new Date(
          currentYear,
          month - 1,
          1,
        ).toLocaleDateString(locale, { month: 'long' });

        const reasons: string[] = [];

        // Check cultural preferences
        traditions.forEach((tradition) => {
          const significance = season.cultural_significance[tradition];
          if (significance && significance.preference_level === 'excellent') {
            reasons.push(
              significance.description[locale] ||
                significance.description['en-US'],
            );
          }
        });

        suggestions.push({
          month,
          monthName,
          reasons,
          pricing: season.pricing_impact,
        });
      });
    });

    return suggestions
      .filter((s) => {
        // Filter by budget
        if (budget === 'low')
          return s.pricing === 'budget' || s.pricing === 'moderate';
        if (budget === 'medium') return s.pricing !== 'peak';
        return true; // high budget - all options
      })
      .slice(0, 6); // Top 6 recommendations
  }, [locale, traditions, budget, preferredSeason]);

  return (
    <div className={cn('wedding-date-recommendations', className)}>
      <h4 className="text-lg font-semibold text-gray-900 mb-4">
        {locale.startsWith('ar') ? 'توصيات التواريخ' : 'Date Recommendations'}
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map(
          ({ month, monthName, reasons, pricing }, index) => (
            <motion.div
              key={`${month}-${index}`}
              className={cn(
                'p-4 rounded-lg border-2 transition-all cursor-pointer',
                'hover:shadow-md hover:scale-105',
                pricing === 'budget'
                  ? 'border-green-200 bg-green-50'
                  : pricing === 'moderate'
                    ? 'border-blue-200 bg-blue-50'
                    : pricing === 'premium'
                      ? 'border-orange-200 bg-orange-50'
                      : 'border-red-200 bg-red-50',
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-gray-900">{monthName}</h5>
                <span
                  className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    pricing === 'budget'
                      ? 'bg-green-100 text-green-800'
                      : pricing === 'moderate'
                        ? 'bg-blue-100 text-blue-800'
                        : pricing === 'premium'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-red-100 text-red-800',
                  )}
                >
                  {pricing}
                </span>
              </div>

              {reasons.length > 0 && (
                <p className="text-sm text-gray-600 line-clamp-3">
                  {reasons[0]}
                </p>
              )}
            </motion.div>
          ),
        )}
      </div>
    </div>
  );
};

export default LocalizedWeddingCalendar;
