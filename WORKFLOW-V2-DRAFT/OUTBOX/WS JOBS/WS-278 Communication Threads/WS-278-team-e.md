# WS-278 Communication Threads - Team E Comprehensive Prompt
**Team E: QA/Testing Specialists**  

## 🎯 Your Mission: Wedding Communication Never Fails Testing
You are the **QA/Testing specialists** responsible for ensuring the communication threads system never drops messages, handles real-time updates flawlessly, and works perfectly under wedding day pressure. Your focus: **Comprehensive testing that covers real-time messaging, offline scenarios, concurrent conversations, and the chaos of Saturday wedding rush**.

## 💝 The Wedding Communication Testing Reality  
**Context**: Saturday morning - 150 wedding coordinators are simultaneously managing conversations with vendors, couples are messaging about last-minute changes from venue parking lots with 1 bar of signal, and emergency threads must deliver instantly. One failed message could mean a missing photographer or wrong ceremony time. **Your testing must simulate every possible messaging failure scenario**.

## 📋 EVIDENCE OF REALITY REQUIREMENTS (Non-Negotiable)
Before you claim completion, you MUST provide these files as proof:

### 🔍 Required Evidence Files:
1. **`/src/__tests__/messaging/thread-manager.test.tsx`** - Complete thread management testing
2. **`/src/__tests__/messaging/real-time-messaging.test.ts`** - Real-time message delivery testing
3. **`/src/__tests__/messaging/offline-scenarios.test.ts`** - Offline messaging and sync testing
4. **`/src/__tests__/messaging/concurrent-load.test.ts`** - High concurrency conversation testing
5. **`/src/__tests__/messaging/wedding-day-scenarios.test.ts`** - Saturday rush and emergency testing

### 🔒 Testing Requirements:
- **99.9%+ Message Delivery**: No messages lost during network interruptions or server issues
- **Real-time Performance**: Messages appear within 500ms across all connected clients
- **Offline Resilience**: Messages queue offline and sync perfectly when connection returns  
- **Concurrent Load Testing**: 1000+ simultaneous conversations without performance degradation
- **Mobile Testing**: Perfect functionality on actual iOS/Android devices with poor signal

Your testing ensures wedding conversations are as reliable as the wedding vows.

## 🧪 Core Testing Scenarios

### Real-time Messaging Tests
```typescript
describe('Real-time Message Delivery', () => {
  it('should deliver messages within 500ms', async () => {
    // Test message delivery speed across multiple clients
    const clients = await setupMultipleClients(3);
    const messagePromises = clients.map(client => 
      client.waitForMessage('thread-123')
    );
    
    await clients[0].sendMessage('thread-123', 'Test message');
    
    const deliveryTimes = await Promise.all(messagePromises);
    deliveryTimes.forEach(time => {
      expect(time).toBeLessThan(500); // 500ms max delivery
    });
  });

  it('should handle message ordering correctly', async () => {
    // Send multiple rapid messages and verify order
    const messages = ['Message 1', 'Message 2', 'Message 3'];
    const promises = messages.map(msg => sendMessage('thread-123', msg));
    
    await Promise.all(promises);
    
    const threadMessages = await getThreadMessages('thread-123');
    expect(threadMessages.map(m => m.content)).toEqual(messages);
  });
});
```

### Offline Scenario Testing
```typescript
describe('Offline Message Handling', () => {
  it('should queue messages when offline', async () => {
    // Simulate network disconnect
    await simulateNetworkDisconnect();
    
    const message = 'Urgent: Venue change!';
    await sendMessage('thread-123', message);
    
    // Message should be queued
    const queuedMessages = await getQueuedMessages();
    expect(queuedMessages).toHaveLength(1);
    expect(queuedMessages[0].content).toBe(message);
  });

  it('should sync queued messages when reconnected', async () => {
    await simulateNetworkDisconnect();
    await sendMessage('thread-123', 'Offline message 1');
    await sendMessage('thread-123', 'Offline message 2');
    
    await simulateNetworkReconnect();
    
    // Wait for sync to complete
    await waitFor(() => {
      const messages = getThreadMessages('thread-123');
      expect(messages).toHaveLength(2);
    });
  });
});
```

