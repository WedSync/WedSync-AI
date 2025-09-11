'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Heart, MessageCircle, Flag, Share2, Trash2, User } from 'lucide-react';
import { useWeddingAnalytics } from '@/lib/website/analytics-integration';

export interface GuestBookMessage {
  id: string;
  website_id: string;
  guest_name: string;
  guest_email?: string;
  message: string;
  is_approved: boolean;
  is_featured: boolean;
  likes_count: number;
  created_at: string;
  updated_at: string;
}

interface GuestBookProps {
  websiteId: string;
  isOwner?: boolean;
  coupleName?: string;
  allowAnonymous?: boolean;
  requireApproval?: boolean;
}

export default function GuestBook({
  websiteId,
  isOwner = false,
  coupleName = 'the happy couple',
  allowAnonymous = true,
  requireApproval = true,
}: GuestBookProps) {
  const [messages, setMessages] = useState<GuestBookMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>(
    'approved',
  );

  const supabase = await createClient();
  const analytics = useWeddingAnalytics(websiteId);

  // Load messages
  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('guest_book_messages')
        .select('*')
        .eq('website_id', websiteId)
        .order('created_at', { ascending: false });

      // Filter based on user type and selected filter
      if (!isOwner) {
        query = query.eq('is_approved', true);
      } else if (filter === 'approved') {
        query = query.eq('is_approved', true);
      } else if (filter === 'pending') {
        query = query.eq('is_approved', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [websiteId, isOwner, filter, supabase]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Submit new message
  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) return;
    if (!allowAnonymous && !guestName.trim()) return;

    setIsSubmitting(true);
    try {
      const messageData: Omit<
        GuestBookMessage,
        'id' | 'created_at' | 'updated_at'
      > = {
        website_id: websiteId,
        guest_name: guestName.trim() || 'Anonymous Guest',
        guest_email: guestEmail.trim() || undefined,
        message: newMessage.trim(),
        is_approved: !requireApproval, // Auto-approve if approval not required
        is_featured: false,
        likes_count: 0,
      };

      const { error } = await supabase
        .from('guest_book_messages')
        .insert(messageData);

      if (error) throw error;

      // Track analytics
      await analytics.trackEvent('guest_book_message_submitted', {
        message_length: newMessage.length,
        has_email: !!guestEmail,
        is_anonymous: !guestName,
      });

      // Reset form
      setNewMessage('');
      setGuestName('');
      setGuestEmail('');
      setShowForm(false);

      // Reload messages
      await loadMessages();

      // Show success message
      alert(
        requireApproval
          ? 'Thank you! Your message will appear after approval.'
          : 'Thank you for your message!',
      );
    } catch (error) {
      console.error('Error submitting message:', error);
      alert('Error submitting message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Like/unlike message
  const toggleLike = async (messageId: string) => {
    try {
      const message = messages.find((m) => m.id === messageId);
      if (!message) return;

      const { error } = await supabase
        .from('guest_book_messages')
        .update({
          likes_count: message.likes_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) throw error;

      // Update local state
      setMessages(
        messages.map((m) =>
          m.id === messageId ? { ...m, likes_count: m.likes_count + 1 } : m,
        ),
      );

      // Track analytics
      await analytics.trackEvent('guest_book_message_liked', {
        message_id: messageId,
      });
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Approve message (owner only)
  const approveMessage = async (messageId: string) => {
    if (!isOwner) return;

    try {
      const { error } = await supabase
        .from('guest_book_messages')
        .update({
          is_approved: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) throw error;

      await loadMessages();
    } catch (error) {
      console.error('Error approving message:', error);
    }
  };

  // Delete message (owner only)
  const deleteMessage = async (messageId: string) => {
    if (!isOwner) return;
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const { error } = await supabase
        .from('guest_book_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      await loadMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  // Toggle featured status (owner only)
  const toggleFeatured = async (messageId: string) => {
    if (!isOwner) return;

    try {
      const message = messages.find((m) => m.id === messageId);
      if (!message) return;

      const { error } = await supabase
        .from('guest_book_messages')
        .update({
          is_featured: !message.is_featured,
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) throw error;

      await loadMessages();
    } catch (error) {
      console.error('Error toggling featured status:', error);
    }
  };

  // Share message
  const shareMessage = (message: GuestBookMessage) => {
    const shareText = `"${message.message}" - ${message.guest_name} | ${coupleName}'s Wedding Guest Book`;

    if (navigator.share) {
      navigator.share({
        title: `Message from ${message.guest_name}`,
        text: shareText,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
      alert('Message copied to clipboard!');
    }

    // Track analytics
    analytics.trackEvent('guest_book_message_shared', {
      message_id: message.id,
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Guest Book</h1>
        <p className="text-lg text-gray-600">
          Leave a message for {coupleName} to cherish forever
        </p>
      </div>

      {/* Owner Controls */}
      {isOwner && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-blue-900">Owner Controls</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded text-sm ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-blue-600'
                }`}
              >
                All Messages
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-3 py-1 rounded text-sm ${
                  filter === 'approved'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-blue-600'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1 rounded text-sm ${
                  filter === 'pending'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-blue-600'
                }`}
              >
                Pending
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Form */}
      {!showForm ? (
        <div className="text-center mb-8">
          <button
            onClick={() => setShowForm(true)}
            className="bg-rose-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-rose-700 transition-colors"
          >
            <MessageCircle className="inline mr-2" size={20} />
            Leave a Message
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4">Share Your Wishes</h3>
          <form onSubmit={handleSubmitMessage} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name{' '}
                  {!allowAnonymous && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={
                    allowAnonymous ? 'Your name (optional)' : 'Your name'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  required={!allowAnonymous}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Share your congratulations, memories, or well-wishes..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                {newMessage.length}/500 characters
              </p>
            </div>
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !newMessage.trim()}
                className="bg-rose-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Message'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Messages List */}
      <div className="space-y-6">
        {messages.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <MessageCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">
              {filter === 'pending'
                ? 'No pending messages'
                : 'Be the first to leave a message!'}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`bg-white rounded-lg shadow-md p-6 ${
                message.is_featured ? 'ring-2 ring-yellow-300 bg-yellow-50' : ''
              } ${
                !message.is_approved
                  ? 'opacity-75 border-l-4 border-orange-400'
                  : ''
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                    <User size={20} className="text-rose-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {message.guest_name}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {new Date(message.created_at).toLocaleDateString(
                        'en-US',
                        {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        },
                      )}
                    </p>
                  </div>
                  {message.is_featured && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                      ⭐ Featured
                    </span>
                  )}
                  {!message.is_approved && (
                    <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                      Pending Approval
                    </span>
                  )}
                </div>

                {/* Message Actions */}
                <div className="flex items-center space-x-2">
                  {/* Like Button */}
                  <button
                    onClick={() => toggleLike(message.id)}
                    className="flex items-center space-x-1 text-gray-600 hover:text-rose-600 transition-colors"
                  >
                    <Heart size={16} />
                    <span className="text-sm">{message.likes_count}</span>
                  </button>

                  {/* Share Button */}
                  <button
                    onClick={() => shareMessage(message)}
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    <Share2 size={16} />
                  </button>

                  {/* Owner Actions */}
                  {isOwner && (
                    <>
                      {!message.is_approved && (
                        <button
                          onClick={() => approveMessage(message.id)}
                          className="text-green-600 hover:text-green-700 text-sm px-2 py-1 rounded"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => toggleFeatured(message.id)}
                        className={`text-sm px-2 py-1 rounded ${
                          message.is_featured
                            ? 'text-yellow-600 hover:text-yellow-700'
                            : 'text-gray-600 hover:text-gray-700'
                        }`}
                      >
                        {message.is_featured ? 'Unfeature' : 'Feature'}
                      </button>
                      <button
                        onClick={() => deleteMessage(message.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="text-gray-800 leading-relaxed">
                {message.message}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Statistics (Owner only) */}
      {isOwner && messages.length > 0 && (
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Guest Book Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-rose-600">
                {messages.length}
              </div>
              <div className="text-sm text-gray-600">Total Messages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {messages.filter((m) => m.is_approved).length}
              </div>
              <div className="text-sm text-gray-600">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {messages.filter((m) => !m.is_approved).length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {messages.reduce((sum, m) => sum + m.likes_count, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Likes</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
