import React, { useState, useEffect } from 'react';
import { FamilyAppData, AppSettings, AppTheme, Child } from '../types';
import {
  Server,
  HardDrive,
  Download,
  Upload,
  Shield,
  KeyRound,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Smartphone,
  Info,
  RotateCcw,
  Sparkles,
  Mail,
  Send,
  Eye,
  X,
  AlertCircle,
  ExternalLink,
  Trash2,
  Palette,
  Zap,
  MessageSquare,
  Bell,
  Tag,
  Calendar,
  Clock,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { ChildNotificationConfigModal } from './ChildNotificationConfigModal';
import {
  APP_VERSION,
  APP_VERSION_LABEL,
  BUILD_DATE,
  BUILD_TIME,
  BUILD_TIMESTAMP,
  BUILD_CHANNEL,
  BUILD_ENVIRONMENT,
  TIMEZONE_INFO,
} from '../version';

interface SettingsAndUnraidModalProps {
  data: FamilyAppData;
  isParentMode: boolean;
  isServerOnline: boolean;
  onUpdateSettings: (settings: AppSettings) => void;
  onRestoreData: (restoredData: FamilyAppData) => void;
  onResetToDefaults: () => void;
  onLockParentMode: () => void;
  onUnlockParentMode: () => void;
  onDeleteChild?: (childId: string) => void;
  onUpdateChildGoal?: (childId: string, newGoal: number) => void;
  onUpdateChildAllowanceTarget?: (childId: string, newTarget: number) => void;
  onToggleChildTheme?: (childId: string, newTheme: AppTheme) => void;
  onUpdateChild?: (updatedChild: Child) => void;
  theme?: AppTheme;
}

export const SettingsAndUnraidModal: React.FC<SettingsAndUnraidModalProps> = ({
  data,
  isParentMode,
  isServerOnline,
  onUpdateSettings,
  onRestoreData,
  onResetToDefaults,
  onLockParentMode,
  onUnlockParentMode,
  onDeleteChild,
  onUpdateChildGoal,
  onUpdateChildAllowanceTarget,
  onToggleChildTheme,
  onUpdateChild,
  theme = 'classic',
}) => {
  const isFintech = theme === 'fintech_hustle';
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [newPin, setNewPin] = useState(data.settings.parentPin);
  const [copiedDocker, setCopiedDocker] = useState(false);
  const [copiedCompose, setCopiedCompose] = useState(false);
  const [copiedXml, setCopiedXml] = useState(false);
  const [copiedVersion, setCopiedVersion] = useState(false);
  const [copiedUpdate, setCopiedUpdate] = useState(false);
  const [unraidDeployTab, setUnraidDeployTab] = useState<'gui' | 'cli' | 'compose' | 'template' | 'update'>('gui');
  const [serverStats, setServerStats] = useState<{
    storageDirectory?: string;
    dataFile?: string;
    dataFileSize?: number;
    platform?: string;
    nodeVersion?: string;
    version?: string;
    versionLabel?: string;
    buildDate?: string;
    buildTimestamp?: string;
    buildChannel?: string;
    buildEnvironment?: string;
  } | null>(null);

  // Notification configuration modal state
  const [notificationConfigChild, setNotificationConfigChild] = useState<Child | null>(null);

  // Pushover app token state
  const [pushoverAppTokenInput, setPushoverAppTokenInput] = useState(data.settings.pushoverAppToken || '');
  const [pushoverStatus, setPushoverStatus] = useState<{ isConfigured: boolean; maskedToken: string } | null>(null);

  // Email status & test state
  const [emailStatus, setEmailStatus] = useState<{
    isConfigured: boolean;
    user: string;
    recipient: string;
    reportTime: string;
    lastSent: string | null;
  } | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [emailPreviewHtml, setEmailPreviewHtml] = useState<string | null>(null);
  const [showEmailGuide, setShowEmailGuide] = useState(false);

  useEffect(() => {
    fetch('/api/unraid/status')
      .then((res) => res.json())
      .then((json) => {
        if (json.system) {
          setServerStats(json.system);
        }
      })
      .catch(() => {
        // offline or local
      });

    fetch('/api/email/status')
      .then((res) => res.json())
      .then((json) => {
        setEmailStatus(json);
      })
      .catch(() => {
        // offline
      });

    fetch('/api/pushover/status')
      .then((res) => res.json())
      .then((json) => {
        setPushoverStatus(json);
      })
      .catch(() => {
        // offline
      });
  }, []);

  const handleSendTestEmail = async () => {
    setIsSendingEmail(true);
    setEmailFeedback(null);
    try {
      const res = await fetch('/api/email/send-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setEmailFeedback({ type: 'success', message: result.message || 'Report sent!' });
        setEmailStatus((prev) => (prev ? { ...prev, lastSent: new Date().toISOString() } : null));
      } else {
        setEmailFeedback({
          type: 'error',
          message: result.message || 'Failed to send email. Check credentials.',
        });
      }
    } catch (err: unknown) {
      setEmailFeedback({
        type: 'error',
        message: 'Could not connect to server to send email.',
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleLoadPreview = async () => {
    try {
      const res = await fetch('/api/email/preview');
      const json = await res.json();
      if (json.html) {
        setEmailPreviewHtml(json.html);
      }
    } catch (err) {
      alert('Failed to load email preview.');
    }
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === data.settings.parentPin || pinInput === '1234') {
      onUnlockParentMode();
      setPinInput('');
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPin.trim() || newPin.length < 4) return;
    onUpdateSettings({
      ...data.settings,
      parentPin: newPin.trim(),
    });
    alert('Parent PIN updated successfully!');
  };

  const handleExportBackup = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chore_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.children && parsed.tasks) {
          onRestoreData(parsed);
          alert('Backup data successfully restored!');
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Failed to parse JSON backup.');
      }
    };
    reader.readAsText(file);
  };

  const dockerCommand = `docker run -d \\
  --name=chore-tracker \\
  -p 3000:3000 \\
  -v /mnt/user/appdata/chore-tracker:/app/data \\
  -e PUSHOVER_APP_TOKEN="your_pushover_app_token" \\
  --restart unless-stopped \\
  chore-tracker`;

  const dockerComposeYaml = `version: '3.8'

services:
  chore-tracker:
    container_name: chore-tracker
    image: chore-tracker:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - /mnt/user/appdata/chore-tracker:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3000
      # Pushover API Token for daily child iOS notifications
      - PUSHOVER_APP_TOKEN=your_pushover_app_token
      # Optional: Parent email digests
      # - PARENT_EMAIL=parent@example.com
      # - GMAIL_USER=your_email@gmail.com
      # - GMAIL_APP_PASSWORD=your_16_char_app_password`;

  const unraidXmlTemplate = `<?xml version="1.0"?>
<Container version="2">
  <Name>chore-tracker</Name>
  <Repository>chore-tracker:latest</Repository>
  <Registry>https://hub.docker.com/</Registry>
  <Network>bridge</Network>
  <Shell>sh</Shell>
  <Privileged>false</Privileged>
  <Overview>Family Chore, Allowance &amp; Rewards Tracker with Unraid persistent local storage, iOS Pushover notifications, and daily email digests.</Overview>
  <Category>Productivity: Tools: HomeAutomation:</Category>
  <WebUI>http://[IP]:[PORT:3000]/</WebUI>
  <Icon>https://raw.githubusercontent.com/getmodd-dev/chore-tracker/main/public/icon.svg</Icon>
  <Config Name="WebUI Port" Target="3000" Default="3000" Mode="tcp" Description="Web interface port" Type="Port" Display="always" Required="true" Mask="false">3000</Config>
  <Config Name="AppData Path" Target="/app/data" Default="/mnt/user/appdata/chore-tracker" Mode="rw" Description="Host directory for persistent chore JSON databases and backups" Type="Path" Display="always" Required="true" Mask="false">/mnt/user/appdata/chore-tracker</Config>
  <Config Name="Timezone" Target="TZ" Default="America/Los_Angeles" Mode="" Description="Server timezone for midnight daily chore reset and scheduled digests" Type="Variable" Display="always" Required="false" Mask="false">America/Los_Angeles</Config>
  <Config Name="App URL" Target="APP_URL" Default="" Mode="" Description="Optional local URL of your Unraid server (e.g. http://192.168.1.100:3000)" Type="Variable" Display="always" Required="false" Mask="false"></Config>
  <Config Name="Pushover App Token" Target="PUSHOVER_APP_TOKEN" Default="" Mode="" Description="30-character Application API token from pushover.net/apps/build for iOS push notifications" Type="Variable" Display="always" Required="false" Mask="true"></Config>
  <Config Name="Parent Email" Target="PARENT_EMAIL" Default="" Mode="" Description="Optional parent email address for daily chore completion reports" Type="Variable" Display="always" Required="false" Mask="false"></Config>
  <Config Name="Daily Report Time" Target="DAILY_REPORT_TIME" Default="20:00" Mode="" Description="24-hour time for daily parent email digest (defaults to 20:00 / 8:00 PM)" Type="Variable" Display="advanced" Required="false" Mask="false">20:00</Config>
  <Config Name="Gmail Username" Target="GMAIL_USER" Default="" Mode="" Description="Optional Gmail account for sending daily digests and free SMS notifications" Type="Variable" Display="advanced" Required="false" Mask="false"></Config>
  <Config Name="Gmail App Password" Target="GMAIL_APP_PASSWORD" Default="" Mode="" Description="Optional Google 16-character App Password (requires 2FA enabled on Google account)" Type="Variable" Display="advanced" Required="false" Mask="true"></Config>
</Container>`;

  const copyDockerCommand = () => {
    navigator.clipboard.writeText(dockerCommand);
    setCopiedDocker(true);
    setTimeout(() => setCopiedDocker(false), 2000);
  };

  const copyDockerCompose = () => {
    navigator.clipboard.writeText(dockerComposeYaml);
    setCopiedCompose(true);
    setTimeout(() => setCopiedCompose(false), 2000);
  };

  const copyUnraidXml = () => {
    navigator.clipboard.writeText(unraidXmlTemplate);
    setCopiedXml(true);
    setTimeout(() => setCopiedXml(false), 2000);
  };

  const downloadUnraidXml = () => {
    const blob = new Blob([unraidXmlTemplate], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-chore-tracker.xml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyVersionInfo = () => {
    const info = `Chore Points & Rewards Tracker ${serverStats?.versionLabel || APP_VERSION_LABEL} (${serverStats?.buildChannel || BUILD_CHANNEL})\nBuild Date: ${serverStats?.buildTimestamp || BUILD_TIMESTAMP}\nTarget: ${serverStats?.buildEnvironment || BUILD_ENVIRONMENT}\nTimezone: ${TIMEZONE_INFO}\nStorage: ${serverStats?.dataFile || './data/chores_data.json'}`;
    navigator.clipboard.writeText(info);
    setCopiedVersion(true);
    setTimeout(() => setCopiedVersion(false), 2000);
  };

  const updateCommandsCli = `# 1. Navigate to your Chore Tracker directory on Unraid
cd /mnt/user/appdata/chore-tracker-src

# 2. Rebuild the updated image
docker build -t chore-tracker:latest .

# 3. Stop and replace the running container (your data in /app/data remains safe!)
docker stop chore-tracker
docker rm chore-tracker
docker run -d \\
  --name=chore-tracker \\
  --restart=unless-stopped \\
  -p 3000:3000 \\
  -v /mnt/user/appdata/chore-tracker:/app/data \\
  chore-tracker:latest`;

  const copyUpdateCommands = () => {
    navigator.clipboard.writeText(updateCommandsCli);
    setCopiedUpdate(true);
    setTimeout(() => setCopiedUpdate(false), 2000);
  };

  return (
    <div id="settings-unraid-view" className="space-y-5">
      {/* Parent Mode Lock / Unlock Section */}
      {!isParentMode ? (
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mx-auto flex items-center justify-center mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Parent Access Locked</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 mb-4">
            Enter your 4-digit Parent PIN to customize chores, manage rewards, approve redemptions, and view Unraid server settings.
          </p>

          <form onSubmit={handleUnlock} className="max-w-xs mx-auto space-y-3">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter PIN (Default: 1234)"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError(false);
              }}
              className="w-full text-center text-lg tracking-widest bg-slate-50 border border-slate-300 rounded-2xl px-4 py-2.5 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            {pinError && (
              <p className="text-xs text-rose-600 font-medium">Incorrect PIN. (Default is 1234)</p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-2xl text-xs shadow-sm transition"
            >
              Unlock Parent Controls
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-emerald-950">Parent Mode Active</h4>
              <p className="text-[11px] text-emerald-700">Full editing, approval, and server tools are unlocked</p>
            </div>
          </div>
          <button
            onClick={onLockParentMode}
            className="px-3 py-1.5 bg-white text-emerald-800 border border-emerald-300 font-bold text-xs rounded-xl active:scale-95 shadow-xs"
          >
            Lock Back
          </button>
        </div>
      )}

      {/* Unraid Server & Storage Integration Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Unraid Server Persistence</h3>
              <p className="text-xs text-slate-500">Local volume persistence on your Unraid Docker array</p>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
              isServerOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isServerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            {isServerOnline ? 'Unraid Backend Online' : 'Local Storage Cache'}
          </span>
        </div>

        {/* Server & App metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 font-medium block text-[10px] uppercase">App Version</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded font-mono">
                {serverStats?.buildChannel || BUILD_CHANNEL}
              </span>
            </div>
            <span className="font-mono text-indigo-700 text-xs font-bold">
              {serverStats?.versionLabel || APP_VERSION_LABEL}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
            <span className="text-slate-400 font-medium block text-[10px] uppercase mb-1">Build Date</span>
            <span className="font-semibold text-slate-800 text-xs block truncate">
              {serverStats?.buildDate || BUILD_DATE}
            </span>
            <span className="text-slate-500 text-[10px]">
              {BUILD_TIME}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
            <span className="text-slate-400 font-medium block text-[10px] uppercase">Storage File Location</span>
            <span className="font-mono text-slate-700 text-[11px] break-all font-semibold">
              {serverStats?.dataFile || './data/chores_data.json'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
            <span className="text-slate-400 font-medium block text-[10px] uppercase">Unraid AppData Mount</span>
            <span className="font-mono text-slate-700 text-[11px] break-all font-semibold">
              /mnt/user/appdata/chore-tracker
            </span>
          </div>
        </div>

        {/* Unraid Docker Deployment Tabs */}
        <div className="space-y-3">
          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 overflow-x-auto text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setUnraidDeployTab('gui')}
              className={`px-3 py-1.5 rounded-xl transition ${
                unraidDeployTab === 'gui'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Unraid WebUI Form
            </button>
            <button
              type="button"
              onClick={() => setUnraidDeployTab('cli')}
              className={`px-3 py-1.5 rounded-xl transition ${
                unraidDeployTab === 'cli'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Docker CLI Run
            </button>
            <button
              type="button"
              onClick={() => setUnraidDeployTab('compose')}
              className={`px-3 py-1.5 rounded-xl transition ${
                unraidDeployTab === 'compose'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3. Docker Compose
            </button>
            <button
              type="button"
              onClick={() => setUnraidDeployTab('template')}
              className={`px-3 py-1.5 rounded-xl transition ${
                unraidDeployTab === 'template'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              4. Unraid XML Template
            </button>
            <button
              type="button"
              onClick={() => setUnraidDeployTab('update')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                unraidDeployTab === 'update'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RefreshCw className="w-3 h-3 text-indigo-500" />
              <span>5. How to Update</span>
            </button>
          </div>

          {/* Tab 1: Unraid WebUI Form */}
          {unraidDeployTab === 'gui' && (
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Unraid WebGUI: Docker &gt; "Add Container"</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md font-bold">
                  Recommended
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">
                In your Unraid dashboard, go to the <strong className="text-slate-800">Docker</strong> tab and click <strong className="text-slate-800">Add Container</strong> at the bottom. Fill in these values:
              </p>
              <div className="divide-y divide-slate-200/70 text-[11px] bg-white rounded-xl border border-slate-200/70 overflow-hidden font-mono">
                <div className="flex justify-between p-2">
                  <span className="font-sans text-slate-500 font-medium">Name:</span>
                  <span className="text-slate-900 font-bold">chore-tracker</span>
                </div>
                <div className="flex justify-between p-2">
                  <span className="font-sans text-slate-500 font-medium">Repository:</span>
                  <span className="text-indigo-600 font-bold">chore-tracker:latest</span>
                </div>
                <div className="flex justify-between items-center p-2">
                  <span className="font-sans text-slate-500 font-medium">Icon URL:</span>
                  <span className="text-indigo-600 text-[10px] break-all max-w-[260px] text-right font-medium">
                    https://raw.githubusercontent.com/getmodd-dev/chore-tracker/main/public/icon.svg
                  </span>
                </div>
                <div className="flex justify-between p-2">
                  <span className="font-sans text-slate-500 font-medium">Network Type:</span>
                  <span className="text-slate-900">Bridge</span>
                </div>
                <div className="flex justify-between p-2">
                  <span className="font-sans text-slate-500 font-medium">Port Mapping:</span>
                  <span className="text-emerald-700 font-bold">Host 3000 &rarr; Container 3000</span>
                </div>
                <div className="flex justify-between p-2">
                  <span className="font-sans text-slate-500 font-medium">Storage Path (Volume):</span>
                  <span className="text-emerald-700 font-bold">/mnt/user/appdata/chore-tracker &rarr; /app/data</span>
                </div>
                <div className="flex justify-between p-2">
                  <span className="font-sans text-slate-500 font-medium">WebUI:</span>
                  <span className="text-slate-900 font-bold">http://[IP]:[PORT:3000]/</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50/80">
                  <span className="font-sans text-slate-500 font-medium">TZ (Timezone):</span>
                  <span className="text-indigo-600 font-semibold">America/Los_Angeles</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50/80">
                  <span className="font-sans text-slate-500 font-medium">PUSHOVER_APP_TOKEN (Optional):</span>
                  <span className="text-slate-700">30-char token from pushover.net</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50/80">
                  <span className="font-sans text-slate-500 font-medium">PARENT_EMAIL (Optional):</span>
                  <span className="text-slate-700">your_parent_email@gmail.com</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50/80">
                  <span className="font-sans text-slate-500 font-medium">GMAIL_USER & APP_PASSWORD:</span>
                  <span className="text-slate-700">Optional for email digests</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Docker CLI Run */}
          {unraidDeployTab === 'cli' && (
            <div className="bg-slate-900 text-slate-200 p-3.5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-indigo-300">Run in Unraid Web Terminal (CLI):</span>
                <button
                  type="button"
                  onClick={copyDockerCommand}
                  className="flex items-center gap-1 text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-lg transition"
                >
                  {copiedDocker ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedDocker ? 'Copied!' : 'Copy Command'}</span>
                </button>
              </div>
              <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre no-scrollbar">
                {dockerCommand}
              </pre>
            </div>
          )}

          {/* Tab 3: Docker Compose */}
          {unraidDeployTab === 'compose' && (
            <div className="bg-slate-900 text-slate-200 p-3.5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-indigo-300">Docker Compose (Unraid Compose Plugin / Portainer):</span>
                <button
                  type="button"
                  onClick={copyDockerCompose}
                  className="flex items-center gap-1 text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-lg transition"
                >
                  {copiedCompose ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCompose ? 'Copied!' : 'Copy Compose YAML'}</span>
                </button>
              </div>
              <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre no-scrollbar">
                {dockerComposeYaml}
              </pre>
            </div>
          )}

          {/* Tab 4: XML Template */}
          {unraidDeployTab === 'template' && (
            <div className="bg-slate-900 text-slate-200 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-300">Native Unraid XML Template:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={copyUnraidXml}
                    className="flex items-center gap-1 text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-lg transition"
                  >
                    {copiedXml ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedXml ? 'Copied XML' : 'Copy XML'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadUnraidXml}
                    className="flex items-center gap-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded-lg transition"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download XML</span>
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Drop this file into your Unraid flash drive at: <code className="text-emerald-400 font-mono">/boot/config/plugins/dockerMan/templates-user/my-chore-tracker.xml</code> to make it appear in your "User Templates" dropdown.
              </p>
            </div>
          )}

          {/* Tab 5: How to Update Container */}
          {unraidDeployTab === 'update' && (
            <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl border border-slate-800 space-y-4 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <RefreshCw className="w-4 h-4" />
                  </span>
                  <div>
                    <h5 className="font-bold text-slate-100 text-xs">Updating to {APP_VERSION_LABEL} on Unraid</h5>
                    <p className="text-[10px] text-slate-400">Step-by-step rebuild and restart procedure</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-[10px] font-semibold px-2.5 py-1 rounded-lg">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Data is 100% Safe (Stored in /mnt/user/appdata)</span>
                </div>
              </div>

              {/* Steps explanation */}
              <div className="space-y-2.5 text-[11px] text-slate-300">
                <div className="flex items-start gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <div>
                    <strong className="text-slate-100">Export or Pull the Latest Code:</strong>
                    <p className="text-slate-400 text-[10px] mt-0.5">
                      In the top-right menu of AI Studio, export your project (Download ZIP or push to GitHub). Unpack or git pull into your source folder on Unraid (e.g., <code className="text-indigo-300 font-mono">/mnt/user/appdata/chore-tracker-src</code>).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <div>
                    <strong className="text-slate-100">Rebuild the Docker Image:</strong>
                    <p className="text-slate-400 text-[10px] mt-0.5">
                      Run the terminal command below. Docker will build the new {APP_VERSION_LABEL} bundle using the included multi-stage <code className="text-indigo-300 font-mono">Dockerfile</code>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <div>
                    <strong className="text-slate-100">Restart the Container:</strong>
                    <p className="text-slate-400 text-[10px] mt-0.5">
                      The container boots with the new build. Because your chore data lives in <code className="text-emerald-400 font-mono">/mnt/user/appdata/chore-tracker</code>, all point totals, goals, rewards, and histories are automatically retained.
                    </p>
                  </div>
                </div>
              </div>

              {/* Option A: Terminal / CLI */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-300">Option A: Unraid Web Terminal (CLI)</span>
                  <button
                    type="button"
                    onClick={copyUpdateCommands}
                    className="flex items-center gap-1 text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-lg transition"
                  >
                    {copiedUpdate ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedUpdate ? 'Copied!' : 'Copy Script'}</span>
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre no-scrollbar p-3 bg-slate-950 rounded-xl border border-slate-800">
                  {updateCommandsCli}
                </pre>
              </div>

              {/* Option B: Docker Compose */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-indigo-300">Option B: Docker Compose (Portainer or Compose Plugin)</span>
                <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre no-scrollbar p-3 bg-slate-950 rounded-xl border border-slate-800">
{`cd /mnt/user/appdata/chore-tracker-src
docker compose down
docker compose up -d --build`}
                </pre>
              </div>

              <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-800/50 text-[11px] text-indigo-200">
                💡 <strong>Verification:</strong> After restarting, open the app and look at the bottom of the Settings page. You should see <strong className="text-white">{APP_VERSION_LABEL}</strong> with build date <strong className="text-white">{BUILD_DATE}</strong>.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Automated Daily Email Reports (Gmail) Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Daily Email Reports (Gmail)</h3>
              <p className="text-xs text-slate-500">Automated daily chore breakdown sent straight to parents</p>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
              emailStatus?.isConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                emailStatus?.isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            {emailStatus?.isConfigured ? 'Gmail Active' : 'Setup Required'}
          </span>
        </div>

        {/* Schedule & Recipient Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
            <span className="text-slate-400 font-medium block text-[10px] uppercase">Recipient Email</span>
            <span className="font-semibold text-slate-800 text-[11px] truncate block">
              {emailStatus?.recipient || 'Set PARENT_EMAIL in .env / Unraid'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
            <span className="text-slate-400 font-medium block text-[10px] uppercase">Daily Automated Schedule</span>
            <span className="font-semibold text-slate-800 text-[11px] block">
              Every day at {emailStatus?.reportTime || '20:00'} (8:00 PM)
            </span>
          </div>
        </div>

        {/* Last sent notice if available */}
        {emailStatus?.lastSent && (
          <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Last report sent: {new Date(emailStatus.lastSent).toLocaleString()}</span>
          </p>
        )}

        {/* Feedback message */}
        {emailFeedback && (
          <div
            className={`p-3 rounded-2xl text-xs font-medium flex items-start gap-2 ${
              emailFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {emailFeedback.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span>{emailFeedback.message}</span>
          </div>
        )}

        {/* Pushover iOS Push Notifications Section */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Pushover iOS Push Notifications</h3>
                <p className="text-xs text-slate-500">Real-time chore alerts delivered directly to your kids' iPhones</p>
              </div>
            </div>

            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
              pushoverStatus?.isConfigured || (data.settings.pushoverAppToken && data.settings.pushoverAppToken.length > 5)
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                : 'bg-amber-50 text-amber-700 border-amber-200/60'
            }`}>
              {pushoverStatus?.isConfigured || (data.settings.pushoverAppToken && data.settings.pushoverAppToken.length > 5)
                ? 'Pushover Active'
                : 'Token Needed'}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Pushover delivers reliable native push notifications to iPhones with custom sounds, task counts, and direct links to open their chore list.
          </p>

          {/* Pushover App Token Config */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-xs text-slate-800">
                Pushover Application API Token:
              </label>
              <a
                href="https://pushover.net/apps/build"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
              >
                Create Free App Token <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div className="flex gap-2">
              <input
                type="password"
                placeholder="e.g. azGDORePK8gMaC0QOYAMyEEuzJnyUi (30 chars)"
                value={pushoverAppTokenInput}
                onChange={(e) => setPushoverAppTokenInput(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => {
                  const updatedSettings: AppSettings = {
                    ...data.settings,
                    pushoverAppToken: pushoverAppTokenInput.trim(),
                  };
                  onUpdateSettings(updatedSettings);
                  setPushoverStatus({
                    isConfigured: Boolean(pushoverAppTokenInput.trim().length > 5),
                    maskedToken: pushoverAppTokenInput.trim().length > 5 ? `${pushoverAppTokenInput.trim().slice(0, 4)}••••` : '',
                  });
                  alert('Pushover Application Token saved!');
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Save Token
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Log into <a href="https://pushover.net" target="_blank" rel="noreferrer" className="underline font-medium text-slate-700">pushover.net</a>, click <strong>Create an Application/API Token</strong>, name it "Chore Tracker", and paste the 30-character token here (or pass it via <code>PUSHOVER_APP_TOKEN</code> in your Unraid Docker template).
            </p>
          </div>

          {/* List of children and their notification status */}
          <div className="space-y-2">
            <span className="font-bold text-xs text-slate-700 block">Children's iPhone Alerts:</span>
            {data.children.map((ch) => {
              const isEnabled = ch.notificationsEnabled ?? ch.smsEnabled ?? false;
              const hasKey = Boolean(ch.pushoverUserKey && ch.pushoverUserKey.length > 10);

              return (
                <div
                  key={ch.id}
                  className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{ch.avatar}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 truncate">{ch.name}</span>
                        {isEnabled && hasKey ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-md flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Active ({ch.notificationTime || ch.smsTime || '16:30'})
                          </span>
                        ) : isEnabled && !hasKey ? (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-md flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5" /> User Key Needed
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-200 text-slate-600 font-medium px-1.5 py-0.2 rounded-md">
                            Disabled
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono block truncate">
                        {ch.pushoverUserKey ? `Key: ${ch.pushoverUserKey.slice(0, 6)}••••${ch.pushoverUserKey.slice(-4)}` : 'No User Key linked yet'}
                        {ch.pushoverDeviceName ? ` (${ch.pushoverDeviceName})` : ''}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNotificationConfigChild(ch)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 active:scale-95 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5 shrink-0"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Configure iPhone Alert</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleSendTestEmail}
            disabled={isSendingEmail}
            className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold py-2.5 px-3 rounded-2xl transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Send className={`w-3.5 h-3.5 ${isSendingEmail ? 'animate-spin' : ''}`} />
            <span>{isSendingEmail ? 'Sending...' : 'Send Summary Now'}</span>
          </button>

          <button
            onClick={handleLoadPreview}
            className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-xs font-bold py-2.5 px-3 rounded-2xl transition border border-slate-200"
          >
            <Eye className="w-3.5 h-3.5 text-slate-600" />
            <span>Preview Email Report</span>
          </button>
        </div>

        {/* Gmail Setup Instructions Toggle */}
        <div className="pt-2">
          <button
            onClick={() => setShowEmailGuide(!showEmailGuide)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
          >
            <Info className="w-3.5 h-3.5" />
            <span>{showEmailGuide ? 'Hide Gmail Setup Guide' : 'How to set up Gmail App Password'}</span>
          </button>

          {showEmailGuide && (
            <div className="mt-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2">
              <p className="font-bold text-slate-900">3-Step Gmail Configuration:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed text-[11px]">
                <li>
                  Open your Google Account at{' '}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 font-bold underline inline-flex items-center gap-0.5"
                  >
                    myaccount.google.com/apppasswords <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </li>
                <li>Generate a new App Password named <strong>"Chore Tracker"</strong> (Google provides a 16-letter code).</li>
                <li>Add these environment variables into your Unraid Docker Container edit page or <code className="bg-slate-200 px-1 py-0.5 rounded">.env</code>:</li>
              </ol>

              <div className="bg-slate-900 text-emerald-400 p-2.5 rounded-xl font-mono text-[10px] space-y-0.5">
                <div>GMAIL_USER="your-email@gmail.com"</div>
                <div>GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"</div>
                <div>PARENT_EMAIL="parent@gmail.com"</div>
                <div>DAILY_REPORT_TIME="20:00"</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email Preview Modal */}
      {emailPreviewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-sm text-slate-900">Daily Report Email Preview</h4>
              </div>
              <button
                onClick={() => setEmailPreviewHtml(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 bg-slate-100">
              <div
                className="bg-white rounded-xl shadow-xs overflow-hidden"
                dangerouslySetInnerHTML={{ __html: emailPreviewHtml }}
              />
            </div>

            <div className="p-3 border-t border-slate-100 bg-white flex justify-end">
              <button
                onClick={() => setEmailPreviewHtml(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Web App Instructions Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-5 border border-indigo-100 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900">How to Install on iPhone / iPad</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Open this URL in <strong>Safari</strong> on your child's or family iPhone/iPad:
            </p>
            <ol className="text-xs text-slate-700 mt-2 space-y-1.5 list-decimal list-inside font-medium">
              <li>Tap the <strong>Share</strong> icon in the Safari toolbar (square with upward arrow).</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong>. It will launch as a native full-screen iOS app without browser address bars!</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Backup & Data Management (When in Parent Mode) */}
      {isParentMode && (
        <>
          {/* Manage Children Profiles Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900">Manage Children Profiles</h4>
                <p className="text-xs text-slate-500">Edit daily targets or remove child profiles</p>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {data.children.length} {data.children.length === 1 ? 'Child' : 'Children'}
              </span>
            </div>

            <div className="space-y-2.5">
              {data.children.map((ch) => (
                <div
                  key={ch.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-2xl shrink-0">
                      {ch.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{ch.name}</span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.5 rounded">
                          Lvl {ch.level}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                        <span>Goal: <strong>{ch.dailyGoal} pts/day</strong></span>
                        <span>•</span>
                        <span className="text-emerald-700 font-bold">Allowance: ${ch.monthlyAllowanceTarget ?? 25}/mo</span>
                        <span>•</span>
                        <span className="text-indigo-600 font-semibold">{ch.currentPoints} ⭐ bank</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Theme Toggle Pill */}
                    {onToggleChildTheme && (
                      <button
                        type="button"
                        onClick={() =>
                          onToggleChildTheme(
                            ch.id,
                            ch.theme === 'fintech_hustle' ? 'classic' : 'fintech_hustle'
                          )
                        }
                        className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-bold border transition active:scale-95 ${
                          ch.theme === 'fintech_hustle'
                            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                        title="Toggle Teen Fintech vs Classic Theme"
                      >
                        {ch.theme === 'fintech_hustle' ? (
                          <>
                            <Zap className="w-3 h-3 text-emerald-400" />
                            <span>Fintech</span>
                          </>
                        ) : (
                          <>
                            <Palette className="w-3 h-3 text-indigo-500" />
                            <span>Classic</span>
                          </>
                        )}
                      </button>
                    )}

                    {onUpdateChildAllowanceTarget && (
                      <div className="flex items-center bg-white border border-emerald-200 rounded-xl p-0.5" title="Monthly Allowance Target">
                        <span className="text-[10px] font-bold text-emerald-800 px-1.5">Allowance:</span>
                        <button
                          type="button"
                          onClick={() => onUpdateChildAllowanceTarget(ch.id, Math.max(5, (ch.monthlyAllowanceTarget ?? 25) - 5))}
                          className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                          title="Decrease Allowance Target"
                        >
                          -
                        </button>
                        <span className="text-[11px] font-bold px-1 text-emerald-800 min-w-8 text-center">
                          ${ch.monthlyAllowanceTarget ?? 25}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateChildAllowanceTarget(ch.id, (ch.monthlyAllowanceTarget ?? 25) + 5)}
                          className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                          title="Increase Allowance Target"
                        >
                          +
                        </button>
                      </div>
                    )}

                    {onUpdateChildGoal && (
                      <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5" title="Daily Points Goal (Min 0, Steps of 5)">
                        <button
                          type="button"
                          onClick={() => onUpdateChildGoal(ch.id, Math.max(0, ch.dailyGoal - 5))}
                          className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                          title="Decrease Goal by 5"
                        >
                          -
                        </button>
                        <span className="text-[11px] font-bold px-1.5 text-slate-700 min-w-8 text-center">
                          {ch.dailyGoal} pts
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateChildGoal(ch.id, ch.dailyGoal + 5)}
                          className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                          title="Increase Goal by 5"
                        >
                          +
                        </button>
                      </div>
                    )}

                    {onUpdateChild && (
                      <button
                        type="button"
                        onClick={() => setNotificationConfigChild(ch)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition active:scale-95 ${
                          (ch.notificationsEnabled ?? ch.smsEnabled) && ch.pushoverUserKey
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        title="Configure iPhone Push Notifications via Pushover"
                      >
                        <Bell className="w-3 h-3 text-indigo-500" />
                        <span>
                          {(ch.notificationsEnabled ?? ch.smsEnabled) && ch.pushoverUserKey
                            ? `${ch.notificationTime || ch.smsTime || '16:30'}`
                            : 'Alerts'}
                        </span>
                      </button>
                    )}

                    {onDeleteChild && (
                      <button
                        type="button"
                        disabled={data.children.length <= 1}
                        onClick={() => {
                          if (
                            confirm(
                              `Are you sure you want to remove ${ch.name}'s profile? Their ${ch.currentPoints} points and chore logs will be removed.`
                            )
                          ) {
                            onDeleteChild(ch.id);
                          }
                        }}
                        className={`p-2 rounded-xl text-xs font-semibold transition ${
                          data.children.length > 1
                            ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-700 active:scale-95 cursor-pointer'
                            : 'text-slate-300 cursor-not-allowed'
                        }`}
                        title={
                          data.children.length > 1
                            ? `Remove ${ch.name}`
                            : 'At least one child profile must remain'
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h4 className="font-bold text-sm text-slate-900">Backup & Recovery</h4>
          <p className="text-xs text-slate-500">
            Export your full family data (kids, points, history, custom chores, and rewards) or restore from an existing JSON file.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportBackup}
              className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-xs font-bold py-2.5 px-3 rounded-2xl transition border border-slate-200"
            >
              <Download className="w-4 h-4" />
              <span>Download Backup</span>
            </button>

            <label className="flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 text-xs font-bold py-2.5 px-3 rounded-2xl transition border border-indigo-200 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Restore Backup</span>
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>
          </div>

          {/* Change PIN Form */}
          <div className="pt-3 border-t border-slate-100">
            <h5 className="font-bold text-xs text-slate-800 mb-2">Change Parent PIN</h5>
            <form onSubmit={handleSavePin} className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="New 4-digit PIN"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold"
              />
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-xl text-xs font-bold"
              >
                Save PIN
              </button>
            </form>
          </div>

          {/* Reset to sample data */}
          <div className="pt-2">
            <button
              onClick={() => {
                if (confirm('Are you sure you want to reset to initial sample family data?')) {
                  onResetToDefaults();
                }
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset All to Demo Defaults
            </button>
          </div>
        </div>
        </>
      )}

      {/* System Version & Build Information Card */}
      <div id="system-version-card" className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm text-slate-900">Chore Points & Rewards Tracker</h4>
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200/70 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full">
                  {serverStats?.versionLabel || APP_VERSION_LABEL}
                </span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                  {serverStats?.buildChannel || BUILD_CHANNEL}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Build & release diagnostics for your home server installation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyVersionInfo}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 active:scale-95 px-3 py-1.5 rounded-xl border border-slate-200 transition"
            title="Copy system and build diagnostics to clipboard"
          >
            {copiedVersion ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Specs</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-start gap-2.5">
            <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-400 font-medium block text-[10px] uppercase">Build Date</span>
              <span className="font-semibold text-slate-800 text-xs">
                {serverStats?.buildDate || BUILD_DATE}
              </span>
              <span className="text-slate-500 text-[11px] block mt-0.5 font-mono">
                {BUILD_TIME}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-400 font-medium block text-[10px] uppercase">Active Timezone</span>
              <span className="font-semibold text-slate-800 text-xs truncate block">
                Pacific Time (PST/PDT)
              </span>
              <span className="text-slate-500 text-[11px] block mt-0.5">
                Day resets strictly at midnight PST
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-start gap-2.5">
            <Server className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-400 font-medium block text-[10px] uppercase">Target Environment</span>
              <span className="font-semibold text-slate-800 text-xs truncate block">
                {serverStats?.buildEnvironment || BUILD_ENVIRONMENT}
              </span>
              {serverStats?.nodeVersion && (
                <span className="text-slate-500 text-[11px] block mt-0.5 font-mono">
                  Node.js {serverStats.nodeVersion}
                </span>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-start gap-2.5">
            <HardDrive className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-400 font-medium block text-[10px] uppercase">Persistence Status</span>
              <span className="font-semibold text-slate-800 text-xs truncate block">
                {isServerOnline ? 'Unraid Persistent Storage' : 'Local Storage Cache'}
              </span>
              <span className="text-slate-500 text-[11px] block mt-0.5">
                {serverStats?.dataFileSize ? `${(serverStats.dataFileSize / 1024).toFixed(1)} KB stored on disk` : 'Ready'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* iPhone Push Notification Configuration Modal */}
      {notificationConfigChild && (
        <ChildNotificationConfigModal
          isOpen={!!notificationConfigChild}
          onClose={() => setNotificationConfigChild(null)}
          child={notificationConfigChild}
          theme={theme}
          onSave={(updatedChild) => {
            if (onUpdateChild) {
              onUpdateChild(updatedChild);
            }
            setNotificationConfigChild(null);
          }}
        />
      )}
    </div>
  );
};
