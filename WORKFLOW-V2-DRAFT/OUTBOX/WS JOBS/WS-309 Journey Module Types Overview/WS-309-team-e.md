# WS-309: Journey Module Types Overview - Team E QA Prompt

## COMPREHENSIVE TEAM E PROMPT
### Quality Assurance Excellence for WedSync Journey Module Types System

---

## 🎯 DEVELOPMENT MANAGER DIRECTIVE

**Project**: WedSync Enterprise Wedding Platform  
**Feature**: WS-309 - Journey Module Types Overview  
**Team**: E (Quality Assurance & Testing Excellence)  
**Sprint**: Journey Module Types Quality Validation  
**Priority**: P0 (Critical quality gates for modular journey system)

**Context**: You are Team E, responsible for ensuring the WedSync journey module types system meets the highest quality standards for wedding vendors who depend on 7 different module types (email, SMS, forms, meetings, info, reviews, referrals) for their critical business communications. One failed module execution could mean a missed wedding deadline or lost client.

---

## 📋 EVIDENCE OF REALITY REQUIREMENTS

### MANDATORY FILE VERIFICATION (Non-Negotiable)
Before proceeding, you MUST verify these files exist and read their contents:

```typescript
// CRITICAL: These files must exist before you begin QA development
const requiredFiles = [
  '/WORKFLOW-V2-DRAFT/INBOX/dev-manager/WS-309-journey-module-types-overview-technical.md',
  '/wedsync/src/components/journeys/modules/ModuleTypeRegistry.tsx', // From Team A
  '/wedsync/src/lib/services/journey-module-service.ts',     // From Team B
  '/wedsync/src/lib/integrations/email-service-integration.ts', // From Team C
  '/wedsync/src/lib/platform/module-platform-service.ts',   // From Team D
  '/wedsync/src/__tests__/modules/module-types-qa.test.ts', // Your foundation
  '/wedsync/tests/e2e/module-configuration-flows.spec.ts'   // Your E2E tests
];

// VERIFY: Each file must be read and understood before writing tests
requiredFiles.forEach(file => {
  if (!fileExists(file)) {
    throw new Error(`EVIDENCE FAILURE: Required file ${file} does not exist. Cannot create tests without implementation to test.`);
  }
});
```

### ARCHITECTURAL CONTEXT VERIFICATION
You must understand the complete journey module types system to test it properly:

1. **Module UI** (Team A): Interface components requiring UI testing
2. **Module Services** (Team B): Backend services requiring integration testing
3. **Module Integrations** (Team C): External services requiring API testing
4. **Module Platform** (Team D): Infrastructure requiring load testing
5. **Module Quality** (Team E): Comprehensive testing strategy and validation

---

## 🧠 SEQUENTIAL THINKING INTEGRATION

### MANDATORY: Use Sequential Thinking MCP for Test Strategy

For every major testing approach, you MUST use the Sequential Thinking MCP to analyze quality requirements:

```typescript
// REQUIRED: Before implementing any test suite
await mcp__sequential_thinking__sequential_thinking({
  thought: "I need to design a comprehensive testing strategy for WedSync's journey module types system. This system handles 7 different module types that wedding vendors depend on for business-critical communications. Let me analyze the testing layers: 1) Unit Tests - Individual module components, validation logic, configuration handling, 2) Integration Tests - Module service interactions with external APIs (email, SMS, calendar), 3) E2E Tests - Complete module configuration and execution workflows, 4) Performance Tests - Load testing for wedding season scaling, 5) Security Tests - Module configuration validation and data protection, 6) Wedding-Specific Tests - Critical path scenarios for different vendor types, 7) Platform Tests - Infrastructure resilience and scaling validation.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 12
});

// Continue analysis through all quality considerations
```

### WEDDING INDUSTRY QUALITY ANALYSIS
```typescript
await mcp__sequential_thinking__sequential_thinking({
  thought: "Wedding industry module testing has unique requirements that I must address: 1) Zero Tolerance for Module Failures - Each module type (email, SMS, form, meeting) is critical to vendor workflows, 2) Seasonal Load Testing - Wedding season creates 5x normal module execution volume, 3) Vendor Type Specificity - Photographers, venues, planners use modules differently, need specific test scenarios, 4) Time-Critical Execution - Module timing tied to wedding dates cannot fail, 5) Integration Reliability - External service integrations (Resend, Twilio, Google Calendar) must be thoroughly tested, 6) Mobile Testing - Many wedding vendors configure modules on mobile devices.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 12
});
```

---

## 🎨 WEDSYNC TESTING STACK INTEGRATION

### REQUIRED TESTING FRAMEWORK STACK
All tests must use WedSync's established testing tools:

```typescript
// MANDATORY: Use these exact testing imports
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { mockModuleTypes, createMockModuleConfig } from '@/test-utils/module-mocks';
import { setupTestEnvironment, cleanupTestEnvironment } from '@/test-utils/setup';

// E2E testing with Playwright
import { test as playwrightTest, expect as playwrightExpect } from '@playwright/test';

// Integration testing utilities
import { createTestSupabaseClient } from '@/test-utils/supabase-test-client';
import { mockExternalServices } from '@/test-utils/service-mocks';

// Performance testing
import { loadTest } from '@/test-utils/load-testing';
```

