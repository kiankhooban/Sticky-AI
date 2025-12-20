const path = require('path');
const { app, ipcMain, nativeTheme, globalShortcut } = require('electron');
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
const { createMenuBar } = require('./menu-bar');
const { WindowManager } = require('./window-manager');

const MAX_NOTES = 20;

let windowManager = null;
let menuBar = null;
let isQuitting = false;

if (process.env.ELECTRON_RUN_AS_NODE) {
  console.warn(
    'ELECTRON_RUN_AS_NODE is set; Electron will run as Node. ' +
      'Unset it to launch the app UI.'
  );
}

const refreshTaskState = () => {
  const tasks = getAllTasks();
  if (menuBar) {
    menuBar.updateTaskCount(tasks.length);
    menuBar.sendToDropdown('tasks:sync', { tasks });
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
  refreshTaskState();
  return { ok: true, noteId: note.id };
};

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
    if (result.ok && result.note) {
      windowManager.broadcastToAll('tasks:sync', {
        noteId: result.note.id,
        tasks: result.note.tasks
      });
      refreshTaskState();
    }

    return result;
  });

  ipcMain.handle('note:create', () => {
    return createNewNote();
  });

  ipcMain.handle('note:delete', (_event, payload) => {
    const noteId = payload && payload.noteId;
    if (!noteId) {
      return { ok: false, error: 'Note id required.' };
    }

    windowManager.closeNoteWindow(noteId);
    deleteNote(noteId);
    refreshTaskState();
    return { ok: true };
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

  ipcMain.handle('notes:open-all', () => {
    windowManager.showAllNotes();
    return { ok: true };
  });

  ipcMain.handle('tasks:get-all', () => {
    return { ok: true, tasks: getAllTasks() };
  });

  ipcMain.handle('task:toggle', (_event, payload) => {
    if (!payload || !payload.noteId || payload.taskIndex === undefined) {
      return { ok: false, error: 'Invalid task payload.' };
    }

    const task = toggleTask(payload.noteId, payload.taskIndex, payload.completed);
    if (!task) {
      return { ok: false, error: 'Task not found.' };
    }

    windowManager.broadcastToAll('task:updated', {
      noteId: payload.noteId,
      taskIndex: payload.taskIndex,
      completed: task.completed
    });
    refreshTaskState();

    return { ok: true, task };
  });

  ipcMain.handle('app:quit', () => {
    app.quit();
    return { ok: true };
  });
};

const setupMenuBar = () => {
  menuBar = createMenuBar({
    preloadPath: path.join(__dirname, 'preload.js'),
    onQuit: () => app.quit()
  });
  refreshTaskState();
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

  globalShortcut.register('CommandOrControl+Shift+A', () => {
    if (menuBar) {
      menuBar.toggleDropdown();
    }
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
  if (menuBar) {
    menuBar.closeDropdown();
  }
});

app.on('ready', () => {
  if (app.dock) {
    app.dock.hide();
  }
  nativeTheme.themeSource = 'light';

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
