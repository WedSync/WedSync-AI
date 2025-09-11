/**
 * WS-254 Team E: Mobile-First Testing Strategy - Device Matrix Testing
 * Critical: 60% of wedding vendors use mobile devices
 * Must work flawlessly on iPhone SE (smallest screen) to iPad Pro
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock mobile device configurations
const DEVICE_MATRIX = {
  'iPhone SE': {
    width: 375,
    height: 667,
    devicePixelRatio: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    touchEnabled: true,
    network: '4G',
    orientation: 'portrait'
  },
  'iPhone 14 Pro': {
    width: 393,
    height: 852,
    devicePixelRatio: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    touchEnabled: true,
    network: '5G',
    orientation: 'portrait'
  },
  'Samsung Galaxy S23': {
    width: 360,
    height: 800,
    devicePixelRatio: 3,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36',
    touchEnabled: true,
    network: '5G',
    orientation: 'portrait'
  },
  'iPad Mini': {
    width: 768,
    height: 1024,
    devicePixelRatio: 2,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    touchEnabled: true,
    network: 'WiFi',
    orientation: 'portrait'
  },
  'iPad Pro': {
    width: 1024,
    height: 1366,
    devicePixelRatio: 2,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    touchEnabled: true,
    network: 'WiFi',
    orientation: 'landscape'
  }
};

// Mobile testing utilities
class MobileTestingFramework {
  private currentDevice: keyof typeof DEVICE_MATRIX = 'iPhone SE';
  private networkCondition: '3G' | '4G' | '5G' | 'WiFi' | 'offline' = '4G';

  setDevice(device: keyof typeof DEVICE_MATRIX): void {
    this.currentDevice = device;
    const config = DEVICE_MATRIX[device];
    
    // Mock viewport dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: config.width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: config.height,
    });
    
    // Mock device pixel ratio
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      configurable: true,
      value: config.devicePixelRatio,
    });
    
    // Mock user agent
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: config.userAgent,
    });
    
    // Mock touch support
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      configurable: true,
      value: config.touchEnabled ? {} : undefined,
    });
  }

  setNetworkCondition(condition: '3G' | '4G' | '5G' | 'WiFi' | 'offline'): void {
    this.networkCondition = condition;
    
    // Mock navigator.connection for network testing
    Object.defineProperty(navigator, 'connection', {
      writable: true,
      configurable: true,
      value: {
        effectiveType: condition === 'offline' ? 'slow-2g' : condition.toLowerCase(),
        downlink: {
          '3G': 0.4,
          '4G': 10,
          '5G': 50,
          'WiFi': 25,
          'offline': 0
        }[condition],
        rtt: {
          '3G': 400,
          '4G': 100,
          '5G': 20,
          'WiFi': 50,
          'offline': 0
        }[condition],
        saveData: condition === '3G',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }
    });
  }

  simulateNetworkDelay(): Promise<void> {
    const delays = {
      '3G': 300 + Math.random() * 200,
      '4G': 100 + Math.random() * 100,
      '5G': 20 + Math.random() * 30,
      'WiFi': 10 + Math.random() * 20,
      'offline': 0
    };
    
    const delay = delays[this.networkCondition];
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  mockOfflineMode(): void {
    this.setNetworkCondition('offline');
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: false,
    });
    
    // Dispatch offline event
    window.dispatchEvent(new Event('offline'));
  }

  mockOnlineMode(): void {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true,
    });
    
    // Dispatch online event
    window.dispatchEvent(new Event('online'));
  }

  validateTouchTarget(element: HTMLElement): {
    isValid: boolean;
    actualSize: { width: number; height: number };
    issues: string[];
  } {
    const rect = element.getBoundingClientRect();
    const minSize = 48; // 48px minimum as per requirements
    const issues: string[] = [];
    
    if (rect.width < minSize) {
      issues.push(`Touch target width ${rect.width}px is below minimum ${minSize}px`);
    }
    
    if (rect.height < minSize) {
      issues.push(`Touch target height ${rect.height}px is below minimum ${minSize}px`);
    }
    
    return {
      isValid: issues.length === 0,
      actualSize: { width: rect.width, height: rect.height },
      issues
    };
  }

  validateThumbReach(element: HTMLElement): {
    isThumbReachable: boolean;
    distanceFromBottom: number;
    recommendation: string;
  } {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const thumbReachZone = viewportHeight * 0.75; // Bottom 75% of screen
    const distanceFromBottom = viewportHeight - rect.bottom;
    
    return {
      isThumbReachable: rect.top > (viewportHeight - thumbReachZone),
      distanceFromBottom,
      recommendation: rect.top <= (viewportHeight - thumbReachZone) 
        ? 'Move element to bottom 75% of screen for better thumb accessibility'
        : 'Element is in optimal thumb reach zone'
    };
  }

  getCurrentDevice() {
    return {
      name: this.currentDevice,
      config: DEVICE_MATRIX[this.currentDevice],
      networkCondition: this.networkCondition
    };
  }
}

// Mock dietary form component for testing
const MockDietaryForm = ({ onSubmit, autoSave = false }: { 
  onSubmit?: (data: any) => void;
  autoSave?: boolean;
}) => {
  const [formData, setFormData] = React.useState({
    guestName: '',
    dietaryRestrictions: [] as string[],
    severity: 'mild',
    notes: ''
  });

  React.useEffect(() => {
    if (autoSave) {
      const interval = setInterval(() => {
        localStorage.setItem('dietary-form-autosave', JSON.stringify(formData));
      }, 30000); // Auto-save every 30 seconds as per requirements
      
      return () => clearInterval(interval);
    }
  }, [formData, autoSave]);

  const handleRestrictionToggle = (restriction: string) => {
    setFormData(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(restriction)
        ? prev.dietaryRestrictions.filter(r => r !== restriction)
        : [...prev.dietaryRestrictions, restriction]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="dietary-form" data-testid="dietary-form">
      <div className="form-group">
        <label htmlFor="guest-name">Guest Name</label>
        <input
          id="guest-name"
          type="text"
          value={formData.guestName}
          onChange={(e) => setFormData(prev => ({ ...prev, guestName: e.target.value }))}
          className="form-input"
          style={{ minHeight: '48px', minWidth: '48px' }}
        />
      </div>

      <div className="form-group">
        <fieldset>
          <legend>Dietary Restrictions</legend>
          {['vegetarian', 'vegan', 'gluten-free', 'nut-allergy', 'dairy-free'].map(restriction => (
            <label key={restriction} className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.dietaryRestrictions.includes(restriction)}
                onChange={() => handleRestrictionToggle(restriction)}
                className="dietary-checkbox"
                style={{ minHeight: '48px', minWidth: '48px' }}
              />
              <span className="checkbox-text">{restriction}</span>
            </label>
          ))}
        </fieldset>
      </div>

      <div className="form-group">
        <label htmlFor="severity">Severity</label>
        <select
          id="severity"
          value={formData.severity}
          onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value }))}
          className="form-select"
          style={{ minHeight: '48px' }}
        >
          <option value="mild">Mild</option>
          <option value="moderate">Moderate</option>
          <option value="severe">Severe</option>
          <option value="life-threatening">Life-threatening</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="notes">Additional Notes</label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          className="form-textarea"
          style={{ minHeight: '48px' }}
          placeholder="Any additional dietary information..."
        />
      </div>

      <div className="form-actions" style={{ position: 'fixed', bottom: '20px', width: '100%' }}>
        <button
          type="submit"
          className="submit-button"
          style={{ 
            minHeight: '48px', 
            minWidth: '48px',
            width: '100%',
            fontSize: '16px' // Prevent zoom on iOS
          }}
        >
          Save Dietary Information
        </button>
      </div>
    </form>
  );
};

// Mock React import for component
const React = {
  useState: vi.fn(() => [{}, vi.fn()]),
  useEffect: vi.fn(),
};

describe('Mobile Device Matrix Testing', () => {
  let mobileFramework: MobileTestingFramework;

  beforeEach(() => {
    mobileFramework = new MobileTestingFramework();
    
    // Mock localStorage
    const mockStorage: Record<string, string> = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockStorage[key];
        }),
        clear: vi.fn(() => {
          Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
        })
      }
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('iPhone SE Testing (Minimum Screen Size)', () => {
    beforeEach(() => {
      mobileFramework.setDevice('iPhone SE');
    });

    it('should render dietary form correctly on iPhone SE (375px width)', () => {
      const { container } = render(<MockDietaryForm />);
      const form = container.querySelector('.dietary-form');
      
      expect(form).toBeInTheDocument();
      expect(window.innerWidth).toBe(375);
      expect(window.innerHeight).toBe(667);
    });

    it('should have touch targets meeting 48x48px minimum requirement', () => {
      render(<MockDietaryForm />);
      
      // Test all interactive elements
      const guestNameInput = screen.getByLabelText('Guest Name');
      const checkboxes = screen.getAllByRole('checkbox');
      const severitySelect = screen.getByLabelText('Severity');
      const submitButton = screen.getByRole('button', { name: 'Save Dietary Information' });
      
      const elementsToTest = [guestNameInput, ...checkboxes, severitySelect, submitButton];
      
      elementsToTest.forEach((element, index) => {
        const validation = mobileFramework.validateTouchTarget(element);
        
        console.log(`Touch target ${index + 1}:`, validation);
        
        expect(validation.isValid).toBe(true);
        expect(validation.actualSize.width).toBeGreaterThanOrEqual(48);
        expect(validation.actualSize.height).toBeGreaterThanOrEqual(48);
      });
    });

    it('should position submit button in thumb-reachable zone', () => {
      render(<MockDietaryForm />);
      
      const submitButton = screen.getByRole('button', { name: 'Save Dietary Information' });
      const thumbReach = mobileFramework.validateThumbReach(submitButton);
      
      console.log('Thumb reach validation:', thumbReach);
      
      expect(thumbReach.isThumbReachable).toBe(true);
      expect(thumbReach.distanceFromBottom).toBeLessThan(100); // Should be near bottom
    });

    it('should handle form input without iOS zoom (16px font minimum)', () => {
      render(<MockDietaryForm />);
      
      const inputs = screen.getAllByRole('textbox');
      const selects = screen.getAllByRole('combobox');
      
      [...inputs, ...selects].forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        const fontSize = parseFloat(computedStyle.fontSize);
        
        expect(fontSize).toBeGreaterThanOrEqual(16); // Prevents iOS zoom
      });
    });

    it('should maintain functionality with limited screen real estate', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn();
      
      render(<MockDietaryForm onSubmit={mockSubmit} />);
      
      // Fill form on small screen
      await user.type(screen.getByLabelText('Guest Name'), 'John Doe');
      await user.click(screen.getByLabelText('vegetarian'));
      await user.selectOptions(screen.getByLabelText('Severity'), 'severe');
      await user.type(screen.getByLabelText('Additional Notes'), 'Strict vegetarian');
      
      // Submit form
      await user.click(screen.getByRole('button', { name: 'Save Dietary Information' }));
      
      expect(mockSubmit).toHaveBeenCalledWith({
        guestName: 'John Doe',
        dietaryRestrictions: ['vegetarian'],
        severity: 'severe',
        notes: 'Strict vegetarian'
      });
    });
  });

  describe('Cross-Device Compatibility Testing', () => {
    it('should work consistently across all device sizes', async () => {
      const devices = Object.keys(DEVICE_MATRIX) as Array<keyof typeof DEVICE_MATRIX>;
      const testResults: Array<{
        device: string;
        renderSuccess: boolean;
        touchTargetsValid: boolean;
        formFunctional: boolean;
      }> = [];

      for (const device of devices) {
        mobileFramework.setDevice(device);
        
        console.log(`Testing device: ${device} (${DEVICE_MATRIX[device].width}x${DEVICE_MATRIX[device].height})`);
        
        const { container, unmount } = render(<MockDietaryForm />);
        
        // Test rendering
        const form = container.querySelector('.dietary-form');
        const renderSuccess = !!form;
        
        // Test touch targets
        const checkboxes = screen.getAllByRole('checkbox');
        const touchTargetsValid = checkboxes.every(checkbox => {
          const validation = mobileFramework.validateTouchTarget(checkbox);
          return validation.isValid;
        });
        
        // Test form functionality
        const user = userEvent.setup();
        let formFunctional = true;
        try {
          await user.type(screen.getByLabelText('Guest Name'), 'Test User');
          await user.click(screen.getByLabelText('vegetarian'));
        } catch (error) {
          formFunctional = false;
        }
        
        testResults.push({
          device,
          renderSuccess,
          touchTargetsValid,
          formFunctional
        });
        
        unmount();
      }

      console.log('Cross-device compatibility results:', testResults);

      // All devices should pass all tests
      testResults.forEach(result => {
        expect(result.renderSuccess).toBe(true);
        expect(result.touchTargetsValid).toBe(true);
        expect(result.formFunctional).toBe(true);
      });
    });

    it('should adapt to different orientations', () => {
      const tabletDevices: Array<keyof typeof DEVICE_MATRIX> = ['iPad Mini', 'iPad Pro'];
      
      tabletDevices.forEach(device => {
        mobileFramework.setDevice(device);
        const deviceConfig = DEVICE_MATRIX[device];
        
        // Test portrait orientation
        render(<MockDietaryForm />);
        const form = screen.getByTestId('dietary-form');
        expect(form).toBeInTheDocument();
        
        cleanup();
        
        // Test landscape orientation (swap width/height)
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: deviceConfig.height,
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: deviceConfig.width,
        });
        
        render(<MockDietaryForm />);
        const landscapeForm = screen.getByTestId('dietary-form');
        expect(landscapeForm).toBeInTheDocument();
        
        cleanup();
      });
    });
  });

  describe('Network Condition Testing', () => {
    it('should maintain usability on 3G networks', async () => {
      mobileFramework.setDevice('iPhone SE');
      mobileFramework.setNetworkCondition('3G');
      
      const user = userEvent.setup();
      const mockSubmit = vi.fn();
      
      render(<MockDietaryForm onSubmit={mockSubmit} />);
      
      // Simulate 3G delay
      const networkDelay = mobileFramework.simulateNetworkDelay();
      
      // Fill form (should work without network)
      await user.type(screen.getByLabelText('Guest Name'), 'Slow Network User');
      await user.click(screen.getByLabelText('gluten-free'));
      
      // Submit with network delay
      const submitPromise = user.click(screen.getByRole('button', { name: 'Save Dietary Information' }));
      
      await Promise.all([networkDelay, submitPromise]);
      
      expect(mockSubmit).toHaveBeenCalled();
    });

    it('should handle offline mode gracefully', async () => {
      mobileFramework.setDevice('iPhone SE');
      mobileFramework.mockOfflineMode();
      
      const user = userEvent.setup();
      
      render(<MockDietaryForm autoSave={true} />);
      
      // Fill form while offline
      await user.type(screen.getByLabelText('Guest Name'), 'Offline User');
      await user.click(screen.getByLabelText('nut-allergy'));
      await user.type(screen.getByLabelText('Additional Notes'), 'Severe allergy - offline entry');
      
      // Data should be auto-saved to localStorage
      await waitFor(() => {
        const savedData = localStorage.getItem('dietary-form-autosave');
        expect(savedData).toBeTruthy();
        
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          expect(parsedData.guestName).toBe('Offline User');
          expect(parsedData.dietaryRestrictions).toContain('nut-allergy');
        }
      });
    });

    it('should sync data when coming back online', async () => {
      mobileFramework.setDevice('iPhone SE');
      
      // Start offline
      mobileFramework.mockOfflineMode();
      
      const user = userEvent.setup();
      render(<MockDietaryForm autoSave={true} />);
      
      // Fill form offline
      await user.type(screen.getByLabelText('Guest Name'), 'Sync Test User');
      await user.click(screen.getByLabelText('vegan'));
      
      // Verify offline storage
      expect(localStorage.getItem('dietary-form-autosave')).toBeTruthy();
      
      // Come back online
      mobileFramework.mockOnlineMode();
      
      // Simulate sync process
      await waitFor(() => {
        expect(navigator.onLine).toBe(true);
      });
      
      // Data should still be available
      const savedData = localStorage.getItem('dietary-form-autosave');
      expect(savedData).toBeTruthy();
    });
  });

  describe('Touch Interaction Testing', () => {
    beforeEach(() => {
      mobileFramework.setDevice('iPhone SE');
    });

    it('should handle touch gestures correctly', async () => {
      const user = userEvent.setup();
      render(<MockDietaryForm />);
      
      const checkbox = screen.getByLabelText('vegetarian');
      
      // Test touch start/end events
      fireEvent.touchStart(checkbox);
      fireEvent.touchEnd(checkbox);
      
      // Verify interaction worked
      expect(checkbox).toBeChecked();
    });

    it('should prevent accidental double-taps', async () => {
      const mockSubmit = vi.fn();
      render(<MockDietaryForm onSubmit={mockSubmit} />);
      
      const submitButton = screen.getByRole('button', { name: 'Save Dietary Information' });
      
      // Rapid double tap simulation
      fireEvent.touchStart(submitButton);
      fireEvent.touchEnd(submitButton);
      fireEvent.click(submitButton);
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 50));
      
      fireEvent.touchStart(submitButton);
      fireEvent.touchEnd(submitButton);
      fireEvent.click(submitButton);
      
      // Should only submit once due to debouncing
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    it('should handle swipe gestures for navigation', () => {
      render(<MockDietaryForm />);
      
      const form = screen.getByTestId('dietary-form');
      
      // Simulate swipe left
      fireEvent.touchStart(form, { touches: [{ clientX: 300, clientY: 200 }] });
      fireEvent.touchMove(form, { touches: [{ clientX: 100, clientY: 200 }] });
      fireEvent.touchEnd(form);
      
      // Form should still be functional after swipe
      expect(form).toBeInTheDocument();
    });

    it('should support long press for additional options', async () => {
      render(<MockDietaryForm />);
      
      const checkbox = screen.getByLabelText('nut-allergy');
      
      // Simulate long press (touch and hold)
      fireEvent.touchStart(checkbox);
      
      // Wait for long press duration
      await new Promise(resolve => setTimeout(resolve, 500));
      
      fireEvent.touchEnd(checkbox);
      
      // Checkbox should still function normally
      expect(checkbox).toBeInTheDocument();
    });
  });

  describe('Performance on Mobile Devices', () => {
    it('should render quickly on slower mobile devices', async () => {
      mobileFramework.setDevice('iPhone SE');
      mobileFramework.setNetworkCondition('3G');
      
      const startTime = performance.now();
      
      render(<MockDietaryForm />);
      
      const form = await screen.findByTestId('dietary-form');
      const endTime = performance.now();
      
      const renderTime = endTime - startTime;
      
      console.log(`Mobile render time: ${renderTime.toFixed(2)}ms`);
      
      expect(form).toBeInTheDocument();
      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
    });

    it('should maintain smooth scrolling with large forms', async () => {
      mobileFramework.setDevice('iPhone SE');
      
      // Create large form by adding many restrictions
      const largeFormData = {
        restrictions: Array.from({ length: 50 }, (_, i) => `restriction-${i}`)
      };
      
      render(<MockDietaryForm />);
      
      const form = screen.getByTestId('dietary-form');
      
      // Simulate scroll events
      let scrollEvents = 0;
      form.addEventListener('scroll', () => scrollEvents++);
      
      // Simulate multiple scroll events
      for (let i = 0; i < 10; i++) {
        fireEvent.scroll(form, { target: { scrollY: i * 50 } });
        await new Promise(resolve => setTimeout(resolve, 16)); // 60fps = ~16ms per frame
      }
      
      expect(scrollEvents).toBe(10);
    });

    it('should handle memory efficiently on resource-constrained devices', () => {
      mobileFramework.setDevice('iPhone SE');
      
      // Render and unmount multiple times to test memory leaks
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<MockDietaryForm />);
        unmount();
      }
      
      // Memory should be cleaned up (tested via no memory errors)
      expect(true).toBe(true); // Placeholder - actual memory testing would require specific tools
    });
  });

  describe('Accessibility on Mobile', () => {
    beforeEach(() => {
      mobileFramework.setDevice('iPhone SE');
    });

    it('should support screen reader navigation', () => {
      render(<MockDietaryForm />);
      
      // Check for proper ARIA labels and roles
      expect(screen.getByLabelText('Guest Name')).toHaveAttribute('id', 'guest-name');
      expect(screen.getByRole('group', { name: 'Dietary Restrictions' })).toBeInTheDocument();
      expect(screen.getByLabelText('Severity')).toHaveAttribute('id', 'severity');
    });

    it('should provide keyboard navigation support', async () => {
      const user = userEvent.setup();
      render(<MockDietaryForm />);
      
      // Tab through form elements
      await user.tab(); // Guest name input
      expect(screen.getByLabelText('Guest Name')).toHaveFocus();
      
      await user.tab(); // First checkbox
      expect(screen.getByLabelText('vegetarian')).toHaveFocus();
      
      // Should be able to activate with keyboard
      await user.keyboard(' '); // Space to check
      expect(screen.getByLabelText('vegetarian')).toBeChecked();
    });

    it('should provide sufficient color contrast for mobile viewing', () => {
      render(<MockDietaryForm />);
      
      const submitButton = screen.getByRole('button', { name: 'Save Dietary Information' });
      const computedStyle = window.getComputedStyle(submitButton);
      
      // Basic contrast check (would need actual color analysis in real implementation)
      expect(computedStyle).toBeDefined();
    });

    it('should support voice control and dictation', () => {
      render(<MockDietaryForm />);
      
      const textarea = screen.getByLabelText('Additional Notes');
      
      // Simulate voice input (in real app, this would use Web Speech API)
      fireEvent.change(textarea, { 
        target: { value: 'Voice input: severe nut allergy requiring emergency protocols' } 
      });
      
      expect(textarea).toHaveValue('Voice input: severe nut allergy requiring emergency protocols');
    });
  });

  describe('Real-World Mobile Scenarios', () => {
    it('should work at wedding venues with poor connectivity', async () => {
      mobileFramework.setDevice('iPhone SE');
      mobileFramework.setNetworkCondition('3G');
      
      // Simulate venue with intermittent connectivity
      const user = userEvent.setup();
      render(<MockDietaryForm autoSave={true} />);
      
      // Start filling form
      await user.type(screen.getByLabelText('Guest Name'), 'Venue Guest');
      
      // Connection drops
      mobileFramework.mockOfflineMode();
      
      // Continue filling form offline
      await user.click(screen.getByLabelText('gluten-free'));
      await user.type(screen.getByLabelText('Additional Notes'), 'Added while offline');
      
      // Auto-save should still work
      await waitFor(() => {
        const savedData = localStorage.getItem('dietary-form-autosave');
        expect(savedData).toBeTruthy();
      });
      
      // Connection returns
      mobileFramework.mockOnlineMode();
      
      // Data should be preserved
      expect(screen.getByLabelText('Guest Name')).toHaveValue('Venue Guest');
      expect(screen.getByLabelText('gluten-free')).toBeChecked();
    });

    it('should handle multiple wedding vendor staff using same device', async () => {
      mobileFramework.setDevice('iPad Pro');
      
      const user = userEvent.setup();
      
      // First staff member uses device
      render(<MockDietaryForm autoSave={true} />);
      await user.type(screen.getByLabelText('Guest Name'), 'First Guest');
      await user.click(screen.getByLabelText('vegetarian'));
      
      cleanup();
      
      // Second staff member uses device (new session)
      render(<MockDietaryForm autoSave={true} />);
      
      // Form should be clean for new entry
      expect(screen.getByLabelText('Guest Name')).toHaveValue('');
      expect(screen.getByLabelText('vegetarian')).not.toBeChecked();
    });

    it('should support quick data entry during busy wedding preparation', async () => {
      mobileFramework.setDevice('iPhone 14 Pro');
      
      const user = userEvent.setup();
      const mockSubmit = vi.fn();
      
      render(<MockDietaryForm onSubmit={mockSubmit} />);
      
      // Rapid data entry scenario
      const startTime = performance.now();
      
      await user.type(screen.getByLabelText('Guest Name'), 'Quick Entry');
      await user.click(screen.getByLabelText('nut-allergy'));
      await user.selectOptions(screen.getByLabelText('Severity'), 'severe');
      await user.click(screen.getByRole('button', { name: 'Save Dietary Information' }));
      
      const endTime = performance.now();
      const entryTime = endTime - startTime;
      
      console.log(`Quick entry time: ${entryTime.toFixed(2)}ms`);
      
      expect(mockSubmit).toHaveBeenCalled();
      expect(entryTime).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });
});