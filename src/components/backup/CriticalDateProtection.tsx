'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  AlertTriangle,
  Shield,
  Clock,
  Heart,
  Bell,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Zap,
  Settings,
  Users,
  Camera,
} from 'lucide-react';
import {
  format,
  addDays,
  subDays,
  isWeekend,
  isSameDay,
  startOfWeek,
  endOfWeek,
} from 'date-fns';

/**
 * CriticalDateProtection Component
 *
 * Wedding date backup priority interface that ensures maximum
 * data protection during critical wedding periods, especially
 * Saturday wedding days when vendors are most active.
 */

interface CriticalWedding {
  id: string;
  coupleName: string;
  weddingDate: string;
  daysUntil: number;
  status: 'today' | 'tomorrow' | 'this_week' | 'next_week' | 'this_month';
  protectionLevel: 'maximum' | 'high' | 'standard' | 'minimal';
  backupFrequency: string;
  lastBackup: string;
  vendor: string;
  weddingType: 'saturday' | 'sunday' | 'weekday';
  dataVolume: number;
  criticalAssets: string[];
  notifications: {
    couple: boolean;
    vendor: boolean;
    admin: boolean;
  };
  emergencyContacts: {
    primary: string;
    secondary: string;
  };
}

interface ProtectionRule {
  id: string;
  name: string;
  description: string;
  trigger: 'days_before' | 'day_of' | 'weekend' | 'holiday';
  value: number;
  action:
    | 'increase_frequency'
    | 'enable_monitoring'
    | 'send_alerts'
    | 'lock_system';
  enabled: boolean;
  backupFrequency: string;
  notificationChannels: string[];
}

interface SystemAlert {
  id: string;
  type:
    | 'wedding_day'
    | 'backup_failure'
    | 'system_maintenance'
    | 'critical_error';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  weddingId?: string;
  timestamp: string;
  acknowledged: boolean;
  actionRequired: boolean;
}

