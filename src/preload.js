const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('stickyAPI', {
  loadNote: () => ipcRenderer.invoke('note:load'),
  saveNote: (payload) => ipcRenderer.invoke('note:save', payload),
  createNote: () => ipcRenderer.invoke('note:create')
});
