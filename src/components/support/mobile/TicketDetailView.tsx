'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Calendar,
  User,
  MessageSquare,
  Send,
  Phone,
  AlertTriangle,
  CheckCircle,
  Timer,
  Paperclip,
  Download,
  Eye,
  Zap,
  RefreshCw,
  MoreVertical,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { QuickActionsPanel } from './QuickActionsPanel';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';

interface TicketDetailViewProps {
  ticketId: string;
  onBack?: () => void;
}

interface TicketComment {
  id: string;
  content: string;
  is_internal: boolean;
  is_system_message: boolean;
  voice_note_url?: string;
  voice_note_duration?: number;
  author_id: string;
  author_name: string;
  author_role: string;
  created_at: string;
  updated_at: string;
}

interface TicketAttachment {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  captured_on_mobile: boolean;
  created_at: string;
}

interface SupportTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'wedding_day';
  category: string;
  venue_name?: string;
  wedding_date?: string;
  user_location?: any;
  device_info?: any;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  support_ticket_comments: TicketComment[];
  support_ticket_attachments: TicketAttachment[];
}

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-800', icon: Clock },
  in_progress: {
    label: 'In Progress',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Timer,
  },
  waiting_response: {
    label: 'Waiting for Response',
    color: 'bg-purple-100 text-purple-800',
    icon: MessageSquare,
  },
  resolved: {
    label: 'Resolved',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
  },
  closed: {
    label: 'Closed',
    color: 'bg-gray-100 text-gray-800',
    icon: CheckCircle,
  },
};

const PRIORITY_CONFIG = {
  wedding_day: {
    label: 'Wedding Day Critical',
    color: 'bg-red-500 text-white',
    urgent: true,
  },
  urgent: { label: 'Urgent', color: 'bg-orange-500 text-white', urgent: true },
  high: { label: 'High', color: 'bg-yellow-500 text-white' },
  normal: { label: 'Normal', color: 'bg-blue-500 text-white' },
  low: { label: 'Low', color: 'bg-gray-500 text-white' },
};

