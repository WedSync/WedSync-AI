# TEAM B - ROUND 1: WS-306 - Forms System Section Overview
## 2025-01-25 - 08:00 AM

**YOUR MISSION:** Build secure forms API with AI-powered form generation, response processing, and wedding data mapping system
**FEATURE ID:** WS-306 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about form security, AI integration, and wedding data validation

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FORMS API VERIFICATION:**
```bash
curl -X POST $WS_ROOT/api/forms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Form","fields":[]}' | jq .
# MUST show: Form created with ID and proper structure
```

2. **AI FORM GENERATION TEST:**
```bash
curl -X POST $WS_ROOT/api/ai/generate-form \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"vendor_type":"photographer"}' | jq .
# MUST show: AI-generated wedding form with appropriate fields
```

3. **FORM RESPONSE PROCESSING VERIFICATION:**
```bash
curl -X POST $WS_ROOT/api/forms/$FORM_ID/submit \
  -H "Content-Type: application/json" \
  -d '{"responses":{"wedding_date":"2025-06-15"}}' | jq .
# MUST show: Response processed and mapped to client data
```

## 🧠 SEQUENTIAL THINKING FOR FORMS API DEVELOPMENT

```typescript
// Forms API complexity analysis
mcp__sequential-thinking__sequentialthinking({
  thought: "Wedding forms API needs: Secure form creation with validation, AI-powered form generation based on vendor types, public form submission endpoints with spam protection, response processing with automatic client data mapping, form analytics and completion tracking, and integration with existing client management system.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "AI form generation requirements: OpenAI integration for intelligent field suggestions, vendor-specific templates (photographer needs timeline questions, venues need guest counts, florists need color preferences), dynamic field validation based on wedding industry standards, and smart field mapping to core wedding data structures.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Security and validation patterns: All form creation requires authentication, public form submissions need rate limiting and CSRF protection, form responses must be validated against dynamic schemas, wedding-specific data validation (dates, venues, guest counts), and audit trails for all form interactions.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Data mapping and integration: Form responses automatically populate client profiles, wedding dates trigger timeline creation, venue addresses integrate with maps, guest counts update capacity planning, and all responses maintain audit trails for wedding coordination accuracy.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 📚 ENHANCED SERENA + REF SETUP

### A. SERENA API PATTERN DISCOVERY
```typescript
// MANDATORY FIRST - Activate WedSync project context
await mcp__serena__activate_project("wedsync");

// Find existing API patterns and validation
await mcp__serena__search_for_pattern("api route validation zod schema");
await mcp__serena__find_symbol("NextRequest NextResponse validation", "$WS_ROOT/wedsync/src/app/api/");
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/validations/");

// Study existing form and client integration patterns
await mcp__serena__find_referencing_symbols("forms clients database");
```

### B. AI AND VALIDATION DOCUMENTATION LOADING
```typescript
// Load OpenAI and AI integration documentation
// Use Ref MCP to search for:
# - "OpenAI API integration Next.js patterns"
# - "Dynamic form validation Zod schemas"
# - "Form submission security best practices"

