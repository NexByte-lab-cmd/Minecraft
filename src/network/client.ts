import type { Difficulty, GameMode, RealmId } from './commands';
import type { SpatialVoiceManager } from '../engine/audio';

export interface PeerState {
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
}

export interface RoomSummary {
  code: string;
  hostName: string;
  players: number;
  maxPlayers: number;
  seed: string;
  mode: GameMode;
}

export interface NetworkCallbacks {
  onConnected: (peerId: string, initialEdits: Array<[RealmId, number, number, number, number]>, seed?: string) => void;
  onDisconnected: () => void;
  onBlockEdit: (realm: RealmId, x: number, y: number, z: number, id: number) => void;
  onChat: (sender: string, text: string, system?: boolean, whisper?: boolean) => void;
  onPeersChange: (peers: PeerState[]) => void;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  public connected = false;
  public peerId = '';
  public roomCode = '';
  public peers = new Map<string, PeerState>();
  private rtcPeers = new Map<string, RTCPeerConnection>();
  private callbacks: NetworkCallbacks;
  private voice: SpatialVoiceManager;
  private lastJoinPayload: {
    room: string;
    name: string;
    skinId: string;
    seed: string;
    mode: GameMode;
    difficulty: Difficulty;
    realm: RealmId;
  } | null = null;
  private closedManually = false;

  constructor(callbacks: NetworkCallbacks, voice: SpatialVoiceManager) {
    this.callbacks = callbacks;
    this.voice = voice;
  }

  public connect(payload: {
    room: string;
    name: string;
    skinId: string;
    seed: string;
    mode: GameMode;
    difficulty: Difficulty;
    realm: RealmId;
  }): void {
    this.closedManually = false;
    this.roomCode = payload.room;
    this.lastJoinPayload = payload;
    this.openSocket();
  }

  private openSocket(): void {
    if (this.closedManually || !this.lastJoinPayload) return;
    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${proto}//${window.location.host}/ws`;
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        if (!this.lastJoinPayload) return;
        this.connected = true;
        ws.send(JSON.stringify({ type: 'join', ...this.lastJoinPayload }));
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as Record<string, unknown>;
          this.handleMessage(msg);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        this.connected = false;
        this.ws = null;
        this.callbacks.onDisconnected();
        if (!this.closedManually) {
          setTimeout(() => this.openSocket(), 2500);
        }
      };

