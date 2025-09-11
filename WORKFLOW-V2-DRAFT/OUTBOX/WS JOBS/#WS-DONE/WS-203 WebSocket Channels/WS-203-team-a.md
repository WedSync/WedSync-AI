# TEAM A - ROUND 1: WS-203 - WebSocket Channels
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Implement comprehensive channel management UI components for WebSocket channels including channel indicators, message queue interfaces, and multi-channel navigation for wedding coordination workflows
**FEATURE ID:** WS-203 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about creating intuitive channel switching UI that allows suppliers to manage 8+ wedding channels simultaneously without confusion or missed updates

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/websocket/ChannelManager.tsx
ls -la $WS_ROOT/wedsync/src/components/websocket/ChannelIndicator.tsx
ls -la $WS_ROOT/wedsync/src/components/websocket/MessageQueue.tsx
cat $WS_ROOT/wedsync/src/components/websocket/ChannelManager.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test websocket-ui
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query websocket and channel patterns
await mcp__serena__search_for_pattern("websocket.*channel");
await mcp__serena__find_symbol("ChannelManager", "", true);
await mcp__serena__get_symbols_overview("src/components/websocket");
await mcp__serena__search_for_pattern("realtime.*subscription");
```

### B. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to WebSocket UI patterns
await mcp__Ref__ref_search_documentation("Supabase broadcast channels React components");
await mcp__Ref__ref_search_documentation("WebSocket channel switching UI patterns");
await mcp__Ref__ref_search_documentation("message queue UI components React");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR CHANNEL UI PLANNING

### Use Sequential Thinking MCP for UI Architecture
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "WebSocket channel UI requires organized multi-channel management: channel list navigation with unread indicators, channel switching without losing context, message queue visualization for offline messages, typing indicators for collaboration, and channel-specific notifications. I need to analyze: 1) ChannelManager for multi-channel navigation, 2) ChannelIndicator for status and unread counts, 3) MessageQueue for offline message handling, 4) Channel switching with context preservation, 5) Wedding-specific channel organization (per couple/wedding).",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down websocket UI components and channel flows
2. **react-ui-specialist** - Design multi-channel React components and hooks
3. **ui-ux-designer** - Create intuitive channel navigation and indicators
4. **code-quality-guardian** - Maintain websocket UI performance standards
5. **test-automation-architect** - Comprehensive UI testing for channel workflows
6. **documentation-chronicler** - Evidence-based websocket UI documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### WEBSOCKET UI SECURITY CHECKLIST:
- [ ] **Channel access validation** - Verify user permissions before showing channels
- [ ] **Message sanitization** - Sanitize all channel messages before display
- [ ] **Channel isolation** - Prevent cross-channel data leakage in UI
- [ ] **User context validation** - Validate user identity for all channel operations
- [ ] **Secure channel naming** - Prevent channel name enumeration attacks
- [ ] **Rate limiting UI** - Prevent UI spam from excessive channel switching
- [ ] **XSS prevention** - Sanitize dynamic channel content and messages
- [ ] **Connection state security** - Secure handling of channel connection states

### REQUIRED SECURITY IMPORTS:
```typescript
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '$WS_ROOT/wedsync/src/lib/auth/options';
import DOMPurify from 'dompurify';
```

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

**FRONTEND/UI RESPONSIBILITIES:**
- React components with TypeScript for WebSocket channel management
- Responsive channel navigation (375px, 768px, 1920px)
- Untitled UI + Magic UI component integration
- Accessibility compliance for channel switching and notifications
- Navigation integration for channel management features
- Wedding-specific channel organization and labeling

### MANDATORY NAVIGATION INTEGRATION:
**CRITICAL:** All WebSocket channel components must integrate with dashboard navigation. Update the parent navigation to include channel management:

```typescript
// File: $WS_ROOT/wedsync/src/app/(dashboard)/layout.tsx
// ADD to navigation items:
{
  title: "Channels",
  href: "/dashboard/channels",
  icon: MessageSquare,
  badge: unreadChannelCount > 0 ? unreadChannelCount.toString() : undefined
}
```

### SPECIFIC DELIVERABLES FOR WS-203:

1. **Channel Manager Component:**
```typescript
// Location: $WS_ROOT/wedsync/src/components/websocket/ChannelManager.tsx
interface ChannelManagerProps {
  userId: string;
  userType: 'supplier' | 'couple';
  maxChannels?: number;
  onChannelSwitch?: (channelName: string) => void;
}

