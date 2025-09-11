'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/20/solid';

interface VendorProfile {
  id: string;
  business_name: string;
  primary_category: string;
  average_rating: number;
  total_reviews: number;
  is_verified: boolean;
  profile_completion_score: number;
}

interface WeddingAssignment {
  id: string;
  wedding_id: string;
  couple_names: string;
  wedding_date: string;
  venue_name: string;
  status: 'active' | 'completed' | 'upcoming';
  timeline_access: boolean;
  communication_enabled: boolean;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  priority: string;
  created_at: string;
  action_url?: string;
}

interface Props {
  profile: VendorProfile;
  weddings: WeddingAssignment[];
  notifications: Notification[];
}

export function VendorDashboard({ profile, weddings, notifications }: Props) {
  const upcomingWeddings = weddings
    .filter((w) => w.status === 'upcoming')
    .slice(0, 3);
  const recentNotifications = notifications.slice(0, 5);
  const urgentNotifications = notifications.filter(
    (n) => n.priority === 'urgent' || n.priority === 'high',
  );

  const getNotificationIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'emergency':
        return <ExclamationTriangleIcon className="size-5 text-red-500" />;
      case 'high':
        return <ExclamationTriangleIcon className="size-5 text-orange-500" />;
      default:
        return <InformationCircleIcon className="size-5 text-blue-500" />;
    }
  };

  const getNotificationBadgeColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'emergency':
        return 'bg-red-100 text-red-600';
      case 'high':
        return 'bg-orange-100 text-orange-600';
      default:
        return 'bg-blue-100 text-blue-600';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Urgent Alerts */}
      {urgentNotifications.length > 0 && (
        <Card className="p-4 border-l-4 border-l-red-500 bg-red-50">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="size-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">
                Urgent Attention Required ({urgentNotifications.length})
              </h3>
              <div className="mt-2 space-y-2">
                {urgentNotifications.slice(0, 3).map((notification) => (
                  <div key={notification.id} className="text-sm text-red-800">
                    <strong>{notification.title}</strong>
                    <p className="mt-1">{notification.message}</p>
                  </div>
                ))}
              </div>
              <Button size="sm" className="mt-3 bg-red-600 hover:bg-red-700">
                View All Alerts
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Weddings */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Upcoming Weddings</h3>
            <CalendarDaysIcon className="size-6 text-gray-400" />
          </div>

          {upcomingWeddings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CalendarDaysIcon className="size-12 mx-auto mb-3 text-gray-300" />
              <p>No upcoming weddings</p>
              <p className="text-sm mt-1">New assignments will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingWeddings.map((wedding) => (
                <div
                  key={wedding.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {wedding.couple_names}
                      </h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <CalendarDaysIcon className="size-4" />
                          {formatDate(wedding.wedding_date)}
                        </div>
                        <span>{wedding.venue_name}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        className={
                          wedding.timeline_access
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-600'
                        }
                      >
                        {wedding.timeline_access
                          ? 'Timeline Access'
                          : 'Limited Access'}
                      </Badge>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {weddings.filter((w) => w.status === 'upcoming').length > 3 && (
                <Button variant="outline" className="w-full">
                  View All{' '}
                  {weddings.filter((w) => w.status === 'upcoming').length}{' '}
                  Upcoming Weddings
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* Recent Notifications */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Notifications</h3>
            <BellIcon className="size-6 text-gray-400" />
          </div>

          {recentNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BellIcon className="size-12 mx-auto mb-3 text-gray-300" />
              <p>No notifications</p>
              <p className="text-sm mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  {getNotificationIcon(notification.priority)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-medium text-gray-900 text-sm">
                        {notification.title}
                      </h4>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getNotificationBadgeColor(notification.priority)}`}
                      >
                        {notification.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">
                        {formatTimeAgo(notification.created_at)}
                      </span>
                      {notification.action_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs px-2 py-1"
                        >
                          View
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <Button variant="outline" className="w-full">
                View All Notifications
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button variant="outline" className="flex flex-col h-auto py-4">
            <CalendarDaysIcon className="size-6 mb-2 text-blue-600" />
            <span className="font-medium">View Timeline</span>
            <span className="text-xs text-gray-500 mt-1">
              Access wedding schedules
            </span>
          </Button>

          <Button variant="outline" className="flex flex-col h-auto py-4">
            <BellIcon className="size-6 mb-2 text-green-600" />
            <span className="font-medium">Communications</span>
            <span className="text-xs text-gray-500 mt-1">
              Message other vendors
            </span>
          </Button>

          <Button variant="outline" className="flex flex-col h-auto py-4">
            <CheckCircleIcon className="size-6 mb-2 text-purple-600" />
            <span className="font-medium">Update Status</span>
            <span className="text-xs text-gray-500 mt-1">
              Mark tasks complete
            </span>
          </Button>

          <Button variant="outline" className="flex flex-col h-auto py-4">
            <InformationCircleIcon className="size-6 mb-2 text-orange-600" />
            <span className="font-medium">Performance</span>
            <span className="text-xs text-gray-500 mt-1">
              View your metrics
            </span>
          </Button>
        </div>
      </Card>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">This Month</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Weddings Completed</span>
              <span className="font-semibold">
                {weddings.filter((w) => w.status === 'completed').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">On-Time Delivery</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">95%</span>
                <CheckCircleIcon className="size-4 text-green-500" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Customer Satisfaction</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {profile.average_rating.toFixed(1)}/5
                </span>
                <Badge className="bg-yellow-100 text-yellow-700">
                  Excellent
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Profile Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Profile Completion</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${profile.profile_completion_score}%` }}
                  />
                </div>
                <span className="font-semibold text-sm">
                  {profile.profile_completion_score}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Verification Status</span>
              <div className="flex items-center gap-2">
                {profile.is_verified ? (
                  <>
                    <CheckCircleIcon className="size-4 text-green-500" />
                    <span className="font-semibold text-green-600">
                      Verified
                    </span>
                  </>
                ) : (
                  <>
                    <XCircleIcon className="size-4 text-red-500" />
                    <span className="font-semibold text-red-600">Pending</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Reviews</span>
              <span className="font-semibold">{profile.total_reviews}</span>
            </div>
          </div>

          {profile.profile_completion_score < 100 && (
            <Button variant="outline" className="w-full mt-4">
              Complete Profile
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
