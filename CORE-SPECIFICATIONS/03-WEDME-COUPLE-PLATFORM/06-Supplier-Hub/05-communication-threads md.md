# 05-communication-threads.md

## What to Build

Threaded messaging system for supplier-specific conversations with @mentions, read receipts, and file attachments.

## Key Technical Requirements

### Message Threading

```
interface MessageThread {
  id: string;
  couple_id: string;
  supplier_id: string;
  participants: {
    user_id: string;
    name: string;
    role: 'couple' | 'supplier' | 'coordinator';
    avatar?: string;
  }[];
  messages: {
    id: string;
    sender_id: string;
    content: string;
    attachments?: string[];
    mentions?: string[]; // user_ids
    sent_at: Date;
    read_by: { user_id: string; read_at: Date; }[];
    edited_at?: Date;
  }[];
  unread_count: number;
  last_message_at: Date;
  pinned: boolean;
}
```

### UI Components

- Threaded conversation view
- Typing indicators
- Read receipts (double checkmarks)
- @mention autocomplete
- File attachment previews
- Message search within thread
- Pin important threads
- Mute notifications option

## Critical Implementation Notes

- Real-time message delivery via WebSockets
- Offline message queue
- 2000 character limit per message
- Link preview generation
- Emoji reactions support
- Export conversation as PDF

## Real-time Messaging

```
// Message subscription
const messageChannel = supabase
  .channel(`thread_${threadId}`)
  .on('broadcast', { event: 'new_message' }, (payload) => {
    addMessageToThread(payload.message);
    updateReadReceipts(payload.sender_id);
  })
  .on('broadcast', { event: 'typing' }, (payload) => {
    showTypingIndicator(payload.user);
  })
  .subscribe();
```