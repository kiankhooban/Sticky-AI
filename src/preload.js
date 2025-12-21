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
  showAllNotes: () => ipcRenderer.invoke('notes:open-all'),
  quitApp: () => ipcRenderer.invoke('app:quit')
});
