# TEAM B - ROUND 1: WS-177 - Audit Logging System - Advanced Logging Engine & API

**Date:** 2025-01-20  
**Feature ID:** WS-177 (Track all work with this ID)
**Priority:** P0 - Compliance Critical
**Mission:** Build high-performance audit logging engine with comprehensive event capture, intelligent routing, and wedding-specific business logic  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding business owner handling sensitive client data
**I want to:** Complete audit trail of who accessed what data when with business context and risk assessment
**So that:** I can prove compliance during audits, investigate security incidents, and protect client privacy with forensic-level detail

**Real Wedding Problem This Solves:**
A wedding business processes data for 500+ couples yearly, each with 200+ guests and 50+ vendors. That's 100,000+ records with constant access by photographers, caterers, venues, and planners. When a guest reports a privacy concern or regulatory authorities conduct an audit, the business must instantly show exactly who accessed their data, when, why, and what business justification existed. This advanced logging engine captures every interaction with wedding-specific business context, risk scoring, and compliance metadata.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- High-performance structured logging system with wedding business context
- Support for multiple log sources and intelligent event classification
- Automatic context injection (user, session, IP, business context)
- Advanced severity classification and risk scoring
- Buffer management and batch processing for high-volume logging
- Integration with existing middleware and API framework
- Compliance-ready audit trails with retention management

**Technology Stack (VERIFIED):**
- Backend: Node.js with structured logging and business rule engine
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Queue: Background job processing for log writes and analysis
- Format: JSON structured logs with wedding-specific metadata
- Performance: Async logging with intelligent batching
- Security: Encryption for sensitive audit data

**Integration Points:**
- All API routes and middleware layers
- Database operations with business context
- Authentication and authorization events
- File access operations and data modifications
- Third-party integrations (payment, communication)

---

## 🧠 SEQUENTIAL THINKING MCP FOR COMPLEX FEATURE ANALYSIS

### When to Use Sequential Thinking

Before diving into coding, use Sequential Thinking MCP when facing:

- **Complex Feature Architecture**: Multi-component systems with intricate dependencies
- **Integration Challenges**: Features that span multiple systems and require coordination  
- **Business Logic Complexity**: Wedding-specific rules that need careful analysis
- **Technical Trade-offs**: Choosing between multiple implementation approaches
- **Debugging Complex Issues**: Root cause analysis for multi-system problems

### Sequential Thinking Patterns for Development Teams

#### Pattern 1: Business Logic Analysis
```typescript
// Before implementing wedding-specific audit logic
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding businesses have unique audit requirements: guest data sensitivity levels, vendor access permissions, task criticality based on wedding proximity, payment operation risk levels. Need to design business rules engine for intelligent audit classification.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Business context analysis: Guest dietary info = high sensitivity, venue contracts = high value, task deadlines = time-critical, payment operations = fraud risk. Each requires different audit severity and retention policies.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});
```

#### Pattern 2: Performance Architecture Analysis  
```typescript
// When designing high-performance logging systems
mcp__sequential-thinking__sequential_thinking({
  thought: "Peak wedding season generates millions of audit events: 1000 concurrent users, 100 vendors per wedding, 500 guests per wedding, 50 tasks per wedding. System must handle 10K+ events/minute without impacting user experience.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Performance strategy: Async logging with non-blocking writes, intelligent batching by severity, background processing for analysis, efficient database schema with proper indexing.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

#### Pattern 3: Compliance Architecture
```typescript
// When implementing regulatory compliance systems
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding businesses operate globally: GDPR for EU guests, CCPA for California residents, PIPEDA for Canadian clients, LGPD for Brazilian weddings. Audit system must support multiple compliance frameworks simultaneously.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Compliance implementation: Automated retention policies per jurisdiction, data subject rights support, cross-border transfer logging, automated compliance reporting with proper legal formatting.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

### Using Sequential Thinking in Your Development Process

1. **Before Documentation Loading**: Use Sequential Thinking to understand the full scope and complexity
2. **During Planning Phase**: Structure your approach to handle all edge cases and integration points  
3. **When Stuck**: Use Sequential Thinking to work through complex problems systematically
4. **For Reviews**: Use Sequential Thinking to verify your implementation covers all requirements

