# WS-197: Middleware Setup - Team C Integration Architect

## ROLE: Integration Middleware Architect
You are Team C, the Integration Middleware Architect for WedSync, responsible for building robust middleware infrastructure that handles third-party integrations, API gateway management, webhook processing, and inter-service communication. Your focus is on creating resilient middleware systems that seamlessly connect WedSync with external partners, payment processors, email services, and supplier management systems.

## FEATURE CONTEXT: Middleware Setup
Building a comprehensive middleware infrastructure for WedSync's wedding coordination platform that handles authentication, rate limiting, API routing, third-party integrations, webhook management, error handling, and service-to-service communication. This middleware layer must support high-traffic wedding seasons, handle complex integration scenarios, and provide reliable communication between all system components.

## YOUR IMPLEMENTATION FOCUS
Your Team C implementation must include:

1. **Integration Gateway Middleware**
   - Third-party API authentication and token management
   - Request/response transformation and standardization
   - Service discovery and load balancing
   - Circuit breaker patterns for external service failures

2. **Webhook Processing Infrastructure**
   - Webhook signature verification and security
   - Event normalization and routing
   - Retry mechanisms and dead letter queues
   - Real-time event streaming to connected clients

3. **Inter-Service Communication**
   - Service mesh middleware for microservice communication
   - Message queue integration (Redis pub/sub)
   - Event-driven architecture patterns
   - Service health monitoring and failover

4. **Data Transformation Middleware**
   - API response normalization across different vendors
   - Data validation and sanitization
   - Schema versioning and compatibility
   - Real-time data synchronization

## IMPLEMENTATION REQUIREMENTS

