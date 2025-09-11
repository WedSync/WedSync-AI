'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  UserPlus,
  Mail,
  Users,
  Calendar,
  CheckCircle,
  AlertTriangle,
  X,
  Send,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Wedding industry roles for team members
const weddingRoles = [
  {
    value: 'admin',
    label: '👑 Owner/Admin',
    description: 'Full access to all features',
  },
  {
    value: 'manager',
    label: '📋 Wedding Manager',
    description: 'Manage weddings and team members',
  },
  {
    value: 'coordinator',
    label: '🎯 Event Coordinator',
    description: 'Coordinate wedding day activities',
  },
  {
    value: 'photographer',
    label: '📸 Photographer',
    description: 'Access to photo galleries and timeline',
  },
  {
    value: 'videographer',
    label: '🎥 Videographer',
    description: 'Video content and timeline access',
  },
  {
    value: 'florist',
    label: '🌺 Florist',
    description: 'Floral design and venue decoration',
  },
  {
    value: 'caterer',
    label: '🍽️ Caterer',
    description: 'Menu planning and dietary requirements',
  },
  {
    value: 'venue_staff',
    label: '🏛️ Venue Staff',
    description: 'Venue setup and coordination',
  },
  {
    value: 'vendor',
    label: '🛍️ Vendor',
    description: 'Limited access for external vendors',
  },
  {
    value: 'assistant',
    label: '🤝 Assistant',
    description: 'Support role with limited permissions',
  },
];

interface TeamInvitation {
  id?: string;
  email: string;
  role: string;
  customPermissions: string[];
  personalMessage?: string;
  expiresAt: Date;
  status: 'pending' | 'sent' | 'accepted' | 'expired' | 'cancelled';
  sentAt?: Date;
  acceptedAt?: Date;
}

const invitationSchema = z.object({
  invitations: z
    .array(
      z.object({
        email: z.string().email('Invalid email address'),
        role: z.string().min(1, 'Please select a role'),
        customPermissions: z.array(z.string()).optional(),
        personalMessage: z.string().optional(),
      }),
    )
    .min(1, 'At least one invitation is required'),
  expiresInDays: z.number().min(1).max(30),
  sendWelcomeEmail: z.boolean(),
  requireSSOLogin: z.boolean(),
});

type InvitationFormData = z.infer<typeof invitationSchema>;

interface TeamMemberInvitationProps {
  organizationId: string;
  onInvitationsSent?: (invitations: TeamInvitation[]) => void;
  onError?: (error: string) => void;
  maxInvitations?: number;
  defaultRole?: string;
}

const customPermissions = [
  { id: 'view_analytics', label: '📊 View Analytics', category: 'reporting' },
  { id: 'manage_forms', label: '📝 Manage Forms', category: 'content' },
  { id: 'access_crm', label: '👥 Access CRM', category: 'clients' },
  {
    id: 'manage_integrations',
    label: '🔗 Manage Integrations',
    category: 'settings',
  },
  { id: 'view_payments', label: '💳 View Payments', category: 'financial' },
  { id: 'manage_templates', label: '📋 Manage Templates', category: 'content' },
  { id: 'access_ai_tools', label: '🤖 Access AI Tools', category: 'ai' },
  { id: 'export_data', label: '📤 Export Data', category: 'data' },
  {
    id: 'manage_workflows',
    label: '🔄 Manage Workflows',
    category: 'automation',
  },
  { id: 'view_guests', label: '🎭 View Guest Lists', category: 'events' },
];

