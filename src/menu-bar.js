const path = require('path');
const fs = require('fs');
const { Menu, Tray, nativeImage } = require('electron');

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

const createMenuBar = ({ onShowNote, onQuit }) => {
  const tray = new Tray(loadTrayIcon());
  tray.setToolTip('Sticky AI');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Note',
      click: () => onShowNote()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => onQuit()
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => onShowNote());

  return tray;
};

module.exports = {
  createMenuBar
};
