'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { QRCodeCanvas } from 'qrcode.react';
import {
  AlertCircle,
  Users,
  Camera,
  Download,
  Share2,
  WifiOff,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PhotoGroup {
  id: string;
  name: string;
  guests: string[];
  timeSlot: string;
  location?: string;
  completed: boolean;
  photographer_notes?: string;
}

interface EmergencyMode {
  active: boolean;
  activatedAt?: Date;
  photographerAccess?: string;
  backupCreated: boolean;
  offlineMode: boolean;
}

export function EmergencyPhotoGroups() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [emergencyMode, setEmergencyMode] = useState<EmergencyMode>({
    active: false,
    backupCreated: false,
    offlineMode: false,
  });

  const [photoGroups, setPhotoGroups] = useState<PhotoGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [qrCode, setQrCode] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>(
    'idle',
  );

  // Check online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (emergencyMode.offlineMode) {
        syncOfflineData();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setEmergencyMode((prev) => ({ ...prev, offlineMode: true }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [emergencyMode.offlineMode]);

  // Load photo groups
  const loadPhotoGroups = useCallback(async () => {
    try {
      // Try to load from local storage first (offline support)
      const cached = localStorage.getItem('wedding_photo_groups');
      if (cached) {
        setPhotoGroups(JSON.parse(cached));
      }

      if (isOnline) {
        const { data, error } = await supabase
          .from('photo_groups')
          .select('*')
          .order('time_slot', { ascending: true });

        if (!error && data) {
          setPhotoGroups(data);
          // Cache for offline use
          localStorage.setItem('wedding_photo_groups', JSON.stringify(data));
        }
      }
    } catch (error) {
      console.error('Error loading photo groups:', error);
    }
  }, [supabase, isOnline]);

  useEffect(() => {
    loadPhotoGroups();
  }, [loadPhotoGroups]);

  // Enable emergency mode
  const enableEmergencyMode = async () => {
    setLoading(true);
    try {
      // Generate secure photographer access token
      const token = crypto.randomUUID();

      // Create emergency backup
      await createEmergencyBackup();

      // Generate QR code for photographer
      const accessUrl = `${window.location.origin}/photographer/emergency/${token}`;
      setQrCode(accessUrl);

      // Store emergency mode state
      const emergencyState: EmergencyMode = {
        active: true,
        activatedAt: new Date(),
        photographerAccess: token,
        backupCreated: true,
        offlineMode: !navigator.onLine,
      };

      setEmergencyMode(emergencyState);
      localStorage.setItem('emergency_mode', JSON.stringify(emergencyState));

      if (isOnline) {
        // Notify photographer via backend
        await supabase.functions.invoke('notify-photographer-emergency', {
          body: { token, photoGroups },
        });
      }
    } catch (error) {
      console.error('Error enabling emergency mode:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create emergency backup
  const createEmergencyBackup = async () => {
    const backup = {
      timestamp: new Date().toISOString(),
      photoGroups,
      weddingDetails: {
        date: new Date().toLocaleDateString(),
        venue: localStorage.getItem('wedding_venue') || 'Unknown',
      },
    };

    // Store locally
    localStorage.setItem('emergency_backup', JSON.stringify(backup));

    // Generate PDF backup
    await generatePDFBackup(backup);

    return backup;
  };

  // Generate PDF backup
  const generatePDFBackup = async (backup: any) => {
    // Create a simple PDF with photo groups
    const content = `
WEDDING DAY PHOTO GROUPS - EMERGENCY BACKUP
Date: ${backup.timestamp}
Venue: ${backup.weddingDetails.venue}

PHOTO SCHEDULE:
${backup.photoGroups
  .map(
    (group: PhotoGroup) => `
${group.timeSlot} - ${group.name}
Location: ${group.location || 'TBD'}
Guests: ${group.guests.join(', ')}
Notes: ${group.photographer_notes || 'None'}
`,
  )
  .join('\n')}
    `;

    // Create blob and download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wedding-photo-backup-${Date.now()}.txt`;
    a.click();
  };

  // Sync offline data when back online
  const syncOfflineData = async () => {
    setSyncStatus('syncing');
    try {
      const offlineChanges = localStorage.getItem('offline_changes');
      if (offlineChanges) {
        const changes = JSON.parse(offlineChanges);

        // Sync each change
        for (const change of changes) {
          await supabase.from('photo_groups').upsert(change);
        }

        // Clear offline changes
        localStorage.removeItem('offline_changes');
      }
      setSyncStatus('synced');
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('idle');
    }
  };

  // Quick photo group check-in
  const quickCheckIn = (groupId: string) => {
    const updated = photoGroups.map((group) =>
      group.id === groupId ? { ...group, completed: true } : group,
    );

    setPhotoGroups(updated);
    localStorage.setItem('wedding_photo_groups', JSON.stringify(updated));

    // Queue for sync if offline
    if (!isOnline) {
      const offlineChanges = JSON.parse(
        localStorage.getItem('offline_changes') || '[]',
      );
      offlineChanges.push({
        id: groupId,
        completed: true,
        updated_at: new Date(),
      });
      localStorage.setItem('offline_changes', JSON.stringify(offlineChanges));
    } else {
      // Sync immediately if online
      supabase
        .from('photo_groups')
        .update({ completed: true })
        .eq('id', groupId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 p-4">
      {/* Status Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            {emergencyMode.active && (
              <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded animate-pulse">
                EMERGENCY MODE
              </span>
            )}
            {!isOnline && (
              <span className="px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded flex items-center gap-1">
                <WifiOff className="h-3 w-3" />
                OFFLINE
              </span>
            )}
            {syncStatus === 'syncing' && (
              <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded">
                SYNCING...
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              generatePDFBackup({
                photoGroups,
                timestamp: new Date(),
                weddingDetails: {},
              })
            }
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="pt-16 max-w-4xl mx-auto">
        {/* Emergency Mode Toggle */}
        {!emergencyMode.active ? (
          <Card className="mb-6 border-2 border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                Emergency Mode Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Activate if experiencing technical difficulties, poor
                connectivity, or time constraints
              </p>
              <Button
                onClick={enableEmergencyMode}
                disabled={loading}
                className="w-full bg-red-500 hover:bg-red-600"
                size="lg"
              >
                {loading ? 'Activating...' : 'ACTIVATE EMERGENCY MODE'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 bg-red-50 border-red-300">
            <CardHeader>
              <CardTitle className="text-red-700">
                Emergency Mode Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Simplified interface active • Offline backup created •
                  Photographer access enabled
                </AlertDescription>
              </Alert>

              {qrCode && (
                <div className="mt-4 p-4 bg-white rounded-lg text-center">
                  <p className="text-sm font-medium mb-2">
                    Photographer Quick Access
                  </p>
                  <QRCodeCanvas value={qrCode} size={200} className="mx-auto" />
                  <p className="text-xs text-gray-500 mt-2">
                    Scan to access photo schedule
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Photo Groups List */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Today\'s Photo Schedule
          </h2>

          {photoGroups.map((group) => (
            <Card
              key={group.id}
              className={cn(
                'cursor-pointer transition-all',
                group.completed && 'bg-green-50 border-green-300',
              )}
              onClick={() => !group.completed && quickCheckIn(group.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">
                        {group.timeSlot}
                      </span>
                      {group.completed && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 mt-1">
                      {group.name}
                    </h3>
                    {group.location && (
                      <p className="text-sm text-gray-600">
                        📍 {group.location}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {group.guests.length} people
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Camera className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {!group.completed && emergencyMode.active && (
                  <Button className="w-full mt-3 bg-green-600 hover:bg-green-700">
                    TAP TO COMPLETE
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Emergency Actions */}
        {emergencyMode.active && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
            <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
              <Button
                size="lg"
                variant="outline"
                onClick={() => (window.location.href = 'tel:+1234567890')}
              >
                📞 Call Photographer
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() =>
                  generatePDFBackup({
                    photoGroups,
                    timestamp: new Date(),
                    weddingDetails: {},
                  })
                }
              >
                💾 Export Backup
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