// Load wedding industry validation patterns
// Use Ref MCP to search for:
# - "Wedding date validation algorithms"
# - "Guest count estimation formulas"
# - "Venue capacity validation methods"
```

## 🎯 SPECIFIC DELIVERABLES

### ROUND 1 DELIVERABLES (WITH EVIDENCE):
- [ ] **Forms CRUD API Endpoints** (`$WS_ROOT/wedsync/src/app/api/forms/`)
  - Secure form creation, reading, updating, deletion
  - Dynamic field validation with Zod schemas
  - Wedding-specific field type validation
  - Evidence: All CRUD operations work with proper authentication and validation

- [ ] **AI Form Generation API** (`$WS_ROOT/wedsync/src/app/api/ai/generate-form/route.ts`)
  - OpenAI integration for intelligent form creation
  - Vendor-specific form templates and suggestions
  - Wedding industry field recommendations
  - Evidence: AI generates appropriate forms for different vendor types

- [ ] **Form Response Processing System** (`$WS_ROOT/wedsync/src/app/api/forms/[id]/submit/route.ts`)
  - Public endpoint for form submissions
  - Automatic client data mapping and updates
  - Response validation and sanitization
  - Evidence: Form responses properly update client profiles

- [ ] **Wedding Data Mapping Service** (`$WS_ROOT/wedsync/src/lib/services/wedding-data-mapper.ts`)
  - Intelligent mapping from form responses to wedding data
  - Core field recognition and transformation
  - Conflict resolution for existing client data
  - Evidence: Form responses correctly populate all relevant client fields

- [ ] **Form Analytics & Tracking** (`$WS_ROOT/wedsync/src/app/api/forms/[id]/analytics/route.ts`)
  - Form completion rate tracking
  - Response time analytics
  - Field abandonment analysis
  - Evidence: Analytics accurately track form performance metrics

## 🔐 SECURE FORMS API IMPLEMENTATION

### Main Forms CRUD API
```typescript
// File: $WS_ROOT/wedsync/src/app/api/forms/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { withSecureValidation } from '@/lib/api/security';
import { createFormSchema, updateFormSchema } from '@/lib/validations/forms';
import { FormSystemService } from '@/lib/services/form-system-service';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.supplier_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const template_only = searchParams.get('template_only') === 'true';

    const { data: forms, error } = await supabase
      .from('forms')
      .select(`
        id, title, description, is_active, is_template, created_at, updated_at,
        form_responses(count)
      `)
      .eq('supplier_id', session.user.supplier_id)
      .eq('is_template', template_only || false)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({ 
      forms: forms || [],
      total: forms?.length || 0 
    });

  } catch (error) {
    console.error('Forms fetch error:', error);
    return NextResponse.json(
      { error: "Failed to fetch forms" }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.supplier_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const validatedData = await withSecureValidation(request, createFormSchema);
    const formService = new FormSystemService();

    // Validate wedding-specific fields
    const weddingFieldsValid = await formService.validateWeddingFields(validatedData.fields);
    if (!weddingFieldsValid.isValid) {
      return NextResponse.json({
        error: "Invalid wedding fields",
        details: weddingFieldsValid.errors
      }, { status: 400 });
    }

    // Create form with wedding field mappings
    const { data: newForm, error } = await supabase
      .from('forms')
      .insert({
        supplier_id: session.user.supplier_id,
        title: validatedData.title,
        description: validatedData.description,
        fields: validatedData.fields,
        settings: validatedData.settings || {},
        is_template: validatedData.is_template || false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Track form creation analytics
    await formService.trackFormEvent(newForm.id, 'form_created', {
      field_count: validatedData.fields.length,
      wedding_fields: validatedData.fields.filter((f: any) => f.mapping).length
    });

    return NextResponse.json({ 
      form: newForm,
      message: "Form created successfully" 
    }, { status: 201 });

  } catch (error) {
    console.error('Form creation error:', error);
    return NextResponse.json(
      { error: "Failed to create form" }, 
      { status: 500 }
    );
  }
}
```

### AI-Powered Form Generation
```typescript
// File: $WS_ROOT/wedsync/src/app/api/ai/generate-form/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { OpenAI } from 'openai';
import { z } from 'zod';
import { withSecureValidation } from '@/lib/api/security';
import { WeddingFormGenerator } from '@/lib/services/wedding-form-generator';

const generateFormSchema = z.object({
  vendor_type: z.enum(['photographer', 'venue', 'caterer', 'florist', 'coordinator', 'dj', 'videographer']),
  form_purpose: z.enum(['initial_inquiry', 'wedding_details', 'timeline_planning', 'final_details']).optional(),
  include_advanced: z.boolean().default(false),
  client_preferences: z.record(z.any()).optional()
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.supplier_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const validatedData = await withSecureValidation(request, generateFormSchema);
    const formGenerator = new WeddingFormGenerator();

    // Generate AI-powered form based on vendor type
    const prompt = formGenerator.buildWeddingFormPrompt(
      validatedData.vendor_type,
      validatedData.form_purpose || 'wedding_details',
      validatedData.include_advanced
    );

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert wedding industry form designer. Create comprehensive, professional forms for wedding vendors that collect essential information from couples. Focus on practical, actionable questions that help vendors deliver exceptional service.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const aiResponse = completion.choices[0].message.content;
    if (!aiResponse) {
      throw new Error('No AI response received');
    }

    // Parse AI response and convert to form fields
    const generatedForm = await formGenerator.parseAIResponse(
      aiResponse, 
      validatedData.vendor_type
    );

    // Add wedding-specific field mappings
    const formWithMappings = await formGenerator.addWeddingFieldMappings(
      generatedForm.fields
    );

    // Track AI generation usage
    await supabase.from('ai_usage_tracking').insert({
      supplier_id: session.user.supplier_id,
      feature: 'form_generation',
      vendor_type: validatedData.vendor_type,
      tokens_used: completion.usage?.total_tokens || 0,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      title: generatedForm.title,
      description: generatedForm.description,
      fields: formWithMappings,
      ai_suggestions: generatedForm.suggestions,
      vendor_type: validatedData.vendor_type
    });

  } catch (error) {
    console.error('AI form generation error:', error);
    return NextResponse.json(
      { error: "Failed to generate form. Please try again." }, 
      { status: 500 }
    );
  }
}
```

### Public Form Submission Endpoint
```typescript
// File: $WS_ROOT/wedsync/src/app/api/forms/[id]/submit/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ratelimit } from '@/lib/rate-limit';
import { WeddingDataMapper } from '@/lib/services/wedding-data-mapper';
import { FormResponseProcessor } from '@/lib/services/form-response-processor';
import { z } from 'zod';

const submitFormSchema = z.object({
  responses: z.record(z.any()),
  client_email: z.string().email().optional(),
  honeypot: z.string().max(0).optional(), // Anti-spam honeypot
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting for public endpoint
    const identifier = request.ip ?? 'anonymous';
    const { success } = await ratelimit.limit(identifier);
    
    if (!success) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later." }, 
        { status: 429 }
      );
    }

    // Validate request data
    const body = await request.json();
    const validatedData = submitFormSchema.parse(body);

    // Check honeypot (anti-spam)
    if (validatedData.honeypot) {
      console.log('Spam submission detected:', request.ip);
      return NextResponse.json({ message: "Thank you for your submission" });
    }

    // Get form configuration
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select(`
        id, supplier_id, title, fields, settings, is_active,
        user_profiles!inner(id, business_name)
      `)
      .eq('id', params.id)
      .eq('is_active', true)
      .single();

    if (formError || !form) {
      return NextResponse.json(
        { error: "Form not found or inactive" }, 
        { status: 404 }
      );
    }

    // Process and validate form responses
    const responseProcessor = new FormResponseProcessor();
    const processedResponses = await responseProcessor.processResponses(
      validatedData.responses,
      form.fields
    );

    if (!processedResponses.isValid) {
      return NextResponse.json({
        error: "Invalid form data",
        details: processedResponses.errors
      }, { status: 400 });
    }

    // Store form response
    const { data: formResponse, error: responseError } = await supabase
      .from('form_responses')
      .insert({
        form_id: params.id,
        client_id: null, // Will be linked later if client exists
        responses: processedResponses.data,
        submitted_at: new Date().toISOString(),
        ip_address: request.ip,
        user_agent: request.headers.get('user-agent')
      })
      .select()
      .single();

    if (responseError) throw responseError;

    // Map responses to wedding data and update/create client
    const dataMapper = new WeddingDataMapper();
    const clientData = await dataMapper.mapFormResponseToClient(
      processedResponses.data,
      form.supplier_id,
      validatedData.client_email
    );

    if (clientData.success) {
      // Link response to client
      await supabase
        .from('form_responses')
        .update({ client_id: clientData.client_id })
        .eq('id', formResponse.id);

      // Track form completion analytics
      await supabase.from('form_analytics').insert({
        form_id: params.id,
        metric_type: 'submission_completed',
        metric_value: 1,
        date_recorded: new Date().toISOString().split('T')[0],
        metadata: {
          response_id: formResponse.id,
          client_id: clientData.client_id,
          fields_completed: Object.keys(processedResponses.data).length
        }
      });
    }

    // Send confirmation email to couple (if configured)
    if (form.settings?.send_confirmation && validatedData.client_email) {
      await responseProcessor.sendConfirmationEmail(
        validatedData.client_email,
        form.title,
        form.user_profiles.business_name
      );
    }

    // Send notification to supplier
    await responseProcessor.notifySupplier(
      form.supplier_id,
      form.title,
      processedResponses.data
    );

    return NextResponse.json({
      message: "Thank you for your submission!",
      confirmation_id: formResponse.id,
      next_steps: form.settings?.thank_you_message || 
        `We've received your information and will be in touch soon!`
    });

  } catch (error) {
    console.error('Form submission error:', error);
    return NextResponse.json(
      { error: "Failed to submit form" }, 
      { status: 500 }
    );
  }
}

