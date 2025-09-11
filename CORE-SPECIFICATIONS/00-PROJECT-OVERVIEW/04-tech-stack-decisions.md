# 04-tech-stack-decisions

# Tech Stack Decisions

## Core Technology Choices

### Frontend Framework: Next.js 15.4.3

**Why Next.js:**

- **App Router**: Modern React patterns with server components
- **Performance**: Built-in optimizations for Core Web Vitals
- **SEO**: Server-side rendering critical for directory features
- **Developer Experience**: Hot reload, TypeScript support, great tooling
- **Vercel Integration**: Seamless deployment and edge functions

**Implementation Notes:**

```
// App structure for both platforms
/apps/
  /wedsync/       # Supplier platform
    /app/         # App router pages
    /components/  # Supplier-specific components
  /wedme/         # Couple platform  
    /app/         # App router pages
    /components/  # Couple-specific components
  /shared/        # Shared components and utilities
```

### UI Framework: React 19.1.0 + TypeScript 5

**Why This Combination:**

- **React 19**: Latest features including Suspense improvements
- **TypeScript**: Type safety prevents runtime errors
- **Component Patterns**: Composable, reusable architecture
- **Ecosystem**: Vast library support

### Database: Supabase (PostgreSQL)

**Why Supabase:**

- **PostgreSQL**: Battle-tested, ACID compliant
- **Real-time**: WebSocket subscriptions built-in
- **Auth**: Complete authentication solution included
- **Row Level Security**: Database-level data isolation
- **Storage**: File handling integrated
- **Open Source**: No vendor lock-in

**Critical Features We Use:**

```
-- Real-time subscriptions
ALTER TABLE core_fields REPLICA IDENTITY FULL;

-- JSONB for flexible vendor data
CREATE TABLE forms (
  structure JSONB NOT NULL,
  core_field_mappings JSONB
);

-- Full-text search for FAQs
CREATE INDEX idx_articles_search ON articles 
USING gin(to_tsvector('english', title || ' ' || content));
```

### Styling: Tailwind CSS 4.1.11

**Why Tailwind:**

- **Utility-First**: Rapid UI development
- **Performance**: Minimal CSS bundle
- **Responsive**: Mobile-first breakpoints
- **Customization**: Theme configuration for branding
- **DX**: Excellent IDE support

### Component Library: Untitled UI + Magic UI

**Why This Combination:**

- **Untitled UI**: Professional design system with Figma-to-code workflow
- **Magic UI**: Advanced animations and interactions 
- **Accessibility First**: WCAG 2.1 AA compliant components
- **Tailwind-Based**: Perfect integration with Tailwind CSS
- **Modern**: Latest design patterns and React 19 compatibility

### State Management: Zustand + React Query

**Why This Combination:**

- **Zustand**: Simple client state management
- **React Query**: Server state and caching
- **No Boilerplate**: Unlike Redux
- **TypeScript**: Full type inference

```
// Example store structure
interface JourneyStore {
  journey: Journey | null
  nodes: TimelineNode[]
  addNode: (node: TimelineNode) => void
  updateNode: (id: string, updates: Partial<TimelineNode>) => void
}
```

### Form Handling: React Hook Form + Zod

**Why This Stack:**

- **Performance**: Uncontrolled components
- **Validation**: Schema-based with Zod
- **DX**: Excellent TypeScript support
- **Features**: Built-in error handling

### Drag & Drop: @dnd-kit

**Why dnd-kit:**

- **Modern**: Actively maintained (unlike react-beautiful-dnd)
- **Accessible**: Keyboard support built-in
- **Performance**: Uses CSS transforms
- **Flexible**: Multiple sensor types
- **Lightweight**: ~10kb core

### AI Integration: OpenAI API

**Why OpenAI:**

- **GPT-4**: Best accuracy for form understanding
- **Vision API**: PDF/image analysis
- **Structured Output**: JSON mode for reliability
- **Cost Control**: Usage-based pricing

### Email Service: Resend

**Why Resend:**

- **Developer-Focused**: Great API design
- **React Email**: Component-based templates
- **Deliverability**: High inbox rates
- **Analytics**: Built-in tracking

### SMS/WhatsApp: Twilio

**Why Twilio:**

- **Reliability**: Industry standard
- **Global Reach**: Works worldwide
- **WhatsApp Business**: Official API
- **Programmable**: Flexible webhooks

### Payment Processing: Stripe

**Why Stripe:**

- **Subscriptions**: Built-in SaaS billing
- **Developer Experience**: Best-in-class API
- **Global**: Multi-currency support
- **Portal**: Customer self-service

### Monitoring: Sentry + Vercel Analytics

**Why This Combination:**

- **Error Tracking**: Sentry for exceptions
- **Performance**: Vercel for Web Vitals
- **User Analytics**: Privacy-focused metrics
- **Alerting**: Immediate issue notification

### Testing: Playwright + Vitest

**Why These Tools:**

- **E2E Testing**: Playwright for user flows
- **Unit Testing**: Vitest for components
- **Speed**: Vitest is blazing fast
- **Cross-Browser**: Playwright tests all browsers

## Technology Decisions NOT Made

### What We're NOT Using and Why:

**GraphQL**: REST is simpler, meets our needs

**Redux**: Zustand is lighter, less boilerplate

**MongoDB**: PostgreSQL better for relational data

**AWS**: Vercel/Supabase simpler for small team

**Kubernetes**: Overkill for current scale

**Microservices**: Monolith simpler to maintain

## Migration Path for Scale

### When We Hit 10,000+ Users:

1. **Database**: Add read replicas
2. **Caching**: Introduce Redis layer
3. **CDN**: Expand edge caching
4. **Search**: Move to Elasticsearch
5. **Queue**: Add job queue (BullMQ)

### When We Hit 100,000+ Users:

1. **Microservices**: Split critical services
2. **Multi-Region**: Geographic distribution
3. **Data Lake**: Analytics infrastructure
4. **ML Pipeline**: Custom AI models

## Development Environment

### Required Tools:

```
# Core requirements
Node.js 20+
pnpm (package manager)
PostgreSQL 15+
Git

# CLI tools
Supabase CLI
Vercel CLI
Stripe CLI (for webhooks)
```

### Environment Variables:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
```

## Performance Targets

### Core Web Vitals:

- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1

### Application Metrics:

- **Time to Interactive**: < 3s
- **API Response**: < 200ms (p95)
- **Database Query**: < 50ms (p95)

## Security Considerations

### Built-In Security:

1. **SQL Injection**: Parameterized queries
2. **XSS**: React escaping + CSP headers
3. **CSRF**: SameSite cookies
4. **Auth**: JWT with refresh tokens
5. **Encryption**: TLS everywhere + at-rest encryption

## Cost Analysis

### Monthly Infrastructure Costs (Estimated):

- **Vercel**: $20 (Pro plan initially)
- **Supabase**: $25 (Pro plan initially)
- **OpenAI**: $50-200 (usage-based)
- **Twilio**: $20-100 (usage-based)
- **Stripe**: 2.9% + 30¢ per transaction
- **Total**: ~$200-400/month initially

### Scaling Costs:

At 1,000 paying users ($49 average):

- Revenue: $49,000/month
- Infrastructure: ~$2,000/month
- Margin: 96%

This tech stack provides the perfect balance of developer productivity, performance, and scalability for WedSync/WedMe's current needs while maintaining flexibility for future growth.