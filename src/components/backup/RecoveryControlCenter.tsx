/**
 * WS-258: Backup Strategy Implementation System - Recovery Control Center
 * Critical P1 system for protecting irreplaceable wedding data
 * Team A - React Component Development
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Database,
  Clock,
  Calendar as CalendarIcon,
  Search,
  Download,
  Eye,
  CheckCircle,
  AlertTriangle,
  FileText,
  Camera,
  Users,
  HardDrive,
  Cloud,
  Server,
  RefreshCw,
  PlayCircle,
  StopCircle,
  RotateCcw,
  Filter,
  ArrowRight,
  Zap,
  Shield,
} from 'lucide-react';
import {
  RecoveryManagementCenterProps,
  RecoveryPoint,
  RecoveryOptions,
  DataType,
  RecoveryPriority,
} from './types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// Helper function to get data type icon
function getDataTypeIcon(dataType: DataType) {
  switch (dataType) {
    case 'photos':
      return <Camera className="w-4 h-4" />;
    case 'client-data':
      return <Users className="w-4 h-4" />;
    case 'business-files':
      return <FileText className="w-4 h-4" />;
    case 'database':
      return <Database className="w-4 h-4" />;
    case 'system-config':
      return <HardDrive className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
}

// Helper function to get priority color
function getPriorityColor(priority: RecoveryPriority): string {
  switch (priority) {
    case 'emergency':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'critical':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'high':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'medium':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'low':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function RecoveryControlCenter({
  recoveryPoints,
  onRecoveryInitiate,
  emergencyMode = false,
}: RecoveryManagementCenterProps) {
  const [selectedRecoveryPoint, setSelectedRecoveryPoint] =
    useState<RecoveryPoint | null>(null);
  const [recoveryOptions, setRecoveryOptions] = useState<RecoveryOptions>({
    recovery_type: 'full-system',
    target_location: '/recovery/restore',
    overwrite_existing: false,
    verify_integrity: true,
    notify_on_completion: true,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterDataType, setFilterDataType] = useState<DataType | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<
    RecoveryPriority | 'all'
  >('all');
  const [showCalendar, setShowCalendar] = useState(false);
  const [activeRecoverySession, setActiveRecoverySession] = useState<any>(null);

  // Filter recovery points based on search and filters
  const filteredRecoveryPoints = recoveryPoints.filter((point) => {
    const matchesSearch =
      searchQuery === '' ||
      point.metadata.client_names?.some((name) =>
        name.toLowerCase().includes(searchQuery.toLowerCase()),
      ) ||
      point.metadata.venue_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      point.metadata.photographer_notes
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesDate =
      !selectedDate ||
      new Date(point.created_at).toDateString() === selectedDate.toDateString();

    const matchesDataType =
      filterDataType === 'all' || point.data_types.includes(filterDataType);

    const matchesPriority =
      filterPriority === 'all' || point.recovery_priority === filterPriority;

    return matchesSearch && matchesDate && matchesDataType && matchesPriority;
  });

  // Group recovery points by date for better organization
  const groupedRecoveryPoints = filteredRecoveryPoints.reduce(
    (groups, point) => {
      const date = new Date(point.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(point);
      return groups;
    },
    {} as Record<string, RecoveryPoint[]>,
  );

  const handleRecoveryInitiate = () => {
    if (!selectedRecoveryPoint) return;

    onRecoveryInitiate(selectedRecoveryPoint, recoveryOptions);

    // Simulate active recovery session
    setActiveRecoverySession({
      id: `recovery-${Date.now()}`,
      recovery_point_id: selectedRecoveryPoint.id,
      status: 'in-progress',
      progress: 0,
      start_time: new Date(),
      recovery_type: recoveryOptions.recovery_type,
    });
  };

  // Simulate recovery progress
  useEffect(() => {
    if (
      activeRecoverySession &&
      activeRecoverySession.status === 'in-progress'
    ) {
      const interval = setInterval(() => {
        setActiveRecoverySession((prev: any) => {
          if (!prev) return null;
          const newProgress = Math.min(prev.progress + Math.random() * 3, 100);
          return {
            ...prev,
            progress: newProgress,
            status: newProgress >= 100 ? 'completed' : 'in-progress',
          };
        });
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [activeRecoverySession]);

  return (
    <div className="space-y-6">
      {/* Recovery Control Header */}
      <Card
        className={
          emergencyMode ? 'border-red-600 bg-red-50 dark:bg-red-950/20' : ''
        }
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Recovery Control Center
            {emergencyMode && (
              <Badge variant="destructive" className="animate-pulse">
                EMERGENCY MODE
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Point-in-time recovery and granular data restoration for wedding
            data protection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {recoveryPoints.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Recovery Points
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {recoveryPoints.filter((p) => p.integrity_verified).length}
              </div>
              <div className="text-sm text-muted-foreground">Verified</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {
                  recoveryPoints.filter(
                    (p) =>
                      p.recovery_priority === 'emergency' ||
                      p.recovery_priority === 'critical',
                  ).length
                }
              </div>
              <div className="text-sm text-muted-foreground">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {recoveryPoints.filter((p) => p.wedding_event_id).length}
              </div>
              <div className="text-sm text-muted-foreground">
                Wedding-Linked
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Recovery Session */}
      {activeRecoverySession && (
        <Card className="border-blue-600 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw
                className={cn(
                  'w-5 h-5',
                  activeRecoverySession.status === 'in-progress' &&
                    'animate-spin',
                )}
              />
              Active Recovery Session
              <Badge variant="secondary" className="capitalize">
                {activeRecoverySession.status}
              </Badge>
            </CardTitle>
            <CardDescription>
              {activeRecoverySession.recovery_type
                .replace(/-/g, ' ')
                .replace(/\b\w/g, (l: string) => l.toUpperCase())}{' '}
              - Started {activeRecoverySession.start_time.toLocaleTimeString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Recovery Progress</span>
                <span className="text-sm text-muted-foreground">
                  {activeRecoverySession.progress.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={activeRecoverySession.progress}
                className="h-3"
              />
            </div>

            {activeRecoverySession.status === 'completed' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Recovery completed successfully! All data has been restored
                  and verified.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              {activeRecoverySession.status === 'in-progress' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveRecoverySession(null)}
                >
                  <StopCircle className="w-4 h-4 mr-1" />
                  Cancel Recovery
                </Button>
              )}

              {activeRecoverySession.status === 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveRecoverySession(null)}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Close Session
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recovery Options Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Recovery Configuration
          </CardTitle>
          <CardDescription>
            Configure recovery options and target settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="recovery-type">Recovery Type</Label>
                <Select
                  value={recoveryOptions.recovery_type}
                  onValueChange={(value: any) =>
                    setRecoveryOptions((prev) => ({
                      ...prev,
                      recovery_type: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recovery type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-system">
                      Full System Recovery
                    </SelectItem>
                    <SelectItem value="selective-files">
                      Selective File Recovery
                    </SelectItem>
                    <SelectItem value="database-only">Database Only</SelectItem>
                    <SelectItem value="wedding-specific">
                      Wedding-Specific Data
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="target-location">Target Location</Label>
                <Input
                  id="target-location"
                  value={recoveryOptions.target_location}
                  onChange={(e) =>
                    setRecoveryOptions((prev) => ({
                      ...prev,
                      target_location: e.target.value,
                    }))
                  }
                  placeholder="/recovery/restore"
                />
              </div>

              {selectedRecoveryPoint?.wedding_event_id && (
                <div>
                  <Label htmlFor="wedding-event-id">Wedding Event ID</Label>
                  <Input
                    id="wedding-event-id"
                    value={selectedRecoveryPoint.wedding_event_id}
                    onChange={(e) =>
                      setRecoveryOptions((prev) => ({
                        ...prev,
                        wedding_event_id: e.target.value,
                      }))
                    }
                    placeholder="Wedding event identifier"
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overwrite-existing"
                  checked={recoveryOptions.overwrite_existing}
                  onCheckedChange={(checked) =>
                    setRecoveryOptions((prev) => ({
                      ...prev,
                      overwrite_existing: checked as boolean,
                    }))
                  }
                />
                <Label htmlFor="overwrite-existing">
                  Overwrite Existing Files
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="verify-integrity"
                  checked={recoveryOptions.verify_integrity}
                  onCheckedChange={(checked) =>
                    setRecoveryOptions((prev) => ({
                      ...prev,
                      verify_integrity: checked as boolean,
                    }))
                  }
                />
                <Label htmlFor="verify-integrity">Verify Data Integrity</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notify-completion"
                  checked={recoveryOptions.notify_on_completion}
                  onCheckedChange={(checked) =>
                    setRecoveryOptions((prev) => ({
                      ...prev,
                      notify_on_completion: checked as boolean,
                    }))
                  }
                />
                <Label htmlFor="notify-completion">Notify on Completion</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="recovery-points" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recovery-points">Recovery Points</TabsTrigger>
          <TabsTrigger value="point-in-time">
            Point-in-Time Recovery
          </TabsTrigger>
          <TabsTrigger value="granular-recovery">Granular Recovery</TabsTrigger>
        </TabsList>

        {/* Recovery Points Browser */}
        <TabsContent value="recovery-points" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Browse Recovery Points</CardTitle>
              <CardDescription>
                Search and filter available recovery points for restoration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by client name, venue, or notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-[280px] justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? (
                        format(selectedDate, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date || null);
                        setShowCalendar(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Select
                  value={filterDataType}
                  onValueChange={(value: any) => setFilterDataType(value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Data Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Data Types</SelectItem>
                    <SelectItem value="photos">Photos</SelectItem>
                    <SelectItem value="client-data">Client Data</SelectItem>
                    <SelectItem value="business-files">
                      Business Files
                    </SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="system-config">System Config</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filterPriority}
                  onValueChange={(value: any) => setFilterPriority(value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                {(searchQuery ||
                  selectedDate ||
                  filterDataType !== 'all' ||
                  filterPriority !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedDate(null);
                      setFilterDataType('all');
                      setFilterPriority('all');
                    }}
                  >
                    <Filter className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recovery Points List */}
          <div className="space-y-6">
            {Object.keys(groupedRecoveryPoints).length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Recovery Points Found
                  </h3>
                  <p className="text-muted-foreground">
                    No recovery points match your current search criteria.
                  </p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(groupedRecoveryPoints).map(([date, points]) => (
                <Card key={date}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                      <Badge variant="outline">
                        {points.length} point{points.length !== 1 ? 's' : ''}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {points.map((point) => (
                        <div
                          key={point.id}
                          className={cn(
                            'border rounded-lg p-4 cursor-pointer transition-colors',
                            selectedRecoveryPoint?.id === point.id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                              : 'hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-950/50',
                            getPriorityColor(point.recovery_priority),
                          )}
                          onClick={() => setSelectedRecoveryPoint(point)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge
                                  variant={
                                    point.recovery_priority === 'emergency' ||
                                    point.recovery_priority === 'critical'
                                      ? 'destructive'
                                      : 'outline'
                                  }
                                  className="capitalize"
                                >
                                  {point.recovery_priority}
                                </Badge>

                                <div className="flex gap-1">
                                  {point.data_types.map((dataType) => (
                                    <div
                                      key={dataType}
                                      className="flex items-center gap-1"
                                    >
                                      {getDataTypeIcon(dataType)}
                                    </div>
                                  ))}
                                </div>

                                {point.integrity_verified ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                )}

                                {point.wedding_event_id && (
                                  <Badge variant="outline" className="text-xs">
                                    Wedding Event
                                  </Badge>
                                )}
                              </div>

                              <div className="space-y-1">
                                <div className="text-sm font-medium">
                                  Created:{' '}
                                  {new Date(
                                    point.created_at,
                                  ).toLocaleTimeString()}
                                </div>

                                <div className="text-sm text-muted-foreground">
                                  Size: {formatBytes(point.backup_size)}
                                </div>

                                {point.metadata.client_names &&
                                  point.metadata.client_names.length > 0 && (
                                    <div className="text-sm text-muted-foreground">
                                      <strong>Clients:</strong>{' '}
                                      {point.metadata.client_names.join(', ')}
                                    </div>
                                  )}

                                {point.metadata.venue_name && (
                                  <div className="text-sm text-muted-foreground">
                                    <strong>Venue:</strong>{' '}
                                    {point.metadata.venue_name}
                                  </div>
                                )}

                                {point.metadata.wedding_date && (
                                  <div className="text-sm text-muted-foreground">
                                    <strong>Wedding Date:</strong>{' '}
                                    {new Date(
                                      point.metadata.wedding_date,
                                    ).toLocaleDateString()}
                                  </div>
                                )}

                                {point.metadata.photographer_notes && (
                                  <div className="text-sm text-muted-foreground">
                                    <strong>Notes:</strong>{' '}
                                    {point.metadata.photographer_notes}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Preview recovery point
                                }}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Preview
                              </Button>

                              {selectedRecoveryPoint?.id === point.id && (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRecoveryInitiate();
                                  }}
                                  disabled={!!activeRecoverySession}
                                >
                                  <PlayCircle className="w-4 h-4 mr-1" />
                                  Recover
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Point-in-Time Recovery */}
        <TabsContent value="point-in-time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Point-in-Time Recovery
              </CardTitle>
              <CardDescription>
                Restore data to a specific point in time with calendar-based
                selection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Point-in-Time Recovery
                </h3>
                <p className="text-muted-foreground mb-4">
                  Select a specific date and time to restore your wedding data
                  to that exact point
                </p>
                <Button variant="outline">
                  <CalendarIcon className="w-4 h-4 mr-1" />
                  Select Recovery Time
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Granular Recovery */}
        <TabsContent value="granular-recovery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Granular File Recovery
              </CardTitle>
              <CardDescription>
                Recover specific files, folders, or data types with precision
                control
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Granular Recovery Options
                </h3>
                <p className="text-muted-foreground mb-4">
                  Precisely recover individual files, specific wedding events,
                  or custom data selections
                </p>
                <Button variant="outline">
                  <Search className="w-4 h-4 mr-1" />
                  Browse Recovery Files
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
