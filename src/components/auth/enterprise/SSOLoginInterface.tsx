'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, Shield, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SSOProvider {
  id: string;
  name: string;
  type: 'saml' | 'oidc' | 'oauth';
  icon: string;
  domains: string[];
  enabled: boolean;
}

interface SSOLoginInterfaceProps {
  redirectTo?: string;
  organizationId?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const defaultProviders: SSOProvider[] = [
  {
    id: 'microsoft',
    name: 'Microsoft Azure AD',
    type: 'oidc',
    icon: '🏢',
    domains: ['outlook.com', 'hotmail.com', 'live.com'],
    enabled: true,
  },
  {
    id: 'google',
    name: 'Google Workspace',
    type: 'oauth',
    icon: '🔍',
    domains: ['gmail.com'],
    enabled: true,
  },
  {
    id: 'okta',
    name: 'Okta',
    type: 'saml',
    icon: '🔐',
    domains: [],
    enabled: true,
  },
  {
    id: 'pingid',
    name: 'Ping Identity',
    type: 'saml',
    icon: '🎯',
    domains: [],
    enabled: true,
  },
  {
    id: 'auth0',
    name: 'Auth0',
    type: 'oidc',
    icon: '🔑',
    domains: [],
    enabled: true,
  },
];

export default function SSOLoginInterface({
  redirectTo = '/dashboard',
  organizationId,
  onSuccess,
  onError,
}: SSOLoginInterfaceProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [detectedProvider, setDetectedProvider] = useState<SSOProvider | null>(
    null,
  );
  const [availableProviders, setAvailableProviders] = useState<SSOProvider[]>(
    [],
  );
  const [error, setError] = useState('');
  const [showProviders, setShowProviders] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // Load organization-specific SSO providers
    loadOrganizationProviders();
  }, [organizationId]);

  const loadOrganizationProviders = async () => {
    try {
      if (organizationId) {
        const { data: orgProviders } = await supabase
          .from('sso_providers')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('enabled', true);

        if (orgProviders && orgProviders.length > 0) {
          setAvailableProviders(orgProviders);
        } else {
          setAvailableProviders(defaultProviders);
        }
      } else {
        setAvailableProviders(defaultProviders);
      }
    } catch (error) {
      console.error('Error loading SSO providers:', error);
      setAvailableProviders(defaultProviders);
    }
  };

  const detectProviderFromEmail = (email: string) => {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;

    const provider = availableProviders.find(
      (p) =>
        p.domains.includes(domain) || p.domains.some((d) => domain.endsWith(d)),
    );

    return provider || null;
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setError('');

    if (value.includes('@')) {
      const provider = detectProviderFromEmail(value);
      setDetectedProvider(provider);
      setShowProviders(provider !== null);
    } else {
      setDetectedProvider(null);
      setShowProviders(false);
    }
  };

  const handleSSOLogin = async (providerId: string) => {
    setIsLoading(true);
    setError('');

    try {
      const provider = availableProviders.find((p) => p.id === providerId);
      if (!provider) {
        throw new Error('Provider not found');
      }

      // For SAML/OIDC providers, redirect to custom SSO endpoint
      if (provider.type === 'saml' || provider.type === 'oidc') {
        const ssoUrl = `/api/auth/sso/${providerId}?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirectTo)}`;
        if (organizationId) {
          window.location.href = `${ssoUrl}&org=${organizationId}`;
        } else {
          window.location.href = ssoUrl;
        }
        return;
      }

      // For OAuth providers, use Supabase auth
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: providerId as any,
        options: {
          redirectTo: `${window.location.origin}${redirectTo}`,
          queryParams: {
            email,
            ...(organizationId && { organization_id: organizationId }),
          },
        },
      });

      if (authError) throw authError;

      onSuccess?.();
    } catch (error: any) {
      const errorMessage =
        error.message || 'Failed to authenticate with SSO provider';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}${redirectTo}`,
          data: {
            ...(organizationId && { organization_id: organizationId }),
          },
        },
      });

      if (authError) throw authError;

      // Show success message for email login
      setError('Check your email for a login link!');
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send login email';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Enterprise Login</CardTitle>
          <p className="text-muted-foreground text-sm">
            Sign in with your organization&apos;s SSO provider
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Work Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {error && (
            <Alert
              variant={
                error.includes('Check your email') ? 'default' : 'destructive'
              }
            >
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Detected Provider */}
          {detectedProvider && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{detectedProvider.icon}</span>
                  <div>
                    <p className="font-medium text-sm">Detected Provider</p>
                    <p className="text-xs text-muted-foreground">
                      {detectedProvider.name}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleSSOLogin(detectedProvider.id)}
                  disabled={isLoading || !email.includes('@')}
                  className="w-full mt-3"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <>
                      <Building2 className="h-4 w-4 mr-2" />
                      Sign in with {detectedProvider.name}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Available Providers */}
          {showProviders && !detectedProvider && (
            <div className="space-y-2">
              <Label>Choose your SSO provider:</Label>
              <div className="grid grid-cols-1 gap-2">
                {availableProviders.map((provider) => (
                  <Button
                    key={provider.id}
                    variant="outline"
                    onClick={() => handleSSOLogin(provider.id)}
                    disabled={isLoading}
                    className="justify-start"
                  >
                    <span className="mr-2">{provider.icon}</span>
                    {provider.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Manual Provider Selection */}
          {!showProviders && email && (
            <Button
              variant="outline"
              onClick={() => setShowProviders(true)}
              disabled={isLoading}
              className="w-full"
            >
              <Users className="h-4 w-4 mr-2" />
              Choose SSO Provider Manually
            </Button>
          )}

          {/* Email Fallback */}
          {email && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>
          )}

          {email && (
            <Button
              variant="secondary"
              onClick={handleEmailLogin}
              disabled={isLoading || !email.includes('@')}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                'Send Magic Link'
              )}
            </Button>
          )}

          {/* Wedding Industry Context */}
          <div className="text-center text-xs text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
            <p>🎊 Secure access for wedding vendor teams</p>
            <p>Enterprise-grade authentication for your wedding business</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Types for external use
export type { SSOProvider, SSOLoginInterfaceProps };
