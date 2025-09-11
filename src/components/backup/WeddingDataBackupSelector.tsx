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
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import {
  Calendar as CalendarIcon,
  Heart,
  Camera,
  FileText,
  Users,
  MapPin,
  Clock,
  Shield,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Star,
  Filter,
  Search,
} from 'lucide-react';
import {
  format,
  isAfter,
  isBefore,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
} from 'date-fns';

/**
 * WeddingDataBackupSelector Component
 *
 * Wedding-specific data backup selection interface for vendors.
 * Allows targeted backup selection based on wedding timelines,
 * data criticality, and vendor-specific workflows.
 */

interface WeddingData {
  id: string;
  coupleName: string;
  weddingDate: string;
  status: 'planning' | 'this_week' | 'today' | 'completed';
  venue: string;
  photographer: string;
  backupStatus: 'protected' | 'partial' | 'at_risk' | 'none';
  dataTypes: WeddingDataType[];
  lastBackup?: string;
  priority: 'critical' | 'high' | 'normal';
  estimatedSize: number;
}

interface WeddingDataType {
  type:
    | 'photos'
    | 'contracts'
    | 'guest_lists'
    | 'timeline'
    | 'vendor_notes'
    | 'designs';
  label: string;
  size: number;
  lastModified: string;
  criticality: 'critical' | 'important' | 'normal';
  selected: boolean;
  vendor: string;
  files: number;
}

interface BackupRecommendation {
  weddingId: string;
  reason: string;
  urgency: 'immediate' | 'high' | 'medium';
  dataTypes: string[];
  estimatedTime: string;
}

