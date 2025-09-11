'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  MessagePreviewProps,
  BulkMessageData,
  GuestWithSegmentInfo,
} from '@/types/communications';
import {
  EyeIcon,
  UserIcon,
  MailIcon,
  SmartphoneIcon,
  MessageCircleIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
} from 'lucide-react';

interface PreviewChannel {
  key: 'email' | 'sms' | 'whatsapp';
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const PREVIEW_CHANNELS: PreviewChannel[] = [
  {
    key: 'email',
    label: 'Email',
    icon: <MailIcon className="w-5 h-5" />,
    description: 'How it appears in email clients',
    color: 'text-blue-600 bg-blue-100',
  },
  {
    key: 'sms',
    label: 'SMS',
    icon: <SmartphoneIcon className="w-5 h-5" />,
    description: 'How it appears as text message',
    color: 'text-green-600 bg-green-100',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: <MessageCircleIcon className="w-5 h-5" />,
    description: 'How it appears in WhatsApp',
    color: 'text-green-600 bg-green-100',
  },
];

// Generate mock guest data for preview
const generateMockGuest = (index: number): GuestWithSegmentInfo => ({
  id: `preview-guest-${index}`,
  first_name: ['Sarah', 'Michael', 'Emily', 'David', 'Jessica'][index % 5],
  last_name: ['Johnson', 'Smith', 'Brown', 'Wilson', 'Davis'][index % 5],
  email: `guest${index + 1}@example.com`,
  phone: `+1555000${String(index).padStart(4, '0')}`,
  rsvp_status: (['pending', 'attending', 'declined', 'maybe'] as const)[
    index % 4
  ],
  dietary_restrictions:
    index % 3 === 0
      ? ['Vegetarian', 'Gluten-free', 'Nut allergy'][index % 3]
      : undefined,
  plus_one: index % 4 === 0,
  plus_one_name: index % 4 === 0 ? `Partner${index}` : undefined,
  category: (['family', 'friends', 'work', 'other'] as const)[index % 4],
  side: (['partner1', 'partner2', 'mutual'] as const)[index % 3],
  tags: [`tag${(index % 3) + 1}`],
  household_name: `Household ${index + 1}`,
  table_number: Math.floor(index / 8) + 1,
});

export function MessagePreview({
  messageData,
  selectedGuestIds,
  previewGuest,
  onGuestChange,
  className,
}: MessagePreviewProps) {
  const [selectedChannel, setSelectedChannel] = useState<
    'email' | 'sms' | 'whatsapp'
  >('email');
  const [isGeneratingPreviews, setIsGeneratingPreviews] = useState(false);
  const [showGuestSelector, setShowGuestSelector] = useState(false);

  // Generate mock guests if none provided
  const availableGuests = useMemo(() => {
    if (previewGuest) return [previewGuest];

    // Generate mock guests based on selected IDs
    return selectedGuestIds
      .slice(0, 10)
      .map((id, index) => generateMockGuest(index));
  }, [selectedGuestIds, previewGuest]);

  const currentPreviewGuest = previewGuest || availableGuests[0];

  const personalizedContent = useMemo(() => {
    if (!currentPreviewGuest || !messageData.message_content) {
      return {
        subject: messageData.message_content.subject || '',
        htmlContent: messageData.message_content.html_content,
        textContent: messageData.message_content.text_content,
      };
    }

    const tokenReplacements: Record<string, string> = {
      '{guest_name}': `${currentPreviewGuest.first_name} ${currentPreviewGuest.last_name}`,
      '{first_name}': currentPreviewGuest.first_name,
      '{last_name}': currentPreviewGuest.last_name,
      '{plus_one_name}': currentPreviewGuest.plus_one_name || 'Guest',
      '{dietary_info}':
        currentPreviewGuest.dietary_restrictions || 'No special requirements',
      '{table_number}': currentPreviewGuest.table_number?.toString() || 'TBD',
      '{wedding_date}': 'June 15, 2024', // This would come from actual wedding data
      '{venue_name}': 'Grand Ballroom', // This would come from actual venue data
      '{ceremony_time}': '4:00 PM', // This would come from actual event data
    };

    let subject = messageData.message_content.subject || '';
    let htmlContent = messageData.message_content.html_content;
    let textContent = messageData.message_content.text_content;

    // Replace all tokens
    Object.entries(tokenReplacements).forEach(([token, replacement]) => {
      const regex = new RegExp(token.replace(/[{}]/g, '\\$&'), 'g');
      subject = subject.replace(regex, replacement);
      htmlContent = htmlContent.replace(regex, replacement);
      textContent = textContent.replace(regex, replacement);
    });

    return { subject, htmlContent, textContent };
  }, [currentPreviewGuest, messageData.message_content]);

  const handleChannelChange = useCallback(
    (channel: 'email' | 'sms' | 'whatsapp') => {
      setSelectedChannel(channel);
    },
    [],
  );

  const handleGuestSelection = useCallback(
    (guestId: string) => {
      onGuestChange(guestId);
      setShowGuestSelector(false);
    },
    [onGuestChange],
  );

  const generateAllPreviews = useCallback(async () => {
    setIsGeneratingPreviews(true);

    // Simulate API call to generate previews for all guests
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsGeneratingPreviews(false);
  }, []);

  const availableChannels = PREVIEW_CHANNELS.filter((channel) =>
    messageData.delivery_options.channels.includes(channel.key),
  );

  const hasPersonalizationTokens = useMemo(() => {
    const content =
      messageData.message_content.html_content +
      messageData.message_content.text_content +
      (messageData.message_content.subject || '');
    return messageData.personalization_tokens.some((token) =>
      content.includes(token.token),
    );
  }, [messageData.message_content, messageData.personalization_tokens]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-primary-100 p-2 rounded-lg">
            <EyeIcon className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Message Preview
            </h2>
            <p className="text-sm text-gray-600">
              See how your message will look to guests
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {hasPersonalizationTokens && (
            <button
              onClick={generateAllPreviews}
              disabled={isGeneratingPreviews}
              className={cn(
                'flex items-center px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100',
                isGeneratingPreviews && 'opacity-50 cursor-not-allowed',
              )}
            >
              <RefreshCwIcon
                className={cn(
                  'w-4 h-4 mr-2',
                  isGeneratingPreviews && 'animate-spin',
                )}
              />
              {isGeneratingPreviews ? 'Generating...' : 'Generate All'}
            </button>
          )}
        </div>
      </div>

      {/* Personalization Status */}
      {hasPersonalizationTokens ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="w-5 h-5 text-blue-600 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">
                Personalization Active
              </h4>
              <p className="text-sm text-blue-700">
                Your message includes personalization tokens that will be
                replaced with guest-specific information.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangleIcon className="w-5 h-5 text-yellow-600 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-yellow-900">
                No Personalization
              </h4>
              <p className="text-sm text-yellow-700">
                Your message will be the same for all guests. Consider adding
                personalization tokens like {'{first_name}'} or{' '}
                {'{dietary_info}'}.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Preview Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Guest Selector */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Preview as Guest
            </h3>

            <div className="relative">
              <button
                onClick={() => setShowGuestSelector(!showGuestSelector)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-left hover:bg-gray-100 transition-colors duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-primary-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {currentPreviewGuest
                        ? `${currentPreviewGuest.first_name} ${currentPreviewGuest.last_name}`
                        : 'Select Guest'}
                    </div>
                    {currentPreviewGuest && (
                      <div className="text-xs text-gray-500">
                        {currentPreviewGuest.email}
                      </div>
                    )}
                  </div>
                </div>
                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
              </button>

              {showGuestSelector && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {availableGuests.map((guest, index) => (
                    <button
                      key={guest.id}
                      onClick={() => handleGuestSelection(guest.id)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {guest.first_name.charAt(0)}
                            {guest.last_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {guest.first_name} {guest.last_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {guest.category} • {guest.rsvp_status}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Channel Selector */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Preview Channel
            </h3>

            <div className="space-y-2">
              {availableChannels.map((channel) => (
                <button
                  key={channel.key}
                  onClick={() => handleChannelChange(channel.key)}
                  className={cn(
                    'w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all duration-200',
                    selectedChannel === channel.key
                      ? channel.color + ' shadow-sm'
                      : 'bg-gray-50 hover:bg-gray-100',
                  )}
                >
                  <div
                    className={cn(
                      'p-1 rounded',
                      selectedChannel === channel.key
                        ? channel.color.split(' ').slice(1).join(' ')
                        : 'bg-gray-200',
                    )}
                  >
                    {channel.icon}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{channel.label}</div>
                    <div className="text-xs opacity-75">
                      {channel.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Guest Details */}
          {currentPreviewGuest && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Guest Details
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className="capitalize">
                    {currentPreviewGuest.category}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">RSVP:</span>
                  <span className="capitalize">
                    {currentPreviewGuest.rsvp_status}
                  </span>
                </div>
                {currentPreviewGuest.dietary_restrictions && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dietary:</span>
                    <span>{currentPreviewGuest.dietary_restrictions}</span>
                  </div>
                )}
                {currentPreviewGuest.plus_one && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Plus One:</span>
                    <span>{currentPreviewGuest.plus_one_name || 'Yes'}</span>
                  </div>
                )}
                {currentPreviewGuest.table_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Table:</span>
                    <span>{currentPreviewGuest.table_number}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Preview Content */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {selectedChannel === 'email' && (
              <EmailPreview
                subject={personalizedContent.subject}
                htmlContent={personalizedContent.htmlContent}
                textContent={personalizedContent.textContent}
                guest={currentPreviewGuest}
              />
            )}

            {selectedChannel === 'sms' && (
              <SMSPreview
                content={personalizedContent.textContent}
                guest={currentPreviewGuest}
              />
            )}

            {selectedChannel === 'whatsapp' && (
              <WhatsAppPreview
                content={personalizedContent.textContent}
                guest={currentPreviewGuest}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface EmailPreviewProps {
  subject: string;
  htmlContent: string;
  textContent: string;
  guest?: GuestWithSegmentInfo;
}

function EmailPreview({
  subject,
  htmlContent,
  textContent,
  guest,
}: EmailPreviewProps) {
  return (
    <div className="bg-white">
      {/* Email Header */}
      <div className="bg-gray-100 px-6 py-4 border-b">
        <div className="flex items-center justify-between text-sm">
          <div>
            <div className="font-medium text-gray-900">
              From: wedding@yourweddingdomain.com
            </div>
            <div className="text-gray-600">
              To: {guest?.email || 'guest@example.com'}
            </div>
            <div className="font-medium text-gray-900 mt-2">
              Subject: {subject || 'No subject'}
            </div>
          </div>
          <div className="text-gray-500 text-right">
            <div>{new Date().toLocaleDateString()}</div>
            <div>{new Date().toLocaleTimeString()}</div>
          </div>
        </div>
      </div>

      {/* Email Body */}
      <div className="p-6">
        {htmlContent ? (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        ) : (
          <div className="text-gray-500 italic">No email content</div>
        )}
      </div>

      {/* Email Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t text-xs text-gray-500">
        <p>This message was sent from Your Wedding Planning System</p>
        <p className="mt-1">
          <a href="#" className="text-primary-600 hover:text-primary-700">
            Unsubscribe
          </a>{' '}
          |
          <a href="#" className="text-primary-600 hover:text-primary-700 ml-1">
            Update preferences
          </a>
        </p>
      </div>
    </div>
  );
}

interface SMSPreviewProps {
  content: string;
  guest?: GuestWithSegmentInfo;
}

function SMSPreview({ content, guest }: SMSPreviewProps) {
  return (
    <div className="bg-gray-100 p-6 min-h-96">
      <div className="max-w-sm mx-auto">
        {/* Phone Header */}
        <div className="bg-white rounded-t-2xl p-4 border-b">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
              <div>
                <div className="font-medium">Your Wedding</div>
                <div className="text-gray-500 text-xs">Mobile</div>
              </div>
            </div>
            <div className="text-gray-500">
              {new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="bg-white p-4 min-h-80">
          <div className="space-y-4">
            <div className="flex justify-end">
              <div className="bg-blue-500 text-white rounded-2xl rounded-br-sm p-3 max-w-xs">
                <div className="text-sm whitespace-pre-wrap">
                  {content || 'No SMS content'}
                </div>
                <div className="text-xs text-blue-100 mt-1">
                  {new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Phone Footer */}
        <div className="bg-white rounded-b-2xl p-4 border-t">
          <div className="flex items-center space-x-3">
            <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm text-gray-500">
              Text message...
            </div>
            <button className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface WhatsAppPreviewProps {
  content: string;
  guest?: GuestWithSegmentInfo;
}

function WhatsAppPreview({ content, guest }: WhatsAppPreviewProps) {
  return (
    <div style={{ backgroundColor: '#0a1014' }} className="p-6 min-h-96">
      <div className="max-w-sm mx-auto">
        {/* WhatsApp Header */}
        <div
          style={{ backgroundColor: '#202c33' }}
          className="rounded-t-2xl p-4"
        >
          <div className="flex items-center justify-between text-white text-sm">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                W
              </div>
              <div>
                <div className="font-medium">Your Wedding</div>
                <div className="text-gray-300 text-xs">online</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className="w-6 h-6">📹</button>
              <button className="w-6 h-6">📞</button>
              <button className="w-6 h-6">⋮</button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ backgroundColor: '#0b141a' }} className="p-4 min-h-80">
          <div className="space-y-4">
            <div className="flex justify-end">
              <div
                style={{ backgroundColor: '#005c4b' }}
                className="text-white rounded-lg rounded-br-sm p-3 max-w-xs relative"
              >
                <div className="text-sm whitespace-pre-wrap">
                  {content || 'No WhatsApp content'}
                </div>
                <div className="text-xs text-gray-300 mt-1 flex items-center justify-end">
                  <span>
                    {new Date().toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="ml-1">✓✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Footer */}
        <div
          style={{ backgroundColor: '#202c33' }}
          className="rounded-b-2xl p-4"
        >
          <div className="flex items-center space-x-3">
            <button className="text-gray-400">😊</button>
            <div className="flex-1 bg-gray-700 rounded-full px-4 py-2 text-sm text-gray-300">
              Type a message...
            </div>
            <button className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
              🎤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
