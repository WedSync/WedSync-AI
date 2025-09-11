'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  X,
  Phone,
  AlertTriangle,
  ArrowUp,
  CheckCircle,
  Clock,
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Share2,
  ExternalLink,
  Zap,
  Timer,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface QuickActionsPanelProps {
  ticket: {
    id: string;
    ticket_number: string;
    title: string;
    status: 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';
    priority: 'low' | 'normal' | 'high' | 'urgent' | 'wedding_day';
    category: string;
    venue_name?: string;
    wedding_date?: string;
    assigned_to?: string;
  };
  onClose: () => void;
  onTicketUpdate: () => void;
}

const STATUS_OPTIONS = [
  { value: 'open', label: '🔄 Reopen', description: 'Reopen this ticket' },
  {
    value: 'waiting_response',
    label: '⏳ Mark as Waiting',
    description: 'Waiting for your response',
  },
  {
    value: 'resolved',
    label: '✅ Mark as Resolved',
    description: 'Issue has been resolved',
  },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low Priority', color: 'text-gray-600' },
  { value: 'normal', label: 'Normal Priority', color: 'text-blue-600' },
  { value: 'high', label: 'High Priority', color: 'text-yellow-600' },
  { value: 'urgent', label: 'Urgent Priority', color: 'text-orange-600' },
  {
    value: 'wedding_day',
    label: 'Wedding Day Emergency',
    color: 'text-red-600',
  },
];

