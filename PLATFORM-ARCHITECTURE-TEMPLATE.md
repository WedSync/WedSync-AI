# 🏗️ WedSync/WedMe.app Platform Architecture Template

**Version:** 1.0  
**Date:** 2025-01-11  
**Purpose:** Definitive template for future agents working on the platform

---

## 📊 **PLATFORM OVERVIEW**

### **Three Parent Systems Architecture**
The platform consists of **3 main parent systems** serving different user types:

1. **🏢 WedSync (Supplier Platform)** - 156 pages - B2B wedding suppliers
2. **💕 WedMe.app (Couple Platform)** - 68 pages - B2C couples planning weddings  
3. **⚙️ Admin Dashboard** - 45 pages - Platform administration
4. **🚨 Orphan Pages** - 23 pages - Utility, auth, and standalone features

**Total Application Size:** 247 pages/routes

---

## 🏢 **WEDSYNC (SUPPLIER PLATFORM)**

### **Entry Points & Authentication**
- **Primary URL:** `localhost:3001` (supplier-focused landing)
- **Login:** `/wedsync/login` → `/dashboard`
- **Signup:** `/wedsync/signup` → `/dashboard`
- **Portal:** `/supplier-portal` → mobile-optimized interface

### **Route Patterns**
```
/(dashboard)/*  → Route group for supplier features
/dashboard      → Main supplier dashboard  
/clients        → Client management
/forms          → Form builder and management
/journeys       → Customer journey automation
/vendors        → Vendor directory and tools
/analytics      → Business analytics
/settings       → Configuration and preferences
```

### **Core Subsystems (156 pages total)**
1. **📊 Core Dashboard** (25 pages) - Main dashboard, analytics, performance
2. **👥 Client Management** (12 pages) - Client profiles, communications, import
3. **📝 Forms & Templates** (18 pages) - Form builder, templates, submissions
4. **🗺️ Journey Management** (15 pages) - Customer journeys, automation, monitoring
5. **🏪 Vendor & Marketplace** (20 pages) - Vendor directory, marketplace, revenue
6. **💬 Communication & Marketing** (25 pages) - Messaging, referrals, campaigns
7. **🔧 Specialized Tools** (25 pages) - Florist tools, music, weather, budget
8. **⚙️ Settings & Configuration** (16 pages) - Branding, integrations, privacy

### **Navigation Structure**
```typescript
// Main supplier navigation (from dashboard/layout.tsx)
const supplierNavigation = [
  { href: '/dashboard', label: 'Dashboard', icon: 'Home' },
  { href: '/clients', label: 'Clients', icon: 'Users' },
  { href: '/vendors', label: 'Vendor Directory', icon: 'Building' },
  { href: '/forms', label: 'Forms', icon: 'Document' },
  { href: '/templates', label: 'Templates', icon: 'Folder' },
  { href: '/journeys', label: 'Customer Journeys', icon: 'Map' },
  { href: '/journey-monitor', label: 'Journey Monitor', icon: 'CPU' },
  { href: '/dashboard/music', label: 'Music Database', icon: 'Music' },
  { href: '/channels', label: 'Channels', icon: 'Chat' },
  { href: '/integrations/webhooks', label: 'Webhooks', icon: 'Link' },
  { href: '/analytics', label: 'Analytics', icon: 'Chart' },
  { href: '/settings', label: 'Settings', icon: 'Cog' }
];
```

---

## 💕 **WEDME.APP (COUPLE PLATFORM)**

### **Entry Points & Authentication**
- **Login:** `/wedme/login` → `/client/dashboard`
- **Signup:** `/wedme/signup` → `/client/dashboard`
- **Dashboard:** `/client/dashboard` → main couple interface
- **Analytics:** `/(wedme)/analytics/dashboard` → wedding insights

### **Route Patterns**
```
/(wedme)/*           → Route group for couple features
/client/dashboard    → Main couple dashboard
/(wedme)/analytics/* → Wedding analytics and insights
/api/guests/*        → Guest management APIs
/api/wedding-website/* → Wedding website APIs
```

