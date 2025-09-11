# Tailwind CSS v4 Alpha Guide for WedSync

*Last Updated: January 2025*
*Current Version: 4.1.11 (Alpha)*

## 🚀 What's New in Tailwind v4

### The Oxide Engine

Tailwind v4 is powered by **Oxide**, a new high-performance engine built with Rust:

- **10x faster** than v3
- **Full builds** are 5x faster
- **Incremental builds** are over 100x faster (measured in microseconds!)
- **35% smaller** installed size
- **Lightning CSS** integration built-in

### Key Changes from v3

1. **CSS-first configuration** (no more tailwind.config.js)
2. **Automatic content detection** (no more content paths)
3. **Built-in toolchain** (no PostCSS plugins needed)
4. **Native CSS features** (cascade layers, container queries)

## 🎯 Installation & Setup

### Current Setup (v4 Alpha)

```json
// package.json
{
  "dependencies": {
    "tailwindcss": "^4.1.11",
    "@tailwindcss/postcss": "^4.1.11"
  }
}
```

```javascript
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {}
  }
}
```

```css
/* app/globals.css */
@import "tailwindcss";

/* Your custom styles */
```

## 🎨 CSS-First Configuration

### Theme Customization

Instead of `tailwind.config.js`, configure directly in CSS:

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* Colors */
  --color-primary-50: #faf5ff;
  --color-primary-100: #f3e8ff;
  --color-primary-200: #e9d5ff;
  --color-primary-300: #d8b4fe;
  --color-primary-400: #c084fc;
  --color-primary-500: #a855f7;
  --color-primary-600: #9333ea;
  --color-primary-700: #7e22ce;
  --color-primary-800: #6b21a8;
  --color-primary-900: #581c87;
  
  /* Spacing */
  --spacing-18: 4.5rem;
  --spacing-22: 5.5rem;
  
  /* Fonts */
  --font-family-display: 'Cal Sans', system-ui;
  --font-family-body: 'Inter', system-ui;
  
  /* Border Radius */
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;
  
  /* Animations */
  --animate-slide-in: slide-in 0.2s ease-out;
}

