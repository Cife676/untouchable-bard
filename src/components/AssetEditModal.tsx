'use client';

import React, { useState, useEffect } from 'react';
import { Edit3, X, Save, Repeat } from 'lucide-react';
import { useTabletop } from '@/context/TabletopContext';
import { AudioCategoryType } from '@/types/audio';

export const AssetEditModal: React.FC = () => {
  const { editingAsset, closeAssetEditor, updateAsset } = useTabletop();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<AudioCategoryType>('MUSIC');
  const [loopable, setLoopable] = useState(false);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (editingAsset) {
      setName(editingAsset.name);
      setCategory(editingAsset.category);
      setType(editingAsset.type);
      setLoopable(editingAsset.loopable);
      setDescription(editingAsset.description ?? '');
    }
  }, [editingAsset]);

  if (!editingAsset) return null;

  const handleSave = () => {
    updateAsset(editingAsset.id, {
      name: name.trim() || editingAsset.name,
      category: category.trim() || 'General',
      type,
      loopable,
      description: description.trim(),
    });
    closeAssetEditor();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#12161f] border border-[#262f40] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-5 text-neutral-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#232b3b]">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base tracking-wide text-neutral-100">
              Edit Audio Asset
            </h3>
          </div>
          <button
            onClick={closeAssetEditor}
            className="text-neutral-400 hover:text-white p-1 rounded transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Asset Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#181d29] border border-[#2c3649] rounded px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Audio Type
              </label>
              <select
                value={type}
                onChange={(e) => {
                  const newType = e.target.value as AudioCategoryType;
                  setType(newType);
                  if (newType === 'MUSIC' || newType === 'AMBIENCE' || newType === 'ENVIRONMENT') {
                    setLoopable(true);
                  } else {
                    setLoopable(false);
                  }
                }}
                className="w-full bg-[#181d29] border border-[#2c3649] rounded px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-amber-500"
              >
                <option value="MUSIC">MUSIC (Looping bg music)</option>
                <option value="AMBIENCE">AMBIENCE (Looping ambient)</option>
                <option value="ENVIRONMENT">ENVIRONMENT (Looping layer)</option>
                <option value="SFX">SFX (One-shot cue)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Weather, Battle"
                className="w-full bg-[#181d29] border border-[#2c3649] rounded px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#181d29] border border-[#2c3649] rounded px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-amber-500 resize-none"
            />
          </div>

          {/* Loopable Toggle */}
          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="loopable-check"
              checked={loopable}
              onChange={(e) => setLoopable(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
            />
            <label
              htmlFor="loopable-check"
              className="text-xs text-neutral-300 cursor-pointer flex items-center gap-1.5"
            >
              <Repeat className="w-3.5 h-3.5 text-amber-400" />
              <span>Loopable by default in scenes</span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#232b3b]">
          <button
            onClick={closeAssetEditor}
            className="px-4 py-2 rounded text-xs font-semibold text-neutral-400 hover:text-white transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider rounded transition flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
