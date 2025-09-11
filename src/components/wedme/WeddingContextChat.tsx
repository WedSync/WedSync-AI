/**
 * WS-243 Wedding Context Chat Component
 * Team D - WedMe Platform Integration
 *
 * CORE FEATURES:
 * - Wedding-contextual AI chat for couples and guests
 * - Role-based responses (couple, guest, vendor access)
 * - Real-time wedding data integration
 * - Vendor communication management through couple account
 * - Photo sharing and wedding planning assistance
 * - Location-based venue features
 * - Guest Q&A automation for wedding details
 *
 * @version 1.0.0
 * @author WedSync Team D - Mobile Chat Integration
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Calendar,
  DollarSign,
  Users,
  MapPin,
  Camera,
  Heart,
  Clock,
} from 'lucide-react';
import {
  MobileChatInterface,
  WeddingContext,
  ChatMessage,
} from '../mobile/chatbot/MobileChatInterface';

/**
 * User role in wedding context
 */
export type WeddingUserRole = 'couple' | 'guest' | 'vendor' | 'admin';

/**
 * Wedding status tracking
 */
export interface WeddingStatus {
  timeline: {
    totalEvents: number;
    completedEvents: number;
    upcomingEvents: number;
    overdue: number;
  };
  budget: {
    totalBudget: number;
    spent: number;
    remaining: number;
    categories: Array<{
      category: string;
      allocated: number;
      spent: number;
    }>;
  };
  vendors: {
    total: number;
    confirmed: number;
    pending: number;
    contracted: number;
  };
  guests: {
    total: number;
    rsvpYes: number;
    rsvpNo: number;
    pending: number;
  };
}

/**
 * Wedding context chat props
 */
export interface WeddingContextChatProps {
  weddingId: string;
  userRole: WeddingUserRole;
  userId?: string;
  guestId?: string;
  vendorId?: string;
  contextualHelp?: boolean;
  className?: string;

  // Chat settings
  enableVoice?: boolean;
  enablePhotos?: boolean;
  enableQuickActions?: boolean;

  // Callbacks
  onWeddingUpdate?: (weddingData: Partial<WeddingContext>) => void;
  onVendorMessage?: (vendorId: string, message: string) => void;
  onGuestUpdate?: (guestId: string, updates: any) => void;
  onTimelineUpdate?: (eventId: string, updates: any) => void;
  onBudgetUpdate?: (categoryId: string, amount: number) => void;
}

/**
 * Wedding Context Chat Component
 */
