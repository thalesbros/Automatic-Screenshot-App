const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, shell, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const screenshot = require('screenshot-desktop');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let tray;
let captureInterval = null;
let isCapturing = false;
let currentIntervalMinutes = 10;
let saveDirectory = '';
let allowedStartTime = '';
let allowedEndTime = '';

let systemLocked = false;
powerMonitor.on('lock-screen', () => { systemLocked = true; });
powerMonitor.on('unlock-screen', () => { systemLocked = false; });

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 500,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            devTools: false
        }
    });
    mainWindow.loadFile('index.html');
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

function isWithinAllowedTime() {
    if (!allowedStartTime || !allowedEndTime) return true; // if not set, allow always
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMinute] = allowedStartTime.split(':').map(Number);
    const [endHour, endMinute] = allowedEndTime.split(':').map(Number);
    const startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute;
    // Assuming allowed period does not cross midnight.
    return currentMinutes >= startTotal && currentMinutes <= endTotal;
}

function takeScreenshot() {
    // Only proceed if system is not locked and current time is within allowed range.
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
            screenshot({ format: 'jpg', quality: 50, screen: display.id })
                .then(img => {
                    const fileName = `${dateFolder}_${timeStr}(${index + 1}).jpeg`;
                    fs.writeFile(path.join(dayPath, fileName), img, err => {
                        if (err) console.error(err);
                    });
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

// Now accepts startTime and endTime (as "HH:MM")
ipcMain.on('start-screenshot', (event, intervalMinutes, directory, startTime, endTime) => {
    currentIntervalMinutes = intervalMinutes;
    saveDirectory = directory;
    allowedStartTime = startTime;
    allowedEndTime = endTime;
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

app.on('ready', () => {
    createWindow();
    createTray();
    // Check for updates and notify the user.
    autoUpdater.checkForUpdatesAndNotify();
});
app.on('window-all-closed', () => { });
app.on('activate', () => { if (!mainWindow) createWindow(); });
