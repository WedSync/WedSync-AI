# TEAM B PROMPT: Backend/API Development for WS-308 Customer Journey Section Overview

## 🎯 YOUR MISSION: Build Journey Execution Engine & Workflow API

You are **Team B** - the **Backend/API Development team**. Your mission is to create a robust journey execution engine that processes automated wedding workflows, manages client progression through multi-step journeys, and provides real-time journey analytics and monitoring.

**You are NOT a human. You are an AI system with:**
- Complete autonomy to make technical decisions
- Access to the full codebase via MCP tools
- Ability to generate production-ready backend code
- Responsibility to work in parallel with other teams
- Authority to create, modify, and deploy API endpoints

## 🏆 SUCCESS METRICS (Non-Negotiable)
- [ ] **Journey Engine**: Process 1000+ concurrent journey executions without performance degradation
- [ ] **Real-time Execution**: Journey steps execute within 5 seconds of trigger conditions
- [ ] **Reliability**: 99.9% uptime for journey processing with automatic error recovery
- [ ] **Wedding Context**: Handle date-based triggers, form submissions, and payment events
- [ ] **Scalability**: Support complex journeys with 50+ nodes and multiple conditional branches
- [ ] **Analytics**: Real-time journey performance and client progression tracking
- [ ] **Integration**: Seamless connection with email, forms, and CRM systems

## 📋 EVIDENCE OF REALITY REQUIREMENTS

### 🔍 MANDATORY PRE-WORK: Verify File Existence
Before starting ANY development, PROVE these files exist by reading them:

1. **Read Main Tech Specification**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/INBOX/dev-manager/WS-308-customer-journey-section-overview-technical.md`

2. **Read Frontend Implementation** (for API contract understanding):
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/OUTBOX/WS JOBS/WS-308 Customer Journey Section Overview/WS-308-team-a.md`

3. **Check Existing Journey Engine**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/journey-engine/`

4. **Verify Database Schema**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/supabase/migrations/`

5. **Read Style Requirements**:
   `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/.claude/UNIFIED-STYLE-GUIDE.md`

**🚨 STOP IMMEDIATELY if any file is missing. Report missing files and wait for resolution.**

## 🧠 SEQUENTIAL THINKING FOR JOURNEY ENGINE ARCHITECTURE

### Backend-Specific Sequential Thinking Patterns

#### Pattern 1: Journey Execution Engine Design
```typescript
// Before building journey execution system
mcp__sequential-thinking__sequential_thinking({
  thought: "Journey execution requirements: Process trigger events (client added, form submitted, date-based), evaluate conditional logic for branching workflows, execute actions (send emails, create forms, update client status), handle delays and scheduling, manage journey state across multiple clients, provide real-time progress tracking.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding-specific execution logic: Date-based triggers calculated from wedding dates, form submission triggers linked to specific wedding forms, payment status integration for conditional flows, vendor coordination triggers for multi-vendor weddings, timeline-based automation for pre/post wedding activities.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Scalability and performance considerations: Journey engine must handle 1000+ concurrent executions, queue-based processing for reliable execution, database optimization for journey state queries, caching strategies for frequently accessed journey definitions, background job processing for scheduled actions.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Error handling and reliability: Failed action retry mechanisms with exponential backoff, journey rollback capabilities for critical failures, dead letter queues for unprocessable events, comprehensive logging for debugging journey issues, circuit breakers for external service failures.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Journey analytics and monitoring: Real-time journey execution metrics, client progression tracking through workflow steps, conversion rate analysis for each journey node, performance bottleneck identification, business intelligence for journey optimization.",
  nextThoughtNeeded: true,
  thoughtNumber: 5,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API architecture: RESTful endpoints for journey CRUD operations, WebSocket connections for real-time journey updates, webhook system for external trigger integration, GraphQL queries for complex analytics, rate limiting and authentication for all journey operations.",
  nextThoughtNeeded: false,
  thoughtNumber: 6,
  totalThoughts: 6
});
```

#### Pattern 2: Wedding Date-Based Trigger System
```typescript
// Analyzing wedding date automation complexity
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding date trigger scenarios: 30 days before wedding (timeline collection), 14 days before (final headcount), 7 days before (vendor confirmation), 1 day before (day-of checklist), day after wedding (thank you email), 1 week after (review request), 1 month after (referral program).",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Date calculation complexity: Handle timezone differences for destination weddings, account for weekends and holidays in business day calculations, manage date changes when couples reschedule, support both relative (days before) and absolute date triggers, seasonal adjustments for vendor availability.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Trigger scheduling architecture: Daily cron jobs to evaluate date-based conditions, efficient database queries to find eligible journey instances, batch processing for multiple clients with same trigger date, priority queuing for time-sensitive wedding communications.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding season optimization: Handle peak wedding season load (May-October), manage increased trigger volume during popular wedding months, optimize for weekend wedding clusters, pre-calculate triggers during setup to reduce runtime processing.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 📚 ENHANCED SERENA + REF SETUP (Backend Focus)

### A. SERENA BACKEND ANALYSIS
```typescript
// Activate WedSync project context
await mcp__serena__activate_project("WedSync2");

