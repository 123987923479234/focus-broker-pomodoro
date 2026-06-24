const { app, BrowserWindow } = require('electron');
app.disableHardwareAcceleration();
app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 600, height: 400, show: false });
  win.loadURL('data:text/html,<h1>OK</h1>');
  win.once('ready-to-show', () => win.show());
});
app.on('window-all-closed', () => app.quit());
