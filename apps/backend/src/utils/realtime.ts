import { Server as HttpServer } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { verifyToken } from './jwtUtils';
import { logger } from './logger';

export interface ExtWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

let socketServer: WebSocketServer | null = null;
const userSocketsMap = new Map<string, Set<ExtWebSocket>>();
let heartbeatInterval: NodeJS.Timeout | null = null;

const PING_INTERVAL_MS = 30_000;
const MAX_SOCKETS_PER_USER = 10;

function removeSocket(socket: ExtWebSocket) {
  const userId = socket.userId;
  if (!userId) return;

  const userSockets = userSocketsMap.get(userId);
  if (userSockets) {
    userSockets.delete(socket);
    if (userSockets.size === 0) {
      userSocketsMap.delete(userId);
    }
  }
}

function registerSocket(userId: string, socket: ExtWebSocket) {
  socket.userId = userId;
  socket.isAlive = true;

  let userSockets = userSocketsMap.get(userId);
  if (!userSockets) {
    userSockets = new Set<ExtWebSocket>();
    userSocketsMap.set(userId, userSockets);
  }

  // Enforce max sockets per user limit to prevent socket flooding
  if (userSockets.size >= MAX_SOCKETS_PER_USER) {
    const oldestSocket = userSockets.values().next().value;
    if (oldestSocket) {
      try {
        oldestSocket.close(4000, 'Max concurrent socket connections exceeded for user');
      } catch {
        // Ignore error on close
      }
      removeSocket(oldestSocket);
    }
  }

  userSockets.add(socket);
}

export function initializeRealtime(server: HttpServer) {
  socketServer = new WebSocketServer({ server, path: '/ws' });

  socketServer.on('connection', (socket: ExtWebSocket, request) => {
    try {
      const url = new URL(request.url || '/ws', 'http://localhost');
      const token = url.searchParams.get('token');
      if (!token) throw new Error('Missing token');

      const user = verifyToken(token);
      if (user.tokenType !== 'access') throw new Error('Invalid token type');

      registerSocket(user.id, socket);

      logger.info(
        `[WebSocket] Client connected: user ${user.id} (total sockets for user: ${userSocketsMap.get(user.id)?.size})`,
        {
          userId: user.id,
        },
      );

      try {
        socket.send(JSON.stringify({ type: 'connected', userId: user.id }));
      } catch (err: any) {
        logger.error(`[WebSocket] Error sending welcome message to user ${user.id}`, err);
      }

      socket.on('pong', () => {
        socket.isAlive = true;
      });

      socket.on('message', (messageData) => {
        try {
          const parsed = JSON.parse(messageData.toString());
          if (parsed.type === 'ping') {
            socket.isAlive = true;
            socket.send(JSON.stringify({ type: 'pong' }));
          }
        } catch {
          // Non-JSON or ping/pong frame handled automatically by ws
        }
      });

      socket.on('close', () => {
        logger.info(`[WebSocket] Client disconnected: user ${user.id}`, { userId: user.id });
        removeSocket(socket);
      });

      socket.on('error', (error) => {
        logger.warn(`[WebSocket] Socket error for user ${user.id}: ${error.message || error}`);
        removeSocket(socket);
      });
    } catch (err: any) {
      logger.warn(`[WebSocket] Authentication failed`, { error: err.message || err });
      try {
        socket.close(1008, 'Authentication required');
      } catch {
        // Ignore error
      }
    }
  });

  socketServer.on('error', (error) => logger.error('WebSocket server error', error));

  // Start ping-pong heartbeat interval to clean up stale/dead TCP connections
  heartbeatInterval = setInterval(() => {
    for (const [userId, sockets] of userSocketsMap.entries()) {
      for (const socket of sockets) {
        if (socket.isAlive === false) {
          logger.info(`[WebSocket] Terminating stale socket for user ${userId}`);
          removeSocket(socket);
          try {
            socket.terminate();
          } catch {
            // Ignore termination error
          }
        } else {
          socket.isAlive = false;
          try {
            socket.ping();
          } catch {
            removeSocket(socket);
          }
        }
      }
    }
  }, PING_INTERVAL_MS);

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

  for (const sockets of userSocketsMap.values()) {
    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(message);
          delivered += 1;
        } catch (err: any) {
          logger.error(`[WebSocket] Broadcast error to socket: ${err.message || err}`);
          removeSocket(socket);
        }
      }
    }
  }

  logger.info(`[WebSocket] Broadcasted [${type}] to ${delivered} client socket(s)`);
  return delivered;
}

export function isUserOnline(userId: string): boolean {
  const userSockets = userSocketsMap.get(userId);
  return Boolean(userSockets && userSockets.size > 0);
}

export function sendToUser(userId: string, type: string, payload: unknown): boolean {
  const userSockets = userSocketsMap.get(userId);
  if (!userSockets || userSockets.size === 0) return false;

  const message = JSON.stringify({
    type,
    payload,
    timestamp: new Date().toISOString(),
  });
  let deliveredCount = 0;

  for (const socket of userSockets) {
    if (socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(message);
        deliveredCount += 1;
      } catch (err: any) {
        logger.error(`[WebSocket] Failed to send [${type}] to socket for user ${userId}`, err);
        removeSocket(socket);
      }
    } else if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
      removeSocket(socket);
    }
  }

  if (deliveredCount > 0) {
    logger.info(
      `[WebSocket] Sent [${type}] to ${userId} across ${deliveredCount} active socket(s)`,
    );
  }
  return deliveredCount > 0;
}

export async function closeRealtime() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (!socketServer) return;

  for (const sockets of userSocketsMap.values()) {
    for (const socket of sockets) {
      try {
        socket.close(1001, 'Server shutting down');
      } catch {
        // Ignore
      }
    }
  }
  userSocketsMap.clear();

  await new Promise<void>((resolve) => socketServer?.close(() => resolve()));
  socketServer = null;
}
