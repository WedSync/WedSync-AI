# Environment Variables Management System - Technical Architecture

## 🏗️ System Overview

The Environment Variables Management System is built as a modern React application with a Node.js backend, designed for high availability, security, and scalability in the wedding industry context.

### Technology Stack

#### Frontend
- **React 19.1.1**: Latest React with Server Components and concurrent features
- **Next.js 15.4.3**: App Router architecture with Turbopack build system
- **TypeScript 5.9.2**: Strict type safety with zero `any` types
- **Tailwind CSS 4.1.11**: Utility-first styling with Oxide engine
- **Radix UI**: Accessible component primitives
- **React Hook Form 7.62.0**: Performance-optimized forms with validation
- **Zod 4.0.17**: Schema validation for type-safe data handling

#### Backend & Database
- **Supabase 2.55.0**: PostgreSQL 15 with real-time capabilities
- **PostgreSQL 15**: Primary database with JSONB support
- **Row Level Security (RLS)**: Database-level access control
- **Supabase Realtime**: WebSocket-based live updates
- **Supabase Auth**: JWT-based authentication system

#### State Management & Data
- **Zustand 5.0.7**: Lightweight state management
- **TanStack Query 5.85.0**: Server state synchronization
- **SWR patterns**: Optimistic updates and caching
- **Local Storage**: Offline capability and draft persistence

#### Testing & Quality
- **Jest 29.7.0**: Unit and integration testing
- **Testing Library**: Component testing utilities
- **Playwright**: End-to-end testing framework
- **ESLint & Prettier**: Code quality and formatting
- **Husky**: Pre-commit hooks for quality gates

## 🎯 Architecture Principles

### 1. Wedding-Day Reliability
- **Zero Downtime**: Designed for 100% uptime during wedding operations
- **Graceful Degradation**: System continues to function even with partial failures
- **Read-Only Protection**: Automatic protection during peak wedding hours
- **Emergency Overrides**: Secure emergency access for critical situations

### 2. Security-First Design
- **Zero Trust Architecture**: Every request is verified and authorized
- **Encryption at Rest**: Sensitive variables encrypted in database
- **Encryption in Transit**: All communications over HTTPS/WSS
- **Audit Everything**: Complete audit trail of all operations
- **Secret Masking**: Never expose full secrets in UI or logs

### 3. Mobile-First Experience
- **Responsive Design**: Optimized for 320px to 2560px viewports
- **Touch Optimization**: 48px minimum touch targets
- **Offline Capability**: Read-only access and draft persistence
- **Progressive Web App**: Native app-like experience

### 4. Performance Excellence
- **Sub-second Load Times**: Initial page load < 2 seconds
- **Real-time Updates**: Sub-second synchronization across clients
- **Optimistic UI**: Immediate feedback with rollback on errors
- **Bundle Optimization**: Tree-shaking and code-splitting

## 🏗️ Component Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Desktop Interface     │  Mobile Interface  │ Tablet Layout │
│  ┌─────────────────┐    │  ┌──────────────┐  │ ┌──────────┐ │
│  │ Dashboard       │    │  │ Mobile Mgr   │  │ │ Adaptive │ │
│  │ Variables List  │    │  │ Touch Cards  │  │ │ Layout   │ │
│  │ Health Monitor  │    │  │ Quick Actions│  │ │          │ │
│  │ Security Center │    │  │ Bottom Nav   │  │ │          │ │
│  │ Deployment Sync │    │  │              │  │ │          │ │
│  └─────────────────┘    │  └──────────────┘  │ └──────────┘ │
└─────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
├─────────────────────────────────────────────────────────────┤
│  State Management      │  Real-time Sync    │ Validation   │
│  ┌─────────────────┐    │  ┌──────────────┐  │ ┌──────────┐ │
│  │ Zustand Store   │    │  │ Supabase RT  │  │ │ Zod      │ │
│  │ TanStack Query  │    │  │ WebSockets   │  │ │ Schemas  │ │
│  │ Local Cache     │    │  │ Optimistic   │  │ │ Rules    │ │
│  └─────────────────┘    │  └──────────────┘  │ └──────────┘ │
└─────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────────────────────────────────┐
│                      Data Access Layer                       │
├─────────────────────────────────────────────────────────────┤
│  Authentication        │  Database Access   │ External APIs│
│  ┌─────────────────┐    │  ┌──────────────┐  │ ┌──────────┐ │
│  │ Supabase Auth   │    │  │ PostgreSQL   │  │ │ Stripe   │ │
│  │ JWT Tokens      │    │  │ RLS Policies │  │ │ SendGrid │ │
│  │ Role-Based      │    │  │ JSONB Data   │  │ │ Others   │ │
│  └─────────────────┘    │  └──────────────┘  │ └──────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. EnvironmentVariablesManagement (Main Dashboard)
**Purpose**: Primary container component managing overall application state