// GET endpoint for form preview/display
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: form, error } = await supabase
      .from('forms')
      .select(`
        id, title, description, fields, settings,
        user_profiles!inner(business_name, avatar_url)
      `)
      .eq('id', params.id)
      .eq('is_active', true)
      .single();

    if (error || !form) {
      return NextResponse.json(
        { error: "Form not found" }, 
        { status: 404 }
      );
    }

    // Track form view analytics
    await supabase.from('form_analytics').insert({
      form_id: params.id,
      metric_type: 'form_viewed',
      metric_value: 1,
      date_recorded: new Date().toISOString().split('T')[0],
      metadata: {
        user_agent: request.headers.get('user-agent'),
        referrer: request.headers.get('referer')
      }
    });

    return NextResponse.json({
      form: {
        id: form.id,
        title: form.title,
        description: form.description,
        fields: form.fields,
        business_name: form.user_profiles.business_name,
        settings: form.settings
      }
    });

  } catch (error) {
    console.error('Form fetch error:', error);
    return NextResponse.json(
      { error: "Failed to load form" }, 
      { status: 500 }
    );
  }
}
```

### Wedding Data Mapping Service
```typescript
// File: $WS_ROOT/wedsync/src/lib/services/wedding-data-mapper.ts

export class WeddingDataMapper {
  private readonly CORE_FIELD_MAPPINGS = {
    wedding_date: 'wedding_date',
    venue_address: 'venue_address',
    venue_name: 'venue_name',
    guest_count: 'estimated_guest_count',
    budget: 'budget_total',
    client_email: 'email',
    client_phone: 'phone',
    bride_name: 'bride_name',
    groom_name: 'groom_name',
    partner_1_name: 'partner_1_name',
    partner_2_name: 'partner_2_name',
    ceremony_time: 'ceremony_start_time',
    reception_time: 'reception_start_time',
    photography_style: 'photography_preferences',
    dietary_restrictions: 'dietary_requirements',
    special_requests: 'special_requirements'
  };

