'use client';

import React, { useState, useEffect } from 'react';
import { useActionState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  Clock,
  Heart,
  Users,
  Camera,
  FileText,
  Phone,
  RefreshCw,
  Zap,
  CheckCircle2,
  XCircle,
  Shield,
  Calendar,
  MapPin,
  Headphones,
  PlayCircle,
  StopCircle,
  Timer,
} from 'lucide-react';
import { formatDistanceToNow, format, differenceInHours } from 'date-fns';

interface AvailableBackup {
  id: string;
  created_at: string;
  backup_type: 'full' | 'incremental' | 'wedding_critical' | 'emergency';
  status: 'completed' | 'failed' | 'verified';
  size_bytes: number;
  data_scope: {
    weddings: number;
    guests: number;
    vendors: number;
    timelines: number;
    photos: number;
    contracts: number;
  };
  recency_score: number; // 0-100, higher is more recent
  completeness_score: number; // 0-100, higher is more complete
  recommended: boolean;
}

interface AffectedWedding {
  id: string;
  couple_name: string;
  wedding_date: string;
  hours_until_wedding: number;
  urgency_level: 'critical' | 'high' | 'medium' | 'low';
  affected_data: string[];
  guest_count: number;
  vendor_count: number;
  coordinator_contact: string;
  venue_name: string;
  ceremony_time: string;
  reception_time: string;
}

interface RecoveryScope {
  data_types: string[];
  estimated_records: number;
  estimated_duration: string;
  business_impact: 'minimal' | 'moderate' | 'high' | 'severe';
  rollback_available: boolean;
}

interface EmergencyRecoveryProps {
  availableBackups: AvailableBackup[];
  affectedWeddings: AffectedWedding[];
  onInitiateRecovery: (backupId: string, scope: RecoveryScope) => Promise<void>;
  onContactSupport: () => void;
  onNotifyStakeholders: (weddings: string[], message: string) => Promise<void>;
}

