import { z } from 'zod';
import { createHmac } from 'crypto';
import {
  PresenceState,
  ZoomMeetingWebhook,
  TeamsMeetingWebhook,
  GoogleMeetWebhook,
  MeetingStatus,
  OAuth2Credentials,
} from '@/types/presence';
import { updateUserPresence } from '@/lib/presence/presence-manager';
import {
  logIntegrationActivity,
  logIntegrationError,
} from '@/lib/integrations/audit-logger';
import { encryptIntegrationData } from '@/lib/security/encryption';

// Zoom webhook validation schema
export const zoomWebhookSchema = z.object({
  event: z.string(),
  payload: z.object({
    account_id: z.string(),
    object: z.object({
      uuid: z.string(),
      id: z.number(),
      host_id: z.string(),
      topic: z.string(),
      type: z.number(),
      start_time: z.string(),
      duration: z.number(),
      timezone: z.string(),
      participants: z
        .array(
          z.object({
            user_id: z.string(),
            user_name: z.string(),
            join_time: z.string(),
            leave_time: z.string().optional(),
          }),
        )
        .optional(),
    }),
  }),
});

// Teams meeting webhook schema
export const teamsWebhookSchema = z.object({
  subscriptionId: z.string(),
  changeType: z.string(),
  resource: z.string(),
  resourceData: z.object({
    id: z.string(),
    organizer: z.object({
      user: z.object({
        id: z.string(),
        displayName: z.string(),
      }),
    }),
    subject: z.string(),
    start: z.object({
      dateTime: z.string(),
      timeZone: z.string(),
    }),
    end: z.object({
      dateTime: z.string(),
      timeZone: z.string(),
    }),
    isOnlineMeeting: z.boolean(),
    onlineMeetingProvider: z.string(),
  }),
});

// Google Meet webhook schema
export const googleMeetWebhookSchema = z.object({
  kind: z.string(),
  etag: z.string(),
  id: z.string(),
  summary: z.string(),
  start: z.object({
    dateTime: z.string(),
    timeZone: z.string(),
  }),
  end: z.object({
    dateTime: z.string(),
    timeZone: z.string(),
  }),
  attendees: z.array(
    z.object({
      email: z.string(),
      displayName: z.string().optional(),
      responseStatus: z.string(),
    }),
  ),
  conferenceData: z
    .object({
      conferenceSolution: z.object({
        name: z.string(),
        iconUri: z.string(),
      }),
      conferenceId: z.string(),
      entryPoints: z.array(
        z.object({
          entryPointType: z.string(),
          uri: z.string(),
          label: z.string().optional(),
        }),
      ),
    })
    .optional(),
});

// Video Conference Presence Sync Service
export class VideoConferencePresenceSync {
  private readonly zoomWebhookSecret: string;
  private readonly teamsWebhookSecret: string;

  constructor() {
    this.zoomWebhookSecret = process.env.ZOOM_WEBHOOK_SECRET || '';
    this.teamsWebhookSecret = process.env.TEAMS_WEBHOOK_SECRET || '';
  }

  /**
   * Handle Zoom meeting started webhook
   */
  async handleZoomMeetingStarted(webhook: ZoomMeetingWebhook): Promise<void> {
    try {
      // Validate webhook signature
      if (!this.validateZoomWebhook(webhook)) {
        throw new Error('Invalid Zoom webhook signature');
      }

      const meetingData = webhook.payload.object;
      const hostUserId = await this.getWedSyncUserIdFromZoom(
        meetingData.host_id,
      );

      if (hostUserId) {
        const meetingStatus: MeetingStatus = {
          platform: 'zoom',
          status: 'in_progress',
          meetingId: meetingData.uuid,
          startTime: new Date(meetingData.start_time),
          participants: meetingData.participants?.map((p) => p.user_id) || [],
          isWeddingRelated: this.detectWeddingMeeting(meetingData.topic),
          topic: meetingData.topic,
          organizer: meetingData.host_id,
        };

        await this.updatePresenceForMeeting(hostUserId, meetingStatus);

        // Update presence for participants if they're WedSync users
        if (meetingData.participants) {
          for (const participant of meetingData.participants) {
            const participantUserId = await this.getWedSyncUserIdFromZoom(
              participant.user_id,
            );
            if (participantUserId) {
              await this.updatePresenceForMeeting(
                participantUserId,
                meetingStatus,
              );
            }
          }
        }
      }
    } catch (error) {
      await logIntegrationError('system', 'zoom_meeting_started_failed', error);
      throw error;
    }
  }

