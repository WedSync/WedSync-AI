# 01-ticket-management.md

# Ticket Management System for WedSync/WedMe

## Overview

A robust ticket management system is essential for providing excellent support to both wedding suppliers and couples using the platform. This system handles support requests, tracks resolution, and provides insights into common issues.

## Ticket Architecture

### Ticket Classification

```tsx
interface TicketStructure {
  id: string;
  type: 'bug' | 'question' | 'feature_request' | 'billing' | 'onboarding' | 'technical';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'waiting_internal' | 'resolved' | 'closed';
  category: TicketCategory;
  user: {
    id: string;
    type: 'supplier' | 'couple';
    tier: 'free' | 'starter' | 'professional' | 'scale' | 'enterprise';
  };
  timeline: {
    created: Date;
    firstResponse: Date | null;
    resolved: Date | null;
    closed: Date | null;
  };
  satisfaction: {
    rating: 1-5 | null;
    feedback: string | null;
  };
}

enum TicketCategory {
  // Technical Issues
  FORM_BUILDER = 'form_builder',
  JOURNEY_CANVAS = 'journey_canvas',
  EMAIL_SYSTEM = 'email_system',
  IMPORT_EXPORT = 'import_export',
  PERFORMANCE = 'performance',

  // Business Issues
  BILLING = 'billing',
  SUBSCRIPTION = 'subscription',
  REFUND = 'refund',

  // User Experience
  ONBOARDING = 'onboarding',
  TRAINING = 'training',
  FEATURE_HELP = 'feature_help',

  // Platform Issues
  BUG = 'bug',
  DATA_LOSS = 'data_loss',
  SECURITY = 'security',
  INTEGRATION = 'integration'
}

```

## Implementation

### 1. Ticket Creation System

```tsx
// lib/ticketing/ticketManager.ts
export class TicketManager {
  private static instance: TicketManager;
  private aiClassifier: AITicketClassifier;
  private autoResponder: AutoResponder;

  static getInstance(): TicketManager {
    if (!TicketManager.instance) {
      TicketManager.instance = new TicketManager();
    }
    return TicketManager.instance;
  }

  async createTicket(request: TicketRequest): Promise<Ticket> {
    // Auto-classify ticket using AI
    const classification = await this.aiClassifier.classify(request);

    // Generate ticket ID with readable prefix
    const ticketId = this.generateTicketId(classification.category);

    const ticket: Ticket = {
      id: ticketId,
      userId: request.userId,
      userType: request.userType,
      userTier: await this.getUserTier(request.userId),

      subject: request.subject,
      description: request.description,
      attachments: request.attachments || [],

      type: classification.type,
      category: classification.category,
      priority: this.calculatePriority(classification, request),
      status: 'open',

      assignedTo: null,
      tags: classification.tags,

      metadata: {
        source: request.source, // 'email', 'chat', 'form', 'api'
        browser: request.browser,
        os: request.os,
        appVersion: request.appVersion,
        accountAge: await this.getAccountAge(request.userId),
        previousTickets: await this.getPreviousTicketCount(request.userId)
      },

      timeline: {
        created: new Date(),
        firstResponse: null,
        lastUpdate: new Date(),
        resolved: null,
        closed: null
      },

      internalNotes: [],
      publicMessages: [{
        id: generateId(),
        type: 'customer',
        message: request.description,
        timestamp: new Date(),
        attachments: request.attachments
      }],

      sla: this.calculateSLA(classification.priority, request.userTier),
      escalation: {
        level: 0,
        escalatedAt: null,
        reason: null
      }
    };

    // Save to database
    await this.saveTicket(ticket);

    // Check for auto-response
    const autoResponse = await this.autoResponder.checkAutoResponse(ticket);
    if (autoResponse) {
      await this.addResponse(ticketId, autoResponse, 'system');
    }

    // Route to appropriate team
    await this.routeTicket(ticket);

    // Send confirmation
    await this.sendTicketConfirmation(ticket);

    // Check for duplicate/related tickets
    const relatedTickets = await this.findRelatedTickets(ticket);
    if (relatedTickets.length > 0) {
      await this.linkRelatedTickets(ticketId, relatedTickets);
    }

    return ticket;
  }

  private calculatePriority(
    classification: Classification,
    request: TicketRequest
  ): TicketPriority {
    // Critical priority triggers
    if (classification.category === 'data_loss') return 'critical';
    if (classification.category === 'security') return 'critical';
    if (request.description.toLowerCase().includes('cannot access')) return 'critical';
    if (request.description.toLowerCase().includes('payment failed')) return 'critical';

    // High priority triggers
    if (request.userTier === 'enterprise') return 'high';
    if (request.userTier === 'scale' && classification.type === 'bug') return 'high';
    if (classification.category === 'billing') return 'high';
    if (request.description.toLowerCase().includes('broken')) return 'high';

    // Medium priority
    if (classification.type === 'bug') return 'medium';
    if (request.userTier === 'professional') return 'medium';

    // Default to low
    return 'low';
  }

  private calculateSLA(priority: TicketPriority, userTier: string): SLA {
    const slaMatrix = {
      critical: {
        enterprise: { firstResponse: 15, resolution: 120 }, // minutes
        scale: { firstResponse: 30, resolution: 240 },
        professional: { firstResponse: 60, resolution: 480 },
        starter: { firstResponse: 120, resolution: 1440 },
        free: { firstResponse: 1440, resolution: 2880 }
      },
      high: {
        enterprise: { firstResponse: 60, resolution: 480 },
        scale: { firstResponse: 120, resolution: 960 },
        professional: { firstResponse: 240, resolution: 1440 },
        starter: { firstResponse: 480, resolution: 2880 },
        free: { firstResponse: 1440, resolution: 4320 }
      },
      medium: {
        enterprise: { firstResponse: 240, resolution: 1440 },
        scale: { firstResponse: 480, resolution: 2880 },
        professional: { firstResponse: 960, resolution: 4320 },
        starter: { firstResponse: 1440, resolution: 5760 },
        free: { firstResponse: 2880, resolution: 7200 }
      },
      low: {
        all: { firstResponse: 1440, resolution: 7200 }
      }
    };

    const sla = slaMatrix[priority][userTier] || slaMatrix[priority]['all'];

    return {
      firstResponseMinutes: sla.firstResponse,
      resolutionMinutes: sla.resolution,
      firstResponseDeadline: new Date(Date.now() + sla.firstResponse * 60000),
      resolutionDeadline: new Date(Date.now() + sla.resolution * 60000)
    };
  }

  private generateTicketId(category: string): string {
    const prefix = {
      'form_builder': 'FB',
      'billing': 'BIL',
      'bug': 'BUG',
      'onboarding': 'ONB',
      'feature_help': 'FH',
      'data_loss': 'DL',
      'security': 'SEC'
    }[category] || 'TKT';

    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();

    return `${prefix}-${timestamp}-${random}`;
  }
}

```

