'use client';

/**
 * Integration Test Example - WS-211 Team C
 * Demonstrates how TemplateIntegration, BrandingSync, and WidgetOrchestrator work together
 * This component shows the complete integration workflow
 */

import React, { useEffect, useState } from 'react';
import {
  TemplateIntegrationProvider,
  useTemplateIntegration,
  TemplateIntegrationStatus,
} from './TemplateIntegration';
import {
  BrandingSyncProvider,
  useBrandingSync,
  BrandingSyncStatus,
} from './BrandingSync';
import {
  WidgetOrchestratorProvider,
  useWidgetOrchestrator,
  WidgetOrchestratorStatus,
  WidgetWrapper,
} from './WidgetOrchestrator';
import { Button } from '@/components/ui/button-untitled';
import { Card } from '@/components/ui/card-untitled';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  Palette,
  Grid3x3,
  Zap,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { z } from 'zod';

// Example Widget for Testing
const ExampleWidget = ({
  instance,
  config,
  data,
  onUpdate,
  onEvent,
  orchestrator,
}: any) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Subscribe to messages from other widgets
    const unsubscribe = orchestrator.subscribeToMessages(
      instance.id,
      (message: any) => {
        if (message.action === 'increment') {
          setCount((prev) => prev + 1);
        }
      },
    );

    return unsubscribe;
  }, [instance.id, orchestrator]);

  const handleClick = () => {
    setCount((prev) => prev + 1);

    // Send event to orchestrator
    onEvent({
      instanceId: instance.id,
      type: 'interact',
      action: 'clicked',
      data: { count: count + 1 },
      source: 'user',
    });

    // Send message to other widgets
    orchestrator.sendMessage({
      type: 'broadcast',
      from: instance.id,
      action: 'increment',
      payload: { count: count + 1 },
    });
  };

  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <h3 className="font-medium text-gray-900 mb-2">
        {config.title || 'Example Widget'}
      </h3>
      <p className="text-sm text-gray-600 mb-3">
        Widget ID: {instance.id.slice(0, 8)}...
      </p>
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={handleClick}>
          Count: {count}
        </Button>
        <Badge variant="secondary">{instance.state.status}</Badge>
      </div>
      {data && (
        <pre className="mt-2 text-xs bg-gray-50 p-2 rounded">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
};

// Integration Test Dashboard
function IntegrationTestDashboard() {
  const templateIntegration = useTemplateIntegration();
  const brandingSync = useBrandingSync();
  const widgetOrchestrator = useWidgetOrchestrator();

  const [templates, setTemplates] = useState<any[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);
  const [instances, setInstances] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  // Initialize test data
  useEffect(() => {
    initializeTestEnvironment();
  }, []);

  const initializeTestEnvironment = async () => {
    try {
      // Register example widget
      widgetOrchestrator.registerWidget({
        id: 'example-widget',
        type: 'example',
        name: 'Example Widget',
        description: 'A simple test widget for integration testing',
        version: '1.0.0',
        component: ExampleWidget,
        defaultProps: {
          title: 'Test Widget',
          color: 'blue',
        },
        configSchema: z.object({
          title: z.string(),
          color: z.string(),
        }),
        category: 'display',
        tags: ['test', 'example'],
        requirements: {
          minWidth: 300,
          minHeight: 200,
          responsive: true,
        },
        stateful: true,
        persistent: false,
        refreshable: true,
        resizable: true,
        weddingStages: ['planning'],
        clientTypes: ['vendor'],
        loadPriority: 'normal',
        cacheStrategy: 'memory',
        permissions: [],
        dependencies: [],
      });

      // Load templates
      const templatesData = await templateIntegration.getTemplates();
      setTemplates(templatesData);

      // Load brand config
      await brandingSync.loadBrandConfig();

      setTestResults((prev) => ({ ...prev, initialization: true }));
    } catch (error) {
      console.error('Test initialization failed:', error);
      setTestResults((prev) => ({ ...prev, initialization: false }));
    }
  };

  const testTemplateOperations = async () => {
    try {
      // Test creating a template
      const templateId = await templateIntegration.createTemplate(
        {
          supplier_id: 'test-supplier',
          name: 'Test Template',
          description: 'Integration test template',
          category: 'standard',
          is_active: true,
          is_default: false,
          sort_order: 1,
          target_criteria: {},
          assignment_rules: [],
          brand_color: '#7F56D9',
          cache_duration_minutes: 5,
          priority_loading: false,
          usage_count: 0,
        },
        [
          {
            id: 'test-section-1',
            template_id: templateId,
            section_type: 'welcome',
            title: 'Welcome Section',
            description: 'Test welcome section',
            position_x: 0,
            position_y: 0,
            width: 12,
            height: 3,
            is_active: true,
            is_required: false,
            sort_order: 0,
            section_config: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      );

      // Test fetching the created template
      const template = await templateIntegration.getTemplate(templateId);
      setCurrentTemplate(template);

      setTestResults((prev) => ({ ...prev, templateOperations: true }));
    } catch (error) {
      console.error('Template operations test failed:', error);
      setTestResults((prev) => ({ ...prev, templateOperations: false }));
    }
  };

  const testBrandingSync = async () => {
    try {
      // Test applying branding
      if (currentTemplate) {
        await brandingSync.applyBrandToTemplate(currentTemplate.template.id);
      }

      // Test brand config validation
      const validation = brandingSync.validateBrandConfig({
        name: 'Test Brand',
        primary_color: '#7F56D9',
        secondary_color: '#667085',
        accent_color: '#F04438',
        text_color_primary: '#101828',
        text_color_secondary: '#667085',
        background_color: '#FFFFFF',
        font_primary: 'Inter, sans-serif',
        font_secondary: 'Inter, sans-serif',
        font_size_base: 16,
        font_weight_normal: 400,
        font_weight_bold: 600,
        line_height: 1.5,
        border_radius: 8,
        spacing_unit: 4,
        grid_gap: 16,
        section_padding: 24,
      });

      setTestResults((prev) => ({
        ...prev,
        brandingSync: Object.keys(validation).length === 0,
      }));
    } catch (error) {
      console.error('Branding sync test failed:', error);
      setTestResults((prev) => ({ ...prev, brandingSync: false }));
    }
  };

  const testWidgetOrchestrator = async () => {
    try {
      if (!currentTemplate) return;

      // Test creating widget instances
      const instanceId1 = await widgetOrchestrator.createInstance(
        'example-widget',
        currentTemplate.template.id,
        'test-section-1',
        { title: 'Widget 1', color: 'blue' },
      );

      const instanceId2 = await widgetOrchestrator.createInstance(
        'example-widget',
        currentTemplate.template.id,
        'test-section-1',
        { title: 'Widget 2', color: 'green' },
      );

      // Test getting instances
      const allInstances = widgetOrchestrator.getInstances(
        currentTemplate.template.id,
      );
      setInstances(allInstances);

      // Test widget communication
      widgetOrchestrator.sendMessage({
        type: 'broadcast',
        from: 'test-system',
        action: 'test-message',
        payload: { message: 'Hello from test system' },
      });

      // Test mounting instances
      await widgetOrchestrator.mountInstance(instanceId1);
      await widgetOrchestrator.mountInstance(instanceId2);

      setTestResults((prev) => ({ ...prev, widgetOrchestrator: true }));
    } catch (error) {
      console.error('Widget orchestrator test failed:', error);
      setTestResults((prev) => ({ ...prev, widgetOrchestrator: false }));
    }
  };

  const testFullIntegration = async () => {
    try {
      // Test all components working together
      await testTemplateOperations();
      await testBrandingSync();
      await testWidgetOrchestrator();

      // Test synchronization
      await templateIntegration.syncNow();

      setTestResults((prev) => ({ ...prev, fullIntegration: true }));
    } catch (error) {
      console.error('Full integration test failed:', error);
      setTestResults((prev) => ({ ...prev, fullIntegration: false }));
    }
  };

  const runAllTests = async () => {
    setTestResults({});
    await testTemplateOperations();
    await testBrandingSync();
    await testWidgetOrchestrator();
    await testFullIntegration();
  };

  const getTestIcon = (result: boolean | undefined) => {
    if (result === undefined)
      return <Loader2 className="h-4 w-4 animate-spin" />;
    return result ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-red-600" />
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Integration Test Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            WS-211 Team C - Template Integration Components
          </p>
        </div>

        <div className="flex gap-3">
          <Button onClick={runAllTests} leftIcon={<Zap className="h-4 w-4" />}>
            Run All Tests
          </Button>
          <Button
            variant="secondary"
            onClick={() => window.location.reload()}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Status Indicators */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Integration Status</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Template Integration</span>
            </div>
            <TemplateIntegrationStatus />
          </div>

          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-purple-600" />
              <span className="font-medium">Branding Sync</span>
            </div>
            <BrandingSyncStatus />
          </div>

          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Grid3x3 className="h-5 w-5 text-green-600" />
              <span className="font-medium">Widget Orchestrator</span>
            </div>
            <WidgetOrchestratorStatus />
          </div>
        </div>
      </Card>

      {/* Test Results */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Test Results</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { key: 'initialization', label: 'System Initialization' },
            { key: 'templateOperations', label: 'Template Operations' },
            { key: 'brandingSync', label: 'Branding Synchronization' },
            { key: 'widgetOrchestrator', label: 'Widget Orchestration' },
            { key: 'fullIntegration', label: 'Full Integration' },
          ].map((test) => (
            <div
              key={test.key}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <span className="font-medium">{test.label}</span>
              <div className="flex items-center gap-2">
                {getTestIcon(testResults[test.key])}
                <Badge
                  variant={
                    testResults[test.key]
                      ? 'success'
                      : testResults[test.key] === false
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {testResults[test.key] === undefined
                    ? 'Pending'
                    : testResults[test.key]
                      ? 'Pass'
                      : 'Fail'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Integration Demo */}
      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="widgets">Widgets</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Template Integration</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={testTemplateOperations}>
                  Test Template Operations
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => templateIntegration.refreshCache()}
                >
                  Refresh Cache
                </Button>
              </div>

              {currentTemplate && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Current Template</h4>
                  <p className="text-sm text-gray-600">
                    Name: {currentTemplate.template.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    Sections: {currentTemplate.sections.length}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Branding Sync</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={testBrandingSync}>Test Branding Sync</Button>
                <Button
                  variant="secondary"
                  onClick={() => brandingSync.loadBrandConfig()}
                >
                  Load Brand Config
                </Button>
              </div>

              {brandingSync.state.currentBrand && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Current Brand</h4>
                  <p className="text-sm text-gray-600">
                    Name: {brandingSync.state.currentBrand.name}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{
                        backgroundColor:
                          brandingSync.state.currentBrand.primary_color,
                      }}
                    />
                    <span className="text-xs text-gray-500">
                      {brandingSync.state.currentBrand.primary_color}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="widgets" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Widget Orchestrator</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={testWidgetOrchestrator}>
                  Test Widget Orchestration
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => widgetOrchestrator.refreshAllInstances()}
                >
                  Refresh All Widgets
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {instances.map((instance) => (
                  <WidgetWrapper key={instance.id} instanceId={instance.id} />
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Main Integration Test Component
export default function IntegrationTestExample() {
  const testSupplierId = 'test-supplier-123';
  const testTemplateId = 'test-template-123';

  return (
    <TemplateIntegrationProvider
      supplierId={testSupplierId}
      enableRealtime={true}
      cacheConfig={{
        defaultTtl: 5,
        maxCacheSize: 10,
        enablePersistence: false,
      }}
    >
      <BrandingSyncProvider
        supplierId={testSupplierId}
        enableRealtime={true}
        autoSync={true}
        validationLevel="moderate"
      >
        <WidgetOrchestratorProvider
          templateId={testTemplateId}
          supplierId={testSupplierId}
          enableCommunication={true}
          enablePerformanceTracking={true}
          errorBoundary={true}
        >
          <IntegrationTestDashboard />
        </WidgetOrchestratorProvider>
      </BrandingSyncProvider>
    </TemplateIntegrationProvider>
  );
}
