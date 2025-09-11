# Tech Stack Documentation

## Core Technologies

### Frontend Framework
```yaml
Framework: Next.js 15.4.3
- App Router for server components
- Server Actions for forms
- Parallel & Intercepting Routes
- Built-in API routes
- Image optimization
- Font optimization

React: 19.1.0
- Server Components
- Use hooks (use, useFormStatus)
- Concurrent features
- Suspense boundaries

TypeScript: 5.x
- Strict mode enabled
- Path aliases configured
- Type-safe API calls
UI & Styling
yamlUI Components: Untitled UI + Magic UI
- Untitled UI: Professional design system
- Magic UI: Animation and interaction enhancements  
- Fully accessible (WCAG 2.1 AA)
- TypeScript support

Styling: Tailwind CSS 4.1.11
- JIT compilation
- Custom design tokens
- Responsive utilities
- Dark mode support
- Animation utilities

Icons: Lucide React
- Tree-shakeable
- TypeScript support
- 1000+ icons

Additional UI:
- Framer Motion: Animations
- React Hook Form: Form management
- Zod: Schema validation
- date-fns: Date manipulation
State Management
yamlClient State: Zustand
- Simple API
- TypeScript support
- DevTools integration
- Persist middleware

Server State: TanStack Query (React Query)
- Caching
- Background refetching
- Optimistic updates
- Infinite queries

Form State: React Hook Form + Zod
- Performance optimized
- Built-in validation
- TypeScript integration
Database & Backend
yamlDatabase: Supabase (PostgreSQL 15)
- Row Level Security (RLS)
- Real-time subscriptions
- Built-in auth
- File storage
- Edge functions
- Vector embeddings (pgvector)

ORM/Query Builder: Supabase Client
- Type-safe queries
- Real-time subscriptions
- Auth integration
- Storage integration
Authentication
yamlProvider: Supabase Auth
- Email/password
- Magic links
- OAuth providers (Google, etc.)
- Session management
- MFA support
- Row Level Security integration
Real-time Features
yamlWebSockets: Supabase Realtime
- Presence
- Broadcast
- Database changes
- Low latency

Server-Sent Events: For progress updates
- Form submissions
- Journey execution
- Import progress
AI & Machine Learning
yamlOpenAI API:
- GPT-4 for form generation
- GPT-3.5 for cost-effective tasks
- Embeddings for search
- Vision API for PDF/image parsing

Vector Database: pgvector
- Semantic search
- Content similarity
- FAQ matching
File Handling
yamlStorage: Supabase Storage
- Image uploads
- Document storage
- Direct URL access
- Access policies

Processing:
- Sharp: Image optimization
- PDF.js: PDF parsing
- Papa Parse: CSV parsing
- ExcelJS: Excel file handling
Email & Communications
yamlTransactional Email: Resend
- React Email templates
- Reliable delivery
- Webhook events
- Domain verification

SMS/WhatsApp: Twilio (Client API key)
- SMS sending
- WhatsApp Business API
- Delivery tracking
- Phone number validation
Payments
yamlProvider: Stripe
- Subscription management
- Payment processing
- Webhook handling
- Customer portal
- Usage-based billing
Search & Autocomplete
yamlFull-text Search: PostgreSQL
- tsvector for text search
- Trigram similarity
- GIN indexes

Autocomplete:
- Google Places API: Venue search
- Algolia (optional): Instant search
- Fuse.js: Client-side fuzzy search
Analytics & Monitoring
yamlError Tracking: Sentry
- Error capture
- Performance monitoring
- Release tracking
- User feedback

Analytics: PostHog
- Event tracking
- User identification
- Funnel analysis
- Feature flags

Logging: Axiom
- Structured logging
- Log aggregation
- Search and filtering
Development Tools
yamlPackage Manager: pnpm
- Faster installs
- Disk space efficient
- Workspace support

Code Quality:
- ESLint: Linting
- Prettier: Formatting
- Husky: Git hooks
- Commitlint: Commit standards

Testing:
- Vitest: Unit tests
- Playwright: E2E tests
- MSW: API mocking
- Testing Library: Component tests
Build & Deploy
yamlHosting: Vercel
- Edge functions
- Automatic deployments
- Preview deployments
- Analytics
- Web vitals monitoring

CI/CD: GitHub Actions
- Automated testing
- Type checking
- Linting
- Deployment triggers

Container Registry: Docker Hub
- Development containers
- Consistent environments
Package Dependencies
Core Dependencies
json{
  "dependencies": {
    // Framework
    "next": "15.4.3",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    
    // Database & Auth
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/ssr": "^0.5.0",
    
    // UI Components
    "@headlessui/react": "^2.0.0",
    "tailwindcss": "4.1.11",
    "lucide-react": "^0.400.0",
    "framer-motion": "^11.0.0",
    
    // Forms & Validation
    "react-hook-form": "^7.50.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",
    
    // State Management
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.20.0",
    
    // Drag & Drop
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.0",
    
    // Date & Time
    "date-fns": "^3.0.0",
    "react-day-picker": "^8.10.0",
    
    // File Processing
    "papaparse": "^5.4.0",
    "exceljs": "^4.4.0",
    "pdf-parse": "^1.1.1",
    "sharp": "^0.33.0",
    
    // Communications
    "@react-email/components": "^0.0.15",
    "resend": "^3.0.0",
    
    // Payments
    "stripe": "^14.0.0",
    
    // AI
    "openai": "^4.25.0",
    
    // Utils
    "clsx": "^2.1.0",
    "class-variance-authority": "^0.7.0",
    "nanoid": "^5.0.0",
    "slugify": "^1.6.0"
  }
}
Dev Dependencies
json{
  "devDependencies": {
    // TypeScript
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    
    // Testing
    "vitest": "^1.2.0",
    "@playwright/test": "^1.40.0",
    "@testing-library/react": "^14.0.0",
    "msw": "^2.0.0",
    
    // Code Quality
    "eslint": "^8.56.0",
    "eslint-config-next": "^14.0.0",
    "prettier": "^3.2.0",
    "husky": "^9.0.0",
    
    // Development
    "@types/papaparse": "^5.3.0",
    "dotenv": "^16.0.0"
  }
}
Environment Variables
Required Variables
bash# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

# External APIs
OPENAI_API_KEY=
RESEND_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
GOOGLE_MAPS_API_KEY=

# Storage
NEXT_PUBLIC_SUPABASE_STORAGE_URL=

# Monitoring
SENTRY_DSN=
POSTHOG_API_KEY=
AXIOM_API_KEY=

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_CHAT=true
Project Structure
wedsync/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth routes
│   ├── (dashboard)/         # Protected routes
│   │   ├── supplier/        # Supplier dashboard
│   │   └── couple/          # Couple dashboard
│   ├── api/                 # API routes
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── ui/                  # Base UI components
│   ├── forms/               # Form components
│   ├── dashboard/           # Dashboard components
│   └── journey/             # Journey builder
├── lib/                     # Utilities
│   ├── supabase/           # Database client
│   ├── api/                # API helpers
│   ├── hooks/              # Custom hooks
│   └── utils/              # Helper functions
├── styles/                  # Global styles
├── public/                  # Static assets
├── types/                   # TypeScript types
└── __tests__/              # Test files
Performance Optimization
Build Optimization
javascript// next.config.js
module.exports = {
  images: {
    domains: ['supabase.storage'],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@headlessui/react'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}
Bundle Size Targets

First Load JS: <100kB
Per-route JS: <50kB
CSS: <50kB
Images: WebP/AVIF with fallbacks

Performance Metrics

Lighthouse Score: >90
Core Web Vitals:

LCP: <2.5s
FID: <100ms
CLS: <0.1



Security Configuration
Content Security Policy
javascript// middleware.ts
const csp = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'connect-src': ["'self'", 'https://api.openai.com', 'wss://'],
}
Security Headers

X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=()

Development Workflow
Local Setup
bash# Clone repository
git clone https://github.com/wedsync/platform

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.local

# Run migrations
pnpm supabase:migrate

# Start development
pnpm dev
Git Workflow

Feature branches: feature/form-builder
Bug fixes: fix/navigation-issue
Releases: release/v1.2.0
Commit convention: Conventional Commits

Testing Strategy

Unit tests: 80% coverage target
Integration tests: Critical paths
E2E tests: User journeys
Performance tests: Core Web Vitals