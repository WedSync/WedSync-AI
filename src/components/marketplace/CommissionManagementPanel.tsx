'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  Percent,
  Users,
  TrendingUp,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  History,
  Calculator,
} from 'lucide-react';

interface CommissionTier {
  tier: string;
  salesThreshold: number;
  commissionRate: number;
  activeCreators: number;
  description: string;
}

interface CreatorCommissionData {
  id: string;
  name: string;
  currentTier: string;
  totalSales: number;
  currentRate: number;
  customRate?: number;
  totalEarnings: number;
  joinedDate: string;
  status: 'active' | 'pending' | 'suspended';
}

interface Props {
  creatorsCount: number;
  avgCommissionRate: number;
  onRateUpdate: () => void;
}

export function CommissionManagementPanel({
  creatorsCount,
  avgCommissionRate,
  onRateUpdate,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tiers');
  const [selectedCreator, setSelectedCreator] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');

  // Mock commission tiers data
  const [commissionTiers, setCommissionTiers] = useState<CommissionTier[]>([
    {
      tier: 'Standard',
      salesThreshold: 0,
      commissionRate: 0.3,
      activeCreators: 28,
      description: 'Default rate for new creators',
    },
    {
      tier: 'Volume Tier 1',
      salesThreshold: 10,
      commissionRate: 0.28,
      activeCreators: 18,
      description: '10+ template sales',
    },
    {
      tier: 'Volume Tier 2',
      salesThreshold: 50,
      commissionRate: 0.25,
      activeCreators: 12,
      description: '50+ template sales',
    },
    {
      tier: 'Volume Tier 3',
      salesThreshold: 100,
      commissionRate: 0.2,
      activeCreators: 6,
      description: '100+ template sales',
    },
  ]);

  // Mock creators data
  const [creatorsData] = useState<CreatorCommissionData[]>([
    {
      id: '1',
      name: 'Sarah Photography',
      currentTier: 'Volume Tier 2',
      totalSales: 67,
      currentRate: 0.25,
      totalEarnings: 15670,
      joinedDate: '2024-03-15',
      status: 'active',
    },
    {
      id: '2',
      name: 'Marcus Venues',
      currentTier: 'Volume Tier 1',
      totalSales: 23,
      currentRate: 0.28,
      totalEarnings: 12450,
      joinedDate: '2024-05-20',
      status: 'active',
    },
    {
      id: '3',
      name: 'Emma Coordination',
      currentTier: 'Standard',
      totalSales: 8,
      currentRate: 0.3,
      customRate: 0.28,
      totalEarnings: 8760,
      joinedDate: '2024-08-10',
      status: 'active',
    },
    {
      id: '4',
      name: 'Wedding Pro Solutions',
      currentTier: 'Volume Tier 3',
      totalSales: 156,
      currentRate: 0.2,
      totalEarnings: 24890,
      joinedDate: '2023-11-30',
      status: 'active',
    },
    {
      id: '5',
      name: 'Digital Wedding Tools',
      currentTier: 'Volume Tier 1',
      totalSales: 34,
      currentRate: 0.28,
      totalEarnings: 11200,
      joinedDate: '2024-06-12',
      status: 'active',
    },
  ]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount / 100);
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleTierUpdate = async (
    tierIndex: number,
    field: keyof CommissionTier,
    value: number,
  ) => {
    setLoading(true);
    setSaveStatus('saving');

    try {
      const updatedTiers = [...commissionTiers];
      updatedTiers[tierIndex] = { ...updatedTiers[tierIndex], [field]: value };

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setCommissionTiers(updatedTiers);
      setSaveStatus('saved');
      onRateUpdate();

      // Reset save status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAdjustment = async (adjustment: number) => {
    setLoading(true);
    setSaveStatus('saving');

    try {
      // Simulate bulk rate adjustment API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const updatedTiers = commissionTiers.map((tier) => ({
        ...tier,
        commissionRate: Math.max(
          0.15,
          Math.min(0.35, tier.commissionRate + adjustment),
        ),
      }));

      setCommissionTiers(updatedTiers);
      setSaveStatus('saved');
      onRateUpdate();

      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const calculateCreatorTier = (sales: number): string => {
    if (sales >= 100) return 'Volume Tier 3';
    if (sales >= 50) return 'Volume Tier 2';
    if (sales >= 10) return 'Volume Tier 1';
    return 'Standard';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Commission Management</h2>
          <p className="text-gray-600">
            Manage commission rates and creator tiers
          </p>
        </div>

        {saveStatus !== 'idle' && (
          <Alert
            className={`w-auto ${
              saveStatus === 'saved'
                ? 'border-green-200 bg-green-50'
                : saveStatus === 'error'
                  ? 'border-red-200 bg-red-50'
                  : 'border-blue-200 bg-blue-50'
            }`}
          >
            <div className="flex items-center gap-2">
              {saveStatus === 'saving' && (
                <RefreshCw className="h-4 w-4 animate-spin" />
              )}
              {saveStatus === 'saved' && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              {saveStatus === 'error' && (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription>
                {saveStatus === 'saving' && 'Saving changes...'}
                {saveStatus === 'saved' && 'Changes saved successfully'}
                {saveStatus === 'error' && 'Failed to save changes'}
              </AlertDescription>
            </div>
          </Alert>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tiers">Commission Tiers</TabsTrigger>
          <TabsTrigger value="creators">Individual Creators</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Actions</TabsTrigger>
          <TabsTrigger value="calculator">Rate Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="tiers">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Commission Rate Structure
                </CardTitle>
                <CardDescription>
                  Volume-based commission tiers with automatic progression
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {commissionTiers.map((tier, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div>
                          <div className="font-semibold">{tier.tier}</div>
                          <div className="text-sm text-gray-500">
                            {tier.description}
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm">Sales Threshold</Label>
                          <Input
                            type="number"
                            value={tier.salesThreshold}
                            onChange={(e) =>
                              handleTierUpdate(
                                index,
                                'salesThreshold',
                                parseInt(e.target.value),
                              )
                            }
                            className="mt-1"
                            min="0"
                          />
                        </div>

                        <div>
                          <Label className="text-sm">Commission Rate</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              type="number"
                              value={(tier.commissionRate * 100).toFixed(1)}
                              onChange={(e) =>
                                handleTierUpdate(
                                  index,
                                  'commissionRate',
                                  parseFloat(e.target.value) / 100,
                                )
                              }
                              step="0.1"
                              min="15"
                              max="35"
                              className="w-20"
                            />
                            <span className="text-sm text-gray-500">%</span>
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="text-lg font-bold">
                            {tier.activeCreators}
                          </div>
                          <div className="text-sm text-gray-500">
                            Active Creators
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-6" />

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">
                      Average Commission Rate
                    </div>
                    <div className="text-2xl font-bold">
                      {formatPercentage(avgCommissionRate)}
                    </div>
                  </div>
                  <Button onClick={() => onRateUpdate()} disabled={loading}>
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
                    />
                    Recalculate
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="creators">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Creator Commission Settings
              </CardTitle>
              <CardDescription>
                Manage individual creator commission rates and custom
                adjustments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {creatorsData.map((creator) => (
                  <div key={creator.id} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                      <div>
                        <div className="font-semibold">{creator.name}</div>
                        <div className="text-sm text-gray-500">
                          Joined {formatDate(creator.joinedDate)}
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {creator.totalSales}
                        </div>
                        <div className="text-sm text-gray-500">Sales</div>
                      </div>

                      <div>
                        <Badge
                          variant={
                            creator.currentTier === 'Volume Tier 3'
                              ? 'default'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {creator.currentTier}
                        </Badge>
                      </div>

                      <div className="text-center">
                        <div className="font-semibold">
                          {formatPercentage(creator.currentRate)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Current Rate
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="font-semibold">
                          {formatCurrency(creator.totalEarnings)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Total Earnings
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {creator.customRate && (
                          <Badge variant="outline" className="text-xs">
                            Custom Rate
                          </Badge>
                        )}
                        <Badge
                          variant={
                            creator.status === 'active'
                              ? 'default'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {creator.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Bulk Rate Adjustments
              </CardTitle>
              <CardDescription>
                Apply commission rate changes across multiple creators or tiers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Bulk adjustments will affect all commission tiers. Use with
                  caution.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleBulkAdjustment(-0.01)}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <TrendingUp className="h-4 w-4 rotate-180" />
                  Reduce All by 1%
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleBulkAdjustment(-0.005)}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <TrendingUp className="h-4 w-4 rotate-180" />
                  Reduce All by 0.5%
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleBulkAdjustment(0.005)}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  Increase All by 0.5%
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="text-lg font-semibold">Commission History</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">
                        Standard tier rate adjusted
                      </div>
                      <div className="text-sm text-gray-500">30.0% → 28.0%</div>
                    </div>
                    <div className="text-sm text-gray-500">2 days ago</div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">Volume Tier 3 created</div>
                      <div className="text-sm text-gray-500">
                        Added 20% rate for 100+ sales
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">1 week ago</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculator">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Commission Rate Calculator
              </CardTitle>
              <CardDescription>
                Calculate the impact of rate changes on creator earnings and
                platform revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Template Price (GBP)</Label>
                    <Input type="number" placeholder="49.99" />
                  </div>
                  <div>
                    <Label>Expected Monthly Sales</Label>
                    <Input type="number" placeholder="25" />
                  </div>
                  <div>
                    <Label>Commission Rate (%)</Label>
                    <Input type="number" placeholder="28.0" />
                  </div>
                  <Button>Calculate Earnings</Button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded">
                    <div className="text-sm text-gray-600">
                      Creator Monthly Earnings
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      £899.82
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <div className="text-sm text-gray-600">
                      Platform Commission
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      £349.93
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <div className="text-sm text-gray-600">Total Revenue</div>
                    <div className="text-2xl font-bold">£1,249.75</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
