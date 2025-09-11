# UI Components Reference Library

This folder contains the reference implementation of all UI components for WedSync/WedMe.

## 📁 Structure

```
/ui-components
├── components/       # All reusable UI components
│   ├── Avatar.tsx
│   ├── Badge.tsx
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   ├── Table.tsx
│   └── ... (30+ components)
├── screens/         # Complete screen examples
│   ├── DashboardSupplier.tsx
│   └── DashboardCouple.tsx
├── styles/          # Global styles
│   └── global.css   # Tailwind + design tokens
└── lib/             # Utility functions
    ├── brand.ts     # Brand switching
    ├── format.ts    # Formatters
    └── weather.ts   # Weather utilities
```

## 🎨 Usage

1. **Reference Only**: These components serve as the canonical reference for implementation
2. **Copy patterns**: When building new components, copy the patterns from here
3. **Maintain consistency**: All new components must follow these patterns

## 📋 Component Standards

Each component follows these rules:
- TypeScript strict mode (no 'any')
- Semantic token usage only
- Dark mode support
- Mobile responsive
- Accessibility compliant
- Proper ARIA attributes

## 🔗 Related Documentation

- Main style guide: `../.claude/UNIFIED-STYLE-GUIDE.md`
- Tailwind config: `../tailwind.config.cjs`
- Master instructions: `../MASTER-INSTRUCTIONS.md`

## ⚠️ Important Notes

- These are reference implementations
- Adapt them to your specific use case
- Always maintain the styling patterns
- Never use raw hex colors or arbitrary spacing
- Test on mobile (375px minimum width)

**When in doubt, refer to UNIFIED-STYLE-GUIDE.md**