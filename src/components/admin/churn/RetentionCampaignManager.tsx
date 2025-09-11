'use client';

import React, { useState, useMemo } from 'react';
import {
  RetentionCampaignManagerProps,
  RetentionCampaign,
  CampaignStatus,
  RetentionCampaignType,
  ChurnRiskLevel,
  RetentionCampaignTemplate,
  CreateRetentionCampaignRequest,
} from '@/types/churn-intelligence';
import { Card } from '@/components/ui/card-untitled';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Play,
  Pause,
  Square,
  BarChart3,
  Mail,
  Phone,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  Target,
  Edit,
  Copy,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function RetentionCampaignManager({
  activeCampaigns = [],
  campaignTemplates = [],
  onCampaignCreate,
  onCampaignUpdate,
  onCampaignPause,
  onCampaignStop,
}: RetentionCampaignManagerProps) {
  const [selectedCampaign, setSelectedCampaign] =
    useState<RetentionCampaign | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<RetentionCampaignTemplate | null>(null);
  const [viewMode, setViewMode] = useState<
    'list' | 'performance' | 'templates'
  >('list');

  // Mock campaign templates
  const mockTemplates: RetentionCampaignTemplate[] = useMemo(
    () => [
      {
        id: 'template-1',
        name: 'Re-engagement Series',
        campaignType: RetentionCampaignType.RE_ENGAGEMENT,
        description: 'Multi-touch campaign to re-engage inactive suppliers',
        emailSubject: "We miss you! Here's what you've been missing...",
        emailTemplate:
          'Personalized re-engagement email with feature highlights',
        defaultRiskLevels: [ChurnRiskLevel.ATTENTION, ChurnRiskLevel.HIGH_RISK],
        defaultSupplierTypes: ['photographer', 'venue', 'planner'],
        expectedOpenRate: 35,
        expectedResponseRate: 15,
        expectedSaveRate: 42,
        isActive: true,
        usageCount: 23,
        averagePerformance: 38.5,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-12-01'),
      },
      {
        id: 'template-2',
        name: 'Payment Recovery',
        campaignType: RetentionCampaignType.DISCOUNT_OFFER,
        description: 'Targeted discount offers for payment-related churn risks',
        emailSubject: 'Save 25% on your subscription - Limited Time',
        discountSettings: {
          percentage: 25,
          validDays: 14,
          minimumSpend: 50,
        },
        defaultRiskLevels: [ChurnRiskLevel.HIGH_RISK, ChurnRiskLevel.CRITICAL],
        defaultSupplierTypes: ['photographer', 'venue'],
        expectedOpenRate: 52,
        expectedResponseRate: 28,
        expectedSaveRate: 65,
        isActive: true,
        usageCount: 15,
        averagePerformance: 61.3,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-11-15'),
      },
      {
        id: 'template-3',
        name: 'Personal Outreach',
        campaignType: RetentionCampaignType.PERSONAL_OUTREACH,
        description: 'High-touch personal calls for critical risk suppliers',
        callScriptTemplate:
          'Empathetic check-in with solution-focused approach',
        defaultRiskLevels: [ChurnRiskLevel.CRITICAL],
        defaultSupplierTypes: ['all'],
        expectedOpenRate: 85,
        expectedResponseRate: 72,
        expectedSaveRate: 78,
        isActive: true,
        usageCount: 8,
        averagePerformance: 75.2,
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-12-10'),
      },
    ],
    [],
  );

  // Combine mock templates with provided templates
  const allTemplates = [...campaignTemplates, ...mockTemplates];

  // Campaign performance data for charts
  const campaignPerformanceData = useMemo(() => {
    return activeCampaigns.map((campaign) => ({
      name:
        campaign.name.length > 15
          ? campaign.name.substring(0, 15) + '...'
          : campaign.name,
      targeted: campaign.targetedSuppliers,
      emails: campaign.emailsSent,
      opened: Math.round(campaign.emailsSent * (campaign.emailOpenRate / 100)),
      clicked: Math.round(
        campaign.emailsSent * (campaign.emailClickRate / 100),
      ),
      retained: campaign.suppliersRetained,
      saveRate: campaign.saveRate,
      roi: campaign.roiCalculated,
    }));
  }, [activeCampaigns]);

  const handleCreateCampaign = () => {
    if (!selectedTemplate) {
      toast.error('Please select a template first');
      return;
    }

    const newCampaign: CreateRetentionCampaignRequest = {
      name: `${selectedTemplate.name} - ${format(new Date(), 'MMM dd')}`,
      campaignType: selectedTemplate.campaignType,
      targetRiskLevel: selectedTemplate.defaultRiskLevels,
      targetSupplierTypes: selectedTemplate.defaultSupplierTypes,
      campaignContent: {
        emailTemplate: selectedTemplate.emailTemplate,
        discountPercentage: selectedTemplate.discountSettings?.percentage,
        callScript: selectedTemplate.callScriptTemplate,
      },
      executionSettings: {
        startDate: new Date(),
        autoExecute: false,
        frequency: 'once',
      },
    };

    onCampaignCreate(newCampaign);
    setShowCreateModal(false);
    setSelectedTemplate(null);
    toast.success('Campaign created successfully');
  };

  const getCampaignStatusColor = (status: CampaignStatus) => {
    switch (status) {
      case CampaignStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case CampaignStatus.PAUSED:
        return 'bg-yellow-100 text-yellow-800';
      case CampaignStatus.COMPLETED:
        return 'bg-blue-100 text-blue-800';
      case CampaignStatus.DRAFT:
        return 'bg-gray-100 text-gray-800';
      case CampaignStatus.ARCHIVED:
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCampaignTypeIcon = (type: RetentionCampaignType) => {
    switch (type) {
      case RetentionCampaignType.RE_ENGAGEMENT:
        return <Mail className="h-4 w-4" />;
      case RetentionCampaignType.DISCOUNT_OFFER:
        return <DollarSign className="h-4 w-4" />;
      case RetentionCampaignType.PERSONAL_OUTREACH:
        return <Phone className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card variant="default" padding="sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Retention Campaign Manager
            </h3>
            <p className="text-sm text-gray-600">
              Create and monitor retention campaigns
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {[
                { key: 'list', label: 'Campaigns' },
                { key: 'performance', label: 'Performance' },
                { key: 'templates', label: 'Templates' },
              ].map(({ key, label }) => (
                <Button
                  key={key}
                  variant={viewMode === key ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode(key as any)}
                  className="text-xs"
                >
                  {label}
                </Button>
              ))}
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </div>
        </div>
      </Card>

      {/* Campaign List View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {activeCampaigns.length === 0 ? (
            <Card variant="default" padding="lg">
              <div className="text-center py-12">
                <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Active Campaigns
                </h3>
                <p className="text-gray-600 mb-4">
                  Create your first retention campaign to start saving at-risk
                  suppliers.
                </p>
                <Button
                  variant="primary"
                  onClick={() => setShowCreateModal(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Campaign
                </Button>
              </div>
            </Card>
          ) : (
            activeCampaigns.map((campaign) => (
              <Card key={campaign.id} variant="default" padding="md">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      {getCampaignTypeIcon(campaign.campaignType)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {campaign.name}
                        </h4>
                        <Badge
                          className={getCampaignStatusColor(campaign.status)}
                        >
                          {campaign.status}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">
                        {campaign.description}
                      </p>

                      {/* Campaign Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {campaign.targetedSuppliers}
                            </div>
                            <div className="text-xs text-gray-600">
                              Targeted
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {campaign.emailOpenRate.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-600">
                              Open Rate
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-purple-500" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {campaign.saveRate.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-600">
                              Save Rate
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-orange-500" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              ${(campaign.roiCalculated || 0).toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-600">ROI</div>
                          </div>
                        </div>
                      </div>

                      {/* Campaign Timeline */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Started: {format(campaign.startDate, 'MMM dd, yyyy')}
                        </div>
                        {campaign.endDate && (
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            Ends: {format(campaign.endDate, 'MMM dd, yyyy')}
                          </div>
                        )}
                        <div>
                          Duration:{' '}
                          {campaign.endDate
                            ? `${differenceInDays(campaign.endDate, campaign.startDate)} days`
                            : 'Ongoing'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Campaign Controls */}
                  <div className="flex items-center gap-2">
                    {campaign.status === CampaignStatus.ACTIVE && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onCampaignPause(campaign.id)}
                        className="gap-1"
                      >
                        <Pause className="h-3 w-3" />
                        Pause
                      </Button>
                    )}

                    {campaign.status === CampaignStatus.PAUSED && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          onCampaignUpdate(campaign.id, {
                            status: CampaignStatus.ACTIVE,
                          })
                        }
                        className="gap-1"
                      >
                        <Play className="h-3 w-3" />
                        Resume
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCampaign(campaign)}
                      className="gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>

                    <Button
                      variant="tertiary"
                      size="sm"
                      onClick={() => onCampaignStop(campaign.id)}
                      className="gap-1"
                    >
                      <Square className="h-3 w-3" />
                      Stop
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Performance View */}
      {viewMode === 'performance' && (
        <div className="space-y-6">
          {/* Performance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card variant="default" padding="md">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {activeCampaigns.reduce(
                      (sum, c) => sum + c.targetedSuppliers,
                      0,
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Total Targeted</div>
                </div>
              </div>
            </Card>

            <Card variant="default" padding="md">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {activeCampaigns.reduce(
                      (sum, c) => sum + c.suppliersRetained,
                      0,
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Suppliers Saved</div>
                </div>
              </div>
            </Card>

            <Card variant="default" padding="md">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {activeCampaigns.length > 0
                      ? (
                          activeCampaigns.reduce(
                            (sum, c) => sum + c.saveRate,
                            0,
                          ) / activeCampaigns.length
                        ).toFixed(1)
                      : 0}
                    %
                  </div>
                  <div className="text-sm text-gray-600">Avg Save Rate</div>
                </div>
              </div>
            </Card>

            <Card variant="default" padding="md">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    $
                    {(
                      activeCampaigns.reduce(
                        (sum, c) => sum + c.revenueRetained,
                        0,
                      ) / 1000
                    ).toFixed(0)}
                    K
                  </div>
                  <div className="text-sm text-gray-600">Revenue Saved</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Performance Chart */}
          <Card variant="default" padding="md">
            <h4 className="text-base font-semibold text-gray-900 mb-4">
              Campaign Performance Comparison
            </h4>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={campaignPerformanceData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Bar dataKey="targeted" fill="#93c5fd" name="Targeted" />
                  <Bar dataKey="retained" fill="#22c55e" name="Retained" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Templates View */}
      {viewMode === 'templates' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTemplates.map((template) => (
              <Card
                key={template.id}
                variant="default"
                padding="md"
                interactive={true}
                className={cn(
                  'cursor-pointer transition-all duration-200',
                  selectedTemplate?.id === template.id
                    ? 'ring-2 ring-primary-200 bg-primary-25'
                    : '',
                )}
                onClick={() => setSelectedTemplate(template)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getCampaignTypeIcon(template.campaignType)}
                    <h4 className="font-medium text-gray-900">
                      {template.name}
                    </h4>
                  </div>

                  <Badge
                    className={cn(
                      'text-xs',
                      template.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600',
                    )}
                  >
                    {template.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  {template.description}
                </p>

                {/* Template Performance */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-700">
                      {template.expectedSaveRate}%
                    </div>
                    <div className="text-xs text-gray-600">Save Rate</div>
                  </div>

                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-700">
                      {template.expectedOpenRate}%
                    </div>
                    <div className="text-xs text-gray-600">Open Rate</div>
                  </div>

                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-700">
                      {template.usageCount}
                    </div>
                    <div className="text-xs text-gray-600">Times Used</div>
                  </div>
                </div>

                {/* Template Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTemplate(template);
                      setShowCreateModal(true);
                    }}
                    className="gap-1 flex-1"
                  >
                    <Plus className="h-3 w-3" />
                    Use Template
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Copy template functionality
                      toast.success('Template copied');
                    }}
                    className="gap-1"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center">
          <Card variant="default" padding="lg" className="max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Create Retention Campaign
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(false)}
                className="p-1"
              >
                ×
              </Button>
            </div>

            {selectedTemplate && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    {getCampaignTypeIcon(selectedTemplate.campaignType)}
                    <span className="font-medium text-blue-900">
                      {selectedTemplate.name}
                    </span>
                  </div>
                  <p className="text-sm text-blue-700">
                    {selectedTemplate.description}
                  </p>

                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="text-center">
                      <div className="text-sm font-bold text-blue-900">
                        {selectedTemplate.expectedSaveRate}%
                      </div>
                      <div className="text-xs text-blue-600">
                        Expected Save Rate
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-blue-900">
                        {selectedTemplate.expectedOpenRate}%
                      </div>
                      <div className="text-xs text-blue-600">
                        Expected Open Rate
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-blue-900">
                        {selectedTemplate.usageCount}
                      </div>
                      <div className="text-xs text-blue-600">Previous Uses</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    onClick={handleCreateCampaign}
                    className="flex-1 gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Campaign
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!selectedTemplate && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Select a template to get started:
                </p>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {allTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={cn(
                        'p-3 border rounded-lg cursor-pointer transition-all duration-200',
                        selectedTemplate?.id === template.id
                          ? 'border-primary-300 bg-primary-25'
                          : 'border-gray-200 hover:border-gray-300',
                      )}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getCampaignTypeIcon(template.campaignType)}
                          <span className="font-medium text-gray-900">
                            {template.name}
                          </span>
                        </div>
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          {template.expectedSaveRate}% save rate
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    onClick={handleCreateCampaign}
                    disabled={!selectedTemplate}
                    className="flex-1 gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Campaign
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
