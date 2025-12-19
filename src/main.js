const path = require('path');
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const {
  DEFAULT_NOTE_ID,
  getOrCreateDefaultNote,
  getNoteById,
  upsertNote
} = require('./store');
const { createMenuBar } = require('./menu-bar');

let mainWindow = null;
let tray = null;
let isQuitting = false;

if (process.env.ELECTRON_RUN_AS_NODE) {
  console.warn(
    'ELECTRON_RUN_AS_NODE is set; Electron will run as Node. ' +
      'Unset it to launch the app UI.'
  );
}

const createMainWindow = () => {
  const note = getOrCreateDefaultNote();
  const bounds = note.bounds || { width: 320, height: 260 };

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 250,
    minHeight: 200,
    alwaysOnTop: true,
    frame: false,
    title: 'Sticky AI',
    backgroundColor: '#fff9c4',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('move', () => saveWindowBounds());
  mainWindow.on('resize', () => saveWindowBounds());

  return mainWindow;
};

const saveWindowBounds = () => {
  if (!mainWindow) {
    return;
  }

  const bounds = mainWindow.getBounds();
  const note = getNoteById(DEFAULT_NOTE_ID);

  if (!note) {
    return;
  }

  upsertNote({
    ...note,
    bounds,
    updatedAt: Date.now()
  });
};

const setupIpc = () => {
  ipcMain.handle('note:load', () => {
    const note = getOrCreateDefaultNote();
    return {
      noteId: note.id,
      content: note.content,
      tasks: note.tasks
    };
  });

  ipcMain.handle('note:save', (_event, payload) => {
    if (!payload || payload.noteId !== DEFAULT_NOTE_ID) {
      return { ok: false, error: 'Invalid note payload.' };
    }

    const note = getNoteById(payload.noteId);
    if (!note) {
      return { ok: false, error: 'Note not found.' };
    }

    const content = typeof payload.content === 'string' ? payload.content : note.content;
    const tasks = Array.isArray(payload.tasks) ? payload.tasks : note.tasks;

    upsertNote({
      ...note,
      content,
      tasks,
      bounds: payload.bounds || note.bounds,
      updatedAt: Date.now()
    });

    return { ok: true };
  });

  ipcMain.handle('note:create', () => {
    return { ok: false, error: 'Multiple notes are not available in Phase 1.' };
  });
};

const setupMenuBar = () => {
  tray = createMenuBar({
    onShowNote: () => {
      if (!mainWindow) {
        createMainWindow();
      }

      mainWindow.show();
      mainWindow.focus();
    },
    onQuit: () => app.quit()
  });
};

const setupDevReload = () => {
  if (!app.isPackaged) {
    try {
      require('electron-reload')(__dirname, {
        electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron')
      });
    } catch (error) {
      console.warn('Hot reload disabled:', error.message);
    }
  }
};

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('ready', () => {
  if (app.dock) {
    app.dock.hide();
  }
  nativeTheme.themeSource = 'light';
  setupDevReload();
  setupIpc();
  createMainWindow();
  setupMenuBar();
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});
