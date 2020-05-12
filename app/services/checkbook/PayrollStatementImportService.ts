import { PayrollParseResult } from '../../entities/checkbook/Employee';
import { CheckbookService } from './CheckbookService';
import { CheckbookEntry, CheckbookEntryStatus } from '../../entities/checkbook/CheckbookEntry';
import { uuid } from 'uuidv4';
import { formatDate, stringToDate, timestamp } from '../../utils/dateUtil';
import { Storage, StorageProvider } from '../../storage/StorageProvider';

export class PayrollStatementImportService {

  constructor(private readonly checkbook : CheckbookService, private readonly storage : StorageProvider) {
  }

  public async getImportedStatements() : Promise<PayrollParseResult[]> {
    const storage = await this.storage.get(Storage.PayrollStatements);
    return storage.getAllData();
  }

  public async save(statement : PayrollParseResult) {
    const storage = await this.storage.get(Storage.PayrollStatements);
    const exists = await this.storage.findOne(storage, {date : statement.date});
    if(exists) {
      await new Promise((res, rej) => {
        storage.update({date : statement.date}, statement, {}, (err, docs) => {
          if(err) {
            return rej(err);
          }
          console.log(docs);
          return res(docs);
        });
      })
    }
    else {
      await this.storage.insert(storage, statement);
    }
  }

  public async import(statement: PayrollParseResult) {
    const entries = statement.employees.map((w, i) => {
      const date = stringToDate(statement.date);
      date.setMilliseconds(i * 10);
      const t = timestamp(date);
      const entry: CheckbookEntry = {
        index: 0,
        _id: uuid(),
        accountId: statement.accountId,
        balance: 0,
        credit: 0,
        date: formatDate(t),
        debit: w.netPay * -1,
        payee: 'Payroll',
        status: CheckbookEntryStatus.None,
        tag: w.checkNumber.toString(),
        timestamp: t,
        isNew: true
      }
      return entry;
    });
    await this.checkbook.overwrite(entries);
  }

}