### **Core Subsystems (68 pages total)**
1. **💖 Couple Dashboard** (8 pages) - Main dashboard, analytics overview
2. **📋 Wedding Planning Tools** (25 pages) - Planning features, onboarding, templates
3. **👨‍👩‍👧‍👦 Guest Management** (15 pages) - Guest lists, RSVP, dietary requirements
4. **🌐 Wedding Website & Content** (20 pages) - Website builder, content management

### **Key Features**
- Wedding timeline and milestone tracking
- Budget optimization and tracking
- Vendor coordination and communication
- Guest management and RSVP system
- Wedding website builder
- Photo sharing and organization

---

## ⚙️ **ADMIN DASHBOARD**

### **Entry Points & Authentication**
- **Login:** `/admin/login` → `/admin/dashboard` (to be created)
- **Dashboard:** `/admin/dashboard` → main admin interface
- **Access Control:** Role-based (admin, super_admin)

### **Route Patterns**
```
/(admin)/*        → Route group for admin features
/admin/dashboard  → Main admin dashboard
/admin/*          → Direct admin routes
/(dashboard)/admin/* → Admin tools in supplier dashboard
```

### **Core Subsystems (45 pages total)**
1. **🎛️ Core Admin Pages** (8 pages) - Dashboard, alerts, system health
2. **🛠️ Admin Management Tools** (15 pages) - User management, monitoring, backups
3. **🔌 Admin API Endpoints** (22 pages) - Backend administration APIs

### **Key Responsibilities**
- Platform monitoring and health checks
- User management and permissions
- System backups and recovery
- Security monitoring and compliance
- Performance analytics and optimization

---

## 🔐 **AUTHENTICATION ARCHITECTURE**

### **Platform-Specific Authentication (Simplified)**
```
Separate Authentication Flows (No Role Detection)
├── WedSync: /wedsync/login → /dashboard
├── WedSync: /wedsync/signup → /dashboard
├── WedMe.app: /wedme/login → /client/dashboard
├── WedMe.app: /wedme/signup → /client/dashboard
└── Admin: /admin/login → /admin/dashboard (to be created)
```

### **Demo System**
```
/demo → Persona Selection → Temporary Authentication
├── 12 Demo Personas (couples, suppliers, admin)
├── localStorage-based sessions
└── Cross-platform navigation
```

### **Authentication Flow**
1. User visits platform-specific landing page
2. Chooses platform-specific login or signup
3. Direct authentication without role detection
4. Direct redirect to platform dashboard
5. Platform-specific navigation and features

---

## 📁 **FILE STRUCTURE PATTERNS**

### **Route Groups (Next.js App Router)**
```
src/app/
├── (dashboard)/     → WedSync supplier features
├── (wedme)/         → WedMe.app couple features  
├── (admin)/         → Admin platform features
├── (supplier-portal)/ → Mobile supplier (legacy)
├── (onboarding)/    → Onboarding flows
├── api/             → Backend API routes
├── wedme/           → WedMe.app authentication
├── wedsync/         → WedSync authentication
├── admin/           → Admin authentication (to be created)
├── client/          → Couple dashboard
├── admin/           → Admin dashboard
├── dashboard/       → Main supplier dashboard
└── [direct-routes]  → Top-level pages
```

### **Layout Hierarchy**
```
layout.tsx (root)
├── dashboard/layout.tsx (supplier)
├── admin/layout.tsx (admin)  
├── supplier-portal/layout.tsx (mobile supplier)
└── [route-group-layouts]
```

---

## 🚨 **ORPHAN PAGES (23 pages)**

### **Categories**
1. **🔑 Authentication & Utility** (8 pages)
   - `/demo`, `/pricing`, `/privacy`, `/offline`
2. **🎯 Standalone Features** (10 pages)  
   - `/invite/[code]`, `/travel-calculator`, `/rsvp/[code]`
3. **🧪 Testing & Development** (5 pages)
   - `/test*`, `/ui-showcase`

