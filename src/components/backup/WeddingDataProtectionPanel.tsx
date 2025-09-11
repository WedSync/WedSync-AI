/**
 * WS-258: Backup Strategy Implementation System - Wedding Data Protection Panel
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Camera,
  Users,
  FileText,
  Database,
  HardDrive,
  Cloud,
  Server,
  Shield,
  Settings,
  Clock,
  Lock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  Zap,
  Save,
  RotateCcw,
} from 'lucide-react';
import {
  BackupSystemStatus,
  BackupSystemConfig,
  DataType,
  BackupTier,
  LocalBackupConfig,
  CloudBackupConfig,
  OffsiteBackupConfig,
  RetentionPolicy,
} from './types';
import { cn } from '@/lib/utils';

interface WeddingDataProtectionPanelProps {
  organizationId: string;
  backupStatus: BackupSystemStatus | null;
  readOnly?: boolean;
}

interface ConfigurationState {
  localBackup: LocalBackupConfig;
  cloudBackup: CloudBackupConfig;
  offsiteBackup: OffsiteBackupConfig;
  retentionPolicies: RetentionPolicy[];
  weddingSpecificSettings: {
    priority_booking_days_before: number;
    wedding_day_backup_frequency_minutes: number;
    post_wedding_retention_days: number;
    emergency_response_time_minutes: number;
  };
  emergencyContacts: {
    primary_email: string;
    primary_phone: string;
    secondary_email: string;
    secondary_phone: string;
    escalation_time_minutes: number;
  };
}

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

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 GB';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function WeddingDataProtectionPanel({
  organizationId,
  backupStatus,
  readOnly = false,
}: WeddingDataProtectionPanelProps) {
  const [config, setConfig] = useState<ConfigurationState>({
    localBackup: {
      enabled: true,
      storage_path: '/backups/local',
      max_storage_gb: 500,
      encryption_key: '',
      compression_enabled: true,
      verify_after_backup: true,
    },
    cloudBackup: {
      enabled: true,
      provider: 'aws',
      bucket_name: 'wedsync-backups',
      region: 'us-east-1',
      storage_class: 'STANDARD_IA',
      encryption_enabled: true,
      cross_region_replication: true,
    },
    offsiteBackup: {
      enabled: false,
      provider: 'Iron Mountain',
      location: 'Secure Facility',
      transport_method: 'internet',
      encryption_required: true,
      compliance_certifications: ['SOC2', 'ISO27001'],
    },
    retentionPolicies: [
      {
        id: 'wedding-photos',
        name: 'Wedding Photos',
        data_type: 'photos',
        daily_retention: 30,
        weekly_retention: 52,
        monthly_retention: 24,
        yearly_retention: 10,
        wedding_data_special_retention: 2555, // 7 years
        compliance_requirements: ['GDPR', 'Wedding Industry Standards'],
      },
      {
        id: 'client-data',
        name: 'Client Information',
        data_type: 'client-data',
        daily_retention: 30,
        weekly_retention: 12,
        monthly_retention: 12,
        yearly_retention: 7,
        wedding_data_special_retention: 2555, // 7 years for legal compliance
        compliance_requirements: ['GDPR', 'CCPA'],
      },
    ],
    weddingSpecificSettings: {
      priority_booking_days_before: 30,
      wedding_day_backup_frequency_minutes: 15,
      post_wedding_retention_days: 365,
      emergency_response_time_minutes: 15,
    },
    emergencyContacts: {
      primary_email: '',
      primary_phone: '',
      secondary_email: '',
      secondary_phone: '',
      escalation_time_minutes: 30,
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [storageEstimate, setStorageEstimate] = useState({
    local: 0,
    cloud: 0,
    offsite: 0,
    totalCost: 0,
  });

  // Calculate storage estimates
  useEffect(() => {
    const estimate = {
      local: config.localBackup.enabled ? config.localBackup.max_storage_gb : 0,
      cloud: config.cloudBackup.enabled ? 1000 : 0, // Estimated based on typical usage
      offsite: config.offsiteBackup.enabled ? 500 : 0,
      totalCost: 0,
    };

    // Rough cost estimation (in USD per month)
    estimate.totalCost =
      estimate.cloud * 0.025 + // AWS S3 Standard-IA pricing
      estimate.offsite * 0.15 + // Offsite backup service
      (config.localBackup.enabled ? 50 : 0); // Local infrastructure cost

    setStorageEstimate(estimate);
  }, [config]);

  const handleConfigChange = (
    section: keyof ConfigurationState,
    field: string,
    value: any,
  ) => {
    setConfig((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSaveConfiguration = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/backup/configuration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          configuration: config,
        }),
      });

      if (response.ok) {
        setHasChanges(false);
        // Show success message
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Failed to save backup configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetConfiguration = () => {
    // Reset to default configuration
    setHasChanges(false);
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Header with Save Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Wedding Data Protection Configuration
              </CardTitle>
              <CardDescription>
                Comprehensive backup strategy for irreplaceable wedding memories
                and critical business data
              </CardDescription>
            </div>

            {!readOnly && (
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <Badge variant="secondary" className="animate-pulse">
                    Unsaved Changes
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetConfiguration}
                  disabled={!hasChanges}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveConfiguration}
                  disabled={!hasChanges || isLoading}
                >
                  <Save className="w-4 h-4 mr-1" />
                  {isLoading ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Configuration Tabs */}
      <Tabs defaultValue="multi-tier" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="multi-tier">Multi-Tier Backup</TabsTrigger>
          <TabsTrigger value="retention">Retention Policies</TabsTrigger>
          <TabsTrigger value="wedding-specific">Wedding Settings</TabsTrigger>
          <TabsTrigger value="emergency">Emergency Contacts</TabsTrigger>
        </TabsList>

        {/* Multi-Tier Backup Configuration */}
        <TabsContent value="multi-tier" className="space-y-4">
          {/* Local Backup Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="w-5 h-5" />
                Tier 1: Local Backup
                <Badge variant="outline">Primary</Badge>
              </CardTitle>
              <CardDescription>
                High-speed local backup for immediate recovery and frequent
                snapshots
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="local-backup-enabled"
                    checked={config.localBackup.enabled}
                    onCheckedChange={(checked) =>
                      handleConfigChange('localBackup', 'enabled', checked)
                    }
                    disabled={readOnly}
                  />
                  <Label htmlFor="local-backup-enabled">
                    Enable Local Backup
                  </Label>
                </div>
                {config.localBackup.enabled && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Active
                  </Badge>
                )}
              </div>

              {config.localBackup.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="local-storage-path">Storage Location</Label>
                    <Input
                      id="local-storage-path"
                      value={config.localBackup.storage_path}
                      onChange={(e) =>
                        handleConfigChange(
                          'localBackup',
                          'storage_path',
                          e.target.value,
                        )
                      }
                      disabled={readOnly}
                      placeholder="/backups/local"
                    />
                  </div>

                  <div>
                    <Label htmlFor="local-max-storage">
                      Maximum Storage (GB)
                    </Label>
                    <Input
                      id="local-max-storage"
                      type="number"
                      value={config.localBackup.max_storage_gb}
                      onChange={(e) =>
                        handleConfigChange(
                          'localBackup',
                          'max_storage_gb',
                          parseInt(e.target.value),
                        )
                      }
                      disabled={readOnly}
                      min="100"
                      max="10000"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="local-compression"
                      checked={config.localBackup.compression_enabled}
                      onCheckedChange={(checked) =>
                        handleConfigChange(
                          'localBackup',
                          'compression_enabled',
                          checked,
                        )
                      }
                      disabled={readOnly}
                    />
                    <Label htmlFor="local-compression">
                      Enable Compression
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="local-verification"
                      checked={config.localBackup.verify_after_backup}
                      onCheckedChange={(checked) =>
                        handleConfigChange(
                          'localBackup',
                          'verify_after_backup',
                          checked,
                        )
                      }
                      disabled={readOnly}
                    />
                    <Label htmlFor="local-verification">
                      Verify After Backup
                    </Label>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cloud Backup Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="w-5 h-5" />
                Tier 2: Cloud Backup
                <Badge variant="outline">Secondary</Badge>
              </CardTitle>
              <CardDescription>
                Secure cloud storage for offsite protection and disaster
                recovery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="cloud-backup-enabled"
                    checked={config.cloudBackup.enabled}
                    onCheckedChange={(checked) =>
                      handleConfigChange('cloudBackup', 'enabled', checked)
                    }
                    disabled={readOnly}
                  />
                  <Label htmlFor="cloud-backup-enabled">
                    Enable Cloud Backup
                  </Label>
                </div>
                {config.cloudBackup.enabled && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Active
                  </Badge>
                )}
              </div>

              {config.cloudBackup.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cloud-provider">Cloud Provider</Label>
                    <Select
                      value={config.cloudBackup.provider}
                      onValueChange={(value: any) =>
                        handleConfigChange('cloudBackup', 'provider', value)
                      }
                      disabled={readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aws">Amazon Web Services</SelectItem>
                        <SelectItem value="azure">Microsoft Azure</SelectItem>
                        <SelectItem value="gcp">
                          Google Cloud Platform
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="cloud-region">Region</Label>
                    <Select
                      value={config.cloudBackup.region}
                      onValueChange={(value) =>
                        handleConfigChange('cloudBackup', 'region', value)
                      }
                      disabled={readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us-east-1">
                          US East (N. Virginia)
                        </SelectItem>
                        <SelectItem value="us-west-2">
                          US West (Oregon)
                        </SelectItem>
                        <SelectItem value="eu-west-1">
                          Europe (Ireland)
                        </SelectItem>
                        <SelectItem value="ap-southeast-2">
                          Asia Pacific (Sydney)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="cloud-bucket">Bucket/Container Name</Label>
                    <Input
                      id="cloud-bucket"
                      value={config.cloudBackup.bucket_name}
                      onChange={(e) =>
                        handleConfigChange(
                          'cloudBackup',
                          'bucket_name',
                          e.target.value,
                        )
                      }
                      disabled={readOnly}
                      placeholder="wedsync-backups"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cloud-storage-class">Storage Class</Label>
                    <Select
                      value={config.cloudBackup.storage_class}
                      onValueChange={(value) =>
                        handleConfigChange(
                          'cloudBackup',
                          'storage_class',
                          value,
                        )
                      }
                      disabled={readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select storage class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STANDARD">
                          Standard (Frequent Access)
                        </SelectItem>
                        <SelectItem value="STANDARD_IA">
                          Standard-IA (Infrequent Access)
                        </SelectItem>
                        <SelectItem value="GLACIER">
                          Glacier (Archival)
                        </SelectItem>
                        <SelectItem value="DEEP_ARCHIVE">
                          Deep Archive (Long-term)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="cloud-encryption"
                      checked={config.cloudBackup.encryption_enabled}
                      onCheckedChange={(checked) =>
                        handleConfigChange(
                          'cloudBackup',
                          'encryption_enabled',
                          checked,
                        )
                      }
                      disabled={readOnly}
                    />
                    <Label htmlFor="cloud-encryption">Enable Encryption</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="cloud-replication"
                      checked={config.cloudBackup.cross_region_replication}
                      onCheckedChange={(checked) =>
                        handleConfigChange(
                          'cloudBackup',
                          'cross_region_replication',
                          checked,
                        )
                      }
                      disabled={readOnly}
                    />
                    <Label htmlFor="cloud-replication">
                      Cross-Region Replication
                    </Label>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Offsite Backup Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Tier 3: Offsite Backup
                <Badge variant="outline">Tertiary</Badge>
              </CardTitle>
              <CardDescription>
                Physical offsite backup for maximum data protection and
                compliance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="offsite-backup-enabled"
                    checked={config.offsiteBackup.enabled}
                    onCheckedChange={(checked) =>
                      handleConfigChange('offsiteBackup', 'enabled', checked)
                    }
                    disabled={readOnly}
                  />
                  <Label htmlFor="offsite-backup-enabled">
                    Enable Offsite Backup
                  </Label>
                </div>
                {config.offsiteBackup.enabled ? (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline">Recommended</Badge>
                )}
              </div>

              {config.offsiteBackup.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="offsite-provider">Service Provider</Label>
                    <Input
                      id="offsite-provider"
                      value={config.offsiteBackup.provider}
                      onChange={(e) =>
                        handleConfigChange(
                          'offsiteBackup',
                          'provider',
                          e.target.value,
                        )
                      }
                      disabled={readOnly}
                      placeholder="Iron Mountain"
                    />
                  </div>

                  <div>
                    <Label htmlFor="offsite-location">Storage Location</Label>
                    <Input
                      id="offsite-location"
                      value={config.offsiteBackup.location}
                      onChange={(e) =>
                        handleConfigChange(
                          'offsiteBackup',
                          'location',
                          e.target.value,
                        )
                      }
                      disabled={readOnly}
                      placeholder="Secure Facility"
                    />
                  </div>

                  <div>
                    <Label htmlFor="offsite-transport">Transport Method</Label>
                    <Select
                      value={config.offsiteBackup.transport_method}
                      onValueChange={(value: any) =>
                        handleConfigChange(
                          'offsiteBackup',
                          'transport_method',
                          value,
                        )
                      }
                      disabled={readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select transport method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internet">
                          Internet Transfer
                        </SelectItem>
                        <SelectItem value="physical-media">
                          Physical Media
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="offsite-encryption"
                      checked={config.offsiteBackup.encryption_required}
                      onCheckedChange={(checked) =>
                        handleConfigChange(
                          'offsiteBackup',
                          'encryption_required',
                          checked,
                        )
                      }
                      disabled={readOnly}
                    />
                    <Label htmlFor="offsite-encryption">
                      Require Encryption
                    </Label>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Storage Cost Estimate */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Cost Estimation
              </CardTitle>
              <CardDescription>
                Estimated monthly costs for your backup configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {formatBytes(storageEstimate.local * 1024 * 1024 * 1024)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Local Storage
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {formatBytes(storageEstimate.cloud * 1024 * 1024 * 1024)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Cloud Storage
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {formatBytes(storageEstimate.offsite * 1024 * 1024 * 1024)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Offsite Storage
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ${storageEstimate.totalCost.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Monthly Cost
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retention Policies Configuration */}
        <TabsContent value="retention" className="space-y-4">
          <div className="space-y-4">
            {config.retentionPolicies.map((policy, index) => (
              <Card key={policy.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getDataTypeIcon(policy.data_type)}
                    {policy.name} Retention Policy
                  </CardTitle>
                  <CardDescription>
                    Data retention schedule for{' '}
                    {policy.data_type.replace('-', ' ')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Daily Backups (days)</Label>
                      <Input
                        type="number"
                        value={policy.daily_retention}
                        onChange={(e) => {
                          const newPolicies = [...config.retentionPolicies];
                          newPolicies[index].daily_retention = parseInt(
                            e.target.value,
                          );
                          setConfig((prev) => ({
                            ...prev,
                            retentionPolicies: newPolicies,
                          }));
                          setHasChanges(true);
                        }}
                        disabled={readOnly}
                        min="1"
                        max="365"
                      />
                    </div>

                    <div>
                      <Label>Weekly Backups (weeks)</Label>
                      <Input
                        type="number"
                        value={policy.weekly_retention}
                        onChange={(e) => {
                          const newPolicies = [...config.retentionPolicies];
                          newPolicies[index].weekly_retention = parseInt(
                            e.target.value,
                          );
                          setConfig((prev) => ({
                            ...prev,
                            retentionPolicies: newPolicies,
                          }));
                          setHasChanges(true);
                        }}
                        disabled={readOnly}
                        min="1"
                        max="104"
                      />
                    </div>

                    <div>
                      <Label>Monthly Backups (months)</Label>
                      <Input
                        type="number"
                        value={policy.monthly_retention}
                        onChange={(e) => {
                          const newPolicies = [...config.retentionPolicies];
                          newPolicies[index].monthly_retention = parseInt(
                            e.target.value,
                          );
                          setConfig((prev) => ({
                            ...prev,
                            retentionPolicies: newPolicies,
                          }));
                          setHasChanges(true);
                        }}
                        disabled={readOnly}
                        min="1"
                        max="120"
                      />
                    </div>

                    <div>
                      <Label>Yearly Backups (years)</Label>
                      <Input
                        type="number"
                        value={policy.yearly_retention}
                        onChange={(e) => {
                          const newPolicies = [...config.retentionPolicies];
                          newPolicies[index].yearly_retention = parseInt(
                            e.target.value,
                          );
                          setConfig((prev) => ({
                            ...prev,
                            retentionPolicies: newPolicies,
                          }));
                          setHasChanges(true);
                        }}
                        disabled={readOnly}
                        min="1"
                        max="50"
                      />
                    </div>
                  </div>

                  <Alert>
                    <Calendar className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Wedding Special Retention:</strong>{' '}
                      {Math.round(policy.wedding_data_special_retention / 365)}{' '}
                      years - Extended retention for wedding-related data to
                      ensure long-term preservation of irreplaceable memories.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <Label>Compliance Requirements</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {policy.compliance_requirements.map((req) => (
                        <Badge key={req} variant="outline">
                          {req}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Wedding-Specific Settings */}
        <TabsContent value="wedding-specific" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Wedding Day Protection Settings
              </CardTitle>
              <CardDescription>
                Special backup configurations for wedding day operations and
                critical periods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority-booking">
                    Priority Backup Period (days before wedding)
                  </Label>
                  <Input
                    id="priority-booking"
                    type="number"
                    value={
                      config.weddingSpecificSettings
                        .priority_booking_days_before
                    }
                    onChange={(e) =>
                      handleConfigChange(
                        'weddingSpecificSettings',
                        'priority_booking_days_before',
                        parseInt(e.target.value),
                      )
                    }
                    disabled={readOnly}
                    min="1"
                    max="90"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Increased backup frequency starts this many days before the
                    wedding
                  </div>
                </div>

                <div>
                  <Label htmlFor="wedding-day-frequency">
                    Wedding Day Backup Frequency (minutes)
                  </Label>
                  <Input
                    id="wedding-day-frequency"
                    type="number"
                    value={
                      config.weddingSpecificSettings
                        .wedding_day_backup_frequency_minutes
                    }
                    onChange={(e) =>
                      handleConfigChange(
                        'weddingSpecificSettings',
                        'wedding_day_backup_frequency_minutes',
                        parseInt(e.target.value),
                      )
                    }
                    disabled={readOnly}
                    min="5"
                    max="60"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    How often to backup data on the wedding day
                  </div>
                </div>

                <div>
                  <Label htmlFor="post-wedding-retention">
                    Post-Wedding Retention Extension (days)
                  </Label>
                  <Input
                    id="post-wedding-retention"
                    type="number"
                    value={
                      config.weddingSpecificSettings.post_wedding_retention_days
                    }
                    onChange={(e) =>
                      handleConfigChange(
                        'weddingSpecificSettings',
                        'post_wedding_retention_days',
                        parseInt(e.target.value),
                      )
                    }
                    disabled={readOnly}
                    min="30"
                    max="730"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Extended retention period after wedding completion
                  </div>
                </div>

                <div>
                  <Label htmlFor="emergency-response">
                    Emergency Response Time (minutes)
                  </Label>
                  <Input
                    id="emergency-response"
                    type="number"
                    value={
                      config.weddingSpecificSettings
                        .emergency_response_time_minutes
                    }
                    onChange={(e) =>
                      handleConfigChange(
                        'weddingSpecificSettings',
                        'emergency_response_time_minutes',
                        parseInt(e.target.value),
                      )
                    }
                    disabled={readOnly}
                    min="5"
                    max="60"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Maximum response time for wedding day emergencies
                  </div>
                </div>
              </div>

              <Alert>
                <Zap className="h-4 w-4" />
                <AlertDescription>
                  <strong>Wedding Day Protocol:</strong> During the configured
                  priority period, backup frequency increases automatically,
                  emergency response is accelerated, and additional monitoring
                  is activated to ensure zero data loss during critical wedding
                  operations.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emergency Contacts Configuration */}
        <TabsContent value="emergency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Emergency Contact Configuration
              </CardTitle>
              <CardDescription>
                Critical contact information for backup system emergencies and
                wedding day support
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary-email">Primary Email</Label>
                  <Input
                    id="primary-email"
                    type="email"
                    value={config.emergencyContacts.primary_email}
                    onChange={(e) =>
                      handleConfigChange(
                        'emergencyContacts',
                        'primary_email',
                        e.target.value,
                      )
                    }
                    disabled={readOnly}
                    placeholder="photographer@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="primary-phone">Primary Phone</Label>
                  <Input
                    id="primary-phone"
                    type="tel"
                    value={config.emergencyContacts.primary_phone}
                    onChange={(e) =>
                      handleConfigChange(
                        'emergencyContacts',
                        'primary_phone',
                        e.target.value,
                      )
                    }
                    disabled={readOnly}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <Label htmlFor="secondary-email">
                    Secondary Email (Optional)
                  </Label>
                  <Input
                    id="secondary-email"
                    type="email"
                    value={config.emergencyContacts.secondary_email}
                    onChange={(e) =>
                      handleConfigChange(
                        'emergencyContacts',
                        'secondary_email',
                        e.target.value,
                      )
                    }
                    disabled={readOnly}
                    placeholder="assistant@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="secondary-phone">
                    Secondary Phone (Optional)
                  </Label>
                  <Input
                    id="secondary-phone"
                    type="tel"
                    value={config.emergencyContacts.secondary_phone}
                    onChange={(e) =>
                      handleConfigChange(
                        'emergencyContacts',
                        'secondary_phone',
                        e.target.value,
                      )
                    }
                    disabled={readOnly}
                    placeholder="+1 (555) 987-6543"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="escalation-time">
                    Escalation Time (minutes)
                  </Label>
                  <Input
                    id="escalation-time"
                    type="number"
                    value={config.emergencyContacts.escalation_time_minutes}
                    onChange={(e) =>
                      handleConfigChange(
                        'emergencyContacts',
                        'escalation_time_minutes',
                        parseInt(e.target.value),
                      )
                    }
                    disabled={readOnly}
                    min="5"
                    max="120"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Time before escalating to secondary contacts if primary
                    doesn't respond
                  </div>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>24/7 Emergency Support:</strong> These contacts will
                  be reached immediately during backup system failures,
                  especially during wedding days. Ensure contact information is
                  always current and accessible.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