export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  ticket,
  onClose,
  onTicketUpdate,
}) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEscalation, setShowEscalation] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');

  // Emergency call support
  const callSupport = () => {
    // In a real implementation, this would integrate with phone system
    const supportNumber = '+1-555-WEDSYNC';
    if (confirm(`Call support at ${supportNumber}?`)) {
      window.location.href = `tel:${supportNumber}`;

      // Log the call attempt
      logAction('emergency_call_initiated', {
        ticket_id: ticket.id,
        support_number: supportNumber,
        ticket_priority: ticket.priority,
      });
    }
  };

  // Escalate ticket
  const escalateTicket = async () => {
    if (!escalationReason.trim()) {
      toast.error('Please provide a reason for escalation');
      return;
    }

    try {
      setIsUpdating(true);

      // Update ticket priority and add escalation comment
      const { error: ticketError } = await supabase
        .from('support_tickets')
        .update({
          priority:
            ticket.priority === 'wedding_day' ? 'wedding_day' : 'urgent',
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticket.id);

      if (ticketError) throw ticketError;

      // Add escalation record
      const { error: escalationError } = await supabase
        .from('support_escalations')
        .insert({
          ticket_id: ticket.id,
          escalation_reason: escalationReason,
          escalation_type: 'manual',
        });

      if (escalationError) throw escalationError;

      // Add system comment
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('support_ticket_comments').insert({
          ticket_id: ticket.id,
          content: `Ticket escalated by customer. Reason: ${escalationReason}`,
          is_system_message: true,
          author_id: user.id,
          author_name:
            user.user_metadata?.full_name || user.email || 'Customer',
          author_role: 'customer',
        });
      }

      toast.success('Ticket has been escalated to senior support');
      onTicketUpdate();
      setShowEscalation(false);
      setEscalationReason('');
    } catch (error) {
      console.error('Error escalating ticket:', error);
      toast.error('Failed to escalate ticket');
    } finally {
      setIsUpdating(false);
    }
  };

  // Update ticket status
  const updateTicketStatus = async (newStatus: string) => {
    try {
      setIsUpdating(true);

      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Set resolved timestamp if marking as resolved
      if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticket.id);

      if (error) throw error;

      // Add system comment
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const statusMessages = {
          open: 'Ticket reopened by customer',
          waiting_response: 'Ticket marked as waiting for response',
          resolved: 'Ticket marked as resolved by customer',
        };

        await supabase.from('support_ticket_comments').insert({
          ticket_id: ticket.id,
          content:
            statusMessages[newStatus as keyof typeof statusMessages] ||
            `Status changed to ${newStatus}`,
          is_system_message: true,
          author_id: user.id,
          author_name:
            user.user_metadata?.full_name || user.email || 'Customer',
          author_role: 'customer',
        });
      }

      toast.success('Ticket status updated');
      onTicketUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast.error('Failed to update ticket status');
    } finally {
      setIsUpdating(false);
    }
  };

  // Submit feedback
  const submitFeedback = async () => {
    if (feedbackRating === null) {
      toast.error('Please provide a rating');
      return;
    }

    try {
      setIsUpdating(true);

      // In a real implementation, this would go to a feedback table
      const feedbackData = {
        ticket_id: ticket.id,
        rating: feedbackRating,
        comment: feedbackComment.trim(),
        submitted_at: new Date().toISOString(),
      };

      // Add feedback as a system comment
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('support_ticket_comments').insert({
          ticket_id: ticket.id,
          content: `Customer feedback: ${feedbackRating}/5 stars${feedbackComment ? `\n\nComment: ${feedbackComment}` : ''}`,
          is_system_message: true,
          author_id: user.id,
          author_name:
            user.user_metadata?.full_name || user.email || 'Customer',
          author_role: 'customer',
        });
      }

      // Log feedback
      await logAction('feedback_submitted', feedbackData);

      toast.success('Thank you for your feedback!');
      setShowFeedback(false);
      setFeedbackRating(null);
      setFeedbackComment('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setIsUpdating(false);
    }
  };

  // Log action for analytics
  const logAction = async (action: string, metadata: any) => {
    try {
      // In a real implementation, this would go to an analytics service
      console.log('Support action logged:', {
        action,
        metadata,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging action:', error);
    }
  };

  // Share ticket details
  const shareTicket = async () => {
    const shareData = {
      title: `Support Ticket ${ticket.ticket_number}`,
      text: `${ticket.title} - Status: ${ticket.status}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        logAction('ticket_shared', { method: 'native_share' });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(
          `${shareData.title}\n${shareData.text}\n${shareData.url}`,
        );
        toast.success('Ticket details copied to clipboard');
        logAction('ticket_shared', { method: 'clipboard' });
      }
    } catch (error) {
      console.error('Error sharing ticket:', error);
      toast.error('Could not share ticket details');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
      <Card className="w-full max-w-md max-h-[80vh] overflow-y-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-gray-600">
            {ticket.ticket_number} • {ticket.title}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Emergency Actions */}
          {(ticket.priority === 'wedding_day' ||
            ticket.priority === 'urgent') && (
            <div className="space-y-2">
              <h4 className="font-medium text-red-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Emergency Actions
              </h4>

              <Button
                onClick={callSupport}
                className="w-full bg-red-600 hover:bg-red-700"
                size="lg"
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Support Now
              </Button>

              {ticket.priority !== 'wedding_day' && (
                <Button
                  onClick={() => setShowEscalation(true)}
                  variant="outline"
                  className="w-full border-red-200 text-red-700 hover:bg-red-50"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Escalate to Wedding Day Priority
                </Button>
              )}
            </div>
          )}

          {/* Status Updates */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-800">Update Status</h4>

            <div className="grid grid-cols-1 gap-2">
              {STATUS_OPTIONS.map((option) => {
                // Don't show current status as option
                if (option.value === ticket.status) return null;

                // Don't show "resolved" option for wedding day emergencies
                if (
                  option.value === 'resolved' &&
                  ticket.priority === 'wedding_day'
                )
                  return null;

                return (
                  <Button
                    key={option.value}
                    variant="outline"
                    onClick={() => updateTicketStatus(option.value)}
                    disabled={isUpdating}
                    className="justify-start h-auto p-3"
                  >
                    <div className="text-left">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-gray-600">
                        {option.description}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Standard Escalation */}
          {ticket.priority !== 'wedding_day' &&
            ticket.priority !== 'urgent' && (
              <Button
                onClick={() => setShowEscalation(true)}
                variant="outline"
                className="w-full"
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                Request Priority Escalation
              </Button>
            )}

          {/* Feedback (only for resolved/closed tickets) */}
          {(ticket.status === 'resolved' || ticket.status === 'closed') && (
            <Button
              onClick={() => setShowFeedback(true)}
              variant="outline"
              className="w-full"
            >
              <Star className="h-4 w-4 mr-2" />
              Rate Support Experience
            </Button>
          )}

          {/* Share */}
          <Button onClick={shareTicket} variant="outline" className="w-full">
            <Share2 className="h-4 w-4 mr-2" />
            Share Ticket Details
          </Button>

          {/* Wedding Day Alert */}
          {ticket.priority === 'wedding_day' && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Wedding Day Emergency Protocol Active</strong>
                <br />
                On-call manager has been notified. Expected response: &lt;5
                minutes.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Escalation Modal */}
      {showEscalation && (
        <div className="fixed inset-0 bg-black/70 z-60 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Request Escalation</CardTitle>
              <p className="text-sm text-gray-600">
                Please explain why this ticket needs priority escalation
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Reason for escalation..."
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                rows={4}
              />

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowEscalation(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={escalateTicket}
                  disabled={isUpdating || !escalationReason.trim()}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {isUpdating ? (
                    <>
                      <Timer className="h-4 w-4 mr-2 animate-spin" />
                      Escalating...
                    </>
                  ) : (
                    <>
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Escalate Ticket
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 bg-black/70 z-60 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Rate Your Experience</CardTitle>
              <p className="text-sm text-gray-600">
                How satisfied were you with the support you received?
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Star Rating */}
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant="ghost"
                    size="sm"
                    onClick={() => setFeedbackRating(rating)}
                    className={`p-2 ${
                      feedbackRating && rating <= feedbackRating
                        ? 'text-yellow-500'
                        : 'text-gray-300'
                    }`}
                  >
                    <Star
                      className={`h-6 w-6 ${
                        feedbackRating && rating <= feedbackRating
                          ? 'fill-current'
                          : ''
                      }`}
                    />
                  </Button>
                ))}
              </div>

              {feedbackRating && (
                <div className="text-center text-sm text-gray-600">
                  {feedbackRating === 5 && '⭐ Excellent'}
                  {feedbackRating === 4 && '👍 Very Good'}
                  {feedbackRating === 3 && '👌 Good'}
                  {feedbackRating === 2 && '👎 Poor'}
                  {feedbackRating === 1 && '😞 Very Poor'}
                </div>
              )}

              <Textarea
                placeholder="Optional: Tell us more about your experience..."
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                rows={3}
              />

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowFeedback(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitFeedback}
                  disabled={isUpdating || feedbackRating === null}
                >
                  {isUpdating ? (
                    <>
                      <Timer className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
