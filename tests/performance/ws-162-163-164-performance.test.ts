/**
 * Performance Tests for WS-162, WS-163, WS-164 Integration Systems
 * Team C Performance Testing Suite
 * Validates <100ms real-time update requirements and system scalability
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';
import { integrationOrchestrator } from '@/lib/integrations/integration-orchestrator';
import { budgetIntegration } from '@/lib/integrations/budget-integration';
import { manualTrackingIntegration } from '@/lib/integrations/manual-tracking-integration';

describe('Real-time Performance Tests', () => {
  const mockWeddingId = 'perf-test-wedding-123';
  
  describe('WS-162: Real-time Schedule Updates', () => {
    it('should process schedule updates within 100ms', async () => {
      const scheduleUpdate = {
        taskId: 'task-123',
        newDate: '2024-07-15T10:00:00Z',
        assigneeId: 'helper-456',
        priority: 'high'
      };

      const startTime = performance.now();
      
      await integrationOrchestrator.handleScheduleUpdate(mockWeddingId, scheduleUpdate);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      expect(processingTime).toBeLessThan(100); // Success criteria: <100ms
      console.log(`Schedule update processed in ${processingTime.toFixed(2)}ms`);
    });

    it('should handle concurrent schedule updates efficiently', async () => {
      const updates = Array.from({ length: 50 }, (_, i) => ({
        taskId: `task-${i}`,
        newDate: `2024-07-${15 + i}T10:00:00Z`,
        assigneeId: 'helper-456'
      }));

      const startTime = performance.now();
      
      await Promise.all(
        updates.map(update => 
          integrationOrchestrator.handleScheduleUpdate(mockWeddingId, update)
        )
      );
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / updates.length;
      
      expect(averageTime).toBeLessThan(100);
      console.log(`Average concurrent update time: ${averageTime.toFixed(2)}ms`);
    });

    it('should establish WebSocket connections within 100ms', async () => {
      const startTime = performance.now();
      
      const connection = await integrationOrchestrator.establishRealtimeConnection(mockWeddingId);
      
      const endTime = performance.now();
      const connectionTime = endTime - startTime;
      
      expect(connectionTime).toBeLessThan(100);
      expect(connection.status).toBe('connected');
      console.log(`WebSocket connection established in ${connectionTime.toFixed(2)}ms`);
    });
  });

  describe('WS-163: Budget Calculation Performance', () => {
    it('should calculate budget updates within 50ms', async () => {
      const expenseData = {
        category: 'venue',
        amount: 2500,
        description: 'Venue deposit'
      };

      const startTime = performance.now();
      
      await budgetIntegration.addExpense(mockWeddingId, expenseData);
      
      const endTime = performance.now();
      const calculationTime = endTime - startTime;
      
      expect(calculationTime).toBeLessThan(50); // Budget calculations should be very fast
      console.log(`Budget calculation completed in ${calculationTime.toFixed(2)}ms`);
    });

    it('should handle ML categorization within 200ms', async () => {
      const expenseData = {
        description: 'Professional wedding photography session with engagement shoot',
        amount: 3500,
        vendor: 'Elite Wedding Photography'
      };

      const startTime = performance.now();
      
      const classification = await budgetIntegration.classifyExpense(mockWeddingId, expenseData);
      
      const endTime = performance.now();
      const mlTime = endTime - startTime;
      
      expect(mlTime).toBeLessThan(200); // ML processing should be under 200ms
      expect(classification.confidence).toBeGreaterThan(0.8);
      console.log(`ML categorization completed in ${mlTime.toFixed(2)}ms with ${(classification.confidence * 100).toFixed(1)}% confidence`);
    });

    it('should process bulk budget calculations efficiently', async () => {
      const expenses = Array.from({ length: 100 }, (_, i) => ({
        category: ['venue', 'catering', 'photography', 'flowers'][i % 4],
        amount: Math.random() * 1000 + 100,
        description: `Test expense ${i}`
      }));

      const startTime = performance.now();
      
      await Promise.all(
        expenses.map(expense => budgetIntegration.addExpense(mockWeddingId, expense))
      );
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / expenses.length;
      
      expect(averageTime).toBeLessThan(50);
      console.log(`Average bulk calculation time: ${averageTime.toFixed(2)}ms per expense`);
    });
  });

  describe('WS-164: OCR Processing Performance', () => {
    it('should process receipt OCR within 5000ms', async () => {
      const mockFile = new File(['receipt data'], 'receipt.jpg', { type: 'image/jpeg' });
      
      const startTime = performance.now();
      
      const ocrResult = await manualTrackingIntegration.processReceiptOCR(mockFile, mockWeddingId);
      
      const endTime = performance.now();
      const ocrTime = endTime - startTime;
      
      expect(ocrTime).toBeLessThan(5000); // OCR processing should complete within 5 seconds
      expect(ocrResult.extractedData).toBeDefined();
      console.log(`OCR processing completed in ${ocrTime.toFixed(2)}ms`);
    });

    it('should handle file uploads within 1000ms', async () => {
      const mockFile = new File(['receipt data'], 'receipt.jpg', { type: 'image/jpeg' });
      
      const startTime = performance.now();
      
      const uploadResult = await manualTrackingIntegration.uploadReceiptFile(
        mockFile,
        mockWeddingId,
        'user-123'
      );
      
      const endTime = performance.now();
      const uploadTime = endTime - startTime;
      
      expect(uploadTime).toBeLessThan(1000);
      expect(uploadResult.success).toBe(true);
      console.log(`File upload completed in ${uploadTime.toFixed(2)}ms`);
    });

    it('should process approval workflows within 100ms', async () => {
      const expenseData = {
        amount: 750,
        category: 'catering',
        description: 'Additional catering costs'
      };

      const startTime = performance.now();
      
      const workflow = await manualTrackingIntegration.createExpenseApproval(mockWeddingId, expenseData);
      
      const endTime = performance.now();
      const workflowTime = endTime - startTime;
      
      expect(workflowTime).toBeLessThan(100);
      expect(workflow.currentStep).toBeDefined();
      console.log(`Approval workflow created in ${workflowTime.toFixed(2)}ms`);
    });
  });

  describe('Cross-System Integration Performance', () => {
    it('should orchestrate cross-feature workflows within 200ms', async () => {
      const receiptData = {
        merchantName: 'Premium Catering Services',
        totalAmount: 3500,
        category: 'catering'
      };

      const startTime = performance.now();
      
      const result = await integrationOrchestrator.processReceiptToBudgetWorkflow(
        mockWeddingId,
        receiptData
      );
      
      const endTime = performance.now();
      const orchestrationTime = endTime - startTime;
      
      expect(orchestrationTime).toBeLessThan(200); // Cross-system workflows should be fast
      expect(result.budgetUpdated).toBe(true);
      console.log(`Cross-feature workflow completed in ${orchestrationTime.toFixed(2)}ms`);
    });

    it('should handle health checks within 50ms', async () => {
      const startTime = performance.now();
      
      const healthStatus = await integrationOrchestrator.runHealthCheck(mockWeddingId);
      
      const endTime = performance.now();
      const healthCheckTime = endTime - startTime;
      
      expect(healthCheckTime).toBeLessThan(50);
      expect(healthStatus.overall).toBe('healthy');
      console.log(`Health check completed in ${healthCheckTime.toFixed(2)}ms`);
    });
  });

  describe('Scalability and Load Testing', () => {
    it('should handle 1000 concurrent wedding sessions', async () => {
      const weddingIds = Array.from({ length: 1000 }, (_, i) => `load-test-wedding-${i}`);
      
      const startTime = performance.now();
      
      await Promise.all(
        weddingIds.map(weddingId => 
          integrationOrchestrator.initializeWeddingIntegrations(weddingId)
        )
      );
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / weddingIds.length;
      
      expect(averageTime).toBeLessThan(100); // Each initialization should be under 100ms
      console.log(`Load test: Average initialization time ${averageTime.toFixed(2)}ms for 1000 weddings`);
    });

    it('should maintain performance under sustained load', async () => {
      const operations = [];
      
      // Simulate mixed workload for 30 seconds
      const endTime = Date.now() + 30000; // 30 seconds
      
      while (Date.now() < endTime) {
        operations.push(
          integrationOrchestrator.handleScheduleUpdate(mockWeddingId, {
            taskId: `task-${Date.now()}`,
            newDate: new Date().toISOString()
          })
        );
        
        operations.push(
          budgetIntegration.addExpense(mockWeddingId, {
            category: 'miscellaneous',
            amount: Math.random() * 100,
            description: 'Load test expense'
          })
        );
        
        // Process in batches to avoid overwhelming the system
        if (operations.length >= 100) {
          await Promise.all(operations.splice(0, 100));
        }
      }
      
      // Process remaining operations
      if (operations.length > 0) {
        await Promise.all(operations);
      }
      
      // Verify system is still healthy after sustained load
      const healthStatus = await integrationOrchestrator.runHealthCheck(mockWeddingId);
      expect(healthStatus.overall).toBe('healthy');
      
      console.log(`Sustained load test completed: ${operations.length} operations processed`);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not cause memory leaks during extended operation', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform 1000 operations
      for (let i = 0; i < 1000; i++) {
        await integrationOrchestrator.handleScheduleUpdate(mockWeddingId, {
          taskId: `memory-test-${i}`,
          newDate: new Date().toISOString()
        });
        
        // Force garbage collection every 100 operations
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }
      
      // Force final garbage collection
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
      
      // Memory should not increase by more than 50%
      expect(memoryIncreasePercent).toBeLessThan(50);
      
      console.log(`Memory usage increased by ${memoryIncreasePercent.toFixed(2)}% after 1000 operations`);
    });
  });
});

describe('API Response Time Tests', () => {
  describe('REST API Performance', () => {
    it('should respond to budget API calls within 200ms', async () => {
      const startTime = performance.now();
      
      // Simulate API call
      const response = await budgetIntegration.getBudgetSummary(mockWeddingId);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(200);
      expect(response).toBeDefined();
      console.log(`Budget API responded in ${responseTime.toFixed(2)}ms`);
    });

    it('should handle concurrent API requests efficiently', async () => {
      const requests = Array.from({ length: 50 }, () => 
        budgetIntegration.getBudgetSummary(`wedding-${Math.random()}`)
      );
      
      const startTime = performance.now();
      
      await Promise.all(requests);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / requests.length;
      
      expect(averageTime).toBeLessThan(200);
      console.log(`Average concurrent API response time: ${averageTime.toFixed(2)}ms`);
    });
  });

  describe('WebSocket Performance', () => {
    it('should maintain real-time connection latency under 100ms', async () => {
      const connection = await integrationOrchestrator.establishRealtimeConnection(mockWeddingId);
      
      const startTime = performance.now();
      
      // Send test message and wait for response
      await connection.sendMessage({
        type: 'ping',
        timestamp: Date.now()
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      expect(latency).toBeLessThan(100);
      console.log(`WebSocket round-trip latency: ${latency.toFixed(2)}ms`);
    });
  });
});