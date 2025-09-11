/**
 * Untitled UI Theme Configuration for WedSync
 * Preserves wedding-specific design while adopting Untitled UI patterns
 */

export const untitledTheme = {
  colors: {
    // Wedding Brand Colors
    brand: {
      25: '#fef2f8',
      50: '#fce7f3',
      100: '#fbcfe8',
      200: '#f9a8d4',
      300: '#f472b6',
      400: '#ec4899',
      500: '#db2777', // Primary wedding rose
      600: '#be185d',
      700: '#9d174d',
      800: '#831843',
      900: '#500724',
      950: '#2e0514',
    },
    // Secondary Purple (Elegant)
    secondary: {
      25: '#faf5ff',
      50: '#f3e8ff',
      100: '#e9d5ff',
      200: '#d8b4fe',
      300: '#c084fc',
      400: '#a855f7',
      500: '#9333ea', // Secondary purple
      600: '#7e22ce',
      700: '#6b21a8',
      800: '#581c87',
      900: '#3b0764',
      950: '#1e0533',
    },
    // Vendor-specific colors
    vendor: {
      photographer: '#3b82f6', // Blue
      venue: '#10b981', // Emerald
      florist: '#ec4899', // Pink
      caterer: '#f97316', // Orange
      musician: '#8b5cf6', // Violet
      decorator: '#06b6d4', // Cyan
    },
    // Semantic colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, -apple-system, sans-serif',
      serif: 'Playfair Display, serif', // Elegant wedding serif
      mono: 'JetBrains Mono, monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
    },
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
    '2xl': '4rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
  },
  shadows: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    wedding: '0 10px 25px -5px rgb(219 39 119 / 0.25)', // Rose shadow
    elegant: '0 10px 25px -5px rgb(147 51 234 / 0.2)', // Purple shadow
  },
};

// Design token CSS variables
export const cssVariables = `
  :root {
    /* Brand Colors */
    --color-brand-50: ${untitledTheme.colors.brand[50]};
    --color-brand-100: ${untitledTheme.colors.brand[100]};
    --color-brand-200: ${untitledTheme.colors.brand[200]};
    --color-brand-300: ${untitledTheme.colors.brand[300]};
    --color-brand-400: ${untitledTheme.colors.brand[400]};
    --color-brand-500: ${untitledTheme.colors.brand[500]};
    --color-brand-600: ${untitledTheme.colors.brand[600]};
    --color-brand-700: ${untitledTheme.colors.brand[700]};
    --color-brand-800: ${untitledTheme.colors.brand[800]};
    --color-brand-900: ${untitledTheme.colors.brand[900]};
    
    /* Secondary Colors */
    --color-secondary-50: ${untitledTheme.colors.secondary[50]};
    --color-secondary-100: ${untitledTheme.colors.secondary[100]};
    --color-secondary-200: ${untitledTheme.colors.secondary[200]};
    --color-secondary-300: ${untitledTheme.colors.secondary[300]};
    --color-secondary-400: ${untitledTheme.colors.secondary[400]};
    --color-secondary-500: ${untitledTheme.colors.secondary[500]};
    --color-secondary-600: ${untitledTheme.colors.secondary[600]};
    --color-secondary-700: ${untitledTheme.colors.secondary[700]};
    --color-secondary-800: ${untitledTheme.colors.secondary[800]};
    --color-secondary-900: ${untitledTheme.colors.secondary[900]};
    
    /* Semantic Colors */
    --color-success: ${untitledTheme.colors.success};
    --color-warning: ${untitledTheme.colors.warning};
    --color-error: ${untitledTheme.colors.error};
    --color-info: ${untitledTheme.colors.info};
    
    /* Typography */
    --font-sans: ${untitledTheme.typography.fontFamily.sans};
    --font-serif: ${untitledTheme.typography.fontFamily.serif};
    --font-mono: ${untitledTheme.typography.fontFamily.mono};
    
    /* Shadows */
    --shadow-sm: ${untitledTheme.shadows.sm};
    --shadow-md: ${untitledTheme.shadows.md};
    --shadow-lg: ${untitledTheme.shadows.lg};
    --shadow-wedding: ${untitledTheme.shadows.wedding};
    --shadow-elegant: ${untitledTheme.shadows.elegant};
  }
`;
