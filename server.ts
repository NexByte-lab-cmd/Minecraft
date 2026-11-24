import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type RealmId = 'overworld' | 'nether' | 'end';

interface RoomPeer {
  id: string;
  name: string;
  skinId: string;
  realm: RealmId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  moving: number;
  swing: number;
  talking: boolean;
  ws: WebSocket;
  lastMsgAt: number;
}

interface RoomState {
  code: string;
  hostName: string;
  seed: string;
  mode: string;
  difficulty: string;
  maxPlayers: number;
  edits: Map<string, [RealmId, number, number, number, number]>;
  peers: Map<string, RoomPeer>;
}

const MAX_ROOM_EDITS = 25000;
const rooms = new Map<string, RoomState>();
let uidCounter = 1;

function cleanText(raw: string): string {
  return raw
    .replace(/[<>&]/g, '')
    .slice(0, 180)
    .trim();
}

function getOrCreateRoom(code: string, hostName: string, seed: string, mode: string, difficulty: string): RoomState {
  const normCode = (code || 'KATHIR-1').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 20) || 'KATHIR-1';
  let room = rooms.get(normCode);
  if (!room) {
    room = {
      code: normCode,
      hostName,
      seed: seed || 'Kathir',
      mode: mode || 'survival',
      difficulty: difficulty || 'normal',
      maxPlayers: 12,
      edits: new Map(),
      peers: new Map(),
    };
    rooms.set(normCode, room);
  }
  return room;
}

function serializePeer(p: RoomPeer) {
  return {
    id: p.id,
    name: p.name,
    skinId: p.skinId,
    realm: p.realm,
    x: p.x,
    y: p.y,
    z: p.z,
    yaw: p.yaw,
    pitch: p.pitch,
    moving: p.moving,
    swing: p.swing,
    talking: p.talking,
  };
}

function broadcastRoom(room: RoomState, payload: unknown, exceptPeerId?: string): void {
  const data = JSON.stringify(payload);
  for (const p of room.peers.values()) {
    if (p.id !== exceptPeerId && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(data);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, creator: 'KATHIR', activeRooms: rooms.size });
  });

  app.get('/api/rooms', (_req, res) => {
    const list = Array.from(rooms.values()).map((r) => ({
      code: r.code,
      hostName: r.hostName,
      players: r.peers.size,
      maxPlayers: r.maxPlayers,
      seed: r.seed,
      mode: r.mode,
    }));
    res.json({ rooms: list });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let currentRoom: RoomState | null = null;
    let currentPeer: RoomPeer | null = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as Record<string, unknown>;
        const type = String(msg.type || '');

        if (type === 'join') {
          const name = cleanText(String(msg.name || 'Traveler')) || 'Traveler';
          const skinId = String(msg.skinId || 'steve').slice(0, 24);
          const seed = String(msg.seed || 'Kathir').slice(0, 32);
          const mode = String(msg.mode || 'survival');
          const difficulty = String(msg.difficulty || 'normal');
          const realm = (msg.realm as RealmId) || 'overworld';
          const room = getOrCreateRoom(String(msg.room || 'KATHIR-1'), name, seed, mode, difficulty);

          if (room.peers.size >= room.maxPlayers) {
            ws.send(JSON.stringify({ type: 'chat', sender: 'Server', text: 'Room is full (12/12).', system: true }));
            ws.close();
            return;
          }

          const peerId = `p_${uidCounter++}`;
          const peer: RoomPeer = {
            id: peerId,
            name,
            skinId,
            realm,
            x: 0,
            y: 66.2,
            z: 6,
            yaw: 0,
            pitch: 0,
            moving: 0,
            swing: 0,
            talking: false,
            ws,
            lastMsgAt: 0,
          };
          room.peers.set(peerId, peer);
          currentRoom = room;
          currentPeer = peer;

          ws.send(
            JSON.stringify({
              type: 'welcome',
              peerId,
              room: room.code,
              seed: room.seed,
              mode: room.mode,
              difficulty: room.difficulty,
              peers: Array.from(room.peers.values()).map(serializePeer),
              edits: Array.from(room.edits.values()),
            }),
          );

          broadcastRoom(room, { type: 'peer_join', peer: serializePeer(peer) }, peerId);
          return;
        }

        if (!currentRoom || !currentPeer) return;

        if (type === 'pose') {
          currentPeer.x = Number(msg.x) || 0;
          currentPeer.y = Number(msg.y) || 0;
          currentPeer.z = Number(msg.z) || 0;
          currentPeer.yaw = Number(msg.yaw) || 0;
          currentPeer.pitch = Number(msg.pitch) || 0;
          currentPeer.realm = (msg.realm as RealmId) || 'overworld';
          currentPeer.moving = Number(msg.moving) || 0;
          currentPeer.swing = Number(msg.swing) || 0;
          currentPeer.talking = Boolean(msg.talking);

          broadcastRoom(
            currentRoom,
            { type: 'pose', peerId: currentPeer.id, ...serializePeer(currentPeer) },
            currentPeer.id,
          );
        } else if (type === 'block') {
          const realm = (msg.realm as RealmId) || 'overworld';
          const x = Math.round(Number(msg.x) || 0);
          const y = Math.round(Number(msg.y) || 0);
          const z = Math.round(Number(msg.z) || 0);
          const id = Math.max(0, Math.round(Number(msg.id) || 0));
          if (y < -32 || y >= 160) return;

          const key = `${realm}:${x},${y},${z}`;
          if (currentRoom.edits.size < MAX_ROOM_EDITS || currentRoom.edits.has(key)) {
            currentRoom.edits.set(key, [realm, x, y, z, id]);
          }
          broadcastRoom(currentRoom, { type: 'block', realm, x, y, z, id }, currentPeer.id);
        } else if (type === 'chat') {
          const now = Date.now();
          if (now - currentPeer.lastMsgAt < 250) return;
          currentPeer.lastMsgAt = now;

          const text = cleanText(String(msg.text || ''));
          if (!text) return;

          const toName = msg.to ? cleanText(String(msg.to)) : '';
          if (toName) {
            const target = Array.from(currentRoom.peers.values()).find(
              (p) => p.name.toLowerCase() === toName.toLowerCase(),
            );
            if (target && target.ws.readyState === WebSocket.OPEN) {
              target.ws.send(JSON.stringify({ type: 'chat', sender: currentPeer.name, text, whisper: true }));
              ws.send(JSON.stringify({ type: 'chat', sender: `To ${target.name}`, text, whisper: true }));
            }
          } else {
            broadcastRoom(currentRoom, { type: 'chat', sender: currentPeer.name, text });
          }
        } else if (type === 'rtc') {
          const toId = String(msg.to || '');
          const target = currentRoom.peers.get(toId);
          if (target && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(JSON.stringify({ type: 'rtc', from: currentPeer.id, signal: msg.signal }));
          }
        }
      } catch {
        // ignore invalid frames
      }
    });

    ws.on('close', () => {
      if (currentRoom && currentPeer) {
        currentRoom.peers.delete(currentPeer.id);
        broadcastRoom(currentRoom, { type: 'peer_leave', peerId: currentPeer.id }, currentPeer.id);
        if (currentRoom.peers.size === 0) {
          rooms.delete(currentRoom.code);
        }
      }
    });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, '0.0.0.0', () => {
    console.log(`Voxel Realms Remastered (By KATHIR) listening on http://0.0.0.0:${port}`);
  });
}

void startServer();
