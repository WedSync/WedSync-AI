/**
 * Ticket Detail View Component
 * WS-235: Support Operations Ticket Management System
 *
 * Comprehensive ticket detail interface with:
 * - Full conversation thread with real-time updates
 * - Agent action panels and quick responses
 * - SLA monitoring and escalation controls
 * - File attachment handling
 * - Customer information and context
 * - Activity timeline and audit trail
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';

import {
  Clock,
  User,
  MessageSquare,
  AlertTriangle,
  Heart,
  Calendar,
  Tag,
  Send,
  Paperclip,
  Eye,
  EyeOff,
  MoreVertical,
  ArrowUp,
  Zap,
  CheckCircle,
  XCircle,
  TrendingUp,
  Phone,
  Mail,
  Building,
  Star,
  Shield,
  FileText,
  Download,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Types
interface TicketDetail {
  id: string;
  smart_ticket_id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'pending_response' | 'resolved' | 'closed';
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  vendor_type?: string;
  is_wedding_emergency: boolean;
  escalation_level: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  first_response_at?: string;
  resolved_at?: string;
  closed_at?: string;
  wedding_date?: string;
  user_profiles: {
    full_name: string;
    email: string;
    user_tier: string;
    phone_number?: string;
    avatar_url?: string;
    organizations?: {
      name: string;
      slug: string;
    };
  };
  support_agents?: {
    full_name: string;
    email: string;
    wedding_expertise_level: string;
    avatar_url?: string;
    specialties: string[];
  };
  ticket_messages: TicketMessage[];
  ticket_sla_events: SLAEvent[];
  slaStatus?: {
    responseTimeUsed: number;
    resolutionTimeUsed: number;
    isResponseBreached: boolean;
    isResolutionBreached: boolean;
    responseDeadline: string;
    resolutionDeadline: string;
    timeToDeadline: number;
  };
  permissions: {
    canEdit: boolean;
    canClose: boolean;
    canEscalate: boolean;
    canViewInternal: boolean;
    canReassign: boolean;
  };
}

interface TicketMessage {
  id: string;
  message_content: string;
  message_type: 'reply' | 'note' | 'resolution' | 'system';
  is_internal: boolean;
  attachments: MessageAttachment[];
  created_at: string;
  author_type: 'customer' | 'agent' | 'system';
  author_id: string;
  support_agents?: {
    full_name: string;
    avatar_url?: string;
  };
  user_profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface MessageAttachment {
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

interface SLAEvent {
  id: string;
  event_type: string;
  event_data?: any;
  created_at: string;
  notes?: string;
  support_agents?: {
    full_name: string;
  };
}

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string;
}

export default function TicketDetailView() {
  const params = useParams();
  const ticketId = params?.id as string;

  // State
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<
    'reply' | 'note' | 'resolution'
  >('reply');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [showInternalMessages, setShowInternalMessages] = useState(true);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [realtimeChannel, setRealtimeChannel] =
    useState<RealtimeChannel | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Fetch ticket details
  const fetchTicket = useCallback(async () => {
    if (!ticketId) return;

    try {
      setError(null);

      const response = await fetch(`/api/tickets/${ticketId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch ticket: ${response.statusText}`);
      }

      const data = await response.json();
      setTicket(data.ticket);

      console.log(`Loaded ticket ${data.ticket.smart_ticket_id}`);
    } catch (err) {
      console.error('Error fetching ticket:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  // Fetch canned responses
  const fetchCannedResponses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('support_templates')
        .select('id, title, content, category')
        .eq('is_active', true)
        .order('category, title');

      if (!error && data) {
        setCannedResponses(data);
      }
    } catch (error) {
      console.error('Error fetching canned responses:', error);
    }
  }, [supabase]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`ticket_detail_${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: `id=eq.${ticketId}`,
        },
        (payload) => {
          console.log('Ticket updated:', payload);
          fetchTicket();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          console.log('New message:', payload);
          fetchTicket();
        },
      )
      .subscribe();

    setRealtimeChannel(channel);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [ticketId, supabase, fetchTicket]);

  // Initial load
  useEffect(() => {
    fetchTicket();
    fetchCannedResponses();
  }, [fetchTicket, fetchCannedResponses]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.ticket_messages]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !ticket || sending) return;

    try {
      setSending(true);

      const response = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageContent: newMessage,
          messageType,
          isInternal,
          attachments: [], // TODO: Handle file attachments
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Clear form
      setNewMessage('');
      setMessageType('reply');
      setIsInternal(false);
      setAttachments([]);

      // Refresh ticket to get new message
      await fetchTicket();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Quick actions
  const handleQuickAction = async (action: string, value?: any) => {
    if (!ticket) return;

    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [action]: value }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action}`);
      }

      await fetchTicket();
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      alert(`Failed to ${action}. Please try again.`);
    }
  };

  // Use canned response
  const handleUseCannedResponse = (response: CannedResponse) => {
    setNewMessage(response.content);
    setMessageType('reply');
  };

  // Priority colors
  const priorityColors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200',
  };

  const statusColors = {
    open: 'bg-blue-100 text-blue-800 border-blue-200',
    in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
    pending_response: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    resolved: 'bg-green-100 text-green-800 border-green-200',
    closed: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  // Get SLA urgency color
  const getSLAColor = (slaStatus: any) => {
    if (!slaStatus) return 'text-gray-500';

    const maxUsed = Math.max(
      slaStatus.responseTimeUsed || 0,
      slaStatus.resolutionTimeUsed || 0,
    );

    if (maxUsed >= 100) return 'text-red-600';
    if (maxUsed >= 90) return 'text-orange-600';
    if (maxUsed >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-4">
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              <span>{error || 'Ticket not found'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter messages based on internal visibility
  const visibleMessages = ticket.ticket_messages.filter(
    (message) =>
      showInternalMessages ||
      !message.is_internal ||
      ticket.permissions.canViewInternal,
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {ticket.smart_ticket_id}
            </h1>

            {ticket.is_wedding_emergency && (
              <Badge className="bg-red-100 text-red-800 border-red-200">
                <Heart className="h-3 w-3 mr-1" />
                Wedding Emergency
              </Badge>
            )}
          </div>

          <h2 className="text-lg text-gray-700">{ticket.subject}</h2>

          <div className="flex items-center gap-4">
            <Badge className={priorityColors[ticket.priority]}>
              {ticket.priority} priority
            </Badge>

            <Badge className={statusColors[ticket.status]}>
              {ticket.status.replace('_', ' ')}
            </Badge>

            {ticket.escalation_level > 0 && (
              <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                Escalation Level {ticket.escalation_level}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {ticket.permissions.canViewInternal && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInternalMessages(!showInternalMessages)}
            >
              {showInternalMessages ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              {showInternalMessages ? 'Hide' : 'Show'} Internal
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {ticket.status !== 'in_progress' && (
                <DropdownMenuItem
                  onClick={() => handleQuickAction('status', 'in_progress')}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Start Progress
                </DropdownMenuItem>
              )}

              {ticket.status !== 'resolved' && (
                <DropdownMenuItem
                  onClick={() => handleQuickAction('status', 'resolved')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Resolved
                </DropdownMenuItem>
              )}

              {ticket.permissions.canEscalate &&
                ticket.escalation_level < 3 && (
                  <DropdownMenuItem
                    onClick={() =>
                      handleQuickAction(
                        'escalationLevel',
                        ticket.escalation_level + 1,
                      )
                    }
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Escalate
                  </DropdownMenuItem>
                )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => handleQuickAction('status', 'closed')}
                className="text-red-600"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Close Ticket
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Messages */}
        <div className="lg:col-span-2 space-y-4">
          {/* Original Issue */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {ticket.user_profiles.full_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(ticket.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  Original Issue
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{ticket.description}</p>
              </div>

              {/* Tags */}
              {ticket.tags && ticket.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {ticket.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversation ({visibleMessages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {visibleMessages.map((message) => (
                  <div key={message.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {message.author_type === 'customer' ? (
                        <User className="h-4 w-4 text-gray-600" />
                      ) : (
                        <Shield className="h-4 w-4 text-blue-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {message.author_type === 'customer'
                            ? message.user_profiles?.full_name || 'Customer'
                            : message.support_agents?.full_name || 'Agent'}
                        </span>

                        <span className="text-xs text-gray-500">
                          {new Date(message.created_at).toLocaleString()}
                        </span>

                        {message.is_internal && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                            Internal
                          </Badge>
                        )}

                        {message.message_type === 'resolution' && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                            Resolution
                          </Badge>
                        )}
                      </div>

                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap text-gray-700">
                          {message.message_content}
                        </p>
                      </div>

                      {/* Attachments */}
                      {message.attachments &&
                        message.attachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {message.attachments.map((attachment, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                              >
                                <FileText className="h-4 w-4 text-gray-600" />
                                <span className="text-sm truncate">
                                  {attachment.filename}
                                </span>
                                <Button size="sm" variant="ghost">
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>
                ))}

                <div ref={messagesEndRef} />
              </div>

              {/* Reply Form */}
              {ticket.permissions.canEdit && ticket.status !== 'closed' && (
                <div className="border-t pt-4 mt-4">
                  <div className="space-y-3">
                    {/* Message Type Selection */}
                    <div className="flex items-center gap-4">
                      <Select
                        value={messageType}
                        onValueChange={(value: any) => setMessageType(value)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reply">Reply</SelectItem>
                          {ticket.permissions.canViewInternal && (
                            <SelectItem value="note">Internal Note</SelectItem>
                          )}
                          {ticket.permissions.canEdit && (
                            <SelectItem value="resolution">
                              Resolution
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>

                      {ticket.permissions.canViewInternal &&
                        messageType !== 'resolution' && (
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={isInternal}
                              onChange={(e) => setIsInternal(e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm">Internal only</span>
                          </label>
                        )}
                    </div>

                    {/* Canned Responses */}
                    {cannedResponses.length > 0 && (
                      <div>
                        <Label className="text-sm">Quick responses:</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {cannedResponses.slice(0, 5).map((response) => (
                            <Button
                              key={response.id}
                              size="sm"
                              variant="outline"
                              onClick={() => handleUseCannedResponse(response)}
                            >
                              {response.title}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Message Input */}
                    <Textarea
                      placeholder={`Type your ${messageType}...`}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setAttachments(files);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Paperclip className="h-4 w-4 mr-2" />
                          Attach Files
                        </Button>

                        {attachments.length > 0 && (
                          <span className="text-sm text-gray-600">
                            {attachments.length} file(s) selected
                          </span>
                        )}
                      </div>

                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sending}
                      >
                        {sending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Send {messageType}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Details */}
        <div className="space-y-4">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                {ticket.user_profiles.avatar_url ? (
                  <img
                    src={ticket.user_profiles.avatar_url}
                    alt={ticket.user_profiles.full_name}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                )}

                <div>
                  <p className="font-medium">
                    {ticket.user_profiles.full_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {ticket.user_profiles.user_tier} tier
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{ticket.user_profiles.email}</span>
                </div>

                {ticket.user_profiles.phone_number && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{ticket.user_profiles.phone_number}</span>
                  </div>
                )}

                {ticket.user_profiles.organizations && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-gray-400" />
                    <span>{ticket.user_profiles.organizations.name}</span>
                  </div>
                )}
              </div>

              {ticket.wedding_date && (
                <div>
                  <Separator />
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>
                      Wedding:{' '}
                      {new Date(ticket.wedding_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ticket.support_agents ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {ticket.support_agents.avatar_url ? (
                      <img
                        src={ticket.support_agents.avatar_url}
                        alt={ticket.support_agents.full_name}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-green-600" />
                      </div>
                    )}

                    <div>
                      <p className="font-medium">
                        {ticket.support_agents.full_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {ticket.support_agents.wedding_expertise_level} level
                      </p>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    <p>
                      Specialties:{' '}
                      {ticket.support_agents.specialties.join(', ')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-2">Unassigned</p>
                  {ticket.permissions.canReassign && (
                    <Button size="sm" variant="outline">
                      Assign Agent
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SLA Status */}
          {ticket.slaStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  SLA Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Response SLA */}
                {!ticket.first_response_at && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>First Response</span>
                      <span className={getSLAColor(ticket.slaStatus)}>
                        {ticket.slaStatus.responseTimeUsed.toFixed(0)}%
                      </span>
                    </div>
                    <Progress
                      value={ticket.slaStatus.responseTimeUsed}
                      className="h-2"
                    />
                    {ticket.slaStatus.isResponseBreached && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Response SLA breached
                      </p>
                    )}
                  </div>
                )}

                {/* Resolution SLA */}
                {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Resolution</span>
                      <span className={getSLAColor(ticket.slaStatus)}>
                        {ticket.slaStatus.resolutionTimeUsed.toFixed(0)}%
                      </span>
                    </div>
                    <Progress
                      value={ticket.slaStatus.resolutionTimeUsed}
                      className="h-2"
                    />
                    {ticket.slaStatus.isResolutionBreached && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Resolution SLA breached
                      </p>
                    )}
                  </div>
                )}

                <Separator />

                <div className="space-y-2 text-sm">
                  {ticket.first_response_at && (
                    <div className="flex justify-between">
                      <span>First Response:</span>
                      <span className="text-green-600">
                        {new Date(ticket.first_response_at).toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Response Deadline:</span>
                    <span>
                      {new Date(
                        ticket.slaStatus.responseDeadline,
                      ).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Resolution Deadline:</span>
                    <span>
                      {new Date(
                        ticket.slaStatus.resolutionDeadline,
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Ticket Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Category:</span>
                <span className="font-medium">{ticket.category}</span>
              </div>

              {ticket.vendor_type && (
                <div className="flex justify-between">
                  <span>Vendor Type:</span>
                  <span className="font-medium">{ticket.vendor_type}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Created:</span>
                <span>{new Date(ticket.created_at).toLocaleString()}</span>
              </div>

              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span>{new Date(ticket.updated_at).toLocaleString()}</span>
              </div>

              {ticket.resolved_at && (
                <div className="flex justify-between">
                  <span>Resolved:</span>
                  <span className="text-green-600">
                    {new Date(ticket.resolved_at).toLocaleString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
