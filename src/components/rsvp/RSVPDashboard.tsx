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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Calendar,
  Mail,
  Download,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  UserPlus,
  Send,
  Upload,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

interface RSVPEvent {
  id: string;
  event_name: string;
  event_date: string;
  venue_name?: string;
  rsvp_deadline?: string;
  stats: {
    total_invited: number;
    total_responded: number;
    total_attending: number;
    response_rate: number;
    total_guests_confirmed: number;
  };
}

export default function RSVPDashboard() {
  const [events, setEvents] = useState<RSVPEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<RSVPEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/rsvp/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events);
        if (data.events.length > 0 && !selectedEvent) {
          setSelectedEvent(data.events[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load RSVP events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string, type: string) => {
    if (!selectedEvent) return;

    try {
      const response = await fetch(
        `/api/rsvp/export?event_id=${selectedEvent.id}&format=${format}&type=${type}`,
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedEvent.event_name}_${type}_${format}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Success',
          description: 'Export downloaded successfully',
        });
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: 'Error',
        description: 'Failed to export data',
        variant: 'destructive',
      });
    }
  };

  const sendReminders = async () => {
    if (!selectedEvent) return;

    try {
      const response = await fetch('/api/rsvp/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: selectedEvent.id,
          reminder_type: 'followup',
          scheduled_for: new Date().toISOString(),
          delivery_method: 'both',
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Reminders scheduled successfully',
        });
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      toast({
        title: 'Error',
        description: 'Failed to send reminders',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">RSVP Management</h1>
          <p className="text-muted-foreground">
            Manage event invitations and responses
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Event
        </Button>
      </div>

      {/* Event Selector */}
      {events.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {events.map((event) => (
            <Button
              key={event.id}
              variant={selectedEvent?.id === event.id ? 'default' : 'outline'}
              onClick={() => setSelectedEvent(event)}
              className="min-w-fit"
            >
              <Calendar className="mr-2 h-4 w-4" />
              {event.event_name}
              <Badge variant="secondary" className="ml-2">
                {format(new Date(event.event_date), 'MMM d')}
              </Badge>
            </Button>
          ))}
        </div>
      )}

      {selectedEvent && (
        <>
          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Invited
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedEvent.stats.total_invited}
                </div>
                <p className="text-xs text-muted-foreground">
                  Invitations sent
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Response Rate
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedEvent.stats.response_rate.toFixed(1)}%
                </div>
                <Progress
                  value={selectedEvent.stats.response_rate}
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attending</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedEvent.stats.total_attending}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedEvent.stats.total_guests_confirmed} total guests
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedEvent.stats.total_invited -
                    selectedEvent.stats.total_responded}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting response
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="responses" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="responses">Responses</TabsTrigger>
              <TabsTrigger value="invitations">Invitations</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="reminders">Reminders</TabsTrigger>
              <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
            </TabsList>

            <TabsContent value="responses" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Guest Responses</CardTitle>
                      <CardDescription>
                        Manage and track RSVP responses
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleExport('csv', 'guests')}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export Guest List
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleExport('csv', 'dietary')}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export Dietary
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Response list would go here */}
                  <div className="text-center py-8 text-muted-foreground">
                    Response management interface
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invitations" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Invitations</CardTitle>
                      <CardDescription>
                        Manage guest invitations
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Guest
                      </Button>
                      <Button variant="outline">
                        <Upload className="mr-2 h-4 w-4" />
                        Import Guests
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Invitation list would go here */}
                  <div className="text-center py-8 text-muted-foreground">
                    Invitation management interface
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Response Analytics</CardTitle>
                  <CardDescription>
                    Detailed insights into your RSVP responses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <h3 className="font-semibold">Response Timeline</h3>
                      <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                        Chart placeholder
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold">Response Sources</h3>
                      <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                        Chart placeholder
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reminders" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Automated Reminders</CardTitle>
                      <CardDescription>
                        Schedule and manage RSVP reminders
                      </CardDescription>
                    </div>
                    <Button onClick={sendReminders}>
                      <Send className="mr-2 h-4 w-4" />
                      Send Reminders Now
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Reminder settings would go here */}
                  <div className="text-center py-8 text-muted-foreground">
                    Reminder configuration interface
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="waitlist" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Waitlist Management</CardTitle>
                  <CardDescription>
                    Manage guests on the waiting list
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Waitlist would go here */}
                  <div className="text-center py-8 text-muted-foreground">
                    Waitlist management interface
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {events.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No RSVP Events</h3>
            <p className="text-muted-foreground mb-4">
              Create your first RSVP event to start managing invitations
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Event
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
