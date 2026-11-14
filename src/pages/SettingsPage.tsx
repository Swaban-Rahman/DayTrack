import React, { useEffect, useState } from 'react';
import { Bell, Download, FolderOpen, RotateCcw, Save } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../hooks/useSettings';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/Select';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { getToday, shiftDate } from '../utils/helpers';
import './SettingsPage.css';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { refreshTasks, refreshActiveSession, refreshSettings } = useApp();
  const {
    settings,
    setSetting,
    setAutoStartup,
    exportToCSV,
    backupData,
    restoreData,
    resetData,
  } = useSettings();

  const [autoStartup, setAutoStartupState] = useState(false);
  const [version, setVersion] = useState('');
  const [exportStart, setExportStart] = useState(shiftDate(getToday(), -29));
  const [exportEnd, setExportEnd] = useState(getToday());
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'info' | 'success' | 'error'>('info');
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetText, setResetText] = useState('');

  useEffect(() => {
    if (!window.daytrack) return;
    window.daytrack
      .getAutoStartup(settings.startMinimized !== 'false')
      .then(setAutoStartupState)
      .catch(console.error);
  }, [settings.startMinimized]);

  useEffect(() => {
    if (!window.daytrack) return;
    window.daytrack.getAppVersion().then(setVersion).catch(console.error);
  }, []);

  const notify = (text: string, kind: 'info' | 'success' | 'error' = 'info') => {
    setMessage(text);
    setMessageKind(kind);
  };

  const updateFlag = async (key: string, enabled: boolean) => {
    await setSetting(key, enabled ? 'true' : 'false');
  };

  const reloadAfterDataChange = async () => {
    await Promise.all([refreshTasks(), refreshActiveSession(), refreshSettings()]);
  };

  const runExport = async () => {
    setBusy(true);
    try {
      const path = await exportToCSV(exportStart, exportEnd);
      notify(path ? `Exported to ${path}` : 'Export cancelled.', path ? 'success' : 'info');
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Export failed.';
      notify(text.toLowerCase().includes('cancel') ? 'Export cancelled.' : text, text.toLowerCase().includes('cancel') ? 'info' : 'error');
    } finally {
      setBusy(false);
    }
  };

  const runBackup = async () => {
    setBusy(true);
    try {
      const path = await backupData();
      notify(path ? `Backup saved to ${path}` : 'Backup cancelled.', path ? 'success' : 'info');
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Backup failed.';
      notify(text.toLowerCase().includes('cancel') ? 'Backup cancelled.' : text, text.toLowerCase().includes('cancel') ? 'info' : 'error');
    } finally {
      setBusy(false);
    }
  };

  const runRestore = async () => {
    if (!window.daytrack) return;
    setBusy(true);
    try {
      const filePath = await window.daytrack.selectFile();
      if (!filePath) {
        notify('Restore cancelled.');
        return;
      }
      await restoreData(filePath);
      await reloadAfterDataChange();
      notify('Backup restored. Your tasks and settings were reloaded.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Restore failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const runReset = async () => {
    if (resetText !== 'RESET') return;
    setBusy(true);
    try {
      await resetData();
      await reloadAfterDataChange();
      setTheme('dark');
      setConfirmReset(false);
      setResetText('');
      notify('All DayTrack data was reset.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Reset failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      await window.daytrack.showNotification('DayTrack', 'Notifications are working.');
      notify('Test notification sent.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not send a notification.', 'error');
    }
  };

  const flag = (key: string, fallback = false) =>
    settings[key] !== undefined ? settings[key] === 'true' : fallback;

  return (
    <div className="settings-page">
      <div>
        <h2 className="page-heading">Settings</h2>
        <p className="page-subheading">Appearance, reminders, and the local database.</p>
      </div>

      {message && <p className={`settings-message ${messageKind}`}>{message}</p>}

      <Card title="Appearance">
        <div className="settings-grid">
          <Select
            label="Theme"
            value={theme}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
            ]}
            onChange={(event) => setTheme(event.target.value as 'dark' | 'light')}
          />
          <Select
            label="Time format"
            value={settings.timeFormat || '24'}
            options={[
              { value: '24', label: '24-hour' },
              { value: '12', label: '12-hour' },
            ]}
            onChange={(event) => setSetting('timeFormat', event.target.value)}
          />
          <Input
            label="Daily working hours"
            type="number"
            min={1}
            max={16}
            value={settings.dailyWorkingHours || '8'}
            onChange={(event) => setSetting('dailyWorkingHours', event.target.value || '8')}
          />
        </div>
      </Card>

      <Card title="Reminders and startup">
        <div className="settings-toggles">
          <ToggleRow
            label="Notifications"
            description="Show the daily startup summary and deadline reminders."
            checked={flag('notificationsEnabled', true)}
            onChange={(checked) => updateFlag('notificationsEnabled', checked)}
          />
          <ToggleRow
            label="Deadline reminders"
            description="Notify when a task due today is still open."
            checked={flag('deadlineReminders', true)}
            onChange={(checked) => updateFlag('deadlineReminders', checked)}
          />
          <ToggleRow
            label="Break reminders"
            description="Prompt for a break every 90 minutes while DayTrack is open."
            checked={flag('breakReminders', false)}
            onChange={(checked) => updateFlag('breakReminders', checked)}
          />
          <ToggleRow
            label="Start with Windows"
            description="Open DayTrack automatically when you sign in."
            checked={autoStartup}
            onChange={async (checked) => {
              setAutoStartupState(checked);
              await setAutoStartup(checked, flag('startMinimized', true));
            }}
          />
          <ToggleRow
            label="Start minimized in tray"
            description="When launching at sign-in, start hidden in the system tray."
            checked={flag('startMinimized', true)}
            disabled={!autoStartup}
            onChange={async (checked) => {
              await updateFlag('startMinimized', checked);
              await setAutoStartup(true, checked);
            }}
          />
          <ToggleRow
            label="Close to tray"
            description="Keep DayTrack running in the tray when the window is closed."
            checked={flag('minimizeToTray', true)}
            onChange={(checked) => updateFlag('minimizeToTray', checked)}
          />
          <ToggleRow
            label="Pause timer on lock"
            description="Pause the running timer when Windows locks the screen."
            checked={flag('pauseOnLock', true)}
            onChange={(checked) => updateFlag('pauseOnLock', checked)}
          />
        </div>
        <div className="settings-test-row">
          <Button variant="ghost" size="sm" icon={<Bell size={14} />} onClick={sendTestNotification}>
            Send test notification
          </Button>
        </div>
      </Card>

      <Card title="Data" subtitle="Everything stays in a local SQLite database">
        <div className="settings-inline">
          <Input label="Export from" type="date" value={exportStart} onChange={(event) => setExportStart(event.target.value)} />
          <Input label="Export to" type="date" value={exportEnd} onChange={(event) => setExportEnd(event.target.value)} />
        </div>
        <div className="settings-actions">
          <Button variant="secondary" icon={<Download size={16} />} loading={busy} onClick={runExport}>
            Export CSV
          </Button>
          <Button variant="secondary" icon={<Save size={16} />} loading={busy} onClick={runBackup}>
            Backup database
          </Button>
          <Button variant="secondary" icon={<FolderOpen size={16} />} loading={busy} onClick={runRestore}>
            Restore backup
          </Button>
          <Button variant="danger" icon={<RotateCcw size={16} />} loading={busy} onClick={() => setConfirmReset(true)}>
            Reset all data
          </Button>
        </div>
        <p className="settings-version">DayTrack {version || '1.0.0'}</p>
      </Card>

      <Modal
        isOpen={confirmReset}
        onClose={() => {
          setConfirmReset(false);
          setResetText('');
        }}
        title="Reset all data?"
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmReset(false);
                setResetText('');
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" loading={busy} disabled={resetText !== 'RESET'} onClick={runReset}>
              Reset
            </Button>
          </>
        }
      >
        <p className="reset-warning">
          This deletes tasks, timers, plans, distractions, and settings stored on this computer.
          Consider creating a backup first.
        </p>
        <Input
          label='Type "RESET" to confirm'
          value={resetText}
          placeholder="RESET"
          onChange={(event) => setResetText(event.target.value)}
        />
      </Modal>
    </div>
  );
};

const ToggleRow: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, description, checked, disabled = false, onChange }) => (
  <label className={`toggle-row ${disabled ? 'disabled' : ''}`}>
    <div>
      <strong>{label}</strong>
      <span>{description}</span>
    </div>
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
    />
  </label>
);