### 2. AI-Powered Ticket Classification

```tsx
// lib/ticketing/aiClassifier.ts
export class AITicketClassifier {
  private patterns = new Map<string, TicketClassification>();

  constructor() {
    this.loadPatterns();
  }

  private loadPatterns() {
    // Common issue patterns
    this.patterns.set('form_not_saving', {
      regex: /form.*(not|won't|can't).*sav/i,
      category: 'form_builder',
      type: 'bug',
      tags: ['forms', 'data_loss'],
      suggestedResponse: 'form_save_troubleshooting'
    });

    this.patterns.set('import_csv_error', {
      regex: /import.*csv|csv.*import|upload.*spreadsheet/i,
      category: 'import_export',
      type: 'technical',
      tags: ['import', 'csv'],
      suggestedResponse: 'csv_import_guide'
    });

    this.patterns.set('payment_issue', {
      regex: /payment.*fail|card.*decline|billing.*error/i,
      category: 'billing',
      type: 'billing',
      tags: ['payment', 'urgent'],
      suggestedResponse: 'payment_troubleshooting'
    });

    this.patterns.set('slow_performance', {
      regex: /slow|lag|freeze|stuck|loading/i,
      category: 'performance',
      type: 'bug',
      tags: ['performance'],
      suggestedResponse: 'performance_tips'
    });
  }

  async classify(request: TicketRequest): Promise<Classification> {
    // First, try pattern matching
    for (const [key, pattern] of this.patterns) {
      if (pattern.regex.test(request.subject + ' ' + request.description)) {
        return {
          category: pattern.category,
          type: pattern.type,
          tags: pattern.tags,
          confidence: 0.9,
          suggestedResponse: pattern.suggestedResponse
        };
      }
    }

    // If no pattern matches, use AI
    const aiClassification = await this.classifyWithAI(request);
    return aiClassification;
  }

  private async classifyWithAI(request: TicketRequest): Promise<Classification> {
    const prompt = `
      Classify this support ticket:
      Subject: ${request.subject}
      Description: ${request.description}

      Respond with JSON:
      {
        "category": "one of: ${Object.values(TicketCategory).join(', ')}",
        "type": "one of: bug, question, feature_request, billing, onboarding, technical",
        "tags": ["array", "of", "relevant", "tags"],
        "urgency": "1-10 scale",
        "sentiment": "positive/neutral/negative/frustrated",
        "suggestedResponse": "template_name or null"
      }
    `;

    const response = await this.callOpenAI(prompt);
    return this.parseAIResponse(response);
  }

  async suggestResponse(ticket: Ticket): Promise<SuggestedResponse> {
    // Check for exact matches in knowledge base
    const kbArticles = await this.searchKnowledgeBase(ticket);

    if (kbArticles.length > 0) {
      return {
        type: 'kb_article',
        content: kbArticles[0],
        confidence: 0.95
      };
    }

    // Check for similar resolved tickets
    const similarTickets = await this.findSimilarResolvedTickets(ticket);

    if (similarTickets.length > 0) {
      return {
        type: 'previous_solution',
        content: similarTickets[0].resolution,
        confidence: 0.8,
        reference: similarTickets[0].id
      };
    }

    // Generate AI response for unique issues
    return await this.generateAIResponse(ticket);
  }
}

```

