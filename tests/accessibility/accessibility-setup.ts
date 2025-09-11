import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function globalSetup(config: FullConfig) {
  console.log('♿ Starting Accessibility Testing Setup...');
  
  // Create necessary directories
  const testResultsDir = path.join(process.cwd(), 'test-results', 'accessibility');
  const screenshotsDir = path.join(testResultsDir, 'screenshots');
  const reportsDir = path.join(testResultsDir, 'reports');
  
  [testResultsDir, screenshotsDir, reportsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // Initialize accessibility tracking
  const accessibilityState = {
    startTime: new Date().toISOString(),
    wcagLevel: 'AA', // WCAG 2.1 AA compliance
    testScenarios: [
      'desktop-standard',
      'high-contrast',
      'mobile-touch',
      'keyboard-only',
      'screen-reader-simulation'
    ],
    features: {
      keyboardNavigation: { tested: false, passed: false, details: [] },
      ariaCompliance: { tested: false, passed: false, details: [] },
      colorContrast: { tested: false, passed: false, details: [] },
      focusManagement: { tested: false, passed: false, details: [] },
      screenReaderSupport: { tested: false, passed: false, details: [] },
      alternativeInteractions: { tested: false, passed: false, details: [] }
    },
    violations: [] as any[],
    recommendations: [] as string[]
  };
  
  // Check axe-core installation
  try {
    console.log('🔧 Checking accessibility testing tools...');
    
    // Verify axe-core is available
    const axeVersion = await checkAxeCore();
    console.log(`✅ axe-core version: ${axeVersion}`);
    
    // Test browser accessibility features
    await testBrowserAccessibilityFeatures();
    console.log('✅ Browser accessibility features verified');
    
  } catch (error) {
    console.warn('⚠️ Accessibility tools setup warning:', error);
  }
  
  // Save initial state
  const stateFile = path.join(testResultsDir, 'accessibility-state.json');
  fs.writeFileSync(stateFile, JSON.stringify(accessibilityState, null, 2));
  
  // Create WCAG compliance checklist
  const checklistPath = path.join(reportsDir, 'wcag-checklist.json');
  const wcagChecklist = await createWCAGChecklist();
  fs.writeFileSync(checklistPath, JSON.stringify(wcagChecklist, null, 2));
  
  console.log('🚀 Accessibility testing setup complete!');
  console.log(`📊 State tracking: ${stateFile}`);
  console.log(`📋 WCAG checklist: ${checklistPath}`);
  
  return accessibilityState;
}

async function checkAxeCore() {
  try {
    const axePackage = require('@axe-core/playwright/package.json');
    return axePackage.version;
  } catch (error) {
    throw new Error('axe-core not found. Install with: npm install @axe-core/playwright');
  }
}

async function testBrowserAccessibilityFeatures() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Test basic accessibility API availability
    const accessibilityAPITest = await page.evaluate(() => {
      return {
        hasAriaSupport: 'aria-label' in document.createElement('div'),
        hasRoleSupport: 'role' in document.createElement('div'),
        hasFocusManagement: typeof document.activeElement !== 'undefined',
        hasMediaQueries: typeof window.matchMedia !== 'undefined',
        hasReducedMotionSupport: window.matchMedia('(prefers-reduced-motion: reduce)').media !== 'not all'
      };
    });
    
    // Verify all features are available
    Object.entries(accessibilityAPITest).forEach(([feature, available]) => {
      if (!available) {
        console.warn(`⚠️ ${feature} not fully supported`);
      }
    });
    
  } finally {
    await browser.close();
  }
}