### 1. Integration Gateway Setup
```typescript
// /wedsync/src/middleware/integration-gateway.ts
import { NextRequest } from 'next/server';
import { Redis } from 'ioredis';
import CircuitBreaker from 'opossum';

interface IntegrationConfig {
  serviceId: string;
  baseUrl: string;
  authType: 'bearer' | 'apikey' | 'oauth2' | 'basic';
  credentials: Record<string, string>;
  rateLimit: {
    requests: number;
    window: number;
  };
  timeout: number;
  retryPolicy: {
    maxAttempts: number;
    backoffMs: number;
  };
  circuitBreaker: {
    errorThreshold: number;
    timeout: number;
  };
}

interface ServiceHealthMetrics {
  serviceId: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  errorRate: number;
  lastCheck: Date;
  consecutiveFailures: number;
}

export class IntegrationGateway {
  private redis: Redis;
  private serviceConfigs: Map<string, IntegrationConfig>;
  private circuitBreakers: Map<string, CircuitBreaker>;
  private healthMetrics: Map<string, ServiceHealthMetrics>;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
    this.serviceConfigs = new Map();
    this.circuitBreakers = new Map();
    this.healthMetrics = new Map();
    this.initializeServices();
  }

  private async initializeServices(): Promise<void> {
    const services: IntegrationConfig[] = [
      {
        serviceId: 'stripe_payments',
        baseUrl: 'https://api.stripe.com',
        authType: 'bearer',
        credentials: { token: process.env.STRIPE_SECRET_KEY! },
        rateLimit: { requests: 100, window: 60000 },
        timeout: 30000,
        retryPolicy: { maxAttempts: 3, backoffMs: 1000 },
        circuitBreaker: { errorThreshold: 5, timeout: 60000 }
      },
      {
        serviceId: 'email_service',
        baseUrl: process.env.EMAIL_SERVICE_URL!,
        authType: 'apikey',
        credentials: { key: process.env.EMAIL_API_KEY! },
        rateLimit: { requests: 200, window: 60000 },
        timeout: 15000,
        retryPolicy: { maxAttempts: 2, backoffMs: 2000 },
        circuitBreaker: { errorThreshold: 3, timeout: 30000 }
      },
      {
        serviceId: 'supplier_directory',
        baseUrl: process.env.SUPPLIER_API_URL!,
        authType: 'oauth2',
        credentials: { 
          clientId: process.env.SUPPLIER_CLIENT_ID!,
          clientSecret: process.env.SUPPLIER_CLIENT_SECRET!
        },
        rateLimit: { requests: 50, window: 60000 },
        timeout: 20000,
        retryPolicy: { maxAttempts: 3, backoffMs: 1500 },
        circuitBreaker: { errorThreshold: 4, timeout: 45000 }
      }
    ];

    for (const config of services) {
      this.serviceConfigs.set(config.serviceId, config);
      this.setupCircuitBreaker(config);
      await this.initializeHealthMetrics(config.serviceId);
    }
  }

  private setupCircuitBreaker(config: IntegrationConfig): void {
    const breaker = new CircuitBreaker(
      async (request: any) => this.makeServiceCall(config, request),
      {
        timeout: config.circuitBreaker.timeout,
        errorThresholdPercentage: config.circuitBreaker.errorThreshold,
        resetTimeout: 30000
      }
    );

    breaker.on('open', () => {
      console.warn(`Circuit breaker opened for service: ${config.serviceId}`);
      this.updateServiceHealth(config.serviceId, 'down');
    });

    breaker.on('halfOpen', () => {
      console.info(`Circuit breaker half-open for service: ${config.serviceId}`);
      this.updateServiceHealth(config.serviceId, 'degraded');
    });

    breaker.on('close', () => {
      console.info(`Circuit breaker closed for service: ${config.serviceId}`);
      this.updateServiceHealth(config.serviceId, 'healthy');
    });

    this.circuitBreakers.set(config.serviceId, breaker);
  }

  async routeRequest(serviceId: string, endpoint: string, options: RequestInit, context: any): Promise<any> {
    const requestId = context.requestId;
    const startTime = Date.now();

    try {
      // Check rate limiting
      const rateLimitResult = await this.checkRateLimit(serviceId, context.clientId);
      if (!rateLimitResult.allowed) {
        throw new Error(`Rate limit exceeded for service ${serviceId}`);
      }

      // Get service configuration
      const config = this.serviceConfigs.get(serviceId);
      if (!config) {
        throw new Error(`Service configuration not found: ${serviceId}`);
      }

      // Check circuit breaker
      const breaker = this.circuitBreakers.get(serviceId);
      if (!breaker) {
        throw new Error(`Circuit breaker not found for service: ${serviceId}`);
      }

      // Prepare request
      const fullUrl = `${config.baseUrl}${endpoint}`;
      const authenticatedOptions = await this.addAuthentication(config, options);
      const requestPayload = {
        url: fullUrl,
        options: authenticatedOptions,
        context: { ...context, serviceId, startTime }
      };

      // Execute through circuit breaker
      const response = await breaker.fire(requestPayload);
      
      // Record success metrics
      await this.recordMetrics(serviceId, 'success', Date.now() - startTime);
      
      return response;

    } catch (error) {
      // Record failure metrics
      await this.recordMetrics(serviceId, 'error', Date.now() - startTime);
      
      // Log integration error
      console.error(`Integration gateway error for ${serviceId}:`, {
        requestId,
        endpoint,
        error: error.message,
        duration: Date.now() - startTime
      });

      throw error;
    }
  }

  private async makeServiceCall(request: any): Promise<any> {
    const { url, options, context } = request;
    
    try {
      const response = await fetch(url, {
        ...options,
        timeout: context.timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return this.normalizeResponse(context.serviceId, data);

    } catch (error) {
      // Update consecutive failures
      const metrics = this.healthMetrics.get(context.serviceId);
      if (metrics) {
        metrics.consecutiveFailures += 1;
        metrics.lastCheck = new Date();
        
        if (metrics.consecutiveFailures >= 3) {
          metrics.status = 'down';
        } else if (metrics.consecutiveFailures >= 1) {
          metrics.status = 'degraded';
        }
      }
      
      throw error;
    }
  }

  private async addAuthentication(config: IntegrationConfig, options: RequestInit): Promise<RequestInit> {
    const headers = new Headers(options.headers);

    switch (config.authType) {
      case 'bearer':
        headers.set('Authorization', `Bearer ${config.credentials.token}`);
        break;

      case 'apikey':
        headers.set('X-API-Key', config.credentials.key);
        break;

      case 'oauth2':
        const token = await this.getOAuth2Token(config);
        headers.set('Authorization', `Bearer ${token}`);
        break;

      case 'basic':
        const encoded = Buffer.from(`${config.credentials.username}:${config.credentials.password}`).toString('base64');
        headers.set('Authorization', `Basic ${encoded}`);
        break;
    }

    return { ...options, headers };
  }

  private normalizeResponse(serviceId: string, data: any): any {
    // Service-specific response normalization
    switch (serviceId) {
      case 'stripe_payments':
        return this.normalizeStripeResponse(data);
      case 'email_service':
        return this.normalizeEmailResponse(data);
      case 'supplier_directory':
        return this.normalizeSupplierResponse(data);
      default:
        return data;
    }
  }
}
```

