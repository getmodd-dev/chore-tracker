import React, { useState } from 'react';
import { Child, AppTheme } from '../types';
import { X, Smartphone, Bell, Clock, Send, Check, AlertCircle, HelpCircle, ExternalLink, ShieldCheck } from 'lucide-react';

interface ChildNotificationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  child: Child;
  onSave: (updatedChild: Child) => void;
  theme?: AppTheme;
}

export const ChildNotificationConfigModal: React.FC<ChildNotificationConfigModalProps> = ({
  isOpen,
  onClose,
  child,
  onSave,
  theme = 'classic',
}) => {
  const isFintech = theme === 'fintech_hustle';

  const [notificationsEnabled, setNotificationsEnabled] = useState(
    child.notificationsEnabled ?? child.smsEnabled ?? false
  );
  const [pushoverUserKey, setPushoverUserKey] = useState(child.pushoverUserKey ?? '');
  const [pushoverDeviceName, setPushoverDeviceName] = useState(child.pushoverDeviceName ?? '');
  const [notificationTime, setNotificationTime] = useState(
    child.notificationTime || child.smsTime || '16:30'
  );

  const [testStatus, setTestStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...child,
      notificationsEnabled,
      pushoverUserKey: pushoverUserKey.trim(),
      pushoverDeviceName: pushoverDeviceName.trim(),
      notificationTime,
      // sync legacy
      smsEnabled: notificationsEnabled,
      smsTime: notificationTime,
    });
    onClose();
  };

  const handleSendTestPush = async () => {
    const trimmedKey = pushoverUserKey.trim();
    if (!trimmedKey || trimmedKey.length < 20) {
      setTestStatus({
        type: 'error',
        message: "Please enter the child's 30-character Pushover User Key first.",
      });
      return;
    }

    setTestStatus({ type: 'loading' });
    try {
      const res = await fetch('/api/pushover/send-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: child.id,
          customTitle: `⭐ ${child.name}'s Chore Tracker`,
          customMessage: `Hi ${child.name}! 🚀 Test push notification successful! You will receive daily chore reminders on your iPhone at ${notificationTime}.`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus({
          type: 'success',
          message: data.message || `Test notification sent to ${child.name}'s iPhone!`,
        });
      } else {
        setTestStatus({
          type: 'error',
          message: data.message || 'Failed to send test push notification.',
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setTestStatus({
        type: 'error',
        message: `Network error: ${errMsg}`,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border transition-all max-h-[90vh] overflow-y-auto ${
          isFintech ? 'bg-[#0b1329] border-emerald-500/30 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-xl shrink-0">
              {child.avatar}
            </div>
            <div>
              <h3 className="font-bold text-base">iPhone Push Alerts for {child.name}</h3>
              <p className={`text-xs ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>
                Automated daily chore status via Pushover iOS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition ${
              isFintech ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4 text-xs">
          {/* Toggle Active */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
              notificationsEnabled
                ? isFintech
                  ? 'bg-emerald-950/40 border-emerald-500/50'
                  : 'bg-indigo-50/80 border-indigo-200'
                : isFintech
                ? 'bg-[#131d36] border-slate-800'
                : 'bg-slate-50 border-slate-200'
            }`}
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  notificationsEnabled
                    ? isFintech
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-indigo-600 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block text-sm">Send Daily Chore Notifications</span>
                <span className={`text-[11px] ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>
                  Sends an iOS push alert with pending &amp; completed chores
                </span>
              </div>
            </div>

            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
              className={`w-5 h-5 rounded-lg ${isFintech ? 'accent-emerald-500' : 'accent-indigo-600'}`}
            />
          </div>

          {/* Setup Guide Box */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-950 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-900">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>How to get {child.name}'s Pushover User Key (1-time setup):</span>
            </div>
            <ol className="list-decimal pl-5 space-y-1 text-[11px] text-indigo-900/90 leading-relaxed">
              <li>
                Install the <strong>Pushover</strong> app on {child.name}'s iPhone from the iOS App Store.
              </li>
              <li>
                Open the app and log in or create a quick account.
              </li>
              <li>
                Copy the 30-character <strong>"Your User Key"</strong> shown on the app's main screen.
              </li>
            </ol>
          </div>

          {/* Pushover User Key */}
          <div>
            <label className={`block font-semibold mb-1 ${isFintech ? 'text-slate-300' : 'text-slate-700'}`}>
              Child's Pushover User Key (30 characters)
            </label>
            <div className="relative">
              <Smartphone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. uQiRzpo4DXghDmr9QzzfBsMqTDXxKP"
                value={pushoverUserKey}
                onChange={(e) => setPushoverUserKey(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>
            {pushoverUserKey.length > 0 && pushoverUserKey.length !== 30 && (
              <p className="mt-1 text-[11px] text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>Standard Pushover User Keys are exactly 30 characters (currently {pushoverUserKey.length}).</span>
              </p>
            )}
          </div>

          {/* Optional Device Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`font-semibold ${isFintech ? 'text-slate-300' : 'text-slate-700'}`}>
                Device Name <span className="font-normal text-slate-500">(Optional)</span>
              </label>
              <span className="text-[10px] text-slate-400">Leave blank to alert all devices on their account</span>
            </div>
            <input
              type="text"
              placeholder="e.g. Liam-iPhone"
              value={pushoverDeviceName}
              onChange={(e) => setPushoverDeviceName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          {/* Notification Time Selection */}
          <div>
            <label className={`block font-semibold mb-1 ${isFintech ? 'text-slate-300' : 'text-slate-700'}`}>
              Daily Delivery Time
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="time"
                value={notificationTime}
                onChange={(e) => setNotificationTime(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>
            <p className={`mt-1 text-[11px] ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>
              Recommended: 4:30 PM (after school) or 7:00 PM (before evening wind-down).
            </p>
          </div>

          {/* Test Status feedback */}
          {testStatus.type !== 'idle' && (
            <div
              className={`p-3 rounded-2xl text-xs font-medium flex items-start gap-2 ${
                testStatus.type === 'loading'
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : testStatus.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {testStatus.type === 'loading' && <Clock className="w-4 h-4 animate-spin shrink-0 mt-0.5" />}
              {testStatus.type === 'success' && <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
              {testStatus.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
              <span>
                {testStatus.type === 'loading' ? "Sending test push notification to iPhone..." : testStatus.message}
              </span>
            </div>
          )}

          {/* Test Push Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleSendTestPush}
              disabled={testStatus.type === 'loading'}
              className={`w-full py-2.5 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 text-xs transition active:scale-98 ${
                isFintech
                  ? 'bg-[#15233e] border-emerald-500/40 text-emerald-300 hover:bg-[#1a2d52]'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Send className="w-3.5 h-3.5 text-indigo-500" />
              <span>Send Test iPhone Notification Now</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl font-bold transition ${
                isFintech ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex-1 py-2.5 rounded-xl font-bold transition shadow-sm ${
                isFintech
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              Save Notification Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
