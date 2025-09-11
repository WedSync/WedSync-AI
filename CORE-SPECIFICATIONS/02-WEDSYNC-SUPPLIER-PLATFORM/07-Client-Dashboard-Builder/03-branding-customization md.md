# 03-branding-customization.md

## Overview

Complete white-label branding system for client dashboards removing WedSync branding entirely.

## Brand Configuration

```
interface BrandingConfig {
  logo: {
    primary: string // URL
    favicon: string
    emailHeader?: string
  }
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
    success: string
    warning: string
    error: string
  }
  typography: {
    headingFont: FontFamily
    bodyFont: FontFamily
    baseFontSize: number
  }
  customCSS?: string
}
```

## Logo Management

- Multiple format support (PNG, SVG)
- Automatic resizing
- Retina display optimization
- Dark mode variants

## Color System

```
// Apply brand colors
const appliedStyles = {
  '--primary-color': brand.colors.primary,
  '--secondary-color': brand.colors.secondary,
  // Generate tints/shades
  '--primary-light': lighten(brand.colors.primary, 0.2),
  '--primary-dark': darken(brand.colors.primary, 0.2)
}
```

## Typography

- Google Fonts integration
- Custom font upload
- Font pairing suggestions
- Responsive scaling

## Layout Customization

- Header styles
- Navigation placement
- Section spacing
- Border radius preferences

## White-Label Features

- Remove all WedSync mentions
- Custom footer content
- Branded email notifications
- Custom meta tags

## CSS Injection

```
// Advanced customization
const customStyles = `
  .dashboard-header {
    background: linear-gradient(...);
    border-bottom: 2px solid var(--accent);
  }
`
```