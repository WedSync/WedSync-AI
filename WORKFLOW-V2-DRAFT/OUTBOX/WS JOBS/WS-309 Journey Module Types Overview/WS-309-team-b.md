# WS-309: Journey Module Types Overview - Team B Backend Prompt

## COMPREHENSIVE TEAM B PROMPT
### Backend Development for WedSync Journey Module Types System

---

## 🎯 DEVELOPMENT MANAGER DIRECTIVE

**Project**: WedSync Enterprise Wedding Platform  
**Feature**: WS-309 - Journey Module Types Overview  
**Team**: B (Backend Development & Services)  
**Sprint**: Journey Module Types Backend Services  
**Priority**: P0 (Core services for modular journey execution)

**Context**: You are Team B, responsible for building the backend services that power WedSync's journey module types system. You must create robust APIs and services that handle 7 different module types (email, SMS, forms, meetings, info, reviews, referrals), each with specialized execution logic optimized for wedding vendor workflows.

---

## 📋 EVIDENCE OF REALITY REQUIREMENTS

### MANDATORY FILE VERIFICATION (Non-Negotiable)
Before proceeding, you MUST verify these files exist and read their contents:

```typescript
// CRITICAL: These files must exist before you begin development
const requiredFiles = [
  '/WORKFLOW-V2-DRAFT/INBOX/dev-manager/WS-309-journey-module-types-overview-technical.md',
  '/wedsync/src/components/journeys/modules/ModuleTypeRegistry.tsx', // From Team A
  '/wedsync/src/lib/services/journey-execution-engine.ts',   // From WS-308 Team B
  '/wedsync/src/lib/integrations/journey-integration-orchestrator.ts', // From WS-308 Team C
  '/wedsync/src/lib/services/journey-module-service.ts',     // Your foundation service
  '/wedsync/src/app/api/journeys/module-types/route.ts'     // Your API routes
];

// VERIFY: Each file must be read and understood before coding
requiredFiles.forEach(file => {
  if (!fileExists(file)) {
    throw new Error(`EVIDENCE FAILURE: Required file ${file} does not exist. Cannot create backend services without understanding existing architecture.`);
  }
});
```

### ARCHITECTURAL CONTEXT VERIFICATION
You must understand the complete journey module system architecture:

1. **Module UI** (Team A): Configuration interfaces requiring backend validation
2. **Module Services** (Team B): Core execution and validation logic
3. **Module Integrations** (Team C): External service connections
4. **Module Infrastructure** (Team D): Platform services and monitoring  
5. **Module Quality** (Team E): Testing and validation

---

## 🧠 SEQUENTIAL THINKING INTEGRATION

### MANDATORY: Use Sequential Thinking MCP for Service Architecture

For every major backend architecture decision, you MUST use the Sequential Thinking MCP to analyze service requirements:

```typescript
// REQUIRED: Before implementing any module service
await mcp__sequential_thinking__sequential_thinking({
  thought: "I need to design the backend services for WedSync's journey module types system. This system must handle 7 different module types, each with unique execution requirements. Let me analyze the architecture: 1) Module Type Registry Service - Manage available module types and their schemas, 2) Module Validation Service - Validate configurations against module schemas, 3) Module Execution Engine - Execute specific module types with proper error handling, 4) Module Configuration API - RESTful endpoints for module management, 5) Wedding-Specific Logic - Handle wedding date calculations and vendor-specific workflows, 6) Integration Layer - Connect modules to email, SMS, form, and other services.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 10
});

// Continue analysis through all service considerations
```

### WEDDING INDUSTRY SERVICE ANALYSIS
```typescript
await mcp__sequential_thinking__sequential_thinking({
  thought: "Wedding industry backend services have unique requirements: 1) Reliability First - Wedding dates cannot be moved if modules fail, need robust error handling, 2) Time-Sensitive Execution - Modules tied to wedding dates need precise scheduling, 3) Vendor Diversity - Different wedding vendors (photographers, venues, planners) need different module configurations, 4) Seasonal Scaling - Wedding season creates 5x load, services must handle spikes, 5) Data Sensitivity - Wedding data is highly personal, need strict access control, 6) Integration Complexity - Must integrate with various CRM/email/calendar systems used by wedding vendors.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 10
});
```

