require('dotenv').config();

const path = require('path');
const { app, dialog, ipcMain, nativeTheme, globalShortcut, BrowserWindow } = require('electron');
const {
  createNote,
  deleteNote,
  getAllNotes,
  getAllTasks,
  getNoteById,
  saveNoteContent,
  toggleTask,
  updateNote
} = require('./store');
const { createMenuBar, updateMenuBar } = require('./menu-bar');
const { WindowManager } = require('./window-manager');
const { analyzeNote, analyzeAllNotes } = require('./ai/analyzer');

const MAX_NOTES = 20;

let windowManager = null;
let menuBar = null;
let isQuitting = false;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (windowManager) {
    windowManager.showAllNotes();
  }
});

if (process.env.ELECTRON_RUN_AS_NODE) {
  console.warn(
    'ELECTRON_RUN_AS_NODE is set; Electron will run as Node. ' +
      'Unset it to launch the app UI.'
  );
}

const createNoteWindowSafe = (noteId, bounds) => {
  try {
    const window = windowManager.createNoteWindow(noteId, bounds);
    if (!window) {
      return { ok: false, error: 'Maximum number of notes reached.' };
    }
    return { ok: true, window };
  } catch (error) {
    console.error('Failed to create note window:', error);
    return { ok: false, error: 'Unable to create note window.' };
  }
};

const createNewNote = () => {
  if (windowManager.getAllNoteWindows().size >= MAX_NOTES) {
    return { ok: false, error: 'Maximum number of notes reached.' };
  }

  const note = createNote();
  const result = createNoteWindowSafe(note.id, note.bounds);
  if (!result.ok) {
    return result;
  }

  result.window.show();
  result.window.focus();
  updateMenuBar();
  return { ok: true, noteId: note.id };
};

