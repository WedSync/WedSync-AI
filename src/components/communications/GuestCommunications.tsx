'use client';

import { useState, useCallback, useReducer, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  GuestCommunicationsProps,
  BulkMessageData,
  GuestSegmentationCriteria,
  MessageContent,
  DeliveryOptions,
  PersonalizationToken,
  MessageTemplate,
  GuestWithSegmentInfo,
  BulkDeliveryStats,
  DEFAULT_PERSONALIZATION_TOKENS,
} from '@/types/communications';
import { GuestSegmentation } from './GuestSegmentation';
import { MessageComposition } from './MessageComposition';
import { BulkSendConfig } from './BulkSendConfig';
import { DeliveryStatus } from './DeliveryStatus';
import { MessageHistory } from './MessageHistory';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

interface GuestCommunicationsState {
  currentStep: 'segment' | 'compose' | 'config' | 'review' | 'status';
  segmentationCriteria: GuestSegmentationCriteria;
  messageContent: MessageContent;
  deliveryOptions: DeliveryOptions;
  selectedTemplate?: MessageTemplate;
  selectedGuests: GuestWithSegmentInfo[];
  totalGuestCount: number;
  bulkMessage?: BulkMessageData;
  isLoading: boolean;
  error?: string;
}

type GuestCommunicationsAction =
  | { type: 'SET_STEP'; payload: GuestCommunicationsState['currentStep'] }
  | { type: 'SET_SEGMENTATION_CRITERIA'; payload: GuestSegmentationCriteria }
  | { type: 'SET_MESSAGE_CONTENT'; payload: MessageContent }
  | { type: 'SET_DELIVERY_OPTIONS'; payload: DeliveryOptions }
  | { type: 'SET_SELECTED_TEMPLATE'; payload: MessageTemplate | undefined }
  | { type: 'SET_SELECTED_GUESTS'; payload: GuestWithSegmentInfo[] }
  | { type: 'SET_TOTAL_GUEST_COUNT'; payload: number }
  | { type: 'SET_BULK_MESSAGE'; payload: BulkMessageData }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | undefined }
  | { type: 'RESET' };

const initialState: GuestCommunicationsState = {
  currentStep: 'segment',
  segmentationCriteria: {
    rsvp_status: undefined,
    dietary_restrictions: undefined,
    age_groups: undefined,
    categories: undefined,
    sides: undefined,
    has_plus_one: undefined,
    has_dietary_restrictions: undefined,
    has_special_needs: undefined,
    table_numbers: undefined,
    tags: undefined,
    custom_filters: undefined,
  },
  messageContent: {
    subject: '',
    html_content: '',
    text_content: '',
  },
  deliveryOptions: {
    channels: ['email'],
    send_immediately: true,
    test_mode: false,
    batch_size: 50,
    delay_between_batches: 5,
  },
  selectedGuests: [],
  totalGuestCount: 0,
  isLoading: false,
};

