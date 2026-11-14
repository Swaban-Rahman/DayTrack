import { app } from 'electron';

export function setAutoStartup(enabled: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enabled,
  });
}

export function getAutoStartup(): boolean {
  return app.getLoginItemSettings().openAtLogin;
}
