'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  Send,
  Users,
  Sparkles,
  Mail,
  MessageSquare,
  Phone,
} from 'lucide-react';

interface InvitationTemplate {
  id: string;
  name: string;
  variant: 'control' | 'variant_a' | 'variant_b' | 'variant_c';
  subject?: string;
  content: string;
  channel: 'email' | 'sms' | 'whatsapp';
}

interface InvitationFormData {
  recipientEmail: string;
  recipientPhone?: string;
  recipientName: string;
  relationship: 'past_client' | 'colleague' | 'friend' | 'business_partner';
  personalMessage?: string;
  channel: 'email' | 'sms' | 'whatsapp';
}

export function InvitationFlow() {
  const [formData, setFormData] = useState<InvitationFormData>({
    recipientEmail: '',
    recipientName: '',
    relationship: 'past_client',
    channel: 'email',
  });
  const [selectedTemplate, setSelectedTemplate] =
    useState<InvitationTemplate | null>(null);
  const [templates, setTemplates] = useState<InvitationTemplate[]>([]);
  const [sending, setSending] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkRecipients, setBulkRecipients] = useState('');
  const [isSuperConnector, setIsSuperConnector] = useState(false);

  useEffect(() => {
    loadTemplates();
    checkSuperConnectorStatus();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/viral/ab-testing/select');
      if (!response.ok) throw new Error('Failed to load templates');
      const data = await response.json();
      setTemplates(data.templates);
      if (data.templates.length > 0) {
        setSelectedTemplate(data.templates[0]);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const checkSuperConnectorStatus = async () => {
    try {
      const response = await fetch('/api/viral/super-connectors/status');
      if (response.ok) {
        const data = await response.json();
        setIsSuperConnector(data.isSuperConnector);
      }
    } catch (error) {
      console.error('Error checking super-connector status:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      const recipients = bulkMode
        ? bulkRecipients.split('\n').map((line) => {
            const [email, name] = line.split(',').map((s) => s.trim());
            return { email, name: name || email.split('@')[0] };
          })
        : [{ email: formData.recipientEmail, name: formData.recipientName }];

      const response = await fetch('/api/viral/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients,
          relationship: formData.relationship,
          personalMessage: formData.personalMessage,
          channel: formData.channel,
          templateId: selectedTemplate?.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to send invitation');

      const result = await response.json();

      toast({
        title: 'Invitations Sent!',
        description: `Successfully sent ${result.sentCount} invitation(s). A/B test variant: ${result.variant}`,
      });

      // Reset form
      setFormData({
        recipientEmail: '',
        recipientName: '',
        relationship: 'past_client',
        channel: 'email',
      });
      setBulkRecipients('');
    } catch (error) {
      console.error('Error sending invitations:', error);
      toast({
        title: 'Error',
        description: 'Failed to send invitations. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <Phone className="h-4 w-4" />;
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Status Banner */}
      {isSuperConnector && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-yellow-600" />
                <CardTitle className="text-lg">
                  Super-Connector Status Active
                </CardTitle>
              </div>
              <Badge className="bg-yellow-500">Gold Tier</Badge>
            </div>
            <CardDescription>
              You have enhanced invitation limits and priority processing
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Invitation Form */}
      <Card>
        <CardHeader>
          <CardTitle>Send Viral Invitations</CardTitle>
          <CardDescription>
            Invite past clients and colleagues to join WedSync
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex items-center space-x-4">
              <Button
                type="button"
                variant={!bulkMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBulkMode(false)}
              >
                Single Invitation
              </Button>
              <Button
                type="button"
                variant={bulkMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBulkMode(true)}
                data-testid="invite-past-clients"
              >
                <Users className="mr-2 h-4 w-4" />
                Bulk Invitations
              </Button>
            </div>

            {/* Channel Selection */}
            <div className="space-y-2">
              <Label>Delivery Channel</Label>
              <Select
                value={formData.channel}
                onValueChange={(value: 'email' | 'sms' | 'whatsapp') =>
                  setFormData({ ...formData, channel: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4" />
                      <span>Email</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="sms">
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4" />
                      <span>SMS</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="whatsapp">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>WhatsApp</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Single Mode Fields */}
            {!bulkMode && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="recipientEmail">
                    {formData.channel === 'email'
                      ? 'Email Address'
                      : 'Phone Number'}
                  </Label>
                  <Input
                    id="recipientEmail"
                    type={formData.channel === 'email' ? 'email' : 'tel'}
                    value={formData.recipientEmail}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recipientEmail: e.target.value,
                      })
                    }
                    placeholder={
                      formData.channel === 'email'
                        ? 'client@example.com'
                        : '+1234567890'
                    }
                    required
                    data-testid="recipient-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipientName">Recipient Name</Label>
                  <Input
                    id="recipientName"
                    type="text"
                    value={formData.recipientName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recipientName: e.target.value,
                      })
                    }
                    placeholder="John Doe"
                    required
                  />
                </div>
              </>
            )}

            {/* Bulk Mode Fields */}
            {bulkMode && (
              <div className="space-y-2">
                <Label htmlFor="bulkRecipients">
                  Bulk Recipients (one per line: email/phone, name)
                </Label>
                <Textarea
                  id="bulkRecipients"
                  value={bulkRecipients}
                  onChange={(e) => setBulkRecipients(e.target.value)}
                  placeholder="john@example.com, John Doe&#10;jane@example.com, Jane Smith&#10;+1234567890, Bob Johnson"
                  rows={5}
                  required
                  data-testid="offline-recipient"
                />
                <p className="text-sm text-muted-foreground">
                  Format: email/phone, name (one per line)
                </p>
              </div>
            )}

            {/* Relationship Selection */}
            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship</Label>
              <Select
                value={formData.relationship}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, relationship: value })
                }
                data-testid="relationship"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="past_client">Past Client</SelectItem>
                  <SelectItem value="colleague">Colleague</SelectItem>
                  <SelectItem value="friend">Friend</SelectItem>
                  <SelectItem value="business_partner">
                    Business Partner
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Personal Message */}
            <div className="space-y-2">
              <Label htmlFor="personalMessage">
                Personal Message (Optional)
              </Label>
              <Textarea
                id="personalMessage"
                value={formData.personalMessage}
                onChange={(e) =>
                  setFormData({ ...formData, personalMessage: e.target.value })
                }
                placeholder="Add a personal touch to your invitation..."
                rows={3}
              />
            </div>

            {/* Template Preview */}
            {selectedTemplate && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Template Preview</CardTitle>
                    <Badge variant="outline">
                      Variant: {selectedTemplate.variant}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedTemplate.subject && (
                    <p className="font-medium mb-2">
                      Subject: {selectedTemplate.subject}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedTemplate.content}
                  </p>
                </CardContent>
              </Card>
            )}
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={sending}
              data-testid="send-invitation"
            >
              <Send className="mr-2 h-4 w-4" />
              {sending
                ? 'Sending...'
                : `Send ${bulkMode ? 'Invitations' : 'Invitation'}`}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
