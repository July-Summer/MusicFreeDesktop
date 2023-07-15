import { localPluginName } from "@/common/constant";
import { BrowserWindow, app } from "electron";
import { getResPath } from "../util";
import { getAppConfigPath } from "@/common/app-config/main";
import injectGlobalData from "./common/inject-global-data";

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

/** 主窗口创建 */
let mainWindow: BrowserWindow | null = null;

export const createMainWindow = (): BrowserWindow => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 700,
    width: 1050,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: true,
      webSecurity: false,
      sandbox: false,
    },
    resizable: false,
    frame: false,
    icon: getResPath("logo.ico"),
  });

  // and load the index.html of the app.
  const initUrl = new URL(MAIN_WINDOW_WEBPACK_ENTRY);
  initUrl.hash = `/main/musicsheet/${localPluginName}/favorite`;
  mainWindow.loadURL(initUrl.toString());

  if (!app.isPackaged) {
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    (details, callback) => {
      /** hack headers */
      try {
        const url = new URL(details.url);
        const setHeadersOptions = url.searchParams.get("_setHeaders");
        if (!setHeadersOptions) {
          throw new Error("No Need To Hack");
        }
        const originalRequestHeaders = details.requestHeaders ?? {};
        let requestHeaders: Record<string, string> = {};
        if (setHeadersOptions) {
          const decodedHeaders = JSON.parse(
            decodeURIComponent(setHeadersOptions)
          );
          for (const k in originalRequestHeaders) {
            requestHeaders[k.toLowerCase()] = originalRequestHeaders[k];
          }
          for (const k in decodedHeaders) {
            requestHeaders[k.toLowerCase()] = decodedHeaders[k];
          }
        } else {
          requestHeaders = details.requestHeaders;
        }
        callback({
          requestHeaders,
        });
      } catch {
        console.log(details.url, details.requestHeaders, "!!!HIHI");

        callback({
          requestHeaders: details.requestHeaders,
        });
      }
    }
  );

  mainWindow.webContents.session.on("will-download", async (evt, item) => {
    const downloadPath =
      (await getAppConfigPath("download.path")) ?? app.getPath("downloads");
    // item.setSavePath(path.resolve(downloadPath, 'test.mp3'));
    // console.log(path.resolve(downloadPath, 'test.mp3'));
    console.log(item.getFilename());
    console.log(item.getURL(), "DOWNLOAD");
    item.on("done", () => {
      console.log("done!!!!!!");
    });

    console.log(item.getTotalBytes());
    item.on("updated", (...args) => {
      console.log("updated!!!", ...args);
    });
  });

  mainWindow.webContents.on("did-finish-load", () => {
    injectGlobalData(mainWindow);
  });

  return mainWindow;
};

export const getMainWindow = () => mainWindow;

export function showMainWindow() {
  if (!mainWindow) {
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  } else if (mainWindow.isVisible()) {
    mainWindow.focus();
  } else {
    mainWindow.show();
  }
  mainWindow.setSkipTaskbar(false);
}

