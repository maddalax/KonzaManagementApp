import Bottle from 'bottlejs';
import {CheckbookService} from "../checkbook/CheckbookService";
import {StorageProvider} from "../../storage/StorageProvider";
import { MoneyImportService } from '../checkbook/MoneyImportService';
import {ExportFileService} from "../file/ExportFileService";
import {PayrollStatementImportService} from "../checkbook/PayrollStatementImportService";

const bottle : Bottle = new Bottle();

export enum Service {
  Checkbook,
  Storage,
  MoneyImport,
  ExportFileService,
  ImportPayrollStatement
}

export class ServiceRegistry {

  public get<T>(service : Service) {
    const key = Service[service].toString();
    return bottle.container[key] as T;
  }

  public register(service : Service, implementation : any, ...dependencies : Service[]) {
    const key = Service[service].toString();
    const names = dependencies.map(w => Service[w].toString());
    bottle.service(key, implementation, ...names);
  }
}

export const registry : ServiceRegistry = new ServiceRegistry();

registry.register(Service.Storage, StorageProvider);
registry.register(Service.Checkbook, CheckbookService, Service.Storage);
registry.register(Service.MoneyImport, MoneyImportService, Service.Storage, Service.Checkbook)
registry.register(Service.ExportFileService, ExportFileService);
registry.register(Service.ImportPayrollStatement, PayrollStatementImportService, Service.Checkbook, Service.Storage)

