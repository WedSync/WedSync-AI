'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ShareIcon,
  LinkIcon,
  QrCodeIcon,
  XMarkIcon,
  CheckIcon,
  CameraIcon,
  UserIcon,
  MailIcon,
  MessageSquareIcon,
  WhatsAppIcon,
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  ExternalLinkIcon,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useWeddingDayOffline } from '@/hooks/useWeddingDayOffline';
import { cn } from '@/lib/utils';

// Types
interface PhotoGroup {
  id: string;
  name: string;
  description: string;
  assignedGuests: Array<{ id: string; name: string }>;
  venue?: string;
  timeSlot?: string;
  estimatedTime: string;
  photoStyle?: string;
}

interface ShareContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'photographer' | 'coordinator' | 'vendor' | 'family';
  avatar?: string;
  isOnline?: boolean;
  preferredContact?: 'email' | 'sms' | 'whatsapp';
}

interface QuickShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoGroup: PhotoGroup;
  weddingId: string;
  contacts?: ShareContact[];
  onShare: (shareData: ShareData) => Promise<void>;
}

interface ShareData {
  photoGroupId: string;
  shareMethod: 'link' | 'email' | 'sms' | 'whatsapp' | 'native';
  contacts: string[]; // contact IDs
  message?: string;
  expiresAt?: string;
  permissions: {
    canView: boolean;
    canComment: boolean;
    canDownload: boolean;
    canEdit: boolean;
  };
}

// QR Code Component (Mock - would integrate with actual QR library)
function QRCodeDisplay({ url, size = 200 }: { url: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Mock QR code generation - would use actual QR library
        ctx.fillStyle = '#000000';
        const gridSize = 8;
        const cellSize = size / gridSize;

        // Create simple pattern for demo
        for (let i = 0; i < gridSize; i++) {
          for (let j = 0; j < gridSize; j++) {
            if (
              (i + j) % 2 === 0 ||
              i === 0 ||
              i === gridSize - 1 ||
              j === 0 ||
              j === gridSize - 1
            ) {
              ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize);
            }
          }
        }
      }
    }
  }, [url, size]);

  return (
    <div className="flex flex-col items-center space-y-3">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="border border-gray-200 rounded-lg"
      />
      <p className="text-xs text-gray-500 text-center max-w-[200px] break-all">
        {url}
      </p>
    </div>
  );
}