### WEDDING INDUSTRY TEST DATA
```typescript
// MANDATORY: Use wedding-realistic test data
const weddingModuleTestScenarios = {
  photographers: {
    typical: { 
      clientCount: 25, 
      weddingDate: '2024-06-15',
      moduleTypes: ['email', 'form', 'review'],
      workflow: 'booking_to_gallery'
    },
    highVolume: { 
      clientCount: 100, 
      weddingDate: '2024-06-15',
      moduleTypes: ['email', 'sms', 'form', 'meeting', 'review'],
      workflow: 'full_service'
    }
  },
  
  venues: {
    typical: { 
      capacity: 150, 
      weddingDate: '2024-06-15',
      moduleTypes: ['email', 'form', 'meeting', 'info'],
      workflow: 'booking_to_event'
    },
    multiEvent: { 
      capacity: 300, 
      weddingDate: '2024-06-15',
      simultaneousEvents: 3,
      moduleTypes: ['email', 'sms', 'form', 'meeting'],
      workflow: 'complex_coordination'
    }
  }
};
```

---

## 🔧 SERENA MCP INTEGRATION REQUIREMENTS

### MANDATORY QA SETUP PROTOCOL
```bash
# REQUIRED: Before any test development
serena activate_project WedSync2
serena get_symbols_overview src/__tests__/modules/
serena find_symbol "ModuleTypesQA"
serena write_memory "WS-309-team-e-module-qa" "Comprehensive testing strategy for journey module types with wedding industry validation"
```

### INTELLIGENT TEST GENERATION
Use Serena MCP for consistent test creation:

```typescript
// Use Serena for test generation
serena replace_symbol_body "ModuleTypesQA" "
class ModuleTypesQA {
  async validateModuleConfiguration(moduleType: string, config: any): Promise<QAResult> {
    // Comprehensive module configuration validation
  }
  
  async performWeddingSeasonLoadTest(): Promise<LoadTestResult> {
    // Wedding-specific load testing for all module types
  }
}
";
```

---

## 🔐 SECURITY TESTING REQUIREMENTS

### COMPREHENSIVE SECURITY QA CHECKLIST
```typescript
interface ModuleSecurityTestingChecklist {
  configurationSecurity: {
    // ✅ All module configurations must be tested
    input_validation: boolean;               // Test: XSS prevention in config forms
    template_injection_prevention: boolean;  // Test: Email template security
    personalization_sanitization: boolean;   // Test: Token injection attacks
    file_upload_restrictions: boolean;       // Test: Malicious file uploads
  };
  
  integrationSecurity: {
    api_key_protection: boolean;             // Test: External service credentials
    webhook_verification: boolean;           // Test: Webhook signature validation
    rate_limiting: boolean;                  // Test: API abuse prevention
    data_encryption: boolean;                // Test: Client data protection
  };
  
  executionSecurity: {
    sandboxed_execution: boolean;            // Test: Module isolation
    resource_limits: boolean;                // Test: Resource consumption limits
    timeout_protection: boolean;             // Test: Infinite execution prevention
    error_information_leakage: boolean;      // Test: No sensitive data in errors
  };
}
```

---

## 🎯 TEAM E SPECIALIZATION: QUALITY ASSURANCE EXCELLENCE

### PRIMARY RESPONSIBILITIES
You are the **Quality Assurance team** responsible for:

1. **Module Configuration Testing**
   - UI component testing for all 7 module types
   - Configuration validation testing
   - Error handling and edge case testing
   - Mobile interface testing

2. **Module Execution Testing**
   - Integration testing with external services
   - Performance testing under load
   - Error recovery and retry logic testing
   - Wedding-specific timing validation

3. **End-to-End Module Workflows**
   - Complete vendor workflow testing
   - Multi-module journey testing  
   - Cross-browser compatibility testing
   - Accessibility compliance testing

4. **Platform & Integration Testing**
   - Load testing for wedding season scaling
   - External service integration testing
   - Security vulnerability testing
   - Data integrity validation

---

## 📊 CORE DELIVERABLES

