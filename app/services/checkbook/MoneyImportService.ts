import { Storage, StorageProvider } from '../../storage/StorageProvider';
import { CheckbookEntry, CheckbookEntryStatus } from '../../entities/checkbook/CheckbookEntry';
import { uuid } from 'uuidv4';
import {formatDate, timestamp} from '../../utils/dateUtil';
import {CheckbookService} from "./CheckbookService";

export class MoneyImportService {

  constructor(private readonly storage: StorageProvider, private readonly checkbook : CheckbookService) {
  }

  public async onRecord(rows: string[][], accountId : string) {
    let entries = [];
    let count = 0;
    for (let row of rows) {
      const entry: CheckbookEntry = {
        status: CheckbookEntryStatus.None,
        _id: uuid(),
        balance: 0,
        credit: 0,
        date: '',
        debit: 0,
        index: 0,
        payee: '',
        tag: '',
        timestamp: 0,
        accountId
      };

      for (let line of row) {
        if (line.startsWith('C')) {
          entry.status = this.Entry(line) == 'X' ? CheckbookEntryStatus.Reconciled : CheckbookEntryStatus.None;
        } else if (line.startsWith('D')) {
          count += 10;
          let data = this.Entry(line);
          let split = data.split("'");
          let split2 = split[0].split('/');
          let month = parseInt(split2[0]);
          let day = parseInt(split2[1]);
          let year = parseInt(split[1]);

          const date = new Date(year, month - 1, day, 6, 0, 0, count)
          entry.timestamp = timestamp(date);
          entry.date = formatDate(date);

        } else if (line.startsWith('T')) {
          let data = this.Entry(line);
          let parsed = parseFloat(data.replace(/,/g, ""));

          if (parsed >= 0) {
            entry.credit = parsed;
          } else {
            entry.debit = parsed;
          }
        } else if (line.startsWith('N')) {
          let data = this.Entry(line);
          entry.tag = data;
        } else if (line.startsWith('P')) {
          let data = this.Entry(line);
          entry.payee = data;
        }
      }

      entries.push(entry);
    }

    const storage = await this.storage.get(Storage.Checkbook);
    await this.storage.insert(storage, entries);
    await this.checkbook.calculateAccountBalance(accountId);

    return true;
  }


  Entry(line: string): string {
    return line.substring(1, line.length);
  }

}
