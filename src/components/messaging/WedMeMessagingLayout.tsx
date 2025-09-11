'use client';

import React, { useState, useEffect } from 'react';
import { WedMeHeader } from '@/components/wedme/WedMeHeader';
import { MobileMessageComposer } from './MobileMessageComposer';
import { QuickMessageTemplates } from './QuickMessageTemplates';
import { GuestSelectionModal } from './GuestSelectionModal';
import { DeliveryStatusMobile } from './DeliveryStatusMobile';
import {
  OfflineMessageProvider,
  useOfflineMessageQueue,
} from './OfflineMessageQueue';
import { TouchButton } from '@/components/touch/TouchButton';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare,
  Users,
  History,
  Template,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Heart,
  Sparkles,
} from 'lucide-react';

interface Guest {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  rsvpStatus: 'pending' | 'attending' | 'declined';
  group: 'family' | 'friends' | 'wedding-party' | 'vendors' | 'plus-ones';
  hasPhone: boolean;
  hasEmail: boolean;
  relation?: string;
}

interface MessageTemplate {
  id: string;
  title: string;
  message: string;
  category: 'urgent' | 'logistics' | 'social' | 'reminder' | 'thank-you';
  icon: React.ReactNode;
  variables?: string[];
}

interface MessageDelivery {
  id: string;
  message: string;
  sentAt: Date;
  recipientCount: number;
  channel: 'sms' | 'email' | 'push' | 'whatsapp';
  deliveries: {
    guestId: string;
    guestName: string;
    status: {
      id: string;
      status:
        | 'queued'
        | 'sending'
        | 'delivered'
        | 'read'
        | 'failed'
        | 'offline';
      timestamp: Date;
      error?: string;
    };
  }[];
  overallStatus: 'pending' | 'partial' | 'complete' | 'failed';
  isUrgent?: boolean;
}

interface WedMeMessagingLayoutProps {
  guests: Guest[];
  recentMessages: MessageDelivery[];
  onSendMessage: (
    message: string,
    recipientIds: string[],
    isUrgent?: boolean,
  ) => Promise<boolean>;
  onBack?: () => void;
  className?: string;
}

