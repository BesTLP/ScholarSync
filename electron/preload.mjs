import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('scholarSyncDesktop', {
  storage: {
    get: (key) => ipcRenderer.sendSync('storage:get', key),
    getAll: () => ipcRenderer.sendSync('storage:getAll'),
    set: (key, value) => ipcRenderer.invoke('storage:set', key, value),
    remove: (key) => ipcRenderer.invoke('storage:remove', key),
  },
  config: {
    get: () => ipcRenderer.sendSync('config:get'),
    update: (patch) => ipcRenderer.invoke('config:update', patch),
  },
  paths: {
    get: () => ipcRenderer.sendSync('paths:get'),
  },
  shell: {
    openPath: (targetPath) => ipcRenderer.invoke('shell:openPath', targetPath),
  },
});