### 2. Webhook Processing Infrastructure
```typescript
// /wedsync/src/middleware/webhook-processor.ts
import { NextRequest } from 'next/server';
import { createHash, createHmac } from 'crypto';
import { Redis } from 'ioredis';

interface WebhookConfig {
  providerId: string;
  secret: string;
  signatureHeader: string;
  signatureFormat: 'sha256' | 'sha1' | 'hmac-sha256';
  eventTypes: string[];
  retryPolicy: {
    maxAttempts: number;
    backoffMs: number;
    deadLetterQueue: string;
  };
}

interface WebhookEvent {
  id: string;
  providerId: string;
  eventType: string;
  payload: any;
  signature: string;
  timestamp: Date;
  processed: boolean;
  attempts: number;
  lastError?: string;
}

export class WebhookProcessor {
  private redis: Redis;
  private webhookConfigs: Map<string, WebhookConfig>;
  private eventProcessors: Map<string, Function>;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
    this.webhookConfigs = new Map();
    this.eventProcessors = new Map();
    this.initializeWebhookConfigs();
    this.registerEventProcessors();
  }

  private initializeWebhookConfigs(): void {
    const configs: WebhookConfig[] = [
      {
        providerId: 'stripe',
        secret: process.env.STRIPE_WEBHOOK_SECRET!,
        signatureHeader: 'stripe-signature',
        signatureFormat: 'hmac-sha256',
        eventTypes: ['payment_intent.succeeded', 'payment_intent.failed', 'invoice.payment_succeeded'],
        retryPolicy: { maxAttempts: 3, backoffMs: 2000, deadLetterQueue: 'webhook_dlq_stripe' }
      },
      {
        providerId: 'supplier_platform',
        secret: process.env.SUPPLIER_WEBHOOK_SECRET!,
        signatureHeader: 'x-supplier-signature',
        signatureFormat: 'sha256',
        eventTypes: ['booking.confirmed', 'booking.cancelled', 'availability.updated'],
        retryPolicy: { maxAttempts: 5, backoffMs: 1000, deadLetterQueue: 'webhook_dlq_supplier' }
      },
      {
        providerId: 'email_provider',
        secret: process.env.EMAIL_WEBHOOK_SECRET!,
        signatureHeader: 'x-email-signature',
        signatureFormat: 'hmac-sha256',
        eventTypes: ['email.delivered', 'email.bounced', 'email.opened'],
        retryPolicy: { maxAttempts: 2, backoffMs: 3000, deadLetterQueue: 'webhook_dlq_email' }
      }
    ];

    configs.forEach(config => {
      this.webhookConfigs.set(config.providerId, config);
    });
  }

  async processWebhook(request: NextRequest, providerId: string): Promise<Response> {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Get webhook configuration
      const config = this.webhookConfigs.get(providerId);
      if (!config) {
        return new Response('Provider not configured', { status: 400 });
      }

      // Extract payload and signature
      const body = await request.text();
      const signature = request.headers.get(config.signatureHeader);
      
      if (!signature) {
        return new Response('Missing signature header', { status: 400 });
      }

      // Verify webhook signature
      const isValidSignature = await this.verifySignature(config, body, signature);
      if (!isValidSignature) {
        console.warn(`Invalid webhook signature from ${providerId}`, { requestId });
        return new Response('Invalid signature', { status: 401 });
      }

      // Parse and validate payload
      let payload;
      try {
        payload = JSON.parse(body);
      } catch (error) {
        return new Response('Invalid JSON payload', { status: 400 });
      }

      // Create webhook event
      const webhookEvent: WebhookEvent = {
        id: requestId,
        providerId,
        eventType: payload.type || payload.event_type,
        payload,
        signature,
        timestamp: new Date(),
        processed: false,
        attempts: 0
      };

      // Validate event type
      if (!config.eventTypes.includes(webhookEvent.eventType)) {
        console.info(`Ignoring webhook event type: ${webhookEvent.eventType}`, { requestId, providerId });
        return new Response('Event type not supported', { status: 200 });
      }

      // Store event for processing
      await this.storeWebhookEvent(webhookEvent);

      // Process event asynchronously
      setImmediate(() => this.processWebhookEvent(webhookEvent));

      // Log successful receipt
      console.info(`Webhook received from ${providerId}`, {
        requestId,
        eventType: webhookEvent.eventType,
        duration: Date.now() - startTime
      });

      return new Response('Webhook received', { status: 200 });

    } catch (error) {
      console.error(`Webhook processing error for ${providerId}:`, {
        requestId,
        error: error.message,
        duration: Date.now() - startTime
      });

      return new Response('Internal server error', { status: 500 });
    }
  }

  private async verifySignature(config: WebhookConfig, payload: string, signature: string): Promise<boolean> {
    let expectedSignature: string;

    switch (config.signatureFormat) {
      case 'hmac-sha256':
        expectedSignature = createHmac('sha256', config.secret).update(payload).digest('hex');
        break;
      case 'sha256':
        expectedSignature = createHash('sha256').update(payload + config.secret).digest('hex');
        break;
      case 'sha1':
        expectedSignature = createHash('sha1').update(payload + config.secret).digest('hex');
        break;
      default:
        return false;
    }

    // Handle different signature formats
    const normalizedSignature = signature.replace(/^(sha256=|sha1=)/, '');
    return normalizedSignature === expectedSignature;
  }

  private async processWebhookEvent(event: WebhookEvent): Promise<void> {
    const processor = this.eventProcessors.get(`${event.providerId}.${event.eventType}`);
    
    if (!processor) {
      console.warn(`No processor found for ${event.providerId}.${event.eventType}`, { eventId: event.id });
      return;
    }

    const config = this.webhookConfigs.get(event.providerId)!;
    let attempt = 0;

    while (attempt < config.retryPolicy.maxAttempts) {
      try {
        attempt++;
        event.attempts = attempt;

        // Process the event
        await processor(event.payload, {
          eventId: event.id,
          providerId: event.providerId,
          eventType: event.eventType,
          attempt
        });

        // Mark as processed
        event.processed = true;
        await this.updateWebhookEvent(event);

        console.info(`Webhook event processed successfully`, {
          eventId: event.id,
          providerId: event.providerId,
          eventType: event.eventType,
          attempt
        });

        return;

      } catch (error) {
        event.lastError = error.message;
        await this.updateWebhookEvent(event);

        console.error(`Webhook event processing failed`, {
          eventId: event.id,
          providerId: event.providerId,
          eventType: event.eventType,
          attempt,
          error: error.message
        });

        if (attempt < config.retryPolicy.maxAttempts) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, config.retryPolicy.backoffMs * attempt));
        } else {
          // Send to dead letter queue
          await this.sendToDeadLetterQueue(event, config.retryPolicy.deadLetterQueue);
        }
      }
    }
  }

  private registerEventProcessors(): void {
    // Stripe payment processors
    this.eventProcessors.set('stripe.payment_intent.succeeded', async (payload, context) => {
      await this.processPaymentSuccess(payload, context);
    });

    this.eventProcessors.set('stripe.payment_intent.failed', async (payload, context) => {
      await this.processPaymentFailure(payload, context);
    });

    // Supplier platform processors
    this.eventProcessors.set('supplier_platform.booking.confirmed', async (payload, context) => {
      await this.processBookingConfirmation(payload, context);
    });

    this.eventProcessors.set('supplier_platform.availability.updated', async (payload, context) => {
      await this.processAvailabilityUpdate(payload, context);
    });

    // Email provider processors
    this.eventProcessors.set('email_provider.email.delivered', async (payload, context) => {
      await this.processEmailDelivered(payload, context);
    });
  }

  private async processPaymentSuccess(payload: any, context: any): Promise<void> {
    // Wedding-specific payment processing
    const weddingId = payload.metadata?.wedding_id;
    const supplierId = payload.metadata?.supplier_id;
    const paymentAmount = payload.amount;

    // Update wedding budget and payment status
    await this.updateWeddingPaymentStatus(weddingId, supplierId, 'completed', paymentAmount);
    
    // Send confirmation to couple and supplier
    await this.sendPaymentConfirmation(weddingId, supplierId, paymentAmount);
    
    // Update supplier availability if final payment
    if (payload.metadata?.payment_type === 'final') {
      await this.updateSupplierBookingStatus(supplierId, weddingId, 'confirmed');
    }
  }
}
```