### 1. COMPREHENSIVE MODULE TESTING FRAMEWORK
```typescript
// FILE: /src/__tests__/modules/module-types-qa.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ModuleTypeRegistry } from '@/components/journeys/modules/ModuleTypeRegistry';
import { EmailModule } from '@/components/journeys/modules/EmailModule';
import { FormModule } from '@/components/journeys/modules/FormModule';
import { JourneyModuleService } from '@/lib/services/journey-module-service';
import { mockWeddingModuleScenarios } from '@/test-utils/wedding-module-mocks';

describe('Journey Module Types Quality Assurance', () => {
  let moduleService: JourneyModuleService;
  let testUser: ReturnType<typeof userEvent.setup>;

  beforeEach(async () => {
    moduleService = new JourneyModuleService();
    testUser = userEvent.setup();
    await setupTestEnvironment();
  });

  afterEach(async () => {
    await cleanupTestEnvironment();
  });

  describe('Module Configuration Testing', () => {
    test('should validate all 7 module types are available and configurable', async () => {
      const categories = await moduleService.getAvailableModules('test-supplier-id');
      
      const expectedModuleTypes = ['email', 'sms', 'form', 'meeting', 'info', 'review', 'referral'];
      const actualModuleTypes = categories.flatMap(cat => cat.modules.map(m => m.id));
      
      expectedModuleTypes.forEach(moduleType => {
        expect(actualModuleTypes).toContain(moduleType);
      });

      // Verify each module has proper configuration schema
      for (const category of categories) {
        for (const module of category.modules) {
          expect(module.config_schema).toBeDefined();
          expect(module.display_name).toBeDefined();
          expect(module.description).toBeDefined();
          expect(module.icon).toBeDefined();
        }
      }
    });

    test('should handle email module configuration with wedding-specific templates', async () => {
      const onModuleSelect = vi.fn();
      const onModuleDragStart = vi.fn();
      
      render(
        <ModuleTypeRegistry
          onModuleSelect={onModuleSelect}
          onModuleDragStart={onModuleDragStart}
          categories={mockWeddingModuleScenarios.categories}
        />
      );

      // Find and click email module
      const emailModule = screen.getByText('Email Module');
      await testUser.click(emailModule);

      expect(onModuleSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'email',
          display_name: 'Email Module'
        })
      );
    });

    test('should validate form module configuration with wedding forms', async () => {
      const mockFormConfig = {
        form_id: '',
        reminder_enabled: false
      };

      const onChange = vi.fn();
      const onValidate = vi.fn();

      render(
        <FormModule
          config={mockFormConfig}
          onChange={onChange}
          onValidate={onValidate}
          isConfiguring={true}
        />
      );

      // Should initially be invalid (no form selected)
      expect(onValidate).toHaveBeenCalledWith(false);

      // Select a wedding-specific form
      const formSelect = screen.getByText('Choose a form');
      await testUser.click(formSelect);

      const weddingForm = screen.getByText('Photography Questionnaire');
      await testUser.click(weddingForm);

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          form_id: 'photography-questionnaire'
        })
      );
    });

    test('should handle module configuration errors gracefully', async () => {
      const invalidConfig = { template_id: '' }; // Invalid email config

      const validation = await moduleService.validateModuleConfig('email', invalidConfig);

      expect(validation.is_valid).toBe(false);
      expect(validation.errors).toContain('template_id is required');
    });
  });

  describe('Module Execution Testing', () => {
    test('should execute email module with wedding personalization', async () => {
      const weddingContext = {
        client_id: 'client-123',
        journey_instance_id: 'journey-456',
        supplier_id: 'supplier-789',
        client_data: {
          email: 'couple@example.com',
          couple_name: 'John & Jane Smith',
          wedding_date: '2024-06-15'
        },
        supplier_data: {
          name: 'Sarah Photography',
          email: 'sarah@photography.com'
        }
      };

      const emailConfig = {
        template_id: 'welcome-email',
        personalization: {
          couple_name: '{{client.couple_name}}',
          wedding_date: '{{client.wedding_date}}'
        }
      };

      const result = await moduleService.executeModule('email', emailConfig, weddingContext);

      expect(result.success).toBe(true);
      expect(result.result_data.email_sent).toBe(true);
      expect(result.result_data.personalization_applied).toBe(true);
      expect(result.execution_time_ms).toBeGreaterThan(0);
    });

    test('should handle SMS module execution with WhatsApp integration', async () => {
      const smsContext = {
        client_id: 'client-123',
        journey_instance_id: 'journey-456',
        supplier_id: 'supplier-789',
        client_data: {
          phone: '+1234567890',
          couple_name: 'John & Jane Smith',
          wedding_date: '2024-06-15'
        },
        supplier_data: {
          name: 'Grand Wedding Venue',
          phone: '+0987654321'
        }
      };

      const smsConfig = {
        message_text: 'Hi {{couple_name}}! Your wedding at {{supplier_name}} is confirmed for {{wedding_date}}.',
        channel: 'whatsapp',
        personalization: {
          couple_name: '{{client.couple_name}}',
          wedding_date: '{{client.wedding_date}}',
          supplier_name: '{{supplier.name}}'
        }
      };

      const result = await moduleService.executeModule('sms', smsConfig, smsContext);

      expect(result.success).toBe(true);
      expect(result.result_data.message_sent).toBe(true);
      expect(result.result_data.channel_used).toBe('whatsapp');
    });

    test('should handle form module execution with reminder scheduling', async () => {
      const formContext = {
        client_id: 'client-123',
        journey_instance_id: 'journey-456',
        supplier_id: 'supplier-789',
        client_data: {
          email: 'couple@example.com',
          couple_name: 'John & Jane Smith',
          wedding_date: '2024-06-15'
        },
        supplier_data: {
          name: 'Wedding Planner Pro'
        }
      };

      const formConfig = {
        form_id: 'venue-requirements-form',
        reminder_enabled: true,
        reminder_frequency: 3,
        deadline: '2024-05-15'
      };

      const result = await moduleService.executeModule('form', formConfig, formContext);

      expect(result.success).toBe(true);
      expect(result.result_data.form_sent).toBe(true);
      expect(result.result_data.reminder_scheduled).toBe(true);
      expect(result.result_data.deadline).toBe('2024-05-15');
    });

    test('should handle meeting module execution with calendar integration', async () => {
      const meetingContext = {
        client_id: 'client-123',
        journey_instance_id: 'journey-456',
        supplier_id: 'supplier-789',
        client_data: {
          email: 'couple@example.com',
          couple_name: 'John & Jane Smith',
          wedding_date: '2024-06-15'
        },
        supplier_data: {
          name: 'Elegant Catering',
          email: 'bookings@elegantcatering.com'
        }
      };

      const meetingConfig = {
        meeting_type: 'menu_tasting',
        duration: 90,
        buffer_time: 15
      };

      const result = await moduleService.executeModule('meeting', meetingConfig, meetingContext);

      expect(result.success).toBe(true);
      expect(result.result_data.meeting_scheduled).toBe(true);
      expect(result.result_data.scheduling_url).toBeDefined();
      expect(result.result_data.duration).toBe(90);
    });
  });

  describe('Wedding-Specific Module Testing', () => {
    test('should prioritize wedding week module executions', async () => {
      const weddingWeekContext = {
        client_id: 'client-123',
        journey_instance_id: 'journey-456',
        supplier_id: 'supplier-789',
        client_data: {
          wedding_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
        }
      };

      const emailConfig = {
        template_id: 'final-details-reminder',
        send_delay: 120 // 2 hours normal delay
      };

      const result = await moduleService.executeModule('email', emailConfig, weddingWeekContext);

      expect(result.success).toBe(true);
      // Should reduce delay for wedding week
      expect(result.result_data.actual_delay).toBeLessThanOrEqual(30);
      expect(result.result_data.priority_level).toBe('high');
    });

    test('should handle vendor-specific module workflows', async () => {
      const photographerWorkflow = mockWeddingModuleScenarios.photographers.typical;
      
      // Test complete photographer workflow
      const modules = ['email', 'form', 'review'];
      const results = [];

      for (const moduleType of modules) {
        const config = this.getPhotographerModuleConfig(moduleType);
        const context = this.createPhotographerContext(photographerWorkflow);
        
        const result = await moduleService.executeModule(moduleType, config, context);
        results.push(result);
      }

      // All modules should execute successfully
      expect(results.every(r => r.success)).toBe(true);
      
      // Verify photographer-specific configurations were applied
      expect(results[0].result_data.template_category).toBe('photography');
      expect(results[1].result_data.form_category).toBe('photography');
      expect(results[2].result_data.review_type).toBe('photography_service');
    });

    test('should handle seasonal load patterns', async () => {
      // Mock peak wedding season (June)
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-06-15').getTime());

      const peakSeasonConfigs = Array(50).fill(null).map((_, i) => ({
        template_id: `wedding-template-${i}`,
        client_id: `client-${i}`
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        peakSeasonConfigs.map(config => 
          moduleService.executeModule('email', { template_id: config.template_id }, {
            client_id: config.client_id,
            journey_instance_id: `journey-${config.client_id}`,
            supplier_id: 'supplier-test'
          })
        )
      );
      const endTime = Date.now();

      // All executions should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // Should handle peak load efficiently
      const avgExecutionTime = (endTime - startTime) / results.length;
      expect(avgExecutionTime).toBeLessThan(2000); // Less than 2 seconds average
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle external service failures gracefully', async () => {
      // Mock email service failure
      mockExternalServices.resend.mockImplementation(() => {
        throw new Error('Email service temporarily unavailable');
      });

      const result = await moduleService.executeModule('email', {
        template_id: 'test-template'
      }, {
        client_id: 'client-123',
        journey_instance_id: 'journey-456',
        supplier_id: 'supplier-789'
      });

      expect(result.success).toBe(false);
      expect(result.error_message).toContain('Email service temporarily unavailable');
      expect(result.retry_count).toBeDefined();
    });

    test('should handle invalid module configurations', async () => {
      const invalidConfigs = [
        { moduleType: 'email', config: {} }, // Missing template_id
        { moduleType: 'form', config: {} },  // Missing form_id
        { moduleType: 'meeting', config: { duration: -1 } }, // Invalid duration
        { moduleType: 'sms', config: { message_text: '' } }   // Empty message
      ];

      for (const { moduleType, config } of invalidConfigs) {
        const validation = await moduleService.validateModuleConfig(moduleType, config);
        expect(validation.is_valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      }
    });

    test('should handle wedding date edge cases', async () => {
      const edgeCases = [
        { weddingDate: null, description: 'No wedding date' },
        { weddingDate: '2020-01-01', description: 'Past wedding date' },
        { weddingDate: 'invalid-date', description: 'Invalid date format' },
        { weddingDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString(), description: 'Far future date' }
      ];

      for (const { weddingDate, description } of edgeCases) {
        const context = {
          client_id: 'client-123',
          journey_instance_id: 'journey-456',
          supplier_id: 'supplier-789',
          client_data: { wedding_date: weddingDate }
        };

        const result = await moduleService.executeModule('email', {
          template_id: 'test-template'
        }, context);

        // Should still execute but handle edge case appropriately
        if (result.success) {
          expect(result.result_data.wedding_date_handling).toBeDefined();
        }
        
        logger.info(`Edge case handled: ${description}`, { success: result.success });
      }
    });
  });

  // Helper methods for test scenarios
  private getPhotographerModuleConfig(moduleType: string): any {
    const configs = {
      email: { template_id: 'photography-welcome', category: 'photography' },
      form: { form_id: 'photography-questionnaire', category: 'photography' },
      review: { platforms: ['google', 'facebook'], service_type: 'photography' }
    };
    return configs[moduleType] || {};
  }

  private createPhotographerContext(workflow: any): any {
    return {
      client_id: 'photographer-client-123',
      journey_instance_id: 'photographer-journey-456',
      supplier_id: 'photographer-supplier-789',
      client_data: {
        couple_name: workflow.coupleName || 'Test Couple',
        wedding_date: workflow.weddingDate,
        email: 'testcouple@example.com'
      },
      supplier_data: {
        name: 'Test Photography Studio',
        vendor_type: 'photographer'
      }
    };
  }
});
```