  async mapFormResponseToClient(
    responses: Record<string, any>,
    supplierId: string,
    clientEmail?: string
  ): Promise<{ success: boolean; client_id?: string; errors?: string[] }> {
    try {
      const mappedData = this.extractCoreWeddingData(responses);
      
      // Validate critical wedding data
      const validation = this.validateWeddingData(mappedData);
      if (!validation.isValid) {
        return { success: false, errors: validation.errors };
      }

      // Find existing client or create new one
      const clientResult = await this.findOrCreateClient(
        supplierId,
        clientEmail,
        mappedData
      );

      if (!clientResult.success) {
        return clientResult;
      }

      // Update client with form response data
      const updateResult = await this.updateClientWithFormData(
        clientResult.client_id!,
        mappedData,
        responses
      );

      return updateResult;

    } catch (error) {
      console.error('Wedding data mapping error:', error);
      return { success: false, errors: ['Failed to process wedding data'] };
    }
  }

  private extractCoreWeddingData(responses: Record<string, any>): Record<string, any> {
    const coreData: Record<string, any> = {};

    for (const [responseKey, responseValue] of Object.entries(responses)) {
      // Direct mapping for standard fields
      if (this.CORE_FIELD_MAPPINGS[responseKey]) {
        coreData[this.CORE_FIELD_MAPPINGS[responseKey]] = responseValue;
      }

      // Pattern matching for flexible field names
      if (responseKey.toLowerCase().includes('wedding') && responseKey.toLowerCase().includes('date')) {
        coreData.wedding_date = this.parseWeddingDate(responseValue);
      }

      if (responseKey.toLowerCase().includes('venue')) {
        if (responseKey.toLowerCase().includes('address')) {
          coreData.venue_address = responseValue;
        } else {
          coreData.venue_name = responseValue;
        }
      }

      if (responseKey.toLowerCase().includes('guest')) {
        coreData.estimated_guest_count = this.parseGuestCount(responseValue);
      }

      if (responseKey.toLowerCase().includes('budget')) {
        coreData.budget_total = this.parseBudget(responseValue);
      }
    }

    // Smart name extraction for couples
    this.extractCoupleNames(responses, coreData);

    return coreData;
  }

