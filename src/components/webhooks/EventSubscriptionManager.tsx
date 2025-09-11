'use client';

// WS-201 Team A - EventSubscriptionManager Component
// Wedding-specific event subscription management with categorization
// Location: /wedsync/src/components/webhooks/EventSubscriptionManager.tsx

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  WebhookEndpoint,
  WebhookEventType,
  WebhookEventCategory,
  WEDDING_WEBHOOK_EVENTS,
  getAllWebhookEvents,
  getEventsByCategory,
} from '@/types/webhooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Zap,
  Users,
  FileText,
  CreditCard,
  MessageSquare,
  Calendar,
  Camera,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Info,
  Search,
  Check,
  X,
  Save,
  RotateCcw,
  Eye,
  Settings,
  AlertCircle,
  TrendingUp,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EventSubscriptionManagerProps {
  endpoints: WebhookEndpoint[];
  onUpdate: () => void;
}

interface EventSubscriptions {
  [endpointId: string]: string[];
}

const CATEGORY_ICONS: Record<
  WebhookEventCategory,
  React.ComponentType<{ className?: string }>
> = {
  client_management: Users,
  forms_documents: FileText,
  payments: CreditCard,
  communications: MessageSquare,
  bookings: Calendar,
  timeline: Calendar,
  gallery: Camera,
  reports: BarChart3,
};

const CATEGORY_COLORS: Record<WebhookEventCategory, string> = {
  client_management: 'text-blue-700 bg-blue-50 border-blue-200',
  forms_documents: 'text-green-700 bg-green-50 border-green-200',
  payments: 'text-purple-700 bg-purple-50 border-purple-200',
  communications: 'text-orange-700 bg-orange-50 border-orange-200',
  bookings: 'text-pink-700 bg-pink-50 border-pink-200',
  timeline: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  gallery: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  reports: 'text-gray-700 bg-gray-50 border-gray-200',
};