// Contact Selection Component
function ContactSelector({
  contacts,
  selectedContacts,
  onToggleContact,
}: {
  contacts: ShareContact[];
  selectedContacts: string[];
  onToggleContact: (contactId: string) => void;
}) {
  return (
    <div className="space-y-2">
      <h4 className="font-medium text-gray-900 text-sm">Share with:</h4>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {contacts.map((contact) => {
          const isSelected = selectedContacts.includes(contact.id);
          return (
            <div
              key={contact.id}
              onClick={() => onToggleContact(contact.id)}
              className={cn(
                'flex items-center space-x-3 p-2 rounded-lg cursor-pointer touch-manipulation',
                'transition-colors duration-200',
                isSelected
                  ? 'bg-primary-50 border border-primary-200'
                  : 'bg-gray-50 hover:bg-gray-100',
              )}
            >
              <div className="relative">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    contact.avatar ? 'bg-gray-100' : 'bg-primary-100',
                  )}
                >
                  {contact.avatar ? (
                    <img
                      src={contact.avatar}
                      alt={contact.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-4 h-4 text-primary-600" />
                  )}
                </div>
                {contact.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success-500 border-2 border-white rounded-full" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">
                  {contact.name}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 capitalize">
                    {contact.role}
                  </span>
                  {contact.preferredContact && (
                    <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">
                      {contact.preferredContact}
                    </span>
                  )}
                </div>
              </div>

              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                  isSelected
                    ? 'bg-primary-600 border-primary-600'
                    : 'border-gray-300',
                )}
              >
                {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Permission Settings Component
function PermissionSettings({
  permissions,
  onChange,
}: {
  permissions: ShareData['permissions'];
  onChange: (permissions: ShareData['permissions']) => void;
}) {
  const permissionOptions = [
    {
      key: 'canView',
      label: 'View group details',
      description: 'See guest list and timing',
    },
    {
      key: 'canComment',
      label: 'Add comments',
      description: 'Leave notes and feedback',
    },
    {
      key: 'canDownload',
      label: 'Download information',
      description: 'Export guest list as PDF',
    },
    {
      key: 'canEdit',
      label: 'Edit group',
      description: 'Modify guests and details',
    },
  ];

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900 text-sm">Permissions:</h4>
      {permissionOptions.map((option) => (
        <div key={option.key} className="flex items-start space-x-3">
          <button
            onClick={() =>
              onChange({
                ...permissions,
                [option.key]:
                  !permissions[option.key as keyof typeof permissions],
              })
            }
            className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5',
              'touch-manipulation transition-colors duration-200',
              permissions[option.key as keyof typeof permissions]
                ? 'bg-primary-600 border-primary-600'
                : 'border-gray-300 hover:border-gray-400',
            )}
          >
            {permissions[option.key as keyof typeof permissions] && (
              <CheckIcon className="w-3 h-3 text-white" />
            )}
          </button>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{option.label}</p>
            <p className="text-xs text-gray-500">{option.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function QuickShareModal({
  isOpen,
  onClose,
  photoGroup,
  weddingId,
  contacts = [],
  onShare,
}: QuickShareModalProps) {
  const [shareMethod, setShareMethod] = useState<'link' | 'contacts' | 'qr'>(
    'link',
  );
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [permissions, setPermissions] = useState<ShareData['permissions']>({
    canView: true,
    canComment: true,
    canDownload: false,
    canEdit: false,
  });
  const [isSharing, setIsSharing] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const { toast } = useToast();

  // Enhanced offline support
  const offlineHook = useWeddingDayOffline({
    weddingId,
    coordinatorId: 'current-user',
    enablePreCaching: true,
    enablePerformanceOptimization: true,
  });

  // Generate share URL
  const generateShareUrl = useCallback(async () => {
    setIsGeneratingLink(true);
    try {
      // Mock URL generation - would call actual API
      const baseUrl = window.location.origin;
      const shareToken = `share_${photoGroup.id}_${Date.now()}`;
      const url = `${baseUrl}/wedme/photo-groups/${photoGroup.id}?share=${shareToken}`;
      setShareUrl(url);
    } catch (error) {
      toast({
        title: 'Failed to generate link',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingLink(false);
    }
  }, [photoGroup.id, toast]);

  // Initialize share URL when modal opens
  useEffect(() => {
    if (isOpen && !shareUrl) {
      generateShareUrl();
    }
  }, [isOpen, shareUrl, generateShareUrl]);

  // Toggle contact selection
  const toggleContact = useCallback((contactId: string) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId],
    );
  }, []);

  // Copy link to clipboard
  const copyToClipboard = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast({
          title: 'Copied to clipboard!',
          description: 'Share link copied successfully',
        });

        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      } catch (error) {
        toast({
          title: 'Copy failed',
          description: 'Please copy the link manually',
          variant: 'destructive',
        });
      }
    },
    [toast],
  );

  // Native share
  const nativeShare = useCallback(async () => {
    if (!shareUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Photo Group: ${photoGroup.name}`,
          text: `Check out this photo group plan for our wedding: ${photoGroup.description}`,
          url: shareUrl,
        });

        toast({
          title: 'Shared successfully!',
          description: 'Photo group shared via native sharing',
        });
      } else {
        // Fallback to copy
        await copyToClipboard(shareUrl);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        toast({
          title: 'Share failed',
          description: 'Please try copying the link instead',
          variant: 'destructive',
        });
      }
    }
  }, [shareUrl, photoGroup, copyToClipboard, toast]);

  // Share via method
  const shareViaMethod = useCallback(
    async (method: ShareData['shareMethod']) => {
      if (!shareUrl) return;

      setIsSharing(true);

      try {
        const shareData: ShareData = {
          photoGroupId: photoGroup.id,
          shareMethod: method,
          contacts: selectedContacts,
          message: customMessage,
          permissions,
        };

        await onShare(shareData);

        toast({
          title: 'Shared successfully!',
          description: `Photo group shared with ${selectedContacts.length} contact${selectedContacts.length !== 1 ? 's' : ''}`,
        });

        // Close modal after successful share
        onClose();
      } catch (error) {
        toast({
          title: 'Share failed',
          description: 'Please try again',
          variant: 'destructive',
        });
      } finally {
        setIsSharing(false);
      }
    },
    [
      shareUrl,
      photoGroup.id,
      selectedContacts,
      customMessage,
      permissions,
      onShare,
      toast,
      onClose,
    ],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-xl transform transition-transform max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <ShareIcon className="w-5 h-5 text-primary-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Quick Share
              </h2>
              <p className="text-sm text-gray-500">{photoGroup.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 touch-manipulation"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Offline Notice */}
        {!offlineHook.isOnline && (
          <div className="p-3 bg-warning-50 border-b border-warning-200">
            <div className="text-sm text-warning-700">
              📱 Offline mode: Share will be sent when connection is restored
            </div>
          </div>
        )}

        {/* Content */}
        <div
          className="overflow-y-auto"
          style={{ maxHeight: 'calc(90vh - 120px)' }}
        >
          <div className="p-4 space-y-4">
            {/* Share Method Tabs */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setShareMethod('link')}
                className={cn(
                  'flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-medium touch-manipulation',
                  shareMethod === 'link'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50',
                )}
              >
                <LinkIcon className="w-4 h-4" />
                <span>Link</span>
              </button>
              <button
                onClick={() => setShareMethod('contacts')}
                className={cn(
                  'flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-medium touch-manipulation',
                  shareMethod === 'contacts'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50',
                )}
              >
                <UserIcon className="w-4 h-4" />
                <span>Contacts</span>
              </button>
              <button
                onClick={() => setShareMethod('qr')}
                className={cn(
                  'flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-medium touch-manipulation',
                  shareMethod === 'qr'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50',
                )}
              >
                <QrCodeIcon className="w-4 h-4" />
                <span>QR Code</span>
              </button>
            </div>

            {/* Photo Group Preview */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <CameraIcon className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-900 text-sm">
                  {photoGroup.name}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {photoGroup.description}
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
                <span>👥 {photoGroup.assignedGuests.length} guests</span>
                <span>⏱️ {photoGroup.estimatedTime}</span>
                {photoGroup.venue && <span>📍 {photoGroup.venue}</span>}
                {photoGroup.timeSlot && <span>🕐 {photoGroup.timeSlot}</span>}
              </div>
            </div>

            {/* Share Content Based on Method */}
            {shareMethod === 'link' && (
              <div className="space-y-4">
                {/* Share URL */}
                {shareUrl ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 text-sm text-gray-700 break-all">
                        {shareUrl}
                      </div>
                      <button
                        onClick={() => copyToClipboard(shareUrl)}
                        className="p-2 rounded text-gray-500 hover:text-gray-700 touch-manipulation"
                      >
                        <CopyIcon className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quick Share Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={nativeShare}
                        className="flex items-center justify-center space-x-2 py-2.5 bg-primary-600 text-white rounded-lg touch-manipulation hover:bg-primary-700 transition-colors"
                      >
                        <ShareIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">Share</span>
                      </button>
                      <button
                        onClick={() => copyToClipboard(shareUrl)}
                        className="flex items-center justify-center space-x-2 py-2.5 bg-gray-100 text-gray-700 rounded-lg touch-manipulation hover:bg-gray-200 transition-colors"
                      >
                        <CopyIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">Copy</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                    <p className="text-sm text-gray-500 mt-2">
                      Generating share link...
                    </p>
                  </div>
                )}
              </div>
            )}

            {shareMethod === 'contacts' && (
              <div className="space-y-4">
                <ContactSelector
                  contacts={contacts}
                  selectedContacts={selectedContacts}
                  onToggleContact={toggleContact}
                />

                {selectedContacts.length > 0 && (
                  <>
                    {/* Custom Message */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-900">
                        Custom message (optional)
                      </label>
                      <textarea
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="Add a personal message..."
                        className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-300 resize-none touch-manipulation"
                        rows={3}
                      />
                    </div>

                    <PermissionSettings
                      permissions={permissions}
                      onChange={setPermissions}
                    />

                    {/* Share Button */}
                    <button
                      onClick={() => shareViaMethod('email')}
                      disabled={isSharing || selectedContacts.length === 0}
                      className={cn(
                        'w-full flex items-center justify-center space-x-2 py-3 rounded-lg touch-manipulation',
                        'text-sm font-medium transition-colors',
                        isSharing || selectedContacts.length === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-primary-600 text-white hover:bg-primary-700',
                      )}
                    >
                      {isSharing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Sharing...</span>
                        </>
                      ) : (
                        <>
                          <MailIcon className="w-4 h-4" />
                          <span>
                            Share with {selectedContacts.length} contact
                            {selectedContacts.length !== 1 ? 's' : ''}
                          </span>
                        </>
                      )}
                    </button>
                  </>
                )}

                {contacts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <UserIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No contacts available</p>
                    <p className="text-xs mt-1">
                      Add photographers and coordinators to share with them
                    </p>
                  </div>
                )}
              </div>
            )}

            {shareMethod === 'qr' && (
              <div className="space-y-4">
                <div className="text-center">
                  {shareUrl ? (
                    <QRCodeDisplay url={shareUrl} />
                  ) : (
                    <div className="flex flex-col items-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2"></div>
                      <p className="text-sm text-gray-500">
                        Generating QR code...
                      </p>
                    </div>
                  )}
                </div>

                {shareUrl && (
                  <div className="text-center space-y-2">
                    <p className="text-sm text-gray-600">
                      Scan this QR code to view the photo group
                    </p>
                    <button
                      onClick={() => copyToClipboard(shareUrl)}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors touch-manipulation"
                    >
                      <LinkIcon className="w-4 h-4" />
                      <span className="text-sm">Copy Link</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Footer */}
        <div className="border-t border-gray-200 p-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <button
              onClick={() => copyToClipboard(shareUrl)}
              disabled={!shareUrl}
              className="flex flex-col items-center space-y-1 py-2 text-gray-600 hover:text-gray-800 touch-manipulation disabled:opacity-50"
            >
              <CopyIcon className="w-5 h-5" />
              <span className="text-xs">Copy</span>
            </button>
            <button
              onClick={nativeShare}
              disabled={!shareUrl}
              className="flex flex-col items-center space-y-1 py-2 text-gray-600 hover:text-gray-800 touch-manipulation disabled:opacity-50"
            >
              <ShareIcon className="w-5 h-5" />
              <span className="text-xs">Share</span>
            </button>
            <button
              onClick={() => window.open(shareUrl, '_blank')}
              disabled={!shareUrl}
              className="flex flex-col items-center space-y-1 py-2 text-gray-600 hover:text-gray-800 touch-manipulation disabled:opacity-50"
            >
              <ExternalLinkIcon className="w-5 h-5" />
              <span className="text-xs">Preview</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
