'use client';

import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Treemap,
  Sankey,
} from 'recharts';
import { Card } from '@/components/untitled-ui/card';
import { Badge } from '@/components/untitled-ui/badge';
import { Button } from '@/components/untitled-ui/button';
import { createClient } from '@/lib/supabase/client';
import {
  Users,
  MapPin,
  Utensils,
  Plane,
  Home,
  Heart,
  TrendingUp,
  UserCheck,
  Globe,
  Calendar,
} from 'lucide-react';

interface DemographicData {
  age_group: string;
  count: number;
  dietary_preferences: any;
  avg_travel_distance: number;
  accommodation_percentage: number;
}

interface RSVPStatusData {
  status: string;
  count: number;
  percentage: number;
}

interface LocationData {
  location: string;
  count: number;
  lat?: number;
  lng?: number;
}

interface DietaryData {
  preference: string;
  count: number;
  percentage: number;
}

const COLORS = {
  primary: '#7F56D9',
  success: '#12B76A',
  warning: '#F79009',
  error: '#F04438',
  blue: '#2E90FA',
  purple: '#9E77ED',
  pink: '#DD2590',
  teal: '#15B79E',
  gray: '#667085',
};

const AGE_GROUP_COLORS = [
  COLORS.purple,
  COLORS.blue,
  COLORS.teal,
  COLORS.success,
  COLORS.warning,
  COLORS.pink,
  COLORS.primary,
  COLORS.error,
];

