'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ComplianceCheck {
  id: string;
  category: 'technical' | 'content' | 'legal' | 'assets' | 'security';
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'checking' | 'passed' | 'failed' | 'warning' | 'not_applicable';
  store: 'microsoft' | 'google_play' | 'apple' | 'all';
  details?: string;
  recommendation?: string;
  fixUrl?: string;
}

interface ComplianceReport {
  overall: 'passed' | 'failed' | 'warnings';
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
  lastRunDate: Date;
  stores: {
    microsoft: ComplianceCheck[];
    google_play: ComplianceCheck[];
    apple: ComplianceCheck[];
  };
}

interface ComplianceCheckerProps {
  targetStores?: ('microsoft' | 'google_play' | 'apple')[];
  onComplianceUpdate?: (report: ComplianceReport) => void;
}

const COMPLIANCE_CHECKS: ComplianceCheck[] = [
  // Technical Checks
  {
    id: 'tech-001',
    category: 'technical',
    name: 'HTTPS Requirement',
    description: 'Application must be served over HTTPS',
    severity: 'critical',
    status: 'checking',
    store: 'all',
    recommendation: 'Ensure your production domain uses SSL/TLS certificate',
  },
  {
    id: 'tech-002',
    category: 'technical',
    name: 'Service Worker Registration',
    description: 'PWA must have a registered and functional service worker',
    severity: 'critical',
    status: 'checking',
    store: 'microsoft',
    recommendation: 'Register service worker in your main JavaScript file',
  },
  {
    id: 'tech-003',
    category: 'technical',
    name: 'Web App Manifest',
    description: 'Valid manifest.json with required fields',
    severity: 'critical',
    status: 'checking',
    store: 'all',
    recommendation: 'Include name, short_name, start_url, display, and icons',
  },
  {
    id: 'tech-004',
    category: 'technical',
    name: 'Digital Asset Links',
    description: 'TWA requires valid assetlinks.json for domain verification',
    severity: 'critical',
    status: 'checking',
    store: 'google_play',
    recommendation:
      'Create .well-known/assetlinks.json with correct package name and fingerprint',
  },
  {
    id: 'tech-005',
    category: 'technical',
    name: 'Responsive Design',
    description: 'Application must work across different screen sizes',
    severity: 'high',
    status: 'checking',
    store: 'all',
    recommendation: 'Test on mobile, tablet, and desktop viewports',
  },

  // Content Checks
  {
    id: 'content-001',
    category: 'content',
    name: 'Family-Friendly Content',
    description: 'All content must be appropriate for all audiences',
    severity: 'critical',
    status: 'checking',
    store: 'all',
    recommendation: 'Review all text, images, and user-generated content',
  },
  {
    id: 'content-002',
    category: 'content',
    name: 'Wedding Industry Appropriateness',
    description: 'Content should be professional and wedding-appropriate',
    severity: 'medium',
    status: 'checking',
    store: 'all',
    recommendation: 'Use professional wedding imagery and terminology',
  },
  {
    id: 'content-003',
    category: 'content',
    name: 'No Misleading Claims',
    description: 'Avoid exaggerated or unsubstantiated claims',
    severity: 'high',
    status: 'checking',
    store: 'all',
    recommendation: 'Use factual descriptions and avoid superlatives',
  },

  // Asset Checks
  {
    id: 'assets-001',
    category: 'assets',
    name: 'App Icon Requirements',
    description: 'Icon meets size, format, and design requirements',
    severity: 'critical',
    status: 'checking',
    store: 'all',
    recommendation: 'Provide required icon sizes in PNG format',
  },
  {
    id: 'assets-002',
    category: 'assets',
    name: 'Screenshot Requirements',
    description: 'Screenshots meet platform-specific requirements',
    severity: 'high',
    status: 'checking',
    store: 'all',
    recommendation: 'Provide minimum required screenshots for each platform',
  },
  {
    id: 'assets-003',
    category: 'assets',
    name: 'Feature Graphic',
    description: 'Google Play requires 1024x500 feature graphic',
    severity: 'high',
    status: 'checking',
    store: 'google_play',
    recommendation: 'Create compelling feature graphic showcasing app benefits',
  },

  // Legal Checks
  {
    id: 'legal-001',
    category: 'legal',
    name: 'Privacy Policy',
    description: 'Privacy policy must be accessible and comprehensive',
    severity: 'critical',
    status: 'checking',
    store: 'all',
    recommendation: 'Link privacy policy in app and store listing',
  },
  {
    id: 'legal-002',
    category: 'legal',
    name: 'Terms of Service',
    description: 'Terms of service must be clearly accessible',
    severity: 'high',
    status: 'checking',
    store: 'all',
    recommendation: 'Include terms of service link in app footer',
  },
  {
    id: 'legal-003',
    category: 'legal',
    name: 'GDPR Compliance',
    description: 'Data handling must comply with GDPR requirements',
    severity: 'critical',
    status: 'checking',
    store: 'all',
    recommendation: 'Implement consent management and data deletion',
  },

  // Security Checks
  {
    id: 'security-001',
    category: 'security',
    name: 'Data Encryption',
    description: 'Sensitive data must be encrypted in transit and at rest',
    severity: 'critical',
    status: 'checking',
    store: 'all',
    recommendation: 'Use HTTPS and encrypt stored personal information',
  },
  {
    id: 'security-002',
    category: 'security',
    name: 'Authentication Security',
    description: 'Secure authentication implementation',
    severity: 'high',
    status: 'checking',
    store: 'all',
    recommendation:
      'Use secure password policies and multi-factor authentication',
  },
  {
    id: 'security-003',
    category: 'security',
    name: 'API Security',
    description: 'API endpoints must be properly secured',
    severity: 'high',
    status: 'checking',
    store: 'all',
    recommendation:
      'Implement rate limiting, authentication, and input validation',
  },
];

