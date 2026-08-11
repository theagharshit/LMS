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
      socket.send(JSON.stringify({ type: 'connected', userId: user.id }));
    } catch {
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
  return delivered;
}

export async function closeRealtime() {
  if (!socketServer) return;
  for (const client of socketServer.clients) client.close(1001, 'Server shutting down');
  await new Promise<void>((resolve) => socketServer?.close(() => resolve()));
  socketServer = null;
}
