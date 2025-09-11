# WS-279 Delivery Methods Integration - Team A Comprehensive Prompt
**Team A: Frontend/UI Specialists**

## 🎯 Your Mission: Beautiful Multi-Channel Notification Interface
You are the **Frontend/UI specialists** responsible for building elegant notification preference interfaces that give users complete control over how they receive wedding updates. Your focus: **WhatsApp-quality notification management with visual delivery status, one-click preference updates, and mobile-first design**.

## 💝 The Wedding Communication Control Challenge
**Context**: Sarah is a wedding planner coordinating 12 weddings this month. She needs SMS alerts for timeline changes (urgent), email for vendor updates (detailed), and push notifications for client messages (immediate). Each notification type needs different delivery rules, and she must be able to change preferences instantly from her phone between venue visits. **Your interface makes notification management as intuitive as iPhone Settings**.

## 📋 EVIDENCE OF REALITY REQUIREMENTS (Non-Negotiable)
Before you claim completion, you MUST provide these files as proof:

### 🔍 Required Evidence Files:
1. **`/src/components/settings/DeliveryMethodsManager.tsx`** - Main notification preferences interface
2. **`/src/components/settings/NotificationPreferencesMatrix.tsx`** - Grid-based preference management
3. **`/src/components/settings/ContactMethodVerification.tsx`** - Contact method verification UI
4. **`/src/components/notifications/DeliveryStatusIndicator.tsx`** - Visual delivery status component
5. **`/src/components/settings/QuietHoursConfiguration.tsx`** - Quiet hours and business hours settings

### 🎨 Design Requirements:
- **Mobile-First Interface**: Thumb-friendly toggles and clear visual hierarchy
- **Visual Status Indicators**: Clear delivery status with icons and colors
- **Quick Toggle Actions**: One-tap preference changes for each notification type
- **Contact Method Verification**: Seamless SMS/email verification flows
- **Accessibility First**: Screen reader support and keyboard navigation
- **Wedding Industry Context**: Labels and descriptions that vendors understand

Your interfaces make notification management as smooth as adjusting iPhone settings.

## 🎨 Core UI Components & Patterns

