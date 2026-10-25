'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, X, Music, CheckCircle2, AlertCircle, FileAudio } from 'lucide-react';
import { useTabletop } from '@/context/TabletopContext';
import { AudioCategoryType } from '@/types/audio';

export const AudioImportModal: React.FC = () => {
  const { isImportModalOpen, closeImportModal, importAudioFiles } = useTabletop();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [defaultCategory, setDefaultCategory] = useState<string>('Custom Audio');
  const [defaultType, setDefaultType] = useState<AudioCategoryType | 'AUTO'>('AUTO');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isImportModalOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
      setStatusMessage(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter((file) =>
        file.name.match(/\.(mp3|wav|ogg)$/i)
      );
      setSelectedFiles(validFiles);
      setStatusMessage(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleImport = async () => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    setStatusMessage('Reading and indexing local audio files...');

    try {
      const chosenType = defaultType === 'AUTO' ? undefined : defaultType;
      const imported = await importAudioFiles(selectedFiles, defaultCategory, chosenType);

      // Synchronize custom assets to Discord Bot service with status feedback
      const { DiscordClient } = await import('@/lib/discord/discordClient');
      for (let i = 0; i < imported.length; i++) {
        const asset = imported[i];
        const file = selectedFiles[i];
        if (file) {
          setStatusMessage(`Syncing "${asset.name}" to Discord voice pipeline (${i + 1}/${imported.length})...`);
          await DiscordClient.uploadAsset(asset.id, asset.name, file).catch((err) => {
            console.warn(`[AudioImport] Failed to upload ${asset.name} to Discord:`, err);
          });
        }
      }

      setStatusMessage(`Successfully imported and synced ${imported.length} audio file(s)!`);
      setTimeout(() => {
        setIsProcessing(false);
        setSelectedFiles([]);
        setStatusMessage(null);
        closeImportModal();
      }, 700);
    } catch (err) {
      console.error(err);
      setStatusMessage('Error importing files. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#12161f] border border-[#262f40] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-neutral-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#232b3b]">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base tracking-wide text-neutral-100">
              Import Local Audio Files
            </h3>
          </div>
          <button
            onClick={closeImportModal}
            className="text-neutral-400 hover:text-white p-1 rounded transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#2f394d] hover:border-amber-500/60 bg-[#161b26] hover:bg-[#18202d] rounded-lg p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
            <FileAudio className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-200">
              Click to select or drag and drop audio files
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Supports <span className="text-amber-300 font-mono">MP3</span>,{' '}
              <span className="text-amber-300 font-mono">WAV</span>, and{' '}
              <span className="text-amber-300 font-mono">OGG</span>
            </p>
          </div>
        </div>

        {/* Selected Files Count */}
        {selectedFiles.length > 0 && (
          <div className="bg-[#181d29] p-3 rounded-lg border border-[#283244] max-h-32 overflow-y-auto space-y-1">
            <div className="text-xs font-semibold text-neutral-300 mb-1 flex items-center justify-between">
              <span>{selectedFiles.length} file(s) selected:</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFiles([]);
                }}
                className="text-[11px] text-red-400 hover:underline"
              >
                Clear
              </button>
            </div>
            {selectedFiles.map((file, i) => (
              <div key={i} className="text-[11px] text-neutral-400 flex items-center justify-between">
                <span className="truncate max-w-[280px]">{file.name}</span>
                <span className="font-mono text-neutral-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Configuration Options */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Default Category
            </label>
            <input
              type="text"
              value={defaultCategory}
              onChange={(e) => setDefaultCategory(e.target.value)}
              placeholder="e.g. Ambient Beds, Foley"
              className="w-full bg-[#181d29] border border-[#2c3649] rounded px-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Audio Type
            </label>
            <select
              value={defaultType}
              onChange={(e) => setDefaultType(e.target.value as AudioCategoryType | 'AUTO')}
              className="w-full bg-[#181d29] border border-[#2c3649] rounded px-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden focus:border-amber-500"
            >
              <option value="AUTO">Auto-detect from filename</option>
              <option value="MUSIC">MUSIC (Looping bg track)</option>
              <option value="AMBIENCE">AMBIENCE (Background wind/birds)</option>
              <option value="ENVIRONMENT">ENVIRONMENT (Rain/fire layer)</option>
              <option value="SFX">SFX (One-shot cue)</option>
            </select>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 p-2.5 rounded border border-amber-500/20">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#232b3b]">
          <button
            onClick={closeImportModal}
            disabled={isProcessing}
            className="px-4 py-2 rounded text-xs font-semibold text-neutral-400 hover:text-white transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={selectedFiles.length === 0 || isProcessing}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-neutral-950 font-bold text-xs uppercase tracking-wider rounded transition cursor-pointer"
          >
            {isProcessing ? 'Importing...' : `Import ${selectedFiles.length} File(s)`}
          </button>
        </div>
      </div>
    </div>
  );
};
