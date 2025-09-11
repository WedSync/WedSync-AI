# WedSync Tech Stack - Current State (January 2025)

## ✅ All Packages Updated

Your tech stack is now fully up-to-date as of January 13, 2025.

## Core Framework Versions

### Frontend
- **Next.js**: 15.4.6 (latest)
- **React**: 19.1.1 (latest)
- **React DOM**: 19.1.1 (latest)
- **TypeScript**: 5.9.2 (latest)

### UI & Styling
- **Tailwind CSS**: 4.1.11 (latest - v4 alpha)
- **@headlessui/react**: 2.2.7
- **@heroicons/react**: 2.2.0
- **@tailwindcss/forms**: 0.5.10
- **Motion**: 12.23.12 (replaces framer-motion)

### Backend & Database
- **@supabase/supabase-js**: 2.55.0 (latest)
- **@supabase/ssr**: 0.6.1

### Forms & Validation
- **react-hook-form**: 7.62.0
- **@hookform/resolvers**: 5.2.1
- **zod**: 4.0.17 (latest)

### Development Tools
- **ESLint**: 9.33.0
- **eslint-config-next**: 15.4.6 (latest)
- **@types/node**: 20.19.10 (intentionally on v20 to match Node runtime)
- **@types/react**: 19.1.10 (latest)
- **@types/react-dom**: 19.1.7

### Testing
- **@playwright/test**: 1.54.2
- **@testing-library/react**: 16.3.0
- **@testing-library/jest-dom**: 6.6.4
- **jest**: 30.0.5
- **msw**: 2.10.4

### Utilities
- **clsx**: 2.1.1
- **tailwind-merge**: 3.3.1
- **@vercel/speed-insights**: 1.2.0

## Key Technology Decisions

### Why These Versions?

1. **React 19 & Next.js 15**: Using the absolute latest for access to:
   - Server Components
   - Server Actions
   - Improved performance
   - Better DX with Turbopack

2. **Tailwind CSS v4 Alpha**: Early adoption for:
   - Lightning CSS integration (faster builds)
   - Better performance
   - New architecture benefits

3. **Motion vs Framer Motion**: Motion is the newer, lighter package from Framer

4. **TypeScript 5.9**: Latest stable with all modern features

## Documentation Resources

### Official Documentation Links

#### Must-Read for Latest Features
- [Next.js 15 App Router](https://nextjs.org/docs/app)
- [React 19 Reference](https://react.dev/reference/react)
- [Tailwind CSS v4 Alpha](https://tailwindcss.com/blog/tailwindcss-v4-alpha)
- [Supabase with Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)

#### Component Libraries
- [Headless UI](https://headlessui.com/)
- [Heroicons](https://heroicons.com/)
- [Motion Documentation](https://motion.dev/)

#### Forms & Validation
- [React Hook Form](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)

#### Testing
- [Playwright](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [MSW (Mock Service Worker)](https://mswjs.io/)

## Next Steps

1. **Documentation Priority**:
   - Focus on React 19 new patterns (use hooks, Server Components)
   - Learn Tailwind v4 changes from v3
   - Understand Next.js 15 App Router best practices

2. **Missing Dependencies to Consider**:
   Based on your `.env.example` and docs, you may want to add:
   - State management: `zustand` or `@tanstack/react-query`
   - AI integration: `openai`
   - Email: `resend` and `@react-email/components`
   - Payments: `stripe`
   - Date handling: `date-fns`

3. **TypeScript Configuration**:
   Consider updating `tsconfig.json` target from ES2017 to ES2020 or ES2022

## Version Check Script

Run this periodically to check for updates:

```bash
cd wedsync
npm outdated
```

All packages are currently up-to-date as of January 13, 2025.