# Next.js 15 Complete Guide for WedSync

*Last Updated: January 2025*
*Current Version: 15.4.6*

## 🚀 What's New in Next.js 15

### 1. Turbopack (Stable for Development)

Turbopack is now stable and the recommended dev server:

```bash
# Your package.json already has this!
"dev": "next dev --turbopack"
```

**Performance Gains:**
- 76.7% faster local server startup
- 96.3% faster code updates with Fast Refresh  
- 45.8% faster initial route compile
- 25-35% reduction in memory usage

### 2. React 19 Support

Full support for React 19 features including Server Components, Actions, and new hooks.

```javascript
// app/actions.js
'use server';

export async function createSupplier(formData) {
  const name = formData.get('name');
  const email = formData.get('email');
  
  // Direct database access in server actions
  const { data, error } = await supabase
    .from('suppliers')
    .insert({ name, email })
    .select()
    .single();
    
  if (error) throw error;
  
  revalidatePath('/suppliers');
  redirect(`/suppliers/${data.id}`);
}
```

### 3. Async Request APIs

Request APIs are now async for better performance:

```javascript
// app/supplier/[id]/page.jsx
import { cookies, headers } from 'next/headers';

export default async function SupplierPage({ params }) {
  // Now async!
  const cookieStore = await cookies();
  const headersList = await headers();
  const { id } = await params;
  
  const session = cookieStore.get('session');
  const userAgent = headersList.get('user-agent');
  
  // Fetch supplier data
  const supplier = await getSupplier(id);
  
  return <SupplierDashboard supplier={supplier} />;
}
```

### 4. Caching Changes

**Important:** Fetch requests and route handlers are no longer cached by default.

```javascript
// app/api/suppliers/route.js
export async function GET() {
  // This is NOT cached by default in Next.js 15
  const suppliers = await getSuppliers();
  
  return Response.json(suppliers);
}

// To enable caching, be explicit:
export async function GET() {
  const suppliers = await getSuppliers();
  
  return Response.json(suppliers, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate'
    }
  });
}
```

### 5. `unstable_after` API (Experimental)

Execute code after response is sent to user:

```javascript
import { unstable_after as after } from 'next/server';

export async function POST(request) {
  const data = await request.json();
  
  // Send response immediately
  const response = Response.json({ success: true });
  
  // Execute after response is sent
  after(() => {
    // Log analytics
    console.log('Form submitted:', data);
    
    // Send email notification (non-blocking)
    sendEmailNotification(data);
    
    // Update metrics
    updateMetrics('form_submission');
  });
  
  return response;
}
```

### 6. Enhanced Forms with `next/form`

Client-side navigation for forms:

```javascript
import Form from 'next/form';

export default function SearchForm() {
  return (
    <Form action="/search">
      <input name="q" placeholder="Search suppliers..." />
      <button type="submit">Search</button>
    </Form>
  );
}
```

### 7. TypeScript Config Support

```typescript
// next.config.ts (instead of .js)
import type { NextConfig } from 'next';

const config: NextConfig = {
  experimental: {
    after: true,
    typedRoutes: true,
  },
  images: {
    domains: ['supabase.storage'],
  },
};

export default config;
```

## 🏗️ App Router Best Practices

### File Structure for WedSync

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   └── layout.tsx          # Auth-specific layout
│
├── (dashboard)/
│   ├── supplier/
│   │   ├── [id]/
│   │   │   ├── page.tsx    # Supplier dashboard
│   │   │   ├── forms/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   └── layout.tsx      # Supplier layout
│   │
│   └── couple/
│       ├── [id]/
│       │   └── page.tsx    # Couple dashboard
│       └── layout.tsx      # Couple layout
│
├── api/
│   ├── forms/
│   │   └── route.ts        # Forms API
│   ├── ai/
│   │   └── generate/
│   │       └── route.ts    # AI generation
│   └── webhooks/
│       ├── stripe/
│       │   └── route.ts
│       └── supabase/
│           └── route.ts
│
├── actions/
│   ├── forms.ts           # Form server actions
│   ├── auth.ts            # Auth server actions
│   └── suppliers.ts       # Supplier actions
│
├── layout.tsx             # Root layout
├── page.tsx              # Homepage
└── global.css
```

### Server Components by Default

```javascript
// app/suppliers/page.tsx - Server Component
import { createClient } from '@/lib/supabase/server';

