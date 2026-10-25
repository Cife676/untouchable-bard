import { AudioMixer } from './audioMixer.js';
import { VoiceManager } from './voiceManager.js';
import { GuildSessionStatus, VoiceChannelInfo } from './types.js';

export class GuildSession {
  public readonly guildId: string;
  public guildName: string | null = null;
  public readonly mixer: AudioMixer;
  public readonly voiceManager: VoiceManager;

  constructor(guildId: string, guildName?: string) {
    this.guildId = guildId;
    this.guildName = guildName || null;
    this.mixer = new AudioMixer();
    this.voiceManager = new VoiceManager(this.mixer);
  }

  public getStatus(availableChannels: VoiceChannelInfo[] = []): GuildSessionStatus {
    return {
      guildId: this.guildId,
      guildName: this.guildName,
      voiceChannelId: this.voiceManager.getCurrentChannelId(),
      voiceChannelName: this.voiceManager.getCurrentChannelName(),
      connectionState: this.voiceManager.getConnectionState(),
      lastError: this.voiceManager.getLastError(),
      playbackState: this.mixer.getPlaybackState(),
      currentScene: this.mixer.getCurrentScene(),
      activeLayers: this.mixer.getActiveLayers(),
      masterVolume: this.mixer.getMasterVolume(),
      isMasterMuted: this.mixer.getIsMasterMuted(),
      channelVolumes: this.mixer.getChannelVolumes(),
      channelMutes: this.mixer.getChannelMutes(),
      availableChannels,
    };
  }

  public destroy(): void {
    this.voiceManager.disconnect();
    this.mixer.stop();
  }
}