### **Recommendations**
- **High Priority:** ✅ Authentication now platform-specific
- **Medium Priority:** Consolidate duplicate routes
- **Low Priority:** Clean up testing pages

---

## 🔄 **CROSS-PLATFORM INTEGRATION**

### **Shared Components**
- Platform-specific authentication systems
- API layer and database (Supabase)
- Demo system with persona switching
- Shared UI components and utilities

### **Data Flow**
```
Frontend (3 platforms) → API Layer → Supabase Database
                     ↘ Demo Data (localStorage)
```

### **Navigation Patterns**
- Platform-specific routing and permissions
- Direct redirects without role detection
- Demo mode allows cross-platform switching
- Independent authentication per platform

---

## 📋 **AGENT GUIDELINES**

### **When Adding New Pages**
1. **Identify Parent System:** WedSync, WedMe.app, or Admin
2. **Use Correct Route Pattern:** Follow established conventions
3. **Update Navigation:** Add to appropriate navigation menu
4. **Consider Permissions:** Implement role-based access
5. **Avoid Orphans:** Ensure clear parent system linkage

### **Route Naming Conventions**
- **WedSync:** `/(dashboard)/feature` or `/feature`
- **WedMe.app:** `/(wedme)/feature` or `/client/feature`
- **Admin:** `/(admin)/feature` or `/admin/feature`
- **APIs:** `/api/system/feature`

### **Testing New Features**
1. Test in all three parent systems if applicable
2. Verify role-based access controls
3. Test demo mode integration
4. Ensure mobile responsiveness
5. Validate navigation and breadcrumbs

---

## 📊 **METRICS & MONITORING**

### **Current Statistics**
- **Total Pages:** 247
- **WedSync Pages:** 156 (63.2%)
- **WedMe.app Pages:** 68 (27.5%)  
- **Admin Pages:** 45 (18.2%)
- **Orphan Pages:** 23 (9.3%)

### **Health Indicators**
- ✅ Clear parent system separation
- ✅ Platform-specific authentication implemented
- ✅ Demo system functional
- ⚠️ Some duplicate routes need consolidation
- ⚠️ Orphan pages need classification
- 🔧 Server issues with PostHog/Node.js modules need resolution

---

## 🚧 **CURRENT TECHNICAL STATUS**

### **✅ Recently Completed**
- **Authentication Architecture Simplified:** Removed complex role detection
- **Platform-Specific Auth Pages:** Created `/wedsync/login`, `/wedsync/signup`, `/wedme/login`, `/wedme/signup`
- **Security Functions:** Added missing `validateFileUpload` and `validateMessageContent`
- **Bugsnag Configuration:** Fixed Node.js module conflicts in browser context
- **Documentation Updated:** Both template and quick reference reflect new architecture

### **❌ Current Blocking Issues**
- **PostHog Node.js Modules:** Server returning 500 errors due to `node:fs` import conflicts
- **Authentication Testing:** Cannot test new flows until server issues resolved
- **Missing Admin Auth:** `/admin/login` page not yet created

### **🎯 Ready for Testing (Once Server Fixed)**
```bash
# WedSync Supplier Authentication
/wedsync/login → /dashboard
/wedsync/signup → /dashboard

# WedMe.app Couple Authentication
/wedme/login → /client/dashboard
/wedme/signup → /client/dashboard
```

### **🔄 Immediate Next Steps**
1. **Fix PostHog Issues:** Resolve Node.js module imports or disable for development
2. **Test Authentication Flows:** Use Playwright to verify all four auth pages
3. **Create Admin Login:** Add `/admin/login` → `/admin/dashboard`
4. **Verify Form Submissions:** Ensure proper redirects and error handling
5. **Test Cross-Platform Links:** Verify navigation between WedSync and WedMe.app

---

**This template serves as the definitive guide for understanding and extending the WedSync/WedMe.app platform architecture. All future development should reference this document to maintain consistency and avoid creating orphan pages.**
