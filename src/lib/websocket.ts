import { WebSocketServer, WebSocket } from 'ws';
import { WSMessage } from '../types/kanban';
import { getBoard } from './store';

// Use globalThis to share WebSocket server between custom server and API routes
const g = globalThis as typeof globalThis & {
  __kanban_wss?: WebSocketServer;
};

export function setupWebSocket(server: WebSocketServer): void {
  g.__kanban_wss = server;

  server.on('connection', (ws) => {
    const board = getBoard();
    const msg: WSMessage = {
      type: 'board_state',
      payload: { board },
      timestamp: new Date().toISOString(),
    };
    ws.send(JSON.stringify(msg));
  });
}

export function broadcast(message: WSMessage): void {
  const wss = g.__kanban_wss;
  if (!wss) return;
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}
