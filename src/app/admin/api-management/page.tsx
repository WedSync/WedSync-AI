import { Metadata } from 'next';
import { APIManagementDashboard } from '../../../components/admin/api-management/APIManagementDashboard';

export const metadata: Metadata = {
  title: 'API Management - WedSync Admin',
  description:
    'Monitor and manage WedSync API performance, security, and integrations',
};

export default function APIManagementPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              API Management Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Monitor API performance, manage integrations, and ensure system
              reliability for wedding day operations
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>All systems operational</span>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <APIManagementDashboard />
    </div>
  );
}