const EmergencyRecovery: React.FC<EmergencyRecoveryProps> = ({
  availableBackups,
  affectedWeddings,
  onInitiateRecovery,
  onContactSupport,
  onNotifyStakeholders,
}) => {
  const [selectedBackup, setSelectedBackup] = useState<string>();
  const [recoveryScope, setRecoveryScope] = useState<RecoveryScope>();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [recoveryInProgress, setRecoveryInProgress] = useState(false);

  // Update current time every minute for accurate countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const [recoveryState, recoveryAction] = useActionState(
    async (prevState: any, formData: FormData) => {
      const backupId = formData.get('backupId') as string;
      const scopeData = JSON.parse(formData.get('scope') as string);

      try {
        setRecoveryInProgress(true);
        await onInitiateRecovery(backupId, scopeData);
        return { success: true, message: 'Recovery initiated successfully' };
      } catch (error) {
        return { success: false, message: 'Recovery failed to initiate' };
      } finally {
        setRecoveryInProgress(false);
      }
    },
    { success: false, message: '' },
  );

  const getCriticalWeddings = () => {
    return affectedWeddings
      .filter((w) => w.hours_until_wedding <= 48)
      .sort((a, b) => a.hours_until_wedding - b.hours_until_wedding);
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-600 text-white animate-pulse';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-black';
      case 'low':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const formatTimeUntilWedding = (hours: number) => {
    if (hours < 1) return `${Math.floor(hours * 60)} minutes`;
    if (hours < 24) return `${Math.floor(hours)} hours`;
    return `${Math.floor(hours / 24)} days`;
  };

  const getRecommendedBackup = () => {
    return availableBackups
      .filter((b) => b.status === 'completed')
      .sort(
        (a, b) =>
          b.recency_score +
          b.completeness_score -
          (a.recency_score + a.completeness_score),
      )[0];
  };

  const quickRecoveryScenarios = [
    {
      id: 'wedding_day_emergency',
      title: 'Wedding Day Emergency',
      description: 'Full system recovery for weddings happening today',
      icon: '🚨',
      urgency: 'critical',
      estimatedTime: '15-30 minutes',
      dataTypes: ['all_systems'],
      action: async () => {
        const backup = getRecommendedBackup();
        if (backup) {
          const scope: RecoveryScope = {
            data_types: [
              'weddings',
              'guests',
              'vendors',
              'timelines',
              'photos',
            ],
            estimated_records:
              backup.data_scope.weddings +
              backup.data_scope.guests +
              backup.data_scope.vendors,
            estimated_duration: '15-30 minutes',
            business_impact: 'severe',
            rollback_available: true,
          };
          setSelectedBackup(backup.id);
          setRecoveryScope(scope);
          setShowConfirmDialog(true);
        }
      },
    },
    {
      id: 'guest_list_recovery',
      title: 'Guest List Recovery',
      description: 'Restore guest lists, RSVPs, and seating arrangements',
      icon: '👥',
      urgency: 'high',
      estimatedTime: '5-10 minutes',
      dataTypes: ['guests', 'rsvps', 'seating'],
      action: async () => {
        const backup = getRecommendedBackup();
        if (backup) {
          const scope: RecoveryScope = {
            data_types: ['guests', 'rsvps', 'seating_arrangements'],
            estimated_records: backup.data_scope.guests,
            estimated_duration: '5-10 minutes',
            business_impact: 'moderate',
            rollback_available: true,
          };
          setSelectedBackup(backup.id);
          setRecoveryScope(scope);
          setShowConfirmDialog(true);
        }
      },
    },
    {
      id: 'timeline_recovery',
      title: 'Timeline Recovery',
      description: 'Restore wedding day schedules and vendor coordination',
      icon: '⏰',
      urgency: 'high',
      estimatedTime: '3-7 minutes',
      dataTypes: ['timelines', 'schedules'],
      action: async () => {
        const backup = getRecommendedBackup();
        if (backup) {
          const scope: RecoveryScope = {
            data_types: ['timelines', 'schedules', 'vendor_coordination'],
            estimated_records: backup.data_scope.timelines,
            estimated_duration: '3-7 minutes',
            business_impact: 'high',
            rollback_available: true,
          };
          setSelectedBackup(backup.id);
          setRecoveryScope(scope);
          setShowConfirmDialog(true);
        }
      },
    },
    {
      id: 'vendor_contacts',
      title: 'Vendor Contacts',
      description: 'Restore vendor information, contracts, and communication',
      icon: '📞',
      urgency: 'medium',
      estimatedTime: '2-5 minutes',
      dataTypes: ['vendors', 'contracts'],
      action: async () => {
        const backup = getRecommendedBackup();
        if (backup) {
          const scope: RecoveryScope = {
            data_types: ['vendors', 'contracts', 'communications'],
            estimated_records: backup.data_scope.vendors,
            estimated_duration: '2-5 minutes',
            business_impact: 'moderate',
            rollback_available: true,
          };
          setSelectedBackup(backup.id);
          setRecoveryScope(scope);
          setShowConfirmDialog(true);
        }
      },
    },
  ];

  const criticalWeddings = getCriticalWeddings();
  const recommendedBackup = getRecommendedBackup();

  return (
    <div className="space-y-6 p-6">
      {/* Emergency Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-8 w-8 animate-pulse" />
            <div>
              <h1 className="text-3xl font-bold">Emergency Recovery Center</h1>
              <p className="text-red-100 mt-1">
                {criticalWeddings.length} wedding
                {criticalWeddings.length !== 1 ? 's' : ''} requiring immediate
                attention
              </p>
            </div>
          </div>
          <div className="text-right">
            <Button
              variant="secondary"
              size="lg"
              className="bg-white text-red-600 hover:bg-red-50"
              onClick={onContactSupport}
            >
              <Phone className="h-5 w-5 mr-2" />
              Emergency Hotline
            </Button>
          </div>
        </div>
      </div>

      {/* Critical Wedding Countdown */}
      {criticalWeddings.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Critical Wedding Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {criticalWeddings.slice(0, 3).map((wedding) => (
                <div
                  key={wedding.id}
                  className="bg-white p-4 rounded-lg border-2 border-red-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold">
                        {wedding.couple_name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(wedding.wedding_date), 'PPP')}
                        </span>
                        <MapPin className="h-4 w-4 ml-2" />
                        <span>{wedding.venue_name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-red-600">
                        {formatTimeUntilWedding(wedding.hours_until_wedding)}
                      </div>
                      <div className="text-sm text-red-500">remaining</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge className={getUrgencyColor(wedding.urgency_level)}>
                      {wedding.urgency_level.toUpperCase()} PRIORITY
                    </Badge>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Phone className="h-4 w-4 mr-1" />
                        Call Coordinator
                      </Button>
                      <Button size="sm" variant="destructive">
                        <Shield className="h-4 w-4 mr-1" />
                        Priority Recovery
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{wedding.guest_count} guests</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span>{wedding.vendor_count} vendors</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Ceremony: {wedding.ceremony_time}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      <span>Reception: {wedding.reception_time}</span>
                    </div>
                  </div>

                  {wedding.affected_data.length > 0 && (
                    <Alert className="mt-3">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Affected Data:</strong>{' '}
                        {wedding.affected_data.join(', ')}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Recovery Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quickRecoveryScenarios.map((scenario) => (
          <Card key={scenario.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{scenario.icon}</div>
                  <div>
                    <h3 className="text-lg font-bold">{scenario.title}</h3>
                    <p className="text-sm text-gray-600">
                      {scenario.description}
                    </p>
                  </div>
                </div>
                <Badge className={getUrgencyColor(scenario.urgency)}>
                  {scenario.urgency}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Estimated Recovery Time:
                  </span>
                  <span className="font-medium">{scenario.estimatedTime}</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {scenario.dataTypes.map((type) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>

                <Button
                  className="w-full h-12 text-base font-semibold"
                  variant={
                    scenario.urgency === 'critical' ? 'destructive' : 'default'
                  }
                  onClick={scenario.action}
                  disabled={!recommendedBackup || recoveryInProgress}
                >
                  {recoveryInProgress ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Recovery in Progress
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-5 w-5 mr-2" />
                      Start {scenario.title}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Backup Selection */}
      {availableBackups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Backups</CardTitle>
            <CardDescription>
              Select a backup for recovery operation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {availableBackups.slice(0, 5).map((backup) => (
                <div
                  key={backup.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedBackup === backup.id
                      ? 'border-blue-300 bg-blue-50'
                      : backup.recommended
                        ? 'border-green-300 bg-green-50'
                        : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedBackup(backup.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          backup.status === 'completed'
                            ? 'bg-green-600'
                            : 'bg-gray-600'
                        }
                      >
                        {backup.status}
                      </Badge>
                      {backup.recommended && (
                        <Badge className="bg-blue-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(backup.created_at), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Weddings:</span>
                      <span className="ml-2 font-medium">
                        {backup.data_scope.weddings}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Guests:</span>
                      <span className="ml-2 font-medium">
                        {backup.data_scope.guests}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Vendors:</span>
                      <span className="ml-2 font-medium">
                        {backup.data_scope.vendors}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Photos:</span>
                      <span className="ml-2 font-medium">
                        {backup.data_scope.photos}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-4">
                    <div className="text-xs">
                      <span className="text-gray-500">Completeness:</span>
                      <Progress
                        value={backup.completeness_score}
                        className="w-16 h-1 inline-block ml-2"
                      />
                      <span className="ml-1">{backup.completeness_score}%</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-gray-500">Freshness:</span>
                      <Progress
                        value={backup.recency_score}
                        className="w-16 h-1 inline-block ml-2"
                      />
                      <span className="ml-1">{backup.recency_score}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emergency Support */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Headphones className="h-5 w-5" />
            Emergency Support
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                0800-WEDDING-911
              </div>
              <div className="text-sm text-amber-700">
                24/7 Emergency Hotline
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                &lt; 5 min
              </div>
              <div className="text-sm text-amber-700">
                Average Response Time
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">99.9%</div>
              <div className="text-sm text-amber-700">
                Wedding Day Success Rate
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recovery Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              Confirm Emergency Recovery
            </DialogTitle>
            <DialogDescription>
              This will initiate an emergency recovery operation. Please review
              the details carefully.
            </DialogDescription>
          </DialogHeader>

          {recoveryScope && selectedBackup && (
            <div className="space-y-4 py-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Recovery Impact Assessment</AlertTitle>
                <AlertDescription>
                  <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                    <div>
                      <strong>Estimated Duration:</strong>{' '}
                      {recoveryScope.estimated_duration}
                    </div>
                    <div>
                      <strong>Records Affected:</strong>{' '}
                      {recoveryScope.estimated_records.toLocaleString()}
                    </div>
                    <div>
                      <strong>Business Impact:</strong>{' '}
                      {recoveryScope.business_impact}
                    </div>
                    <div>
                      <strong>Rollback Available:</strong>{' '}
                      {recoveryScope.rollback_available ? 'Yes' : 'No'}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Data Types to Recover:</h4>
                <div className="flex flex-wrap gap-2">
                  {recoveryScope.data_types.map((type) => (
                    <Badge key={type} variant="outline">
                      {type.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              {criticalWeddings.length > 0 && (
                <Alert className="border-red-200 bg-red-50">
                  <Heart className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-red-800">
                    Wedding Impact
                  </AlertTitle>
                  <AlertDescription className="text-red-700">
                    This recovery will affect {criticalWeddings.length} wedding
                    {criticalWeddings.length !== 1 ? 's' : ''} within 48 hours.
                    All affected couples and vendors will be automatically
                    notified.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={recoveryInProgress}
            >
              Cancel
            </Button>
            <form action={recoveryAction}>
              <input type="hidden" name="backupId" value={selectedBackup} />
              <input
                type="hidden"
                name="scope"
                value={JSON.stringify(recoveryScope)}
              />
              <Button
                type="submit"
                variant="destructive"
                disabled={recoveryInProgress}
                className="min-w-32"
              >
                {recoveryInProgress ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Recovering...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Start Recovery
                  </>
                )}
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmergencyRecovery;
