import { WebClient } from '@slack/web-api';
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthProvider } from '@azure/msal-node';
import {
  PresenceState,
  SlackOAuth,
  SlackStatus,
  TeamsWebhook,
  SlackStatusWebhook,
  IntegrationHealthStatus,
  OAuth2Credentials,
} from '@/types/presence';
import {
  logIntegrationActivity,
  logIntegrationError,
} from '@/lib/integrations/audit-logger';
import {
  encryptIntegrationData,
  decryptIntegrationData,
} from '@/lib/security/encryption';
import { updateUserPresence } from '@/lib/presence/presence-manager';

// Communication Platform Presence Bridge
export class CommunicationPresenceBridge {
  private slackClients: Map<string, WebClient> = new Map();
  private teamsClients: Map<string, Client> = new Map();

  constructor() {
    // Initialize any required configurations
  }

  /**
   * Set up Slack integration for a user
   */
  async setupSlackIntegration(
    userId: string,
    credentials: SlackOAuth,
  ): Promise<void> {
    try {
      const slackClient = new WebClient(credentials.accessToken);

      // Test the connection
      const authTest = await slackClient.auth.test();
      if (!authTest.ok) {
        throw new Error('Slack authentication failed');
      }

      // Store credentials securely
      const encryptedCredentials = encryptIntegrationData(credentials);
      await this.storeSlackCredentials(userId, encryptedCredentials);

      // Cache client for future use
      this.slackClients.set(userId, slackClient);

      await logIntegrationActivity(userId, 'slack_setup', {
        teamId: credentials.teamId,
        scope: credentials.scope,
        status: 'success',
      });
    } catch (error) {
      await logIntegrationError(userId, 'slack_setup_failed', error);
      throw error;
    }
  }

  /**
   * Synchronize WedSync presence to Slack status
   */
  async syncSlackStatus(
    userId: string,
    presence: PresenceState,
  ): Promise<void> {
    try {
      const slackClient = await this.getSlackClient(userId);
      if (!slackClient) {
        console.warn(`No Slack client found for user ${userId}`);
        return;
      }

      const slackStatus = this.mapPresenceToSlackStatus(presence);

      // Update Slack user profile status
      const result = await slackClient.users.profile.set({
        profile: JSON.stringify({
          status_text: slackStatus.text,
          status_emoji: slackStatus.emoji,
          status_expiration: slackStatus.expiration || 0,
        }),
      });

      if (!result.ok) {
        throw new Error(`Slack status update failed: ${result.error}`);
      }

      await logIntegrationActivity(userId, 'slack_status_update', {
        status: slackStatus.text,
        emoji: slackStatus.emoji,
        success: true,
      });
    } catch (error) {
      await logIntegrationError(userId, 'slack_sync_failed', error);
      throw error;
    }
  }

  /**
   * Handle incoming Slack status change webhook
   */
  async handleSlackStatusChange(webhook: SlackStatusWebhook): Promise<void> {
    try {
      // Validate webhook token
      if (!this.validateSlackWebhook(webhook)) {
        throw new Error('Invalid Slack webhook signature');
      }

      const userId = await this.getUserIdFromSlackEvent(webhook);
      if (!userId) {
        console.warn('Could not map Slack user to WedSync user');
        return;
      }

      // Map Slack presence to WedSync presence
      const presenceUpdate = this.mapSlackPresenceToWedSync(
        webhook.event.presence,
      );

      // Update WedSync presence
      await updateUserPresence(userId, {
        ...presenceUpdate,
        lastActivity: new Date(),
        isManualOverride: false,
      });

      await logIntegrationActivity(userId, 'slack_presence_received', {
        slackPresence: webhook.event.presence,
        wedSyncStatus: presenceUpdate.status,
      });
    } catch (error) {
      console.error('Slack webhook processing failed:', error);
      await logIntegrationError('unknown', 'slack_webhook_failed', error);
    }
  }

  /**
   * Set up Microsoft Teams integration
   */
  async setupTeamsIntegration(
    userId: string,
    credentials: OAuth2Credentials,
  ): Promise<void> {
    try {
      const authProvider = this.createTeamsAuthProvider(credentials);
      const graphClient = Client.initWithMiddleware({ authProvider });

      // Test the connection
      await graphClient.api('/me').get();

      // Store credentials securely
      const encryptedCredentials = encryptIntegrationData(credentials);
      await this.storeTeamsCredentials(userId, encryptedCredentials);

      // Cache client
      this.teamsClients.set(userId, graphClient);

      // Subscribe to presence changes
      await this.createTeamsPresenceSubscription(userId, graphClient);

      await logIntegrationActivity(userId, 'teams_setup', {
        scope: credentials.scope,
        status: 'success',
      });
    } catch (error) {
      await logIntegrationError(userId, 'teams_setup_failed', error);
      throw error;
    }
  }

