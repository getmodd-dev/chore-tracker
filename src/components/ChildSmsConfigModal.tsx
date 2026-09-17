import React, { useState } from 'react';
import { Child, AppTheme } from '../types';
import { X, Smartphone, Bell, Clock, Send, Check, AlertCircle, Sparkles, PhoneCall } from 'lucide-react';

interface ChildSmsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  child: Child;
  onSave: (updatedChild: Child) => void;
  theme?: AppTheme;
}

export const ChildSmsConfigModal: React.FC<ChildSmsConfigModalProps> = ({
  isOpen,
  onClose,
  child,
  onSave,
  theme = 'classic',
}) => {
  const isFintech = theme === 'fintech_hustle';

  const [smsEnabled, setSmsEnabled] = useState(child.smsEnabled ?? false);
  const [phoneNumber, setPhoneNumber] = useState(child.phoneNumber ?? '');
  const [carrier, setCarrier] = useState<'att' | 'verizon' | 'tmobile'>(child.carrier || 'att');
  const [smsTime, setSmsTime] = useState(child.smsTime || '17:00');

  const [testStatus, setTestStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });

  if (!isOpen) return null;

  // Format phone number string into clean digits
  const cleanDigits = phoneNumber.replace(/\D/g, '');
  const formattedGatewayAddress = cleanDigits.length >= 10
    ? `${cleanDigits.slice(-10)}@${carrier === 'att' ? 'txt.att.net' : carrier === 'verizon' ? 'vtext.com' : 'tmomail.net'}`
    : null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...child,
      smsEnabled,
      phoneNumber: phoneNumber.trim(),
      carrier,
      smsTime,
    });
    onClose();
  };

  const handleSendTestSms = async () => {
    if (!phoneNumber.trim() || cleanDigits.length < 10) {
      setTestStatus({
        type: 'error',
        message: 'Please enter a valid 10-digit US mobile number first.',
      });
      return;
    }

    setTestStatus({ type: 'loading' });
    try {
      // First save or temporarily send test with the latest values
      const res = await fetch('/api/sms/send-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: child.id,
          customText: `Hi ${child.name}! ⭐ Test SMS from your Chore Tracker (AT&T Gateway). Daily chore alerts are working! 🚀`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus({
          type: 'success',
          message: data.message || `Test text successfully delivered to ${formattedGatewayAddress}!`,
        });
      } else {
        setTestStatus({
          type: 'error',
          message: data.message || 'Failed to send test text. Please check your Gmail SMTP settings.',
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
        className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border transition-all ${
          isFintech ? 'bg-[#0b1329] border-emerald-500/30 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-xl">
              {child.avatar}
            </div>
            <div>
              <h3 className="font-bold text-base">SMS Chore Alerts for {child.name}</h3>
              <p className={`text-xs ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>
                Automated daily status via AT&T Email-to-SMS
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
              smsEnabled
                ? isFintech
                  ? 'bg-emerald-950/40 border-emerald-500/50'
                  : 'bg-indigo-50/80 border-indigo-200'
                : isFintech
                ? 'bg-[#131d36] border-slate-800'
                : 'bg-slate-50 border-slate-200'
            }`}
            onClick={() => setSmsEnabled(!smsEnabled)}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  smsEnabled
                    ? isFintech
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-indigo-600 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block text-sm">Send Daily Chore SMS</span>
                <span className={`text-[11px] ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>
                  Texts {child.name} their pending & completed chore checklist
                </span>
              </div>
            </div>

            <input
              type="checkbox"
              checked={smsEnabled}
              onChange={(e) => setSmsEnabled(e.target.checked)}
              className={`w-5 h-5 rounded-lg ${isFintech ? 'accent-emerald-500' : 'accent-indigo-600'}`}
            />
          </div>

          {/* Mobile Phone Number */}
          <div>
            <label className={`block font-semibold mb-1 ${isFintech ? 'text-slate-300' : 'text-slate-700'}`}>
              Child's Cell Phone Number (AT&T Network)
            </label>
            <div className="relative">
              <Smartphone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                placeholder="e.g. 555-123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>
            {formattedGatewayAddress && (
              <p className="mt-1 text-[11px] font-mono text-emerald-600 flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Sends via gateway: {formattedGatewayAddress}</span>
              </p>
            )}
          </div>

          {/* Carrier Selection */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'att', label: 'AT&T', desc: '@txt.att.net' },
              { id: 'verizon', label: 'Verizon', desc: '@vtext.com' },
              { id: 'tmobile', label: 'T-Mobile', desc: '@tmomail.net' },
            ].map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => setCarrier(c.id as 'att' | 'verizon' | 'tmobile')}
                className={`p-2.5 rounded-xl border text-center transition ${
                  carrier === c.id
                    ? isFintech
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold'
                    : isFintech
                    ? 'bg-[#131d36] border-slate-800 text-slate-400'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <div className="text-xs">{c.label}</div>
                <div className="text-[9px] opacity-75 font-mono">{c.desc}</div>
              </button>
            ))}
          </div>

          {/* Alert Time Selection */}
          <div>
            <label className={`block font-semibold mb-1 ${isFintech ? 'text-slate-300' : 'text-slate-700'}`}>
              Daily Delivery Time
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="time"
                value={smsTime}
                onChange={(e) => setSmsTime(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>
            <p className={`mt-1 text-[11px] ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>
              Recommended: 4:30 PM (after school) or 7:00 PM (before bedtime).
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
                {testStatus.type === 'loading' ? 'Sending test SMS through AT&T gateway...' : testStatus.message}
              </span>
            </div>
          )}

          {/* Test SMS Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleSendTestSms}
              disabled={testStatus.type === 'loading'}
              className={`w-full py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 text-xs transition ${
                isFintech
                  ? 'bg-[#15233e] border-emerald-500/40 text-emerald-300 hover:bg-[#1a2d52]'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Send className="w-3.5 h-3.5 text-indigo-500" />
              <span>Send Test Text Message Now</span>
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
              Save SMS Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