function guestCommunicationsReducer(
  state: GuestCommunicationsState,
  action: GuestCommunicationsAction,
): GuestCommunicationsState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'SET_SEGMENTATION_CRITERIA':
      return { ...state, segmentationCriteria: action.payload };
    case 'SET_MESSAGE_CONTENT':
      return { ...state, messageContent: action.payload };
    case 'SET_DELIVERY_OPTIONS':
      return { ...state, deliveryOptions: action.payload };
    case 'SET_SELECTED_TEMPLATE':
      return { ...state, selectedTemplate: action.payload };
    case 'SET_SELECTED_GUESTS':
      return { ...state, selectedGuests: action.payload };
    case 'SET_TOTAL_GUEST_COUNT':
      return { ...state, totalGuestCount: action.payload };
    case 'SET_BULK_MESSAGE':
      return { ...state, bulkMessage: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function GuestCommunications({
  couple_id,
  organization_id,
  className,
}: GuestCommunicationsProps) {
  const [state, dispatch] = useReducer(
    guestCommunicationsReducer,
    initialState,
  );
  const [messageHistory, setMessageHistory] = useState<BulkMessageData[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Security validation - ensure couple_id is provided and valid
  if (!couple_id || !organization_id) {
    throw new Error(
      'GuestCommunications: couple_id and organization_id are required',
    );
  }

  const steps = useMemo(
    () =>
      [
        { id: 'segment', title: 'Select Guests', icon: '👥' },
        { id: 'compose', title: 'Write Message', icon: '✍️' },
        { id: 'config', title: 'Send Options', icon: '⚙️' },
        { id: 'review', title: 'Review & Send', icon: '👀' },
        { id: 'status', title: 'Delivery Status', icon: '📊' },
      ] as const,
    [],
  );

  const currentStepIndex = steps.findIndex(
    (step) => step.id === state.currentStep,
  );

  const handleSegmentationChange = useCallback(
    (criteria: GuestSegmentationCriteria) => {
      dispatch({ type: 'SET_SEGMENTATION_CRITERIA', payload: criteria });
      // TODO: Fetch guests based on criteria
      // This would call an API endpoint to get guests matching the criteria
    },
    [],
  );

  const handlePreviewGuests = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      // TODO: API call to preview guests
      const response = await fetch(`/api/guests/segment-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_id,
          criteria: state.segmentationCriteria,
        }),
      });

      if (!response.ok) throw new Error('Failed to preview guests');

      const data = await response.json();
      dispatch({ type: 'SET_SELECTED_GUESTS', payload: data.guests });
      dispatch({ type: 'SET_TOTAL_GUEST_COUNT', payload: data.total_count });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [couple_id, state.segmentationCriteria]);

  const handleMessageContentChange = useCallback((content: MessageContent) => {
    dispatch({ type: 'SET_MESSAGE_CONTENT', payload: content });
  }, []);

  const handleTemplateChange = useCallback(
    (template: MessageTemplate | undefined) => {
      dispatch({ type: 'SET_SELECTED_TEMPLATE', payload: template });
      if (template) {
        dispatch({
          type: 'SET_MESSAGE_CONTENT',
          payload: {
            subject: template.subject || '',
            html_content: template.html_content,
            text_content: template.text_content,
          },
        });
      }
    },
    [],
  );

  const handleDeliveryOptionsChange = useCallback(
    (options: DeliveryOptions) => {
      dispatch({ type: 'SET_DELIVERY_OPTIONS', payload: options });
    },
    [],
  );

  const handleSendMessage = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Validate required fields
      if (
        !state.messageContent.html_content.trim() ||
        !state.messageContent.text_content.trim()
      ) {
        throw new Error('Message content is required');
      }

      if (state.selectedGuests.length === 0) {
        throw new Error('No guests selected');
      }

      // Create bulk message request
      const bulkMessageData: BulkMessageData = {
        couple_id,
        recipient_ids: state.selectedGuests.map((g) => g.id),
        segmentation_criteria: state.segmentationCriteria,
        message_content: state.messageContent,
        delivery_options: state.deliveryOptions,
        personalization_tokens: DEFAULT_PERSONALIZATION_TOKENS,
        template_id: state.selectedTemplate?.id,
        status: state.deliveryOptions.send_immediately
          ? 'sending'
          : 'scheduled',
        scheduled_for: state.deliveryOptions.scheduled_for,
        delivery_stats: {
          total_recipients: state.selectedGuests.length,
          email: {
            sent: 0,
            delivered: 0,
            failed: 0,
            opened: 0,
            clicked: 0,
            bounced: 0,
            spam: 0,
          },
          sms: { sent: 0, delivered: 0, failed: 0, clicked: 0 },
          whatsapp: { sent: 0, delivered: 0, failed: 0, read: 0 },
        },
      };

      // TODO: Send to API
      const response = await fetch(`/api/communications/bulk-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkMessageData),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const result = await response.json();
      const sentMessage: BulkMessageData = {
        ...bulkMessageData,
        id: result.message_id,
      };

      dispatch({ type: 'SET_BULK_MESSAGE', payload: sentMessage });
      dispatch({ type: 'SET_STEP', payload: 'status' });

      // Add to message history
      setMessageHistory((prev) => [sentMessage, ...prev]);
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload:
          error instanceof Error ? error.message : 'Failed to send message',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [couple_id, state]);

  const handleNextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      dispatch({ type: 'SET_STEP', payload: steps[currentStepIndex + 1].id });
    }
  }, [currentStepIndex, steps]);

  const handlePrevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      dispatch({ type: 'SET_STEP', payload: steps[currentStepIndex - 1].id });
    }
  }, [currentStepIndex, steps]);

  const canProceedToNext = useMemo(() => {
    switch (state.currentStep) {
      case 'segment':
        return state.selectedGuests.length > 0;
      case 'compose':
        return (
          state.messageContent.html_content.trim().length > 0 &&
          state.messageContent.text_content.trim().length > 0
        );
      case 'config':
        return state.deliveryOptions.channels.length > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  }, [state]);

  const estimatedCost = useMemo(() => {
    // Simple cost estimation - $0.01 per email, $0.05 per SMS
    const emailCost = state.deliveryOptions.channels.includes('email')
      ? state.selectedGuests.length * 0.01
      : 0;
    const smsCost = state.deliveryOptions.channels.includes('sms')
      ? state.selectedGuests.length * 0.05
      : 0;
    return emailCost + smsCost;
  }, [state.selectedGuests.length, state.deliveryOptions.channels]);

  if (showHistory) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center justify-between">
          <h1 className="display-md font-semibold text-gray-900">
            Message History
          </h1>
          <button
            onClick={() => setShowHistory(false)}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100"
          >
            New Message
          </button>
        </div>
        <MessageHistory
          couple_id={couple_id}
          messages={messageHistory}
          onMessageSelect={(message) => {
            // TODO: Load message for editing
            setShowHistory(false);
          }}
          onDeleteMessage={(messageId) => {
            setMessageHistory((prev) => prev.filter((m) => m.id !== messageId));
          }}
          onDuplicateMessage={(message) => {
            // TODO: Duplicate message logic
            setShowHistory(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display-md font-semibold text-gray-900">
            Guest Communications
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            Send personalized messages to your wedding guests
          </p>
        </div>
        <button
          onClick={() => setShowHistory(true)}
          className="px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100"
        >
          View History
        </button>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium',
                  index <= currentStepIndex
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-500',
                )}
              >
                {step.icon}
              </div>
              <div className="ml-4">
                <p
                  className={cn(
                    'text-sm font-medium',
                    index <= currentStepIndex
                      ? 'text-gray-900'
                      : 'text-gray-500',
                  )}
                >
                  {step.title}
                </p>
              </div>
              {index < steps.length - 1 && (
                <ChevronRightIcon className="w-5 h-5 text-gray-300 mx-4" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 text-red-500">⚠️</div>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{state.error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() =>
                  dispatch({ type: 'SET_ERROR', payload: undefined })
                }
                className="text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white border border-gray-200 rounded-xl p-8">
        {state.currentStep === 'segment' && (
          <GuestSegmentation
            criteria={state.segmentationCriteria}
            onCriteriaChange={handleSegmentationChange}
            selectedGuestCount={state.selectedGuests.length}
            totalGuestCount={state.totalGuestCount}
            onPreviewGuests={handlePreviewGuests}
          />
        )}

        {state.currentStep === 'compose' && (
          <MessageComposition
            content={state.messageContent}
            onContentChange={handleMessageContentChange}
            availableTokens={DEFAULT_PERSONALIZATION_TOKENS}
            selectedTemplate={state.selectedTemplate}
            onTemplateChange={handleTemplateChange}
          />
        )}

        {state.currentStep === 'config' && (
          <BulkSendConfig
            options={state.deliveryOptions}
            onOptionsChange={handleDeliveryOptionsChange}
            recipientCount={state.selectedGuests.length}
            estimatedCost={estimatedCost}
          />
        )}

        {state.currentStep === 'review' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Review Your Message
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Recipients
                  </h3>
                  <p className="text-sm text-gray-600">
                    {state.selectedGuests.length} guests selected
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Delivery
                  </h3>
                  <p className="text-sm text-gray-600">
                    {state.deliveryOptions.channels.join(', ')} •
                    {state.deliveryOptions.send_immediately
                      ? ' Send immediately'
                      : ` Scheduled for ${state.deliveryOptions.scheduled_for}`}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Estimated Cost
                  </h3>
                  <p className="text-sm text-gray-600">
                    ${estimatedCost.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Subject</h3>
                  <p className="text-sm text-gray-600">
                    {state.messageContent.subject || 'No subject'}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Message Preview
                  </h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 max-h-40 overflow-y-auto">
                    {state.messageContent.text_content || 'No message content'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {state.currentStep === 'status' && state.bulkMessage && (
          <DeliveryStatus
            bulkMessage={state.bulkMessage}
            onRefresh={() => {
              // TODO: Refresh delivery status
            }}
            onViewDetails={(messageId) => {
              // TODO: View detailed delivery status
            }}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevStep}
          disabled={currentStepIndex === 0 || state.isLoading}
          className={cn(
            'flex items-center px-4 py-2.5 font-semibold text-sm rounded-lg transition-all duration-200',
            currentStepIndex === 0 || state.isLoading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 shadow-xs hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-primary-100',
          )}
        >
          <ChevronLeftIcon className="w-4 h-4 mr-2" />
          Previous
        </button>

        {state.currentStep === 'review' ? (
          <button
            onClick={handleSendMessage}
            disabled={state.isLoading}
            className={cn(
              'flex items-center px-6 py-2.5 font-semibold text-sm rounded-lg transition-all duration-200',
              state.isLoading
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white shadow-xs hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-primary-100',
            )}
          >
            {state.isLoading
              ? 'Sending...'
              : `Send to ${state.selectedGuests.length} Guests`}
          </button>
        ) : state.currentStep !== 'status' ? (
          <button
            onClick={handleNextStep}
            disabled={!canProceedToNext || state.isLoading}
            className={cn(
              'flex items-center px-4 py-2.5 font-semibold text-sm rounded-lg transition-all duration-200',
              !canProceedToNext || state.isLoading
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white shadow-xs hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-primary-100',
            )}
          >
            Next
            <ChevronRightIcon className="w-4 h-4 ml-2" />
          </button>
        ) : (
          <button
            onClick={() => dispatch({ type: 'RESET' })}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100"
          >
            Send Another Message
          </button>
        )}
      </div>
    </div>
  );
}