      ws.onerror = () => {
        // Socket close handler manages cleanup
      };
    } catch {
      this.connected = false;
    }
  }

  private handleMessage(msg: Record<string, unknown>): void {
    const type = String(msg.type || '');
    if (type === 'welcome') {
      this.peerId = String(msg.peerId || '');
      const peers = (msg.peers as PeerState[]) || [];
      this.peers.clear();
      for (const p of peers) {
        if (p.id !== this.peerId) {
          this.peers.set(p.id, p);
          if (this.voice.localStream) {
            void this.startRtcOffer(p.id);
          }
        }
      }
      const edits = (msg.edits as Array<[RealmId, number, number, number, number]>) || [];
      this.callbacks.onConnected(this.peerId, edits, typeof msg.seed === 'string' ? msg.seed : undefined);
      this.callbacks.onPeersChange(Array.from(this.peers.values()));
    } else if (type === 'peer_join') {
      const p = msg.peer as PeerState;
      if (p && p.id !== this.peerId) {
        this.peers.set(p.id, p);
        this.callbacks.onPeersChange(Array.from(this.peers.values()));
        this.callbacks.onChat('System', `${p.name} joined the realm.`, true);
      }
    } else if (type === 'peer_leave') {
      const pid = String(msg.peerId || '');
      const existing = this.peers.get(pid);
      if (existing) {
        this.callbacks.onChat('System', `${existing.name} left the realm.`, true);
      }
      this.peers.delete(pid);
      this.closeRtcPeer(pid);
      this.voice.removePeer(pid);
      this.callbacks.onPeersChange(Array.from(this.peers.values()));
    } else if (type === 'pose') {
      const pid = String(msg.peerId || '');
      const existing = this.peers.get(pid);
      if (existing) {
        existing.x = Number(msg.x) || 0;
        existing.y = Number(msg.y) || 0;
        existing.z = Number(msg.z) || 0;
        existing.yaw = Number(msg.yaw) || 0;
        existing.pitch = Number(msg.pitch) || 0;
        existing.realm = (msg.realm as RealmId) || 'overworld';
        existing.moving = Number(msg.moving) || 0;
        existing.swing = Number(msg.swing) || 0;
        existing.talking = Boolean(msg.talking);
      }
    } else if (type === 'block') {
      this.callbacks.onBlockEdit(
        (msg.realm as RealmId) || 'overworld',
        Number(msg.x) || 0,
        Number(msg.y) || 0,
        Number(msg.z) || 0,
        Number(msg.id) || 0,
      );
    } else if (type === 'chat') {
      this.callbacks.onChat(
        String(msg.sender || 'Player'),
        String(msg.text || ''),
        Boolean(msg.system),
        Boolean(msg.whisper),
      );
    } else if (type === 'rtc') {
      void this.handleRtcSignal(String(msg.from || ''), msg.signal as Record<string, unknown>);
    }
  }

  public sendPose(pose: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    realm: RealmId;
    moving: number;
    swing: number;
    talking: boolean;
  }): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'pose', ...pose }));
  }

  public sendBlockEdit(realm: RealmId, x: number, y: number, z: number, id: number): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'block', realm, x, y, z, id }));
  }

  public sendChat(text: string, to?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'chat', text, to }));
  }

  public async enableVoice(): Promise<boolean> {
    const stream = await this.voice.requestMic();
    if (!stream) return false;
    for (const pid of this.peers.keys()) {
      await this.startRtcOffer(pid);
    }
    return true;
  }

  private createRtcPeer(peerId: string): RTCPeerConnection {
    const existing = this.rtcPeers.get(peerId);
    if (existing) existing.close();

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    if (this.voice.localStream) {
      for (const track of this.voice.localStream.getTracks()) {
        pc.addTrack(track, this.voice.localStream);
      }
    }
    pc.onicecandidate = (ev) => {
      if (ev.candidate && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'rtc', to: peerId, signal: { candidate: ev.candidate } }));
      }
    };
    pc.ontrack = (ev) => {
      if (ev.streams[0]) {
        this.voice.attachPeerStream(peerId, ev.streams[0]);
      }
    };
    this.rtcPeers.set(peerId, pc);
    return pc;
  }

  private async startRtcOffer(peerId: string): Promise<void> {
    try {
      const pc = this.createRtcPeer(peerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.ws?.send(JSON.stringify({ type: 'rtc', to: peerId, signal: { sdp: pc.localDescription } }));
    } catch {
      // WebRTC optional in restricted headless environments
    }
  }

  private async handleRtcSignal(fromId: string, signal: Record<string, unknown>): Promise<void> {
    try {
      if (!fromId || !signal) return;
      let pc = this.rtcPeers.get(fromId);
      if (signal.sdp) {
        const desc = signal.sdp as RTCSessionDescriptionInit;
        if (!pc) pc = this.createRtcPeer(fromId);
        await pc.setRemoteDescription(new RTCSessionDescription(desc));
        if (desc.type === 'offer') {
          const ans = await pc.createAnswer();
          await pc.setLocalDescription(ans);
          this.ws?.send(JSON.stringify({ type: 'rtc', to: fromId, signal: { sdp: pc.localDescription } }));
        }
      } else if (signal.candidate && pc) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate as RTCIceCandidateInit));
      }
    } catch {
      // ignore ICE race conditions
    }
  }

  private closeRtcPeer(peerId: string): void {
    const pc = this.rtcPeers.get(peerId);
    if (pc) {
      pc.close();
      this.rtcPeers.delete(peerId);
    }
  }

  public disconnect(): void {
    this.closedManually = true;
    this.connected = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    for (const pid of Array.from(this.rtcPeers.keys())) this.closeRtcPeer(pid);
    this.peers.clear();
  }
}
