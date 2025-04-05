# Automatic Screenshot App
 Automatic Screenshot App is an Electron-based tool that automatically captures screenshots at user-defined intervals. It supports multiple monitors, organizes screenshots into daily folders, and allows you to set active time ranges to capture images only during specific hours. With tray integration, auto-updating, and a sleek Bootstrap UI, it's perfect for keeping a visual log of your desktop activities.

## Features

- **Automatic Capturing:** Takes screenshots at intervals you set (1–60 minutes, in 5-minute steps).
- **Multi-Monitor Support:** Captures all monitors and saves them with unique names.
- **Organized Storage:** Screenshots are saved into daily folders.
- **Active Time Range:** Only takes screenshots during your specified time range.
- **System Aware:** Skips screenshot capture when your computer is asleep, locked, or running a screensaver.
- **Tray Integration:** Easily start/stop the process and open the save folder via the system tray.
- **Auto-Updating:** Built-in auto-update feature using electron-updater.
- **Cross-Platform:** Runs on Windows, Mac, and Linux.

## How to Use

1. **Launch the App:**
   - Open the app from your desktop shortcut or system tray icon.

2. **Set Screenshot Interval:**
   - Enter the interval (in minutes) in the "Take screenshot in X minutes" field. The input supports values from 1 to 60, in increments of 5.

3. **Select Save Directory:**
   - Use the **Browse** button to choose where screenshots will be saved. The default is your Documents folder.
   - You can also open the save folder directly via the **Open Save Folder** button.

4. **Specify Active Time Range:**
   - Set the start and end times in the time inputs (which will reflect your system’s time format).
   - Screenshots will only be taken if the current time is within this range.

5. **Start/Stop the App:**
   - Click the **Start** button (green) to begin capturing screenshots.
   - When running, the button changes to **Stop** (red). Click it again to stop the process.

6. **Tray Menu:**
   - Right-click the tray icon to toggle the screenshot process or to quit the app.

7. **Auto-Updating:**
   - The app checks for updates automatically. You’ll be notified when a new version is available.

## Building and Packaging

To build the app for distribution, use [electron-builder](https://www.electron.build/):

1. Install dependencies:
   ```bash
   npm install
   npm run build