**Key Features**:
- Real-time data synchronization
- Wedding day mode detection
- Environment status calculation
- Tab-based navigation
- Global error handling

**Dependencies**:
- Supabase client for data access
- Multiple child components for specific functionality
- Real-time subscription management

#### 2. VariableConfigurationForm (Create/Edit Interface)
**Purpose**: Secure form for adding and editing environment variables

**Key Features**:
- Zod schema validation
- Real-time field validation
- Auto-encryption for high-security variables
- Production environment warnings
- Draft auto-save functionality

**Security Measures**:
- Server-side validation
- Input sanitization
- CSRF protection
- Audit trail logging

#### 3. VariablesList (Data Display and Management)
**Purpose**: Displays variables with filtering, searching, and bulk operations

**Key Features**:
- Advanced filtering and searching
- Sortable columns
- Secret masking with toggle visibility
- Bulk operations support
- Infinite scrolling for large datasets

**Performance Optimizations**:
- Virtual scrolling for large lists
- Debounced search queries
- Memoized filter calculations
- Lazy loading of variable details

#### 4. EnvironmentHealthCard (Status Monitoring)
**Purpose**: Displays health status for each environment

**Key Features**:
- Real-time health scoring
- Missing variable detection
- Configuration drift alerts
- Visual health indicators
- Historical health trends

#### 5. VariableSecurityCenter (Security Dashboard)
**Purpose**: Centralized security management and monitoring

**Key Features**:
- Security classification management
- Access control configuration
- Audit trail visualization
- Threat detection and alerting
- Compliance reporting

#### 6. Mobile Components
**Purpose**: Touch-optimized mobile interface

**Key Components**:
- `MobileEnvironmentVariablesManager`: Main mobile container
- `MobileVariableCard`: Touch-friendly variable display
- `MobileVariableForm`: Mobile-optimized form interface
- `MobileHealthOverview`: Mobile health dashboard

## 🔐 Security Architecture

### Authentication & Authorization

#### JWT-Based Authentication
```typescript
interface AuthContext {
  user: User | null;
  token: string | null;
  permissions: Permission[];
  role: UserRole;
}

interface Permission {
  resource: string;
  action: 'read' | 'write' | 'delete' | 'admin';
  environment?: Environment;
}
```

#### Role-Based Access Control (RBAC)

| Role | Development | Staging | Production | Wedding-Critical |
|------|-------------|---------|------------|------------------|
| **Developer** | Read/Write | Read/Write | Read | None |
| **Admin** | Read/Write | Read/Write | Read/Write | Read |
| **Super Admin** | Read/Write | Read/Write | Read/Write | Read/Write |
| **Read-Only** | Read | Read | Read | None |

### Data Protection

#### Encryption Strategy
```sql
-- Variables with encryption enabled
CREATE TABLE environment_variables (
  id UUID PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT NOT NULL, -- Encrypted if is_encrypted = true
  environment environment_type NOT NULL,
  security_level security_level_type NOT NULL,
  is_encrypted BOOLEAN DEFAULT FALSE,
  encryption_key_id UUID, -- Reference to encryption key
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Row Level Security (RLS) Policies
```sql
-- Users can only access variables for their organization
CREATE POLICY "Users can access own organization variables" 
ON environment_variables FOR ALL 
USING (
  organization_id = (
    SELECT organization_id 
    FROM user_profiles 
    WHERE id = auth.uid()
  )
);