### 2. END-TO-END MODULE WORKFLOW TESTING
```typescript
// FILE: /tests/e2e/module-configuration-flows.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Journey Module Configuration Flows E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test environment
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'photographer@wedsync.com');
    await page.fill('[data-testid="password"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to journeys section
    await page.click('[data-testid="journeys-nav"]');
    await page.click('[data-testid="journey-builder"]');
    await expect(page).toHaveURL('/journeys/builder');
  });

  test('should configure complete email module with wedding personalization', async ({ page }) => {
    // Open module palette
    await expect(page.locator('[data-testid="module-palette"]')).toBeVisible();
    
    // Find and drag email module to canvas
    const emailModule = page.locator('[data-module-type="email"]');
    const canvas = page.locator('[data-testid="journey-canvas"]');
    
    await emailModule.dragTo(canvas);
    
    // Verify module was added to canvas
    await expect(page.locator('[data-testid="module-email-1"]')).toBeVisible();
    
    // Open module configuration
    await page.click('[data-testid="module-email-1"] .config-button');
    
    // Configure email module
    await page.selectOption('[data-testid="template-select"]', 'welcome-email');
    await page.fill('[data-testid="subject-override"]', 'Welcome to our wedding services!');
    
    // Add personalization tokens
    await page.click('[data-testid="add-couple-name-token"]');
    await page.click('[data-testid="add-wedding-date-token"]');
    
    // Set timing
    await page.click('[data-testid="timing-tab"]');
    await page.fill('[data-testid="send-delay"]', '30');
    await page.selectOption('[data-testid="send-time"]', 'business_hours');
    
    // Generate preview
    await page.click('[data-testid="preview-tab"]');
    await page.click('[data-testid="generate-preview"]');
    
    // Verify preview appears
    await expect(page.locator('[data-testid="email-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-preview"]')).toContainText('Welcome to our wedding services!');
    
    // Save configuration
    await page.click('[data-testid="save-module"]');
    
    // Verify configuration was saved
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
  });

  test('should configure form module with wedding-specific forms', async ({ page }) => {
    // Drag form module to canvas
    const formModule = page.locator('[data-module-type="form"]');
    const canvas = page.locator('[data-testid="journey-canvas"]');
    
    await formModule.dragTo(canvas);
    
    // Configure form module
    await page.click('[data-testid="module-form-1"] .config-button');
    
    // Select wedding-specific form
    await page.selectOption('[data-testid="form-select"]', 'photography-questionnaire');
    
    // Enable reminders
    await page.check('[data-testid="reminder-enabled"]');
    await page.selectOption('[data-testid="reminder-frequency"]', '3');
    
    // Set deadline
    await page.fill('[data-testid="deadline"]', '2024-05-15');
    
    // Configure completion settings
    await page.fill('[data-testid="completion-redirect"]', 'https://photographer.com/thank-you');
    await page.check('[data-testid="auto-follow-up"]');
    
    // Save configuration
    await page.click('[data-testid="save-module"]');
    
    // Verify form configuration
    await expect(page.locator('[data-testid="module-form-1"]')).toContainText('Photography Questionnaire');
    await expect(page.locator('[data-testid="module-form-1"] .reminder-badge')).toBeVisible();
  });

  test('should configure meeting module with calendar integration', async ({ page }) => {
    // Drag meeting module to canvas
    const meetingModule = page.locator('[data-module-type="meeting"]');
    const canvas = page.locator('[data-testid="journey-canvas"]');
    
    await meetingModule.dragTo(canvas);
    
    // Configure meeting module
    await page.click('[data-testid="module-meeting-1"] .config-button');
    
    // Select meeting type
    await page.selectOption('[data-testid="meeting-type"]', 'engagement_consultation');
    await page.fill('[data-testid="duration"]', '60');
    await page.fill('[data-testid="buffer-time"]', '15');
    
    // Configure availability
    await page.click('[data-testid="availability-settings"]');
    await page.check('[data-testid="weekdays-only"]');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    
    // Save configuration
    await page.click('[data-testid="save-module"]');
    
    // Verify meeting module configuration
    await expect(page.locator('[data-testid="module-meeting-1"]')).toContainText('Engagement Consultation');
    await expect(page.locator('[data-testid="module-meeting-1"]')).toContainText('60 min');
  });

  test('should handle complete photography workflow with multiple modules', async ({ page }) => {
    // Create photography workflow with multiple modules
    const modules = [
      { type: 'email', position: { x: 100, y: 100 } },
      { type: 'form', position: { x: 300, y: 100 } },
      { type: 'meeting', position: { x: 500, y: 100 } },
      { type: 'review', position: { x: 700, y: 100 } }
    ];

    // Add all modules to canvas
    for (const module of modules) {
      const moduleElement = page.locator(`[data-module-type="${module.type}"]`);
      const canvas = page.locator('[data-testid="journey-canvas"]');
      await moduleElement.dragTo(canvas);
    }

    // Connect modules with workflow arrows
    await page.click('[data-testid="connection-tool"]');
    
    // Connect email to form
    await page.click('[data-testid="module-email-1"] .connection-point');
    await page.click('[data-testid="module-form-1"] .connection-point');
    
    // Connect form to meeting
    await page.click('[data-testid="module-form-1"] .connection-point');
    await page.click('[data-testid="module-meeting-1"] .connection-point');
    
    // Connect meeting to review
    await page.click('[data-testid="module-meeting-1"] .connection-point');
    await page.click('[data-testid="module-review-1"] .connection-point');
    
    // Configure timing between modules
    await page.click('[data-testid="email-form-connection"]');
    await page.fill('[data-testid="connection-delay"]', '24'); // 24 hours delay
    await page.selectOption('[data-testid="connection-condition"]', 'email_opened');
    
    // Save complete workflow
    await page.click('[data-testid="save-journey"]');
    await page.fill('[data-testid="journey-name"]', 'Photography Client Onboarding');
    await page.click('[data-testid="confirm-save"]');
    
    // Test the complete workflow
    await page.click('[data-testid="test-workflow"]');
    await page.fill('[data-testid="test-client-email"]', 'testcouple@example.com');
    await page.fill('[data-testid="test-wedding-date"]', '2024-06-15');
    await page.click('[data-testid="start-test"]');
    
    // Monitor workflow execution
    await expect(page.locator('[data-testid="workflow-status"]')).toHaveText('Running');
    
    // Wait for first module to complete
    await page.waitForSelector('[data-testid="email-module-completed"]');
    await expect(page.locator('[data-testid="email-module-completed"]')).toBeVisible();
  });

  test('should handle mobile module configuration interface', async ({ page }) => {
    // Test mobile responsiveness
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    
    await page.goto('/journeys/builder');
    
    // Verify mobile module palette
    await expect(page.locator('[data-testid="mobile-module-palette"]')).toBeVisible();
    
    // Test mobile module configuration
    await page.tap('[data-module-type="email"]');
    await expect(page.locator('[data-testid="mobile-module-config"]')).toBeVisible();
    
    // Configure module on mobile
    await page.selectOption('[data-testid="mobile-template-select"]', 'mobile-optimized-template');
    
    // Test touch interactions
    await page.tap('[data-testid="mobile-personalization-tokens"]');
    await page.tap('[data-testid="mobile-add-couple-name"]');
    
    // Save on mobile
    await page.tap('[data-testid="mobile-save-module"]');
    
    // Verify mobile success state
    await expect(page.locator('[data-testid="mobile-save-success"]')).toBeVisible();
  });

  test('should handle module configuration errors and validation', async ({ page }) => {
    // Drag email module without configuring
    const emailModule = page.locator('[data-module-type="email"]');
    const canvas = page.locator('[data-testid="journey-canvas"]');
    
    await emailModule.dragTo(canvas);
    
    // Try to save journey without configuring module
    await page.click('[data-testid="save-journey"]');
    
    // Should show validation errors
    await expect(page.locator('[data-testid="validation-errors"]')).toBeVisible();
    await expect(page.locator('[data-testid="validation-errors"]')).toContainText('Email module requires template selection');
    
    // Configure module with invalid settings
    await page.click('[data-testid="module-email-1"] .config-button');
    await page.fill('[data-testid="send-delay"]', '-1'); // Invalid negative delay
    
    // Should show field-level validation
    await expect(page.locator('[data-testid="send-delay-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="send-delay-error"]')).toContainText('Delay must be 0 or greater');
    
    // Fix validation errors
    await page.fill('[data-testid="send-delay"]', '0');
    await page.selectOption('[data-testid="template-select"]', 'welcome-email');
    await page.click('[data-testid="save-module"]');
    
    // Should now be able to save journey
    await page.click('[data-testid="save-journey"]');
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
  });
});
```