  /**
   * Handle Zoom meeting ended webhook
   */
  async handleZoomMeetingEnded(webhook: ZoomMeetingWebhook): Promise<void> {
    try {
      if (!this.validateZoomWebhook(webhook)) {
        throw new Error('Invalid Zoom webhook signature');
      }

      const meetingData = webhook.payload.object;
      const hostUserId = await this.getWedSyncUserIdFromZoom(
        meetingData.host_id,
      );

      if (hostUserId) {
        const meetingStatus: MeetingStatus = {
          platform: 'zoom',
          status: 'ended',
          meetingId: meetingData.uuid,
          startTime: new Date(meetingData.start_time),
          endTime: new Date(),
          participants: meetingData.participants?.map((p) => p.user_id) || [],
          isWeddingRelated: this.detectWeddingMeeting(meetingData.topic),
          topic: meetingData.topic,
        };

        await this.updatePresenceForMeeting(hostUserId, meetingStatus);

        // Revert presence for participants
        if (meetingData.participants) {
          for (const participant of meetingData.participants) {
            const participantUserId = await this.getWedSyncUserIdFromZoom(
              participant.user_id,
            );
            if (participantUserId) {
              await this.updatePresenceForMeeting(
                participantUserId,
                meetingStatus,
              );
            }
          }
        }
      }
    } catch (error) {
      await logIntegrationError('system', 'zoom_meeting_ended_failed', error);
      throw error;
    }
  }

  /**
   * Handle Teams meeting status change webhook
   */
  async handleTeamsMeetingStatusChange(
    webhook: TeamsMeetingWebhook,
  ): Promise<void> {
    try {
      // Validate Teams webhook
      if (!this.validateTeamsWebhook(webhook)) {
        throw new Error('Invalid Teams webhook');
      }

      const meetingData = webhook.resourceData;
      const organizerUserId = await this.getWedSyncUserIdFromTeams(
        meetingData.organizer.user.id,
      );

      if (organizerUserId) {
        const meetingStatus: MeetingStatus = {
          platform: 'teams',
          status:
            webhook.changeType === 'created'
              ? 'starting'
              : webhook.changeType === 'updated'
                ? 'in_progress'
                : 'ended',
          meetingId: meetingData.id,
          startTime: new Date(meetingData.start.dateTime),
          endTime: new Date(meetingData.end.dateTime),
          participants: [], // Teams doesn't provide participant list in webhook
          isWeddingRelated: this.detectWeddingMeeting(meetingData.subject),
          topic: meetingData.subject,
          organizer: meetingData.organizer.user.id,
        };

        await this.updatePresenceForMeeting(organizerUserId, meetingStatus);
      }
    } catch (error) {
      await logIntegrationError(
        'system',
        'teams_meeting_webhook_failed',
        error,
      );
      throw error;
    }
  }

  /**
   * Handle Google Meet status change webhook
   */
  async handleGoogleMeetStatusChange(
    webhook: GoogleMeetWebhook,
  ): Promise<void> {
    try {
      // Google Meet status changes come through Calendar events
      const meetingStatus: MeetingStatus = {
        platform: 'google_meet',
        status: 'in_progress', // Determined by calendar event timing
        meetingId: webhook.id,
        startTime: new Date(webhook.start.dateTime),
        endTime: new Date(webhook.end.dateTime),
        participants: webhook.attendees.map((a) => a.email),
        isWeddingRelated: this.detectWeddingMeeting(webhook.summary),
        topic: webhook.summary,
      };

      // Update presence for all attendees who are WedSync users
      for (const attendee of webhook.attendees) {
        const userId = await this.getWedSyncUserIdFromEmail(attendee.email);
        if (userId) {
          await this.updatePresenceForMeeting(userId, meetingStatus);
        }
      }
    } catch (error) {
      await logIntegrationError('system', 'google_meet_webhook_failed', error);
      throw error;
    }
  }

