document.addEventListener('DOMContentLoaded', () => {
    // DOM element references
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
    const screenshotDimensionSelect = document.getElementById('screenshot-dimension');
    const jpegQualitySelect = document.getElementById('jpeg-quality');
    const screenshotDimensionLabel = document.getElementById('screenshot-dimension-label');
    const jpegQualityLabel = document.getElementById('jpeg-quality-label');

    let isRunning = false;
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    function sendUpdatedSettings() {
        window.electronAPI.send('update-settings', {
            interval: parseInt(intervalInput.value),
            directory: directoryInput.value,
            startTime: startTimeInput.value,
            endTime: endTimeInput.value,
            days: JSON.parse(localStorage.getItem('lastDays')) || [],
            dimension: screenshotDimensionSelect.value,
            quality: jpegQualitySelect.value
        });
    }


    // Helper functions to update labels
    function updateTimeLabel() {
        timeLabel.textContent = 'Active from: ' + startTimeInput.value + '-' + endTimeInput.value;
        localStorage.setItem('lastStartTime', startTimeInput.value);
        localStorage.setItem('lastEndTime', endTimeInput.value);
    }

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

    // Load saved values and initialize controls
    // Interval
    const savedInterval = localStorage.getItem('lastInterval');
    if (savedInterval) {
        intervalInput.value = savedInterval;
    }
    intervalValueSpan.textContent = intervalInput.value;
    intervalInput.addEventListener('input', () => {
        intervalValueSpan.textContent = intervalInput.value;
        localStorage.setItem('lastInterval', intervalInput.value);
    });

    // Directory
    const lastFolder = localStorage.getItem('lastFolder');
    if (lastFolder) {
        directoryInput.value = lastFolder;
    } else {
        window.electronAPI.invoke('get-default-folder').then(defaultDir => {
            if (defaultDir) {
                directoryInput.value = defaultDir;
                localStorage.setItem('lastFolder', defaultDir);
            }
        });
    }

    // Time values
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

    // Days checkboxes
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
    days.forEach(day => {
        const cb = document.getElementById('day' + day);
        if (cb) {
            cb.addEventListener('change', updateDaysLabel);
        }
    });

    // Screenshot Dimension Dropdown
    if (!localStorage.getItem('screenshotDimension')) {
        localStorage.setItem('screenshotDimension', screenshotDimensionSelect.value);
    } else {
        screenshotDimensionSelect.value = localStorage.getItem('screenshotDimension');
    }
    screenshotDimensionLabel.textContent = `${screenshotDimensionSelect.value}%`;
    screenshotDimensionSelect.addEventListener('change', () => {
        localStorage.setItem('screenshotDimension', screenshotDimensionSelect.value);
        screenshotDimensionLabel.textContent = `${screenshotDimensionSelect.value}%`;
    });

    // JPEG Quality Dropdown
    if (!localStorage.getItem('jpegQuality')) {
        localStorage.setItem('jpegQuality', jpegQualitySelect.value);
    } else {
        jpegQualitySelect.value = localStorage.getItem('jpegQuality');
    }
    jpegQualityLabel.textContent = `${jpegQualitySelect.value}%`;
    jpegQualitySelect.addEventListener('change', () => {
        localStorage.setItem('jpegQuality', jpegQualitySelect.value);
        jpegQualityLabel.textContent = `${jpegQualitySelect.value}%`;
    });

    // Browse directory button
    browseButton.addEventListener('click', async () => {
        const dir = await window.electronAPI.invoke('select-directory');
        if (dir) {
            directoryInput.value = dir;
            localStorage.setItem('lastFolder', dir);
        }
    });

    // Open folder button
    openFolderButton.addEventListener('click', () => {
        const directory = directoryInput.value;
        if (directory) {
            window.electronAPI.send('open-save-folder', directory);
        } else {
            alert('No folder selected.');
        }
    });

    // Toggle button for starting/stopping screenshot capture
    toggleButton.addEventListener('click', () => {
        if (!isRunning) {
            const interval = parseInt(intervalInput.value);
            const directory = directoryInput.value;
            const startTime = startTimeInput.value;
            const endTime = endTimeInput.value;
            const daysFromRenderer = JSON.parse(localStorage.getItem('lastDays')) || [];
            const screenshotDimension = screenshotDimensionSelect.value;
            const jpegQuality = jpegQualitySelect.value;
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
            window.electronAPI.send('start-screenshot', interval, directory, startTime, endTime, daysFromRenderer, screenshotDimension, jpegQuality);
            toggleButton.textContent = 'Stop';
            toggleButton.classList.remove('btn-success');
            toggleButton.classList.add('btn-danger');
        } else {
            window.electronAPI.send('stop-screenshot');
            toggleButton.textContent = 'Start';
            toggleButton.classList.remove('btn-danger');
            toggleButton.classList.add('btn-success');
        }
        isRunning = !isRunning;
    });

    // Listen for menu-toggle event from the tray menu
    window.electronAPI.onMenuToggle(() => {
        toggleButton.click();
    });

    // Listen for app version and update status events
    window.electronAPI.onAppVersion((version) => {
        const versionBadge = document.getElementById('app-version');
        console.log("Current App Version:", version);
        versionBadge.textContent = `v${version}`;
    });
    window.electronAPI.onUpdateStatus((status) => {
        const versionBadge = document.getElementById('app-version');
        console.log("Update status received:", status);
        if (status.hasUpdate) {
            versionBadge.classList.remove('bg-primary');
            versionBadge.classList.add('bg-warning');
        } else {
            versionBadge.classList.remove('bg-warning');
            versionBadge.classList.add('bg-primary');
        }
    });
});