export const TicketDetailView: React.FC<TicketDetailViewProps> = ({
  ticketId,
  onBack,
}) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const router = useRouter();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [newVoiceNote, setNewVoiceNote] = useState<Blob | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of comments
  const scrollToBottom = useCallback(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load ticket details
  const loadTicket = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) setLoading(true);
        else setRefreshing(true);

        const { data, error } = await supabase
          .from('support_tickets')
          .select(
            `
          *,
          support_ticket_comments:support_ticket_comments(*),
          support_ticket_attachments:support_ticket_attachments(*)
        `,
          )
          .eq('id', ticketId)
          .single();

        if (error) throw error;

        setTicket(data);

        // Mark as read by scrolling to bottom after load
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error('Error loading ticket:', error);
        toast.error('Failed to load ticket details');
        if (onBack) onBack();
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [supabase, ticketId, onBack, scrollToBottom],
  );

  // Initial load
  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: `id=eq.${ticketId}`,
        },
        (payload) => {
          console.log('Ticket update:', payload);
          loadTicket(false);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_ticket_comments',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          console.log('Comment update:', payload);
          loadTicket(false);
          setTimeout(scrollToBottom, 200);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, ticketId, loadTicket, scrollToBottom]);

  // Send comment
  const sendComment = async () => {
    if (!newComment.trim() && !newVoiceNote) return;

    try {
      setSendingComment(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let voiceNoteUrl = null;
      let voiceNoteDuration = null;

      // Upload voice note if present
      if (newVoiceNote) {
        const fileName = `voice_${Date.now()}.webm`;
        const filePath = `tickets/${ticketId}/comments/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('support-attachments')
          .upload(filePath, newVoiceNote);

        if (uploadError) throw uploadError;

        voiceNoteUrl = uploadData.path;
        // Try to get duration (simplified - in production would use proper audio analysis)
        voiceNoteDuration = Math.floor(newVoiceNote.size / 16000); // Rough estimate
      }

      // Create comment
      const { error } = await supabase.from('support_ticket_comments').insert({
        ticket_id: ticketId,
        content: newComment.trim() || '(Voice note)',
        voice_note_url: voiceNoteUrl,
        voice_note_duration: voiceNoteDuration,
        author_id: user.id,
        author_name: user.user_metadata?.full_name || user.email || 'User',
        author_role: 'customer',
      });

      if (error) throw error;

      // Clear form
      setNewComment('');
      setNewVoiceNote(null);

      toast.success('Comment sent');

      // Refresh ticket to show new comment
      setTimeout(() => loadTicket(false), 500);
    } catch (error) {
      console.error('Error sending comment:', error);
      toast.error('Failed to send comment');
    } finally {
      setSendingComment(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Download attachment
  const downloadAttachment = async (attachment: TicketAttachment) => {
    try {
      const { data } = await supabase.storage
        .from('support-attachments')
        .download(attachment.storage_path);

      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Download started');
      }
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast.error('Failed to download file');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Card>
          <CardHeader>
            <div className="space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ticket) return null;

  const statusDisplay = STATUS_CONFIG[ticket.status];
  const priorityDisplay = PRIORITY_CONFIG[ticket.priority];
  const StatusIcon = statusDisplay.icon;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{ticket.ticket_number}</h1>
            <p className="text-sm text-gray-600">Support Ticket</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadTicket(false)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQuickActions(true)}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Ticket Details Card */}
      <Card>
        <CardHeader>
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg leading-6">
                {ticket.title}
              </CardTitle>
              {priorityDisplay.urgent && (
                <Zap className="h-5 w-5 text-red-500 flex-shrink-0 mt-1" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <StatusIcon className="h-3 w-3" />
                <Badge className={statusDisplay.color} variant="secondary">
                  {statusDisplay.label}
                </Badge>
              </div>

              <Badge className={priorityDisplay.color} variant="secondary">
                {priorityDisplay.label}
              </Badge>

              <Badge variant="outline">
                {ticket.category.replace('_', ' ')}
              </Badge>
            </div>

            {/* Wedding Context */}
            {(ticket.venue_name || ticket.wedding_date) && (
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                {ticket.venue_name && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{ticket.venue_name}</span>
                  </div>
                )}
                {ticket.wedding_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(ticket.wedding_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* Description */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Description
              </h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>

            {/* Attachments */}
            {ticket.support_ticket_attachments &&
              ticket.support_ticket_attachments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Attachments ({ticket.support_ticket_attachments.length})
                  </h4>
                  <div className="space-y-2">
                    {ticket.support_ticket_attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            <Paperclip className="h-4 w-4 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {attachment.filename}
                            </p>
                            <p className="text-xs text-gray-600">
                              {formatFileSize(attachment.file_size)}
                              {attachment.captured_on_mobile && (
                                <span className="ml-1">(📱 Mobile)</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadAttachment(attachment)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Wedding Day Alert */}
            {ticket.priority === 'wedding_day' && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Wedding Day Emergency</strong> - This ticket is being
                  handled with highest priority. Our on-call team has been
                  notified.
                </AlertDescription>
              </Alert>
            )}

            {/* Timeline Info */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>
                Created{' '}
                {formatDistanceToNow(new Date(ticket.created_at), {
                  addSuffix: true,
                })}
              </p>
              <p>
                Last updated{' '}
                {formatDistanceToNow(new Date(ticket.updated_at), {
                  addSuffix: true,
                })}
              </p>
              {ticket.resolved_at && (
                <p>
                  Resolved{' '}
                  {formatDistanceToNow(new Date(ticket.resolved_at), {
                    addSuffix: true,
                  })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Comments ({ticket.support_ticket_comments?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Comments List */}
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                {ticket.support_ticket_comments?.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-600" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {comment.author_name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {comment.author_role}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>

                      {/* Comment Content */}
                      <div
                        className={`
                        p-3 rounded-lg text-sm
                        ${
                          comment.author_role === 'customer'
                            ? 'bg-blue-50 text-blue-900'
                            : 'bg-gray-50 text-gray-900'
                        }
                      `}
                      >
                        {comment.is_system_message ? (
                          <em>{comment.content}</em>
                        ) : (
                          <p className="whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        )}

                        {/* Voice Note */}
                        {comment.voice_note_url && (
                          <div className="mt-2 p-2 bg-white rounded border">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <MessageSquare className="h-3 w-3" />
                              Voice note ({comment.voice_note_duration}s)
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>
            </ScrollArea>

            {/* Add Comment Form */}
            {ticket.status !== 'closed' && (
              <div className="space-y-3 border-t pt-4">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="resize-none"
                  rows={3}
                />

                {/* Voice Note Recorder */}
                <VoiceNoteRecorder
                  onRecordingComplete={setNewVoiceNote}
                  maxDurationSeconds={180} // 3 minutes for comments
                />

                <div className="flex justify-end">
                  <Button
                    onClick={sendComment}
                    disabled={
                      sendingComment || (!newComment.trim() && !newVoiceNote)
                    }
                    size="sm"
                  >
                    {sendingComment ? (
                      <>
                        <Timer className="h-3 w-3 mr-1 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-3 w-3 mr-1" />
                        Send
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Panel */}
      {showQuickActions && (
        <QuickActionsPanel
          ticket={ticket}
          onClose={() => setShowQuickActions(false)}
          onTicketUpdate={() => loadTicket(false)}
        />
      )}
    </div>
  );
};
