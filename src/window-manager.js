const { BrowserWindow } = require('electron');

const debounce = (fn, delay) => {
  let timeoutId = null;
  return (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

class WindowManager {
  /**
   * @param {object} options
   * @param {string} options.preloadPath
   * @param {string} options.indexPath
   * @param {number} options.maxWindows
   * @param {(noteId: string, bounds: object) => void} options.onBoundsChanged
   */
  constructor({ preloadPath, indexPath, maxWindows, onBoundsChanged }) {
    this.preloadPath = preloadPath;
    this.indexPath = indexPath;
    this.maxWindows = maxWindows;
    this.onBoundsChanged = onBoundsChanged;
    this.isQuitting = false;
    this.windows = new Map();
  }

  /**
   * @param {string} noteId
   * @param {object | null} bounds
   * @returns {BrowserWindow | null}
   */
  createNoteWindow(noteId, bounds) {
    if (this.windows.has(noteId)) {
      return this.windows.get(noteId);
    }

    if (this.windows.size >= this.maxWindows) {
      return null;
    }

    const options = {
      width: 320,
      height: 400,
      minWidth: 280,
      minHeight: 300,
      alwaysOnTop: true,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      vibrancy: 'under-window',
      visualEffectState: 'active',
      titleBarStyle: 'hidden',
      webPreferences: {
        preload: this.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    };

    if (bounds) {
      Object.assign(options, bounds);
    }

    const window = new BrowserWindow(options);
    window.loadFile(this.indexPath, { query: { noteId } });

    window.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        window.hide();
      }
    });

    window.on('closed', () => {
      this.windows.delete(noteId);
    });

    const debouncedBounds = debounce(() => {
      if (this.onBoundsChanged) {
        this.onBoundsChanged(noteId, window.getBounds());
      }
    }, 300);

    window.on('move', debouncedBounds);
    window.on('resize', debouncedBounds);

    this.windows.set(noteId, window);
    return window;
  }

  /**
   * @param {string} noteId
   */
  closeNoteWindow(noteId) {
    const window = this.windows.get(noteId);
    if (window && !window.isDestroyed()) {
      window.destroy();
    }
  }

  /**
   * @returns {Map<string, BrowserWindow>}
   */
  getAllNoteWindows() {
    return this.windows;
  }

  /**
   * @param {Array} notes
   */
  restoreAllNotes(notes) {
    notes.forEach((note) => {
      this.createNoteWindow(note.id, note.bounds || null);
    });
  }

  /**
   * @param {string} channel
   * @param {object} payload
   */
  broadcastToAll(channel, payload) {
    this.windows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, payload);
      }
    });
  }

  /**
   * @param {string} noteId
   * @returns {BrowserWindow | undefined}
   */
  getNoteWindow(noteId) {
    return this.windows.get(noteId);
  }

  /**
   * @param {string} noteId
   */
  focusNoteWindow(noteId) {
    const window = this.windows.get(noteId);
    if (window && !window.isDestroyed()) {
      window.show();
      window.focus();
    }
  }

  showAllNotes() {
    this.windows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.show();
      }
    });
  }

  setQuitting(isQuitting) {
    this.isQuitting = isQuitting;
  }

  destroyAll() {
    this.windows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.destroy();
      }
    });
    this.windows.clear();
  }
}

module.exports = {
  WindowManager
};
