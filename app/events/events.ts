import {Service, ServiceRegistry} from "../services/infrastructure/serviceRegistry";
import {CheckbookService} from "../services/checkbook/CheckbookService";
import { MoneyImportService } from '../services/checkbook/MoneyImportService';
import {ExportFileService} from "../services/file/ExportFileService";
import {PayrollStatementImportService} from "../services/checkbook/PayrollStatementImportService";
const { ipcRenderer } = require('electron')

export enum Event {
  Error,
  SaveCheckbookEntry,
  AllCheckbookEntries,
  ImportMoneyRecord,
  SaveCheckbookAccounts,
  AllCheckbookAccounts,
  ExportToHomeFolder,
  ImportPayrollStatement,
  SavePayrollStatement,
  AllPayrollStatements
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
  [Event.ExportToHomeFolder] : async (registry : ServiceRegistry, _ : Electron.IpcMainEvent, args : any[]) => {
    await registry.get<ExportFileService>(Service.ExportFileService).toHomeFolder(args[0], args[1]);
  },
  [Event.ImportPayrollStatement] : async (registry : ServiceRegistry, _ : Electron.IpcMainEvent, args : any[]) => {
    await registry.get<PayrollStatementImportService>(Service.ImportPayrollStatement).import(args[0]);
  },
  [Event.SavePayrollStatement] : async (registry : ServiceRegistry, _ : Electron.IpcMainEvent, args : any[]) => {
    await registry.get<PayrollStatementImportService>(Service.ImportPayrollStatement).save(args[0]);
  },
  [Event.AllPayrollStatements] : async (registry : ServiceRegistry, _ : Electron.IpcMainEvent) => {
    return await registry.get<PayrollStatementImportService>(Service.ImportPayrollStatement).getImportedStatements();
  },
}