const CriticalDateProtection: React.FC = () => {
  const [criticalWeddings, setCriticalWeddings] = useState<CriticalWedding[]>(
    [],
  );
  const [protectionRules, setProtectionRules] = useState<ProtectionRule[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [weekendLockdown, setWeekendLockdown] = useState(true);
  const [autoProtection, setAutoProtection] = useState(true);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadCriticalDates();
    loadProtectionRules();
    loadSystemAlerts();

    // Check for weekend lockdown
    checkWeekendLockdown();

    // Set up real-time monitoring
    const interval = setInterval(() => {
      checkCriticalDates();
      loadSystemAlerts();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadCriticalDates = async () => {
    try {
      const { data, error } = await supabase
        .from('weddings')
        .select(
          `
          id,
          couple_name,
          wedding_date,
          vendor_info,
          backup_settings,
          last_backup,
          data_volume
        `,
        )
        .gte('wedding_date', new Date().toISOString())
        .lte('wedding_date', addDays(new Date(), 90).toISOString())
        .order('wedding_date', { ascending: true });

      if (error) throw error;

      const criticalData: CriticalWedding[] = (data || []).map((wedding) => {
        const weddingDate = new Date(wedding.wedding_date);
        const today = new Date();
        const daysUntil = Math.ceil(
          (weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        let status: CriticalWedding['status'] = 'this_month';
        let protectionLevel: CriticalWedding['protectionLevel'] = 'standard';
        let backupFrequency = '24h';

        if (daysUntil === 0) {
          status = 'today';
          protectionLevel = 'maximum';
          backupFrequency = '1h';
        } else if (daysUntil === 1) {
          status = 'tomorrow';
          protectionLevel = 'maximum';
          backupFrequency = '2h';
        } else if (daysUntil <= 7) {
          status = 'this_week';
          protectionLevel = 'high';
          backupFrequency = '6h';
        } else if (daysUntil <= 14) {
          status = 'next_week';
          protectionLevel = 'high';
          backupFrequency = '12h';
        }

        const weddingType: CriticalWedding['weddingType'] =
          weddingDate.getDay() === 6
            ? 'saturday'
            : weddingDate.getDay() === 0
              ? 'sunday'
              : 'weekday';

        return {
          id: wedding.id,
          coupleName: wedding.couple_name,
          weddingDate: wedding.wedding_date,
          daysUntil,
          status,
          protectionLevel,
          backupFrequency,
          lastBackup: wedding.last_backup || new Date().toISOString(),
          vendor: wedding.vendor_info?.name || 'Unknown',
          weddingType,
          dataVolume: wedding.data_volume || 0,
          criticalAssets: ['photos', 'contracts', 'timeline', 'guest_list'],
          notifications: {
            couple: true,
            vendor: true,
            admin: true,
          },
          emergencyContacts: {
            primary: wedding.vendor_info?.phone || '',
            secondary: 'support@wedsync.com',
          },
        };
      });

      setCriticalWeddings(criticalData);
    } catch (error) {
      console.error('Failed to load critical dates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProtectionRules = async () => {
    // Mock protection rules - in production, load from database
    const rules: ProtectionRule[] = [
      {
        id: 'saturday_lockdown',
        name: 'Saturday Wedding Lockdown',
        description:
          'Prevent deployments and maintenance during Saturday weddings',
        trigger: 'weekend',
        value: 6, // Saturday
        action: 'lock_system',
        enabled: weekendLockdown,
        backupFrequency: '1h',
        notificationChannels: ['email', 'sms', 'slack'],
      },
      {
        id: 'wedding_day_monitoring',
        name: 'Wedding Day Maximum Protection',
        description: 'Maximum backup frequency and monitoring on wedding day',
        trigger: 'day_of',
        value: 0,
        action: 'increase_frequency',
        enabled: true,
        backupFrequency: '30min',
        notificationChannels: ['email', 'sms'],
      },
      {
        id: 'pre_wedding_alert',
        name: 'Pre-Wedding Alert System',
        description: 'Send alerts 24 hours before wedding',
        trigger: 'days_before',
        value: 1,
        action: 'send_alerts',
        enabled: true,
        backupFrequency: '2h',
        notificationChannels: ['email'],
      },
      {
        id: 'weekly_intensive',
        name: 'Weekly Intensive Protection',
        description: 'Increased protection 7 days before wedding',
        trigger: 'days_before',
        value: 7,
        action: 'increase_frequency',
        enabled: true,
        backupFrequency: '4h',
        notificationChannels: ['email'],
      },
    ];

    setProtectionRules(rules);
  };

  const loadSystemAlerts = async () => {
    // Mock system alerts
    const alerts: SystemAlert[] = [
      ...criticalWeddings
        .filter((w) => w.status === 'today')
        .map((wedding) => ({
          id: `wedding_today_${wedding.id}`,
          type: 'wedding_day' as const,
          severity: 'critical' as const,
          message: `${wedding.coupleName}'s wedding is TODAY - Maximum protection active`,
          weddingId: wedding.id,
          timestamp: new Date().toISOString(),
          acknowledged: false,
          actionRequired: false,
        })),

      ...criticalWeddings
        .filter((w) => w.status === 'tomorrow')
        .map((wedding) => ({
          id: `wedding_tomorrow_${wedding.id}`,
          type: 'wedding_day' as const,
          severity: 'high' as const,
          message: `${wedding.coupleName}'s wedding is TOMORROW - Pre-wedding protocols active`,
          weddingId: wedding.id,
          timestamp: new Date().toISOString(),
          acknowledged: false,
          actionRequired: true,
        })),
    ];

    setSystemAlerts(alerts);
  };

  const checkWeekendLockdown = () => {
    const today = new Date();
    const isSaturday = today.getDay() === 6;
    const hasSaturdayWedding = criticalWeddings.some(
      (w) =>
        isSameDay(new Date(w.weddingDate), today) &&
        w.weddingType === 'saturday',
    );

    if (isSaturday && hasSaturdayWedding) {
      setEmergencyMode(true);
    }
  };

  const checkCriticalDates = () => {
    const today = new Date();

    // Check for imminent weddings
    criticalWeddings.forEach((wedding) => {
      const weddingDate = new Date(wedding.weddingDate);
      const hoursUntil =
        (weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60);

      if (
        hoursUntil <= 24 &&
        hoursUntil > 0 &&
        !systemAlerts.some((a) => a.weddingId === wedding.id)
      ) {
        // Trigger 24-hour alert
        triggerCriticalAlert(wedding, '24-hour pre-wedding alert');
      }

      if (hoursUntil <= 2 && hoursUntil > 0) {
        // Emergency mode for 2-hour window
        setEmergencyMode(true);
      }
    });
  };

  const triggerCriticalAlert = async (
    wedding: CriticalWedding,
    alertType: string,
  ) => {
    try {
      // Send notifications
      await supabase.functions.invoke('send-critical-alert', {
        body: {
          weddingId: wedding.id,
          type: alertType,
          couple: wedding.coupleName,
          weddingDate: wedding.weddingDate,
          vendor: wedding.vendor,
          contacts: wedding.emergencyContacts,
        },
      });

      // Log alert
      console.log(
        `Critical alert triggered for ${wedding.coupleName}: ${alertType}`,
      );
    } catch (error) {
      console.error('Failed to trigger critical alert:', error);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    setSystemAlerts((alerts) =>
      alerts.map((alert) =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert,
      ),
    );
  };

  const updateProtectionRule = async (ruleId: string, enabled: boolean) => {
    setProtectionRules((rules) =>
      rules.map((rule) => (rule.id === ruleId ? { ...rule, enabled } : rule)),
    );

    // Apply the rule change
    if (ruleId === 'saturday_lockdown') {
      setWeekendLockdown(enabled);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'today':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'tomorrow':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'this_week':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'next_week':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProtectionLevelIcon = (level: string) => {
    switch (level) {
      case 'maximum':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'high':
        return <Shield className="h-4 w-4 text-orange-500" />;
      case 'standard':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            Loading critical date protection...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Critical Date Protection</h1>
          <p className="text-muted-foreground">
            Automated wedding date protection with Saturday lockdown protocols
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Switch
              checked={autoProtection}
              onCheckedChange={setAutoProtection}
            />
            <span className="text-sm">Auto Protection</span>
          </div>
          <Button variant="outline" onClick={loadCriticalDates}>
            <Shield className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Emergency Mode Alert */}
      {emergencyMode && (
        <Alert className="border-red-600 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-red-800">
            EMERGENCY MODE ACTIVE
          </AlertTitle>
          <AlertDescription className="text-red-700">
            <div className="mt-2">
              <p className="font-medium">
                Saturday wedding day detected - All systems locked down
              </p>
              <ul className="list-disc list-inside text-sm mt-1">
                <li>No deployments or maintenance allowed</li>
                <li>Maximum backup frequency active</li>
                <li>24/7 monitoring enabled</li>
                <li>Emergency support standing by</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* System Alerts */}
      {systemAlerts.filter((a) => !a.acknowledged).length > 0 && (
        <div className="space-y-3">
          {systemAlerts
            .filter((a) => !a.acknowledged)
            .slice(0, 5)
            .map((alert) => (
              <Alert
                key={alert.id}
                className={
                  alert.severity === 'critical'
                    ? 'border-red-200 bg-red-50'
                    : alert.severity === 'high'
                      ? 'border-orange-200 bg-orange-50'
                      : 'border-yellow-200 bg-yellow-50'
                }
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  {alert.type.replace('_', ' ').toUpperCase()} -{' '}
                  {alert.severity.toUpperCase()}
                </AlertTitle>
                <AlertDescription>
                  <div className="flex items-start justify-between">
                    <div>
                      <p>{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(alert.timestamp), 'MMM dd, HH:mm:ss')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      Acknowledge
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
        </div>
      )}

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Weddings
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {criticalWeddings.filter((w) => w.status === 'today').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Maximum protection active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {
                criticalWeddings.filter(
                  (w) => w.status === 'this_week' || w.status === 'tomorrow',
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">
              High protection level
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Weekend Protection
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {weekendLockdown ? 'ACTIVE' : 'OFF'}
            </div>
            <p className="text-xs text-muted-foreground">
              Saturday lockdown status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {systemAlerts.filter((a) => !a.acknowledged).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Unacknowledged alerts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Weddings List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Critical Wedding Dates
          </CardTitle>
          <CardDescription>
            Weddings requiring enhanced backup protection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {criticalWeddings.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">All Clear</h3>
                <p className="text-gray-600">
                  No critical wedding dates in the protection window
                </p>
              </div>
            ) : (
              criticalWeddings.map((wedding) => (
                <div key={wedding.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getProtectionLevelIcon(wedding.protectionLevel)}
                      <div>
                        <h4 className="font-medium">{wedding.coupleName}</h4>
                        <p className="text-sm text-gray-600">
                          {format(
                            new Date(wedding.weddingDate),
                            'EEEE, MMMM dd, yyyy',
                          )}{' '}
                          • {wedding.vendor}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(wedding.status)}>
                        {wedding.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {wedding.weddingType.toUpperCase()}
                      </Badge>
                      <Badge
                        variant={
                          wedding.protectionLevel === 'maximum'
                            ? 'destructive'
                            : 'default'
                        }
                      >
                        {wedding.protectionLevel.toUpperCase()} PROTECTION
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">
                        Days Until:
                      </span>
                      <div className="text-lg font-bold">
                        {wedding.daysUntil === 0
                          ? 'TODAY'
                          : wedding.daysUntil === 1
                            ? 'TOMORROW'
                            : `${wedding.daysUntil} days`}
                      </div>
                    </div>

                    <div>
                      <span className="font-medium text-gray-700">
                        Backup Frequency:
                      </span>
                      <div className="text-lg font-bold text-blue-600">
                        {wedding.backupFrequency}
                      </div>
                    </div>

                    <div>
                      <span className="font-medium text-gray-700">
                        Data Volume:
                      </span>
                      <div className="text-lg font-bold">
                        {formatBytes(wedding.dataVolume)}
                      </div>
                    </div>

                    <div>
                      <span className="font-medium text-gray-700">
                        Last Backup:
                      </span>
                      <div className="text-sm text-gray-600">
                        {format(new Date(wedding.lastBackup), 'MMM dd, HH:mm')}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Camera className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Photos protected
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Guest data secured
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {wedding.notifications.couple && (
                        <Badge variant="outline" className="text-xs">
                          <Bell className="h-3 w-3 mr-1" />
                          Couple notified
                        </Badge>
                      )}
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4 mr-1" />
                        Configure
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Protection Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Protection Rules
          </CardTitle>
          <CardDescription>
            Automated protection rules for critical wedding periods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {protectionRules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(enabled) =>
                        updateProtectionRule(rule.id, enabled)
                      }
                    />
                    <div>
                      <h4 className="font-medium">{rule.name}</h4>
                      <p className="text-sm text-gray-600">
                        {rule.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-medium">
                    {rule.backupFrequency}
                  </div>
                  <div className="text-xs text-gray-500">
                    {rule.notificationChannels.join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Emergency Response
          </CardTitle>
          <CardDescription>
            Critical contact information for wedding day emergencies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-red-600">Technical Emergency</h4>
              <p className="text-sm text-gray-600 mt-1">
                System failures, data recovery
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300"
                >
                  <Phone className="h-4 w-4 mr-1" />
                  Call Now
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300"
                >
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </Button>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-orange-600">Vendor Support</h4>
              <p className="text-sm text-gray-600 mt-1">
                Vendor-specific assistance
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-orange-600 border-orange-300"
                >
                  <Phone className="h-4 w-4 mr-1" />
                  Support Line
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-orange-600 border-orange-300"
                >
                  <Bell className="h-4 w-4 mr-1" />
                  Alert Team
                </Button>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-blue-600">Customer Success</h4>
              <p className="text-sm text-gray-600 mt-1">
                Client communication, escalation
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-blue-600 border-blue-300"
                >
                  <Users className="h-4 w-4 mr-1" />
                  Contact
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-blue-600 border-blue-300"
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Escalate
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CriticalDateProtection;
