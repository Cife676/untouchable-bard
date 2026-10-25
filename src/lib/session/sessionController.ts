import { AudioEngine, getAudioEngine } from '@/lib/audio/AudioEngine';
import { SoundGenerator } from '@/lib/audio/SoundGenerator';
import { AudioFileStorage } from '@/lib/storage/audioFileStorage';
import { AudioAsset, ChannelId, Scene } from '@/types/audio';
import { LiveLayerState, LiveSessionState, SessionCommand, SessionStateListener } from './sessionTypes';
import { DiscordClient } from '@/lib/discord/discordClient';

export type OutputTarget = 'browser' | 'discord' | 'both';

export class SessionController {
  private engine: AudioEngine;
  private state: LiveSessionState;
  private outputTarget: OutputTarget = 'browser';
  private scenes: Map<string, Scene> = new Map();
  private assets: Map<string, AudioAsset> = new Map();
  private listeners: Set<SessionStateListener> = new Set();
  private transitionTimer: NodeJS.Timeout | null = null;

  constructor(engine: AudioEngine = getAudioEngine()) {
    this.engine = engine;
    this.state = {
      activeSceneId: null,
      playbackState: 'stopped',
      crossfadeDuration: 2.0,
      layerStates: {},
      sfxShortcuts: {
        '1': 'sfx_wolf_howl',
        '2': 'sfx_branch_crack',
        '3': 'sfx_thunder',
      },
      isFullscreen: false,
    };
  }

  public updateContextData(scenes: Scene[], assets: AudioAsset[]): void {
    this.scenes.clear();
    scenes.forEach((s) => this.scenes.set(s.id, s));

    this.assets.clear();
    assets.forEach((a) => this.assets.set(a.id, a));

    // Map default shortcuts if assets present
    const sfxAssets = assets.filter((a) => a.type === 'SFX');
    sfxAssets.slice(0, 9).forEach((asset, idx) => {
      const key = (idx + 1).toString();
      if (!this.state.sfxShortcuts[key]) {
        this.state.sfxShortcuts[key] = asset.id;
      }
    });
  }

  public getState(): LiveSessionState {
    return { ...this.state };
  }

