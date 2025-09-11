# TEAM A - ROUND 1: WS-327 - AI Integration Main Overview
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build the frontend/UI components for AI-powered features including form generation interface, email template wizard, content creation tools, and AI chatbot integration
**FEATURE ID:** WS-327 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about creating intuitive AI interfaces that wedding suppliers can use without technical AI knowledge

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/ai-integration/
ls -la $WS_ROOT/wedsync/src/app/(dashboard)/ai-tools/
cat $WS_ROOT/wedsync/src/components/ai-integration/FormGeneratorWizard.tsx | head -20
cat $WS_ROOT/wedsync/src/components/ai-integration/EmailTemplateBuilder.tsx | head-20
```

2. **TYPECHECK RESULTS:**
```bash
cd $WS_ROOT/wedsync && npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
cd $WS_ROOT/wedsync && npm test -- --testPathPattern="ai-integration"
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query AI-related patterns and form building components
await mcp__serena__search_for_pattern("ai.*integration|form.*generator|template.*builder");
await mcp__serena__find_symbol("FormBuilder", "", true);
await mcp__serena__get_symbols_overview("src/components/ui");
await mcp__serena__find_symbol("AIService", "", true);
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the SAAS UI Style Guide for AI interface design
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY

**❌ DO NOT USE:**
- Radix UI, Catalyst UI, shadcn/ui, or any other component libraries

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation specific to AI interface design and form generation
await mcp__Ref__ref_search_documentation("React 19 AI interface patterns OpenAI integration UI");
await mcp__Ref__ref_search_documentation("Next.js 15 streaming responses AI form generation");
await mcp__Ref__ref_search_documentation("TypeScript AI service integration error handling");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR AI INTERFACE PLANNING

### Use Sequential Thinking MCP for AI Feature Architecture
```typescript
// Plan the AI integration user interface system
mcp__sequential-thinking__sequential_thinking({
  thought: "For AI integration UI, I need: 1) Form Generator Wizard with step-by-step guidance, 2) Email Template Builder with AI suggestions, 3) Content Creation Tools with real-time preview, 4) AI Chatbot interface for client support, 5) Usage tracking dashboard, 6) Cost management controls for suppliers.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "AI interface considerations: Progress indicators for AI processing, Real-time streaming responses, Error handling for AI failures, Cost transparency for suppliers, Usage limits based on subscription tier, Preview functionality before applying AI suggestions.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down AI UI components, track integration dependencies
2. **nextjs-fullstack-developer** - Use Serena for AI component patterns consistency  
3. **security-compliance-officer** - Ensure AI data security and privacy compliance
4. **code-quality-guardian** - Maintain React/TypeScript standards for AI components
5. **test-automation-architect** - AI component testing with mock AI responses
6. **documentation-chronicler** - Evidence-based AI UI documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### AI INTERFACE SECURITY CHECKLIST:
- [ ] **Input sanitization** - Clean all user inputs before sending to AI services
- [ ] **Output validation** - Validate all AI responses before displaying to users
- [ ] **API key protection** - Never expose AI API keys in frontend code
- [ ] **Rate limiting display** - Show usage limits and remaining quotas
- [ ] **Data privacy compliance** - GDPR compliance for AI processing
- [ ] **Error handling** - Graceful degradation when AI services fail
- [ ] **Audit logging** - Log all AI usage for billing and compliance
- [ ] **Content moderation** - Filter inappropriate AI-generated content

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY FOR AI FEATURES)

**❌ FORBIDDEN: Creating standalone AI tools without navigation integration**
**✅ MANDATORY: Integrate AI tools into main navigation system**

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Add "AI Tools" section to main dashboard navigation
- [ ] Mobile navigation support for AI features
- [ ] Navigation states (active/current) implemented  
- [ ] Breadcrumbs: Dashboard > AI Tools > [Feature]
- [ ] Accessibility labels for all AI navigation items

```typescript
// MUST update main dashboard navigation
// File: $WS_ROOT/wedsync/src/app/(dashboard)/layout.tsx
{
  title: "AI Tools",
  href: "/dashboard/ai-tools",
  icon: Bot,
  children: [
    { title: "Form Generator", href: "/dashboard/ai-tools/forms" },
    { title: "Email Templates", href: "/dashboard/ai-tools/emails" },
    { title: "Content Creator", href: "/dashboard/ai-tools/content" },
    { title: "AI Chatbot", href: "/dashboard/ai-tools/chatbot" }
  ]
}
```

## 🎯 TEAM A SPECIALIZATION: FRONTEND/AI UI FOCUS

**PRIMARY RESPONSIBILITIES:**
- AI-powered React components with TypeScript
- Real-time streaming response interfaces
- Progress indicators and loading states for AI processing
- Form validation and error handling for AI inputs
- Accessibility compliance for AI tools (WCAG 2.1 AA)
- Performance optimization for AI response rendering

### AI INTEGRATION UI REQUIREMENTS

#### 1. FORM GENERATOR WIZARD
```typescript
// Component: AIFormGeneratorWizard.tsx
interface FormGeneratorWizardProps {
  supplierId: string;
  vendorType: 'photographer' | 'venue' | 'caterer' | 'florist' | 'dj';
  onFormGenerated: (form: GeneratedForm) => void;
}

