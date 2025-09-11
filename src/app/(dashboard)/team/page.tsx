/**
 * Team Management Dashboard Page
 * WS-073: Team Management - Wedding Business Collaboration
 * Comprehensive team management dashboard for wedding business collaboration
 */

import { Metadata } from 'next';
import { Suspense } from 'react';
import TeamManager from '@/components/team/TeamManager';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Team Management - WedSync',
  description:
    'Manage your wedding business team with role-based access control, invitations, and collaboration tools.',
  keywords:
    'team management, wedding business, collaboration, role-based access control, RBAC',
};

interface TeamPageProps {
  searchParams?: Promise<{
    team?: string;
    tab?: string;
  }>;
}

function TeamPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mt-2 animate-pulse"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 bg-gray-200 rounded w-28 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
      </div>

      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-gray-200 rounded animate-pulse"
              ></div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="flex space-x-8 border-b border-gray-200">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 rounded w-20"></div>
            ))}
          </div>

          <div className="space-y-3 mt-6">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-gray-200 rounded animate-pulse"
              ></div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default async function TeamPage({ searchParams }: TeamPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedTeamId = resolvedSearchParams?.team;
  const activeTab = resolvedSearchParams?.tab || 'overview';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Team Management
                </h1>
                <p className="mt-2 text-gray-600">
                  Manage your wedding business team with role-based access
                  control and collaboration tools
                </p>
              </div>
              <div className="flex items-center space-x-4">
                {/* Navigation breadcrumbs could go here */}
                <nav className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>Dashboard</span>
                  <span>/</span>
                  <span className="text-gray-900 font-medium">Team</span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<TeamPageSkeleton />}>
          <TeamManagerWrapper teamId={selectedTeamId} defaultTab={activeTab} />
        </Suspense>
      </div>

      {/* Help Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-blue-900">
                Wedding Business Team Management
              </h3>
              <div className="mt-2 text-blue-800">
                <p>
                  Manage your wedding business team with different access
                  levels:
                </p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>
                    <strong>Owner:</strong> Full access to all features,
                    billing, and team management
                  </li>
                  <li>
                    <strong>Senior Photographer:</strong> Can manage all
                    clients, forms, and view analytics
                  </li>
                  <li>
                    <strong>Photographer:</strong> Can only manage assigned
                    clients and forms
                  </li>
                  <li>
                    <strong>Coordinator:</strong> Can view analytics and client
                    information (read-only)
                  </li>
                  <li>
                    <strong>Viewer:</strong> Basic read-only access to client
                    information
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/**
 * Wrapper component to handle client-side functionality
 */
async function TeamManagerWrapper({
  teamId,
  defaultTab,
}: {
  teamId?: string;
  defaultTab?: string;
}) {
  // In a real implementation, we would get the user ID from authentication
  // For now, we'll pass undefined and let the component handle authentication

  return (
    <TeamManager
      teamId={teamId}
      className="w-full"
      onTeamCreated={(team) => {
        // Handle team creation success
        console.log('Team created:', team.name);
      }}
      onTeamUpdated={(team) => {
        // Handle team update success
        console.log('Team updated:', team.name);
      }}
    />
  );
}