  /**
   * Synchronize WedSync presence to Microsoft Teams
   */
  async syncTeamsPresence(
    userId: string,
    presence: PresenceState,
  ): Promise<void> {
    try {
      const teamsClient = await this.getTeamsClient(userId);
      if (!teamsClient) {
        console.warn(`No Teams client found for user ${userId}`);
        return;
      }

      const teamsPresence = this.mapPresenceToTeamsStatus(presence);

      // Update Teams presence
      await teamsClient.api('/me/presence/setPresence').post({
        sessionId: `wedsync-${userId}`,
        availability: teamsPresence.availability,
        activity: teamsPresence.activity,
      });

      await logIntegrationActivity(userId, 'teams_presence_update', {
        availability: teamsPresence.availability,
        activity: teamsPresence.activity,
        success: true,
      });
    } catch (error) {
      await logIntegrationError(userId, 'teams_sync_failed', error);
      throw error;
    }
  }

  /**
   * Handle Teams presence webhook
   */
  async handleTeamsPresenceWebhook(webhook: TeamsWebhook): Promise<void> {
    try {
      // Validate webhook subscription
      if (!this.validateTeamsWebhook(webhook)) {
        throw new Error('Invalid Teams webhook');
      }

      const userId = await this.getUserIdFromTeamsWebhook(webhook);
      if (!userId) {
        console.warn('Could not map Teams user to WedSync user');
        return;
      }

      const presence = webhook.resourceData.presence;
      if (!presence) {
        return;
      }

      // Map Teams presence to WedSync
      const presenceUpdate = this.mapTeamsPresenceToWedSync(presence);

      await updateUserPresence(userId, {
        ...presenceUpdate,
        lastActivity: new Date(),
        isManualOverride: false,
      });

      await logIntegrationActivity(userId, 'teams_presence_received', {
        teamsAvailability: presence.availability,
        teamsActivity: presence.activity,
        wedSyncStatus: presenceUpdate.status,
      });
    } catch (error) {
      console.error('Teams webhook processing failed:', error);
      await logIntegrationError('unknown', 'teams_webhook_failed', error);
    }
  }

  /**
   * Update WhatsApp Business status
   */
  async updateWhatsAppBusinessStatus(
    userId: string,
    presence: PresenceState,
  ): Promise<void> {
    try {
      // WhatsApp Business API integration would go here
      // This is a simplified placeholder
      const whatsAppStatus = this.mapPresenceToWhatsAppStatus(presence);

      // Update WhatsApp Business Profile status
      await this.updateWhatsAppBusinessProfile(userId, whatsAppStatus);

      await logIntegrationActivity(userId, 'whatsapp_status_update', {
        status: whatsAppStatus,
        success: true,
      });
    } catch (error) {
      await logIntegrationError(userId, 'whatsapp_sync_failed', error);
      throw error;
    }
  }

