/**
 * WS-243 Mobile Chatbot - Shared Types
 * Shared types to prevent circular dependencies
 */

/**
 * Wedding context interface for couples and vendors
 */
export interface WeddingContext {
  weddingId: string;
  weddingDate: Date;
  venue?: string;
  coupleNames: string[];
  vendorList: Array<{
    id: string;
    name: string;
    category: string;
    status: 'confirmed' | 'pending' | 'contacted';
  }>;
  guestCount: number;
  budget: {
    total: number;
    spent: number;
    remaining: number;
  };
  timeline: Array<{
    time: string;
    event: string;
    vendor?: string;
  }>;
}

/**
 * Chat message interface
 */
export interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  isBot: boolean;
  type: 'text' | 'image' | 'file' | 'action';
  metadata?: {
    weddingContext?: Partial<WeddingContext>;
    quickActions?: Array<{
      label: string;
      action: string;
      icon?: string;
    }>;
    attachments?: Array<{
      type: 'image' | 'file';
      url: string;
      name: string;
    }>;
  };
  status: 'sending' | 'sent' | 'delivered' | 'failed';
}

/**
 * Chat interface states
 */
export type ChatState = 'minimized' | 'half' | 'full' | 'hidden';

/**
 * Mobile chat interface props
 */
export interface MobileChatInterfaceProps {
  isVisible: boolean;
  onToggle: () => void;
  conversationId?: string;
  weddingContext?: WeddingContext;
  userRole?: 'couple' | 'guest' | 'vendor';
  className?: string;

  // Mobile-specific props
  enableHaptics?: boolean;
  offlineMode?: boolean;
  keyboardAdjustment?: boolean;

  // Performance props
  virtualScrolling?: boolean;
  messageLimit?: number;

  // Callbacks
  onMessageSend?: (message: string) => Promise<void>;
  onFileUpload?: (files: FileList) => Promise<void>;
  onVoiceInput?: (audioBlob: Blob) => Promise<void>;
}

/**
 * Message bubble props
 */
export interface MobileMessageBubbleProps {
  message: ChatMessage;
  isBot: boolean;
  showTimestamp?: boolean;
  touchFeedback?: boolean;
  weddingContext?: WeddingContext;
  className?: string;

  // Callbacks
  onCopy?: (message: ChatMessage) => void;
  onDelete?: (messageId: string) => void;
  onForward?: (message: ChatMessage) => void;
  onQuickAction?: (action: string, message: ChatMessage) => void;
}