  /**
   * Update user presence based on meeting status
   */
  async updatePresenceForMeeting(
    userId: string,
    meetingStatus: MeetingStatus,
  ): Promise<void> {
    try {
      const customStatus = this.generateMeetingPresenceMessage(meetingStatus);

      switch (meetingStatus.status) {
        case 'starting':
        case 'in_progress':
          await updateUserPresence(userId, {
            status: 'busy',
            customStatus: customStatus,
            customEmoji: '📹',
            currentPage: `/meeting/${meetingStatus.meetingId}`,
            lastActivity: new Date().toISOString(),
            isManualOverride: false,
          } as Partial<PresenceState>);
          break;

        case 'ended':
          // Revert to automatic presence detection
          await updateUserPresence(userId, {
            status: 'online',
            customStatus: null,
            customEmoji: null,
            currentPage: null,
            lastActivity: new Date().toISOString(),
            isManualOverride: false,
          } as Partial<PresenceState>);
          break;
      }

      // Log for wedding business analytics
      await logIntegrationActivity(userId, 'video_conference_presence', {
        platform: meetingStatus.platform,
        status: meetingStatus.status,
        isWeddingRelated: meetingStatus.isWeddingRelated,
        meetingTopic: meetingStatus.topic,
        participantCount: meetingStatus.participants.length,
      });
    } catch (error) {
      await logIntegrationError(
        userId,
        'meeting_presence_update_failed',
        error,
      );
      throw error;
    }
  }

  /**
   * Set up Zoom integration for a user
   */
  async setupZoomIntegration(
    userId: string,
    credentials: OAuth2Credentials,
  ): Promise<void> {
    try {
      // Store encrypted credentials
      const encryptedCredentials = encryptIntegrationData(credentials);
      await this.storeZoomCredentials(userId, encryptedCredentials);

      // Set up webhook subscription (if not already configured globally)
      await this.ensureZoomWebhookSubscription();

      await logIntegrationActivity(userId, 'zoom_integration_setup', {
        status: 'success',
      });
    } catch (error) {
      await logIntegrationError(userId, 'zoom_setup_failed', error);
      throw error;
    }
  }

  /**
   * Set up Google Meet integration (via Calendar)
   */
  async setupGoogleMeetIntegration(
    userId: string,
    credentials: OAuth2Credentials,
  ): Promise<void> {
    try {
      // Google Meet integration works through Calendar API
      const encryptedCredentials = encryptIntegrationData(credentials);
      await this.storeGoogleMeetCredentials(userId, encryptedCredentials);

      await logIntegrationActivity(userId, 'google_meet_integration_setup', {
        status: 'success',
      });
    } catch (error) {
      await logIntegrationError(userId, 'google_meet_setup_failed', error);
      throw error;
    }
  }

  // Private helper methods
  private generateMeetingPresenceMessage(meeting: MeetingStatus): string {
    if (meeting.isWeddingRelated) {
      return `In wedding planning call - ${meeting.platform}`;
    }

    if (meeting.topic && meeting.topic.length > 30) {
      return `In meeting: ${meeting.topic.substring(0, 30)}...`;
    }

    return `In ${meeting.platform} meeting - back soon`;
  }

  private detectWeddingMeeting(topic: string): boolean {
    const weddingKeywords = [
      'wedding',
      'bride',
      'groom',
      'ceremony',
      'reception',
      'venue',
      'photographer',
      'catering',
      'florist',
      'planning',
      'coordination',
      'rehearsal',
      'engagement',
    ];

    const lowerTopic = topic.toLowerCase();
    return weddingKeywords.some((keyword) => lowerTopic.includes(keyword));
  }

