# WedSync Demo Mode - Complete Documentation

> **Version**: 1.0  
> **Last Updated**: January 2025  
> **Status**: Production Ready  

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Demo Personas](#demo-personas)
5. [Configuration](#configuration)
6. [Components](#components)
7. [Screenshots & Frozen Time](#screenshots--frozen-time)
8. [Brand Assets](#brand-assets)
9. [Development](#development)
10. [Troubleshooting](#troubleshooting)
11. [API Reference](#api-reference)

---

## 🎯 Overview

WedSync Demo Mode is a comprehensive system that allows potential customers to experience the full functionality of both WedSync (supplier platform) and WedMe.app (couple platform) through realistic demo data and personas.

### ✨ Key Features

- **12 Professional Demo Personas**: Photographers, videographers, DJs, florists, caterers, musicians, venues, hair stylists, makeup artists, planners, couples, and admin
- **Cross-App Navigation**: Seamlessly switch between WedSync and WedMe.app
- **Professional Brand Assets**: Real logos and couple photos for authentic experience
- **Screenshot Mode**: Frozen time and optimized UI for presentations
- **Realistic Demo Data**: Wedding timelines, forms, messages, and supplier relationships
- **Role-Based Permissions**: Different dashboards and features per persona type

### 🏗️ System Architecture

```
Demo Mode System
├── Environment Guard (prevents prod access)
├── Demo Authentication (localStorage sessions)
├── Cross-App Routing (WedSync ↔ WedMe.app)
├── Brand Assets (professional logos/photos)
├── Screenshot Helpers (frozen time/UI)
├── Data Providers (realistic demo data)
└── Database Migrations (demo seed data)
```

---

## 🚀 Quick Start

### Prerequisites

1. **Environment Setup**
   ```bash
   # Set demo mode environment variable
   NEXT_PUBLIC_DEMO_MODE=true
   ```

2. **Database Setup**
   ```bash
   # Apply demo migrations
   npm run db:migrate:demo
   
   # Seed demo data
   npm run db:seed:demo
   ```

3. **Assets Setup**
   ```bash
   # Demo assets are included in /public/demo/
   # No additional setup needed
   ```

### Access Demo Mode

1. **Demo Selector Page**: Navigate to `/demo`
2. **Direct Persona Login**: Use URL pattern `/demo?persona=photographer-everlight`
3. **Screenshot Mode**: Add `&screenshot=1` to any demo URL

### Basic Usage

```typescript
// Check if in demo mode
import { isDemoMode } from '@/lib/demo/config';

if (isDemoMode()) {
  // Demo-specific logic
}

// Use demo authentication
import { useDemoAuth } from '@/lib/demo/auth-provider';

function MyComponent() {
  const { session, loginAsPersona, logout } = useDemoAuth();
  
  return (
    <div>
      {session ? (
        <p>Logged in as {session.persona.name}</p>
      ) : (
        <button onClick={() => loginAsPersona('photographer-everlight')}>
          Login as Photographer
        </button>
      )}
    </div>
  );
}
```

---

## 🏛️ Architecture

### Core Components

#### 1. Environment Guard
- **File**: `src/lib/demo/config.ts`
- **Purpose**: Prevents demo mode in production
- **Environment Variable**: `NEXT_PUBLIC_DEMO_MODE=true`

#### 2. Authentication System
- **File**: `src/lib/demo/auth-provider.tsx`
- **Storage**: localStorage (key: `wedsync_demo_session`)
- **Cross-App**: Automatic redirection between WedSync ↔ WedMe.app
- **Session Management**: Persistent across browser tabs

#### 3. Data Layer
- **Migrations**: `supabase/migrations/20250122000010_demo_mode_data.sql`
- **Seed Script**: `supabase/seed/demo_seed.ts`
- **Data Provider**: `src/lib/demo/data-provider.ts`

#### 4. UI Components
- **Demo Selector**: `src/app/demo/page.tsx`
- **Supplier Tiles**: `src/components/demo/SupplierTiles.tsx`
- **Screenshot Toggle**: `src/components/demo/ScreenshotModeToggle.tsx`
- **Brand Assets**: `src/components/demo/DemoAssetsProvider.tsx`

### Data Flow

```
User selects persona → Auth Provider → Cross-app routing → Load demo data → Render dashboard
```

### Cross-App Communication

The system handles two separate applications:

1. **WedSync** (suppliers): `localhost:3000` or `wedsync.com`
2. **WedMe.app** (couples): `localhost:3001` or `wedme.app`

Authentication state is shared via localStorage across both domains.

---

## 👥 Demo Personas

### 🏢 Suppliers (10 personas)

| Persona | Role | Brand Colors | Specialties |
|---------|------|--------------|-------------|
| **Everlight Photography** | Photographer | Pink/Gold | Wedding, Portrait, Documentary |
| **Silver Lining Films** | Videographer | Blue/Purple | Cinematic, Drone, Same-day edits |
| **Sunset Sounds** | DJ | Orange/Red | Open format, MC services, Lighting |
| **Petal & Stem** | Florist | Pink/Green | Bridal bouquets, Centerpieces, Installations |
| **Taste & Thyme** | Caterer | Green/Teal | Farm-to-table, Dietary restrictions, Cocktails |
| **Velvet Strings** | Musicians | Purple/Burgundy | String quartet, Jazz trio, Classical |
| **The Old Barn** | Venue | Brown/Tan | Rustic, Outdoor, 200+ capacity |
| **Glow Hair** | Hair Stylist | Gold/Yellow | Updos, Extensions, Bridal parties |
| **Bloom Makeup** | Makeup Artist | Pink/Rose | Natural, Glamour, Airbrush |
| **Plan & Poise** | Wedding Planner | Teal/Blue | Full planning, Day-of coordination |

### 💑 Couples (3 personas)

| Couple | Wedding Date | Venue | Guests | Status |
|--------|--------------|-------|---------|--------|
| **Sarah & Michael** | June 15, 2025 | The Old Barn | 120 | Planning |
| **Emma & James** | August 20, 2025 | Garden Manor | 80 | Booked |
| **Alex & Jordan** | September 10, 2025 | Seaside Resort | 60 | Planning |

### 👨‍💼 Admin (1 persona)

| Persona | Role | Access | Responsibilities |
|---------|------|--------|------------------|
| **WedSync Admin** | Platform Owner | Full system | User management, Analytics, Support |

### Persona Relationships

Each couple is connected to multiple suppliers:
- Sarah & Michael: 10 suppliers (full wedding)
- Emma & James: 4 suppliers (intimate wedding)
- Alex & Jordan: 3 suppliers (destination wedding)

---

## ⚙️ Configuration

### Environment Variables

```env
# Demo Mode (required)
NEXT_PUBLIC_DEMO_MODE=true

# App URLs (optional - defaults shown)
NEXT_PUBLIC_WEDSYNC_URL=http://localhost:3000
NEXT_PUBLIC_WEDME_URL=http://localhost:3001
```

### Demo Configuration

**File**: `src/lib/demo/config.ts`

```typescript
// Environment check
export const isDemoMode = (): boolean => {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
};

// App configuration
export const DEMO_APPS = {
  WEDSYNC: {
    name: 'WedSync',
    baseUrl: process.env.NEXT_PUBLIC_WEDSYNC_URL || 'http://localhost:3000',
    description: 'Supplier dashboard'
  },
  WEDME: {
    name: 'WedMe.app',
    baseUrl: process.env.NEXT_PUBLIC_WEDME_URL || 'http://localhost:3001',
    description: 'Couple dashboard'
  }
};

// Screenshot mode settings
export const SCREENSHOT_MODE = {
  queryParam: 'screenshot',
  enableValue: '1',
  modifications: {
    hideDebugBanners: true,
    useLightTheme: true,
    expandPanels: true,
    freezeTime: true,
    hideTooltips: true
  }
};

// Frozen demo time
export const DEMO_FROZEN_TIME = new Date('2025-01-15T10:30:00Z');
```

---

## 🧩 Components

### Demo Selector Page

**File**: `src/app/demo/page.tsx`

The main entry point for demo mode, featuring:
- Grouped persona cards (Couples, Suppliers, Admin)
- Auto-login from URL parameters
- Screenshot mode toggle
- Responsive design

```typescript
// URL patterns
/demo                              // Show all personas
/demo?persona=photographer-everlight   // Auto-login as photographer
/demo?persona=couple-sarah-michael     // Auto-login as couple
/demo?screenshot=1                     // Enable screenshot mode
```

### Authentication Provider

**File**: `src/lib/demo/auth-provider.tsx`

Provides authentication context throughout the app:

```typescript
interface DemoAuthContextType {
  session: DemoSession | null;
  loginAsPersona: (personaId: string, redirectToApp?: boolean) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
  isScreenshotMode: boolean;
  toggleScreenshotMode: () => void;
  getCurrentTime: () => Date;
  switchToApp: (appTarget: 'wedsync' | 'wedme') => void;
  isCurrentApp: (appTarget: 'wedsync' | 'wedme') => boolean;
}

// Usage
const { session, loginAsPersona, logout } = useDemoAuth();
```

### Supplier Tiles

**File**: `src/components/demo/SupplierTiles.tsx`

Displays supplier cards in couple dashboards with:
- Professional logos
- Job status indicators
- Quick action buttons
- Contact information
- Social media links

### Screenshot Mode Toggle

**File**: `src/components/demo/ScreenshotModeToggle.tsx`

UI component for enabling/disabling screenshot mode:
- Compact and full variants
- Real-time status display
- Active modifications list
- Quick action buttons

---

## 📸 Screenshots & Frozen Time

Screenshot Mode optimizes the UI for presentations and marketing materials.

### Features

1. **Frozen Time**: Consistent timestamps across all components
2. **Light Theme**: Professional appearance for screenshots
3. **Expanded Panels**: All collapsible content visible
4. **Hidden Debug**: Development notices and banners removed
5. **No Tooltips**: Cleaner interface without hover states

### Implementation

**File**: `src/lib/demo/screenshot-helpers.ts`

```typescript
// Enable screenshot mode
enableScreenshotMode();

// Get demo time (frozen in screenshot mode)
const time = getDemoTime();

// Format time consistently
const formattedTime = formatDemoTime('datetime');

// React hook
const { isScreenshotMode, currentTime } = useDemoTime();
```

### CSS Modifications

**File**: `src/styles/demo-logos.css`

Screenshot mode applies these optimizations:
- Hidden scrollbars
- Disabled animations
- Expanded collapsible content
- Consistent shadows and borders
- Disabled hover effects

### URL Access

```
# Enable screenshot mode via URL
/demo?screenshot=1

# Combine with persona
/demo?persona=photographer-everlight&screenshot=1
```

---

## 🎨 Brand Assets

Professional logos and photos enhance the demo experience.

### Asset Structure

```
public/demo/
├── logos/
│   └── supplier-logos.png (3x3 sprite sheet)
├── avatars/
│   ├── couple-sarah-michael.png
│   ├── couple-emma-james.png
│   └── couple-alex-jordan.png
└── portfolio/ (expandable)
    ├── everlight-1.jpg
    ├── silver-lining-1.jpg
    └── ...
```

### Logo System

**File**: `src/lib/demo/brand-assets.ts`

The logo system uses CSS sprites for performance:

```typescript
// Get logo component
import { SupplierLogoBg } from '@/lib/demo/brand-assets';

<SupplierLogoBg 
  supplierId="photographer-everlight"
  size={64}
  className="demo-logo-interactive"
/>

// Get brand colors
const colors = getSupplierColors('photographer-everlight');
// Returns: { primary: '#FF6B9A', secondary: '#FFC46B', background: '#FFF8F8' }
```

### Professional Logos

| Supplier | Logo Description | Colors |
|----------|------------------|---------|
| Everlight Photography | Pink rose design | Pink/Gold |
| Silver Lining Films | Film reel icon | Black/Gray |
| Sunset Sounds | Orange vinyl record | Orange/Red |
| Petal & Stem | Pink flower with stem | Pink/Green |
| Taste & Thyme | Green herb circle | Green/Teal |
| Velvet Strings | Burgundy heart/clef | Purple/Burgundy |
| The Old Barn | Brown barn icon | Brown/Tan |
| Glow Hair | Golden hair wave | Gold/Yellow |
| Plan & Poise | Teal feather | Teal/Blue |

### Asset Loading

```typescript
// Preload all assets
import { DemoAssetsProvider } from '@/components/demo/DemoAssetsProvider';

function App() {
  return (
    <DemoAssetsProvider>
      <YourApp />
    </DemoAssetsProvider>
  );
}

// Check loading state
const { assetsLoaded, loadingProgress } = useDemoAssets();
```

---

## 🔧 Development

### File Structure

```
src/
├── lib/demo/
│   ├── config.ts                    # Core configuration
│   ├── auth-provider.tsx            # Authentication system
│   ├── data-provider.ts             # Demo data generation
│   ├── brand-assets.ts              # Logo and asset management
│   ├── screenshot-helpers.ts        # Screenshot mode utilities
│   └── demo-time-hook.ts            # Time management hooks
├── components/demo/
│   ├── SupplierTiles.tsx            # Supplier cards
│   ├── ScreenshotModeToggle.tsx     # Screenshot controls
│   └── DemoAssetsProvider.tsx       # Asset loading
├── app/demo/
│   └── page.tsx                     # Demo selector page
└── styles/
    └── demo-logos.css               # Logo sprite styles

supabase/
├── migrations/
│   └── 20250122000010_demo_mode_data.sql
└── seed/
    └── demo_seed.ts
```

### Adding New Personas

1. **Update Configuration** (`src/lib/demo/config.ts`):
```typescript
export const DEMO_PERSONAS: DemoPersona[] = [
  // ... existing personas
  {
    id: 'new-supplier-id',
    type: 'supplier',
    role: 'photographer',
    name: 'New Photography Studio',
    company: 'New Studio',
    email: 'hello@newstudio.com',
    appTarget: 'wedsync',
    dashboardRoute: '/dashboard',
    colors: {
      primary: '#000000',
      secondary: '#666666',
      accent: '#999999',
      background: '#FFFFFF'
    },
    blurb: 'Professional wedding photography...',
    permissions: ['view_clients', 'manage_bookings'],
    metadata: {
      vendorType: 'photographer',
      yearsExperience: 5,
      specialties: ['Wedding', 'Portrait']
    }
  }
];
```

2. **Add Brand Assets**:
   - Update logo sprite in `/public/demo/logos/supplier-logos.png`
   - Add logo mapping in `src/lib/demo/brand-assets.ts`

3. **Update Database** (if needed):
   - Add supplier to migration file
   - Include in demo seed script

### Testing Demo Mode

```bash
# Environment setup
export NEXT_PUBLIC_DEMO_MODE=true

# Start development server
npm run dev

# Test different personas
curl "http://localhost:3000/demo?persona=photographer-everlight"
curl "http://localhost:3000/demo?persona=couple-sarah-michael"

# Test screenshot mode
curl "http://localhost:3000/demo?screenshot=1"
```

### Database Schema

**Demo-specific fields**:
- `demo_mode: BOOLEAN` - Marks demo records
- `demo_metadata: JSONB` - Additional demo information
- `demo_persona_id: TEXT` - Links to persona configuration

**Key tables**:
- `suppliers` - Demo supplier profiles
- `clients` - Demo couple profiles  
- `supplier_client_connections` - Relationships
- `user_profiles` - Demo user accounts

---

## 🚨 Troubleshooting

### Common Issues

#### 1. Demo Mode Not Working
```bash
# Check environment variable
echo $NEXT_PUBLIC_DEMO_MODE

# Should return: true
```

#### 2. Assets Not Loading
```bash
# Verify asset files exist
ls -la public/demo/logos/
ls -la public/demo/avatars/

# Check browser network tab for 404 errors
```

#### 3. Cross-App Navigation Failing
- Verify both apps are running on correct ports
- Check `NEXT_PUBLIC_WEDSYNC_URL` and `NEXT_PUBLIC_WEDME_URL`
- Ensure localStorage is not blocked

#### 4. Screenshot Mode Not Applying
```typescript
// Check if screenshot helpers are imported
import { isScreenshotMode } from '@/lib/demo/screenshot-helpers';

// Verify CSS is loaded
console.log(document.querySelector('.screenshot-mode'));
```

#### 5. Database Issues
```bash
# Reset demo data
npm run db:seed:demo --reset

# Check migration status
npx supabase migration list --linked
```

### Debug Tools

#### Browser Console Commands
```javascript
// Check demo session
localStorage.getItem('wedsync_demo_session')

// Check screenshot mode
localStorage.getItem('wedsync_demo_screenshot_mode')

// View all demo personas
console.log(window.DEMO_PERSONAS)
```

#### URL Testing
```
# Test all personas
/demo?persona=photographer-everlight
/demo?persona=couple-sarah-michael
/demo?persona=admin-wedsync

# Test screenshot mode
/demo?screenshot=1&persona=photographer-everlight
```

### Performance Monitoring

```typescript
// Check asset loading times
const startTime = performance.now();
// ... load demo assets
const endTime = performance.now();
console.log(`Demo assets loaded in ${endTime - startTime} milliseconds`);

// Monitor memory usage
console.log(performance.memory);
```

---

## 📚 API Reference

### Core Functions

#### Configuration

```typescript
// Check if demo mode is enabled
isDemoMode(): boolean

// Get persona by ID
getPersonaById(id: string): DemoPersona | undefined

// Get couples for supplier
getCouplesForSupplier(supplierId: string): DemoCouple[]

// Get target app URL
getTargetAppUrl(persona: DemoPersona, path?: string): string
```

#### Authentication

```typescript
// Demo auth hook
useDemoAuth(): DemoAuthContextType {
  session: DemoSession | null;
  loginAsPersona: (personaId: string, redirectToApp?: boolean) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
  isScreenshotMode: boolean;
  toggleScreenshotMode: () => void;
  getCurrentTime: () => Date;
  switchToApp: (appTarget: 'wedsync' | 'wedme') => void;
  isCurrentApp: (appTarget: 'wedsync' | 'wedme') => boolean;
}

// Get current persona
getCurrentPersona(): DemoPersona | null

// Check permissions
hasPermission(permission: string): boolean
```

#### Screenshot Mode

```typescript
// Screenshot mode helpers
enableScreenshotMode(): void
disableScreenshotMode(): void
isScreenshotMode(): boolean

// Time helpers
getDemoTime(): Date
formatDemoTime(format?: 'time' | 'date' | 'datetime'): string

// React hooks
useDemoTime(): {
  currentTime: Date;
  formatTime: (format?: string) => string;
  isScreenshotMode: boolean;
  isDemoMode: boolean;
}
```

#### Brand Assets

```typescript
// Logo functions
getSupplierLogo(supplierId: string): string
getLogoPosition(supplierId: string): { backgroundPosition: string }
getSupplierColors(supplierId: string): { primary: string; secondary: string; background: string }

// Avatar functions
getCoupleAvatar(coupleId: string): string

// React components
<SupplierLogoBg supplierId="photographer-everlight" size={64} />
<CoupleAvatarBg coupleId="couple-sarah-michael" size={60} />
```

### TypeScript Interfaces

#### Core Types

```typescript
interface DemoPersona {
  id: string;
  type: 'supplier' | 'client' | 'admin';
  role: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  appTarget: 'wedsync' | 'wedme';
  dashboardRoute: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  blurb: string;
  permissions: string[];
  metadata?: {
    vendorType?: string;
    yearsExperience?: number;
    specialties?: string[];
    [key: string]: any;
  };
}

interface DemoCouple {
  id: string;
  names: string;
  weddingDate: string;
  venue: string;
  guestCount: number;
  status: 'planning' | 'booked' | 'completed';
  avatar: string;
  suppliers: string[];
}

interface DemoSession {
  persona: DemoPersona;
  isActive: boolean;
  loginTime: Date;
  screenshotMode: boolean;
  currentApp: 'wedsync' | 'wedme';
}
```

---

## 📝 Changelog

### Version 1.0.0 (January 2025)

#### ✨ New Features
- Complete demo mode system with 12 professional personas
- Cross-app navigation between WedSync and WedMe.app
- Professional brand assets with logo sprite system
- Screenshot mode with frozen time functionality
- Comprehensive documentation and troubleshooting

#### 🏗️ Technical Improvements
- Environment-based configuration system
- localStorage-based authentication
- Supabase migrations for demo data
- CSS sprite system for optimal logo loading
- React Context API for state management

#### 🎨 Brand Assets
- 9 professional supplier logos in sprite format
- 3 couple avatar photos
- Consistent color schemes across all personas
- Asset preloading and error handling

#### 📚 Documentation
- Complete setup and configuration guide
- Troubleshooting section with common solutions
- API reference with TypeScript interfaces
- Development guidelines for extending the system

---

## 🤝 Contributing

### Adding New Features

1. **Follow existing patterns**: Use the established folder structure and naming conventions
2. **Update documentation**: Add new features to this README
3. **Add TypeScript types**: Ensure proper typing for all new interfaces
4. **Test thoroughly**: Verify functionality in both WedSync and WedMe.app
5. **Consider screenshot mode**: Ensure new UI works in screenshot mode

### Code Standards

- Use TypeScript for all new code
- Follow React hooks patterns
- Implement proper error handling
- Add loading states for async operations
- Use Tailwind CSS for styling

### Testing Checklist

- [ ] Demo mode works in development
- [ ] Cross-app navigation functions correctly
- [ ] Screenshot mode applies all modifications
- [ ] Assets load without errors
- [ ] Database migrations run successfully
- [ ] All personas accessible via URL
- [ ] Mobile responsive design
- [ ] Accessibility standards met

---

## 📞 Support

For issues with demo mode:

1. Check the [Troubleshooting](#troubleshooting) section
2. Verify environment variables are set correctly
3. Ensure database migrations have been applied
4. Check browser console for errors
5. Test with a fresh browser session

---

**Demo Mode System v1.0** | Built with ❤️ for WedSync | January 2025