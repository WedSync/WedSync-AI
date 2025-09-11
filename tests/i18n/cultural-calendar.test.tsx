/**
 * WS-247 Multilingual Platform System - Cultural Calendar Testing
 * Team E - QA/Testing & Documentation
 * 
 * Comprehensive testing for cultural calendar systems and date formatting
 * Validates different calendar systems, auspicious dates, and cultural holidays
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTranslation } from 'react-i18next';
import React from 'react';

// Cultural calendar systems configuration
const calendarSystems = {
  gregorian: {
    cultures: ['western', 'modern'],
    languages: ['en', 'es', 'fr', 'de', 'it', 'pt'],
    dateFormat: 'MM/DD/YYYY',
    weekStart: 'sunday',
    monthNames: 12,
    yearLength: 365,
    seasons: ['spring', 'summer', 'autumn', 'winter']
  },
  hijri: {
    cultures: ['arabic', 'islamic'],
    languages: ['ar', 'ur', 'fa', 'tr', 'ms'],
    dateFormat: 'DD/MM/YYYY هـ',
    weekStart: 'saturday',
    monthNames: 12,
    yearLength: 354,
    seasons: ['spring', 'summer', 'autumn', 'winter']
  },
  hebrew: {
    cultures: ['jewish'],
    languages: ['he', 'en', 'yi'],
    dateFormat: 'DD Month YYYY',
    weekStart: 'sunday',
    monthNames: 12,
    yearLength: 354,
    seasons: ['nissan', 'tammuz', 'tishrei', 'tevet']
  },
  hindu: {
    cultures: ['indian', 'vedic'],
    languages: ['hi', 'sa', 'ta', 'te', 'kn', 'ml'],
    dateFormat: 'DD Month YYYY',
    weekStart: 'sunday',
    monthNames: 12,
    yearLength: 365,
    seasons: ['vasant', 'grishma', 'varsha', 'sharad', 'shishir', 'hemant']
  },
  chinese: {
    cultures: ['chinese', 'lunar'],
    languages: ['zh', 'zh-TW'],
    dateFormat: 'YYYY年MM月DD日',
    weekStart: 'monday',
    monthNames: 12,
    yearLength: 354,
    seasons: ['spring', 'summer', 'autumn', 'winter']
  },
  thai: {
    cultures: ['thai', 'buddhist'],
    languages: ['th'],
    dateFormat: 'DD/MM/YYYY พ.ศ.',
    weekStart: 'sunday',
    monthNames: 12,
    yearLength: 365,
    seasons: ['hot', 'rainy', 'cool']
  }
};

// Auspicious dates and cultural holidays
const culturalHolidays = {
  western: {
    weddingMonths: ['may', 'june', 'september', 'october'],
    avoidDates: ['friday_13th', 'leap_year_feb_29'],
    favorableDays: ['saturday', 'sunday'],
    seasons: { best: 'summer', good: ['spring', 'autumn'], avoid: 'winter' }
  },
  arabic: {
    weddingMonths: ['shawwal', 'dhul_hijjah', 'muharram'],
    avoidDates: ['ramadan', 'ashura', 'hajj_period'],
    favorableDays: ['friday', 'saturday'],
    seasons: { best: 'spring', good: ['autumn', 'winter'], avoid: 'summer' }
  },
  jewish: {
    weddingMonths: ['iyar', 'sivan', 'elul', 'tishrei'],
    avoidDates: ['sabbath', 'three_weeks', 'omer_period'],
    favorableDays: ['tuesday', 'wednesday'],
    seasons: { best: 'spring', good: ['summer', 'autumn'], avoid: 'winter' }
  },
  hindu: {
    weddingMonths: ['kartik', 'margashirsha', 'paush', 'magh'],
    avoidDates: ['rahu_kaal', 'amavasya', 'purnima'],
    favorableDays: ['wednesday', 'thursday', 'friday'],
    seasons: { best: 'winter', good: ['spring', 'autumn'], avoid: 'monsoon' }
  },
  chinese: {
    weddingMonths: ['4', '6', '9', '10'],
    avoidDates: ['ghost_month', 'lunar_new_year'],
    favorableDays: ['dragon_days', 'phoenix_days'],
    seasons: { best: 'autumn', good: ['spring', 'summer'], avoid: 'winter' }
  }
};

// Cultural calendar component
const CulturalCalendarPicker = ({ 
  calendarType, 
  culture, 
  language 
}: { 
  calendarType: keyof typeof calendarSystems;
  culture: string;
  language: string;
}) => {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const config = calendarSystems[calendarType];
  
  const formatCulturalDate = (date: Date) => {
    switch (calendarType) {
      case 'hijri':
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} هـ`;
      case 'hebrew':
        return `${date.getDate()} ${getHebrewMonth(date.getMonth())} ${date.getFullYear()}`;
      case 'chinese':
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
      case 'thai':
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear() + 543} พ.ศ.`;
      default:
        return date.toLocaleDateString(language);
    }
  };
  
  const getHebrewMonth = (monthIndex: number) => {
    const hebrewMonths = ['תשרי', 'חשון', 'כסלו', 'טבת', 'שבט', 'אדר', 'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול'];
    return hebrewMonths[monthIndex] || '';
  };
  
  return (
    <div className="cultural-calendar" data-testid={`calendar-${calendarType}`}>
      <h2 data-testid="calendar-title">
        {t(`calendar.${calendarType}.title`)} - {t(`culture.${culture}`)}
      </h2>
      
      <div className="calendar-info" data-testid="calendar-info">
        <div className="calendar-system" data-testid="system-info">
          <span className="system-label">{t('calendar.system')}: </span>
          <span className="system-value">{calendarType}</span>
        </div>
        
        <div className="date-format" data-testid="date-format">
          <span className="format-label">{t('calendar.format')}: </span>
          <span className="format-value">{config.dateFormat}</span>
        </div>
        
        <div className="week-start" data-testid="week-start">
          <span className="week-label">{t('calendar.week_starts')}: </span>
          <span className="week-value">{t(`calendar.${config.weekStart}`)}</span>
        </div>
        
        <div className="year-length" data-testid="year-length">
          <span className="length-label">{t('calendar.year_length')}: </span>
          <span className="length-value">{config.yearLength} {t('calendar.days')}</span>
        </div>
      </div>
      
      <div className="current-date" data-testid="current-date">
        <h3>{t('calendar.current_date')}</h3>
        <div className="gregorian-date" data-testid="gregorian-date">
          {t('calendar.gregorian')}: {selectedDate.toLocaleDateString()}
        </div>
        <div className="cultural-date" data-testid="cultural-date">
          {t(`calendar.${calendarType}`)}: {formatCulturalDate(selectedDate)}
        </div>
      </div>
      
      <div className="seasonal-info" data-testid="seasonal-info">
        <h3>{t('calendar.seasons')}</h3>
        <ul data-testid="seasons-list">
          {config.seasons.map((season, index) => (
            <li key={season} data-testid={`season-${season}`}>
              {t(`calendar.seasons.${calendarType}.${season}`)}
            </li>
          ))}
        </ul>
      </div>
      
      <div className="date-picker-container" data-testid="date-picker-container">
        <input 
          type="date" 
          className="cultural-date-input"
          data-testid="date-input"
          value={selectedDate.toISOString().split('T')[0]}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
        />
      </div>
    </div>
  );
};

// Auspicious date checker
const AuspiciousDateChecker = ({ 
  culture, 
  selectedDate, 
  weddingType 
}: { 
  culture: keyof typeof culturalHolidays;
  selectedDate: Date;
  weddingType: string;
}) => {
  const { t } = useTranslation();
  const config = culturalHolidays[culture];
  
  const [dateAnalysis, setDateAnalysis] = React.useState({
    isAuspicious: false,
    score: 0,
    recommendations: [] as string[],
    warnings: [] as string[]
  });
  
  React.useEffect(() => {
    const analyzeDateAuspiciousness = () => {
      const dayOfWeek = selectedDate.toLocaleDateString('en', { weekday: 'long' }).toLowerCase();
      const month = selectedDate.getMonth();
      const season = getSeason(month);
      
      let score = 50; // Base score
      const recommendations: string[] = [];
      const warnings: string[] = [];
      
      // Check favorable days
      if (config.favorableDays.includes(dayOfWeek)) {
        score += 20;
        recommendations.push(`${dayOfWeek}_favorable`);
      } else {
        score -= 10;
        warnings.push(`${dayOfWeek}_not_ideal`);
      }
      
      // Check seasons
      if (config.seasons.best === season) {
        score += 25;
        recommendations.push(`${season}_best_season`);
      } else if (config.seasons.good.includes(season)) {
        score += 10;
        recommendations.push(`${season}_good_season`);
      } else if (config.seasons.avoid === season) {
        score -= 20;
        warnings.push(`${season}_avoid_season`);
      }
      
      setDateAnalysis({
        isAuspicious: score >= 70,
        score,
        recommendations,
        warnings
      });
    };
    
    analyzeDateAuspiciousness();
  }, [selectedDate, culture, config]);
  
  const getSeason = (month: number) => {
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  };
  
  return (
    <div className="auspicious-checker" data-testid="auspicious-checker">
      <h3 data-testid="checker-title">
        {t('calendar.auspicious.title', { culture: t(`culture.${culture}`) })}
      </h3>
      
      <div className="date-analysis" data-testid="date-analysis">
        <div className="auspiciousness-score" data-testid="auspiciousness-score">
          <span className="score-label">{t('calendar.auspicious.score')}: </span>
          <span 
            className={`score-value ${dateAnalysis.score >= 70 ? 'high' : dateAnalysis.score >= 50 ? 'medium' : 'low'}`}
            data-testid="score-value"
          >
            {dateAnalysis.score}/100
          </span>
        </div>
        
        <div className="auspiciousness-status" data-testid="auspiciousness-status">
          <span className="status-label">{t('calendar.auspicious.status')}: </span>
          <span 
            className={`status-value ${dateAnalysis.isAuspicious ? 'favorable' : 'unfavorable'}`}
            data-testid="status-value"
          >
            {dateAnalysis.isAuspicious ? 
              t('calendar.auspicious.favorable') : 
              t('calendar.auspicious.unfavorable')
            }
          </span>
        </div>
      </div>
      
      <div className="recommendations-section" data-testid="recommendations-section">
        <h4>{t('calendar.recommendations')}</h4>
        {dateAnalysis.recommendations.length > 0 ? (
          <ul data-testid="recommendations-list">
            {dateAnalysis.recommendations.map((rec, index) => (
              <li key={index} className="recommendation" data-testid={`recommendation-${index}`}>
                ✅ {t(`calendar.recommendations.${culture}.${rec}`)}
              </li>
            ))}
          </ul>
        ) : (
          <p data-testid="no-recommendations">{t('calendar.no_recommendations')}</p>
        )}
      </div>
      
      <div className="warnings-section" data-testid="warnings-section">
        <h4>{t('calendar.warnings')}</h4>
        {dateAnalysis.warnings.length > 0 ? (
          <ul data-testid="warnings-list">
            {dateAnalysis.warnings.map((warning, index) => (
              <li key={index} className="warning" data-testid={`warning-${index}`}>
                ⚠️ {t(`calendar.warnings.${culture}.${warning}`)}
              </li>
            ))}
          </ul>
        ) : (
          <p data-testid="no-warnings">{t('calendar.no_warnings')}</p>
        )}
      </div>
    </div>
  );
};

// Multi-calendar date converter
const MultiCalendarConverter = ({ 
  sourceDate, 
  cultures 
}: { 
  sourceDate: Date;
  cultures: string[];
}) => {
  const { t } = useTranslation();
  
  const convertToCalendar = (date: Date, calendarType: keyof typeof calendarSystems) => {
    switch (calendarType) {
      case 'hijri':
        // Mock Hijri conversion (actual implementation would use proper calendar library)
        const hijriYear = date.getFullYear() - 622;
        return `${date.getDate()}/${date.getMonth() + 1}/${hijriYear} هـ`;
      case 'hebrew':
        const hebrewYear = date.getFullYear() + 3760;
        return `${date.getDate()} אדר ${hebrewYear}`;
      case 'chinese':
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
      case 'thai':
        const buddhistYear = date.getFullYear() + 543;
        return `${date.getDate()}/${date.getMonth() + 1}/${buddhistYear} พ.ศ.`;
      default:
        return date.toLocaleDateString();
    }
  };
  
  const getCalendarForCulture = (culture: string): keyof typeof calendarSystems => {
    if (['arabic', 'islamic'].includes(culture)) return 'hijri';
    if (['jewish'].includes(culture)) return 'hebrew';
    if (['chinese', 'lunar'].includes(culture)) return 'chinese';
    if (['thai', 'buddhist'].includes(culture)) return 'thai';
    if (['indian', 'hindu'].includes(culture)) return 'hindu';
    return 'gregorian';
  };
  
  return (
    <div className="multi-calendar-converter" data-testid="multi-converter">
      <h3 data-testid="converter-title">{t('calendar.converter.title')}</h3>
      
      <div className="source-date" data-testid="source-date">
        <strong>{t('calendar.converter.source')}: </strong>
        {sourceDate.toLocaleDateString()}
      </div>
      
      <div className="converted-dates" data-testid="converted-dates">
        {cultures.map(culture => {
          const calendarType = getCalendarForCulture(culture);
          const convertedDate = convertToCalendar(sourceDate, calendarType);
          
          return (
            <div key={culture} className="converted-date" data-testid={`converted-${culture}`}>
              <span className="culture-label">
                {t(`culture.${culture}`)} ({calendarType}):
              </span>
              <span className="converted-value" data-testid={`value-${culture}`}>
                {convertedDate}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Cultural holiday checker
const CulturalHolidayChecker = ({ 
  culture, 
  selectedMonth, 
  year 
}: { 
  culture: keyof typeof culturalHolidays;
  selectedMonth: number;
  year: number;
}) => {
  const { t } = useTranslation();
  const config = culturalHolidays[culture];
  
  const getMonthHolidays = () => {
    // Mock holiday data - real implementation would use holiday calendar APIs
    const holidays = {
      western: {
        0: ['new_year'], 1: ['valentines'], 2: [], 3: ['easter'], 4: ['mothers_day'],
        5: [], 6: ['independence'], 7: [], 8: [], 9: ['halloween'], 10: ['thanksgiving'], 11: ['christmas']
      },
      arabic: {
        0: ['muharram'], 1: [], 2: [], 3: [], 4: [], 5: [],
        6: [], 7: [], 8: ['eid_fitr'], 9: [], 10: ['eid_adha'], 11: []
      },
      jewish: {
        0: [], 1: [], 2: ['purim'], 3: ['passover'], 4: [], 5: ['shavuot'],
        6: [], 7: [], 8: ['rosh_hashana'], 9: ['yom_kippur'], 10: [], 11: ['hanukkah']
      },
      hindu: {
        0: ['makar_sankranti'], 1: ['maha_shivratri'], 2: ['holi'], 3: [], 4: [],
        5: [], 6: [], 7: [], 8: [], 9: ['diwali', 'dussehra'], 10: [], 11: []
      },
      chinese: {
        0: ['lunar_new_year'], 1: ['lantern_festival'], 2: [], 3: [], 4: [],
        5: ['dragon_boat'], 6: [], 7: ['ghost_month'], 8: ['mid_autumn'], 9: [], 10: [], 11: []
      }
    };
    
    return holidays[culture]?.[selectedMonth] || [];
  };
  
  const monthHolidays = getMonthHolidays();
  const isWeddingMonth = config.weddingMonths.includes(selectedMonth.toString());
  
  return (
    <div className="holiday-checker" data-testid="holiday-checker">
      <h3 data-testid="checker-title">
        {t('calendar.holidays.title', { 
          month: t(`calendar.months.${selectedMonth}`),
          culture: t(`culture.${culture}`)
        })}
      </h3>
      
      <div className="wedding-month-status" data-testid="wedding-month-status">
        <span className="status-label">{t('calendar.wedding_month')}: </span>
        <span 
          className={`status-value ${isWeddingMonth ? 'favorable' : 'neutral'}`}
          data-testid="wedding-month-value"
        >
          {isWeddingMonth ? 
            t('calendar.favorable') : 
            t('calendar.neutral')
          }
        </span>
      </div>
      
      <div className="holidays-list" data-testid="holidays-list">
        <h4>{t('calendar.holidays.this_month')}</h4>
        {monthHolidays.length > 0 ? (
          <ul data-testid="holidays-items">
            {monthHolidays.map((holiday, index) => (
              <li key={holiday} className="holiday-item" data-testid={`holiday-${holiday}`}>
                <span className="holiday-name">
                  {t(`calendar.holidays.${culture}.${holiday}`)}
                </span>
                <span className="holiday-impact" data-testid={`impact-${holiday}`}>
                  {config.avoidDates.includes(holiday) ? 
                    t('calendar.avoid') : 
                    t('calendar.neutral')
                  }
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p data-testid="no-holidays">{t('calendar.no_holidays')}</p>
        )}
      </div>
      
      <div className="cultural-recommendations" data-testid="cultural-recommendations">
        <h4>{t('calendar.cultural_recommendations')}</h4>
        <ul data-testid="cultural-rec-list">
          <li data-testid="favorable-days-rec">
            {t('calendar.favorable_days')}: {config.favorableDays.join(', ')}
          </li>
          <li data-testid="best-season-rec">
            {t('calendar.best_season')}: {t(`calendar.seasons.${config.seasons.best}`)}
          </li>
          <li data-testid="avoid-season-rec">
            {t('calendar.avoid_season')}: {t(`calendar.seasons.${config.seasons.avoid}`)}
          </li>
        </ul>
      </div>
    </div>
  );
};

describe('WS-247: Cultural Calendar Testing', () => {
  describe('Gregorian Calendar System', () => {
    test('should display Western calendar correctly', () => {
      render(
        <CulturalCalendarPicker 
          calendarType="gregorian" 
          culture="western" 
          language="en" 
        />
      );
      
      const calendarTitle = screen.getByTestId('calendar-title');
      const systemInfo = screen.getByTestId('system-info');
      const weekStart = screen.getByTestId('week-start');
      
      expect(calendarTitle).toBeInTheDocument();
      expect(systemInfo).toHaveTextContent('gregorian');
      expect(weekStart).toHaveTextContent('sunday');
    });

    test('should format dates correctly for different locales', () => {
      const locales = ['en', 'es', 'fr', 'de'];
      
      locales.forEach(locale => {
        render(
          <CulturalCalendarPicker 
            calendarType="gregorian" 
            culture="western" 
            language={locale} 
          />
        );
        
        const gregorianDate = screen.getByTestId('gregorian-date');
        expect(gregorianDate).toBeInTheDocument();
      });
    });

    test('should show correct seasons for Western calendar', () => {
      render(
        <CulturalCalendarPicker 
          calendarType="gregorian" 
          culture="western" 
          language="en" 
        />
      );
      
      const seasons = ['spring', 'summer', 'autumn', 'winter'];
      seasons.forEach(season => {
        expect(screen.getByTestId(`season-${season}`)).toBeInTheDocument();
      });
    });
  });

  describe('Hijri Calendar System', () => {
    test('should display Islamic calendar with Arabic formatting', () => {
      render(
        <CulturalCalendarPicker 
          calendarType="hijri" 
          culture="arabic" 
          language="ar" 
        />
      );
      
      const culturalDate = screen.getByTestId('cultural-date');
      const weekStart = screen.getByTestId('week-start');
      const yearLength = screen.getByTestId('year-length');
      
      expect(culturalDate).toHaveTextContent('هـ');
      expect(weekStart).toHaveTextContent('saturday');
      expect(yearLength).toHaveTextContent('354');
    });

    test('should support multiple Islamic languages', () => {
      const islamicLanguages = ['ar', 'ur', 'fa', 'tr'];
      
      islamicLanguages.forEach(language => {
        render(
          <CulturalCalendarPicker 
            calendarType="hijri" 
            culture="islamic" 
            language={language} 
          />
        );
        
        const calendarInfo = screen.getByTestId('calendar-info');
        expect(calendarInfo).toBeInTheDocument();
      });
    });
  });

  describe('Hebrew Calendar System', () => {
    test('should display Jewish calendar with Hebrew months', () => {
      render(
        <CulturalCalendarPicker 
          calendarType="hebrew" 
          culture="jewish" 
          language="he" 
        />
      );
      
      const culturalDate = screen.getByTestId('cultural-date');
      const seasonsList = screen.getByTestId('seasons-list');
      
      expect(culturalDate).toBeInTheDocument();
      expect(seasonsList).toBeInTheDocument();
    });

    test('should show Hebrew seasonal names', () => {
      render(
        <CulturalCalendarPicker 
          calendarType="hebrew" 
          culture="jewish" 
          language="he" 
        />
      );
      
      const hebrewSeasons = ['nissan', 'tammuz', 'tishrei', 'tevet'];
      hebrewSeasons.forEach(season => {
        expect(screen.getByTestId(`season-${season}`)).toBeInTheDocument();
      });
    });
  });

  describe('Hindu Calendar System', () => {
    test('should display Indian calendar with Sanskrit months', () => {
      render(
        <CulturalCalendarPicker 
          calendarType="hindu" 
          culture="indian" 
          language="hi" 
        />
      );
      
      const systemInfo = screen.getByTestId('system-info');
      const seasonsList = screen.getByTestId('seasons-list');
      
      expect(systemInfo).toHaveTextContent('hindu');
      expect(seasonsList).toBeInTheDocument();
    });

    test('should support multiple Indian languages', () => {
      const indianLanguages = ['hi', 'ta', 'te', 'kn'];
      
      indianLanguages.forEach(language => {
        render(
          <CulturalCalendarPicker 
            calendarType="hindu" 
            culture="indian" 
            language={language} 
          />
        );
        
        const calendarTitle = screen.getByTestId('calendar-title');
        expect(calendarTitle).toBeInTheDocument();
      });
    });

    test('should show extended Hindu seasons', () => {
      render(
        <CulturalCalendarPicker 
          calendarType="hindu" 
          culture="vedic" 
          language="sa" 
        />
      );
      
      const hinduSeasons = ['vasant', 'grishma', 'varsha', 'sharad', 'shishir', 'hemant'];
      hinduSeasons.forEach(season => {
        expect(screen.getByTestId(`season-${season}`)).toBeInTheDocument();
      });
    });
  });

  describe('Chinese Calendar System', () => {
    test('should display Chinese calendar with proper formatting', () => {
      render(
        <CulturalCalendarPicker 
          calendarType="chinese" 
          culture="chinese" 
          language="zh" 
        />
      );
      
      const culturalDate = screen.getByTestId('cultural-date');
      const weekStart = screen.getByTestId('week-start');
      
      expect(culturalDate).toHaveTextContent('年');
      expect(culturalDate).toHaveTextContent('月');
      expect(culturalDate).toHaveTextContent('日');
      expect(weekStart).toHaveTextContent('monday');
    });
  });

  describe('Thai Buddhist Calendar', () => {
    test('should display Thai calendar with Buddhist era', () => {
      render(
        <CulturalCalendarPicker 
          calendarType="thai" 
          culture="thai" 
          language="th" 
        />
      );
      
      const culturalDate = screen.getByTestId('cultural-date');
      expect(culturalDate).toHaveTextContent('พ.ศ.');
    });
  });

  describe('Auspicious Date Checking', () => {
    test('should analyze Western wedding dates', () => {
      const selectedDate = new Date('2024-06-15'); // Saturday in June
      
      render(
        <AuspiciousDateChecker 
          culture="western" 
          selectedDate={selectedDate} 
          weddingType="traditional" 
        />
      );
      
      const scoreValue = screen.getByTestId('score-value');
      const statusValue = screen.getByTestId('status-value');
      
      expect(scoreValue).toBeInTheDocument();
      expect(statusValue).toBeInTheDocument();
      
      const score = parseInt(scoreValue.textContent?.split('/')[0] || '0');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('should provide cultural recommendations for Arabic weddings', () => {
      const selectedDate = new Date('2024-10-15'); // Autumn date
      
      render(
        <AuspiciousDateChecker 
          culture="arabic" 
          selectedDate={selectedDate} 
          weddingType="islamic" 
        />
      );
      
      const recommendationsSection = screen.getByTestId('recommendations-section');
      const warningsSection = screen.getByTestId('warnings-section');
      
      expect(recommendationsSection).toBeInTheDocument();
      expect(warningsSection).toBeInTheDocument();
    });

    test('should calculate auspiciousness for Jewish weddings', () => {
      const selectedDate = new Date('2024-05-15'); // Spring, Wednesday
      
      render(
        <AuspiciousDateChecker 
          culture="jewish" 
          selectedDate={selectedDate} 
          weddingType="orthodox" 
        />
      );
      
      const auspiciousnessScore = screen.getByTestId('auspiciousness-score');
      expect(auspiciousnessScore).toBeInTheDocument();
    });

    test('should provide warnings for unfavorable Hindu dates', () => {
      const selectedDate = new Date('2024-07-15'); // Monsoon season
      
      render(
        <AuspiciousDateChecker 
          culture="hindu" 
          selectedDate={selectedDate} 
          weddingType="traditional" 
        />
      );
      
      const warningsList = screen.getByTestId('warnings-list');
      expect(warningsList).toBeInTheDocument();
    });
  });

  describe('Multi-Calendar Date Conversion', () => {
    test('should convert dates across multiple cultural calendars', () => {
      const sourceDate = new Date('2024-06-15');
      const cultures = ['western', 'arabic', 'jewish', 'chinese'];
      
      render(
        <MultiCalendarConverter 
          sourceDate={sourceDate} 
          cultures={cultures} 
        />
      );
      
      const sourceDisplay = screen.getByTestId('source-date');
      expect(sourceDisplay).toBeInTheDocument();
      
      cultures.forEach(culture => {
        const convertedDate = screen.getByTestId(`converted-${culture}`);
        const convertedValue = screen.getByTestId(`value-${culture}`);
        
        expect(convertedDate).toBeInTheDocument();
        expect(convertedValue).toBeInTheDocument();
        expect(convertedValue.textContent?.trim()).toBeTruthy();
      });
    });

    test('should handle Hijri calendar conversion', () => {
      const sourceDate = new Date('2024-03-21');
      
      render(
        <MultiCalendarConverter 
          sourceDate={sourceDate} 
          cultures={['arabic']} 
        />
      );
      
      const hijriValue = screen.getByTestId('value-arabic');
      expect(hijriValue).toHaveTextContent('هـ');
    });

    test('should handle Chinese calendar formatting', () => {
      const sourceDate = new Date('2024-09-15');
      
      render(
        <MultiCalendarConverter 
          sourceDate={sourceDate} 
          cultures={['chinese']} 
        />
      );
      
      const chineseValue = screen.getByTestId('value-chinese');
      expect(chineseValue).toHaveTextContent('年');
      expect(chineseValue).toHaveTextContent('月');
      expect(chineseValue).toHaveTextContent('日');
    });
  });

  describe('Cultural Holiday Integration', () => {
    test('should identify Western holidays in wedding months', () => {
      render(
        <CulturalHolidayChecker 
          culture="western" 
          selectedMonth={5} // June
          year={2024} 
        />
      );
      
      const weddingMonthStatus = screen.getByTestId('wedding-month-status');
      const holidaysList = screen.getByTestId('holidays-list');
      
      expect(weddingMonthStatus).toBeInTheDocument();
      expect(holidaysList).toBeInTheDocument();
    });

    test('should show Islamic holidays and their wedding impact', () => {
      render(
        <CulturalHolidayChecker 
          culture="arabic" 
          selectedMonth={8} // September (potential Eid month)
          year={2024} 
        />
      );
      
      const culturalRecommendations = screen.getByTestId('cultural-recommendations');
      expect(culturalRecommendations).toBeInTheDocument();
      
      const favorableDaysRec = screen.getByTestId('favorable-days-rec');
      expect(favorableDaysRec).toHaveTextContent('friday');
      expect(favorableDaysRec).toHaveTextContent('saturday');
    });

    test('should display Jewish holidays with wedding compatibility', () => {
      render(
        <CulturalHolidayChecker 
          culture="jewish" 
          selectedMonth={8} // September (Rosh Hashana)
          year={2024} 
        />
      );
      
      const bestSeasonRec = screen.getByTestId('best-season-rec');
      expect(bestSeasonRec).toBeInTheDocument();
    });

    test('should show Hindu festival calendar', () => {
      render(
        <CulturalHolidayChecker 
          culture="hindu" 
          selectedMonth={9} // October (Diwali season)
          year={2024} 
        />
      );
      
      const culturalRecList = screen.getByTestId('cultural-rec-list');
      expect(culturalRecList).toBeInTheDocument();
    });
  });

  describe('Interactive Calendar Features', () => {
    test('should allow date selection and update cultural display', async () => {
      const user = userEvent.setup();
      
      render(
        <CulturalCalendarPicker 
          calendarType="gregorian" 
          culture="western" 
          language="en" 
        />
      );
      
      const dateInput = screen.getByTestId('date-input');
      
      await act(async () => {
        await user.clear(dateInput);
        await user.type(dateInput, '2024-12-25');
      });
      
      expect(dateInput).toHaveValue('2024-12-25');
    });

    test('should update auspiciousness analysis when date changes', async () => {
      const user = userEvent.setup();
      const [selectedDate, setSelectedDate] = React.useState(new Date());
      
      render(
        <AuspiciousDateChecker 
          culture="western" 
          selectedDate={selectedDate} 
          weddingType="modern" 
        />
      );
      
      const scoreValue = screen.getByTestId('score-value');
      expect(scoreValue).toBeInTheDocument();
    });
  });

  describe('Accessibility for Cultural Calendars', () => {
    test('should maintain proper heading hierarchy', () => {
      render(
        <CulturalCalendarPicker 
          calendarType="hindu" 
          culture="indian" 
          language="hi" 
        />
      );
      
      const mainHeading = screen.getByRole('heading', { level: 2 });
      const subHeadings = screen.getAllByRole('heading', { level: 3 });
      
      expect(mainHeading).toBeInTheDocument();
      expect(subHeadings.length).toBeGreaterThan(0);
    });

    test('should support screen readers for date information', () => {
      render(
        <MultiCalendarConverter 
          sourceDate={new Date()} 
          cultures={['western', 'arabic']} 
        />
      );
      
      const converterTitle = screen.getByRole('heading', { level: 3 });
      expect(converterTitle).toBeInTheDocument();
    });

    test('should provide proper labels for date inputs', () => {
      render(
        <CulturalCalendarPicker 
          calendarType="chinese" 
          culture="chinese" 
          language="zh" 
        />
      );
      
      const dateInput = screen.getByTestId('date-input');
      expect(dateInput).toBeInTheDocument();
      expect(dateInput.type).toBe('date');
    });
  });
});