import { app } from 'electron';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { WindowsReminderStatus } from '../../src/types/index';

export const REMINDER_TASK_NAME = 'DayTrack Reminder';
const REMINDER_CHECK_ARG = '--reminder-check';

function currentUser(): string {
  const domain = process.env.USERDOMAIN || os.hostname();
  return `${domain}\\${os.userInfo().username}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildTaskXml(exePath: string): string {
  const user = escapeXml(currentUser());
  const command = escapeXml(exePath);
  const workingDir = escapeXml(path.dirname(exePath));

  return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.3" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>Shows DayTrack's unfinished-task and next-day-plan reminders after sign-in, workstation unlock, and wake from sleep.</Description>
    <URI>\\${REMINDER_TASK_NAME}</URI>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
      <UserId>${user}</UserId>
      <Delay>PT10S</Delay>
    </LogonTrigger>
    <SessionStateChangeTrigger>
      <Enabled>true</Enabled>
      <UserId>${user}</UserId>
      <StateChange>SessionUnlock</StateChange>
      <Delay>PT3S</Delay>
    </SessionStateChangeTrigger>
    <EventTrigger>
      <Enabled>true</Enabled>
      <Subscription>&lt;QueryList&gt;&lt;Query Id="0" Path="System"&gt;&lt;Select Path="System"&gt;*[System[Provider[@Name='Microsoft-Windows-Kernel-Power'] and EventID=107]]&lt;/Select&gt;&lt;/Query&gt;&lt;/QueryList&gt;</Subscription>
      <Delay>PT5S</Delay>
    </EventTrigger>
    <EventTrigger>
      <Enabled>true</Enabled>
      <Subscription>&lt;QueryList&gt;&lt;Query Id="0" Path="System"&gt;&lt;Select Path="System"&gt;*[System[Provider[@Name='Microsoft-Windows-Power-Troubleshooter'] and EventID=1]]&lt;/Select&gt;&lt;/Query&gt;&lt;/QueryList&gt;</Subscription>
      <Delay>PT5S</Delay>
    </EventTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <UserId>${user}</UserId>
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>false</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>${command}</Command>
      <Arguments>${REMINDER_CHECK_ARG}</Arguments>
      <WorkingDirectory>${workingDir}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
`;
}

function notSupportedStatus(message: string): WindowsReminderStatus {
  return {
    supported: false,
    registered: false,
    enabled: false,
    state: 'Unavailable',
    exePath: '',
    expectedExePath: process.execPath,
    needsUpdate: false,
    triggers: [],
    lastRunTime: null,
    lastResult: null,
    message,
  };
}

function runPowerShell(script: string): { ok: boolean; output: string } {
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { windowsHide: true, encoding: 'utf8', timeout: 20000 }
  );
  return {
    ok: result.status === 0,
    output: `${result.stdout || ''}${result.stderr || ''}`.trim(),
  };
}

interface RawTaskInfo {
  registered?: boolean;
  state?: string;
  enabled?: boolean;
  path?: string;
  args?: string;
  triggers?: string[];
  lastRun?: string | null;
  lastResult?: number | null;
}

function triggerLabel(className: string): string {
  if (className.includes('LogonTrigger')) return 'At sign-in';
  if (className.includes('SessionStateChangeTrigger')) return 'On workstation unlock';
  if (className.includes('EventTrigger')) return 'On wake from sleep';
  return className;
}

/**
 * Reports whether the Windows reminder task exists, is enabled and points at
 * the running executable. Read-only.
 */
