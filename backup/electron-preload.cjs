const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  adjustVolume: (delta) => ipcRenderer.invoke('adjust-volume', delta),
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources')
})