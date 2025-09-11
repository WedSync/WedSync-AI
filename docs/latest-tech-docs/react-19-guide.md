# React 19 Complete Guide for WedSync

*Last Updated: January 2025*
*Official Release: December 5, 2024*

## 🚀 Key Changes in React 19

### 1. The `use` Hook

The `use` hook is React 19's game-changer for handling promises and context in render.

```javascript
import { use, Suspense } from 'react';

function Comments({ commentsPromise }) {
  // use can be called conditionally, unlike other hooks
  const comments = use(commentsPromise);
  
  return comments.map(comment => <p key={comment.id}>{comment.text}</p>);
}

// Parent component
function Page({ commentsPromise }) {
  return (
    <Suspense fallback={<div>Loading comments...</div>}>
      <Comments commentsPromise={commentsPromise} />
    </Suspense>
  );
}
```

**Key Points:**
- Can be called in loops and conditionals
- Works with Suspense boundaries
- Handles both promises and context
- In Server Components, prefer `async/await` over `use`

### 2. Server Components & Actions

#### Server Components
```javascript
// This component runs on the server only
async function ProductList() {
  // Direct database access - no API needed
  const products = await db.query('SELECT * FROM products');
  
  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

#### Server Actions
```javascript
// app/actions.js
'use server';

export async function updateUser(formData) {
  const name = formData.get('name');
  const email = formData.get('email');
  
  // Direct database update
  await db.update('users', { name, email });
  
  // Revalidate cache
  revalidatePath('/profile');
}

// app/profile/page.jsx
import { updateUser } from '../actions';

export default function Profile() {
  return (
    <form action={updateUser}>
      <input name="name" />
      <input name="email" />
      <button type="submit">Update</button>
    </form>
  );
}
```

### 3. New Form Hooks

#### useActionState
Replaces manual form state management:

```javascript
import { useActionState } from 'react';

