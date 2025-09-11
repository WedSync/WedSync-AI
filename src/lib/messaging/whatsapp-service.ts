// WS-157: WhatsApp Business API Integration for Helper Assignments
import { HelperAssignment, AssignmentNotification } from '@/types/calendar';

interface WhatsAppMessage {
  to: string;
  type: 'text' | 'interactive' | 'template' | 'image' | 'document' | 'location';
  text?: { body: string };
  interactive?: InteractiveMessage;
  template?: TemplateMessage;
  image?: MediaMessage;
  document?: MediaMessage;
  location?: LocationMessage;
}

interface InteractiveMessage {
  type: 'button' | 'list';
  header?: { type: 'text'; text: string };
  body: { text: string };
  footer?: { text: string };
  action: ButtonAction | ListAction;
}

interface ButtonAction {
  buttons: Array<{
    type: 'reply';
    reply: { id: string; title: string };
  }>;
}

interface ListAction {
  button: string;
  sections: Array<{
    title: string;
    rows: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }>;
}

interface TemplateMessage {
  name: string;
  language: { code: string };
  components?: Array<{
    type: 'header' | 'body' | 'button';
    parameters?: Array<{ type: 'text'; text: string }>;
    sub_type?: 'quick_reply' | 'url';
    index?: string;
  }>;
}

interface MediaMessage {
  link?: string;
  caption?: string;
  filename?: string;
}

interface LocationMessage {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export class WhatsAppService {
  private baseUrl: string;
  private accessToken: string;
  private phoneNumberId: string;

  constructor() {
    this.baseUrl =
      process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  }

  /**
   * Send assignment notification via WhatsApp
   */
  async sendAssignmentNotification(
    phoneNumber: string,
    assignment: HelperAssignment,
    type: 'new' | 'updated' | 'reminder' | 'cancelled',
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const message = this.createAssignmentMessage(
        phoneNumber,
        assignment,
        type,
      );
      const result = await this.sendMessage(message);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send interactive assignment request with action buttons
   */
  async sendInteractiveAssignmentRequest(
    phoneNumber: string,
    assignment: HelperAssignment,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const message: WhatsAppMessage = {
        to: phoneNumber,
        type: 'interactive',
        interactive: {
          type: 'button',
          header: {
            type: 'text',
            text: '🎉 New Wedding Assignment',
          },
          body: {
            text: this.formatAssignmentDetails(assignment),
          },
          footer: {
            text: 'Please respond within 2 hours',
          },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: { id: `accept_${assignment.id}`, title: '✅ Accept' },
              },
              {
                type: 'reply',
                reply: { id: `decline_${assignment.id}`, title: '❌ Decline' },
              },
              {
                type: 'reply',
                reply: { id: `details_${assignment.id}`, title: '📋 Details' },
              },
            ],
          },
        },
      };

