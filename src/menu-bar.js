const path = require('path');
const fs = require('fs');
const { BrowserWindow, Tray, nativeImage } = require('electron');
const Positioner = require('electron-positioner');

let tray = null;
let menuWindow = null;

const loadTrayIcon = () => {
  // Load custom menu bar icon with retina support
  const iconPath = path.join(__dirname, '..', 'assets', 'images', 'MenubarLogo.png');
  
  if (fs.existsSync(iconPath)) {
    try {
      const icon = nativeImage.createFromPath(iconPath);
      if (!icon.isEmpty()) {
        icon.setTemplateImage(true);
        console.log('[Menu Bar] Loaded custom icon from:', iconPath);
        return icon;
      }
    } catch (error) {
      console.log('[Menu Bar] Failed to load icon file:', error.message);
    }
  } else {
    console.log('[Menu Bar] Icon file not found at:', iconPath);
  }
  
  // Fallback: Create a simple but visible icon
  console.log('[Menu Bar] Using fallback system icon');
  const icon = nativeImage.createFromNamedImage('NSActionTemplate', [22, 22]);
  return icon;
};

const createMenuWindow = (preloadPath) => {
  menuWindow = new BrowserWindow({
    width: 256,
    height: 600,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  menuWindow.loadFile(path.join(__dirname, 'renderer', 'menubar.html'));

  menuWindow.on('blur', () => {
    if (menuWindow && !menuWindow.isDestroyed()) {
      menuWindow.hide();
    }
  });

  return menuWindow;
};

const positionMenuWindow = (trayBounds) => {
  if (!menuWindow || menuWindow.isDestroyed()) {
    return;
  }

  const positioner = new Positioner(menuWindow);
  positioner.move('trayCenter', trayBounds);

  const [x, y] = menuWindow.getPosition();
  menuWindow.setPosition(x, y + 4);
};

const toggleMenu = (preloadPath) => {
  if (!menuWindow || menuWindow.isDestroyed()) {
    menuWindow = createMenuWindow(preloadPath);
  }

  if (menuWindow.isVisible()) {
    menuWindow.hide();
  } else {
    positionMenuWindow(tray.getBounds());
    menuWindow.show();
    menuWindow.focus();
    menuWindow.webContents.reloadIgnoringCache();
  }
};

const createMenuBar = ({ preloadPath }) => {
  if (menuWindow && !menuWindow.isDestroyed()) {
    menuWindow.destroy();
    menuWindow = null;
  }

  if (tray && !tray.isDestroyed()) {
    tray.destroy();
    tray = null;
  }

  tray = new Tray(loadTrayIcon());
  tray.setToolTip('Sticky AI');

  tray.on('click', () => toggleMenu(preloadPath));
  tray.on('right-click', () => toggleMenu(preloadPath));

  menuWindow = createMenuWindow(preloadPath);

  return {
    tray,
    toggleMenu: () => toggleMenu(preloadPath)
  };
};

const updateMenuBar = () => {
  if (menuWindow && !menuWindow.isDestroyed() && menuWindow.isVisible()) {
    menuWindow.webContents.reloadIgnoringCache();
  }
};

module.exports = {
  createMenuBar,
  updateMenuBar
};
