'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Play,
  Pause,
  Edit,
  Trash2,
  BarChart3,
  Users,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import CampaignBuilder from './CampaignBuilder';
import CampaignAnalytics from './CampaignAnalytics';
import SegmentManager from './SegmentManager';

interface Campaign {
  id: string;
  name: string;
  description: string;
  campaign_type: 'email' | 'sms' | 'mixed' | 'drip' | 'trigger';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_converted: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  conversion_rate: number;
  created_at: string;
  started_at?: string;
  ended_at?: string;
}

interface CampaignStats {
  total_campaigns: number;
  active_campaigns: number;
  total_sent: number;
  average_open_rate: number;
  average_click_rate: number;
  average_conversion_rate: number;
}

const CampaignDashboard: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null,
  );
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSegments, setShowSegments] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaigns();
    fetchStats();
  }, [statusFilter, typeFilter]);

  const fetchCampaigns = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);

      const response = await fetch(
        `/api/marketing/campaigns?${params.toString()}`,
      );
      if (!response.ok) throw new Error('Failed to fetch campaigns');

      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch campaigns',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/marketing/campaigns/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCampaignAction = async (campaignId: string, action: string) => {
    try {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });

      if (!response.ok) throw new Error(`Failed to ${action} campaign`);

      toast({
        title: 'Success',
        description: `Campaign ${action}d successfully`,
      });

      fetchCampaigns();
    } catch (error) {
      console.error(`Error ${action}ing campaign:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${action} campaign`,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete campaign');

      toast({
        title: 'Success',
        description: 'Campaign deleted successfully',
      });

      fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete campaign',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      email: <Mail className="w-4 h-4" />,
      sms: <MessageSquare className="w-4 h-4" />,
      mixed: (
        <div className="w-4 h-4 flex">
          <Mail className="w-2 h-2" />
          <MessageSquare className="w-2 h-2" />
        </div>
      ),
      drip: <BarChart3 className="w-4 h-4" />,
      trigger: <Play className="w-4 h-4" />,
    };
    return icons[type as keyof typeof icons] || <Mail className="w-4 h-4" />;
  };

  const filteredCampaigns = campaigns.filter(
    (campaign) =>
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Marketing Automation</h1>
          <p className="text-muted-foreground">
            Create and manage automated marketing campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSegments(true)}>
            <Users className="w-4 h-4 mr-2" />
            Segments
          </Button>
          <Button variant="outline" onClick={() => setShowAnalytics(true)}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          <Button onClick={() => setShowCampaignBuilder(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Total Campaigns</p>
                  <p className="text-2xl font-bold">{stats.total_campaigns}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Play className="w-4 h-4 text-green-600" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-2xl font-bold">{stats.active_campaigns}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Total Sent</p>
                  <p className="text-2xl font-bold">
                    {stats.total_sent.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Avg Open Rate</p>
                <p className="text-2xl font-bold">
                  {(stats.average_open_rate * 100).toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Avg Click Rate</p>
                <p className="text-2xl font-bold">
                  {(stats.average_click_rate * 100).toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Avg Conversion</p>
                <p className="text-2xl font-bold">
                  {(stats.average_conversion_rate * 100).toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="mixed">Mixed</SelectItem>
            <SelectItem value="drip">Drip</SelectItem>
            <SelectItem value="trigger">Trigger</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Campaigns List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCampaigns.map((campaign) => (
          <Card key={campaign.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getTypeIcon(campaign.campaign_type)}
                    {campaign.name}
                  </CardTitle>
                  <CardDescription>{campaign.description}</CardDescription>
                </div>
                <Badge className={getStatusColor(campaign.status)}>
                  {campaign.status.charAt(0).toUpperCase() +
                    campaign.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Sent</p>
                    <p className="font-semibold">
                      {campaign.total_sent.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Open Rate</p>
                    <p className="font-semibold">
                      {(campaign.open_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Click Rate</p>
                    <p className="font-semibold">
                      {(campaign.click_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Conversion</p>
                    <p className="font-semibold">
                      {(campaign.conversion_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCampaign(campaign);
                      setShowCampaignBuilder(true);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>

                  {campaign.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() =>
                        handleCampaignAction(campaign.id, 'active')
                      }
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Start
                    </Button>
                  )}

                  {campaign.status === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleCampaignAction(campaign.id, 'paused')
                      }
                    >
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </Button>
                  )}

                  {campaign.status === 'paused' && (
                    <Button
                      size="sm"
                      onClick={() =>
                        handleCampaignAction(campaign.id, 'active')
                      }
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Resume
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCampaign(campaign.id)}
                    disabled={campaign.status === 'active'}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredCampaigns.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No campaigns found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first marketing campaign to get started'}
            </p>
            {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
              <Button onClick={() => setShowCampaignBuilder(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <Dialog
        open={showCampaignBuilder}
        onOpenChange={(open) => {
          setShowCampaignBuilder(open);
          if (!open) {
            setSelectedCampaign(null);
          }
        }}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCampaign ? 'Edit Campaign' : 'Create New Campaign'}
            </DialogTitle>
          </DialogHeader>
          <CampaignBuilder
            campaign={selectedCampaign}
            onSave={() => {
              setShowCampaignBuilder(false);
              setSelectedCampaign(null);
              fetchCampaigns();
            }}
            onCancel={() => {
              setShowCampaignBuilder(false);
              setSelectedCampaign(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Marketing Analytics</DialogTitle>
          </DialogHeader>
          <CampaignAnalytics />
        </DialogContent>
      </Dialog>

      <Dialog open={showSegments} onOpenChange={setShowSegments}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Segments</DialogTitle>
          </DialogHeader>
          <SegmentManager />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignDashboard;