-- Stricter policy for production environment
CREATE POLICY "Restricted production access" 
ON environment_variables FOR UPDATE 
USING (
  environment != 'production' OR 
  (
    SELECT role 
    FROM user_profiles 
    WHERE id = auth.uid()
  ) IN ('admin', 'super_admin')
);
```

### Audit Trail Architecture

#### Comprehensive Logging
```typescript
interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  user_id: string;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
}
```

## 📡 Real-Time Architecture

### Supabase Realtime Integration

#### WebSocket Connections
```typescript
// Real-time subscription setup
const subscribeToVariables = () => {
  return supabase
    .channel('environment_variables_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'environment_variables',
        filter: `organization_id=eq.${organizationId}`
      },
      (payload) => {
        handleRealtimeUpdate(payload);
      }
    )
    .subscribe();
};
```

#### Optimistic Updates
```typescript
// Optimistic update pattern
const updateVariable = async (id: string, updates: Partial<Variable>) => {
  // 1. Immediately update UI (optimistic)
  const optimisticUpdate = { ...currentVariable, ...updates };
  setVariable(optimisticUpdate);
  
  try {
    // 2. Send update to server
    const { data, error } = await supabase
      .from('environment_variables')
      .update(updates)
      .eq('id', id);
      
    if (error) throw error;
    
    // 3. Update with server response
    setVariable(data);
  } catch (error) {
    // 4. Rollback on error
    setVariable(currentVariable);
    showErrorToast('Update failed');
  }
};
```

### Conflict Resolution

#### Last-Writer-Wins with User Notification
```typescript
const handleConflict = (
  localVersion: Variable,
  serverVersion: Variable,
  userChanges: Partial<Variable>
) => {
  if (localVersion.updated_at !== serverVersion.updated_at) {
    // Conflict detected
    showConflictDialog({
      localChanges: userChanges,
      serverVersion: serverVersion,
      onResolve: (resolution) => {
        if (resolution === 'keep_local') {
          forceUpdate(userChanges);
        } else {
          discardLocalChanges();
          setVariable(serverVersion);
        }
      }
    });
  }
};
```

## 📱 Mobile Architecture

### Progressive Web App (PWA) Features

#### Service Worker for Offline Support
```typescript
// Service worker for caching and offline support
const CACHE_NAME = 'env-vars-v1';
const CRITICAL_RESOURCES = [
  '/',
  '/manifest.json',
  '/static/js/main.js',
  '/static/css/main.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CRITICAL_RESOURCES))
  );
});

// Offline-first strategy for API calls
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
  }
});
```

#### Touch Optimization
```typescript
// Touch event handling for mobile interactions
const handleTouchStart = (e: TouchEvent) => {
  touchStartTime = Date.now();
  touchStartPosition = {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY
  };
};

const handleTouchEnd = (e: TouchEvent) => {
  const touchDuration = Date.now() - touchStartTime;
  const touchDistance = calculateDistance(
    touchStartPosition,
    { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
  );
  
  // Distinguish between tap, long press, and swipe
  if (touchDuration < 200 && touchDistance < 10) {
    handleTap();
  } else if (touchDuration > 500 && touchDistance < 10) {
    handleLongPress();
  } else if (touchDistance > 50) {
    handleSwipe();
  }
};
```

### Auto-Save Implementation

#### Draft Persistence
```typescript
// Auto-save drafts to localStorage
const useAutoSave = (formData: FormData, interval = 30000) => {
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isDirty) {
        localStorage.setItem('draft_env_var', JSON.stringify(formData));
        toast.success('Draft saved locally');
      }
    }, interval);
    
    return () => clearTimeout(timeoutId);
  }, [formData, isDirty, interval]);
  
  // Load draft on component mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('draft_env_var');
    if (savedDraft) {
      const draftData = JSON.parse(savedDraft);
      Object.keys(draftData).forEach(key => {
        setValue(key, draftData[key]);
      });
      toast.info('Draft loaded from local storage');
    }
  }, []);
};
```

## 🚀 Performance Architecture

### Bundle Optimization

#### Code Splitting Strategy
```typescript
// Route-based code splitting
const EnvironmentVariablesManagement = lazy(() => 
  import('./EnvironmentVariablesManagement')
);

const MobileEnvironmentVariablesManager = lazy(() => 
  import('./mobile/MobileEnvironmentVariablesManager')
);

// Component-based code splitting
const VariableSecurityCenter = lazy(() => 
  import('./VariableSecurityCenter')
);

// Dynamic imports for heavy dependencies
const loadChartLibrary = () => import('recharts');
const loadDateLibrary = () => import('date-fns');
```

#### Tree Shaking Configuration
```typescript
// webpack.config.js optimizations
module.exports = {
  optimization: {
    usedExports: true,
    sideEffects: false,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          enforce: true,
        },
      },
    },
  },
};
```

### Caching Strategy

#### Multi-Level Caching
```typescript
// 1. Browser Cache (Static Assets)
// Configured via Next.js headers

// 2. Memory Cache (React State)
const useVariablesCache = () => {
  return useMemo(() => {
    return new Map<string, Variable>();
  }, []);
};

// 3. Local Storage Cache (Offline Support)
const cacheVariables = (variables: Variable[]) => {
  localStorage.setItem(
    'cached_variables', 
    JSON.stringify({
      data: variables,
      timestamp: Date.now(),
      expiry: Date.now() + (5 * 60 * 1000) // 5 minutes
    })
  );
};

// 4. Service Worker Cache (Network Requests)
// Handled by service worker implementation
```

### Database Performance

#### Query Optimization
```sql
-- Indexes for common query patterns
CREATE INDEX idx_env_vars_org_env ON environment_variables(organization_id, environment);
CREATE INDEX idx_env_vars_security ON environment_variables(security_level);
CREATE INDEX idx_env_vars_updated ON environment_variables(updated_at DESC);