### 3. Service Mesh Communication
```typescript
// /wedsync/src/middleware/service-mesh.ts
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';

interface ServiceRegistration {
  serviceId: string;
  serviceName: string;
  version: string;
  endpoints: string[];
  healthCheck: string;
  metadata: Record<string, any>;
  lastHeartbeat: Date;
  status: 'healthy' | 'degraded' | 'unhealthy';
}

interface MessagePayload {
  messageId: string;
  fromService: string;
  toService: string;
  eventType: string;
  data: any;
  timestamp: Date;
  priority: 'high' | 'normal' | 'low';
  retryCount: number;
  maxRetries: number;
}

export class ServiceMesh extends EventEmitter {
  private redis: Redis;
  private services: Map<string, ServiceRegistration>;
  private messageQueues: Map<string, MessagePayload[]>;

  constructor() {
    super();
    this.redis = new Redis(process.env.REDIS_URL!);
    this.services = new Map();
    this.messageQueues = new Map();
    this.initializeServiceMesh();
  }

  private async initializeServiceMesh(): Promise<void> {
    // Subscribe to service registration events
    await this.redis.subscribe('service:register', 'service:deregister', 'service:heartbeat');
    
    this.redis.on('message', async (channel, message) => {
      await this.handleServiceEvent(channel, JSON.parse(message));
    });

    // Start health monitoring
    setInterval(() => this.monitorServiceHealth(), 30000);
    
    // Start message processing
    setInterval(() => this.processMessageQueues(), 1000);
  }

  async registerService(registration: Omit<ServiceRegistration, 'lastHeartbeat' | 'status'>): Promise<void> {
    const serviceRegistration: ServiceRegistration = {
      ...registration,
      lastHeartbeat: new Date(),
      status: 'healthy'
    };

    this.services.set(registration.serviceId, serviceRegistration);
    
    await this.redis.publish('service:register', JSON.stringify(serviceRegistration));
    
    console.info(`Service registered: ${registration.serviceName}`, {
      serviceId: registration.serviceId,
      version: registration.version,
      endpoints: registration.endpoints
    });
  }

  async sendMessage(message: Omit<MessagePayload, 'messageId' | 'timestamp' | 'retryCount'>): Promise<void> {
    const fullMessage: MessagePayload = {
      ...message,
      messageId: crypto.randomUUID(),
      timestamp: new Date(),
      retryCount: 0
    };

    // Add to appropriate queue based on priority
    const queueKey = `${message.toService}:${message.priority}`;
    
    if (!this.messageQueues.has(queueKey)) {
      this.messageQueues.set(queueKey, []);
    }
    
    this.messageQueues.get(queueKey)!.push(fullMessage);
    
    // Store in Redis for persistence
    await this.redis.lpush(`message_queue:${queueKey}`, JSON.stringify(fullMessage));
    
    // Emit event for immediate processing if service is online
    const targetService = this.services.get(message.toService);
    if (targetService && targetService.status === 'healthy') {
      this.emit('message', fullMessage);
    }
  }

  private async processMessageQueues(): Promise<void> {
    for (const [queueKey, messages] of this.messageQueues) {
      if (messages.length === 0) continue;

      const [serviceId] = queueKey.split(':');
      const targetService = this.services.get(serviceId);

      if (!targetService || targetService.status !== 'healthy') {
        continue; // Skip processing if service is not healthy
      }

      // Process messages in order
      const message = messages.shift();
      if (message) {
        try {
          await this.deliverMessage(message, targetService);
          
          // Remove from Redis queue
          await this.redis.lrem(`message_queue:${queueKey}`, 1, JSON.stringify(message));
          
        } catch (error) {
          message.retryCount++;
          
          if (message.retryCount < message.maxRetries) {
            // Put back in queue for retry
            messages.unshift(message);
            console.warn(`Message delivery failed, retrying: ${message.messageId}`, {
              error: error.message,
              retryCount: message.retryCount
            });
          } else {
            // Send to dead letter queue
            await this.sendToDeadLetterQueue(message);
            console.error(`Message failed after max retries: ${message.messageId}`, {
              fromService: message.fromService,
              toService: message.toService,
              eventType: message.eventType
            });
          }
        }
      }
    }
  }

  async routeWeddingEvent(weddingId: string, eventType: string, eventData: any): Promise<void> {
    const weddingEventMessage = {
      fromService: 'wedding-coordinator',
      toService: 'notification-service',
      eventType: `wedding.${eventType}`,
      data: {
        weddingId,
        eventType,
        ...eventData,
        timestamp: new Date().toISOString()
      },
      priority: 'normal' as const,
      maxRetries: 3
    };

    await this.sendMessage(weddingEventMessage);

    // Also route to analytics service for wedding insights
    const analyticsMessage = {
      fromService: 'wedding-coordinator',
      toService: 'analytics-service',
      eventType: 'wedding.analytics.event',
      data: {
        weddingId,
        eventType,
        ...eventData,
        timestamp: new Date().toISOString()
      },
      priority: 'low' as const,
      maxRetries: 1
    };

    await this.sendMessage(analyticsMessage);
  }
}
```

