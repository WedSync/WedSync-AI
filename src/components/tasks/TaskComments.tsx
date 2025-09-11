'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Paperclip,
  Send,
  Pin,
  Reply,
  Edit2,
  Check,
  X,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface Attachment {
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
}

interface Comment {
  id: string;
  task_id: string;
  parent_comment_id?: string;
  author_id: string;
  content: string;
  mentions: string[];
  is_edited: boolean;
  edited_at?: string;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  is_pinned: boolean;
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
  author?: TeamMember;
  replies?: Comment[];
}

interface TaskCommentsProps {
  taskId: string;
  currentUserId: string;
}

export default function TaskComments({
  taskId,
  currentUserId,
}: TaskCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    fetchComments();
    fetchTeamMembers();
    subscribeToComments();
  }, [taskId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select(
          `
          *,
          author:team_members!author_id(id, name, email, avatar_url)
        `,
        )
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const commentsWithReplies = organizeComments(data || []);
      setComments(commentsWithReplies);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, email, avatar_url')
        .eq('is_active', true);

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const organizeComments = (flatComments: Comment[]): Comment[] => {
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    flatComments.forEach((comment) => {
      comment.replies = [];
      commentMap.set(comment.id, comment);
    });

    flatComments.forEach((comment) => {
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id);
        if (parent) {
          parent.replies!.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });

    return rootComments.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  };

  const subscribeToComments = () => {
    const subscription = supabase
      .channel(`task-comments-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          fetchComments();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() && attachments.length === 0) return;

    setLoading(true);
    try {
      const uploadedAttachments = await uploadAttachments();

      const { error } = await supabase.from('task_comments').insert({
        task_id: taskId,
        author_id: currentUserId,
        content: newComment,
        mentions: selectedMentions,
        parent_comment_id: replyingTo,
        attachments: uploadedAttachments,
      });

      if (error) throw error;

      setNewComment('');
      setReplyingTo(null);
      setSelectedMentions([]);
      setAttachments([]);
      fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadAttachments = async (): Promise<Attachment[]> => {
    const uploaded: Attachment[] = [];

    for (const file of attachments) {
      const fileName = `${taskId}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file);

      if (!error && data) {
        const { data: urlData } = supabase.storage
          .from('task-attachments')
          .getPublicUrl(fileName);

        uploaded.push({
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          mime_type: file.type,
        });
      }
    }

    return uploaded;
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('task_comments')
        .update({
          content: editContent,
          is_edited: true,
          edited_at: new Date().toISOString(),
        })
        .eq('id', commentId);

      if (error) throw error;

      setEditingComment(null);
      setEditContent('');
      fetchComments();
    } catch (error) {
      console.error('Error editing comment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePinComment = async (commentId: string, isPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('task_comments')
        .update({ is_pinned: !isPinned })
        .eq('id', commentId);

      if (error) throw error;
      fetchComments();
    } catch (error) {
      console.error('Error pinning comment:', error);
    }
  };

  const handleResolveComment = async (
    commentId: string,
    isResolved: boolean,
  ) => {
    try {
      const { error } = await supabase
        .from('task_comments')
        .update({
          is_resolved: !isResolved,
          resolved_by: !isResolved ? currentUserId : null,
          resolved_at: !isResolved ? new Date().toISOString() : null,
        })
        .eq('id', commentId);

      if (error) throw error;
      fetchComments();
    } catch (error) {
      console.error('Error resolving comment:', error);
    }
  };

  const handleMentionSelect = (memberId: string) => {
    const member = teamMembers.find((m) => m.id === memberId);
    if (member) {
      setNewComment((prev) => prev.replace(/@\w*$/, `@${member.name} `));
      setSelectedMentions([...selectedMentions, memberId]);
      setShowMentions(false);
    }
  };

  const handleCommentChange = (value: string) => {
    setNewComment(value);

    const mentionMatch = value.match(/@(\w*)$/);
    if (mentionMatch) {
      setMentionSearch(mentionMatch[1]);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div
      key={comment.id}
      className={`flex gap-3 ${isReply ? 'ml-12' : ''} ${
        comment.is_resolved ? 'opacity-60' : ''
      }`}
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={comment.author?.avatar_url} />
        <AvatarFallback>
          {comment.author?.name?.charAt(0) || 'U'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {comment.author?.name || 'Unknown'}
              </span>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.created_at), {
                  addSuffix: true,
                })}
              </span>
              {comment.is_edited && (
                <span className="text-xs text-gray-400">(edited)</span>
              )}
              {comment.is_pinned && (
                <Badge variant="secondary" className="text-xs">
                  <Pin className="h-3 w-3 mr-1" />
                  Pinned
                </Badge>
              )}
              {comment.is_resolved && (
                <Badge variant="success" className="text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  Resolved
                </Badge>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {comment.author_id === currentUserId && (
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingComment(comment.id);
                      setEditContent(comment.content);
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() =>
                    handlePinComment(comment.id, comment.is_pinned)
                  }
                >
                  <Pin className="h-4 w-4 mr-2" />
                  {comment.is_pinned ? 'Unpin' : 'Pin'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    handleResolveComment(comment.id, comment.is_resolved)
                  }
                >
                  <Check className="h-4 w-4 mr-2" />
                  {comment.is_resolved ? 'Unresolve' : 'Resolve'}
                </DropdownMenuItem>
                {!isReply && (
                  <DropdownMenuItem onClick={() => setReplyingTo(comment.id)}>
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {editingComment === comment.id ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleEditComment(comment.id)}
                  disabled={loading}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingComment(null);
                    setEditContent('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {comment.content}
            </p>
          )}

          {comment.attachments && comment.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {comment.attachments.map((attachment, idx) => (
                <a
                  key={idx}
                  href={attachment.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 bg-white border rounded-md hover:bg-gray-50 text-xs"
                >
                  <Paperclip className="h-3 w-3" />
                  {attachment.file_name}
                </a>
              ))}
            </div>
          )}
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}

        {replyingTo === comment.id && (
          <div className="mt-3 flex gap-2">
            <Textarea
              placeholder="Write a reply..."
              value={newComment}
              onChange={(e) => handleCommentChange(e.target.value)}
              className="min-h-[60px]"
            />
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                onClick={handleSubmitComment}
                disabled={loading || !newComment.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setReplyingTo(null);
                  setNewComment('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {comments.map((comment) => renderComment(comment))}
      </div>

      <div className="border-t pt-4">
        <div className="space-y-2">
          <div className="relative">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => handleCommentChange(e.target.value)}
              className="min-h-[80px] pr-24"
            />

            {showMentions && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                {teamMembers
                  .filter((member) =>
                    member.name
                      .toLowerCase()
                      .includes(mentionSearch.toLowerCase()),
                  )
                  .map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleMentionSelect(member.id)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{member.name}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs"
                >
                  <Paperclip className="h-3 w-3" />
                  {file.name}
                  <button
                    onClick={() =>
                      setAttachments(attachments.filter((_, i) => i !== idx))
                    }
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between">
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    setAttachments([
                      ...attachments,
                      ...Array.from(e.target.files),
                    ]);
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Attach
              </Button>
            </div>

            <Button
              onClick={handleSubmitComment}
              disabled={
                loading || (!newComment.trim() && attachments.length === 0)
              }
            >
              <Send className="h-4 w-4 mr-2" />
              Comment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