### 3. PERFORMANCE AND LOAD TESTING
```typescript
// FILE: /src/__tests__/performance/module-load-testing.ts
import { test, expect } from '@playwright/test';
import { JourneyModuleService } from '@/lib/services/journey-module-service';

export class ModuleLoadTesting {
  private moduleService: JourneyModuleService;
  private concurrentUsers = 100;
  private testDuration = 300000; // 5 minutes

  constructor() {
    this.moduleService = new JourneyModuleService();
  }

  async runWeddingSeasonModuleLoadTest(): Promise<LoadTestResults> {
    const results: LoadTestResults = {
      totalModuleExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      maxExecutionTime: 0,
      moduleTypeBreakdown: {},
      weddingSpecificMetrics: {}
    };

    const userSimulations = [];
    
    // Simulate wedding vendor module usage during peak season
    for (let i = 0; i < this.concurrentUsers; i++) {
      userSimulations.push(this.simulateWeddingVendorModuleUsage(results, i));
    }

    await Promise.all(userSimulations);
    
    // Calculate final metrics
    results.averageExecutionTime = results.averageExecutionTime / results.totalModuleExecutions;
    
    return results;
  }

  private async simulateWeddingVendorModuleUsage(
    results: LoadTestResults, 
    userId: number
  ): Promise<void> {
    const vendorTypes = ['photographer', 'venue', 'planner', 'caterer'];
    const moduleTypes = ['email', 'sms', 'form', 'meeting', 'info', 'review', 'referral'];
    
    const vendorType = vendorTypes[userId % vendorTypes.length];
    const endTime = Date.now() + this.testDuration;
    
    while (Date.now() < endTime) {
      // Simulate realistic module usage patterns for each vendor type
      const moduleSequence = this.getVendorModuleSequence(vendorType);
      
      for (const moduleType of moduleSequence) {
        try {
          const startTime = Date.now();
          
          const config = this.generateRealisticModuleConfig(moduleType, vendorType);
          const context = this.generateWeddingContext(vendorType, userId);
          
          const result = await this.moduleService.executeModule(moduleType, config, context);
          
          const executionTime = Date.now() - startTime;
          
          // Record metrics
          results.totalModuleExecutions++;
          if (result.success) {
            results.successfulExecutions++;
          } else {
            results.failedExecutions++;
          }
          
          results.averageExecutionTime += executionTime;
          results.maxExecutionTime = Math.max(results.maxExecutionTime, executionTime);
          
          // Module type breakdown
          if (!results.moduleTypeBreakdown[moduleType]) {
            results.moduleTypeBreakdown[moduleType] = { count: 0, avgTime: 0 };
          }
          results.moduleTypeBreakdown[moduleType].count++;
          
          // Wedding-specific metrics
          if (context.isWeddingWeek) {
            if (!results.weddingSpecificMetrics.weddingWeekExecutions) {
              results.weddingSpecificMetrics.weddingWeekExecutions = 0;
            }
            results.weddingSpecificMetrics.weddingWeekExecutions++;
          }
          
        } catch (error) {
          results.failedExecutions++;
          console.error(`Module execution failed for ${vendorType}:`, error);
        }
        
        // Realistic delay between module executions
        await this.sleep(Math.random() * 2000 + 500); // 500-2500ms
      }
      
      // Realistic delay between complete workflows
      await this.sleep(Math.random() * 10000 + 5000); // 5-15 seconds
    }
  }

  private getVendorModuleSequence(vendorType: string): string[] {
    const sequences = {
      photographer: ['email', 'form', 'meeting', 'email', 'review'],
      venue: ['email', 'form', 'meeting', 'info', 'sms'],
      planner: ['email', 'meeting', 'form', 'email', 'referral'],
      caterer: ['email', 'meeting', 'form', 'info']
    };
    
    return sequences[vendorType] || ['email', 'form'];
  }

  private generateRealisticModuleConfig(moduleType: string, vendorType: string): any {
    const configs = {
      email: {
        template_id: `${vendorType}-welcome-template`,
        personalization: {
          couple_name: '{{client.couple_name}}',
          wedding_date: '{{client.wedding_date}}'
        }
      },
      form: {
        form_id: `${vendorType}-questionnaire`,
        reminder_enabled: true,
        reminder_frequency: 3
      },
      meeting: {
        meeting_type: `${vendorType}_consultation`,
        duration: 60,
        buffer_time: 15
      },
      sms: {
        message_text: 'Hi {{couple_name}}! Quick reminder about your upcoming {{meeting_type}}.',
        channel: 'sms'
      },
      info: {
        title: `Important ${vendorType} Information`,
        content: `Here's what you need to know about our ${vendorType} services...`
      },
      review: {
        platforms: ['google', 'facebook'],
        custom_message: `We'd love your feedback on our ${vendorType} service!`
      },
      referral: {
        reward_type: 'discount',
        reward_amount: 100
      }
    };
    
    return configs[moduleType] || {};
  }

  private generateWeddingContext(vendorType: string, userId: number): any {
    const weddingDate = new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000);
    const isWeddingWeek = (weddingDate.getTime() - Date.now()) <= (7 * 24 * 60 * 60 * 1000);
    
    return {
      client_id: `load-test-client-${userId}`,
      journey_instance_id: `load-test-journey-${userId}`,
      supplier_id: `load-test-supplier-${userId}`,
      client_data: {
        couple_name: `Test Couple ${userId}`,
        email: `testcouple${userId}@example.com`,
        wedding_date: weddingDate.toISOString(),
        vendor_type: vendorType
      },
      supplier_data: {
        name: `Test ${vendorType} ${userId}`,
        vendor_type: vendorType
      },
      isWeddingWeek,
      isPeakSeason: this.isPeakWeddingSeason()
    };
  }

  private isPeakWeddingSeason(): boolean {
    const month = new Date().getMonth() + 1;
    return month >= 5 && month <= 9; // May through September
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Integration with Playwright for E2E load testing
test.describe('Module Load Testing', () => {
  test('should handle peak wedding season module load', async () => {
    const loadTester = new ModuleLoadTesting();
    const results = await loadTester.runWeddingSeasonModuleLoadTest();
    
    // Performance assertions
    expect(results.totalModuleExecutions).toBeGreaterThan(1000);
    expect(results.averageExecutionTime).toBeLessThan(2000); // Less than 2 seconds
    expect((results.successfulExecutions / results.totalModuleExecutions) * 100).toBeGreaterThan(95); // 95% success rate
    
    // Wedding-specific assertions
    expect(results.weddingSpecificMetrics.weddingWeekExecutions).toBeGreaterThan(0);
    
    console.log('Load test results:', results);
  });
});
```

---

## 📊 WEDDING INDUSTRY QA SCENARIOS

### WEDDING-SPECIFIC TEST CASES
```typescript
// Wedding vendor module testing scenarios
export const weddingModuleQAScenarios = {
  photographerWorkflows: {
    bookingToGallery: {
      modules: ['email', 'form', 'meeting', 'email', 'review'],
      timeline: '6_months',
      criticalPaths: ['booking_confirmation', 'engagement_shoot', 'wedding_day_timeline', 'gallery_delivery'],
      failureImpact: 'high'
    },
    
    quickEngagement: {
      modules: ['email', 'meeting', 'email'],
      timeline: '2_weeks',
      criticalPaths: ['booking_confirmation', 'shoot_scheduling'],
      failureImpact: 'medium'
    }
  },
  
  venueWorkflows: {
    fullServiceWedding: {
      modules: ['email', 'form', 'meeting', 'info', 'sms', 'meeting'],
      timeline: '12_months',
      criticalPaths: ['booking_confirmation', 'menu_tasting', 'final_headcount', 'day_of_coordination'],
      failureImpact: 'critical'
    },
    
    receptionOnly: {
      modules: ['email', 'form', 'meeting', 'info'],
      timeline: '3_months',
      criticalPaths: ['booking_confirmation', 'final_details'],
      failureImpact: 'high'
    }
  },
  
  plannerWorkflows: {
    fullPlanning: {
      modules: ['email', 'meeting', 'form', 'email', 'meeting', 'referral'],
      timeline: '18_months',
      criticalPaths: ['initial_consultation', 'vendor_coordination', 'timeline_finalization'],
      failureImpact: 'critical'
    }
  },
  
  stressTestScenarios: {
    weddingSeason: {
      description: 'Peak wedding season load',
      concurrentUsers: 500,
      modulesPerMinute: 1000,
      duration: '2_hours',
      expectedSuccessRate: 99.5
    },
    
    saturdayPeak: {
      description: 'Saturday wedding day peak',
      concurrentUsers: 200,
      modulesPerMinute: 500,
      duration: '8_hours',
      expectedSuccessRate: 99.9
    }
  }
};
```

---

## ✅ DEFINITION OF DONE

### QA ACCEPTANCE CRITERIA
- [ ] **Module Type Coverage**: All 7 module types thoroughly tested with realistic configurations
- [ ] **Integration Testing**: All external service integrations (email, SMS, calendar) validated
- [ ] **End-to-End Workflows**: Complete vendor workflows tested from configuration to execution
- [ ] **Performance Validation**: Load testing for wedding season peaks with 99.5%+ success rate
- [ ] **Security Testing**: All module security vulnerabilities identified and addressed
- [ ] **Mobile Testing**: All module configuration interfaces tested on mobile devices
- [ ] **Wedding-Specific Testing**: Critical wedding vendor workflows validated
- [ ] **Error Handling**: All error scenarios tested with proper recovery mechanisms

### QUALITY GATES
- [ ] **Test Coverage**: 95%+ code coverage for all module components
- [ ] **Performance Standards**: <2s average module execution time under load
- [ ] **Reliability**: 99.9% success rate for wedding week module executions
- [ ] **Security Compliance**: Zero critical security vulnerabilities
- [ ] **Accessibility**: WCAG 2.1 AA compliance for all module interfaces
- [ ] **Cross-Browser Support**: Tested on Chrome, Safari, Firefox, Edge
- [ ] **Documentation**: Complete test documentation and runbooks

---

## 🚀 EXECUTION TIMELINE

### QA DEVELOPMENT SPRINT
**Week 1**: Module configuration and unit testing framework
**Week 2**: Integration testing and external service validation
**Week 3**: End-to-end workflow testing and performance validation
**Week 4**: Load testing, security testing, and final quality validation

---

## 📞 TEAM COORDINATION

**Daily QA Standups**: Share testing progress and blocker resolution
**Cross-Team Testing**: Coordinate integration testing with all development teams
**Quality Reviews**: Weekly quality gate reviews with stakeholders
**Bug Triage**: Priority-based bug assignment and resolution tracking

---

**Quality Excellence: Bulletproof module types for flawless wedding automation! 🎯💍**