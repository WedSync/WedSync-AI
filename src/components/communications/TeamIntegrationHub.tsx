'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCcw,
  Users,
  Wifi,
  WifiOff,
  Smartphone,
  Monitor,
  Search,
  History,
  Send,
  Activity,
  Shield,
  Zap,
  Server,
  Database,
  Link2,
  GitBranch,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Team B: Real-time Delivery Status
export interface DeliveryStatusUpdate {
  messageId: string;
  recipientId: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  timestamp: Date;
  channel: 'email' | 'sms' | 'whatsapp';
  details?: {
    error?: string;
    provider?: string;
    retryCount?: number;
    deliveryTime?: number;
  };
}

// Team C: Provider Status & Failure Handling
export interface ProviderStatus {
  provider: string;
  status: 'operational' | 'degraded' | 'outage';
  uptime: number;
  latency: number;
  errorRate: number;
  lastChecked: Date;
  capabilities: string[];
  failoverAvailable: boolean;
}

// Team D: Mobile Messaging Interface
export interface MobileMessagingSync {
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncTime: Date;
  pendingMessages: number;
  offlineCapable: boolean;
  features: {
    pushNotifications: boolean;
    backgroundSync: boolean;
    offlineCompose: boolean;
  };
}

// Team E: Message History & Search
export interface MessageHistoryEntry {
  id: string;
  timestamp: Date;
  sender: string;
  recipients: string[];
  subject: string;
  content: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'push';
  status: 'sent' | 'delivered' | 'failed' | 'read';
  metadata: {
    campaign?: string;
    sequence?: string;
    version?: string;
    personalized?: boolean;
  };
  searchableContent: string;
}

interface TeamIntegrationHubProps {
  clientId: string;
  onStatusUpdate?: (team: string, status: any) => void;
  className?: string;
}

