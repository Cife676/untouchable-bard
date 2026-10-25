import { Readable } from 'stream';
import { ChannelId, PlaybackState } from './types.js';

interface MixerLayer {
  id: string;
  assetId: string;
  name: string;
  channel: ChannelId;
  buffer: Buffer;
  totalFrames: number;
  cursor: number; // in frames
  loop: boolean;
  currentGain: number;
  targetGain: number;
  gainDelta: number; // per frame adjustment
  isRemoving: boolean;
}

export class AudioMixer {
  public static readonly SAMPLE_RATE = 48000;
  public static readonly CHUNK_DURATION_MS = 20; // 20ms per packet
  public static readonly FRAMES_PER_CHUNK = 960; // 48000 * 0.02
  public static readonly BYTES_PER_CHUNK = 3840; // 960 frames * 4 bytes

  public static readonly PREBUFFER_CHUNKS = 5; // 100ms cushion to prevent underruns

  private stream: Readable | null = null;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  private layers: Map<string, MixerLayer> = new Map();
  private channelVolumes: Record<ChannelId, number> = {
    music: 0.8,
    ambience: 0.8,
    environment: 0.8,
    sfx: 0.85,
  };
  private channelMutes: Record<ChannelId, boolean> = {
    music: false,
    ambience: false,
    environment: false,
    sfx: false,
  };
  private masterVolume: number = 0.9;
  private isMasterMuted: boolean = false;
  private playbackState: PlaybackState = 'stopped';
  private currentScene: { id: string; name: string } | null = null;

  constructor() {
    this.resetStream();
  }

  public resetStream(): Readable {
    if (this.stream && !this.stream.destroyed) {
      try {
        this.stream.destroy();
      } catch {
        // Ignore
      }
    }
    const self = this;
    this.stream = new Readable({
      read(size) {
        if (!self.isRunning) {
          // Push silence when idle
          self.stream?.push(Buffer.alloc(AudioMixer.BYTES_PER_CHUNK));
          return;
        }
        // Synthesize next 20ms frame directly on demand
        self.stream?.push(self.processNextChunk());
      },
      highWaterMark: AudioMixer.BYTES_PER_CHUNK * 10,
    });
    return this.stream;
  }

  public getStream(): Readable {
    if (!this.stream || this.stream.destroyed) {
      return this.resetStream();
    }
    return this.stream;
  }

  public getPlaybackState(): PlaybackState {
    return this.playbackState;
  }

  public getCurrentScene(): { id: string; name: string } | null {
    return this.currentScene;
  }

  public getChannelVolumes(): Record<ChannelId, number> {
    return { ...this.channelVolumes };
  }

