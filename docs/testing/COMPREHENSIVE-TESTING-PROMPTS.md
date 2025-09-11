# 🧪 COMPREHENSIVE CODE TESTING PROMPTS - All Sessions

**Use these prompts to thoroughly test all code before Sprint 2**

---

## 📋 SESSION A: Core Fields Testing Prompt

```markdown
# SESSION A: Comprehensive Core Fields Testing

## 🎯 YOUR MISSION
Thoroughly test the Core Fields auto-population system to ensure 95% accuracy, <500ms performance, and seamless integration with Session B's PDF extraction.

## 🤖 SUB-AGENT DEPLOYMENT

### Phase 1: Unit Testing (1 hour)
Launch test-automation-architect with: "Create comprehensive unit tests for Core Fields including: 1) Field detection accuracy for all 40+ wedding fields 2) Confidence scoring algorithm validation 3) Auto-population timing under 500ms 4) Cache hit rates >80% 5) Error handling for missing/invalid data 6) Field normalization (bride name vs bride's name)"

Launch code-quality-guardian with: "Review Core Fields implementation for: 1) TypeScript type safety 2) Proper error boundaries 3) Memory leaks in React components 4) Accessibility compliance 5) Security vulnerabilities in data handling"

### Phase 2: Integration Testing (1 hour)
Launch verification-cycle-coordinator with: "Test Core Fields integration with PDF import: 1) Receive extracted data from /api/core-fields/extract 2) Validate field mapping accuracy 3) Test confidence threshold handling 4) Verify batch accept/reject functionality 5) Confirm real-time Supabase sync"

Launch performance-optimization-expert with: "Benchmark Core Fields performance: 1) Field detection <200ms with debouncing 2) API response <500ms with caching 3) No UI blocking during processing 4) Memory usage under load 5) Concurrent user handling"

### Phase 3: User Acceptance Testing (1 hour)
Launch test-automation-architect with: "Create E2E tests simulating wedding vendor workflows: 1) Photographer uploading contract PDF 2) Venue manager with 200+ guest forms 3) Florist with complex order forms 4) Planner coordinating multiple vendors 5) Mobile users on iPhone SE"

Launch user-impact-analyzer with: "Validate business value: 1) Measure actual time saved (target 10+ minutes) 2) Calculate accuracy for real wedding data 3) Test with non-English names and venues 4) Verify international date formats 5) Assess user satisfaction metrics"

## ✅ ACCEPTANCE CRITERIA
- [ ] 95%+ accuracy for high-confidence fields
- [ ] <200ms detection time (debounced)
- [ ] <500ms API response (cached)
- [ ] Zero data loss on save
- [ ] Integration with Session B verified
- [ ] Mobile responsive (375px+)
- [ ] 10+ minutes saved per form

## 🔬 SPECIFIC TEST SCENARIOS

### Test Case 1: PDF Integration Flow
```javascript
// Test receiving PDF data from Session B
const pdfData = {
  fields: {
    bride_first_name: "Emma",
    wedding_date: "2025-06-15",
    venue_name: "Rosewood Manor"
  },
  confidence: {
    bride_first_name: 0.95,
    wedding_date: 0.98,
    venue_name: 0.87
  }
};
// Verify auto-population and visual feedback
```

### Test Case 2: Performance Under Load
```javascript
// Test with 50 concurrent forms
// Each with 40+ fields
// Measure detection time, API response, UI responsiveness
```

### Test Case 3: Edge Cases
- Empty PDF extraction
- Conflicting field data
- Special characters in names
- Invalid date formats
- Network failures

## 📊 METRICS TO CAPTURE
- Field detection accuracy by type
- Time saved per form type
- Cache hit ratio
- API response times (p50, p95, p99)
- Error rates and types
```

---

## 📋 SESSION B: PDF Import Testing Prompt

