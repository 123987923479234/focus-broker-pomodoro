const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
  name: '超豪华版番茄钟',
  platform: process.platform,
});
