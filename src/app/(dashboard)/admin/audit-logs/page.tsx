import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminAccess } from '@/lib/admin/auth';
import AuditLogViewer from '@/components/admin/AuditLogViewer';
import SecurityDashboard from '@/components/admin/SecurityDashboard';
import AuditLogFilters from '@/components/admin/AuditLogFilters';
import SuspiciousActivityAlert from '@/components/admin/SuspiciousActivityAlert';

export const metadata = {
  title: 'Audit Log Dashboard - WedSync',
  description: 'Security audit logging and monitoring for administrators',
};

export default async function AuditLogPage() {
  // Server-side admin authentication
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect('/login');
  }

  // Verify admin access with comprehensive checks
  const hasAdminAccess = await verifyAdminAccess(user.id);
  if (!hasAdminAccess) {
    redirect('/dashboard?error=admin_access_required');
  }

  // Get admin user profile for additional context
  const { data: profile } = await supabase
    .from('user_profiles')
    .select(
      `
      id,
      email,
      role,
      full_name,
      admin_permissions,
      mfa_enabled,
      last_login_at
    `,
    )
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    redirect('/dashboard?error=insufficient_permissions');
  }

  return (
    <div className="min-h-screen bg-gray-25">
      {/* Admin Access Banner */}
      <div className="bg-primary-600 text-white px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span>Admin Mode Active</span>
            </div>
            <span>•</span>
            <span>
              {profile.role === 'super_admin'
                ? 'Super Administrator'
                : 'Administrator'}
            </span>
            <span>•</span>
            <span>{profile.full_name || profile.email}</span>
          </div>
          <div className="text-xs opacity-90">Security Audit Dashboard</div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Security Audit Dashboard
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Monitor user activities, security events, and system audit trail for
            WedSync platform
          </p>
        </div>

        <Suspense
          fallback={
            <div className="space-y-8">
              {/* Loading skeleton */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-16 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        >
          <div className="space-y-8">
            {/* Security Overview */}
            <SecurityDashboard />

            {/* Main Audit Content */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
              {/* Filters Sidebar */}
              <div className="lg:col-span-1">
                <AuditLogFilters
                  filters={{
                    dateRange: {
                      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                      end: new Date(),
                    },
                    eventTypes: [],
                    riskLevels: [],
                    userIds: [],
                    searchQuery: '',
                    includeResolved: false,
                  }}
                  userOptions={[]}
                  onFiltersChange={(filters) => {
                    // Handle filter changes - this would typically update URL params
                    // and be picked up by the AuditLogViewer component
                    console.log('Filters changed:', filters);
                  }}
                />
              </div>

              {/* Main Content Area */}
              <div className="lg:col-span-3 space-y-6">
                {/* Suspicious Activity Alerts */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Active Security Alerts
                  </h2>
                  <SuspiciousActivityAlert
                    alert={{
                      id: 'alert-1',
                      user_id: 'user-suspicious',
                      alert_type: 'MULTIPLE_FAILED_LOGINS',
                      risk_level: 'HIGH',
                      description:
                        'Multiple failed login attempts detected from unusual location',
                      metadata: {
                        ip_address: '203.0.113.195',
                        login_attempts: 8,
                        location: 'Unknown Location',
                        user_agent: 'Automated Bot v1.0',
                      },
                      resolved: false,
                      created_at: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
                      updated_at: new Date(Date.now() - 300000).toISOString(),
                    }}
                    onResolve={(alertId: string, resolution: string) => {
                      console.log('Alert resolved:', alertId, resolution);
                    }}
                    onInvestigate={(alertId: string) => {
                      console.log('Investigating alert:', alertId);
                    }}
                  />
                </div>

                {/* Audit Log Viewer */}
                <AuditLogViewer
                  showActions={true}
                  realTimeUpdates={true}
                  initialFilters={
                    {
                      // Initial filters can be set based on URL params
                    }
                  }
                />
              </div>
            </div>
          </div>
        </Suspense>
      </div>

      {/* Security Footer */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-4 mt-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>🔒 All audit activities are encrypted and logged</span>
            <span>•</span>
            <span>Compliance: GDPR, SOX, PCI-DSS</span>
            <span>•</span>
            <span>Data retention: 7 years</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Session: {user.id.slice(0, 8)}...</span>
            <span>Role: {profile.role}</span>
            {profile.mfa_enabled && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-success-100 text-success-800">
                MFA ✓
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Enable static optimization for better performance
export const dynamic = 'force-dynamic';
export const revalidate = 0;
