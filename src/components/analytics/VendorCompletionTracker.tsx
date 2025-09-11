'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { Card } from '@/components/untitled-ui/card';
import { Badge } from '@/components/untitled-ui/badge';
import { Button } from '@/components/untitled-ui/button';
import { createClient } from '@/lib/supabase/client';
import {
  Building2,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Send,
  FileText,
  TrendingUp,
  Calendar,
  ChevronRight,
  Mail,
  Phone,
  Activity,
} from 'lucide-react';

interface VendorCompletionData {
  vendor_id: string;
  vendor_name: string;
  total_forms: number;
  completed_forms: number;
  in_progress_forms: number;
  overdue_forms: number;
  avg_completion_percentage: number;
}

interface VendorDetails {
  id: string;
  business_name: string;
  category: string;
  contact_email: string;
  contact_phone: string;
  forms: FormStatus[];
}

interface FormStatus {
  form_id: string;
  form_name: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  completion_percentage: number;
  due_date: string;
  last_activity: string;
  reminder_count: number;
}

const COLORS = {
  primary: '#7F56D9',
  success: '#12B76A',
  warning: '#F79009',
  error: '#F04438',
  blue: '#2E90FA',
  purple: '#9E77ED',
  gray: '#667085',
  lightGray: '#F2F4F7',
};

const STATUS_COLORS = {
  completed: COLORS.success,
  in_progress: COLORS.blue,
  overdue: COLORS.error,
  not_started: COLORS.gray,
};

