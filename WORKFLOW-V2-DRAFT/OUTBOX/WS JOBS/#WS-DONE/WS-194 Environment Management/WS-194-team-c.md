# TEAM C - ROUND 1: WS-194 - Environment Management
## 2025-08-29 - Development Round 1

**YOUR MISSION:** Create comprehensive integration-focused environment management that handles third-party service configuration, cross-environment secret synchronization, and environment-specific integration validation
**FEATURE ID:** WS-194 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about secure third-party integration configuration, environment-specific API endpoint management, and cross-environment validation that prevents wedding coordination failures

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/config/
cat $WS_ROOT/wedsync/config/integration-environments.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test environment-integration
# MUST show: "All integration environment tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing environment and configuration patterns
await mcp__serena__search_for_pattern("env config process.env NODE_ENV");
await mcp__serena__find_symbol("environment configuration", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/config/");
```

### B. INTEGRATION ENVIRONMENT PATTERNS (MANDATORY FOR INTEGRATION CONFIG)
```typescript
// Load integration environment management documentation
# Use Ref MCP to search for:
# - "Multi-environment API configuration patterns"
# - "Third-party service environment management"
# - "Secret management for integrations"
# - "Environment validation for external services"
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to integration environment management
# Use Ref MCP to search for relevant documentation
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR INTEGRATION ENVIRONMENT MANAGEMENT

### Use Sequential Thinking MCP for Environment Configuration Strategy
```typescript
// Use for comprehensive integration environment analysis
mcp__sequential-thinking__sequential_thinking({
  thought: "Integration environment management for wedding platform requires: third-party API configuration per environment (Google Calendar, email services, SMS providers), secret rotation without breaking active wedding coordination, environment-specific webhook endpoints, and integration health monitoring across environments.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Third-party service environment segregation: Calendar API keys must be isolated between dev/staging/prod, email service configurations need proper domain validation, webhook endpoints need environment-specific URLs, payment test vs live keys must be clearly separated to prevent production transactions in testing.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Secret rotation and synchronization: API keys for external services need automated rotation, database connection strings need secure updates, webhook signing secrets need coordinated updates across environments, service account credentials need regular refresh without service interruption.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Environment validation and health checks: Integration endpoints must validate correctly for each environment, third-party service connectivity tests, webhook delivery validation, fallback mechanisms for degraded external services, monitoring alerts for integration failures.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding season resilience: Environment switches during peak usage must not interrupt active wedding coordination, rollback procedures must preserve integration state, configuration errors must be detected before affecting couples' wedding planning, disaster recovery must include external service reconnection.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down integration environment management requirements
2. **security-compliance-officer** - Ensure secure secret management and environment isolation
3. **integration-specialist** - Design third-party service environment configuration
4. **code-quality-guardian** - Maintain environment configuration code standards
5. **documentation-chronicler** - Document integration environment procedures and troubleshooting

## 🔒 SECURITY REQUIREMENTS FOR INTEGRATION ENVIRONMENTS (NON-NEGOTIABLE!)

### INTEGRATION ENVIRONMENT SECURITY CHECKLIST:
- [ ] **Secret isolation** - No production secrets in development environments
- [ ] **API key scoping** - Environment-specific API keys with minimal required permissions
- [ ] **Webhook security** - Environment-specific webhook signatures and validation
- [ ] **Connection encryption** - All external service connections use TLS 1.3+
- [ ] **Credential rotation** - Automated secret rotation without service interruption
- [ ] **Environment validation** - Configuration validation before deployment
- [ ] **Audit logging** - All environment changes logged with user context

## 🎯 TEAM C SPECIALIZATION: INTEGRATION ENVIRONMENT FOCUS

**INTEGRATION ENVIRONMENT MANAGEMENT FOCUS:**
- Third-party service configuration per environment (dev/staging/prod)
- Secure API key and credential management for external services
- Environment-specific webhook endpoint configuration and validation
- Cross-environment integration health monitoring and alerting
- Automated secret rotation for external service credentials
- Integration fallback and degradation strategies per environment
- Environment-specific feature flag management for integrations

## 📋 TECHNICAL SPECIFICATION

**Integration Environment Requirements:**
- Configure Google Calendar API keys per environment with proper scoping
- Manage email service (SendGrid/SES) configuration with domain validation
- Set up SMS provider configuration with environment-specific numbers
- Configure webhook endpoints with environment-specific URLs and signatures
- Implement automated secret rotation for all external service credentials
- Create integration health checks for each environment
- Set up monitoring and alerting for integration configuration changes

**Environment-Specific Integration Points:**
- Calendar APIs: Separate Google/Outlook credentials per environment
- Email services: Domain-validated senders per environment
- SMS providers: Test vs production phone numbers and API keys
- Webhook handlers: Environment-specific endpoint URLs and validation
- Payment services: Clear separation of test vs live credentials
- File storage: Environment-specific S3/storage buckets

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] Integration environment configuration framework
- [ ] Third-party service credential management system
- [ ] Environment-specific webhook configuration and validation
- [ ] Automated secret rotation system for external services
- [ ] Integration health monitoring across environments
- [ ] Environment validation scripts and procedures
- [ ] Integration environment documentation and troubleshooting guides

## 💾 WHERE TO SAVE YOUR WORK
- Integration Config: $WS_ROOT/wedsync/config/integration-environments.ts
- Secret Management: $WS_ROOT/wedsync/lib/secret-manager.ts
- Webhook Config: $WS_ROOT/wedsync/config/webhooks.ts
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/

## 🏁 COMPLETION CHECKLIST
- [ ] Integration environment files created and verified to exist
- [ ] TypeScript compilation successful for all configuration code
- [ ] All integration environment tests passing validation
- [ ] Secret management system working with proper rotation
- [ ] Webhook configuration validated across environments
- [ ] Integration health monitoring functioning correctly
- [ ] Environment documentation complete with troubleshooting guides
- [ ] Senior dev review prompt created

## 🔧 INTEGRATION ENVIRONMENT PATTERNS

### Third-Party Service Environment Configuration
```typescript
// config/integration-environments.ts
export interface IntegrationEnvironment {
  calendar: {
    google: {
      clientId: string;
      clientSecret: string;
      redirectUrl: string;
      scopes: string[];
    };
    outlook: {
      clientId: string;
      clientSecret: string;
      redirectUrl: string;
      scopes: string[];
    };
  };
  email: {
    provider: 'sendgrid' | 'ses';
    apiKey: string;
    fromAddress: string;
    replyToAddress: string;
    webhookUrl: string;
  };
  sms: {
    provider: 'twilio' | 'sns';
    accountSid: string;
    authToken: string;
    fromNumber: string;
    webhookUrl: string;
  };
  webhooks: {
    signingSecret: string;
    endpoints: {
      calendar: string;
      email: string;
      sms: string;
      payment: string;
    };
  };
}

export class IntegrationEnvironmentManager {
  private environments: Map<string, IntegrationEnvironment> = new Map();

  constructor() {
    this.loadEnvironmentConfigurations();
    this.validateConfigurations();
  }

  private loadEnvironmentConfigurations(): void {
    const environments = ['development', 'staging', 'production'];
    
    for (const env of environments) {
      const config: IntegrationEnvironment = {
        calendar: {
          google: {
            clientId: this.getSecret(`GOOGLE_CALENDAR_CLIENT_ID_${env.toUpperCase()}`),
            clientSecret: this.getSecret(`GOOGLE_CALENDAR_CLIENT_SECRET_${env.toUpperCase()}`),
            redirectUrl: `${this.getBaseUrl(env)}/api/auth/google/callback`,
            scopes: [
              'https://www.googleapis.com/auth/calendar.readonly',
              'https://www.googleapis.com/auth/calendar.events'
            ],
          },
          outlook: {
            clientId: this.getSecret(`OUTLOOK_CLIENT_ID_${env.toUpperCase()}`),
            clientSecret: this.getSecret(`OUTLOOK_CLIENT_SECRET_${env.toUpperCase()}`),
            redirectUrl: `${this.getBaseUrl(env)}/api/auth/outlook/callback`,
            scopes: [
              'https://graph.microsoft.com/calendars.read',
              'https://graph.microsoft.com/calendars.readwrite'
            ],
          },
        },
        email: {
          provider: env === 'production' ? 'sendgrid' : 'ses',
          apiKey: this.getSecret(`EMAIL_API_KEY_${env.toUpperCase()}`),
          fromAddress: env === 'production' 
            ? 'noreply@wedsync.com' 
            : `noreply-${env}@wedsync-dev.com`,
          replyToAddress: env === 'production'
            ? 'support@wedsync.com'
            : `support-${env}@wedsync-dev.com`,
          webhookUrl: `${this.getBaseUrl(env)}/api/webhooks/email`,
        },
        sms: {
          provider: 'twilio',
          accountSid: this.getSecret(`TWILIO_ACCOUNT_SID_${env.toUpperCase()}`),
          authToken: this.getSecret(`TWILIO_AUTH_TOKEN_${env.toUpperCase()}`),
          fromNumber: env === 'production' 
            ? '+1234567890' 
            : '+1234567891', // Test number for non-prod
          webhookUrl: `${this.getBaseUrl(env)}/api/webhooks/sms`,
        },
        webhooks: {
          signingSecret: this.getSecret(`WEBHOOK_SIGNING_SECRET_${env.toUpperCase()}`),
          endpoints: {
            calendar: `${this.getBaseUrl(env)}/api/webhooks/calendar`,
            email: `${this.getBaseUrl(env)}/api/webhooks/email`,
            sms: `${this.getBaseUrl(env)}/api/webhooks/sms`,
            payment: `${this.getBaseUrl(env)}/api/webhooks/payment`,
          },
        },
      };

      this.environments.set(env, config);
    }
  }

  private validateConfigurations(): void {
    for (const [env, config] of this.environments) {
      this.validateEnvironmentConfig(env, config);
    }
  }

  private validateEnvironmentConfig(env: string, config: IntegrationEnvironment): void {
    const errors: string[] = [];

    // Validate calendar configuration
    if (!config.calendar.google.clientId) {
      errors.push(`Missing Google Calendar client ID for ${env}`);
    }
    if (!config.calendar.outlook.clientId) {
      errors.push(`Missing Outlook client ID for ${env}`);
    }

    // Validate email configuration
    if (!config.email.apiKey) {
      errors.push(`Missing email API key for ${env}`);
    }
    if (!this.isValidEmail(config.email.fromAddress)) {
      errors.push(`Invalid from address for ${env}: ${config.email.fromAddress}`);
    }

    // Validate SMS configuration
    if (!config.sms.accountSid || !config.sms.authToken) {
      errors.push(`Missing SMS credentials for ${env}`);
    }

    // Validate webhook configuration
    if (!config.webhooks.signingSecret) {
      errors.push(`Missing webhook signing secret for ${env}`);
    }

    if (errors.length > 0) {
      throw new Error(`Environment validation failed for ${env}:\n${errors.join('\n')}`);
    }
  }

  public getEnvironmentConfig(env: string): IntegrationEnvironment {
    const config = this.environments.get(env);
    if (!config) {
      throw new Error(`Unknown environment: ${env}`);
    }
    return config;
  }
}
```

### Automated Secret Rotation System
```typescript
// lib/secret-rotation.ts
export class SecretRotationManager {
  private rotationSchedule: Map<string, number> = new Map();

  constructor() {
    this.initializeRotationSchedule();
  }

  private initializeRotationSchedule(): void {
    // Define rotation schedules (in days)
    this.rotationSchedule.set('GOOGLE_CALENDAR_CLIENT_SECRET', 90);
    this.rotationSchedule.set('OUTLOOK_CLIENT_SECRET', 90);
    this.rotationSchedule.set('EMAIL_API_KEY', 30);
    this.rotationSchedule.set('TWILIO_AUTH_TOKEN', 60);
    this.rotationSchedule.set('WEBHOOK_SIGNING_SECRET', 180);
  }

  async rotateSecret(secretName: string, environment: string): Promise<void> {
    console.log(`Starting secret rotation for ${secretName} in ${environment}`);
    
    try {
      // 1. Generate new secret
      const newSecret = await this.generateNewSecret(secretName, environment);
      
      // 2. Validate new secret works
      await this.validateSecret(secretName, newSecret, environment);
      
      // 3. Update environment configuration
      await this.updateEnvironmentSecret(secretName, newSecret, environment);
      
      // 4. Verify services still function
      await this.verifyIntegrationHealth(secretName, environment);
      
      // 5. Clean up old secret
      await this.deactivateOldSecret(secretName, environment);
      
      console.log(`Successfully rotated ${secretName} for ${environment}`);
      
      // 6. Log rotation event
      await this.logRotationEvent(secretName, environment, true);
      
    } catch (error) {
      console.error(`Failed to rotate ${secretName} for ${environment}:`, error);
      
      // Rollback if needed
      await this.rollbackSecretRotation(secretName, environment);
      
      // Log failure
      await this.logRotationEvent(secretName, environment, false, error.message);
      
      throw error;
    }
  }

  private async generateNewSecret(secretName: string, environment: string): Promise<string> {
    switch (secretName) {
      case 'WEBHOOK_SIGNING_SECRET':
        return crypto.randomBytes(32).toString('hex');
      
      case 'EMAIL_API_KEY':
        // Generate via SendGrid/SES API
        return await this.generateEmailApiKey(environment);
      
      case 'TWILIO_AUTH_TOKEN':
        // Generate via Twilio API
        return await this.generateTwilioAuthToken(environment);
      
      default:
        throw new Error(`Unknown secret type: ${secretName}`);
    }
  }

  private async validateSecret(secretName: string, newSecret: string, environment: string): Promise<void> {
    // Test the new secret before applying it
    switch (secretName) {
      case 'EMAIL_API_KEY':
        await this.testEmailApiKey(newSecret, environment);
        break;
      
      case 'TWILIO_AUTH_TOKEN':
        await this.testTwilioAuth(newSecret, environment);
        break;
      
      case 'WEBHOOK_SIGNING_SECRET':
        await this.testWebhookSigning(newSecret, environment);
        break;
    }
  }

  async checkRotationNeeded(): Promise<string[]> {
    const secretsNeedingRotation: string[] = [];
    
    for (const [secretName, rotationDays] of this.rotationSchedule) {
      const lastRotation = await this.getLastRotationDate(secretName);
      const daysSinceRotation = Math.floor((Date.now() - lastRotation) / (1000 * 60 * 60 * 24));
      
      if (daysSinceRotation >= rotationDays) {
        secretsNeedingRotation.push(secretName);
      }
    }
    
    return secretsNeedingRotation;
  }
}
```

### Integration Health Monitoring
```typescript
// lib/integration-health.ts
export class IntegrationHealthMonitor {
  private healthChecks: Map<string, HealthCheck> = new Map();

  constructor() {
    this.initializeHealthChecks();
  }

  private initializeHealthChecks(): void {
    // Define health check configurations
    this.healthChecks.set('calendar-google', {
      name: 'Google Calendar API',
      endpoint: 'https://www.googleapis.com/calendar/v3/calendars',
      timeout: 5000,
      retries: 3,
      expectedStatus: 200,
    });

    this.healthChecks.set('calendar-outlook', {
      name: 'Microsoft Graph API',
      endpoint: 'https://graph.microsoft.com/v1.0/me/calendars',
      timeout: 5000,
      retries: 3,
      expectedStatus: 200,
    });

    this.healthChecks.set('email-service', {
      name: 'Email Service',
      test: 'send-test-email',
      timeout: 10000,
      retries: 2,
    });

    this.healthChecks.set('sms-service', {
      name: 'SMS Service',
      test: 'validate-credentials',
      timeout: 5000,
      retries: 2,
    });
  }

  async runHealthChecks(environment: string): Promise<HealthReport> {
    const config = new IntegrationEnvironmentManager().getEnvironmentConfig(environment);
    const results: HealthCheckResult[] = [];

    for (const [checkName, check] of this.healthChecks) {
      const result = await this.runSingleHealthCheck(checkName, check, config);
      results.push(result);
    }

    const overallHealth = results.every(r => r.passed) ? 'healthy' : 'degraded';
    
    return {
      environment,
      timestamp: new Date().toISOString(),
      overallHealth,
      results,
    };
  }

  private async runSingleHealthCheck(
    name: string, 
    check: HealthCheck, 
    config: IntegrationEnvironment
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      let passed = false;
      
      switch (name) {
        case 'calendar-google':
          passed = await this.testGoogleCalendarAPI(config.calendar.google);
          break;
        case 'calendar-outlook':
          passed = await this.testOutlookAPI(config.calendar.outlook);
          break;
        case 'email-service':
          passed = await this.testEmailService(config.email);
          break;
        case 'sms-service':
          passed = await this.testSMSService(config.sms);
          break;
      }
      
      const duration = Date.now() - startTime;
      
      return {
        name: check.name,
        passed,
        duration,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        name: check.name,
        passed: false,
        duration,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
```

---

**EXECUTE IMMEDIATELY - This is a comprehensive integration environment management prompt with secure configuration and validation!**