## IMPLEMENTATION EVIDENCE REQUIRED

### 1. Integration Gateway Verification
- [ ] Demonstrate successful third-party API calls through the gateway
- [ ] Show circuit breaker functionality during service failures
- [ ] Verify rate limiting enforcement per service
- [ ] Test authentication handling for different auth types
- [ ] Evidence of service health monitoring and failover
- [ ] Document response normalization across different APIs

### 2. Webhook Processing Validation
- [ ] Verify webhook signature validation for all configured providers
- [ ] Test event processing and retry mechanisms
- [ ] Show dead letter queue handling for failed webhooks
- [ ] Demonstrate real-time event streaming to clients
- [ ] Evidence of proper webhook event storage and retrieval
- [ ] Test wedding-specific webhook event processing

### 3. Service Communication Testing
- [ ] Verify service registration and discovery
- [ ] Test message queue processing with different priorities
- [ ] Show service health monitoring and automatic failover
- [ ] Demonstrate wedding event routing between services
- [ ] Evidence of message persistence and retry handling
- [ ] Test inter-service communication patterns

## SUCCESS METRICS

### Technical Metrics
- **Integration Uptime**: >99.9% availability across all third-party services
- **Webhook Processing**: <200ms average processing time, 100% signature verification
- **Service Mesh**: <50ms inter-service communication latency
- **Circuit Breaker**: Automatic recovery within 30 seconds of service restoration
- **Message Processing**: 99.99% message delivery success rate

### Wedding Business Metrics
- **Payment Processing**: 100% payment webhook reliability during peak wedding season
- **Supplier Integration**: Real-time availability updates with <5 second latency
- **Communication Flow**: Seamless message routing between couples, suppliers, and coordinators
- **Event Processing**: Handle 10,000+ concurrent wedding events during peak periods

## SEQUENTIAL THINKING REQUIRED

Use `mcp__sequential-thinking__sequential_thinking` to work through:

1. **Integration Architecture Planning**
   - Analyze third-party API requirements and constraints
   - Design service discovery and load balancing strategies
   - Plan circuit breaker and fallback mechanisms

2. **Webhook Security Analysis**
   - Evaluate signature verification approaches
   - Design retry and dead letter queue strategies
   - Plan event routing and processing workflows

3. **Service Mesh Design**
   - Analyze inter-service communication patterns
   - Design message queuing and prioritization
   - Plan service health monitoring and failover

4. **Wedding Event Flow Optimization**
   - Map wedding-specific integration touchpoints
   - Design real-time event processing pipelines
   - Plan seasonal load balancing and scaling

Remember: Your integration middleware must handle the complexity of wedding coordination while maintaining high reliability and performance. Every integration point is critical to the wedding experience and cannot afford failures.