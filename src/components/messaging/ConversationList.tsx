'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRealtimeConversations } from '@/lib/supabase/realtime';
import { Database } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Search, Plus } from 'lucide-react';
import { clsx } from 'clsx';

type Conversation = Database['public']['Tables']['conversations']['Row'] & {
  client?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    wedding_date: string | null;
  };
  vendor?: {
    id: string;
    business_name: string;
    email: string;
    primary_category: string;
  };
};

interface ConversationListProps {
  organizationId: string;
  userId: string;
  userType: 'client' | 'vendor';
  selectedConversationId?: string;
  onConversationSelect: (conversation: Conversation) => void;
  onNewConversation: () => void;
}

export function ConversationList({
  organizationId,
  userId,
  userType,
  selectedConversationId,
  onConversationSelect,
  onNewConversation,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Use realtime hook
  const { conversations: realtimeConversations } = useRealtimeConversations(
    organizationId,
    userId,
    userType,
  );

  // Load initial conversations
  useEffect(() => {
    async function loadConversations() {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/communications/conversations?organization_id=${organizationId}&user_id=${userId}&user_type=${userType}`,
        );

        if (!response.ok) {
          throw new Error('Failed to load conversations');
        }

        const data = await response.json();
        setConversations(data.conversations || []);
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setLoading(false);
      }
    }

    loadConversations();
  }, [organizationId, userId, userType]);

  // Update conversations when realtime data changes
  useEffect(() => {
    if (realtimeConversations.length > 0) {
      setConversations(realtimeConversations);
    }
  }, [realtimeConversations]);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conversation) => {
    if (!searchQuery.trim()) return true;

    const searchLower = searchQuery.toLowerCase();
    const otherParty =
      userType === 'client' ? conversation.vendor : conversation.client;

    if (userType === 'client' && conversation.vendor) {
      return conversation.vendor.business_name
        .toLowerCase()
        .includes(searchLower);
    } else if (userType === 'vendor' && conversation.client) {
      const clientName =
        `${conversation.client.first_name || ''} ${conversation.client.last_name || ''}`.trim();
      return (
        clientName.toLowerCase().includes(searchLower) ||
        (conversation.client.email &&
          conversation.client.email.toLowerCase().includes(searchLower))
      );
    }

    return false;
  });

  const getConversationName = (conversation: Conversation) => {
    if (userType === 'client' && conversation.vendor) {
      return conversation.vendor.business_name;
    } else if (userType === 'vendor' && conversation.client) {
      const firstName = conversation.client.first_name || '';
      const lastName = conversation.client.last_name || '';
      return (
        `${firstName} ${lastName}`.trim() ||
        conversation.client.email ||
        'Unknown Client'
      );
    }
    return 'Unknown';
  };

  const getConversationSubtitle = (conversation: Conversation) => {
    if (userType === 'client' && conversation.vendor) {
      return conversation.vendor.primary_category;
    } else if (userType === 'vendor' && conversation.client) {
      if (conversation.client.wedding_date) {
        return `Wedding: ${new Date(conversation.client.wedding_date).toLocaleDateString()}`;
      }
      return conversation.client.email || '';
    }
    return '';
  };

  const getUnreadCount = (conversation: Conversation) => {
    return userType === 'client'
      ? conversation.unread_count_client
      : conversation.unread_count_vendor;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
          <Button
            onClick={onNewConversation}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery
                ? 'No matching conversations'
                : 'No conversations yet'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Start a new conversation to begin messaging'}
            </p>
            {!searchQuery && (
              <Button onClick={onNewConversation}>Start a conversation</Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredConversations.map((conversation) => {
              const unreadCount = getUnreadCount(conversation);
              const isSelected = conversation.id === selectedConversationId;

              return (
                <button
                  key={conversation.id}
                  onClick={() => onConversationSelect(conversation)}
                  className={clsx(
                    'w-full p-4 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors',
                    isSelected && 'bg-blue-50 border-r-2 border-blue-500',
                  )}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar
                      src={
                        userType === 'vendor' && conversation.client
                          ? undefined
                          : undefined
                      }
                      alt={getConversationName(conversation)}
                      className="w-12 h-12"
                    >
                      {getConversationName(conversation)
                        .charAt(0)
                        .toUpperCase()}
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4
                          className={clsx(
                            'text-sm truncate',
                            unreadCount > 0
                              ? 'font-semibold text-gray-900'
                              : 'font-medium text-gray-700',
                          )}
                        >
                          {getConversationName(conversation)}
                        </h4>

                        <div className="flex items-center space-x-2">
                          {unreadCount > 0 && (
                            <Badge color="blue" className="text-xs">
                              {unreadCount}
                            </Badge>
                          )}
                          <time className="text-xs text-gray-500">
                            {formatDistanceToNow(
                              new Date(conversation.last_message_at),
                              { addSuffix: true },
                            )}
                          </time>
                        </div>
                      </div>

                      <p className="text-xs text-gray-500 mt-1">
                        {getConversationSubtitle(conversation)}
                      </p>

                      {conversation.last_message_preview && (
                        <p
                          className={clsx(
                            'text-sm mt-1 truncate',
                            unreadCount > 0
                              ? 'font-medium text-gray-800'
                              : 'text-gray-600',
                          )}
                        >
                          {conversation.last_message_preview}
                        </p>
                      )}

                      {/* Typing indicator */}
                      {((userType === 'client' && conversation.vendor_typing) ||
                        (userType === 'vendor' &&
                          conversation.client_typing)) && (
                        <p className="text-xs text-blue-600 mt-1 animate-pulse">
                          Typing...
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