export function VendorCompletionTracker() {
  const [vendors, setVendors] = useState<VendorCompletionData[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<VendorDetails | null>(
    null,
  );
  const [overallMetrics, setOverallMetrics] = useState({
    totalVendors: 0,
    totalForms: 0,
    completedForms: 0,
    overdueVendors: 0,
    avgCompletion: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const supabase = await createClient();

  useEffect(() => {
    fetchVendorData();
  }, []);

  const fetchVendorData = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const orgId = user?.user_metadata.organization_id;

      // Fetch vendor completion status
      const { data: vendorData, error: vendorError } = await supabase.rpc(
        'vendor_completion_status',
        {
          p_organization_id: orgId,
        },
      );

      if (vendorError) throw vendorError;

      const vendors = vendorData || [];
      setVendors(vendors);

      // Calculate overall metrics
      const metrics = {
        totalVendors: vendors.length,
        totalForms: vendors.reduce((sum, v) => sum + v.total_forms, 0),
        completedForms: vendors.reduce((sum, v) => sum + v.completed_forms, 0),
        overdueVendors: vendors.filter((v) => v.overdue_forms > 0).length,
        avgCompletion:
          vendors.length > 0
            ? Math.round(
                vendors.reduce(
                  (sum, v) => sum + v.avg_completion_percentage,
                  0,
                ) / vendors.length,
              )
            : 0,
      };
      setOverallMetrics(metrics);
    } catch (error) {
      console.error('Error fetching vendor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorDetails = async (vendorId: string) => {
    try {
      // Fetch vendor details
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId)
        .single();

      if (vendorError) throw vendorError;

      // Fetch vendor forms
      const { data: forms, error: formsError } = await supabase
        .from('analytics.vendor_completion')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('due_date', { ascending: true });

      if (formsError) throw formsError;

      const vendorDetails: VendorDetails = {
        id: vendor.id,
        business_name: vendor.business_name,
        category: vendor.category,
        contact_email: vendor.contact_email,
        contact_phone: vendor.contact_phone,
        forms: forms.map((f) => ({
          form_id: f.form_id,
          form_name: f.form_name,
          status: f.status,
          completion_percentage: f.completion_percentage,
          due_date: f.due_date,
          last_activity: f.last_activity_at,
          reminder_count: f.reminder_count,
        })),
      };

      setSelectedVendor(vendorDetails);
    } catch (error) {
      console.error('Error fetching vendor details:', error);
    }
  };

  const sendReminder = async (vendorId: string) => {
    setSendingReminder(vendorId);
    try {
      // Send reminder notification
      const { error } = await supabase.from('notifications').insert({
        recipient_id: vendorId,
        type: 'form_reminder',
        title: 'Form Completion Reminder',
        message: 'You have pending forms that need to be completed.',
        status: 'pending',
      });

      if (error) throw error;

      // Update reminder count
      await supabase
        .from('analytics.vendor_completion')
        .update({ reminder_count: supabase.sql`reminder_count + 1` })
        .eq('vendor_id', vendorId)
        .eq('status', 'in_progress');
    } catch (error) {
      console.error('Error sending reminder:', error);
    } finally {
      setSendingReminder(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success-600" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-error-600" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading vendor tracking data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Vendor Completion Tracking
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Monitor vendor form submissions and identify delays
          </p>
        </div>

        <Button onClick={() => fetchVendorData()} variant="secondary" size="sm">
          <Activity className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Overall Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total Vendors</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {overallMetrics.totalVendors}
              </p>
            </div>
            <Building2 className="w-5 h-5 text-primary-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total Forms</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {overallMetrics.totalForms}
              </p>
            </div>
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {overallMetrics.completedForms}
              </p>
            </div>
            <CheckCircle className="w-5 h-5 text-success-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {overallMetrics.overdueVendors}
              </p>
            </div>
            <AlertTriangle className="w-5 h-5 text-error-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">
                Avg Completion
              </p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {overallMetrics.avgCompletion}%
              </p>
            </div>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* Vendor Completion Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Vendor Completion Overview
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={vendors} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              dataKey="vendor_name"
              type="category"
              width={120}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #EAECF0',
                borderRadius: '8px',
              }}
              formatter={(value: any) => `${value}%`}
            />
            <Bar dataKey="avg_completion_percentage" radius={[0, 4, 4, 0]}>
              {vendors.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.avg_completion_percentage >= 90
                      ? COLORS.success
                      : entry.avg_completion_percentage >= 70
                        ? COLORS.blue
                        : entry.avg_completion_percentage >= 50
                          ? COLORS.warning
                          : COLORS.error
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Vendor List with Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Vendor Status Details
        </h3>
        <div className="space-y-3">
          {vendors.map((vendor) => (
            <div
              key={vendor.vendor_id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => fetchVendorDetails(vendor.vendor_id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium text-gray-900">
                      {vendor.vendor_name}
                    </h4>
                    {vendor.overdue_forms > 0 && (
                      <Badge variant="error">
                        {vendor.overdue_forms} Overdue
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-6 mt-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      <span>{vendor.total_forms} forms</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-success-600" />
                      <span>{vendor.completed_forms} completed</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-600" />
                      <span>{vendor.in_progress_forms} in progress</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Completion</span>
                      <span className="text-xs font-medium text-gray-700">
                        {vendor.avg_completion_percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${vendor.avg_completion_percentage}%`,
                          backgroundColor:
                            vendor.avg_completion_percentage >= 90
                              ? COLORS.success
                              : vendor.avg_completion_percentage >= 70
                                ? COLORS.blue
                                : vendor.avg_completion_percentage >= 50
                                  ? COLORS.warning
                                  : COLORS.error,
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {vendor.overdue_forms > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        sendReminder(vendor.vendor_id);
                      }}
                      disabled={sendingReminder === vendor.vendor_id}
                    >
                      {sendingReminder === vendor.vendor_id ? (
                        <Clock className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span className="ml-1">Remind</span>
                    </Button>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Selected Vendor Details Modal */}
      {selectedVendor && (
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedVendor.business_name}
              </h3>
              <p className="text-sm text-gray-500">{selectedVendor.category}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedVendor(null)}
            >
              <XCircle className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-4 mb-4 text-sm">
            <div className="flex items-center gap-1 text-gray-600">
              <Mail className="w-4 h-4" />
              <span>{selectedVendor.contact_email}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <Phone className="w-4 h-4" />
              <span>{selectedVendor.contact_phone}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Form Status</h4>
            {selectedVendor.forms.map((form) => (
              <div
                key={form.form_id}
                className="border border-gray-200 rounded-lg p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(form.status)}
                    <span className="font-medium text-gray-900">
                      {form.form_name}
                    </span>
                    <Badge
                      variant={
                        form.status === 'completed'
                          ? 'success'
                          : form.status === 'overdue'
                            ? 'error'
                            : form.status === 'in_progress'
                              ? 'primary'
                              : 'secondary'
                      }
                    >
                      {form.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <span className="text-sm text-gray-500">
                    Due: {formatDate(form.due_date)}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Progress</span>
                    <span className="text-xs font-medium text-gray-700">
                      {form.completion_percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${form.completion_percentage}%`,
                        backgroundColor: STATUS_COLORS[form.status],
                      }}
                    />
                  </div>
                </div>
                {form.last_activity && (
                  <p className="text-xs text-gray-500 mt-2">
                    Last activity: {formatDate(form.last_activity)}
                    {form.reminder_count > 0 &&
                      ` • ${form.reminder_count} reminders sent`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Overdue Alert */}
      {overallMetrics.overdueVendors > 0 && (
        <Card className="p-4 border-error-200 bg-error-50">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-error-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-error-900">
                Action Required
              </h4>
              <p className="text-sm text-error-700 mt-1">
                {overallMetrics.overdueVendors} vendor
                {overallMetrics.overdueVendors !== 1 ? 's have' : ' has'}{' '}
                overdue forms. Send reminders to ensure timely completion before
                the wedding date.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
