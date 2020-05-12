import Datastore from 'nedb';
import path from 'path';
const os = require('os');

export enum Storage {
  Checkbook,
  CheckbookAccounts,
  PayrollStatements
}

const getFilePath = (storage : Storage) => {
  const home = os.homedir();
  switch (storage) {
    case Storage.CheckbookAccounts:
      return path.join(home, 'konza', 'checkbook_accounts.db');
    case Storage.Checkbook:
      return path.join(home, 'konza', 'checkbook.db');
    case Storage.PayrollStatements:
      return path.join(home, 'konza', 'payroll_statements.db');
  }
}

const checkbook = new Datastore({ filename: getFilePath(Storage.Checkbook), autoload : true });
const checkbookAccounts = new Datastore({ filename: getFilePath(Storage.CheckbookAccounts), autoload : true });
const payrollStatements = new Datastore({ filename: getFilePath(Storage.PayrollStatements), autoload : true });

export class StorageProvider {

  get(storage : Storage) : Promise<Datastore> {
    switch (storage) {
      case Storage.Checkbook:
        return Promise.resolve(checkbook);
      case Storage.CheckbookAccounts:
        return Promise.resolve(checkbookAccounts);
      case Storage.PayrollStatements:
        return Promise.resolve(payrollStatements);
    }
  }

  async findOne<T>(provider : Datastore, filter : any) : Promise<T> {
    return new Promise((res, rej) => {
      provider.findOne<T>(filter, function (err : any, doc) {
        if(err) {
          rej(err);
        }
        return res(doc as T);
      });
    });
  }


  async find<T>(provider : Datastore, filter : any) : Promise<T[]> {
    return new Promise((res, rej) => {
      provider.find<T>(filter, function (err : any, docs) {
        if(err) {
          rej(err);
        }
        return res(docs);
      });
    });
  }

  async remove(provider : Datastore, filter : any = {}, multi : boolean = true) {
    return new Promise((res, rej) => {
      provider.remove(filter, { multi: multi }, function (err : any, numRemoved : number) {
        if(err) {
          rej(err);
        }
        return res(numRemoved);
      });
    });
  }

  async insert(provider : Datastore, doc : any) : Promise<any> {
    return new Promise((res : any, rej) => {
      provider.insert(doc, (err : Error, result : any) => {
        if(err) return rej(err);
        res(result);
      })
    })
  }


  async update(provider : Datastore, doc : any) : Promise<any> {
    return new Promise((res : any, rej) => {
      provider.update({_id : doc._id}, doc, {}, (err : Error, result : any) => {
        if(err) return rej(err);
        res(result);
      })
    })
  }

}