---

## 🎨 WEDSYNC BACKEND STACK INTEGRATION

### REQUIRED SERVICE ARCHITECTURE
All module services must follow WedSync backend patterns:

```typescript
// MANDATORY: Use these exact service patterns
import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database';
import { withAuth } from '@/lib/auth/middleware';
import { logger } from '@/lib/utils/logger';
import { rateLimit } from '@/lib/utils/rate-limit';

// Wedding industry service integration
import { EmailService } from '@/lib/services/email-service';
import { SMSService } from '@/lib/services/sms-service';
import { FormService } from '@/lib/services/form-service';
import { CalendarService } from '@/lib/services/calendar-service';
```

### DATABASE INTEGRATION REQUIREMENTS
- **Row Level Security**: All module data must be isolated per supplier
- **JSONB Configuration**: Use PostgreSQL JSONB for flexible module configs
- **Audit Logging**: Track all module executions for debugging
- **Performance**: Optimize queries for wedding season load spikes

---

## 🔧 SERENA MCP INTEGRATION REQUIREMENTS

### MANDATORY SETUP PROTOCOL
```bash
# REQUIRED: Before any backend development work
serena activate_project WedSync2
serena get_symbols_overview src/lib/services/journey-module-service.ts
serena find_symbol "JourneyModuleService"
serena write_memory "WS-309-team-b-module-services" "Backend services for journey module types with wedding industry optimizations"
```

### SEMANTIC CODE REQUIREMENTS
All backend code must be written using Serena MCP for consistency:

```typescript
// Use Serena for intelligent service generation
serena replace_symbol_body "JourneyModuleService" "
class JourneyModuleService {
  async getAvailableModules(): Promise<ModuleTypeCategory[]> {
    // Load module types with wedding industry optimizations
  }
  
  async executeModule(moduleType: string, config: any, context: ExecutionContext): Promise<ExecutionResult> {
    // Wedding-specific module execution logic
  }
}
";

// Maintain service consistency across all modules
```

---

## 🔐 SECURITY REQUIREMENTS CHECKLIST

### BACKEND SECURITY COMPLIANCE
```typescript
interface ModuleServiceSecurityChecklist {
  apiSecurity: {
    // ✅ All module APIs must implement these
    authentication_required: boolean;        // Required: JWT authentication
    rate_limiting: boolean;                  // Required: Prevent abuse
    input_validation: boolean;               // Required: Validate all inputs
    sql_injection_prevention: boolean;       // Required: Parameterized queries
    xss_prevention: boolean;                 // Required: Sanitize outputs
  };
  
  dataProtection: {
    row_level_security: boolean;             // Required: RLS on all tables
    pii_encryption: boolean;                 // Required: Encrypt client data
    audit_logging: boolean;                  // Required: Log all operations
    gdpr_compliance: boolean;                // Required: Data deletion/export
  };
  
  moduleExecution: {
    sandboxed_execution: boolean;            // Required: Isolate module execution
    timeout_protection: boolean;             // Required: Prevent infinite loops
    error_boundary: boolean;                 // Required: Graceful error handling
    resource_limits: boolean;                // Required: Prevent resource abuse
  };
}
```

---

## 🎯 TEAM B SPECIALIZATION: BACKEND SERVICE EXCELLENCE

### PRIMARY RESPONSIBILITIES
You are the **Backend Development team** responsible for:

1. **Module Type Registry Service**
   - Module type definitions and schemas
   - Configuration validation
   - Module capability queries
   - Wedding-optimized templates

