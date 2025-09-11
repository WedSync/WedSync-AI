'use client';

import { useRouter } from 'next/navigation';
import {
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  Users,
  FileText,
  Phone,
  Mail,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SupplierBooking } from '@/types/supplier';

interface UpcomingBookingsProps {
  bookings: SupplierBooking[];
  loading: boolean;
}

export function UpcomingBookings({ bookings, loading }: UpcomingBookingsProps) {
  const router = useRouter();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'booked':
        return 'bg-blue-100 text-blue-800';
      case 'quoted':
        return 'bg-yellow-100 text-yellow-800';
      case 'inquiry':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid_in_full':
        return 'text-green-600';
      case 'deposit_paid':
        return 'text-blue-600';
      case 'overdue':
        return 'text-red-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const callClient = (phone?: string) => {
    if (phone) {
      window.open(`tel:${phone}`, '_self');
    }
  };

  const emailClient = (email?: string) => {
    if (email) {
      window.open(`mailto:${email}`, '_self');
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Upcoming Bookings
          </h2>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-600" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-24 bg-gray-200 rounded-lg" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card className="p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Upcoming Bookings
        </h2>
        <div className="text-gray-500 mb-4">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No upcoming bookings</p>
          <p className="text-sm">New inquiries will appear here</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/supplier-portal/bookings')}
          className="text-pink-600 border-pink-200 hover:bg-pink-50"
        >
          View All Bookings
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Upcoming Bookings ({bookings.length})
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/supplier-portal/bookings')}
          className="text-pink-600"
        >
          View All
        </Button>
      </div>

      <div className="space-y-3">
        {bookings.slice(0, 5).map((booking) => (
          <div
            key={booking.id}
            className={cn(
              'border rounded-lg p-4 space-y-3 transition-all duration-200',
              'touch-manipulation active:scale-[0.98] cursor-pointer',
              'hover:shadow-sm hover:border-gray-300',
            )}
            onClick={() =>
              router.push(`/supplier-portal/bookings/${booking.id}`)
            }
          >
            {/* Booking header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 truncate">
                  {booking.client_name}
                </h3>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(booking.wedding_date)}</span>
                  <Badge className={getStatusColor(booking.booking_status)}>
                    {booking.booking_status}
                  </Badge>
                </div>
              </div>

              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  {formatCurrency(booking.total_amount)}
                </div>
                <div
                  className={cn(
                    'text-xs font-medium',
                    getPaymentStatusColor(booking.payment_status),
                  )}
                >
                  {booking.payment_status.replace('_', ' ')}
                </div>
              </div>
            </div>

            {/* Service details */}
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <FileText className="w-3 h-3" />
                <span className="capitalize">
                  {booking.service_details.type}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{booking.service_details.duration_hours}h</span>
              </div>
              {booking.service_details.location && (
                <div className="flex items-center space-x-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">
                    {booking.service_details.location}
                  </span>
                </div>
              )}
            </div>

            {/* Payment breakdown */}
            {booking.deposit_amount && booking.balance_due && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex space-x-4">
                  <span className="text-gray-600">
                    Deposit:{' '}
                    <span className="font-medium">
                      {formatCurrency(booking.deposit_amount)}
                    </span>
                  </span>
                  <span className="text-gray-600">
                    Balance:{' '}
                    <span className="font-medium">
                      {formatCurrency(booking.balance_due)}
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Action indicators */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex space-x-1">
                {booking.booking_status === 'inquiry' && (
                  <Badge
                    variant="outline"
                    className="text-purple-600 border-purple-200"
                  >
                    Response Needed
                  </Badge>
                )}
                {booking.contract_status === 'pending' && (
                  <Badge
                    variant="outline"
                    className="text-yellow-600 border-yellow-200"
                  >
                    Contract Pending
                  </Badge>
                )}
                {booking.payment_status === 'overdue' && (
                  <Badge
                    variant="outline"
                    className="text-red-600 border-red-200"
                  >
                    Payment Overdue
                  </Badge>
                )}
              </div>

              <div className="flex items-center space-x-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    callClient(''); // You'd get this from booking data
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Phone className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    emailClient(''); // You'd get this from booking data
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Mail className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {bookings.length > 5 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={() => router.push('/supplier-portal/bookings')}
            className="w-full"
          >
            View {bookings.length - 5} More Bookings
          </Button>
        </div>
      )}
    </Card>
  );
}