### Wedding Day Stress Testing
```typescript
describe('Saturday Wedding Rush Scenarios', () => {
  it('should handle 200 coordinators messaging simultaneously', async () => {
    const coordinators = Array(200).fill(0).map((_, i) => 
      createMockCoordinator(`coordinator-${i}`)
    );
    
    const startTime = Date.now();
    const promises = coordinators.map(coordinator =>
      coordinator.sendUrgentMessage('Emergency thread')
    );
    
    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    
    // 95% success rate under extreme load
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    expect(successCount).toBeGreaterThanOrEqual(190);
    expect(endTime - startTime).toBeLessThan(5000); // Complete within 5 seconds
  });

  it('should prioritize emergency messages', async () => {
    // Send normal and emergency messages simultaneously
    const normalPromise = sendMessage('thread-normal', 'Normal message');
    const emergencyPromise = sendMessage('thread-emergency', 'EMERGENCY: Venue flooded!', { priority: 'urgent' });
    
    const [normalResult, emergencyResult] = await Promise.all([
      measureDeliveryTime(normalPromise),
      measureDeliveryTime(emergencyPromise)
    ]);
    
    // Emergency should deliver faster
    expect(emergencyResult.deliveryTime).toBeLessThan(normalResult.deliveryTime);
  });
});
```

### Mobile Device Testing
```typescript
describe('Mobile Messaging Experience', () => {
  it('should work perfectly on slow 3G connections', async () => {
    await simulateNetworkConditions({
      downloadSpeed: '3G',
      latency: 2000,
      packetLoss: 0.1
    });
    
    const message = 'Testing slow connection';
    const deliveryTime = await measureMessageDelivery(message);
    
    expect(deliveryTime).toBeLessThan(5000); // Still works on slow connections
  });

  it('should handle app backgrounding and foregrounding', async () => {
    await sendMessage('thread-123', 'Before background');
    
    // Simulate app going to background
    await simulateAppBackground();
    await delay(30000); // 30 seconds in background
    
    // Send message while app is backgrounded
    await sendMessage('thread-123', 'While backgrounded');
    
    // Bring app to foreground
    await simulateAppForeground();
    
    // Should receive missed message
    await waitFor(() => {
      const messages = getThreadMessages('thread-123');
      expect(messages).toHaveLength(2);
    });
  });
});
```

### Performance & Load Testing
```typescript
describe('Performance Under Load', () => {
  it('should maintain performance with 1000 active threads', async () => {
    // Create 1000 threads with active conversations
    const threads = await createMockThreads(1000);
    
    // Simulate activity in all threads
    const activities = threads.map(thread => 
      simulateThreadActivity(thread.id, 10) // 10 messages per thread
    );
    
    const startTime = Date.now();
    await Promise.all(activities);
    const endTime = Date.now();
    
    // Should complete within reasonable time
    expect(endTime - startTime).toBeLessThan(30000);
    
    // Check system resources
    const memoryUsage = process.memoryUsage();
    expect(memoryUsage.heapUsed).toBeLessThan(500 * 1024 * 1024); // Under 500MB
  });

  it('should handle message history pagination efficiently', async () => {
    const threadId = 'thread-with-history';
    
    // Create thread with 10,000 messages
    await createMessagesInBatches(threadId, 10000);
    
    // Test pagination performance
    const startTime = Date.now();
    const firstPage = await getThreadMessages(threadId, { limit: 50, offset: 0 });
    const middlePage = await getThreadMessages(threadId, { limit: 50, offset: 5000 });
    const lastPage = await getThreadMessages(threadId, { limit: 50, offset: 9950 });
    const endTime = Date.now();
    
    expect(firstPage).toHaveLength(50);
    expect(middlePage).toHaveLength(50);
    expect(lastPage).toHaveLength(50);
    expect(endTime - startTime).toBeLessThan(1000); // All queries under 1 second
  });
});
```

## ✅ Acceptance Criteria Checklist

- [ ] **99.9% Message Delivery** confirmed across all network conditions and device types
- [ ] **Real-time Performance** messages appear within 500ms on all connected clients  
- [ ] **Offline Functionality** perfectly queues and syncs messages during connection loss
- [ ] **Concurrent Load Handling** supports 1000+ simultaneous conversations without degradation
- [ ] **Mobile Device Testing** verified on actual iOS/Android devices with poor cellular signal
- [ ] **Emergency Thread Priority** urgent messages receive faster delivery and processing
- [ ] **Wedding Day Stress Testing** handles Saturday morning rush with 200+ coordinators
- [ ] **Memory & Performance** maintains optimal resource usage under sustained load
- [ ] **Cross-Platform Consistency** identical functionality across web, iOS, and Android
- [ ] **Error Recovery Testing** gracefully handles and recovers from all failure scenarios

Your testing ensures wedding communication is as reliable as the couple's commitment.

**Remember**: Every message test prevents a potential wedding day disaster. Test like lives depend on it - because they do! 🧪💍