export function EventSubscriptionManager({
  endpoints,
  onUpdate,
}: EventSubscriptionManagerProps) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('');
  const [subscriptions, setSubscriptions] = useState<EventSubscriptions>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    WebhookEventCategory | 'all'
  >('all');
  const [expandedCategories, setExpandedCategories] = useState<
    Set<WebhookEventCategory>
  >(new Set(['client_management', 'forms_documents', 'payments']));
  const [previewEvent, setPreviewEvent] = useState<WebhookEventType | null>(
    null,
  );
  const [hasChanges, setHasChanges] = useState(false);

  const queryClient = useQueryClient();

  // Initialize subscriptions from endpoints
  useEffect(() => {
    const initialSubscriptions: EventSubscriptions = {};
    endpoints.forEach((endpoint) => {
      initialSubscriptions[endpoint.id] = endpoint.events.map((e) =>
        typeof e === 'string' ? e : e.id,
      );
    });
    setSubscriptions(initialSubscriptions);

    // Auto-select first endpoint
    if (endpoints.length > 0 && !selectedEndpoint) {
      setSelectedEndpoint(endpoints[0].id);
    }
  }, [endpoints, selectedEndpoint]);

  // Update subscriptions mutation
  const updateSubscriptionsMutation = useMutation({
    mutationFn: async ({
      endpointId,
      events,
    }: {
      endpointId: string;
      events: string[];
    }) => {
      const response = await fetch(
        `/api/webhooks/endpoints/${endpointId}/subscriptions`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ events }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update subscriptions');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Event subscriptions updated successfully');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['webhook-endpoints'] });
      onUpdate();
    },
    onError: (error) => {
      toast.error(
        `Failed to update subscriptions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    },
  });

  const allEvents = getAllWebhookEvents();
  const currentEndpoint = endpoints.find((e) => e.id === selectedEndpoint);
  const currentSubscriptions = subscriptions[selectedEndpoint] || [];

  // Filter events based on search and category
  const filteredEvents = allEvents.filter((event) => {
    const matchesSearch =
      searchTerm === '' ||
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || event.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Group events by category
  const eventsByCategory = Object.entries(WEDDING_WEBHOOK_EVENTS).reduce(
    (acc, [category, events]) => {
      const categoryEvents = events.filter((event) =>
        filteredEvents.includes(event),
      );
      if (categoryEvents.length > 0) {
        acc[category as WebhookEventCategory] = categoryEvents;
      }
      return acc;
    },
    {} as Record<WebhookEventCategory, WebhookEventType[]>,
  );

  const handleEventToggle = (eventId: string, checked: boolean) => {
    if (!selectedEndpoint) return;

    setSubscriptions((prev) => {
      const endpointSubscriptions = prev[selectedEndpoint] || [];
      const newSubscriptions = checked
        ? [...endpointSubscriptions, eventId]
        : endpointSubscriptions.filter((id) => id !== eventId);

      const updated = {
        ...prev,
        [selectedEndpoint]: newSubscriptions,
      };

      setHasChanges(true);
      return updated;
    });
  };

  const handleCategoryToggle = (
    category: WebhookEventCategory,
    checked: boolean,
  ) => {
    if (!selectedEndpoint) return;

    const categoryEvents = getEventsByCategory(category);
    const categoryEventIds = categoryEvents.map((e) => e.id);

    setSubscriptions((prev) => {
      const endpointSubscriptions = prev[selectedEndpoint] || [];
      let newSubscriptions;

      if (checked) {
        // Add all category events that aren't already subscribed
        const newEvents = categoryEventIds.filter(
          (id) => !endpointSubscriptions.includes(id),
        );
        newSubscriptions = [...endpointSubscriptions, ...newEvents];
      } else {
        // Remove all category events
        newSubscriptions = endpointSubscriptions.filter(
          (id) => !categoryEventIds.includes(id),
        );
      }

      const updated = {
        ...prev,
        [selectedEndpoint]: newSubscriptions,
      };

      setHasChanges(true);
      return updated;
    });
  };

  const selectAllEvents = () => {
    if (!selectedEndpoint) return;

    const allEventIds = filteredEvents.map((e) => e.id);
    setSubscriptions((prev) => ({
      ...prev,
      [selectedEndpoint]: allEventIds,
    }));
    setHasChanges(true);
  };

  const clearAllEvents = () => {
    if (!selectedEndpoint) return;

    setSubscriptions((prev) => ({
      ...prev,
      [selectedEndpoint]: [],
    }));
    setHasChanges(true);
  };

  const resetChanges = () => {
    if (!currentEndpoint) return;

    setSubscriptions((prev) => ({
      ...prev,
      [selectedEndpoint]: currentEndpoint.events.map((e) =>
        typeof e === 'string' ? e : e.id,
      ),
    }));
    setHasChanges(false);
  };

  const saveChanges = () => {
    if (!selectedEndpoint) return;

    updateSubscriptionsMutation.mutate({
      endpointId: selectedEndpoint,
      events: currentSubscriptions,
    });
  };

  const toggleCategoryExpansion = (category: WebhookEventCategory) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const getCategoryProgress = (category: WebhookEventCategory) => {
    const categoryEvents = getEventsByCategory(category);
    const subscribedCount = categoryEvents.filter((e) =>
      currentSubscriptions.includes(e.id),
    ).length;
    return { subscribed: subscribedCount, total: categoryEvents.length };
  };

  const generateSamplePayload = (event: WebhookEventType) => {
    const basePayload = {
      event: event.id,
      timestamp: new Date().toISOString(),
      webhook_id: 'wh_sample_123',
      organization_id: 'org_sample_456',
    };

    // Add event-specific sample data
    switch (event.category) {
      case 'client_management':
        return {
          ...basePayload,
          data: {
            client_id: 'client_789',
            name: 'Sarah & John Smith',
            wedding_date: '2024-08-15',
            venue: 'Garden Paradise Resort',
            package: 'Premium Photography',
          },
        };

      case 'forms_documents':
        return {
          ...basePayload,
          data: {
            form_id: 'form_123',
            client_id: 'client_789',
            form_type: 'Wedding Timeline',
            submitted_at: new Date().toISOString(),
            responses: {
              ceremony_time: '4:00 PM',
              reception_start: '6:00 PM',
              special_requests: 'Golden hour portraits',
            },
          },
        };

      case 'payments':
        return {
          ...basePayload,
          data: {
            payment_id: 'pay_456',
            client_id: 'client_789',
            amount: 50000, // $500.00 in cents
            currency: 'USD',
            status: 'completed',
            description: 'Wedding Photography Deposit',
          },
        };

      default:
        return {
          ...basePayload,
          data: {
            id: 'sample_id_123',
            type: event.id,
            description: `Sample ${event.name.toLowerCase()} event`,
          },
        };
    }
  };

  if (endpoints.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Zap className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">No webhook endpoints configured</p>
          <p className="text-sm text-gray-500">
            Create a webhook endpoint first to manage event subscriptions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Zap className="mr-3 h-6 w-6" />
            Event Subscriptions
          </h2>
          <p className="text-gray-600">
            Configure which wedding events trigger webhooks to your endpoints
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {hasChanges && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={resetChanges}
                disabled={updateSubscriptionsMutation.isPending}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>

              <Button
                size="sm"
                onClick={saveChanges}
                disabled={updateSubscriptionsMutation.isPending}
                className="bg-primary-600 hover:bg-primary-700"
              >
                <Save className="mr-2 h-4 w-4" />
                {updateSubscriptionsMutation.isPending
                  ? 'Saving...'
                  : 'Save Changes'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Endpoint Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Webhook Endpoint</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an endpoint to configure" />
            </SelectTrigger>
            <SelectContent>
              {endpoints.map((endpoint) => (
                <SelectItem key={endpoint.id} value={endpoint.id}>
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate">
                      {new URL(endpoint.url).hostname}
                    </span>
                    <Badge
                      variant={endpoint.isActive ? 'default' : 'secondary'}
                      className="ml-2 text-xs"
                    >
                      {endpoint.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {currentEndpoint && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {currentEndpoint.url}
                  </p>
                  {currentEndpoint.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {currentEndpoint.description}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {currentSubscriptions.length} events
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search and Filters */}
      {selectedEndpoint && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Input
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>

              <Select
                value={selectedCategory}
                onValueChange={(value) =>
                  setSelectedCategory(value as WebhookEventCategory | 'all')
                }
              >
                <SelectTrigger className="sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="client_management">
                    Client Management
                  </SelectItem>
                  <SelectItem value="forms_documents">
                    Forms & Documents
                  </SelectItem>
                  <SelectItem value="payments">Payments</SelectItem>
                  <SelectItem value="communications">Communications</SelectItem>
                  <SelectItem value="bookings">Bookings</SelectItem>
                  <SelectItem value="timeline">Timeline</SelectItem>
                  <SelectItem value="gallery">Gallery</SelectItem>
                  <SelectItem value="reports">Reports</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={selectAllEvents}>
                  <Check className="mr-2 h-4 w-4" />
                  All
                </Button>
                <Button variant="outline" size="sm" onClick={clearAllEvents}>
                  <X className="mr-2 h-4 w-4" />
                  None
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Categories */}
      {selectedEndpoint && (
        <div className="space-y-4">
          {Object.entries(eventsByCategory).map(([category, events]) => {
            const CategoryIcon =
              CATEGORY_ICONS[category as WebhookEventCategory];
            const isExpanded = expandedCategories.has(
              category as WebhookEventCategory,
            );
            const progress = getCategoryProgress(
              category as WebhookEventCategory,
            );
            const isAllSelected =
              progress.subscribed === progress.total && progress.total > 0;
            const isSomeSelected =
              progress.subscribed > 0 && progress.subscribed < progress.total;

            return (
              <Card key={category}>
                <Collapsible
                  open={isExpanded}
                  onOpenChange={() =>
                    toggleCategoryExpansion(category as WebhookEventCategory)
                  }
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className={cn(
                              'p-2 rounded-lg',
                              CATEGORY_COLORS[category as WebhookEventCategory],
                            )}
                          >
                            <CategoryIcon className="h-5 w-5" />
                          </div>

                          <div>
                            <CardTitle className="text-lg">
                              {category
                                .split('_')
                                .map(
                                  (word) =>
                                    word.charAt(0).toUpperCase() +
                                    word.slice(1),
                                )
                                .join(' ')}
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                              {progress.subscribed} of {progress.total} events
                              subscribed
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={isAllSelected}
                              onCheckedChange={(checked) =>
                                handleCategoryToggle(
                                  category as WebhookEventCategory,
                                  !!checked,
                                )
                              }
                              ref={(el) => {
                                if (el) el.indeterminate = isSomeSelected;
                              }}
                            />
                            <span className="text-sm text-gray-600">
                              Select all
                            </span>
                          </div>

                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 gap-3">
                        {events.map((event) => (
                          <div
                            key={event.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <Checkbox
                                checked={currentSubscriptions.includes(
                                  event.id,
                                )}
                                onCheckedChange={(checked) =>
                                  handleEventToggle(event.id, !!checked)
                                }
                              />

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <p className="font-medium text-gray-900">
                                    {event.name}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-xs',
                                      event.frequency === 'high' &&
                                        'border-red-300 text-red-700 bg-red-50',
                                      event.frequency === 'medium' &&
                                        'border-yellow-300 text-yellow-700 bg-yellow-50',
                                      event.frequency === 'low' &&
                                        'border-green-300 text-green-700 bg-green-50',
                                    )}
                                  >
                                    <div className="flex items-center space-x-1">
                                      {event.frequency === 'high' && (
                                        <Volume2 className="h-3 w-3" />
                                      )}
                                      {event.frequency === 'medium' && (
                                        <Volume2 className="h-3 w-3" />
                                      )}
                                      {event.frequency === 'low' && (
                                        <VolumeX className="h-3 w-3" />
                                      )}
                                      <span>{event.frequency}</span>
                                    </div>
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {event.description}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setPreviewEvent(event)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Preview sample payload</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Info className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm">
                                    <p>{event.description}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sample Payload Dialog */}
      {previewEvent && (
        <Dialog
          open={!!previewEvent}
          onOpenChange={() => setPreviewEvent(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{previewEvent.name} - Sample Payload</DialogTitle>
              <DialogDescription>
                Example webhook payload for the{' '}
                {previewEvent.name.toLowerCase()} event
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {previewEvent.frequency} frequency
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {previewEvent.category.replace('_', ' ')}
                </Badge>
              </div>

              <div>
                <label className="text-sm font-medium">Sample Payload</label>
                <pre className="mt-2 text-xs bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 border">
                  {JSON.stringify(generateSamplePayload(previewEvent), null, 2)}
                </pre>
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <strong>When triggered:</strong> {previewEvent.description}
                </p>
                <p>
                  <strong>Expected frequency:</strong> {previewEvent.frequency}{' '}
                  volume
                </p>
                <p>
                  <strong>Category:</strong>{' '}
                  {previewEvent.category.replace('_', ' ')}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Summary */}
      {selectedEndpoint && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Subscription Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {currentSubscriptions.length}
                </p>
                <p className="text-sm text-gray-600">Total Events</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {
                    currentSubscriptions.filter((id) => {
                      const event = allEvents.find((e) => e.id === id);
                      return event?.frequency === 'high';
                    }).length
                  }
                </p>
                <p className="text-sm text-gray-600">High Volume</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {
                    currentSubscriptions.filter((id) => {
                      const event = allEvents.find((e) => e.id === id);
                      return event?.frequency === 'medium';
                    }).length
                  }
                </p>
                <p className="text-sm text-gray-600">Medium Volume</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">
                  {
                    currentSubscriptions.filter((id) => {
                      const event = allEvents.find((e) => e.id === id);
                      return event?.frequency === 'low';
                    }).length
                  }
                </p>
                <p className="text-sm text-gray-600">Low Volume</p>
              </div>
            </div>

            {hasChanges && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-amber-600 mr-2" />
                  <p className="text-sm text-amber-800">
                    You have unsaved changes. Click "Save Changes" to apply your
                    event subscription updates.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
