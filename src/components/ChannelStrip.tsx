'use client';

import React from 'react';
import { Volume2, VolumeX, Pause, Play, Square, Music, Wind, CloudRain, Zap } from 'lucide-react';
import { useAudioEngine } from '@/lib/hooks/useAudioEngine';
import { ChannelId } from '@/types/audio';

const CHANNEL_ICONS: Record<ChannelId, React.ReactNode> = {
  music: <Music className="w-4 h-4 text-purple-400" />,
  ambience: <Wind className="w-4 h-4 text-emerald-400" />,
  environment: <CloudRain className="w-4 h-4 text-blue-400" />,
  sfx: <Zap className="w-4 h-4 text-amber-400" />,
};

export const ChannelStrip: React.FC = () => {
  const { snapshot, setChannelVolume, toggleChannelMute, pauseChannel, resumeChannel, stopChannel } =
    useAudioEngine();

  const channelKeys: ChannelId[] = ['music', 'ambience', 'environment', 'sfx'];

  return (
    <section className="bg-[#131720] border border-[#232936] rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold tracking-wider uppercase text-neutral-300 flex items-center gap-2">
          <span>Engine Channels</span>
          <span className="text-[11px] text-neutral-500 font-normal">Independent Web Audio Buses</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {channelKeys.map((channelId) => {
          const ch = snapshot.channels[channelId];
          const isPlaying = ch.isPlaying;
          const currentTrack = ch.currentTrackName || 'Idle';

          return (
            <div
              key={channelId}
              className={`p-4 rounded-lg border transition ${
                isPlaying
                  ? 'bg-[#181e2b] border-[#364259]'
                  : 'bg-[#151922] border-[#222733]'
              }`}
            >
              {/* Channel Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {CHANNEL_ICONS[channelId]}
                  <span className="font-semibold text-xs tracking-wide text-neutral-200 uppercase">
                    {ch.name}
                  </span>
                </div>
                <div
                  className={`w-2 h-2 rounded-full ${
                    isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'
                  }`}
                  title={isPlaying ? 'Channel Active' : 'Channel Idle'}
                />
              </div>

              {/* Current Track Label */}
              <div className="mb-4">
                <p className="text-[11px] text-neutral-400 truncate">
                  {isPlaying ? (
                    <span className="text-amber-300 font-medium">{currentTrack}</span>
                  ) : (
                    <span className="text-neutral-500 italic">No track loaded</span>
                  )}
                </p>
              </div>

              {/* Volume Slider and Mute */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center text-[10px] text-neutral-400">
                  <span>Bus Volume</span>
                  <span className="font-mono">{Math.round(ch.volume * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleChannelMute(channelId)}
                    className="text-neutral-400 hover:text-amber-400 p-1 rounded"
                    title={ch.isMuted ? 'Unmute' : 'Mute'}
                  >
                    {ch.isMuted ? (
                      <VolumeX className="w-4 h-4 text-red-400" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={ch.isMuted ? 0 : ch.volume}
                    onChange={(e) => setChannelVolume(channelId, parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#252c3c] accent-amber-500 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Channel Controls (Pause, Resume, Stop) */}
              <div className="flex items-center justify-between gap-1 pt-2 border-t border-[#232936]">
                <button
                  onClick={() => (isPlaying ? pauseChannel(channelId) : resumeChannel(channelId))}
                  disabled={!isPlaying && !ch.currentTrackName}
                  className="flex-1 py-1.5 px-2 bg-[#202634] hover:bg-[#283143] disabled:opacity-30 disabled:hover:bg-[#202634] text-neutral-200 rounded text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3 h-3 text-amber-400" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 text-emerald-400" />
                      <span>Resume</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => stopChannel(channelId, 1.0)}
                  disabled={!isPlaying}
                  className="py-1.5 px-3 bg-neutral-800 hover:bg-red-950/50 hover:text-red-300 disabled:opacity-30 disabled:hover:bg-neutral-800 disabled:hover:text-neutral-400 text-neutral-300 rounded text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                  title="Stop with 1s fade-out"
                >
                  <Square className="w-3 h-3" />
                  <span>Stop</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
