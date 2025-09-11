# WebSocket Architecture Documentation

## Overview

WedSync's WebSocket infrastructure provides real-time communication for wedding coordination workflows. Built on Supabase Realtime with PostgreSQL change streams, it enables photographers, venues, and couples to coordinate seamlessly across multiple wedding events.

## Core Architecture

### RealtimeSubscriptionManager

**Location**: `/src/lib/realtime/RealtimeSubscriptionManager.ts`

The `RealtimeSubscriptionManager` is a singleton pattern providing centralized WebSocket channel management with performance optimization for wedding industry workflows.

#### Key Features
- **Singleton Pattern**: Single instance manages all connections
- **Channel Isolation**: Cross-wedding message isolation prevents coordination disasters
- **Performance Optimized**: Sub-200ms channel switching, 500+ concurrent connections
- **Memory Efficient**: <50MB per 100 connections
- **Auto-reconnection**: Handles network disruptions at wedding venues

#### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Wedding Coordination Layer                   │
├─────────────────────────────────────────────────────────────────┤
│  Photographer Dashboard  │  Venue Coordinator  │  Couple Portal │
├─────────────────────────────────────────────────────────────────┤
│                RealtimeSubscriptionManager                     │
├─────────────────────────────────────────────────────────────────┤
│              Supabase Realtime WebSocket Layer                 │
├─────────────────────────────────────────────────────────────────┤
│                  PostgreSQL Change Streams                     │
└─────────────────────────────────────────────────────────────────┘
```

### Channel Types

#### WeddingChannelType Enumeration
- `supplier_dashboard`: Photographer/supplier real-time updates
- `couple_portal`: Couple communication and progress tracking  
- `venue_coordination`: Venue management and logistics
- `guest_rsvp`: Guest response and seating management
- `form_responses`: Real-time form submission handling
- `notifications`: System-wide notification broadcasts

### Wedding Industry Context

#### Multi-Wedding Photographer Scenario
A single photographer managing 15+ simultaneous wedding channels:
- **Channel Isolation**: Messages from Wedding A never leak to Wedding B
- **Performance SLA**: <200ms channel switching between wedding dashboards
- **Concurrent Load**: 500+ guests + suppliers connected simultaneously
- **Peak Traffic**: Wedding season demands 10x normal capacity

#### Venue Coordinator Broadcasts
Large venues coordinating multiple events:
- **Multi-room Management**: Separate channels per ceremony/reception space
- **Supplier Coordination**: Real-time updates to photographers, florists, caterers
- **Emergency Protocols**: Instant broadcast to all wedding stakeholders

## Performance Specifications

### Connection Metrics
- **Concurrent Connections**: 500+ validated in load testing
- **Channel Switch Time**: <200ms target, <500ms maximum
- **Message Throughput**: 10,000+ messages per minute during peak
- **Memory Usage**: <50MB per 100 connections
- **Network Efficiency**: Message batching and compression

### Reliability Requirements
- **Uptime**: 99.9% availability (wedding days are sacred)
- **Auto-reconnection**: <3 second recovery from network disruption
- **Message Persistence**: Offline message queuing and replay
- **Data Integrity**: Zero message loss during critical wedding coordination

## Security Architecture

### Authentication Layer
- **Supabase Auth Integration**: Row Level Security (RLS) enforcement
- **JWT Token Validation**: All WebSocket connections authenticated
- **Organization Isolation**: Users only access their organization's data
- **Role-based Access**: Photographer/venue/couple permission boundaries

### Cross-Wedding Isolation
```typescript
interface EnhancedRealtimeSubscriptionParams {
  organizationId: string;    // Organization boundary
  userId: string;           // User permission scope
  channelName: string;      // Unique channel identifier
  channelType: WeddingChannelType; // Type-based access control
  weddingId?: string;       // Wedding-specific isolation
}
```

### Attack Vector Mitigation
- **Channel Injection Prevention**: Strict channel name validation
- **Message Authentication**: All messages verified against user permissions
- **Rate Limiting**: Per-user and per-channel message rate limits
- **Input Sanitization**: All message payloads validated and sanitized

## Scalability Design

### Horizontal Scaling
- **Load Balancing**: Multiple Supabase realtime instances
- **Geographic Distribution**: Regional deployment for global wedding coordination
- **Auto-scaling**: Wedding season traffic patterns trigger capacity increases

### Database Optimization
- **Connection Pooling**: PostgreSQL connection efficiency
- **Index Strategy**: Optimized queries for real-time change streams  
- **Partitioning**: Large wedding datasets partitioned by date/organization

## Error Handling & Recovery

### Connection Resilience
- **Network Interruption**: Automatic reconnection with exponential backoff
- **Venue WiFi Issues**: Graceful degradation to offline mode
- **Server Maintenance**: Transparent failover to backup instances

### Message Delivery Guarantees
- **At-least-once Delivery**: Critical wedding coordination messages
- **Duplicate Detection**: Idempotent message processing
- **Offline Queue**: Messages queued during network outages

## Integration Points

### External Systems
- **CRM Webhooks**: Photography CRM integration (Tave, Light Blue)
- **WhatsApp Business API**: Guest communication workflows
- **Email Systems**: Resend integration for notification fallbacks
- **Calendar Systems**: Google Calendar synchronization

### Internal Components  
- **Form Builder**: Real-time form response handling
- **Payment Processing**: Stripe webhook integration
- **File Storage**: Supabase Storage for photo/document sharing
- **Analytics**: Real-time metrics and business intelligence

## Monitoring & Observability

### Key Metrics
- **Connection Count**: Active WebSocket connections per wedding
- **Message Latency**: End-to-end message delivery time
- **Error Rates**: Connection failures and message drops
- **Memory Usage**: Per-connection and total memory consumption

### Alerting Thresholds
- **High Latency**: >500ms message delivery
- **Connection Drops**: >5% connection failure rate
- **Memory Leaks**: Memory usage growth >20% per hour
- **Saturday Alerts**: Zero-tolerance during wedding days

## Future Architecture Considerations

### Enhanced Features
- **Video Streaming**: Live ceremony streaming integration
- **Advanced Analytics**: Real-time wedding coordination insights
- **AI Integration**: Intelligent message routing and prioritization
- **Mobile Optimization**: Native WebSocket handling for mobile apps

### Performance Improvements
- **Message Compression**: Reduce bandwidth usage
- **Connection Multiplexing**: Efficient connection reuse
- **Edge Caching**: Geographic message caching for global weddings
- **Predictive Scaling**: AI-driven capacity planning for wedding season