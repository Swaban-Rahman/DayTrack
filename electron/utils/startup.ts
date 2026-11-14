import { app } from 'electron';

const HIDDEN_ARG = '--hidden';

export function isLoginStartup(): boolean {
  return process.argv.includes(HIDDEN_ARG);
}

function startupArgs(startMinimized: boolean): string[] {
  const hidden = startMinimized ? [HIDDEN_ARG] : [];
  if (app.isPackaged) return hidden;
  // During development electron.exe has to be told which app to open.
  return [app.getAppPath(), ...hidden];
}

export function setAutoStartup(enabled: boolean, startMinimized = true): void {
  const settings: Electron.Settings = { openAtLogin: enabled };

  if (enabled) {
    settings.path = process.execPath;
    const args = startupArgs(startMinimized);
    if (args.length > 0) settings.args = args;
  }

  app.setLoginItemSettings(settings);
}

export function getAutoStartup(startMinimized = true): boolean {
  return app.getLoginItemSettings({
    path: process.execPath,
    args: startupArgs(startMinimized),
  }).openAtLogin;
}
