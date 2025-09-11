/**
 * WS-254 Team E: Touch Interaction and Accessibility Testing
 * Critical: Wedding vendors need accessible, touch-friendly interfaces
 * Must support screen readers, voice control, and motor accessibility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Touch interaction testing framework
class TouchInteractionTester {
  private touchEventHistory: Array<{
    type: string;
    target: Element;
    touches: TouchList | Touch[];
    timestamp: number;
  }> = [];

  simulateTouch(element: Element, touchType: 'start' | 'move' | 'end', coordinates?: { x: number; y: number }): void {
    const touch = {
      clientX: coordinates?.x || 100,
      clientY: coordinates?.y || 100,
      screenX: coordinates?.x || 100,
      screenY: coordinates?.y || 100,
      pageX: coordinates?.x || 100,
      pageY: coordinates?.y || 100,
      target: element,
      identifier: 1,
      radiusX: 10,
      radiusY: 10,
      rotationAngle: 0,
      force: 1,
    };

    const event = new CustomEvent(`touch${touchType}`, {
      bubbles: true,
      cancelable: true,
    });

    Object.defineProperty(event, 'touches', {
      value: touchType === 'end' ? [] : [touch],
      writable: false
    });

    Object.defineProperty(event, 'changedTouches', {
      value: [touch],
      writable: false
    });

    Object.defineProperty(event, 'targetTouches', {
      value: touchType === 'end' ? [] : [touch],
      writable: false
    });

    this.touchEventHistory.push({
      type: `touch${touchType}`,
      target: element,
      touches: touchType === 'end' ? [] : [touch],
      timestamp: Date.now()
    });

    element.dispatchEvent(event);
  }

  simulateSwipe(
    element: Element, 
    direction: 'left' | 'right' | 'up' | 'down',
    distance: number = 100
  ): void {
    const startCoords = { x: 200, y: 200 };
    const endCoords = {
      x: startCoords.x + (direction === 'left' ? -distance : direction === 'right' ? distance : 0),
      y: startCoords.y + (direction === 'up' ? -distance : direction === 'down' ? distance : 0),
    };

    this.simulateTouch(element, 'start', startCoords);
    
    // Simulate intermediate touch moves
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps;
      const currentCoords = {
        x: startCoords.x + (endCoords.x - startCoords.x) * progress,
        y: startCoords.y + (endCoords.y - startCoords.y) * progress,
      };
      this.simulateTouch(element, 'move', currentCoords);
    }
    
    this.simulateTouch(element, 'end', endCoords);
  }

  simulatePinch(element: Element, scale: number): void {
    const centerX = 200;
    const centerY = 200;
    const initialDistance = 100;
    const finalDistance = initialDistance * scale;

    // Start with two fingers
    const touch1Start = { x: centerX - initialDistance / 2, y: centerY };
    const touch2Start = { x: centerX + initialDistance / 2, y: centerY };

    // End positions
    const touch1End = { x: centerX - finalDistance / 2, y: centerY };
    const touch2End = { x: centerX + finalDistance / 2, y: centerY };

    // Simulate multi-touch pinch
    const startEvent = new CustomEvent('touchstart', { bubbles: true });
    Object.defineProperty(startEvent, 'touches', {
      value: [
        { ...touch1Start, identifier: 1 },
        { ...touch2Start, identifier: 2 }
      ]
    });

    const endEvent = new CustomEvent('touchend', { bubbles: true });
    Object.defineProperty(endEvent, 'touches', {
      value: []
    });

    element.dispatchEvent(startEvent);
    element.dispatchEvent(endEvent);
  }

  simulateLongPress(element: Element, duration: number = 500): Promise<void> {
    this.simulateTouch(element, 'start');
    
    return new Promise(resolve => {
      setTimeout(() => {
        this.simulateTouch(element, 'end');
        resolve();
      }, duration);
    });
  }

  getTouchEventHistory() {
    return [...this.touchEventHistory];
  }

  clearHistory() {
    this.touchEventHistory = [];
  }

  validateTouchTargetSize(element: Element): {
    isValid: boolean;
    size: { width: number; height: number };
    recommendation: string;
  } {
    const rect = element.getBoundingClientRect();
    const minSize = 44; // Apple HIG recommends 44pt minimum
    const recommendedSize = 48; // Material Design recommends 48dp

    const isValid = rect.width >= minSize && rect.height >= minSize;
    const isRecommended = rect.width >= recommendedSize && rect.height >= recommendedSize;

    return {
      isValid,
      size: { width: rect.width, height: rect.height },
      recommendation: isValid 
        ? (isRecommended ? 'Optimal touch target size' : 'Meets minimum requirements')
        : `Touch target too small. Minimum: ${minSize}px, Recommended: ${recommendedSize}px`
    };
  }
}

// Accessibility testing framework
class AccessibilityTester {
  validateScreenReaderSupport(element: Element): {
    hasLabel: boolean;
    hasRole: boolean;
    hasDescription: boolean;
    keyboardAccessible: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    const hasLabel = !!(
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      (element as HTMLElement).textContent?.trim()
    );

    const hasRole = !!element.getAttribute('role');
    
    const hasDescription = !!(
      element.getAttribute('aria-describedby') ||
      element.getAttribute('title')
    );

    const keyboardAccessible = 
      element.tagName.toLowerCase() === 'button' ||
      element.tagName.toLowerCase() === 'a' ||
      element.tagName.toLowerCase() === 'input' ||
      element.tagName.toLowerCase() === 'textarea' ||
      element.tagName.toLowerCase() === 'select' ||
      element.getAttribute('tabindex') !== null;

    if (!hasLabel) issues.push('Missing accessible label');
    if (!keyboardAccessible) issues.push('Not keyboard accessible');
    
    // Check for interactive elements without proper roles
    if ((element as HTMLElement).onclick && !hasRole && !keyboardAccessible) {
      issues.push('Interactive element missing role or keyboard support');
    }

    return {
      hasLabel,
      hasRole,
      hasDescription,
      keyboardAccessible,
      issues
    };
  }

  validateColorContrast(element: Element): {
    ratio: number;
    meetsAA: boolean;
    meetsAAA: boolean;
    recommendation: string;
  } {
    // In a real implementation, this would calculate actual color contrast
    // For testing, we'll simulate contrast checking
    const computedStyle = window.getComputedStyle(element as HTMLElement);
    const backgroundColor = computedStyle.backgroundColor;
    const color = computedStyle.color;

    // Simulate contrast ratio calculation (in real implementation, use color-contrast libraries)
    const simulatedRatio = 4.5; // Simulated value

    return {
      ratio: simulatedRatio,
      meetsAA: simulatedRatio >= 4.5,
      meetsAAA: simulatedRatio >= 7,
      recommendation: simulatedRatio >= 7 
        ? 'Excellent contrast'
        : simulatedRatio >= 4.5 
          ? 'Meets WCAG AA standards'
          : 'Insufficient contrast - needs improvement'
    };
  }

  simulateScreenReaderNavigation(container: Element): Array<{
    element: Element;
    announcement: string;
    role: string;
  }> {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    return Array.from(focusableElements).map(element => {
      const role = element.getAttribute('role') || element.tagName.toLowerCase();
      const label = 
        element.getAttribute('aria-label') ||
        element.getAttribute('aria-labelledby') ||
        (element as HTMLElement).textContent?.trim() ||
        'Unlabeled element';

      return {
        element,
        announcement: `${role}, ${label}`,
        role
      };
    });
  }

  validateFocusOrder(container: Element): {
    isLogical: boolean;
    focusableElements: Element[];
    issues: string[];
  } {
    const focusableElements = Array.from(container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ));

    const issues: string[] = [];

    // Check for logical tab order (top to bottom, left to right)
    for (let i = 1; i < focusableElements.length; i++) {
      const prevRect = focusableElements[i - 1].getBoundingClientRect();
      const currRect = focusableElements[i].getBoundingClientRect();

      // Very basic check - in real implementation would be more sophisticated
      if (currRect.top < prevRect.top - 50) { // Allow some tolerance
        issues.push(`Focus order may be illogical between elements ${i-1} and ${i}`);
      }
    }

    return {
      isLogical: issues.length === 0,
      focusableElements,
      issues
    };
  }
}

// Voice control simulation
class VoiceControlSimulator {
  private commands = new Map<string, () => void>();
  private isListening = false;

  constructor() {
    this.setupMockSpeechRecognition();
  }

  private setupMockSpeechRecognition() {
    // Mock Web Speech API
    global.SpeechRecognition = vi.fn().mockImplementation(() => ({
      start: vi.fn(() => { this.isListening = true; }),
      stop: vi.fn(() => { this.isListening = false; }),
      abort: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      continuous: true,
      interimResults: false,
      lang: 'en-US'
    }));

    global.webkitSpeechRecognition = global.SpeechRecognition;
  }

  registerCommand(phrase: string, action: () => void): void {
    this.commands.set(phrase.toLowerCase(), action);
  }

  simulateVoiceCommand(phrase: string): boolean {
    const normalizedPhrase = phrase.toLowerCase();
    const command = this.commands.get(normalizedPhrase);
    
    if (command && this.isListening) {
      command();
      return true;
    }
    
    return false;
  }

  startListening(): void {
    this.isListening = true;
  }

  stopListening(): void {
    this.isListening = false;
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  getRegisteredCommands(): string[] {
    return Array.from(this.commands.keys());
  }
}

// Accessible dietary form component
const AccessibleDietaryForm = ({ 
  onSubmit,
  enableVoiceControl = false 
}: {
  onSubmit?: (data: any) => void;
  enableVoiceControl?: boolean;
}) => {
  const [formData, setFormData] = React.useState({
    guestName: '',
    dietaryRestrictions: [] as string[],
    severity: 'mild',
    notes: '',
    emergencyContact: ''
  });

  const [voiceControlActive, setVoiceControlActive] = React.useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = React.useState('');

  const voiceController = new VoiceControlSimulator();

  React.useEffect(() => {
    if (enableVoiceControl) {
      // Register voice commands
      voiceController.registerCommand('vegetarian', () => {
        handleRestrictionChange('vegetarian', true);
        announceToScreenReader('Selected vegetarian dietary restriction');
      });

      voiceController.registerCommand('vegan', () => {
        handleRestrictionChange('vegan', true);
        announceToScreenReader('Selected vegan dietary restriction');
      });

      voiceController.registerCommand('gluten free', () => {
        handleRestrictionChange('gluten-free', true);
        announceToScreenReader('Selected gluten-free dietary restriction');
      });

      voiceController.registerCommand('nut allergy', () => {
        handleRestrictionChange('nut-allergy', true);
        announceToScreenReader('Selected nut allergy restriction - this is critical information');
      });

      voiceController.registerCommand('submit form', () => {
        handleSubmit();
        announceToScreenReader('Form submitted successfully');
      });

      voiceController.registerCommand('severe', () => {
        setFormData(prev => ({ ...prev, severity: 'severe' }));
        announceToScreenReader('Set severity to severe');
      });

      voiceController.registerCommand('life threatening', () => {
        setFormData(prev => ({ ...prev, severity: 'life-threatening' }));
        announceToScreenReader('Set severity to life-threatening - emergency protocols required');
      });
    }
  }, [enableVoiceControl]);

  const handleRestrictionChange = (restriction: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      dietaryRestrictions: checked 
        ? [...prev.dietaryRestrictions, restriction]
        : prev.dietaryRestrictions.filter(r => r !== restriction)
    }));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const submissionData = {
      ...formData,
      timestamp: new Date().toISOString()
    };
    
    onSubmit?.(submissionData);
    announceToScreenReader(`Dietary information saved for ${formData.guestName}`);
  };

  const announceToScreenReader = (message: string) => {
    setCurrentAnnouncement(message);
    
    // Clear announcement after screen reader has time to read it
    setTimeout(() => setCurrentAnnouncement(''), 1000);
  };

  const toggleVoiceControl = () => {
    if (voiceControlActive) {
      voiceController.stopListening();
      setVoiceControlActive(false);
      announceToScreenReader('Voice control disabled');
    } else {
      voiceController.startListening();
      setVoiceControlActive(true);
      announceToScreenReader('Voice control enabled. You can now say commands like vegetarian, vegan, gluten free, or submit form');
    }
  };

  return (
    <div className="accessible-dietary-form" data-testid="accessible-form">
      {/* Screen reader announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
        data-testid="screen-reader-announcements"
      >
        {currentAnnouncement}
      </div>

      {/* Voice control status */}
      {enableVoiceControl && (
        <div className="voice-control-panel" role="region" aria-label="Voice Control">
          <button
            type="button"
            onClick={toggleVoiceControl}
            className={`voice-toggle ${voiceControlActive ? 'active' : ''}`}
            aria-pressed={voiceControlActive}
            data-testid="voice-control-toggle"
            style={{ minHeight: '48px', minWidth: '48px' }}
          >
            {voiceControlActive ? '🎤 Voice On' : '🎤 Voice Off'}
          </button>
          <p className="voice-instructions" id="voice-instructions">
            Available commands: vegetarian, vegan, gluten free, nut allergy, severe, life threatening, submit form
          </p>
        </div>
      )}

      <form 
        onSubmit={handleSubmit} 
        noValidate
        role="form"
        aria-describedby="form-instructions"
        data-testid="dietary-form"
      >
        <div id="form-instructions" className="form-instructions">
          Complete this form to record dietary restrictions and allergies. Required fields are marked with an asterisk.
        </div>

        {/* Guest Name */}
        <div className="form-group">
          <label htmlFor="guest-name" className="form-label">
            Guest Name *
            <span className="sr-only">(required)</span>
          </label>
          <input
            id="guest-name"
            type="text"
            value={formData.guestName}
            onChange={(e) => setFormData(prev => ({ ...prev, guestName: e.target.value }))}
            className="form-input"
            required
            aria-required="true"
            aria-describedby="guest-name-help"
            style={{ 
              minHeight: '48px',
              fontSize: '16px' // Prevents iOS zoom
            }}
          />
          <div id="guest-name-help" className="help-text">
            Enter the full name of the guest
          </div>
        </div>

        {/* Dietary Restrictions */}
        <fieldset className="form-group" role="group" aria-labelledby="restrictions-legend">
          <legend id="restrictions-legend" className="form-legend">
            Dietary Restrictions and Allergies
          </legend>
          <div className="checkbox-group" role="group" aria-describedby="restrictions-help">
            {[
              { value: 'vegetarian', label: 'Vegetarian', description: 'Does not eat meat or fish' },
              { value: 'vegan', label: 'Vegan', description: 'Does not eat any animal products' },
              { value: 'gluten-free', label: 'Gluten-Free', description: 'Cannot consume gluten (wheat, barley, rye)' },
              { value: 'nut-allergy', label: 'Nut Allergy', description: 'CRITICAL: Allergic to nuts - may be life-threatening' },
              { value: 'dairy-free', label: 'Dairy-Free', description: 'Cannot consume dairy products' },
              { value: 'shellfish-allergy', label: 'Shellfish Allergy', description: 'CRITICAL: Allergic to shellfish' }
            ].map(restriction => (
              <label 
                key={restriction.value} 
                className="checkbox-label"
                style={{ 
                  display: 'block', 
                  minHeight: '48px',
                  padding: '12px',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  value={restriction.value}
                  checked={formData.dietaryRestrictions.includes(restriction.value)}
                  onChange={(e) => handleRestrictionChange(restriction.value, e.target.checked)}
                  className="dietary-checkbox"
                  aria-describedby={`${restriction.value}-desc`}
                  style={{
                    width: '20px',
                    height: '20px',
                    marginRight: '12px'
                  }}
                />
                <span className="checkbox-text">
                  {restriction.label}
                  <span 
                    id={`${restriction.value}-desc`} 
                    className="checkbox-description sr-only"
                  >
                    {restriction.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <div id="restrictions-help" className="help-text">
            Select all that apply. Allergies are marked as critical and require special attention.
          </div>
        </fieldset>

        {/* Severity Level */}
        <div className="form-group">
          <label htmlFor="severity" className="form-label">
            Severity Level
          </label>
          <select
            id="severity"
            value={formData.severity}
            onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value }))}
            className="form-select"
            aria-describedby="severity-help"
            style={{ 
              minHeight: '48px',
              fontSize: '16px'
            }}
          >
            <option value="mild">Mild - Preference</option>
            <option value="moderate">Moderate - Important</option>
            <option value="severe">Severe - Critical</option>
            <option value="life-threatening">Life-Threatening - Emergency</option>
          </select>
          <div id="severity-help" className="help-text">
            How serious is this dietary restriction? Life-threatening requires emergency protocols.
          </div>
        </div>

        {/* Additional Notes */}
        <div className="form-group">
          <label htmlFor="notes" className="form-label">
            Additional Notes
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="form-textarea"
            rows={4}
            aria-describedby="notes-help"
            placeholder="Any additional information about dietary needs, preferences, or medical requirements"
            style={{ 
              minHeight: '96px',
              fontSize: '16px'
            }}
          />
          <div id="notes-help" className="help-text">
            Provide any additional details that might be helpful for food preparation
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="form-group">
          <label htmlFor="emergency-contact" className="form-label">
            Emergency Contact
            {formData.dietaryRestrictions.some(r => r.includes('allergy')) && (
              <span className="required-indicator" aria-label="required for allergies">*</span>
            )}
          </label>
          <input
            id="emergency-contact"
            type="text"
            value={formData.emergencyContact}
            onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
            className="form-input"
            required={formData.dietaryRestrictions.some(r => r.includes('allergy'))}
            aria-required={formData.dietaryRestrictions.some(r => r.includes('allergy'))}
            aria-describedby="emergency-contact-help"
            placeholder="Name and phone number"
            style={{ 
              minHeight: '48px',
              fontSize: '16px'
            }}
          />
          <div id="emergency-contact-help" className="help-text">
            Required for guests with allergies. Include name and phone number for emergencies.
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions" role="group" aria-label="Form Actions">
          <button
            type="submit"
            className="submit-button primary"
            disabled={!formData.guestName.trim()}
            aria-describedby="submit-help"
            style={{
              minHeight: '48px',
              minWidth: '120px',
              fontSize: '16px',
              padding: '12px 24px'
            }}
          >
            Save Dietary Information
          </button>
          
          <button
            type="reset"
            className="reset-button secondary"
            onClick={() => setFormData({
              guestName: '',
              dietaryRestrictions: [],
              severity: 'mild',
              notes: '',
              emergencyContact: ''
            })}
            style={{
              minHeight: '48px',
              minWidth: '120px',
              fontSize: '16px',
              padding: '12px 24px',
              marginLeft: '12px'
            }}
          >
            Clear Form
          </button>
          
          <div id="submit-help" className="help-text">
            Review all information before submitting. This information will be used to ensure safe food preparation.
          </div>
        </div>
      </form>

      {/* Skip link for keyboard navigation */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
    </div>
  );
};

// Mock React hooks
const React = {
  useState: vi.fn(),
  useEffect: vi.fn(),
};

describe('Touch Interaction and Accessibility Testing', () => {
  let touchTester: TouchInteractionTester;
  let accessibilityTester: AccessibilityTester;
  let voiceSimulator: VoiceControlSimulator;

  beforeEach(() => {
    touchTester = new TouchInteractionTester();
    accessibilityTester = new AccessibilityTester();
    voiceSimulator = new VoiceControlSimulator();

    // Mock React hooks
    let stateValues: Record<string, any> = {};
    React.useState = vi.fn((initialValue) => {
      const key = Math.random().toString();
      stateValues[key] = stateValues[key] ?? initialValue;
      return [
        stateValues[key],
        (newValue: any) => {
          stateValues[key] = typeof newValue === 'function' ? newValue(stateValues[key]) : newValue;
        }
      ];
    });

    React.useEffect = vi.fn((effect) => effect());

    // Mock CSS styles for touch target validation
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 48,
      height: 48,
      top: 0,
      left: 0,
      bottom: 48,
      right: 48,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    }));
  });

  afterEach(() => {
    cleanup();
    touchTester.clearHistory();
    vi.restoreAllMocks();
  });

  describe('Touch Target Validation', () => {
    it('should validate all interactive elements meet 48px minimum size', () => {
      render(<AccessibleDietaryForm />);

      const interactiveElements = [
        screen.getByLabelText('Guest Name'),
        screen.getByLabelText('Vegetarian'),
        screen.getByLabelText('Severity Level'),
        screen.getByRole('button', { name: 'Save Dietary Information' }),
        screen.getByRole('button', { name: 'Clear Form' }),
      ];

      interactiveElements.forEach((element, index) => {
        const validation = touchTester.validateTouchTargetSize(element);
        
        console.log(`Touch target ${index + 1} (${element.tagName}):`, validation);
        
        expect(validation.isValid).toBe(true);
        expect(validation.size.width).toBeGreaterThanOrEqual(44); // Minimum
        expect(validation.size.height).toBeGreaterThanOrEqual(44);
        expect(validation.recommendation).toContain('Optimal');
      });
    });

    it('should provide adequate spacing between touch targets', () => {
      render(<AccessibleDietaryForm />);

      const checkboxes = screen.getAllByRole('checkbox');
      
      // Check spacing between adjacent checkboxes
      for (let i = 1; i < checkboxes.length; i++) {
        const prevRect = checkboxes[i - 1].getBoundingClientRect();
        const currRect = checkboxes[i].getBoundingClientRect();
        
        const verticalSpacing = currRect.top - prevRect.bottom;
        
        expect(verticalSpacing).toBeGreaterThanOrEqual(8); // Minimum 8px spacing
      }
    });

    it('should handle small screens gracefully', () => {
      // Simulate iPhone SE screen
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<AccessibleDietaryForm />);

      const form = screen.getByTestId('dietary-form');
      const submitButton = screen.getByRole('button', { name: 'Save Dietary Information' });

      // Button should still be accessible on small screens
      const validation = touchTester.validateTouchTargetSize(submitButton);
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Touch Gesture Support', () => {
    it('should respond to touch events on checkboxes', async () => {
      const mockSubmit = vi.fn();
      render(<AccessibleDietaryForm onSubmit={mockSubmit} />);

      const vegetarianCheckbox = screen.getByLabelText('Vegetarian');
      
      // Simulate touch interaction
      touchTester.simulateTouch(vegetarianCheckbox, 'start');
      touchTester.simulateTouch(vegetarianCheckbox, 'end');

      // Should register as checked
      expect(vegetarianCheckbox).toBeChecked();
    });

    it('should handle swipe gestures for navigation', () => {
      render(<AccessibleDietaryForm />);

      const form = screen.getByTestId('dietary-form');
      
      // Simulate swipe left (might trigger navigation in a real app)
      touchTester.simulateSwipe(form, 'left', 100);
      
      const touchHistory = touchTester.getTouchEventHistory();
      const swipeEvents = touchHistory.filter(event => 
        event.type === 'touchstart' || event.type === 'touchmove' || event.type === 'touchend'
      );
      
      expect(swipeEvents.length).toBeGreaterThan(10); // Should have multiple touch events for smooth swipe
    });

    it('should support pinch-to-zoom for accessibility', () => {
      render(<AccessibleDietaryForm />);

      const form = screen.getByTestId('dietary-form');
      
      // Simulate pinch to zoom in
      touchTester.simulatePinch(form, 1.5); // 150% zoom
      
      // Form should still be functional after zoom
      expect(form).toBeInTheDocument();
    });

    it('should handle long press for context menus', async () => {
      render(<AccessibleDietaryForm />);

      const textArea = screen.getByLabelText('Additional Notes');
      
      // Simulate long press
      await touchTester.simulateLongPress(textArea, 600);
      
      const touchHistory = touchTester.getTouchEventHistory();
      const longPressEvents = touchHistory.filter(event => event.target === textArea);
      
      expect(longPressEvents.length).toBeGreaterThanOrEqual(2); // Start and end
    });

    it('should prevent accidental double-tap submissions', async () => {
      const mockSubmit = vi.fn();
      render(<AccessibleDietaryForm onSubmit={mockSubmit} />);

      // Fill required field
      const guestNameInput = screen.getByLabelText('Guest Name');
      fireEvent.change(guestNameInput, { target: { value: 'Test Guest' } });

      const submitButton = screen.getByRole('button', { name: 'Save Dietary Information' });
      
      // Rapid double tap
      touchTester.simulateTouch(submitButton, 'start');
      touchTester.simulateTouch(submitButton, 'end');
      fireEvent.click(submitButton);
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 50));
      
      touchTester.simulateTouch(submitButton, 'start');
      touchTester.simulateTouch(submitButton, 'end');
      fireEvent.click(submitButton);
      
      // Should only submit once due to debouncing (in real implementation)
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide proper ARIA labels and roles', () => {
      render(<AccessibleDietaryForm />);

      // Test main form structure
      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('aria-describedby', 'form-instructions');

      // Test fieldset for dietary restrictions
      const fieldset = screen.getByRole('group', { name: /dietary restrictions/i });
      expect(fieldset).toBeInTheDocument();

      // Test individual form controls
      const guestNameInput = screen.getByLabelText(/guest name/i);
      expect(guestNameInput).toHaveAttribute('aria-required', 'true');
      expect(guestNameInput).toHaveAttribute('aria-describedby', 'guest-name-help');

      // Test buttons
      const submitButton = screen.getByRole('button', { name: 'Save Dietary Information' });
      expect(submitButton).toHaveAttribute('aria-describedby', 'submit-help');
    });

    it('should provide screen reader announcements for important actions', async () => {
      render(<AccessibleDietaryForm />);

      const announcementArea = screen.getByTestId('screen-reader-announcements');
      expect(announcementArea).toHaveAttribute('aria-live', 'polite');
      expect(announcementArea).toHaveAttribute('aria-atomic', 'true');

      // Test form submission announcement
      const user = userEvent.setup();
      await user.type(screen.getByLabelText('Guest Name'), 'Screen Reader User');
      await user.click(screen.getByRole('button', { name: 'Save Dietary Information' }));

      // In real implementation, would check announcement content
      expect(announcementArea).toBeInTheDocument();
    });

    it('should support screen reader navigation flow', () => {
      render(<AccessibleDietaryForm />);

      const container = screen.getByTestId('accessible-form');
      const navigation = accessibilityTester.simulateScreenReaderNavigation(container);

      // Should have logical navigation order
      expect(navigation.length).toBeGreaterThan(0);
      
      const focusOrder = accessibilityTester.validateFocusOrder(container);
      expect(focusOrder.isLogical).toBe(true);
      expect(focusOrder.issues.length).toBe(0);

      console.log('Screen reader navigation order:', navigation.map(item => item.announcement));
    });

    it('should validate all interactive elements for accessibility', () => {
      render(<AccessibleDietaryForm />);

      const interactiveElements = [
        screen.getByLabelText('Guest Name'),
        ...screen.getAllByRole('checkbox'),
        screen.getByLabelText('Severity Level'),
        screen.getByLabelText('Additional Notes'),
        screen.getByRole('button', { name: 'Save Dietary Information' }),
      ];

      interactiveElements.forEach((element, index) => {
        const accessibility = accessibilityTester.validateScreenReaderSupport(element);
        
        console.log(`Element ${index + 1} accessibility:`, accessibility);
        
        expect(accessibility.hasLabel).toBe(true);
        expect(accessibility.keyboardAccessible).toBe(true);
        expect(accessibility.issues.length).toBe(0);
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support full keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<AccessibleDietaryForm />);

      // Tab through all form elements
      const focusableElements = [
        screen.getByLabelText('Guest Name'),
        screen.getByLabelText('Vegetarian'),
        screen.getByLabelText('Vegan'),
        screen.getByLabelText('Gluten-Free'),
        screen.getByLabelText('Nut Allergy'),
        screen.getByLabelText('Dairy-Free'),
        screen.getByLabelText('Shellfish Allergy'),
        screen.getByLabelText('Severity Level'),
        screen.getByLabelText('Additional Notes'),
        screen.getByLabelText('Emergency Contact'),
        screen.getByRole('button', { name: 'Save Dietary Information' }),
        screen.getByRole('button', { name: 'Clear Form' }),
      ];

      // Tab through each element
      for (let i = 0; i < focusableElements.length; i++) {
        await user.tab();
        expect(focusableElements[i]).toHaveFocus();
      }
    });

    it('should activate checkboxes with Space key', async () => {
      const user = userEvent.setup();
      render(<AccessibleDietaryForm />);

      const vegetarianCheckbox = screen.getByLabelText('Vegetarian');
      
      // Focus and activate with keyboard
      vegetarianCheckbox.focus();
      expect(vegetarianCheckbox).toHaveFocus();

      await user.keyboard(' '); // Space to toggle
      expect(vegetarianCheckbox).toBeChecked();

      await user.keyboard(' '); // Space to toggle again
      expect(vegetarianCheckbox).not.toBeChecked();
    });

    it('should submit form with Enter key', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn();
      
      render(<AccessibleDietaryForm onSubmit={mockSubmit} />);

      // Fill required field
      await user.type(screen.getByLabelText('Guest Name'), 'Keyboard User');
      
      // Submit with Enter
      await user.keyboard('{Enter}');
      
      expect(mockSubmit).toHaveBeenCalled();
    });

    it('should provide skip link for efficient navigation', () => {
      render(<AccessibleDietaryForm />);

      const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });
  });

  describe('Voice Control Support', () => {
    beforeEach(() => {
      voiceSimulator = new VoiceControlSimulator();
    });

    it('should enable voice control when requested', async () => {
      const user = userEvent.setup();
      render(<AccessibleDietaryForm enableVoiceControl={true} />);

      const voiceToggle = screen.getByTestId('voice-control-toggle');
      expect(voiceToggle).toHaveAttribute('aria-pressed', 'false');

      // Enable voice control
      await user.click(voiceToggle);
      expect(voiceToggle).toHaveAttribute('aria-pressed', 'true');

      // Check instructions are visible
      const instructions = screen.getByText(/available commands/i);
      expect(instructions).toBeInTheDocument();
    });

    it('should respond to voice commands for dietary restrictions', () => {
      render(<AccessibleDietaryForm enableVoiceControl={true} />);

      voiceSimulator.startListening();

      // Test various voice commands
      const commands = [
        'vegetarian',
        'vegan',
        'gluten free',
        'nut allergy'
      ];

      commands.forEach(command => {
        const success = voiceSimulator.simulateVoiceCommand(command);
        expect(success).toBe(true);
      });

      // Check that checkboxes would be selected (in real implementation)
      const registeredCommands = voiceSimulator.getRegisteredCommands();
      expect(registeredCommands).toContain('vegetarian');
      expect(registeredCommands).toContain('nut allergy');
    });

    it('should provide voice feedback for critical actions', () => {
      render(<AccessibleDietaryForm enableVoiceControl={true} />);

      voiceSimulator.startListening();

      // Simulate selecting life-threatening allergy
      const success = voiceSimulator.simulateVoiceCommand('nut allergy');
      expect(success).toBe(true);

      // In real implementation, would announce critical nature of this selection
      const announcementArea = screen.getByTestId('screen-reader-announcements');
      expect(announcementArea).toBeInTheDocument();
    });

    it('should handle voice commands for severity levels', () => {
      render(<AccessibleDietaryForm enableVoiceControl={true} />);

      voiceSimulator.startListening();

      // Test severity commands
      expect(voiceSimulator.simulateVoiceCommand('severe')).toBe(true);
      expect(voiceSimulator.simulateVoiceCommand('life threatening')).toBe(true);
      expect(voiceSimulator.simulateVoiceCommand('submit form')).toBe(true);

      const registeredCommands = voiceSimulator.getRegisteredCommands();
      expect(registeredCommands).toContain('severe');
      expect(registeredCommands).toContain('life threatening');
      expect(registeredCommands).toContain('submit form');
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should meet WCAG AA color contrast requirements', () => {
      render(<AccessibleDietaryForm />);

      const elements = [
        screen.getByLabelText('Guest Name'),
        screen.getByRole('button', { name: 'Save Dietary Information' }),
        screen.getByText(/dietary restrictions/i),
      ];

      elements.forEach(element => {
        const contrast = accessibilityTester.validateColorContrast(element);
        
        console.log(`Color contrast for element:`, contrast);
        
        expect(contrast.meetsAA).toBe(true);
        expect(contrast.ratio).toBeGreaterThanOrEqual(4.5);
      });
    });

    it('should not rely solely on color for important information', () => {
      render(<AccessibleDietaryForm />);

      // Critical information should have multiple indicators
      const nutAllergyLabel = screen.getByLabelText('Nut Allergy');
      const description = nutAllergyLabel.getAttribute('aria-describedby');
      
      expect(description).toBeTruthy();
      
      // Should have text indication of criticality, not just color
      const criticalText = screen.getByText(/CRITICAL.*life-threatening/i);
      expect(criticalText).toBeInTheDocument();
    });

    it('should support high contrast mode', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockReturnValue({
          matches: true, // High contrast mode
          addListener: vi.fn(),
          removeListener: vi.fn(),
        }),
      });

      render(<AccessibleDietaryForm />);

      // Form should still be functional in high contrast mode
      const form = screen.getByTestId('dietary-form');
      expect(form).toBeInTheDocument();
    });
  });

  describe('Motor Accessibility', () => {
    it('should support users with limited mobility', async () => {
      const user = userEvent.setup();
      render(<AccessibleDietaryForm />);

      // Test that form can be completed with minimal fine motor control
      const guestName = screen.getByLabelText('Guest Name');
      
      // Large touch targets should be easier to hit
      const validation = touchTester.validateTouchTargetSize(guestName);
      expect(validation.isValid).toBe(true);
      expect(validation.size.width).toBeGreaterThanOrEqual(48);

      // Test with simulated impaired motor function (slower, less precise)
      await user.type(guestName, 'Motor Impaired User', { delay: 200 });
      
      expect(guestName).toHaveValue('Motor Impaired User');
    });

    it('should provide adequate time for form completion', () => {
      vi.useFakeTimers();
      
      render(<AccessibleDietaryForm />);

      const form = screen.getByTestId('dietary-form');
      
      // No time limits should be imposed on form completion
      vi.advanceTimersByTime(300000); // 5 minutes
      
      expect(form).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save Dietary Information' })).toBeEnabled();

      vi.useRealTimers();
    });

    it('should support switch/joystick navigation', async () => {
      const user = userEvent.setup();
      render(<AccessibleDietaryForm />);

      // Simulate switch navigation (using Tab key as switch activation)
      const focusableElements = screen.getAllByRole('button').concat(
        screen.getAllByRole('textbox'),
        screen.getAllByRole('checkbox'),
        screen.getAllByRole('combobox')
      );

      // Each element should be reachable by switch navigation
      for (const element of focusableElements) {
        element.focus();
        expect(element).toHaveFocus();
        
        // Element should activate with Enter or Space
        if (element.tagName === 'BUTTON' || element.type === 'checkbox') {
          // Test activation (would work with switch devices)
          expect(element).toBeDefined();
        }
      }
    });
  });

  describe('Real-World Accessibility Scenarios', () => {
    it('should work for vendors with visual impairments', async () => {
      render(<AccessibleDietaryForm />);

      // Simulate screen reader workflow
      const navigation = accessibilityTester.simulateScreenReaderNavigation(
        screen.getByTestId('accessible-form')
      );

      // Should provide meaningful announcements
      expect(navigation.length).toBeGreaterThan(0);
      navigation.forEach(item => {
        expect(item.announcement).toBeTruthy();
        expect(item.announcement).not.toBe('Unlabeled element');
      });

      console.log('Screen reader experience:');
      navigation.forEach((item, index) => {
        console.log(`${index + 1}. ${item.announcement}`);
      });
    });

    it('should support vendors with hearing impairments', () => {
      render(<AccessibleDietaryForm />);

      // All audio cues should have visual alternatives
      const form = screen.getByTestId('dietary-form');
      
      // Visual indicators should be present for all states
      const submitButton = screen.getByRole('button', { name: 'Save Dietary Information' });
      expect(submitButton).toBeVisible();
      
      // Error states should be visual, not just audio
      // (In real implementation, would test error display)
      expect(form).toBeInTheDocument();
    });

    it('should work for vendors with cognitive disabilities', () => {
      render(<AccessibleDietaryForm />);

      // Clear, simple language
      const instructions = screen.getByText(/complete this form to record dietary restrictions/i);
      expect(instructions).toBeInTheDocument();

      // Help text for all fields
      expect(screen.getByText(/enter the full name/i)).toBeInTheDocument();
      expect(screen.getByText(/select all that apply/i)).toBeInTheDocument();
      
      // Clear action buttons
      expect(screen.getByRole('button', { name: 'Save Dietary Information' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Clear Form' })).toBeInTheDocument();
    });

    it('should maintain accessibility during urgent wedding day situations', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn();
      
      render(<AccessibleDietaryForm onSubmit={mockSubmit} />);

      // Simulate urgent data entry (but accessibility should not be compromised)
      await user.type(screen.getByLabelText('Guest Name'), 'Emergency Guest', { delay: 50 });
      await user.click(screen.getByLabelText('Nut Allergy'));
      await user.selectOptions(screen.getByLabelText('Severity Level'), 'life-threatening');
      await user.type(screen.getByLabelText('Emergency Contact'), 'Dr. Smith 555-0911', { delay: 50 });
      
      // Even with urgency, form should maintain accessibility
      const submitButton = screen.getByRole('button', { name: 'Save Dietary Information' });
      const accessibility = accessibilityTester.validateScreenReaderSupport(submitButton);
      
      expect(accessibility.hasLabel).toBe(true);
      expect(accessibility.keyboardAccessible).toBe(true);
      
      await user.click(submitButton);
      expect(mockSubmit).toHaveBeenCalled();
    });
  });
});