### 3. Ticket Routing & Assignment

```tsx
// lib/ticketing/ticketRouter.ts
export class TicketRouter {
  private teamCapacity = new Map<string, TeamMember[]>();
  private specializations = new Map<string, string[]>();

  async routeTicket(ticket: Ticket): Promise<Assignment> {
    // Determine the appropriate team
    const team = this.selectTeam(ticket);

    // Find available agent with right skills
    const agent = await this.selectAgent(team, ticket);

    // If no agent available, add to queue
    if (!agent) {
      return await this.addToQueue(ticket, team);
    }

    // Assign to agent
    return await this.assignToAgent(ticket, agent);
  }

  private selectTeam(ticket: Ticket): Team {
    const teamMapping = {
      'billing': 'billing_team',
      'bug': 'technical_team',
      'onboarding': 'customer_success',
      'feature_help': 'customer_success',
      'form_builder': 'technical_team',
      'security': 'security_team',
      'data_loss': 'technical_team'
    };

    return teamMapping[ticket.category] || 'general_support';
  }

  private async selectAgent(team: string, ticket: Ticket): Promise<Agent | null> {
    const availableAgents = await this.getAvailableAgents(team);

    // Score agents based on various factors
    const scoredAgents = availableAgents.map(agent => ({
      agent,
      score: this.calculateAgentScore(agent, ticket)
    }));

    // Sort by score and select best match
    scoredAgents.sort((a, b) => b.score - a.score);

    if (scoredAgents.length > 0 && scoredAgents[0].score > 0) {
      return scoredAgents[0].agent;
    }

    return null;
  }

  private calculateAgentScore(agent: Agent, ticket: Ticket): number {
    let score = 0;

    // Skill match
    if (agent.skills.includes(ticket.category)) score += 30;

    // Previous experience with user
    if (agent.previousTickets.includes(ticket.userId)) score += 20;

    // Current workload (lower is better)
    score -= agent.currentTickets * 5;

    // Expertise level
    score += agent.expertiseLevel * 10;

    // Language match
    if (agent.languages.includes(ticket.userLanguage)) score += 15;

    // Time zone match
    if (this.isInWorkingHours(agent.timezone)) score += 10;

    return score;
  }

  async escalateTicket(ticketId: string, reason: string): Promise<void> {
    const ticket = await this.getTicket(ticketId);

    ticket.escalation.level++;
    ticket.escalation.escalatedAt = new Date();
    ticket.escalation.reason = reason;

    // Reassign based on escalation level
    if (ticket.escalation.level === 1) {
      // Escalate to senior support
      await this.assignToSenior(ticket);
    } else if (ticket.escalation.level === 2) {
      // Escalate to team lead
      await this.assignToTeamLead(ticket);
    } else {
      // Escalate to founder (you)
      await this.notifyFounder(ticket);
    }

    // Update priority
    if (ticket.priority === 'low') ticket.priority = 'medium';
    else if (ticket.priority === 'medium') ticket.priority = 'high';
    else if (ticket.priority === 'high') ticket.priority = 'critical';

    await this.saveTicket(ticket);
  }
}

```

### 4. Ticket Response System

