# WedSync Code Style & Conventions

## TypeScript Standards
- **NO 'any' types EVER** - Use strict typing
- **Strict mode enabled** - All TypeScript checks enforced
- **Zod validation** - Use for all form inputs and API validation
- **Proper error handling** - Always catch and handle errors gracefully

## React 19 Patterns
- **Server Components by default** - Use client components only when absolutely necessary
- **useActionState** for forms - Replaces useState + handlers
- **No forwardRef** - React 19 uses ref as prop
- **Async cookies/headers** - Must await in Next.js 15

## Next.js 15 Standards
- **App Router architecture** - Use app directory structure
- **Server Components** - Default for all components
- **Route handlers** - Use app/api structure
- **Metadata API** - Use for SEO optimization

## Component Organization
```
src/components/
├── ui/              # Reusable UI components (buttons, inputs)
├── forms/           # Form-specific components
├── layouts/         # Layout components
└── features/        # Feature-specific components
```

## File Naming Conventions
- **PascalCase** for React components: `WeddingSetupWizard.tsx`
- **camelCase** for utility functions: `validateWeddingDate.ts`
- **kebab-case** for API routes: `wedding-basics.ts`

## Wedding Industry Context
- Always explain technical concepts in photography/wedding terms
- Use real wedding scenarios in examples
- Consider mobile-first (60% of users are on mobile)
- Wedding dates are immutable once set
- Soft delete only (30-day recovery period)

## Security Requirements
- **GDPR compliant** - All data handling must comply
- **Input sanitization** - All user inputs must be sanitized
- **Authentication required** - All protected routes need auth
- **Wedding day protocol** - Saturdays = READ-ONLY MODE