### Main Notification Settings Interface
```typescript
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Clock, Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';

interface NotificationPreference {
  notificationType: string;
  deliveryMethods: Record<string, boolean>;
  priorityThresholds: Record<string, string[]>;
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
}

interface ContactMethod {
  type: 'email' | 'sms' | 'push';
  value: string;
  isVerified: boolean;
  isPrimary: boolean;
  verificationCode?: string;
  lastTestedAt?: string;
}

export function DeliveryMethodsManager({ userId, userRole }: {
  userId: string;
  userRole: 'vendor' | 'couple' | 'planner';
}) {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [contactMethods, setContactMethods] = useState<ContactMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeVerification, setActiveVerification] = useState<string | null>(null);
  const [testingDelivery, setTestingDelivery] = useState<string | null>(null);

  // Wedding-specific notification types based on user role
  const getNotificationTypes = () => {
    const baseTypes = [
      {
        id: 'timeline_change',
        label: 'Timeline Changes',
        description: 'When ceremony or reception times change',
        priority: 'high',
        weddingContext: 'Critical for vendor coordination',
        icon: <Clock className="h-4 w-4" />
      },
      {
        id: 'task_assignment',
        label: 'New Tasks',
        description: 'When tasks are assigned to you',
        priority: 'normal',
        weddingContext: 'Stay on top of your responsibilities',
        icon: <CheckCircle className="h-4 w-4" />
      },
      {
        id: 'message_received',
        label: 'Messages',
        description: 'When clients or vendors message you',
        priority: 'normal',
        weddingContext: 'Never miss important communications',
        icon: <MessageSquare className="h-4 w-4" />
      },
      {
        id: 'guest_count_change',
        label: 'Guest Count Updates',
        description: 'When final numbers are confirmed',
        priority: 'high',
        weddingContext: 'Affects catering, venue, and seating',
        icon: <Bell className="h-4 w-4" />
      },
      {
        id: 'emergency_alert',
        label: 'Emergency Alerts',
        description: 'Urgent wedding day issues',
        priority: 'urgent',
        weddingContext: 'Wedding day crisis management',
        icon: <AlertCircle className="h-4 w-4 text-red-500" />
      }
    ];

    // Add role-specific notification types
    if (userRole === 'vendor') {
      return [...baseTypes, {
        id: 'payment_received',
        label: 'Payments',
        description: 'When clients make payments',
        priority: 'normal',
        weddingContext: 'Track your business income',
        icon: <CheckCircle className="h-4 w-4" />
      }];
    }

    return baseTypes;
  };

  const deliveryMethods = [
    {
      id: 'email',
      label: 'Email',
      description: 'Detailed notifications with full context',
      icon: <Mail className="h-5 w-5" />,
      color: 'blue',
      bestFor: 'Detailed updates, contracts, photos'
    },
    {
      id: 'sms',
      label: 'SMS',
      description: 'Quick alerts for urgent updates',
      icon: <Smartphone className="h-5 w-5" />,
      color: 'green',
      bestFor: 'Timeline changes, emergency alerts'
    },
    {
      id: 'push',
      label: 'Push',
      description: 'Instant mobile notifications',
      icon: <Bell className="h-5 w-5" />,
      color: 'purple',
      bestFor: 'Messages, task reminders'
    }
  ];

  useEffect(() => {
    loadPreferences();
    loadContactMethods();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences');
      const data = await response.json();
      setPreferences(data.preferences || []);
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const loadContactMethods = async () => {
    try {
      const response = await fetch('/api/notifications/preferences');
      const data = await response.json();
      setContactMethods(data.contactMethods || []);
    } catch (error) {
      console.error('Error loading contact methods:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = async (notificationType: string, method: string, enabled: boolean) => {
    // Optimistic update
    setPreferences(prev => 
      prev.map(p => 
        p.notificationType === notificationType 
          ? { 
              ...p, 
              deliveryMethods: { ...p.deliveryMethods, [method]: enabled }
            }
          : p
      )
    );

    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationType,
          deliveryMethods: { [method]: enabled }
        })
      });

      if (!response.ok) {
        // Revert on error
        loadPreferences();
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      console.error('Error updating preference:', error);
    }
  };

  const testDeliveryMethod = async (method: string, contactValue: string) => {
    setTestingDelivery(method);
    
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          contactValue,
          testMessage: `Test ${method.toUpperCase()} from WedSync - Wedding coordination made simple!`
        })
      });

      if (response.ok) {
        // Update last tested time
        setContactMethods(prev =>
          prev.map(c =>
            c.type === method && c.value === contactValue
              ? { ...c, lastTestedAt: new Date().toISOString() }
              : c
          )
        );
        
        // Show success feedback
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50';
        toast.textContent = `Test ${method} sent successfully!`;
        document.body.appendChild(toast);
        setTimeout(() => document.body.removeChild(toast), 3000);
      }
    } catch (error) {
      console.error('Error testing delivery:', error);
    } finally {
      setTestingDelivery(null);
    }
  };

  const isMethodEnabled = (notificationType: string, method: string): boolean => {
    const pref = preferences.find(p => p.notificationType === notificationType);
    return pref?.deliveryMethods?.[method] || false;
  };

  const getContactForMethod = (method: string): ContactMethod | undefined => {
    return contactMethods.find(c => c.type === method && c.isVerified);
  };

  const getDeliveryStatusColor = (contact: ContactMethod | undefined) => {
    if (!contact) return 'gray';
    if (!contact.isVerified) return 'yellow';
    return 'green';
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Notification Settings
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Control how you receive wedding updates. Choose the right delivery method for each type of notification to stay informed without being overwhelmed.
        </p>
      </div>

      {/* Contact Methods Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {deliveryMethods.map(method => {
          const contact = getContactForMethod(method.id);
          const statusColor = getDeliveryStatusColor(contact);
          
          return (
            <Card key={method.id} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg bg-${method.color}-50`}>
                      <div className={`text-${method.color}-600`}>
                        {method.icon}
                      </div>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{method.label}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {method.description}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={statusColor === 'green' ? 'success' : statusColor === 'yellow' ? 'warning' : 'secondary'}
                  >
                    {contact 
                      ? (contact.isVerified ? 'Active' : 'Pending')
                      : 'Not Set'
                    }
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {contact ? (
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-medium truncate">
                          {contact.value}
                        </div>
                        {contact.lastTestedAt && (
                          <div className="text-gray-500">
                            Last tested: {new Date(contact.lastTestedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testDeliveryMethod(method.id, contact.value)}
                        disabled={!contact.isVerified || testingDelivery === method.id}
                      >
                        {testingDelivery === method.id ? 'Testing...' : 'Test'}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500 mb-2">No {method.label.toLowerCase()} configured</p>
                      <Button size="sm" variant="outline">
                        Add {method.label}
                      </Button>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    <strong>Best for:</strong> {method.bestFor}
                  </div>
                </div>
              </CardContent>
              
              {/* Status indicator bar */}
              <div 
                className={`absolute bottom-0 left-0 right-0 h-1 bg-${statusColor}-500`}
              />
            </Card>
          );
        })}
      </div>

      {/* Notification Preferences Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <p className="text-gray-600">
            Choose how you want to receive each type of wedding update. 
            Emergency alerts will always use all available methods.
          </p>
        </CardHeader>
        
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Mobile-first stacked layout */}
              <div className="block md:hidden space-y-4">
                {getNotificationTypes().map(type => (
                  <Card key={type.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {type.icon}
                          <div>
                            <h4 className="font-medium">{type.label}</h4>
                            <p className="text-sm text-gray-600">{type.description}</p>
                            <p className="text-xs text-blue-600 font-medium mt-1">
                              {type.weddingContext}
                            </p>
                          </div>
                        </div>
                        <Badge variant={type.priority === 'urgent' ? 'destructive' : 'secondary'}>
                          {type.priority}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        {deliveryMethods.map(method => {
                          const contact = getContactForMethod(method.id);
                          const isEnabled = isMethodEnabled(type.id, method.id);
                          
                          return (
                            <div key={method.id} className="text-center">
                              <div className="mb-2">
                                {method.icon}
                              </div>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) => 
                                  updatePreference(type.id, method.id, checked)
                                }
                                disabled={!contact?.isVerified || type.priority === 'urgent'}
                              />
                              <div className="text-xs mt-1">
                                {method.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop table layout */}
              <div className="hidden md:block">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left p-4 font-semibold">Notification Type</th>
                      {deliveryMethods.map(method => (
                        <th key={method.id} className="text-center p-4 font-semibold">
                          <div className="flex flex-col items-center space-y-2">
                            {method.icon}
                            <span className="text-sm">{method.label}</span>
                          </div>
                        </th>
                      ))}
                      <th className="text-center p-4 font-semibold">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getNotificationTypes().map(type => (
                      <tr key={type.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-start space-x-3">
                            {type.icon}
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-sm text-gray-600">{type.description}</div>
                              <div className="text-xs text-blue-600 font-medium mt-1">
                                {type.weddingContext}
                              </div>
                            </div>
                          </div>
                        </td>
                        {deliveryMethods.map(method => {
                          const contact = getContactForMethod(method.id);
                          const isEnabled = isMethodEnabled(type.id, method.id);
                          const isDisabled = !contact?.isVerified || type.priority === 'urgent';
                          
                          return (
                            <td key={method.id} className="p-4 text-center">
                              <div className="flex flex-col items-center space-y-1">
                                <Switch
                                  checked={isEnabled}
                                  onCheckedChange={(checked) => 
                                    updatePreference(type.id, method.id, checked)
                                  }
                                  disabled={isDisabled}
                                />
                                {!contact?.isVerified && (
                                  <div className="text-xs text-gray-400">Not verified</div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-4 text-center">
                          <Badge 
                            variant={
                              type.priority === 'urgent' ? 'destructive' : 
                              type.priority === 'high' ? 'warning' : 
                              'secondary'
                            }
                          >
                            {type.priority}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Important Notes:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li><strong>Emergency alerts</strong> will always be sent via all verified delivery methods</li>
                  <li><strong>Quiet hours</strong> are respected for SMS (except urgent notifications)</li>
                  <li><strong>Unverified contacts</strong> cannot receive notifications</li>
                  <li>Test each delivery method to ensure they're working correctly</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 justify-center">
        <Button variant="outline" className="flex items-center space-x-2">
          <Bell className="h-4 w-4" />
          <span>Configure Quiet Hours</span>
        </Button>
        <Button variant="outline" className="flex items-center space-x-2">
          <Smartphone className="h-4 w-4" />
          <span>Add Contact Method</span>
        </Button>
        <Button variant="outline" className="flex items-center space-x-2">
          <CheckCircle className="h-4 w-4" />
          <span>Test All Methods</span>
        </Button>
      </div>
    </div>
  );
}
```

### Contact Method Verification Component
```typescript
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock, Smartphone, Mail } from 'lucide-react';

interface ContactMethodVerificationProps {
  contactMethod: {
    type: 'email' | 'sms' | 'push';
    value: string;
    isVerified: boolean;
    verificationCode?: string;
  };
  onVerificationComplete: () => void;
  onResendVerification: () => void;
}

export function ContactMethodVerification({
  contactMethod,
  onVerificationComplete,
  onResendVerification
}: ContactMethodVerificationProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const response = await fetch('/api/notifications/verify-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: contactMethod.type,
          value: contactMethod.value,
          code: verificationCode.trim()
        })
      });

      if (response.ok) {
        onVerificationComplete();
      } else {
        const data = await response.json();
        setError(data.message || 'Verification failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const getMethodIcon = () => {
    switch (contactMethod.type) {
      case 'email':
        return <Mail className="h-5 w-5" />;
      case 'sms':
        return <Smartphone className="h-5 w-5" />;
      case 'push':
        return <Bell className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getVerificationText = () => {
    switch (contactMethod.type) {
      case 'email':
        return {
          instruction: 'Check your email for a verification code',
          codeLabel: 'Enter 6-digit code from email',
          placeholder: '123456'
        };
      case 'sms':
        return {
          instruction: 'We sent a verification code to your phone',
          codeLabel: 'Enter 6-digit SMS code',
          placeholder: '123456'
        };
      case 'push':
        return {
          instruction: 'Allow notifications when prompted',
          codeLabel: 'Push notifications enabled',
          placeholder: 'Auto-verified'
        };
      default:
        return {
          instruction: 'Verification required',
          codeLabel: 'Enter code',
          placeholder: '123456'
        };
    }
  };

  if (contactMethod.isVerified) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-full">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-green-800">
                {contactMethod.type.toUpperCase()} Verified
              </div>
              <div className="text-sm text-green-600">
                {contactMethod.value}
              </div>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  const verificationText = getVerificationText();

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-yellow-800">
          {getMethodIcon()}
          <span>Verify {contactMethod.type.toUpperCase()}</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-sm text-yellow-700">
          <div className="font-medium mb-1">{contactMethod.value}</div>
          <div>{verificationText.instruction}</div>
        </div>

        {contactMethod.type !== 'push' && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                {verificationText.codeLabel}
              </label>
              <Input
                type="text"
                placeholder={verificationText.placeholder}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
                className="text-center text-lg font-mono tracking-wider"
              />
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex space-x-2">
              <Button
                onClick={handleVerify}
                disabled={isVerifying || !verificationCode.trim()}
                className="flex-1"
              >
                {isVerifying ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={onResendVerification}
                disabled={isVerifying}
              >
                Resend
              </Button>
            </div>
          </div>
        )}

        {contactMethod.type === 'push' && (
          <div className="text-center">
            <Button onClick={() => onVerificationComplete()}>
              Enable Push Notifications
            </Button>
          </div>
        )}

        <div className="text-xs text-gray-600 bg-white p-2 rounded border">
          💡 <strong>Why verify?</strong> We need to confirm you can receive notifications at this {contactMethod.type} address to ensure you never miss important wedding updates.
        </div>
      </CardContent>
    </Card>
  );
}
```

### Delivery Status Indicator Component
```typescript
'use client';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react';

interface DeliveryStatusIndicatorProps {
  status: 'sent' | 'delivered' | 'failed' | 'pending' | 'bounced';
  method: 'email' | 'sms' | 'push';
  timestamp?: string;
  error?: string;
  showDetails?: boolean;
}

export function DeliveryStatusIndicator({
  status,
  method,
  timestamp,
  error,
  showDetails = false
}: DeliveryStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'sent':
        return {
          icon: <Clock className="h-3 w-3" />,
          variant: 'secondary' as const,
          label: 'Sent',
          color: 'text-gray-600'
        };
      case 'delivered':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          variant: 'success' as const,
          label: 'Delivered',
          color: 'text-green-600'
        };
      case 'failed':
        return {
          icon: <XCircle className="h-3 w-3" />,
          variant: 'destructive' as const,
          label: 'Failed',
          color: 'text-red-600'
        };
      case 'pending':
        return {
          icon: <Clock className="h-3 w-3 animate-spin" />,
          variant: 'secondary' as const,
          label: 'Sending',
          color: 'text-blue-600'
        };
      case 'bounced':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          variant: 'warning' as const,
          label: 'Bounced',
          color: 'text-yellow-600'
        };
      default:
        return {
          icon: <Clock className="h-3 w-3" />,
          variant: 'secondary' as const,
          label: 'Unknown',
          color: 'text-gray-600'
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="inline-flex items-center space-x-2">
      <Badge variant={statusConfig.variant} className="flex items-center space-x-1">
        {statusConfig.icon}
        <span className="text-xs">{statusConfig.label}</span>
      </Badge>

      {showDetails && (
        <div className="text-xs text-gray-500">
          <div className="capitalize">{method}</div>
          {timestamp && (
            <div>{new Date(timestamp).toLocaleTimeString()}</div>
          )}
          {error && status === 'failed' && (
            <div className="text-red-500 mt-1 max-w-xs truncate" title={error}>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## ✅ Acceptance Criteria Checklist

- [ ] **Mobile-First Interface** optimized for thumb navigation and quick preference changes
- [ ] **Visual Status Indicators** clearly show delivery method status with colors and icons
- [ ] **One-Click Preference Updates** enable/disable notification methods with simple toggles  
- [ ] **Contact Method Verification** seamless SMS code and email verification flows
- [ ] **Accessibility Standards** screen reader support, keyboard navigation, high contrast
- [ ] **Wedding Industry Context** labels and descriptions vendors immediately understand
- [ ] **Responsive Grid Layout** works perfectly on all screen sizes from mobile to desktop
- [ ] **Real-time Status Updates** delivery status updates without page refresh
- [ ] **Error Handling** graceful failure states with clear recovery actions
- [ ] **Testing Functionality** one-click test delivery for each configured method
- [ ] **Navigation Integration** accessible from main settings with breadcrumb navigation
- [ ] **Performance Optimization** fast loading and smooth transitions between preference states

Your interface makes notification management feel as intuitive as iPhone Settings, giving wedding professionals complete control over their communication preferences.

**Remember**: Every notification preference prevents missed wedding details. Design like wedding day success depends on it! 📱💍