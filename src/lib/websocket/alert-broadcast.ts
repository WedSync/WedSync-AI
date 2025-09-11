/**
 * WebSocket alert broadcasting utility
 */

import { WebSocket } from 'ws';
import { logger } from '@/lib/monitoring/logger';

// Store active WebSocket connections - shared state
export const alertClients = new Set<WebSocket>();

// Broadcast message to all connected clients
export function broadcastToAlertClients(message: any) {
  if (alertClients.size === 0) return;

  const messageStr = JSON.stringify(message);

  alertClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(messageStr);
      } catch (error) {
        logger.error('Error broadcasting to WebSocket client', error);
        alertClients.delete(ws);
      }
    } else {
      alertClients.delete(ws);
    }
  });

  logger.debug('Broadcasted message to alert clients', {
    messageType: message.type,
    clientCount: alertClients.size,
  });
}