async function createWCAGChecklist() {
  return {
    "1.1 Text Alternatives": {
      "1.1.1 Non-text Content": {
        description: "All non-text content has text alternatives",
        level: "A",
        tested: false,
        passed: false,
        applicableComponents: ["timeline-events", "drag-indicators", "status-icons"]
      }
    },
    "1.3 Adaptable": {
      "1.3.1 Info and Relationships": {
        description: "Information, structure, and relationships can be programmatically determined",
        level: "A",
        tested: false,
        passed: false,
        applicableComponents: ["timeline-structure", "event-hierarchy", "drag-drop-relationships"]
      },
      "1.3.2 Meaningful Sequence": {
        description: "Content sequence is meaningful when presented linearly",
        level: "A",
        tested: false,
        passed: false,
        applicableComponents: ["timeline-events-order", "keyboard-navigation-flow"]
      },
      "1.3.3 Sensory Characteristics": {
        description: "Instructions don't rely solely on sensory characteristics",
        level: "A",
        tested: false,
        passed: false,
        applicableComponents: ["drag-drop-instructions", "timeline-guidance"]
      }
    },
    "1.4 Distinguishable": {
      "1.4.1 Use of Color": {
        description: "Color is not the only means of conveying information",
        level: "A",
        tested: false,
        passed: false,
        applicableComponents: ["timeline-events", "status-indicators", "conflicts"]
      },
      "1.4.3 Contrast (Minimum)": {
        description: "Text has contrast ratio of at least 4.5:1",
        level: "AA",
        tested: false,
        passed: false,
        applicableComponents: ["event-text", "timeline-labels", "buttons"]
      },
      "1.4.10 Reflow": {
        description: "Content can be presented without horizontal scrolling at 320px width",
        level: "AA",
        tested: false,
        passed: false,
        applicableComponents: ["timeline-responsive", "mobile-layout"]
      },
      "1.4.11 Non-text Contrast": {
        description: "Visual information has contrast ratio of at least 3:1",
        level: "AA",
        tested: false,
        passed: false,
        applicableComponents: ["drag-handles", "borders", "focus-indicators"]
      },
      "1.4.12 Text Spacing": {
        description: "Content adapts to increased text spacing",
        level: "AA",
        tested: false,
        passed: false,
        applicableComponents: ["event-text", "labels", "instructions"]
      },
      "1.4.13 Content on Hover or Focus": {
        description: "Hover/focus content is dismissible, hoverable, and persistent",
        level: "AA",
        tested: false,
        passed: false,
        applicableComponents: ["tooltips", "drag-previews", "context-menus"]
      }
    },
    "2.1 Keyboard Accessible": {
      "2.1.1 Keyboard": {
        description: "All functionality available from keyboard",
        level: "A",
        tested: false,
        passed: false,
        applicableComponents: ["drag-drop", "timeline-navigation", "event-selection"]
      },
      "2.1.2 No Keyboard Trap": {
        description: "Keyboard focus can move away from component",
        level: "A",
        tested: false,
        passed: false,
        applicableComponents: ["timeline-container", "modal-dialogs", "dropdown-menus"]
      },
      "2.1.4 Character Key Shortcuts": {
        description: "Single character key shortcuts can be turned off or remapped",
        level: "A",
        tested: false,
        passed: false,
        applicableComponents: ["keyboard-shortcuts", "hotkeys"]
      }
    },
    "2.4 Navigable": {
      "2.4.1 Bypass Blocks": {
        description: "Mechanism available to bypass blocks of content",
        level: "A",
        tested: false,
        passed: false,
        applicableComponents: ["skip-links", "landmark-navigation"]
      },
      "2.4.2 Page Titled": {
        description: "Web pages have titles that describe topic or purpose",
        level: "A",
        tested: false,
        passed: false,
        applicableComponents: ["page-title", "document-title"]
      },
      "2.4.3 Focus Order": {
        description: "Focusable components receive focus in meaningful order",
        level: "A",
        tested: false,
        passed: false,
        applicableComponents: ["timeline-events", "controls", "navigation"]
      },
      "2.4.6 Headings and Labels": {
        description: "Headings and labels describe topic or purpose",
        level: "AA",
        tested: false,
        passed: false,
        applicableComponents: ["section-headings", "event-labels", "form-labels"]
      },
      "2.4.7 Focus Visible": {
        description: "Keyboard focus indicator is visible",
        level: "AA",
        tested: false,
        passed: false,
        applicableComponents: ["timeline-events", "buttons", "interactive-elements"]
      }
    },
    "2.5 Input Modalities": {
      "2.5.1 Pointer Gestures": {
        description: "All functionality using multipoint or path-based gestures has single-pointer alternative",
        level: "A",
        tested: false,
        passed: false,
        applicableComponents: ["drag-drop", "multitouch-gestures"]
      },
      "2.5.2 Pointer Cancellation": {
        description: "Single-pointer functionality can be cancelled",
        level: "A",
        tested: false,
        passed: false,
        applicableComponents: ["drag-operations", "click-handlers"]
      },
      "2.5.3 Label in Name": {
        description: "Accessible name contains visible label text",
        level: "A",
        tested: false,
        passed: false,
        applicableComponents: ["buttons", "event-labels", "controls"]
      },
      "2.5.4 Motion Actuation": {
        description: "Functionality triggered by motion can be operated by UI components",
        level: "A",
        tested: false,
        passed: false,
        applicableComponents: ["gesture-controls", "motion-based-features"]
      }
    },
    "3.2 Predictable": {
      "3.2.1 On Focus": {
        description: "Component doesn't initiate change of context on focus",
        level: "A",
        tested: false,
        passed: false,
        applicableComponents: ["timeline-events", "interactive-controls"]
      },
      "3.2.2 On Input": {
        description: "Component doesn't initiate change of context on input",
        level: "A",
        tested: false,
        passed: false,
        applicableComponents: ["form-controls", "dropdown-selections"]
      }
    },
    "4.1 Compatible": {
      "4.1.1 Parsing": {
        description: "HTML is well-formed",
        level: "A",
        tested: false,
        passed: false,
        applicableComponents: ["html-structure", "markup-validation"]
      },
      "4.1.2 Name, Role, Value": {
        description: "Name and role can be programmatically determined",
        level: "A",
        tested: false,
        passed: false,
        applicableComponents: ["timeline-events", "interactive-controls", "custom-components"]
      },
      "4.1.3 Status Messages": {
        description: "Status messages can be programmatically determined",
        level: "AA",
        tested: false,
        passed: false,
        applicableComponents: ["drag-status", "error-messages", "success-notifications"]
      }
    }
  };
}

export default globalSetup;