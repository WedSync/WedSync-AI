# WS-302: WedSync Supplier Platform - Main Overview - Technical Specification

## Feature Overview

**Feature ID:** WS-302  
**Feature Name:** WedSync Supplier Platform - Main Overview  
**Feature Type:** Platform Architecture  
**Priority:** Critical Path  
**Team:** Team A (Frontend) + Team B (Backend)  
**Effort Estimate:** 13 story points (26 hours)  
**Sprint:** Foundation Sprint  

### Problem Statement

Wedding suppliers need a comprehensive, integrated platform that manages their entire business workflow from client onboarding to final delivery. The platform must seamlessly connect onboarding, dashboard, client management, forms, customer journeys, communications, client portal building, growth features, document management, analytics, and billing into a unified experience that drives efficiency and client satisfaction.

### Solution Overview

Implement the complete WedSync supplier platform architecture with integrated navigation, state management, real-time synchronization, and modular component system that connects all supplier-facing features while maintaining performance, scalability, and user experience standards.

## User Stories

### Epic: Supplier Platform Foundation

**Story 1:** As a wedding photographer Sarah, I need a unified platform where I can access all my business tools in one place, so that I don't have to juggle multiple software systems to manage my wedding photography business.

**Story 2:** As a new user Sarah, I need a clear navigation structure that helps me understand all available features, so that I can quickly find the tools I need without getting lost in the platform.

**Story 3:** As Sarah, I need my data to stay synchronized across all platform sections, so that when I update a client's wedding date in one area, it automatically reflects everywhere else in the system.

### Epic: Integrated Workflow Management

**Story 4:** As venue coordinator Lisa, I need my client dashboard to show a unified view of all client interactions, forms completed, journey progress, and upcoming tasks, so that I can manage all my couples effectively from a central location.

**Story 5:** As Lisa, I need to seamlessly move between different platform features (client management, forms, communications) while working on a specific couple's needs, so that my workflow isn't interrupted by having to navigate away and lose context.

**Story 6:** As Lisa, I need real-time notifications across all platform sections when clients take actions, so that I can respond promptly whether they complete a form, send a message, or update their details.

### Epic: Business Growth Integration

**Story 7:** As photographer Sarah, I need my growth features (referrals, reviews, marketplace) to integrate with my client management, so that successful weddings automatically generate opportunities for future business.

**Story 8:** As Sarah, I need my analytics to track performance across all platform features, so that I can see which client journeys convert best and which communication templates get the highest response rates.

**Story 9:** As Sarah, I need my billing and subscription management to be seamlessly integrated with feature usage, so that I can upgrade my plan when I hit limits without disrupting my workflow.

### Epic: Client Experience Coordination

**Story 10:** As florist Emma, I need my client-facing forms and dashboards to maintain consistent branding and styling across all touchpoints, so that my couples have a professional, cohesive experience with my business.

**Story 11:** As Emma, I need changes to my services, packages, or timeline to automatically update across all client touchpoints, so that couples always see accurate, current information.

**Story 12:** As Emma, I need to track client engagement across all platform features to understand which couples need more attention and which are progressing well toward their wedding day.

### Epic: Multi-Vendor Coordination

**Story 13:** As wedding planner Jessica, I need to coordinate with other suppliers in the couple's vendor team, so that we can collaborate effectively on timeline, logistics, and shared responsibilities.

**Story 14:** As photographer Sarah working with planner Jessica, I need visibility into the overall wedding timeline and other vendors' requirements, so that I can plan my photography schedule without conflicts.

**Story 15:** As venue coordinator Lisa, I need to share relevant information with other vendors while maintaining control over what information each vendor can access about my venue and operations.

### Epic: Performance and Reliability

**Story 16:** As any supplier using WedSync, I need the platform to load quickly and respond instantly to my actions, even during busy wedding season when I'm managing multiple couples simultaneously.

**Story 17:** As photographer Sarah, I need the platform to work reliably even with poor internet connection at wedding venues, so that I can update client information and access important details on the wedding day.

**Story 18:** As venue coordinator Lisa, I need confidence that my data is secure and backed up, so that I never lose important client information or business-critical data.