2. **Module Execution Engine** 
   - Type-specific execution logic
   - Error handling and retry logic
   - Performance monitoring
   - Integration orchestration

3. **Module Configuration APIs**
   - RESTful module management
   - Real-time validation
   - Preview generation
   - Configuration persistence

4. **Wedding-Specific Services**
   - Wedding date calculations
   - Vendor workflow optimization
   - Seasonal load handling
   - Critical path prioritization

---

## 📊 CORE DELIVERABLES

### 1. JOURNEY MODULE SERVICE
```typescript
// FILE: /src/lib/services/journey-module-service.ts
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

interface ModuleTypeDefinition {
  id: string;
  display_name: string;
  description: string;
  category: string;
  icon: string;
  config_schema: Record<string, ConfigField>;
  is_active: boolean;
}

interface ModuleTypeCategory {
  name: string;
  label: string;
  modules: ModuleTypeDefinition[];
}

interface ExecutionContext {
  client_id: string;
  journey_instance_id: string;
  step_data: Record<string, any>;
  client_data: Record<string, any>;
  supplier_id: string;
  wedding_date?: string;
}

interface ExecutionResult {
  success: boolean;
  result_data: Record<string, any>;
  next_step?: string;
  error_message?: string;
  retry_count?: number;
  execution_time_ms: number;
}

export class JourneyModuleService {
  private emailService: EmailService;
  private smsService: SMSService;
  private formService: FormService;
  private calendarService: CalendarService;

  constructor() {
    this.emailService = new EmailService();
    this.smsService = new SMSService();
    this.formService = new FormService();
    this.calendarService = new CalendarService();
  }

  async getAvailableModules(supplierId: string): Promise<ModuleTypeCategory[]> {
    try {
      // Get module types from database
      const { data: moduleTypes, error } = await supabase
        .from('journey_module_types')
        .select('*')
        .eq('is_active', true)
        .order('display_name');

      if (error) throw error;

      // Get supplier's tier to filter available modules
      const { data: supplier } = await supabase
        .from('user_profiles')
        .select('subscription_tier')
        .eq('id', supplierId)
        .single();

      const filteredModules = this.filterModulesByTier(moduleTypes, supplier?.subscription_tier);

      // Group by category
      const categories = this.groupModulesByCategory(filteredModules);

      logger.info(`Loaded ${filteredModules.length} modules for supplier ${supplierId}`);
      return categories;

    } catch (error) {
      logger.error('Failed to get available modules:', error);
      throw new Error('Failed to load module types');
    }
  }

  async validateModuleConfig(moduleType: string, config: any): Promise<ValidationResult> {
    try {
      // Get module schema
      const { data: moduleTypeDef, error } = await supabase
        .from('journey_module_types')
        .select('config_schema')
        .eq('id', moduleType)
        .single();

      if (error || !moduleTypeDef) {
        throw new Error(`Module type ${moduleType} not found`);
      }

      // Validate against schema
      const validation = this.validateConfigAgainstSchema(config, moduleTypeDef.config_schema);
      
      // Wedding-specific validations
      if (moduleType === 'email') {
        validation.errors.push(...this.validateEmailModuleConfig(config));
      } else if (moduleType === 'form') {
        validation.errors.push(...this.validateFormModuleConfig(config));
      }

      return {
        is_valid: validation.errors.length === 0,
        errors: validation.errors,
        warnings: validation.warnings
      };

    } catch (error) {
      logger.error(`Failed to validate ${moduleType} config:`, error);
      return {
        is_valid: false,
        errors: ['Configuration validation failed'],
        warnings: []
      };
    }
  }

  async executeModule(
    moduleType: string, 
    config: any, 
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      logger.info(`Executing ${moduleType} module for client ${context.client_id}`);

      // Validate configuration before execution
      const validation = await this.validateModuleConfig(moduleType, config);
      if (!validation.is_valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      // Execute based on module type
      let result: ExecutionResult;
      
      switch (moduleType) {
        case 'email':
          result = await this.executeEmailModule(config, context);
          break;
        case 'sms':
          result = await this.executeSMSModule(config, context);
          break;
        case 'form':
          result = await this.executeFormModule(config, context);
          break;
        case 'meeting':
          result = await this.executeMeetingModule(config, context);
          break;
        case 'info':
          result = await this.executeInfoModule(config, context);
          break;
        case 'review':
          result = await this.executeReviewModule(config, context);
          break;
        case 'referral':
          result = await this.executeReferralModule(config, context);
          break;
        default:
          throw new Error(`Unsupported module type: ${moduleType}`);
      }

      result.execution_time_ms = Date.now() - startTime;

      // Log successful execution
      await this.logModuleExecution(moduleType, context, result);

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`Module execution failed:`, {
        moduleType,
        clientId: context.client_id,
        error: error.message,
        executionTime
      });

      const failureResult: ExecutionResult = {
        success: false,
        result_data: {},
        error_message: error.message,
        execution_time_ms: executionTime
      };

      // Log failed execution
      await this.logModuleExecution(moduleType, context, failureResult);

      return failureResult;
    }
  }

  private async executeEmailModule(config: any, context: ExecutionContext): Promise<ExecutionResult> {
    try {
      // Get email template
      const template = await this.emailService.getTemplate(config.template_id);
      if (!template) {
        throw new Error(`Email template ${config.template_id} not found`);
      }

      // Prepare email data with personalization
      const emailData = {
        to: context.client_data.email,
        template_id: config.template_id,
        personalization: this.preparePersonalizationData(config, context),
        subject_override: config.subject_override,
        send_delay: config.send_delay || 0
      };

      // Handle wedding-specific timing
      if (context.wedding_date && config.send_time === 'business_hours') {
        emailData.send_delay = this.calculateBusinessHoursDelay(context.wedding_date);
      }

      // Send email
      const emailResult = await this.emailService.sendJourneyEmail(emailData);

      return {
        success: true,
        result_data: {
          email_sent: true,
          message_id: emailResult.message_id,
          template_used: config.template_id,
          personalization_applied: Object.keys(config.personalization || {}).length > 0
        },
        execution_time_ms: 0 // Will be set by caller
      };

    } catch (error) {
      throw new Error(`Email module execution failed: ${error.message}`);
    }
  }

  private async executeFormModule(config: any, context: ExecutionContext): Promise<ExecutionResult> {
    try {
      // Get form details
      const form = await this.formService.getForm(config.form_id);
      if (!form) {
        throw new Error(`Form ${config.form_id} not found`);
      }

      // Create form invitation for client
      const invitationData = {
        form_id: config.form_id,
        client_id: context.client_id,
        journey_instance_id: context.journey_instance_id,
        deadline: config.deadline ? new Date(config.deadline) : null,
        reminder_enabled: config.reminder_enabled || false,
        reminder_frequency: config.reminder_frequency || 3,
        completion_redirect: config.completion_redirect
      };

      const invitation = await this.formService.createFormInvitation(invitationData);

      // Send form link to client
      if (context.client_data.email) {
        await this.emailService.sendFormInvitation({
          to: context.client_data.email,
          form_name: form.name,
          form_url: invitation.form_url,
          deadline: config.deadline
        });
      }

      return {
        success: true,
        result_data: {
          form_sent: true,
          form_invitation_id: invitation.id,
          form_url: invitation.form_url,
          deadline: config.deadline,
          reminder_scheduled: config.reminder_enabled
        },
        next_step: config.auto_follow_up ? 'form_completion_follow_up' : undefined,
        execution_time_ms: 0
      };

    } catch (error) {
      throw new Error(`Form module execution failed: ${error.message}`);
    }
  }

  private async executeMeetingModule(config: any, context: ExecutionContext): Promise<ExecutionResult> {
    try {
      // Create meeting invitation
      const meetingData = {
        client_id: context.client_id,
        supplier_id: context.supplier_id,
        meeting_type: config.meeting_type,
        duration: config.duration,
        buffer_time: config.buffer_time || 15,
        wedding_date: context.wedding_date
      };

      const schedulingLink = await this.calendarService.createSchedulingLink(meetingData);

      // Send scheduling link to client
      if (context.client_data.email) {
        await this.emailService.sendMeetingInvitation({
          to: context.client_data.email,
          meeting_type: config.meeting_type,
          scheduling_url: schedulingLink.url,
          supplier_name: context.client_data.supplier_name
        });
      }

      return {
        success: true,
        result_data: {
          meeting_scheduled: true,
          scheduling_link_id: schedulingLink.id,
          scheduling_url: schedulingLink.url,
          meeting_type: config.meeting_type,
          duration: config.duration
        },
        execution_time_ms: 0
      };

    } catch (error) {
      throw new Error(`Meeting module execution failed: ${error.message}`);
    }
  }

  private preparePersonalizationData(config: any, context: ExecutionContext): Record<string, string> {
    const personalization: Record<string, string> = {};

    // Apply configured personalization tokens
    if (config.personalization) {
      Object.entries(config.personalization).forEach(([token, template]: [string, any]) => {
        personalization[token] = this.resolvePersonalizationTemplate(template, context);
      });
    }

    // Add default wedding-specific personalization
    personalization['couple_name'] = context.client_data.couple_name || 'Couple';
    personalization['wedding_date'] = context.wedding_date ? 
      new Date(context.wedding_date).toLocaleDateString() : 'TBD';
    
    return personalization;
  }

  private resolvePersonalizationTemplate(template: string, context: ExecutionContext): string {
    return template
      .replace('{{client.couple_name}}', context.client_data.couple_name || 'Couple')
      .replace('{{client.wedding_date}}', context.wedding_date ? 
        new Date(context.wedding_date).toLocaleDateString() : 'TBD')
      .replace('{{client.venue_name}}', context.client_data.venue_name || 'your venue')
      .replace('{{supplier.name}}', context.client_data.supplier_name || 'your vendor');
  }

  private calculateBusinessHoursDelay(weddingDate: string): number {
    const now = new Date();
    const businessStartHour = 9; // 9 AM
    const businessEndHour = 17; // 5 PM

    // If it's currently business hours, no delay
    const currentHour = now.getHours();
    if (currentHour >= businessStartHour && currentHour < businessEndHour && 
        now.getDay() >= 1 && now.getDay() <= 5) {
      return 0;
    }

    // Calculate delay until next business hours
    let nextBusinessDay = new Date(now);
    
    // If weekend, move to Monday
    if (now.getDay() === 0) nextBusinessDay.setDate(now.getDate() + 1); // Sunday -> Monday
    if (now.getDay() === 6) nextBusinessDay.setDate(now.getDate() + 2); // Saturday -> Monday
    
    // Set to business start time
    nextBusinessDay.setHours(businessStartHour, 0, 0, 0);
    
    // If we're already past business hours today, move to tomorrow
    if (currentHour >= businessEndHour) {
      nextBusinessDay.setDate(nextBusinessDay.getDate() + 1);
    }

    return Math.max(0, Math.floor((nextBusinessDay.getTime() - now.getTime()) / 60000)); // minutes
  }

  private async logModuleExecution(
    moduleType: string, 
    context: ExecutionContext, 
    result: ExecutionResult
  ): Promise<void> {
    try {
      await supabase
        .from('journey_step_executions')
        .insert({
          instance_id: context.journey_instance_id,
          step_id: `${moduleType}_${Date.now()}`,
          step_type: moduleType,
          status: result.success ? 'completed' : 'failed',
          result_data: result.result_data,
          error_message: result.error_message,
          executed_at: new Date().toISOString(),
          completed_at: result.success ? new Date().toISOString() : null
        });

      // Update journey metrics
      await this.updateJourneyMetrics(context.journey_instance_id, result);

    } catch (error) {
      logger.error('Failed to log module execution:', error);
    }
  }

  private async updateJourneyMetrics(journeyInstanceId: string, result: ExecutionResult): Promise<void> {
    // Update journey instance with execution metrics
    const { data: instance } = await supabase
      .from('journey_instances')
      .select('step_data')
      .eq('id', journeyInstanceId)
      .single();

    if (instance) {
      const stepData = instance.step_data || {};
      stepData.execution_count = (stepData.execution_count || 0) + 1;
      stepData.success_count = (stepData.success_count || 0) + (result.success ? 1 : 0);
      stepData.total_execution_time = (stepData.total_execution_time || 0) + result.execution_time_ms;

      await supabase
        .from('journey_instances')
        .update({ step_data: stepData })
        .eq('id', journeyInstanceId);
    }
  }

  private filterModulesByTier(modules: ModuleTypeDefinition[], tier: string): ModuleTypeDefinition[] {
    // Filter modules based on subscription tier
    const tierLimits: Record<string, string[]> = {
      free: ['email'],
      starter: ['email', 'form'],
      professional: ['email', 'form', 'sms', 'meeting', 'info'],
      scale: ['email', 'form', 'sms', 'meeting', 'info', 'review'],
      enterprise: ['email', 'form', 'sms', 'meeting', 'info', 'review', 'referral']
    };

    const allowedModules = tierLimits[tier] || tierLimits.free;
    return modules.filter(module => allowedModules.includes(module.id));
  }

  private groupModulesByCategory(modules: ModuleTypeDefinition[]): ModuleTypeCategory[] {
    const categories: Record<string, ModuleTypeCategory> = {};

    modules.forEach(module => {
      if (!categories[module.category]) {
        categories[module.category] = {
          name: module.category,
          label: this.getCategoryLabel(module.category),
          modules: []
        };
      }
      categories[module.category].modules.push(module);
    });

    return Object.values(categories);
  }

  private getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      communication: 'Communication',
      data_collection: 'Data Collection',
      scheduling: 'Scheduling',
      feedback: 'Feedback',
      growth: 'Growth'
    };
    return labels[category] || category;
  }
}
```

