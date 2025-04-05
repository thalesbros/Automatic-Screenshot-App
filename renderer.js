const { ipcRenderer } = require('electron');

const intervalInput = document.getElementById('interval');
const intervalValueSpan = document.getElementById('intervalValue');
const directoryInput = document.getElementById('directory');
const browseButton = document.getElementById('browse');
const toggleButton = document.getElementById('toggle');
const openFolderButton = document.getElementById('open-folder');
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');
const timeLabel = document.getElementById('timeLabel');
const daysLabel = document.getElementById('daysLabel');

let isRunning = false;
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Update interval label
document.addEventListener('DOMContentLoaded', () => {
    // Load saved interval if exists
    const savedInterval = localStorage.getItem('lastInterval');
    if (savedInterval) {
        intervalInput.value = savedInterval;
    }
    intervalValueSpan.textContent = intervalInput.value;

    intervalInput.addEventListener('input', () => {
        intervalValueSpan.textContent = intervalInput.value;
        localStorage.setItem('lastInterval', intervalInput.value);
    });

    // Load saved directory or default folder
    const lastFolder = localStorage.getItem('lastFolder');
    if (lastFolder) {
        directoryInput.value = lastFolder;
    } else {
        ipcRenderer.invoke('get-default-folder').then(defaultDir => {
            if (defaultDir) {
                directoryInput.value = defaultDir;
                localStorage.setItem('lastFolder', defaultDir);
            }
        });
    }

    // Load saved time values or set defaults to 10:00 and 22:00
    const savedStartTime = localStorage.getItem('lastStartTime');
    const savedEndTime = localStorage.getItem('lastEndTime');
    if (savedStartTime) {
        startTimeInput.value = savedStartTime;
    } else {
        startTimeInput.value = "10:00";
        localStorage.setItem('lastStartTime', "10:00");
    }
    if (savedEndTime) {
        endTimeInput.value = savedEndTime;
    } else {
        endTimeInput.value = "22:00";
        localStorage.setItem('lastEndTime', "22:00");
    }
    updateTimeLabel();

    startTimeInput.addEventListener('input', updateTimeLabel);
    endTimeInput.addEventListener('input', updateTimeLabel);

    // Load saved days or set default (Mon-Fri)
    const savedDays = localStorage.getItem('lastDays');
    if (savedDays) {
        let selected = JSON.parse(savedDays);
        days.forEach(day => {
            const cb = document.getElementById('day' + day);
            if (cb) {
                cb.checked = selected.includes(day);
            }
        });
    } else {
        // Default: Mon-Fri
        ["Mon", "Tue", "Wed", "Thu", "Fri"].forEach(day => {
            const cb = document.getElementById('day' + day);
            if (cb) {
                cb.checked = true;
            }
        });
    }
    updateDaysLabel();

    // Add change listeners to day checkboxes
    days.forEach(day => {
        const cb = document.getElementById('day' + day);
        if (cb) {
            cb.addEventListener('change', updateDaysLabel);
        }
    });
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
        const daysFromRenderer = JSON.parse(localStorage.getItem('lastDays')) || [];
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
        ipcRenderer.send('start-screenshot', interval, directory, startTime, endTime, daysFromRenderer);
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

// Update the time label and save to localStorage
function updateTimeLabel() {
    timeLabel.textContent = 'Active from: ' + startTimeInput.value + '-' + endTimeInput.value;
    localStorage.setItem('lastStartTime', startTimeInput.value);
    localStorage.setItem('lastEndTime', endTimeInput.value);
}

// Update the days label based on selected checkboxes and save to localStorage
function updateDaysLabel() {
    let selected = [];
    days.forEach(day => {
        const cb = document.getElementById('day' + day);
        if (cb && cb.checked) {
            selected.push(day);
        }
    });
    if (selected.length > 0) {
        daysLabel.textContent = 'Takes screenshots: ' + selected.join('-');
    } else {
        daysLabel.textContent = 'Takes screenshots: None selected';
    }
    localStorage.setItem('lastDays', JSON.stringify(selected));
}
