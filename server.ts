import { createServer } from 'http';
import next from 'next';
import { WebSocketServer } from 'ws';
import { initStore } from './src/lib/store.js';
import { setupWebSocket } from './src/lib/websocket.js';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3333', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  await initStore();

  const server = createServer((req, res) => {
    handle(req, res);
  });

  const wss = new WebSocketServer({ noServer: true });
  setupWebSocket(wss);

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url || '', `http://${req.headers.host}`);
    if (pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
    // Let Next.js handle other upgrades (like HMR) naturally
  });

  server.listen(port, () => {
    console.log(`  ✓ Claude Board:  http://localhost:${port}`);
    console.log(`  ✓ WebSocket:     ws://localhost:${port}/ws`);
  });
});