  /**
   * Check health of all integrations for a user
   */
  async checkIntegrationHealth(
    userId: string,
  ): Promise<IntegrationHealthStatus[]> {
    const healthStatuses: IntegrationHealthStatus[] = [];

    // Check Slack health
    try {
      const slackClient = await this.getSlackClient(userId);
      if (slackClient) {
        const start = Date.now();
        const result = await slackClient.auth.test();
        const responseTime = Date.now() - start;

        healthStatuses.push({
          provider: 'slack',
          status: result.ok ? 'healthy' : 'failed',
          lastCheck: new Date(),
          responseTime,
          successRate: result.ok ? 1 : 0,
        });
      }
    } catch (error) {
      healthStatuses.push({
        provider: 'slack',
        status: 'failed',
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Check Teams health
    try {
      const teamsClient = await this.getTeamsClient(userId);
      if (teamsClient) {
        const start = Date.now();
        await teamsClient.api('/me').get();
        const responseTime = Date.now() - start;

        healthStatuses.push({
          provider: 'teams',
          status: 'healthy',
          lastCheck: new Date(),
          responseTime,
          successRate: 1,
        });
      }
    } catch (error) {
      healthStatuses.push({
        provider: 'teams',
        status: 'failed',
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return healthStatuses;
  }

  // Private helper methods
  private mapPresenceToSlackStatus(presence: PresenceState): SlackStatus {
    const statusMapping = {
      online: {
        emoji: ':green_heart:',
        text: presence.customStatus || 'Available for wedding coordination',
      },
      busy: {
        emoji: ':wedding:',
        text: presence.customStatus || 'In wedding meeting',
      },
      idle: {
        emoji: ':coffee:',
        text: 'Away from desk',
      },
      away: {
        emoji: ':calendar:',
        text: 'Not available',
      },
      offline: {
        emoji: '',
        text: '',
      },
    };

    const mapped = statusMapping[presence.status];

    return {
      ...mapped,
      expiration:
        presence.status === 'busy' && presence.customStatus
          ? Date.now() + 2 * 60 * 60 * 1000
          : undefined, // 2 hours
    };
  }

  private mapSlackPresenceToWedSync(
    slackPresence: string,
  ): Partial<PresenceState> {
    const presenceMapping: Record<string, PresenceState['status']> = {
      active: 'online',
      away: 'away',
    };

    return {
      status: presenceMapping[slackPresence] || 'online',
    };
  }

  private mapPresenceToTeamsStatus(presence: PresenceState) {
    const statusMapping = {
      online: { availability: 'Available', activity: 'Available' },
      busy: { availability: 'Busy', activity: 'InACall' },
      idle: { availability: 'Away', activity: 'Away' },
      away: { availability: 'Away', activity: 'Away' },
      offline: { availability: 'Offline', activity: 'Offline' },
    };

    return statusMapping[presence.status];
  }

  private mapTeamsPresenceToWedSync(
    teamsPresence: any,
  ): Partial<PresenceState> {
    const availabilityMapping: Record<string, PresenceState['status']> = {
      Available: 'online',
      Busy: 'busy',
      DoNotDisturb: 'busy',
      Away: 'away',
      BeRightBack: 'away',
      Offline: 'offline',
    };

    return {
      status: availabilityMapping[teamsPresence.availability] || 'online',
    };
  }

  private mapPresenceToWhatsAppStatus(presence: PresenceState): string {
    const statusMapping = {
      online: 'Available for wedding coordination',
      busy: presence.customStatus || 'In meeting - urgent only',
      idle: 'Away from desk',
      away: 'Not available',
      offline: 'Offline',
    };

    return statusMapping[presence.status];
  }

  private validateSlackWebhook(webhook: SlackStatusWebhook): boolean {
    // Implement Slack webhook signature validation
    const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
    return !!slackSigningSecret; // Simplified validation
  }

  private validateTeamsWebhook(webhook: TeamsWebhook): boolean {
    // Implement Teams webhook validation
    return webhook.subscriptionId && webhook.changeType === 'updated';
  }

  private async getSlackClient(userId: string): Promise<WebClient | null> {
    if (this.slackClients.has(userId)) {
      return this.slackClients.get(userId)!;
    }

    // Try to load from database
    const credentials = await this.getSlackCredentials(userId);
    if (credentials) {
      const client = new WebClient(credentials.accessToken);
      this.slackClients.set(userId, client);
      return client;
    }

    return null;
  }

  private async getTeamsClient(userId: string): Promise<Client | null> {
    if (this.teamsClients.has(userId)) {
      return this.teamsClients.get(userId)!;
    }

    // Try to load from database
    const credentials = await this.getTeamsCredentials(userId);
    if (credentials) {
      const authProvider = this.createTeamsAuthProvider(credentials);
      const client = Client.initWithMiddleware({ authProvider });
      this.teamsClients.set(userId, client);
      return client;
    }

    return null;
  }

  private createTeamsAuthProvider(
    credentials: OAuth2Credentials,
  ): AuthProvider {
    // Create MSAL auth provider for Teams/Graph API
    return {
      getAccessToken: async () => {
        // Handle token refresh if needed
        return credentials.accessToken;
      },
    };
  }

  private async createTeamsPresenceSubscription(
    userId: string,
    client: Client,
  ): Promise<void> {
    // Create Microsoft Graph subscription for presence changes
    await client.api('/subscriptions').post({
      changeType: 'updated',
      notificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/teams-presence`,
      resource: '/me/presence',
      expirationDateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      clientState: userId,
    });
  }

  private async updateWhatsAppBusinessProfile(
    userId: string,
    status: string,
  ): Promise<void> {
    // WhatsApp Business API integration would go here
    console.log(`Updating WhatsApp status for user ${userId}: ${status}`);
  }

  private async storeSlackCredentials(
    userId: string,
    credentials: string,
  ): Promise<void> {
    // Database storage implementation
    console.log(`Storing Slack credentials for user ${userId}`);
  }

  private async storeTeamsCredentials(
    userId: string,
    credentials: string,
  ): Promise<void> {
    // Database storage implementation
    console.log(`Storing Teams credentials for user ${userId}`);
  }

  private async getSlackCredentials(
    userId: string,
  ): Promise<SlackOAuth | null> {
    // Database retrieval implementation
    return null;
  }

  private async getTeamsCredentials(
    userId: string,
  ): Promise<OAuth2Credentials | null> {
    // Database retrieval implementation
    return null;
  }

  private async getUserIdFromSlackEvent(
    webhook: SlackStatusWebhook,
  ): Promise<string | null> {
    // Map Slack user ID to WedSync user ID
    return null;
  }

  private async getUserIdFromTeamsWebhook(
    webhook: TeamsWebhook,
  ): Promise<string | null> {
    // Map Teams user ID to WedSync user ID
    return null;
  }
}

// Export singleton instance
export const communicationBridge = new CommunicationPresenceBridge();
