# Supabase + Next.js 15 Integration Guide

*Last Updated: January 2025*
*Supabase Client: 2.55.0 | SSR: 0.6.1*

## 🚀 Modern Supabase Setup (2024)

### ⚠️ Important: Use @supabase/ssr, NOT auth-helpers

The `@supabase/auth-helpers-nextjs` package is **deprecated**. Use `@supabase/ssr` for Next.js 15.

## 📦 Installation

```bash
npm install @supabase/supabase-js @supabase/ssr
```

## 🔧 Complete Setup

### 1. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key # Keep server-side only!
```

### 2. Create Supabase Clients

#### Browser Client
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

#### Server Client
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function createClient() {
  const cookieStore = await cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // Handle error in Server Component
          }
        },
      },
    }
  );
}
```

#### Service Role Client (Admin Operations)
```typescript
// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
```

### 3. Middleware (Critical for Auth!)

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && ['/login', '/register'].includes(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

## 🔐 Authentication Patterns

### Server Component Auth Check

```typescript
// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  // Fetch user-specific data with RLS
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  return <Dashboard user={user} profile={profile} />;
}
```

### Login with Server Actions

```typescript
// app/actions/auth.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function login(formData: FormData) {
  const supabase = await createClient();
  
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        full_name: formData.get('name') as string,
        business_name: formData.get('business_name') as string,
      }
    }
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/verify-email');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
```

### Client Component Auth

```typescript
// components/UserMenu.tsx
'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        router.refresh();
      }
    );

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (!user) return null;

  return (
    <div>
      <p>{user.email}</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
```

## 🔄 Real-time Subscriptions

### Server Component with Real-time Client Component

```typescript
// app/forms/[id]/page.tsx
import { createClient } from '@/lib/supabase/server';
import FormResponses from './FormResponses';

export default async function FormPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { id } = await params;
  
  // Initial data fetch
  const { data: form } = await supabase
    .from('forms')
    .select('*, responses(*)')
    .eq('id', id)
    .single();
  
  return <FormResponses form={form} />;
}
```

```typescript
// app/forms/[id]/FormResponses.tsx
'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function FormResponses({ form }) {
  const [responses, setResponses] = useState(form.responses);
  const supabase = createClient();
  
  useEffect(() => {
    // Real-time subscription
    const channel = supabase
      .channel('form-responses')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'responses',
          filter: `form_id=eq.${form.id}`
        },
        (payload) => {
          setResponses(prev => [...prev, payload.new]);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [form.id, supabase]);
  
  return (
    <div>
      <h2>Responses ({responses.length})</h2>
      {responses.map(response => (
        <div key={response.id}>{JSON.stringify(response.data)}</div>
      ))}
    </div>
  );
}
```

## 📊 Database Patterns

### Row Level Security (RLS)

```sql
-- Enable RLS on tables
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Suppliers can only see their own data
CREATE POLICY "Suppliers can view own data" 
ON suppliers 
FOR SELECT 
USING (auth.uid() = user_id);

-- Suppliers can update their own data
CREATE POLICY "Suppliers can update own data" 
ON suppliers 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Forms belong to suppliers
CREATE POLICY "Forms belong to supplier" 
ON forms 
FOR ALL 
USING (supplier_id IN (
  SELECT id FROM suppliers WHERE user_id = auth.uid()
));
```

### Database Types Generation

```bash
# Install Supabase CLI
npm install -g supabase

# Generate types
supabase gen types typescript --project-id [project-id] > types/supabase.ts
```

Use types in your code:

```typescript
// types/supabase.ts (generated)
export type Database = {
  public: {
    Tables: {
      suppliers: {
        Row: {
          id: string;
          business_name: string;
          email: string;
          // ... other fields
        };
        Insert: {
          // ... insert types
        };
        Update: {
          // ... update types
        };
      };
    };
  };
};

// Use in components
import type { Database } from '@/types/supabase';

type Supplier = Database['public']['Tables']['suppliers']['Row'];
```

## 🎯 WedSync-Specific Patterns

### Form Builder with Supabase

```typescript
// app/actions/forms.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createForm(data: {
  title: string;
  fields: any[];
  settings: any;
}) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  
  // Get supplier ID
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id')
    .eq('user_id', user.id)
    .single();
  
  // Create form
  const { data: form, error } = await supabase
    .from('forms')
    .insert({
      supplier_id: supplier.id,
      title: data.title,
      fields: data.fields,
      settings: data.settings,
      status: 'draft'
    })
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath('/forms');
  return form;
}

export async function updateFormFields(formId: string, fields: any[]) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('forms')
    .update({ fields, updated_at: new Date().toISOString() })
    .eq('id', formId);
  
  if (error) throw error;
  
  revalidatePath(`/forms/${formId}`);
}
```

### File Upload with Storage

```typescript
// components/FileUpload.tsx
'use client';

import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';

export default function FileUpload({ 
  bucket = 'form-attachments',
  onUpload 
}: {
  bucket?: string;
  onUpload: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();
  
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select a file to upload.');
      }
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);
      
      onUpload(publicUrl);
    } catch (error) {
      alert('Error uploading file!');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div>
      <input
        type="file"
        onChange={handleUpload}
        disabled={uploading}
        accept="image/*,application/pdf"
      />
      {uploading && <p>Uploading...</p>}
    </div>
  );
}
```

### Edge Functions Integration

```typescript
// supabase/functions/generate-form/index.ts
import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

serve(async (req) => {
  const { prompt, supplierId } = await req.json();
  
  // Create Supabase client with service role
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // Generate form with OpenAI
  const openai = new OpenAI({
    apiKey: Deno.env.get('OPENAI_API_KEY')!,
  });
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'Generate a wedding vendor form based on the prompt.'
      },
      { role: 'user', content: prompt }
    ],
  });
  
  const formData = JSON.parse(completion.choices[0].message.content);
  
  // Save to database
  const { data, error } = await supabase
    .from('forms')
    .insert({
      supplier_id: supplierId,
      ...formData
    })
    .select()
    .single();
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

## 🚦 Best Practices

1. **Always use Server Components for initial data fetching**
2. **Use RLS instead of manual authorization checks**
3. **Refresh auth tokens in middleware**
4. **Type your database queries with generated types**
5. **Use service role key only in secure server environments**
6. **Implement proper error boundaries**
7. **Cache Supabase client instances**

## 📚 Resources

- [Supabase Next.js Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [SSR Package Docs](https://supabase.com/docs/guides/auth/server-side-rendering)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Real-time Subscriptions](https://supabase.com/docs/guides/realtime)