  public subscribe(listener: SessionStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(currentState));
  }

  private selectedGuildId: string | null = null;

  public setOutputTarget(target: OutputTarget): void {
    this.outputTarget = target;
  }

  public getOutputTarget(): OutputTarget {
    return this.outputTarget;
  }

  public setSelectedGuildId(guildId: string | null): void {
    this.selectedGuildId = guildId;
  }

  public getSelectedGuildId(): string | null {
    return this.selectedGuildId;
  }

  private async forwardCommandToDiscord(command: SessionCommand): Promise<void> {
    try {
      const guildId = this.selectedGuildId || undefined;
      switch (command.type) {
        case 'SCENE_START': {
          const scene = this.scenes.get(command.sceneId);
          if (scene) {
            // Ensure all custom assets in scene layers are uploaded to Discord
            for (const layer of scene.layers) {
              const asset = this.assets.get(layer.assetId);
              if (asset && asset.isCustom) {
                try {
                  const blob = await AudioFileStorage.getAudioBlob(asset.id);
                  if (blob) {
                    const file = new File([blob], asset.fileName || `${asset.name}.mp3`, { type: blob.type });
                    await DiscordClient.uploadAsset(asset.id, asset.name, file).catch(() => {});
                  }
                } catch {
                  // Non-fatal if upload check fails
                }
              }
            }

            await DiscordClient.sendCommand(
              {
                type: 'SCENE_START',
                scene: {
                  id: scene.id,
                  name: scene.name,
                  layers: scene.layers,
                  transitionOverride: scene.transitionOverride,
                },
                crossfade: command.crossfade,
              },
              guildId
            );
          }
          break;
        }
        case 'SCENE_STOP':
          await DiscordClient.sendCommand({ type: 'SCENE_STOP', fadeDuration: command.fadeDuration }, guildId);
          break;
        case 'SCENE_PAUSE':
          await DiscordClient.sendCommand({ type: 'SCENE_PAUSE' }, guildId);
          break;
        case 'SCENE_RESUME':
          await DiscordClient.sendCommand({ type: 'SCENE_RESUME' }, guildId);
          break;
        case 'SFX_TRIGGER': {
          const asset = this.assets.get(command.assetId);
          if (asset && asset.isCustom) {
            try {
              const blob = await AudioFileStorage.getAudioBlob(asset.id);
              if (blob) {
                const file = new File([blob], asset.fileName || `${asset.name}.mp3`, { type: blob.type });
                await DiscordClient.uploadAsset(asset.id, asset.name, file).catch(() => {});
              }
            } catch {
              // Non-fatal
            }
          }
          await DiscordClient.sendCommand({ type: 'SFX_TRIGGER', assetId: command.assetId, volume: command.volume }, guildId);
          break;
        }
        case 'CHANNEL_VOLUME_SET':
          await DiscordClient.sendCommand({ type: 'CHANNEL_VOLUME_SET', channel: command.channel, volume: command.volume }, guildId);
          break;
        case 'CHANNEL_MUTE_TOGGLE':
          await DiscordClient.sendCommand({ type: 'CHANNEL_MUTE_TOGGLE', channel: command.channel }, guildId);
          break;
        case 'MASTER_VOLUME_SET':
          await DiscordClient.sendCommand({ type: 'MASTER_VOLUME_SET', volume: command.volume }, guildId);
          break;
        case 'MASTER_MUTE':
          await DiscordClient.sendCommand({ type: 'MASTER_MUTE', muted: command.muted }, guildId);
          break;
        case 'STOP_ALL':
          await DiscordClient.sendCommand({ type: 'STOP_ALL', fadeDuration: command.fadeDuration }, guildId);
          break;
        case 'LAYER_VOLUME_SET':
          await DiscordClient.sendCommand({ type: 'LAYER_VOLUME_SET', layerId: command.layerId, volume: command.volume }, guildId);
          break;
      }
    } catch (err) {
      console.warn('[SessionController] Failed to forward command to Discord:', err);
    }
  }

  private updateStateForDiscordOnly(command: SessionCommand): void {
    switch (command.type) {
      case 'SCENE_START': {
        const scene = this.scenes.get(command.sceneId);
        if (scene) {
          this.state.activeSceneId = scene.id;
          this.state.playbackState = 'playing';
          const newLayerStates: Record<string, LiveLayerState> = {};
          scene.layers.forEach((l) => {
            newLayerStates[l.id] = {
              layerId: l.id,
              assetId: l.assetId,
              channel: l.channel,
              name: l.name,
              temporaryVolume: l.volume,
              isMuted: false,
              isPlaying: true,
            };
          });
          this.state.layerStates = newLayerStates;
          this.notify();
        }
        break;
      }
      case 'SCENE_STOP':
      case 'STOP_ALL':
        this.state.playbackState = 'stopped';
        Object.values(this.state.layerStates).forEach((l) => {
          l.isPlaying = false;
        });
        this.notify();
        break;
      case 'SCENE_PAUSE':
        this.state.playbackState = 'paused';
        this.notify();
        break;
      case 'SCENE_RESUME':
        this.state.playbackState = 'playing';
        this.notify();
        break;
      case 'LAYER_VOLUME_SET': {
        const layer = this.state.layerStates[command.layerId];
        if (layer) {
          layer.temporaryVolume = Math.max(0, Math.min(1, command.volume));
          this.notify();
        }
        break;
      }
      case 'CROSSFADE_SET':
        this.state.crossfadeDuration = Math.max(0, command.duration);
        this.notify();
        break;
    }
  }

  /**
   * Primary Command Dispatcher
   */
  public async dispatch(command: SessionCommand): Promise<void> {
    // 1. Route to Discord if enabled
    if (this.outputTarget === 'discord' || this.outputTarget === 'both') {
      this.forwardCommandToDiscord(command);
    }

    // 2. Route to Web Audio Engine if enabled
    if (this.outputTarget === 'browser' || this.outputTarget === 'both') {
      switch (command.type) {
        case 'SCENE_START':
          await this.handleSceneStart(command.sceneId, command.crossfade);
          break;

        case 'SCENE_STOP':
          this.handleSceneStop(command.fadeDuration);
          break;

        case 'SCENE_PAUSE':
          this.handleScenePause();
          break;

        case 'SCENE_RESUME':
          this.handleSceneResume();
          break;

        case 'SFX_TRIGGER':
          await this.handleSfxTrigger(command.assetId, command.volume);
          break;

        case 'CHANNEL_VOLUME_SET':
          this.engine.setChannelVolume(command.channel, command.volume);
          break;

        case 'CHANNEL_MUTE_TOGGLE': {
          const ch = this.engine.getChannel(command.channel);
          if (ch) ch.setMute(!ch.isChannelMuted());
          break;
        }

        case 'MASTER_VOLUME_SET':
          this.engine.setMasterVolume(command.volume);
          break;

        case 'MASTER_MUTE':
          this.engine.setMasterMute(command.muted);
          break;

        case 'STOP_ALL':
          this.handleStopAll(command.fadeDuration);
          break;

        case 'LAYER_VOLUME_SET':
          this.handleLayerVolume(command.layerId, command.volume);
          break;

        case 'LAYER_MUTE_TOGGLE':
          this.handleLayerMuteToggle(command.layerId);
          break;

        case 'CROSSFADE_SET':
          this.state.crossfadeDuration = Math.max(0, command.duration);
          this.notify();
          break;
      }
    } else {
      // Discord-only mode: update UI session state
      this.updateStateForDiscordOnly(command);
    }
  }

  /**
   * Resolve an audio buffer for an asset
   */
  private async resolveBuffer(assetId: string): Promise<AudioBuffer | null> {
    await this.engine.init();
    const ctx = this.engine.getContext();
    if (!ctx) return null;

    const cached = this.engine.getCachedBuffer(assetId);
    if (cached) return cached;

    const asset = this.assets.get(assetId);
    if (!asset) return null;

    let buffer: AudioBuffer | null = null;

    if (asset.fileUrl && asset.fileUrl.startsWith('procedural:')) {
      const soundKey = asset.fileUrl.replace('procedural:', '');
      switch (soundKey) {
        case 'music_pad':
          buffer = SoundGenerator.createMusicPad(ctx);
          break;
        case 'wind_ambience':
          buffer = SoundGenerator.createWindAmbience(ctx);
          break;
        case 'rain_environment':
          buffer = SoundGenerator.createRainEnvironment(ctx);
          break;
        case 'wolf_howl':
          buffer = SoundGenerator.createWolfHowl(ctx);
          break;
        case 'branch_crack':
          buffer = SoundGenerator.createBranchCrack(ctx);
          break;
        case 'thunder':
          buffer = SoundGenerator.createThunder(ctx);
          break;
        default:
          return null;
      }
    } else {
      if (asset.fileUrl) {
        try {
          buffer = await this.engine.loadAudioFile(asset.fileUrl);
        } catch {
          buffer = null;
        }
      }
      if (!buffer) {
        try {
          const blob = await AudioFileStorage.getAudioBlob(assetId);
          if (blob) {
            const arrayBuffer = await blob.arrayBuffer();
            buffer = await ctx.decodeAudioData(arrayBuffer);
          }
        } catch {
          buffer = null;
        }
      }
    }

    if (buffer) {
      this.engine.cacheBuffer(assetId, buffer);
    }
    return buffer;
  }

  /**
   * Handle Scene Transition
   */
  private async handleSceneStart(sceneId: string, customCrossfade?: number): Promise<void> {
    const scene = this.scenes.get(sceneId);
    if (!scene) return;

    await this.engine.init();

    // Determine crossfade: custom parameter -> scene-specific override -> session default
    const crossfade = customCrossfade ?? scene.transitionOverride ?? this.state.crossfadeDuration;

    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    this.state.activeSceneId = sceneId;
    this.state.playbackState = 'transitioning';
    this.notify();

    // Stop active music & ambience with fade if currently playing
    const sceneChannels = new Set(scene.layers.map((l) => l.channel));
    for (const channelId of ['music', 'ambience', 'environment'] as ChannelId[]) {
      if (sceneChannels.has(channelId)) {
        // Fade out prior track to prepare for crossfade
        this.engine.stopChannel(channelId, crossfade);
      }
    }

    // Initialize live layer states from scene configuration (without modifying saved config)
    const newLayerStates: Record<string, LiveLayerState> = {};
    for (const layer of scene.layers) {
      newLayerStates[layer.id] = {
        layerId: layer.id,
        assetId: layer.assetId,
        channel: layer.channel,
        name: layer.name,
        temporaryVolume: layer.volume,
        isMuted: false,
        isPlaying: true,
      };

      // Play layer on channel
      const buffer = await this.resolveBuffer(layer.assetId);
      if (buffer) {
        await this.engine.playTrack(
          layer.channel,
          layer.assetId,
          buffer,
          {
            volume: layer.volume,
            loop: layer.loop,
            fadeDuration: crossfade,
          },
          layer.name
        );
      }
    }

    this.state.layerStates = newLayerStates;

    // Transition completion
    this.transitionTimer = setTimeout(() => {
      this.state.playbackState = 'playing';
      this.notify();
    }, crossfade * 1000);

    this.notify();
  }

  private handleSceneStop(fadeDuration?: number): void {
    const fade = fadeDuration ?? this.state.crossfadeDuration;
    this.engine.stopAll(fade);
    this.state.playbackState = 'stopped';
    Object.values(this.state.layerStates).forEach((l) => {
      l.isPlaying = false;
    });
    this.notify();
  }

  private handleScenePause(): void {
    ['music', 'ambience', 'environment', 'sfx'].forEach((ch) => {
      this.engine.pauseChannel(ch as ChannelId);
    });
    this.state.playbackState = 'paused';
    this.notify();
  }

  private handleSceneResume(): void {
    ['music', 'ambience', 'environment', 'sfx'].forEach((ch) => {
      this.engine.resumeChannel(ch as ChannelId);
    });
    this.state.playbackState = 'playing';
    this.notify();
  }

  private async handleSfxTrigger(assetId: string, volume: number = 0.85): Promise<void> {
    const buffer = await this.resolveBuffer(assetId);
    if (!buffer) return;

    const asset = this.assets.get(assetId);
    await this.engine.playTrack(
      'sfx',
      assetId,
      buffer,
      {
        volume,
        loop: false,
        fadeDuration: 0,
      },
      asset?.name ?? 'SFX Cue'
    );
  }

  private handleStopAll(fadeDuration?: number): void {
    const fade = fadeDuration ?? 0.8;
    this.engine.stopAll(fade);
    this.state.playbackState = 'stopped';
    Object.values(this.state.layerStates).forEach((l) => {
      l.isPlaying = false;
    });
    this.notify();
  }

  private handleLayerVolume(layerId: string, volume: number): void {
    const layer = this.state.layerStates[layerId];
    if (layer) {
      layer.temporaryVolume = Math.max(0, Math.min(1, volume));
      // Apply live channel volume adjustment
      this.engine.setChannelVolume(layer.channel, layer.temporaryVolume);
      this.notify();
    }
  }

  private handleLayerMuteToggle(layerId: string): void {
    const layer = this.state.layerStates[layerId];
    if (layer) {
      layer.isMuted = !layer.isMuted;
      if (layer.isMuted) {
        this.engine.setChannelVolume(layer.channel, 0);
      } else {
        this.engine.setChannelVolume(layer.channel, layer.temporaryVolume);
      }
      this.notify();
    }
  }

  public setFullscreen(isFullscreen: boolean): void {
    this.state.isFullscreen = isFullscreen;
    this.notify();
  }
}

// Global Singleton SessionController
let sessionControllerInstance: SessionController | null = null;

export function getSessionController(): SessionController {
  if (!sessionControllerInstance) {
    sessionControllerInstance = new SessionController();
  }
  return sessionControllerInstance;
}
