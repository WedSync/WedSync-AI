import { Metadata } from 'next';
import WS191BackupDashboard from '@/components/admin/backup/WS191BackupDashboard';

export const metadata: Metadata = {
  title: 'Backup Management | WedSync Admin',
  description: 'Monitor and manage wedding data protection systems',
};

export default function BackupsPage() {
  return <WS191BackupDashboard />;
}
