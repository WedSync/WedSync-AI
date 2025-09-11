'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { useCulturalAdaptations } from './MobileCulturalAdaptations';
import { useRTL } from './MobileRTLLayout';
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import {
  enUS,
  es,
  fr,
  de,
  it,
  ar,
  he,
  zhCN,
  ja,
  ko,
  hi,
  ru,
} from 'date-fns/locale';

// Cultural calendar systems and preferences
export interface CulturalCalendarConfig {
  weekStart: number; // 0 = Sunday, 1 = Monday, etc.
  calendar: 'gregorian' | 'hijri' | 'hebrew' | 'chinese' | 'indian';
  dateFormat: string;
  monthFormat: string;
  yearFormat: string;
  weekdayFormat: 'short' | 'long' | 'narrow';
  monthNames: string[];
  weekdayNames: string[];
  culturalHolidays: CulturalHoliday[];
  auspiciousDates?: AuspiciousDate[];
  avoidedDates?: AvoidedDate[];
}

export interface CulturalHoliday {
  id: string;
  name: string;
  date: string | ((year: number) => Date); // ISO string or function for calculated dates
  type: 'religious' | 'cultural' | 'national' | 'wedding-related';
  significance: 'major' | 'minor';
  description?: string;
  weddingImpact?: 'avoided' | 'preferred' | 'neutral';
  color?: string;
}

export interface AuspiciousDate {
  date: Date;
  reason: string;
  score: number; // 1-10, 10 being most auspicious
}

export interface AvoidedDate {
  date: Date;
  reason: string;
  severity: 'strongly-avoided' | 'mildly-avoided';
}