```tsx
// lib/ticketing/responseManager.ts
export class ResponseManager {
  async addResponse(
    ticketId: string,
    message: string,
    type: 'agent' | 'customer' | 'system',
    attachments?: Attachment[]
  ): Promise<void> {
    const ticket = await this.getTicket(ticketId);

    const response: TicketMessage = {
      id: generateId(),
      type,
      message,
      timestamp: new Date(),
      attachments: attachments || [],
      metadata: {
        agentId: type === 'agent' ? this.getCurrentAgentId() : null,
        automated: type === 'system',
        editHistory: []
      }
    };

    ticket.publicMessages.push(response);
    ticket.timeline.lastUpdate = new Date();

    // Update status based on response type
    if (type === 'agent' && ticket.status === 'open') {
      ticket.status = 'in_progress';
      ticket.timeline.firstResponse = ticket.timeline.firstResponse || new Date();
    } else if (type === 'customer' && ticket.status === 'waiting_customer') {
      ticket.status = 'in_progress';
    } else if (type === 'agent' && message.includes('[RESOLVED]')) {
      ticket.status = 'resolved';
      ticket.timeline.resolved = new Date();
    }

    await this.saveTicket(ticket);

    // Send notifications
    await this.sendNotifications(ticket, response);

    // Update metrics
    await this.updateResponseMetrics(ticket);
  }

  async sendCannedResponse(ticketId: string, templateId: string): Promise<void> {
    const template = await this.getTemplate(templateId);
    const ticket = await this.getTicket(ticketId);

    // Personalize template
    const personalizedMessage = this.personalizeTemplate(template, ticket);

    await this.addResponse(ticketId, personalizedMessage, 'agent');
  }

  private personalizeTemplate(template: Template, ticket: Ticket): string {
    let message = template.content;

    // Replace variables
    const variables = {
      '{customer_name}': ticket.userName,
      '{ticket_id}': ticket.id,
      '{category}': ticket.category,
      '{created_date}': ticket.timeline.created.toLocaleDateString(),
      '{agent_name}': this.getCurrentAgentName(),
      '{company}': 'WedSync'
    };

    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(key, 'g'), value);
    }

    return message;
  }
}

```

### 5. Ticket Analytics Dashboard

```tsx
// components/TicketAnalytics.tsx
export function TicketAnalyticsDashboard() {
  const { data: metrics } = useTicketMetrics();
  const { data: trends } = useTicketTrends();

  return (
    <div className="ticket-analytics">
      <div className="summary-cards">
        <MetricCard
          title="Open Tickets"
          value={metrics?.openTickets}
          change={metrics?.openChange}
          priority={{
            critical: metrics?.criticalCount,
            high: metrics?.highCount,
            medium: metrics?.mediumCount,
            low: metrics?.lowCount
          }}
        />

        <MetricCard
          title="Avg First Response"
          value={`${metrics?.avgFirstResponse} min`}
          target="30 min"
          status={metrics?.avgFirstResponse <= 30 ? 'good' : 'warning'}
        />

        <MetricCard
          title="Avg Resolution Time"
          value={`${metrics?.avgResolution} hours`}
          target="8 hours"
          status={metrics?.avgResolution <= 8 ? 'good' : 'warning'}
        />

        <MetricCard
          title="Customer Satisfaction"
          value={`${metrics?.csat}%`}
          target="90%"
          status={metrics?.csat >= 90 ? 'good' : 'warning'}
        />
      </div>

      <div className="ticket-trends">
        <h3>Ticket Volume Trends</h3>
        <TicketVolumeChart data={trends?.volume} />

        <div className="category-breakdown">
          <h4>By Category (Last 30 Days)</h4>
          <CategoryPieChart data={trends?.categories} />
        </div>
      </div>

      <div className="agent-performance">
        <h3>Agent Performance</h3>
        <AgentPerformanceTable agents={metrics?.agentStats} />
      </div>

      <div className="common-issues">
        <h3>Trending Issues</h3>
        <TrendingIssuesList issues={trends?.trendingIssues} />
      </div>
    </div>
  );
}

```

### 6. Database Schema

