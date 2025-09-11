'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { FormField, FormFieldType, Form } from '@/types/forms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle,
  Upload,
  Download,
  RefreshCw,
  Settings,
  MapPin,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';

// Types for field integration
export interface FieldIntegrationSource {
  id: string;
  name: string;
  type: 'api' | 'file' | 'database' | 'webhook' | 'external_form';
  endpoint?: string;
  credentials?: Record<string, any>;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: Date;
  fieldsCount?: number;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation?:
    | 'none'
    | 'uppercase'
    | 'lowercase'
    | 'date_format'
    | 'custom';
  customTransformation?: string;
  required: boolean;
}

export interface IntegrationConfig {
  id: string;
  name: string;
  source: FieldIntegrationSource;
  targetFormId: string;
  mappings: FieldMapping[];
  autoSync: boolean;
  syncInterval: number; // minutes
  validationRules: ValidationRule[];
  isActive: boolean;
}

export interface ValidationRule {
  field: string;
  rule: 'required' | 'email' | 'phone' | 'date' | 'custom';
  message: string;
  customValidator?: string;
}

interface FieldIntegrationProps {
  formId: string;
  onFieldsImported?: (fields: FormField[]) => void;
  onIntegrationConfigured?: (config: IntegrationConfig) => void;
}

const SUPPORTED_INTEGRATIONS = [
  { type: 'api', name: 'REST API', icon: Zap },
  { type: 'file', name: 'CSV/JSON Import', icon: Upload },
  { type: 'database', name: 'Database Connection', icon: Settings },
  { type: 'webhook', name: 'Webhook Integration', icon: RefreshCw },
  { type: 'external_form', name: 'External Form Builder', icon: MapPin },
] as const;

const FIELD_TRANSFORMATIONS = [
  { value: 'none', label: 'No transformation' },
  { value: 'uppercase', label: 'Convert to uppercase' },
  { value: 'lowercase', label: 'Convert to lowercase' },
  { value: 'date_format', label: 'Format date' },
  { value: 'custom', label: 'Custom transformation' },
];

