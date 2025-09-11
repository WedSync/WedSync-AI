'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Building2,
  Globe,
  Shield,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

interface DomainMapping {
  id: string;
  domain: string;
  organizationId: string;
  providerId: string;
  providerName: string;
  providerType: 'saml' | 'oidc' | 'oauth';
  autoRedirect: boolean;
  verified: boolean;
  userCount: number;
  lastUsed?: Date;
}

interface DomainDetectionResult {
  domain: string;
  mappings: DomainMapping[];
  suggestedProvider?: DomainMapping;
  organizationName?: string;
  isWeddingBusiness: boolean;
}

interface DomainBasedRoutingProps {
  email?: string;
  onDomainDetected?: (result: DomainDetectionResult) => void;
  onProviderSelect?: (mapping: DomainMapping) => void;
  onNoProviderFound?: (domain: string) => void;
  autoRedirect?: boolean;
}

// Common wedding industry domains and their typical SSO patterns
const weddingIndustryDomains = {
  // Major venue chains
  'fourseasons.com': { type: 'venue', sso: 'saml' },
  'marriott.com': { type: 'venue', sso: 'saml' },
  'hyatt.com': { type: 'venue', sso: 'saml' },
  'hilton.com': { type: 'venue', sso: 'saml' },

  // Photography networks
  'fearlessphotographers.com': { type: 'photography', sso: 'oauth' },
  'junebugweddings.com': { type: 'photography', sso: 'oauth' },
  'styledbysam.com': { type: 'photography', sso: 'oauth' },

  // Catering chains
  'wolfgangguck.com': { type: 'catering', sso: 'oidc' },
  'creativeedge.com': { type: 'catering', sso: 'saml' },

  // Wedding planning agencies
  'thmevents.com': { type: 'planning', sso: 'oauth' },
  'mindyweiss.com': { type: 'planning', sso: 'oauth' },

  // Enterprise email providers (most wedding businesses use these)
  'gmail.com': { type: 'email', sso: 'oauth' },
  'outlook.com': { type: 'email', sso: 'oauth' },
  'icloud.com': { type: 'email', sso: 'oauth' },
};