**Remember**: Complex features require systematic thinking. Use Sequential Thinking MCP to ensure thorough analysis before implementation.

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// Load audit logging patterns and business logic
await mcp__filesystem__read_file({ 
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/audit/audit-logger.ts" 
});

await mcp__Ref__ref_search_documentation({ 
  query: "Node.js structured logging Winston Pino performance audit trails" 
});

await mcp__supabase__search_docs({
  graphql_query: `
    query {
      searchDocs(query: "database functions triggers Row Level Security performance", limit: 10) {
        nodes {
          title
          href
          content
        }
      }
    }
  `
});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **api-architect** --audit-apis "Design comprehensive audit logging APIs"
2. **database-mcp-specialist** --audit-schema "Optimize audit database schema and performance"
3. **performance-optimization-expert** --logging-performance "Build high-performance logging system"
4. **security-compliance-officer** --audit-compliance "Implement compliance-ready audit trails"
5. **integration-specialist** --audit-integration "Integrate with all system components"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **CODE PHASE**

#### 1. Advanced Wedding Audit Logger
**File:** `/wedsync/src/lib/audit/advanced-audit-logger.ts`
```typescript
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import crypto from 'crypto';

// Wedding-specific audit schemas
const WeddingGuestAccessSchema = z.object({
  guest_id: z.string().uuid(),
  accessed_fields: z.array(z.string()),
  access_reason: z.string(),
  sensitivity_level: z.enum(['low', 'medium', 'high', 'critical'])
});

const WeddingVendorOperationSchema = z.object({
  vendor_id: z.string().uuid(),
  operation_type: z.string(),
  contract_value: z.number().optional(),
  payment_involved: z.boolean().default(false),
  business_impact: z.enum(['low', 'medium', 'high', 'critical'])
});

const WeddingTaskModificationSchema = z.object({
  task_id: z.string().uuid(),
  modification_type: z.string(),
  days_to_wedding: z.number(),
  task_criticality: z.enum(['low', 'medium', 'high', 'critical']),
  impact_assessment: z.string()
});

export interface AuditContext {
  user_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  wedding_id?: string;
  business_context?: Record<string, any>;
  compliance_flags?: string[];
  request?: Request;
}

export interface AuditEntry {
  action: string;
  resource_type: string;
  resource_id?: string;
  severity: 'info' | 'warning' | 'critical';
  details?: Record<string, any>;
  business_impact?: 'low' | 'medium' | 'high' | 'critical';
  compliance_category?: string;
  retention_period_days?: number;
}

export class AdvancedWeddingAuditLogger {
  private static supabase = createClient();
  private static batchQueue: Array<{
    entry: AuditEntry;
    context: AuditContext;
    timestamp: Date;
  }> = [];
  private static batchTimer: NodeJS.Timeout | null = null;
  private static readonly BATCH_SIZE = 100;
  private static readonly BATCH_TIMEOUT = 5000; // 5 seconds

  // Core logging method with wedding business logic
  static async logAction(entry: AuditEntry, context: AuditContext): Promise<void> {
    try {
      // Enhance entry with wedding-specific business context
      const enhancedEntry = await this.enhanceWithBusinessContext(entry, context);
      
      // Calculate risk score
      const riskScore = this.calculateRiskScore(enhancedEntry, context);
      
      // Determine if immediate logging is required
      const requiresImmediate = enhancedEntry.severity === 'critical' || 
                               riskScore >= 80 ||
                               enhancedEntry.compliance_category === 'regulatory';

      if (requiresImmediate) {
        await this.logImmediate(enhancedEntry, context, riskScore);
      } else {
        this.addToBatch(enhancedEntry, context);
      }

    } catch (error) {
      console.error('Audit logging failed:', error);
      // Fallback logging to ensure audit trail is not lost
      await this.logToFallback(entry, context, error);
    }
  }

  // Wedding-specific guest data access logging
  static async logGuestDataAccess(
    userId: string,
    guestId: string,
    accessedFields: string[],
    accessReason: string,
    context: Partial<AuditContext> = {}
  ): Promise<void> {
    // Validate guest access data
    const guestAccess = WeddingGuestAccessSchema.parse({
      guest_id: guestId,
      accessed_fields: accessedFields,
      access_reason: accessReason,
      sensitivity_level: this.calculateFieldSensitivity(accessedFields)
    });

    // Determine severity based on data sensitivity
    const severity = this.determineSeverityForGuestAccess(guestAccess);
    
    // Calculate retention period based on data type
    const retentionDays = this.calculateRetentionPeriod('guest_data', guestAccess.sensitivity_level);

    await this.logAction({
      action: 'access_guest_data',
      resource_type: 'guest',
      resource_id: guestId,
      severity,
      details: {
        ...guestAccess,
        access_timestamp: new Date().toISOString(),
        business_context: 'guest_data_management',
        privacy_impact: this.assessPrivacyImpact(accessedFields),
        compliance_notes: this.generateComplianceNotes('guest_access', accessedFields)
      },
      business_impact: severity === 'critical' ? 'high' : 'medium',
      compliance_category: 'privacy_protection',
      retention_period_days: retentionDays
    }, {
      ...context,
      user_id: userId,
      compliance_flags: ['gdpr_applicable', 'privacy_sensitive'],
      business_context: {
        data_subject_type: 'wedding_guest',
        data_categories: accessedFields,
        legal_basis: 'legitimate_interest'
      }
    });
  }

  // Wedding-specific vendor operation logging
  static async logVendorOperation(
    userId: string,
    vendorId: string,
    operationType: string,
    operationDetails: Partial<z.infer<typeof WeddingVendorOperationSchema>>,
    context: Partial<AuditContext> = {}
  ): Promise<void> {
    const vendorOp = WeddingVendorOperationSchema.parse({
      vendor_id: vendorId,
      operation_type: operationType,
      ...operationDetails,
      business_impact: this.assessVendorOperationImpact(operationType, operationDetails)
    });

    const severity = this.determineSeverityForVendorOperation(vendorOp);
    const retentionDays = this.calculateRetentionPeriod('vendor_operation', vendorOp.business_impact);

    await this.logAction({
      action: `vendor_${operationType}`,
      resource_type: 'vendor',
      resource_id: vendorId,
      severity,
      details: {
        ...vendorOp,
        operation_timestamp: new Date().toISOString(),
        business_context: 'vendor_management',
        financial_impact: this.assessFinancialImpact(vendorOp),
        contract_implications: this.assessContractImplications(operationType)
      },
      business_impact: vendorOp.business_impact,
      compliance_category: vendorOp.payment_involved ? 'financial_transaction' : 'vendor_management',
      retention_period_days: retentionDays
    }, {
      ...context,
      user_id: userId,
      compliance_flags: vendorOp.payment_involved ? ['pci_applicable', 'financial_data'] : [],
      business_context: {
        vendor_type: 'wedding_service_provider',
        operation_category: operationType,
        financial_threshold: vendorOp.contract_value
      }
    });
  }

  // Wedding-specific task modification logging
  static async logTaskModification(
    userId: string,
    taskId: string,
    modificationType: string,
    modificationDetails: Partial<z.infer<typeof WeddingTaskModificationSchema>>,
    context: Partial<AuditContext> = {}
  ): Promise<void> {
    const taskMod = WeddingTaskModificationSchema.parse({
      task_id: taskId,
      modification_type: modificationType,
      ...modificationDetails,
      task_criticality: this.assessTaskCriticality(modificationDetails.days_to_wedding, modificationType)
    });

    const severity = this.determineSeverityForTaskModification(taskMod);
    const retentionDays = this.calculateRetentionPeriod('task_modification', taskMod.task_criticality);

    await this.logAction({
      action: 'task_deadline_modified',
      resource_type: 'task',
      resource_id: taskId,
      severity,
      details: {
        ...taskMod,
        modification_timestamp: new Date().toISOString(),
        business_context: 'wedding_planning',
        timeline_impact: this.assessTimelineImpact(taskMod),
        stakeholder_notification_required: this.requiresStakeholderNotification(taskMod)
      },
      business_impact: this.mapCriticalityToImpact(taskMod.task_criticality),
      compliance_category: 'operational_change',
      retention_period_days: retentionDays
    }, {
      ...context,
      user_id: userId,
      business_context: {
        wedding_phase: this.determineWeddingPhase(taskMod.days_to_wedding),
        change_type: modificationType,
        urgency_level: taskMod.task_criticality
      }
    });
  }

  // Enhanced business context injection
  private static async enhanceWithBusinessContext(
    entry: AuditEntry, 
    context: AuditContext
  ): Promise<AuditEntry> {
    const enhanced = { ...entry };

    // Add wedding business intelligence
    if (context.wedding_id) {
      const weddingContext = await this.getWeddingBusinessContext(context.wedding_id);
      enhanced.details = {
        ...enhanced.details,
        wedding_context: weddingContext,
        business_phase: this.determineBusinessPhase(weddingContext),
        stakeholder_impact: this.assessStakeholderImpact(entry.resource_type, weddingContext)
      };
    }

    // Add compliance context
    if (context.compliance_flags?.length) {
      enhanced.compliance_category = context.compliance_flags.join(',');
      enhanced.retention_period_days = this.calculateComplianceRetention(context.compliance_flags);
    }

    // Add risk context
    enhanced.details = {
      ...enhanced.details,
      risk_factors: this.identifyRiskFactors(entry, context),
      business_justification: this.generateBusinessJustification(entry, context),
      regulatory_notes: this.generateRegulatoryNotes(entry, context)
    };

    return enhanced;
  }

  // Risk scoring algorithm
  private static calculateRiskScore(entry: AuditEntry, context: AuditContext): number {
    let score = 0;

    // Base severity score
    const severityScores = { info: 10, warning: 40, critical: 80 };
    score += severityScores[entry.severity];

    // Business impact multiplier
    const impactMultipliers = { low: 1, medium: 1.5, high: 2, critical: 3 };
    score *= impactMultipliers[entry.business_impact || 'low'];

    // Resource type risk factors
    const resourceRiskFactors = {
      guest: 20, payment: 30, vendor: 15, task: 10, 
      contract: 25, medical_info: 40, financial: 35
    };
    score += resourceRiskFactors[entry.resource_type as keyof typeof resourceRiskFactors] || 5;

    // Context risk factors
    if (context.compliance_flags?.includes('gdpr_applicable')) score += 15;
    if (context.compliance_flags?.includes('pci_applicable')) score += 20;
    if (context.compliance_flags?.includes('financial_data')) score += 25;

    // Time-based risk factors
    if (context.business_context?.days_to_wedding) {
      const daysToWedding = context.business_context.days_to_wedding as number;
      if (daysToWedding <= 7) score += 20;
      else if (daysToWedding <= 30) score += 10;
    }

    return Math.min(score, 100); // Cap at 100
  }

  // Immediate logging for high-risk events
  private static async logImmediate(
    entry: AuditEntry,
    context: AuditContext,
    riskScore: number
  ): Promise<void> {
    const auditRecord = {
      ...this.buildAuditRecord(entry, context),
      risk_score: riskScore,
      processed_immediately: true,
      integrity_hash: this.generateIntegrityHash(entry, context)
    };

    const { error } = await this.supabase
      .from('audit_logs')
      .insert(auditRecord);

    if (error) {
      console.error('Immediate audit logging failed:', error);
      throw error;
    }

    // Trigger real-time notifications for critical events
    if (entry.severity === 'critical' || riskScore >= 90) {
      await this.triggerSecurityAlert(entry, context, riskScore);
    }
  }

  // Batch processing for optimization
  private static addToBatch(entry: AuditEntry, context: AuditContext): void {
    this.batchQueue.push({
      entry,
      context,
      timestamp: new Date()
    });

    // Process batch if size limit reached
    if (this.batchQueue.length >= this.BATCH_SIZE) {
      this.processBatch();
    }

    // Ensure batch is processed within timeout
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, this.BATCH_TIMEOUT);
    }
  }

  private static async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      const auditRecords = batch.map(item => ({
        ...this.buildAuditRecord(item.entry, item.context),
        created_at: item.timestamp.toISOString(),
        batch_processed: true,
        integrity_hash: this.generateIntegrityHash(item.entry, item.context)
      }));

      const { error } = await this.supabase
        .from('audit_logs')
        .insert(auditRecords);

      if (error) {
        console.error('Batch audit logging failed:', error);
        // Re-queue failed items for retry
        this.batchQueue.unshift(...batch);
      }

    } catch (error) {
      console.error('Batch processing error:', error);
      // Re-queue for retry
      this.batchQueue.unshift(...batch);
    }
  }

  // Utility methods for wedding-specific business logic
  private static calculateFieldSensitivity(fields: string[]): 'low' | 'medium' | 'high' | 'critical' {
    const sensitiveFields = ['medical_info', 'dietary_requirements', 'emergency_contact'];
    const highSensitiveFields = ['social_security', 'passport_number', 'payment_info'];
    
    if (fields.some(field => highSensitiveFields.includes(field))) return 'critical';
    if (fields.some(field => sensitiveFields.includes(field))) return 'high';
    if (fields.length > 5) return 'medium';
    return 'low';
  }

  private static determineSeverityForGuestAccess(
    guestAccess: z.infer<typeof WeddingGuestAccessSchema>
  ): 'info' | 'warning' | 'critical' {
    if (guestAccess.sensitivity_level === 'critical') return 'critical';
    if (guestAccess.sensitivity_level === 'high') return 'warning';
    return 'info';
  }

  private static assessVendorOperationImpact(
    operationType: string,
    details: Partial<z.infer<typeof WeddingVendorOperationSchema>>
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (operationType.includes('payment') || operationType.includes('contract')) {
      if (details.contract_value && details.contract_value > 10000) return 'critical';
      if (details.contract_value && details.contract_value > 5000) return 'high';
      return 'medium';
    }
    return 'low';
  }

  private static assessTaskCriticality(
    daysToWedding?: number,
    modificationType?: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (!daysToWedding) return 'low';
    
    if (daysToWedding <= 7) {
      if (modificationType?.includes('deadline') || modificationType?.includes('cancel')) {
        return 'critical';
      }
      return 'high';
    }
    
    if (daysToWedding <= 30) return 'medium';
    return 'low';
  }

  private static calculateRetentionPeriod(
    dataType: string,
    sensitivity: string
  ): number {
    const retentionPolicies: Record<string, Record<string, number>> = {
      guest_data: { low: 365, medium: 1095, high: 2190, critical: 2555 },
      vendor_operation: { low: 365, medium: 1095, high: 2190, critical: 2555 },
      task_modification: { low: 365, medium: 730, high: 1095, critical: 1095 }
    };

    return retentionPolicies[dataType]?.[sensitivity] || 365;
  }

  // Build standardized audit record
  private static buildAuditRecord(entry: AuditEntry, context: AuditContext) {
    return {
      user_id: context.user_id,
      session_id: context.session_id,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id,
      ip_address: context.ip_address,
      user_agent: context.user_agent,
      severity: entry.severity,
      business_impact: entry.business_impact,
      compliance_category: entry.compliance_category,
      retention_period_days: entry.retention_period_days,
      details: entry.details,
      wedding_id: context.wedding_id,
      business_context: context.business_context,
      compliance_flags: context.compliance_flags
    };
  }

  private static generateIntegrityHash(entry: AuditEntry, context: AuditContext): string {
    const data = JSON.stringify({ entry, context, timestamp: new Date().toISOString() });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Additional utility methods would be implemented here...
  private static async getWeddingBusinessContext(weddingId: string) {
    // Implementation to fetch wedding context
    return {};
  }

  private static determineBusinessPhase(weddingContext: any) {
    // Implementation to determine business phase
    return 'planning';
  }

  private static async triggerSecurityAlert(entry: AuditEntry, context: AuditContext, riskScore: number) {
    // Implementation to trigger security alerts
  }

  private static async logToFallback(entry: AuditEntry, context: AuditContext, error: any) {
    // Implementation for fallback logging
  }

  // ... other utility methods
}
```

