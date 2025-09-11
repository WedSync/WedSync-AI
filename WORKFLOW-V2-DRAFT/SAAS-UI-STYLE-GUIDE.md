# 🎨 WedSync SaaS UI Style Guide
## Complete Design System for General Application UI

**Version:** 2.0
**Last Updated:** 2025-01-22
**Status:** MANDATORY FOR ALL UI (except Journey/Forms Builders)

---

## 🚨 CRITICAL UI STACK
**ONLY USE THESE LIBRARIES:**
- **Untitled UI**: Primary component library
- **Magic UI**: Animation and visual enhancements
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons only

**DO NOT USE:**
- ❌ Radix UI
- ❌ Catalyst UI
- ❌ shadcn/ui
- ❌ Any other component libraries

---

## 🎯 Design Principles

### Core Philosophy
1. **Wedding-First Design**: Elegant, romantic, professional
2. **Mobile-First**: 375px minimum, 60% mobile usage
3. **Accessibility-First**: WCAG 2.1 AA compliance
4. **Performance-First**: <200ms component load, <1s page load
5. **Consistency**: Use Untitled UI patterns exclusively

---

## 🎨 Color System

### Untitled UI Color Palette
```css
/* Grayscale */
--gray-25: #FCFCFD;
--gray-50: #F9FAFB;
--gray-100: #F2F4F7;
--gray-200: #EAECF0;
--gray-300: #D0D5DD;
--gray-400: #98A2B3;
--gray-500: #667085;
--gray-600: #475467;
--gray-700: #344054;
--gray-800: #1D2939;
--gray-900: #101828;
--gray-950: #0C111D;

/* Primary - Wedding Purple */
--primary-25: #FCFAFF;
--primary-50: #F9F5FF;
--primary-100: #F4EBFF;
--primary-200: #E9D7FE;
--primary-300: #D6BBFB;
--primary-400: #B692F6;
--primary-500: #9E77ED;
--primary-600: #7F56D9;
--primary-700: #6941C6;
--primary-800: #53389E;
--primary-900: #42307D;

/* Success - Green */
--success-500: #12B76A;
--success-600: #039855;
--success-700: #027A48;

/* Error - Red */
--error-500: #F04438;
--error-600: #D92D20;
--error-700: #B42318;

/* Warning - Amber */
--warning-500: #F79009;
--warning-600: #DC6803;
--warning-700: #B54708;

/* Info - Blue */
--blue-500: #2E90FA;
--blue-600: #1570EF;
--blue-700: #175CD3;
```

### Semantic Variables
```css
/* Backgrounds */
--bg-primary: #FFFFFF;
--bg-secondary: #F9FAFB;
--bg-tertiary: #F2F4F7;

/* Text */
--text-primary: #101828;
--text-secondary: #344054;
--text-tertiary: #475467;
--text-quaternary: #667085;
--text-disabled: #98A2B3;

/* Borders */
--border-primary: #EAECF0;
--border-secondary: #D0D5DD;
--border-tertiary: #98A2B3;
```

---

## 📐 Layout System

### Container Widths
```css
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-2xl: 1536px;
```

### Navigation Dimensions
```css
--navbar-height: 64px;
--sidebar-width: 280px;
--sidebar-collapsed: 64px;
```

### Spacing Scale (8px base)
```css
--space-0: 0;
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem;  /* 8px */
--space-3: 0.75rem; /* 12px */
--space-4: 1rem;    /* 16px */
--space-5: 1.25rem; /* 20px */
--space-6: 1.5rem;  /* 24px */
--space-8: 2rem;    /* 32px */
--space-10: 2.5rem; /* 40px */
--space-12: 3rem;   /* 48px */
--space-16: 4rem;   /* 64px */
```

---

## 🔤 Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 
             'Inter', 'Segoe UI', sans-serif;
```

### Type Scale
```css
/* Display */
.display-2xl { font-size: 72px; line-height: 90px; letter-spacing: -0.02em; }
.display-xl  { font-size: 60px; line-height: 72px; letter-spacing: -0.02em; }
.display-lg  { font-size: 48px; line-height: 60px; letter-spacing: -0.02em; }
.display-md  { font-size: 36px; line-height: 44px; letter-spacing: -0.02em; }
.display-sm  { font-size: 30px; line-height: 38px; }
.display-xs  { font-size: 24px; line-height: 32px; }

/* Text */
.text-xl { font-size: 20px; line-height: 30px; }
.text-lg { font-size: 18px; line-height: 28px; }
.text-md { font-size: 16px; line-height: 24px; }
.text-sm { font-size: 14px; line-height: 20px; }
.text-xs { font-size: 12px; line-height: 18px; }
```

---

## 🧩 Component Specifications

### Buttons (Untitled UI Style)
```tsx
// Primary Button
<button className="
  px-4 py-2.5
  bg-primary-600 hover:bg-primary-700
  text-white font-semibold text-sm
  rounded-lg
  shadow-xs hover:shadow-sm
  transition-all duration-200
  focus:outline-none focus:ring-4 focus:ring-primary-100
">
  Button Text
</button>