export default function DomainBasedRouting({
  email = '',
  onDomainDetected,
  onProviderSelect,
  onNoProviderFound,
  autoRedirect = false,
}: DomainBasedRoutingProps) {
  const [currentEmail, setCurrentEmail] = useState(email);
  const [detectionResult, setDetectionResult] =
    useState<DomainDetectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (currentEmail && currentEmail.includes('@')) {
      detectDomain(currentEmail);
    }
  }, [currentEmail]);

  const detectDomain = async (emailAddress: string) => {
    const domain = emailAddress.split('@')[1]?.toLowerCase();
    if (!domain) return;

    setIsLoading(true);
    setError('');

    try {
      // Query for existing domain mappings
      const { data: mappings, error: mappingsError } = await supabase
        .from('domain_sso_mappings')
        .select(
          `
          *,
          sso_provider:sso_providers (
            id,
            name,
            type,
            enabled
          ),
          organization:organizations (
            name,
            industry
          )
        `,
        )
        .eq('domain', domain)
        .eq('verified', true);

      if (mappingsError) throw mappingsError;

      const domainMappings: DomainMapping[] = (mappings || []).map(
        (mapping) => ({
          id: mapping.id,
          domain: mapping.domain,
          organizationId: mapping.organization_id,
          providerId: mapping.provider_id,
          providerName: mapping.sso_provider?.name || 'Unknown Provider',
          providerType: mapping.sso_provider?.type || 'oauth',
          autoRedirect: mapping.auto_redirect || false,
          verified: mapping.verified,
          userCount: mapping.user_count || 0,
          lastUsed: mapping.last_used ? new Date(mapping.last_used) : undefined,
        }),
      );

      // Determine if this is a wedding business domain
      const isWeddingDomain =
        domain in weddingIndustryDomains ||
        (mappings &&
          mappings.some((m) => m.organization?.industry === 'wedding'));

      // Get suggested provider (highest user count or most recent)
      const suggestedProvider =
        domainMappings.length > 0
          ? domainMappings.reduce((prev, current) => {
              if (current.userCount > prev.userCount) return current;
              if (
                current.lastUsed &&
                prev.lastUsed &&
                current.lastUsed > prev.lastUsed
              )
                return current;
              return prev;
            })
          : undefined;

      const result: DomainDetectionResult = {
        domain,
        mappings: domainMappings,
        suggestedProvider,
        organizationName: mappings?.[0]?.organization?.name,
        isWeddingBusiness: isWeddingDomain,
      };

      setDetectionResult(result);
      onDomainDetected?.(result);

      // Auto-redirect if configured and there's only one provider
      if (
        autoRedirect &&
        suggestedProvider &&
        suggestedProvider.autoRedirect &&
        domainMappings.length === 1
      ) {
        setTimeout(() => {
          onProviderSelect?.(suggestedProvider);
        }, 1500);
      }

      // Handle no provider found
      if (domainMappings.length === 0) {
        onNoProviderFound?.(domain);
      }
    } catch (error: any) {
      console.error('Error detecting domain:', error);
      setError('Failed to detect domain configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderSelect = (mapping: DomainMapping) => {
    onProviderSelect?.(mapping);
  };

  const getIndustryInfo = (domain: string) => {
    const info =
      weddingIndustryDomains[domain as keyof typeof weddingIndustryDomains];
    if (!info) return null;

    const typeLabels = {
      venue: '🏛️ Venue',
      photography: '📸 Photography',
      catering: '🍽️ Catering',
      planning: '📋 Planning',
      email: '📧 Email Provider',
    };

    return {
      label: typeLabels[info.type as keyof typeof typeLabels],
      recommendedSSO: info.sso,
    };
  };

  return (
    <div className="space-y-4">
      {/* Email Input */}
      <div className="space-y-2">
        <Label htmlFor="domain-email">Email Address</Label>
        <Input
          id="domain-email"
          type="email"
          placeholder="Enter your work email address"
          value={currentEmail}
          onChange={(e) => setCurrentEmail(e.target.value)}
          className="text-base"
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm text-muted-foreground">
                Detecting domain configuration...
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detection Results */}
      {detectionResult && !isLoading && (
        <div className="space-y-4">
          {/* Domain Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {detectionResult.domain}
                </CardTitle>
                <div className="flex gap-2">
                  {detectionResult.isWeddingBusiness && (
                    <Badge variant="secondary">🎊 Wedding Industry</Badge>
                  )}
                  {detectionResult.mappings.length > 0 ? (
                    <Badge variant="success">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      SSO Configured
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      No SSO Found
                    </Badge>
                  )}
                </div>
              </div>
              {detectionResult.organizationName && (
                <p className="text-sm text-muted-foreground">
                  Organization: {detectionResult.organizationName}
                </p>
              )}
            </CardHeader>

            {/* Industry Information */}
            {(() => {
              const industryInfo = getIndustryInfo(detectionResult.domain);
              if (industryInfo) {
                return (
                  <CardContent className="pt-0">
                    <Alert>
                      <AlertDescription>
                        <strong>{industryInfo.label}</strong> - Recommended SSO
                        type: {industryInfo.recommendedSSO.toUpperCase()}
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                );
              }
              return null;
            })()}
          </Card>

          {/* Available Providers */}
          {detectionResult.mappings.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Available SSO Providers</h3>
              {detectionResult.mappings.map((mapping) => (
                <Card
                  key={mapping.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    mapping.id === detectionResult.suggestedProvider?.id
                      ? 'ring-2 ring-primary'
                      : ''
                  }`}
                  onClick={() => handleProviderSelect(mapping)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Shield className="h-8 w-8 text-primary" />
                        <div>
                          <h4 className="font-medium">
                            {mapping.providerName}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {mapping.providerType.toUpperCase()}
                            </Badge>
                            <span>•</span>
                            <span>{mapping.userCount} users</span>
                            {mapping.lastUsed && (
                              <>
                                <span>•</span>
                                <span>
                                  Last used{' '}
                                  {mapping.lastUsed.toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {mapping.id ===
                          detectionResult.suggestedProvider?.id && (
                          <Badge variant="success">Recommended</Badge>
                        )}
                        {mapping.autoRedirect && (
                          <Badge variant="secondary">Auto-redirect</Badge>
                        )}
                        <Button size="sm">
                          Sign In
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* No Providers Found */}
          {detectionResult.mappings.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  No SSO Configuration Found
                </h3>
                <p className="text-muted-foreground mb-4">
                  Your organization hasn&apos;t set up SSO for{' '}
                  <strong>{detectionResult.domain}</strong> yet.
                </p>

                {detectionResult.isWeddingBusiness && (
                  <Alert className="mb-4">
                    <AlertDescription>
                      🎊 <strong>Wedding Business Detected!</strong> Many
                      wedding vendors use email-based authentication or set up
                      SSO through their venue management systems.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => window.open('/auth/email', '_self')}
                  >
                    Continue with Email
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => window.open('/contact/sso-setup', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Request SSO Setup
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Auto-redirect Notification */}
          {autoRedirect &&
            detectionResult.suggestedProvider &&
            detectionResult.suggestedProvider.autoRedirect && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Auto-redirecting to{' '}
                  {detectionResult.suggestedProvider.providerName} in 3
                  seconds...
                </AlertDescription>
              </Alert>
            )}
        </div>
      )}
    </div>
  );
}

export type { DomainMapping, DomainDetectionResult, DomainBasedRoutingProps };
