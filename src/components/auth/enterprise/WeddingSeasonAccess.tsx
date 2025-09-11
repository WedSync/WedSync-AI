'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  TrendingUp,
  Users,
  Shield,
  Clock,
  Sun,
  Snowflake,
  Flower2,
  Leaf,
  AlertTriangle,
  CheckCircle,
  Settings,
  Activity,
  Target,
  BarChart3,
} from 'lucide-react';

interface SeasonalAccessRule {
  id: string;
  name: string;
  season:
    | 'spring'
    | 'summer'
    | 'fall'
    | 'winter'
    | 'peak'
    | 'off_peak'
    | 'custom';
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  permissions: string[];
  restrictions: string[];
  maxConcurrentUsers: number;
  allowedRoles: string[];
  priority: number;
  description: string;
  createdBy: string;
  lastModified: Date;
}

interface SeasonalMetrics {
  season: string;
  totalLogins: number;
  peakConcurrentUsers: number;
  averageSessionDuration: number;
  mostActiveRole: string;
  weddingCount: number;
  revenueImpact: number;
  systemLoad: 'low' | 'medium' | 'high' | 'critical';
  predictedDemand: 'increasing' | 'stable' | 'decreasing';
}

interface WeddingSeasonPeriod {
  name: string;
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'peak' | 'off_peak';
  startMonth: number;
  endMonth: number;
  characteristics: string[];
  typicalLoad: 'low' | 'medium' | 'high' | 'extreme';
  icon: typeof Calendar;
  color: string;
  description: string;
}

interface WeddingSeasonAccessProps {
  organizationId: string;
  currentUserRole?: string;
  onRuleUpdated?: (rule: SeasonalAccessRule) => void;
  onSeasonChanged?: (newSeason: string) => void;
  showMetrics?: boolean;
  allowCustomRules?: boolean;
}

// Wedding season definitions based on industry patterns
const weddingSeasons: WeddingSeasonPeriod[] = [
  {
    name: 'Spring Wedding Season',
    season: 'spring',
    startMonth: 3, // March
    endMonth: 5, // May
    characteristics: [
      'Cherry Blossoms',
      'Garden Venues',
      'Mild Weather',
      'Easter Holidays',
    ],
    typicalLoad: 'high',
    icon: Flower2,
    color: 'bg-pink-500',
    description:
      'Popular season with garden weddings and spring flowers. High demand for outdoor venues and floral designers.',
  },
  {
    name: 'Peak Summer Season',
    season: 'summer',
    startMonth: 6, // June
    endMonth: 8, // August
    characteristics: [
      'Perfect Weather',
      'Outdoor Ceremonies',
      'Beach Weddings',
      'School Holidays',
    ],
    typicalLoad: 'extreme',
    icon: Sun,
    color: 'bg-yellow-500',
    description:
      'Absolute peak wedding season. Maximum system load expected. All vendor types at capacity.',
  },
  {
    name: 'Fall Wedding Season',
    season: 'fall',
    startMonth: 9, // September
    endMonth: 11, // November
    characteristics: [
      'Autumn Colors',
      'Harvest Themes',
      'Comfortable Weather',
      'Thanksgiving',
    ],
    typicalLoad: 'high',
    icon: Leaf,
    color: 'bg-orange-500',
    description:
      'Second most popular season. Beautiful autumn venues and comfortable temperatures.',
  },
  {
    name: 'Winter Off-Season',
    season: 'winter',
    startMonth: 12, // December
    endMonth: 2, // February
    characteristics: [
      'Holiday Weddings',
      'Indoor Venues',
      'Cozy Atmosphere',
      'Lower Costs',
    ],
    typicalLoad: 'low',
    icon: Snowflake,
    color: 'bg-blue-500',
    description:
      'Quieter season with holiday and New Year weddings. Good time for planning and system maintenance.',
  },
  {
    name: 'Peak Wedding Months',
    season: 'peak',
    startMonth: 5, // May
    endMonth: 10, // October
    characteristics: [
      'Maximum Bookings',
      'All Vendors Busy',
      'Premium Pricing',
      'High Competition',
    ],
    typicalLoad: 'extreme',
    icon: TrendingUp,
    color: 'bg-red-500',
    description:
      'Combined peak months when wedding industry operates at maximum capacity.',
  },
  {
    name: 'Off-Peak Period',
    season: 'off_peak',
    startMonth: 11, // November
    endMonth: 4, // April
    characteristics: [
      'Planning Season',
      'Venue Tours',
      'Vendor Meetings',
      'Budget Planning',
    ],
    typicalLoad: 'medium',
    icon: Calendar,
    color: 'bg-gray-500',
    description:
      'Planning and preparation period. Lower wedding volume but high planning activity.',
  },
];

