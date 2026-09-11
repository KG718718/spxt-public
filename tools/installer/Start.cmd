@echo off
setlocal DisableDelayedExpansion
"%~dp0runtime\node.exe" "%~dp0launcher.js" %*
if errorlevel 1 pause
