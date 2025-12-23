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

let tray = null;
let menuWindow = null;

const loadTrayIcon = () => {
  const iconPath = path.join(__dirname, '..', 'assets', 'images', 'menubar-logo.svg');
  if (fs.existsSync(iconPath)) {
    const image = nativeImage.createFromPath(iconPath);
    const { width, height } = image.getSize();
    if (!image.isEmpty() && width >= 8 && height >= 8) {
      const resized = image.resize({ width: 16, height: 16 });
      resized.setTemplateImage(true);
      return resized;
    }

    try {
      const svg = fs.readFileSync(iconPath, 'utf8');
      const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
      const fallbackSvg = nativeImage.createFromDataURL(dataUrl);
      if (!fallbackSvg.isEmpty()) {
        const resized = fallbackSvg.resize({ width: 16, height: 16 });
        resized.setTemplateImage(true);
        return resized;
      }
    } catch (error) {
      console.warn('Failed to load SVG tray icon:', error.message);
    }
  }

  const pngFallback = path.join(__dirname, '..', 'assets', 'images', 'menubar-logo.png');
  if (fs.existsSync(pngFallback)) {
    const image = nativeImage.createFromPath(pngFallback);
    if (!image.isEmpty()) {
      const resized = image.resize({ width: 16, height: 16 });
      resized.setTemplateImage(true);
      return resized;
    }
  }

  const image = nativeImage.createFromDataURL(FALLBACK_ICON);
  image.setTemplateImage(true);
  return image;
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
