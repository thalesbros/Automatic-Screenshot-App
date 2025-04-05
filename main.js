const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, shell, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const screenshot = require('screenshot-desktop');
const { autoUpdater } = require('electron-updater');
const sharp = require('sharp');

if (!app.isPackaged) {
    require('electron-reload')(__dirname, {
        electron: require(path.join(__dirname, 'node_modules', 'electron'))
    });
}

let mainWindow;
let tray;
let captureInterval = null;
let isCapturing = false;
let currentIntervalMinutes = 10;
let saveDirectory = '';
let allowedStartTime = '';
let allowedEndTime = '';
let allowedDays = [];
// New globals for image settings
let screenshotDimension = 100; // default 100%
let screenshotQuality = 100;   // default 100%

let systemLocked = false;
powerMonitor.on('lock-screen', () => { systemLocked = true; });
powerMonitor.on('unlock-screen', () => { systemLocked = false; });

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 690,
        resizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            devTools: false
        }
    });
    mainWindow.loadFile('index.html');
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('app-version', app.getVersion());
    });
    mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray() {
    tray = new Tray(path.join(__dirname, 'assets', 'off16.png'));
    setTrayMenu();
    tray.setToolTip('Screenshot App');
    tray.on('click', () => {
        if (mainWindow) {
            mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
        } else {
            createWindow();
        }
    });
}

function setTrayMenu() {
    const toggleLabel = isCapturing ? 'Stop App' : 'Start App';
    const trayMenu = Menu.buildFromTemplate([
        {
            label: toggleLabel,
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.webContents.send('menu-toggle');
                }
            }
        },
        { type: 'separator' },
        { label: 'Quit App', click: () => { app.quit(); } }
    ]);
    tray.setContextMenu(trayMenu);
}

function updateTrayIcon() {
    const iconFile = isCapturing ? 'on16.png' : 'off16.png';
    tray.setImage(path.join(__dirname, 'assets', iconFile));
}

function getCurrentDateFolder() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getTimeString() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}-${minutes}`;
}

function isAllowedDay() {
    if (!allowedDays || allowedDays.length === 0) {
        allowedDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    }
    const now = new Date();
    const currentDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()];
    console.log("Allowed days:", allowedDays);
    console.log("Current day:", currentDay);
    return allowedDays.includes(currentDay);
}

function isWithinAllowedTime() {
    if (!allowedStartTime || !allowedEndTime) return true;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMinute] = allowedStartTime.split(':').map(Number);
    const [endHour, endMinute] = allowedEndTime.split(':').map(Number);
    const startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute;
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMins = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHours}:${currentMins}`;
    console.log(`Allowed time: ${allowedStartTime}-${allowedEndTime}`);
    console.log(`Current time: ${currentTime}`);
    return currentMinutes >= startTotal && currentMinutes <= endTotal;
}

function takeScreenshot() {
    if (!isAllowedDay()) {
        console.log("Today is not selected, skipping screenshot.");
        return;
    }
    if (systemLocked) {
        console.log('System is locked or asleep, skipping screenshot.');
        return;
    }
    if (!isWithinAllowedTime()) {
        console.log('Not within allowed time range, skipping screenshot.');
        return;
    }
    const dateFolder = getCurrentDateFolder();
    const dayPath = path.join(saveDirectory, dateFolder);
    if (!fs.existsSync(dayPath)) fs.mkdirSync(dayPath, { recursive: true });
    const timeStr = getTimeString();

    screenshot.listDisplays().then(displays => {
        displays.forEach((display, index) => {
            screenshot({ format: 'jpg', quality: screenshotQuality, screen: display.id })
                .then(img => {
                    const fileName = `${dateFolder}_${timeStr}(${index + 1}).jpeg`;
                    if (screenshotDimension < 100) {
                        sharp(img)
                            .metadata()
                            .then(metadata => {
                                const newWidth = Math.round(metadata.width * (screenshotDimension / 100));
                                return sharp(img).resize({ width: newWidth }).toBuffer();
                            })
                            .then(resizedImg => {
                                fs.writeFile(path.join(dayPath, fileName), resizedImg, err => {
                                    if (err) console.error(err);
                                });
                            })
                            .catch(err => console.error("Error resizing image:", err));
                    } else {
                        fs.writeFile(path.join(dayPath, fileName), img, err => {
                            if (err) console.error(err);
                        });
                    }
                })
                .catch(err => console.error(err));
        });
    }).catch(err => console.error(err));
}

ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('get-default-folder', async () => {
    return app.getPath('documents');
});

ipcMain.on('start-screenshot', (event, intervalMinutes, directory, startTime, endTime, daysFromRenderer, dimensionParam, qualityParam) => {
    currentIntervalMinutes = intervalMinutes;
    saveDirectory = directory;
    allowedStartTime = startTime;
    allowedEndTime = endTime;
    allowedDays = daysFromRenderer;
    screenshotDimension = parseInt(dimensionParam);
    screenshotQuality = parseInt(qualityParam);
    if (!saveDirectory) return;
    if (captureInterval) clearInterval(captureInterval);
    isCapturing = true;
    updateTrayIcon();
    takeScreenshot();
    captureInterval = setInterval(takeScreenshot, currentIntervalMinutes * 60 * 1000);
    setTrayMenu();
});

ipcMain.on('stop-screenshot', () => {
    if (captureInterval) clearInterval(captureInterval);
    captureInterval = null;
    isCapturing = false;
    updateTrayIcon();
    setTrayMenu();
});

ipcMain.on('open-save-folder', (event, directory) => {
    if (directory) {
        shell.openPath(directory);
    } else {
        dialog.showErrorBox('Error', 'No save folder selected');
    }
});

// External link handler
ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
});

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
});
autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info);
    // Force the update download
    autoUpdater.downloadUpdate();
    if (mainWindow) {
        mainWindow.webContents.send('update-status', { hasUpdate: true });
    }
});

autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available:', info);
    if (mainWindow) {
        mainWindow.webContents.send('update-status', { hasUpdate: false });
    }
});
autoUpdater.on('error', (err) => {
    console.error('Error in auto-updater:', err);
});
autoUpdater.on('download-progress', (progressObj) => {
    console.log('Download progress:', progressObj);
});
autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info);
    const dialogOpts = {
        type: 'info',
        buttons: ['Restart', 'Later'],
        title: 'Application Update',
        message: 'A new version has been downloaded.',
        detail: 'Restart the application to apply the updates.'
    };

    dialog.showMessageBox(dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) {
            autoUpdater.quitAndInstall();
        }
    });
});

app.on('ready', () => {
    createWindow();
    createTray();
    autoUpdater.checkForUpdatesAndNotify();
});
app.on('window-all-closed', () => { });
app.on('activate', () => { if (!mainWindow) createWindow(); });
