const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, shell, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const screenshot = require('screenshot-desktop');
const sharp = require('sharp');
const https = require('https');

let mainWindow;
let tray;
let updateAvailable = false;
let captureInterval = null;
let isCapturing = false;
let currentIntervalMinutes = 10;
let saveDirectory = '';
let allowedStartTime = '';
let allowedEndTime = '';
let allowedDays = [];
let screenshotDimension = 100;
let screenshotQuality = 100;

let systemLocked = false;
powerMonitor.on('lock-screen', () => { systemLocked = true; });
powerMonitor.on('unlock-screen', () => { systemLocked = false; });

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 600,
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
        if (updateAvailable) {
            mainWindow.webContents.send('update-status', { hasUpdate: true });

            dialog.showMessageBox(mainWindow, {
                type: 'info',
                buttons: ['Update', 'Later'],
                defaultId: 0,
                cancelId: 1,
                title: 'Update Available',
                message: 'A new version is available.',
                detail: 'Click "Update" to download it from GitHub.'
            }).then(result => {
                if (result.response === 0) {
                    shell.openExternal('https://github.com/thalesbros/Automatic-Screenshot-App/releases');
                }
            });
        }
    });

    // Disable zoom (pinch and shortcut)
    mainWindow.webContents.setZoomFactor(1);
    mainWindow.webContents.setVisualZoomLevelLimits(1, 1);
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (
            (input.control || input.meta) &&
            ['+', '-', '=', '0'].includes(input.key.toLowerCase())
        ) {
            event.preventDefault();
        }
    });

    // ✅ Keep app running in tray on soft-close (fixed placement)
    mainWindow.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

function createTray() {
    tray = new Tray(path.join(__dirname, 'assets', 'off16.png'));
    setTrayMenu();
    tray.setToolTip('Screenshot App');
    tray.on('click', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
            }
        } else {
            createWindow();
        }
    });
}

function setTrayMenu() {
    const toggleLabel = isCapturing ? 'Stop App' : 'Start App';
    const trayMenuTemplate = [
        {
            label: toggleLabel,
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.webContents.send('menu-toggle');
                }
            }
        }
    ];

    if (updateAvailable) {
        trayMenuTemplate.push({
            label: 'Update App',
            click: () => {
                shell.openExternal('https://github.com/thalesbros/Automatic-Screenshot-App/releases');
            }
        });
    }

    trayMenuTemplate.push(
        { type: 'separator' },
        {
            label: 'Quit App',
            click: () => {
                app.isQuiting = true;
                app.quit();
            }
        }
    );

    const trayMenu = Menu.buildFromTemplate(trayMenuTemplate);
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
    return currentMinutes >= startTotal && currentMinutes <= endTotal;
}

function takeScreenshot() {
    if (!isAllowedDay() || systemLocked || !isWithinAllowedTime()) return;

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
                            .then(metadata => sharp(img).resize({ width: Math.round(metadata.width * (screenshotDimension / 100)) }).toBuffer())
                            .then(resizedImg => fs.writeFile(path.join(dayPath, fileName), resizedImg, err => { if (err) console.error(err); }))
                            .catch(err => console.error("Error resizing image:", err));
                    } else {
                        fs.writeFile(path.join(dayPath, fileName), img, err => { if (err) console.error(err); });
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

ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
});

ipcMain.on('update-settings', (event, settings) => {
    currentIntervalMinutes = settings.interval;
    saveDirectory = settings.directory;
    allowedStartTime = settings.startTime;
    allowedEndTime = settings.endTime;
    allowedDays = settings.days;
    screenshotDimension = parseInt(settings.dimension);
    screenshotQuality = parseInt(settings.quality);

    if (isCapturing) {
        clearInterval(captureInterval);
        takeScreenshot();
        captureInterval = setInterval(takeScreenshot, currentIntervalMinutes * 60 * 1000);
    }
});


app.on('ready', () => {
    createWindow();
    createTray();

    const currentVersion = app.getVersion();
    const options = {
        hostname: 'api.github.com',
        path: '/repos/thalesbros/Automatic-Screenshot-App/releases/latest',
        headers: { 'User-Agent': 'automatic-screenshot-app' }
    };

    https.get(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                const latestVersion = json.tag_name?.replace(/^v/, '');
                if (latestVersion && latestVersion !== currentVersion) {
                    updateAvailable = true;
                    if (mainWindow) {
                        mainWindow.webContents.send('update-status', { hasUpdate: true });

                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            buttons: ['Update', 'Later'],
                            defaultId: 0,
                            cancelId: 1,
                            title: 'Update Available',
                            message: 'A new version is available.',
                            detail: 'Click "Update" to download it from GitHub.'
                        }).then(result => {
                            if (result.response === 0) {
                                shell.openExternal('https://github.com/thalesbros/Automatic-Screenshot-App/releases');
                            }
                        });
                    }
                    setTrayMenu();
                }
            } catch (err) {
                console.error('Failed to parse GitHub release version:', err);
            }
        });
    }).on('error', (err) => {
        console.error('Error checking GitHub releases:', err);
    });
});

app.on('activate', () => {
    if (!mainWindow) {
        createWindow();
    } else {
        mainWindow.show();
        if (updateAvailable) {
            mainWindow.webContents.send('update-status', { hasUpdate: true });
            setTrayMenu();
        }
    }
});