// Sizes
'btn-xs': 'px-3 py-2 text-xs',
'btn-sm': 'px-3.5 py-2 text-sm',
'btn-md': 'px-4 py-2.5 text-sm',
'btn-lg': 'px-4.5 py-2.5 text-base',
'btn-xl': 'px-5 py-3 text-base'
```

### Form Inputs
```tsx
<input className="
  w-full px-3.5 py-2.5
  bg-white
  border border-gray-300
  rounded-lg
  text-gray-900 placeholder-gray-500
  shadow-xs
  focus:outline-none focus:ring-4 focus:ring-primary-100
  focus:border-primary-300
  transition-all duration-200
"/>
```

### Cards
```tsx
<div className="
  bg-white
  border border-gray-200
  rounded-xl
  p-6
  shadow-xs hover:shadow-md
  transition-all duration-200
">
  {/* Card content */}
</div>
```

### Badges
```tsx
// Status Badges
<span className="
  inline-flex items-center
  px-2.5 py-0.5
  rounded-full
  text-xs font-medium
  bg-success-50 text-success-700
  border border-success-200
">
  Active
</span>
```

### Modals
```tsx
// Modal Backdrop
<div className="
  fixed inset-0 z-50
  bg-gray-900/50 backdrop-blur-sm
  flex items-center justify-center
">
  {/* Modal Content */}
  <div className="
    bg-white rounded-2xl
    max-w-lg w-full mx-4
    shadow-xl
    overflow-hidden
  ">
    {/* Modal sections */}
  </div>
</div>
```

---

## 🎭 Visual Effects

### Shadows (Untitled UI Scale)
```css
--shadow-xs: 0px 1px 2px rgba(16, 24, 40, 0.05);
--shadow-sm: 0px 1px 2px rgba(16, 24, 40, 0.06), 0px 1px 3px rgba(16, 24, 40, 0.10);
--shadow-md: 0px 2px 4px rgba(16, 24, 40, 0.06), 0px 4px 6px rgba(16, 24, 40, 0.10);
--shadow-lg: 0px 4px 6px rgba(16, 24, 40, 0.03), 0px 10px 15px rgba(16, 24, 40, 0.08);
--shadow-xl: 0px 8px 8px rgba(16, 24, 40, 0.03), 0px 20px 25px rgba(16, 24, 40, 0.08);
--shadow-2xl: 0px 25px 50px rgba(16, 24, 40, 0.12);
```

### Border Radius
```css
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 10px;
--radius-xl: 12px;
--radius-2xl: 16px;
--radius-3xl: 20px;
--radius-full: 9999px;
```

### Focus States
```css
--focus-ring-primary: 0px 0px 0px 4px rgba(158, 119, 237, 0.24);
--focus-ring-error: 0px 0px 0px 4px rgba(240, 68, 56, 0.24);
--focus-ring-success: 0px 0px 0px 4px rgba(18, 183, 106, 0.24);
```

### Transitions
```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
```

---

## 🎬 Magic UI Animations

### Shimmer Effect
```tsx
import { ShimmerButton } from '@/components/magicui/shimmer-button';

<ShimmerButton className="shadow-2xl">
  <span className="whitespace-pre-wrap text-center text-sm font-medium">
    Shimmer Button
  </span>
</ShimmerButton>
```

### Animated Gradients
```css
.gradient-animation {
  background: linear-gradient(
    135deg,
    var(--primary-400),
    var(--primary-600),
    var(--primary-400)
  );
  background-size: 200% 200%;
  animation: gradient 3s ease infinite;
}

@keyframes gradient {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
```

---

## 📱 Responsive Breakpoints

```css
/* Mobile First */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

---

## 🏗️ Component Import Structure

```tsx
// ✅ CORRECT - Use Untitled UI components
import { Button, Input, Card } from '@/components/untitled-ui';
import { ShimmerButton } from '@/components/magicui/shimmer-button';

// ❌ WRONG - Never import these
import { Dialog } from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button'; // shadcn
```

---

## 📋 Implementation Checklist

### For Every Component:
- [ ] Uses Untitled UI color system
- [ ] Follows Untitled UI spacing scale
- [ ] Has proper focus states
- [ ] Works on 375px width
- [ ] Uses semantic HTML
- [ ] Has ARIA labels where needed
- [ ] Tested in light/dark mode
- [ ] No Radix/Catalyst imports

### For Every Page:
- [ ] Uses approved layout components
- [ ] Mobile-first responsive
- [ ] Proper loading states
- [ ] Error handling UI
- [ ] Empty states designed
- [ ] Accessibility tested

---

## 🚫 Migration from Radix UI

### Components to Replace:
| Radix UI Component | Replace With |
|-------------------|--------------|
| @radix-ui/react-dialog | Untitled UI Modal |
| @radix-ui/react-select | Untitled UI Select |
| @radix-ui/react-alert-dialog | Untitled UI Alert |
| @radix-ui/react-scroll-area | Native scrolling + styles |
| @radix-ui/react-separator | Untitled UI Divider |
| @radix-ui/react-progress | Untitled UI Progress |

---

## 📚 Resources
- [Untitled UI Documentation](https://untitledui.com/docs)
- [Magic UI Components](https://magicui.design)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Lucide Icons](https://lucide.dev)

---

**Remember: When in doubt, check Untitled UI patterns first!**