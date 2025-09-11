# WedSync Complete Tech Stack
*Updated: January 13, 2025*

## ✅ All Packages Installed & Updated

Your tech stack is now complete with all dependencies mentioned in your documentation installed and up-to-date.

## Core Dependencies

### Framework & Runtime
```json
"next": "15.4.6"           // Latest Next.js with App Router
"react": "19.1.1"          // Latest React 19
"react-dom": "19.1.1"      // Latest React DOM
"typescript": "5.9.2"      // Latest TypeScript
```

### State Management
```json
"zustand": "5.0.7"                    // Simple state management
"@tanstack/react-query": "5.85.0"    // Server state & caching
"react-hook-form": "7.62.0"          // Form state management
```

### UI & Styling
```json
"tailwindcss": "4.1.11"              // Tailwind v4 Alpha
"@tailwindcss/forms": "0.5.10"       // Form styling
"@headlessui/react": "2.2.7"         // Headless components
"@heroicons/react": "2.2.0"          // Icon library
"lucide-react": "0.539.0"            // Additional icons
"motion": "12.23.12"                 // Animation (lighter Framer Motion)
"clsx": "2.1.1"                      // Conditional classes
"tailwind-merge": "3.3.1"            // Merge Tailwind classes
"class-variance-authority": "0.7.1"  // Component variants
```

### Backend & Database
```json
"@supabase/supabase-js": "2.55.0"    // Supabase client
"@supabase/ssr": "0.6.1"             // SSR support
```

### AI & Machine Learning
```json
"openai": "5.12.2"                   // OpenAI API (GPT-4, embeddings)
```

### Communications
```json
"resend": "6.0.1"                    // Email service
"@react-email/components": "0.5.0"   // Email templates
"@react-email/render": "1.2.0"       // Email rendering
```

### Payments
```json
"stripe": "18.4.0"                   // Payment processing
```

### File Processing
```json
"sharp": "0.34.3"                    // Image processing
"papaparse": "5.5.3"                 // CSV parsing
"exceljs": "4.4.0"                   // Excel file handling
```

### Drag & Drop
```json
"@dnd-kit/core": "6.3.1"             // Drag and drop core
"@dnd-kit/sortable": "10.0.0"        // Sortable lists
"@dnd-kit/utilities": "3.2.2"        // DnD utilities
```

### Forms & Validation
```json
"zod": "4.0.17"                      // Schema validation
"@hookform/resolvers": "5.2.1"       // Form validation resolvers
```

### Utilities
```json
"date-fns": "4.1.0"                  // Date manipulation
"nanoid": "5.1.5"                    // ID generation
"slugify": "1.6.6"                   // URL slug creation
```

### Analytics & Monitoring
```json
"@vercel/speed-insights": "1.2.0"    // Performance monitoring
```

## Development Dependencies

### Testing
```json
"@playwright/test": "1.54.2"         // E2E testing
"@testing-library/react": "16.3.0"   // Component testing
"@testing-library/jest-dom": "6.6.4" // Jest DOM matchers
"@testing-library/user-event": "14.6.1"
"jest": "30.0.5"                     // Unit testing
"jest-environment-jsdom": "30.0.5"   // Browser environment
"msw": "2.10.4"                      // API mocking
```

### Linting & Formatting
```json
"eslint": "9.33.0"                   // Linting
"eslint-config-next": "15.4.6"       // Next.js ESLint config
```

### Type Definitions
```json
"@types/node": "20.19.10"            // Node types
"@types/react": "19.1.10"            // React types
"@types/react-dom": "19.1.7"         // React DOM types
"@types/jest": "30.0.0"              // Jest types
"@types/papaparse": "5.3.16"         // Papaparse types
```

## Package Installation Notes

### Peer Dependency Conflicts
Some packages have peer dependency conflicts (notably OpenAI requiring Zod v3 while we use v4). These were installed with `--legacy-peer-deps` flag. This shouldn't cause issues in practice.

### Deprecated Warnings
Sharp installation may show deprecated warnings for some dependencies (glob, rimraf). These are dependencies of Sharp itself and don't affect functionality.

## Environment Variables Required

Based on installed packages, ensure these are configured in `.env.local`:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI (Required for AI features)
OPENAI_API_KEY=

# Resend (Required for email)
RESEND_API_KEY=

# Stripe (Required for payments)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=WedSync
```

## Quick Commands

### Check for Updates
```bash
npm outdated
```

### Update All Packages
```bash
npm update --legacy-peer-deps
```

### Run Development Server
```bash
npm run dev
```

### Run Type Checking
```bash
npm run typecheck
```

### Run Tests
```bash
npm test
```

## Documentation Priority

With all packages installed, focus on learning:

1. **React 19 Patterns**
   - Server Components
   - Server Actions
   - New `use` hook
   - Ref as prop

2. **Next.js 15 Features**
   - App Router best practices
   - Turbopack optimization
   - Partial prerendering

3. **Tailwind v4 Alpha**
   - New configuration format
   - Lightning CSS benefits
   - Performance improvements

4. **Integration Patterns**
   - Supabase with Server Components
   - OpenAI streaming responses
   - Stripe webhook handling
   - React Email templates

## Package Versions Summary

All packages are at their latest stable versions as of January 13, 2025, except:
- `@types/node` kept at v20 to match Node.js runtime
- Packages using `--legacy-peer-deps` due to peer dependency conflicts

The development server starts successfully with all packages installed.