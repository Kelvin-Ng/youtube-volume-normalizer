@echo off

xcopy /e "{%%T}\..\youtube-volume-normalizer" "%APPDATA%\youtube-volume-normalizer\"

(
    echo {
    echo   "name": "youtube.volume.normalizer",
    echo   "description": "Native app for YouTube Volume Normalizer to control system volume",
    echo   "path": "%APPDATA:\=\\%\\youtube-volume-normalizer\\youtube-volume-normalizer.exe",
    echo   "type": "stdio",
    echo   "allowed_extensions": ["{0fa8f380-98c6-4cc9-9f24-10d84bf1b609}"]
    echo }
)>"%APPDATA%\youtube-volume-normalizer\manifest-firefox.json"

(
    echo {
    echo   "name": "youtube.volume.normalizer",
    echo   "description": "Native app for YouTube Volume Normalizer to control system volume",
    echo   "path": "%APPDATA:\=\\%\\youtube-volume-normalizer\\youtube-volume-normalizer.exe",
    echo   "type": "stdio",
    echo   "allowed_origins": ["chrome-extension://ngehiebgibmdhaneeppejbnoaokpnghc/"]
    echo }
)>"%APPDATA%\youtube-volume-normalizer\manifest-chromium.json"

REG ADD "HKCU\Software\Google\Chrome\NativeMessagingHosts\youtube.volume.normalizer" /ve /t REG_SZ /d "%APPDATA%\youtube-volume-normalizer\manifest-chromium.json" /f
REG ADD "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\youtube.volume.normalizer" /ve /t REG_SZ /d "%APPDATA%\youtube-volume-normalizer\manifest-chromium.json" /f
REG ADD "HKCU\Software\Mozilla\NativeMessagingHosts\youtube.volume.normalizer" /ve /t REG_SZ /d "%APPDATA%\youtube-volume-normalizer\manifest-firefox.json" /f
