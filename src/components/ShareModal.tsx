import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { shareOnMobile } from "react-mobile-share";

interface Props {
  desc?: string;
  code: string;
  onClose: () => void;
}

export function ShareModal({ code, desc, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onLinkShare = async () => {
    shareOnMobile({
      url: location.origin + location.pathname.split('/').slice(0,-1).join('/') + "/import?code=" + code,
      title: desc || "Lendcraft"
    });
  };

  const onDiscordShare = async () => {
    shareOnMobile({
      text: "[" + (desc || 'Lendcraf') + "](" + location.origin + location.pathname.split('/').slice(0,-1).join('/') + "/import?code=" + code + ")",
      title: desc || "Lendcraft"
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Share Code</h2>
        <p className="text-sm text-slate-400 mb-4">Have your friend scan this QR code or paste the text code.</p>

        <div className="bg-white p-4 rounded-xl flex justify-center mb-4">
          <QRCodeSVG value={code} size={200} />
        </div>

        <div className="bg-slate-700 rounded-lg p-3 mb-4">
          <p className="text-xs text-slate-400 mb-1">Text code:</p>
          <p className="text-xs font-mono break-all select-all">{code}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onLinkShare}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors"
          >Link
          </button>
          <button
            onClick={onDiscordShare}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors"
          >Discord
          </button>
          <button
            onClick={handleCopy}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-600 hover:bg-slate-500 rounded-lg font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
