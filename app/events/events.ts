import {Service, ServiceRegistry} from "../services/infrastructure/serviceRegistry";
import {CheckbookService} from "../services/checkbook/CheckbookService";
import { MoneyImportService } from '../services/checkbook/MoneyImportService';
const { ipcRenderer } = require('electron')

export enum Event {
  Error,
  SaveCheckbookEntry,
  AllCheckbookEntries,
  ImportMoneyRecord,
  SaveCheckbookAccounts,
  AllCheckbookAccounts
}

export function dispatch(event : Event, ...args : any[]) {
  console.log('Dispatching', Event[event].toString(), args);
  ipcRenderer.send(Event[event].toString(), args)
}

export function registerRendererOnce(event : Event, callback : (e : Electron.IpcRendererEvent, ...args : any[]) => void) {
  ipcRenderer.on(Event[event].toString(), (e, args) => {
    callback(e, args)
    ipcRenderer.off(Event[event].toString(), callback)
  })
}

export function registerRenderer(event : Event, callback : (e : Electron.IpcRendererEvent, ...args : any[]) => void) {
  ipcRenderer.on(Event[event].toString(), callback)
}

export function dispatchToWindow(window : Electron.BrowserWindow, event : Event, ...args : any[]) {
  console.log('Dispatching to window', Event[event].toString(), args);
  const key = Event[event].toString();
  window.webContents.send(key, args);
}

export const EventMap : any = {
  [Event.SaveCheckbookEntry] : async (registry : ServiceRegistry, _ : Electron.IpcMainEvent, args : any[]) => {
    return await registry.get<CheckbookService>(Service.Checkbook).overwrite(args[0]);
  },
  [Event.AllCheckbookEntries] : async (registry : ServiceRegistry, _ : Electron.IpcMainEvent, args : any[]) => {
    return await registry.get<CheckbookService>(Service.Checkbook).all(args[0]);
  },
  [Event.AllCheckbookAccounts] : async (registry : ServiceRegistry, _ : Electron.IpcMainEvent, args : any[]) => {
    return await registry.get<CheckbookService>(Service.Checkbook).allAccounts();
  },
  [Event.ImportMoneyRecord] : async (registry : ServiceRegistry, _ : Electron.IpcMainEvent, args : any[]) => {
    return await registry.get<MoneyImportService>(Service.MoneyImport).onRecord(args[0], args[1]);
  },
  [Event.SaveCheckbookAccounts] : async (registry : ServiceRegistry, _ : Electron.IpcMainEvent, args : any[]) => {
    await registry.get<CheckbookService>(Service.Checkbook).saveAccounts(args[0]);
  },
}
