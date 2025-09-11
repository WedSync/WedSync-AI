# 🎨 UI LIBRARIES INSTALLATION GUIDE
## Untitled UI + Magic UI + shadcn/ui Setup

**Created:** January 15, 2025  
**Status:** Ready for implementation  
**Complexity:** Medium - requires careful sequencing  

---

## 🚨 CRITICAL UNDERSTANDING

### **Library Architecture:**
1. **Untitled UI** - Premium React component library ($349 license) with CLI installation
2. **Magic UI** - shadcn/ui-based animation/effect components (copy-paste model)
3. **shadcn/ui** - Required foundation for Magic UI
4. **Catalyst UI** - Current library (keep temporarily)

### **Key Technologies:**
- **React Aria** - Accessibility foundation for Untitled UI
- **Tailwind CSS v4** - Required for both libraries
- **TypeScript** - Full type safety

### **Key Insight:**
Magic UI is NOT a traditional package - it copies components directly into your `/components/ui/` folder!

---

## 📦 COMPLETE INSTALLATION STEPS

### **Step 1: Initialize shadcn/ui (Required for Magic UI)**

```bash
# This creates the foundation Magic UI needs
npx shadcn@latest init

# You'll be asked several questions:
# - Would you like to use TypeScript? → Yes
# - Which style would you like to use? → Default
# - Which color would you like to use as base? → Slate
# - Where is your global CSS file? → src/styles/globals.css
# - Do you want to use CSS variables? → Yes
# - Where is your tailwind.config.js? → tailwind.config.js
# - Configure components.json? → Yes
# - Where is your components folder? → src/components
# - Configure import alias? → @/components
# - Are you using React Server Components? → Yes
```

This creates:
- `components.json` - Configuration file
- `/src/components/ui/` - Component directory
- Updates to `tailwind.config.js`
- CSS variable setup

---

### **Step 2: Install Untitled UI**

**Method 1: CLI Installation (RECOMMENDED)**
```bash
# This sets up everything automatically
npx untitledui@latest init --nextjs

# This will:
# - Install all dependencies
# - Set up theme configuration
# - Configure Tailwind
# - Add component structure
```

**Method 2: Manual Installation**
```bash
# Install core packages
npm install @untitledui/icons \
  react-aria-components \
  tailwindcss-react-aria-components \
  tailwind-merge \
  tailwindcss-animate

# Note: You paid $349 for the React license - you have access to all components!
```

**Add Individual Components:**
```bash
# Add components as needed
npx untitledui@latest add button
npx untitledui@latest add card
npx untitledui@latest add input
npx untitledui@latest add table
# etc...
```

---

### **Step 3: Add Magic UI Components (As Needed)**

Magic UI components are added individually:

```bash
# Browse available components at: https://magicui.design/components

# Add specific components:
npx shadcn@latest add "https://magicui.design/r/animated-beam.json"
npx shadcn@latest add "https://magicui.design/r/animated-list.json"
npx shadcn@latest add "https://magicui.design/r/bento-grid.json"
npx shadcn@latest add "https://magicui.design/r/blur-in.json"
npx shadcn@latest add "https://magicui.design/r/border-beam.json"
npx shadcn@latest add "https://magicui.design/r/globe.json"
npx shadcn@latest add "https://magicui.design/r/marquee.json"
npx shadcn@latest add "https://magicui.design/r/number-ticker.json"
npx shadcn@latest add "https://magicui.design/r/particles.json"
npx shadcn@latest add "https://magicui.design/r/shine-border.json"
npx shadcn@latest add "https://magicui.design/r/sparkles.json"
```

Each command:
- Downloads component code
- Places it in `/src/components/ui/`
- Installs any required dependencies
- Component is now part of YOUR codebase

---

## 🔧 CONFIGURATION

