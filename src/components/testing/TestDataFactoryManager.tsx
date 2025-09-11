'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Database,
  Users,
  Heart,
  Calendar,
  Camera,
  MapPin,
  Flower,
  ChefHat,
  Music,
  Car,
  Gift,
  PlayCircle,
  Download,
  Upload,
  RefreshCw,
  Settings,
  Trash2,
  Copy,
  CheckCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';

export interface DataFactory {
  id: string;
  name: string;
  description: string;
  category: DataCategory;
  isActive: boolean;
  configuration: FactoryConfiguration;
  generatedDataCount: number;
  lastGenerated: Date;
  performance: FactoryPerformance;
  templates: DataTemplate[];
  weddingScenarios: WeddingDataScenario[];
}

export interface FactoryConfiguration {
  dataSize: number;
  generateRealData: boolean;
  includeRelationships: boolean;
  seedValue?: number;
  outputFormat: 'json' | 'csv' | 'sql' | 'xml';
  locale: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  customRules: CustomRule[];
}

export interface DataTemplate {
  id: string;
  name: string;
  schema: FieldSchema[];
  sampleData?: any[];
  isDefault: boolean;
  weddingContext?: WeddingTemplateContext;
}

export interface FieldSchema {
  name: string;
  type: FieldType;
  required: boolean;
  constraints?: FieldConstraints;
  generator: DataGenerator;
  weddingSpecific?: boolean;
}

export interface FieldConstraints {
  min?: number;
  max?: number;
  pattern?: string;
  enum?: string[];
  unique?: boolean;
}

export interface DataGenerator {
  type: GeneratorType;
  parameters?: Record<string, any>;
  customFunction?: string;
}

export interface WeddingDataScenario {
  id: string;
  name: string;
  description: string;
  supplierTypes: SupplierType[];
  coupleProfile: CoupleDataProfile;
  guestCount: number;
  venueType: string;
  season: Season;
  complexity: 'simple' | 'moderate' | 'complex';
  dataRequirements: DataRequirement[];
}

export interface CoupleDataProfile {
  names: string[];
  relationship: string;
  ageRange: string;
  budget: number;
  preferences: string[];
  communicationStyle: string;
}

export interface DataRequirement {
  entity: string;
  count: number;
  relationships: string[];
  constraints: Record<string, any>;
}

export interface FactoryPerformance {
  averageGenerationTime: number;
  successRate: number;
  errorCount: number;
  lastError?: string;
  throughput: number;
}

export interface WeddingTemplateContext {
  supplierType?: SupplierType;
  guestCategory?: string;
  weddingPhase?: WeddingPhase;
  dataRelations?: string[];
}

export interface CustomRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  priority: number;
}

export type DataCategory =
  | 'suppliers'
  | 'couples'
  | 'weddings'
  | 'guests'
  | 'bookings'
  | 'payments'
  | 'communications'
  | 'integrations';
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'email'
  | 'phone'
  | 'address'
  | 'name'
  | 'uuid'
  | 'enum';
export type GeneratorType =
  | 'faker'
  | 'sequence'
  | 'random'
  | 'template'
  | 'wedding-specific'
  | 'custom';
export type SupplierType =
  | 'photographer'
  | 'venue'
  | 'florist'
  | 'caterer'
  | 'musician'
  | 'transport'
  | 'other';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type WeddingPhase =
  | 'planning'
  | 'coordination'
  | 'wedding-day'
  | 'post-wedding';

export interface TestDataFactoryManagerProps {
  factories: DataFactory[];
  onGenerateData: (
    factoryId: string,
    config: Partial<FactoryConfiguration>,
  ) => void;
  onCreateFactory: (factory: Partial<DataFactory>) => void;
  onUpdateFactory: (factoryId: string, updates: Partial<DataFactory>) => void;
  onDeleteFactory: (factoryId: string) => void;
  onExportData: (factoryId: string, format: string) => void;
  onImportTemplate: (factoryId: string, template: DataTemplate) => void;
  className?: string;
}

