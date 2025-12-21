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
  const iconPath = path.join(__dirname, '..', 'assets', 'icons', 'Sticky AI menubar logo.svg');
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

  const pngFallback = path.join(__dirname, '..', 'assets', 'icons', 'Sticky AI menu bar logo.png');
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

const createMenuBar = ({ preloadPath }) => {
  let popoverWindow = null;
  let positioner = null;

  const tray = new Tray(loadTrayIcon());
  tray.setToolTip('Sticky AI');

  const createPopover = () => {
    popoverWindow = new BrowserWindow({
      width: 280,
      height: 400,
      maxHeight: 500,
      frame: false,
      transparent: true,
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      show: false,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });

    popoverWindow.loadFile(path.join(__dirname, 'renderer', 'popover.html'));
    positioner = new Positioner(popoverWindow);

    popoverWindow.on('blur', () => {
      if (popoverWindow && !popoverWindow.isDestroyed()) {
        popoverWindow.hide();
      }
    });

    popoverWindow.on('closed', () => {
      popoverWindow = null;
      positioner = null;
    });

    return popoverWindow;
  };

  const togglePopover = () => {
    if (!popoverWindow || popoverWindow.isDestroyed()) {
      createPopover();
    }

    if (!popoverWindow || !positioner) {
      return;
    }

    if (popoverWindow.isVisible()) {
      popoverWindow.hide();
      return;
    }

    positioner.move('trayCenter', tray.getBounds());
    popoverWindow.show();
    popoverWindow.focus();
  };

  tray.on('click', () => togglePopover());
  tray.on('right-click', () => togglePopover());

  return {
    tray,
    togglePopover
  };
};

module.exports = {
  createMenuBar
};