function UpdateName() {
  const [error, submitAction, isPending] = useActionState(
    async (previousState, formData) => {
      const error = await updateName(formData.get("name"));
      if (error) {
        return error;
      }
      redirect("/profile");
    },
    null
  );

  return (
    <form action={submitAction}>
      <input type="text" name="name" />
      <button type="submit" disabled={isPending}>
        {isPending ? "Updating..." : "Update"}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

#### useFormStatus
Access form submission state without prop drilling:

```javascript
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending, data, method, action } = useFormStatus();
  
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  );
}

// Use in any form
function ContactForm() {
  return (
    <form action={submitContact}>
      <input name="message" />
      <SubmitButton /> {/* No props needed! */}
    </form>
  );
}
```

#### useOptimistic
Instant UI feedback while async operations complete:

```javascript
import { useOptimistic } from 'react';

function TodoList({ todos, addTodo }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo) => [...state, { id: Math.random(), ...newTodo, pending: true }]
  );

  async function formAction(formData) {
    const newTodo = { text: formData.get("todo") };
    
    // Immediately show in UI
    addOptimisticTodo(newTodo);
    
    // Then sync with server
    await addTodo(newTodo);
  }

  return (
    <>
      <form action={formAction}>
        <input name="todo" />
        <button type="submit">Add</button>
      </form>
      
      <ul>
        {optimisticTodos.map(todo => (
          <li key={todo.id} style={{ opacity: todo.pending ? 0.5 : 1 }}>
            {todo.text}
          </li>
        ))}
      </ul>
    </>
  );
}
```

### 4. Ref as Prop (No More forwardRef!)

```javascript
// OLD (React 18)
const Input = forwardRef((props, ref) => {
  return <input ref={ref} {...props} />;
});

// NEW (React 19) - Much simpler!
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}
```

### 5. Document Metadata Support

```javascript
function BlogPost({ post }) {
  return (
    <article>
      <title>{post.title}</title>
      <meta name="description" content={post.excerpt} />
      <meta property="og:title" content={post.title} />
      
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

### 6. Resource Preloading

```javascript
import { preload, prefetchDNS, preconnect } from 'react-dom';

// Preload critical resources
preload('/fonts/heading.woff2', { as: 'font' });
preload('/api/data', { as: 'fetch' });

// DNS prefetching
prefetchDNS('https://api.example.com');

// Preconnect to external domains
preconnect('https://cdn.example.com');
```

## 🎯 WedSync-Specific Patterns

### Form Builder with Optimistic Updates

```javascript
// components/forms/FormBuilder.jsx
import { useOptimistic, useActionState } from 'react';

export function FormBuilder({ initialFields, saveForm }) {
  const [fields, addOptimisticField] = useOptimistic(initialFields);
  const [error, submitAction, isPending] = useActionState(
    async (prev, formData) => {
      const newField = {
        type: formData.get('type'),
        label: formData.get('label'),
        required: formData.get('required') === 'on'
      };
      
      addOptimisticField(newField);
      
      try {
        await saveForm(newField);
      } catch (e) {
        return e.message;
      }
    },
    null
  );

  return (
    <div>
      <form action={submitAction}>
        <select name="type">
          <option value="text">Text</option>
          <option value="email">Email</option>
          <option value="date">Date</option>
        </select>
        <input name="label" placeholder="Field label" />
        <label>
          <input type="checkbox" name="required" />
          Required
        </label>
        <button disabled={isPending}>Add Field</button>
      </form>
      
      {error && <div className="error">{error}</div>}
      
      <div className="fields">
        {fields.map((field, i) => (
          <FieldPreview key={i} field={field} />
        ))}
      </div>
    </div>
  );
}
```

### Server Component Data Fetching

```javascript
// app/supplier/[id]/page.jsx
import { use } from 'react';
import { createClient } from '@/lib/supabase/server';

// Server Component - runs on server
export default async function SupplierDashboard({ params }) {
  const supabase = createClient();
  
  // Direct database queries
  const [supplier, forms, responses] = await Promise.all([
    supabase.from('suppliers').select('*').eq('id', params.id).single(),
    supabase.from('forms').select('*').eq('supplier_id', params.id),
    supabase.from('responses').select('*').eq('supplier_id', params.id)
  ]);

  return (
    <div>
      <h1>{supplier.data.business_name}</h1>
      <Suspense fallback={<LoadingMetrics />}>
        <DashboardMetrics 
          forms={forms.data} 
          responses={responses.data} 
        />
      </Suspense>
    </div>
  );
}
```

## 🔄 Migration Checklist

### From React 18 to 19

1. **Update Dependencies:**
```bash
npm install react@19 react-dom@19
```

2. **Replace forwardRef:**
```javascript
// Find all forwardRef usage
grep -r "forwardRef" ./src

// Update components to use ref as prop
```

3. **Update Form Handlers:**
```javascript
// OLD
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    await submitForm(data);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

// NEW
const [error, submitAction, isPending] = useActionState(
  async (prev, formData) => {
    try {
      await submitForm(formData);
    } catch (err) {
      return err.message;
    }
  },
  null
);
```

4. **Add Suspense Boundaries:**
```javascript
// Wrap async components
<Suspense fallback={<Loading />}>
  <AsyncComponent />
</Suspense>
```

## ⚠️ Breaking Changes & Gotchas

1. **Ref Callbacks:** Must explicitly return undefined (not implicitly)
```javascript
// BAD - TypeScript will complain
<div ref={(el) => { console.log(el) }} />

// GOOD
<div ref={(el) => { console.log(el); return undefined; }} />
```

2. **Hydration Errors:** More strict in React 19
- Ensure server and client render identical HTML
- Use `suppressHydrationWarning` sparingly

3. **StrictMode:** Double-invocation in development is more aggressive
- Ensure effects are properly cleaned up

## 📚 Resources

- [React 19 Blog Post](https://react.dev/blog/2024/12/05/react-19)
- [React Server Components](https://react.dev/reference/rsc/server-components)
- [New Hooks Reference](https://react.dev/reference/react/hooks)

## 🚦 Quick Decision Guide

| Scenario | Use This |
|----------|----------|
| Fetching data on server | Server Component with async/await |
| Fetching data on client | `use` hook with Suspense |
| Form submission | `useActionState` + Server Actions |
| Optimistic updates | `useOptimistic` |
| Loading states in forms | `useFormStatus` |
| Component needs ref | Pass ref as prop (no forwardRef) |