export function GuestDemographicsAnalysis() {
  const [demographics, setDemographics] = useState<DemographicData[]>([]);
  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatusData[]>([]);
  const [locationData, setLocationData] = useState<LocationData[]>([]);
  const [dietaryData, setDietaryData] = useState<DietaryData[]>([]);
  const [totalGuests, setTotalGuests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState('overview');
  const supabase = await createClient();

  useEffect(() => {
    fetchDemographicData();
  }, []);

  const fetchDemographicData = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const orgId = user?.user_metadata.organization_id;

      // Fetch demographic aggregations
      const { data: demoData, error: demoError } = await supabase.rpc(
        'aggregate_guest_demographics',
        {
          p_organization_id: orgId,
        },
      );

      if (demoError) throw demoError;
      setDemographics(demoData || []);

      // Fetch RSVP status distribution
      const { data: rsvpData, error: rsvpError } = await supabase
        .from('analytics.guest_demographics')
        .select('rsvp_status')
        .eq('organization_id', orgId);

      if (rsvpError) throw rsvpError;

      const rsvpCounts = processRSVPData(rsvpData || []);
      setRsvpStatus(rsvpCounts);
      setTotalGuests(rsvpData?.length || 0);

      // Fetch location distribution
      const { data: locData, error: locError } = await supabase
        .from('analytics.guest_demographics')
        .select('location_city, location_state, location_country')
        .eq('organization_id', orgId);

      if (locError) throw locError;

      const locationCounts = processLocationData(locData || []);
      setLocationData(locationCounts);

      // Process dietary preferences
      const dietaryPrefs = processDietaryData(demoData || []);
      setDietaryData(dietaryPrefs);
    } catch (error) {
      console.error('Error fetching demographic data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processRSVPData = (data: any[]): RSVPStatusData[] => {
    const counts: Record<string, number> = {
      accepted: 0,
      declined: 0,
      pending: 0,
      maybe: 0,
    };

    data.forEach((item) => {
      if (item.rsvp_status && counts[item.rsvp_status] !== undefined) {
        counts[item.rsvp_status]++;
      }
    });

    const total = data.length || 1;
    return Object.entries(counts).map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / total) * 100),
    }));
  };

  const processLocationData = (data: any[]): LocationData[] => {
    const locationMap = new Map<string, number>();

    data.forEach((item) => {
      const location =
        item.location_city ||
        item.location_state ||
        item.location_country ||
        'Unknown';
      locationMap.set(location, (locationMap.get(location) || 0) + 1);
    });

    return Array.from(locationMap.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const processDietaryData = (data: DemographicData[]): DietaryData[] => {
    const dietaryMap = new Map<string, number>();
    let total = 0;

    data.forEach((demo) => {
      if (demo.dietary_preferences) {
        Object.entries(demo.dietary_preferences).forEach(([pref, count]) => {
          if (pref !== 'none') {
            dietaryMap.set(pref, (dietaryMap.get(pref) || 0) + Number(count));
            total += Number(count);
          }
        });
      }
    });

    return Array.from(dietaryMap.entries())
      .map(([preference, count]) => ({
        preference,
        count,
        percentage: Math.round((count / (total || 1)) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  };

  const calculateAverageAge = () => {
    const ageWeights: Record<string, number> = {
      '0-12': 6,
      '13-17': 15,
      '18-24': 21,
      '25-34': 30,
      '35-44': 40,
      '45-54': 50,
      '55-64': 60,
      '65+': 70,
    };

    let totalWeight = 0;
    let totalCount = 0;

    demographics.forEach((demo) => {
      if (demo.age_group && ageWeights[demo.age_group]) {
        totalWeight += ageWeights[demo.age_group] * demo.count;
        totalCount += demo.count;
      }
    });

    return totalCount > 0 ? Math.round(totalWeight / totalCount) : 0;
  };

  const calculateTravelMetrics = () => {
    const totalDistance = demographics.reduce(
      (sum, d) => sum + (d.avg_travel_distance || 0) * d.count,
      0,
    );
    const totalCount = demographics.reduce((sum, d) => sum + d.count, 0);
    const avgDistance =
      totalCount > 0 ? Math.round(totalDistance / totalCount) : 0;

    const needingAccommodation = demographics.reduce(
      (sum, d) =>
        sum + Math.round(d.count * (d.accommodation_percentage / 100)),
      0,
    );

    return { avgDistance, needingAccommodation };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading demographic analysis...</div>
      </div>
    );
  }

  const avgAge = calculateAverageAge();
  const { avgDistance, needingAccommodation } = calculateTravelMetrics();
  const acceptedGuests =
    rsvpStatus.find((s) => s.status === 'accepted')?.count || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Guest Demographics Analysis
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Insights into your wedding guest composition and preferences
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={selectedView === 'overview' ? 'primary' : 'secondary'}
            onClick={() => setSelectedView('overview')}
            size="sm"
          >
            Overview
          </Button>
          <Button
            variant={selectedView === 'details' ? 'primary' : 'secondary'}
            onClick={() => setSelectedView('details')}
            size="sm"
          >
            Detailed View
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total Guests</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {totalGuests}
              </p>
            </div>
            <Users className="w-5 h-5 text-primary-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Confirmed</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {acceptedGuests}
              </p>
            </div>
            <UserCheck className="w-5 h-5 text-success-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Avg Age</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {avgAge}
              </p>
            </div>
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Avg Distance</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {avgDistance}km
              </p>
            </div>
            <MapPin className="w-5 h-5 text-warning-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Need Rooms</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {needingAccommodation}
              </p>
            </div>
            <Home className="w-5 h-5 text-purple-600" />
          </div>
        </Card>
      </div>

      {selectedView === 'overview' ? (
        <>
          {/* RSVP Status and Age Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* RSVP Status Pie Chart */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                RSVP Status Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={rsvpStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, percentage }) =>
                      `${status}: ${percentage}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {rsvpStatus.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.status === 'accepted'
                            ? COLORS.success
                            : entry.status === 'declined'
                              ? COLORS.error
                              : entry.status === 'maybe'
                                ? COLORS.warning
                                : COLORS.gray
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {rsvpStatus.map((status) => (
                  <div
                    key={status.status}
                    className="flex justify-between items-center"
                  >
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{
                          backgroundColor:
                            status.status === 'accepted'
                              ? COLORS.success
                              : status.status === 'declined'
                                ? COLORS.error
                                : status.status === 'maybe'
                                  ? COLORS.warning
                                  : COLORS.gray,
                        }}
                      />
                      <span className="text-sm text-gray-600 capitalize">
                        {status.status}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {status.count} guests
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Age Distribution */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Age Group Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={demographics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" />
                  <XAxis
                    dataKey="age_group"
                    stroke="#667085"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis stroke="#667085" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #EAECF0',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill={COLORS.primary}
                    radius={[8, 8, 0, 0]}
                  >
                    {demographics.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={AGE_GROUP_COLORS[index % AGE_GROUP_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Dietary Preferences and Location Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dietary Preferences */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Dietary Preferences
              </h3>
              {dietaryData.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {dietaryData.map((item) => (
                      <div
                        key={item.preference}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center flex-1">
                          <Utensils className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {item.preference}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-primary-600"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-12 text-right">
                            {item.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-700">
                      <strong>Tip:</strong> {dietaryData[0]?.preference} is the
                      most common dietary requirement. Ensure your catering can
                      accommodate {dietaryData[0]?.count} guests with this
                      preference.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  No dietary preferences recorded yet
                </p>
              )}
            </Card>

            {/* Top Locations */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Guest Locations
              </h3>
              <div className="space-y-3">
                {locationData.slice(0, 7).map((location, index) => (
                  <div
                    key={location.location}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Globe className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-700">
                        {location.location}
                      </span>
                    </div>
                    <Badge variant={index === 0 ? 'primary' : 'secondary'}>
                      {location.count} guests
                    </Badge>
                  </div>
                ))}
              </div>
              {avgDistance > 50 && (
                <div className="mt-4 p-3 bg-warning-50 rounded-lg">
                  <p className="text-xs text-warning-700">
                    <strong>Note:</strong> Average travel distance is{' '}
                    {avgDistance}km. Consider providing travel information and
                    accommodation options.
                  </p>
                </div>
              )}
            </Card>
          </div>
        </>
      ) : (
        /* Detailed View */
        <div className="grid grid-cols-1 gap-6">
          {/* Accommodation Needs by Age Group */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Accommodation Needs by Age Group
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={demographics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" />
                <XAxis dataKey="age_group" stroke="#667085" />
                <YAxis stroke="#667085" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #EAECF0',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar
                  dataKey="count"
                  fill={COLORS.primary}
                  name="Total Guests"
                />
                <Bar
                  dataKey={(data) =>
                    Math.round(
                      data.count * (data.accommodation_percentage / 100),
                    )
                  }
                  fill={COLORS.warning}
                  name="Need Accommodation"
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Travel Distance Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Travel Distance Analysis
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={demographics.map((d) => ({
                  ...d,
                  distance_category:
                    d.avg_travel_distance < 50
                      ? 'Local (<50km)'
                      : d.avg_travel_distance < 200
                        ? 'Regional (50-200km)'
                        : 'Long Distance (>200km)',
                }))}
                layout="horizontal"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" />
                <XAxis dataKey="age_group" stroke="#667085" />
                <YAxis dataKey="avg_travel_distance" stroke="#667085" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #EAECF0',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any) => `${value}km`}
                />
                <Bar
                  dataKey="avg_travel_distance"
                  fill={COLORS.blue}
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
}
