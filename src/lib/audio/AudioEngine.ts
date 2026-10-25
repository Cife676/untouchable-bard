import { AudioChannel } from './AudioChannel';
import { ChannelId, EngineSnapshot, PlayTrackOptions } from '@/types/audio';

type StateListener = (snapshot: EngineSnapshot) => void;

/**
 * AudioEngine is the master orchestrator for all audio playback.
 * It manages the Web Audio API AudioContext, Master Gain, and individual Channels.
 * It operates independently of React and any UI frameworks.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private masterVolume: number = 0.8;
  private isMasterMuted: boolean = false;

  private channels: Map<ChannelId, AudioChannel> = new Map();
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private listeners: Set<StateListener> = new Set();

  constructor() {
    // AudioContext will be lazily initialized on first user interaction in browser
  }

  /**
   * Initializes or resumes the AudioContext upon user gesture.
   */
  public async init(): Promise<void> {
    if (typeof window === 'undefined') return;

    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Initialize the core channels
      const channelConfigs: { id: ChannelId; name: string; volume: number }[] = [
        { id: 'music', name: 'Background Music', volume: 0.6 },
        { id: 'ambience', name: 'Ambience', volume: 0.4 },
        { id: 'environment', name: 'Environment Layers', volume: 0.35 },
        { id: 'sfx', name: 'Sound Effects', volume: 0.75 },
      ];

      for (const config of channelConfigs) {
        const channel = new AudioChannel(
          config.id,
          config.name,
          this.ctx,
          this.masterGain,
          config.volume,
          () => this.notifyListeners()
        );
        this.channels.set(config.id, channel);
      }
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.notifyListeners();
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public getChannel(id: ChannelId): AudioChannel | undefined {
    return this.channels.get(id);
  }

  /**
   * Adjust master volume (0.0 to 1.0)
   */
  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.ctx && this.masterGain && !this.isMasterMuted) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.masterVolume, now + 0.05);
    }
    this.notifyListeners();
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Toggle or set master mute
   */
  public setMasterMute(muted: boolean): void {
    this.isMasterMuted = muted;
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      const targetGain = this.isMasterMuted ? 0 : this.masterVolume;
      this.masterGain.gain.linearRampToValueAtTime(targetGain, now + 0.05);
    }
    this.notifyListeners();
  }

  public isMuted(): boolean {
    return this.isMasterMuted;
  }

  /**
   * Set volume for a specific channel
   */
  public setChannelVolume(channelId: ChannelId, volume: number): void {
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.setVolume(volume);
    }
  }

  /**
   * Play an AudioBuffer on a designated channel
   */
  public async playTrack(
    channelId: ChannelId,
    trackId: string,
    buffer: AudioBuffer,
    options: PlayTrackOptions = {},
    trackName?: string
  ): Promise<string | null> {
    await this.init();
    const channel = this.channels.get(channelId);
    if (!channel) {
      console.warn(`Channel ${channelId} not found`);
      return null;
    }
    return channel.play(trackId, buffer, options, trackName);
  }

  /**
   * Stop audio on a channel with optional fade duration
   */
  public stopChannel(channelId: ChannelId, fadeDuration: number = 0.5): void {
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.stopAll(fadeDuration);
    }
  }

  /**
   * Pause audio on a channel
   */
  public pauseChannel(channelId: ChannelId): void {
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.pause();
    }
  }

  /**
   * Resume audio on a channel
   */
  public resumeChannel(channelId: ChannelId): void {
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.resume();
    }
  }

  /**
   * Stop all channels simultaneously
   */
  public stopAll(fadeDuration: number = 0.5): void {
    for (const channel of this.channels.values()) {
      channel.stopAll(fadeDuration);
    }
    this.notifyListeners();
  }

  /**
   * Load and cache an external audio file into an AudioBuffer
   */
  public async loadAudioFile(url: string): Promise<AudioBuffer> {
    await this.init();
    if (!this.ctx) {
      throw new Error('AudioContext failed to initialize');
    }

    if (this.bufferCache.has(url)) {
      return this.bufferCache.get(url)!;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio at ${url}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.bufferCache.set(url, audioBuffer);
    return audioBuffer;
  }

  /**
   * Cache a pre-generated or decoded AudioBuffer under a specific key
   */
  public cacheBuffer(key: string, buffer: AudioBuffer): void {
    this.bufferCache.set(key, buffer);
  }

  public getCachedBuffer(key: string): AudioBuffer | undefined {
    return this.bufferCache.get(key);
  }

  /**
   * Produce a snapshot of current engine state for UI or external monitors
   */
  public getSnapshot(): EngineSnapshot {
    const channelRecord: EngineSnapshot['channels'] = {
      music: this.channels.get('music')?.getStatus() ?? {
        id: 'music',
        name: 'Background Music',
        volume: 0.6,
        isMuted: false,
        isPlaying: false,
      },
      ambience: this.channels.get('ambience')?.getStatus() ?? {
        id: 'ambience',
        name: 'Ambience',
        volume: 0.4,
        isMuted: false,
        isPlaying: false,
      },
      environment: this.channels.get('environment')?.getStatus() ?? {
        id: 'environment',
        name: 'Environment Layers',
        volume: 0.35,
        isMuted: false,
        isPlaying: false,
      },
      sfx: this.channels.get('sfx')?.getStatus() ?? {
        id: 'sfx',
        name: 'Sound Effects',
        volume: 0.75,
        isMuted: false,
        isPlaying: false,
      },
    };

    return {
      isInitialized: this.ctx !== null && this.ctx.state === 'running',
      masterVolume: this.masterVolume,
      isMasterMuted: this.isMasterMuted,
      channels: channelRecord,
    };
  }

  /**
   * Subscribe to state updates
   */
  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

// Global singleton instance for the browser session
let engineInstance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!engineInstance) {
    engineInstance = new AudioEngine();
  }
  return engineInstance;
}
