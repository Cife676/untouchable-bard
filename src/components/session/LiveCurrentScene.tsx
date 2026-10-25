'use client';

import React from 'react';
import {
  Play,
  Pause,
  Square,
  Repeat,
  Volume2,
  VolumeX,
  Layers,
  Sparkles,
  Sliders,
  Clock,
  Music,
  Wind,
  CloudRain,
  Zap,
  Edit3,
} from 'lucide-react';
import { useSession } from '@/lib/session/useSession';
import { useTabletop } from '@/context/TabletopContext';
import { ChannelId } from '@/types/audio';

const CROSSFADE_OPTIONS = [0, 0.5, 1, 2, 3, 5, 10];

const CHANNEL_ICONS: Record<ChannelId, React.ReactNode> = {
  music: <Music className="w-3.5 h-3.5 text-purple-400" />,
  ambience: <Wind className="w-3.5 h-3.5 text-emerald-400" />,
  environment: <CloudRain className="w-3.5 h-3.5 text-blue-400" />,
  sfx: <Zap className="w-3.5 h-3.5 text-amber-400" />,
};

export const LiveCurrentScene: React.FC = () => {
  const {
    state,
    startScene,
    pauseScene,
    resumeScene,
    stopScene,
    setCrossfade,
    setLayerVolume,
    toggleLayerMute,
  } = useSession();

  const { scenes, activeScene, setActiveScene, openSceneEditor } = useTabletop();

  if (!activeScene) {
    return (
      <div className="bg-[#121620] border border-[#242e40] rounded-xl p-6 text-center space-y-3 shadow-lg">
        <Layers className="w-8 h-8 text-neutral-500 mx-auto" />
        <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">
          No Scene Loaded
        </h3>
        <p className="text-xs text-neutral-500">
          Click any scene from the Quick Select Grid below to start playback.
        </p>
      </div>
    );
  }

  const effectiveCrossfade = activeScene.transitionOverride ?? state.crossfadeDuration;

  return (
    <div className="bg-[#131722] border border-[#263144] rounded-xl p-5 shadow-xl space-y-5">
      {/* Top Banner: Status & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#212b3c]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            {/* Playback State Indicator */}
            {state.playbackState === 'playing' ? (
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/70 border border-emerald-800/80 px-2.5 py-0.5 rounded-full shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                PLAYING
              </span>
            ) : state.playbackState === 'paused' ? (
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300 bg-amber-950/70 border border-amber-800/80 px-2.5 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                PAUSED
              </span>
            ) : state.playbackState === 'transitioning' ? (
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-300 bg-blue-950/70 border border-blue-800/80 px-2.5 py-0.5 rounded-full animate-pulse">
                <Clock className="w-3 h-3 text-blue-400 animate-spin" />
                CROSSFADING ({effectiveCrossfade}s)...
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400 bg-neutral-900 border border-neutral-800 px-2.5 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-neutral-600" />
                STOPPED
              </span>
            )}

            {activeScene.category && (
              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-[#1a2130] text-amber-300 border border-[#273347] font-semibold">
                {activeScene.category}
              </span>
            )}

            {activeScene.transitionOverride !== undefined && (
              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/60 font-mono">
                Override: {activeScene.transitionOverride}s
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
              {activeScene.name}
            </h2>
            <button
              onClick={() => openSceneEditor(activeScene)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1a2130] hover:bg-[#252f44] text-neutral-300 hover:text-white border border-[#2b374c] rounded-lg text-xs font-semibold transition cursor-pointer"
              title="Edit active scene and configure audio layers"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Edit Scene</span>
            </button>
          </div>
          <p className="text-xs text-neutral-400 mt-1 line-clamp-1 max-w-xl">
            {activeScene.description || 'Live ambient atmosphere'}
          </p>
        </div>

        {/* Playback Buttons & Crossfade Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Crossfade Selector */}
          <div className="flex items-center gap-2 bg-[#171c26] px-3 py-1.5 rounded-lg border border-[#273244]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>Crossfade:</span>
            </span>
            <select
              value={state.crossfadeDuration}
              onChange={(e) => setCrossfade(parseFloat(e.target.value))}
              className="bg-[#1b2230] text-amber-300 text-xs font-bold rounded px-2 py-1 border border-[#2b374c] focus:outline-hidden cursor-pointer"
            >
              {CROSSFADE_OPTIONS.map((val) => (
                <option key={val} value={val}>
                  {val === 0 ? 'Instant (0s)' : `${val} sec`}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {state.playbackState === 'playing' ? (
              <button
                onClick={pauseScene}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/50 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                title="Pause Scene (Space)"
              >
                <Pause className="w-3.5 h-3.5 fill-amber-300" />
                <span>Pause</span>
              </button>
            ) : state.playbackState === 'paused' ? (
              <button
                onClick={resumeScene}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold rounded-lg text-xs uppercase tracking-wider shadow-lg transition cursor-pointer"
                title="Resume Scene (Space)"
              >
                <Play className="w-3.5 h-3.5 fill-neutral-950" />
                <span>Resume</span>
              </button>
            ) : (
              <button
                onClick={() => startScene(activeScene.id)}
                className="flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-black rounded-lg text-xs uppercase tracking-wider shadow-lg hover:shadow-amber-600/30 transition transform active:scale-95 cursor-pointer"
                title="Start Scene (Space)"
              >
                <Play className="w-3.5 h-3.5 fill-neutral-950" />
                <span>Start Scene</span>
              </button>
            )}

            <button
              onClick={() => stopScene()}
              disabled={state.playbackState === 'stopped'}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 text-neutral-300 font-semibold rounded-lg text-xs uppercase tracking-wider border border-neutral-700 transition cursor-pointer"
              title="Stop Scene (Esc)"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Scene Layers (Temporary Live Controls) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Active Audio Layers ({activeScene.layers.length})</span>
          </h4>
          <span className="text-[10px] text-neutral-500">
            Session sliders adjust live volume without altering saved scene configs
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeScene.layers.map((layer) => {
            const liveLayer = state.layerStates[layer.id];
            const currentVolume = liveLayer?.temporaryVolume ?? layer.volume;
            const isMuted = Boolean(liveLayer?.isMuted);

            return (
              <div
                key={layer.id}
                className={`p-3.5 rounded-lg border flex flex-col justify-between transition ${
                  isMuted
                    ? 'bg-[#151922] border-[#222733] opacity-60'
                    : 'bg-[#18202d] border-[#2a364b]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 truncate">
                    <div className="p-1 rounded bg-[#20293a]">
                      {CHANNEL_ICONS[layer.channel]}
                    </div>
                    <div className="truncate">
                      <h5 className="font-semibold text-xs text-neutral-200 truncate">
                        {layer.name}
                      </h5>
                      <span className="text-[10px] text-neutral-400 capitalize">
                        {layer.channel} Bus
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleLayerMute(layer.id)}
                    className={`p-1.5 rounded transition cursor-pointer ${
                      isMuted
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : 'text-neutral-400 hover:text-white hover:bg-[#202837]'
                    }`}
                    title={isMuted ? 'Unmute Layer' : 'Mute Layer Temporarily'}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Live Volume Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-neutral-400">
                    <span>Live Mix</span>
                    <span className="font-mono text-amber-300">
                      {isMuted ? 'Muted' : `${Math.round(currentVolume * 100)}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    disabled={isMuted}
                    value={isMuted ? 0 : currentVolume}
                    onChange={(e) => setLayerVolume(layer.id, parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#252f42] accent-amber-500 rounded cursor-pointer disabled:opacity-40"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