export function TeamIntegrationHub({
  clientId,
  onStatusUpdate,
  className,
}: TeamIntegrationHubProps) {
  // Team B State
  const [deliveryStatuses, setDeliveryStatuses] = useState<
    DeliveryStatusUpdate[]
  >([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(true);

  // Team C State
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([
    {
      provider: 'SendGrid',
      status: 'operational',
      uptime: 99.98,
      latency: 120,
      errorRate: 0.02,
      lastChecked: new Date(),
      capabilities: ['email', 'templates', 'analytics'],
      failoverAvailable: true,
    },
    {
      provider: 'Twilio',
      status: 'operational',
      uptime: 99.95,
      latency: 85,
      errorRate: 0.05,
      lastChecked: new Date(),
      capabilities: ['sms', 'whatsapp', 'voice'],
      failoverAvailable: true,
    },
    {
      provider: 'OneSignal',
      status: 'operational',
      uptime: 99.99,
      latency: 65,
      errorRate: 0.01,
      lastChecked: new Date(),
      capabilities: ['push', 'in-app', 'email'],
      failoverAvailable: false,
    },
  ]);

  // Team D State
  const [mobileSync, setMobileSync] = useState<MobileMessagingSync[]>([]);

  // Team E State
  const [messageHistory, setMessageHistory] = useState<MessageHistoryEntry[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Simulate real-time delivery updates (Team B)
  useEffect(() => {
    if (!isRealtimeConnected) return;

    const interval = setInterval(() => {
      const newUpdate: DeliveryStatusUpdate = {
        messageId: `msg-${Date.now()}`,
        recipientId: `recipient-${Math.floor(Math.random() * 100)}`,
        status: ['sent', 'delivered', 'failed', 'bounced'][
          Math.floor(Math.random() * 4)
        ] as any,
        timestamp: new Date(),
        channel: ['email', 'sms', 'whatsapp'][
          Math.floor(Math.random() * 3)
        ] as any,
        details: {
          deliveryTime: Math.floor(Math.random() * 5000),
          retryCount: Math.floor(Math.random() * 3),
        },
      };

      setDeliveryStatuses((prev) => [newUpdate, ...prev].slice(0, 50));
      onStatusUpdate?.('teamB', newUpdate);
    }, 3000);

    return () => clearInterval(interval);
  }, [isRealtimeConnected, onStatusUpdate]);

  // Provider health check (Team C)
  useEffect(() => {
    const interval = setInterval(() => {
      setProviderStatuses((prev) =>
        prev.map((provider) => ({
          ...provider,
          lastChecked: new Date(),
          latency: provider.latency + (Math.random() - 0.5) * 20,
          errorRate: Math.max(
            0,
            provider.errorRate + (Math.random() - 0.5) * 0.01,
          ),
        })),
      );
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Handle provider failover (Team C)
  const handleFailover = useCallback((provider: ProviderStatus) => {
    console.log('Initiating failover for', provider.provider);
    setProviderStatuses((prev) =>
      prev.map((p) =>
        p.provider === provider.provider
          ? { ...p, status: 'degraded' as const }
          : p,
      ),
    );

    // Simulate failover completion
    setTimeout(() => {
      setProviderStatuses((prev) =>
        prev.map((p) =>
          p.provider === provider.provider
            ? { ...p, status: 'operational' as const }
            : p,
        ),
      );
    }, 3000);
  }, []);

  // Mobile sync simulation (Team D)
  useEffect(() => {
    const devices: MobileMessagingSync[] = [
      {
        deviceId: 'iphone-001',
        platform: 'ios',
        syncStatus: 'synced',
        lastSyncTime: new Date(),
        pendingMessages: 0,
        offlineCapable: true,
        features: {
          pushNotifications: true,
          backgroundSync: true,
          offlineCompose: true,
        },
      },
      {
        deviceId: 'android-001',
        platform: 'android',
        syncStatus: 'syncing',
        lastSyncTime: new Date(Date.now() - 60000),
        pendingMessages: 3,
        offlineCapable: true,
        features: {
          pushNotifications: true,
          backgroundSync: true,
          offlineCompose: true,
        },
      },
      {
        deviceId: 'web-001',
        platform: 'web',
        syncStatus: 'synced',
        lastSyncTime: new Date(),
        pendingMessages: 0,
        offlineCapable: false,
        features: {
          pushNotifications: true,
          backgroundSync: false,
          offlineCompose: false,
        },
      },
    ];

    setMobileSync(devices);
  }, []);

  // Search message history (Team E)
  const handleSearch = useCallback(
    (query: string) => {
      setIsSearching(true);
      setSearchQuery(query);

      // Simulate search
      setTimeout(() => {
        const mockResults: MessageHistoryEntry[] = [
          {
            id: 'hist-1',
            timestamp: new Date(Date.now() - 86400000),
            sender: 'system',
            recipients: ['john@example.com', 'jane@example.com'],
            subject: 'Save the Date - Wedding Announcement',
            content: 'We are excited to announce our wedding date...',
            channel: 'email',
            status: 'delivered',
            metadata: {
              campaign: 'Save the Date',
              version: 'A',
              personalized: true,
            },
            searchableContent: 'save the date wedding announcement excited',
          },
          {
            id: 'hist-2',
            timestamp: new Date(Date.now() - 172800000),
            sender: 'system',
            recipients: ['guest1@example.com'],
            subject: 'RSVP Reminder',
            content: 'Please confirm your attendance...',
            channel: 'sms',
            status: 'read',
            metadata: {
              campaign: 'RSVP Campaign',
              sequence: 'reminder-2',
              personalized: true,
            },
            searchableContent: 'rsvp reminder confirm attendance',
          },
        ];

        const filtered = query
          ? mockResults.filter((m) =>
              m.searchableContent.toLowerCase().includes(query.toLowerCase()),
            )
          : mockResults;

        setMessageHistory(filtered);
        setIsSearching(false);
        onStatusUpdate?.('teamE', { query, results: filtered.length });
      }, 500);
    },
    [onStatusUpdate],
  );

  const getStatusIcon = (status: DeliveryStatusUpdate['status']) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'bounced':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getProviderStatusColor = (status: ProviderStatus['status']) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'outage':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSyncStatusIcon = (status: MobileMessagingSync['syncStatus']) => {
    switch (status) {
      case 'synced':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'syncing':
        return <RefreshCcw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Integration Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Team Integration Hub
          </CardTitle>
          <CardDescription>
            Unified view of all messaging team integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Team B</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {isRealtimeConnected ? (
                    <Badge className="bg-green-500">Connected</Badge>
                  ) : (
                    <Badge className="bg-red-500">Disconnected</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Real-time delivery tracking
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Team C</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500">
                    {
                      providerStatuses.filter((p) => p.status === 'operational')
                        .length
                    }
                    /{providerStatuses.length} OK
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Provider health monitoring
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Team D</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge>
                    {mobileSync.filter((d) => d.syncStatus === 'synced').length}{' '}
                    Synced
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Mobile device sync
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Team E</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge>{messageHistory.length} Messages</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Searchable history
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Integration Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="delivery" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b">
              <TabsTrigger value="delivery">
                <Activity className="mr-2 h-4 w-4" />
                Delivery Status
              </TabsTrigger>
              <TabsTrigger value="providers">
                <Server className="mr-2 h-4 w-4" />
                Provider Health
              </TabsTrigger>
              <TabsTrigger value="mobile">
                <Smartphone className="mr-2 h-4 w-4" />
                Mobile Sync
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="mr-2 h-4 w-4" />
                Message History
              </TabsTrigger>
            </TabsList>

            <div className="p-6">
              {/* Team B: Real-time Delivery Status */}
              <TabsContent value="delivery" className="space-y-4 mt-0">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-medium">
                      Real-time Delivery Tracking
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Live updates from Team B integration
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRealtimeConnected(!isRealtimeConnected)}
                  >
                    {isRealtimeConnected ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>

                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {deliveryStatuses.map((update) => (
                      <div
                        key={update.messageId}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(update.status)}
                          <div>
                            <p className="text-sm font-medium">
                              Message {update.messageId.slice(-8)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {update.channel} •{' '}
                              {update.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={
                              update.status === 'delivered'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {update.status}
                          </Badge>
                          {update.details?.deliveryTime && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {update.details.deliveryTime}ms
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Team C: Provider Status & Failure Handling */}
              <TabsContent value="providers" className="space-y-4 mt-0">
                <div className="mb-4">
                  <h3 className="text-lg font-medium">
                    Provider Health Monitoring
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Team C provider status and failover management
                  </p>
                </div>

                <div className="grid gap-4">
                  {providerStatuses.map((provider) => (
                    <Card key={provider.provider}>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'h-3 w-3 rounded-full',
                                getProviderStatusColor(provider.status),
                              )}
                            />
                            <CardTitle className="text-base">
                              {provider.provider}
                            </CardTitle>
                          </div>
                          {provider.failoverAvailable &&
                            provider.status !== 'operational' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleFailover(provider)}
                              >
                                Initiate Failover
                              </Button>
                            )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Uptime</p>
                            <p className="font-medium">
                              {provider.uptime.toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Latency</p>
                            <p className="font-medium">
                              {provider.latency.toFixed(0)}ms
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Error Rate</p>
                            <p className="font-medium">
                              {provider.errorRate.toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Last Check</p>
                            <p className="font-medium">
                              {provider.lastChecked.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {provider.capabilities.map((cap) => (
                            <Badge
                              key={cap}
                              variant="secondary"
                              className="text-xs"
                            >
                              {cap}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Team D: Mobile Messaging Sync */}
              <TabsContent value="mobile" className="space-y-4 mt-0">
                <div className="mb-4">
                  <h3 className="text-lg font-medium">
                    Mobile Device Synchronization
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Team D mobile messaging interface status
                  </p>
                </div>

                <div className="grid gap-4">
                  {mobileSync.map((device) => (
                    <Card key={device.deviceId}>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {device.platform === 'ios' ? (
                              <Smartphone className="h-4 w-4" />
                            ) : device.platform === 'android' ? (
                              <Smartphone className="h-4 w-4" />
                            ) : (
                              <Monitor className="h-4 w-4" />
                            )}
                            <CardTitle className="text-base">
                              {device.deviceId}
                            </CardTitle>
                          </div>
                          {getSyncStatusIcon(device.syncStatus)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Platform
                            </span>
                            <Badge variant="outline">{device.platform}</Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Last Sync
                            </span>
                            <span>
                              {device.lastSyncTime.toLocaleTimeString()}
                            </span>
                          </div>
                          {device.pendingMessages > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Pending
                              </span>
                              <Badge variant="secondary">
                                {device.pendingMessages} messages
                              </Badge>
                            </div>
                          )}
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground mb-2">
                              Features
                            </p>
                            <div className="flex gap-2">
                              {device.features.pushNotifications && (
                                <Badge variant="secondary" className="text-xs">
                                  Push
                                </Badge>
                              )}
                              {device.features.backgroundSync && (
                                <Badge variant="secondary" className="text-xs">
                                  BG Sync
                                </Badge>
                              )}
                              {device.features.offlineCompose && (
                                <Badge variant="secondary" className="text-xs">
                                  Offline
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Team E: Message History & Search */}
              <TabsContent value="history" className="space-y-4 mt-0">
                <div className="mb-4">
                  <h3 className="text-lg font-medium">
                    Message History & Search
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Team E advanced search and history tracking
                  </p>
                </div>

                {/* Search Bar */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search messages..."
                      className="w-full pl-10 pr-3 py-2 border rounded-lg"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === 'Enter' && handleSearch(searchQuery)
                      }
                    />
                  </div>
                  <Button
                    onClick={() => handleSearch(searchQuery)}
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <RefreshCcw className="h-4 w-4 animate-spin" />
                    ) : (
                      'Search'
                    )}
                  </Button>
                </div>

                {/* Search Results */}
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {messageHistory.map((message) => (
                      <Card key={message.id}>
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-sm">
                                {message.subject}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {message.timestamp.toLocaleString()}
                              </CardDescription>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="text-xs">
                                {message.channel}
                              </Badge>
                              <Badge
                                variant={
                                  message.status === 'delivered'
                                    ? 'default'
                                    : 'secondary'
                                }
                                className="text-xs"
                              >
                                {message.status}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {message.content}
                          </p>
                          <div className="mt-3 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              To: {message.recipients.slice(0, 2).join(', ')}
                              {message.recipients.length > 2 &&
                                ` +${message.recipients.length - 2} more`}
                            </span>
                            {message.metadata.campaign && (
                              <Badge variant="secondary" className="text-xs">
                                {message.metadata.campaign}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
