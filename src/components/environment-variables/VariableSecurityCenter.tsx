'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Shield,
  Lock,
  Eye,
  AlertTriangle,
  User,
  Clock,
  Search,
  Activity,
  Key,
  UserCheck,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Progress } from '@/components/ui/progress';

interface Variable {
  id: string;
  key: string;
  environment: string;
  security_level:
    | 'Public'
    | 'Internal'
    | 'Confidential'
    | 'Wedding-Day-Critical';
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
}

interface AuditLogEntry {
  id: string;
  variable_key: string;
  environment: string;
  action:
    | 'created'
    | 'updated'
    | 'deleted'
    | 'accessed'
    | 'encrypted'
    | 'decrypted';
  user_id: string;
  user_email?: string;
  timestamp: string;
  metadata: any;
  ip_address?: string;
}

interface SecurityStats {
  total_variables: number;
  encrypted_variables: number;
  high_security_variables: number;
  recent_access_events: number;
  security_score: number;
}

interface VariableSecurityCenterProps {
  variables: Variable[];
  onSecurityUpdate: () => void;
  isReadOnly?: boolean;
}

export function VariableSecurityCenter({
  variables,
  onSecurityUpdate,
  isReadOnly = false,
}: VariableSecurityCenterProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [securityStats, setSecurityStats] = useState<SecurityStats>({
    total_variables: 0,
    encrypted_variables: 0,
    high_security_variables: 0,
    recent_access_events: 0,
    security_score: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadSecurityData();
  }, [variables]);

  const loadSecurityData = async () => {
    setIsLoading(true);
    try {
      // Load audit logs
      const { data: auditData, error: auditError } = await supabase
        .from('environment_variable_audit')
        .select(
          `
          *,
          profiles:user_id(email)
        `,
        )
        .order('timestamp', { ascending: false })
        .limit(100);

      if (auditError) throw auditError;
      setAuditLogs(auditData || []);

      // Calculate security stats
      const stats = calculateSecurityStats(variables, auditData || []);
      setSecurityStats(stats);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSecurityStats = (
    vars: Variable[],
    logs: AuditLogEntry[],
  ): SecurityStats => {
    const total = vars.length;
    const encrypted = vars.filter((v) => v.is_encrypted).length;
    const highSecurity = vars.filter(
      (v) =>
        v.security_level === 'Confidential' ||
        v.security_level === 'Wedding-Day-Critical',
    ).length;

    // Recent access events (last 24 hours)
    const recentLogs = logs.filter((log) => {
      const logTime = new Date(log.timestamp);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return logTime > dayAgo;
    });

    // Calculate security score (0-100)
    let score = 70; // Base score
    if (total > 0) {
      const encryptionRatio = encrypted / total;
      const highSecurityRatio = highSecurity / total;

      score += encryptionRatio * 20; // Up to 20 points for encryption
      score += highSecurityRatio * 10; // Up to 10 points for proper classification

      // Deduct points for security issues
      const publicProductionVars = vars.filter(
        (v) => v.environment === 'production' && v.security_level === 'Public',
      ).length;
      score -= publicProductionVars * 5; // -5 points per public prod var
    }

    return {
      total_variables: total,
      encrypted_variables: encrypted,
      high_security_variables: highSecurity,
      recent_access_events: recentLogs.length,
      security_score: Math.max(0, Math.min(100, Math.round(score))),
    };
  };

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'Public':
        return 'text-green-600 bg-green-50';
      case 'Internal':
        return 'text-blue-600 bg-blue-50';
      case 'Confidential':
        return 'text-orange-600 bg-orange-50';
      case 'Wedding-Day-Critical':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <User className="h-4 w-4 text-green-600" />;
      case 'updated':
        return <Activity className="h-4 w-4 text-blue-600" />;
      case 'deleted':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'accessed':
        return <Eye className="h-4 w-4 text-gray-600" />;
      case 'encrypted':
        return <Lock className="h-4 w-4 text-blue-600" />;
      case 'decrypted':
        return <Key className="h-4 w-4 text-orange-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredLogs = auditLogs.filter(
    (log) =>
      log.variable_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const securityLevelCounts = variables.reduce(
    (acc, variable) => {
      acc[variable.security_level] = (acc[variable.security_level] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">
                  {securityStats.security_score}%
                </p>
                <p className="text-sm text-gray-600">Security Score</p>
              </div>
            </div>
            <Progress value={securityStats.security_score} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Lock className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {securityStats.encrypted_variables}/
                  {securityStats.total_variables}
                </p>
                <p className="text-sm text-gray-600">Encrypted Variables</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {securityStats.high_security_variables}
                </p>
                <p className="text-sm text-gray-600">High Security</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Activity className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {securityStats.recent_access_events}
                </p>
                <p className="text-sm text-gray-600">Recent Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Analysis */}
      <Tabs defaultValue="classification" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="classification">Classification</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
        </TabsList>

        <TabsContent value="classification" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Classification Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(securityLevelCounts).map(([level, count]) => (
                  <div
                    key={level}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center space-x-3">
                      <Badge className={getSecurityLevelColor(level)}>
                        {level}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {count} variable{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="text-sm font-medium">
                      {securityStats.total_variables > 0
                        ? Math.round(
                            (count / securityStats.total_variables) * 100,
                          )
                        : 0}
                      %
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Security Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Security Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityStats.security_score < 80 && (
                  <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        Security Score Below Recommended Level
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Consider encrypting more sensitive variables and
                        reviewing security classifications.
                      </p>
                    </div>
                  </div>
                )}

                {variables.filter(
                  (v) => v.environment === 'production' && !v.is_encrypted,
                ).length > 0 && (
                  <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-lg">
                    <Lock className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        Unencrypted Production Variables
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        {
                          variables.filter(
                            (v) =>
                              v.environment === 'production' && !v.is_encrypted,
                          ).length
                        }{' '}
                        production variables are not encrypted.
                      </p>
                    </div>
                  </div>
                )}

                {variables.filter(
                  (v) =>
                    v.environment === 'production' &&
                    v.security_level === 'Public',
                ).length > 0 && (
                  <div className="flex items-start space-x-3 p-4 bg-orange-50 rounded-lg">
                    <Shield className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-800">
                        Public Variables in Production
                      </p>
                      <p className="text-xs text-orange-700 mt-1">
                        Review if these variables should have higher security
                        classification.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Audit Trail</CardTitle>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search audit logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No audit logs found</p>
                  </div>
                ) : (
                  filteredLogs.slice(0, 20).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center space-x-4 p-4 border rounded-lg"
                    >
                      <div className="flex-shrink-0">
                        {getActionIcon(log.action)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">
                            {log.variable_key}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {log.environment}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {log.action}
                          </Badge>
                        </div>

                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{log.user_email || log.user_id}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatDistanceToNow(new Date(log.timestamp), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          {log.ip_address && <span>IP: {log.ip_address}</span>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Access Control Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Role-Based Access */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">
                    Role-Based Access Control
                  </h4>

                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <UserCheck className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium">Administrator</p>
                          <p className="text-xs text-gray-500">
                            Full access to all environments
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">3 users</Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <User className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium">Developer</p>
                          <p className="text-xs text-gray-500">
                            Read/write dev & staging only
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">8 users</Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Eye className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="text-sm font-medium">Read-Only</p>
                          <p className="text-xs text-gray-500">
                            View access to all environments
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">5 users</Badge>
                    </div>
                  </div>
                </div>

                {/* Access Restrictions */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">
                    Current Access Restrictions
                  </h4>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        Wedding Day Restrictions Active
                      </span>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      Production environment modifications are restricted during
                      wedding hours (Fri 6PM - Sun 6PM)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