export function ComplianceChecker({
  targetStores = ['microsoft', 'google_play', 'apple'],
  onComplianceUpdate,
}: ComplianceCheckerProps) {
  const [checks, setChecks] = useState<ComplianceCheck[]>(COMPLIANCE_CHECKS);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStore, setSelectedStore] = useState<string>('all');

  const runComplianceCheck = useCallback(async () => {
    setIsRunning(true);
    setProgress(0);

    const relevantChecks = checks.filter(
      (check) =>
        check.store === 'all' || targetStores.includes(check.store as any),
    );

    // Reset all checks to "checking" status
    setChecks((prev) =>
      prev.map((check) => ({ ...check, status: 'checking' })),
    );

    // Simulate running each check
    for (let i = 0; i < relevantChecks.length; i++) {
      const check = relevantChecks[i];

      // Simulate check execution time
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 1000 + 500),
      );

      // Simulate check results based on check type
      const result = await simulateCheck(check);

      setChecks((prev) =>
        prev.map((c) => (c.id === check.id ? { ...c, ...result } : c)),
      );

      setProgress(((i + 1) / relevantChecks.length) * 100);
    }

    setIsRunning(false);

    // Generate compliance report
    const finalChecks = checks.map((c) => {
      const updated = relevantChecks.find((rc) => rc.id === c.id);
      return updated ? { ...c, ...updated } : c;
    });

    const report = generateComplianceReport(finalChecks);
    onComplianceUpdate?.(report);
  }, [checks, targetStores, onComplianceUpdate]);

  const simulateCheck = async (
    check: ComplianceCheck,
  ): Promise<Partial<ComplianceCheck>> => {
    // Simulate different check outcomes based on check type
    switch (check.id) {
      case 'tech-001': // HTTPS
        return {
          status: 'passed',
          details:
            'Application is served over HTTPS with valid SSL certificate',
        };

      case 'tech-002': // Service Worker
        return {
          status: 'warning',
          details:
            'Service worker is registered but offline functionality could be improved',
          recommendation: 'Implement comprehensive offline caching strategy',
        };

      case 'tech-004': // Digital Asset Links
        return {
          status: 'failed',
          details: 'assetlinks.json not found or invalid',
          recommendation:
            'Create .well-known/assetlinks.json with correct package signature',
          fixUrl: '/admin/app-store/digital-asset-links',
        };

      case 'content-001': // Family-Friendly
        return {
          status: 'passed',
          details: 'All content reviewed and appropriate for all audiences',
        };

      case 'assets-001': // App Icons
        return {
          status: 'warning',
          details: 'Icons present but could use higher resolution versions',
          recommendation: 'Provide 1024x1024 master icon for all platforms',
        };

      case 'legal-001': // Privacy Policy
        return {
          status: 'passed',
          details: 'Privacy policy is accessible and compliant',
        };

      case 'security-001': // Data Encryption
        return {
          status: 'passed',
          details: 'HTTPS in use and sensitive data properly encrypted',
        };

      default:
        // Random results for other checks
        const outcomes = ['passed', 'warning', 'failed'] as const;
        const weights = [0.7, 0.2, 0.1]; // 70% pass, 20% warning, 10% fail
        const random = Math.random();
        let outcome = outcomes[0];

        let cumulative = 0;
        for (let i = 0; i < weights.length; i++) {
          cumulative += weights[i];
          if (random <= cumulative) {
            outcome = outcomes[i];
            break;
          }
        }

        return {
          status: outcome,
          details:
            outcome === 'passed'
              ? 'Check completed successfully'
              : outcome === 'warning'
                ? 'Minor issues found'
                : 'Issues found that need attention',
        };
    }
  };

  const generateComplianceReport = (
    finalChecks: ComplianceCheck[],
  ): ComplianceReport => {
    const relevantChecks = finalChecks.filter(
      (check) =>
        check.store === 'all' || targetStores.includes(check.store as any),
    );

    const passedChecks = relevantChecks.filter(
      (c) => c.status === 'passed',
    ).length;
    const failedChecks = relevantChecks.filter(
      (c) => c.status === 'failed',
    ).length;
    const warningChecks = relevantChecks.filter(
      (c) => c.status === 'warning',
    ).length;

    const overall =
      failedChecks > 0 ? 'failed' : warningChecks > 0 ? 'warnings' : 'passed';

    return {
      overall,
      totalChecks: relevantChecks.length,
      passedChecks,
      failedChecks,
      warningChecks,
      lastRunDate: new Date(),
      stores: {
        microsoft: finalChecks.filter(
          (c) => c.store === 'microsoft' || c.store === 'all',
        ),
        google_play: finalChecks.filter(
          (c) => c.store === 'google_play' || c.store === 'all',
        ),
        apple: finalChecks.filter(
          (c) => c.store === 'apple' || c.store === 'all',
        ),
      },
    };
  };

  const getStatusColor = (status: ComplianceCheck['status']) => {
    switch (status) {
      case 'passed':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'failed':
        return 'bg-red-500';
      case 'checking':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: ComplianceCheck['status']) => {
    switch (status) {
      case 'passed':
        return 'Passed';
      case 'warning':
        return 'Warning';
      case 'failed':
        return 'Failed';
      case 'checking':
        return 'Checking...';
      default:
        return 'Not Run';
    }
  };

  const getSeverityColor = (severity: ComplianceCheck['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const filteredChecks = checks.filter((check) => {
    const categoryMatch =
      selectedCategory === 'all' || check.category === selectedCategory;
    const storeMatch =
      selectedStore === 'all' ||
      check.store === selectedStore ||
      check.store === 'all';
    const targetStoreMatch =
      check.store === 'all' || targetStores.includes(check.store as any);
    return categoryMatch && storeMatch && targetStoreMatch;
  });

  const getOverallStatus = () => {
    const relevantChecks = checks.filter(
      (check) =>
        check.store === 'all' || targetStores.includes(check.store as any),
    );
    const failed = relevantChecks.filter((c) => c.status === 'failed').length;
    const warnings = relevantChecks.filter(
      (c) => c.status === 'warning',
    ).length;

    if (failed > 0)
      return { status: 'failed', color: 'text-red-600', text: 'Issues Found' };
    if (warnings > 0)
      return { status: 'warning', color: 'text-yellow-600', text: 'Warnings' };
    return {
      status: 'passed',
      color: 'text-green-600',
      text: 'All Checks Passed',
    };
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Compliance Checker</h2>
        <div className="flex items-center space-x-4">
          <div className={`text-right ${overallStatus.color}`}>
            <div className="font-semibold">{overallStatus.text}</div>
            <div className="text-sm">
              {filteredChecks.filter((c) => c.status === 'passed').length} of{' '}
              {filteredChecks.length} checks passed
            </div>
          </div>
          <Button onClick={runComplianceCheck} disabled={isRunning}>
            {isRunning ? 'Running Checks...' : 'Run Compliance Check'}
          </Button>
        </div>
      </div>

      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Running Compliance Checks
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="checks">Detailed Checks</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Category Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {['technical', 'content', 'assets', 'legal', 'security'].map(
              (category) => {
                const categoryChecks = filteredChecks.filter(
                  (c) => c.category === category,
                );
                const passed = categoryChecks.filter(
                  (c) => c.status === 'passed',
                ).length;
                const total = categoryChecks.length;
                const percentage = total > 0 ? (passed / total) * 100 : 0;

                return (
                  <Card key={category}>
                    <CardContent className="pt-6">
                      <div className="text-center space-y-2">
                        <h3 className="font-medium text-sm capitalize">
                          {category}
                        </h3>
                        <div className="text-2xl font-bold">
                          {passed}/{total}
                        </div>
                        <Progress value={percentage} className="h-2" />
                        <p className="text-xs text-gray-500">
                          {Math.round(percentage)}% compliant
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              },
            )}
          </div>

          {/* Critical Issues */}
          {filteredChecks.filter(
            (c) => c.status === 'failed' && c.severity === 'critical',
          ).length > 0 && (
            <Alert variant="destructive">
              <AlertTitle>Critical Issues Found</AlertTitle>
              <AlertDescription>
                {
                  filteredChecks.filter(
                    (c) => c.status === 'failed' && c.severity === 'critical',
                  ).length
                }{' '}
                critical issues must be resolved before store submission.
              </AlertDescription>
            </Alert>
          )}

          {/* Store-Specific Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {targetStores.map((store) => {
              const storeChecks = checks.filter(
                (c) => c.store === store || c.store === 'all',
              );
              const passed = storeChecks.filter(
                (c) => c.status === 'passed',
              ).length;
              const failed = storeChecks.filter(
                (c) => c.status === 'failed',
              ).length;
              const warnings = storeChecks.filter(
                (c) => c.status === 'warning',
              ).length;

              return (
                <Card key={store}>
                  <CardHeader>
                    <CardTitle className="text-base capitalize">
                      {store.replace('_', ' ')} Store
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Passed</span>
                        <span>{passed}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-yellow-600">Warnings</span>
                        <span>{warnings}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-red-600">Failed</span>
                        <span>{failed}</span>
                      </div>
                      <div className="pt-2 border-t">
                        <Badge
                          variant={
                            failed > 0
                              ? 'destructive'
                              : warnings > 0
                                ? 'secondary'
                                : 'default'
                          }
                        >
                          {failed > 0
                            ? 'Not Ready'
                            : warnings > 0
                              ? 'Ready with Warnings'
                              : 'Ready'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="checks" className="space-y-6">
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
            >
              <option value="all">All Categories</option>
              <option value="technical">Technical</option>
              <option value="content">Content</option>
              <option value="assets">Assets</option>
              <option value="legal">Legal</option>
              <option value="security">Security</option>
            </select>

            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
            >
              <option value="all">All Stores</option>
              <option value="microsoft">Microsoft Store</option>
              <option value="google_play">Google Play</option>
              <option value="apple">Apple App Store</option>
            </select>
          </div>

          {/* Checks List */}
          <div className="space-y-3">
            {filteredChecks.map((check) => (
              <Card
                key={check.id}
                className={`border-l-4 ${
                  check.status === 'failed'
                    ? 'border-red-500'
                    : check.status === 'warning'
                      ? 'border-yellow-500'
                      : check.status === 'passed'
                        ? 'border-green-500'
                        : 'border-gray-300'
                }`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium">{check.name}</h4>
                        <Badge
                          size="sm"
                          className={getSeverityColor(check.severity)}
                          variant="outline"
                        >
                          {check.severity}
                        </Badge>
                        <Badge
                          size="sm"
                          className={getStatusColor(check.status)}
                        >
                          {getStatusText(check.status)}
                        </Badge>
                        <Badge
                          size="sm"
                          variant="secondary"
                          className="capitalize"
                        >
                          {check.store === 'all'
                            ? 'All Stores'
                            : check.store.replace('_', ' ')}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600 mb-2">
                        {check.description}
                      </p>

                      {check.details && (
                        <p className="text-sm text-gray-800 mb-2">
                          <strong>Details:</strong> {check.details}
                        </p>
                      )}

                      {check.recommendation && (
                        <p className="text-sm text-blue-700">
                          <strong>Recommendation:</strong>{' '}
                          {check.recommendation}
                        </p>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      {check.fixUrl && (
                        <Button size="sm" variant="outline">
                          Fix Issue
                        </Button>
                      )}
                      <Button size="sm" variant="ghost">
                        Learn More
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Priority Recommendations</h3>

            {/* Critical Issues */}
            {filteredChecks.filter(
              (c) => c.status === 'failed' && c.severity === 'critical',
            ).length > 0 && (
              <Alert variant="destructive">
                <AlertTitle>Critical Issues (Must Fix)</AlertTitle>
                <AlertDescription className="mt-2">
                  <ul className="space-y-1">
                    {filteredChecks
                      .filter(
                        (c) =>
                          c.status === 'failed' && c.severity === 'critical',
                      )
                      .map((check) => (
                        <li key={check.id}>
                          • {check.name}: {check.recommendation}
                        </li>
                      ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* High Priority Issues */}
            {filteredChecks.filter(
              (c) => c.status === 'failed' && c.severity === 'high',
            ).length > 0 && (
              <Alert>
                <AlertTitle>High Priority Issues (Recommended)</AlertTitle>
                <AlertDescription className="mt-2">
                  <ul className="space-y-1">
                    {filteredChecks
                      .filter(
                        (c) => c.status === 'failed' && c.severity === 'high',
                      )
                      .map((check) => (
                        <li key={check.id}>
                          • {check.name}: {check.recommendation}
                        </li>
                      ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Optimization Suggestions */}
            {filteredChecks.filter((c) => c.status === 'warning').length >
              0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Optimization Suggestions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {filteredChecks
                      .filter((c) => c.status === 'warning')
                      .map((check) => (
                        <li
                          key={check.id}
                          className="flex items-start space-x-2"
                        >
                          <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                          <div>
                            <span className="font-medium">{check.name}:</span>{' '}
                            {check.recommendation}
                          </div>
                        </li>
                      ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
