import React from 'react';
import { X, Share, PlusSquare, Smartphone, Server, Check } from 'lucide-react';

interface IOSInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IOSInstallGuideModal: React.FC<IOSInstallGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      id="modal-ios-install-guide"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 border border-slate-200 pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS grab handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Install on iPhone / iPad</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          To run this as a standalone native app on iOS with custom app icon and full screen (no Safari browser URL bar):
        </p>

        {/* Step-by-step visual cards */}
        <div className="space-y-3 mb-5">
          <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0">
              1
            </div>
            <div className="text-xs">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                Tap Safari's <Share className="w-3.5 h-3.5 text-blue-600 inline" /> Share button
              </p>
              <p className="text-slate-500 mt-0.5">
                Located at the bottom of the Safari screen on iPhone, or top right on iPad.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0">
              2
            </div>
            <div className="text-xs">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                Select <PlusSquare className="w-3.5 h-3.5 text-slate-700 inline" /> "Add to Home Screen"
              </p>
              <p className="text-slate-500 mt-0.5">
                Scroll down in the share sheet menu until you see the plus square icon.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0">
              3
            </div>
            <div className="text-xs">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                Tap "Add" in top-right corner
              </p>
              <p className="text-slate-500 mt-0.5">
                The star app icon will appear directly on your iOS home screen!
              </p>
            </div>
          </div>
        </div>

        {/* Unraid tip */}
        <div className="bg-indigo-50/70 p-3 rounded-2xl border border-indigo-100 text-[11px] text-indigo-900 flex items-start gap-2 mb-5">
          <Server className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <span>
            <strong>Unraid Home Network Tip:</strong> Once added, your child can tap the icon on your home Wi-Fi to rack points instantly! Data is securely saved to your Unraid server array.
          </span>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-2xl shadow-sm transition"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};
