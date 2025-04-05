# Automatic Screenshot App

Automatic Screenshot App is an Electron-based tool that automatically captures screenshots at user-defined intervals. It supports multiple monitors, organizes screenshots into daily folders, and allows you to set active time ranges so that images are captured only during specific hours. With tray integration, a dynamic version display, auto-updating with prompt, screenshot dimension and JPEG quality settings, and a sleek Bootstrap UI, it's perfect for keeping a visual log of your desktop activities.

## Features

- **Automatic Capturing:** Takes screenshots at intervals you set (1–60 minutes, in 5-minute steps).
- **Multi-Monitor Support:** Captures all monitors and saves screenshots with unique names.
- **Organized Storage:** Screenshots are automatically saved into daily folders.
- **Active Time Range:** Only takes screenshots during your specified time range.
- **System Aware:** Skips capturing when your computer is asleep, locked, or running a screensaver.
- **Tray Integration:** Easily start/stop the process and open the save folder via the system tray.
- **Dynamic Version Pill:** Displays the current version in a dynamic badge that updates automatically. If a newer update is available, the pill turns yellow to alert the user.
- **Auto-Updating with Prompt:** The app checks for updates automatically and, once an update is downloaded, forces the user to update by showing a popup. When the user clicks "Restart," the update is installed and the app restarts.
- **Screenshot Dimension Setting:** A new dropdown allows you to select the screenshot dimension percentage (100%, 75%, 50%, 25%). When set below 100%, the app uses Sharp to resize screenshots accordingly.
- **JPEG Quality Setting:** A new dropdown lets you choose the JPEG quality (100%, 75%, 50%, 25%) to help reduce file sizes.
- **Cross-Platform:** Runs on Windows, Mac, and Linux. A Linux build is now available for download.

## Releases

To download the latest version of Automatic Screenshot App, please visit the [Releases page](https://github.com/thalesbros/Automatic-Screenshot-App/releases) and select the installer for your platform.

## How to Use

1. **Launch the App:**
   - Open the app from your desktop shortcut or system tray icon.

2. **Set Screenshot Interval:**
   - Enter the interval (in minutes) in the "Take screenshot every X minutes" field. The input supports values from 1 to 60, in 5-minute steps.

3. **Select Save Directory:**
   - Use the **Browse** button to choose where screenshots will be saved (the default is your Documents folder).
   - You can also open the save folder directly via the **Open Save Folder** button.

4. **Specify Active Time Range:**
   - Set the start and end times in the time inputs (reflecting your system’s time format).
   - Screenshots will only be taken if the current time is within this range.

5. **Select Weekdays:**
   - Use the checkboxes to select the days of the week during which screenshots should be captured.
   - The app will only capture screenshots on the selected days.

6. **Screenshot Dimension & JPEG Quality:**
   - Use the dropdowns to select the desired screenshot dimension percentage and JPEG quality.
   - The labels update dynamically to show your current selection.

7. **Start/Stop the App:**
   - Click the **Start** button (green) to begin capturing screenshots.
   - When running, the button changes to **Stop** (red). Click it again to stop the process.

8. **Tray Menu:**
   - Right-click the tray icon to toggle the screenshot process or to quit the app.

9. **Auto-Updating:**
   - The app automatically checks for updates. If a newer version is available, the dynamic version pill turns yellow and a popup prompts you to restart the app to install the update.

## Building and Packaging

To build the app for distribution on all platforms, run:
```
npm i install
npm run dist -- --mac && npm run dist -- --win && npm run dist -- --linux
```

This command uses electron-builder to package your app into platform-specific installers.

## Contributing

Feel free to fork the repository and submit pull requests. If you encounter issues or have feature requests, please open an issue on GitHub.

## License

This project is licensed under the MIT License.

## Contact

For questions or feedback, please contact [Thales Broussard](https://www.thalesbroussard.com/).

*(Screenshots coming soon!)*
