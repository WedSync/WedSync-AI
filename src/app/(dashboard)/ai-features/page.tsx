import { Metadata } from 'next';
import { Suspense } from 'react';
import AIFeatureManager from '@/components/ai-features/AIFeatureManager';

export const metadata: Metadata = {
  title: 'AI Features | WedSync',
  description:
    'Manage your AI-powered wedding tools with transparent cost tracking',
};

/**
 * AI Features Management Page
 * WS-239 Platform vs Client APIs Implementation
 */
export default function AIFeaturesPage() {
  // Mock data - In real implementation, this would come from server-side data fetching
  const mockCurrentTier = {
    id: 'professional',
    name: 'professional' as const,
    monthlyPrice: 49,
    yearlyPrice: 490,
  };

  const mockUserId = 'user123';
  const mockOrganizationId = 'org456';

  const handleFeatureToggle = (featureId: string, enabled: boolean) => {
    console.log('Feature toggle:', featureId, enabled);
    // In real implementation, this would call API to update feature status
  };

  const handleUpgradeRequest = (targetTier: string) => {
    console.log('Upgrade request to:', targetTier);
    // In real implementation, this would redirect to billing/upgrade flow
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          }
        >
          <AIFeatureManager
            userId={mockUserId}
            organizationId={mockOrganizationId}
            currentTier={mockCurrentTier}
            onFeatureToggle={handleFeatureToggle}
            onUpgradeRequest={handleUpgradeRequest}
          />
        </Suspense>
      </div>
    </div>
  );
}
