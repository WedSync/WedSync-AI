# WedSync Tech Stack

## Core Framework (Use EXACTLY These Versions)
- **Next.js 15.4.3** (App Router architecture)
- **React 19.1.1** (Server Components, Suspense)
- **TypeScript 5.9.2** (strict mode - NO 'any' types EVER)
- **Supabase 2.55.0** (PostgreSQL 15, Auth, Storage, Realtime)

## UI & Styling
- **Untitled UI + Magic UI + Tailwind CSS 4.1.11**
- **@dnd-kit** for drag-drop functionality
- **Motion 12.23.12** for animations (replaced framer-motion)

## Forms & Validation
- **React Hook Form 7.62.0**
- **Zod 4.0.17** validation

## State Management
- **Zustand 5.0.7**
- **TanStack Query 5.85.0**

## Payment & Communication
- **Stripe 18.4.0** for payments
- **Resend 6.0.1** for email (replaces SendGrid)
- **OpenAI 5.12.2** for AI features

## Infrastructure
- **Docker & Docker Compose v2** for containerization
- **PostgreSQL 15** via Supabase

## Key Pattern Changes
1. No more forwardRef - React 19 uses ref as prop
2. useActionState for forms - Replaces useState + handlers
3. Server Components by default - Client Components only when needed
4. Async cookies/headers - Must await in Next.js 15
5. CSS-based Tailwind config - No more tailwind.config.js
6. @supabase/ssr - auth-helpers is deprecated