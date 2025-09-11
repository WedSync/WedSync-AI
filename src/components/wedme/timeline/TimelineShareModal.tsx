'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { WeddingTimeline, TimelineEvent } from '@/types/timeline';
import { useHaptic } from '@/hooks/useTouch';
import {
  QrCode,
  Share2,
  Copy,
  Check,
  Download,
  Mail,
  MessageSquare,
  Users,
  Eye,
  EyeOff,
  Settings,
  X,
  Smartphone,
  Globe,
  Lock,
  Calendar,
  Clock,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface TimelineShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeline: WeddingTimeline;
  events: TimelineEvent[];
  className?: string;
}

interface ShareOptions {
  includeVendorDetails: boolean;
  includeInternalNotes: boolean;
  includeContactInfo: boolean;
  allowEditing: boolean;
  expiresAt?: Date;
  passwordProtected: boolean;
  password?: string;
}

interface ShareLink {
  id: string;
  url: string;
  qrCode: string;
  accessCode: string;
  viewCount: number;
  createdAt: Date;
  expiresAt?: Date;
}

// QR Code generation function (simplified - would use a real QR library like qrcode)
const generateQRCode = (url: string): string => {
  // This would typically use a library like 'qrcode' to generate actual QR codes
  // For now, we'll return a placeholder SVG
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="white"/>
      <text x="100" y="100" text-anchor="middle" dy=".3em" font-family="monospace" font-size="8">
        QR Code for: ${url}
      </text>
    </svg>
  `)}`;
};