export default function TeamMemberInvitation({
  organizationId,
  onInvitationsSent,
  onError,
  maxInvitations = 10,
  defaultRole = 'assistant',
}: TeamMemberInvitationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [sentInvitations, setSentInvitations] = useState<TeamInvitation[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<
    TeamInvitation[]
  >([]);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkEmails, setBulkEmails] = useState('');
  const supabase = createClient();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<InvitationFormData>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      invitations: [
        {
          email: '',
          role: defaultRole,
          customPermissions: [],
          personalMessage: '',
        },
      ],
      expiresInDays: 7,
      sendWelcomeEmail: true,
      requireSSOLogin: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'invitations',
  });

  const watchedInvitations = watch('invitations');

  useEffect(() => {
    loadPendingInvitations();
  }, [organizationId]);

  const loadPendingInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'sent'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const invitations: TeamInvitation[] = data.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        customPermissions: inv.custom_permissions || [],
        personalMessage: inv.personal_message,
        expiresAt: new Date(inv.expires_at),
        status: inv.status,
        sentAt: inv.sent_at ? new Date(inv.sent_at) : undefined,
        acceptedAt: inv.accepted_at ? new Date(inv.accepted_at) : undefined,
      }));

      setPendingInvitations(invitations);
    } catch (error) {
      console.error('Error loading pending invitations:', error);
    }
  };

  const onSubmit = async (data: InvitationFormData) => {
    setIsLoading(true);

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);

      const invitations: Omit<TeamInvitation, 'id'>[] = data.invitations.map(
        (inv) => ({
          email: inv.email.toLowerCase(),
          role: inv.role,
          customPermissions: inv.customPermissions || [],
          personalMessage: inv.personalMessage,
          expiresAt,
          status: 'pending' as const,
        }),
      );

      // Create invitations in database
      const { data: createdInvitations, error: dbError } = await supabase
        .from('team_invitations')
        .insert(
          invitations.map((inv) => ({
            organization_id: organizationId,
            email: inv.email,
            role: inv.role,
            custom_permissions: inv.customPermissions,
            personal_message: inv.personalMessage,
            expires_at: inv.expiresAt.toISOString(),
            status: 'pending',
            require_sso: data.requireSSOLogin,
          })),
        )
        .select();

      if (dbError) throw dbError;

      // Send invitation emails if requested
      if (data.sendWelcomeEmail) {
        const emailPromises = createdInvitations.map(async (invitation) => {
          const inviteUrl = `${window.location.origin}/invite/${invitation.id}`;

          const { error: emailError } = await supabase.functions.invoke(
            'send-team-invitation',
            {
              body: {
                to: invitation.email,
                organizationId,
                invitationId: invitation.id,
                inviteUrl,
                role: invitation.role,
                personalMessage: invitation.personal_message,
                expiresAt: invitation.expires_at,
                requireSSO: data.requireSSOLogin,
              },
            },
          );

          if (emailError) {
            console.error('Error sending invitation email:', emailError);
            return { ...invitation, emailSent: false };
          }

          // Update invitation status to 'sent'
          await supabase
            .from('team_invitations')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', invitation.id);

          return { ...invitation, emailSent: true, status: 'sent' };
        });

        const emailResults = await Promise.all(emailPromises);
        const successCount = emailResults.filter((r) => r.emailSent).length;

        if (successCount < emailResults.length) {
          onError?.(
            `${successCount}/${emailResults.length} invitations sent successfully`,
          );
        }
      }

      const finalInvitations: TeamInvitation[] = createdInvitations.map(
        (inv) => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          customPermissions: inv.custom_permissions || [],
          personalMessage: inv.personal_message,
          expiresAt: new Date(inv.expires_at),
          status: data.sendWelcomeEmail ? 'sent' : 'pending',
          sentAt: data.sendWelcomeEmail ? new Date() : undefined,
        }),
      );

      setSentInvitations(finalInvitations);
      onInvitationsSent?.(finalInvitations);

      // Refresh pending invitations
      await loadPendingInvitations();

      // Reset form
      reset();
    } catch (error: any) {
      console.error('Error sending invitations:', error);
      onError?.(error.message || 'Failed to send invitations');
    } finally {
      setIsLoading(false);
    }
  };

  const addInvitation = () => {
    if (fields.length < maxInvitations) {
      append({
        email: '',
        role: defaultRole,
        customPermissions: [],
        personalMessage: '',
      });
    }
  };

  const handleBulkImport = () => {
    const emails = bulkEmails
      .split(/[\n,;]/)
      .map((email) => email.trim())
      .filter((email) => email && email.includes('@'))
      .slice(0, maxInvitations - fields.length);

    emails.forEach((email) => {
      append({
        email,
        role: defaultRole,
        customPermissions: [],
        personalMessage: '',
      });
    });

    setBulkEmails('');
    setShowBulkImport(false);
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('team_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;

      await loadPendingInvitations();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      onError?.('Failed to cancel invitation');
    }
  };

  const copyInvitationLink = async (invitationId: string) => {
    const inviteUrl = `${window.location.origin}/invite/${invitationId}`;
    await navigator.clipboard.writeText(inviteUrl);
  };

  const getRoleInfo = (roleValue: string) => {
    return weddingRoles.find((role) => role.value === roleValue);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <UserPlus className="h-6 w-6" />
          Invite Team Members
        </h2>
        <p className="text-muted-foreground">
          Add wedding professionals to your team with role-based access
        </p>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Pending Invitations ({pendingInvitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">
                          {getRoleInfo(invitation.role)?.label}
                        </Badge>
                        <span>•</span>
                        <span>
                          Expires {invitation.expiresAt.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        invitation.status === 'sent' ? 'success' : 'secondary'
                      }
                    >
                      {invitation.status === 'sent' ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 mr-1" />
                      )}
                      {invitation.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyInvitationLink(invitation.id!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => cancelInvitation(invitation.id!)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invitation Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>New Invitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Individual Invitations */}
            {fields.map((field, index) => (
              <Card key={field.id} className="border-dashed">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Team Member {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input
                        {...control.register(`invitations.${index}.email`)}
                        type="email"
                        placeholder="colleague@company.com"
                      />
                      {errors.invitations?.[index]?.email && (
                        <p className="text-sm text-red-600">
                          {errors.invitations[index]?.email?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select
                        value={watchedInvitations[index]?.role || defaultRole}
                        onValueChange={(value) =>
                          control.setValue(`invitations.${index}.role`, value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {weddingRoles.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              <div>
                                <p>{role.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  {role.description}
                                </p>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Personal Message (Optional)</Label>
                    <Textarea
                      {...control.register(
                        `invitations.${index}.personalMessage`,
                      )}
                      placeholder="Welcome to our wedding team! Looking forward to working with you..."
                      rows={2}
                    />
                  </div>

                  {/* Custom Permissions */}
                  <div className="space-y-2">
                    <Label>Additional Permissions</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {customPermissions.map((permission) => (
                        <div
                          key={permission.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`${field.id}-${permission.id}`}
                            checked={
                              watchedInvitations[
                                index
                              ]?.customPermissions?.includes(permission.id) ||
                              false
                            }
                            onCheckedChange={(checked) => {
                              const current =
                                watchedInvitations[index]?.customPermissions ||
                                [];
                              const updated = checked
                                ? [...current, permission.id]
                                : current.filter((p) => p !== permission.id);
                              control.setValue(
                                `invitations.${index}.customPermissions`,
                                updated,
                              );
                            }}
                          />
                          <Label
                            htmlFor={`${field.id}-${permission.id}`}
                            className="text-sm font-normal"
                          >
                            {permission.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add More Button */}
            <div className="flex gap-2">
              {fields.length < maxInvitations && (
                <Button type="button" variant="outline" onClick={addInvitation}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Another Member
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowBulkImport(!showBulkImport)}
              >
                <Mail className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
            </div>

            {/* Bulk Import */}
            {showBulkImport && (
              <Card className="border-dashed">
                <CardContent className="p-4 space-y-4">
                  <Label>
                    Paste Email Addresses (one per line or comma separated)
                  </Label>
                  <Textarea
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                    placeholder="john@venue.com, sarah@photography.com&#10;mike@catering.com"
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={handleBulkImport}>
                      Import Emails
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowBulkImport(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Invitation Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Invitation Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expires In (Days)</Label>
                <Select
                  value={String(watch('expiresInDays'))}
                  onValueChange={(value) =>
                    control.setValue('expiresInDays', parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Day</SelectItem>
                    <SelectItem value="3">3 Days</SelectItem>
                    <SelectItem value="7">1 Week</SelectItem>
                    <SelectItem value="14">2 Weeks</SelectItem>
                    <SelectItem value="30">1 Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send-welcome-email"
                  checked={watch('sendWelcomeEmail')}
                  onCheckedChange={(checked) =>
                    control.setValue('sendWelcomeEmail', checked as boolean)
                  }
                />
                <Label htmlFor="send-welcome-email">
                  Send welcome email immediately
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="require-sso"
                  checked={watch('requireSSOLogin')}
                  onCheckedChange={(checked) =>
                    control.setValue('requireSSOLogin', checked as boolean)
                  }
                />
                <Label htmlFor="require-sso">
                  Require SSO login (if configured)
                </Label>
              </div>
            </div>

            <Alert>
              <AlertDescription>
                🎊 <strong>Wedding Team Tip:</strong> Most wedding professionals
                check email frequently during wedding season. Set shorter
                expiration times during peak months (May-October).
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading} size="lg">
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending Invitations...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send {fields.length} Invitation{fields.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Success State */}
      {sentInvitations.length > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Successfully sent {sentInvitations.length} invitation
            {sentInvitations.length > 1 ? 's' : ''}! Team members will receive
            an email with instructions to join.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export type { TeamInvitation, TeamMemberInvitationProps };