export function getSchedulerStatus(): WindowsReminderStatus {
  if (process.platform !== 'win32' || !app.isPackaged) {
    return notSupportedStatus('Windows reminder tasks are registered by the installed app.');
  }

  const script = `
$ErrorActionPreference = 'Stop'
$t = Get-ScheduledTask -TaskName '${REMINDER_TASK_NAME}' -ErrorAction SilentlyContinue
if (-not $t) { Write-Output '{"registered":false}'; exit 0 }
$i = Get-ScheduledTaskInfo -TaskName '${REMINDER_TASK_NAME}'
$o = [ordered]@{
  registered = $true
  state = [string]$t.State
  enabled = [bool]$t.Settings.Enabled
  path = [string]$t.Actions[0].Execute
  args = [string]$t.Actions[0].Arguments
  triggers = @($t.Triggers | ForEach-Object { $_.CimClass.CimClassName })
  lastRun = if ($i.LastRunTime) { $i.LastRunTime.ToString('o') } else { $null }
  lastResult = $i.LastTaskResult
}
$o | ConvertTo-Json -Compress
`;

  const { ok, output } = runPowerShell(script);
  if (!ok) {
    return {
      ...notSupportedStatus('Could not read the Windows task status.'),
      supported: true,
      message: output || 'Could not read the Windows task status.',
    };
  }

  let raw: RawTaskInfo;
  try {
    raw = JSON.parse(output) as RawTaskInfo;
  } catch {
    return {
      ...notSupportedStatus('Unexpected response while reading the Windows task status.'),
      supported: true,
    };
  }

  if (!raw.registered) {
    return {
      ...notSupportedStatus('Not registered yet. Re-register to enable reminders after sign-in, unlock, and wake.'),
      supported: true,
    };
  }

  const exePath = raw.path || '';
  const triggers = (raw.triggers || []).map(triggerLabel);
  const exeMismatch = path.normalize(exePath).toLowerCase() !== path.normalize(process.execPath).toLowerCase();
  const argsMismatch = (raw.args || '').trim() !== REMINDER_CHECK_ARG;
  const triggersMissing = triggers.length < 4;
  const needsUpdate = exeMismatch || argsMismatch || triggersMissing;

  return {
    supported: true,
    registered: true,
    enabled: raw.enabled !== false,
    state: raw.state || 'Unknown',
    exePath,
    expectedExePath: process.execPath,
    needsUpdate,
    triggers,
    lastRunTime: raw.lastRun || null,
    lastResult: typeof raw.lastResult === 'number' ? raw.lastResult : null,
    message: needsUpdate
      ? 'The task points to a previous installation. Re-register to use the current app.'
      : raw.enabled === false
        ? 'The task is registered but disabled in Task Scheduler.'
        : 'Reminders are registered for sign-in, unlock, and wake.',
  };
}

/**
 * Creates (or updates) the per-user scheduled task. Idempotent: the task name
 * is fixed and /F replaces the previous definition, so updates never create
 * duplicates.
 */
export function registerSchedulerTask(): WindowsReminderStatus {
  if (process.platform !== 'win32' || !app.isPackaged) {
    return notSupportedStatus('Windows reminder tasks are only registered by the installed app.');
  }

  const xmlPath = path.join(app.getPath('temp'), `daytrack-reminder-task-${process.pid}.xml`);
  try {
    fs.writeFileSync(xmlPath, `\ufeff${buildTaskXml(process.execPath)}`, 'utf16le');
    const result = spawnSync(
      'schtasks.exe',
      ['/Create', '/TN', REMINDER_TASK_NAME, '/XML', xmlPath, '/F'],
      { windowsHide: true, encoding: 'utf8', timeout: 20000 }
    );
    const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
    if (result.status !== 0) {
      console.error('Task Scheduler registration failed:', output);
      return {
        ...notSupportedStatus(output || 'Task Scheduler registration failed.'),
        supported: true,
      };
    }
    return getSchedulerStatus();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Task Scheduler registration failed:', message);
    return { ...notSupportedStatus(message), supported: true };
  } finally {
    try {
      fs.unlinkSync(xmlPath);
    } catch {
      // temp file may not exist
    }
  }
}

/** Registers on every packaged launch so updates always point at the current exe. */
export function ensureSchedulerTask(): void {
  if (process.platform !== 'win32' || !app.isPackaged) return;
  try {
    const status = getSchedulerStatus();
    if (!status.registered || status.needsUpdate || !status.enabled) {
      registerSchedulerTask();
    }
  } catch (err) {
    console.error('Task Scheduler check failed:', err);
  }
}

export function unregisterSchedulerTask(): void {
  if (process.platform !== 'win32') return;
  spawnSync('schtasks.exe', ['/Delete', '/TN', REMINDER_TASK_NAME, '/F'], {
    windowsHide: true,
    encoding: 'utf8',
    timeout: 20000,
  });
}