export function AIFormGeneratorWizard({ supplierId, vendorType, onFormGenerated }: FormGeneratorWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formPurpose, setFormPurpose] = useState('');
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedForm, setGeneratedForm] = useState<GeneratedForm | null>(null);

  // Multi-step wizard for form generation:
  // Step 1: Form Purpose (Client Intake, Wedding Questionnaire, Vendor Booking, etc.)
  // Step 2: Required Information (Select key fields needed)
  // Step 3: AI Generation (Show progress, streaming response)
  // Step 4: Review & Customize (Preview generated form)
  // Step 5: Save & Deploy (Add to forms library)

  return (
    <div className="ai-form-wizard max-w-4xl mx-auto p-6">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                ${step <= currentStep 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-200 text-gray-600'
                }
              `}
            >
              {step}
            </div>
          ))}
        </div>
        <div className="text-sm text-gray-600 text-center">
          Step {currentStep} of 5: {getStepTitle(currentStep)}
        </div>
      </div>

      {/* Step content */}
      {currentStep === 1 && (
        <FormPurposeStep
          vendorType={vendorType}
          purpose={formPurpose}
          onPurposeChange={setFormPurpose}
          onNext={() => setCurrentStep(2)}
        />
      )}

      {currentStep === 2 && (
        <RequiredFieldsStep
          vendorType={vendorType}
          purpose={formPurpose}
          selectedFields={requiredFields}
          onFieldsChange={setRequiredFields}
          onBack={() => setCurrentStep(1)}
          onNext={() => setCurrentStep(3)}
        />
      )}

      {currentStep === 3 && (
        <AIGenerationStep
          vendorType={vendorType}
          purpose={formPurpose}
          requiredFields={requiredFields}
          isGenerating={isGenerating}
          onStartGeneration={handleStartGeneration}
          onGenerationComplete={(form) => {
            setGeneratedForm(form);
            setCurrentStep(4);
          }}
        />
      )}

      {currentStep === 4 && generatedForm && (
        <ReviewCustomizeStep
          generatedForm={generatedForm}
          onFormUpdate={setGeneratedForm}
          onBack={() => setCurrentStep(3)}
          onNext={() => setCurrentStep(5)}
        />
      )}

      {currentStep === 5 && generatedForm && (
        <SaveDeployStep
          generatedForm={generatedForm}
          supplierId={supplierId}
          onSave={onFormGenerated}
        />
      )}
    </div>
  );
}
```

#### 2. EMAIL TEMPLATE BUILDER
```typescript
// Component: AIEmailTemplateBuilder.tsx
export function AIEmailTemplateBuilder({ supplierId, templateType }: EmailTemplateBuilderProps) {
  const [context, setContext] = useState<EmailContext>({
    recipientType: 'couple',
    occasion: 'booking_confirmation',
    tone: 'professional',
    customInstructions: ''
  });
  const [generatedTemplate, setGeneratedTemplate] = useState<EmailTemplate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  const generateTemplate = async () => {
    setIsGenerating(true);
    setStreamingContent('');

    try {
      const response = await fetch('/api/ai/generate-email-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          context,
          templateType
        })
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let content = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        content += chunk;
        setStreamingContent(content);
      }

      setGeneratedTemplate({
        subject: extractSubject(content),
        body: extractBody(content),
        variables: extractVariables(content)
      });

    } catch (error) {
      console.error('Template generation failed:', error);
      // Show error state
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="ai-email-builder grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
      {/* Configuration Panel */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Email Context</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Recipient Type</label>
              <select
                value={context.recipientType}
                onChange={(e) => setContext({ ...context, recipientType: e.target.value as any })}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="couple">Couple</option>
                <option value="wedding_party">Wedding Party</option>
                <option value="vendor">Other Vendor</option>
                <option value="guest">Wedding Guest</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email Occasion</label>
              <select
                value={context.occasion}
                onChange={(e) => setContext({ ...context, occasion: e.target.value })}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="booking_confirmation">Booking Confirmation</option>
                <option value="wedding_reminder">Wedding Reminder</option>
                <option value="follow_up">Follow Up</option>
                <option value="thank_you">Thank You</option>
                <option value="rescheduling">Rescheduling</option>
                <option value="payment_reminder">Payment Reminder</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tone</label>
              <div className="grid grid-cols-3 gap-2">
                {['professional', 'friendly', 'formal'].map((tone) => (
                  <button
                    key={tone}
                    onClick={() => setContext({ ...context, tone })}
                    className={`
                      p-2 text-sm rounded-lg border transition-all
                      ${context.tone === tone
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }
                    `}
                  >
                    {tone.charAt(0).toUpperCase() + tone.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Custom Instructions</label>
              <textarea
                value={context.customInstructions}
                onChange={(e) => setContext({ ...context, customInstructions: e.target.value })}
                placeholder="Add any specific instructions or details to include..."
                rows={4}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <button
              onClick={generateTemplate}
              disabled={isGenerating}
              className={`
                w-full p-3 rounded-lg font-medium transition-all
                ${isGenerating
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary-dark'
                }
              `}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center">
                  <Loader className="animate-spin -ml-1 mr-3 h-5 w-5" />
                  Generating Template...
                </span>
              ) : (
                'Generate Email Template'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Template Preview</h3>
          
          <div className="border rounded-lg p-4 bg-gray-50 min-h-[400px]">
            {isGenerating ? (
              <div className="space-y-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                </div>
                <div className="whitespace-pre-wrap text-gray-700">
                  {streamingContent}
                  <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1"></span>
                </div>
              </div>
            ) : generatedTemplate ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-600 mb-1">Subject:</div>
                  <div className="font-semibold">{generatedTemplate.subject}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600 mb-1">Body:</div>
                  <div className="whitespace-pre-wrap">{generatedTemplate.body}</div>
                </div>
                <div className="flex gap-2 pt-4">
                  <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">
                    Save Template
                  </button>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Edit Template
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Configure your email context and click "Generate" to create a template
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 3. AI USAGE DASHBOARD
```typescript
// Component: AIUsageDashboard.tsx
export function AIUsageDashboard({ supplierId }: AIUsageDashboardProps) {
  const [usageData, setUsageData] = useState<AIUsageData | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  return (
    <div className="ai-usage-dashboard space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">AI Usage Dashboard</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="p-2 border rounded-lg"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Usage Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Forms Generated"
          value={usageData?.formsGenerated || 0}
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Email Templates"
          value={usageData?.emailTemplates || 0}
          icon={Mail}
          color="green"
        />
        <StatCard
          title="Content Created"
          value={usageData?.contentPieces || 0}
          icon={PenTool}
          color="purple"
        />
        <StatCard
          title="Cost This Month"
          value={`$${(usageData?.costCents || 0) / 100}`}
          icon={DollarSign}
          color="red"
        />
      </div>

      {/* Usage Chart */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">AI Usage Over Time</h3>
        <AIUsageChart data={usageData?.dailyUsage || []} />
      </div>

      {/* Feature Usage Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Feature Usage</h3>
          <div className="space-y-3">
            {usageData?.featureBreakdown?.map((feature) => (
              <div key={feature.name} className="flex items-center justify-between">
                <span className="text-gray-700">{feature.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${feature.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">{feature.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>
          <div className="space-y-3">
            {usageData?.costBreakdown?.map((item) => (
              <div key={item.feature} className="flex items-center justify-between">
                <span className="text-gray-700">{item.feature}</span>
                <span className="font-medium">${item.cost / 100}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

## 📋 REAL WEDDING USER STORIES FOR AI TOOLS

**Emma & James (Photography Couple):**
*"We want AI to help create intake forms for new couples and generate follow-up emails after shoots. The AI should understand photography terminology and create professional but warm communications."*

**Sarah & Mike (Wedding Planners):**
*"We need AI to help create custom questionnaires for different types of weddings (destination, intimate, large) and generate timeline templates based on couple preferences."*

**Lisa & David (Venue Owners):**
*"We want AI to create booking confirmation emails and venue-specific forms that capture all the details we need for event setup and catering coordination."*

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] AIFormGeneratorWizard component with 5-step workflow
- [ ] AIEmailTemplateBuilder with real-time streaming responses
- [ ] AIUsageDashboard with cost tracking and analytics
- [ ] Navigation integration into main dashboard
- [ ] Loading states and error handling for AI operations
- [ ] Input validation and output sanitization
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Unit tests for all AI components (>90% coverage)
- [ ] Evidence package with component screenshots

## 💾 WHERE TO SAVE YOUR WORK
- Components: `$WS_ROOT/wedsync/src/components/ai-integration/`
- Pages: `$WS_ROOT/wedsync/src/app/(dashboard)/ai-tools/`
- Types: `$WS_ROOT/wedsync/src/types/ai-integration.ts`
- Hooks: `$WS_ROOT/wedsync/src/hooks/useAIGeneration.ts`
- Tests: `$WS_ROOT/wedsync/src/__tests__/components/ai-integration/`

## 🏁 COMPLETION CHECKLIST
- [ ] All AI components created and verified to exist
- [ ] TypeScript compilation successful with no errors
- [ ] All tests passing (unit tests for components)
- [ ] Security requirements implemented (input/output validation)
- [ ] Navigation integration complete and tested
- [ ] Loading states and error handling implemented
- [ ] Accessibility compliance validated
- [ ] Evidence package prepared with component demonstrations
- [ ] Real-time streaming responses working correctly
- [ ] Cost tracking and usage limits properly displayed

---

**EXECUTE IMMEDIATELY - Build the AI tools that will revolutionize wedding supplier workflows!**