'use client';

import { useRouter } from 'next/navigation';
import {
  Calendar,
  QrCode,
  FileText,
  Clock,
  AlertTriangle,
  Camera,
  Share2,
  CheckCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function QuickActions() {
  const router = useRouter();

  const primaryActions = [
    {
      id: 'confirm-availability',
      label: 'Confirm Availability',
      description: 'Quick availability confirmation',
      icon: CheckCircle,
      color: 'bg-green-500 hover:bg-green-600 text-white',
      action: () => router.push('/supplier-portal/schedule/confirm'),
    },
    {
      id: 'scan-qr',
      label: 'QR Scanner',
      description: 'Scan event QR codes',
      icon: QrCode,
      color: 'bg-blue-500 hover:bg-blue-600 text-white',
      action: () => router.push('/supplier-portal/qr-scanner'),
    },
  ];

  const secondaryActions = [
    {
      id: 'view-schedule',
      label: 'Schedule',
      icon: Calendar,
      action: () => router.push('/supplier-portal/schedule'),
    },
    {
      id: 'report-conflict',
      label: 'Report Issue',
      icon: AlertTriangle,
      action: () => router.push('/supplier-portal/schedule/conflicts/new'),
    },
    {
      id: 'timeline-view',
      label: 'Timeline',
      icon: Clock,
      action: () => router.push('/supplier-portal/timeline'),
    },
    {
      id: 'export-schedule',
      label: 'Export',
      icon: FileText,
      action: () => router.push('/supplier-portal/schedule/export'),
    },
    {
      id: 'take-photo',
      label: 'Photo',
      icon: Camera,
      action: () => handleCameraAction(),
    },
    {
      id: 'share',
      label: 'Share',
      icon: Share2,
      action: () => handleShareAction(),
    },
  ];

  const handleCameraAction = () => {
    // Check if camera is available
    if (
      'mediaDevices' in navigator &&
      'getUserMedia' in navigator.mediaDevices
    ) {
      router.push('/supplier-portal/photo-capture');
    } else {
      // Fallback to file input
      router.push('/supplier-portal/photo-upload');
    }
  };

  const handleShareAction = () => {
    // Use native share if available
    if ('share' in navigator) {
      navigator
        .share({
          title: 'My Schedule',
          text: 'Check out my upcoming schedule',
          url: window.location.origin + '/supplier-portal/schedule/public',
        })
        .catch(console.error);
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(
        window.location.origin + '/supplier-portal/schedule/public',
      );
    }
  };

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Quick Actions
      </h2>

      {/* Primary actions - larger buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {primaryActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              onClick={action.action}
              className={cn(
                'h-20 flex flex-col items-center justify-center space-y-2',
                'text-sm font-medium transition-all duration-200',
                'touch-manipulation active:scale-95',
                action.color,
              )}
            >
              <Icon className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium">{action.label}</div>
                <div className="text-xs opacity-90">{action.description}</div>
              </div>
            </Button>
          );
        })}
      </div>

      {/* Secondary actions - grid of smaller buttons */}
      <div className="grid grid-cols-3 gap-2">
        {secondaryActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              variant="outline"
              onClick={action.action}
              className={cn(
                'h-16 flex flex-col items-center justify-center space-y-1',
                'text-xs font-medium transition-all duration-200',
                'touch-manipulation active:scale-95',
                'hover:bg-gray-50 hover:border-gray-300',
              )}
            >
              <Icon className="w-4 h-4 text-gray-600" />
              <span className="text-gray-700">{action.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Emergency contact - always visible */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <Button
          variant="outline"
          onClick={() => router.push('/supplier-portal/emergency-contact')}
          className="w-full h-12 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Emergency Contact
        </Button>
      </div>
    </Card>
  );
}
