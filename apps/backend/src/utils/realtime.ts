import { Server as HttpServer } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { verifyToken } from './jwtUtils';
import { logger } from './logger';

let socketServer: WebSocketServer | null = null;

export function initializeRealtime(server: HttpServer) {
  socketServer = new WebSocketServer({ server, path: '/ws' });
  socketServer.on('connection', (socket, request) => {
    try {
      const url = new URL(request.url || '/ws', 'http://localhost');
      const token = url.searchParams.get('token');
      if (!token) throw new Error('Missing token');
      const user = verifyToken(token);
      if (user.tokenType !== 'access') throw new Error('Invalid token type');
      (socket as WebSocket & { userId?: string }).userId = user.id;

      logger.info(`[WebSocket] Client connected: ${user.id}`, { userId: user.id });
      socket.send(JSON.stringify({ type: 'connected', userId: user.id }));

      socket.on('close', () => {
        logger.info(`[WebSocket] Client disconnected: ${user.id}`, { userId: user.id });
      });
    } catch (err: any) {
      logger.warn(`[WebSocket] Authentication failed`, { error: err.message || err });
      socket.close(1008, 'Authentication required');
    }
  });
  socketServer.on('error', (error) => logger.error('WebSocket server error', error));
  return socketServer;
}

export function broadcastAnnouncement(payload: unknown) {
  return broadcastEvent('announcement', payload);
}

export function broadcastLocation(payload: unknown) {
  return broadcastEvent('location', payload);
}

function broadcastEvent(type: 'announcement' | 'location', payload: unknown) {
  if (!socketServer) return 0;
  const message = JSON.stringify({
    type,
    payload,
    timestamp: new Date().toISOString(),
  });
  let delivered = 0;
  socketServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      delivered += 1;
    }
  });
  logger.info(`[WebSocket] Broadcasted [${type}] to ${delivered} client(s)`);
  return delivered;
}

export function sendToUser(userId: string, type: string, payload: unknown) {
  if (!socketServer) return false;
  const message = JSON.stringify({
    type,
    payload,
    timestamp: new Date().toISOString(),
  });
  let delivered = false;
  socketServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && (client as any).userId === userId) {
      client.send(message);
      delivered = true;
    }
  });
  if (delivered) {
    logger.info(`[WebSocket] Sent [${type}] to ${userId}`);
  }
  return delivered;
}

export async function closeRealtime() {
  if (!socketServer) return;
  for (const client of socketServer.clients) client.close(1001, 'Server shutting down');
  await new Promise<void>((resolve) => socketServer?.close(() => resolve()));
  socketServer = null;
}
