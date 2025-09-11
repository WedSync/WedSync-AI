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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Clock,
  Calendar,
  Settings,
  Shield,
  Camera,
  FileText,
  Users,
  MapPin,
  Heart,
  AlertTriangle,
  CheckCircle,
  Info,
  Save,
  Trash2,
  Plus,
  Edit,
} from 'lucide-react';
import { format, addDays, startOfDay } from 'date-fns';

/**
 * BackupScheduler Component
 *
 * Automated backup configuration UI for wedding vendors.
 * Provides wedding-specific backup scheduling with enhanced
 * frequency for critical wedding periods.
 */

// Types for backup scheduling
interface BackupSchedule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  scheduleType: 'daily' | 'weekly' | 'monthly' | 'wedding_adaptive' | 'custom';
  frequency: string; // Cron expression
  dataTypes: string[];
  retentionDays: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  weddingAware: boolean;
  preweddingDays: number; // Days before wedding to increase frequency
  postweddingDays: number; // Days after wedding to maintain high frequency
  adaptiveSettings?: {
    normalFrequency: string;
    preweddingFrequency: string;
    weddingDayFrequency: string;
    postweddingFrequency: string;
  };
  notifications: {
    onSuccess: boolean;
    onFailure: boolean;
    onWarning: boolean;
    email: string[];
    sms: string[];
  };
  exclusions: {
    weekends: boolean;
    holidays: boolean;
    maintenanceWindows: string[];
  };
  lastRun?: string;
  nextRun?: string;
  status: 'active' | 'paused' | 'failed' | 'disabled';
}

interface WeddingEvent {
  id: string;
  coupleName: string;
  weddingDate: string;
  daysUntil: number;
  status: 'upcoming' | 'this_week' | 'today' | 'past';
  backupPriority: 'critical' | 'high' | 'normal';
}

interface BackupTemplate {
  id: string;
  name: string;
  description: string;
  vendorType:
    | 'photographer'
    | 'venue'
    | 'florist'
    | 'planner'
    | 'caterer'
    | 'all';
  schedule: Partial<BackupSchedule>;
}