// Find existing backend patterns and APIs
await mcp__serena__find_symbol("journey engine workflow automation", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/app/api/");
await mcp__serena__search_for_pattern("background job queue processing");

// Analyze journey system architecture
await mcp__serena__find_referencing_symbols("journey execution trigger");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/journey-engine/", 1, -1);
```

### B. BACKEND DOCUMENTATION RESEARCH
```typescript
# Use Ref MCP to search for current patterns:
# - "Next.js 15 API routes server actions queue"
# - "Supabase realtime database triggers"
# - "Node.js workflow engine architecture patterns"
# - "Background job processing Redis Bull queue"
# - "Webhook system design best practices"
# - "Wedding automation workflow backend patterns"
```

## 🎯 CORE BACKEND DELIVERABLES

### 1. JOURNEY EXECUTION ENGINE

#### A. Core Journey Engine
```typescript
// File: /wedsync/src/lib/journey-engine/core-engine.ts
import { createClient } from '@/lib/supabase/server';
import { EventEmitter } from 'events';
import { Redis } from 'ioredis';

export interface JourneyTriggerEvent {
  id: string;
  client_id: string;
  journey_id: string;
  trigger_type: 'client_added' | 'form_submitted' | 'date_based' | 'payment_received' | 'manual';
  trigger_data: any;
  wedding_id?: string;
  wedding_date?: string;
  timestamp: Date;
}

export interface JourneyNode {
  id: string;
  type: 'trigger' | 'email' | 'form' | 'delay' | 'condition' | 'action';
  config: Record<string, any>;
  connections: string[];
  position: { x: number; y: number };
}

export interface JourneyDefinition {
  id: string;
  name: string;
  description: string;
  supplier_id: string;
  trigger_event: string;
  nodes: JourneyNode[];
  edges: Array<{ source: string; target: string; condition?: string }>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface JourneyInstance {
  id: string;
  journey_id: string;
  client_id: string;
  current_step: string;
  status: 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';
  step_data: Record<string, any>;
  execution_log: JourneyExecutionLog[];
  started_at: Date;
  updated_at: Date;
  wedding_date?: Date;
  context: Record<string, any>;
}

export interface JourneyExecutionLog {
  step_id: string;
  action: string;
  status: 'success' | 'failed' | 'skipped';
  timestamp: Date;
  duration_ms: number;
  error_message?: string;
  execution_data?: any;
}

export class JourneyExecutionEngine extends EventEmitter {
  private supabase = createClient();
  private redis: Redis;
  private isProcessing = false;
  private processingQueue: JourneyTriggerEvent[] = [];

  constructor() {
    super();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.setupEventHandlers();
  }

  /**
   * Start the journey engine
   */
  async start(): Promise<void> {
    console.log('Starting Journey Execution Engine...');
    
    // Setup Redis subscribers for triggers
    await this.redis.subscribe('journey_triggers');
    this.redis.on('message', this.handleTriggerMessage.bind(this));
    
    // Start processing loop
    this.startProcessingLoop();
    
    // Setup scheduled job for date-based triggers
    this.setupScheduledTriggers();
    
    this.emit('engine_started');
    console.log('Journey Execution Engine started successfully');
  }

  /**
   * Process a journey trigger event
   */
  async processTrigger(event: JourneyTriggerEvent): Promise<void> {
    try {
      console.log(`Processing trigger event: ${event.id}`);
      
      // Find matching journeys for this trigger
      const matchingJourneys = await this.findMatchingJourneys(event);
      
      for (const journey of matchingJourneys) {
        await this.startJourneyInstance(journey, event);
      }
      
    } catch (error) {
      console.error('Error processing trigger:', error);
      this.emit('trigger_error', event, error);
    }
  }

  /**
   * Find journeys that should be triggered by this event
   */
  private async findMatchingJourneys(event: JourneyTriggerEvent): Promise<JourneyDefinition[]> {
    const { data: journeys, error } = await this.supabase
      .from('journeys')
      .select('*')
      .eq('is_active', true)
      .eq('trigger_event', event.trigger_type);

    if (error) {
      throw new Error(`Failed to find matching journeys: ${error.message}`);
    }

    // Additional filtering based on trigger conditions
    return journeys.filter(journey => this.evaluateTriggerConditions(journey, event));
  }

  /**
   * Evaluate if journey conditions match the trigger event
   */
  private evaluateTriggerConditions(journey: JourneyDefinition, event: JourneyTriggerEvent): boolean {
    // For wedding-specific logic
    if (event.trigger_type === 'date_based') {
      const triggerNode = journey.nodes.find(n => n.type === 'trigger');
      if (!triggerNode || !event.wedding_date) return false;
      
      const daysBeforeWedding = triggerNode.config.days_before || 0;
      const weddingDate = new Date(event.wedding_date);
      const triggerDate = new Date();
      triggerDate.setDate(triggerDate.getDate() + daysBeforeWedding);
      
      return Math.abs(weddingDate.getTime() - triggerDate.getTime()) < 24 * 60 * 60 * 1000; // Within 1 day
    }
    
    // Form submission conditions
    if (event.trigger_type === 'form_submitted') {
      const triggerNode = journey.nodes.find(n => n.type === 'trigger');
      if (!triggerNode) return false;
      
      const requiredFormType = triggerNode.config.form_type;
      return !requiredFormType || event.trigger_data.form_type === requiredFormType;
    }
    
    return true;
  }

  /**
   * Start a new journey instance for a client
   */
  private async startJourneyInstance(
    journey: JourneyDefinition, 
    triggerEvent: JourneyTriggerEvent
  ): Promise<JourneyInstance> {
    
    // Check if journey instance already exists for this client
    const { data: existingInstance } = await this.supabase
      .from('journey_instances')
      .select('id, status')
      .eq('journey_id', journey.id)
      .eq('client_id', triggerEvent.client_id)
      .eq('status', 'active')
      .single();

    if (existingInstance) {
      console.log(`Journey instance already active for client ${triggerEvent.client_id}`);
      return existingInstance as JourneyInstance;
    }

    // Find the trigger node (starting point)
    const triggerNode = journey.nodes.find(node => node.type === 'trigger');
    if (!triggerNode) {
      throw new Error(`No trigger node found in journey ${journey.id}`);
    }

    // Create new journey instance
    const journeyInstance: Partial<JourneyInstance> = {
      journey_id: journey.id,
      client_id: triggerEvent.client_id,
      current_step: triggerNode.id,
      status: 'active',
      step_data: {},
      execution_log: [],
      started_at: new Date(),
      updated_at: new Date(),
      wedding_date: triggerEvent.wedding_date ? new Date(triggerEvent.wedding_date) : undefined,
      context: {
        trigger_event: triggerEvent,
        journey_definition: journey,
      },
    };

    const { data: createdInstance, error } = await this.supabase
      .from('journey_instances')
      .insert(journeyInstance)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create journey instance: ${error.message}`);
    }

    const instance = createdInstance as JourneyInstance;
    
    // Start executing the journey
    await this.executeNextStep(instance, journey);
    
    this.emit('journey_started', instance);
    return instance;
  }

  /**
   * Execute the next step in a journey
   */
  private async executeNextStep(
    instance: JourneyInstance, 
    journey: JourneyDefinition
  ): Promise<void> {
    try {
      const currentNode = journey.nodes.find(n => n.id === instance.current_step);
      if (!currentNode) {
        await this.completeJourney(instance);
        return;
      }

      console.log(`Executing step ${currentNode.id} (${currentNode.type}) for instance ${instance.id}`);
      
      const startTime = Date.now();
      let executionResult: any = null;
      let nextSteps: string[] = [];

      // Execute based on node type
      switch (currentNode.type) {
        case 'trigger':
          // Trigger nodes are already processed, move to next
          nextSteps = currentNode.connections;
          break;

        case 'email':
          executionResult = await this.executeEmailNode(currentNode, instance);
          nextSteps = currentNode.connections;
          break;

        case 'form':
          executionResult = await this.executeFormNode(currentNode, instance);
          nextSteps = currentNode.connections;
          break;

        case 'delay':
          await this.executeDelayNode(currentNode, instance);
          return; // Delay nodes schedule future execution

        case 'condition':
          const conditionResult = await this.executeConditionNode(currentNode, instance);
          nextSteps = this.getConditionalNextSteps(currentNode, conditionResult, journey);
          break;

        case 'action':
          executionResult = await this.executeActionNode(currentNode, instance);
          nextSteps = currentNode.connections;
          break;

        default:
          throw new Error(`Unknown node type: ${currentNode.type}`);
      }

      const duration = Date.now() - startTime;

      // Log execution
      const logEntry: JourneyExecutionLog = {
        step_id: currentNode.id,
        action: currentNode.type,
        status: 'success',
        timestamp: new Date(),
        duration_ms: duration,
        execution_data: executionResult,
      };

      // Update instance
      await this.updateJourneyInstance(instance.id, {
        current_step: nextSteps[0] || null,
        step_data: {
          ...instance.step_data,
          [currentNode.id]: executionResult,
        },
        execution_log: [...(instance.execution_log || []), logEntry],
        updated_at: new Date(),
      });

      // Continue with next steps
      if (nextSteps.length > 0) {
        const updatedInstance = await this.getJourneyInstance(instance.id);
        if (updatedInstance) {
          await this.executeNextStep(updatedInstance, journey);
        }
      } else {
        await this.completeJourney(instance);
      }

    } catch (error) {
      await this.handleExecutionError(instance, error as Error);
    }
  }

  /**
   * Execute email node
   */
  private async executeEmailNode(node: JourneyNode, instance: JourneyInstance): Promise<any> {
    const { template, subject, personalizations } = node.config;
    
    // Get client details
    const { data: client } = await this.supabase
      .from('clients')
      .select('*')
      .eq('id', instance.client_id)
      .single();

    if (!client) {
      throw new Error(`Client not found: ${instance.client_id}`);
    }

    // Send email via email service
    const emailService = await import('@/lib/services/email-service');
    const result = await emailService.sendTemplateEmail({
      to: client.email,
      template,
      subject,
      data: {
        client_name: client.name,
        wedding_date: instance.wedding_date,
        ...personalizations,
        ...instance.context,
      },
    });

    return {
      email_id: result.email_id,
      sent_at: new Date(),
      recipient: client.email,
    };
  }

  /**
   * Execute form node
   */
  private async executeFormNode(node: JourneyNode, instance: JourneyInstance): Promise<any> {
    const { form_template, title, description } = node.config;
    
    // Create form instance for client
    const formService = await import('@/lib/services/form-service');
    const formInstance = await formService.createFormInstance({
      client_id: instance.client_id,
      template: form_template,
      title,
      description,
      context: instance.context,
    });

    // Send form link to client via email
    const emailService = await import('@/lib/services/email-service');
    await emailService.sendTemplateEmail({
      to: instance.context.client_email,
      template: 'form_request',
      data: {
        form_title: title,
        form_url: `${process.env.NEXT_PUBLIC_APP_URL}/forms/${formInstance.id}`,
        client_name: instance.context.client_name,
      },
    });

    return {
      form_id: formInstance.id,
      form_url: formInstance.url,
      sent_at: new Date(),
    };
  }

  /**
   * Execute delay node
   */
  private async executeDelayNode(node: JourneyNode, instance: JourneyInstance): Promise<void> {
    const { delay_type, duration, until_date } = node.config;
    let scheduleTime: Date;

    if (delay_type === 'until_date' && until_date) {
      scheduleTime = new Date(until_date);
    } else {
      scheduleTime = new Date();
      switch (delay_type) {
        case 'minutes':
          scheduleTime.setMinutes(scheduleTime.getMinutes() + duration);
          break;
        case 'hours':
          scheduleTime.setHours(scheduleTime.getHours() + duration);
          break;
        case 'days':
          scheduleTime.setDate(scheduleTime.getDate() + duration);
          break;
        case 'weeks':
          scheduleTime.setDate(scheduleTime.getDate() + (duration * 7));
          break;
        default:
          throw new Error(`Invalid delay type: ${delay_type}`);
      }
    }

    // Schedule delayed execution
    await this.scheduleDelayedExecution(instance.id, scheduleTime);
    
    // Update instance status
    await this.updateJourneyInstance(instance.id, {
      status: 'active', // Keep as active but waiting
      step_data: {
        ...instance.step_data,
        [node.id]: {
          scheduled_for: scheduleTime,
          delay_type,
          duration,
        },
      },
    });
  }

  /**
   * Execute condition node
   */
  private async executeConditionNode(node: JourneyNode, instance: JourneyInstance): Promise<boolean> {
    const { condition_type, condition_config } = node.config;
    
    switch (condition_type) {
      case 'form_response':
        const formData = instance.step_data[condition_config.form_step_id];
        return this.evaluateFormCondition(formData, condition_config);
        
      case 'client_property':
        const { data: client } = await this.supabase
          .from('clients')
          .select('*')
          .eq('id', instance.client_id)
          .single();
        return this.evaluateClientPropertyCondition(client, condition_config);
        
      case 'wedding_date':
        return this.evaluateWeddingDateCondition(instance.wedding_date, condition_config);
        
      default:
        throw new Error(`Unknown condition type: ${condition_type}`);
    }
  }

  /**
   * Execute action node
   */
  private async executeActionNode(node: JourneyNode, instance: JourneyInstance): Promise<any> {
    const { action_type, action_config } = node.config;
    
    switch (action_type) {
      case 'update_client_status':
        await this.supabase
          .from('clients')
          .update({ status: action_config.new_status })
          .eq('id', instance.client_id);
        return { updated_status: action_config.new_status };
        
      case 'create_task':
        const taskService = await import('@/lib/services/task-service');
        const task = await taskService.createTask({
          client_id: instance.client_id,
          title: action_config.title,
          description: action_config.description,
          due_date: action_config.due_date,
        });
        return { task_id: task.id };
        
      case 'webhook':
        const webhookService = await import('@/lib/services/webhook-service');
        const result = await webhookService.sendWebhook({
          url: action_config.webhook_url,
          method: action_config.method || 'POST',
          data: {
            client_id: instance.client_id,
            journey_id: instance.journey_id,
            ...action_config.data,
            ...instance.context,
          },
        });
        return { webhook_response: result };
        
      default:
        throw new Error(`Unknown action type: ${action_type}`);
    }
  }

  // Helper methods
  private async handleTriggerMessage(channel: string, message: string): Promise<void> {
    if (channel === 'journey_triggers') {
      const event: JourneyTriggerEvent = JSON.parse(message);
      this.processingQueue.push(event);
    }
  }

  private startProcessingLoop(): void {
    setInterval(async () => {
      if (!this.isProcessing && this.processingQueue.length > 0) {
        this.isProcessing = true;
        const event = this.processingQueue.shift();
        if (event) {
          await this.processTrigger(event);
        }
        this.isProcessing = false;
      }
    }, 1000); // Process every second
  }

  private setupScheduledTriggers(): void {
    // Run every hour to check for date-based triggers
    setInterval(async () => {
      await this.processDateBasedTriggers();
    }, 60 * 60 * 1000);
  }

  private async processDateBasedTriggers(): Promise<void> {
    // Implementation for processing date-based triggers
    console.log('Processing date-based triggers...');
    // This would query for weddings with approaching dates and trigger appropriate journeys
  }

  private async setupEventHandlers(): void {
    this.on('journey_started', (instance: JourneyInstance) => {
      console.log(`Journey started: ${instance.id}`);
    });

    this.on('journey_completed', (instance: JourneyInstance) => {
      console.log(`Journey completed: ${instance.id}`);
    });

    this.on('journey_error', (instance: JourneyInstance, error: Error) => {
      console.error(`Journey error: ${instance.id}`, error);
    });
  }

  // Additional helper methods would be implemented here...
  private async getJourneyInstance(id: string): Promise<JourneyInstance | null> { return null; }
  private async updateJourneyInstance(id: string, updates: Partial<JourneyInstance>): Promise<void> { }
  private async completeJourney(instance: JourneyInstance): Promise<void> { }
  private async handleExecutionError(instance: JourneyInstance, error: Error): Promise<void> { }
  private async scheduleDelayedExecution(instanceId: string, scheduleTime: Date): Promise<void> { }
  private getConditionalNextSteps(node: JourneyNode, conditionResult: boolean, journey: JourneyDefinition): string[] { return []; }
  private evaluateFormCondition(formData: any, config: any): boolean { return true; }
  private evaluateClientPropertyCondition(client: any, config: any): boolean { return true; }
  private evaluateWeddingDateCondition(weddingDate: Date | undefined, config: any): boolean { return true; }
}

// Export singleton instance
export const journeyEngine = new JourneyExecutionEngine();
```

#### B. Journey API Endpoints
```typescript
// File: /wedsync/src/app/api/journeys/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

const CreateJourneySchema = z.object({
  name: z.string().min(1, 'Journey name is required'),
  description: z.string().optional(),
  trigger_event: z.enum(['client_added', 'form_submitted', 'date_based', 'payment_received']),
  journey_data: z.object({
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
  }).optional(),
});

const UpdateJourneySchema = CreateJourneySchema.partial();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build query
    let query = supabase
      .from('journeys')
      .select(`
        *,
        journey_instances!inner(
          id,
          status,
          created_at
        )
      `)
      .eq('supplier_id', user.id);

    if (status && status !== 'all') {
      if (status === 'active') {
        query = query.eq('is_active', true);
      } else if (status === 'draft') {
        query = query.eq('is_active', false);
      }
    }

    const { data: journeys, error } = await query
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Journeys fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch journeys' }, { status: 500 });
    }

    // Calculate journey statistics
    const journeysWithStats = journeys.map(journey => {
      const instances = journey.journey_instances || [];
      const activeInstances = instances.filter(i => i.status === 'active');
      const completedInstances = instances.filter(i => i.status === 'completed');
      const totalInstances = instances.length;
      
      return {
        ...journey,
        stats: {
          active_clients: activeInstances.length,
          total_executions: totalInstances,
          completion_rate: totalInstances > 0 
            ? Math.round((completedInstances.length / totalInstances) * 100)
            : 0,
        },
        journey_instances: undefined, // Remove from response for cleaner data
      };
    });

    return NextResponse.json({ journeys: journeysWithStats });

  } catch (error) {
    console.error('Journeys API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = CreateJourneySchema.parse(body);

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create journey
    const { data: journey, error } = await supabase
      .from('journeys')
      .insert({
        ...validatedData,
        supplier_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Journey creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create journey' },
        { status: 500 }
      );
    }

    return NextResponse.json({ journey }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Journey creation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### C. Journey Trigger System
```typescript
// File: /wedsync/src/app/api/journeys/trigger/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { journeyEngine } from '@/lib/journey-engine/core-engine';
import type { JourneyTriggerEvent } from '@/lib/journey-engine/core-engine';

const TriggerEventSchema = z.object({
  client_id: z.string().uuid(),
  trigger_type: z.enum(['client_added', 'form_submitted', 'date_based', 'payment_received', 'manual']),
  trigger_data: z.record(z.any()).optional().default({}),
  wedding_id: z.string().uuid().optional(),
  wedding_date: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = TriggerEventSchema.parse(body);

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify client belongs to authenticated user
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, supplier_id')
      .eq('id', validatedData.client_id)
      .single();

    if (clientError || !client || client.supplier_id !== user.id) {
      return NextResponse.json({ error: 'Client not found or unauthorized' }, { status: 404 });
    }

    // Create trigger event
    const triggerEvent: JourneyTriggerEvent = {
      id: `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      client_id: validatedData.client_id,
      journey_id: '', // Will be determined by matching logic
      trigger_type: validatedData.trigger_type,
      trigger_data: validatedData.trigger_data,
      wedding_id: validatedData.wedding_id,
      wedding_date: validatedData.wedding_date,
      timestamp: new Date(),
    };

    // Process trigger through journey engine
    await journeyEngine.processTrigger(triggerEvent);

    // Log trigger event
    await supabase
      .from('journey_trigger_logs')
      .insert({
        client_id: triggerEvent.client_id,
        trigger_type: triggerEvent.trigger_type,
        trigger_data: triggerEvent.trigger_data,
        processed_at: new Date(),
      });

    return NextResponse.json({ 
      success: true, 
      trigger_id: triggerEvent.id,
      message: 'Journey trigger processed successfully' 
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Journey trigger API error:', error);
    return NextResponse.json(
      { error: 'Failed to process journey trigger' },
      { status: 500 }
    );
  }
}

// GET endpoint for trigger history
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const client_id = searchParams.get('client_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabase
      .from('journey_trigger_logs')
      .select(`
        *,
        clients!inner(
          id,
          name,
          email
        )
      `)
      .eq('clients.supplier_id', user.id)
      .order('processed_at', { ascending: false })
      .limit(limit);

    if (client_id) {
      query = query.eq('client_id', client_id);
    }

    const { data: triggers, error } = await query;

    if (error) {
      console.error('Trigger history fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch trigger history' }, { status: 500 });
    }

    return NextResponse.json({ triggers });

  } catch (error) {
    console.error('Trigger history API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2. JOURNEY ANALYTICS & MONITORING

#### A. Analytics Service
```typescript
// File: /wedsync/src/lib/services/journey-analytics-service.ts
import { createClient } from '@/lib/supabase/server';

export interface JourneyAnalytics {
  journey_id: string;
  journey_name: string;
  total_instances: number;
  active_instances: number;
  completed_instances: number;
  failed_instances: number;
  completion_rate: number;
  average_duration_hours: number;
  step_analytics: StepAnalytics[];
  conversion_funnel: ConversionStep[];
  performance_trends: PerformanceTrend[];
}

export interface StepAnalytics {
  step_id: string;
  step_type: string;
  step_name: string;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  average_duration_ms: number;
  success_rate: number;
}

export interface ConversionStep {
  step_name: string;
  entered: number;
  completed: number;
  conversion_rate: number;
  drop_off_rate: number;
}

export interface PerformanceTrend {
  date: string;
  instances_started: number;
  instances_completed: number;
  average_completion_time_hours: number;
}

export class JourneyAnalyticsService {
  private supabase = createClient();

  /**
   * Get comprehensive analytics for a journey
   */
  async getJourneyAnalytics(journeyId: string, dateRange?: { from: Date; to: Date }): Promise<JourneyAnalytics> {
    // Base query for journey instances
    let instancesQuery = this.supabase
      .from('journey_instances')
      .select(`
        *,
        journeys!inner(
          id,
          name
        )
      `)
      .eq('journey_id', journeyId);

    // Apply date filter if provided
    if (dateRange) {
      instancesQuery = instancesQuery
        .gte('started_at', dateRange.from.toISOString())
        .lte('started_at', dateRange.to.toISOString());
    }

    const { data: instances, error } = await instancesQuery;
    
    if (error) {
      throw new Error(`Failed to fetch journey instances: ${error.message}`);
    }

    if (!instances || instances.length === 0) {
      return this.getEmptyAnalytics(journeyId);
    }

    const journey = instances[0].journeys;
    
    // Calculate basic metrics
    const totalInstances = instances.length;
    const activeInstances = instances.filter(i => i.status === 'active').length;
    const completedInstances = instances.filter(i => i.status === 'completed').length;
    const failedInstances = instances.filter(i => i.status === 'failed').length;
    const completionRate = totalInstances > 0 ? (completedInstances / totalInstances) * 100 : 0;

    // Calculate average duration
    const completedInstancesWithDuration = instances
      .filter(i => i.status === 'completed' && i.completed_at)
      .map(i => ({
        duration: new Date(i.completed_at).getTime() - new Date(i.started_at).getTime()
      }));

    const averageDurationHours = completedInstancesWithDuration.length > 0
      ? completedInstancesWithDuration.reduce((sum, i) => sum + i.duration, 0) / completedInstancesWithDuration.length / (1000 * 60 * 60)
      : 0;

    // Generate step analytics
    const stepAnalytics = await this.generateStepAnalytics(instances);

    // Generate conversion funnel
    const conversionFunnel = await this.generateConversionFunnel(journeyId, instances);

    // Generate performance trends
    const performanceTrends = await this.generatePerformanceTrends(journeyId, dateRange);

    return {
      journey_id: journeyId,
      journey_name: journey.name,
      total_instances: totalInstances,
      active_instances: activeInstances,
      completed_instances: completedInstances,
      failed_instances: failedInstances,
      completion_rate: Math.round(completionRate * 100) / 100,
      average_duration_hours: Math.round(averageDurationHours * 100) / 100,
      step_analytics: stepAnalytics,
      conversion_funnel: conversionFunnel,
      performance_trends: performanceTrends,
    };
  }

  /**
   * Generate step-level analytics
   */
  private async generateStepAnalytics(instances: any[]): Promise<StepAnalytics[]> {
    const stepStats = new Map<string, {
      step_id: string;
      step_type: string;
      step_name: string;
      executions: number;
      successes: number;
      failures: number;
      total_duration: number;
    }>();

    // Process execution logs
    instances.forEach(instance => {
      if (instance.execution_log) {
        instance.execution_log.forEach((log: any) => {
          if (!stepStats.has(log.step_id)) {
            stepStats.set(log.step_id, {
              step_id: log.step_id,
              step_type: log.action,
              step_name: log.action.charAt(0).toUpperCase() + log.action.slice(1),
              executions: 0,
              successes: 0,
              failures: 0,
              total_duration: 0,
            });
          }

          const stats = stepStats.get(log.step_id)!;
          stats.executions++;
          stats.total_duration += log.duration_ms || 0;
          
          if (log.status === 'success') {
            stats.successes++;
          } else if (log.status === 'failed') {
            stats.failures++;
          }
        });
      }
    });

    // Convert to analytics format
    return Array.from(stepStats.values()).map(stats => ({
      step_id: stats.step_id,
      step_type: stats.step_type,
      step_name: stats.step_name,
      total_executions: stats.executions,
      successful_executions: stats.successes,
      failed_executions: stats.failures,
      average_duration_ms: stats.executions > 0 ? stats.total_duration / stats.executions : 0,
      success_rate: stats.executions > 0 ? (stats.successes / stats.executions) * 100 : 0,
    }));
  }

  /**
   * Generate conversion funnel data
   */
  private async generateConversionFunnel(journeyId: string, instances: any[]): Promise<ConversionStep[]> {
    // Get journey definition to understand step flow
    const { data: journey } = await this.supabase
      .from('journeys')
      .select('journey_data')
      .eq('id', journeyId)
      .single();

    if (!journey?.journey_data?.nodes) {
      return [];
    }

    const nodes = journey.journey_data.nodes;
    const funnel: ConversionStep[] = [];

    // Calculate conversion rates for each step
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const stepName = node.data?.title || node.type;
      
      const entered = instances.filter(instance => {
        return instance.execution_log?.some((log: any) => log.step_id === node.id);
      }).length;

      const completed = instances.filter(instance => {
        return instance.execution_log?.some((log: any) => 
          log.step_id === node.id && log.status === 'success'
        );
      }).length;

      const conversionRate = entered > 0 ? (completed / entered) * 100 : 0;
      const dropOffRate = entered > 0 ? ((entered - completed) / entered) * 100 : 0;

      funnel.push({
        step_name: stepName,
        entered,
        completed,
        conversion_rate: Math.round(conversionRate * 100) / 100,
        drop_off_rate: Math.round(dropOffRate * 100) / 100,
      });
    }

    return funnel;
  }

  /**
   * Generate performance trends over time
   */
  private async generatePerformanceTrends(
    journeyId: string, 
    dateRange?: { from: Date; to: Date }
  ): Promise<PerformanceTrend[]> {
    
    const trends: PerformanceTrend[] = [];
    
    // Default to last 30 days if no range provided
    const endDate = dateRange?.to || new Date();
    const startDate = dateRange?.from || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Generate daily trends
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Query instances for this day
      const { data: dayInstances } = await this.supabase
        .from('journey_instances')
        .select('*')
        .eq('journey_id', journeyId)
        .gte('started_at', dayStart.toISOString())
        .lte('started_at', dayEnd.toISOString());

      const instancesStarted = dayInstances?.length || 0;
      const instancesCompleted = dayInstances?.filter(i => i.status === 'completed').length || 0;

      // Calculate average completion time for completed instances
      const completedWithDuration = dayInstances?.filter(i => 
        i.status === 'completed' && i.completed_at
      ).map(i => 
        (new Date(i.completed_at).getTime() - new Date(i.started_at).getTime()) / (1000 * 60 * 60)
      ) || [];

      const averageCompletionTime = completedWithDuration.length > 0
        ? completedWithDuration.reduce((sum, duration) => sum + duration, 0) / completedWithDuration.length
        : 0;

      trends.push({
        date: currentDate.toISOString().split('T')[0],
        instances_started: instancesStarted,
        instances_completed: instancesCompleted,
        average_completion_time_hours: Math.round(averageCompletionTime * 100) / 100,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return trends;
  }

  /**
   * Get empty analytics structure
   */
  private async getEmptyAnalytics(journeyId: string): Promise<JourneyAnalytics> {
    const { data: journey } = await this.supabase
      .from('journeys')
      .select('name')
      .eq('id', journeyId)
      .single();

    return {
      journey_id: journeyId,
      journey_name: journey?.name || 'Unknown Journey',
      total_instances: 0,
      active_instances: 0,
      completed_instances: 0,
      failed_instances: 0,
      completion_rate: 0,
      average_duration_hours: 0,
      step_analytics: [],
      conversion_funnel: [],
      performance_trends: [],
    };
  }

  /**
   * Get analytics for multiple journeys (dashboard overview)
   */
  async getJourneyOverview(supplierId: string): Promise<{
    total_journeys: number;
    active_journeys: number;
    total_clients_in_journeys: number;
    overall_completion_rate: number;
    top_performing_journeys: Array<{
      id: string;
      name: string;
      completion_rate: number;
      active_clients: number;
    }>;
  }> {
    // Implementation for dashboard overview analytics
    const { data: journeys } = await this.supabase
      .from('journeys')
      .select(`
        *,
        journey_instances(
          id,
          status,
          completed_at,
          started_at
        )
      `)
      .eq('supplier_id', supplierId);

    if (!journeys) {
      return {
        total_journeys: 0,
        active_journeys: 0,
        total_clients_in_journeys: 0,
        overall_completion_rate: 0,
        top_performing_journeys: [],
      };
    }

    const totalJourneys = journeys.length;
    const activeJourneys = journeys.filter(j => j.is_active).length;
    const allInstances = journeys.flatMap(j => j.journey_instances || []);
    const totalClientsInJourneys = new Set(allInstances.map(i => i.client_id)).size;
    const completedInstances = allInstances.filter(i => i.status === 'completed');
    const overallCompletionRate = allInstances.length > 0 
      ? (completedInstances.length / allInstances.length) * 100 
      : 0;

    // Calculate top performing journeys
    const topPerforming = journeys
      .map(journey => {
        const instances = journey.journey_instances || [];
        const completed = instances.filter(i => i.status === 'completed');
        const active = instances.filter(i => i.status === 'active');
        const completionRate = instances.length > 0 ? (completed.length / instances.length) * 100 : 0;

        return {
          id: journey.id,
          name: journey.name,
          completion_rate: Math.round(completionRate * 100) / 100,
          active_clients: active.length,
        };
      })
      .sort((a, b) => b.completion_rate - a.completion_rate)
      .slice(0, 5);

    return {
      total_journeys: totalJourneys,
      active_journeys: activeJourneys,
      total_clients_in_journeys: totalClientsInJourneys,
      overall_completion_rate: Math.round(overallCompletionRate * 100) / 100,
      top_performing_journeys: topPerforming,
    };
  }
}

export const journeyAnalyticsService = new JourneyAnalyticsService();
```

## 🔒 SECURITY & RELIABILITY REQUIREMENTS

### 1. API Security Checklist
- [ ] **Authentication**: All journey endpoints require valid user authentication
- [ ] **Authorization**: Users can only access their own journeys and client data
- [ ] **Input Validation**: All journey configurations validated with Zod schemas
- [ ] **Rate Limiting**: Journey creation and execution protected against abuse
- [ ] **SQL Injection Prevention**: Parameterized queries for all database operations
- [ ] **XSS Prevention**: Journey data sanitized before storage and execution
- [ ] **CSRF Protection**: State-changing operations require valid tokens
- [ ] **Audit Logging**: All journey modifications and executions logged
- [ ] **Error Handling**: No sensitive information exposed in error responses
- [ ] **Data Encryption**: Journey configurations encrypted at rest

### 2. Reliability & Performance
- [ ] **High Availability**: 99.9% uptime for journey processing
- [ ] **Scalability**: Handle 1000+ concurrent journey executions
- [ ] **Error Recovery**: Automatic retry with exponential backoff for failed operations
- [ ] **Circuit Breakers**: Protection against external service failures
- [ ] **Dead Letter Queues**: Handle unprocessable events gracefully
- [ ] **Database Optimization**: Proper indexing for journey queries
- [ ] **Memory Management**: Efficient processing of large journey definitions
- [ ] **Background Processing**: Non-blocking execution for time-consuming operations
- [ ] **Monitoring**: Comprehensive metrics and alerting for journey health
- [ ] **Backup Strategy**: Regular backups of journey definitions and execution logs

## 🎯 TYPICAL BACKEND DELIVERABLES WITH EVIDENCE

### Core Journey Engine
- [ ] **Journey Execution Engine** (Evidence: Processes 1000+ concurrent journeys)
- [ ] **Trigger System** (Show: Handles all trigger types with <5s response)
- [ ] **Journey APIs** (Test: Complete CRUD operations for journey management)
- [ ] **Analytics Service** (Metrics: Real-time performance and conversion tracking)
- [ ] **Database Schema** (Schema: Optimized tables for journey execution)
- [ ] **Background Processing** (Verify: Reliable queue-based execution)

### Wedding-Specific Logic
- [ ] **Date-Based Triggers** (Evidence: Accurate wedding date calculations)
- [ ] **Wedding Context** (Show: Maintains wedding-specific data throughout execution)
- [ ] **Vendor Integration** (Test: CRM and communication system integration)
- [ ] **Journey Templates** (API: Support for pre-built wedding workflows)
- [ ] **Client Progression** (Track: Real-time client movement through journeys)
- [ ] **Wedding Analytics** (Metrics: Wedding-specific performance insights)

## 🚨 CRITICAL SUCCESS CRITERIA

Before marking this task complete, VERIFY:

### Engine Performance
1. **Execution Speed**: Journey steps execute within 5 seconds of trigger conditions
2. **Concurrent Processing**: Handle 1000+ simultaneous journey executions
3. **Memory Efficiency**: Optimized memory usage for complex journey definitions
4. **Database Performance**: All journey queries complete in <100ms
5. **Background Jobs**: Reliable processing of scheduled and delayed actions

### Wedding Industry Integration
6. **Date-Based Logic**: Accurate calculation of wedding-related triggers
7. **Wedding Context**: Preserve wedding information throughout journey execution
8. **Vendor Coordination**: Support multi-vendor wedding workflow scenarios
9. **Form Integration**: Seamless connection with wedding-specific forms
10. **Email Automation**: Reliable wedding communication delivery

### System Reliability
11. **Error Recovery**: Failed operations automatically retry with exponential backoff
12. **Data Consistency**: Journey state maintained correctly across all operations
13. **Audit Trail**: Complete logging of all journey executions and modifications
14. **Security Compliance**: All endpoints pass security audit requirements
15. **Monitoring**: Real-time health monitoring and alerting for journey system

**🎯 REMEMBER**: You're building the engine that will automate thousands of hours of manual work for wedding vendors. Every wedding is unique and irreplaceable - the journey engine must be 100% reliable because a missed email or failed trigger could impact someone's most important day.

**Wedding Context**: A wedding photographer currently spends 4+ hours per wedding manually tracking where each couple is in their process and sending appropriate communications. Your journey engine reduces this to minutes while ensuring no couple ever misses a critical deadline or milestone in their wedding planning journey.