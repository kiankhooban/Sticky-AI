const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('stickyAPI', {
  loadNote: (noteId) => ipcRenderer.invoke('note:load', { noteId }),
  saveNote: (payload) => ipcRenderer.invoke('note:save', payload),
  createNote: () => ipcRenderer.invoke('note:create'),
  deleteNote: (noteId) => ipcRenderer.invoke('note:delete', { noteId }),
  focusNote: (noteId) => ipcRenderer.invoke('note:focus', { noteId }),
  getAllNotes: () => ipcRenderer.invoke('notes:get-all'),
  getAllTasks: () => ipcRenderer.invoke('tasks:get-all'),
  toggleTask: (payload) => ipcRenderer.invoke('task:toggle', payload),
  showAllNotes: () => ipcRenderer.invoke('notes:show-all'),
  quitApp: () => ipcRenderer.send('app:quit'),
  
  // AI Analysis Methods
  analyzeNote: (noteId) => ipcRenderer.invoke('ai:analyze-note', { noteId }),
  analyzeAllNotes: () => ipcRenderer.invoke('ai:analyze-all'),
  
  // AI Event Listeners
  onTasksUpdated: (callback) => {
    ipcRenderer.on('tasks:updated', (_event, data) => callback(data));
  },
  onTasksRefreshed: (callback) => {
    ipcRenderer.on('tasks:refreshed', () => callback());
  },
  onTasksStreaming: (callback) => {
    ipcRenderer.on('tasks:streaming', (_event, data) => callback(data));
  }
});
