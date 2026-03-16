import { app, BrowserWindow, dialog, protocol } from 'electron';
import path from 'node:path';
import * as fs from 'fs';
import started from 'electron-squirrel-startup';
import { initializeDatabase, closeDatabase, getDatabase } from './database/connection';
import { registerIpcHandlers } from './database/ipc-handlers';
import { getAttachmentPath } from './database/attachments';

const isDev = !app.isPackaged;

if (started && app.isPackaged) {
  app.quit();
}

function registerAttachmentProtocol(): void {
  protocol.registerFileProtocol('noteapp', (request, callback) => {
    try {
      const attachmentId = request.url.replace('noteapp://attachment/', '');
      const db = getDatabase();
      const filePath = getAttachmentPath(db, attachmentId);

      if (!filePath || !fs.existsSync(filePath)) {
        callback({ error: -6 });
        return;
      }

      callback({ path: filePath });
    } catch (error) {
      console.error('Protocol handler error:', error);
      callback({ error: -2 });
    }
  });
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    center: true,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key === '=') {
      mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 1);
      event.preventDefault();
    }
  });

  mainWindow.webContents.on('zoom-changed', (_event, zoomDirection) => {
    const currentZoom = mainWindow.webContents.getZoomLevel();
    if (zoomDirection === 'in') {
      mainWindow.webContents.setZoomLevel(currentZoom + 1);
    } else if (zoomDirection === 'out') {
      mainWindow.webContents.setZoomLevel(currentZoom - 1);
    }
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('Failed to load renderer:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process exited unexpectedly:', details.reason);
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL).catch((error) => {
      console.error('Failed to load URL:', error);
    });
  } else {
    const indexPath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
    mainWindow.loadFile(indexPath).catch((error) => {
      console.error('Failed to load file:', error);
    });
  }

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(() => {
  try {
    initializeDatabase();
    registerAttachmentProtocol();
    registerIpcHandlers();
    createWindow();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    dialog.showErrorBox(
      'Initialization Error',
      `Failed to start app: ${error instanceof Error ? error.message : String(error)}`
    );
    app.quit();
  }
});

app.on('before-quit', () => {
  closeDatabase();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