// Default seasonal permissions
const seasonalPermissions = [
  'view_dashboard',
  'manage_weddings',
  'access_calendar',
  'coordinate_vendors',
  'handle_emergencies',
  'bulk_operations',
  'system_admin',
  'photo_uploads',
  'client_communication',
  'payment_processing',
];

export default function WeddingSeasonAccess({
  organizationId,
  currentUserRole = 'admin',
  onRuleUpdated,
  onSeasonChanged,
  showMetrics = true,
  allowCustomRules = true,
}: WeddingSeasonAccessProps) {
  const [accessRules, setAccessRules] = useState<SeasonalAccessRule[]>([]);
  const [currentSeason, setCurrentSeason] = useState<string>('');
  const [seasonalMetrics, setSeasonalMetrics] = useState<SeasonalMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState<SeasonalAccessRule | null>(
    null,
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [autoSeasonDetection, setAutoSeasonDetection] = useState(true);
  const [emergencyOverride, setEmergencyOverride] = useState(false);
  const supabase = createClient();

  const canManageRules = ['admin', 'owner'].includes(currentUserRole);

  useEffect(() => {
    loadAccessRules();
    detectCurrentSeason();
    if (showMetrics) {
      loadSeasonalMetrics();
    }
  }, [organizationId]);

  const loadAccessRules = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('seasonal_access_rules')
        .select('*')
        .eq('organization_id', organizationId)
        .order('priority', { ascending: false });

      if (error) throw error;

      const rules: SeasonalAccessRule[] = (data || []).map((rule) => ({
        id: rule.id,
        name: rule.name,
        season: rule.season,
        startDate: new Date(rule.start_date),
        endDate: new Date(rule.end_date),
        isActive: rule.is_active,
        permissions: rule.permissions || [],
        restrictions: rule.restrictions || [],
        maxConcurrentUsers: rule.max_concurrent_users || 100,
        allowedRoles: rule.allowed_roles || [],
        priority: rule.priority || 1,
        description: rule.description || '',
        createdBy: rule.created_by,
        lastModified: new Date(rule.updated_at),
      }));

      setAccessRules(rules);
    } catch (error) {
      console.error('Error loading access rules:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const detectCurrentSeason = () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

    const season = weddingSeasons.find((s) => {
      if (s.startMonth <= s.endMonth) {
        return currentMonth >= s.startMonth && currentMonth <= s.endMonth;
      } else {
        // Handle seasons that cross year boundary (e.g., Dec-Feb)
        return currentMonth >= s.startMonth || currentMonth <= s.endMonth;
      }
    });

    const seasonName = season?.season || 'off_peak';
    setCurrentSeason(seasonName);
    onSeasonChanged?.(seasonName);
  };

  const loadSeasonalMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('seasonal_analytics')
        .select('*')
        .eq('organization_id', organizationId)
        .gte(
          'date',
          new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        ) // Last year
        .order('date', { ascending: false });

      if (error) throw error;

      // Process metrics by season
      const metrics: SeasonalMetrics[] = weddingSeasons.map((season) => {
        const seasonData = (data || []).filter(
          (d) => d.season === season.season,
        );

        return {
          season: season.season,
          totalLogins: seasonData.reduce(
            (sum, d) => sum + (d.total_logins || 0),
            0,
          ),
          peakConcurrentUsers: Math.max(
            ...seasonData.map((d) => d.peak_concurrent_users || 0),
            0,
          ),
          averageSessionDuration:
            seasonData.reduce(
              (sum, d) => sum + (d.avg_session_duration || 0),
              0,
            ) / (seasonData.length || 1),
          mostActiveRole: seasonData[0]?.most_active_role || 'unknown',
          weddingCount: seasonData.reduce(
            (sum, d) => sum + (d.wedding_count || 0),
            0,
          ),
          revenueImpact: seasonData.reduce(
            (sum, d) => sum + (d.revenue_impact || 0),
            0,
          ),
          systemLoad: seasonData[0]?.system_load || 'low',
          predictedDemand: seasonData[0]?.predicted_demand || 'stable',
        };
      });

      setSeasonalMetrics(metrics);
    } catch (error) {
      console.error('Error loading seasonal metrics:', error);
    }
  };

  const createAccessRule = async (ruleData: Partial<SeasonalAccessRule>) => {
    if (!canManageRules) return;

    try {
      const { data, error } = await supabase
        .from('seasonal_access_rules')
        .insert({
          organization_id: organizationId,
          name: ruleData.name,
          season: ruleData.season,
          start_date: ruleData.startDate?.toISOString(),
          end_date: ruleData.endDate?.toISOString(),
          is_active: ruleData.isActive || true,
          permissions: ruleData.permissions || [],
          restrictions: ruleData.restrictions || [],
          max_concurrent_users: ruleData.maxConcurrentUsers || 100,
          allowed_roles: ruleData.allowedRoles || [],
          priority: ruleData.priority || 1,
          description: ruleData.description || '',
          created_by: currentUserRole,
        })
        .select()
        .single();

      if (error) throw error;

      await loadAccessRules();
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating access rule:', error);
    }
  };

  const updateAccessRule = async (
    ruleId: string,
    updates: Partial<SeasonalAccessRule>,
  ) => {
    if (!canManageRules) return;

    try {
      const { error } = await supabase
        .from('seasonal_access_rules')
        .update({
          ...updates,
          start_date: updates.startDate?.toISOString(),
          end_date: updates.endDate?.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', ruleId);

      if (error) throw error;

      const updatedRule = accessRules.find((r) => r.id === ruleId);
      if (updatedRule) {
        onRuleUpdated?.({ ...updatedRule, ...updates } as SeasonalAccessRule);
      }

      await loadAccessRules();
    } catch (error) {
      console.error('Error updating access rule:', error);
    }
  };

  const toggleEmergencyOverride = async () => {
    if (!canManageRules) return;

    try {
      const { error } = await supabase.from('organization_settings').upsert({
        organization_id: organizationId,
        setting_key: 'emergency_season_override',
        setting_value: !emergencyOverride,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      setEmergencyOverride(!emergencyOverride);
    } catch (error) {
      console.error('Error toggling emergency override:', error);
    }
  };

  const getCurrentSeasonInfo = () => {
    return (
      weddingSeasons.find((s) => s.season === currentSeason) ||
      weddingSeasons[0]
    );
  };

  const getActiveRules = () => {
    return accessRules.filter((rule) => rule.isActive);
  };

  const getSeasonIcon = (season: string) => {
    const seasonInfo = weddingSeasons.find((s) => s.season === season);
    if (!seasonInfo) return Calendar;
    const Icon = seasonInfo.icon;
    return <Icon className="h-4 w-4" />;
  };

  const getLoadBadge = (load: string) => {
    const config = {
      low: { variant: 'success' as const, text: 'Low Load' },
      medium: { variant: 'warning' as const, text: 'Medium Load' },
      high: { variant: 'destructive' as const, text: 'High Load' },
      extreme: { variant: 'destructive' as const, text: 'Extreme Load' },
      critical: { variant: 'destructive' as const, text: 'Critical Load' },
    };

    return (
      <Badge
        variant={config[load as keyof typeof config]?.variant || 'secondary'}
      >
        {config[load as keyof typeof config]?.text || 'Unknown'}
      </Badge>
    );
  };

  const currentSeasonInfo = getCurrentSeasonInfo();
  const activeRules = getActiveRules();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            Loading seasonal access rules...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Wedding Season Access Control
          </h2>
          <p className="text-muted-foreground">
            Manage access based on wedding industry seasonal patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          {emergencyOverride && (
            <Badge variant="destructive" className="animate-pulse">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Emergency Override Active
            </Badge>
          )}
          <Badge variant="outline" className="flex items-center gap-1">
            {getSeasonIcon(currentSeason)}
            Current: {currentSeasonInfo.name}
          </Badge>
        </div>
      </div>

      {/* Current Season Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {React.createElement(currentSeasonInfo.icon, {
              className: 'h-5 w-5',
            })}
            {currentSeasonInfo.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Season Characteristics
              </p>
              <div className="flex flex-wrap gap-1">
                {currentSeasonInfo.characteristics.map((char) => (
                  <Badge key={char} variant="secondary" className="text-xs">
                    {char}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Expected System Load
              </p>
              {getLoadBadge(currentSeasonInfo.typicalLoad)}
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Active Access Rules
              </p>
              <Badge variant="outline" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                {activeRules.length} Rules
              </Badge>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
            {currentSeasonInfo.description}
          </p>
        </CardContent>
      </Card>

      {/* Emergency Override */}
      {canManageRules && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Emergency Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emergency-override" className="font-medium">
                  Emergency Season Override
                </Label>
                <p className="text-sm text-muted-foreground">
                  Bypass all seasonal restrictions during wedding emergencies
                </p>
              </div>
              <Switch
                id="emergency-override"
                checked={emergencyOverride}
                onCheckedChange={toggleEmergencyOverride}
              />
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>⚠️ Wedding Day Emergency:</strong> Use emergency
                override only during active wedding days when vendors need
                immediate access to resolve critical issues. This bypasses all
                seasonal access restrictions.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Seasonal Metrics */}
      {showMetrics && seasonalMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Seasonal Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {seasonalMetrics.map((metric) => {
                const seasonInfo = weddingSeasons.find(
                  (s) => s.season === metric.season,
                );
                if (!seasonInfo) return null;

                return (
                  <div key={metric.season} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className={`w-8 h-8 rounded-lg ${seasonInfo.color} flex items-center justify-center text-white`}
                      >
                        {React.createElement(seasonInfo.icon, {
                          className: 'h-4 w-4',
                        })}
                      </div>
                      <h4 className="font-medium">{seasonInfo.name}</h4>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Total Logins:
                        </span>
                        <span className="font-medium">
                          {metric.totalLogins.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Peak Users:
                        </span>
                        <span className="font-medium">
                          {metric.peakConcurrentUsers}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Weddings:</span>
                        <span className="font-medium">
                          {metric.weddingCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          System Load:
                        </span>
                        <span>{getLoadBadge(metric.systemLoad)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Access Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Seasonal Access Rules
            </CardTitle>
            {canManageRules && allowCustomRules && (
              <Button onClick={() => setShowCreateForm(true)}>
                Create Rule
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {accessRules.length > 0 ? (
            <div className="space-y-4">
              {accessRules.map((rule) => {
                const seasonInfo = weddingSeasons.find(
                  (s) => s.season === rule.season,
                );

                return (
                  <div key={rule.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg ${seasonInfo?.color || 'bg-gray-500'} flex items-center justify-center text-white`}
                        >
                          {getSeasonIcon(rule.season)}
                        </div>
                        <div>
                          <h4 className="font-medium">{rule.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {rule.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {rule.season.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <Badge
                              variant={rule.isActive ? 'success' : 'secondary'}
                              className="text-xs"
                            >
                              {rule.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Priority: {rule.priority}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right text-sm">
                          <p className="font-medium">
                            {rule.permissions.length} Permissions
                          </p>
                          <p className="text-muted-foreground">
                            Max {rule.maxConcurrentUsers} users
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {rule.startDate.toLocaleDateString()} -{' '}
                            {rule.endDate.toLocaleDateString()}
                          </p>
                        </div>

                        {canManageRules && (
                          <div className="flex flex-col gap-1">
                            <Switch
                              checked={rule.isActive}
                              onCheckedChange={(checked) =>
                                updateAccessRule(rule.id, { isActive: checked })
                              }
                              size="sm"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedRule(rule)}
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {rule.restrictions.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium text-red-600 mb-1">
                          Restrictions:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {rule.restrictions.map((restriction) => (
                            <Badge
                              key={restriction}
                              variant="destructive"
                              className="text-xs"
                            >
                              {restriction}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No seasonal access rules configured. Wedding seasons will use
                default permissions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wedding Season Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Wedding Industry Season Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weddingSeasons.map((season) => {
              const isCurrentSeason = season.season === currentSeason;

              return (
                <div
                  key={season.season}
                  className={`border rounded-lg p-4 ${isCurrentSeason ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={`w-8 h-8 rounded-lg ${season.color} flex items-center justify-center text-white`}
                    >
                      {React.createElement(season.icon, {
                        className: 'h-4 w-4',
                      })}
                    </div>
                    <div>
                      <h4 className="font-medium">{season.name}</h4>
                      {isCurrentSeason && (
                        <Badge variant="success" className="text-xs">
                          Current Season
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">
                    {season.description}
                  </p>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duration:</span>
                      <span>
                        Months {season.startMonth}-{season.endMonth}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Expected Load:
                      </span>
                      <span>{getLoadBadge(season.typicalLoad)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Characteristics:
                      </span>
                      <span className="text-right">
                        {season.characteristics.length} traits
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Wedding Industry Context */}
      <Alert>
        <Sun className="h-4 w-4" />
        <AlertDescription>
          <strong>🎊 Wedding Season Intelligence:</strong> Access control
          automatically adapts to wedding industry patterns. Peak season
          (May-October) has enhanced security and load balancing, while
          off-season allows broader access for planning activities.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export type {
  SeasonalAccessRule,
  SeasonalMetrics,
  WeddingSeasonPeriod,
  WeddingSeasonAccessProps,
};