### 2. MODULE TYPES API ROUTES
```typescript
// FILE: /src/app/api/journeys/module-types/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { JourneyModuleService } from '@/lib/services/journey-module-service';
import { withAuth } from '@/lib/auth/middleware';
import { rateLimit } from '@/lib/utils/rate-limit';
import { logger } from '@/lib/utils/logger';

const moduleService = new JourneyModuleService();

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, {
      maxRequests: 100,
      windowMs: 60 * 1000 // 1 minute
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    // Get authenticated user
    const supabase = createRouteHandlerClient({ request });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's supplier profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get available modules
    const categories = await moduleService.getAvailableModules(profile.id);

    logger.info(`Module types requested by user ${user.id}`, {
      userId: user.id,
      tier: profile.subscription_tier,
      moduleCount: categories.reduce((sum, cat) => sum + cat.modules.length, 0)
    });

    return NextResponse.json({ categories });

  } catch (error) {
    logger.error('Failed to get module types:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/journeys/module-types/validate
export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(request, {
      maxRequests: 50,
      windowMs: 60 * 1000
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    const supabase = createRouteHandlerClient({ request });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { module_type, config } = body;

    if (!module_type || !config) {
      return NextResponse.json(
        { error: 'module_type and config are required' },
        { status: 400 }
      );
    }

    // Validate module configuration
    const validation = await moduleService.validateModuleConfig(module_type, config);

    logger.info(`Module validation requested`, {
      userId: user.id,
      moduleType: module_type,
      isValid: validation.is_valid
    });

    return NextResponse.json(validation);

  } catch (error) {
    logger.error('Failed to validate module:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 3. MODULE EXECUTION API
```typescript
// FILE: /src/app/api/journeys/[id]/execute-module/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { JourneyModuleService } from '@/lib/services/journey-module-service';
import { z } from 'zod';