      const result = await this.sendMessage(message);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send assignment reminder with quick actions
   */
  async sendAssignmentReminder(
    phoneNumber: string,
    assignment: HelperAssignment,
    reminderType: 'upcoming' | 'overdue' | 'confirmation',
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      let headerText = '';
      let bodyText = '';

      switch (reminderType) {
        case 'upcoming':
          headerText = '⏰ Upcoming Assignment';
          bodyText = `Your assignment "${assignment.title}" starts in 1 hour.\n\n${this.formatAssignmentDetails(assignment)}`;
          break;
        case 'overdue':
          headerText = '🚨 Overdue Response';
          bodyText = `Please respond to your assignment request:\n\n${this.formatAssignmentDetails(assignment)}`;
          break;
        case 'confirmation':
          headerText = '✅ Assignment Confirmed';
          bodyText = `Thank you for accepting! Here are the details:\n\n${this.formatAssignmentDetails(assignment)}`;
          break;
      }

      const message: WhatsAppMessage = {
        to: phoneNumber,
        type: 'interactive',
        interactive: {
          type: 'button',
          header: { type: 'text', text: headerText },
          body: { text: bodyText },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: { id: `status_${assignment.id}`, title: '📊 Status' },
              },
              {
                type: 'reply',
                reply: { id: `contact_${assignment.id}`, title: '📞 Contact' },
              },
            ],
          },
        },
      };

      const result = await this.sendMessage(message);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send location details for assignment
   */
  async sendAssignmentLocation(
    phoneNumber: string,
    assignment: HelperAssignment,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!assignment.location) {
        throw new Error('No location data available for assignment');
      }

      const message: WhatsAppMessage = {
        to: phoneNumber,
        type: 'location',
        location: {
          latitude: 37.7749, // Replace with actual coordinates
          longitude: -122.4194,
          name: assignment.title,
          address: assignment.location,
        },
      };

      const result = await this.sendMessage(message);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle incoming WhatsApp webhook message
   */
  async handleIncomingMessage(webhookData: any): Promise<void> {
    try {
      const entry = webhookData.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (value?.messages) {
        for (const message of value.messages) {
          await this.processIncomingMessage(message, value.metadata);
        }
      }

      if (value?.statuses) {
        for (const status of value.statuses) {
          await this.processMessageStatus(status);
        }
      }
    } catch (error) {
      console.error('Error handling WhatsApp webhook:', error);
    }
  }

  /**
   * Process incoming message from user
   */
  private async processIncomingMessage(
    message: any,
    metadata: any,
  ): Promise<void> {
    const phoneNumber = message.from;
    const messageType = message.type;

    try {
      switch (messageType) {
        case 'interactive':
          await this.handleInteractiveResponse(
            message.interactive,
            phoneNumber,
          );
          break;
        case 'text':
          await this.handleTextMessage(message.text.body, phoneNumber);
          break;
        default:
          console.log(`Unhandled message type: ${messageType}`);
      }
    } catch (error) {
      console.error('Error processing incoming message:', error);
    }
  }

  /**
   * Handle interactive button responses
   */
  private async handleInteractiveResponse(
    interactive: any,
    phoneNumber: string,
  ): Promise<void> {
    const buttonReply = interactive.button_reply;
    if (!buttonReply) return;

    const [action, assignmentId] = buttonReply.id.split('_');

    switch (action) {
      case 'accept':
        await this.handleAssignmentAcceptance(assignmentId, phoneNumber);
        break;
      case 'decline':
        await this.handleAssignmentDecline(assignmentId, phoneNumber);
        break;
      case 'details':
        await this.sendAssignmentDetails(assignmentId, phoneNumber);
        break;
      case 'status':
        await this.sendAssignmentStatus(assignmentId, phoneNumber);
        break;
      case 'contact':
        await this.sendContactInformation(assignmentId, phoneNumber);
        break;
    }
  }

  /**
   * Handle text message responses
   */
  private async handleTextMessage(
    messageBody: string,
    phoneNumber: string,
  ): Promise<void> {
    const lowerBody = messageBody.toLowerCase().trim();

    // Parse common commands
    if (lowerBody.includes('status')) {
      await this.sendHelperStatus(phoneNumber);
    } else if (lowerBody.includes('help')) {
      await this.sendHelpMessage(phoneNumber);
    } else if (lowerBody.includes('assignments')) {
      await this.sendAssignmentsList(phoneNumber);
    } else {
      // Send generic response
      await this.sendMessage({
        to: phoneNumber,
        type: 'text',
        text: {
          body: "Thanks for your message! For assignment actions, please use the buttons provided or text 'help' for available commands.",
        },
      });
    }
  }

  /**
   * Handle assignment acceptance
   */
  private async handleAssignmentAcceptance(
    assignmentId: string,
    phoneNumber: string,
  ): Promise<void> {
    try {
      // Update assignment status in database
      // await updateAssignmentStatus(assignmentId, 'accepted');

      await this.sendMessage({
        to: phoneNumber,
        type: 'text',
        text: {
          body: `✅ Great! You've accepted the assignment. We'll send you more details and reminders as the wedding day approaches. Thank you!`,
        },
      });

      // Send notification to wedding planner
      // await notifyWeddingPlanner(assignmentId, 'accepted', phoneNumber);
    } catch (error) {
      console.error('Error handling assignment acceptance:', error);
    }
  }

  /**
   * Handle assignment decline
   */
  private async handleAssignmentDecline(
    assignmentId: string,
    phoneNumber: string,
  ): Promise<void> {
    try {
      // Update assignment status in database
      // await updateAssignmentStatus(assignmentId, 'declined');

      await this.sendMessage({
        to: phoneNumber,
        type: 'text',
        text: {
          body: `Thanks for letting us know. We'll find another helper for this assignment. No worries! 👍`,
        },
      });

      // Send notification to wedding planner
      // await notifyWeddingPlanner(assignmentId, 'declined', phoneNumber);
    } catch (error) {
      console.error('Error handling assignment decline:', error);
    }
  }

  /**
   * Send core message via WhatsApp API
   */
  private async sendMessage(
    message: WhatsAppMessage,
  ): Promise<{ messageId: string }> {
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `WhatsApp API error: ${error.error?.message || response.statusText}`,
      );
    }

    const result = await response.json();
    return { messageId: result.messages[0].id };
  }

  /**
   * Create assignment message based on type
   */
  private createAssignmentMessage(
    phoneNumber: string,
    assignment: HelperAssignment,
    type: 'new' | 'updated' | 'reminder' | 'cancelled',
  ): WhatsAppMessage {
    let emoji = '🎉';
    let prefix = 'New';

    switch (type) {
      case 'updated':
        emoji = '📝';
        prefix = 'Updated';
        break;
      case 'reminder':
        emoji = '⏰';
        prefix = 'Reminder';
        break;
      case 'cancelled':
        emoji = '❌';
        prefix = 'Cancelled';
        break;
    }

    const message = `${emoji} ${prefix} Wedding Assignment\n\n${this.formatAssignmentDetails(assignment)}`;

    return {
      to: phoneNumber,
      type: 'text',
      text: { body: message },
    };
  }

  /**
   * Format assignment details for message
   */
  private formatAssignmentDetails(assignment: HelperAssignment): string {
    const startDate = new Date(assignment.start).toLocaleDateString();
    const startTime = new Date(assignment.start).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const duration = Math.ceil(
      (new Date(assignment.end).getTime() -
        new Date(assignment.start).getTime()) /
        (1000 * 60),
    );

    let details = `📋 *${assignment.title}*\n`;
    details += `📅 ${startDate} at ${startTime}\n`;
    details += `⏱️ Duration: ${duration} minutes\n`;
    details += `🏷️ Type: ${assignment.type.replace('_', ' ')}\n`;
    details += `⭐ Priority: ${assignment.priority.toUpperCase()}\n`;

    if (assignment.location) {
      details += `📍 Location: ${assignment.location}\n`;
    }

    if (assignment.requiredSkills?.length) {
      details += `🔧 Skills: ${assignment.requiredSkills.join(', ')}\n`;
    }

    return details;
  }

  /**
   * Process message delivery status
   */
  private async processMessageStatus(status: any): Promise<void> {
    const messageId = status.id;
    const statusType = status.status; // sent, delivered, read, failed
    const timestamp = status.timestamp;

    // Log status for monitoring
    console.log(`Message ${messageId} status: ${statusType} at ${timestamp}`);

    // Update delivery status in database if needed
    // await updateMessageDeliveryStatus(messageId, statusType, timestamp);
  }

  /**
   * Send helper's current status
   */
  private async sendHelperStatus(phoneNumber: string): Promise<void> {
    // Get helper's assignments from database
    const statusMessage = `📊 *Your Status*\n\n✅ Active assignments: 2\n⏳ Pending responses: 1\n📅 Next assignment: Tomorrow at 2:00 PM\n\nText 'assignments' to see details.`;

    await this.sendMessage({
      to: phoneNumber,
      type: 'text',
      text: { body: statusMessage },
    });
  }

  /**
   * Send help message with available commands
   */
  private async sendHelpMessage(phoneNumber: string): Promise<void> {
    const helpText =
      `🤖 *WedSync Helper Commands*\n\n` +
      `• *status* - Your current assignment status\n` +
      `• *assignments* - List your assignments\n` +
      `• *help* - Show this help message\n\n` +
      `For assignment actions, use the buttons provided in assignment messages.`;

    await this.sendMessage({
      to: phoneNumber,
      type: 'text',
      text: { body: helpText },
    });
  }

  /**
   * Send assignments list
   */
  private async sendAssignmentsList(phoneNumber: string): Promise<void> {
    // Get assignments from database
    const assignmentsList =
      `📋 *Your Assignments*\n\n` +
      `1. Photography Setup - Jan 15, 2:00 PM ✅\n` +
      `2. Guest Assistance - Jan 20, 4:00 PM ⏳\n` +
      `3. Reception Cleanup - Jan 22, 9:00 PM 📅\n\n` +
      `✅ Confirmed  ⏳ Pending  📅 Upcoming`;

    await this.sendMessage({
      to: phoneNumber,
      type: 'text',
      text: { body: assignmentsList },
    });
  }

  /**
   * Send assignment details
   */
  private async sendAssignmentDetails(
    assignmentId: string,
    phoneNumber: string,
  ): Promise<void> {
    // Get assignment from database
    // const assignment = await getAssignmentById(assignmentId);

    const detailsMessage =
      `📋 *Assignment Details*\n\n` +
      `Coming soon - detailed assignment information including contact details, special instructions, and preparation checklist.`;

    await this.sendMessage({
      to: phoneNumber,
      type: 'text',
      text: { body: detailsMessage },
    });
  }

  /**
   * Send assignment status
   */
  private async sendAssignmentStatus(
    assignmentId: string,
    phoneNumber: string,
  ): Promise<void> {
    const statusMessage =
      `📊 *Assignment Status*\n\n` +
      `Status: Confirmed ✅\n` +
      `Preparation: In Progress\n` +
      `Contact: Wedding Planner available\n` +
      `Next Update: 1 hour before start`;

    await this.sendMessage({
      to: phoneNumber,
      type: 'text',
      text: { body: statusMessage },
    });
  }

  /**
   * Send contact information
   */
  private async sendContactInformation(
    assignmentId: string,
    phoneNumber: string,
  ): Promise<void> {
    const contactMessage =
      `📞 *Contact Information*\n\n` +
      `Wedding Planner: Sarah Johnson\n` +
      `Phone: (555) 123-4567\n` +
      `Email: sarah@weddingplanner.com\n\n` +
      `Emergency Contact: (555) 999-0000\n` +
      `Available 24/7 on wedding day`;

    await this.sendMessage({
      to: phoneNumber,
      type: 'text',
      text: { body: contactMessage },
    });
  }

  /**
   * Verify WhatsApp webhook signature
   */
  static verifyWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require('crypto');
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    if (!appSecret) return false;

    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  }
}
