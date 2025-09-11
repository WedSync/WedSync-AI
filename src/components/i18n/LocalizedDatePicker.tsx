'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
} from 'lucide-react';
import {
  type WeddingMarketLocale,
  type DateFormatType,
  type TextDirection,
  type WeddingTimezone,
  type Season,
} from '@/types/i18n';

// =============================================================================
// DATE UTILITIES & CONFIGURATIONS
// =============================================================================

const MONTHS_LOCALIZED: Record<WeddingMarketLocale, string[]> = {
  'en-US': [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  'en-GB': [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  'es-ES': [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ],
  'es-MX': [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ],
  'fr-FR': [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ],
  'it-IT': [
    'Gennaio',
    'Febbraio',
    'Marzo',
    'Aprile',
    'Maggio',
    'Giugno',
    'Luglio',
    'Agosto',
    'Settembre',
    'Ottobre',
    'Novembre',
    'Dicembre',
  ],
  'de-DE': [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
  ],
  'ar-AE': [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ],
  'hi-IN': [
    'जनवरी',
    'फरवरी',
    'मार्च',
    'अप्रैल',
    'मई',
    'जून',
    'जुलाई',
    'अगस्त',
    'सितम्बर',
    'अक्टूबर',
    'नवम्बर',
    'दिसम्बर',
  ],
  'zh-CN': [
    '一月',
    '二月',
    '三月',
    '四月',
    '五月',
    '六月',
    '七月',
    '八月',
    '九月',
    '十月',
    '十一月',
    '十二月',
  ],
};

const WEEKDAYS_LOCALIZED: Record<WeddingMarketLocale, string[]> = {
  'en-US': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  'en-GB': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  'es-ES': ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  'es-MX': ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  'fr-FR': ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
  'it-IT': ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'],
  'de-DE': ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  'ar-AE': ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب'],
  'hi-IN': ['रवि', 'सोम', 'मंग', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
  'zh-CN': ['日', '一', '二', '三', '四', '五', '六'],
};

const WEDDING_SEASON_PREFERENCES: Record<
  WeddingMarketLocale,
  { peak: Season[]; avoid: Season[]; notes: string }
> = {
  'en-US': {
    peak: ['spring', 'summer'],
    avoid: ['winter'],
    notes: 'Most popular: May, June, September, October',
  },
  'en-GB': {
    peak: ['summer'],
    avoid: ['winter'],
    notes: 'Peak season: June-September due to weather',
  },
  'es-ES': {
    peak: ['spring', 'summer'],
    avoid: ['winter'],
    notes: 'May-October preferred, avoid August heat',
  },
  'es-MX': {
    peak: ['autumn', 'winter'],
    avoid: ['summer'],
    notes: 'November-February ideal, avoid rainy season',
  },
  'fr-FR': {
    peak: ['spring', 'summer'],
    avoid: ['winter'],
    notes: 'May-September preferred',
  },
  'it-IT': {
    peak: ['spring', 'summer'],
    avoid: ['winter'],
    notes: 'April-October, May and September most popular',
  },
  'de-DE': {
    peak: ['summer'],
    avoid: ['winter'],
    notes: 'June-August peak, May and September good',
  },
  'ar-AE': {
    peak: ['autumn', 'winter'],
    avoid: ['summer'],
    notes: 'November-March ideal, avoid extreme heat',
  },
  'hi-IN': {
    peak: ['winter'],
    avoid: ['summer'],
    notes: 'November-February preferred, avoid monsoon',
  },
  'zh-CN': {
    peak: ['spring', 'autumn'],
    avoid: ['summer'],
    notes: 'April-May, September-October ideal',
  },
};

// Cultural date restrictions
const getCulturalRestrictions = (locale: WeddingMarketLocale) => {
  const restrictions: Record<
    WeddingMarketLocale,
    {
      avoidDays: number[];
      luckyDates: number[];
      unluckyDates: number[];
      specialConsiderations: string[];
    }
  > = {
    'en-US': {
      avoidDays: [],
      luckyDates: [8, 18, 28],
      unluckyDates: [13],
      specialConsiderations: ['Friday the 13th considered unlucky'],
    },
    'en-GB': {
      avoidDays: [],
      luckyDates: [],
      unluckyDates: [13],
      specialConsiderations: ['May weddings traditionally avoided'],
    },
    'zh-CN': {
      avoidDays: [],
      luckyDates: [8, 18, 28],
      unluckyDates: [4, 14],
      specialConsiderations: [
        'Lunar calendar dates preferred',
        'Avoid ghost month (7th lunar month)',
      ],
    },
    'hi-IN': {
      avoidDays: [2], // Tuesday
      luckyDates: [1, 3, 5, 7, 9, 11, 13, 15],
      unluckyDates: [4, 8, 14],
      specialConsiderations: [
        'Consult Hindu calendar for auspicious dates',
        'Avoid eclipse dates',
      ],
    },
    'ar-AE': {
      avoidDays: [5], // Friday prayers
      luckyDates: [],
      unluckyDates: [],
      specialConsiderations: [
        'Avoid Ramadan and Hajj periods',
        'Consider Islamic calendar',
      ],
    },
  };

  return restrictions[locale] || restrictions['en-US'];
};

const formatDate = (
  date: Date,
  format: DateFormatType,
  locale: WeddingMarketLocale,
): string => {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const monthName =
    MONTHS_LOCALIZED[locale]?.[date.getMonth()] ||
    MONTHS_LOCALIZED['en-US'][date.getMonth()];

  switch (format) {
    case 'MM/DD/YYYY':
      return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
    case 'DD/MM/YYYY':
      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    case 'DD.MM.YYYY':
      return `${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}.${year}`;
    case 'MMMM DD, YYYY':
      return `${monthName} ${day}, ${year}`;
    case 'DD MMMM YYYY':
      return `${day} ${monthName} ${year}`;
    case 'YYYY年MM月DD日':
      return `${year}年${month}月${day}日`;
    case 'YYYY/MM/DD':
      return `${year}/${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
    default:
      return date.toLocaleDateString(locale);
  }
};

// =============================================================================
// COMPONENT INTERFACES
// =============================================================================

export interface LocalizedDatePickerProps {
  locale: WeddingMarketLocale;
  direction?: TextDirection;
  dateFormat?: DateFormatType;
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  weddingContext?: {
    isWeddingDate?: boolean;
    showSeasonalTips?: boolean;
    showCulturalGuidance?: boolean;
    allowWeekends?: boolean;
    highlightLuckyDates?: boolean;
  };
  onSeasonChange?: (season: Season) => void;
  timezone?: WeddingTimezone;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const LocalizedDatePicker: React.FC<LocalizedDatePickerProps> = ({
  locale,
  direction = 'ltr',
  dateFormat = 'MM/DD/YYYY',
  value,
  onChange,
  minDate,
  maxDate,
  placeholder,
  className = '',
  disabled = false,
  required = false,
  weddingContext = {},
  onSeasonChange,
  timezone,
}) => {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value || new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(value || null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // Localized data
  const months = MONTHS_LOCALIZED[locale] || MONTHS_LOCALIZED['en-US'];
  const weekdays = WEEKDAYS_LOCALIZED[locale] || WEEKDAYS_LOCALIZED['en-US'];
  const culturalRestrictions = getCulturalRestrictions(locale);
  const seasonalInfo =
    WEDDING_SEASON_PREFERENCES[locale] || WEDDING_SEASON_PREFERENCES['en-US'];

  // Close calendar on outside click
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

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayWeekday; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  // Check if date is disabled
  const isDateDisabled = (date: Date): boolean => {
    if (disabled) return true;
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;

    // Wedding context restrictions
    if (
      weddingContext.allowWeekends === false &&
      (date.getDay() === 0 || date.getDay() === 6)
    ) {
      return true;
    }

    // Cultural restrictions
    if (culturalRestrictions.avoidDays.includes(date.getDay())) {
      return true;
    }

    return false;
  };

  // Check if date is lucky/unlucky
  const getDateSignificance = (date: Date): 'lucky' | 'unlucky' | 'neutral' => {
    const day = date.getDate();

    if (culturalRestrictions.luckyDates.includes(day)) return 'lucky';
    if (culturalRestrictions.unluckyDates.includes(day)) return 'unlucky';

    return 'neutral';
  };

  // Get season from date
  const getSeasonFromDate = (date: Date): Season => {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  };

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    if (isDateDisabled(date)) return;

    setSelectedDate(date);
    onChange?.(date);
    setIsOpen(false);

    // Notify season change
    const season = getSeasonFromDate(date);
    onSeasonChange?.(season);
  };

  // Handle month navigation
  const handlePreviousMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  };

  // Handle year/month direct selection
  const handleMonthYearChange = (monthIndex: number, year: number) => {
    setCurrentMonth(new Date(year, monthIndex, 1));
  };

  const calendarDays = generateCalendarDays();
  const isRTL = direction === 'rtl';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Input Field */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          hover:border-gray-400 transition-colors duration-200
          ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'cursor-pointer'}
          ${isRTL ? 'text-right' : 'text-left'}
          flex items-center justify-between
        `}
        aria-label="Select date"
        aria-expanded={isOpen}
        aria-required={required}
      >
        <span
          className={`flex-1 ${!selectedDate ? 'text-gray-400' : 'text-gray-900'}`}
        >
          {selectedDate
            ? formatDate(selectedDate, dateFormat, locale)
            : placeholder || 'Select date'}
        </span>
        <CalendarIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>

      {/* Calendar Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 w-full min-w-80"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <button
                type="button"
                onClick={handlePreviousMonth}
                className="p-1 hover:bg-gray-100 rounded"
                aria-label="Previous month"
              >
                <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
              </button>

              <div className="flex items-center gap-2">
                <select
                  value={currentMonth.getMonth()}
                  onChange={(e) =>
                    handleMonthYearChange(
                      parseInt(e.target.value),
                      currentMonth.getFullYear(),
                    )
                  }
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  {months.map((month, index) => (
                    <option key={index} value={index}>
                      {month}
                    </option>
                  ))}
                </select>

                <select
                  value={currentMonth.getFullYear()}
                  onChange={(e) =>
                    handleMonthYearChange(
                      currentMonth.getMonth(),
                      parseInt(e.target.value),
                    )
                  }
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  {Array.from({ length: 21 }, (_, i) => {
                    const year = new Date().getFullYear() - 1 + i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-gray-100 rounded"
                aria-label="Next month"
              >
                <ChevronRightIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekdays.map((weekday, index) => (
                  <div
                    key={index}
                    className="text-center text-xs font-medium text-gray-500 py-2"
                  >
                    {weekday}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, index) => {
                  if (!date) {
                    return <div key={index} className="p-2" />;
                  }

                  const isSelected =
                    selectedDate &&
                    date.toDateString() === selectedDate.toDateString();
                  const isToday =
                    date.toDateString() === new Date().toDateString();
                  const isDisabled = isDateDisabled(date);
                  const significance = weddingContext.highlightLuckyDates
                    ? getDateSignificance(date)
                    : 'neutral';
                  const isHovered =
                    hoveredDate &&
                    date.toDateString() === hoveredDate.toDateString();

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleDateSelect(date)}
                      onMouseEnter={() => setHoveredDate(date)}
                      onMouseLeave={() => setHoveredDate(null)}
                      disabled={isDisabled}
                      className={`
                        p-2 text-sm text-center rounded hover:bg-gray-100 transition-colors duration-150
                        ${isSelected ? 'bg-primary-600 text-white hover:bg-primary-700' : ''}
                        ${isToday && !isSelected ? 'bg-primary-100 text-primary-900 font-semibold' : ''}
                        ${isDisabled ? 'text-gray-300 cursor-not-allowed hover:bg-transparent' : ''}
                        ${significance === 'lucky' && !isSelected ? 'bg-green-50 text-green-700 border border-green-200' : ''}
                        ${significance === 'unlucky' && !isSelected ? 'bg-red-50 text-red-700' : ''}
                        ${isHovered && !isSelected && !isDisabled ? 'bg-gray-100' : ''}
                      `}
                      title={
                        significance === 'lucky'
                          ? 'Lucky date'
                          : significance === 'unlucky'
                            ? 'Traditionally avoided'
                            : ''
                      }
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Wedding Context Info */}
            {weddingContext.showSeasonalTips && selectedDate && (
              <div className="border-t border-gray-100 p-4">
                <div className="text-xs text-gray-600 mb-2">
                  <strong>Season:</strong> {getSeasonFromDate(selectedDate)}
                </div>
                <div className="text-xs text-gray-600">
                  {seasonalInfo.notes}
                </div>
              </div>
            )}

            {/* Cultural Guidance */}
            {weddingContext.showCulturalGuidance &&
              culturalRestrictions.specialConsiderations.length > 0 && (
                <div className="border-t border-gray-100 p-4">
                  <div className="text-xs font-medium text-gray-700 mb-2">
                    Cultural Considerations:
                  </div>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {culturalRestrictions.specialConsiderations.map(
                      (consideration, index) => (
                        <li key={index}>• {consideration}</li>
                      ),
                    )}
                  </ul>
                </div>
              )}

            {/* Clear Button */}
            {selectedDate && (
              <div className="border-t border-gray-100 p-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(null);
                    onChange?.(null);
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  <XIcon className="w-4 h-4" />
                  Clear selection
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LocalizedDatePicker;
