; DayTrack – Windows Task Scheduler cleanup for install/update/uninstall.
; The app itself registers the current task definition on first launch.

!macro customInstall
  nsExec::ExecToLog 'schtasks /Delete /TN "DayTrack Reminder" /F'
!macroend

!macro customUnInstall
  nsExec::ExecToLog 'schtasks /Delete /TN "DayTrack Reminder" /F'
!macroend
