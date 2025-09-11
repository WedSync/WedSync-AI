'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Calendar,
  Bell,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Search,
  Settings,
  User,
  Camera,
  Music,
  Utensils,
  Flower,
  Users,
  Truck,
} from 'lucide-react';
import { format, isToday, isTomorrow, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  SupplierScheduleViewSelector,
  getVendorTypeFromSupplier,
} from './schedule-views';

interface SupplierPortalProps {
  supplierId: string;
  supplierData: any;
}

interface ScheduleItem {
  id: string;
  weddingId: string;
  coupleName: string;
  weddingDate: Date;
  venue: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  totalEvents: number;
  confirmationDeadline?: Date;
  lastUpdated: Date;
  priority: 'high' | 'medium' | 'low';
}

export function SupplierPortal({
  supplierId,
  supplierData,
}: SupplierPortalProps) {
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(
    null,
  );
  const [notifications, setNotifications] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(3);

  // Mock data - in real app this would come from API
  useEffect(() => {
    const mockSchedules: ScheduleItem[] = [
      {
        id: 'sched-1',
        weddingId: 'wedding-1',
        coupleName: 'Sarah & Michael',
        weddingDate: addDays(new Date(), 7),
        venue: 'Grand Ballroom Hotel',
        status: 'pending',
        totalEvents: 5,
        confirmationDeadline: addDays(new Date(), 2),
        lastUpdated: new Date(),
        priority: 'high',
      },
      {
        id: 'sched-2',
        weddingId: 'wedding-2',
        coupleName: 'Emma & James',
        weddingDate: addDays(new Date(), 14),
        venue: 'Garden Estate',
        status: 'confirmed',
        totalEvents: 4,
        lastUpdated: addDays(new Date(), -1),
        priority: 'medium',
      },
      {
        id: 'sched-3',
        weddingId: 'wedding-3',
        coupleName: 'Lisa & David',
        weddingDate: addDays(new Date(), 21),
        venue: 'Beachfront Resort',
        status: 'in_progress',
        totalEvents: 6,
        lastUpdated: addDays(new Date(), -3),
        priority: 'medium',
      },
    ];

    const mockNotifications = [
      {
        id: 'notif-1',
        type: 'schedule_update',
        title: 'Schedule Updated',
        message: 'Sarah & Michael wedding schedule has been updated',
        timestamp: new Date(),
        read: false,
      },
      {
        id: 'notif-2',
        type: 'confirmation_due',
        title: 'Confirmation Due',
        message: 'Please confirm your schedule for Emma & James wedding',
        timestamp: addDays(new Date(), -1),
        read: false,
      },
      {
        id: 'notif-3',
        type: 'new_schedule',
        title: 'New Schedule Available',
        message: 'Lisa & David wedding schedule is ready for review',
        timestamp: addDays(new Date(), -2),
        read: true,
      },
    ];

    setTimeout(() => {
      setSchedules(mockSchedules);
      setNotifications(mockNotifications);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredSchedules = schedules.filter(
    (schedule) =>
      schedule.coupleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schedule.venue.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getVendorIcon = (supplierType: string) => {
    const icons = {
      photographer: Camera,
      dj: Music,
      caterer: Utensils,
      florist: Flower,
      coordinator: Users,
      transport: Truck,
    };
    const IconComponent = icons[supplierType as keyof typeof icons] || Users;
    return <IconComponent className="h-4 w-4" />;
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM dd, yyyy');
  };

  if (selectedSchedule) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => setSelectedSchedule(null)}
              className="mb-4"
            >
              ← Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold">
              {selectedSchedule.coupleName} Wedding Schedule
            </h1>
            <p className="text-gray-600">
              {format(selectedSchedule.weddingDate, 'EEEE, MMMM dd, yyyy')} •{' '}
              {selectedSchedule.venue}
            </p>
          </div>

          <SupplierScheduleViewSelector
            vendorType={getVendorTypeFromSupplier(
              supplierData?.businessType || 'coordinator',
            )}
            schedule={{
              supplierId,
              supplierType: supplierData?.businessType || 'coordinator',
              supplierName: supplierData?.businessName || 'Unknown Supplier',
              scheduleItems: [],
              totalDuration: 480,
              conflicts: [],
              recommendations: [],
              generatedAt: new Date(),
            }}
            vendorData={{}}
            onConfirmSchedule={(confirmation) => {
              console.log('Schedule confirmed:', confirmation);
              setSelectedSchedule(null);
            }}
            onRequestChange={(change) => {
              console.log('Change requested:', change);
            }}
            onUpdateStatus={(status) => {
              console.log('Status updated:', status);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src="/api/placeholder/48/48" />
                <AvatarFallback>
                  {supplierData?.businessName?.slice(0, 2).toUpperCase() ||
                    'SU'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold">
                  {supplierData?.businessName || 'Supplier Portal'}
                </h1>
                <p className="text-sm text-gray-500 capitalize">
                  {supplierData?.businessType || 'Wedding Vendor'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
              <div className="relative">
                <Button variant="outline" size="sm">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </div>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="schedules">My Schedules</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-blue-500" />
                    <div>
                      <div className="text-2xl font-bold">
                        {schedules.length}
                      </div>
                      <div className="text-sm text-gray-500">
                        Upcoming Weddings
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-8 w-8 text-yellow-500" />
                    <div>
                      <div className="text-2xl font-bold">
                        {schedules.filter((s) => s.status === 'pending').length}
                      </div>
                      <div className="text-sm text-gray-500">
                        Pending Confirmation
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div>
                      <div className="text-2xl font-bold">
                        {
                          schedules.filter((s) => s.status === 'confirmed')
                            .length
                        }
                      </div>
                      <div className="text-sm text-gray-500">Confirmed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-orange-500" />
                    <div>
                      <div className="text-2xl font-bold">
                        {
                          schedules.filter((s) => s.status === 'in_progress')
                            .length
                        }
                      </div>
                      <div className="text-sm text-gray-500">In Progress</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Urgent Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Action Required
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {schedules
                    .filter(
                      (s) => s.status === 'pending' && s.confirmationDeadline,
                    )
                    .map((schedule) => (
                      <Alert key={schedule.id}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="flex justify-between items-center">
                            <span>
                              <strong>{schedule.coupleName}</strong> schedule
                              confirmation due{' '}
                              {schedule.confirmationDeadline &&
                                getDateLabel(schedule.confirmationDeadline)}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => setSelectedSchedule(schedule)}
                            >
                              Review
                            </Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedules Tab */}
          <TabsContent value="schedules" className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search weddings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">Filter</Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredSchedules.map((schedule) => (
                <Card
                  key={schedule.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                          {getVendorIcon(
                            supplierData?.businessType || 'coordinator',
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">
                              {schedule.coupleName}
                            </h3>
                            <Badge className={getStatusColor(schedule.status)}>
                              {schedule.status.replace('_', ' ')}
                            </Badge>
                            {schedule.priority === 'high' && (
                              <Badge variant="destructive" className="text-xs">
                                High Priority
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {schedule.venue}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{getDateLabel(schedule.weddingDate)}</span>
                            <span>{schedule.totalEvents} events</span>
                            <span>
                              Updated {format(schedule.lastUpdated, 'MMM dd')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSchedule(schedule)}
                      >
                        View Schedule
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={cn(
                    'transition-colors',
                    !notification.read && 'bg-blue-50 border-blue-200',
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full mt-2',
                          !notification.read ? 'bg-blue-500' : 'bg-gray-300',
                        )}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium">{notification.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {format(notification.timestamp, 'PPp')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Business Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Business Name</label>
                    <p className="text-sm text-gray-600 mt-1">
                      {supplierData?.businessName || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Business Type</label>
                    <p className="text-sm text-gray-600 mt-1 capitalize">
                      {supplierData?.businessType || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Contact Email</label>
                    <p className="text-sm text-gray-600 mt-1">
                      {supplierData?.email || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <p className="text-sm text-gray-600 mt-1">
                      {supplierData?.phone || 'Not specified'}
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
