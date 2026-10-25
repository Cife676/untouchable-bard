'use client';

import React, { useState } from 'react';
import {
  Radio,
  Volume2,
  Headphones,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  LogOut,
  Sparkles,
  UploadCloud,
  Bot,
  Server,
} from 'lucide-react';
import { useDiscordVoice, AudioOutputTarget } from '@/lib/discord/useDiscordVoice';
import { useSession } from '@/lib/session/useSession';
import { useTabletop } from '@/context/TabletopContext';
import { LiveDiscordSetupModal } from './LiveDiscordSetupModal';

export const LiveDiscordPanel: React.FC = () => {
  const {
    outputTarget,
    setOutputTarget,
    selectedGuildId,
    setSelectedGuildId,
    guilds,
    channels,
    status,
    isConnecting,
    syncProgress,
    connectVoice,
    disconnectVoice,
    playTestTone,
    syncCustomAssets,
    refreshStatus,
  } = useDiscordVoice();

  const { setOutputTarget: setSessionOutputTarget, state: sessionState } = useSession();
  const { assets, activeScene } = useTabletop();

  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [isSetupGuideOpen, setIsSetupGuideOpen] = useState(false);
  const [testToneMessage, setTestToneMessage] = useState<string | null>(null);
  const [connectionErrorMessage, setConnectionErrorMessage] = useState<string | null>(null);

  // Sync output target to session controller
  const handleSelectOutput = (target: AudioOutputTarget) => {
    setOutputTarget(target);
    setSessionOutputTarget(target);
  };

  const handleConnect = async () => {
    const channelId = selectedChannelId || (channels.length > 0 ? channels[0].id : '');
    if (!channelId) return;
    setConnectionErrorMessage(null);
    const result = await connectVoice(channelId);
    if (!result.success) {
      setConnectionErrorMessage(result.error || 'Failed to connect to Discord voice channel.');
    }
  };

  const handleTestTone = async () => {
    setTestToneMessage('Sending test chime...');
    const res = await playTestTone();
    if (res.success) {
      setTestToneMessage('Chime sent to voice channel!');
      setTimeout(() => setTestToneMessage(null), 3500);
    } else {
      setTestToneMessage(res.error || 'Test tone failed');
      setTimeout(() => setTestToneMessage(null), 4000);
    }
  };

  const handleSyncAssets = async () => {
    await syncCustomAssets(assets);
  };

  const isConnected = status?.connectionState === 'connected';
  const isOnline = Boolean(status?.isOnline);
  const isServiceReachable = Boolean(status && status.isServiceReachable !== false);
  const currentGuildName = status?.guildName || guilds.find((g) => g.id === selectedGuildId)?.name || 'Discord Server';

  return (
    <div className="bg-[#121620] border border-[#242e40] rounded-xl p-4 md:p-5 shadow-xl space-y-4">
      {/* Top Strip: Audio Output Selector & Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#212b3c]">
        {/* Output Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-300">
            <Radio className="w-4 h-4 text-amber-400" />
            <span>Audio Output:</span>
          </div>

          <div className="inline-flex rounded-lg bg-[#161c27] p-1 border border-[#273244]">
            <button
              onClick={() => handleSelectOutput('browser')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                outputTarget === 'browser'
                  ? 'bg-amber-600 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Browser</span>
            </button>

            <button
              onClick={() => handleSelectOutput('discord')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                outputTarget === 'discord'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Discord</span>
            </button>

            <button
              onClick={() => handleSelectOutput('both')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                outputTarget === 'both'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Both</span>
            </button>
          </div>
        </div>

        {/* Discord Bot Connection Status Pill & Actions */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-800/80 px-3 py-1 rounded-full shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                CONNECTED: #{status?.voiceChannelName || 'Voice'} ({currentGuildName})
              </span>
            </span>
          ) : isConnecting ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-950/70 border border-amber-800/80 px-3 py-1 rounded-full animate-pulse">
              <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
              <span>CONNECTING TO VOICE...</span>
            </span>
          ) : isOnline ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 bg-indigo-950/70 border border-indigo-800/80 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span>
                BOT ONLINE ({status?.botTag || 'Discord'} • {guilds.length} {guilds.length === 1 ? 'server' : 'servers'})
              </span>
            </span>
          ) : !isServiceReachable ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-neutral-600" />
              <span>DISCORD SERVICE OFFLINE</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-950/50 border border-amber-800/60 px-3 py-1 rounded-full">
              <AlertCircle className="w-3 h-3" />
              <span>BOT TOKEN REQUIRED</span>
            </span>
          )}

          <button
            onClick={() => setIsSetupGuideOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-neutral-400 hover:text-amber-300 bg-[#171d29] hover:bg-[#202939] border border-[#2b374c] rounded-lg transition cursor-pointer"
            title="Discord Bot Setup Instructions & Multi-Server Invite"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Setup Guide</span>
          </button>
        </div>
      </div>

      {/* Main Connection Controls Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        {/* Left: Server (Guild) & Voice Channel Selectors + Connect / Disconnect */}
        <div className="md:col-span-2 flex flex-wrap items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-2">
              <button
                onClick={disconnectVoice}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-red-400" />
                <span>Disconnect Voice</span>
              </button>

              <button
                onClick={handleTestTone}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 rounded-lg text-xs font-semibold transition cursor-pointer"
                title="Play test audio chime into Discord voice channel"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Test Voice Sound</span>
              </button>

              {testToneMessage && (
                <span className="text-[11px] font-mono text-indigo-300 animate-in fade-in">
                  {testToneMessage}
                </span>
              )}
            </div>
          ) : isOnline ? (
            <div className="flex flex-wrap items-center gap-2 w-full">
              {/* Server (Guild) Selector */}
              {guilds.length > 0 ? (
                <>
                  <div className="flex items-center gap-1.5 bg-[#171d29] px-2.5 py-1 rounded-lg border border-[#2c384e]">
                    <Server className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <select
                      value={selectedGuildId || ''}
                      onChange={(e) => {
                        setSelectedGuildId(e.target.value);
                        setSelectedChannelId('');
                      }}
                      className="bg-transparent text-xs font-bold text-amber-300 focus:outline-hidden cursor-pointer max-w-[160px] truncate"
                      title="Select Discord Server"
                    >
                      {guilds.map((g) => (
                        <option key={g.id} value={g.id} className="bg-[#121620] text-neutral-200">
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Voice Channel Selector */}
                  <select
                    value={selectedChannelId || (channels[0]?.id ?? '')}
                    onChange={(e) => setSelectedChannelId(e.target.value)}
                    disabled={channels.length === 0}
                    className="bg-[#171d29] text-xs font-medium text-neutral-200 border border-[#2c384e] rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-amber-500 cursor-pointer min-w-[170px] disabled:opacity-50"
                  >
                    {channels.length === 0 ? (
                      <option value="">No voice channels</option>
                    ) : (
                      channels.map((ch) => (
                        <option key={ch.id} value={ch.id} className="bg-[#121620] text-neutral-200">
                          #{ch.name} {ch.userCount > 0 ? `(${ch.userCount} in call)` : ''}
                        </option>
                      ))
                    )}
                  </select>

                  <button
                    onClick={handleConnect}
                    disabled={isConnecting || channels.length === 0}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-sm"
                  >
                    {isConnecting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Bot className="w-3.5 h-3.5" />
                    )}
                    <span>Connect to Voice</span>
                  </button>

                  {(connectionErrorMessage || (status?.connectionState === 'error' && status?.lastError)) && (
                    <div className="w-full flex items-center gap-2 p-2 rounded-lg bg-red-950/60 border border-red-800/70 text-red-300 text-xs mt-1 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span className="flex-1 font-mono text-[11px] leading-tight">
                        {connectionErrorMessage || status?.lastError}
                      </span>
                      <button
                        onClick={() => setConnectionErrorMessage(null)}
                        className="text-red-400 hover:text-white text-xs px-1 cursor-pointer"
                        title="Dismiss"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs text-amber-300/90 flex items-center gap-2 bg-amber-950/30 p-2 rounded-lg border border-amber-800/40">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Bot is online, but hasn&apos;t joined any Discord servers yet.</span>
                  <button
                    onClick={() => setIsSetupGuideOpen(true)}
                    className="text-xs underline text-amber-300 hover:text-white cursor-pointer font-semibold"
                  >
                    Invite Bot
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-neutral-400 flex flex-wrap items-center gap-2">
              {!isServiceReachable ? (
                <span>
                  Bot service unreachable. On Vercel: set <code className="text-amber-300 bg-[#161c28] px-1.5 py-0.5 rounded border border-[#263246] font-mono">DISCORD_BOT_API_URL</code> to your Render URL.
                </span>
              ) : (
                <span>
                  Bot service running, but <code className="text-amber-300 bg-[#161c28] px-1.5 py-0.5 rounded border border-[#263246] font-mono">DISCORD_BOT_TOKEN</code> is required in Render environment variables.
                </span>
              )}
              <button
                onClick={refreshStatus}
                className="text-neutral-400 hover:text-white p-1 rounded hover:bg-[#1a2130] cursor-pointer"
                title="Retry checking Discord service"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Asset Sync Button */}
        <div className="flex items-center justify-start md:justify-end gap-2">
          {syncProgress?.syncing ? (
            <span className="text-xs text-amber-300 flex items-center gap-1.5 animate-pulse">
              <UploadCloud className="w-4 h-4 animate-bounce" />
              <span>Syncing ({syncProgress.done}/{syncProgress.total})...</span>
            </span>
          ) : (
            <button
              onClick={handleSyncAssets}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171d29] hover:bg-[#202939] text-neutral-300 hover:text-white border border-[#2b374c] rounded-lg text-xs font-medium transition cursor-pointer"
              title="Upload custom audio files from browser IndexedDB to Discord bot service"
            >
              <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
              <span>Sync Audio Files to Bot</span>
            </button>
          )}
        </div>
      </div>

      {/* Output Status Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-[#1d2534]">
        <div className="p-2 rounded bg-[#151a24] border border-[#212a3a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Headphones className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-neutral-300">Browser Audio:</span>
          </div>
          <span className="font-mono text-[11px] text-neutral-400">
            {outputTarget === 'discord'
              ? 'Muted (Discord Exclusive)'
              : sessionState.playbackState === 'playing'
              ? `Playing — ${activeScene?.name || 'Active'}`
              : 'Standby'}
          </span>
        </div>

        <div className="p-2 rounded bg-[#151a24] border border-[#212a3a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-neutral-300">Discord Stream ({currentGuildName}):</span>
          </div>
          <span className="font-mono text-[11px] text-neutral-400">
            {!isConnected
              ? 'Not Connected'
              : status?.playbackState === 'playing'
              ? `Live Mix — ${status.currentScene?.name || activeScene?.name || 'Scene'}`
              : 'Streaming Silence (Ready)'}
          </span>
        </div>
      </div>

      {/* Setup Guide Modal */}
      <LiveDiscordSetupModal
        isOpen={isSetupGuideOpen}
        onClose={() => setIsSetupGuideOpen(false)}
      />
    </div>
  );
};
