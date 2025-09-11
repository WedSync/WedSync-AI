'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Phone,
  RefreshCw,
  Download,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface BackupStatus {
  isOnline: boolean;
  lastBackup: Date | null;
  backupHealth: 'healthy' | 'warning' | 'critical';
  localDataIntegrity: boolean;
  criticalDataPresent: boolean;
}

interface EmergencyContact {
  name: string;
  role: string;
  phone: string;
  available: boolean;
}

const EmergencyHeader: React.FC = () => {
  return (
    <div className="bg-red-600 text-white p-4 rounded-t-lg">
      <div className="flex items-center justify-center space-x-2">
        <AlertTriangle className="w-6 h-6" />
        <h1 className="text-lg font-bold">Emergency Recovery</h1>
      </div>
      <p className="text-center text-sm mt-1">Wedding Day Data Recovery</p>
    </div>
  );
};

const BackupStatusCheck: React.FC<{
  status: BackupStatus;
  onRefresh: () => void;
}> = ({ status, onRefresh }) => {
  const { triggerHaptic } = useHapticFeedback();

  const getStatusColor = (health: BackupStatus['backupHealth']) => {
    switch (health) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
    }
  };

  const getStatusIcon = (health: BackupStatus['backupHealth']) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
    }
  };

  const handleRefresh = () => {
    triggerHaptic('impact');
    onRefresh();
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>Backup Status</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            {status.isOnline ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-600" />
            )}
            <span className="text-sm font-medium">Connection</span>
          </div>
          <span
            className={`text-sm ${status.isOnline ? 'text-green-600' : 'text-red-600'}`}
          >
            {status.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Backup Health */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            {getStatusIcon(status.backupHealth)}
            <span className="text-sm font-medium">Backup Health</span>
          </div>
          <span
            className={`text-sm font-medium ${getStatusColor(status.backupHealth)}`}
          >
            {status.backupHealth.toUpperCase()}
          </span>
        </div>

        {/* Last Backup */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Download className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">Last Backup</span>
          </div>
          <span className="text-sm text-gray-600">
            {status.lastBackup
              ? new Date(status.lastBackup).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Never'}
          </span>
        </div>

        {/* Data Integrity */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium">Data Integrity</span>
          </div>
          <span
            className={`text-sm ${status.localDataIntegrity ? 'text-green-600' : 'text-red-600'}`}
          >
            {status.localDataIntegrity ? 'Valid' : 'Corrupted'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

const QuickRecoveryActions: React.FC<{
  status: BackupStatus;
  onAction: (action: string) => void;
}> = ({ status, onAction }) => {
  const { triggerHaptic } = useHapticFeedback();

  const handleAction = (action: string) => {
    triggerHaptic('impact');
    onAction(action);
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Quick Recovery Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Emergency Backup */}
        <Button
          onClick={() => handleAction('emergency-backup')}
          className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700"
          disabled={!status.isOnline}
        >
          <Download className="w-5 h-5 mr-2" />
          Emergency Backup Now
        </Button>

        {/* Restore Last Backup */}
        <Button
          onClick={() => handleAction('restore-backup')}
          className="w-full h-12 text-base font-medium bg-green-600 hover:bg-green-700"
          disabled={!status.lastBackup}
        >
          <Upload className="w-5 h-5 mr-2" />
          Restore Last Backup
        </Button>

        {/* Sync Offline Data */}
        <Button
          onClick={() => handleAction('sync-offline')}
          className="w-full h-12 text-base font-medium bg-purple-600 hover:bg-purple-700"
          disabled={!status.isOnline || !status.criticalDataPresent}
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Sync Offline Changes
        </Button>

        {/* Wedding Day Mode */}
        <Button
          onClick={() => handleAction('wedding-mode')}
          className="w-full h-12 text-base font-medium bg-red-600 hover:bg-red-700"
        >
          <Shield className="w-5 h-5 mr-2" />
          Activate Wedding Day Mode
        </Button>
      </CardContent>
    </Card>
  );
};

const EmergencySupport: React.FC = () => {
  const { triggerHaptic } = useHapticFeedback();

  const emergencyContacts: EmergencyContact[] = [
    {
      name: 'WedSync Emergency',
      role: '24/7 Wedding Support',
      phone: '+44 800 123 4567',
      available: true,
    },
    {
      name: 'Technical Recovery',
      role: 'Data Recovery Specialist',
      phone: '+44 800 765 4321',
      available: true,
    },
  ];

  const handleCall = (phone: string, name: string) => {
    triggerHaptic('impact');
    window.open(`tel:${phone}`, '_self');
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Emergency Support</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {emergencyContacts.map((contact, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{contact.name}</p>
              <p className="text-xs text-gray-600">{contact.role}</p>
              <p className="text-xs text-gray-500 mt-1">{contact.phone}</p>
            </div>
            <Button
              onClick={() => handleCall(contact.phone, contact.name)}
              className="h-10 px-4 bg-green-600 hover:bg-green-700"
              disabled={!contact.available}
            >
              <Phone className="w-4 h-4 mr-1" />
              Call
            </Button>
          </div>
        ))}

        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <AlertDescription className="text-xs text-yellow-800">
            For wedding day emergencies, our team is available 24/7. We
            understand how critical your wedding data is.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

const EmergencyRecoveryMobile: React.FC = () => {
  const { isOnline, syncStatus } = useOfflineSync();
  const [backupStatus, setBackupStatus] = useState<BackupStatus>({
    isOnline: isOnline,
    lastBackup: null,
    backupHealth: 'warning',
    localDataIntegrity: true,
    criticalDataPresent: true,
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Update connection status
    setBackupStatus((prev) => ({
      ...prev,
      isOnline: isOnline,
    }));
  }, [isOnline]);

  const handleRefreshStatus = async () => {
    setIsLoading(true);
    try {
      // Simulate API call to check backup status
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockStatus: BackupStatus = {
        isOnline: navigator.onLine,
        lastBackup: new Date(Date.now() - Math.random() * 86400000),
        backupHealth:
          Math.random() > 0.7
            ? 'healthy'
            : Math.random() > 0.3
              ? 'warning'
              : 'critical',
        localDataIntegrity: Math.random() > 0.1,
        criticalDataPresent: Math.random() > 0.05,
      };

      setBackupStatus(mockStatus);
    } catch (error) {
      console.error('Failed to refresh backup status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoveryAction = async (action: string) => {
    setIsLoading(true);
    try {
      switch (action) {
        case 'emergency-backup':
          // Trigger emergency backup
          console.log('Triggering emergency backup...');
          break;
        case 'restore-backup':
          // Restore from last backup
          console.log('Restoring from last backup...');
          break;
        case 'sync-offline':
          // Sync offline changes
          console.log('Syncing offline changes...');
          break;
        case 'wedding-mode':
          // Activate wedding day mode
          console.log('Activating wedding day mode...');
          break;
      }

      // Simulate action processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Refresh status after action
      await handleRefreshStatus();
    } catch (error) {
      console.error(`Failed to execute ${action}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize status on mount
  useEffect(() => {
    handleRefreshStatus();
  }, []);

  return (
    <div className="mobile-emergency-recovery min-h-screen bg-gray-100">
      <div className="max-w-md mx-auto bg-white shadow-lg">
        <EmergencyHeader />

        <div className="p-4 space-y-4">
          {isLoading && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg flex items-center space-x-3">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </div>
            </div>
          )}

          <BackupStatusCheck
            status={backupStatus}
            onRefresh={handleRefreshStatus}
          />

          <QuickRecoveryActions
            status={backupStatus}
            onAction={handleRecoveryAction}
          />

          <EmergencySupport />
        </div>
      </div>
    </div>
  );
};

export default EmergencyRecoveryMobile;