export function FieldIntegration({
  formId,
  onFieldsImported,
  onIntegrationConfigured,
}: FieldIntegrationProps) {
  const [activeTab, setActiveTab] = useState('sources');
  const [integrationSources, setIntegrationSources] = useState<
    FieldIntegrationSource[]
  >([]);
  const [integrationConfigs, setIntegrationConfigs] = useState<
    IntegrationConfig[]
  >([]);
  const [selectedSource, setSelectedSource] =
    useState<FieldIntegrationSource | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [sourceFields, setSourceFields] = useState<any[]>([]);
  const [targetFields, setTargetFields] = useState<FormField[]>([]);

  // Load existing integrations
  useEffect(() => {
    loadIntegrationSources();
    loadIntegrationConfigs();
    loadTargetFields();
  }, [formId]);

  const loadIntegrationSources = async () => {
    // Mock data - in real implementation, fetch from API
    const mockSources: FieldIntegrationSource[] = [
      {
        id: '1',
        name: 'Wedding API Integration',
        type: 'api',
        endpoint: 'https://api.wedding-vendor.com/fields',
        status: 'connected',
        lastSync: new Date(),
        fieldsCount: 25,
      },
      {
        id: '2',
        name: 'CSV Import',
        type: 'file',
        status: 'disconnected',
        fieldsCount: 0,
      },
    ];
    setIntegrationSources(mockSources);
  };

  const loadIntegrationConfigs = async () => {
    // Mock data - in real implementation, fetch from API
    setIntegrationConfigs([]);
  };

  const loadTargetFields = async () => {
    // Mock target fields - in real implementation, fetch form fields
    const mockTargetFields: FormField[] = [
      {
        id: 'name',
        type: 'text',
        label: 'Full Name',
        required: true,
        order: 1,
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email Address',
        required: true,
        order: 2,
      },
      {
        id: 'phone',
        type: 'tel',
        label: 'Phone Number',
        required: false,
        order: 3,
      },
    ];
    setTargetFields(mockTargetFields);
  };

  const handleConnectSource = async (sourceType: string) => {
    setIsLoading(true);
    try {
      // Mock connection logic
      const newSource: FieldIntegrationSource = {
        id: nanoid(),
        name: `New ${sourceType} Integration`,
        type: sourceType as any,
        status: 'connected',
        lastSync: new Date(),
        fieldsCount: Math.floor(Math.random() * 50) + 10,
      };

      setIntegrationSources((prev) => [...prev, newSource]);
      toast.success(`${sourceType} integration connected successfully!`);
    } catch (error) {
      toast.error(`Failed to connect ${sourceType} integration`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectSource = async (sourceId: string) => {
    try {
      setIntegrationSources((prev) =>
        prev.map((source) =>
          source.id === sourceId
            ? { ...source, status: 'disconnected' as const }
            : source,
        ),
      );
      toast.success('Integration disconnected');
    } catch (error) {
      toast.error('Failed to disconnect integration');
    }
  };

  const handleSyncSource = async (sourceId: string) => {
    setIsLoading(true);
    try {
      // Mock sync logic - fetch fields from source
      const mockSourceFields = [
        { name: 'client_name', type: 'text', label: 'Client Name' },
        { name: 'client_email', type: 'email', label: 'Client Email' },
        { name: 'wedding_date', type: 'date', label: 'Wedding Date' },
        { name: 'venue_name', type: 'text', label: 'Venue Name' },
        { name: 'guest_count', type: 'number', label: 'Guest Count' },
      ];

      setSourceFields(mockSourceFields);
      setSelectedSource(
        integrationSources.find((s) => s.id === sourceId) || null,
      );

      // Update last sync time
      setIntegrationSources((prev) =>
        prev.map((source) =>
          source.id === sourceId
            ? {
                ...source,
                lastSync: new Date(),
                fieldsCount: mockSourceFields.length,
              }
            : source,
        ),
      );

      toast.success('Fields synchronized successfully!');
      setActiveTab('mapping');
    } catch (error) {
      toast.error('Failed to sync fields');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFieldMapping = () => {
    const newMapping: FieldMapping = {
      sourceField: '',
      targetField: '',
      transformation: 'none',
      required: false,
    };
    setFieldMappings((prev) => [...prev, newMapping]);
  };

  const handleUpdateMapping = (
    index: number,
    updates: Partial<FieldMapping>,
  ) => {
    setFieldMappings((prev) =>
      prev.map((mapping, i) =>
        i === index ? { ...mapping, ...updates } : mapping,
      ),
    );
  };

  const handleRemoveMapping = (index: number) => {
    setFieldMappings((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImportFields = async () => {
    if (!selectedSource || fieldMappings.length === 0) {
      toast.error('Please configure field mappings first');
      return;
    }

    setIsLoading(true);
    try {
      // Transform source fields to target format
      const importedFields: FormField[] = fieldMappings.map(
        (mapping, index) => {
          const sourceField = sourceFields.find(
            (f) => f.name === mapping.sourceField,
          );
          const targetField = targetFields.find(
            (f) => f.id === mapping.targetField,
          );

          return {
            id: nanoid(),
            type: (sourceField?.type || 'text') as FormFieldType,
            label: sourceField?.label || mapping.sourceField,
            required: mapping.required,
            order: targetFields.length + index + 1,
            placeholder: `Imported from ${selectedSource.name}`,
          };
        },
      );

      onFieldsImported?.(importedFields);
      toast.success(`${importedFields.length} fields imported successfully!`);
    } catch (error) {
      toast.error('Failed to import fields');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveIntegrationConfig = async () => {
    if (!selectedSource) return;

    const config: IntegrationConfig = {
      id: nanoid(),
      name: `${selectedSource.name} Config`,
      source: selectedSource,
      targetFormId: formId,
      mappings: fieldMappings,
      autoSync: false,
      syncInterval: 60,
      validationRules: [],
      isActive: true,
    };

    setIntegrationConfigs((prev) => [...prev, config]);
    onIntegrationConfigured?.(config);
    toast.success('Integration configuration saved!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Field Integration Manager</h2>
          <p className="text-muted-foreground">
            Connect and synchronize fields from external sources
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {
            integrationSources.filter((s) => s.status === 'connected').length
          }{' '}
          Connected
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="sources">Integration Sources</TabsTrigger>
          <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="history">Sync History</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SUPPORTED_INTEGRATIONS.map((integration) => (
              <Card
                key={integration.type}
                className="cursor-pointer hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3">
                    <integration.icon className="h-5 w-5" />
                    {integration.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleConnectSource(integration.type)}
                    disabled={isLoading}
                    className="w-full"
                  >
                    Connect Integration
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Connected Integrations</h3>
            {integrationSources.map((source) => (
              <Card key={source.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          source.status === 'connected'
                            ? 'bg-green-500'
                            : source.status === 'error'
                              ? 'bg-red-500'
                              : 'bg-gray-400'
                        }`}
                      />
                      <div>
                        <h4 className="font-medium">{source.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {source.fieldsCount} fields • Last sync:{' '}
                          {source.lastSync?.toLocaleString() || 'Never'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncSource(source.id)}
                        disabled={isLoading || source.status !== 'connected'}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDisconnectSource(source.id)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="mapping" className="space-y-4">
          {!selectedSource ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  No Integration Selected
                </h3>
                <p className="text-muted-foreground mb-4">
                  Please connect and sync an integration source first
                </p>
                <Button onClick={() => setActiveTab('sources')}>
                  Go to Integration Sources
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Field Mapping: {selectedSource.name}
                </h3>
                <Button onClick={handleAddFieldMapping}>Add Mapping</Button>
              </div>

              {fieldMappings.map((mapping, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                      <div>
                        <Label>Source Field</Label>
                        <Select
                          value={mapping.sourceField}
                          onValueChange={(value) =>
                            handleUpdateMapping(index, { sourceField: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select source field" />
                          </SelectTrigger>
                          <SelectContent>
                            {sourceFields.map((field) => (
                              <SelectItem key={field.name} value={field.name}>
                                {field.label} ({field.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Target Field</Label>
                        <Select
                          value={mapping.targetField}
                          onValueChange={(value) =>
                            handleUpdateMapping(index, { targetField: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select target field" />
                          </SelectTrigger>
                          <SelectContent>
                            {targetFields.map((field) => (
                              <SelectItem key={field.id} value={field.id}>
                                {field.label} ({field.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Transformation</Label>
                        <Select
                          value={mapping.transformation}
                          onValueChange={(value: any) =>
                            handleUpdateMapping(index, {
                              transformation: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TRANSFORMATIONS.map((transform) => (
                              <SelectItem
                                key={transform.value}
                                value={transform.value}
                              >
                                {transform.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={mapping.required}
                          onCheckedChange={(checked) =>
                            handleUpdateMapping(index, { required: checked })
                          }
                        />
                        <Label>Required</Label>
                      </div>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveMapping(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {fieldMappings.length > 0 && (
                <div className="flex gap-4">
                  <Button
                    onClick={handleImportFields}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Import Fields
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSaveIntegrationConfig}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Save Configuration
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Configurations</CardTitle>
            </CardHeader>
            <CardContent>
              {integrationConfigs.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  No configurations saved yet. Create field mappings to get
                  started.
                </p>
              ) : (
                <div className="space-y-4">
                  {integrationConfigs.map((config) => (
                    <Card key={config.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{config.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {config.mappings.length} field mappings
                            </p>
                          </div>
                          <Badge
                            variant={config.isActive ? 'default' : 'secondary'}
                          >
                            {config.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Synchronization History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">
                Sync history will appear here once integrations are active.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default FieldIntegration;
