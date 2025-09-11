'use client';

import { useState } from 'react';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { ActivityFeed } from './ActivityFeed';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Database } from '@/types/database';
import { X, Plus, Search } from 'lucide-react';
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

interface MessagingLayoutProps {
  organizationId: string;
  currentUserId: string;
  currentUserType: 'client' | 'vendor';
  showActivityFeed?: boolean;
  className?: string;
}

export function MessagingLayout({
  organizationId,
  currentUserId,
  currentUserType,
  showActivityFeed = true,
  className = '',
}: MessagingLayoutProps) {
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [showNewConversationDialog, setShowNewConversationDialog] =
    useState(false);
  const [activeTab, setActiveTab] = useState<'messages' | 'activity'>(
    'messages',
  );

  // New conversation form state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [initialMessage, setInitialMessage] = useState('');
  const [creating, setCreating] = useState(false);

  const handleNewConversation = () => {
    setShowNewConversationDialog(true);
    setSearchQuery('');
    setSelectedContact(null);
    setInitialMessage('');
  };

  const handleCreateConversation = async () => {
    if (!selectedContact || creating) return;

    setCreating(true);

    try {
      const response = await fetch('/api/communications/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id:
            currentUserType === 'client' ? currentUserId : selectedContact.id,
          vendor_id:
            currentUserType === 'vendor' ? currentUserId : selectedContact.id,
          organization_id: organizationId,
          subject: null,
          initial_message: initialMessage.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const data = await response.json();

      // Close dialog and select the new/existing conversation
      setShowNewConversationDialog(false);

      // If conversation already existed, we might want to select it
      if (data.conversation) {
        // The conversation list will update via realtime, so just close dialog
        console.log('Conversation created/found:', data.conversation);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={clsx('h-full flex bg-white', className)}>
      {/* Left Sidebar - Conversations List */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <ConversationList
          organizationId={organizationId}
          userId={currentUserId}
          userType={currentUserType}
          selectedConversationId={selectedConversation?.id}
          onConversationSelect={setSelectedConversation}
          onNewConversation={handleNewConversation}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <MessageThread
            conversation={selectedConversation}
            currentUserId={currentUserId}
            currentUserType={currentUserType}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No conversation selected
              </h3>
              <p className="text-gray-500 mb-4">
                Choose a conversation from the list or start a new one
              </p>
              <Button onClick={handleNewConversation}>
                Start new conversation
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Activity Feed (Optional) */}
      {showActivityFeed && (
        <div className="w-80 border-l border-gray-200 bg-gray-50">
          <div className="h-full flex flex-col">
            {/* Tabs */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('messages')}
                  className={clsx(
                    'flex-1 text-sm font-medium py-2 px-3 rounded-md transition-colors',
                    activeTab === 'messages'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900',
                  )}
                >
                  Messages
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={clsx(
                    'flex-1 text-sm font-medium py-2 px-3 rounded-md transition-colors',
                    activeTab === 'activity'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900',
                  )}
                >
                  Activity
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'activity' ? (
                <ActivityFeed
                  organizationId={organizationId}
                  userId={currentUserId}
                  showFilters={true}
                />
              ) : (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Recent Messages</h3>
                  <ActivityFeed
                    organizationId={organizationId}
                    userId={currentUserId}
                    entityType="message"
                    maxItems={20}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Conversation Dialog */}
      <Dialog
        open={showNewConversationDialog}
        onClose={() => setShowNewConversationDialog(false)}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Start New Conversation
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewConversationDialog(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Contact Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {currentUserType === 'client'
                  ? 'Select Vendor'
                  : 'Select Client'}
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder={`Search ${currentUserType === 'client' ? 'vendors' : 'clients'}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* This would typically show search results */}
              {searchQuery && (
                <div className="mt-2 p-2 text-sm text-gray-500 bg-gray-50 rounded">
                  Search functionality would show{' '}
                  {currentUserType === 'client' ? 'vendors' : 'clients'} here
                </div>
              )}
            </div>

            {/* Initial Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Initial Message (Optional)
              </label>
              <textarea
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="Start the conversation with a message..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setShowNewConversationDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateConversation}
              disabled={!selectedContact || creating}
            >
              {creating ? 'Creating...' : 'Start Conversation'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
