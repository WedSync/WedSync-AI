import PrivacyDashboard from '@/components/privacy/PrivacyDashboard';

export const metadata = {
  title: 'Privacy Settings - WedSync',
  description:
    'Manage your privacy settings, data exports, and GDPR compliance requests',
};

export default function PrivacySettingsPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <PrivacyDashboard />
    </div>
  );
}
