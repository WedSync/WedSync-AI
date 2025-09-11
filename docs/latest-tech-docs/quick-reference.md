# WedSync Tech Stack Quick Reference

*Last Updated: January 2025*

## 🎯 Current Versions

```json
{
  "next": "15.4.6",
  "react": "19.1.1",
  "typescript": "5.9.2",
  "tailwindcss": "4.1.11",
  "@supabase/supabase-js": "2.55.0",
  "zustand": "5.0.7",
  "@tanstack/react-query": "5.85.0",
  "openai": "5.12.2",
  "stripe": "18.4.0"
}
```

## 🚀 Quick Start Commands

```bash
# Development
npm run dev          # Start with Turbopack

# Type checking
npm run typecheck

# Testing
npm test
npm run test:e2e

# Build
npm run build
```

## 📁 Project Structure

```
wedsync/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth group routes
│   ├── (dashboard)/       # Dashboard routes
│   ├── actions/           # Server Actions
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            
│   ├── catalyst/          # UI components
│   ├── forms/            # Form components
│   └── dashboard/        # Dashboard components
├── lib/
│   ├── supabase/         # Supabase clients
│   ├── hooks/            # Custom hooks
│   └── utils/            # Utilities
├── docs/
│   └── latest-tech-docs/ # Tech documentation
└── types/                # TypeScript types
```

## 🔥 Most Common Patterns

### Server Component (Default)
```typescript
// Runs on server, can access database directly
export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}
```

### Client Component
```typescript
'use client';

// Runs in browser, has interactivity
export default function Interactive() {
  const [state, setState] = useState();
  return <button onClick={() => setState()}>Click</button>;
}
```

### Server Action
```typescript
'use server';

export async function submitForm(formData: FormData) {
  // Runs on server, can mutate data
  await saveToDatabase(formData);
  revalidatePath('/');
}
```

### Using React 19's `use` Hook
```typescript
import { use } from 'react';

function Component({ promise }) {
  const data = use(promise); // Can be conditional!
  return <div>{data}</div>;
}
```

### Form with useActionState
```typescript
import { useActionState } from 'react';

function Form() {
  const [error, submitAction, isPending] = useActionState(
    async (prev, formData) => {
      // Handle form submission
    },
    null
  );
  
  return (
    <form action={submitAction}>
      <button disabled={isPending}>Submit</button>
    </form>
  );
}
```

## 🔐 Supabase Quick Patterns

### Server Component Query
```typescript
import { createClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.from('table').select();
  return <List data={data} />;
}
```

### Client Component Query
```typescript
'use client';
import { createClient } from '@/lib/supabase/client';

export default function Component() {
  const supabase = createClient();
  // Use in useEffect or event handlers
}
```

### Real-time Subscription
```typescript
useEffect(() => {
  const channel = supabase
    .channel('changes')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => console.log(payload)
    )
    .subscribe();
    
  return () => supabase.removeChannel(channel);
}, []);
```

## 🎨 Tailwind v4 Quick Syntax

```css
/* Theme configuration in CSS */
@theme {
  --color-primary: #a855f7;
  --spacing-18: 4.5rem;
}

/* Component styles */
@layer components {
  .btn {
    @apply px-4 py-2 bg-primary rounded-lg;
  }
}
```

## 🔧 Config Files

### next.config.ts
```typescript
import type { NextConfig } from 'next';

const config: NextConfig = {
  experimental: {
    after: true,
    typedRoutes: true,
  }
};

export default config;
```

### middleware.ts
```typescript
export async function middleware(request: NextRequest) {
  // Auth refresh logic here
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
```

## 💡 Key Differences from Older Versions

| Feature | Old Way | New Way (2025) |
|---------|---------|----------------|
| React version | 18.x | 19.1.1 |
| Ref forwarding | `forwardRef()` | Pass as prop |
| Form state | `useState` + handlers | `useActionState` |
| Async data | `useEffect` + `useState` | `use()` hook |
| Next.js dev | Webpack | Turbopack |
| Supabase auth | `@supabase/auth-helpers` | `@supabase/ssr` |
| Tailwind config | `tailwind.config.js` | CSS `@theme` |
| API routes | `/pages/api` | `/app/api/*/route.ts` |

## 🐛 Common Gotchas

1. **Cookies are async in Next.js 15**
```typescript
const cookieStore = await cookies(); // Don't forget await!
```

2. **No default caching in Next.js 15**
```typescript
// Add cache headers explicitly if needed
```

3. **React 19 ref callbacks**
```typescript
// Must return undefined explicitly
<div ref={(el) => { console.log(el); return undefined; }} />
```

4. **Tailwind v4 uses CSS config**
```css
/* No more tailwind.config.js - use @theme in CSS */
```

5. **Server Components can't use hooks**
```typescript
// No useState, useEffect in Server Components
// Use Client Components for interactivity
```

## 🚦 Decision Tree

**Need interactivity?** → Client Component (`'use client'`)  
**Fetching data?** → Server Component (default)  
**Form submission?** → Server Action + `useActionState`  
**Real-time updates?** → Client Component + Supabase subscription  
**SEO important?** → Server Component  
**Using browser APIs?** → Client Component  

## 📚 Essential Links

- [React 19 Docs](https://react.dev)
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Tailwind v4 Docs](https://tailwindcss.com/docs/v4-beta)
- [Supabase Docs](https://supabase.com/docs)
- [TypeScript 5.9](https://www.typescriptlang.org/docs/)

## 🆘 Troubleshooting

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Check for type errors
npm run typecheck

# Check outdated packages
npm outdated
```