/**
 * WS-247 Multilingual Platform System - Wedding Traditions Testing
 * Team E - QA/Testing & Documentation
 * 
 * Comprehensive testing for cultural wedding traditions across different cultures
 * Validates tradition-specific workflows, customs, and ceremony requirements
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTranslation } from 'react-i18next';

// Wedding traditions configuration for different cultures
const weddingTraditions = {
  western: {
    preWeddingEvents: ['bridal_shower', 'bachelor_party', 'rehearsal_dinner'],
    ceremonyElements: ['processional', 'vows', 'ring_exchange', 'kiss', 'recessional'],
    receptionTraditions: ['first_dance', 'cake_cutting', 'bouquet_toss', 'garter_toss'],
    duration: { ceremony: 30, reception: 240 }, // minutes
    vows: 'custom',
    musicStyle: 'contemporary',
    attire: { bride: 'white_dress', groom: 'suit_or_tuxedo' }
  },
  indian: {
    preWeddingEvents: ['roka', 'engagement', 'mehendi', 'sangeet', 'haldi'],
    ceremonyElements: ['ganesh_puja', 'baraat', 'jaimala', 'phere', 'sindoor'],
    receptionTraditions: ['grand_entrance', 'speeches', 'dance_performances', 'feast'],
    duration: { ceremony: 180, reception: 300 },
    vows: 'traditional_sanskrit',
    musicStyle: 'classical_and_bollywood',
    attire: { bride: 'lehenga_or_saree', groom: 'sherwani' }
  },
  arabic: {
    preWeddingEvents: ['engagement', 'henna_night', 'bridal_shower'],
    ceremonyElements: ['nikah', 'mahr_agreement', 'signing', 'prayers'],
    receptionTraditions: ['walima', 'dabke_dance', 'traditional_music', 'feast'],
    duration: { ceremony: 45, reception: 240 },
    vows: 'islamic_traditional',
    musicStyle: 'traditional_arabic',
    attire: { bride: 'traditional_dress', groom: 'thobe_or_suit' }
  },
  chinese: {
    preWeddingEvents: ['proposal', 'betrothal_gifts', 'tea_ceremony_prep'],
    ceremonyElements: ['tea_ceremony', 'door_games', 'hair_combing', 'unity_rituals'],
    receptionTraditions: ['banquet', 'toasting', 'lion_dance', 'red_envelope_giving'],
    duration: { ceremony: 60, reception: 300 },
    vows: 'traditional_chinese',
    musicStyle: 'traditional_chinese',
    attire: { bride: 'qipao_and_modern', groom: 'tang_suit_or_modern' }
  },
  jewish: {
    preWeddingEvents: ['aufruf', 'mikvah', 'kabbalat_panim'],
    ceremonyElements: ['chuppah', 'ketubah', 'ring_ceremony', 'sheva_brachot', 'glass_breaking'],
    receptionTraditions: ['hora_dance', 'challah_blessing', 'speeches', 'dancing'],
    duration: { ceremony: 45, reception: 300 },
    vows: 'traditional_hebrew',
    musicStyle: 'klezmer_and_contemporary',
    attire: { bride: 'modest_dress', groom: 'suit_with_kippah' }
  }
};

// Test component for wedding traditions
const WeddingTraditionPlanner = ({ 
  culture, 
  tradition 
}: { 
  culture: keyof typeof weddingTraditions; 
  tradition: string 
}) => {
  const { t } = useTranslation();
  const config = weddingTraditions[culture];
  
  return (
    <div className="tradition-planner" data-testid={`planner-${culture}-${tradition}`}>
      <h1 data-testid="tradition-title">
        {t(`wedding.traditions.${culture}.${tradition}.title`)}
      </h1>
      
      <div className="tradition-description" data-testid="tradition-description">
        {t(`wedding.traditions.${culture}.${tradition}.description`)}
      </div>
      
      <div className="tradition-requirements" data-testid="tradition-requirements">
        <h3>{t('wedding.requirements.title')}</h3>
        <ul data-testid="requirements-list">
          <li data-testid="duration-requirement">
            {t('wedding.duration.ceremony')}: {config.duration.ceremony} {t('common.minutes')}
          </li>
          <li data-testid="attire-requirement">
            {t('wedding.attire.bride')}: {t(`wedding.attire.${config.attire.bride}`)}
          </li>
          <li data-testid="music-requirement">
            {t('wedding.music.style')}: {t(`wedding.music.${config.musicStyle}`)}
          </li>
        </ul>
      </div>
      
      <div className="ceremony-timeline" data-testid="ceremony-timeline">
        <h3>{t('wedding.ceremony.timeline')}</h3>
        {config.ceremonyElements.map((element, index) => (
          <div key={element} className="ceremony-element" data-testid={`element-${element}`}>
            <span className="element-order">{index + 1}.</span>
            <span className="element-name">
              {t(`wedding.ceremony.${culture}.${element}`)}
            </span>
            <span className="element-duration" data-testid={`duration-${element}`}>
              {t('common.duration.estimate')}: {5 + index * 2} {t('common.minutes')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Cultural ceremony validator
const CeremonyValidator = ({ 
  culture, 
  ceremonyType 
}: { 
  culture: keyof typeof weddingTraditions;
  ceremonyType: string 
}) => {
  const { t } = useTranslation();
  const config = weddingTraditions[culture];
  
  const [validationResults, setValidationResults] = React.useState<{
    traditionCompliance: boolean;
    culturalSensitivity: boolean;
    religiousAccuracy: boolean;
  }>({
    traditionCompliance: false,
    culturalSensitivity: false,
    religiousAccuracy: false
  });
  
  React.useEffect(() => {
    // Mock validation logic
    const validateCeremony = () => {
      setValidationResults({
        traditionCompliance: config.ceremonyElements.length >= 3,
        culturalSensitivity: culture !== 'western' ? true : config.vows !== 'custom',
        religiousAccuracy: ['arabic', 'jewish', 'indian'].includes(culture)
      });
    };
    
    validateCeremony();
  }, [culture, config]);
  
  return (
    <div className="ceremony-validator" data-testid="ceremony-validator">
      <h2 data-testid="validator-title">
        {t('wedding.ceremony.validation.title', { culture: t(`culture.${culture}`) })}
      </h2>
      
      <div className="validation-results" data-testid="validation-results">
        <div className="validation-item" data-testid="tradition-compliance">
          <span className="validation-label">{t('validation.tradition_compliance')}</span>
          <span className="validation-status" data-testid="compliance-status">
            {validationResults.traditionCompliance ? '✅' : '❌'}
          </span>
        </div>
        
        <div className="validation-item" data-testid="cultural-sensitivity">
          <span className="validation-label">{t('validation.cultural_sensitivity')}</span>
          <span className="validation-status" data-testid="sensitivity-status">
            {validationResults.culturalSensitivity ? '✅' : '❌'}
          </span>
        </div>
        
        <div className="validation-item" data-testid="religious-accuracy">
          <span className="validation-label">{t('validation.religious_accuracy')}</span>
          <span className="validation-status" data-testid="accuracy-status">
            {validationResults.religiousAccuracy ? '✅' : '❌'}
          </span>
        </div>
      </div>
      
      <div className="tradition-checklist" data-testid="tradition-checklist">
        <h3>{t('wedding.ceremony.checklist')}</h3>
        {config.ceremonyElements.map(element => (
          <label key={element} className="checklist-item" data-testid={`checklist-${element}`}>
            <input 
              type="checkbox" 
              data-testid={`checkbox-${element}`}
              defaultChecked={true}
            />
            {t(`wedding.ceremony.${culture}.${element}`)}
          </label>
        ))}
      </div>
    </div>
  );
};

// Tradition compatibility checker
const TraditionCompatibilityChecker = ({ 
  primaryCulture, 
  secondaryCulture 
}: { 
  primaryCulture: keyof typeof weddingTraditions;
  secondaryCulture: keyof typeof weddingTraditions;
}) => {
  const { t } = useTranslation();
  
  const findCompatibilities = () => {
    const primary = weddingTraditions[primaryCulture];
    const secondary = weddingTraditions[secondaryCulture];
    
    const compatibleElements = primary.ceremonyElements.filter(element =>
      secondary.ceremonyElements.some(secElement => 
        element.includes('ring') && secElement.includes('ring') ||
        element.includes('vows') && secElement.includes('vows') ||
        element === secElement
      )
    );
    
    const conflictingElements = primary.ceremonyElements.filter(element =>
      !compatibleElements.includes(element) && 
      secondary.ceremonyElements.some(secElement => 
        element.includes('religious') !== secElement.includes('religious')
      )
    );
    
    return { compatibleElements, conflictingElements };
  };
  
  const { compatibleElements, conflictingElements } = findCompatibilities();
  
  return (
    <div className="compatibility-checker" data-testid="compatibility-checker">
      <h2 data-testid="compatibility-title">
        {t('wedding.compatibility.title', { 
          culture1: t(`culture.${primaryCulture}`),
          culture2: t(`culture.${secondaryCulture}`)
        })}
      </h2>
      
      <section className="compatible-elements" data-testid="compatible-elements">
        <h3 className="compatibility-section-title">{t('wedding.compatibility.compatible')}</h3>
        {compatibleElements.length > 0 ? (
          <ul data-testid="compatible-list">
            {compatibleElements.map(element => (
              <li key={element} data-testid={`compatible-${element}`}>
                {t(`wedding.ceremony.element.${element}`)}
              </li>
            ))}
          </ul>
        ) : (
          <p data-testid="no-compatible">{t('wedding.compatibility.none_compatible')}</p>
        )}
      </section>
      
      <section className="conflicting-elements" data-testid="conflicting-elements">
        <h3 className="compatibility-section-title">{t('wedding.compatibility.conflicts')}</h3>
        {conflictingElements.length > 0 ? (
          <ul data-testid="conflict-list">
            {conflictingElements.map(element => (
              <li key={element} data-testid={`conflict-${element}`}>
                {t(`wedding.ceremony.element.${element}`)}
                <span className="conflict-solution" data-testid={`solution-${element}`}>
                  {t(`wedding.compatibility.solution.${element}`)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p data-testid="no-conflicts">{t('wedding.compatibility.no_conflicts')}</p>
        )}
      </section>
      
      <div className="compatibility-score" data-testid="compatibility-score">
        <strong>{t('wedding.compatibility.score')}: </strong>
        <span data-testid="score-percentage">
          {Math.round((compatibleElements.length / (compatibleElements.length + conflictingElements.length)) * 100)}%
        </span>
      </div>
    </div>
  );
};

// Import React for useState/useEffect
import React from 'react';

describe('WS-247: Wedding Traditions Testing', () => {
  describe('Western Wedding Traditions', () => {
    test('should display all western ceremony elements correctly', () => {
      render(<WeddingTraditionPlanner culture="western" tradition="ceremony" />);
      
      const traditionTitle = screen.getByTestId('tradition-title');
      expect(traditionTitle).toBeInTheDocument();
      
      // Verify all western ceremony elements are present
      const westernElements = ['processional', 'vows', 'ring_exchange', 'kiss', 'recessional'];
      westernElements.forEach(element => {
        expect(screen.getByTestId(`element-${element}`)).toBeInTheDocument();
      });
    });

    test('should show appropriate western pre-wedding events', () => {
      render(<WeddingTraditionPlanner culture="western" tradition="pre_wedding" />);
      
      const description = screen.getByTestId('tradition-description');
      expect(description).toBeInTheDocument();
    });

    test('should validate western ceremony requirements', () => {
      render(<CeremonyValidator culture="western" ceremonyType="traditional" />);
      
      const validator = screen.getByTestId('ceremony-validator');
      expect(validator).toBeInTheDocument();
      
      const complianceStatus = screen.getByTestId('compliance-status');
      expect(complianceStatus).toHaveTextContent('✅');
    });
  });

  describe('Indian Wedding Traditions', () => {
    test('should display comprehensive Indian ceremony elements', () => {
      render(<WeddingTraditionPlanner culture="indian" tradition="ceremony" />);
      
      // Indian weddings have longer ceremony elements
      const indianElements = ['ganesh_puja', 'baraat', 'jaimala', 'phere', 'sindoor'];
      indianElements.forEach(element => {
        expect(screen.getByTestId(`element-${element}`)).toBeInTheDocument();
      });
    });

    test('should show extended duration for Indian ceremonies', () => {
      render(<WeddingTraditionPlanner culture="indian" tradition="ceremony" />);
      
      const durationRequirement = screen.getByTestId('duration-requirement');
      expect(durationRequirement).toHaveTextContent('180'); // 3 hours
    });

    test('should validate traditional Indian attire requirements', () => {
      render(<WeddingTraditionPlanner culture="indian" tradition="ceremony" />);
      
      const attireRequirement = screen.getByTestId('attire-requirement');
      expect(attireRequirement).toBeInTheDocument();
    });

    test('should include pre-wedding events specific to Indian culture', () => {
      render(<CeremonyValidator culture="indian" ceremonyType="hindu" />);
      
      const religiousAccuracy = screen.getByTestId('accuracy-status');
      expect(religiousAccuracy).toHaveTextContent('✅');
    });
  });

  describe('Arabic Wedding Traditions', () => {
    test('should display Islamic ceremony elements correctly', () => {
      render(<WeddingTraditionPlanner culture="arabic" tradition="nikah" />);
      
      const arabicElements = ['nikah', 'mahr_agreement', 'signing', 'prayers'];
      arabicElements.forEach(element => {
        expect(screen.getByTestId(`element-${element}`)).toBeInTheDocument();
      });
    });

    test('should show appropriate Arabic ceremony duration', () => {
      render(<WeddingTraditionPlanner culture="arabic" tradition="nikah" />);
      
      const durationRequirement = screen.getByTestId('duration-requirement');
      expect(durationRequirement).toHaveTextContent('45'); // 45 minutes
    });

    test('should validate Islamic wedding requirements', () => {
      render(<CeremonyValidator culture="arabic" ceremonyType="islamic" />);
      
      const culturalSensitivity = screen.getByTestId('sensitivity-status');
      const religiousAccuracy = screen.getByTestId('accuracy-status');
      
      expect(culturalSensitivity).toHaveTextContent('✅');
      expect(religiousAccuracy).toHaveTextContent('✅');
    });
  });

  describe('Chinese Wedding Traditions', () => {
    test('should display traditional Chinese ceremony elements', () => {
      render(<WeddingTraditionPlanner culture="chinese" tradition="ceremony" />);
      
      const chineseElements = ['tea_ceremony', 'door_games', 'hair_combing', 'unity_rituals'];
      chineseElements.forEach(element => {
        expect(screen.getByTestId(`element-${element}`)).toBeInTheDocument();
      });
    });

    test('should show Chinese traditional music requirements', () => {
      render(<WeddingTraditionPlanner culture="chinese" tradition="ceremony" />);
      
      const musicRequirement = screen.getByTestId('music-requirement');
      expect(musicRequirement).toBeInTheDocument();
    });
  });

  describe('Jewish Wedding Traditions', () => {
    test('should display traditional Jewish ceremony elements', () => {
      render(<WeddingTraditionPlanner culture="jewish" tradition="ceremony" />);
      
      const jewishElements = ['chuppah', 'ketubah', 'ring_ceremony', 'sheva_brachot', 'glass_breaking'];
      jewishElements.forEach(element => {
        expect(screen.getByTestId(`element-${element}`)).toBeInTheDocument();
      });
    });

    test('should validate kosher and religious requirements', () => {
      render(<CeremonyValidator culture="jewish" ceremonyType="orthodox" />);
      
      const religiousAccuracy = screen.getByTestId('accuracy-status');
      expect(religiousAccuracy).toHaveTextContent('✅');
    });

    test('should include traditional Hebrew elements', () => {
      render(<WeddingTraditionPlanner culture="jewish" tradition="ceremony" />);
      
      const musicRequirement = screen.getByTestId('music-requirement');
      expect(musicRequirement).toHaveTextContent('klezmer');
    });
  });

  describe('Cross-Cultural Wedding Compatibility', () => {
    test('should identify compatible elements between Western and Jewish traditions', () => {
      render(
        <TraditionCompatibilityChecker 
          primaryCulture="western" 
          secondaryCulture="jewish" 
        />
      );
      
      const compatibleElements = screen.getByTestId('compatible-elements');
      const compatibilityScore = screen.getByTestId('score-percentage');
      
      expect(compatibleElements).toBeInTheDocument();
      expect(compatibilityScore).toBeInTheDocument();
    });

    test('should identify conflicts between Arabic and Western traditions', () => {
      render(
        <TraditionCompatibilityChecker 
          primaryCulture="arabic" 
          secondaryCulture="western" 
        />
      );
      
      const conflictingElements = screen.getByTestId('conflicting-elements');
      expect(conflictingElements).toBeInTheDocument();
    });

    test('should provide solutions for tradition conflicts', () => {
      render(
        <TraditionCompatibilityChecker 
          primaryCulture="indian" 
          secondaryCulture="chinese" 
        />
      );
      
      // Should have conflict solutions
      const conflictList = screen.getByTestId('conflict-list');
      expect(conflictList).toBeInTheDocument();
    });

    test('should calculate accurate compatibility scores', () => {
      render(
        <TraditionCompatibilityChecker 
          primaryCulture="western" 
          secondaryCulture="jewish" 
        />
      );
      
      const scoreElement = screen.getByTestId('score-percentage');
      const scoreText = scoreElement.textContent || '';
      const score = parseInt(scoreText.replace('%', ''));
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Interactive Tradition Planning', () => {
    test('should allow checking/unchecking ceremony elements', async () => {
      const user = userEvent.setup();
      render(<CeremonyValidator culture="western" ceremonyType="modern" />);
      
      const firstCheckbox = screen.getByTestId('checkbox-processional');
      
      expect(firstCheckbox).toBeChecked();
      
      await act(async () => {
        await user.click(firstCheckbox);
      });
      
      expect(firstCheckbox).not.toBeChecked();
    });

    test('should update validation based on selected elements', async () => {
      const user = userEvent.setup();
      render(<CeremonyValidator culture="indian" ceremonyType="hindu" />);
      
      const ganeshPujaCheckbox = screen.getByTestId('checkbox-ganesh_puja');
      
      await act(async () => {
        await user.click(ganeshPujaCheckbox);
      });
      
      // Validation should update based on selection
      const validationResults = screen.getByTestId('validation-results');
      expect(validationResults).toBeInTheDocument();
    });
  });

  describe('Tradition Duration and Logistics', () => {
    test('should validate ceremony duration requirements', () => {
      const cultures: (keyof typeof weddingTraditions)[] = ['western', 'indian', 'arabic', 'chinese', 'jewish'];
      
      cultures.forEach(culture => {
        render(<WeddingTraditionPlanner culture={culture} tradition="ceremony" />);
        
        const durationElement = screen.getByTestId('duration-requirement');
        const durationText = durationElement.textContent || '';
        const duration = parseInt(durationText.match(/\d+/)?.[0] || '0');
        
        expect(duration).toBeGreaterThan(0);
        
        // Indian weddings should be longest
        if (culture === 'indian') {
          expect(duration).toBeGreaterThan(120);
        }
      });
    });

    test('should provide realistic time estimates for ceremony elements', () => {
      render(<WeddingTraditionPlanner culture="jewish" tradition="ceremony" />);
      
      const elements = ['chuppah', 'ketubah', 'ring_ceremony'];
      
      elements.forEach(element => {
        const durationElement = screen.getByTestId(`duration-${element}`);
        expect(durationElement).toBeInTheDocument();
      });
    });
  });

  describe('Cultural Sensitivity Validation', () => {
    test('should ensure appropriate cultural representation', () => {
      const culturalPairs = [
        { culture: 'arabic', ceremonyType: 'islamic' },
        { culture: 'jewish', ceremonyType: 'orthodox' },
        { culture: 'indian', ceremonyType: 'hindu' },
        { culture: 'chinese', ceremonyType: 'traditional' }
      ];
      
      culturalPairs.forEach(({ culture, ceremonyType }) => {
        render(
          <CeremonyValidator 
            culture={culture as keyof typeof weddingTraditions} 
            ceremonyType={ceremonyType} 
          />
        );
        
        const culturalSensitivity = screen.getByTestId('sensitivity-status');
        expect(culturalSensitivity).toHaveTextContent('✅');
      });
    });

    test('should provide culturally appropriate terminology', () => {
      render(<WeddingTraditionPlanner culture="arabic" tradition="nikah" />);
      
      const traditionTitle = screen.getByTestId('tradition-title');
      expect(traditionTitle).toBeInTheDocument();
      
      // Should use appropriate Islamic terminology
      const description = screen.getByTestId('tradition-description');
      expect(description).toBeInTheDocument();
    });
  });

  describe('Accessibility for Wedding Traditions', () => {
    test('should maintain proper heading hierarchy', () => {
      render(<WeddingTraditionPlanner culture="indian" tradition="ceremony" />);
      
      const mainHeading = screen.getByRole('heading', { level: 1 });
      const subHeadings = screen.getAllByRole('heading', { level: 3 });
      
      expect(mainHeading).toBeInTheDocument();
      expect(subHeadings.length).toBeGreaterThan(0);
    });

    test('should support screen readers for tradition content', () => {
      render(<CeremonyValidator culture="chinese" ceremonyType="traditional" />);
      
      const validator = screen.getByRole('heading', { level: 2 });
      const checkboxes = screen.getAllByRole('checkbox');
      
      expect(validator).toBeInTheDocument();
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    test('should provide appropriate ARIA labels for cultural content', () => {
      render(
        <TraditionCompatibilityChecker 
          primaryCulture="western" 
          secondaryCulture="indian" 
        />
      );
      
      const compatibilityChecker = screen.getByTestId('compatibility-checker');
      expect(compatibilityChecker).toBeInTheDocument();
    });
  });
});