```sql
-- Tickets table
CREATE TABLE tickets (
  id VARCHAR(20) PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  user_type VARCHAR(20),
  user_tier VARCHAR(20),

  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR(50),
  category VARCHAR(50),
  priority VARCHAR(20),
  status VARCHAR(30),

  assigned_to UUID REFERENCES support_agents(id),
  assigned_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  sla_first_response INTEGER, -- minutes
  sla_resolution INTEGER, -- minutes
  sla_breach BOOLEAN DEFAULT FALSE,

  escalation_level INTEGER DEFAULT 0,
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,

  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  satisfaction_feedback TEXT,

  tags TEXT[],
  metadata JSONB,

  INDEX idx_tickets_status (status),
  INDEX idx_tickets_priority (priority),
  INDEX idx_tickets_user (user_id),
  INDEX idx_tickets_assigned (assigned_to),
  INDEX idx_tickets_created (created_at DESC)
);

-- Ticket messages
CREATE TABLE ticket_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id VARCHAR(20) REFERENCES tickets(id),
  type VARCHAR(20), -- 'agent', 'customer', 'system'
  sender_id UUID,
  message TEXT NOT NULL,
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  edit_history JSONB,

  INDEX idx_messages_ticket (ticket_id),
  INDEX idx_messages_created (created_at)
);

-- Canned responses
CREATE TABLE canned_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  content TEXT NOT NULL,
  variables TEXT[],
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES support_agents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket metrics (aggregated hourly)
CREATE TABLE ticket_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hour TIMESTAMPTZ NOT NULL,

  tickets_created INTEGER DEFAULT 0,
  tickets_resolved INTEGER DEFAULT 0,
  tickets_closed INTEGER DEFAULT 0,

  avg_first_response_minutes DECIMAL(10,2),
  avg_resolution_minutes DECIMAL(10,2),

  sla_breaches INTEGER DEFAULT 0,
  escalations INTEGER DEFAULT 0,

  satisfaction_responses INTEGER DEFAULT 0,
  satisfaction_sum INTEGER DEFAULT 0,

  by_category JSONB,
  by_priority JSONB,
  by_agent JSONB,

  UNIQUE(hour)
);

```

## Automation Rules

### Auto-Response Rules

```tsx
const autoResponseRules = [
  {
    condition: 'category === "billing" && description.includes("refund")',
    response: 'refund_policy_template',
    addTags: ['refund_request'],
    setPriority: 'high'
  },
  {
    condition: 'category === "onboarding" && userAge < 24',
    response: 'onboarding_welcome_template',
    assignTo: 'onboarding_specialist',
    addTags: ['new_user']
  },
  {
    condition: 'previousTickets > 5 && satisfaction < 3',
    escalate: true,
    notifyManager: true,
    addTags: ['at_risk_customer']
  }
];

```

## SLA Management

### SLA Configuration

```tsx
const slaConfig = {
  tiers: {
    enterprise: {
      firstResponse: {
        critical: 15,  // minutes
        high: 60,
        medium: 240,
        low: 1440
      },
      resolution: {
        critical: 120,  // minutes
        high: 480,
        medium: 1440,
        low: 4320
      }
    },
    professional: {
      firstResponse: {
        critical: 60,
        high: 240,
        medium: 960,
        low: 1440
      },
      resolution: {
        critical: 480,
        high: 1440,
        medium: 4320,
        low: 7200
      }
    }
  },

  escalation: {
    warning: 0.75,  // Escalate at 75% of SLA
    breach: 1.0     // Escalate on breach
  },

  notifications: {
    customer: ['email'],
    agent: ['dashboard', 'email'],
    manager: ['sms', 'email', 'slack']
  }
};

```

## Reporting Queries

### Daily Ticket Report

```sql
-- Daily ticket summary
WITH daily_stats AS (
  SELECT
    DATE(created_at) as date,
    COUNT(*) as total_tickets,
    COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical_tickets,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
    AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))/60) as avg_first_response_min,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_hours,
    COUNT(CASE WHEN sla_breach THEN 1 END) as sla_breaches
  FROM tickets
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at)
)
SELECT
  date,
  total_tickets,
  critical_tickets,
  resolved_tickets,
  ROUND(avg_first_response_min::numeric, 1) as avg_first_response,
  ROUND(avg_resolution_hours::numeric, 1) as avg_resolution,
  sla_breaches,
  ROUND((resolved_tickets::float / total_tickets * 100)::numeric, 1) as resolution_rate
FROM daily_stats
ORDER BY date DESC;

```

## Best Practices

### 1. Ticket Prioritization

- Auto-classify using AI and patterns
- Consider user tier and account value
- Escalate based on SLA proximity
- Monitor for VIP customers

### 2. Response Quality

- Use templates for consistency
- Personalize responses
- Include relevant KB articles
- Follow up on resolved tickets

### 3. Team Management

- Balance workload across agents
- Match skills to ticket types
- Monitor agent performance
- Provide regular training

### 4. Customer Communication

- Set clear expectations
- Provide regular updates
- Use customer's preferred channel
- Follow up after resolution

## Success Metrics

- **First Response Time**: <30 minutes average
- **Resolution Time**: <8 hours average
- **SLA Compliance**: >95%
- **Customer Satisfaction**: >90%
- **Ticket Deflection**: >30% via self-service
- **Agent Productivity**: >20 tickets/day resolved
- **Escalation Rate**: <10% of tickets