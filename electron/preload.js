const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openReservationWindow: () => ipcRenderer.send('open-reservation-window'),
});