const handleDeleteNote = async (noteId, parentWindow) => {
  const allNotes = getAllNotes();
  if (allNotes.length <= 1) {
    await dialog.showMessageBox(parentWindow, {
      type: 'info',
      buttons: ['OK'],
      defaultId: 0,
      title: 'Delete Note',
      message: 'You must keep at least one note.'
    });
    return { ok: false, error: 'Cannot delete the last note' };
  }

  const result = await dialog.showMessageBox(parentWindow, {
    type: 'warning',
    buttons: ['Delete', 'Cancel'],
    defaultId: 1,
    title: 'Delete Note',
    message: 'Are you sure you want to delete this note?',
    detail: 'This action cannot be undone.'
  });

  if (result.response !== 0) {
    return { ok: false, error: 'Delete canceled' };
  }

  try {
    deleteNote(noteId);
    const window = windowManager.getNoteWindow(noteId);
    if (window) {
      window.destroy();
    }
    updateMenuBar();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
};

const setupIpc = () => {
  ipcMain.handle('note:load', (_event, payload) => {
    const noteId = payload && payload.noteId;
    if (!noteId) {
      return { ok: false, error: 'Note id required.' };
    }

    const note = getNoteById(noteId);
    if (!note) {
      return { ok: false, error: 'Note not found.' };
    }

    return { ok: true, noteId: note.id, content: note.content, tasks: note.tasks };
  });

  ipcMain.handle('note:save', (_event, payload) => {
    if (!payload || !payload.noteId) {
      return { ok: false, error: 'Invalid note payload.' };
    }

    const result = saveNoteContent(payload.noteId, payload.content, payload.bounds);
    if (result.ok) {
      updateMenuBar();
    }

    return result;
  });

  ipcMain.handle('note:create', () => {
    return createNewNote();
  });

  ipcMain.handle('note:delete', async (_event, payload) => {
    const noteId = payload && payload.noteId;
    if (!noteId) {
      return { ok: false, error: 'Note id required.' };
    }

    const window = windowManager.getNoteWindow(noteId);
    return handleDeleteNote(noteId, window);
  });

  ipcMain.handle('note:focus', (_event, payload) => {
    const noteId = payload && payload.noteId;
    if (!noteId) {
      return { ok: false, error: 'Note id required.' };
    }

    windowManager.focusNoteWindow(noteId);
    return { ok: true };
  });

  ipcMain.handle('notes:get-all', () => {
    return { ok: true, notes: getAllNotes() };
  });

  ipcMain.handle('notes:show-all', async () => {
    try {
      const allNotes = getAllNotes();
      allNotes.forEach((note) => {
        let window = windowManager.getNoteWindow(note.id);
        if (!window || window.isDestroyed()) {
          window = windowManager.createNoteWindow(note.id, note.bounds || null);
        }
        if (window) {
          window.show();
          window.focus();
        }
      });
      return { ok: true };
    } catch (error) {
      console.error('Failed to show all notes:', error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.on('app:quit', () => {
    app.quit();
  });

  ipcMain.handle('tasks:get-all', () => {
    try {
      return { ok: true, tasks: getAllTasks() };
    } catch (error) {
      console.error('Failed to get all tasks:', error);
      return { ok: false, error: 'Unable to fetch tasks.' };
    }
  });

  ipcMain.handle('task:toggle', (_event, payload) => {
    if (!payload || !payload.noteId || payload.taskIndex === undefined) {
      return { ok: false, error: 'Invalid task payload.' };
    }

    try {
      const task = toggleTask(payload.noteId, payload.taskIndex, payload.completed);
      windowManager.broadcastToAll('task:updated', {
        noteId: payload.noteId,
        taskIndex: payload.taskIndex,
        completed: task.completed
      });
      updateMenuBar();
      return { ok: true, task };
    } catch (error) {
      console.error('Failed to toggle task:', error);
      return { ok: false, error: error.message };
    }
  });

  // AI Analysis IPC Handlers with streaming support
  ipcMain.handle('ai:analyze-note', async (_event, payload) => {
    if (!payload || !payload.noteId) {
      return { ok: false, error: 'Note ID required.' };
    }

    try {
      const result = await analyzeNote(payload.noteId, (noteId, partialTasks) => {
        // Send streaming updates as tasks are detected
        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('tasks:streaming', { 
            noteId, 
            tasks: partialTasks,
            partial: true 
          });
        });
      });
      
      // Send final update
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('tasks:updated', { noteId: payload.noteId });
      });
      return result;
    } catch (error) {
      console.error('AI analysis failed:', error);
      return { ok: false, error: error.message || 'AI analysis failed' };
    }
  });

  ipcMain.handle('ai:analyze-all', async () => {
    try {
      const results = await analyzeAllNotes();
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('tasks:refreshed');
      });
      return { ok: true, results };
    } catch (error) {
      console.error('AI batch analysis failed:', error);
      return { ok: false, error: error.message || 'AI batch analysis failed' };
    }
  });
};

const setupMenuBar = () => {
  menuBar = createMenuBar({
    preloadPath: path.join(__dirname, 'preload.js')
  });
};

const setupDevReload = () => {
  if (!app.isPackaged) {
    try {
      const electronPath = require('electron');
      require('electron-reload')(__dirname, {
        electron: electronPath
      });
    } catch (error) {
      console.warn('Hot reload disabled:', error.message);
    }
  }
};

const setupShortcuts = () => {
  globalShortcut.register('CommandOrControl+N', () => {
    createNewNote();
  });
};

const restoreNotes = () => {
  const notes = getAllNotes();
  if (notes.length === 0) {
    const note = createNote();
    createNoteWindowSafe(note.id, note.bounds);
  } else {
    windowManager.restoreAllNotes(notes.slice(0, MAX_NOTES));
  }
};

app.on('before-quit', () => {
  isQuitting = true;
  if (windowManager) {
    windowManager.setQuitting(true);
    windowManager.destroyAll();
  }
});

app.on('ready', () => {
  if (app.dock) {
    app.dock.hide();
  }
  nativeTheme.themeSource = 'dark';

  windowManager = new WindowManager({
    preloadPath: path.join(__dirname, 'preload.js'),
    indexPath: path.join(__dirname, 'renderer', 'index.html'),
    maxWindows: MAX_NOTES,
    onBoundsChanged: (noteId, bounds) => {
      updateNote(noteId, { bounds });
    }
  });

  setupDevReload();
  setupIpc();
  restoreNotes();
  setupMenuBar();
  setupShortcuts();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', (event) => {
  if (!isQuitting) {
    event.preventDefault();
  }
});
