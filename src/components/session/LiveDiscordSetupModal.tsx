'use client';

import React from 'react';
import { X, ExternalLink, ShieldCheck, Key, Bot, Radio, CheckCircle2 } from 'lucide-react';

interface LiveDiscordSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveDiscordSetupModal: React.FC<LiveDiscordSetupModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#121620] border border-[#293548] rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl text-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#232b3b] bg-[#141924] rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm md:text-base text-neutral-100 flex items-center gap-2">
                <span>Discord Bot Setup Guide</span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Zero Admin • Minimum Permissions
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Quick 5-step guide to connect Untouchable Bard to your Discord server
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-neutral-300">
          {/* Step 1 */}
          <div className="space-y-2 border-l-2 border-amber-500/60 pl-4 py-1">
            <h4 className="font-bold text-sm text-amber-300 flex items-center gap-2">
              <span>Step 1: Create an Application in Discord Developer Portal</span>
            </h4>
            <p className="text-neutral-400">
              Go to the official Discord Developer Portal and create a new application named &quot;Untouchable Bard&quot;.
            </p>
            <a
              href="https://discord.com/developers/applications"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1b2230] hover:bg-[#252f42] text-amber-300 rounded border border-[#2b374d] text-xs font-semibold transition"
            >
              <span>Open Discord Developer Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Step 2 */}
          <div className="space-y-2 border-l-2 border-amber-500/60 pl-4 py-1">
            <h4 className="font-bold text-sm text-amber-300 flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              <span>Step 2: Create Bot &amp; Copy Token</span>
            </h4>
            <p className="text-neutral-400">
              Click the <strong>Bot</strong> tab on the left menu, then click <strong>Reset Token</strong> (or Add Bot).
              Copy the token.
            </p>
            <div className="p-3 bg-[#181e2b] rounded border border-[#29354a] text-amber-200/90 font-mono text-[11px]">
              ⚠️ Never share or commit this token. Keep it in your local <code>.env</code> file.
            </div>
          </div>

          {/* Step 3 */}
          <div className="space-y-2 border-l-2 border-amber-500/60 pl-4 py-1">
            <h4 className="font-bold text-sm text-amber-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Step 3: Minimum Permissions &amp; Server Invite</span>
            </h4>
            <p className="text-neutral-400">
              Go to <strong>OAuth2 → URL Generator</strong>. Select only:
            </p>
            <ul className="list-disc list-inside space-y-1 text-neutral-300 ml-2">
              <li>Scope: <code className="text-amber-300">bot</code></li>
              <li>Bot Permissions: <code className="text-emerald-300">Connect</code> and <code className="text-emerald-300">Speak</code> (Permissions integer: <code>3145728</code>)</li>
              <li className="text-neutral-500">NO Administrator permission required!</li>
              <li className="text-neutral-500">NO Message Content privileged intent required!</li>
            </ul>
            <p className="text-neutral-400 mt-1">
              Copy the generated invite URL. You or any other tabletop GM can open this link to add the bot to any Discord server where they have Manage Server permissions.
            </p>
            <div className="p-2.5 bg-[#171d28] rounded border border-[#2b374d] text-indigo-300 text-[11px]">
              🌐 <strong>Multi-Server Isolation:</strong> The bot can be in dozens of Discord servers at the same time. Each server has its own completely isolated audio mixer, scene transitions, and volume controls. Playing or stopping music in one server will never affect another!
            </div>
          </div>

          {/* Step 4 */}
          <div className="space-y-2 border-l-2 border-amber-500/60 pl-4 py-1">
            <h4 className="font-bold text-sm text-amber-300 flex items-center gap-2">
              <span>Step 4: Configure Environment Variables</span>
            </h4>
            <p className="text-neutral-400">
              Create a <code>.env</code> file in your project root (copied from <code>.env.example</code>):
            </p>
            <pre className="p-3 bg-[#0f131a] rounded border border-[#222b3b] font-mono text-[11px] text-amber-200 overflow-x-auto">
{`DISCORD_BOT_TOKEN=your_token_here
DISCORD_GUILD_ID=your_server_id_here
DISCORD_INTEGRATION_SECRET=your_local_secret_here
DISCORD_BOT_PORT=3001`}
            </pre>
          </div>

          {/* Step 5 */}
          <div className="space-y-2 border-l-2 border-emerald-500/60 pl-4 py-1">
            <h4 className="font-bold text-sm text-emerald-300 flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>Step 5: Start the Bot Service</span>
            </h4>
            <p className="text-neutral-400">
              In your terminal, run the Discord service alongside your Next.js app:
            </p>
            <div className="p-2.5 bg-[#0f131a] rounded border border-[#222b3b] font-mono text-emerald-300 text-xs">
              npm run discord:dev
            </div>
            <p className="text-neutral-400 text-[11px]">
              Once started, the status badge in Live Session will switch to <span className="text-emerald-400 font-bold">ONLINE</span>, allowing you to select a voice channel and click <strong>Connect</strong>!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#232b3b] bg-[#141924] rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold rounded-lg text-xs tracking-wider transition cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
