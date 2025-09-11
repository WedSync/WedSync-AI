import React from 'react';
import { Metadata } from 'next';
import CostOptimizationDashboard from '@/components/ai-optimization/CostOptimizationDashboard';

export const metadata: Metadata = {
  title: 'AI Cost Optimization | WedSync',
  description: 'Manage and optimize AI costs with wedding season intelligence',
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AIOptimizationPage({ searchParams }: PageProps) {
  // In a real implementation, we would:
  // 1. Get the organization ID from the current user session
  // 2. Fetch AI usage metrics and settings from the API
  // 3. Pass real data to the dashboard component

  // For now, we'll use a mock organization ID
  const mockOrganizationId = '1';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <CostOptimizationDashboard
          organizationId={mockOrganizationId}
          className="container mx-auto"
        />
      </div>
    </div>
  );
}
