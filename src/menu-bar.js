const path = require('path');
const fs = require('fs');
const { BrowserWindow, Tray, nativeImage } = require('electron');
const Positioner = require('electron-positioner');

const FALLBACK_ICON =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">' +
      '<rect width="16" height="16" fill="#111" rx="3" />' +
    '</svg>'
  );

const loadTrayIcon = () => {
  const iconPath = path.join(__dirname, '..', 'assets', 'icons', 'menubar-icon.png');
  if (fs.existsSync(iconPath)) {
    const image = nativeImage.createFromPath(iconPath);
    const { width, height } = image.getSize();
    if (width >= 8 && height >= 8) {
      image.setTemplateImage(true);
      return image;
    }
  }

  const image = nativeImage.createFromDataURL(FALLBACK_ICON);
  image.setTemplateImage(true);
  return image;
};

const createMenuBar = ({ preloadPath, onQuit }) => {
  if (typeof onQuit !== 'function') {
    throw new Error('createMenuBar: onQuit must be a function');
  }

  let dropdownWindow = null;
  let positioner = null;

  const tray = new Tray(loadTrayIcon());
  tray.setToolTip('Sticky AI');

  const createDropdownWindow = () => {
    dropdownWindow = new BrowserWindow({
      width: 320,
      height: 500,
      resizable: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      alwaysOnTop: true,
      skipTaskbar: true,
      vibrancy: 'popover',
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });

    dropdownWindow.loadFile(path.join(__dirname, 'renderer', 'dropdown.html'));
    positioner = new Positioner(dropdownWindow);

    dropdownWindow.on('blur', () => {
      if (dropdownWindow && dropdownWindow.isVisible()) {
        dropdownWindow.hide();
      }
    });

    dropdownWindow.on('closed', () => {
      dropdownWindow = null;
      positioner = null;
    });
  };

  const positionDropdown = () => {
    if (!dropdownWindow || !positioner) {
      return;
    }

    positioner.move('trayBottomCenter', tray.getBounds(), { x: 0, y: 8 });
  };

  const toggleDropdown = () => {
    if (!dropdownWindow) {
      createDropdownWindow();
    }

    if (!dropdownWindow) {
      return;
    }

    if (dropdownWindow.isVisible()) {
      dropdownWindow.hide();
    } else {
      positionDropdown();
      dropdownWindow.show();
      dropdownWindow.focus();
    }
  };

  const updateTaskCount = (count) => {
    if (process.platform === 'darwin') {
      tray.setTitle(count > 0 ? `${count}` : '');
    }
  };

  const sendToDropdown = (channel, payload) => {
    if (dropdownWindow && !dropdownWindow.isDestroyed()) {
      dropdownWindow.webContents.send(channel, payload);
    }
  };

  tray.on('click', () => toggleDropdown());
  tray.on('right-click', () => toggleDropdown());

  return {
    tray,
    toggleDropdown,
    updateTaskCount,
    sendToDropdown,
    closeDropdown: () => {
      if (dropdownWindow && !dropdownWindow.isDestroyed()) {
        dropdownWindow.close();
      }
    },
    onQuit
  };
};

module.exports = {
  createMenuBar
};