  private validateWeddingData(data: Record<string, any>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Wedding date validation
    if (data.wedding_date) {
      const weddingDate = new Date(data.wedding_date);
      const today = new Date();
      
      if (weddingDate < today) {
        errors.push('Wedding date cannot be in the past');
      }
      
      if (weddingDate.getFullYear() > today.getFullYear() + 5) {
        errors.push('Wedding date seems too far in the future');
      }
    }

    // Guest count validation
    if (data.estimated_guest_count) {
      const guestCount = Number(data.estimated_guest_count);
      if (guestCount < 1 || guestCount > 1000) {
        errors.push('Guest count must be between 1 and 1000');
      }
    }

    // Budget validation
    if (data.budget_total) {
      const budget = Number(data.budget_total);
      if (budget < 0 || budget > 1000000) {
        errors.push('Budget must be between $0 and $1,000,000');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  private async findOrCreateClient(
    supplierId: string,
    email: string | undefined,
    mappedData: Record<string, any>
  ): Promise<{ success: boolean; client_id?: string; errors?: string[] }> {
    try {
      let existingClient = null;

      // Try to find existing client by email
      if (email) {
        const { data: emailClient } = await supabase
          .from('clients')
          .select('id')
          .eq('supplier_id', supplierId)
          .eq('email', email)
          .single();
        
        existingClient = emailClient;
      }

      // Try to find by wedding date and venue if no email match
      if (!existingClient && mappedData.wedding_date && mappedData.venue_name) {
        const { data: venueClient } = await supabase
          .from('clients')
          .select('id')
          .eq('supplier_id', supplierId)
          .eq('wedding_date', mappedData.wedding_date)
          .ilike('venue_name', `%${mappedData.venue_name}%`)
          .single();
        
        existingClient = venueClient;
      }

      if (existingClient) {
        return { success: true, client_id: existingClient.id };
      }

      // Create new client
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert({
          supplier_id: supplierId,
          name: this.generateClientName(mappedData),
          email: email || null,
          wedding_date: mappedData.wedding_date || null,
          venue_name: mappedData.venue_name || null,
          estimated_guest_count: mappedData.estimated_guest_count || null,
          status: 'inquiry',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;

      return { success: true, client_id: newClient.id };

    } catch (error) {
      console.error('Client find/create error:', error);
      return { success: false, errors: ['Failed to process client information'] };
    }
  }

  private async updateClientWithFormData(
    clientId: string,
    coreData: Record<string, any>,
    rawResponses: Record<string, any>
  ): Promise<{ success: boolean; client_id: string; errors?: string[] }> {
    try {
      const updateData = {
        ...coreData,
        form_responses: rawResponses,
        updated_at: new Date().toISOString(),
        last_form_submission: new Date().toISOString()
      };

      const { error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId);

      if (error) throw error;

      return { success: true, client_id: clientId };

    } catch (error) {
      console.error('Client update error:', error);
      return { success: false, errors: ['Failed to update client information'] };
    }
  }

  private parseWeddingDate(dateValue: any): string | null {
    if (!dateValue) return null;
    
    try {
      const date = new Date(dateValue);
      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    } catch {
      return null;
    }
  }

  private parseGuestCount(guestValue: any): number | null {
    if (!guestValue) return null;
    
    const count = Number(String(guestValue).replace(/\D/g, ''));
    return isNaN(count) ? null : count;
  }

  private parseBudget(budgetValue: any): number | null {
    if (!budgetValue) return null;
    
    const budget = Number(String(budgetValue).replace(/[^0-9.]/g, ''));
    return isNaN(budget) ? null : budget;
  }

  private extractCoupleNames(responses: Record<string, any>, coreData: Record<string, any>): void {
    const nameFields = Object.keys(responses).filter(key => 
      key.toLowerCase().includes('name') || 
      key.toLowerCase().includes('bride') || 
      key.toLowerCase().includes('groom') ||
      key.toLowerCase().includes('partner')
    );

    nameFields.forEach(field => {
      const value = responses[field];
      if (typeof value === 'string' && value.trim()) {
        if (field.toLowerCase().includes('bride')) {
          coreData.bride_name = value;
        } else if (field.toLowerCase().includes('groom')) {
          coreData.groom_name = value;
        } else if (field.toLowerCase().includes('partner')) {
          if (!coreData.partner_1_name) {
            coreData.partner_1_name = value;
          } else {
            coreData.partner_2_name = value;
          }
        }
      }
    });
  }

  private generateClientName(data: Record<string, any>): string {
    if (data.bride_name && data.groom_name) {
      return `${data.bride_name} & ${data.groom_name}`;
    }
    
    if (data.partner_1_name && data.partner_2_name) {
      return `${data.partner_1_name} & ${data.partner_2_name}`;
    }
    
    if (data.bride_name) return `${data.bride_name} Wedding`;
    if (data.groom_name) return `${data.groom_name} Wedding`;
    if (data.partner_1_name) return `${data.partner_1_name} Wedding`;
    
    return `New Client - ${new Date().toLocaleDateString()}`;
  }
}
```

## 🧪 REQUIRED TESTING

### Forms API Tests
```typescript
// File: $WS_ROOT/wedsync/src/__tests__/api/forms/forms.test.ts

describe('/api/forms', () => {
  it('should create wedding form with AI generation', async () => {
    const formData = {
      title: 'Photography Wedding Details',
      description: 'Collect essential details for wedding photography',
      fields: [
        {
          id: '1',
          type: 'wedding_date',
          label: 'Wedding Date',
          required: true,
          mapping: 'wedding_date'
        },
        {
          id: '2',
          type: 'venue_address',
          label: 'Venue Location',
          required: true,
          mapping: 'venue_address'
        }
      ]
    };

    const response = await request(app)
      .post('/api/forms')
      .set('Authorization', `Bearer ${validToken}`)
      .send(formData)
      .expect(201);

    expect(response.body.form).toHaveProperty('id');
    expect(response.body.form.fields).toHaveLength(2);
  });

  it('should process form submission and update client', async () => {
    const formId = 'test-form-id';
    const responses = {
      wedding_date: '2025-06-15',
      venue_address: '123 Wedding Venue St, City, State',
      guest_count: '150',
      client_email: 'couple@example.com'
    };

    const response = await request(app)
      .post(`/api/forms/${formId}/submit`)
      .send({ responses })
      .expect(200);

    expect(response.body.message).toContain('Thank you');
    expect(response.body.confirmation_id).toBeDefined();
  });
});
```

## 📊 MANDATORY: UPDATE PROJECT DASHBOARD AFTER COMPLETION

```json
{
  "id": "WS-306-forms-system-section-overview",
  "status": "completed",
  "completion": "100%",
  "completed_date": "2025-01-25",
  "testing_status": "needs-testing",
  "team": "Team B",
  "notes": "Forms API system completed. AI form generation, secure submission processing, wedding data mapping, analytics tracking."
}
```

---

**WedSync Forms API - Intelligent, Secure, Wedding-Optimized! 🤖🔒📋**