/* Custom animations */
@keyframes slide-in {
  from {
    transform: translateY(-10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

### Using Custom Theme Values

```jsx
// Components now use your custom theme
<div className="bg-primary-500 p-18 rounded-2xl font-display animate-slide-in">
  Custom themed content
</div>
```

## 🆕 New Features in v4

### 1. Container Queries

```css
@theme {
  --width-content: 65ch;
}

/* Define container */
.card-container {
  container-type: inline-size;
}

/* Container query utilities */
.card {
  @apply p-4;
}

@container (min-width: 400px) {
  .card {
    @apply p-6 grid-cols-2;
  }
}

@container (min-width: 600px) {
  .card {
    @apply p-8 grid-cols-3;
  }
}
```

### 2. Native Cascade Layers

```css
@layer base {
  html {
    @apply antialiased;
  }
  
  h1 {
    @apply text-4xl font-bold;
  }
}

@layer components {
  .btn-primary {
    @apply bg-primary-500 text-white px-4 py-2 rounded-lg;
    @apply hover:bg-primary-600 transition-colors;
  }
}

@layer utilities {
  .content-auto {
    content-visibility: auto;
  }
}
```

### 3. Improved @apply Directive

```css
/* v4 allows more complex @apply usage */
.card {
  @apply 
    /* Layout */
    flex flex-col gap-4 p-6
    /* Colors */
    bg-white dark:bg-gray-800
    /* Borders */
    border border-gray-200 dark:border-gray-700
    /* Shadows */
    shadow-sm hover:shadow-md
    /* Transitions */
    transition-shadow duration-200;
}
```

### 4. Custom Variants

```css
@variant hover-within (&:hover, &:focus-within);
@variant invalid-required (&:invalid:required);

/* Usage */
.input {
  @apply hover-within:ring-2 hover-within:ring-primary-500;
  @apply invalid-required:border-red-500;
}
```

## 🏗️ WedSync Component Examples

### Form Builder Styles

```css
/* Form builder specific styles */
@layer components {
  /* Draggable field */
  .form-field {
    @apply 
      relative p-4 bg-white rounded-lg border-2 border-dashed
      border-gray-300 hover:border-primary-400
      cursor-move transition-colors;
  }
  
  .form-field.is-dragging {
    @apply opacity-50 rotate-2;
  }
  
  .form-field.is-over {
    @apply border-primary-500 bg-primary-50;
  }
  
  /* Field types */
  .field-type-badge {
    @apply 
      inline-flex items-center px-2 py-1 
      text-xs font-medium rounded-full;
  }
  
  .field-type-text {
    @apply bg-blue-100 text-blue-800;
  }
  
  .field-type-email {
    @apply bg-green-100 text-green-800;
  }
  
  .field-type-date {
    @apply bg-purple-100 text-purple-800;
  }
}
```

### Dashboard Cards

```css
@layer components {
  /* Metric card with container queries */
  .metric-card {
    container-type: inline-size;
    @apply bg-white rounded-xl shadow-sm p-4;
  }
  
  .metric-value {
    @apply text-2xl font-bold text-gray-900;
  }
  
  @container (min-width: 200px) {
    .metric-value {
      @apply text-3xl;
    }
  }
  
  @container (min-width: 300px) {
    .metric-card {
      @apply p-6;
    }
    .metric-value {
      @apply text-4xl;
    }
  }
  
  /* Status indicators */
  .status-badge {
    @apply inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium;
    
    &.status-active {
      @apply bg-green-50 text-green-700 ring-1 ring-green-600/20;
    }
    
    &.status-pending {
      @apply bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20;
    }
    
    &.status-inactive {
      @apply bg-gray-50 text-gray-700 ring-1 ring-gray-600/20;
    }
  }
}
```

### Supplier Profile Cards

```css
@layer components {
  .supplier-card {
    @apply 
      relative overflow-hidden
      bg-gradient-to-br from-white to-gray-50
      rounded-2xl shadow-lg
      transition-all duration-300
      hover:shadow-xl hover:-translate-y-1;
    
    /* Decorative gradient border */
    &::before {
      content: '';
      @apply 
        absolute inset-0 p-[2px] -z-10
        bg-gradient-to-br from-primary-500 to-purple-600
        rounded-2xl;
    }
  }
  
  .supplier-avatar {
    @apply 
      w-16 h-16 rounded-full
      ring-4 ring-white shadow-md;
  }
  
  .supplier-badge {
    @apply 
      absolute top-4 right-4
      px-3 py-1 bg-primary-500 text-white
      text-xs font-bold rounded-full
      animate-pulse;
  }
}
```

## 🔄 Migration from v3

### Key Differences

| Feature | Tailwind v3 | Tailwind v4 |
|---------|------------|------------|
| Config | `tailwind.config.js` | CSS `@theme` directive |
| Content | Manual paths | Automatic detection |
| PostCSS | Multiple plugins | Single plugin |
| Custom values | JS config | CSS variables |
| Performance | Fast | 10x faster |

### Migration Steps

1. **Update imports:**
```css
/* OLD (v3) */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* NEW (v4) */
@import "tailwindcss";
```

2. **Move config to CSS:**
```javascript
// OLD: tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#a855f7'
      }
    }
  }
}
```

```css
/* NEW: globals.css */
@theme {
  --color-primary: #a855f7;
}
```

3. **Update custom utilities:**
```css
/* OLD (v3) */
@layer utilities {
  .content-auto {
    content-visibility: auto;
  }
}

/* NEW (v4) - Same syntax, better performance! */
@layer utilities {
  .content-auto {
    content-visibility: auto;
  }
}
```

## 🎯 Best Practices for WedSync

### 1. Component-First Approach

```css
/* Define reusable components */
@layer components {
  .btn {
    @apply px-4 py-2 font-medium rounded-lg transition-colors;
  }
  
  .btn-primary {
    @apply btn bg-primary-500 text-white hover:bg-primary-600;
  }
  
  .btn-secondary {
    @apply btn bg-gray-200 text-gray-900 hover:bg-gray-300;
  }
}
```

### 2. Semantic Color Names

```css
@theme {
  /* Use semantic names for colors */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
  
  /* Brand colors */
  --color-brand: #a855f7;
  --color-brand-accent: #9333ea;
}
```

### 3. Responsive Container Queries

```css
/* Use container queries for truly responsive components */
.dashboard-widget {
  container-type: inline-size;
}

.widget-content {
  @apply p-4;
}

@container (min-width: 300px) {
  .widget-content {
    @apply p-6 flex gap-4;
  }
}
```

### 4. Dark Mode Support

```css
@theme {
  /* Define dark mode colors */
  --color-background: white;
  --color-foreground: #0a0a0a;
  
  @media (prefers-color-scheme: dark) {
    --color-background: #0a0a0a;
    --color-foreground: white;
  }
}

/* Use in components */
.card {
  @apply bg-background text-foreground;
}
```

## 🚦 Performance Tips

1. **Use CSS Grid/Flexbox utilities** instead of absolute positioning
2. **Leverage container queries** for responsive components
3. **Group related utilities** in @apply directives
4. **Use CSS variables** for dynamic values
5. **Minimize arbitrary values** - define in theme when reused

## ⚠️ v4 Alpha Limitations

1. Some v3 plugins may not be compatible yet
2. IDE support is still catching up
3. Documentation is evolving
4. Breaking changes possible before stable release

## 📚 Resources

- [Tailwind CSS v4 Alpha Blog](https://tailwindcss.com/blog/tailwindcss-v4-alpha)
- [Oxide Engine Details](https://tailwindcss.com/blog/tailwindcss-v4)
- [v4 Documentation](https://tailwindcss.com/docs/v4-beta)
- [Migration Guide](https://github.com/tailwindlabs/tailwindcss/discussions)