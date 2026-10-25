import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayer,
  AudioPlayerStatus,
  VoiceConnection,
  VoiceConnectionStatus,
  StreamType,
  entersState,
} from '@discordjs/voice';
import { AudioMixer } from './audioMixer.js';
import { ConnectionState } from './types.js';

export class VoiceManager {
  private mixer: AudioMixer;
  private connection: VoiceConnection | null = null;
  private player: AudioPlayer | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private currentGuildId: string | null = null;
  private currentChannelId: string | null = null;
  private currentChannelName: string | null = null;
  private lastError: string | null = null;

  constructor(mixer: AudioMixer) {
    this.mixer = mixer;
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public getCurrentChannelId(): string | null {
    return this.currentChannelId;
  }

  public getCurrentChannelName(): string | null {
    return this.currentChannelName;
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public async connect(
    guildId: string,
    channelId: string,
    channelName: string,
    adapterCreator: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.connectionState = 'connecting';
      this.lastError = null;
      this.currentGuildId = guildId;
      this.currentChannelId = channelId;
      this.currentChannelName = channelName;

      console.log(`[VoiceManager][${guildId}] Initiating voice connection to channel #${channelName} (${channelId})`);

      // Disconnect prior connection if exists
      if (this.connection) {
        console.log(`[VoiceManager][${guildId}] Destroying previous connection`);
        this.connection.destroy();
        this.connection = null;
      }

      this.connection = joinVoiceChannel({
        channelId,
        guildId,
        adapterCreator,
        selfDeaf: true,
        selfMute: false,
        debug: true,
      });

      // Structured logging for VoiceConnection debug events
      this.connection.on('debug', (message) => {
        console.log(`[VoiceConnection:debug][${guildId}] ${message}`);
      });

      this.connection.on('error', (error) => {
        console.error(`[VoiceConnection:error][${guildId}] Error:`, error?.message || error);
        this.lastError = error?.message || 'VoiceConnection error occurred';
      });

      // Handle connection lifecycle
      this.connection.on(VoiceConnectionStatus.Signalling, () => {
        console.log(`[VoiceConnection][${guildId}] State: Signalling`);
      });

      this.connection.on(VoiceConnectionStatus.Connecting, () => {
        console.log(`[VoiceConnection][${guildId}] State: Connecting`);
      });

      this.connection.on(VoiceConnectionStatus.Ready, () => {
        console.log(`[VoiceConnection][${guildId}] State: Ready`);
        this.connectionState = 'connected';
        this.lastError = null;
      });

      this.connection.on(VoiceConnectionStatus.Disconnected, async (_, newState) => {
        const reason = (newState as any)?.reason;
        const closeCode = (newState as any)?.closeCode;
        console.warn(`[VoiceConnection][${guildId}] State: Disconnected (reason: ${reason}, closeCode: ${closeCode})`);

        // If this is code 4014 (manual disconnect or channel change), don't attempt auto-recovery
        if (closeCode === 4014) {
          console.log(`[VoiceConnection][${guildId}] WebSocket closed with 4014. Disconnecting cleanly.`);
          this.connectionState = 'disconnected';
          this.cleanup();
          return;
        }

        try {
          // If disconnected, allow recovery within 5 seconds unless destroyed
          console.log(`[VoiceConnection][${guildId}] Attempting automatic recovery...`);
          await Promise.race([
            entersState(this.connection!, VoiceConnectionStatus.Signalling, 5_000),
            entersState(this.connection!, VoiceConnectionStatus.Connecting, 5_000),
          ]);
          console.log(`[VoiceConnection][${guildId}] Re-entered signalling/connecting for recovery`);
        } catch {
          // If recovery fails or was aborted
          console.warn(`[VoiceConnection][${guildId}] Recovery timeout reached or unrecoverable disconnect`);
          // Only destroy if we aren't currently waiting in connect()
          if (this.connectionState === 'connected') {
            this.connectionState = 'disconnected';
            this.lastError = `Disconnected from voice channel (close code: ${closeCode ?? 'unknown'})`;
            this.cleanup();
          }
        }
      });

      this.connection.on(VoiceConnectionStatus.Destroyed, () => {
        console.log(`[VoiceConnection][${guildId}] State: Destroyed`);
        this.connectionState = 'disconnected';
      });

      // Wait up to 15s for Ready state
      console.log(`[VoiceManager][${guildId}] Awaiting Ready state (15s timeout)...`);
      try {
        await entersState(this.connection, VoiceConnectionStatus.Ready, 15_000);
        console.log(`[VoiceManager][${guildId}] Successfully reached Ready state`);
      } catch (waitErr: any) {
        const isAbort = waitErr?.name === 'AbortError' || waitErr?.message?.includes('aborted');
        const currentState = this.connection?.state?.status || 'none';
        const failureReason = isAbort
          ? `Voice connection timed out waiting for Ready state (current state: ${currentState}). Check UDP traffic/firewall or voice gateway connectivity.`
          : (waitErr?.message || 'Failed waiting for Ready state');
        console.error(`[VoiceManager][${guildId}] ${failureReason}`);
        throw new Error(failureReason);
      }

      // Start audio player with auto-recovery listeners
      this.player = createAudioPlayer();
      this.setupPlayerListeners(guildId);

      // Create stream resource from fresh mixer stream
      const stream = this.mixer.resetStream();
      this.mixer.start();
      const resource = createAudioResource(stream, {
        inputType: StreamType.Raw,
      });

      this.player.play(resource);
      this.connection.subscribe(this.player);

      this.connectionState = 'connected';
      this.lastError = null;
      console.log(`[VoiceManager][${guildId}] Subscribed fresh mixer stream to audio player. Playback active.`);
      return { success: true };
    } catch (err: any) {
      console.error(`[VoiceManager][${guildId}] Voice connection failed:`, err?.stack || err?.message || err);
      this.connectionState = 'error';
      this.lastError = err?.message || 'Failed to establish voice connection';
      this.cleanup();
      return { success: false, error: this.lastError || undefined };
    }
  }

  private setupPlayerListeners(guildId: string): void {
    if (!this.player) return;

    this.player.on('error', (err) => {
      console.error(`[AudioPlayer:error][${guildId}]`, err.message);
      this.lastError = `Player error: ${err.message}`;
      // Auto-recover if voice connection is still connected
      if (this.connection && this.connectionState === 'connected') {
        console.log(`[VoiceManager][${guildId}] Recovering audio pipeline following player error...`);
        this.recreateAudioPipeline(guildId);
      }
    });

    this.player.on(AudioPlayerStatus.Idle, () => {
      // Endless mixer stream should not enter Idle while actively connected
      if (this.connection && this.connectionState === 'connected') {
        console.warn(`[AudioPlayer][${guildId}] Unexpected Idle state detected on active mixer stream. Recreating pipeline...`);
        this.recreateAudioPipeline(guildId);
      }
    });
  }

  private recreateAudioPipeline(guildId: string): void {
    if (!this.connection || this.connectionState !== 'connected') return;

    if (this.player) {
      try {
        this.player.stop(true);
      } catch {
        // Ignore
      }
      this.player = null;
    }

    this.player = createAudioPlayer();
    this.setupPlayerListeners(guildId);

    const stream = this.mixer.resetStream();
    this.mixer.start();
    const resource = createAudioResource(stream, {
      inputType: StreamType.Raw,
    });

    this.player.play(resource);
    this.connection.subscribe(this.player);
    console.log(`[VoiceManager][${guildId}] Audio pipeline successfully re-established.`);
  }

  public disconnect(): void {
    console.log(`[VoiceManager][${this.currentGuildId || 'unknown'}] Manual disconnect requested`);
    this.cleanup();
    this.connectionState = 'disconnected';
    this.currentChannelId = null;
    this.currentChannelName = null;
    this.lastError = null;
  }

  private cleanup(): void {
    if (this.player) {
      try {
        this.player.stop(true);
      } catch {
        // Ignore
      }
      this.player = null;
    }
    if (this.connection) {
      try {
        this.connection.destroy();
      } catch {
        // Ignore
      }
      this.connection = null;
    }
    this.mixer.stop();
  }
}
