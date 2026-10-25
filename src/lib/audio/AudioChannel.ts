import { ChannelId, ChannelStatus, PlayTrackOptions } from '@/types/audio';

export interface ActiveVoice {
  id: string;
  trackName: string;
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  buffer: AudioBuffer;
  options: PlayTrackOptions;
  startTime: number;
  pauseOffset: number;
  isPaused: boolean;
}

/**
 * AudioChannel manages a distinct audio category (e.g., Music, Ambience, SFX)
 * with independent volume, muting, and voice lifecycle management.
 */
export class AudioChannel {
  public readonly id: ChannelId;
  public readonly name: string;

  private ctx: AudioContext;
  private channelGain: GainNode;
  private parentDestination: AudioNode;

  private volume: number = 0.8;
  private isMuted: boolean = false;
  private voices: Map<string, ActiveVoice> = new Map();
  private onStateChange: () => void;

  constructor(
    id: ChannelId,
    name: string,
    ctx: AudioContext,
    parentDestination: AudioNode,
    defaultVolume: number = 0.8,
    onStateChange: () => void = () => {}
  ) {
    this.id = id;
    this.name = name;
    this.ctx = ctx;
    this.parentDestination = parentDestination;
    this.volume = defaultVolume;
    this.onStateChange = onStateChange;

    this.channelGain = this.ctx.createGain();
    this.channelGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    this.channelGain.connect(this.parentDestination);
  }

  /**
   * Set channel volume (0.0 to 1.0)
   */
  public setVolume(newVolume: number, rampDuration: number = 0.05): void {
    this.volume = Math.max(0, Math.min(1, newVolume));
    if (!this.isMuted) {
      const now = this.ctx.currentTime;
      this.channelGain.gain.cancelScheduledValues(now);
      this.channelGain.gain.linearRampToValueAtTime(this.volume, now + rampDuration);
    }
    this.onStateChange();
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Toggle or set mute state for this channel
   */
  public setMute(muted: boolean): void {
    this.isMuted = muted;
    const now = this.ctx.currentTime;
    this.channelGain.gain.cancelScheduledValues(now);
    const targetGain = this.isMuted ? 0 : this.volume;
    this.channelGain.gain.linearRampToValueAtTime(targetGain, now + 0.05);
    this.onStateChange();
  }

  public isChannelMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Play an audio buffer on this channel
   */
  public play(
    trackId: string,
    buffer: AudioBuffer,
    options: PlayTrackOptions = {},
    trackName: string = trackId
  ): string {
    const fadeDuration = options.fadeDuration ?? 0.5;
    const targetVolume = options.volume ?? 1.0;
    const loop = options.loop ?? false;
    const startOffset = options.startOffset ?? 0;

    // For single-stream channels like 'music', stop any existing voice with a fade
    if (this.id === 'music' && this.voices.size > 0) {
      this.stopAll(fadeDuration);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    // Dedicated gain node for this specific voice instance (permits layer volume + fading)
    const voiceGain = this.ctx.createGain();
    source.connect(voiceGain);
    voiceGain.connect(this.channelGain);

    const now = this.ctx.currentTime;

    // Fade-in handling
    if (fadeDuration > 0) {
      voiceGain.gain.setValueAtTime(0.0001, now);
      voiceGain.gain.linearRampToValueAtTime(targetVolume, now + fadeDuration);
    } else {
      voiceGain.gain.setValueAtTime(targetVolume, now);
    }

    const voiceInstanceId = `${trackId}_${Date.now()}`;
    const voice: ActiveVoice = {
      id: voiceInstanceId,
      trackName,
      source,
      gainNode: voiceGain,
      buffer,
      options,
      startTime: now - startOffset,
      pauseOffset: startOffset,
      isPaused: false,
    };

    source.onended = () => {
      // Cleanup if the sound ended naturally (and wasn't just paused/replaced)
      if (this.voices.has(voiceInstanceId) && !voice.isPaused) {
        this.cleanupVoice(voiceInstanceId);
        this.onStateChange();
      }
    };

    source.start(0, startOffset % buffer.duration);
    this.voices.set(voiceInstanceId, voice);
    this.onStateChange();

    return voiceInstanceId;
  }

  /**
   * Pause all active voices on this channel
   */
  public pause(): void {
    const now = this.ctx.currentTime;
    for (const [id, voice] of this.voices.entries()) {
      if (!voice.isPaused) {
        voice.pauseOffset = (now - voice.startTime) % voice.buffer.duration;
        voice.isPaused = true;
        try {
          voice.source.stop();
          voice.source.disconnect();
        } catch {
          // In case already stopped
        }
      }
    }
    this.onStateChange();
  }

  /**
   * Resume paused voices on this channel
   */
  public resume(): void {
    const voicesToResume = Array.from(this.voices.values()).filter((v) => v.isPaused);
    for (const voice of voicesToResume) {
      this.voices.delete(voice.id);
      this.play(
        voice.id.split('_')[0],
        voice.buffer,
        {
          ...voice.options,
          startOffset: voice.pauseOffset,
          fadeDuration: 0.1,
        },
        voice.trackName
      );
    }
    this.onStateChange();
  }

  /**
   * Stop all playing sounds on this channel with optional fade-out
   */
  public stopAll(fadeDuration: number = 0.5): void {
    const now = this.ctx.currentTime;
    for (const [id, voice] of this.voices.entries()) {
      const currentGain = voice.gainNode.gain.value;
      voice.gainNode.gain.cancelScheduledValues(now);
      voice.gainNode.gain.setValueAtTime(currentGain, now);
      voice.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);

      setTimeout(() => {
        try {
          voice.source.stop();
          this.cleanupVoice(id);
        } catch {
          // Ignore if already stopped
        }
        this.onStateChange();
      }, fadeDuration * 1000 + 50);
    }
  }

  /**
   * Disconnects nodes and removes voice from active tracking
   */
  private cleanupVoice(voiceId: string): void {
    const voice = this.voices.get(voiceId);
    if (voice) {
      try {
        voice.source.disconnect();
        voice.gainNode.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      this.voices.delete(voiceId);
    }
  }

  /**
   * Returns current snapshot of channel state
   */
  public getStatus(): ChannelStatus {
    const activeVoices = Array.from(this.voices.values()).filter((v) => !v.isPaused);
    const isPlaying = activeVoices.length > 0;
    const currentTrackName = activeVoices[activeVoices.length - 1]?.trackName;

    return {
      id: this.id,
      name: this.name,
      volume: this.volume,
      isMuted: this.isMuted,
      isPlaying,
      currentTrackName,
    };
  }
}