```markdown
# SESSION B: Comprehensive PDF Import Testing

## 🎯 YOUR MISSION
Validate PDF import system achieving 87%+ accuracy, <30s processing for 10 pages, and robust error handling for all document types.

## 🤖 SUB-AGENT DEPLOYMENT

### Phase 1: OCR Accuracy Testing (1 hour)
Launch test-automation-architect with: "Test PDF OCR accuracy: 1) Upload 20 different wedding contracts 2) Verify 87%+ field extraction accuracy 3) Test with poor quality scans 4) Validate handwritten text detection 5) Check multi-page document handling 6) Test rotated and skewed PDFs"

Launch ai-ml-engineer with: "Validate Google Cloud Vision integration: 1) API response handling 2) Rate limiting compliance 3) Error recovery mechanisms 4) Confidence score calibration 5) Field proximity analysis 6) Table extraction accuracy"

### Phase 2: Performance Testing (1 hour)
Launch performance-optimization-expert with: "Benchmark PDF processing: 1) 1-page: <5 seconds 2) 5-page: <15 seconds 3) 10-page: <30 seconds 4) Parallel processing with 4 workers 5) Memory usage under 512MB 6) Cache effectiveness (15-min TTL)"

Launch verification-cycle-coordinator with: "Test concurrent PDF processing: 1) 10 simultaneous uploads 2) Queue management 3) Progress tracking accuracy 4) Resource utilization 5) Error isolation (one failure doesn't affect others)"

### Phase 3: Security & Validation (1 hour)
Launch security-compliance-officer with: "Security audit PDF handling: 1) Malicious PDF detection 2) File size limits (10MB) 3) Virus scanning integration 4) Encrypted PDF handling 5) Input sanitization 6) Temporary file cleanup"

Launch code-quality-guardian with: "Review PDF processing code: 1) Error handling completeness 2) Memory leak prevention 3) TypeScript type safety 4) Logging and monitoring 5) Code coverage >85%"

## ✅ ACCEPTANCE CRITERIA
- [ ] 87%+ overall accuracy
- [ ] <30s for 10-page document
- [ ] 95% success rate for valid PDFs
- [ ] Graceful handling of corrupted PDFs
- [ ] Real-time progress updates
- [ ] Tier-based access control (STARTER+)

## 🔬 SPECIFIC TEST SCENARIOS

### Test Case 1: Document Variety
```javascript
// Test different document types
const testDocuments = [
  'wedding_contract.pdf',      // 88% expected
  'venue_invoice.pdf',         // 91% expected
  'timeline_schedule.pdf',     // 86% expected
  'guest_questionnaire.pdf',   // 92% expected
  'catering_menu.pdf',         // 85% expected
];
// Verify accuracy meets targets
```

### Test Case 2: Error Handling
```javascript
// Test problematic PDFs
const errorCases = [
  'corrupted.pdf',        // Should auto-repair
  'encrypted.pdf',        // Should show warning
  'huge_file.pdf',        // Should reject >10MB
  'malicious.pdf',        // Should block
  'empty.pdf',           // Should handle gracefully
];
```

### Test Case 3: Field Extraction
- Email addresses (94% accuracy)
- Phone numbers (92% accuracy)
- Dates in various formats (92% accuracy)
- Venue names (86% accuracy)
- Currency amounts (90% accuracy)

## 📊 METRICS TO CAPTURE
- Accuracy by document type
- Processing time by page count
- Field detection confidence distribution
- Error types and frequencies
- Cache hit rates
```

---

## 📋 SESSION C: Payment System Testing Prompt