const executeModuleSchema = z.object({
  module_type: z.string(),
  config: z.record(z.any()),
  context: z.object({
    client_id: z.string(),
    journey_instance_id: z.string(),
    step_data: z.record(z.any()).optional(),
    client_data: z.record(z.any())
  })
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ request });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = executeModuleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { module_type, config, context } = validation.data;

    // Add supplier_id to context
    context.supplier_id = user.id;

    // Execute module
    const moduleService = new JourneyModuleService();
    const result = await moduleService.executeModule(module_type, config, context);

    return NextResponse.json(result);

  } catch (error) {
    logger.error('Module execution failed:', error);
    return NextResponse.json(
      { error: 'Module execution failed', message: error.message },
      { status: 500 }
    );
  }
}
```

---

## 📊 WEDDING INDUSTRY BACKEND OPTIMIZATIONS

### WEDDING-SPECIFIC SERVICE PATTERNS
```typescript
// Wedding date calculation utilities
export class WeddingDateCalculator {
  static getDaysUntilWedding(weddingDate: string): number {
    const today = new Date();
    const wedding = new Date(weddingDate);
    const diffTime = wedding.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  static isWeddingWeek(weddingDate: string): boolean {
    return this.getDaysUntilWedding(weddingDate) <= 7;
  }

  static getWeddingSeason(): 'peak' | 'mid' | 'low' {
    const month = new Date().getMonth() + 1;
    if (month >= 5 && month <= 9) return 'peak';    // May-Sep
    if (month >= 4 && month <= 10) return 'mid';    // Apr, Oct
    return 'low';                                    // Nov-Mar
  }
}

// Wedding vendor specific module configurations
export const weddingModuleConfigs = {
  photographer: {
    email: {
      popularTemplates: ['booking_confirmation', 'engagement_reminder', 'gallery_delivery'],
      defaultTiming: 'business_hours',
      personalizationTokens: ['couple_name', 'wedding_date', 'venue_name', 'package_type']
    },
    form: {
      popularForms: ['photography_questionnaire', 'timeline_form', 'shot_list'],
      defaultDeadline: '14_days_before',
      reminderFrequency: 3
    }
  },
  
  venue: {
    email: {
      popularTemplates: ['venue_confirmation', 'catering_details', 'final_walkthrough'],
      criticalTiming: ['final_headcount_reminder', 'day_before_confirmation'],
      personalizationTokens: ['couple_name', 'guest_count', 'menu_selection']
    },
    meeting: {
      meetingTypes: ['venue_tour', 'menu_tasting', 'final_walkthrough'],
      bufferTimes: { venue_tour: 30, menu_tasting: 15, final_walkthrough: 15 }
    }
  }
};
```

---

## 🧪 BACKEND TESTING REQUIREMENTS

### SERVICE TESTING FRAMEWORK
```typescript
// FILE: /src/__tests__/services/journey-module-service.test.ts
import { JourneyModuleService } from '@/lib/services/journey-module-service';
import { mockSupabaseClient } from '@/test-utils/supabase-mock';
import { mockExecutionContext, mockEmailConfig } from '@/test-utils/module-mocks';

describe('JourneyModuleService', () => {
  let service: JourneyModuleService;

  beforeEach(() => {
    service = new JourneyModuleService();
    jest.clearAllMocks();
  });

  describe('getAvailableModules', () => {
    it('should return modules filtered by subscription tier', async () => {
      const supplierId = 'supplier-123';
      
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'journey_module_types') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [
                { id: 'email', category: 'communication', display_name: 'Email Module' },
                { id: 'sms', category: 'communication', display_name: 'SMS Module' },
                { id: 'review', category: 'feedback', display_name: 'Review Module' }
              ],
              error: null
            })
          };
        }
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { subscription_tier: 'professional' },
              error: null
            })
          };
        }
      });

      const categories = await service.getAvailableModules(supplierId);
      
      expect(categories).toHaveLength(2); // communication and feedback
      expect(categories[0].modules).toContain(
        expect.objectContaining({ id: 'email' })
      );
      expect(categories[0].modules).toContain(
        expect.objectContaining({ id: 'sms' })
      );
    });
  });

  describe('executeModule', () => {
    it('should execute email module successfully', async () => {
      const context = mockExecutionContext;
      const config = mockEmailConfig;

      const result = await service.executeModule('email', config, context);

      expect(result.success).toBe(true);
      expect(result.result_data.email_sent).toBe(true);
      expect(result.execution_time_ms).toBeGreaterThan(0);
    });

    it('should handle wedding date timing for emails', async () => {
      const weddingContext = {
        ...mockExecutionContext,
        wedding_date: '2024-06-15'
      };
      
      const businessHoursConfig = {
        ...mockEmailConfig,
        send_time: 'business_hours'
      };

      const result = await service.executeModule('email', businessHoursConfig, weddingContext);

      expect(result.success).toBe(true);
      expect(result.result_data.timing_calculated).toBe(true);
    });

    it('should validate configuration before execution', async () => {
      const invalidConfig = {}; // Missing required template_id
      
      const result = await service.executeModule('email', invalidConfig, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error_message).toContain('Invalid configuration');
    });
  });

  describe('wedding-specific functionality', () => {
    it('should prioritize wedding week executions', async () => {
      const weddingWeekContext = {
        ...mockExecutionContext,
        wedding_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
      };

      const result = await service.executeModule('email', mockEmailConfig, weddingWeekContext);

      expect(result.success).toBe(true);
      expect(result.result_data.priority_level).toBe('high');
    });

    it('should handle seasonal load patterns', async () => {
      // Mock peak wedding season
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-06-15').getTime()); // June - peak season

      const result = await service.executeModule('email', mockEmailConfig, mockExecutionContext);

      expect(result.success).toBe(true);
      expect(result.result_data.season).toBe('peak');
    });
  });
});
```

---

## ✅ DEFINITION OF DONE

### BACKEND ACCEPTANCE CRITERIA
- [ ] **Module Service**: Core service handling all 7 module types with proper validation
- [ ] **API Endpoints**: RESTful APIs for module management and execution
- [ ] **Configuration Validation**: Schema-based validation for all module types
- [ ] **Execution Engine**: Robust execution with error handling and retry logic
- [ ] **Wedding Optimization**: Date calculations and vendor-specific workflows
- [ ] **Integration Layer**: Seamless integration with email, SMS, form, and calendar services
- [ ] **Performance**: Sub-500ms API response times for module operations
- [ ] **Security**: Full authentication, authorization, and input validation

### QUALITY GATES
- [ ] **API Documentation**: Complete OpenAPI/Swagger documentation
- [ ] **Error Handling**: Comprehensive error scenarios covered
- [ ] **Logging**: Detailed logging for debugging and monitoring
- [ ] **Testing**: 90%+ test coverage for all service methods
- [ ] **Database**: Optimized queries with proper indexing
- [ ] **Security**: All endpoints secured with proper validation

---

## 🚀 EXECUTION TIMELINE

### BACKEND DEVELOPMENT SPRINT
**Week 1**: Core module service and validation framework
**Week 2**: Email and Form module execution logic
**Week 3**: SMS, Meeting, Info, Review, Referral modules
**Week 4**: API optimization and testing

---

## 📞 TEAM COORDINATION

**Daily Service Reviews**: Share backend progress and API designs
**Integration Planning**: Coordinate with Team C for external service integration
**Database Optimization**: Work with Team D for performance tuning
**Testing Coordination**: Support Team E with comprehensive test scenarios

---

**Backend Excellence: Robust, scalable services for wedding automation! ⚡💍**