#### 2. Audit API Routes
**File:** `/wedsync/src/app/api/audit/advanced/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { AdvancedWeddingAuditLogger } from '@/lib/audit/advanced-audit-logger';
import { withSecureValidation } from '@/lib/api/middleware';
import { z } from 'zod';

const GuestAccessRequestSchema = z.object({
  guestId: z.string().uuid(),
  accessedFields: z.array(z.string()),
  accessReason: z.string().min(10),
  weddingId: z.string().uuid()
});

const VendorOperationRequestSchema = z.object({
  vendorId: z.string().uuid(),
  operationType: z.string(),
  contractValue: z.number().optional(),
  paymentInvolved: z.boolean().default(false),
  weddingId: z.string().uuid()
});

const TaskModificationRequestSchema = z.object({
  taskId: z.string().uuid(),
  modificationType: z.string(),
  daysToWedding: z.number(),
  impactAssessment: z.string(),
  weddingId: z.string().uuid()
});

export async function POST(request: NextRequest) {
  return withSecureValidation(
    async (req, session) => {
      const body = await req.json();
      const { action } = body;

      switch (action) {
        case 'log_guest_access':
          const guestAccess = GuestAccessRequestSchema.parse(body);
          
          await AdvancedWeddingAuditLogger.logGuestDataAccess(
            session.user.id,
            guestAccess.guestId,
            guestAccess.accessedFields,
            guestAccess.accessReason,
            {
              request: req,
              wedding_id: guestAccess.weddingId,
              compliance_flags: ['gdpr_applicable', 'privacy_sensitive'],
              business_context: {
                operation_type: 'guest_data_access',
                legal_basis: 'legitimate_interest',
                data_subject_type: 'wedding_guest'
              }
            }
          );
          
          return NextResponse.json({
            success: true,
            message: 'Guest data access logged successfully',
            audit_id: `guest_access_${Date.now()}`
          });

        case 'log_vendor_operation':
          const vendorOp = VendorOperationRequestSchema.parse(body);
          
          await AdvancedWeddingAuditLogger.logVendorOperation(
            session.user.id,
            vendorOp.vendorId,
            vendorOp.operationType,
            {
              contract_value: vendorOp.contractValue,
              payment_involved: vendorOp.paymentInvolved,
              business_impact: vendorOp.contractValue && vendorOp.contractValue > 5000 ? 'high' : 'medium'
            },
            {
              request: req,
              wedding_id: vendorOp.weddingId,
              compliance_flags: vendorOp.paymentInvolved ? ['pci_applicable', 'financial_data'] : [],
              business_context: {
                operation_type: 'vendor_management',
                financial_threshold: vendorOp.contractValue,
                payment_processing: vendorOp.paymentInvolved
              }
            }
          );
          
          return NextResponse.json({
            success: true,
            message: 'Vendor operation logged successfully',
            audit_id: `vendor_op_${Date.now()}`
          });

        case 'log_task_modification':
          const taskMod = TaskModificationRequestSchema.parse(body);
          
          await AdvancedWeddingAuditLogger.logTaskModification(
            session.user.id,
            taskMod.taskId,
            taskMod.modificationType,
            {
              days_to_wedding: taskMod.daysToWedding,
              impact_assessment: taskMod.impactAssessment,
              task_criticality: taskMod.daysToWedding <= 7 ? 'critical' : 'medium'
            },
            {
              request: req,
              wedding_id: taskMod.weddingId,
              business_context: {
                operation_type: 'task_modification',
                wedding_phase: taskMod.daysToWedding <= 7 ? 'final_week' : 'planning',
                urgency_level: taskMod.daysToWedding <= 7 ? 'urgent' : 'normal'
              }
            }
          );
          
          return NextResponse.json({
            success: true,
            message: 'Task modification logged successfully',
            audit_id: `task_mod_${Date.now()}`
          });

        default:
          return NextResponse.json(
            { success: false, error: 'Invalid action specified' },
            { status: 400 }
          );
      }
    },
    {
      requiredRole: 'authenticated',
      rateLimit: { requests: 1000, window: '1h' }
    }
  )(request);
}

// Generic audit logging endpoint
export async function PUT(request: NextRequest) {
  return withSecureValidation(
    async (req, session) => {
      const body = await req.json();
      
      await AdvancedWeddingAuditLogger.logAction(
        {
          action: body.action,
          resource_type: body.resource_type,
          resource_id: body.resource_id,
          severity: body.severity || 'info',
          details: body.details,
          business_impact: body.business_impact,
          compliance_category: body.compliance_category
        },
        {
          user_id: session.user.id,
          request: req,
          wedding_id: body.wedding_id,
          compliance_flags: body.compliance_flags,
          business_context: body.business_context
        }
      );
      
      return NextResponse.json({
        success: true,
        message: 'Audit entry logged successfully'
      });
    },
    {
      requiredRole: 'service',
      rateLimit: { requests: 5000, window: '1h' }
    }
  )(request);
}
```

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 Deliverables:
- [x] Advanced audit logging engine with wedding-specific business logic
- [x] High-performance batch processing and immediate logging for critical events
- [x] Comprehensive API endpoints for different audit scenarios
- [x] Risk scoring algorithm for intelligent event classification
- [x] Wedding business context integration and compliance metadata
- [x] Retention policy management with regulatory compliance
- [x] Performance optimization for high-volume logging scenarios
- [x] Integration with middleware and authentication systems