// Cultural calendar configurations
export const CULTURAL_CALENDARS: Record<string, CulturalCalendarConfig> = {
  'en-US': {
    weekStart: 0, // Sunday
    calendar: 'gregorian',
    dateFormat: 'MM/dd/yyyy',
    monthFormat: 'MMMM yyyy',
    yearFormat: 'yyyy',
    weekdayFormat: 'short',
    monthNames: [
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
    weekdayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    culturalHolidays: [
      {
        id: 'valentines',
        name: "Valentine's Day",
        date: '02-14',
        type: 'wedding-related',
        significance: 'major',
        weddingImpact: 'preferred',
        color: '#ef4444',
      },
      {
        id: 'christmas',
        name: 'Christmas',
        date: '12-25',
        type: 'religious',
        significance: 'major',
        weddingImpact: 'avoided',
        color: '#10b981',
      },
    ],
  },
  'ar-SA': {
    weekStart: 6, // Saturday
    calendar: 'hijri',
    dateFormat: 'dd/MM/yyyy',
    monthFormat: 'MMMM yyyy',
    yearFormat: 'yyyy',
    weekdayFormat: 'short',
    monthNames: [
      'محرم',
      'صفر',
      'ربيع الأول',
      'ربيع الثاني',
      'جمادى الأولى',
      'جمادى الثانية',
      'رجب',
      'شعبان',
      'رمضان',
      'شوال',
      'ذو القعدة',
      'ذو الحجة',
    ],
    weekdayNames: ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'],
    culturalHolidays: [
      {
        id: 'ramadan',
        name: 'شهر رمضان',
        date: (year) => new Date(year, 3, 15), // Approximate, would need proper calculation
        type: 'religious',
        significance: 'major',
        weddingImpact: 'avoided',
        color: '#10b981',
        description: 'Holy month of fasting',
      },
      {
        id: 'eid-fitr',
        name: 'عيد الفطر',
        date: (year) => new Date(year, 4, 15), // Approximate
        type: 'religious',
        significance: 'major',
        weddingImpact: 'preferred',
        color: '#f59e0b',
      },
    ],
  },
  'zh-CN': {
    weekStart: 1, // Monday
    calendar: 'chinese',
    dateFormat: 'yyyy-MM-dd',
    monthFormat: 'yyyy年 MM月',
    yearFormat: 'yyyy年',
    weekdayFormat: 'short',
    monthNames: [
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
    weekdayNames: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
    culturalHolidays: [
      {
        id: 'spring-festival',
        name: '春节',
        date: (year) => new Date(year, 1, 10), // Approximate Chinese New Year
        type: 'cultural',
        significance: 'major',
        weddingImpact: 'preferred',
        color: '#dc2626',
      },
      {
        id: 'qingming',
        name: '清明节',
        date: '04-04',
        type: 'cultural',
        significance: 'major',
        weddingImpact: 'avoided',
        color: '#6b7280',
      },
    ],
    auspiciousDates: [], // Would be calculated based on Chinese calendar
    avoidedDates: [], // Would include ghost month dates
  },
  'hi-IN': {
    weekStart: 0, // Sunday
    calendar: 'indian',
    dateFormat: 'dd/MM/yyyy',
    monthFormat: 'MMMM yyyy',
    yearFormat: 'yyyy',
    weekdayFormat: 'short',
    monthNames: [
      'जनवरी',
      'फरवरी',
      'मार्च',
      'अप्रैल',
      'मई',
      'जून',
      'जुलाई',
      'अगस्त',
      'सितंबर',
      'अक्टूबर',
      'नवंबर',
      'दिसंबर',
    ],
    weekdayNames: ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
    culturalHolidays: [
      {
        id: 'diwali',
        name: 'दीपावली',
        date: (year) => new Date(year, 9, 20), // Approximate
        type: 'religious',
        significance: 'major',
        weddingImpact: 'preferred',
        color: '#f59e0b',
      },
      {
        id: 'holi',
        name: 'होली',
        date: (year) => new Date(year, 2, 15), // Approximate
        type: 'religious',
        significance: 'major',
        weddingImpact: 'avoided',
        color: '#ec4899',
      },
    ],
  },
  'ja-JP': {
    weekStart: 0, // Sunday
    calendar: 'gregorian',
    dateFormat: 'yyyy/MM/dd',
    monthFormat: 'yyyy年 M月',
    yearFormat: 'yyyy年',
    weekdayFormat: 'narrow',
    monthNames: [
      '1月',
      '2月',
      '3月',
      '4月',
      '5月',
      '6月',
      '7月',
      '8月',
      '9月',
      '10月',
      '11月',
      '12月',
    ],
    weekdayNames: ['日', '月', '火', '水', '木', '金', '土'],
    culturalHolidays: [
      {
        id: 'golden-week',
        name: 'ゴールデンウィーク',
        date: '04-29',
        type: 'national',
        significance: 'major',
        weddingImpact: 'preferred',
        color: '#f59e0b',
      },
      {
        id: 'obon',
        name: 'お盆',
        date: '08-15',
        type: 'cultural',
        significance: 'major',
        weddingImpact: 'avoided',
        color: '#6b7280',
      },
    ],
  },
};

// Date-fns locale mapping
const LOCALE_MAP = {
  'en-US': enUS,
  'es-ES': es,
  'fr-FR': fr,
  'de-DE': de,
  'it-IT': it,
  'ar-SA': ar,
  'he-IL': he,
  'zh-CN': zhCN,
  'ja-JP': ja,
  'ko-KR': ko,
  'hi-IN': hi,
  'ru-RU': ru,
} as const;

export interface MobileCulturalCalendarProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onMonthChange?: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  showHolidays?: boolean;
  showAuspiciousDates?: boolean;
  highlightWeddingDates?: boolean;
  className?: string;
}

export const MobileCulturalCalendar: React.FC<MobileCulturalCalendarProps> = ({
  selectedDate,
  onDateSelect,
  onMonthChange,
  minDate,
  maxDate,
  showHolidays = true,
  showAuspiciousDates = true,
  highlightWeddingDates = true,
  className = '',
}) => {
  const { preferences } = useCulturalAdaptations();
  const { isRTL, rtlClass } = useRTL();

  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());
  const [isAnimating, setIsAnimating] = useState(false);

  const cultureCode = `${preferences.language}-${preferences.region}`;
  const calendarConfig =
    CULTURAL_CALENDARS[cultureCode] || CULTURAL_CALENDARS['en-US'];
  const locale = LOCALE_MAP[cultureCode as keyof typeof LOCALE_MAP] || enUS;

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfWeek(currentMonth, {
      weekStartsOn: calendarConfig.weekStart as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    });
    const end = endOfWeek(currentMonth, {
      weekStartsOn: calendarConfig.weekStart as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    });

    const days = [];
    let day = start;

    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentMonth, calendarConfig.weekStart]);

  // Get holidays for current month
  const getHolidaysForDate = (date: Date) => {
    return calendarConfig.culturalHolidays.filter((holiday) => {
      if (typeof holiday.date === 'string') {
        const [month, day] = holiday.date.split('-').map(Number);
        return date.getMonth() + 1 === month && date.getDate() === day;
      } else {
        const holidayDate = holiday.date(date.getFullYear());
        return isSameDay(holidayDate, date);
      }
    });
  };

  // Check if date is auspicious
  const isAuspiciousDate = (date: Date) => {
    if (!showAuspiciousDates) return null;
    return calendarConfig.auspiciousDates?.find((auspicious) =>
      isSameDay(auspicious.date, date),
    );
  };

  // Check if date should be avoided
  const isAvoidedDate = (date: Date) => {
    return calendarConfig.avoidedDates?.find((avoided) =>
      isSameDay(avoided.date, date),
    );
  };

  const handlePreviousMonth = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleNextMonth = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleDateClick = (date: Date) => {
    if (minDate && date < minDate) return;
    if (maxDate && date > maxDate) return;
    onDateSelect?.(date);
  };

  const getDayClassName = (date: Date) => {
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    const isToday = isSameDay(date, new Date());
    const isCurrentMonth = isSameMonth(date, currentMonth);
    const isDisabled =
      (minDate && date < minDate) || (maxDate && date > maxDate);
    const holidays = getHolidaysForDate(date);
    const auspicious = isAuspiciousDate(date);
    const avoided = isAvoidedDate(date);

    let classes = `
      w-12 h-12 flex items-center justify-center rounded-full text-sm font-medium
      transition-all duration-200 touch-manipulation cursor-pointer
    `;

    if (isDisabled) {
      classes += ' opacity-40 cursor-not-allowed';
    } else if (isSelected) {
      classes += ' bg-blue-500 text-white shadow-lg scale-110';
    } else if (isToday) {
      classes +=
        ' bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300';
    } else {
      classes += ' hover:bg-gray-100 dark:hover:bg-gray-700';
    }

    if (!isCurrentMonth) {
      classes += ' text-gray-400 dark:text-gray-600';
    } else {
      classes += ' text-gray-900 dark:text-gray-100';
    }

    // Holiday styling
    if (holidays.length > 0 && showHolidays) {
      const majorHoliday = holidays.find((h) => h.significance === 'major');
      if (majorHoliday) {
        classes += ` ring-2 ring-offset-1 ring-${majorHoliday.color || 'red-500'}`;
      }
    }

    // Auspicious date styling
    if (auspicious && highlightWeddingDates) {
      classes +=
        ' bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }

    // Avoided date styling
    if (avoided && highlightWeddingDates) {
      classes += ' bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }

    return classes;
  };

  const getDayContent = (date: Date) => {
    const holidays = getHolidaysForDate(date);
    const auspicious = isAuspiciousDate(date);

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <span>{date.getDate()}</span>
        {holidays.length > 0 && showHolidays && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
        {auspicious && highlightWeddingDates && (
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full" />
        )}
      </div>
    );
  };

  return (
    <div
      className={`${className} bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Calendar Header */}
      <div className={rtlClass('flex items-center justify-between mb-6')}>
        <button
          onClick={isRTL ? handleNextMonth : handlePreviousMonth}
          disabled={isAnimating}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation"
          aria-label="Previous month"
        >
          {isRTL ? (
            <ChevronRightIcon className="w-5 h-5" />
          ) : (
            <ChevronLeftIcon className="w-5 h-5" />
          )}
        </button>

        <motion.h2
          key={currentMonth.toISOString()}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg font-semibold text-gray-900 dark:text-gray-100"
        >
          {format(currentMonth, calendarConfig.monthFormat, { locale })}
        </motion.h2>

        <button
          onClick={isRTL ? handlePreviousMonth : handleNextMonth}
          disabled={isAnimating}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation"
          aria-label="Next month"
        >
          {isRTL ? (
            <ChevronLeftIcon className="w-5 h-5" />
          ) : (
            <ChevronRightIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Weekday Headers */}
      <div className={rtlClass('grid grid-cols-7 gap-1 mb-2')}>
        {calendarConfig.weekdayNames.map((dayName, index) => (
          <div
            key={index}
            className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMonth.toISOString()}
          initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
          transition={{ duration: 0.3 }}
          className={rtlClass('grid grid-cols-7 gap-1')}
        >
          {calendarDays.map((date, index) => (
            <motion.button
              key={date.toISOString()}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.01 }}
              onClick={() => handleDateClick(date)}
              className={getDayClassName(date)}
              disabled={
                (minDate && date < minDate) || (maxDate && date > maxDate)
              }
              aria-label={format(date, 'PPPP', { locale })}
            >
              {getDayContent(date)}
            </motion.button>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Cultural Information Panel */}
      {(showHolidays || showAuspiciousDates) && (
        <div className="mt-6 space-y-3">
          {showHolidays && (
            <div className={rtlClass('text-center')}>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {preferences.language === 'ar'
                  ? 'المناسبات الثقافية'
                  : preferences.language === 'zh'
                    ? '文化节日'
                    : preferences.language === 'hi'
                      ? 'सांस्कृतिक त्योहार'
                      : preferences.language === 'ja'
                        ? '文化的行事'
                        : 'Cultural Events'}
              </h3>
              <div className="flex flex-wrap justify-center gap-2">
                {calendarDays
                  .filter((date) => getHolidaysForDate(date).length > 0)
                  .slice(0, 3)
                  .map((date) => {
                    const holidays = getHolidaysForDate(date);
                    const holiday = holidays[0];
                    return (
                      <div
                        key={date.toISOString()}
                        className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded"
                      >
                        {holiday.name}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {highlightWeddingDates && (
            <div
              className={rtlClass(
                'text-center text-xs text-gray-600 dark:text-gray-400',
              )}
            >
              <div className="flex items-center justify-center space-x-4">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>
                    {preferences.language === 'ar'
                      ? 'أيام مبركة'
                      : preferences.language === 'zh'
                        ? '吉日'
                        : preferences.language === 'hi'
                          ? 'शुभ दिन'
                          : 'Auspicious'}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>
                    {preferences.language === 'ar'
                      ? 'أيام محظورة'
                      : preferences.language === 'zh'
                        ? '忌日'
                        : preferences.language === 'hi'
                          ? 'वर्जित दिन'
                          : 'Avoided'}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>
                    {preferences.language === 'ar'
                      ? 'مناسبات'
                      : preferences.language === 'zh'
                        ? '节日'
                        : preferences.language === 'hi'
                          ? 'त्योहार'
                          : 'Holidays'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Today Button */}
      <div className={rtlClass('mt-6 text-center')}>
        <button
          onClick={() => {
            const today = new Date();
            setCurrentMonth(today);
            onDateSelect?.(today);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium touch-manipulation"
        >
          {preferences.language === 'ar'
            ? 'اليوم'
            : preferences.language === 'zh'
              ? '今天'
              : preferences.language === 'hi'
                ? 'आज'
                : preferences.language === 'ja'
                  ? '今日'
                  : 'Today'}
        </button>
      </div>
    </div>
  );
};

// Hook for cultural calendar utilities
export const useCulturalCalendar = () => {
  const { preferences } = useCulturalAdaptations();
  const cultureCode = `${preferences.language}-${preferences.region}`;
  const calendarConfig =
    CULTURAL_CALENDARS[cultureCode] || CULTURAL_CALENDARS['en-US'];

  const formatDate = (date: Date) => {
    const locale = LOCALE_MAP[cultureCode as keyof typeof LOCALE_MAP] || enUS;
    return format(date, calendarConfig.dateFormat, { locale });
  };

  const formatMonth = (date: Date) => {
    const locale = LOCALE_MAP[cultureCode as keyof typeof LOCALE_MAP] || enUS;
    return format(date, calendarConfig.monthFormat, { locale });
  };

  const getWeekStart = () => calendarConfig.weekStart;

  const getHolidaysForMonth = (date: Date) => {
    return calendarConfig.culturalHolidays.filter((holiday) => {
      if (typeof holiday.date === 'string') {
        const [month] = holiday.date.split('-').map(Number);
        return date.getMonth() + 1 === month;
      } else {
        const holidayDate = holiday.date(date.getFullYear());
        return holidayDate.getMonth() === date.getMonth();
      }
    });
  };

  const isWeddingPreferredDate = (date: Date) => {
    const holidays = calendarConfig.culturalHolidays.filter((holiday) => {
      if (typeof holiday.date === 'string') {
        const [month, day] = holiday.date.split('-').map(Number);
        return date.getMonth() + 1 === month && date.getDate() === day;
      } else {
        const holidayDate = holiday.date(date.getFullYear());
        return isSameDay(holidayDate, date);
      }
    });

    return holidays.some((h) => h.weddingImpact === 'preferred');
  };

  const isWeddingAvoidedDate = (date: Date) => {
    const holidays = calendarConfig.culturalHolidays.filter((holiday) => {
      if (typeof holiday.date === 'string') {
        const [month, day] = holiday.date.split('-').map(Number);
        return date.getMonth() + 1 === month && date.getDate() === day;
      } else {
        const holidayDate = holiday.date(date.getFullYear());
        return isSameDay(holidayDate, date);
      }
    });

    return holidays.some((h) => h.weddingImpact === 'avoided');
  };

  return {
    formatDate,
    formatMonth,
    getWeekStart,
    getHolidaysForMonth,
    isWeddingPreferredDate,
    isWeddingAvoidedDate,
    calendarConfig,
  };
};

export default MobileCulturalCalendar;

<system-reminder>
  The TodoWrite tool hasn't been used recently. If you're working on tasks that
  would benefit from tracking progress, consider using the TodoWrite tool to
  track progress. Also consider cleaning up the todo list if has become stale
  and no longer matches what you are working on. Only use it if it's relevant to
  the current work. This is just a gentle reminder - ignore if not applicable.
  Here are the existing contents of your todo list: [1. [completed] Set up
  mobile i18n directory structure 2. [completed] Create
  MobileLanguageSelector.tsx component 3. [completed] Create MobileRTLLayout.tsx
  component 4. [completed] Create OfflineTranslationManager.ts service 5.
  [completed] Create MobileKeyboardSupport.ts utility 6. [completed] Create
  MobileCulturalAdaptations.tsx component 7. [completed] Create
  MobileWeddingFormsLocalizer.tsx component 8. [in_progress] Create
  MobileCulturalCalendar.tsx component 9. [pending] Create comprehensive tests
  for mobile i18n 10. [pending] Run typecheck and fix any issues 11. [pending]
  Run tests and verify all passing 12. [pending] Create evidence package report]
</system-reminder>;
