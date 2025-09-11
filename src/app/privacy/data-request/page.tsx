/**
 * Data Subject Request Portal
 * WS-149: GDPR data subject request submission page
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  Download,
  Trash2,
  Edit,
  Lock,
  Ban,
  LogOut,
} from 'lucide-react';

export default function DataRequestPage() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    requestType: '',
    details: '',
    preferredFormat: 'json',
    verificationMethod: 'email_verification',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const requestTypes = [
    {
      value: 'access',
      label: 'Access My Data',
      icon: Download,
      description: 'Get a copy of all personal data we hold about you',
    },
    {
      value: 'rectification',
      label: 'Correct My Data',
      icon: Edit,
      description: 'Update or correct inaccurate personal information',
    },
    {
      value: 'erasure',
      label: 'Delete My Data',
      icon: Trash2,
      description: 'Request complete deletion of your personal data',
    },
    {
      value: 'portability',
      label: 'Export My Data',
      icon: Download,
      description: 'Receive your data in a portable format',
    },
    {
      value: 'restrict_processing',
      label: 'Restrict Processing',
      icon: Lock,
      description: 'Limit how we process your personal data',
    },
    {
      value: 'object_to_processing',
      label: 'Object to Processing',
      icon: Ban,
      description: 'Object to specific uses of your data',
    },
    {
      value: 'withdraw_consent',
      label: 'Withdraw Consent',
      icon: LogOut,
      description: 'Withdraw previously given consent',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/gdpr/subject-request/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: formData.requestType,
          data_subject_email: formData.email,
          data_subject_name: formData.name,
          identity_verification: {
            method: formData.verificationMethod,
            evidence: {
              submission_timestamp: new Date().toISOString(),
              user_agent: navigator.userAgent,
            },
          },
          request_details: {
            description: formData.details,
            submitted_via: 'web_portal',
          },
          preferred_format: formData.preferredFormat,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      setResult(data);
    } catch (err: any) {
      setError(
        err.message || 'An error occurred while submitting your request',
      );
    } finally {
      setLoading(false);
    }
  };

  const getRequestTypeInfo = (type: string) => {
    return requestTypes.find((rt) => rt.value === type);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Privacy Request Portal</h1>
            <p className="text-gray-600 mt-1">
              Exercise your data protection rights under GDPR
            </p>
          </div>
        </div>

        {!result ? (
          <Card>
            <CardHeader>
              <CardTitle>Submit a Data Request</CardTitle>
              <CardDescription>
                Under GDPR, you have the right to access, correct, delete, or
                limit the processing of your personal data. All requests will be
                processed within 30 days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Request Type Selection */}
                <div className="space-y-3">
                  <Label>What would you like to do?</Label>
                  <div className="grid gap-3">
                    {requestTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <div
                          key={type.value}
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              requestType: type.value,
                            }))
                          }
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            formData.requestType === type.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div className="flex-1">
                              <div className="font-medium">{type.label}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                {type.description}
                              </div>
                            </div>
                            <input
                              type="radio"
                              name="requestType"
                              value={type.value}
                              checked={formData.requestType === type.value}
                              onChange={() => {}}
                              className="mt-1"
                              data-testid={`request-type-${type.value}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      required
                      placeholder="your.email@example.com"
                      data-testid="requester-email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      required
                      placeholder="John Doe"
                      data-testid="requester-name"
                    />
                  </div>
                </div>

                {/* Request Details */}
                <div>
                  <Label htmlFor="details">Request Details</Label>
                  <Textarea
                    id="details"
                    value={formData.details}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        details: e.target.value,
                      }))
                    }
                    placeholder="Please provide additional details about your request..."
                    rows={4}
                    data-testid="request-details"
                  />
                </div>

                {/* Export Format (for data access/portability requests) */}
                {['access', 'portability'].includes(formData.requestType) && (
                  <div>
                    <Label htmlFor="format">Preferred Export Format</Label>
                    <Select
                      value={formData.preferredFormat}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          preferredFormat: value,
                        }))
                      }
                    >
                      <SelectTrigger id="format" data-testid="export-format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">
                          JSON (Machine-readable)
                        </SelectItem>
                        <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                        <SelectItem value="pdf">
                          PDF (Human-readable)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={loading || !formData.requestType}
                    className="flex-1"
                    data-testid="submit-request"
                  >
                    {loading ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>

                <div className="text-sm text-gray-500 pt-4 border-t">
                  <p>
                    <strong>Important:</strong> We will verify your identity
                    before processing your request. You may be asked to provide
                    additional information to confirm your identity.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card data-testid="request-submitted">
            <CardHeader>
              <CardTitle className="text-green-600">
                Request Submitted Successfully
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="font-medium">Your request has been received!</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Reference Number:{' '}
                    <span className="font-mono" data-testid="request-id">
                      {result.request_id}
                    </span>
                  </p>
                </div>

                <div className="space-y-2">
                  <p>
                    <strong>What happens next?</strong>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                    <li>
                      You'll receive an email confirmation at {formData.email}
                    </li>
                    <li>We'll verify your identity to protect your privacy</li>
                    <li>Your request will be processed within 30 days</li>
                    <li>You'll be notified when your request is complete</li>
                  </ol>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm">
                    <strong>Due Date:</strong> Your request will be completed by{' '}
                    <span className="font-medium">
                      {new Date(result.due_date).toLocaleDateString()}
                    </span>
                  </p>
                </div>

                <Button
                  onClick={() => {
                    setResult(null);
                    setFormData({
                      email: '',
                      name: '',
                      requestType: '',
                      details: '',
                      preferredFormat: 'json',
                      verificationMethod: 'email_verification',
                    });
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Submit Another Request
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
