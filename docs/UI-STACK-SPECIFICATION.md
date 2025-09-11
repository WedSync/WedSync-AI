# 🎨 UI/UX STACK SPECIFICATION
## WedSync 2.0 Design System

**Last Updated:** January 17, 2025  
**Status:** Migration from Catalyst → Untitled UI + Magic UI

---

## 📚 CURRENT UI STACK

### **Primary Component Libraries**
1. **Untitled UI** - Professional design system with Figma-to-code workflow
   - Modern, clean aesthetic perfect for SaaS
   - Comprehensive component library
   - Built-in dark mode support
   - Accessibility first approach

2. **Magic UI** - Animation and interaction enhancements
   - Beautiful micro-interactions
   - Smooth transitions
   - Loading states
   - Particle effects for key moments

3. **Tailwind CSS** - Utility-first styling framework
   - Custom design tokens
   - Responsive design
   - Consistent spacing and colors

### **Supporting Libraries**
- **Framer Motion** - Complex animations
- **Lucide React** - Icon system
- **Headless UI** - Accessible primitives
- **Radix UI** - Additional accessible components

---

## 🔄 MIGRATION STATUS

### **Current State (Legacy)**
- ✅ Catalyst UI components (to be replaced)
- ✅ Basic Tailwind configuration
- ✅ Working forms and dashboards

### **Target State (Untitled UI + Magic UI)**
- ⏳ Untitled UI component library
- ⏳ Magic UI animations
- ⏳ Custom brand theming
- ⏳ Consistent design language

---

## 🎯 DESIGN PRINCIPLES

### **Untitled UI Philosophy**
1. **Clean & Professional** - Minimalist SaaS aesthetic
2. **Accessibility First** - WCAG 2.1 AA compliance
3. **Responsive** - Mobile-first approach
4. **Consistent** - Design tokens throughout

### **Magic UI Enhancements**
1. **Delightful Interactions** - Subtle animations that guide users
2. **Performance** - GPU-accelerated animations
3. **Purpose-Driven** - Animations serve UX, not just aesthetics
4. **Brand Moments** - Special effects for key achievements

---

## 🛠 IMPLEMENTATION GUIDE

### **Phase 1: Foundation (After Backend Complete)**
```bash
# Install Untitled UI components
npm install @untitled-ui/react

# Install Magic UI
npm install @magic-ui/react
```

### **Phase 2: Component Migration**
Priority order for migration:
1. Navigation (Navbar, Sidebar)
2. Forms (Input, Select, Buttons)
3. Dashboard widgets
4. Data tables
5. Modals and overlays

### **Phase 3: Magic UI Integration**
Add animations to:
- Page transitions
- Form submissions (success animations)
- PDF import progress
- Payment confirmations
- Onboarding flow

---

## 🎨 DESIGN TOKENS

### **Colors (Untitled UI Standard)**
```css
--primary: #7F56D9;     /* Purple */
--secondary: #6941C6;   /* Dark Purple */
--success: #12B76A;     /* Green */
--warning: #F79009;     /* Orange */
--error: #F04438;       /* Red */
--gray-50: #F9FAFB;
--gray-900: #101828;
```

### **Typography**
- **Font:** Inter (Untitled UI default)
- **Headings:** 600-700 weight
- **Body:** 400-500 weight
- **Monospace:** JetBrains Mono for code

### **Spacing Scale**
Using Tailwind's default scale aligned with Untitled UI:
- xs: 0.5rem (8px)
- sm: 0.75rem (12px)
- md: 1rem (16px)
- lg: 1.5rem (24px)
- xl: 2rem (32px)

---

## 📦 COMPONENT MAPPING

### **Catalyst → Untitled UI Migration**

| Current (Catalyst) | New (Untitled UI) | Magic UI Enhancement |
|-------------------|-------------------|---------------------|
| Navbar | Navigation Bar | Scroll animations |
| Sidebar | Sidebar Navigation | Hover effects |
| Button | Button Component | Click ripples |
| Form | Form Controls | Field animations |
| Card | Card Component | Hover lift |
| Modal | Dialog | Smooth transitions |
| Table | Data Table | Row animations |

---

## 🚀 QUICK START FOR DEVELOPERS

### **Using Untitled UI Components**
```tsx
import { Button, Card, Input } from '@untitled-ui/react';
import { fadeIn, shimmer } from '@magic-ui/animations';

function MyComponent() {
  return (
    <Card className={fadeIn}>
      <Input placeholder="Enter email" />
      <Button variant="primary" className={shimmer}>
        Submit
      </Button>
    </Card>
  );
}
```

### **Design Resources**
- Untitled UI Figma: [Link to be added]
- Magic UI Examples: [Link to be added]
- Component Storybook: [To be created]

---

## 📋 UI POLISH SPRINT PLAN

### **When:** After backend integration complete
### **Duration:** 2-3 days
### **Goals:**
1. Replace all Catalyst components with Untitled UI
2. Add Magic UI animations to key interactions
3. Implement consistent theming
4. Create component documentation

### **Day 1: Core Components**
- Navigation components
- Form components
- Button system

### **Day 2: Complex Components**
- Dashboard widgets
- Data tables
- Modals and overlays

### **Day 3: Polish & Animation**
- Magic UI animations
- Loading states
- Error states
- Success celebrations

---

## 🎯 SUCCESS METRICS

### **UI Quality Checklist**
- [ ] All components use Untitled UI
- [ ] Magic UI animations on key interactions
- [ ] Consistent design tokens throughout
- [ ] Dark mode fully supported
- [ ] Mobile responsive (375px minimum)
- [ ] Accessibility score: 100%
- [ ] Performance: <100ms interaction delay

---

## 📚 REFERENCES

- **Untitled UI Docs:** https://untitledui.com/docs
- **Magic UI Gallery:** https://magicui.design
- **Tailwind CSS:** https://tailwindcss.com
- **Component Best Practices:** /wedsync/.claude/CLAUDE.md

---

**Note:** This is the official UI/UX specification for WedSync 2.0. All new components should follow this guide.