-- Materialized view for health metrics
CREATE MATERIALIZED VIEW environment_health_metrics AS
SELECT 
  environment,
  COUNT(*) as total_variables,
  COUNT(*) FILTER (WHERE is_encrypted = true) as encrypted_variables,
  COUNT(*) FILTER (WHERE security_level = 'Wedding-Day-Critical') as critical_variables,
  MAX(updated_at) as last_updated
FROM environment_variables
GROUP BY environment;

-- Refresh materialized view on schedule
SELECT cron.schedule('refresh-health-metrics', '*/5 * * * *', 
  'REFRESH MATERIALIZED VIEW environment_health_metrics;'
);
```

## 🛡️ Wedding Day Protection Architecture

### Read-Only Mode Implementation

#### Automatic Time-Based Protection
```typescript
const useWeddingDayMode = () => {
  const [isWeddingDayMode, setIsWeddingDayMode] = useState(false);
  
  useEffect(() => {
    const checkWeddingDayMode = () => {
      const now = new Date();
      const day = now.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
      const hour = now.getHours();
      
      const isWeddingPeriod = 
        (day === 5 && hour >= 18) || // Friday after 6PM
        (day === 6) ||               // All Saturday
        (day === 0 && hour <= 18);   // Sunday before 6PM
      
      setIsWeddingDayMode(isWeddingPeriod);
    };
    
    checkWeddingDayMode();
    const interval = setInterval(checkWeddingDayMode, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);
  
  return isWeddingDayMode;
};
```

#### Emergency Override System
```typescript
interface EmergencyOverride {
  isActive: boolean;
  authorizedBy: string;
  reason: string;
  expiresAt: string;
  approvedActions: string[];
}

const useEmergencyOverride = () => {
  const requestEmergencyAccess = async (reason: string) => {
    const response = await fetch('/api/emergency/request-override', {
      method: 'POST',
      body: JSON.stringify({ reason }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error('Emergency override request failed');
    }
    
    // Multi-factor authentication required
    await performMFAChallenge();
    
    return response.json();
  };
};
```

## 📊 Monitoring & Observability

### Health Check Endpoints

#### System Health Monitoring
```typescript
// /api/health endpoint
export async function GET() {
  const healthChecks = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkExternalAPIs(),
    checkFileSystem()
  ]);
  
  const overallHealth = healthChecks.every(
    check => check.status === 'fulfilled' && check.value.healthy
  );
  
  return Response.json({
    status: overallHealth ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks: healthChecks.map(check => ({
      service: check.status === 'fulfilled' ? check.value.service : 'unknown',
      healthy: check.status === 'fulfilled' && check.value.healthy,
      responseTime: check.status === 'fulfilled' ? check.value.responseTime : null,
      error: check.status === 'rejected' ? check.reason : null
    }))
  });
}
```

#### Performance Metrics
```typescript
// Custom metrics collection
const usePerformanceMetrics = () => {
  useEffect(() => {
    // Page load time
    const loadTime = performance.now();
    
    // API response times
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      const response = await originalFetch(...args);
      const duration = performance.now() - start;
      
      // Log API performance
      logMetric('api_response_time', duration, {
        url: args[0],
        method: args[1]?.method || 'GET',
        status: response.status
      });
      
      return response;
    };
    
    // Component render times
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'measure') {
          logMetric('component_render_time', entry.duration, {
            component: entry.name
          });
        }
      });
    });
    
    observer.observe({ entryTypes: ['measure'] });
    
    return () => {
      window.fetch = originalFetch;
      observer.disconnect();
    };
  }, []);
};
```

## 🔄 Deployment Architecture

### CI/CD Pipeline

#### Build and Test Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy Environment Variables System

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test:coverage
      - run: npm run build
      
      # Security checks
      - run: npm audit --audit-level=high
      - run: npm run security:scan
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          # Deploy to Vercel/Railway/AWS
          npm run deploy:production
```

#### Database Migration Strategy
```typescript
// Database migration runner
const runMigrations = async () => {
  const migrations = await getMigrationFiles();
  const applied = await getAppliedMigrations();
  
  const pending = migrations.filter(
    migration => !applied.includes(migration.id)
  );
  
  for (const migration of pending) {
    try {
      await executeTransaction(async (client) => {
        await client.query(migration.up);
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [migration.id]
        );
      });
      
      console.log(`✅ Applied migration: ${migration.id}`);
    } catch (error) {
      console.error(`❌ Migration failed: ${migration.id}`, error);
      throw error;
    }
  }
};
```

This technical architecture ensures the Environment Variables Management System can handle the critical requirements of the wedding industry while maintaining high performance, security, and reliability standards.

---

*Last Updated: January 2025 | Version 1.0.0*