### **1. Update tsconfig.json (if needed)**

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/ui/*": ["./src/components/ui/*"]
    }
  }
}
```

### **2. Create Theme Provider**

```typescript
// /src/providers/theme-provider.tsx
'use client';

import { UntitledUIProvider } from '@untitled-ui/react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

// Wedding theme configuration
const weddingTheme = {
  colors: {
    primary: '#7F56D9',  // Purple for elegance
    secondary: '#F9FAFB', // Soft white
    accent: '#F4EBFF',    // Lavender
  },
  fonts: {
    heading: 'Playfair Display, serif',
    body: 'Inter, sans-serif',
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
    >
      <UntitledUIProvider theme={weddingTheme}>
        {children}
      </UntitledUIProvider>
    </NextThemesProvider>
  );
}
```

### **3. Update Layout**

```typescript
// /src/app/layout.tsx
import { ThemeProvider } from '@/providers/theme-provider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## 💻 USAGE EXAMPLES

### **Using Untitled UI Components:**

```typescript
// Components are added to your project via CLI
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar } from '@untitledui/icons';

export function ContactForm() {
  return (
    <Card>
      <Input placeholder="Couple Names" icon={Calendar} />
      <Input type="date" label="Wedding Date" />
      <Button variant="primary" size="lg">
        Save Details
      </Button>
    </Card>
  );
}
```

### **Using Magic UI Components:**

```typescript
// Components are in YOUR codebase after installation
import { Globe } from '@/components/ui/globe';
import { Marquee } from '@/components/ui/marquee';
import { BorderBeam } from '@/components/ui/border-beam';

export function HeroSection() {
  return (
    <div className="relative">
      <Globe className="absolute inset-0" />
      <BorderBeam />
      <Marquee>
        <span>Beautiful Weddings</span>
        <span>Stunning Venues</span>
        <span>Perfect Memories</span>
      </Marquee>
    </div>
  );
}
```

### **Mixing Both Libraries:**

```typescript
import { Button } from '@untitled-ui/react';           // Untitled UI
import { ShineBorder } from '@/components/ui/shine-border'; // Magic UI

export function UpgradeCard() {
  return (
    <ShineBorder color="purple">
      <div className="p-6">
        <h3>Upgrade to Professional</h3>
        <p>Unlock AI features and automation</p>
        <Button>Upgrade for £49/month</Button>
      </div>
    </ShineBorder>
  );
}
```

---

## 🎯 MIGRATION ORDER

### **Phase 1: Foundation (Day 1)**
1. Initialize shadcn/ui
2. Install Untitled UI
3. Set up theme provider
4. Test both work alongside Catalyst

### **Phase 2: Core Components (Day 2-3)**
```bash
# Add essential Magic UI components
npx shadcn@latest add "https://magicui.design/r/border-beam.json"
npx shadcn@latest add "https://magicui.design/r/shine-border.json"
npx shadcn@latest add "https://magicui.design/r/blur-in.json"
```

Replace Catalyst components:
- Catalyst Button → Untitled UI Button
- Catalyst Card → Untitled UI Card + Magic UI BorderBeam
- Catalyst Input → Untitled UI Input

### **Phase 3: Advanced Features (Day 4-5)**
```bash
# Add showcase components
npx shadcn@latest add "https://magicui.design/r/globe.json"
npx shadcn@latest add "https://magicui.design/r/particles.json"
npx shadcn@latest add "https://magicui.design/r/animated-list.json"
```

Use for:
- Hero sections (Globe)
- Feature lists (AnimatedList)
- Backgrounds (Particles)

---

## 🚨 COMMON ISSUES & SOLUTIONS

### **Issue 1: Component not found after adding**
```bash
# Solution: Check components.json path configuration
cat components.json
# Ensure "aliases.components" matches your import path
```

### **Issue 2: Styling conflicts**
```css
/* Add to globals.css to reset conflicts */
.ui-reset {
  all: revert;
}
```

### **Issue 3: TypeScript errors**
```typescript
// Add to next-env.d.ts
declare module '@/components/ui/*';
```

### **Issue 4: Magic UI component not working**
```bash
# Re-add the component
npx shadcn@latest add "https://magicui.design/r/[component].json" --overwrite
```

---

## ✅ VERIFICATION CHECKLIST

After installation, verify:

- [ ] `components.json` exists in root
- [ ] `/src/components/ui/` directory created
- [ ] Untitled UI imports work
- [ ] Magic UI components render
- [ ] No TypeScript errors
- [ ] Tailwind classes apply correctly
- [ ] Theme provider wraps app
- [ ] Catalyst still works (parallel mode)

---

## 📚 RESOURCES

### **Documentation:**
- Untitled UI: https://untitledui.com/docs
- Magic UI: https://magicui.design/docs
- shadcn/ui: https://ui.shadcn.com/docs

### **Component Galleries:**
- Magic UI Components: https://magicui.design/components
- Untitled UI Storybook: https://storybook.untitledui.com

### **Support:**
- Magic UI Discord: https://discord.gg/magicui
- Untitled UI Support: support@untitledui.com

---

## 🎨 WEDDING-SPECIFIC CUSTOMIZATIONS

### **Color Palette for Weddings:**
```css
:root {
  --wedding-white: #FFFFFF;
  --wedding-ivory: #FFFFF0;
  --wedding-blush: #FFE4E1;
  --wedding-gold: #FFD700;
  --wedding-sage: #87A96B;
  --wedding-lavender: #E6E6FA;
  --wedding-dusty-blue: #6B8CAE;
}
```

### **Typography for Elegance:**
```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');

.wedding-heading {
  font-family: 'Playfair Display', serif;
}

.wedding-body {
  font-family: 'Inter', sans-serif;
  font-weight: 300;
}
```

---

## 🚀 READY TO START!

Run these commands in order:
```bash
# 1. Initialize shadcn/ui
npx shadcn@latest init

# 2. Install Untitled UI
npm install @untitled-ui/react

# 3. Add your first Magic UI component
npx shadcn@latest add "https://magicui.design/r/shine-border.json"

# 4. Test everything works
npm run dev
```

**Remember:** Keep Catalyst working in parallel until migration is complete!