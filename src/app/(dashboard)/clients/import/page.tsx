'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button-untitled';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ImportWizard from '@/components/clients/import/ImportWizard';

export default function ImportClientsPage() {
  const router = useRouter();

  const handleImportComplete = (result: any) => {
    // Handle successful import - could show notification or redirect
    console.log('Import completed:', result);
  };

  const handleCancel = () => {
    router.push('/dashboard/clients');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/clients">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Clients
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Import Clients
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Import clients from CSV or Excel files with advanced
                  validation and mapping
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8">
        <ImportWizard
          onComplete={handleImportComplete}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
