# 🚀 UI INSTALLATION QUICK REFERENCE
## Fast Setup for Untitled UI ($349) + Magic UI + shadcn/ui

**Your License:** Untitled UI React ($349) - Full access to all components  
**Installation Time:** ~15 minutes  
**Prerequisites:** Next.js 15, Tailwind CSS v4, TypeScript

---

## ⚡ QUICK INSTALL (Copy & Paste)

```bash
# 1. Initialize shadcn/ui (Required for Magic UI)
npx shadcn@latest init
# Select: Yes, Default, Slate, src/styles/globals.css, Yes, tailwind.config.js, Yes, src/components, @/components, Yes

# 2. Install Untitled UI (You have the $349 license!)
npx untitledui@latest init --nextjs

# 3. Add your first Magic UI component
npx shadcn@latest add "https://magicui.design/r/shine-border.json"

# 4. Test everything works
npm run dev
```

---

## 📦 WHAT YOU GET

### **Untitled UI ($349 License):**
- ✅ 100+ React components
- ✅ Full TypeScript support
- ✅ React Aria accessibility
- ✅ Tailwind CSS v4 optimized
- ✅ CLI for adding components
- ✅ Lifetime updates
- ✅ Icons library included

### **Magic UI (Free):**
- ✅ 30+ animation components
- ✅ Globe, Particles, Beams
- ✅ Shine borders, Marquees
- ✅ Number tickers, Sparkles
- ✅ Copy-paste model
- ✅ Fully customizable

### **shadcn/ui (Free):**
- ✅ Foundation for Magic UI
- ✅ Additional components
- ✅ Theming system
- ✅ Dark mode support

---

## 🎯 ADD COMPONENTS

### **Untitled UI Components:**
```bash
# Add individually as needed
npx untitledui@latest add button
npx untitledui@latest add card
npx untitledui@latest add input
npx untitledui@latest add table
npx untitledui@latest add modal
npx untitledui@latest add dropdown
npx untitledui@latest add tabs
npx untitledui@latest add avatar
npx untitledui@latest add badge
npx untitledui@latest add toast
```

### **Magic UI Components:**
```bash
# Add animation components
npx shadcn@latest add "https://magicui.design/r/animated-beam.json"
npx shadcn@latest add "https://magicui.design/r/border-beam.json"
npx shadcn@latest add "https://magicui.design/r/shine-border.json"
npx shadcn@latest add "https://magicui.design/r/globe.json"
npx shadcn@latest add "https://magicui.design/r/marquee.json"
npx shadcn@latest add "https://magicui.design/r/particles.json"
npx shadcn@latest add "https://magicui.design/r/sparkles.json"
npx shadcn@latest add "https://magicui.design/r/blur-in.json"
npx shadcn@latest add "https://magicui.design/r/number-ticker.json"
```

---

## 💻 USAGE EXAMPLES

### **Form with Untitled UI:**
```typescript
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

<Card>
  <Input label="Wedding Date" type="date" />
  <Button>Save Date</Button>
</Card>
```

### **Hero with Magic UI:**
```typescript
import { Globe } from '@/components/ui/globe';
import { ShineBorder } from '@/components/ui/shine-border';

<ShineBorder>
  <Globe className="w-full h-96" />
  <h1>WedSync Platform</h1>
</ShineBorder>
```

### **Mixed Components:**
```typescript
import { Button } from '@/components/ui/button';        // Untitled UI
import { BorderBeam } from '@/components/ui/border-beam'; // Magic UI

<div className="relative">
  <BorderBeam />
  <Button size="lg">Upgrade to Pro</Button>
</div>
```

---

## 🔧 CONFIGURATION FILES

### **components.json (Created by shadcn init):**
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### **Required in globals.css:**
```css
@import './theme.css';  /* Untitled UI theme */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## ✅ VERIFICATION CHECKLIST

After installation, check:
- [ ] `/components.json` exists
- [ ] `/src/components/ui/` created
- [ ] Untitled UI CLI works: `npx untitledui@latest --help`
- [ ] Magic UI component added successfully
- [ ] No TypeScript errors
- [ ] `npm run dev` works

---

## 🚨 TROUBLESHOOTING

### **"Command not found" error:**
```bash
# Clear npm cache
npm cache clean --force
# Retry installation
npx untitledui@latest init --nextjs
```

### **Component not found after adding:**
```bash
# Check installation path
ls -la src/components/ui/
# Re-add with overwrite
npx untitledui@latest add button --overwrite
```

### **Styling issues:**
```bash
# Ensure Tailwind v4 installed
npm list tailwindcss
# Should show: tailwindcss@4.x.x
```

### **TypeScript errors:**
```typescript
// Add to tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 📚 RESOURCES

- **Untitled UI Docs:** https://untitledui.com/react/docs
- **Magic UI Gallery:** https://magicui.design/components
- **shadcn/ui Docs:** https://ui.shadcn.com/docs
- **Your License:** Check email for Untitled UI license key

---

## 🎯 NEXT STEPS

1. **Today:** Install all three libraries
2. **Tomorrow:** Start migrating buttons and cards
3. **This Week:** Complete core component migration
4. **Next Week:** Remove Catalyst completely

**Remember:** You paid $349 for Untitled UI - use all its premium components!