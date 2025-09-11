'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Globe,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface DomainStatus {
  configured: boolean;
  dns_status: 'pending' | 'configured' | 'error';
  ssl_status: 'pending' | 'issued' | 'error';
  verification_record?: {
    type: string;
    name: string;
    value: string;
  };
  error_message?: string;
}

interface DomainConfig {
  website_id: string;
  current_domain?: string;
  domain_verified: boolean;
  ssl_enabled: boolean;
  status: DomainStatus;
  default_domain: string;
  setup_instructions: string[];
}

interface CustomDomainSetupProps {
  websiteId: string;
  className?: string;
}

export function CustomDomainSetup({
  websiteId,
  className = '',
}: CustomDomainSetupProps) {
  const [config, setConfig] = useState<DomainConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDomainConfig();
  }, [websiteId]);

  const fetchDomainConfig = async () => {
    try {
      const response = await fetch(
        `/api/wedding-website/domain?website_id=${websiteId}`,
      );
      const result = await response.json();

      if (result.success) {
        setConfig(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch domain configuration');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error('Error fetching domain config:', err);
    } finally {
      setLoading(false);
    }
  };

  const configureDomain = async () => {
    if (!newDomain.trim()) {
      setError('Please enter a domain name');
      return;
    }

    setWorking(true);
    try {
      const response = await fetch('/api/wedding-website/domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteId,
          domain: newDomain.trim(),
          action: 'configure',
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchDomainConfig();
        setNewDomain('');
        setActiveTab('dns');
        setError(null);
      } else {
        setError(result.error || 'Failed to configure domain');
      }
    } catch (err) {
      setError('Error configuring domain');
      console.error('Error configuring domain:', err);
    } finally {
      setWorking(false);
    }
  };

  const verifyDomain = async () => {
    setWorking(true);
    try {
      const response = await fetch('/api/wedding-website/domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteId,
          action: 'verify',
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchDomainConfig();
        setError(null);
      } else {
        setError(result.error || 'Failed to verify domain');
      }
    } catch (err) {
      setError('Error verifying domain');
      console.error('Error verifying domain:', err);
    } finally {
      setWorking(false);
    }
  };

  const removeDomain = async () => {
    if (
      !confirm(
        'Are you sure you want to remove the custom domain? Your website will revert to the default domain.',
      )
    ) {
      return;
    }

    setWorking(true);
    try {
      const response = await fetch('/api/wedding-website/domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteId,
          action: 'remove',
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchDomainConfig();
        setActiveTab('overview');
        setError(null);
      } else {
        setError(result.error || 'Failed to remove domain');
      }
    } catch (err) {
      setError('Error removing domain');
      console.error('Error removing domain:', err);
    } finally {
      setWorking(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'configured':
      case 'issued':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'configured':
      case 'issued':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      default:
        return <Badge variant="secondary">Not Set</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-48"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="pt-6">
          <p className="text-red-600 text-center">
            {error || 'Unable to load domain configuration'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Custom Domain Setup</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDomainConfig}
              disabled={working}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${working ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Current Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Current Domain</h4>
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-gray-500" />
                <span className="font-mono">
                  {config.current_domain || config.default_domain}
                </span>
                {config.current_domain &&
                  getStatusBadge(config.status.dns_status)}
              </div>
              {config.current_domain && (
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(config.status.dns_status)}
                    <span>DNS: {config.status.dns_status}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(config.status.ssl_status)}
                    <span>SSL: {config.status.ssl_status}</span>
                  </div>
                </div>
              )}
            </div>
            <div>
              <h4 className="font-medium mb-2">Website URL</h4>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://${config.current_domain || config.default_domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2"
                >
                  <span>Visit Website</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Setup Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="configure">Configure</TabsTrigger>
              <TabsTrigger value="dns">DNS Setup</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Domain Status</h3>
                <div className="space-y-4">
                  {config.setup_instructions.map((instruction, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <span className="text-gray-700">{instruction}</span>
                    </div>
                  ))}
                </div>
              </div>

              {config.current_domain && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Custom Domain Actions</h4>
                      <p className="text-sm text-gray-600">
                        Manage your custom domain configuration
                      </p>
                    </div>
                    <div className="space-x-2">
                      <Button
                        onClick={verifyDomain}
                        disabled={working}
                        size="sm"
                      >
                        {working ? 'Verifying...' : 'Verify Domain'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={removeDomain}
                        disabled={working}
                        size="sm"
                      >
                        Remove Domain
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Configure Tab */}
            <TabsContent value="configure" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Add Custom Domain
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Domain Name
                    </label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="yourdomain.com"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        disabled={working}
                      />
                      <Button
                        onClick={configureDomain}
                        disabled={working || !newDomain.trim()}
                      >
                        {working ? 'Configuring...' : 'Configure'}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Enter your domain without "https://" or "www"
                    </p>
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Important:</strong> You must own this domain and
                      have access to its DNS settings. You'll need to add DNS
                      records to verify ownership and point the domain to our
                      servers.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </TabsContent>

            {/* DNS Setup Tab */}
            <TabsContent value="dns" className="space-y-6">
              {config.current_domain ? (
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    DNS Configuration
                  </h3>
                  <div className="space-y-6">
                    {/* Verification Record */}
                    {config.status.verification_record && (
                      <div>
                        <h4 className="font-medium mb-3 flex items-center space-x-2">
                          <span>1. Verification Record</span>
                          {getStatusIcon(config.status.dns_status)}
                        </h4>
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Type:</span>
                              <div className="font-mono">
                                {config.status.verification_record.type}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Name:</span>
                              <div className="font-mono break-all">
                                {config.status.verification_record.name}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Value:</span>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono break-all">
                                  {config.status.verification_record.value}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    copyToClipboard(
                                      config.status.verification_record!.value,
                                    )
                                  }
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CNAME Record */}
                    <div>
                      <h4 className="font-medium mb-3">2. CNAME Record</h4>
                      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Type:</span>
                            <div className="font-mono">CNAME</div>
                          </div>
                          <div>
                            <span className="font-medium">Name:</span>
                            <div className="font-mono">
                              {config.current_domain}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">Value:</span>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono">
                                websites.wedsync.app
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  copyToClipboard('websites.wedsync.app')
                                }
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SSL Status */}
                    <div className="pt-4 border-t">
                      <div className="flex items-center space-x-2 mb-3">
                        <Shield className="h-5 w-5 text-gray-500" />
                        <h4 className="font-medium">SSL Certificate</h4>
                        {getStatusBadge(config.status.ssl_status)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {config.status.ssl_status === 'pending'
                          ? 'SSL certificate will be automatically provisioned once DNS is configured.'
                          : config.status.ssl_status === 'issued'
                            ? 'SSL certificate is active. Your website is secure!'
                            : 'SSL certificate provisioning failed. Please verify your DNS configuration.'}
                      </p>
                    </div>

                    {/* Instructions */}
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p>
                            <strong>Next Steps:</strong>
                          </p>
                          <ol className="list-decimal list-inside space-y-1 text-sm">
                            <li>
                              Log in to your domain registrar or DNS provider
                            </li>
                            <li>Add the TXT record for verification</li>
                            <li>
                              Add the CNAME record to point your domain to our
                              servers
                            </li>
                            <li>
                              Wait for DNS propagation (usually 5-60 minutes)
                            </li>
                            <li>Click "Verify Domain" in the Overview tab</li>
                          </ol>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Configure a custom domain first to see DNS setup
                    instructions.
                  </p>
                  <Button
                    onClick={() => setActiveTab('configure')}
                    className="mt-4"
                  >
                    Configure Domain
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