## Technical Implementation

### Platform Architecture

```typescript
// Main platform architecture
export interface SupplierPlatformConfig {
  supplier: Supplier;
  features: PlatformFeature[];
  permissions: FeaturePermissions;
  subscription: SubscriptionTier;
  branding: BrandingConfig;
  integrations: IntegrationConfig[];
}

export interface PlatformFeature {
  id: string;
  name: string;
  slug: string;
  component: React.ComponentType;
  requiresSubscription?: SubscriptionTier;
  permissions?: string[];
  dependencies?: string[];
  metadata: FeatureMetadata;
}

export interface FeatureMetadata {
  category: 'core' | 'growth' | 'analytics' | 'integration';
  priority: number;
  helpUrl?: string;
  onboardingRequired?: boolean;
}

// Platform state management
class SupplierPlatformStore {
  private supplier: Supplier | null = null;
  private clients: Map<string, Client> = new Map();
  private activeClient: Client | null = null;
  private notifications: PlatformNotification[] = [];
  private realtimeSubscriptions: Map<string, RealtimeChannel> = new Map();

  // Core platform state
  async initializePlatform(supplierId: string): Promise<void> {
    try {
      // Load supplier profile and permissions
      this.supplier = await this.loadSupplierProfile(supplierId);
      
      // Initialize feature configurations
      await this.initializeFeatureConfig();
      
      // Set up real-time subscriptions
      await this.setupRealtimeSubscriptions();
      
      // Load initial data
      await this.loadInitialData();
      
      // Initialize analytics tracking
      this.initializeAnalytics();
    } catch (error) {
      console.error('Platform initialization failed:', error);
      throw new PlatformError('Failed to initialize supplier platform');
    }
  }

  // Feature integration management
  async navigateToFeature(featureId: string, context?: NavigationContext): Promise<void> {
    const feature = this.getFeature(featureId);
    if (!feature) throw new Error(`Feature ${featureId} not found`);
    
    // Check permissions and subscription
    if (!this.hasFeatureAccess(feature)) {
      throw new PermissionError(`Access denied to feature ${featureId}`);
    }
    
    // Update navigation state
    this.updateNavigationState(feature, context);
    
    // Preload feature data
    await this.preloadFeatureData(feature, context);
    
    // Track navigation analytics
    this.trackNavigation(feature, context);
  }

  // Client context management
  async setActiveClient(clientId: string): Promise<void> {
    const client = await this.loadClientWithDetails(clientId);
    this.activeClient = client;
    
    // Update all feature contexts
    this.updateFeatureContexts(client);
    
    // Load client-specific data
    await this.loadClientSpecificData(client);
    
    // Track client interaction
    this.trackClientAccess(client);
  }

  // Real-time synchronization
  private async setupRealtimeSubscriptions(): Promise<void> {
    if (!this.supplier) return;

    // Subscribe to client updates
    const clientChannel = this.supabase
      .channel(`supplier_${this.supplier.id}_clients`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'clients', filter: `supplier_id=eq.${this.supplier.id}` },
        (payload) => this.handleClientUpdate(payload)
      )
      .subscribe();

    this.realtimeSubscriptions.set('clients', clientChannel);

    // Subscribe to form responses
    const formsChannel = this.supabase
      .channel(`supplier_${this.supplier.id}_forms`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'form_responses' },
        (payload) => this.handleFormResponseUpdate(payload)
      )
      .subscribe();

    this.realtimeSubscriptions.set('forms', formsChannel);

    // Subscribe to messages
    const messagesChannel = this.supabase
      .channel(`supplier_${this.supplier.id}_messages`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => this.handleMessageUpdate(payload)
      )
      .subscribe();

    this.realtimeSubscriptions.set('messages', messagesChannel);
  }

  // Feature permission management
  private hasFeatureAccess(feature: PlatformFeature): boolean {
    // Check subscription requirements
    if (feature.requiresSubscription && !this.hasSubscriptionTier(feature.requiresSubscription)) {
      return false;
    }

    // Check specific permissions
    if (feature.permissions && !this.hasPermissions(feature.permissions)) {
      return false;
    }

    return true;
  }

  // Analytics integration
  private trackNavigation(feature: PlatformFeature, context?: NavigationContext): void {
    this.analytics.track('platform_navigation', {
      supplier_id: this.supplier?.id,
      feature_id: feature.id,
      feature_category: feature.metadata.category,
      context: context,
      timestamp: new Date().toISOString()
    });
  }
}

// Platform routing system
export const platformRoutes: PlatformRoute[] = [
  {
    path: '/dashboard',
    component: 'SupplierDashboard',
    featureId: 'dashboard',
    title: 'Dashboard',
    icon: 'Home',
    category: 'core'
  },
  {
    path: '/clients',
    component: 'ClientManagement',
    featureId: 'client-management',
    title: 'Clients',
    icon: 'Users',
    category: 'core'
  },
  {
    path: '/clients/:clientId',
    component: 'ClientDetails',
    featureId: 'client-management',
    title: 'Client Details',
    hidden: true,
    category: 'core'
  },
  {
    path: '/forms',
    component: 'FormsSystem',
    featureId: 'forms',
    title: 'Forms',
    icon: 'FileText',
    category: 'core'
  },
  {
    path: '/journeys',
    component: 'CustomerJourneys',
    featureId: 'customer-journeys',
    title: 'Customer Journeys',
    icon: 'GitBranch',
    category: 'core'
  },
  {
    path: '/communications',
    component: 'Communications',
    featureId: 'communications',
    title: 'Communications',
    icon: 'MessageSquare',
    category: 'core'
  },
  {
    path: '/client-portals',
    component: 'ClientDashboardBuilder',
    featureId: 'client-portals',
    title: 'Client Portals',
    icon: 'Layout',
    category: 'core'
  },
  {
    path: '/growth',
    component: 'GrowthFeatures',
    featureId: 'growth',
    title: 'Growth',
    icon: 'TrendingUp',
    category: 'growth'
  },
  {
    path: '/documents',
    component: 'DocumentsArticles',
    featureId: 'documents',
    title: 'Documents',
    icon: 'FileText',
    category: 'core'
  },
  {
    path: '/analytics',
    component: 'Analytics',
    featureId: 'analytics',
    title: 'Analytics',
    icon: 'BarChart3',
    category: 'analytics',
    requiresSubscription: 'professional'
  },
  {
    path: '/billing',
    component: 'BillingSettings',
    featureId: 'billing',
    title: 'Billing',
    icon: 'CreditCard',
    category: 'core'
  }
];
```