const WeddingDataBackupSelector: React.FC = () => {
  const [weddings, setWeddings] = useState<WeddingData[]>([]);
  const [selectedWeddings, setSelectedWeddings] = useState<Set<string>>(
    new Set(),
  );
  const [selectedDataTypes, setSelectedDataTypes] = useState<Set<string>>(
    new Set(),
  );
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendations, setRecommendations] = useState<
    BackupRecommendation[]
  >([]);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline');

  const supabase = createClient();

  useEffect(() => {
    loadWeddingData();
    generateRecommendations();
  }, []);

  const loadWeddingData = async () => {
    try {
      const { data, error } = await supabase
        .from('weddings')
        .select(
          `
          id,
          couple_name,
          wedding_date,
          venue,
          photographer,
          status,
          backup_status,
          last_backup,
          estimated_data_size
        `,
        )
        .order('wedding_date', { ascending: true });

      if (error) throw error;

      const weddingData: WeddingData[] = (data || []).map((wedding) => {
        const weddingDate = new Date(wedding.wedding_date);
        const today = new Date();
        const daysUntil = Math.ceil(
          (weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        let status: WeddingData['status'] = 'planning';
        let priority: WeddingData['priority'] = 'normal';

        if (daysUntil === 0) {
          status = 'today';
          priority = 'critical';
        } else if (daysUntil <= 7 && daysUntil > 0) {
          status = 'this_week';
          priority = 'critical';
        } else if (daysUntil < 0) {
          status = 'completed';
          priority = 'normal';
        } else if (daysUntil <= 30) {
          priority = 'high';
        }

        // Mock data types for each wedding
        const dataTypes: WeddingDataType[] = [
          {
            type: 'photos',
            label: 'Wedding Photos',
            size: Math.random() * 5000000000, // 0-5GB
            lastModified: wedding.last_backup || new Date().toISOString(),
            criticality: 'critical',
            selected: false,
            vendor: wedding.photographer || 'Unknown',
            files: Math.floor(Math.random() * 500) + 100,
          },
          {
            type: 'contracts',
            label: 'Contracts & Agreements',
            size: Math.random() * 50000000, // 0-50MB
            lastModified: wedding.last_backup || new Date().toISOString(),
            criticality: 'important',
            selected: false,
            vendor: 'WedSync Admin',
            files: Math.floor(Math.random() * 10) + 5,
          },
          {
            type: 'guest_lists',
            label: 'Guest Lists & RSVP',
            size: Math.random() * 10000000, // 0-10MB
            lastModified: wedding.last_backup || new Date().toISOString(),
            criticality: 'important',
            selected: false,
            vendor: wedding.venue || 'Venue Team',
            files: Math.floor(Math.random() * 5) + 1,
          },
          {
            type: 'timeline',
            label: 'Wedding Timeline',
            size: Math.random() * 5000000, // 0-5MB
            lastModified: wedding.last_backup || new Date().toISOString(),
            criticality: 'normal',
            selected: false,
            vendor: 'Wedding Planner',
            files: Math.floor(Math.random() * 3) + 1,
          },
        ];

        return {
          id: wedding.id,
          coupleName: wedding.couple_name,
          weddingDate: wedding.wedding_date,
          status,
          venue: wedding.venue || 'TBD',
          photographer: wedding.photographer || 'TBD',
          backupStatus: wedding.backup_status || 'none',
          dataTypes,
          lastBackup: wedding.last_backup,
          priority,
          estimatedSize:
            wedding.estimated_data_size ||
            dataTypes.reduce((sum, dt) => sum + dt.size, 0),
        };
      });

      setWeddings(weddingData);
    } catch (error) {
      console.error('Failed to load wedding data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = () => {
    const recs: BackupRecommendation[] = [];

    weddings.forEach((wedding) => {
      const weddingDate = new Date(wedding.weddingDate);
      const today = new Date();
      const daysUntil = Math.ceil(
        (weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (
        daysUntil <= 7 &&
        daysUntil >= 0 &&
        wedding.backupStatus !== 'protected'
      ) {
        recs.push({
          weddingId: wedding.id,
          reason: `Wedding in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} - critical backup needed`,
          urgency: daysUntil <= 1 ? 'immediate' : 'high',
          dataTypes: ['photos', 'contracts', 'guest_lists'],
          estimatedTime: '15-30 minutes',
        });
      }

      if (!wedding.lastBackup && wedding.status !== 'completed') {
        recs.push({
          weddingId: wedding.id,
          reason: 'No backup history found for active wedding',
          urgency: 'high',
          dataTypes: ['photos', 'contracts'],
          estimatedTime: '20-45 minutes',
        });
      }

      const lastBackup = wedding.lastBackup
        ? new Date(wedding.lastBackup)
        : null;
      if (
        lastBackup &&
        today.getTime() - lastBackup.getTime() > 7 * 24 * 60 * 60 * 1000
      ) {
        recs.push({
          weddingId: wedding.id,
          reason: 'Backup older than 7 days',
          urgency: 'medium',
          dataTypes: ['photos'],
          estimatedTime: '10-20 minutes',
        });
      }
    });

    setRecommendations(recs.slice(0, 10)); // Limit to top 10 recommendations
  };

  const toggleWeddingSelection = (weddingId: string) => {
    const newSelected = new Set(selectedWeddings);
    if (newSelected.has(weddingId)) {
      newSelected.delete(weddingId);

      // Remove all data types for this wedding
      const wedding = weddings.find((w) => w.id === weddingId);
      if (wedding) {
        wedding.dataTypes.forEach((dt) => {
          selectedDataTypes.delete(`${weddingId}-${dt.type}`);
        });
        setSelectedDataTypes(new Set(selectedDataTypes));
      }
    } else {
      newSelected.add(weddingId);

      // Auto-select critical data types
      const wedding = weddings.find((w) => w.id === weddingId);
      if (wedding) {
        const criticalTypes = wedding.dataTypes.filter(
          (dt) => dt.criticality === 'critical',
        );
        criticalTypes.forEach((dt) => {
          selectedDataTypes.add(`${weddingId}-${dt.type}`);
        });
        setSelectedDataTypes(new Set(selectedDataTypes));
      }
    }
    setSelectedWeddings(newSelected);
  };

  const toggleDataTypeSelection = (weddingId: string, dataType: string) => {
    const key = `${weddingId}-${dataType}`;
    const newSelected = new Set(selectedDataTypes);

    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
      // Auto-select the wedding if not already selected
      setSelectedWeddings((prev) => new Set([...prev, weddingId]));
    }

    setSelectedDataTypes(newSelected);
  };

  const selectAllRecommended = () => {
    recommendations.forEach((rec) => {
      setSelectedWeddings((prev) => new Set([...prev, rec.weddingId]));
      rec.dataTypes.forEach((dataType) => {
        setSelectedDataTypes(
          (prev) => new Set([...prev, `${rec.weddingId}-${dataType}`]),
        );
      });
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'today':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'this_week':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <CalendarIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getDataTypeIcon = (type: string) => {
    const icons = {
      photos: Camera,
      contracts: FileText,
      guest_lists: Users,
      timeline: CalendarIcon,
      vendor_notes: MapPin,
      designs: Heart,
    };
    const IconComponent = icons[type as keyof typeof icons] || FileText;
    return <IconComponent className="h-4 w-4" />;
  };

  const getBackupStatusColor = (status: string) => {
    switch (status) {
      case 'protected':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'at_risk':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'none':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const calculateSelectionStats = () => {
    let totalSize = 0;
    let totalFiles = 0;
    let criticalItems = 0;

    selectedDataTypes.forEach((key) => {
      const [weddingId, dataType] = key.split('-');
      const wedding = weddings.find((w) => w.id === weddingId);
      const dataTypeObj = wedding?.dataTypes.find((dt) => dt.type === dataType);

      if (dataTypeObj) {
        totalSize += dataTypeObj.size;
        totalFiles += dataTypeObj.files;
        if (dataTypeObj.criticality === 'critical') {
          criticalItems++;
        }
      }
    });

    return { totalSize, totalFiles, criticalItems };
  };

  const filteredWeddings = weddings.filter((wedding) => {
    if (filterStatus !== 'all' && wedding.status !== filterStatus) return false;
    if (filterPriority !== 'all' && wedding.priority !== filterPriority)
      return false;
    if (
      searchQuery &&
      !wedding.coupleName.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const stats = calculateSelectionStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Heart className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            Loading wedding data...
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
          <h1 className="text-3xl font-bold">Wedding Data Backup</h1>
          <p className="text-muted-foreground">
            Select specific wedding data for targeted backup protection
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={loadWeddingData}>
            <Shield className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => {
              /* Start backup */
            }}
            disabled={selectedWeddings.size === 0}
          >
            <Upload className="h-4 w-4 mr-2" />
            Start Backup ({selectedWeddings.size})
          </Button>
        </div>
      </div>

      {/* Selection Stats */}
      {selectedWeddings.size > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-600">
                  {selectedWeddings.size}
                </div>
                <div className="text-sm text-gray-600">Weddings Selected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatBytes(stats.totalSize)}
                </div>
                <div className="text-sm text-gray-600">Total Data Size</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.totalFiles.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Files to Backup</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {stats.criticalItems}
                </div>
                <div className="text-sm text-gray-600">Critical Items</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-orange-800 flex items-center gap-2">
                <Star className="h-5 w-5" />
                Backup Recommendations
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllRecommended}
                className="text-orange-700 border-orange-300 hover:bg-orange-100"
              >
                Select All Recommended
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.slice(0, 3).map((rec, index) => {
                const wedding = weddings.find((w) => w.id === rec.weddingId);
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white rounded border"
                  >
                    <div>
                      <p className="font-medium">{wedding?.coupleName}</p>
                      <p className="text-sm text-gray-600">{rec.reason}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={
                            rec.urgency === 'immediate'
                              ? 'destructive'
                              : rec.urgency === 'high'
                                ? 'default'
                                : 'secondary'
                          }
                        >
                          {rec.urgency.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          ETA: {rec.estimatedTime}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => toggleWeddingSelection(rec.weddingId)}
                      variant={
                        selectedWeddings.has(rec.weddingId)
                          ? 'default'
                          : 'outline'
                      }
                    >
                      {selectedWeddings.has(rec.weddingId)
                        ? 'Selected'
                        : 'Select'}
                    </Button>
                  </div>
                );
              })}
              {recommendations.length > 3 && (
                <p className="text-sm text-gray-600 text-center">
                  +{recommendations.length - 3} more recommendations
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Interface */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="data-types">By Data Type</TabsTrigger>
        </TabsList>

        {/* Timeline View */}
        <TabsContent value="timeline" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <input
                    type="text"
                    placeholder="Search couples..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="all">All Status</option>
                    <option value="today">Today</option>
                    <option value="this_week">This Week</option>
                    <option value="planning">Planning</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="all">All Priority</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                  </select>
                </div>
                <div className="text-sm text-gray-600 flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  {filteredWeddings.length} weddings
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wedding List */}
          <div className="space-y-4">
            {filteredWeddings.map((wedding) => (
              <Card
                key={wedding.id}
                className={`transition-all ${selectedWeddings.has(wedding.id) ? 'ring-2 ring-pink-200 bg-pink-50' : ''}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={selectedWeddings.has(wedding.id)}
                        onCheckedChange={() =>
                          toggleWeddingSelection(wedding.id)
                        }
                      />
                      {getStatusIcon(wedding.status)}
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {wedding.coupleName}
                          <Badge
                            variant={
                              wedding.priority === 'critical'
                                ? 'destructive'
                                : wedding.priority === 'high'
                                  ? 'default'
                                  : 'secondary'
                            }
                          >
                            {wedding.priority.toUpperCase()}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {format(
                            new Date(wedding.weddingDate),
                            'EEEE, MMMM dd, yyyy',
                          )}{' '}
                          • {wedding.venue}
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge
                        className={getBackupStatusColor(wedding.backupStatus)}
                      >
                        {wedding.backupStatus.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {wedding.lastBackup && (
                        <span className="text-sm text-gray-500">
                          Last: {format(new Date(wedding.lastBackup), 'MMM dd')}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {selectedWeddings.has(wedding.id) && (
                  <CardContent>
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">
                        Select Data Types:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {wedding.dataTypes.map((dataType) => (
                          <div
                            key={dataType.type}
                            className="flex items-center justify-between p-3 border rounded"
                          >
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={selectedDataTypes.has(
                                  `${wedding.id}-${dataType.type}`,
                                )}
                                onCheckedChange={() =>
                                  toggleDataTypeSelection(
                                    wedding.id,
                                    dataType.type,
                                  )
                                }
                              />
                              {getDataTypeIcon(dataType.type)}
                              <div>
                                <div className="font-medium text-sm">
                                  {dataType.label}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatBytes(dataType.size)} •{' '}
                                  {dataType.files} files
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <Badge
                                variant={
                                  dataType.criticality === 'critical'
                                    ? 'destructive'
                                    : 'outline'
                                }
                              >
                                {dataType.criticality}
                              </Badge>
                              <div className="text-xs text-gray-500 mt-1">
                                {dataType.vendor}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Calendar View */}
        <TabsContent value="calendar" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Wedding Calendar</CardTitle>
                <CardDescription>
                  Select dates to view weddings and backup status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={calendarDate}
                  onSelect={(date) => date && setCalendarDate(date)}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Weddings on {format(calendarDate, 'MMMM dd, yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weddings.filter(
                  (w) =>
                    format(new Date(w.weddingDate), 'yyyy-MM-dd') ===
                    format(calendarDate, 'yyyy-MM-dd'),
                ).length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      No weddings scheduled for this date
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {weddings
                      .filter(
                        (w) =>
                          format(new Date(w.weddingDate), 'yyyy-MM-dd') ===
                          format(calendarDate, 'yyyy-MM-dd'),
                      )
                      .map((wedding) => (
                        <div
                          key={wedding.id}
                          className="p-3 border rounded flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium">{wedding.coupleName}</p>
                            <p className="text-sm text-gray-600">
                              {wedding.venue}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => toggleWeddingSelection(wedding.id)}
                            variant={
                              selectedWeddings.has(wedding.id)
                                ? 'default'
                                : 'outline'
                            }
                          >
                            {selectedWeddings.has(wedding.id)
                              ? 'Selected'
                              : 'Select'}
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Data Types View */}
        <TabsContent value="data-types" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {['photos', 'contracts', 'guest_lists', 'timeline'].map((type) => {
              const relevantWeddings = weddings.filter((w) =>
                w.dataTypes.some((dt) => dt.type === type),
              );
              const totalSize = relevantWeddings.reduce((sum, w) => {
                const dt = w.dataTypes.find((dt) => dt.type === type);
                return sum + (dt?.size || 0);
              }, 0);

              return (
                <Card key={type}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getDataTypeIcon(type)}
                      {type.replace('_', ' ').toUpperCase()}
                    </CardTitle>
                    <CardDescription>
                      {relevantWeddings.length} weddings •{' '}
                      {formatBytes(totalSize)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {relevantWeddings.slice(0, 5).map((wedding) => {
                        const dataType = wedding.dataTypes.find(
                          (dt) => dt.type === type,
                        );
                        const isSelected = selectedDataTypes.has(
                          `${wedding.id}-${type}`,
                        );

                        return (
                          <div
                            key={wedding.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() =>
                                  toggleDataTypeSelection(wedding.id, type)
                                }
                              />
                              <span>{wedding.coupleName}</span>
                            </div>
                            <span className="text-gray-500">
                              {dataType && formatBytes(dataType.size)}
                            </span>
                          </div>
                        );
                      })}
                      {relevantWeddings.length > 5 && (
                        <p className="text-xs text-gray-500">
                          +{relevantWeddings.length - 5} more weddings
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WeddingDataBackupSelector;