export function WeddingContextChat({
  weddingId,
  userRole,
  userId,
  guestId,
  vendorId,
  contextualHelp = true,
  className,
  enableVoice = true,
  enablePhotos = true,
  enableQuickActions = true,
  onWeddingUpdate,
  onVendorMessage,
  onGuestUpdate,
  onTimelineUpdate,
  onBudgetUpdate,
}: WeddingContextChatProps) {
  // State
  const [isVisible, setIsVisible] = useState(false);
  const [weddingContext, setWeddingContext] = useState<
    WeddingContext | undefined
  >();
  const [weddingStatus, setWeddingStatus] = useState<
    WeddingStatus | undefined
  >();
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string>();

  // Load wedding context data
  const loadWeddingContext = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch wedding data (replace with actual API call)
      const response = await fetch(`/api/weddings/${weddingId}`);
      const weddingData = await response.json();

      // Transform to WeddingContext format
      const context: WeddingContext = {
        weddingId,
        weddingDate: new Date(weddingData.weddingDate),
        venue: weddingData.venue?.name,
        coupleNames: [weddingData.partner1Name, weddingData.partner2Name],
        vendorList: weddingData.vendors.map((vendor: any) => ({
          id: vendor.id,
          name: vendor.name,
          category: vendor.category,
          status: vendor.status,
        })),
        guestCount: weddingData.guestCount,
        budget: {
          total: weddingData.budget.total,
          spent: weddingData.budget.spent,
          remaining: weddingData.budget.total - weddingData.budget.spent,
        },
        timeline: weddingData.timeline.map((event: any) => ({
          time: event.time,
          event: event.name,
          vendor: event.vendor?.name,
        })),
      };

      setWeddingContext(context);

      // Calculate wedding status
      const status: WeddingStatus = {
        timeline: {
          totalEvents: weddingData.timeline.length,
          completedEvents: weddingData.timeline.filter((e: any) => e.completed)
            .length,
          upcomingEvents: weddingData.timeline.filter(
            (e: any) => !e.completed && new Date(e.date) > new Date(),
          ).length,
          overdue: weddingData.timeline.filter(
            (e: any) => !e.completed && new Date(e.date) < new Date(),
          ).length,
        },
        budget: {
          totalBudget: weddingData.budget.total,
          spent: weddingData.budget.spent,
          remaining: weddingData.budget.total - weddingData.budget.spent,
          categories: weddingData.budget.categories,
        },
        vendors: {
          total: weddingData.vendors.length,
          confirmed: weddingData.vendors.filter(
            (v: any) => v.status === 'confirmed',
          ).length,
          pending: weddingData.vendors.filter(
            (v: any) => v.status === 'pending',
          ).length,
          contracted: weddingData.vendors.filter((v: any) => v.contracted)
            .length,
        },
        guests: {
          total: weddingData.guestCount,
          rsvpYes: weddingData.rsvpStats.yes,
          rsvpNo: weddingData.rsvpStats.no,
          pending: weddingData.rsvpStats.pending,
        },
      };

      setWeddingStatus(status);

      // Generate conversation ID based on user role
      setConversationId(
        `wedding_${weddingId}_${userRole}_${userId || guestId || vendorId}`,
      );
    } catch (error) {
      console.error('Failed to load wedding context:', error);
    } finally {
      setLoading(false);
    }
  }, [weddingId, userRole, userId, guestId, vendorId]);

  // Handle contextual message sending
  const handleMessageSend = useCallback(
    async (message: string) => {
      if (!weddingContext) return;

      try {
        const response = await fetch('/api/chat/wedding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            weddingId,
            userRole,
            userId: userId || guestId || vendorId,
            weddingContext,
            conversationId,
          }),
        });

        const result = await response.json();

        // Handle any wedding updates from AI response
        if (result.weddingUpdates) {
          setWeddingContext((prev) =>
            prev ? { ...prev, ...result.weddingUpdates } : undefined,
          );
          onWeddingUpdate?.(result.weddingUpdates);
        }

        // Handle vendor messages
        if (result.vendorMessage && vendorId) {
          onVendorMessage?.(vendorId, result.vendorMessage);
        }
      } catch (error) {
        console.error('Failed to send wedding message:', error);
      }
    },
    [
      weddingContext,
      weddingId,
      userRole,
      userId,
      guestId,
      vendorId,
      conversationId,
      onWeddingUpdate,
      onVendorMessage,
    ],
  );

  // Handle photo uploads with wedding context
  const handlePhotoUpload = useCallback(
    async (files: FileList) => {
      if (!enablePhotos) return;

      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('photos', file);
      });
      formData.append('weddingId', weddingId);
      formData.append('userRole', userRole);

      try {
        const response = await fetch('/api/photos/wedding', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (result.success) {
          // Add uploaded photos to conversation
          return result.photos;
        }
      } catch (error) {
        console.error('Failed to upload wedding photos:', error);
      }
    },
    [enablePhotos, weddingId, userRole],
  );

  // Handle voice input with wedding context
  const handleVoiceInput = useCallback(
    async (audioBlob: Blob) => {
      if (!enableVoice) return;

      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('weddingId', weddingId);
      formData.append('userRole', userRole);

      try {
        const response = await fetch('/api/voice/wedding', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (result.transcription) {
          // Process voice transcription with wedding context
          await handleMessageSend(result.transcription);
        }
      } catch (error) {
        console.error('Failed to process wedding voice input:', error);
      }
    },
    [enableVoice, weddingId, userRole, handleMessageSend],
  );

  // Load wedding context on mount
  useEffect(() => {
    loadWeddingContext();
  }, [loadWeddingContext]);

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        <span className="ml-3 text-gray-600">Loading wedding details...</span>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Wedding Status Dashboard (contextual help) */}
      {contextualHelp && weddingStatus && userRole === 'couple' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg mb-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mb-2">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {weddingStatus.timeline.completedEvents}/
              {weddingStatus.timeline.totalEvents}
            </div>
            <div className="text-sm text-gray-600">Timeline</div>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 rounded-full mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              ${weddingStatus.budget.remaining.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Remaining</div>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full mb-2">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {weddingStatus.guests.rsvpYes}/{weddingStatus.guests.total}
            </div>
            <div className="text-sm text-gray-600">RSVPs</div>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-pink-100 rounded-full mb-2">
              <Heart className="w-5 h-5 text-pink-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {Math.ceil(
                (new Date(weddingContext?.weddingDate || '').getTime() -
                  Date.now()) /
                  (1000 * 60 * 60 * 24),
              )}
            </div>
            <div className="text-sm text-gray-600">Days Left</div>
          </div>
        </div>
      )}

      {/* Guest Quick Info */}
      {userRole === 'guest' && weddingContext && (
        <div className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg mb-4">
          <h3 className="font-semibold text-gray-900 mb-2">
            {weddingContext.coupleNames.join(' & ')}'s Wedding
          </h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{weddingContext.weddingDate.toLocaleDateString()}</span>
            </div>
            {weddingContext.venue && (
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{weddingContext.venue}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      {enableQuickActions && (
        <div className="flex flex-wrap gap-2 mb-4">
          {userRole === 'couple' && (
            <>
              <button
                onClick={() => {
                  setIsVisible(true);
                  // Auto-populate with timeline question
                  setTimeout(() => {
                    handleMessageSend('Show me my wedding timeline status');
                  }, 500);
                }}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-blue-700 text-sm font-medium"
              >
                <Calendar className="w-4 h-4" />
                <span>Timeline Help</span>
              </button>

              <button
                onClick={() => {
                  setIsVisible(true);
                  setTimeout(() => {
                    handleMessageSend('How is my wedding budget looking?');
                  }, 500);
                }}
                className="flex items-center space-x-2 px-3 py-2 bg-green-100 hover:bg-green-200 rounded-lg text-green-700 text-sm font-medium"
              >
                <DollarSign className="w-4 h-4" />
                <span>Budget Check</span>
              </button>
            </>
          )}

          {userRole === 'guest' && (
            <>
              <button
                onClick={() => {
                  setIsVisible(true);
                  setTimeout(() => {
                    handleMessageSend('What should I wear to the wedding?');
                  }, 500);
                }}
                className="flex items-center space-x-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 rounded-lg text-purple-700 text-sm font-medium"
              >
                <span>Dress Code</span>
              </button>

              <button
                onClick={() => {
                  setIsVisible(true);
                  setTimeout(() => {
                    handleMessageSend(
                      'Where is the venue and how do I get there?',
                    );
                  }, 500);
                }}
                className="flex items-center space-x-2 px-3 py-2 bg-cyan-100 hover:bg-cyan-200 rounded-lg text-cyan-700 text-sm font-medium"
              >
                <MapPin className="w-4 h-4" />
                <span>Venue Info</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Mobile Chat Interface */}
      <MobileChatInterface
        isVisible={isVisible}
        onToggle={() => setIsVisible(!isVisible)}
        conversationId={conversationId}
        weddingContext={weddingContext}
        userRole={userRole}
        enableHaptics={true}
        offlineMode={true}
        keyboardAdjustment={true}
        virtualScrolling={true}
        onMessageSend={handleMessageSend}
        onFileUpload={enablePhotos ? handlePhotoUpload : undefined}
        onVoiceInput={enableVoice ? handleVoiceInput : undefined}
        className={className}
      />
    </div>
  );
}

/**
 * Generate role-based chat prompts
 */
export function generateRoleBasedPrompts(
  role: WeddingUserRole,
  weddingContext?: WeddingContext,
) {
  const basePrompts = {
    couple: [
      'Show my wedding timeline',
      'Check my budget status',
      'Contact my vendors',
      'Update guest list',
      'Plan rehearsal dinner',
    ],
    guest: [
      'What should I wear?',
      'Where is the venue?',
      'What time should I arrive?',
      'Can I bring a plus one?',
      'Dietary restrictions info',
    ],
    vendor: [
      'Update timeline status',
      'Send invoice',
      'Schedule meeting',
      'Upload photos',
      'Confirm details',
    ],
    admin: [
      'Wedding health check',
      'Vendor status report',
      'Budget analytics',
      'Timeline overview',
      'Guest management',
    ],
  };

  return basePrompts[role] || basePrompts.couple;
}

export default WeddingContextChat;