  public getChannelMutes(): Record<ChannelId, boolean> {
    return { ...this.channelMutes };
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public getIsMasterMuted(): boolean {
    return this.isMasterMuted;
  }

  public getActiveLayers(): Array<{ id: string; name: string; channel: ChannelId; volume: number; isMuted: boolean }> {
    return Array.from(this.layers.values()).map((l) => ({
      id: l.id,
      name: l.name,
      channel: l.channel,
      volume: l.targetGain,
      isMuted: Boolean(this.channelMutes[l.channel]),
    }));
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    const stream = this.getStream();
    // Pre-fill buffer with initial chunks so AudioPlayer starts immediately without missed frames
    for (let i = 0; i < AudioMixer.PREBUFFER_CHUNKS; i++) {
      if (!stream.destroyed) {
        stream.push(this.processNextChunk());
      }
    }
  }

  public stop(): void {
    this.isRunning = false;
  }

  /**
   * Set channel volume
   */
  public setChannelVolume(channel: ChannelId, volume: number): void {
    this.channelVolumes[channel] = Math.max(0, Math.min(1, volume));
  }

  /**
   * Toggle channel mute
   */
  public toggleChannelMute(channel: ChannelId): void {
    this.channelMutes[channel] = !this.channelMutes[channel];
  }

  /**
   * Set master volume
   */
  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Toggle master mute
   */
  public setMasterMute(muted: boolean): void {
    this.isMasterMuted = muted;
  }

  /**
   * Set individual layer live volume
   */
  public setLayerVolume(layerId: string, volume: number): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.targetGain = Math.max(0, Math.min(1, volume));
      // Ramp smoothly over 100ms
      const rampFrames = 0.1 * AudioMixer.SAMPLE_RATE;
      layer.gainDelta = (layer.targetGain - layer.currentGain) / rampFrames;
    }
  }

  /**
   * Pause/Resume playback
   */
  public pause(): void {
    this.isPaused = true;
    this.playbackState = 'paused';
  }

  public resume(): void {
    this.isPaused = false;
    this.playbackState = 'playing';
  }

  /**
   * Play a one-shot SFX cue over current mix
   */
  public triggerSfx(
    assetId: string,
    buffer: Buffer,
    volume: number = 0.85,
    name: string = 'SFX',
    channel: ChannelId = 'sfx',
    loop: boolean = false
  ): void {
    const totalFrames = Math.floor(buffer.length / 4);
    if (totalFrames <= 0) return;

    const layerId = `sfx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const layer: MixerLayer = {
      id: layerId,
      assetId,
      name,
      channel,
      buffer,
      totalFrames,
      cursor: 0,
      loop,
      currentGain: Math.max(0, Math.min(1, volume)),
      targetGain: Math.max(0, Math.min(1, volume)),
      gainDelta: 0,
      isRemoving: false,
    };

    this.layers.set(layerId, layer);
  }

  /**
   * Transition to a new scene
   */
  public startScene(
    scene: { id: string; name: string },
    newLayers: Array<{ id: string; assetId: string; name: string; channel: ChannelId; volume: number; loop: boolean; buffer: Buffer }>,
    crossfadeDuration: number = 2.0
  ): void {
    this.currentScene = scene;
    const fadeFrames = Math.max(1, crossfadeDuration * AudioMixer.SAMPLE_RATE);

    // Fade out previous background layers (non-SFX)
    for (const [id, layer] of this.layers.entries()) {
      if (layer.channel !== 'sfx') {
        layer.targetGain = 0;
        layer.isRemoving = true;
        layer.gainDelta = -layer.currentGain / fadeFrames;
      }
    }

    // Add new scene layers
    for (const item of newLayers) {
      const totalFrames = Math.floor(item.buffer.length / 4);
      if (totalFrames <= 0) continue;

      const initialGain = crossfadeDuration > 0 ? 0 : item.volume;
      const targetGain = Math.max(0, Math.min(1, item.volume));
      const gainDelta = crossfadeDuration > 0 ? targetGain / fadeFrames : 0;

      const layer: MixerLayer = {
        id: item.id,
        assetId: item.assetId,
        name: item.name,
        channel: item.channel,
        buffer: item.buffer,
        totalFrames,
        cursor: 0,
        loop: item.loop,
        currentGain: initialGain,
        targetGain,
        gainDelta,
        isRemoving: false,
      };

      this.layers.set(item.id, layer);
    }

    this.playbackState = crossfadeDuration > 0 ? 'transitioning' : 'playing';

    if (crossfadeDuration > 0) {
      setTimeout(() => {
        if (this.playbackState === 'transitioning') {
          this.playbackState = 'playing';
        }
      }, crossfadeDuration * 1000);
    }
  }

  /**
   * Stop scene background playback with fade
   */
  public stopScene(fadeDuration: number = 1.5): void {
    const fadeFrames = Math.max(1, fadeDuration * AudioMixer.SAMPLE_RATE);
    for (const [_, layer] of this.layers.entries()) {
      if (layer.channel !== 'sfx') {
        layer.targetGain = 0;
        layer.isRemoving = true;
        layer.gainDelta = -layer.currentGain / fadeFrames;
      }
    }
    this.currentScene = null;
    this.playbackState = 'stopped';
  }

  /**
   * Emergency Stop All audio
   */
  public stopAll(fadeDuration: number = 0.5): void {
    if (fadeDuration <= 0) {
      this.layers.clear();
      this.currentScene = null;
      this.playbackState = 'stopped';
      return;
    }

    const fadeFrames = Math.max(1, fadeDuration * AudioMixer.SAMPLE_RATE);
    for (const [_, layer] of this.layers.entries()) {
      layer.targetGain = 0;
      layer.isRemoving = true;
      layer.gainDelta = -layer.currentGain / fadeFrames;
    }
    this.currentScene = null;
    this.playbackState = 'stopped';
  }

  /**
   * Audio Processing Loop: Mixes 960 stereo sample frames every 20ms
   */
  private processNextChunk(): Buffer {
    const chunkBuffer = Buffer.alloc(AudioMixer.BYTES_PER_CHUNK);

    if (this.isPaused || this.isMasterMuted || this.layers.size === 0) {
      // Return silence buffer
      return chunkBuffer;
    }

    const effectiveMaster = this.masterVolume;
    const framesToProcess = AudioMixer.FRAMES_PER_CHUNK;

    // Temporary 32-bit float accumulators for Left and Right channels
    const leftAcc = new Float32Array(framesToProcess);
    const rightAcc = new Float32Array(framesToProcess);

    const layersToDelete: string[] = [];

    // Scaling factor when mixing multiple simultaneous layers (headroom optimization)
    const activeLayerCount = this.layers.size;
    const headroomScale = activeLayerCount > 2 ? 1 / Math.sqrt(activeLayerCount * 0.5) : 1.0;

    for (const [id, layer] of this.layers.entries()) {
      const channelVol = this.channelMutes[layer.channel] ? 0 : this.channelVolumes[layer.channel];
      const channelMultiplier = channelVol * effectiveMaster * headroomScale;

      for (let f = 0; f < framesToProcess; f++) {
        // Ramp gain toward target
        if (layer.gainDelta !== 0) {
          layer.currentGain += layer.gainDelta;
          if (layer.gainDelta > 0 && layer.currentGain >= layer.targetGain) {
            layer.currentGain = layer.targetGain;
            layer.gainDelta = 0;
          } else if (layer.gainDelta < 0 && layer.currentGain <= layer.targetGain) {
            layer.currentGain = layer.targetGain;
            layer.gainDelta = 0;
            if (layer.isRemoving) {
              layersToDelete.push(id);
              break;
            }
          }
        }

        const effectiveGain = layer.currentGain * channelMultiplier;

        if (effectiveGain > 0.0001) {
          const sampleOffset = layer.cursor * 4;
          const sL = layer.buffer.readInt16LE(sampleOffset) / 32768;
          const sR = layer.buffer.readInt16LE(sampleOffset + 2) / 32768;

          leftAcc[f] += sL * effectiveGain;
          rightAcc[f] += sR * effectiveGain;
        }

        // Advance cursor
        layer.cursor++;
        if (layer.cursor >= layer.totalFrames) {
          if (layer.loop) {
            layer.cursor = 0;
          } else {
            // One-shot cue finished
            layersToDelete.push(id);
            break;
          }
        }
      }
    }

    // Clean up finished / faded out layers
    for (const id of layersToDelete) {
      this.layers.delete(id);
    }

    // Soft clip / clamp and write to 16-bit PCM chunkBuffer
    for (let f = 0; f < framesToProcess; f++) {
      let l = leftAcc[f];
      let r = rightAcc[f];

      // Soft saturation limiter to prevent digital crackle
      if (Math.abs(l) > 0.95) l = Math.tanh(l);
      if (Math.abs(r) > 0.95) r = Math.tanh(r);

      const intL = Math.round(Math.max(-1, Math.min(1, l)) * 32767);
      const intR = Math.round(Math.max(-1, Math.min(1, r)) * 32767);

      const offset = f * 4;
      chunkBuffer.writeInt16LE(intL, offset);
      chunkBuffer.writeInt16LE(intR, offset + 2);
    }

    return chunkBuffer;
  }
}
