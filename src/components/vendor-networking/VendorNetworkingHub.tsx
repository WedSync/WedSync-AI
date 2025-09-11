'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  UserPlus,
  MessageSquare,
  TrendingUp,
  Search,
  Settings,
  Bell,
  Star,
  MapPin,
  Clock,
  ArrowRight,
  Handshake,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VendorConnection {
  id: string;
  status: 'pending' | 'connected' | 'declined';
  connection_type:
    | 'professional'
    | 'referral_partner'
    | 'collaboration'
    | 'mentor'
    | 'peer';
  trust_level: number;
  last_interaction_at: string;
  other_vendor: {
    id: string;
    business_name: string;
    primary_category: string;
    city: string;
    featured_image?: string;
  };
  perspective: 'sent' | 'received';
}

interface NetworkingStats {
  total_connections: number;
  pending_requests: number;
  active_referrals: number;
  network_score: number;
  recent_activity: number;
}

export default function VendorNetworkingHub() {
  const [connections, setConnections] = useState<VendorConnection[]>([]);
  const [stats, setStats] = useState<NetworkingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadNetworkingData();
  }, []);

  const loadNetworkingData = async () => {
    try {
      setLoading(true);

      // Load connections
      const connectionsResponse = await fetch(
        '/api/vendor-networking/connections?limit=5',
      );
      if (connectionsResponse.ok) {
        const connectionsData = await connectionsResponse.json();
        setConnections(connectionsData.connections || []);
      }

      // Load networking profile/stats
      const profileResponse = await fetch('/api/vendor-networking/profiles');
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        const profile = profileData.profile;

        setStats({
          total_connections: profile?.total_connections || 0,
          pending_requests: connections.filter((c) => c.status === 'pending')
            .length,
          active_referrals: profile?.referrals_sent || 0,
          network_score: profile?.network_score || 0,
          recent_activity: connections.filter((c) => {
            const lastActivity = new Date(c.last_interaction_at);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return lastActivity > weekAgo;
          }).length,
        });
      }
    } catch (error) {
      console.error('Error loading networking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return `${Math.floor(diffInDays / 7)}w ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-48 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-optimized header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Networking</h1>
              <p className="text-sm text-gray-500">
                Connect & collaborate with vendors
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                {stats && stats.pending_requests > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {stats.pending_requests}
                  </Badge>
                )}
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 pb-20">
        {' '}
        {/* Extra bottom padding for mobile navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile-friendly tab navigation */}
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview" className="text-xs">
              Overview
            </TabsTrigger>
            <TabsTrigger value="connections" className="text-xs">
              Connections
            </TabsTrigger>
            <TabsTrigger value="discover" className="text-xs">
              Discover
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards - Mobile optimized 2x2 grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.total_connections || 0}
                    </p>
                    <p className="text-xs text-gray-500">Connections</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.network_score || 0}
                    </p>
                    <p className="text-xs text-gray-500">Network Score</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <Handshake className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.active_referrals || 0}
                    </p>
                    <p className="text-xs text-gray-500">Referrals</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.pending_requests || 0}
                    </p>
                    <p className="text-xs text-gray-500">Pending</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="flex flex-col items-center p-4 h-auto space-y-2"
                  onClick={() => setActiveTab('discover')}
                >
                  <Search className="h-6 w-6 text-blue-600" />
                  <span className="text-sm">Find Vendors</span>
                </Button>

                <Button
                  variant="outline"
                  className="flex flex-col items-center p-4 h-auto space-y-2"
                  onClick={() => setActiveTab('connections')}
                >
                  <MessageSquare className="h-6 w-6 text-green-600" />
                  <span className="text-sm">Messages</span>
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  Recent Activity
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('connections')}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {connections.slice(0, 3).map((connection) => (
                  <div
                    key={connection.id}
                    className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={connection.other_vendor.featured_image}
                      />
                      <AvatarFallback className="text-xs">
                        {getInitials(connection.other_vendor.business_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {connection.other_vendor.business_name}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>{connection.other_vendor.primary_category}</span>
                        <span>•</span>
                        <span className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {connection.other_vendor.city}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge
                        variant={
                          connection.status === 'connected'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-xs"
                      >
                        {connection.status}
                      </Badge>
                      <div className="flex items-center text-xs text-gray-400">
                        <Clock className="h-3 w-3 mr-1" />
                        {connection.last_interaction_at
                          ? formatTimeAgo(connection.last_interaction_at)
                          : 'New'}
                      </div>
                    </div>
                  </div>
                ))}

                {connections.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No connections yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Start networking to grow your business
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="connections">
            <div className="space-y-4">
              {/* Connection filters */}
              <div className="flex space-x-2 overflow-x-auto pb-2">
                <Button variant="outline" size="sm">
                  All
                </Button>
                <Button variant="outline" size="sm">
                  Connected
                </Button>
                <Button variant="outline" size="sm">
                  Pending
                </Button>
                <Button variant="outline" size="sm">
                  Referrals
                </Button>
              </div>

              {/* Connections list */}
              <div className="space-y-3">
                {connections.map((connection) => (
                  <Card key={connection.id} className="p-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={connection.other_vendor.featured_image}
                        />
                        <AvatarFallback>
                          {getInitials(connection.other_vendor.business_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {connection.other_vendor.business_name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {connection.other_vendor.primary_category}
                        </p>
                        <div className="flex items-center mt-1 space-x-2 text-xs text-gray-400">
                          <MapPin className="h-3 w-3" />
                          <span>{connection.other_vendor.city}</span>
                          <span>•</span>
                          <div className="flex items-center">
                            <Star className="h-3 w-3 mr-1 fill-current text-yellow-400" />
                            <span>{connection.trust_level}/5</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-2">
                        <Badge
                          variant={
                            connection.status === 'connected'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {connection.status}
                        </Badge>
                        <Button size="sm" variant="ghost">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="discover">
            <div className="space-y-4">
              {/* Search and filters */}
              <Card className="p-4">
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search vendors, categories, or locations..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    <Button variant="outline" size="sm">
                      Photography
                    </Button>
                    <Button variant="outline" size="sm">
                      Venues
                    </Button>
                    <Button variant="outline" size="sm">
                      Catering
                    </Button>
                    <Button variant="outline" size="sm">
                      Flowers
                    </Button>
                    <Button variant="outline" size="sm">
                      Music
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Suggested connections */}
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  Suggested for You
                </h3>
                <div className="space-y-3">
                  {/* This would be populated from the discover API */}
                  <Card className="p-4">
                    <div className="text-center py-8 text-gray-500">
                      <UserPlus className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">
                        Discover vendors to connect with
                      </p>
                      <Button className="mt-4" size="sm">
                        Start Networking
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile bottom navigation spacer */}
      <div className="h-20 sm:hidden" />
    </div>
  );
}