const TestDataFactoryManager: React.FC<TestDataFactoryManagerProps> = ({
  factories,
  onGenerateData,
  onCreateFactory,
  onUpdateFactory,
  onDeleteFactory,
  onExportData,
  onImportTemplate,
  className,
}) => {
  const [selectedFactory, setSelectedFactory] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<DataCategory | 'all'>(
    'all',
  );
  const [newFactory, setNewFactory] = useState<Partial<DataFactory>>({});

  const getCategoryIcon = (category: DataCategory) => {
    switch (category) {
      case 'suppliers':
        return <Camera className="h-4 w-4 text-blue-500" />;
      case 'couples':
        return <Heart className="h-4 w-4 text-rose-500" />;
      case 'weddings':
        return <Calendar className="h-4 w-4 text-purple-500" />;
      case 'guests':
        return <Users className="h-4 w-4 text-green-500" />;
      case 'bookings':
        return <MapPin className="h-4 w-4 text-orange-500" />;
      case 'payments':
        return <Gift className="h-4 w-4 text-yellow-500" />;
      case 'communications':
        return <Music className="h-4 w-4 text-indigo-500" />;
      case 'integrations':
        return <Database className="h-4 w-4 text-gray-500" />;
      default:
        return <Database className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSupplierIcon = (type: SupplierType) => {
    switch (type) {
      case 'photographer':
        return <Camera className="h-4 w-4 text-blue-500" />;
      case 'venue':
        return <MapPin className="h-4 w-4 text-green-500" />;
      case 'florist':
        return <Flower className="h-4 w-4 text-pink-500" />;
      case 'caterer':
        return <ChefHat className="h-4 w-4 text-orange-500" />;
      case 'musician':
        return <Music className="h-4 w-4 text-purple-500" />;
      case 'transport':
        return <Car className="h-4 w-4 text-gray-500" />;
      default:
        return <Gift className="h-4 w-4 text-indigo-500" />;
    }
  };

  const getFilteredFactories = () => {
    return factories.filter((factory) => {
      if (categoryFilter !== 'all' && factory.category !== categoryFilter)
        return false;
      return true;
    });
  };

  const getOverallStats = () => {
    const totalFactories = factories.length;
    const activeFactories = factories.filter((f) => f.isActive).length;
    const totalDataGenerated = factories.reduce(
      (acc, f) => acc + f.generatedDataCount,
      0,
    );
    const avgSuccessRate =
      factories.length > 0
        ? factories.reduce((acc, f) => acc + f.performance.successRate, 0) /
          factories.length
        : 0;

    return {
      total: totalFactories,
      active: activeFactories,
      generated: totalDataGenerated,
      successRate: avgSuccessRate,
    };
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const stats = getOverallStats();

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Test Data Factory Manager
          </h3>
          <p className="text-sm text-gray-600">
            Generate realistic wedding industry test data
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select
            value={categoryFilter}
            onValueChange={(value) => setCategoryFilter(value as any)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="suppliers">Suppliers</SelectItem>
              <SelectItem value="couples">Couples</SelectItem>
              <SelectItem value="weddings">Weddings</SelectItem>
              <SelectItem value="guests">Guests</SelectItem>
              <SelectItem value="bookings">Bookings</SelectItem>
              <SelectItem value="payments">Payments</SelectItem>
              <SelectItem value="communications">Communications</SelectItem>
              <SelectItem value="integrations">Integrations</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowCreateForm(true)}
          >
            Create Factory
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">
                  Total Factories
                </p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
              <Database className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Active</p>
                <p className="text-xl font-bold text-green-600">
                  {stats.active}
                </p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">
                  Data Generated
                </p>
                <p className="text-xl font-bold text-purple-600">
                  {formatNumber(stats.generated)}
                </p>
              </div>
              <PlayCircle className="h-6 w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">
                  Success Rate
                </p>
                <p className="text-xl font-bold text-yellow-600">
                  {stats.successRate.toFixed(1)}%
                </p>
              </div>
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Factories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {getFilteredFactories().map((factory) => (
          <Card
            key={factory.id}
            className={cn(
              'transition-all duration-200',
              selectedFactory === factory.id && 'ring-2 ring-blue-500',
              !factory.isActive && 'opacity-60',
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getCategoryIcon(factory.category)}
                  <div>
                    <CardTitle className="text-base">{factory.name}</CardTitle>
                    <p className="text-xs text-gray-600">
                      {factory.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={factory.isActive}
                    onCheckedChange={(active) =>
                      onUpdateFactory(factory.id, { isActive: active })
                    }
                  />
                  <Badge variant={factory.isActive ? 'default' : 'secondary'}>
                    {factory.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Factory Stats */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="font-medium">
                    {formatNumber(factory.generatedDataCount)}
                  </div>
                  <div className="text-gray-500">Generated</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="font-medium">
                    {factory.performance.successRate.toFixed(1)}%
                  </div>
                  <div className="text-gray-500">Success Rate</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="font-medium">
                    {factory.performance.averageGenerationTime}ms
                  </div>
                  <div className="text-gray-500">Avg Time</div>
                </div>
              </div>

              {/* Configuration Summary */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Data Size:</span>
                  <span className="ml-2 font-medium">
                    {formatNumber(factory.configuration.dataSize)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Format:</span>
                  <span className="ml-2 font-medium uppercase">
                    {factory.configuration.outputFormat}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Real Data:</span>
                  <span className="ml-2 font-medium">
                    {factory.configuration.generateRealData ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Templates:</span>
                  <span className="ml-2 font-medium">
                    {factory.templates.length}
                  </span>
                </div>
              </div>

              {/* Wedding Scenarios */}
              {factory.weddingScenarios.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 text-sm">
                    Wedding Scenarios ({factory.weddingScenarios.length})
                  </h4>
                  <div className="space-y-1">
                    {factory.weddingScenarios.slice(0, 2).map((scenario) => (
                      <div
                        key={scenario.id}
                        className="flex items-center justify-between text-xs p-2 bg-rose-50 rounded border border-rose-200"
                      >
                        <div className="flex items-center space-x-2">
                          <Heart className="h-3 w-3 text-rose-500" />
                          <span>{scenario.name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {scenario.supplierTypes.map((type) => (
                            <div key={type} className="flex items-center">
                              {getSupplierIcon(type)}
                            </div>
                          ))}
                          <Badge variant="outline" className="text-xs">
                            {scenario.complexity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {factory.weddingScenarios.length > 2 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{factory.weddingScenarios.length - 2} more scenarios
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Last Generation */}
              <div className="text-xs text-gray-600">
                Last generated: {factory.lastGenerated.toLocaleString()}
              </div>

              {/* Actions */}
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() =>
                      onGenerateData(factory.id, factory.configuration)
                    }
                    disabled={!factory.isActive}
                    className="text-xs"
                  >
                    <PlayCircle className="h-3 w-3 mr-1" />
                    Generate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedFactory(
                        selectedFactory === factory.id ? null : factory.id,
                      )
                    }
                    className="text-xs"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    {selectedFactory === factory.id ? 'Hide' : 'Config'}
                  </Button>
                </div>

                <div className="flex space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onExportData(
                        factory.id,
                        factory.configuration.outputFormat,
                      )
                    }
                    className="text-xs"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDeleteFactory(factory.id)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>

            {/* Expanded Configuration */}
            {selectedFactory === factory.id && (
              <CardContent className="pt-0 border-t">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">
                    Detailed Configuration
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Data Size</Label>
                      <Input
                        type="number"
                        value={factory.configuration.dataSize}
                        onChange={(e) => {
                          const newConfig = {
                            ...factory.configuration,
                            dataSize: parseInt(e.target.value),
                          };
                          onUpdateFactory(factory.id, {
                            configuration: newConfig,
                          });
                        }}
                      />
                    </div>
                    <div>
                      <Label>Output Format</Label>
                      <Select
                        value={factory.configuration.outputFormat}
                        onValueChange={(value) => {
                          const newConfig = {
                            ...factory.configuration,
                            outputFormat: value as any,
                          };
                          onUpdateFactory(factory.id, {
                            configuration: newConfig,
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="sql">SQL</SelectItem>
                          <SelectItem value="xml">XML</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={factory.configuration.generateRealData}
                      onCheckedChange={(checked) => {
                        const newConfig = {
                          ...factory.configuration,
                          generateRealData: checked,
                        };
                        onUpdateFactory(factory.id, {
                          configuration: newConfig,
                        });
                      }}
                    />
                    <Label>Generate Real Wedding Data</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={factory.configuration.includeRelationships}
                      onCheckedChange={(checked) => {
                        const newConfig = {
                          ...factory.configuration,
                          includeRelationships: checked,
                        };
                        onUpdateFactory(factory.id, {
                          configuration: newConfig,
                        });
                      }}
                    />
                    <Label>Include Data Relationships</Label>
                  </div>

                  {/* Templates */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Data Templates
                    </h4>
                    <div className="space-y-2">
                      {factory.templates.map((template) => (
                        <div
                          key={template.id}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div>
                            <span className="font-medium text-sm">
                              {template.name}
                            </span>
                            <span className="ml-2 text-xs text-gray-600">
                              {template.schema.length} fields
                            </span>
                            {template.isDefault && (
                              <Badge
                                variant="secondary"
                                className="ml-2 text-xs"
                              >
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {getFilteredFactories().length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              No data factories match the current filter
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              Create Your First Factory
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Factory Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-96 overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Create New Data Factory</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateForm(false)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Factory Name</Label>
                  <Input
                    value={newFactory.name || ''}
                    onChange={(e) =>
                      setNewFactory({ ...newFactory, name: e.target.value })
                    }
                    placeholder="e.g., Wedding Couples Generator"
                  />
                </div>

                <div>
                  <Label>Category</Label>
                  <Select
                    value={newFactory.category}
                    onValueChange={(value) =>
                      setNewFactory({ ...newFactory, category: value as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="suppliers">Suppliers</SelectItem>
                      <SelectItem value="couples">Couples</SelectItem>
                      <SelectItem value="weddings">Weddings</SelectItem>
                      <SelectItem value="guests">Guests</SelectItem>
                      <SelectItem value="bookings">Bookings</SelectItem>
                      <SelectItem value="payments">Payments</SelectItem>
                      <SelectItem value="communications">
                        Communications
                      </SelectItem>
                      <SelectItem value="integrations">Integrations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={newFactory.description || ''}
                  onChange={(e) =>
                    setNewFactory({
                      ...newFactory,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe what this factory generates..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    onCreateFactory(newFactory);
                    setNewFactory({});
                    setShowCreateForm(false);
                  }}
                >
                  Create Factory
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TestDataFactoryManager;
