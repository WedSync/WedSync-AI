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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Camera,
  MapPin,
  Heart,
  Users,
  FileText,
  Calendar,
  Settings,
  Upload,
  Download,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  Archive,
  Trash2,
  RefreshCw,
  Star,
  Eye,
} from 'lucide-react';
import { format, subDays } from 'date-fns';

/**
 * VendorDataBackupManager Component
 *
 * Vendor-specific backup management for different wedding
 * service providers with tailored workflows and data types.
 */

interface VendorData {
  id: string;
  vendorType:
    | 'photographer'
    | 'venue'
    | 'florist'
    | 'planner'
    | 'caterer'
    | 'dj';
  vendorName: string;
  activeWeddings: number;
  dataCategories: DataCategory[];
  totalSize: number;
  lastBackup: string;
  backupStatus: 'up_to_date' | 'pending' | 'outdated' | 'failed';
  retentionPolicy: string;
  specialRequirements: string[];
}

interface DataCategory {
  type: string;
  label: string;
  icon: string;
  size: number;
  fileCount: number;
  lastModified: string;
  criticality: 'critical' | 'important' | 'normal';
  retentionDays: number;
  autoBackup: boolean;
  backupFrequency: string;
  specificToWedding: boolean;
}

interface BackupTemplate {
  id: string;
  vendorType: string;
  name: string;
  description: string;
  categories: string[];
  schedule: string;
  retention: number;
  features: string[];
}

