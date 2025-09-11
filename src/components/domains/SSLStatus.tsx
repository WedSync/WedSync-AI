'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Zap,
} from 'lucide-react';
import { DomainConfig } from '@/types/domains';

interface SSLStatusProps {
  config: DomainConfig;
  onRefresh?: () => void;
  className?: string;
}

export function SSLStatus({
  config,
  onRefresh,
  className = '',
}: SSLStatusProps) {
  const getSSLStatusColor = (status: string) => {
    switch (status) {
      case 'issued':
        return 'success';
      case 'pending':
        return 'warning';
      case 'error':
      case 'renewal_required':
        return 'error';
      default:
        return 'gray';
    }
  };

  const getSSLStatusIcon = (status: string) => {
    switch (status) {
      case 'issued':
        return <CheckCircle className="h-5 w-5 text-success-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-warning-600" />;
      case 'error':
      case 'renewal_required':
        return <AlertTriangle className="h-5 w-5 text-error-600" />;
      default:
        return <Shield className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSSLStatusText = (status: string) => {
    switch (status) {
      case 'issued':
        return 'SSL certificate is active and your domain is secure!';
      case 'pending':
        return 'SSL certificate is being provisioned. This usually takes 5-15 minutes.';
      case 'renewal_required':
        return 'SSL certificate needs renewal. This will be done automatically.';
      case 'error':
        return 'SSL certificate provisioning failed. Please verify your DNS configuration.';
      default:
        return 'SSL certificate will be automatically provisioned once DNS is configured.';
    }
  };

  const calculateDaysUntilExpiry = () => {
    if (!config.current_domain) return null;

    // Mock calculation - in real implementation, this would come from the SSL status
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 75); // SSL certs typically expire in ~90 days

    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  const getProvisioningProgress = () => {
    if (config.status.ssl_status !== 'pending') return 0;

    // Mock progress based on DNS status
    if (config.status.dns_status === 'configured') return 75;
    if (config.status.dns_status === 'pending') return 25;
    return 0;
  };

  const daysUntilExpiry = calculateDaysUntilExpiry();
  const provisioningProgress = getProvisioningProgress();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* SSL Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getSSLStatusIcon(config.status.ssl_status)}
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              SSL Certificate
            </h4>
            <p className="text-xs text-gray-500">Automatic HTTPS encryption</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Badge
            className={`
              ${
                getSSLStatusColor(config.status.ssl_status) === 'success'
                  ? 'bg-success-50 text-success-700 border-success-200'
                  : getSSLStatusColor(config.status.ssl_status) === 'warning'
                    ? 'bg-warning-50 text-warning-700 border-warning-200'
                    : getSSLStatusColor(config.status.ssl_status) === 'error'
                      ? 'bg-error-50 text-error-700 border-error-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
              }
            `}
          >
            {config.status.ssl_status === 'issued'
              ? 'Secure'
              : config.status.ssl_status === 'pending'
                ? 'Provisioning'
                : config.status.ssl_status === 'renewal_required'
                  ? 'Renewal Required'
                  : config.status.ssl_status === 'error'
                    ? 'Error'
                    : 'Not Set'}
          </Badge>

          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* SSL Status Message */}
      <Alert
        className={`
          ${
            getSSLStatusColor(config.status.ssl_status) === 'success'
              ? 'border-success-200 bg-success-25'
              : getSSLStatusColor(config.status.ssl_status) === 'warning'
                ? 'border-warning-200 bg-warning-25'
                : getSSLStatusColor(config.status.ssl_status) === 'error'
                  ? 'border-error-200 bg-error-25'
                  : 'border-blue-200 bg-blue-25'
          }
        `}
      >
        {getSSLStatusIcon(config.status.ssl_status)}
        <AlertDescription
          className={`
            ${
              getSSLStatusColor(config.status.ssl_status) === 'success'
                ? 'text-success-700'
                : getSSLStatusColor(config.status.ssl_status) === 'warning'
                  ? 'text-warning-700'
                  : getSSLStatusColor(config.status.ssl_status) === 'error'
                    ? 'text-error-700'
                    : 'text-blue-700'
            }
          `}
        >
          {getSSLStatusText(config.status.ssl_status)}
        </AlertDescription>
      </Alert>

      {/* Provisioning Progress */}
      {config.status.ssl_status === 'pending' && provisioningProgress > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span className="flex items-center">
              <Zap className="h-3 w-3 mr-1" />
              SSL Provisioning Progress
            </span>
            <span>{provisioningProgress}% complete</span>
          </div>
          <Progress value={provisioningProgress} className="h-2" />
          <p className="text-xs text-gray-500">
            {provisioningProgress < 50
              ? 'Waiting for DNS configuration...'
              : "Requesting certificate from Let's Encrypt..."}
          </p>
        </div>
      )}

      {/* Certificate Details */}
      {config.status.ssl_status === 'issued' && config.current_domain && (
        <div className="bg-success-25 border border-success-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Shield className="h-4 w-4 text-success-600" />
            <span className="text-sm font-medium text-success-900">
              Certificate Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-success-700 font-medium">Domain:</span>
              <div className="font-mono text-success-800">
                {config.current_domain}
              </div>
            </div>

            <div>
              <span className="text-success-700 font-medium">Issuer:</span>
              <div className="text-success-800">Let's Encrypt</div>
            </div>

            {daysUntilExpiry && (
              <>
                <div>
                  <span className="text-success-700 font-medium">Expires:</span>
                  <div className="flex items-center text-success-800">
                    <Calendar className="h-3 w-3 mr-1" />
                    {daysUntilExpiry} days
                  </div>
                </div>

                <div>
                  <span className="text-success-700 font-medium">
                    Auto-renewal:
                  </span>
                  <div className="text-success-800">Enabled</div>
                </div>
              </>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-success-200">
            <p className="text-xs text-success-700">
              Your certificate will be automatically renewed before expiration.
              No action required from you.
            </p>
          </div>
        </div>
      )}

      {/* Renewal Warning */}
      {config.status.ssl_status === 'renewal_required' && (
        <div className="bg-warning-25 border border-warning-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-warning-600" />
            <span className="text-sm font-medium text-warning-900">
              Certificate Renewal Required
            </span>
          </div>
          <p className="text-sm text-warning-700 mb-3">
            Your SSL certificate is approaching expiration. The automatic
            renewal process will begin shortly.
          </p>
          <Button
            size="sm"
            className="bg-warning-600 hover:bg-warning-700 text-white"
          >
            Force Renewal Now
          </Button>
        </div>
      )}

      {/* SSL Error Details */}
      {config.status.ssl_status === 'error' && config.status.error_message && (
        <div className="bg-error-25 border border-error-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-error-600" />
            <span className="text-sm font-medium text-error-900">
              SSL Error Details
            </span>
          </div>
          <p className="text-sm text-error-700 mb-3">
            {config.status.error_message}
          </p>
          <div className="space-y-2 text-xs text-error-600">
            <p>
              <strong>Common solutions:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Verify that your DNS records are correctly configured</li>
              <li>Ensure your domain is pointing to our servers</li>
              <li>Check that there are no conflicting A records</li>
              <li>Wait for DNS propagation (can take up to 48 hours)</li>
            </ul>
          </div>
        </div>
      )}

      {/* SSL Benefits */}
      {!config.current_domain && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">
              SSL Certificate Benefits
            </span>
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Automatic HTTPS encryption for client data security</li>
            <li>• Green padlock icon increases client trust</li>
            <li>• Required for modern web browsers and SEO</li>
            <li>• Free Let's Encrypt certificates with auto-renewal</li>
            <li>• No manual certificate management required</li>
          </ul>
        </div>
      )}
    </div>
  );
}