export default async function SuppliersPage() {
  const supabase = await createClient();
  
  // Direct database query - no API needed
  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: false });
  
  return (
    <div>
      <h1>Suppliers</h1>
      <SupplierList suppliers={suppliers} />
    </div>
  );
}
```

### Client Components When Needed

```javascript
// components/InteractiveForm.tsx
'use client';  // Required for interactivity

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InteractiveForm() {
  const [value, setValue] = useState('');
  const router = useRouter();
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      router.push(`/search?q=${value}`);
    }}>
      <input 
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </form>
  );
}
```

### Parallel Data Fetching

```javascript
// app/dashboard/page.tsx
export default async function Dashboard() {
  // Fetch in parallel for better performance
  const [metrics, forms, responses] = await Promise.all([
    getMetrics(),
    getForms(),
    getResponses()
  ]);
  
  return (
    <div>
      <MetricsCard data={metrics} />
      <FormsTable data={forms} />
      <ResponsesList data={responses} />
    </div>
  );
}
```

### Streaming with Suspense

```javascript
// app/supplier/[id]/page.tsx
import { Suspense } from 'react';

export default async function SupplierPage({ params }) {
  const { id } = await params;
  
  return (
    <div>
      {/* Show immediately */}
      <SupplierHeader id={id} />
      
      {/* Stream when ready */}
      <Suspense fallback={<FormsSkeleton />}>
        <SupplierForms id={id} />
      </Suspense>
      
      <Suspense fallback={<MetricsSkeleton />}>
        <SupplierMetrics id={id} />
      </Suspense>
    </div>
  );
}
```

## 🔧 Configuration

### Recommended next.config.ts

```typescript
import type { NextConfig } from 'next';

const config: NextConfig = {
  // React 19 and experimental features
  experimental: {
    after: true,              // unstable_after API
    typedRoutes: true,        // Type-safe routes
    optimizePackageImports: [ // Optimize imports
      'lucide-react',
      '@headlessui/react',
      'date-fns'
    ]
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      }
    ],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ]
      }
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/supplier',
        permanent: false,
      }
    ];
  }
};

export default config;
```

## 🚄 Route Handlers

### API Route with Streaming

```javascript
// app/api/export/route.ts
export async function GET(request: Request) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Stream CSV data
      controller.enqueue(encoder.encode('Name,Email,Status\n'));
      
      const suppliers = await getSuppliers();
      for (const supplier of suppliers) {
        controller.enqueue(
          encoder.encode(`${supplier.name},${supplier.email},${supplier.status}\n`)
        );
        
        // Yield to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="suppliers.csv"'
    }
  });
}
```

### Webhook Handler

```javascript
// app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers';
import { unstable_after as after } from 'next/server';

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  // Respond immediately
  const response = Response.json({ received: true });
  
  // Process webhook after response
  after(async () => {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'customer.subscription.updated':
        await updateSubscription(event.data.object);
        break;
    }
  });
  
  return response;
}
```

## 🎯 WedSync-Specific Patterns

### Dynamic Metadata

```javascript
// app/supplier/[id]/page.tsx
import type { Metadata } from 'next';

export async function generateMetadata({ params }): Promise<Metadata> {
  const { id } = await params;
  const supplier = await getSupplier(id);
  
  return {
    title: `${supplier.business_name} | WedSync`,
    description: supplier.description,
    openGraph: {
      title: supplier.business_name,
      description: supplier.description,
      images: [supplier.logo_url],
    }
  };
}
```

### Parallel Routes for Dashboard

```javascript
// app/dashboard/@metrics/page.tsx
export default async function MetricsSlot() {
  const metrics = await getMetrics();
  return <MetricsCard data={metrics} />;
}

// app/dashboard/@forms/page.tsx
export default async function FormsSlot() {
  const forms = await getForms();
  return <FormsList data={forms} />;
}

// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  metrics,
  forms
}: {
  children: React.ReactNode;
  metrics: React.ReactNode;
  forms: React.ReactNode;
}) {
  return (
    <div className="dashboard-grid">
      <div>{metrics}</div>
      <div>{forms}</div>
      <main>{children}</main>
    </div>
  );
}
```

### Error Handling

```javascript
// app/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="error-container">
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

// app/not-found.tsx
export default function NotFound() {
  return (
    <div>
      <h2>Page Not Found</h2>
      <p>Could not find the requested resource</p>
    </div>
  );
}
```

## 📊 Performance Monitoring

```javascript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

## 🔄 Migration from Pages Router

Key differences to remember:

1. **No `getServerSideProps`** - Use async Server Components
2. **No `getStaticProps`** - Fetch directly in components
3. **No `_app.js`** - Use `layout.tsx`
4. **No `_document.js`** - Use `layout.tsx` with metadata
5. **API Routes** - Now in `app/api/*/route.ts`

## 📚 Resources

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [App Router Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration)
- [Turbopack Documentation](https://nextjs.org/docs/app/api-reference/turbopack)