export function TimelineShareModal({
  isOpen,
  onClose,
  timeline,
  events,
  className,
}: TimelineShareModalProps) {
  const [activeTab, setActiveTab] = useState<'qr' | 'link' | 'options'>('qr');
  const [shareOptions, setShareOptions] = useState<ShareOptions>({
    includeVendorDetails: true,
    includeInternalNotes: false,
    includeContactInfo: false,
    allowEditing: false,
    passwordProtected: false,
  });
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const haptic = useHaptic();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate share link and QR code
  const generateShareLink = async () => {
    setIsGenerating(true);
    haptic.medium();

    try {
      // Simulate API call to generate share link
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const baseUrl = window.location.origin;
      const accessCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      const shareUrl = `${baseUrl}/timeline/shared/${timeline.id}?code=${accessCode}`;

      const newShareLink: ShareLink = {
        id: `share-${Date.now()}`,
        url: shareUrl,
        qrCode: generateQRCode(shareUrl),
        accessCode,
        viewCount: 0,
        createdAt: new Date(),
        expiresAt: shareOptions.expiresAt,
      };

      setShareLink(newShareLink);
      haptic.success();
    } catch (error) {
      console.error('Error generating share link:', error);
      haptic.error();
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy link to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      haptic.light();
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      haptic.error();
    }
  };

  // Share via native sharing (mobile)
  const shareNatively = async () => {
    if (!shareLink || !navigator.share) return;

    try {
      await navigator.share({
        title: `${timeline.name} - Wedding Timeline`,
        text: 'Check out our wedding timeline!',
        url: shareLink.url,
      });
      haptic.success();
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing:', error);
        haptic.error();
      }
    }
  };

  // Download QR code as image
  const downloadQRCode = () => {
    if (!shareLink) return;

    const link = document.createElement('a');
    link.download = `wedding-timeline-qr-${timeline.name.toLowerCase().replace(/\s+/g, '-')}.svg`;
    link.href = shareLink.qrCode;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    haptic.success();
  };

  // Generate initial share link when modal opens
  useEffect(() => {
    if (isOpen && !shareLink) {
      generateShareLink();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'qr', label: 'QR Code', icon: QrCode },
    { id: 'link', label: 'Share Link', icon: Share2 },
    { id: 'options', label: 'Options', icon: Settings },
  ];

  const shareStats = [
    { label: 'Timeline Events', value: events.length, icon: Calendar },
    { label: 'Duration', value: '12 hours', icon: Clock },
    { label: 'Views', value: shareLink?.viewCount || 0, icon: Eye },
  ];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={cn(
            'w-full max-w-lg bg-white rounded-t-3xl shadow-xl',
            'max-h-[85vh] overflow-hidden flex flex-col',
            className,
          )}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <div>
              <h2 className="text-lg font-semibold">Share Timeline</h2>
              <p className="text-sm text-purple-100">{timeline.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stats */}
          <div className="px-6 py-4 bg-gray-50 border-b">
            <div className="grid grid-cols-3 gap-4">
              {shareStats.map((stat) => {
                const IconComponent = stat.icon;
                return (
                  <div key={stat.label} className="text-center">
                    <div className="flex items-center justify-center w-8 h-8 mx-auto mb-1 bg-purple-100 rounded-lg">
                      <IconComponent className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    haptic.light();
                  }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors min-h-[48px]',
                    isActive
                      ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                      : 'text-gray-600 hover:text-gray-900',
                  )}
                >
                  <IconComponent className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'qr' && (
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-gray-600">Generating QR code...</p>
                  </div>
                ) : shareLink ? (
                  <>
                    {/* QR Code */}
                    <div className="flex justify-center">
                      <div className="bg-white p-4 rounded-2xl border-2 border-gray-200 shadow-sm">
                        <img
                          src={shareLink.qrCode}
                          alt="Timeline QR Code"
                          className="w-48 h-48"
                        />
                      </div>
                    </div>

                    {/* Access Info */}
                    <div className="text-center space-y-2">
                      <p className="text-gray-600">Access Code</p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-lg">
                        <code className="font-mono text-lg font-bold text-purple-800">
                          {shareLink.accessCode}
                        </code>
                        <button
                          onClick={() => copyToClipboard(shareLink.accessCode)}
                          className="p-1 text-purple-600 hover:text-purple-800 min-h-[32px] min-w-[32px]"
                        >
                          {copySuccess ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex gap-3">
                        <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-900 mb-2">
                            How to use:
                          </h4>
                          <ol className="text-sm text-blue-800 space-y-1">
                            <li>1. Scan the QR code with your phone camera</li>
                            <li>2. Enter the access code if prompted</li>
                            <li>3. View and interact with the timeline</li>
                          </ol>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={downloadQRCode}
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium min-h-[48px]"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>

                      <button
                        onClick={() => copyToClipboard(shareLink.url)}
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-purple-500 text-white rounded-xl font-medium min-h-[48px]"
                      >
                        {copySuccess ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        Copy Link
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">
                      Failed to generate QR code
                    </p>
                    <button
                      onClick={generateShareLink}
                      className="px-6 py-3 bg-purple-500 text-white rounded-xl font-medium"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'link' && (
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {shareLink && (
                  <>
                    {/* Share Link */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Share Link
                      </label>
                      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border">
                        <Globe className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <input
                          type="text"
                          value={shareLink.url}
                          readOnly
                          className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
                        />
                        <button
                          onClick={() => copyToClipboard(shareLink.url)}
                          className="p-2 text-gray-500 hover:text-gray-700 min-h-[36px] min-w-[36px]"
                        >
                          {copySuccess ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Share Methods */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Share via
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          onClick={shareNatively}
                          className="flex flex-col items-center gap-2 p-4 bg-blue-50 text-blue-600 rounded-xl min-h-[80px]"
                          disabled={!navigator.share}
                        >
                          <Share2 className="w-5 h-5" />
                          <span className="text-xs font-medium">Share</span>
                        </button>

                        <button
                          onClick={() => {
                            const subject = `${timeline.name} - Wedding Timeline`;
                            const body = `Check out our wedding timeline: ${shareLink.url}\n\nAccess code: ${shareLink.accessCode}`;
                            window.open(
                              `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
                            );
                          }}
                          className="flex flex-col items-center gap-2 p-4 bg-green-50 text-green-600 rounded-xl min-h-[80px]"
                        >
                          <Mail className="w-5 h-5" />
                          <span className="text-xs font-medium">Email</span>
                        </button>

                        <button
                          onClick={() => {
                            const text = `Check out our wedding timeline: ${shareLink.url} (Code: ${shareLink.accessCode})`;
                            const url = `sms:?body=${encodeURIComponent(text)}`;
                            window.open(url);
                          }}
                          className="flex flex-col items-center gap-2 p-4 bg-purple-50 text-purple-600 rounded-xl min-h-[80px]"
                        >
                          <MessageSquare className="w-5 h-5" />
                          <span className="text-xs font-medium">SMS</span>
                        </button>
                      </div>
                    </div>

                    {/* Link Info */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Created</span>
                        <span className="text-sm font-medium">
                          {format(shareLink.createdAt, 'MMM d, HH:mm')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Views</span>
                        <span className="text-sm font-medium">
                          {shareLink.viewCount}
                        </span>
                      </div>

                      {shareLink.expiresAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Expires</span>
                          <span className="text-sm font-medium">
                            {format(shareLink.expiresAt, 'MMM d, HH:mm')}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {activeTab === 'options' && (
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Privacy Settings */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Privacy & Access
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Lock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">
                          Password Protection
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={shareOptions.passwordProtected}
                          onChange={(e) =>
                            setShareOptions((prev) => ({
                              ...prev,
                              passwordProtected: e.target.checked,
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    {shareOptions.passwordProtected && (
                      <div className="ml-7">
                        <div className="flex items-center gap-2">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter password"
                            value={shareOptions.password || ''}
                            onChange={(e) =>
                              setShareOptions((prev) => ({
                                ...prev,
                                password: e.target.value,
                              }))
                            }
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <button
                            onClick={() => setShowPassword(!showPassword)}
                            className="p-2 text-gray-500 hover:text-gray-700 min-h-[36px] min-w-[36px]"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content Settings */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    What to Include
                  </h4>
                  <div className="space-y-4">
                    {[
                      {
                        key: 'includeVendorDetails',
                        label: 'Vendor contact details',
                        icon: Users,
                      },
                      {
                        key: 'includeInternalNotes',
                        label: 'Internal notes & comments',
                        icon: MessageSquare,
                      },
                      {
                        key: 'includeContactInfo',
                        label: 'Your contact information',
                        icon: Mail,
                      },
                    ].map((option) => {
                      const IconComponent = option.icon;
                      return (
                        <div
                          key={option.key}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <IconComponent className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">
                              {option.label}
                            </span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={
                                shareOptions[
                                  option.key as keyof ShareOptions
                                ] as boolean
                              }
                              onChange={(e) =>
                                setShareOptions((prev) => ({
                                  ...prev,
                                  [option.key]: e.target.checked,
                                }))
                              }
                              className="sr-only peer"
                            />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Update Button */}
                <button
                  onClick={() => {
                    generateShareLink();
                    setActiveTab('qr');
                  }}
                  className="w-full py-3 bg-purple-500 text-white rounded-xl font-medium min-h-[48px]"
                >
                  Update Share Link
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