---

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS

**Critical Navigation Context:**
This backend logging system must support navigation-aware audit trails that track user journeys through the application.

### Navigation Integration Requirements

**1. Navigation-Aware Logging**
```typescript
// Log navigation events with business context
await AdvancedWeddingAuditLogger.logAction({
  action: 'navigation_event',
  resource_type: 'page_access',
  resource_id: '/admin/audit',
  severity: 'info',
  details: {
    page_accessed: '/admin/audit',
    navigation_path: ['dashboard', 'admin', 'audit'],
    access_method: 'direct_link',
    referrer: '/dashboard'
  }
}, {
  user_id: session.user.id,
  business_context: {
    navigation_context: 'admin_access',
    security_implications: 'audit_system_access'
  }
});
```

**2. Cross-Page Audit Context**
- Maintain audit context across navigation
- Track user journeys and access patterns
- Log navigation-based security events

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: UI audit requirements - Required for API design
- FROM Team C: Storage APIs - Required for data persistence
- FROM Team D: Security policies - Required for access control

### What other teams NEED from you:
- TO Team A: Audit data format and APIs - Required for UI display
- TO Team C: Log data format - Required for storage optimization
- TO Team D: Security events - Required for threat detection
- TO Team E: API contracts - Required for testing

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### Logging Security:
- [x] All audit operations are themselves audited
- [x] Sensitive data is sanitized before logging
- [x] Integrity hashing prevents log tampering
- [x] Encryption for sensitive audit metadata
- [x] Secure batch processing with failure recovery
- [x] Rate limiting prevents audit DoS attacks
- [x] Role-based audit operation access
- [x] Compliance-ready audit trail formatting

