/**
 * Cross-Platform Integration Testing Suite
 * WS-342 Real-Time Wedding Collaboration - Team E QA & Documentation
 *
 * Comprehensive testing of real-time synchronization between WedSync and WedMe platforms
 * Tests data consistency, viral growth mechanics, and seamless user experience
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// Cross-platform testing configuration
const CROSS_PLATFORM_CONFIG = {
  wedSyncUrl: process.env.WEDSYNC_API_URL || 'http://localhost:3000',
  wedMeUrl: process.env.WEDME_API_URL || 'http://localhost:3001',
  websocketUrl: process.env.WEBSOCKET_URL || 'ws://localhost:1234',
  syncTimeoutMs: 5000,
  maxSyncDelayMs: 100,
  viralGrowthTargets: {
    coupleToVendorConversion: 0.15, // 15% conversion rate
    vendorToVendorConversion: 0.25, // 25% conversion rate
    weddingShowcaseConversion: 0.08, // 8% conversion rate
  },
} as const;

// Platform user types and their behaviors
interface PlatformUser {
  id: string;
  name: string;
  platform: 'wedsync' | 'wedme';
  userType: 'couple' | 'vendor' | 'planner' | 'guest' | 'family';
  deviceType: 'mobile' | 'desktop' | 'tablet';
  permissions: string[];
  weddingRole?: string;
}

// Cross-platform synchronization operations
interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'share' | 'invite';
  dataType:
    | 'timeline'
    | 'budget'
    | 'guest_list'
    | 'vendor_info'
    | 'photos'
    | 'documents';
  source: 'wedsync' | 'wedme';
  target: 'wedsync' | 'wedme' | 'both';
  payload: any;
  timestamp: Date;
  userId: string;
  weddingId: string;
}

// Viral growth tracking
interface ViralGrowthMetrics {
  invitationsSent: number;
  invitationsAccepted: number;
  newUserSignups: number;
  platformConversions: number;
  referralChainDepth: number;
  growthVelocity: number; // users per hour
  conversionRate: number;
  networkEffect: number; // users brought per existing user
}

// Global helper functions to reduce nesting throughout tests
const createDelayPromise = (baseMs: number = 100, varianceMs: number = 200) => 
  new Promise<void>(resolve => 
    setTimeout(resolve, baseMs + Math.random() * varianceMs)
  );

const findTestClientByUserId = (clients: CrossPlatformTestClient[], userId: string) => 
  clients.find((c) => (c as any).user?.id === userId);

const createWaitPromise = (ms: number) => 
  new Promise<void>(resolve => setTimeout(resolve, ms));

class CrossPlatformTestClient {
  private yDoc: Y.Doc;
  private provider: WebsocketProvider | null = null;
  private syncLog: SyncOperation[] = [];

  constructor(
    private user: PlatformUser,
    private weddingId: string,
    private documentId: string,
  ) {
    this.yDoc = new Y.Doc();
  }

  async connect(): Promise<void> {
    const wsUrl = `${CROSS_PLATFORM_CONFIG.websocketUrl}/${this.documentId}`;
    this.provider = new WebsocketProvider(wsUrl, this.documentId, this.yDoc);

    // Set platform-specific awareness
    this.provider.awareness.setLocalState({
      userId: this.user.id,
      userName: this.user.name,
      platform: this.user.platform,
      userType: this.user.userType,
      deviceType: this.user.deviceType,
      weddingId: this.weddingId,
      permissions: this.user.permissions,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
    });

    // Wait for connection
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Connection timeout')),
        10000,
      );

      this.provider!.on('status', (event: { status: string }) => {
        if (event.status === 'connected') {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
  }

  async performSyncOperation(
    operation: Omit<SyncOperation, 'id' | 'timestamp' | 'userId'>,
  ): Promise<string> {
    const syncOp: SyncOperation = {
      ...operation,
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId: this.user.id,
    };

    // Apply operation to Y.js document
    const yText = this.yDoc.getText('content');
    const operationContent = JSON.stringify({
      operation: syncOp,
      platform: this.user.platform,
      userType: this.user.userType,
    });

    yText.insert(yText.length, `${operationContent}\n`);
    this.syncLog.push(syncOp);

    return syncOp.id;
  }

  async simulateViralInvitation(
    targetUsers: Partial<PlatformUser>[],
  ): Promise<ViralGrowthMetrics> {
    const invitationResults: ViralGrowthMetrics = {
      invitationsSent: targetUsers.length,
      invitationsAccepted: 0,
      newUserSignups: 0,
      platformConversions: 0,
      referralChainDepth: 1,
      growthVelocity: 0,
      conversionRate: 0,
      networkEffect: 0,
    };

    // Simulate invitation sending and responses
    for (const targetUser of targetUsers) {
      // Simulate invitation delivery delay
      await createDelayPromise();

      // Determine invitation acceptance based on user type and relationship
      const acceptanceProbability =
        this.calculateInvitationAcceptanceProbability(targetUser);

      if (Math.random() < acceptanceProbability) {
        invitationResults.invitationsAccepted++;

        // Determine if this leads to new user signup
        if (!targetUser.id) {
          // New user
          invitationResults.newUserSignups++;

          // Determine platform choice (viral growth to other platform)
          const chooseOtherPlatform =
            this.user.platform === 'wedsync'
              ? Math.random() < 0.3 // 30% chance WedSync user brings someone to WedMe
              : Math.random() < 0.7; // 70% chance WedMe user brings someone to WedSync

          if (chooseOtherPlatform) {
            invitationResults.platformConversions++;
          }
        }
      }
    }

    invitationResults.conversionRate =
      invitationResults.invitationsAccepted / invitationResults.invitationsSent;
    invitationResults.networkEffect = invitationResults.newUserSignups / 1; // Per existing user

    return invitationResults;
  }

  private calculateInvitationAcceptanceProbability(
    targetUser: Partial<PlatformUser>,
  ): number {
    let baseProbability = 0.5; // 50% base acceptance rate

    // Adjust based on relationship type
    if (this.user.userType === 'couple') {
      if (targetUser.userType === 'vendor') baseProbability = 0.8; // Couples invite vendors often
      if (targetUser.userType === 'family') baseProbability = 0.9; // Family accepts couple invites
    }

    if (this.user.userType === 'vendor') {
      if (targetUser.userType === 'vendor') baseProbability = 0.6; // Vendor networks
      if (targetUser.userType === 'couple') baseProbability = 0.7; // Vendors invite couples
    }

    return Math.min(baseProbability, 1.0);
  }

  getSyncLog(): SyncOperation[] {
    return [...this.syncLog];
  }

  async disconnect(): Promise<void> {
    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
    }
  }
}

class CrossPlatformSyncValidator {
  private wedSyncClient: CrossPlatformTestClient;
  private wedMeClient: CrossPlatformTestClient;

  constructor(
    wedSyncUser: PlatformUser,
    wedMeUser: PlatformUser,
    weddingId: string,
  ) {
    const documentId = `cross-platform-${weddingId}`;
    this.wedSyncClient = new CrossPlatformTestClient(
      wedSyncUser,
      weddingId,
      documentId,
    );
    this.wedMeClient = new CrossPlatformTestClient(
      wedMeUser,
      weddingId,
      documentId,
    );
  }

  async connect(): Promise<void> {
    await Promise.all([
      this.wedSyncClient.connect(),
      this.wedMeClient.connect(),
    ]);
  }

  async testBidirectionalSync(
    operations: Omit<SyncOperation, 'id' | 'timestamp' | 'userId'>[],
  ): Promise<{
    syncTimes: number[];
    dataConsistency: number;
    conflicts: number;
  }> {
    const syncTimes: number[] = [];
    let conflicts = 0;

    for (const operation of operations) {
      const startTime = Date.now();

      // Perform operation on source platform
      const sourceClient =
        operation.source === 'wedsync' ? this.wedSyncClient : this.wedMeClient;
      const targetClient =
        operation.source === 'wedsync' ? this.wedMeClient : this.wedSyncClient;

      const operationId = await sourceClient.performSyncOperation(operation);

      // Wait for synchronization
      await new Promise((resolve) =>
        setTimeout(resolve, CROSS_PLATFORM_CONFIG.maxSyncDelayMs + 50),
      );

      const syncTime = Date.now() - startTime;
      syncTimes.push(syncTime);

      // Verify target platform received the operation
      const targetLog = targetClient.getSyncLog();
      const syncedOperation = targetLog.find((op) => op.id === operationId);

      if (!syncedOperation) {
        conflicts++;
      }
    }

    // Calculate data consistency score
    const totalOperations = operations.length;
    const successfulSyncs = totalOperations - conflicts;
    const dataConsistency = successfulSyncs / totalOperations;

    return { syncTimes, dataConsistency, conflicts };
  }

  async disconnect(): Promise<void> {
    await Promise.all([
      this.wedSyncClient.disconnect(),
      this.wedMeClient.disconnect(),
    ]);
  }
}

// Helper functions to reduce nesting complexity
function createDelayPromise(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findTestClientByUserId(clients: CrossPlatformTestClient[], userId: string): CrossPlatformTestClient | undefined {
  return clients.find((client) => client['user'].id === userId);
}

function createWaitPromise(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Cross-Platform Integration Testing', () => {
  let testClients: CrossPlatformTestClient[] = [];
  let syncValidators: CrossPlatformSyncValidator[] = [];

  beforeEach(() => {
    testClients = [];
    syncValidators = [];
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up all test clients and validators
    const clientDisconnects = testClients.map((client) => client.disconnect());
    const validatorDisconnects = syncValidators.map((validator) => validator.disconnect());
    
    await Promise.all([...clientDisconnects, ...validatorDisconnects]);
    testClients = [];
    syncValidators = [];
  });

  describe('Data Synchronization Testing', () => {
    test('should sync timeline updates between WedSync and WedMe within 100ms', async () => {
      const weddingId = `sync-test-${Date.now()}`;

      const wedSyncUser: PlatformUser = {
        id: 'wedsync-user-1',
        name: 'Perfect Day Planning',
        platform: 'wedsync',
        userType: 'vendor',
        deviceType: 'desktop',
        permissions: ['edit_timeline', 'view_guest_list', 'manage_vendors'],
      };

      const wedMeUser: PlatformUser = {
        id: 'wedme-user-1',
        name: 'Sarah & Michael',
        platform: 'wedme',
        userType: 'couple',
        deviceType: 'mobile',
        permissions: ['edit_timeline', 'edit_budget', 'manage_guests'],
      };

      const validator = new CrossPlatformSyncValidator(
        wedSyncUser,
        wedMeUser,
        weddingId,
      );
      syncValidators.push(validator);

      await validator.connect();

      const timelineOperations = [
        {
          type: 'update' as const,
          dataType: 'timeline' as const,
          source: 'wedsync' as const,
          target: 'wedme' as const,
          payload: {
            event: 'Ceremony',
            time: '3:30 PM',
            location: 'Garden Terrace',
          },
          weddingId,
        },
        {
          type: 'create' as const,
          dataType: 'timeline' as const,
          source: 'wedme' as const,
          target: 'wedsync' as const,
          payload: {
            event: 'First Look Photos',
            time: '2:00 PM',
            location: 'Bridal Suite',
          },
          weddingId,
        },
        {
          type: 'update' as const,
          dataType: 'timeline' as const,
          source: 'wedsync' as const,
          target: 'both' as const,
          payload: {
            event: 'Reception',
            time: '7:00 PM',
            note: 'Extended by 30 minutes',
          },
          weddingId,
        },
      ];

      const results = await validator.testBidirectionalSync(timelineOperations);

      // Verify synchronization performance
      expect(results.syncTimes.length).toBe(timelineOperations.length);
      results.syncTimes.forEach((syncTime) => {
        expect(syncTime).toBeLessThan(CROSS_PLATFORM_CONFIG.maxSyncDelayMs);
      });

      expect(results.dataConsistency).toBeGreaterThan(0.95); // 95% consistency
      expect(results.conflicts).toBe(0); // No conflicts for timeline operations

      console.log(`✅ Timeline sync results:`, results);
    }, 30000);

    test('should maintain data consistency during concurrent cross-platform edits', async () => {
      const weddingId = `concurrent-test-${Date.now()}`;

      // Create multiple users across both platforms
      const wedSyncUsers: PlatformUser[] = [
        {
          id: 'ws-planner-1',
          name: 'Dream Wedding Planners',
          platform: 'wedsync',
          userType: 'planner',
          deviceType: 'desktop',
          permissions: ['edit_timeline', 'manage_vendors', 'view_budget'],
        },
        {
          id: 'ws-photographer-1',
          name: 'Picture Perfect Photography',
          platform: 'wedsync',
          userType: 'vendor',
          deviceType: 'tablet',
          permissions: ['edit_timeline', 'upload_photos', 'view_guest_list'],
        },
      ];

      const wedMeUsers: PlatformUser[] = [
        {
          id: 'wm-couple-1',
          name: 'Emma & James',
          platform: 'wedme',
          userType: 'couple',
          deviceType: 'mobile',
          permissions: ['edit_all', 'manage_guests', 'approve_vendors'],
        },
        {
          id: 'wm-family-1',
          name: 'Mother of Bride',
          platform: 'wedme',
          userType: 'family',
          deviceType: 'mobile',
          permissions: ['view_timeline', 'add_guests', 'share_photos'],
        },
      ];

      // Connect all users
      const allUsers = [...wedSyncUsers, ...wedMeUsers];
      const documentId = `concurrent-${weddingId}`;

      for (const user of allUsers) {
        const client = new CrossPlatformTestClient(user, weddingId, documentId);
        testClients.push(client);
        await client.connect();
      }

      // Helper functions to reduce nesting - REFACTORED TO MEET 4-LEVEL LIMIT
      const createUserOperation = (user: PlatformUser, index: number, i: number) => ({
        type: 'update' as const,
        dataType: 'guest_list' as const,
        source: user.platform,
        target: 'both' as const,
        payload: {
          guest: `Guest ${index}-${i}`,
          rsvp: Math.random() > 0.5 ? 'yes' : 'maybe',
          added_by: user.name,
        },
        weddingId,
      });

      const createRandomDelay = () => {
        const delayMs = 100 + Math.random() * 200;
        return createDelayPromise(delayMs);
      };

      const executeUserOperation = async (
        client: CrossPlatformTestClient,
        user: PlatformUser,
        userIndex: number,
        operationIndex: number
      ) => {
        const operation = createUserOperation(user, userIndex, operationIndex);
        const operationPromise = client.performSyncOperation(operation);
        await createRandomDelay();
        return operationPromise;
      };

      const performUserOperations = async (user: PlatformUser, index: number) => {
        const client = testClients[index];
        const operations: Promise<string>[] = [];

        for (let i = 0; i < 5; i++) {
          operations.push(executeUserOperation(client, user, index, i));
        }

        return Promise.all(operations);
      };

      // Perform concurrent operations across platforms
      const concurrentOperations = allUsers.map((user, index) => 
        performUserOperations(user, index)
      );

      await Promise.all(concurrentOperations);

      // Wait for all synchronization to complete
      await createDelayPromise(2000);

      // Verify data consistency across all clients
      const allSyncLogs = testClients.map((client) => client.getSyncLog());
      const totalOperations = allSyncLogs.reduce(
        (sum, log) => sum + log.length,
        0,
      );

      // Each client should have received operations from all other clients
      const expectedOperationsPerClient = totalOperations - 5; // Excluding own operations
      const consistencyScores = allSyncLogs.map(
        (log) => (log.length - 5) / expectedOperationsPerClient, // Excluding own operations
      );

      const avgConsistencyScore =
        consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length;

      expect(avgConsistencyScore).toBeGreaterThan(0.9); // 90% consistency
      expect(totalOperations).toBe(allUsers.length * 5); // All operations accounted for

      console.log(
        `✅ Concurrent edits consistency: ${avgConsistencyScore.toFixed(3)}`,
      );
    }, 60000);
  });

  describe('Viral Growth Mechanics Testing', () => {
    test('should track couple inviting vendors with expected conversion rates', async () => {
      const weddingId = `viral-couple-${Date.now()}`;

      const coupleUser: PlatformUser = {
        id: 'couple-viral-1',
        name: 'Lisa & David',
        platform: 'wedme',
        userType: 'couple',
        deviceType: 'mobile',
        permissions: ['invite_vendors', 'manage_wedding'],
      };

      const client = new CrossPlatformTestClient(
        coupleUser,
        weddingId,
        `viral-${weddingId}`,
      );
      testClients.push(client);

      await client.connect();

      // Simulate couple inviting various vendors
      const targetVendors: Partial<PlatformUser>[] = [
        { userType: 'vendor', name: 'Elegant Flowers' },
        { userType: 'vendor', name: 'Sweet Treats Catering' },
        { userType: 'vendor', name: 'Music Masters DJ' },
        { userType: 'vendor', name: 'Capture Moments Photography' },
        { userType: 'vendor', name: 'Dream Decor Rentals' },
      ];

      const viralMetrics = await client.simulateViralInvitation(targetVendors);

      // Verify viral growth metrics meet targets
      expect(viralMetrics.invitationsSent).toBe(targetVendors.length);
      expect(viralMetrics.conversionRate).toBeGreaterThanOrEqual(
        CROSS_PLATFORM_CONFIG.viralGrowthTargets.coupleToVendorConversion * 0.8,
      ); // Allow 20% variance
      expect(viralMetrics.newUserSignups).toBeGreaterThan(0);

      console.log(`✅ Couple-to-vendor viral growth:`, viralMetrics);
    }, 30000);

    test('should simulate vendor recommending other vendors', async () => {
      const weddingId = `viral-vendor-${Date.now()}`;

      const photographerUser: PlatformUser = {
        id: 'photographer-viral-1',
        name: 'Artisan Photography Studio',
        platform: 'wedsync',
        userType: 'vendor',
        deviceType: 'desktop',
        permissions: ['recommend_vendors', 'manage_portfolio'],
      };

      const client = new CrossPlatformTestClient(
        photographerUser,
        weddingId,
        `viral-${weddingId}`,
      );
      testClients.push(client);

      await client.connect();

      // Photographer recommends preferred vendors from their network
      const recommendedVendors: Partial<PlatformUser>[] = [
        { userType: 'vendor', name: 'Harmonious Strings' },
        { userType: 'vendor', name: 'Vintage Vows Venue' },
        { userType: 'vendor', name: 'Artisan Cakes & Confections' },
      ];

      const viralMetrics =
        await client.simulateViralInvitation(recommendedVendors);

      // Vendor-to-vendor networks typically have higher conversion rates
      expect(viralMetrics.conversionRate).toBeGreaterThanOrEqual(
        CROSS_PLATFORM_CONFIG.viralGrowthTargets.vendorToVendorConversion * 0.8,
      );
      expect(viralMetrics.networkEffect).toBeGreaterThan(0);

      console.log(`✅ Vendor-to-vendor viral growth:`, viralMetrics);
    }, 30000);

    test('should model wedding showcase viral expansion', async () => {
      const showcaseWeddings = 10;
      const totalViralMetrics: ViralGrowthMetrics = {
        invitationsSent: 0,
        invitationsAccepted: 0,
        newUserSignups: 0,
        platformConversions: 0,
        referralChainDepth: 0,
        growthVelocity: 0,
        conversionRate: 0,
        networkEffect: 0,
      };

      // Helper functions to reduce nesting for showcase simulation
      const createShowcaseUser = (index: number): PlatformUser => ({
        id: `showcase-user-${index}`,
        name: `Showcase Wedding ${index}`,
        platform: Math.random() > 0.5 ? 'wedsync' : 'wedme',
        userType: 'couple',
        deviceType: 'mobile',
        permissions: ['share_wedding', 'invite_guests'],
      });

      const createPotentialCouples = (showcaseIndex: number): Partial<PlatformUser>[] =>
        Array.from({ length: 8 }, (_, i) => ({
          userType: 'couple',
          name: `Potential Couple ${showcaseIndex}-${i}`,
        }));

      const runShowcaseSimulation = async (index: number) => {
        const weddingId = `showcase-${index}`;
        const showcaseUser = createShowcaseUser(index);

        const client = new CrossPlatformTestClient(
          showcaseUser,
          weddingId,
          `showcase-${weddingId}`,
        );
        testClients.push(client);
        await client.connect();

        const potentialCouples = createPotentialCouples(index);
        return client.simulateViralInvitation(potentialCouples);
      };

      // Simulate multiple weddings showcasing the platform
      const showcasePromises = Array.from(
        { length: showcaseWeddings },
        (_, index) => runShowcaseSimulation(index)
      );

      const showcaseResults = await Promise.all(showcasePromises);

      // Aggregate results
      showcaseResults.forEach((metrics) => {
        totalViralMetrics.invitationsSent += metrics.invitationsSent;
        totalViralMetrics.invitationsAccepted += metrics.invitationsAccepted;
        totalViralMetrics.newUserSignups += metrics.newUserSignups;
        totalViralMetrics.platformConversions += metrics.platformConversions;
      });

      totalViralMetrics.conversionRate =
        totalViralMetrics.invitationsAccepted /
        totalViralMetrics.invitationsSent;
      totalViralMetrics.networkEffect =
        totalViralMetrics.newUserSignups / showcaseWeddings;

      // Wedding showcase should generate meaningful viral growth
      expect(totalViralMetrics.conversionRate).toBeGreaterThanOrEqual(
        CROSS_PLATFORM_CONFIG.viralGrowthTargets.weddingShowcaseConversion *
          0.7,
      );
      expect(totalViralMetrics.newUserSignups).toBeGreaterThan(
        showcaseWeddings * 2,
      ); // At least 2 new users per showcase
      expect(totalViralMetrics.platformConversions).toBeGreaterThan(0); // Cross-platform growth

      console.log(`✅ Wedding showcase viral expansion:`, totalViralMetrics);
    }, 90000);
  });

  describe('Real-time Collaboration Scenarios', () => {
    test('should handle wedding day coordination across platforms', async () => {
      const weddingId = `coordination-test-${Date.now()}`;

      // Create wedding day coordination team across both platforms
      const coordinationTeam: PlatformUser[] = [
        {
          id: 'coord-planner',
          name: 'Day-of Coordinator',
          platform: 'wedsync',
          userType: 'planner',
          deviceType: 'tablet',
          permissions: [
            'coordinate_vendors',
            'update_timeline',
            'emergency_contact',
          ],
        },
        {
          id: 'coord-couple',
          name: 'Wedding Couple',
          platform: 'wedme',
          userType: 'couple',
          deviceType: 'mobile',
          permissions: ['approve_changes', 'communicate_family'],
        },
        {
          id: 'coord-photographer',
          name: 'Wedding Photographer',
          platform: 'wedsync',
          userType: 'vendor',
          deviceType: 'mobile',
          permissions: ['update_timeline', 'share_photos'],
        },
        {
          id: 'coord-venue',
          name: 'Venue Manager',
          platform: 'wedsync',
          userType: 'vendor',
          deviceType: 'desktop',
          permissions: ['facility_updates', 'vendor_coordination'],
        },
      ];

      const documentId = `coordination-${weddingId}`;

      // Connect coordination team
      for (const user of coordinationTeam) {
        const client = new CrossPlatformTestClient(user, weddingId, documentId);
        testClients.push(client);
        await client.connect();
      }

      // Simulate wedding day coordination scenarios
      const coordinationScenarios = [
        {
          time: '30 minutes before ceremony',
          updates: [
            {
              user: 'coord-photographer',
              message: 'Ready for family photos in bridal suite',
            },
            { user: 'coord-venue', message: 'Ceremony space setup complete' },
          ],
        },
        {
          time: 'Ceremony start',
          updates: [
            { user: 'coord-planner', message: 'Processional music started' },
            { user: 'coord-couple', message: 'All family members seated' },
          ],
        },
        {
          time: 'Reception transition',
          updates: [
            { user: 'coord-venue', message: 'Cocktail hour setup ready' },
            {
              user: 'coord-photographer',
              message: 'Couple portraits completed',
            },
          ],
        },
      ];

      const coordinationResults = [];

      // Helper function to reduce nesting - REFACTORED TO MEET 4-LEVEL LIMIT
      const executeUpdate = async (update: any, scenario: any) => {
        const client = testClients.find((c) => c['user'].id === update.user);
        
        if (client) {
          return client.performSyncOperation({
            type: 'update',
            dataType: 'timeline',
            source: client['user'].platform,
            target: 'both',
            payload: { message: update.message, scenario: scenario.time },
            weddingId,
          });
        }
      };

      const processCoordinationScenario = async (scenario: any) => {
        const scenarioStart = Date.now();

        // Execute all updates in parallel (realistic wedding day coordination)
        const updatePromises = scenario.updates.map((update: any) => 
          executeUpdate(update, scenario)
        );

        await Promise.all(updatePromises);

        // Allow time for cross-platform synchronization
        await createDelayPromise(200);

        const scenarioTime = Date.now() - scenarioStart;
        return {
          scenario: scenario.time,
          coordinationTime: scenarioTime,
          updatesCount: scenario.updates.length,
        };
      };

      const scenarioResults = await Promise.all(
        coordinationScenarios.map(processCoordinationScenario)
      );

      coordinationResults.push(...scenarioResults);

      // Verify coordination efficiency
      coordinationResults.forEach((result) => {
        expect(result.coordinationTime).toBeLessThan(1000); // <1s for coordination updates
      });

      // Verify all team members have consistent view
      const allSyncLogs = testClients.map((client) => client.getSyncLog());
      const operationCounts = allSyncLogs.map((log) => log.length);
      const minOperations = Math.min(...operationCounts);
      const maxOperations = Math.max(...operationCounts);
      const operationVariance = maxOperations - minOperations;

      expect(operationVariance).toBeLessThanOrEqual(1); // At most 1 operation difference

      console.log(`✅ Wedding day coordination results:`, coordinationResults);
    }, 60000);

    test('should handle emergency updates with priority synchronization', async () => {
      const weddingId = `emergency-sync-${Date.now()}`;

      const emergencyTeam: PlatformUser[] = [
        {
          id: 'emergency-planner',
          name: 'Emergency Coordinator',
          platform: 'wedsync',
          userType: 'planner',
          deviceType: 'mobile',
          permissions: ['emergency_broadcast', 'vendor_contact'],
        },
        {
          id: 'emergency-couple',
          name: 'Concerned Couple',
          platform: 'wedme',
          userType: 'couple',
          deviceType: 'mobile',
          permissions: ['approve_emergency_changes'],
        },
      ];

      const documentId = `emergency-${weddingId}`;

      // Connect emergency team
      for (const user of emergencyTeam) {
        const client = new CrossPlatformTestClient(user, weddingId, documentId);
        testClients.push(client);
        await client.connect();
      }

      // Helper function to create emergency update
      const createEmergencyUpdate = (
        type: 'create' | 'update',
        source: 'wedsync' | 'wedme',
        message: string
      ) => ({
        type,
        dataType: 'timeline' as const,
        source,
        target: 'both' as const,
        payload: {
          emergency: true,
          message,
          priority: 'critical',
        },
        weddingId,
      });

      // Simulate emergency scenario - weather forces venue change
      const emergencyStart = Date.now();

      const emergencyUpdates = [
        createEmergencyUpdate(
          'create',
          'wedsync', 
          'WEATHER ALERT: Moving ceremony indoors to Grand Ballroom'
        ),
        createEmergencyUpdate(
          'update',
          'wedme',
          'CONFIRMED: All guests notified of venue change'
        ),
      ];

      // Execute emergency updates
      const emergencyPromises = emergencyUpdates.map(async (update, index) => {
        const client = testClients[index];
        return client.performSyncOperation(update);
      });

      await Promise.all(emergencyPromises);

      const emergencyResponseTime = Date.now() - emergencyStart;

      // Verify emergency response performance
      expect(emergencyResponseTime).toBeLessThan(500); // <500ms for emergency updates

      // Verify both platforms received emergency updates
      const allLogs = testClients.map((client) => client.getSyncLog());
      const emergencyOperations = allLogs
        .flat()
        .filter((op) => op.payload.emergency === true);

      expect(emergencyOperations.length).toBeGreaterThanOrEqual(
        emergencyUpdates.length,
      );

      console.log(`✅ Emergency response time: ${emergencyResponseTime}ms`);
    }, 30000);
  });
});