const VendorDataBackupManager: React.FC = () => {
  const [vendorData, setVendorData] = useState<VendorData[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [backupTemplates, setBackupTemplates] = useState<BackupTemplate[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadVendorData();
    loadBackupTemplates();
  }, []);

  const loadVendorData = async () => {
    try {
      // Mock vendor data - in production, load from database
      const mockData: VendorData[] = [
        {
          id: 'photographer_1',
          vendorType: 'photographer',
          vendorName: 'Emma Photography Studio',
          activeWeddings: 12,
          totalSize: 50000000000, // 50GB
          lastBackup: subDays(new Date(), 1).toISOString(),
          backupStatus: 'up_to_date',
          retentionPolicy: '2 years for RAW, 5 years for edited',
          specialRequirements: ['RAW file protection', 'Client gallery sync'],
          dataCategories: [
            {
              type: 'raw_photos',
              label: 'RAW Photo Files',
              icon: 'camera',
              size: 30000000000,
              fileCount: 15000,
              lastModified: new Date().toISOString(),
              criticality: 'critical',
              retentionDays: 730,
              autoBackup: true,
              backupFrequency: '6h',
              specificToWedding: true,
            },
            {
              type: 'edited_photos',
              label: 'Edited Photos',
              icon: 'camera',
              size: 15000000000,
              fileCount: 8000,
              lastModified: new Date().toISOString(),
              criticality: 'critical',
              retentionDays: 1825,
              autoBackup: true,
              backupFrequency: '12h',
              specificToWedding: true,
            },
            {
              type: 'client_galleries',
              label: 'Client Galleries',
              icon: 'star',
              size: 3000000000,
              fileCount: 2000,
              lastModified: subDays(new Date(), 2).toISOString(),
              criticality: 'important',
              retentionDays: 365,
              autoBackup: true,
              backupFrequency: '24h',
              specificToWedding: true,
            },
            {
              type: 'contracts',
              label: 'Photography Contracts',
              icon: 'file-text',
              size: 100000000,
              fileCount: 50,
              lastModified: subDays(new Date(), 5).toISOString(),
              criticality: 'important',
              retentionDays: 2555,
              autoBackup: true,
              backupFrequency: '24h',
              specificToWedding: false,
            },
          ],
        },
        {
          id: 'venue_1',
          vendorType: 'venue',
          vendorName: 'Grand Manor Events',
          activeWeddings: 8,
          totalSize: 5000000000, // 5GB
          lastBackup: subDays(new Date(), 1).toISOString(),
          backupStatus: 'up_to_date',
          retentionPolicy: '3 years for all venue data',
          specialRequirements: ['Floor plan versioning', 'Vendor coordination'],
          dataCategories: [
            {
              type: 'floor_plans',
              label: 'Floor Plans & Layouts',
              icon: 'map-pin',
              size: 500000000,
              fileCount: 200,
              lastModified: new Date().toISOString(),
              criticality: 'critical',
              retentionDays: 1095,
              autoBackup: true,
              backupFrequency: '24h',
              specificToWedding: true,
            },
            {
              type: 'vendor_schedules',
              label: 'Vendor Schedules',
              icon: 'calendar',
              size: 100000000,
              fileCount: 150,
              lastModified: subDays(new Date(), 1).toISOString(),
              criticality: 'critical',
              retentionDays: 365,
              autoBackup: true,
              backupFrequency: '6h',
              specificToWedding: true,
            },
            {
              type: 'setup_notes',
              label: 'Setup Instructions',
              icon: 'file-text',
              size: 200000000,
              fileCount: 300,
              lastModified: subDays(new Date(), 3).toISOString(),
              criticality: 'important',
              retentionDays: 730,
              autoBackup: true,
              backupFrequency: '24h',
              specificToWedding: true,
            },
          ],
        },
        {
          id: 'florist_1',
          vendorType: 'florist',
          vendorName: 'Bloom & Blossom',
          activeWeddings: 15,
          totalSize: 8000000000, // 8GB
          lastBackup: subDays(new Date(), 3).toISOString(),
          backupStatus: 'outdated',
          retentionPolicy: '1 year for designs, 2 years for contracts',
          specialRequirements: ['Design inspiration sync', 'Seasonal catalogs'],
          dataCategories: [
            {
              type: 'floral_designs',
              label: 'Floral Designs',
              icon: 'heart',
              size: 4000000000,
              fileCount: 1200,
              lastModified: new Date().toISOString(),
              criticality: 'critical',
              retentionDays: 365,
              autoBackup: true,
              backupFrequency: '24h',
              specificToWedding: true,
            },
            {
              type: 'inspiration_boards',
              label: 'Inspiration Boards',
              icon: 'star',
              size: 2000000000,
              fileCount: 800,
              lastModified: subDays(new Date(), 1).toISOString(),
              criticality: 'normal',
              retentionDays: 180,
              autoBackup: false,
              backupFrequency: 'weekly',
              specificToWedding: false,
            },
            {
              type: 'client_approvals',
              label: 'Client Approvals',
              icon: 'check-circle',
              size: 1500000000,
              fileCount: 400,
              lastModified: subDays(new Date(), 2).toISOString(),
              criticality: 'important',
              retentionDays: 730,
              autoBackup: true,
              backupFrequency: '12h',
              specificToWedding: true,
            },
          ],
        },
      ];

      setVendorData(mockData);
      if (mockData.length > 0) {
        setSelectedVendor(mockData[0].id);
      }
    } catch (error) {
      console.error('Failed to load vendor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBackupTemplates = async () => {
    const templates: BackupTemplate[] = [
      {
        id: 'photographer_pro',
        vendorType: 'photographer',
        name: 'Professional Photography',
        description: 'Complete photo workflow with RAW protection',
        categories: [
          'raw_photos',
          'edited_photos',
          'client_galleries',
          'contracts',
        ],
        schedule: 'Every 6 hours for active shoots',
        retention: 730,
        features: [
          'RAW file priority',
          'Client gallery sync',
          'Metadata preservation',
        ],
      },
      {
        id: 'venue_manager',
        vendorType: 'venue',
        name: 'Venue Operations',
        description: 'Event space management and coordination',
        categories: [
          'floor_plans',
          'vendor_schedules',
          'setup_notes',
          'guest_data',
        ],
        schedule: 'Daily with pre-event intensive',
        retention: 1095,
        features: [
          'Floor plan versioning',
          'Multi-vendor sync',
          'Emergency protocols',
        ],
      },
      {
        id: 'florist_creative',
        vendorType: 'florist',
        name: 'Creative Florist',
        description: 'Design-focused with client collaboration',
        categories: [
          'floral_designs',
          'inspiration_boards',
          'client_approvals',
          'supplier_catalogs',
        ],
        schedule: 'Daily during design phase',
        retention: 365,
        features: [
          'Design versioning',
          'Inspiration sync',
          'Seasonal archives',
        ],
      },
    ];

    setBackupTemplates(templates);
  };

  const getVendorIcon = (type: string) => {
    const icons = {
      photographer: Camera,
      venue: MapPin,
      florist: Heart,
      planner: Calendar,
      caterer: Users,
      dj: FileText,
    };
    const IconComponent = icons[type as keyof typeof icons] || FileText;
    return <IconComponent className="h-4 w-4" />;
  };

  const getCategoryIcon = (iconType: string) => {
    const icons = {
      camera: Camera,
      'map-pin': MapPin,
      heart: Heart,
      'file-text': FileText,
      calendar: Calendar,
      star: Star,
      'check-circle': CheckCircle,
    };
    const IconComponent = icons[iconType as keyof typeof icons] || FileText;
    return <IconComponent className="h-4 w-4" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up_to_date':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'outdated':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCriticalityBadge = (criticality: string) => {
    const variants = {
      critical: 'destructive',
      important: 'default',
      normal: 'secondary',
    };
    return (
      <Badge variant={variants[criticality as keyof typeof variants] as any}>
        {criticality.toUpperCase()}
      </Badge>
    );
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const selectedVendorData = vendorData.find((v) => v.id === selectedVendor);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Users className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            Loading vendor data...
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
          <h1 className="text-3xl font-bold">Vendor Data Backup</h1>
          <p className="text-muted-foreground">
            Specialized backup management for different wedding vendors
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={loadVendorData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Start Backup
          </Button>
        </div>
      </div>

      {/* Vendor Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {vendorData.map((vendor) => (
          <Card
            key={vendor.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedVendor === vendor.id
                ? 'ring-2 ring-blue-200 bg-blue-50'
                : ''
            }`}
            onClick={() => setSelectedVendor(vendor.id)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getVendorIcon(vendor.vendorType)}
                  <CardTitle className="text-lg">{vendor.vendorName}</CardTitle>
                </div>
                <Badge className={getStatusColor(vendor.backupStatus)}>
                  {vendor.backupStatus.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <CardDescription className="capitalize">
                {vendor.vendorType} • {vendor.activeWeddings} active weddings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Data:</span>
                  <span className="font-medium">
                    {formatBytes(vendor.totalSize)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Data Categories:</span>
                  <span className="font-medium">
                    {vendor.dataCategories.length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Last Backup:</span>
                  <span className="font-medium">
                    {format(new Date(vendor.lastBackup), 'MMM dd, HH:mm')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Vendor View */}
      {selectedVendorData && (
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="categories">Data Categories</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getVendorIcon(selectedVendorData.vendorType)}
                    {selectedVendorData.vendorName}
                  </CardTitle>
                  <CardDescription>
                    {selectedVendorData.vendorType} with{' '}
                    {selectedVendorData.activeWeddings} active weddings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Backup Status:</span>
                      <Badge
                        className={getStatusColor(
                          selectedVendorData.backupStatus,
                        )}
                      >
                        {selectedVendorData.backupStatus
                          .replace('_', ' ')
                          .toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Total Data Size:</span>
                      <span className="font-medium">
                        {formatBytes(selectedVendorData.totalSize)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Last Backup:</span>
                      <span className="font-medium">
                        {format(
                          new Date(selectedVendorData.lastBackup),
                          'MMM dd, yyyy HH:mm',
                        )}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-sm font-medium">
                      Retention Policy:
                    </span>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedVendorData.retentionPolicy}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Special Requirements</CardTitle>
                  <CardDescription>
                    Vendor-specific backup requirements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedVendorData.specialRequirements.map(
                      (req, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2 text-sm"
                        >
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>{req}</span>
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Data Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Data Distribution</CardTitle>
                <CardDescription>
                  Breakdown of data categories by size
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedVendorData.dataCategories.map((category) => {
                    const percentage =
                      (category.size / selectedVendorData.totalSize) * 100;
                    return (
                      <div key={category.type} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            {getCategoryIcon(category.icon)}
                            <span className="font-medium">
                              {category.label}
                            </span>
                            {getCriticalityBadge(category.criticality)}
                          </div>
                          <span>
                            {formatBytes(category.size)} (
                            {percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <div className="grid gap-6">
              {selectedVendorData.dataCategories.map((category) => (
                <Card key={category.type}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getCategoryIcon(category.icon)}
                        <CardTitle className="text-lg">
                          {category.label}
                        </CardTitle>
                        {getCriticalityBadge(category.criticality)}
                      </div>

                      <div className="flex items-center space-x-2">
                        {category.autoBackup && (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Auto Backup
                          </Badge>
                        )}
                        {category.specificToWedding && (
                          <Badge
                            variant="outline"
                            className="bg-pink-50 text-pink-700"
                          >
                            <Heart className="h-3 w-3 mr-1" />
                            Wedding Specific
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Size:</span>
                        <div className="text-lg font-bold">
                          {formatBytes(category.size)}
                        </div>
                      </div>

                      <div>
                        <span className="font-medium text-gray-700">
                          Files:
                        </span>
                        <div className="text-lg font-bold">
                          {category.fileCount.toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <span className="font-medium text-gray-700">
                          Frequency:
                        </span>
                        <div className="text-lg font-bold">
                          {category.backupFrequency}
                        </div>
                      </div>

                      <div>
                        <span className="font-medium text-gray-700">
                          Retention:
                        </span>
                        <div className="text-lg font-bold">
                          {category.retentionDays} days
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Last modified:{' '}
                        {format(
                          new Date(category.lastModified),
                          'MMM dd, HH:mm',
                        )}
                      </span>

                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          View Files
                        </Button>
                        <Button size="sm" variant="outline">
                          <Upload className="h-4 w-4 mr-1" />
                          Backup Now
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4 mr-1" />
                          Configure
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {backupTemplates
                .filter(
                  (template) =>
                    template.vendorType === selectedVendorData.vendorType,
                )
                .map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <CardTitle>{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <span className="text-sm font-medium">Schedule:</span>
                        <p className="text-sm text-gray-600">
                          {template.schedule}
                        </p>
                      </div>

                      <div>
                        <span className="text-sm font-medium">Retention:</span>
                        <p className="text-sm text-gray-600">
                          {template.retention} days
                        </p>
                      </div>

                      <div>
                        <span className="text-sm font-medium">Features:</span>
                        <div className="mt-1 space-y-1">
                          {template.features.map((feature, index) => (
                            <div
                              key={index}
                              className="flex items-center space-x-2 text-sm"
                            >
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-sm font-medium">Categories:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {template.categories.map((category) => (
                            <Badge
                              key={category}
                              variant="outline"
                              className="text-xs"
                            >
                              {category.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Button className="w-full">Apply Template</Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Backup Configuration</CardTitle>
                <CardDescription>
                  Configure backup settings for {selectedVendorData.vendorName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">General Settings</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">
                        Default Retention Period
                      </label>
                      <select className="w-full mt-1 px-3 py-2 border rounded-md">
                        <option value="365">1 Year</option>
                        <option value="730">2 Years</option>
                        <option value="1095">3 Years</option>
                        <option value="1825">5 Years</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">
                        Backup Window
                      </label>
                      <select className="w-full mt-1 px-3 py-2 border rounded-md">
                        <option value="overnight">Overnight (2AM - 6AM)</option>
                        <option value="business">
                          Business Hours (9AM - 5PM)
                        </option>
                        <option value="continuous">Continuous</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Vendor-Specific Settings</h4>
                  <div className="space-y-4">
                    {selectedVendorData.vendorType === 'photographer' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">RAW File Priority</span>
                          <input
                            type="checkbox"
                            defaultChecked
                            className="rounded"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">
                            Client Gallery Auto-Sync
                          </span>
                          <input
                            type="checkbox"
                            defaultChecked
                            className="rounded"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Metadata Preservation</span>
                          <input
                            type="checkbox"
                            defaultChecked
                            className="rounded"
                          />
                        </div>
                      </div>
                    )}

                    {selectedVendorData.vendorType === 'venue' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Floor Plan Versioning</span>
                          <input
                            type="checkbox"
                            defaultChecked
                            className="rounded"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Multi-Vendor Sync</span>
                          <input
                            type="checkbox"
                            defaultChecked
                            className="rounded"
                          />
                        </div>
                      </div>
                    )}

                    {selectedVendorData.vendorType === 'florist' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">
                            Design Version Control
                          </span>
                          <input
                            type="checkbox"
                            defaultChecked
                            className="rounded"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Seasonal Archive</span>
                          <input type="checkbox" className="rounded" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button variant="outline">Reset to Defaults</Button>
                  <Button>Save Settings</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default VendorDataBackupManager;