### Main Platform Component

```tsx
'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SupplierPlatformStore } from '@/lib/stores/supplier-platform';
import { PlatformSidebar } from '@/components/platform/PlatformSidebar';
import { PlatformHeader } from '@/components/platform/PlatformHeader';
import { PlatformNotifications } from '@/components/platform/PlatformNotifications';
import { FeatureGate } from '@/components/platform/FeatureGate';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';

// Platform context
const PlatformContext = createContext<{
  store: SupplierPlatformStore;
  supplier: Supplier | null;
  activeClient: Client | null;
  setActiveClient: (client: Client | null) => void;
} | null>(null);

export function usePlatformContext() {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatformContext must be used within PlatformProvider');
  }
  return context;
}

interface SupplierPlatformProps {
  supplierId: string;
  children: React.ReactNode;
}

export function SupplierPlatform({ supplierId, children }: SupplierPlatformProps) {
  const [store] = useState(() => new SupplierPlatformStore());
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [activeClient, setActiveClientState] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize platform
  useEffect(() => {
    initializePlatform();
  }, [supplierId]);

  const initializePlatform = async () => {
    try {
      setLoading(true);
      await store.initializePlatform(supplierId);
      
      // Get supplier data from store
      const supplierData = store.getSupplier();
      setSupplier(supplierData);
      
      // Set up platform event listeners
      setupPlatformEventListeners();
      
    } catch (error) {
      console.error('Platform initialization error:', error);
      toast({
        title: 'Platform Error',
        description: 'Failed to initialize platform. Please refresh and try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const setupPlatformEventListeners = () => {
    // Listen for client updates
    store.on('client-updated', (client: Client) => {
      if (activeClient?.id === client.id) {
        setActiveClientState(client);
      }
    });

    // Listen for notifications
    store.on('notification', (notification: PlatformNotification) => {
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === 'error' ? 'destructive' : 'default'
      });
    });

    // Listen for feature access changes
    store.on('feature-access-changed', () => {
      // Check if current route is still accessible
      const currentRoute = platformRoutes.find(r => r.path === pathname);
      if (currentRoute && !store.hasFeatureAccess(currentRoute.featureId)) {
        router.push('/dashboard');
        toast({
          title: 'Access Restricted',
          description: 'Your subscription plan has changed. Redirecting to dashboard.',
          variant: 'destructive'
        });
      }
    });
  };

  const setActiveClient = async (client: Client | null) => {
    try {
      await store.setActiveClient(client?.id || null);
      setActiveClientState(client);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to set active client',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-600">Initializing WedSync Platform...</p>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Failed to load supplier platform</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <PlatformContext.Provider value={{ store, supplier, activeClient, setActiveClient }}>
      <div className="min-h-screen bg-gray-50">
        {/* Platform Header */}
        <PlatformHeader 
          supplier={supplier}
          activeClient={activeClient}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="flex">
          {/* Platform Sidebar */}
          <PlatformSidebar 
            supplier={supplier}
            routes={platformRoutes}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Main Content Area */}
          <main className={`flex-1 transition-all duration-200 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
            <div className="p-6">
              {children}
            </div>
          </main>
        </div>

        {/* Platform Notifications */}
        <PlatformNotifications />

        {/* Feature Access Gates */}
        <FeatureGate store={store} />
      </div>
    </PlatformContext.Provider>
  );
}