export function ChannelManager({ 
  userId, 
  userType, 
  maxChannels = 3,
  onChannelSwitch 
}: ChannelManagerProps) {
  const [activeChannels, setActiveChannels] = useState<ChannelInfo[]>([]);
  const [currentChannel, setCurrentChannel] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  // Channel subscription management
  const { 
    subscribeToChannel, 
    unsubscribeFromChannel, 
    getChannelList,
    isConnected 
  } = useChannelSubscription(userId, userType);
  
  // Auto-join relevant channels based on user context
  useEffect(() => {
    const initializeChannels = async () => {
      try {
        const channels = await getChannelList();
        
        // For suppliers: auto-join dashboard and active wedding channels
        if (userType === 'supplier') {
          const supplierChannels = channels.filter(ch => 
            ch.scope === 'supplier' && ch.entityId === userId
          ).slice(0, maxChannels);
          
          await Promise.all(
            supplierChannels.map(channel => 
              subscribeToChannel(channel.name)
            )
          );
          
          setActiveChannels(supplierChannels);
          if (supplierChannels.length > 0) {
            setCurrentChannel(supplierChannels[0].name);
          }
        }
        
        // For couples: auto-join their wedding channels
        if (userType === 'couple') {
          const coupleChannels = channels.filter(ch => 
            ch.scope === 'couple' && ch.entityId === userId
          );
          
          await Promise.all(
            coupleChannels.map(channel => 
              subscribeToChannel(channel.name)
            )
          );
          
          setActiveChannels(coupleChannels);
          if (coupleChannels.length > 0) {
            setCurrentChannel(coupleChannels[0].name);
          }
        }
        
      } catch (error) {
        console.error('Failed to initialize channels:', error);
        toast.error('Failed to load channels');
      }
    };
    
    initializeChannels();
  }, [userId, userType, maxChannels]);
  
  // Handle channel switching
  const handleChannelSwitch = useCallback(async (channelName: string) => {
    if (channelName === currentChannel) return;
    
    try {
      // Subscribe to new channel if not already subscribed
      if (!activeChannels.find(ch => ch.name === channelName)) {
        await subscribeToChannel(channelName);
      }
      
      setCurrentChannel(channelName);
      
      // Clear unread count for switched channel
      setUnreadCounts(prev => ({ ...prev, [channelName]: 0 }));
      
      // Notify parent component
      onChannelSwitch?.(channelName);
      
      // Update last activity timestamp
      await updateChannelActivity(channelName);
      
    } catch (error) {
      console.error('Failed to switch channel:', error);
      toast.error('Failed to switch channel');
    }
  }, [currentChannel, activeChannels, subscribeToChannel, onChannelSwitch]);
  
  // Handle new messages for unread count
  const handleNewMessage = useCallback((channelName: string, message: ChannelMessage) => {
    if (channelName !== currentChannel) {
      setUnreadCounts(prev => ({
        ...prev,
        [channelName]: (prev[channelName] || 0) + 1
      }));
      
      // Show toast notification for non-current channel
      toast.info(`New message in ${getChannelDisplayName(channelName)}`, {
        onClick: () => handleChannelSwitch(channelName)
      });
    }
  }, [currentChannel, handleChannelSwitch]);
  
  // Wedding-specific channel display names
  const getChannelDisplayName = (channelName: string): string => {
    const [scope, entity, id] = channelName.split(':');
    
    switch (scope) {
      case 'supplier':
        if (entity === 'dashboard') return 'Dashboard';
        if (entity === 'wedding') return `Wedding ${id.slice(0, 8)}`;
        break;
      case 'couple':
        if (entity === 'wedding') return 'My Wedding';
        if (entity === 'planning') return 'Planning';
        break;
      case 'collaboration':
        return `Collaboration ${id.slice(0, 8)}`;
      default:
        return channelName;
    }
    
    return channelName;
  };
  
  // Channel organization for UI
  const organizedChannels = useMemo(() => {
    const groups: Record<string, ChannelInfo[]> = {
      primary: [],
      weddings: [],
      collaboration: []
    };
    
    activeChannels.forEach(channel => {
      if (channel.scope === 'supplier' && channel.entity === 'dashboard') {
        groups.primary.push(channel);
      } else if (channel.scope === 'supplier' && channel.entity === 'wedding') {
        groups.weddings.push(channel);
      } else if (channel.scope === 'couple') {
        groups.primary.push(channel);
      } else if (channel.scope === 'collaboration') {
        groups.collaboration.push(channel);
      }
    });
    
    return groups;
  }, [activeChannels]);
  
  return (
    <Card className="h-full border-r">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Channels</span>
          </span>
          <Badge 
            variant={isConnected ? "default" : "destructive"}
            className="text-xs"
          >
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Primary Channels */}
        {organizedChannels.primary.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-gray-600 mb-2">Primary</h4>
            <div className="space-y-1">
              {organizedChannels.primary.map(channel => (
                <ChannelIndicator
                  key={channel.name}
                  channelName={channel.name}
                  displayName={getChannelDisplayName(channel.name)}
                  isActive={currentChannel === channel.name}
                  unreadCount={unreadCounts[channel.name] || 0}
                  lastMessage={channel.lastActivity}
                  onClick={() => handleChannelSwitch(channel.name)}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Wedding Channels */}
        {organizedChannels.weddings.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-gray-600 mb-2">Weddings</h4>
            <div className="space-y-1">
              {organizedChannels.weddings.map(channel => (
                <ChannelIndicator
                  key={channel.name}
                  channelName={channel.name}
                  displayName={getChannelDisplayName(channel.name)}
                  isActive={currentChannel === channel.name}
                  unreadCount={unreadCounts[channel.name] || 0}
                  lastMessage={channel.lastActivity}
                  onClick={() => handleChannelSwitch(channel.name)}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Collaboration Channels */}
        {organizedChannels.collaboration.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-gray-600 mb-2">Collaboration</h4>
            <div className="space-y-1">
              {organizedChannels.collaboration.map(channel => (
                <ChannelIndicator
                  key={channel.name}
                  channelName={channel.name}
                  displayName={getChannelDisplayName(channel.name)}
                  isActive={currentChannel === channel.name}
                  unreadCount={unreadCounts[channel.name] || 0}
                  lastMessage={channel.lastActivity}
                  onClick={() => handleChannelSwitch(channel.name)}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Channel Limit Warning */}
        {activeChannels.length >= maxChannels && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Channel Limit Reached</AlertTitle>
            <AlertDescription>
              You have reached the maximum number of channels ({maxChannels}). 
              {maxChannels === 3 && (
                <span> Upgrade to Pro for unlimited channels.</span>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
```

2. **Channel Indicator Component:**
```typescript
// Location: $WS_ROOT/wedsync/src/components/websocket/ChannelIndicator.tsx
interface ChannelIndicatorProps {
  channelName: string;
  displayName: string;
  isActive: boolean;
  unreadCount: number;
  lastMessage?: Date;
  isTyping?: boolean;
  onClick: () => void;
}

export function ChannelIndicator({
  channelName,
  displayName,
  isActive,
  unreadCount,
  lastMessage,
  isTyping = false,
  onClick
}: ChannelIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Channel type detection for styling
  const channelType = channelName.split(':')[0];
  const getChannelIcon = () => {
    switch (channelType) {
      case 'supplier':
        return Building2;
      case 'couple':
        return Heart;
      case 'collaboration':
        return Users;
      case 'form':
        return FileText;
      case 'journey':
        return MapPin;
      default:
        return MessageSquare;
    }
  };
  
  const Icon = getChannelIcon();
  
  return (
    <div
      className={cn(
        "relative flex items-center space-x-3 rounded-lg p-3 transition-colors cursor-pointer",
        isActive 
          ? "bg-primary text-primary-foreground" 
          : "hover:bg-accent hover:text-accent-foreground",
        unreadCount > 0 && !isActive && "bg-blue-50 border-l-2 border-blue-500"
      )}
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Channel Icon */}
      <div className="relative">
        <Icon className={cn(
          "h-4 w-4",
          isActive ? "text-primary-foreground" : "text-gray-500"
        )} />
        
        {/* Connection Status Dot */}
        <div className={cn(
          "absolute -top-1 -right-1 h-2 w-2 rounded-full",
          isActive ? "bg-green-400" : "bg-gray-400"
        )} />
      </div>
      
      {/* Channel Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={cn(
            "text-sm font-medium truncate",
            isActive ? "text-primary-foreground" : "text-gray-900"
          )}>
            {displayName}
          </p>
          
          {/* Unread Badge */}
          {unreadCount > 0 && (
            <Badge 
              variant={isActive ? "secondary" : "default"}
              className="ml-2 text-xs min-w-[1.5rem] h-5 flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>
        
        {/* Last Activity */}
        {lastMessage && (
          <p className={cn(
            "text-xs truncate",
            isActive ? "text-primary-foreground/70" : "text-gray-500"
          )}>
            {formatDistanceToNow(lastMessage, { addSuffix: true })}
          </p>
        )}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center space-x-1 mt-1">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
            <span className={cn(
              "text-xs italic",
              isActive ? "text-primary-foreground/70" : "text-gray-500"
            )}>
              typing...
            </span>
          </div>
        )}
      </div>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute left-full ml-2 z-10 px-2 py-1 text-xs bg-black text-white rounded whitespace-nowrap">
          {channelName}
        </div>
      )}
    </div>
  );
}
```

3. **Message Queue Component:**
```typescript
// Location: $WS_ROOT/wedsync/src/components/websocket/MessageQueue.tsx
interface MessageQueueProps {
  channelId: string;
  isOnline: boolean;
  onMessageDelivered?: (messageId: string) => void;
}

export function MessageQueue({ 
  channelId, 
  isOnline,
  onMessageDelivered 
}: MessageQueueProps) {
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Use message queue hook
  const { 
    queuedMessages: hookMessages,
    deliverMessage,
    retryFailedMessages,
    clearExpiredMessages
  } = useMessageQueue(channelId);
  
  // Sync with hook state
  useEffect(() => {
    setQueuedMessages(hookMessages);
  }, [hookMessages]);
  
  // Auto-process queue when coming online
  useEffect(() => {
    if (isOnline && queuedMessages.length > 0) {
      processQueue();
    }
  }, [isOnline, queuedMessages.length]);
  
  // Process queued messages
  const processQueue = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Process messages in chronological order
      const sortedMessages = [...queuedMessages].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      for (const message of sortedMessages) {
        try {
          await deliverMessage(message.id);
          
          // Remove from local state
          setQueuedMessages(prev => 
            prev.filter(m => m.id !== message.id)
          );
          
          // Notify parent
          onMessageDelivered?.(message.id);
          
          // Brief delay between messages
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Failed to deliver message ${message.id}:`, error);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Retry failed messages
  const handleRetryMessages = async () => {
    const failedMessages = queuedMessages.filter(m => m.delivery_status === 'failed');
    
    if (failedMessages.length === 0) return;
    
    try {
      await retryFailedMessages(failedMessages.map(m => m.id));
    } catch (error) {
      console.error('Failed to retry messages:', error);
      toast.error('Failed to retry messages');
    }
  };
  
  // Clear all messages
  const handleClearQueue = async () => {
    try {
      await clearExpiredMessages(channelId);
      setQueuedMessages([]);
      toast.success('Queue cleared');
    } catch (error) {
      console.error('Failed to clear queue:', error);
      toast.error('Failed to clear queue');
    }
  };
  
  if (queuedMessages.length === 0) {
    return null;
  }
  
  return (
    <Card className="mb-4 border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <span>Queued Messages</span>
            <Badge variant="secondary" className="text-xs">
              {queuedMessages.length}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            {isProcessing && (
              <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetryMessages}
              disabled={isProcessing || !isOnline}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearQueue}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {queuedMessages.map((message) => (
            <QueuedMessageItem
              key={message.id}
              message={message}
              isDelivering={isProcessing}
              onRetry={() => retryFailedMessages([message.id])}
            />
          ))}
        </div>
        
        {!isOnline && (
          <Alert className="mt-3">
            <Wifi className="h-4 w-4" />
            <AlertTitle>Offline</AlertTitle>
            <AlertDescription>
              Messages will be delivered when you come back online.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// Supporting component for individual queued messages
function QueuedMessageItem({ 
  message, 
  isDelivering, 
  onRetry 
}: { 
  message: QueuedMessage; 
  isDelivering: boolean;
  onRetry: () => void;
}) {
  const getMessagePreview = () => {
    switch (message.message_type) {
      case 'form_response':
        return `📝 ${message.payload.formName} response`;
      case 'journey_progress':
        return `🗺️ ${message.payload.stepName} completed`;
      case 'wedding_update':
        return `💒 Wedding details updated`;
      default:
        return 'Message pending delivery';
    }
  };
  
  const getStatusColor = () => {
    switch (message.delivery_status) {
      case 'pending':
        return 'text-orange-600';
      case 'delivering':
        return 'text-blue-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };
  
  return (
    <div className="flex items-center justify-between p-3 bg-white rounded border">
      <div className="flex-1">
        <p className="text-sm font-medium">
          {getMessagePreview()}
        </p>
        <p className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
        </p>
      </div>
      
      <div className="flex items-center space-x-2">
        <Badge 
          variant="outline" 
          className={cn("text-xs", getStatusColor())}
        >
          {message.delivery_status}
        </Badge>
        
        {message.delivery_status === 'failed' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            disabled={isDelivering}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
```

4. **Channel Subscription Hook:**
```typescript
// Location: $WS_ROOT/wedsync/src/hooks/useChannelSubscription.ts
export function useChannelSubscription(userId: string, userType: 'supplier' | 'couple') {
  const [subscriptions, setSubscriptions] = useState<Map<string, RealtimeChannel>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [channelList, setChannelList] = useState<ChannelInfo[]>([]);
  
  // Subscribe to a specific channel
  const subscribeToChannel = useCallback(async (channelName: string): Promise<void> => {
    try {
      // Check if already subscribed
      if (subscriptions.has(channelName)) {
        console.log(`Already subscribed to ${channelName}`);
        return;
      }
      
      // Create Supabase channel
      const channel = supabase.channel(channelName);
      
      // Set up event handlers
      channel
        .on('broadcast', { event: '*' }, (payload) => {
          // Handle incoming messages
          handleChannelMessage(channelName, payload);
        })
        .on('presence', { event: 'sync' }, () => {
          // Handle presence updates
          handlePresenceSync(channelName, channel.presenceState());
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          // Handle user join
          handleUserJoin(channelName, key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          // Handle user leave
          handleUserLeave(channelName, key, leftPresences);
        });
      
      // Subscribe to channel
      const status = await channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setSubscriptions(prev => new Map(prev.set(channelName, channel)));
          setIsConnected(true);
          console.log(`Subscribed to ${channelName}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Failed to subscribe to ${channelName}`);
          throw new Error(`Channel subscription failed: ${channelName}`);
        }
      });
      
    } catch (error) {
      console.error(`Failed to subscribe to channel ${channelName}:`, error);
      throw error;
    }
  }, [subscriptions]);
  
  // Unsubscribe from a channel
  const unsubscribeFromChannel = useCallback(async (channelName: string): Promise<void> => {
    const channel = subscriptions.get(channelName);
    if (channel) {
      await channel.unsubscribe();
      setSubscriptions(prev => {
        const newMap = new Map(prev);
        newMap.delete(channelName);
        return newMap;
      });
      console.log(`Unsubscribed from ${channelName}`);
    }
  }, [subscriptions]);
  
  // Get available channels for user
  const getChannelList = useCallback(async (): Promise<ChannelInfo[]> => {
    try {
      const { data, error } = await supabase
        .from('websocket_channels')
        .select('*')
        .or(`created_by.eq.${userId},scope.eq.${userType}`)
        .order('last_activity', { ascending: false });
      
      if (error) throw error;
      
      const channels = data.map(ch => ({
        id: ch.id,
        name: ch.channel_name,
        type: ch.channel_type,
        scope: ch.scope,
        entity: ch.entity,
        entityId: ch.entity_id,
        lastActivity: new Date(ch.last_activity)
      }));
      
      setChannelList(channels);
      return channels;
      
    } catch (error) {
      console.error('Failed to get channel list:', error);
      return [];
    }
  }, [userId, userType]);
  
  // Handle incoming channel messages
  const handleChannelMessage = useCallback((channelName: string, payload: any) => {
    // Emit custom event for components to handle
    window.dispatchEvent(new CustomEvent('channelMessage', {
      detail: { channelName, payload }
    }));
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subscriptions.forEach((channel) => {
        channel.unsubscribe();
      });
    };
  }, [subscriptions]);
  
  return {
    subscriptions,
    subscribeToChannel,
    unsubscribeFromChannel,
    getChannelList,
    channelList,
    isConnected
  };
}
```

## 📋 TECHNICAL SPECIFICATION FROM WS-203

**WebSocket Requirements:**
- Channel naming convention: {scope}:{entity}:{id}
- Free tier limited to 3 concurrent channels, paid tiers support 10 channels
- Message queuing during offline periods (max 100 per channel)
- Channel switch performance under 200ms
- Heartbeat connection maintenance every 30 seconds

**Wedding Industry Context:**
- Multi-wedding channel management for suppliers
- Couple-specific channels for wedding planning coordination  
- Collaboration channels for supplier-couple communication
- Wedding-based channel organization and labeling
- Real-time updates without cross-wedding confusion

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core UI Components:
- [ ] ChannelManager with multi-channel navigation and organization
- [ ] ChannelIndicator with status, unread counts, and typing indicators
- [ ] MessageQueue with offline message handling and retry functionality
- [ ] Channel subscription hook with connection management
- [ ] Wedding-specific channel organization and display names

### Responsive Design:
- [ ] Mobile-first channel navigation (375px breakpoint)
- [ ] Tablet channel list optimization (768px breakpoint)  
- [ ] Desktop multi-channel interface (1920px breakpoint)
- [ ] Touch-optimized channel switching controls
- [ ] Accessibility compliance for all channel navigation

### Wedding Industry Integration:
- [ ] Supplier dashboard channel auto-join
- [ ] Wedding-specific channel grouping and labeling
- [ ] Collaboration channel management for supplier-couple communication
- [ ] Channel isolation preventing cross-wedding data mixing
- [ ] Wedding coordination specific message previews

### Performance & Accessibility:
- [ ] Sub-200ms channel switching response times
- [ ] Memory-efficient channel subscription management
- [ ] Screen reader announcements for channel switches
- [ ] Keyboard navigation for channel selection
- [ ] High contrast mode support for channel indicators

## 💾 WHERE TO SAVE YOUR WORK
- UI Components: $WS_ROOT/wedsync/src/components/websocket/
- Hooks: $WS_ROOT/wedsync/src/hooks/
- Channel Management: $WS_ROOT/wedsync/src/lib/websocket/
- Types: $WS_ROOT/wedsync/src/types/websocket.ts
- Tests: $WS_ROOT/wedsync/__tests__/components/websocket/
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-203-team-a-round-1-complete.md

## 🏁 COMPLETION CHECKLIST
- [ ] ChannelManager implemented with multi-channel navigation
- [ ] ChannelIndicator with visual status and unread count display
- [ ] MessageQueue with offline message handling and retry logic
- [ ] Channel subscription hook with connection state management
- [ ] Navigation integration with channel management features
- [ ] Mobile responsive design across all breakpoints
- [ ] Accessibility compliance for channel switching UI
- [ ] Wedding industry context in all channel components
- [ ] Performance requirements met (<200ms switching)
- [ ] Channel organization for supplier/couple workflows
- [ ] TypeScript compilation successful
- [ ] All WebSocket UI tests passing
- [ ] Evidence package prepared with component testing
- [ ] Senior dev review prompt created

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements for WebSocket channel UI implementation!**