const BackupScheduler: React.FC = () => {
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [upcomingWeddings, setUpcomingWeddings] = useState<WeddingEvent[]>([]);
  const [templates, setTemplates] = useState<BackupTemplate[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<string>('');
  const [editingSchedule, setEditingSchedule] = useState<BackupSchedule | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('schedules');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadData();

    // Set up real-time subscriptions
    const schedulesSubscription = supabase
      .channel('backup_schedules_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'backup_schedules',
        },
        () => {
          loadSchedules();
        },
      )
      .subscribe();

    return () => {
      schedulesSubscription.unsubscribe();
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadSchedules(),
      loadUpcomingWeddings(),
      loadTemplates(),
    ]);
    setLoading(false);
  };

  const loadSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('backup_schedules')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Failed to load backup schedules:', error);
    }
  };

  const loadUpcomingWeddings = async () => {
    try {
      const { data, error } = await supabase
        .from('weddings')
        .select('id, couple_name, wedding_date')
        .gte('wedding_date', new Date().toISOString())
        .order('wedding_date', { ascending: true })
        .limit(20);

      if (error) throw error;

      const weddingEvents: WeddingEvent[] = (data || []).map((wedding) => {
        const weddingDate = new Date(wedding.wedding_date);
        const today = new Date();
        const daysUntil = Math.ceil(
          (weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        let status: WeddingEvent['status'] = 'upcoming';
        let backupPriority: WeddingEvent['backupPriority'] = 'normal';

        if (daysUntil === 0) {
          status = 'today';
          backupPriority = 'critical';
        } else if (daysUntil <= 7) {
          status = 'this_week';
          backupPriority = 'critical';
        } else if (daysUntil <= 30) {
          backupPriority = 'high';
        }

        return {
          id: wedding.id,
          coupleName: wedding.couple_name,
          weddingDate: wedding.wedding_date,
          daysUntil,
          status,
          backupPriority,
        };
      });

      setUpcomingWeddings(weddingEvents);
    } catch (error) {
      console.error('Failed to load upcoming weddings:', error);
    }
  };

  const loadTemplates = async () => {
    // Mock templates - in production, these would come from database
    const mockTemplates: BackupTemplate[] = [
      {
        id: 'photographer',
        name: 'Wedding Photographer',
        description:
          'Optimized for photo-heavy workflows with critical client protection',
        vendorType: 'photographer',
        schedule: {
          name: 'Photography Backup',
          scheduleType: 'wedding_adaptive',
          dataTypes: ['photos', 'client_data', 'contracts'],
          retentionDays: 365,
          priority: 'critical',
          weddingAware: true,
          preweddingDays: 14,
          postweddingDays: 7,
          adaptiveSettings: {
            normalFrequency: '0 2 * * *', // Daily at 2 AM
            preweddingFrequency: '0 */6 * * *', // Every 6 hours
            weddingDayFrequency: '0 */2 * * *', // Every 2 hours
            postweddingFrequency: '0 */4 * * *', // Every 4 hours
          },
        },
      },
      {
        id: 'venue',
        name: 'Wedding Venue',
        description: 'Event scheduling and guest management focused',
        vendorType: 'venue',
        schedule: {
          name: 'Venue Management Backup',
          scheduleType: 'wedding_adaptive',
          dataTypes: ['guest_lists', 'timelines', 'vendor_data', 'contracts'],
          retentionDays: 180,
          priority: 'high',
          weddingAware: true,
          preweddingDays: 7,
          postweddingDays: 3,
        },
      },
      {
        id: 'florist',
        name: 'Wedding Florist',
        description: 'Design-focused with client approval tracking',
        vendorType: 'florist',
        schedule: {
          name: 'Florist Design Backup',
          scheduleType: 'weekly',
          dataTypes: ['designs', 'client_data', 'contracts', 'photos'],
          retentionDays: 90,
          priority: 'normal',
          weddingAware: true,
          preweddingDays: 10,
          postweddingDays: 3,
        },
      },
    ];

    setTemplates(mockTemplates);
  };

  const saveSchedule = async (schedule: BackupSchedule) => {
    try {
      const { error } = await supabase.from('backup_schedules').upsert([
        {
          id: schedule.id === 'new' ? undefined : schedule.id,
          name: schedule.name,
          description: schedule.description,
          enabled: schedule.enabled,
          schedule_type: schedule.scheduleType,
          frequency: schedule.frequency,
          data_types: schedule.dataTypes,
          retention_days: schedule.retentionDays,
          priority: schedule.priority,
          wedding_aware: schedule.weddingAware,
          prewedding_days: schedule.preweddingDays,
          postwedding_days: schedule.postweddingDays,
          adaptive_settings: schedule.adaptiveSettings,
          notifications: schedule.notifications,
          exclusions: schedule.exclusions,
          status: schedule.status,
        },
      ]);

      if (error) throw error;

      await loadSchedules();
      setEditingSchedule(null);
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to save backup schedule:', error);
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('backup_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      await loadSchedules();
      setSelectedSchedule('');
    } catch (error) {
      console.error('Failed to delete backup schedule:', error);
    }
  };

  const toggleSchedule = async (scheduleId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('backup_schedules')
        .update({ enabled, status: enabled ? 'active' : 'paused' })
        .eq('id', scheduleId);

      if (error) throw error;

      await loadSchedules();
    } catch (error) {
      console.error('Failed to toggle backup schedule:', error);
    }
  };

  const createFromTemplate = (template: BackupTemplate) => {
    const newSchedule: BackupSchedule = {
      id: 'new',
      ...template.schedule,
      name: template.name,
      description: template.description,
      enabled: true,
      status: 'active',
      notifications: {
        onSuccess: false,
        onFailure: true,
        onWarning: true,
        email: [],
        sms: [],
      },
      exclusions: {
        weekends: false,
        holidays: true,
        maintenanceWindows: [],
      },
    } as BackupSchedule;

    setEditingSchedule(newSchedule);
    setIsCreating(true);
    setActiveTab('create');
  };

  const createCustomSchedule = () => {
    const newSchedule: BackupSchedule = {
      id: 'new',
      name: 'Custom Backup Schedule',
      description: '',
      enabled: true,
      scheduleType: 'daily',
      frequency: '0 2 * * *',
      dataTypes: [],
      retentionDays: 30,
      priority: 'normal',
      weddingAware: false,
      preweddingDays: 7,
      postweddingDays: 3,
      notifications: {
        onSuccess: false,
        onFailure: true,
        onWarning: true,
        email: [],
        sms: [],
      },
      exclusions: {
        weekends: false,
        holidays: false,
        maintenanceWindows: [],
      },
      status: 'active',
    };

    setEditingSchedule(newSchedule);
    setIsCreating(true);
    setActiveTab('create');
  };

  const getScheduleStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'paused':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'disabled':
        return <Shield className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getScheduleTypeLabel = (type: string) => {
    const labels = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      wedding_adaptive: 'Wedding-Adaptive',
      custom: 'Custom',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getDataTypeIcon = (type: string) => {
    const icons = {
      photos: Camera,
      client_data: Users,
      contracts: FileText,
      guest_lists: Users,
      timelines: Calendar,
      designs: Heart,
      vendor_data: MapPin,
    };
    const IconComponent = icons[type as keyof typeof icons] || FileText;
    return <IconComponent className="h-4 w-4" />;
  };

  const formatFrequency = (frequency: string, scheduleType: string): string => {
    if (scheduleType === 'wedding_adaptive') {
      return 'Adaptive based on wedding dates';
    }

    // Basic cron translation - in production, use a proper cron parser
    const cronParts = frequency.split(' ');
    if (cronParts.length === 5) {
      const [minute, hour, day, month, weekday] = cronParts;

      if (day === '*' && month === '*' && weekday === '*') {
        return `Daily at ${hour}:${minute.padStart(2, '0')}`;
      }
      if (day === '*' && month === '*' && weekday !== '*') {
        const weekdays = [
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ];
        return `Weekly on ${weekdays[parseInt(weekday)]} at ${hour}:${minute.padStart(2, '0')}`;
      }
    }

    return frequency;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            Loading backup schedules...
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
          <h1 className="text-3xl font-bold">Backup Scheduler</h1>
          <p className="text-muted-foreground">
            Configure automated backup schedules with wedding-specific
            intelligence
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={() => loadData()}>
            <Settings className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={createCustomSchedule}>
            <Plus className="h-4 w-4 mr-2" />
            Create Schedule
          </Button>
        </div>
      </div>

      {/* Wedding Context Alert */}
      {upcomingWeddings.filter(
        (w) => w.status === 'today' || w.status === 'this_week',
      ).length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Wedding Periods Detected</AlertTitle>
          <AlertDescription>
            <div className="mt-2">
              <p className="mb-2">
                Wedding-adaptive schedules will automatically increase backup
                frequency:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {upcomingWeddings
                  .filter(
                    (w) => w.status === 'today' || w.status === 'this_week',
                  )
                  .map((wedding) => (
                    <div
                      key={wedding.id}
                      className="flex items-center justify-between p-2 bg-white rounded"
                    >
                      <span className="font-medium">{wedding.coupleName}</span>
                      <Badge
                        variant={
                          wedding.status === 'today'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {wedding.status === 'today'
                          ? 'TODAY'
                          : `${wedding.daysUntil} days`}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedules">Active Schedules</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="create">Create/Edit</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        {/* Active Schedules Tab */}
        <TabsContent value="schedules" className="space-y-6">
          {schedules.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Backup Schedules
                </h3>
                <p className="text-gray-600 mb-4">
                  Create your first backup schedule to protect your wedding data
                  automatically
                </p>
                <Button onClick={createCustomSchedule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Schedule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {schedules.map((schedule) => (
                <Card
                  key={schedule.id}
                  className={schedule.enabled ? '' : 'opacity-60'}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getScheduleStatusIcon(schedule.status)}
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {schedule.name}
                            <Badge
                              variant={
                                schedule.priority === 'critical'
                                  ? 'destructive'
                                  : schedule.priority === 'high'
                                    ? 'default'
                                    : 'secondary'
                              }
                            >
                              {schedule.priority.toUpperCase()}
                            </Badge>
                            {schedule.weddingAware && (
                              <Badge
                                variant="outline"
                                className="bg-pink-50 text-pink-700"
                              >
                                <Heart className="h-3 w-3 mr-1" />
                                Wedding-Aware
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription>
                            {schedule.description}
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={schedule.enabled}
                          onCheckedChange={(enabled) =>
                            toggleSchedule(schedule.id, enabled)
                          }
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingSchedule(schedule);
                            setActiveTab('create');
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSchedule(schedule.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Schedule Details */}
                      <div>
                        <h4 className="font-medium text-sm text-gray-900 mb-2">
                          Schedule
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>
                              {getScheduleTypeLabel(schedule.scheduleType)}
                            </span>
                          </div>
                          <div className="text-gray-600">
                            {formatFrequency(
                              schedule.frequency,
                              schedule.scheduleType,
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-gray-400" />
                            <span>Keep for {schedule.retentionDays} days</span>
                          </div>
                        </div>
                      </div>

                      {/* Data Types */}
                      <div>
                        <h4 className="font-medium text-sm text-gray-900 mb-2">
                          Data Types
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {schedule.dataTypes.map((type) => (
                            <div
                              key={type}
                              className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
                            >
                              {getDataTypeIcon(type)}
                              <span className="capitalize">
                                {type.replace('_', ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Wedding Adaptive Settings */}
                      {schedule.weddingAware && (
                        <div>
                          <h4 className="font-medium text-sm text-gray-900 mb-2">
                            Wedding Intelligence
                          </h4>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div>
                              Pre-wedding: {schedule.preweddingDays} days
                            </div>
                            <div>
                              Post-wedding: {schedule.postweddingDays} days
                            </div>
                            {schedule.adaptiveSettings && (
                              <div className="text-xs text-gray-500 mt-2">
                                <div>
                                  Normal:{' '}
                                  {formatFrequency(
                                    schedule.adaptiveSettings.normalFrequency,
                                    'custom',
                                  )}
                                </div>
                                <div>
                                  Pre-wedding:{' '}
                                  {formatFrequency(
                                    schedule.adaptiveSettings
                                      .preweddingFrequency,
                                    'custom',
                                  )}
                                </div>
                                {schedule.adaptiveSettings
                                  .weddingDayFrequency && (
                                  <div>
                                    Wedding day:{' '}
                                    {formatFrequency(
                                      schedule.adaptiveSettings
                                        .weddingDayFrequency,
                                      'custom',
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Next Run Info */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          {schedule.lastRun && (
                            <span className="text-gray-600">
                              Last run:{' '}
                              {format(
                                new Date(schedule.lastRun),
                                'MMM dd, HH:mm',
                              )}
                            </span>
                          )}
                          {schedule.nextRun && (
                            <span className="text-gray-600">
                              Next run:{' '}
                              {format(
                                new Date(schedule.nextRun),
                                'MMM dd, HH:mm',
                              )}
                            </span>
                          )}
                        </div>

                        {schedule.notifications.onFailure && (
                          <div className="flex items-center gap-1 text-blue-600">
                            <Info className="h-4 w-4" />
                            <span>Alerts enabled</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {template.name}
                    <Badge variant="outline">{template.vendorType}</Badge>
                  </CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium">
                        Schedule Type:
                      </span>
                      <span className="ml-2 text-sm text-gray-600">
                        {getScheduleTypeLabel(
                          template.schedule.scheduleType || 'daily',
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="text-sm font-medium">Data Types:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(template.schedule.dataTypes || []).map((type) => (
                          <Badge
                            key={type}
                            variant="secondary"
                            className="text-xs"
                          >
                            {type.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {template.schedule.weddingAware && (
                      <div className="flex items-center gap-2 text-sm text-pink-600">
                        <Heart className="h-4 w-4" />
                        <span>Wedding-aware scheduling</span>
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full mt-4"
                    onClick={() => createFromTemplate(template)}
                  >
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Create/Edit Tab */}
        <TabsContent value="create" className="space-y-6">
          {editingSchedule ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {isCreating
                    ? 'Create Backup Schedule'
                    : 'Edit Backup Schedule'}
                </CardTitle>
                <CardDescription>
                  Configure automated backup settings for your wedding data
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Basic Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Schedule Name</Label>
                    <Input
                      id="name"
                      value={editingSchedule.name}
                      onChange={(e) =>
                        setEditingSchedule({
                          ...editingSchedule,
                          name: e.target.value,
                        })
                      }
                      placeholder="e.g., Wedding Photography Backup"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority Level</Label>
                    <Select
                      value={editingSchedule.priority}
                      onValueChange={(priority: any) =>
                        setEditingSchedule({
                          ...editingSchedule,
                          priority,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editingSchedule.description}
                    onChange={(e) =>
                      setEditingSchedule({
                        ...editingSchedule,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe what this backup schedule covers..."
                    rows={3}
                  />
                </div>

                {/* Schedule Type */}
                <div className="space-y-4">
                  <Label>Schedule Type</Label>
                  <Select
                    value={editingSchedule.scheduleType}
                    onValueChange={(scheduleType: any) =>
                      setEditingSchedule({
                        ...editingSchedule,
                        scheduleType,
                        frequency:
                          scheduleType === 'daily'
                            ? '0 2 * * *'
                            : scheduleType === 'weekly'
                              ? '0 2 * * 0'
                              : scheduleType === 'monthly'
                                ? '0 2 1 * *'
                                : editingSchedule.frequency,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="wedding_adaptive">
                        Wedding-Adaptive
                      </SelectItem>
                      <SelectItem value="custom">Custom (Cron)</SelectItem>
                    </SelectContent>
                  </Select>

                  {editingSchedule.scheduleType === 'custom' && (
                    <div className="space-y-2">
                      <Label htmlFor="frequency">Cron Expression</Label>
                      <Input
                        id="frequency"
                        value={editingSchedule.frequency}
                        onChange={(e) =>
                          setEditingSchedule({
                            ...editingSchedule,
                            frequency: e.target.value,
                          })
                        }
                        placeholder="0 2 * * * (daily at 2 AM)"
                      />
                      <p className="text-xs text-gray-500">
                        Format: minute hour day month weekday
                      </p>
                    </div>
                  )}
                </div>

                {/* Wedding-Aware Settings */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="wedding-aware"
                      checked={editingSchedule.weddingAware}
                      onCheckedChange={(weddingAware) =>
                        setEditingSchedule({
                          ...editingSchedule,
                          weddingAware,
                        })
                      }
                    />
                    <Label
                      htmlFor="wedding-aware"
                      className="flex items-center gap-2"
                    >
                      <Heart className="h-4 w-4 text-pink-500" />
                      Wedding-Aware Scheduling
                    </Label>
                  </div>

                  {editingSchedule.weddingAware && (
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <div className="space-y-2">
                        <Label htmlFor="prewedding-days">
                          Pre-wedding Days
                        </Label>
                        <Input
                          id="prewedding-days"
                          type="number"
                          value={editingSchedule.preweddingDays}
                          onChange={(e) =>
                            setEditingSchedule({
                              ...editingSchedule,
                              preweddingDays: parseInt(e.target.value) || 7,
                            })
                          }
                          min="1"
                          max="30"
                        />
                        <p className="text-xs text-gray-500">
                          Days before wedding to increase backup frequency
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="postwedding-days">
                          Post-wedding Days
                        </Label>
                        <Input
                          id="postwedding-days"
                          type="number"
                          value={editingSchedule.postweddingDays}
                          onChange={(e) =>
                            setEditingSchedule({
                              ...editingSchedule,
                              postweddingDays: parseInt(e.target.value) || 3,
                            })
                          }
                          min="1"
                          max="14"
                        />
                        <p className="text-xs text-gray-500">
                          Days after wedding to maintain high frequency
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Data Types */}
                <div className="space-y-4">
                  <Label>Data Types to Backup</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      'photos',
                      'client_data',
                      'contracts',
                      'guest_lists',
                      'timelines',
                      'designs',
                      'vendor_data',
                    ].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={type}
                          checked={editingSchedule.dataTypes.includes(type)}
                          onChange={(e) => {
                            const newDataTypes = e.target.checked
                              ? [...editingSchedule.dataTypes, type]
                              : editingSchedule.dataTypes.filter(
                                  (t) => t !== type,
                                );
                            setEditingSchedule({
                              ...editingSchedule,
                              dataTypes: newDataTypes,
                            });
                          }}
                          className="rounded"
                        />
                        <Label
                          htmlFor={type}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          {getDataTypeIcon(type)}
                          <span className="text-sm capitalize">
                            {type.replace('_', ' ')}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Retention */}
                <div className="space-y-2">
                  <Label htmlFor="retention">Retention Period (Days)</Label>
                  <Input
                    id="retention"
                    type="number"
                    value={editingSchedule.retentionDays}
                    onChange={(e) =>
                      setEditingSchedule({
                        ...editingSchedule,
                        retentionDays: parseInt(e.target.value) || 30,
                      })
                    }
                    min="1"
                    max="2555" // 7 years
                  />
                  <p className="text-xs text-gray-500">
                    How long to keep backup copies (recommended: 365 days for
                    photos)
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-3 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingSchedule(null);
                      setIsCreating(false);
                      setActiveTab('schedules');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => saveSchedule(editingSchedule)}>
                    <Save className="h-4 w-4 mr-2" />
                    {isCreating ? 'Create Schedule' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Schedule Selected
                </h3>
                <p className="text-gray-600 mb-4">
                  Select a schedule from the Active Schedules tab or create a
                  new one
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Active Schedules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {
                    schedules.filter((s) => s.enabled && s.status === 'active')
                      .length
                  }
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Running automatically
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="h-5 w-5 text-pink-500" />
                  Wedding-Aware
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-pink-600">
                  {schedules.filter((s) => s.weddingAware).length}
                </div>
                <p className="text-sm text-gray-600 mt-1">Adaptive schedules</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Need Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {schedules.filter((s) => s.status === 'failed').length}
                </div>
                <p className="text-sm text-gray-600 mt-1">Failed schedules</p>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Wedding Impact */}
          {upcomingWeddings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Wedding Impact
                </CardTitle>
                <CardDescription>
                  How your backup schedules will adapt to upcoming weddings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingWeddings.slice(0, 5).map((wedding) => (
                    <div
                      key={wedding.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{wedding.coupleName}</p>
                        <p className="text-sm text-gray-600">
                          {format(
                            new Date(wedding.weddingDate),
                            'MMM dd, yyyy',
                          )}{' '}
                          ({wedding.daysUntil} days)
                        </p>
                      </div>

                      <div className="text-right">
                        <Badge
                          variant={
                            wedding.backupPriority === 'critical'
                              ? 'destructive'
                              : wedding.backupPriority === 'high'
                                ? 'default'
                                : 'secondary'
                          }
                        >
                          {wedding.backupPriority.toUpperCase()}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {schedules.filter((s) => s.weddingAware).length}{' '}
                          schedules will adapt
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BackupScheduler;
