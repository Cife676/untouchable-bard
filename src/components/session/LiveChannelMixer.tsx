'use client';

import React from 'react';
import { Volume2, VolumeX, Music, Wind, CloudRain, Zap, Sliders } from 'lucide-react';
import { useSession } from '@/lib/session/useSession';
import { ChannelId } from '@/types/audio';

const CHANNEL_CONFIGS: { id: ChannelId; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'music', label: 'MUSIC', icon: <Music className="w-3.5 h-3.5" />, color: 'accent-purple-500 text-purple-400' },
  { id: 'ambience', label: 'AMBIENCE', icon: <Wind className="w-3.5 h-3.5" />, color: 'accent-emerald-500 text-emerald-400' },
  { id: 'environment', label: 'ENVIRONMENT', icon: <CloudRain className="w-3.5 h-3.5" />, color: 'accent-blue-500 text-blue-400' },
  { id: 'sfx', label: 'SFX', icon: <Zap className="w-3.5 h-3.5" />, color: 'accent-amber-500 text-amber-400' },
];

export const LiveChannelMixer: React.FC = () => {
  const { engineSnapshot, setChannelVolume, toggleChannelMute, setMasterVolume, toggleMasterMute } =
    useSession();

  return (
    <div className="bg-[#121620] border border-[#242e40] rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#212b3c]">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>Channel Output Mixer</span>
        </h3>
        <span className="text-[10px] text-neutral-500">Live Hardware Bus Routing</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Core Audio Channels */}
        {CHANNEL_CONFIGS.map((ch) => {
          const status = engineSnapshot.channels[ch.id];
          const isMuted = status?.isMuted ?? false;
          const volume = status?.volume ?? 0.8;

          return (
            <div
              key={ch.id}
              className={`p-3 rounded-lg border flex flex-col justify-between transition ${
                status?.isPlaying
                  ? 'bg-[#18202d] border-[#2f3c52]'
                  : 'bg-[#151924] border-[#222938]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className={ch.color}>{ch.icon}</span>
                  <span className="font-bold text-[11px] text-neutral-200">{ch.label}</span>
                </div>
                <button
                  onClick={() => toggleChannelMute(ch.id)}
                  className={`p-1 rounded transition cursor-pointer ${
                    isMuted
                      ? 'bg-red-950/80 text-red-400 border border-red-800'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-neutral-400">
                  <span className="font-mono text-amber-300">
                    {isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}
                  </span>
                  {status?.isPlaying && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setChannelVolume(ch.id, parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#252f42] accent-amber-500 rounded cursor-pointer"
                />
              </div>
            </div>
          );
        })}

        {/* Master Output Bus */}
        <div className="col-span-2 md:col-span-1 p-3 rounded-lg bg-[#1a1f2c] border border-amber-500/30 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-[11px] text-amber-300 flex items-center gap-1.5">
              <span>MASTER</span>
            </span>
            <button
              onClick={toggleMasterMute}
              className={`p-1 rounded transition cursor-pointer ${
                engineSnapshot.isMasterMuted
                  ? 'bg-red-600 text-white'
                  : 'text-neutral-300 hover:text-amber-400'
              }`}
              title={engineSnapshot.isMasterMuted ? 'Unmute Master' : 'Mute Master (M)'}
            >
              {engineSnapshot.isMasterMuted ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] text-neutral-400">
              <span className="font-mono text-amber-400 font-bold">
                {engineSnapshot.isMasterMuted
                  ? 'Muted'
                  : `${Math.round(engineSnapshot.masterVolume * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={engineSnapshot.isMasterMuted ? 0 : engineSnapshot.masterVolume}
              onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#2a3449] accent-amber-500 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