function WedMeMessagingContent({
  guests,
  recentMessages,
  onSendMessage,
  onBack,
  className = '',
}: WedMeMessagingLayoutProps) {
  const [activeTab, setActiveTab] = useState<
    'compose' | 'templates' | 'history'
  >('compose');
  const [showComposer, setShowComposer] = useState(false);
  const [showGuestSelector, setShowGuestSelector] = useState(false);
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<MessageTemplate | null>(null);

  const { isOnline, queuedMessages, addToQueue } = useOfflineMessageQueue();

  // Calculate messaging stats
  const messagingStats = {
    totalSent: recentMessages.length,
    delivered: recentMessages.filter((m) => m.overallStatus === 'complete')
      .length,
    pending:
      recentMessages.filter((m) => m.overallStatus === 'pending').length +
      queuedMessages.length,
    failed: recentMessages.filter((m) => m.overallStatus === 'failed').length,
  };

  const handleSendMessage = async (
    message: string,
    recipientIds: string[],
    isUrgent?: boolean,
  ) => {
    if (!isOnline) {
      // Add to offline queue
      addToQueue({
        message,
        recipientIds,
        channel: 'sms', // Default channel, could be configurable
        isUrgent,
      });
      setShowComposer(false);
      return true;
    }

    try {
      const success = await onSendMessage(message, recipientIds, isUrgent);
      if (success) {
        setShowComposer(false);
        setSelectedGuestIds([]);
      }
      return success;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  };

  const handleTemplateSelect = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setShowComposer(true);
  };

  const handleTemplateCustomize = (
    template: MessageTemplate,
    customMessage: string,
  ) => {
    // Open composer with customized message
    setSelectedTemplate({ ...template, message: customMessage });
    setShowComposer(true);
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 ${className}`}
    >
      {/* Header */}
      <WedMeHeader
        title="Guest Messages"
        showBackButton={true}
        onBack={onBack}
        notifications={messagingStats.pending}
      />

      {/* Quick Stats Cards */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card className="p-3 bg-white/70 backdrop-blur-sm border-pink-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-green-100">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {messagingStats.delivered}
                </p>
                <p className="text-xs text-gray-600">Delivered</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 bg-white/70 backdrop-blur-sm border-pink-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-amber-100">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {messagingStats.pending}
                </p>
                <p className="text-xs text-gray-600">Pending</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 bg-white/70 backdrop-blur-sm border-pink-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-blue-100">
                <MessageSquare className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {messagingStats.totalSent}
                </p>
                <p className="text-xs text-gray-600">Total Sent</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 bg-white/70 backdrop-blur-sm border-pink-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-red-100">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {messagingStats.failed}
                </p>
                <p className="text-xs text-gray-600">Failed</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Action - New Message */}
        <Card className="mb-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-white/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Send Quick Message</h3>
                  <p className="text-sm text-pink-100">
                    Reach your guests instantly
                  </p>
                </div>
              </div>
              {!isOnline && (
                <Badge
                  variant="secondary"
                  className="bg-orange-100 text-orange-800"
                >
                  Offline Mode
                </Badge>
              )}
            </div>

            <TouchButton
              onClick={() => setShowComposer(true)}
              className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30"
              size="lg"
            >
              <Send className="w-4 h-4 mr-2" />
              Compose New Message
            </TouchButton>
          </div>
        </Card>

        {/* Main Content Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as any)}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-3 bg-white/70 backdrop-blur-sm border border-pink-200">
            <TabsTrigger value="compose" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Compose</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Template className="w-4 h-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="mt-4">
            <Card className="bg-white/70 backdrop-blur-sm border-pink-200">
              <div className="p-6 text-center">
                <MessageSquare className="w-12 h-12 text-pink-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">
                  Ready to Message Your Guests?
                </h3>
                <p className="text-gray-600 mb-4">
                  Send updates, reminders, or just share your excitement with
                  the people you love most.
                </p>
                <div className="space-y-3">
                  <TouchButton
                    onClick={() => setShowComposer(true)}
                    className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                    size="lg"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Write Custom Message
                  </TouchButton>
                  <TouchButton
                    onClick={() => setActiveTab('templates')}
                    variant="outline"
                    className="w-full border-pink-300 text-pink-700 hover:bg-pink-50"
                    size="lg"
                  >
                    <Template className="w-4 h-4 mr-2" />
                    Use Quick Template
                  </TouchButton>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <Card className="bg-white/70 backdrop-blur-sm border-pink-200 h-[60vh]">
              <QuickMessageTemplates
                onSelectTemplate={handleTemplateSelect}
                onCustomize={handleTemplateCustomize}
                selectedTemplate={selectedTemplate}
              />
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card className="bg-white/70 backdrop-blur-sm border-pink-200 h-[60vh]">
              <DeliveryStatusMobile
                messages={recentMessages}
                onRefresh={() => window.location.reload()}
                isOffline={!isOnline}
              />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Message Composer Modal */}
      {showComposer && (
        <MobileMessageComposer
          onSend={handleSendMessage}
          onClose={() => {
            setShowComposer(false);
            setSelectedTemplate(null);
          }}
          initialMessage={selectedTemplate?.message || ''}
          recipientIds={selectedGuestIds}
          isOffline={!isOnline}
        />
      )}

      {/* Guest Selection Modal */}
      <GuestSelectionModal
        guests={guests}
        selectedGuestIds={selectedGuestIds}
        onSelectionChange={setSelectedGuestIds}
        onConfirm={(selectedIds) => {
          setSelectedGuestIds(selectedIds);
          setShowGuestSelector(false);
          setShowComposer(true);
        }}
        onClose={() => setShowGuestSelector(false)}
        isOpen={showGuestSelector}
      />

      {/* Wedding-themed motivational footer */}
      <div className="p-4 text-center">
        <div className="flex items-center justify-center gap-2 text-pink-600">
          <Heart className="w-4 h-4 fill-current" />
          <span className="text-sm">
            Keep your loved ones in the loop on your special journey
          </span>
          <Heart className="w-4 h-4 fill-current" />
        </div>
      </div>
    </div>
  );
}

export function WedMeMessagingLayout(props: WedMeMessagingLayoutProps) {
  return (
    <OfflineMessageProvider onSendMessage={props.onSendMessage}>
      <WedMeMessagingContent {...props} />
    </OfflineMessageProvider>
  );
}
