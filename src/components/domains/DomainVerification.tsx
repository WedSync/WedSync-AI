'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  AlertTriangle,
  Loader2,
  Globe,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useDomainStatus } from '@/hooks/useDomainStatus';
import { DomainValidationResult } from '@/types/domains';

interface DomainVerificationProps {
  supplierId: string;
  onDomainConfigured?: () => void;
  className?: string;
}

export function DomainVerification({
  supplierId,
  onDomainConfigured,
  className = '',
}: DomainVerificationProps) {
  const [domain, setDomain] = useState('');
  const [validating, setValidating] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [validation, setValidation] = useState<DomainValidationResult | null>(
    null,
  );
  const [step, setStep] = useState<
    'input' | 'validate' | 'configure' | 'complete'
  >('input');

  const { validateDomain, configureDomain, error } =
    useDomainStatus(supplierId);

  const handleValidation = useCallback(async () => {
    if (!domain.trim()) {
      setValidation({
        valid: false,
        available: false,
        errors: ['Please enter a domain name'],
      });
      return;
    }

    setValidating(true);
    setValidation(null);

    try {
      const result = await validateDomain(domain.trim().toLowerCase());
      setValidation(result);

      if (result.valid && result.available) {
        setStep('validate');
      }
    } catch (err) {
      setValidation({
        valid: false,
        available: false,
        errors: ['Failed to validate domain. Please try again.'],
      });
    } finally {
      setValidating(false);
    }
  }, [domain, validateDomain]);

  const handleConfiguration = useCallback(async () => {
    if (!domain.trim()) return;

    setConfiguring(true);
    setStep('configure');

    try {
      const success = await configureDomain(domain.trim().toLowerCase());

      if (success) {
        setStep('complete');
        setTimeout(() => {
          onDomainConfigured?.();
        }, 1500);
      } else {
        setStep('validate');
      }
    } catch (err) {
      console.error('Configuration error:', err);
      setStep('validate');
    } finally {
      setConfiguring(false);
    }
  }, [domain, configureDomain, onDomainConfigured]);

  const handleDomainChange = (value: string) => {
    setDomain(value);
    setValidation(null);
    if (step !== 'input') {
      setStep('input');
    }
  };

  const getStepProgress = () => {
    switch (step) {
      case 'input':
        return 0;
      case 'validate':
        return 33;
      case 'configure':
        return 66;
      case 'complete':
        return 100;
      default:
        return 0;
    }
  };

  const isValidDomainFormat = (domain: string) => {
    const domainRegex =
      /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Add Custom Domain
        </h3>
        <p className="text-sm text-gray-600">
          Connect your own domain to create a branded experience for your
          wedding clients
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-600">
          <span>Configuration Progress</span>
          <span>{getStepProgress()}% complete</span>
        </div>
        <Progress value={getStepProgress()} className="h-2" />
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between">
        {[
          { key: 'input', label: 'Domain Input', icon: Globe },
          { key: 'validate', label: 'Validation', icon: CheckCircle },
          { key: 'configure', label: 'Configuration', icon: Shield },
          { key: 'complete', label: 'Complete', icon: Sparkles },
        ].map((stepInfo, index) => {
          const isActive = step === stepInfo.key;
          const isCompleted = getStepProgress() > index * 25;
          const Icon = stepInfo.icon;

          return (
            <div
              key={stepInfo.key}
              className="flex flex-col items-center space-y-1"
            >
              <div
                className={`
                w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-200
                ${
                  isCompleted
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : isActive
                      ? 'border-primary-600 text-primary-600'
                      : 'border-gray-300 text-gray-400'
                }
              `}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span
                className={`text-xs ${isActive ? 'text-primary-600 font-medium' : 'text-gray-500'}`}
              >
                {stepInfo.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Domain Input */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="domain" className="text-sm font-medium text-gray-700">
            Domain Name
          </Label>
          <div className="mt-1 space-y-2">
            <Input
              id="domain"
              type="text"
              placeholder="clients.yourbusiness.com"
              value={domain}
              onChange={(e) => handleDomainChange(e.target.value)}
              disabled={configuring}
              className="w-full"
              data-testid="domain-input"
            />
            <p className="text-xs text-gray-500">
              Enter your domain without "https://" or "www". Example:
              clients.yourbusiness.com
            </p>
          </div>
        </div>

        {/* Domain Format Validation */}
        {domain && !isValidDomainFormat(domain) && (
          <Alert className="border-warning-200 bg-warning-25">
            <AlertTriangle className="h-4 w-4 text-warning-600" />
            <AlertDescription className="text-warning-700">
              Please enter a valid domain format (e.g.,
              clients.yourbusiness.com)
            </AlertDescription>
          </Alert>
        )}

        {/* Validation Results */}
        {validation && (
          <Alert
            className={
              validation.valid
                ? 'border-success-200 bg-success-25'
                : 'border-error-200 bg-error-25'
            }
          >
            {validation.valid ? (
              <CheckCircle className="h-4 w-4 text-success-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-error-600" />
            )}
            <AlertDescription>
              {validation.valid ? (
                <div className="text-success-700">
                  <strong>Domain is valid and available!</strong>
                  {validation.available && (
                    <p className="mt-1 text-sm">
                      You can proceed with the configuration.
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-error-700">
                  <strong>Domain validation failed:</strong>
                  <ul className="mt-1 list-disc list-inside text-sm">
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                  {validation.suggestions &&
                    validation.suggestions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Suggestions:</p>
                        <ul className="list-disc list-inside text-sm">
                          {validation.suggestions.map((suggestion, index) => (
                            <li key={index}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Error Display */}
        {error && (
          <Alert className="border-error-200 bg-error-25">
            <AlertTriangle className="h-4 w-4 text-error-600" />
            <AlertDescription className="text-error-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {step === 'input' ||
          (step === 'validate' && validation && !validation.valid) ? (
            <Button
              onClick={handleValidation}
              disabled={
                !domain.trim() || !isValidDomainFormat(domain) || validating
              }
              className="bg-primary-600 hover:bg-primary-700"
            >
              {validating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                'Validate Domain'
              )}
            </Button>
          ) : step === 'validate' && validation?.valid ? (
            <Button
              onClick={handleConfiguration}
              disabled={configuring}
              className="bg-primary-600 hover:bg-primary-700"
              data-testid="verify-domain"
            >
              {configuring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Configuring...
                </>
              ) : (
                'Configure Domain'
              )}
            </Button>
          ) : step === 'complete' ? (
            <Button disabled className="bg-success-600">
              <CheckCircle className="h-4 w-4 mr-2" />
              Configuration Complete
            </Button>
          ) : null}

          {(step === 'validate' || step === 'configure') && (
            <Button
              variant="outline"
              onClick={() => {
                setStep('input');
                setValidation(null);
              }}
              disabled={configuring}
              className="border-gray-300"
            >
              Change Domain
            </Button>
          )}
        </div>
      </div>

      {/* Important Notice */}
      <Alert className="border-blue-200 bg-blue-25">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <div className="text-blue-700">
            <strong>Important:</strong> You must own this domain and have access
            to its DNS settings. After configuration, you'll need to add DNS
            records to verify ownership and point the domain to our servers.
          </div>
        </AlertDescription>
      </Alert>

      {/* Benefits */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          Benefits of Custom Domain
        </h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Professional branding for your wedding business</li>
          <li>• Increased trust and credibility with clients</li>
          <li>• Seamless experience matching your website</li>
          <li>• Better email deliverability and recognition</li>
          <li>• Enhanced SEO benefits for your business</li>
        </ul>
      </div>
    </div>
  );
}
