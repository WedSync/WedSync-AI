'use client';

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { BulkSendConfigProps, DeliveryOptions } from '@/types/communications';
import {
  SettingsIcon,
  MailIcon,
  SmartphoneIcon,
  MessageCircleIcon,
  ClockIcon,
  DollarSignIcon,
  AlertTriangleIcon,
  CalendarIcon,
  ZapIcon,
  ShieldIcon,
  InfoIcon,
  CheckIcon,
} from 'lucide-react';

const DELIVERY_CHANNELS = [
  {
    key: 'email' as const,
    label: 'Email',
    icon: <MailIcon className="w-5 h-5" />,
    description: 'Send via email (recommended)',
    cost: 0.01,
    reliability: 99,
    color: 'text-blue-600 bg-blue-100 border-blue-200',
  },
  {
    key: 'sms' as const,
    label: 'SMS',
    icon: <SmartphoneIcon className="w-5 h-5" />,
    description: 'Send via text message',
    cost: 0.05,
    reliability: 95,
    color: 'text-green-600 bg-green-100 border-green-200',
  },
  {
    key: 'whatsapp' as const,
    label: 'WhatsApp',
    icon: <MessageCircleIcon className="w-5 h-5" />,
    description: 'Send via WhatsApp (coming soon)',
    cost: 0.03,
    reliability: 92,
    color: 'text-green-600 bg-green-100 border-green-200',
    disabled: true,
  },
] as const;

const BATCH_SIZES = [
  { value: 25, label: '25 messages', description: 'Slower but more reliable' },
  {
    value: 50,
    label: '50 messages',
    description: 'Balanced speed and reliability',
  },
  { value: 100, label: '100 messages', description: 'Faster sending' },
  { value: 200, label: '200 messages', description: 'Fastest (higher risk)' },
] as const;

const DELAY_OPTIONS = [
  { value: 1, label: '1 second', description: 'Minimal delay' },
  { value: 5, label: '5 seconds', description: 'Recommended' },
  { value: 10, label: '10 seconds', description: 'Conservative' },
  { value: 30, label: '30 seconds', description: 'Very conservative' },
] as const;

