#!/bin/bash

# Script to fetch latest documentation for WedSync tech stack
# Run this periodically to ensure you have up-to-date references

echo "📚 Fetching latest documentation URLs for WedSync tech stack..."
echo ""

# Create docs reference file
cat > docs/external-docs-reference.md << 'EOF'
# External Documentation Reference
Generated: $(date)

## Core Framework Documentation

### Next.js 15.4.3
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)

### React 19.1.1
- [React 19 Reference](https://react.dev/reference/react)
- [React 19 Blog Updates](https://react.dev/blog)
- [New Hooks Documentation](https://react.dev/reference/react/hooks)

### TypeScript 5.9.2
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [TypeScript 5.9 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html)

## UI & Styling

### Tailwind CSS 4.1.11
- [Tailwind CSS v4 Alpha Docs](https://tailwindcss.com/docs)
- [Oxide Engine](https://tailwindcss.com/blog/tailwindcss-v4-alpha)

### Headless UI 2.2.7
- [Headless UI Documentation](https://headlessui.com/)
- [React Components](https://headlessui.com/react/menu)

### Motion 12.23.12
- [Motion Documentation](https://motion.dev/)
- [Migration from Framer Motion](https://motion.dev/docs/migration)

## Backend & Database

### Supabase
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase with Next.js App Router](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Realtime Subscriptions](https://supabase.com/docs/guides/realtime)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

## Forms & Validation

### React Hook Form 7.62.0
- [React Hook Form Documentation](https://react-hook-form.com/)
- [Advanced Usage](https://react-hook-form.com/advanced-usage)

### Zod 4.0.16
- [Zod Documentation](https://zod.dev/)
- [Zod v4 Migration](https://github.com/colinhacks/zod/releases/tag/v4.0.0)

## Testing

### Playwright 1.54.2
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)

### Jest 30.0.5
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Jest 30 Release Notes](https://github.com/jestjs/jest/releases)

### Testing Library
- [Testing Library Documentation](https://testing-library.com/docs/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## Development Tools

### ESLint 9.33.0
- [ESLint Documentation](https://eslint.org/docs/latest/)
- [Flat Config Migration](https://eslint.org/docs/latest/use/configure/migration-guide)

## Quick Reference Commands

\`\`\`bash
# Check for outdated packages
npm outdated

# View package documentation
npm docs [package-name]

# Check latest version of a package
npm view [package-name] version

# Update Next.js to latest
npm update next react react-dom
\`\`\`

## Version Checking Script

\`\`\`javascript
// check-versions.js
const packages = [
  'next', 'react', 'react-dom', 'typescript',
  '@supabase/supabase-js', 'tailwindcss'
];

packages.forEach(async (pkg) => {
  const { version } = require(\`./node_modules/\${pkg}/package.json\`);
  console.log(\`\${pkg}: \${version}\`);
});
\`\`\`
EOF

echo "✅ Documentation reference created at docs/external-docs-reference.md"
echo ""
echo "🔍 Checking for version updates..."

# Check for outdated packages
cd /Volumes/Extreme\ Pro/CODE/WedSync\ 2.0/WedSync\ Dev/wedsync
echo ""
echo "📦 Current vs Latest versions:"
npm outdated --depth=0 2>/dev/null || echo "All packages are up to date!"

echo ""
echo "💡 Tips:"
echo "1. Review docs/tech-stack-updates.md for specific recommendations"
echo "2. Check docs/external-docs-reference.md for quick links"
echo "3. Run 'npm outdated' regularly to stay updated"
echo "4. Consider setting up Dependabot or Renovate for automatic updates"