```markdown
# SESSION C: Comprehensive Payment Testing

## 🎯 YOUR MISSION
Validate 5-tier payment system with GBP pricing, Stripe integration, feature gates, and 30-day trial functionality.

## 🤖 SUB-AGENT DEPLOYMENT

### Phase 1: Stripe Integration Testing (1 hour)
Launch integration-specialist with: "Test Stripe payment flow: 1) Create checkout sessions for all 4 paid tiers 2) Process test payments in GBP 3) Handle successful payments 4) Test failed payment scenarios 5) Verify webhook signature validation 6) Test subscription upgrades/downgrades"

Launch security-compliance-officer with: "Audit payment security: 1) PCI compliance verification 2) No card data in logs 3) Secure webhook endpoints 4) HTTPS enforcement 5) Rate limiting on payment APIs 6) Subscription status verification"

### Phase 2: Feature Gate Testing (1 hour)
Launch test-automation-architect with: "Test tier-based feature access: 1) FREE: 1 form limit, no PDF import 2) STARTER (£19): Unlimited forms, PDF import enabled 3) PROFESSIONAL (£49): AI chatbot access 4) SCALE (£79): API access enabled 5) ENTERPRISE (£149): White-label features"

Launch verification-cycle-coordinator with: "Test feature enforcement: 1) Block PDF import for FREE users 2) Show upgrade prompts at limits 3) Instant feature unlock on payment 4) Feature removal on downgrade 5) Grace period handling"

### Phase 3: Trial & Subscription Testing (1 hour)
Launch test-automation-architect with: "Test 30-day trial flow: 1) New users get Professional features 2) Trial countdown display 3) Trial expiry handling 4) Conversion to paid 5) Revert to FREE after trial 6) One-time extension logic"

Launch business-metrics-analyst with: "Validate revenue tracking: 1) MRR calculation 2) Conversion funnel metrics 3) Churn rate tracking 4) Usage vs tier analysis 5) Upgrade/downgrade patterns"

## ✅ ACCEPTANCE CRITERIA
- [ ] All 5 tiers working (FREE, STARTER, PROFESSIONAL, SCALE, ENTERPRISE)
- [ ] GBP pricing throughout
- [ ] Stripe checkout completes
- [ ] Webhooks process reliably
- [ ] Feature gates enforce correctly
- [ ] 30-day trial functioning

## 🔬 SPECIFIC TEST SCENARIOS

### Test Case 1: Upgrade Flow
```javascript
// Test user journey
1. Start on FREE tier
2. Hit 1 form limit
3. See upgrade prompt
4. Choose STARTER (£19)
5. Complete Stripe checkout
6. Return to dashboard
7. Verify unlimited forms
8. Verify PDF import enabled
```

### Test Case 2: Feature Access
```javascript
// Test each tier's access
const tierTests = {
  FREE: {
    canCreateForm: false, // After 1st form
    canUsePDF: false,
    canUseAI: false
  },
  STARTER: {
    canCreateForm: true,
    canUsePDF: true,
    canUseAI: false
  },
  PROFESSIONAL: {
    canCreateForm: true,
    canUsePDF: true,
    canUseAI: true
  }
};
```

### Test Case 3: Webhook Processing
```javascript
// Test Stripe events
const webhookEvents = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed'
];
// Verify each updates user tier correctly
```

## 📊 METRICS TO CAPTURE
- Checkout conversion rate
- Payment success rate
- Feature gate bypass attempts
- Webhook processing time
- Trial conversion rate
```

---

## 🔄 CROSS-SESSION INTEGRATION TESTING

```markdown
# ALL SESSIONS: End-to-End Integration Test

## 🎯 COMPLETE WORKFLOW TEST

### Launch All These Agents Together:

Launch technical-lead-orchestrator with: "Coordinate end-to-end testing of PDF → Core Fields → Payment flow: 1) FREE user uploads PDF and gets blocked 2) Upgrade to STARTER for £19 3) Upload PDF successfully 4) Extract fields at 87% accuracy 5) Auto-populate form with 95% accuracy 6) Save in <500ms"

Launch verification-cycle-coordinator with: "Run complete user journey tests: 1) Wedding photographer signup flow 2) Upload existing contract PDF 3) See fields auto-populate 4) Save form and verify data 5) Test on mobile devices 6) Measure total time saved"

Launch performance-optimization-expert with: "Benchmark complete system: 1) PDF upload to form creation <45 seconds 2) Payment processing <3 seconds 3) Feature unlock immediate 4) No memory leaks after 100 operations 5) 99% uptime over 24 hours"

## ✅ INTEGRATION SUCCESS CRITERIA
- [ ] PDF → Core Fields data flow working
- [ ] Payment gates enforced correctly
- [ ] All features accessible per tier
- [ ] <45 seconds total workflow
- [ ] Mobile responsive throughout
- [ ] No data loss between systems

## 📊 FINAL METRICS DASHBOARD
- Overall system accuracy: >90%
- Total time saved per vendor: >10 hours/month
- Payment conversion: >20%
- System uptime: >99%
- User satisfaction: >4.5/5
```

---

## 🚀 TESTING EXECUTION PLAN

### **For Each Session:**

1. **Copy your session's testing prompt**
2. **Launch all specified sub-agents in parallel**
3. **Run through all test scenarios**
4. **Document any failures with screenshots**
5. **Fix issues and re-test**
6. **Generate test report**

### **Success Criteria for Sprint 2:**
- All sessions pass 95% of tests
- Integration tests 100% passing
- Performance targets met
- Security audit clean
- Ready for beta users

---

**Use these prompts NOW to ensure all code is production-ready before tomorrow's Sprint 2!**