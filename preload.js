const { contextBridge, ipcRenderer } = require('electron');
const { webFrame } = require('electron');

webFrame.setVisualZoomLevelLimits(1, 1);

contextBridge.exposeInMainWorld('electronAPI', {
    onAppVersion: (callback) =>
        ipcRenderer.on('app-version', (_, version) => callback(version)),
    onUpdateStatus: (callback) =>
        ipcRenderer.on('update-status', (_, status) => callback(status)),
    onMenuToggle: (callback) =>
        ipcRenderer.on('menu-toggle', (_, ...args) => callback(...args)),
    invoke: (channel, data) => ipcRenderer.invoke(channel, data),
    send: (channel, ...data) => ipcRenderer.send(channel, ...data),
    openExternal: (url) => ipcRenderer.send('open-external', url)
});
