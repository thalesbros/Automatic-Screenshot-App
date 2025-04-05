const { ipcRenderer } = require('electron');

const intervalInput = document.getElementById('interval');
const directoryInput = document.getElementById('directory');
const browseButton = document.getElementById('browse');
const toggleButton = document.getElementById('toggle');
const openFolderButton = document.getElementById('open-folder');
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');

let isRunning = false;

window.addEventListener('DOMContentLoaded', async () => {
    // Retrieve and set the saved directory
    const lastFolder = localStorage.getItem('lastFolder');
    if (lastFolder) {
        directoryInput.value = lastFolder;
    } else {
        const defaultDir = await ipcRenderer.invoke('get-default-folder');
        if (defaultDir) {
            directoryInput.value = defaultDir;
            localStorage.setItem('lastFolder', defaultDir);
        }
    }
    // Retrieve and set the saved interval, start time, and end time
    const lastInterval = localStorage.getItem('lastInterval');
    if (lastInterval) {
        intervalInput.value = lastInterval;
    }
    const lastStartTime = localStorage.getItem('lastStartTime');
    if (lastStartTime) {
        startTimeInput.value = lastStartTime;
    }
    const lastEndTime = localStorage.getItem('lastEndTime');
    if (lastEndTime) {
        endTimeInput.value = lastEndTime;
    }
});

browseButton.addEventListener('click', async () => {
    const dir = await ipcRenderer.invoke('select-directory');
    if (dir) {
        directoryInput.value = dir;
        localStorage.setItem('lastFolder', dir);
    }
});

openFolderButton.addEventListener('click', () => {
    const directory = directoryInput.value;
    if (directory) {
        ipcRenderer.send('open-save-folder', directory);
    } else {
        alert('No folder selected.');
    }
});

toggleButton.addEventListener('click', () => {
    if (!isRunning) {
        const interval = parseInt(intervalInput.value);
        const directory = directoryInput.value;
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;
        if (!interval || interval < 1) {
            alert('Please enter a valid interval.');
            return;
        }
        if (!directory) {
            alert('Please select a save directory.');
            return;
        }
        if (!startTime || !endTime) {
            alert('Please enter valid start and end times.');
            return;
        }
        // Save all input values for next launch
        localStorage.setItem('lastFolder', directory);
        localStorage.setItem('lastInterval', interval);
        localStorage.setItem('lastStartTime', startTime);
        localStorage.setItem('lastEndTime', endTime);

        ipcRenderer.send('start-screenshot', interval, directory, startTime, endTime);
        toggleButton.textContent = 'Stop';
        toggleButton.classList.remove('btn-success');
        toggleButton.classList.add('btn-danger');
    } else {
        ipcRenderer.send('stop-screenshot');
        toggleButton.textContent = 'Start';
        toggleButton.classList.remove('btn-danger');
        toggleButton.classList.add('btn-success');
    }
    isRunning = !isRunning;
});

ipcRenderer.on('menu-toggle', () => {
    toggleButton.click();
});