export function BulkSendConfig({
  options,
  onOptionsChange,
  recipientCount,
  estimatedCost,
  className,
}: BulkSendConfigProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState('');

  const handleChannelToggle = useCallback(
    (channel: 'email' | 'sms' | 'whatsapp') => {
      const newChannels = options.channels.includes(channel)
        ? options.channels.filter((c) => c !== channel)
        : [...options.channels, channel];

      // Ensure at least one channel is selected
      if (newChannels.length > 0) {
        onOptionsChange({ ...options, channels: newChannels });
      }
    },
    [options, onOptionsChange],
  );

  const handleScheduleToggle = useCallback(() => {
    const newSendImmediately = !options.send_immediately;

    onOptionsChange({
      ...options,
      send_immediately: newSendImmediately,
      scheduled_for: newSendImmediately
        ? undefined
        : selectedDateTime ||
          new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
  }, [options, onOptionsChange, selectedDateTime]);

  const handleScheduleDateChange = useCallback(
    (dateTime: string) => {
      setSelectedDateTime(dateTime);
      onOptionsChange({
        ...options,
        scheduled_for: dateTime,
      });
    },
    [options, onOptionsChange],
  );

  const handleTestModeToggle = useCallback(() => {
    onOptionsChange({ ...options, test_mode: !options.test_mode });
  }, [options, onOptionsChange]);

  const handleBatchSizeChange = useCallback(
    (batchSize: number) => {
      onOptionsChange({ ...options, batch_size: batchSize });
    },
    [options, onOptionsChange],
  );

  const handleDelayChange = useCallback(
    (delay: number) => {
      onOptionsChange({ ...options, delay_between_batches: delay });
    },
    [options, onOptionsChange],
  );

  const costBreakdown = useMemo(() => {
    const breakdown = DELIVERY_CHANNELS.filter(
      (channel) => options.channels.includes(channel.key) && !channel.disabled,
    ).map((channel) => ({
      channel: channel.label,
      cost: recipientCount * channel.cost,
      icon: channel.icon,
    }));

    const total = breakdown.reduce((sum, item) => sum + item.cost, 0);

    return { breakdown, total };
  }, [options.channels, recipientCount]);

  const deliveryEstimate = useMemo(() => {
    if (recipientCount === 0) return { time: 0, batches: 0 };

    const batchSize = options.batch_size || 50;
    const delay = options.delay_between_batches || 5;
    const batches = Math.ceil(recipientCount / batchSize);
    const totalTime = batches * delay + batches * 30; // 30 seconds per batch processing

    return { time: totalTime, batches };
  }, [recipientCount, options.batch_size, options.delay_between_batches]);

  const minScheduleDateTime = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15); // Minimum 15 minutes from now
    return now.toISOString().slice(0, 16); // Format for datetime-local input
  }, []);

  const getReliabilityScore = useMemo(() => {
    const selectedChannels = DELIVERY_CHANNELS.filter(
      (c) => options.channels.includes(c.key) && !c.disabled,
    );

    if (selectedChannels.length === 0) return 0;

    const avgReliability =
      selectedChannels.reduce((sum, c) => sum + c.reliability, 0) /
      selectedChannels.length;
    return Math.round(avgReliability);
  }, [options.channels]);

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-primary-100 p-2 rounded-lg">
            <SettingsIcon className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Delivery Configuration
            </h2>
            <p className="text-sm text-gray-600">
              Choose how and when to send your messages
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-primary-600">
            ${costBreakdown.total.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Estimated cost</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Channels */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <ZapIcon className="w-5 h-5 mr-2 text-gray-600" />
              Delivery Channels
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {DELIVERY_CHANNELS.map((channel) => {
                const isSelected = options.channels.includes(channel.key);
                const isDisabled = channel.disabled;

                return (
                  <button
                    key={channel.key}
                    onClick={() =>
                      !isDisabled && handleChannelToggle(channel.key)
                    }
                    disabled={isDisabled}
                    className={cn(
                      'relative p-4 rounded-lg border-2 transition-all duration-200 text-left',
                      isDisabled
                        ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                        : isSelected
                          ? channel.color + ' shadow-sm'
                          : 'bg-white border-gray-200 hover:border-gray-300',
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          isSelected
                            ? channel.color.split(' ').slice(1).join(' ')
                            : 'bg-gray-100',
                        )}
                      >
                        {channel.icon}
                      </div>

                      {isSelected && !isDisabled && (
                        <CheckIcon className="w-5 h-5 text-current" />
                      )}

                      {isDisabled && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          Coming Soon
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-medium text-gray-900">
                        {channel.label}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {channel.description}
                      </p>

                      {!isDisabled && (
                        <div className="flex items-center justify-between text-xs mt-2">
                          <span className="text-gray-500">
                            ${channel.cost.toFixed(3)}/message
                          </span>
                          <span className="text-gray-500">
                            {channel.reliability}% reliable
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {options.channels.length === 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
                  <span className="text-sm text-red-800">
                    Please select at least one delivery channel.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Send Timing */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <ClockIcon className="w-5 h-5 mr-2 text-gray-600" />
              Send Timing
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() =>
                    onOptionsChange({ ...options, send_immediately: true })
                  }
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all duration-200 text-left',
                    options.send_immediately
                      ? 'bg-primary-50 border-primary-200 text-primary-700'
                      : 'bg-white border-gray-200 hover:border-gray-300',
                  )}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <ZapIcon className="w-5 h-5" />
                    <span className="font-medium">Send Immediately</span>
                    {options.send_immediately && (
                      <CheckIcon className="w-4 h-4" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Messages will be sent right after you confirm
                  </p>
                </button>

                <button
                  onClick={handleScheduleToggle}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all duration-200 text-left',
                    !options.send_immediately
                      ? 'bg-primary-50 border-primary-200 text-primary-700'
                      : 'bg-white border-gray-200 hover:border-gray-300',
                  )}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <CalendarIcon className="w-5 h-5" />
                    <span className="font-medium">Schedule for Later</span>
                    {!options.send_immediately && (
                      <CheckIcon className="w-4 h-4" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Choose a specific date and time to send
                  </p>
                </button>
              </div>

              {!options.send_immediately && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    min={minScheduleDateTime}
                    value={
                      selectedDateTime ||
                      options.scheduled_for?.slice(0, 16) ||
                      ''
                    }
                    onChange={(e) => handleScheduleDateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    Messages can be scheduled at least 15 minutes from now
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Test Mode */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <ShieldIcon className="w-5 h-5 mr-2 text-gray-600" />
              Safety Settings
            </h3>

            <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <AlertTriangleIcon className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Test Mode</h4>
                  <p className="text-sm text-gray-600">
                    Send test messages to yourself first (recommended)
                  </p>
                </div>
              </div>

              <button
                onClick={handleTestModeToggle}
                className={cn(
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                  options.test_mode ? 'bg-primary-600' : 'bg-gray-200',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    options.test_mode ? 'translate-x-5' : 'translate-x-0',
                  )}
                />
              </button>
            </div>
          </div>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Advanced Settings
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Batch Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Batch Size
                  </label>
                  <div className="space-y-2">
                    {BATCH_SIZES.map(({ value, label, description }) => (
                      <button
                        key={value}
                        onClick={() => handleBatchSizeChange(value)}
                        className={cn(
                          'w-full p-3 text-left border rounded-lg transition-colors duration-200',
                          options.batch_size === value
                            ? 'bg-primary-50 border-primary-200 text-primary-700'
                            : 'bg-white border-gray-200 hover:bg-gray-50',
                        )}
                      >
                        <div className="font-medium">{label}</div>
                        <div className="text-xs text-gray-600">
                          {description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delay Between Batches */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Delay Between Batches
                  </label>
                  <div className="space-y-2">
                    {DELAY_OPTIONS.map(({ value, label, description }) => (
                      <button
                        key={value}
                        onClick={() => handleDelayChange(value)}
                        className={cn(
                          'w-full p-3 text-left border rounded-lg transition-colors duration-200',
                          options.delay_between_batches === value
                            ? 'bg-primary-50 border-primary-200 text-primary-700'
                            : 'bg-white border-gray-200 hover:bg-gray-50',
                        )}
                      >
                        <div className="font-medium">{label}</div>
                        <div className="text-xs text-gray-600">
                          {description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors duration-200"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
          </button>
        </div>

        {/* Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl p-6 sticky top-4 space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Summary</h3>

            {/* Recipients */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Recipients</span>
              <span className="font-medium text-gray-900">
                {recipientCount}
              </span>
            </div>

            {/* Channels */}
            <div>
              <span className="text-sm text-gray-600 block mb-2">Channels</span>
              <div className="space-y-1">
                {options.channels.map((channel) => {
                  const channelInfo = DELIVERY_CHANNELS.find(
                    (c) => c.key === channel,
                  );
                  if (!channelInfo) return null;

                  return (
                    <div
                      key={channel}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        {channelInfo.icon}
                        <span className="text-sm">{channelInfo.label}</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        ${(recipientCount * channelInfo.cost).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timing */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Timing</span>
              <span className="text-sm font-medium text-gray-900">
                {options.send_immediately ? 'Immediate' : 'Scheduled'}
              </span>
            </div>

            {/* Delivery Time */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Est. Delivery</span>
              <span className="text-sm font-medium text-gray-900">
                {Math.ceil(deliveryEstimate.time / 60)} min
              </span>
            </div>

            {/* Reliability */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Reliability</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getReliabilityScore}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {getReliabilityScore}%
                </span>
              </div>
            </div>

            {/* Total Cost */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-medium text-gray-900">
                  Total Cost
                </span>
                <span className="text-xl font-bold text-primary-600">
                  ${costBreakdown.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Test Mode Warning */}
            {options.test_mode && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center">
                  <AlertTriangleIcon className="w-4 h-4 text-yellow-600 mr-2" />
                  <span className="text-sm text-yellow-800 font-medium">
                    Test Mode Active
                  </span>
                </div>
                <p className="text-xs text-yellow-700 mt-1">
                  Messages will be sent to you for review first
                </p>
              </div>
            )}

            {/* Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <InfoIcon className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium mb-1">
                    Delivery batches: {deliveryEstimate.batches}
                  </p>
                  <p>
                    Messages will be sent in batches to ensure deliverability
                    and comply with sending limits.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