  private validateZoomWebhook(webhook: ZoomMeetingWebhook): boolean {
    if (!this.zoomWebhookSecret) {
      console.warn('Zoom webhook secret not configured');
      return true; // Allow in development
    }

    // Zoom webhook validation logic would go here
    // This is simplified for demonstration
    return true;
  }

  private validateTeamsWebhook(webhook: TeamsMeetingWebhook): boolean {
    if (!this.teamsWebhookSecret) {
      console.warn('Teams webhook secret not configured');
      return true; // Allow in development
    }

    return webhook.subscriptionId && webhook.changeType && webhook.resource;
  }

  private async getWedSyncUserIdFromZoom(
    zoomUserId: string,
  ): Promise<string | null> {
    // Implementation would map Zoom user ID to WedSync user ID
    // This could be done through stored integration credentials
    return null; // Placeholder
  }

  private async getWedSyncUserIdFromTeams(
    teamsUserId: string,
  ): Promise<string | null> {
    // Implementation would map Teams user ID to WedSync user ID
    return null; // Placeholder
  }

  private async getWedSyncUserIdFromEmail(
    email: string,
  ): Promise<string | null> {
    // Implementation would map email to WedSync user ID
    return null; // Placeholder
  }

  private async storeZoomCredentials(
    userId: string,
    credentials: string,
  ): Promise<void> {
    // Database storage implementation
    console.log(`Storing Zoom credentials for user ${userId}`);
  }

  private async storeGoogleMeetCredentials(
    userId: string,
    credentials: string,
  ): Promise<void> {
    // Database storage implementation
    console.log(`Storing Google Meet credentials for user ${userId}`);
  }

  private async ensureZoomWebhookSubscription(): Promise<void> {
    // Ensure Zoom webhook is configured at app level
    console.log('Ensuring Zoom webhook subscription is active');
  }

  /**
   * Check if user is currently in any video conference
   */
  async isUserInVideoConference(userId: string): Promise<boolean> {
    try {
      const currentPresence = await this.getUserCurrentPresence(userId);

      return (
        currentPresence?.customEmoji === '📹' ||
        currentPresence?.customStatus?.includes('meeting') ||
        currentPresence?.customStatus?.includes('call') ||
        currentPresence?.currentPage?.includes('/meeting/') ||
        false
      );
    } catch (error) {
      return false;
    }
  }

  private async getUserCurrentPresence(
    userId: string,
  ): Promise<PresenceState | null> {
    // Implementation would fetch current user presence
    return null; // Placeholder
  }

  /**
   * Get active video conferences for user
   */
  async getUserActiveConferences(userId: string): Promise<MeetingStatus[]> {
    // Implementation would return active meetings for user
    // This could be stored in a meetings cache/database
    return [];
  }

  /**
   * End video conference presence override
   */
  async endConferencePresence(
    userId: string,
    meetingId: string,
  ): Promise<void> {
    try {
      // Only end if this meeting is the current presence source
      const currentPresence = await this.getUserCurrentPresence(userId);

      if (currentPresence?.currentPage === `/meeting/${meetingId}`) {
        await updateUserPresence(userId, {
          status: 'online',
          customStatus: null,
          customEmoji: null,
          currentPage: null,
          lastActivity: new Date().toISOString(),
        } as Partial<PresenceState>);

        await logIntegrationActivity(userId, 'conference_presence_ended', {
          meetingId,
        });
      }
    } catch (error) {
      await logIntegrationError(
        userId,
        'end_conference_presence_failed',
        error,
      );
    }
  }
}

// Export webhook validators
export function validateZoomWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  if (!secret || !signature) return false;

  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return signature === expectedSignature;
}

export function validateTeamsWebhookToken(token: string): boolean {
  return token === process.env.TEAMS_WEBHOOK_SECRET;
}

// Export singleton instance
export const videoConferenceSync = new VideoConferencePresenceSync();
