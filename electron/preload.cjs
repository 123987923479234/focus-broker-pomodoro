const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
  name: 'Focus Broker',
  platform: process.platform,
});
