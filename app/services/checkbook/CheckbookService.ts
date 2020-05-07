import {Storage, StorageProvider} from "../../storage/StorageProvider";
import {CheckbookEntry} from "../../entities/checkbook/CheckbookEntry";
import {CheckbookAccount} from "../../entities/checkbook/CheckbookAccount";
import { currentDate, currentTimestamp, formatDate } from '../../utils/dateUtil';
import { getFloatOrZero } from '../../utils/checkbookUtil';

export class CheckbookService {

  constructor(private readonly storage : StorageProvider) {
  }

  public async overwrite(entries : CheckbookEntry[]) {
    const storage = await this.storage.get(Storage.Checkbook);
    const inserts = [];
    const updates = [];
    for (let entry of entries) {
      if(entry.isNew) {
        inserts.push(this.storage.insert(storage, entry));
      }
      else {
        updates.push(this.storage.update(storage, entry));
      }
    }
    await Promise.all(inserts);
    const updateResults = await Promise.all(updates);
    const retry = [];

    for(let i = 0; i < updateResults.length; i++) {
      const updateResult = updateResults[i];
      //Record did not exist, was not updated.
      if(updateResult === 0) {
        retry.push(this.storage.insert(storage, entries[i]))
      }
    }

    await Promise.all(retry);
    await this.calculateAccountBalance(entries[0].accountId)
    return entries.map(w => w._id);
  }

  public async all(accountId : string) : Promise<CheckbookEntry[]> {
    console.log(accountId);
    const storage = await this.storage.get(Storage.Checkbook);
    return new Promise((res, rej) => {
      storage.find({accountId, isDeleted : {$exists : false}}).exec((err, docs) => {
        if(err) {
          return rej(err);
        }
        res(docs);
      })
    })
  }

  public async allAccounts() : Promise<CheckbookAccount[]> {
    const storage = await this.storage.get(Storage.CheckbookAccounts);
    return await this.storage.find<CheckbookAccount>(storage, {isDeleted : false});
  }

  public async saveAccounts(accounts : CheckbookAccount[]) {
    const storage = await this.storage.get(Storage.CheckbookAccounts);
    const inserts = [];
    const updates = [];
    for (let account of accounts) {
      if(account.isNew) {
        inserts.push(this.storage.insert(storage, account));
      }
      else {
        updates.push(this.storage.update(storage, account));
      }
    }
    await Promise.all(inserts);
    await Promise.all(updates);
  }

  public async calculateAccountBalance(id : string) {
    const records = await this.all(id);
    const accounts = await this.storage.get(Storage.CheckbookAccounts);
    let balance = 0;
    records.sort((a, b) => a.timestamp - b.timestamp);
    records.forEach(r => {
      balance += getFloatOrZero(r.credit);
      balance += getFloatOrZero(r.debit)
    });
    const account = await this.storage.findOne<CheckbookAccount>(accounts, {_id : id})
    account.balance = balance;
    account.lastUpdated = formatDate(currentDate());
    account.timestamp = currentTimestamp();
    return await this.storage.update(accounts, account);
  }
}
