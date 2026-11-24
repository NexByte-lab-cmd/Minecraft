export type SoundKind =
  | 'break'
  | 'place'
  | 'step'
  | 'hurt'
  | 'hit'
  | 'eat'
  | 'xp'
  | 'explosion'
  | 'shoot'
  | 'portal'
  | 'splash';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  public muted = false;
  public masterVolume = 0.5;
  private lastStepAt = 0;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public play(kind: SoundKind): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    if (kind === 'step') {
      if (now - this.lastStepAt < 0.28) return;
      this.lastStepAt = now;
    }

    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    const vol = this.masterVolume;

    const osc = ctx.createOscillator();
    osc.connect(gain);

    switch (kind) {
      case 'break':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(72, now + 0.11);
        gain.gain.setValueAtTime(0.24 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      case 'place':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(340, now + 0.06);
        gain.gain.setValueAtTime(0.2 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      case 'step':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110 + Math.random() * 25, now);
        gain.gain.setValueAtTime(0.08 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      case 'hit':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(95, now + 0.1);
        gain.gain.setValueAtTime(0.2 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'hurt':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.18);
        gain.gain.setValueAtTime(0.28 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
        osc.start(now);
        osc.stop(now + 0.19);
        break;
      case 'eat':
        osc.type = 'square';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.setValueAtTime(410, now + 0.06);
        gain.gain.setValueAtTime(0.14 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);
        break;
      case 'xp':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.setValueAtTime(880, now + 0.06);
        gain.gain.setValueAtTime(0.18 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
        break;
      case 'explosion':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(95, now);
        osc.frequency.exponentialRampToValueAtTime(28, now + 0.45);
        gain.gain.setValueAtTime(0.42 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
        osc.start(now);
        osc.stop(now + 0.46);
        break;
      case 'shoot':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.13);
        gain.gain.setValueAtTime(0.16 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);
        break;
      case 'portal':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(440, now + 0.35);
        gain.gain.setValueAtTime(0.24 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        osc.start(now);
        osc.stop(now + 0.42);
        break;
      case 'splash':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
        gain.gain.setValueAtTime(0.18 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
    }
  }
}

export interface PeerAudioNodes {
  audioEl: HTMLAudioElement;
  source?: MediaStreamAudioSourceNode;
  gain?: GainNode;
  panner?: StereoPannerNode;
  filter?: BiquadFilterNode;
}

export class SpatialVoiceManager {
  private ctx: AudioContext | null = null;
  public localStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserData: Uint8Array<ArrayBuffer> | null = null;
  private peers = new Map<string, PeerAudioNodes>();

  public async requestMic(): Promise<MediaStream | null> {
    if (this.localStream) return this.localStream;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.localStream = stream;
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) {
        this.ctx = this.ctx || new AC();
        const src = this.ctx.createMediaStreamSource(stream);
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyserData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
        src.connect(this.analyser);
      }
      return stream;
    } catch {
      return null;
    }
  }

  public getMicLevel(): number {
    if (!this.analyser || !this.analyserData) return 0;
    this.analyser.getByteFrequencyData(this.analyserData);
    let sum = 0;
    for (let i = 0; i < this.analyserData.length; i++) sum += this.analyserData[i];
    return Math.min(1, sum / (this.analyserData.length * 90));
  }

  public attachPeerStream(peerId: string, stream: MediaStream): void {
    const audioEl = new Audio();
    audioEl.srcObject = stream;
    audioEl.autoplay = true;
    audioEl.muted = true; // Web Audio handles output when available
    const node: PeerAudioNodes = { audioEl };

    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }

    if (this.ctx) {
      try {
        const src = this.ctx.createMediaStreamSource(stream);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 18000;
        const panner = this.ctx.createStereoPanner();
        const gain = this.ctx.createGain();
        src.connect(filter);
        filter.connect(panner);
        panner.connect(gain);
        gain.connect(this.ctx.destination);
        node.source = src;
        node.filter = filter;
        node.panner = panner;
        node.gain = gain;
      } catch {
        audioEl.muted = false;
      }
    } else {
      audioEl.muted = false;
    }

    this.peers.set(peerId, node);
  }

  public updatePeerSpatial(
    peerId: string,
    listenerPos: { x: number; y: number; z: number; yaw: number },
    peerPos: { x: number; y: number; z: number },
    globalRadio: boolean,
    deafened: boolean,
  ): void {
    const p = this.peers.get(peerId);
    if (!p || !p.gain || !p.panner || !p.filter) return;
    if (deafened) {
      p.gain.gain.value = 0;
      return;
    }
    if (globalRadio) {
      p.gain.gain.value = 0.85;
      p.panner.pan.value = 0;
      p.filter.frequency.value = 18000;
      return;
    }
    const dx = peerPos.x - listenerPos.x;
    const dy = peerPos.y - listenerPos.y;
    const dz = peerPos.z - listenerPos.z;
    const dist = Math.hypot(dx, dy, dz);
    let vol = 0;
    if (dist <= 8) vol = 1;
    else if (dist < 48) vol = 1 - (dist - 8) / 40;
    p.gain.gain.value = Math.max(0, Math.min(1, vol));

    // Stereo pan relative to listener right vector
    const rx = Math.cos(listenerPos.yaw);
    const rz = -Math.sin(listenerPos.yaw);
    const pan = dist > 0.1 ? (dx * rx + dz * rz) / dist : 0;
    p.panner.pan.value = Math.max(-1, Math.min(1, pan));
    p.filter.frequency.value = Math.abs(dy) > 6 ? 2600 : 18000;
  }

  public removePeer(peerId: string): void {
    const p = this.peers.get(peerId);
    if (p) {
      p.audioEl.srcObject = null;
      p.source?.disconnect();
      this.peers.delete(peerId);
    }
  }

  public dispose(): void {
    for (const id of Array.from(this.peers.keys())) this.removePeer(id);
    if (this.localStream) {
      for (const t of this.localStream.getTracks()) t.stop();
      this.localStream = null;
    }
  }
}
