@echo off

mkdir build
cd build
pyinstaller --windowed --collect-submodules youtube-volume-normalizer ..\youtube-volume-normalizer.py
"C:\Program Files\7-Zip\7z.exe" a archive.7z .\dist\youtube-volume-normalizer ..\setup.bat
curl https://www.7-zip.org/a/lzma2201.7z -o lzma2201.7z
"C:\Program Files\7-Zip\7z.exe" x -olzma2201 lzma2201.7z
copy /b "lzma2201\bin\7zSD.sfx" + ..\config.txt + archive.7z installer.exe
cd ..