import {PayrollParseResult} from "../../entities/checkbook/Employee";
import {CheckbookService} from "./CheckbookService";
import {CheckbookEntry, CheckbookEntryStatus} from "../../entities/checkbook/CheckbookEntry";
import {uuid} from "uuidv4";
import {formatDate, stringToDate, timestamp} from "../../utils/dateUtil";

export class PayrollStatementImportService {

  constructor(private readonly checkbook : CheckbookService) {
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