// Platform header component
interface PlatformHeaderProps {
  supplier: Supplier;
  activeClient: Client | null;
  onToggleSidebar: () => void;
}

function PlatformHeader({ supplier, activeClient, onToggleSidebar }: PlatformHeaderProps) {
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const { store } = usePlatformContext();

  useEffect(() => {
    // Load initial notifications
    loadNotifications();
    
    // Set up real-time notifications
    store.on('notification', (notification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 9)]);
    });
  }, []);

  const loadNotifications = async () => {
    try {
      const notifs = await store.getRecentNotifications();
      setNotifications(notifs);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {supplier.business_name}
            </h1>
            {activeClient && (
              <p className="text-sm text-gray-500">
                Working with: {activeClient.partner1_first_name} {activeClient.partner1_last_name}
                {activeClient.partner2_first_name && ` & ${activeClient.partner2_first_name}`}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Quick Actions */}
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              New Form
            </Button>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button className="p-2 rounded-lg hover:bg-gray-100 relative">
              <Bell className="w-5 h-5" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
              )}
            </button>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-2">
            <img
              src={supplier.profile_photo_url || '/default-avatar.png'}
              alt={supplier.business_name}
              className="w-8 h-8 rounded-full"
            />
            <div className="text-sm">
              <p className="font-medium">{supplier.contact_name}</p>
              <p className="text-gray-500">{supplier.subscription_tier}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

// Platform sidebar component
interface PlatformSidebarProps {
  supplier: Supplier;
  routes: PlatformRoute[];
  isOpen: boolean;
  onClose: () => void;
}

function PlatformSidebar({ supplier, routes, isOpen, onClose }: PlatformSidebarProps) {
  const pathname = usePathname();
  const { store } = usePlatformContext();
  const router = useRouter();

  const handleNavigation = async (route: PlatformRoute) => {
    try {
      if (!store.hasFeatureAccess(route.featureId)) {
        // Show upgrade prompt
        showUpgradePrompt(route);
        return;
      }

      await store.navigateToFeature(route.featureId);
      router.push(route.path);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const showUpgradePrompt = (route: PlatformRoute) => {
    // Implementation for upgrade modal
  };

  const categorizedRoutes = routes.reduce((acc, route) => {
    if (route.hidden) return acc;
    if (!acc[route.category]) acc[route.category] = [];
    acc[route.category].push(route);
    return acc;
  }, {} as Record<string, PlatformRoute[]>);

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">WedSync</h2>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 lg:hidden">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          {Object.entries(categorizedRoutes).map(([category, categoryRoutes]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {category.replace('-', ' ')}
              </h3>
              <div className="space-y-1">
                {categoryRoutes.map((route) => {
                  const isActive = pathname === route.path || pathname.startsWith(route.path + '/');
                  const hasAccess = store.hasFeatureAccess(route.featureId);
                  const IconComponent = Icons[route.icon];

                  return (
                    <button
                      key={route.path}
                      onClick={() => handleNavigation(route)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700' 
                          : hasAccess 
                            ? 'text-gray-700 hover:bg-gray-50' 
                            : 'text-gray-400'
                      }`}
                    >
                      <IconComponent className={`w-5 h-5 ${!hasAccess ? 'opacity-50' : ''}`} />
                      <span className={`font-medium ${!hasAccess ? 'opacity-50' : ''}`}>
                        {route.title}
                      </span>
                      {!hasAccess && route.requiresSubscription && (
                        <Lock className="w-3 h-3 text-gray-400 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <p>Plan: {supplier.subscription_tier}</p>
            <p>Version: 2.0.1</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
```

### Platform Integration Services

```typescript
// Feature integration service
export class PlatformIntegrationService {
  private supabase: SupabaseClient;
  private store: SupplierPlatformStore;

  constructor(store: SupplierPlatformStore) {
    this.supabase = createClient();
    this.store = store;
  }

  // Cross-feature data synchronization
  async synchronizeClientData(clientId: string, updates: Partial<Client>): Promise<void> {
    // Update client in database
    await this.supabase
      .from('clients')
      .update(updates)
      .eq('id', clientId);

    // Notify all interested features
    await Promise.all([
      this.updateFormsContext(clientId, updates),
      this.updateJourneysContext(clientId, updates),
      this.updateCommunicationsContext(clientId, updates),
      this.updateAnalyticsContext(clientId, updates)
    ]);

    // Update store state
    this.store.updateClientInState(clientId, updates);
  }

  // Feature dependency management
  async checkFeatureDependencies(featureId: string): Promise<DependencyStatus> {
    const feature = this.store.getFeature(featureId);
    if (!feature?.dependencies) {
      return { satisfied: true, missing: [] };
    }

    const missing: string[] = [];
    for (const dependency of feature.dependencies) {
      const dependencyFeature = this.store.getFeature(dependency);
      if (!dependencyFeature || !this.store.isFeatureInitialized(dependency)) {
        missing.push(dependency);
      }
    }

    return {
      satisfied: missing.length === 0,
      missing
    };
  }

  // Performance monitoring
  async trackFeaturePerformance(featureId: string, action: string, duration: number): Promise<void> {
    await this.supabase
      .from('platform_performance_metrics')
      .insert({
        supplier_id: this.store.getSupplierId(),
        feature_id: featureId,
        action,
        duration_ms: duration,
        timestamp: new Date().toISOString()
      });
  }

  // Error handling and recovery
  async handleFeatureError(featureId: string, error: Error): Promise<void> {
    // Log error
    console.error(`Feature ${featureId} error:`, error);

    // Report to monitoring service
    await this.reportError(featureId, error);

    // Attempt graceful degradation
    await this.gracefulDegradation(featureId, error);
  }

  private async updateFormsContext(clientId: string, updates: Partial<Client>): Promise<void> {
    // Update form pre-fill data with new client information
    if (updates.wedding_date || updates.partner1_email) {
      await this.supabase.rpc('update_form_prefill_data', {
        client_id: clientId,
        update_data: updates
      });
    }
  }

  private async updateJourneysContext(clientId: string, updates: Partial<Client>): Promise<void> {
    // Trigger journey recalculation if wedding date changed
    if (updates.wedding_date) {
      await this.supabase.rpc('recalculate_journey_timeline', {
        client_id: clientId,
        new_wedding_date: updates.wedding_date
      });
    }
  }

  private async updateCommunicationsContext(clientId: string, updates: Partial<Client>): Promise<void> {
    // Update communication preferences and contact info
    if (updates.partner1_email || updates.preferred_contact_method) {
      await this.supabase.rpc('update_communication_context', {
        client_id: clientId,
        contact_updates: updates
      });
    }
  }

  private async updateAnalyticsContext(clientId: string, updates: Partial<Client>): Promise<void> {
    // Track client data updates for analytics
    await this.supabase
      .from('client_activity_log')
      .insert({
        client_id: clientId,
        activity_type: 'profile_update',
        details: updates,
        timestamp: new Date().toISOString()
      });
  }
}

// Platform security service
export class PlatformSecurityService {
  // Feature access control
  async validateFeatureAccess(supplierId: string, featureId: string): Promise<boolean> {
    const supplier = await this.getSupplier(supplierId);
    if (!supplier) return false;

    const feature = this.getFeature(featureId);
    if (!feature) return false;

    // Check subscription requirements
    if (feature.requiresSubscription && !this.hasSubscriptionTier(supplier, feature.requiresSubscription)) {
      return false;
    }

    // Check specific permissions
    if (feature.permissions && !this.hasPermissions(supplier, feature.permissions)) {
      return false;
    }

    // Check business rules
    return await this.checkBusinessRules(supplier, feature);
  }

  // Rate limiting
  async checkRateLimit(supplierId: string, action: string): Promise<boolean> {
    const key = `rate_limit:${supplierId}:${action}`;
    const limit = this.getRateLimit(action);
    
    // Implementation would use Redis or similar for rate limiting
    return true; // Placeholder
  }

  // Data access validation
  async validateDataAccess(supplierId: string, dataType: string, resourceId: string): Promise<boolean> {
    // Validate supplier has access to specific data
    switch (dataType) {
      case 'client':
        return await this.validateClientAccess(supplierId, resourceId);
      case 'form':
        return await this.validateFormAccess(supplierId, resourceId);
      default:
        return false;
    }
  }
}
```

### MCP Server Usage

**Required MCP Servers:**
- **Supabase MCP**: Real-time subscriptions, database operations
- **GitHub MCP**: Version control for platform updates
- **Context7 MCP**: Latest Next.js and React patterns

```typescript
// Real-time platform synchronization
async function setupPlatformRealtime(supplierId: string) {
  return await supabaseMcp.createRealtimeSubscription({
    channel: `supplier_platform_${supplierId}`,
    tables: ['clients', 'forms', 'form_responses', 'messages', 'notifications'],
    events: ['*']
  });
}

// Performance monitoring
async function monitorPlatformPerformance() {
  const metrics = await supabaseMcp.executeQuery(`
    SELECT 
      feature_id,
      AVG(duration_ms) as avg_duration,
      MAX(duration_ms) as max_duration,
      COUNT(*) as action_count
    FROM platform_performance_metrics 
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY feature_id
    ORDER BY avg_duration DESC
  `);
  
  return metrics;
}

// Feature deployment tracking
async function trackFeatureDeployment(featureId: string, version: string) {
  await githubMcp.createIssue({
    title: `Feature Deployment: ${featureId} v${version}`,
    body: `Platform feature ${featureId} has been deployed to production`,
    labels: ['deployment', 'platform', featureId]
  });
}
```

## Testing Requirements

### Integration Tests
```typescript
describe('Supplier Platform Integration', () => {
  it('should maintain client context across features', async () => {
    const platform = new SupplierPlatformStore();
    await platform.initializePlatform('supplier-1');
    
    // Set active client
    await platform.setActiveClient('client-1');
    
    // Navigate to forms feature
    await platform.navigateToFeature('forms');
    expect(platform.getActiveClient()?.id).toBe('client-1');
    
    // Navigate to communications
    await platform.navigateToFeature('communications');
    expect(platform.getActiveClient()?.id).toBe('client-1');
  });

  it('should synchronize data across features', async () => {
    const platform = new SupplierPlatformStore();
    const integration = new PlatformIntegrationService(platform);
    
    // Update client data
    await integration.synchronizeClientData('client-1', {
      wedding_date: '2025-06-15'
    });
    
    // Verify updates propagated to all features
    const formsContext = await platform.getFormsContext('client-1');
    const journeysContext = await platform.getJourneysContext('client-1');
    
    expect(formsContext.wedding_date).toBe('2025-06-15');
    expect(journeysContext.wedding_date).toBe('2025-06-15');
  });
});
```

### Performance Tests
```typescript
describe('Platform Performance', () => {
  it('should load initial platform data within 3 seconds', async () => {
    const startTime = Date.now();
    const platform = new SupplierPlatformStore();
    
    await platform.initializePlatform('supplier-1');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });

  it('should handle concurrent feature navigation', async () => {
    const platform = new SupplierPlatformStore();
    await platform.initializePlatform('supplier-1');
    
    // Simulate rapid navigation
    const navigationPromises = [
      platform.navigateToFeature('clients'),
      platform.navigateToFeature('forms'),
      platform.navigateToFeature('communications'),
      platform.navigateToFeature('analytics')
    ];
    
    await expect(Promise.all(navigationPromises)).resolves.not.toThrow();
  });
});
```

## Acceptance Criteria

### Must Have
- [ ] Unified platform navigation with sidebar and header
- [ ] Real-time synchronization across all features
- [ ] Client context preservation during navigation
- [ ] Feature access control based on subscription tiers
- [ ] Performance monitoring and error tracking
- [ ] Responsive design for mobile and tablet
- [ ] Feature dependency management
- [ ] Notification system integration
- [ ] Search functionality across features
- [ ] Quick action shortcuts in header

### Should Have
- [ ] Customizable sidebar and feature organization
- [ ] Advanced keyboard shortcuts for power users
- [ ] Feature usage analytics and insights
- [ ] Offline capability for core features
- [ ] Multi-language support
- [ ] Advanced filtering and search
- [ ] Feature onboarding tours
- [ ] Integration health monitoring
- [ ] Bulk action capabilities
- [ ] Export functionality across features

### Could Have
- [ ] Custom dashboard widget system
- [ ] Advanced theme customization
- [ ] Feature API for third-party integrations
- [ ] Advanced workflow automation
- [ ] Voice command integration
- [ ] Advanced collaboration features
- [ ] Custom reporting across features
- [ ] Advanced security audit logs
- [ ] Feature A/B testing framework
- [ ] Advanced performance profiling tools

## Dependencies

### Technical Dependencies
- Next.js 15 App Router for routing
- React 19 for component architecture
- Supabase for real-time subscriptions
- TypeScript for type safety
- Tailwind CSS for styling
- Zustand or Redux for state management

### Feature Dependencies
- **WS-301**: Couples Tables (for client data)
- **WS-298**: Database Schema Overview (for data structure)
- **WS-297**: Authentication System (for user access)
- **WS-295**: Real-time Systems (for synchronization)

### Integration Dependencies
- All subsequent supplier platform features (WS-303 through WS-316)
- Billing system for subscription management
- Analytics system for usage tracking
- Communication services for notifications

## Risks and Mitigation

### Technical Risks
1. **Platform Performance**: Heavy feature loading could impact UX
   - *Mitigation*: Lazy loading, code splitting, performance monitoring
   
2. **State Management Complexity**: Cross-feature synchronization issues
   - *Mitigation*: Centralized store, clear data flow patterns
   
3. **Real-time Failures**: Network issues affecting synchronization
   - *Mitigation*: Offline support, retry mechanisms, graceful degradation

### Business Risks
1. **Feature Overwhelm**: Too many features confusing users
   - *Mitigation*: Progressive disclosure, onboarding flows, contextual help
   
2. **Performance Degradation**: Poor experience during high usage
   - *Mitigation*: Load balancing, CDN usage, performance monitoring
   
3. **Integration Failures**: Third-party service disruptions
   - *Mitigation*: Circuit breakers, fallback options, monitoring alerts

---

**Estimated Effort:** 13 story points (26 hours)
**Priority:** Critical Path  
**Sprint:** Foundation Sprint  
**Team:** Team A (Frontend) + Team B (Backend)