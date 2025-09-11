# TEAM E - ROUND 1: WS-342 - Advanced Form Builder Engine
## 2025-09-08 - Development Round 1

**YOUR MISSION:** Comprehensive QA, testing framework, and documentation for the Advanced Form Builder Engine
**FEATURE ID:** WS-342 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about form validation edge cases, performance testing, and complete user documentation

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/tests/forms/
cat $WS_ROOT/wedsync/tests/forms/form-builder.test.tsx | head -20
ls -la $WS_ROOT/wedsync/docs/features/form-builder/
```

2. **TEST EXECUTION RESULTS:**
```bash
npm test -- --testPathPattern=form-builder
# MUST show: "All tests passing" with >90% coverage
```

3. **PLAYWRIGHT E2E RESULTS:**
```bash
npx playwright test forms/form-builder
# MUST show: "All tests passed" for form creation, submission, and conditional logic
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query form-related components for testing context
await mcp__serena__search_for_pattern("form.*builder|FormBuilder|form.*component");
await mcp__serena__find_symbol("FormBuilder", "", true);
await mcp__serena__get_symbols_overview("src/components/forms");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR DOCUMENTATION)
```typescript
// CRITICAL: Load the correct UI Style Guide for documentation consistency
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL UI TECHNOLOGY STACK FOR TESTING:**
- **Untitled UI**: Primary component library (test all components)
- **Magic UI**: Animations and visual enhancements (test interactions)
- **Tailwind CSS 4.1.11**: Utility-first CSS (responsive testing)
- **Lucide React**: Icons ONLY (accessibility testing)

**❌ DO NOT TEST:**
- Radix UI, Catalyst UI, shadcn/ui, or any other component libraries

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to form testing patterns
ref_search_documentation("React form testing patterns validation Playwright automation testing");
ref_search_documentation("Form builder UI testing drag-drop conditional logic testing");
ref_search_documentation("Wedding form testing user scenarios supplier workflows");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPREHENSIVE TESTING STRATEGY

### Use Sequential Thinking MCP for Testing Analysis
```typescript
// Use for complex testing strategy planning
mcp__sequential-thinking__sequential_thinking({
  thought: "WS-342 Advanced Form Builder Engine requires comprehensive testing across multiple dimensions: 1) Form creation and editing workflow, 2) Drag-and-drop functionality with 15+ field types, 3) Complex conditional logic with multiple conditions, 4) Multi-step form workflows, 5) Form submission processing with validation, 6) CRM integration and webhook delivery, 7) Real-time analytics and A/B testing, 8) Mobile responsiveness and performance. I need to design test suites that cover all wedding supplier scenarios.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "For testing strategy, I should focus on wedding-specific scenarios: photographer intake forms with conditional logic (show engagement session fields only if engagement selected), venue forms with capacity-based conditional fields, multi-vendor coordination forms. Performance testing must ensure forms work during peak wedding season with 1000+ concurrent submissions. Integration testing must verify CRM sync accuracy - wedding data loss is unacceptable.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive QA requirements:

1. **task-tracker-coordinator** - Break down testing phases, track coverage
2. **test-automation-architect** - Comprehensive test framework setup
3. **playwright-visual-testing-specialist** - UI interaction testing with screenshots
4. **security-compliance-officer** - Form validation and input sanitization testing
5. **code-quality-guardian** - Code standards and maintainability
6. **documentation-chronicler** - Complete feature documentation with examples

## 🧪 COMPREHENSIVE TESTING REQUIREMENTS

### 1. UNIT TESTING SUITE (>95% Coverage Required)

**Form Builder Components Testing:**
```typescript
// Form Builder Core Tests
describe('AdvancedFormBuilder', () => {
  test('should render form builder interface with field palette', async () => {
    render(<AdvancedFormBuilder />);
    expect(screen.getByText('Form Fields')).toBeInTheDocument();
    expect(screen.getByText('Text Input')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('File Upload')).toBeInTheDocument();
  });

  test('should add fields via drag-and-drop', async () => {
    const { user } = render(<AdvancedFormBuilder />);
    const textField = screen.getByText('Text Input');
    const formCanvas = screen.getByTestId('form-canvas');
    
    await user.dragAndDrop(textField, formCanvas);
    expect(screen.getByText('Field 1')).toBeInTheDocument();
  });

  test('should apply conditional logic correctly', async () => {
    const form = createTestFormWithConditionalLogic();
    render(<FormPreview form={form} />);
    
    // Test condition triggering
    const triggerField = screen.getByLabelText('Wedding Type');
    await user.selectOptions(triggerField, 'destination');
    
    // Verify conditional field appears
    await waitFor(() => {
      expect(screen.getByLabelText('Destination Details')).toBeInTheDocument();
    });
  });
});

// Form Validation Tests
describe('FormValidation', () => {
  test('should validate required fields', () => {
    const result = validateFormSubmission(mockForm, { email: '' });
    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.email).toContain('required');
  });

  test('should validate email format', () => {
    const result = validateFormSubmission(mockForm, { email: 'invalid-email' });
    expect(result.fieldErrors.email).toContain('valid email');
  });

  test('should validate file upload constraints', () => {
    const largeFile = createMockFile(20 * 1024 * 1024); // 20MB
    const result = validateFileUpload(mockFileField, largeFile);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('file size');
  });
});
```

**Form Processing Tests:**
```typescript
describe('FormProcessingService', () => {
  test('should process form submission with CRM sync', async () => {
    const mockCRMService = jest.fn();
    const service = new FormProcessingService(supabase, emailService, mockCRMService);
    
    const result = await service.processFormSubmission(
      'form-123',
      mockWeddingFormData,
      mockMetadata
    );
    
    expect(result.success).toBe(true);
    expect(mockCRMService).toHaveBeenCalledWith(
      expect.objectContaining({
        clientInfo: expect.objectContaining({
          weddingDate: '2024-08-15',
          venue: 'Sunset Gardens'
        })
      })
    );
  });

  test('should handle form submission failures gracefully', async () => {
    const service = new FormProcessingService(supabase, emailService, crmService);
    supabase.from = jest.fn().mockReturnValue({
      insert: jest.fn().mockRejectedValue(new Error('Database error'))
    });
    
    const result = await service.processFormSubmission('form-123', {}, {});
    expect(result.success).toBe(false);
    expect(result.errors).toContain('error occurred');
  });
});
```

### 2. INTEGRATION TESTING

**CRM Integration Tests:**
```typescript
describe('CRM Integration', () => {
  test('should sync Tave contacts correctly', async () => {
    const mockTaveAPI = nock('https://api.tave.com')
      .post('/contacts')
      .reply(200, { id: 'tave-123' });
    
    const result = await crmService.syncFormSubmission({
      supplierId: 'supplier-123',
      submissionData: mockWeddingData,
      formType: 'intake'
    });
    
    expect(result.success).toBe(true);
    expect(result.crmId).toBe('tave-123');
  });

  test('should handle webhook delivery with retries', async () => {
    const webhookEndpoint = nock('https://client-webhook.com')
      .post('/form-submission')
      .times(3)
      .reply(500)
      .post('/form-submission')
      .reply(200);
    
    const result = await webhookService.deliverFormSubmission(mockSubmission);
    expect(result.delivered).toBe(true);
    expect(result.attempts).toBe(4);
  });
});
```

**Database Integration Tests:**
```typescript
describe('Database Operations', () => {
  test('should maintain form data integrity during concurrent submissions', async () => {
    const promises = Array.from({ length: 10 }, (_, i) => 
      formService.processSubmission(`form-123`, { 
        clientName: `Client ${i}`,
        weddingDate: '2024-08-15'
      })
    );
    
    const results = await Promise.all(promises);
    const allSuccessful = results.every(r => r.success);
    expect(allSuccessful).toBe(true);
    
    // Verify no duplicate submissions
    const submissions = await getFormSubmissions('form-123');
    expect(submissions).toHaveLength(10);
    expect(new Set(submissions.map(s => s.clientName))).toHaveLength(10);
  });
});
```

### 3. END-TO-END TESTING WITH PLAYWRIGHT MCP

**Form Builder E2E Tests:**
```typescript
// Launch comprehensive E2E testing
await mcp__playwright__browser_navigate('http://localhost:3000/supplier/forms/new');

test('Complete form builder workflow', async () => {
  // Take initial screenshot
  await mcp__playwright__browser_take_screenshot({
    filename: 'form-builder-initial.png'
  });

  // Create new form
  await mcp__playwright__browser_type({
    element: 'form name input',
    ref: 'input[placeholder="Form Name"]',
    text: 'Wedding Photography Intake Form'
  });

  // Add text field
  await mcp__playwright__browser_click({
    element: 'text field type',
    ref: '[data-testid="field-type-text"]'
  });

  // Configure field properties
  await mcp__playwright__browser_type({
    element: 'field label input',
    ref: '[data-testid="field-label-input"]',
    text: 'Primary Contact Name'
  });

  // Add conditional logic
  await mcp__playwright__browser_click({
    element: 'add conditional logic button',
    ref: '[data-testid="add-conditional-logic"]'
  });

  // Test form preview
  await mcp__playwright__browser_click({
    element: 'preview button',
    ref: '[data-testid="preview-form"]'
  });

  // Capture preview screenshot
  await mcp__playwright__browser_take_screenshot({
    filename: 'form-preview.png'
  });

  // Test form submission flow
  await mcp__playwright__browser_fill_form({
    fields: [
      {
        name: 'Primary Contact Name',
        type: 'textbox',
        ref: '[name="primary_contact"]',
        value: 'Sarah Johnson'
      },
      {
        name: 'Wedding Date',
        type: 'textbox', 
        ref: '[name="wedding_date"]',
        value: '2024-08-15'
      }
    ]
  });

  await mcp__playwright__browser_click({
    element: 'submit button',
    ref: 'button[type="submit"]'
  });

  // Verify success message
  await mcp__playwright__browser_wait_for({
    text: 'Form submitted successfully'
  });
});

test('Mobile form builder responsiveness', async () => {
  await mcp__playwright__browser_resize({
    width: 375,
    height: 667
  });

  await mcp__playwright__browser_navigate('http://localhost:3000/supplier/forms/new');
  
  // Test mobile interface
  await mcp__playwright__browser_take_screenshot({
    filename: 'form-builder-mobile.png'
  });

  // Verify mobile usability
  const fieldPalette = await mcp__playwright__browser_snapshot();
  expect(fieldPalette).toContain('Form Fields');
});
```

**Performance Testing:**
```typescript
test('Form handles 100 fields without performance degradation', async () => {
  const startTime = Date.now();
  
  // Add 100 fields programmatically
  for (let i = 0; i < 100; i++) {
    await mcp__playwright__browser_click({
      element: `text field ${i}`,
      ref: '[data-testid="field-type-text"]'
    });
    
    // Verify form builder remains responsive
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(500); // 500ms max per field
  }
  
  // Test final render performance
  const finalRenderStart = Date.now();
  await mcp__playwright__browser_click({
    element: 'preview button',
    ref: '[data-testid="preview-form"]'
  });
  
  const renderTime = Date.now() - finalRenderStart;
  expect(renderTime).toBeLessThan(2000); // 2s max for complex form
});
```

### 4. ACCESSIBILITY TESTING

**A11y Compliance Tests:**
```typescript
describe('Form Builder Accessibility', () => {
  test('should have proper ARIA labels for all interactive elements', async () => {
    render(<AdvancedFormBuilder />);
    
    // Check field palette accessibility
    const fieldButtons = screen.getAllByRole('button');
    fieldButtons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
    });
    
    // Check form canvas accessibility
    const formCanvas = screen.getByTestId('form-canvas');
    expect(formCanvas).toHaveAttribute('aria-label', 'Form building area');
  });

  test('should support keyboard navigation', async () => {
    const { user } = render(<AdvancedFormBuilder />);
    
    // Tab through field types
    await user.tab();
    expect(screen.getByText('Text Input')).toHaveFocus();
    
    await user.tab();
    expect(screen.getByText('Email')).toHaveFocus();
  });

  test('should have sufficient color contrast', async () => {
    // Use axe-core for automated accessibility testing
    const { container } = render(<AdvancedFormBuilder />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### 5. WEDDING-SPECIFIC TESTING SCENARIOS

**Photographer Intake Form Test:**
```typescript
test('Photographer intake form with conditional logic', async () => {
  const photographerForm = {
    form_name: 'Photography Consultation Form',
    fields: [
      { field_name: 'wedding_type', field_label: 'Wedding Type', field_type: 'select', 
        field_options: [
          { value: 'local', label: 'Local Wedding' },
          { value: 'destination', label: 'Destination Wedding' }
        ]
      },
      { field_name: 'travel_details', field_label: 'Travel Requirements', 
        field_type: 'textarea',
        conditional_logic: {
          conditions: [{ field_id: 'wedding_type', operator: 'equals', value: 'destination' }],
          action: { type: 'show' }
        }
      }
    ]
  };

  // Test conditional logic workflow
  const submission = await processFormSubmission(photographerForm.id, {
    wedding_type: 'destination'
  });

  expect(submission.processedData).toHaveProperty('travel_details');
});
```

**Multi-Vendor Coordination Test:**
```typescript
test('Vendor coordination form with timeline integration', async () => {
  const coordinationForm = createVendorCoordinationForm();
  
  // Test that form submissions trigger vendor notifications
  const mockEmailService = jest.fn();
  const result = await processFormSubmission(coordinationForm.id, {
    timeline_changes: 'Moved ceremony start time to 4 PM',
    affected_vendors: ['photographer', 'florist', 'catering']
  });

  expect(mockEmailService).toHaveBeenCalledTimes(3); // One per affected vendor
  expect(result.automationTriggered).toBe(true);
});
```

## 📋 COMPREHENSIVE DOCUMENTATION REQUIREMENTS

### 1. USER DOCUMENTATION

**Supplier Guide: Form Builder Usage**
```markdown
# WedSync Advanced Form Builder - Complete Guide

## Getting Started
The Advanced Form Builder lets you create sophisticated intake forms, questionnaires, and client data collection forms with drag-and-drop simplicity.

### Creating Your First Form
1. Navigate to Forms → Create New Form
2. Choose from templates or start from scratch
3. Drag field types from the left palette to your form
4. Configure field properties in the right panel
5. Add conditional logic to show/hide fields based on responses
6. Preview your form and test the user experience
7. Save and share your form link with clients

## Field Types and Use Cases

### Text Fields
- **Client Names**: Set as required, add validation for proper names
- **Address Fields**: Use address field type for auto-completion
- **Special Requests**: Use textarea for detailed client input

### Wedding-Specific Fields
- **Wedding Date**: Use date picker with minimum date validation
- **Guest Count**: Number field with venue capacity limits
- **Ceremony Type**: Dropdown with religious/secular/outdoor options

### Advanced Fields
- **Signature Capture**: For contracts and agreements
- **File Upload**: Portfolio requests, inspiration images
- **Payment Integration**: Retainer collection with Stripe

## Conditional Logic Examples

### Show/Hide Based on Wedding Type
If wedding type = "Destination Wedding"
→ Show travel requirements field
→ Show accommodation preferences
→ Require passport information

### Dynamic Pricing Forms  
If guest count > 150
→ Show large wedding package options
→ Hide intimate ceremony fields
→ Update pricing calculations

## Integration Setup
- **CRM Sync**: Automatically send form responses to your CRM
- **Email Automation**: Send welcome sequences based on responses  
- **Calendar Booking**: Auto-schedule consultations
- **Payment Processing**: Collect retainers seamlessly
```

**Technical Documentation:**
```markdown
# Form Builder Technical Implementation

## Architecture Overview
The Advanced Form Builder consists of:
- React-based drag-and-drop interface
- PostgreSQL schema for form structure and submissions
- Real-time validation and conditional logic engine
- Integration layer for CRM, email, and webhooks

## Database Schema
[Detailed schema documentation with examples]

## API Endpoints  
[Complete API reference with request/response examples]

## Performance Considerations
- Form rendering optimized for 100+ fields
- Conditional logic evaluation < 50ms
- Mobile form submission < 3 seconds on 3G
- Concurrent submission handling: 1000+ users

## Security Implementation
- Input validation and sanitization
- SQL injection prevention
- XSS protection on form rendering
- Rate limiting on submission endpoints
```

### 2. TROUBLESHOOTING GUIDE

```markdown
# Form Builder Troubleshooting

## Common Issues

### Forms Not Loading
**Symptoms**: Blank form builder screen, loading spinner indefinitely
**Causes**: 
- Database connection issues
- Invalid form permissions
- JavaScript errors in browser console

**Solutions**:
1. Check browser console for JavaScript errors
2. Verify supplier has form creation permissions
3. Clear browser cache and reload
4. Check database connectivity

### Conditional Logic Not Working
**Symptoms**: Fields not showing/hiding as expected
**Diagnosis**:
1. Verify trigger field has correct name/ID
2. Check condition operators and values
3. Test logic step-by-step in preview mode

### Form Submissions Failing
**Symptoms**: Users report form won't submit, validation errors
**Solutions**:
1. Check required fields are properly marked
2. Verify file upload size limits
3. Test form submission in preview mode
4. Review server logs for submission errors
```

## 🎯 TEAM E SPECIALIZATION: QA/TESTING & DOCUMENTATION FOCUS

**YOUR CORE RESPONSIBILITIES:**
- **Comprehensive Test Coverage**: >95% unit test coverage, full E2E scenarios
- **Wedding Scenario Testing**: Real-world vendor workflows and client interactions
- **Performance Validation**: Load testing, mobile optimization, form complexity handling
- **Documentation Excellence**: Complete user guides, technical docs, troubleshooting
- **Integration Testing**: CRM sync accuracy, webhook delivery, email automation
- **Accessibility Compliance**: WCAG 2.1 AA standards, keyboard navigation, screen readers
- **Cross-browser Testing**: Chrome, Firefox, Safari, mobile browsers
- **Security Testing**: Input validation, SQL injection, XSS prevention

## 💾 WHERE TO SAVE YOUR WORK

- **Test Files**: `$WS_ROOT/wedsync/tests/forms/form-builder/`
- **E2E Tests**: `$WS_ROOT/wedsync/tests/e2e/forms/`
- **Documentation**: `$WS_ROOT/wedsync/docs/features/form-builder/`
- **Test Reports**: `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`

## 🏁 COMPLETION CHECKLIST

**Testing Requirements:**
- [ ] Unit tests written with >95% coverage
- [ ] Integration tests for all CRM connections
- [ ] E2E tests with Playwright MCP (screenshots included)
- [ ] Performance tests for 100+ field forms
- [ ] Mobile responsiveness tests (375px - 1920px)
- [ ] Accessibility tests with axe-core
- [ ] Security validation tests for all inputs
- [ ] Wedding-specific scenario testing

**Documentation Requirements:**
- [ ] Complete user guide for suppliers
- [ ] Technical implementation documentation
- [ ] API endpoint reference with examples
- [ ] Troubleshooting guide with solutions
- [ ] Performance benchmarks and requirements
- [ ] Integration setup instructions
- [ ] Test execution evidence provided

**Quality Gates:**
- [ ] All tests passing with evidence provided
- [ ] No security vulnerabilities identified
- [ ] Mobile completion rate within 10% of desktop
- [ ] Form loading time < 2 seconds on 3G
- [ ] Documentation reviewed and approved
- [ ] Senior dev review prompt created

---

**EXECUTE IMMEDIATELY - This is Team E's comprehensive QA and Documentation mission for WS-342 Advanced Form Builder Engine!**