@echo off
setlocal DisableDelayedExpansion
pushd "%~dp0"
if errorlevel 1 exit /b 1
if not exist "%SystemRoot%\System32\curl.exe" goto missing
if not exist "%SystemRoot%\System32\tar.exe" goto missing
if not exist "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" goto missing
set "stage=%~dp0.bootstrap-%RANDOM%-%RANDOM%"
if exist "%stage%" goto failed
mkdir "%stage%"
if errorlevel 1 goto failed
set "KSESSION_BOOTSTRAP_ZIP=%stage%\node.zip"
echo Downloading pinned Node 24.21.0 from nodejs.org ...
"%SystemRoot%\System32\curl.exe" --fail --location --proto "=https" --proto-redir "=https" --tlsv1.2 --max-redirs 3 --retry 2 --connect-timeout 30 --max-time 600 --output "%KSESSION_BOOTSTRAP_ZIP%" "https://nodejs.org/dist/v24.21.0/node-v24.21.0-win-x64.zip"
if errorlevel 1 goto failed
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -Command "$ErrorActionPreference='Stop'; $stream=[System.IO.File]::OpenRead($env:KSESSION_BOOTSTRAP_ZIP); $hasher=[System.Security.Cryptography.SHA256]::Create(); try { $actual=[System.BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-','').ToLowerInvariant(); if ($actual -ne '158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541') { throw 'Official Node archive checksum mismatch' } } finally { $hasher.Dispose(); $stream.Dispose() }"
if errorlevel 1 goto failed
pushd "%stage%"
if errorlevel 1 goto failed
"%SystemRoot%\System32\tar.exe" -xf node.zip
set "extractResult=%errorlevel%"
popd
if not "%extractResult%"=="0" goto failed
"%stage%\node-v24.21.0-win-x64\node.exe" "%~dp0installer.js" --runtime "%stage%\node-v24.21.0-win-x64" --archive "%KSESSION_BOOTSTRAP_ZIP%" %*
if errorlevel 1 goto failed
echo Installation completed. Run Start.cmd in the chosen installation directory.
popd
if not "%KSESSION_INSTALL_NONINTERACTIVE%"=="1" pause
exit /b 0
:missing
echo Required Windows built-ins curl.exe, tar.exe or PowerShell are unavailable.
echo Use a supported Windows x64 system. No security policy was changed.
:failed
echo Installation did not complete. Existing instance data was not reset.
echo Keep this window output and the installer folder for diagnosis.
popd
if not "%KSESSION_INSTALL_NONINTERACTIVE%"=="1" pause
exit /b 1