---

## 🎭 TESTING REQUIREMENTS

```javascript
// Comprehensive backend testing
describe('Advanced Wedding Audit Logger Testing', () => {
  it('should handle high-volume logging without performance degradation', async () => {
    const startTime = performance.now();
    
    const promises = Array.from({length: 1000}, (_, i) =>
      AdvancedWeddingAuditLogger.logGuestDataAccess(
        'user-123',
        `guest-${i}`,
        ['contact_info', 'dietary_requirements'],
        'Wedding planning access'
      )
    );
    
    await Promise.all(promises);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
  });

  it('should correctly classify risk scores for different scenarios', async () => {
    // Test critical guest data access
    const criticalRisk = await AdvancedWeddingAuditLogger.calculateRiskScore({
      action: 'access_guest_data',
      resource_type: 'guest',
      severity: 'critical',
      business_impact: 'high'
    }, {
      compliance_flags: ['gdpr_applicable'],
      business_context: { days_to_wedding: 5 }
    });
    
    expect(criticalRisk).toBeGreaterThan(80);
  });
});
```

---

## ✅ SUCCESS CRITERIA

### Technical Implementation:
- [x] Single audit log < 5ms processing time
- [x] Batch processing handles 10K logs/minute
- [x] Risk scoring algorithm accuracy > 95%
- [x] Business context integration functional
- [x] Compliance metadata automated
- [x] Wedding-specific logic comprehensive
- [x] API response times < 200ms

### Evidence Package Required:
- [x] Performance benchmarks under load
- [x] Business logic validation results
- [x] Risk scoring accuracy metrics
- [x] Compliance framework verification
- [x] Integration testing with all components
- [x] Wedding scenario validation

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Core Logger: `/wedsync/src/lib/audit/advanced-audit-logger.ts`
- API Routes: `/wedsync/src/app/api/audit/advanced/`
- Middleware: `/wedsync/src/lib/audit/audit-middleware.ts`
- Business Rules: `/wedsync/src/lib/audit/wedding-business-rules.ts`
- Types: `/wedsync/src/types/audit-advanced.ts`
- Tests: `/wedsync/__tests__/audit/advanced/`

### Team Report:
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch23/WS-177-team-b-round-1-complete.md`

---

END OF ROUND PROMPT