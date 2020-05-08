import {BankStatementEntry} from "../../../entities/checkbook/BankStatementEntry";
import {CheckbookEntry} from "../../../entities/checkbook/CheckbookEntry";
import {stringToDate, timestamp} from "../../../utils/dateUtil";

export interface StatementMatch {
  entries : CheckbookEntry[],
  statement : BankStatementEntry
  matchType : string
}

export class StatementMatchingService {

  constructor(private readonly statement : BankStatementEntry[], private readonly entries : CheckbookEntry[]) {
    this.entries = this.entries.sort((a, b) => a.timestamp
      - b.timestamp);
  }

  private singleMatches : any = {};
  private matches : StatementMatch[] = [];

  getFilteredEntries = () => {
    return this.entries;
  };

  public match() : StatementMatch[] {

    for (let statementEntry of this.statement) {
      if(statementEntry.type === 'activity') {
        this.onActivity(statementEntry);
      }
    }

    for (let statementEntry of this.statement) {
      if(statementEntry.type === 'check') {
        this.onCheck(statementEntry);
      }
    }

    for (let m of this.matches) {
      if(m.entries.length > 1) {
        //m.entries = m.entries.filter(w => this.singleMatches[w._id] == null);
      }
      m.entries = this.filterByEntry(m);
    }

    console.log(this.matches);

    return this.matches;
  }

  private onActivity(entry : BankStatementEntry) {


    let amountMatches = this.getFilteredEntries().filter(w => this.isAmountInDateRange(w, entry, entry.amount));

    if(amountMatches.length === 1) {
      this.singleMatches[amountMatches[0]._id] = true;
    }

    if(amountMatches.length > 0) {
      amountMatches = this.onMultiMatch(entry, amountMatches);
    }

    if(amountMatches.length === 1) {
      this.singleMatches[amountMatches[0]._id] = true;
    }

    if(amountMatches.length === 0) {
      amountMatches = this.onNoMatch(entry);
    }

    if(amountMatches.length === 1) {
      this.singleMatches[amountMatches[0]._id] = true;
    }

    this.matches.push({statement : entry, entries : amountMatches, matchType : 'activity'});
  }

  /*
    Matched by amount, filter down more by date of 7 days.
   */
  private onMultiMatch(statementEntry : BankStatementEntry, matches : CheckbookEntry[]) : CheckbookEntry[] {
    return matches.filter(w => this.inRange(w, statementEntry, 7));
  }

  private onNoMatch(entry : BankStatementEntry) : CheckbookEntry[] {
    const range20 = entry.amount * 0.20;
    const range15 = entry.amount * 0.15;
    const range10 = entry.amount * 0.10;
    const range5 = entry.amount * 0.05;
    const range40 = entry.amount * 0.40;

    let matches : CheckbookEntry[] = [];

    const min20Filter = this.getFilteredEntries().filter(w => this.inRangeAndAmount(w, entry, entry.amount, range20));
    matches = matches.concat(min20Filter);

    const min15Filter = this.getFilteredEntries().filter(w => this.inRangeAndAmount(w, entry, entry.amount, range15));
    matches = matches.concat(min15Filter);

    const min10Filter = this.getFilteredEntries().filter(w => this.inRangeAndAmount(w, entry, entry.amount, range10));
    matches = matches.concat(min10Filter);

    const min5Filter = this.getFilteredEntries().filter(w => this.inRangeAndAmount(w, entry, entry.amount, range5));
    matches = matches.concat(min5Filter);

    if(matches.length === 0)
    {
      if(entry.amount <= 75) {
        console.log('RANGE 40', range40);
        const min40Filter = this.getFilteredEntries().filter(w => this.inRangeAndAmount(w, entry, entry.amount, range40));
        min40Filter.sort((a, b) => a.credit === 0 ? a.debit - b.debit : a.credit - b.credit);
        return min40Filter;
      }
    }

    const exactAmount = matches.filter(w => this.isAmountInDateRange(w, entry, entry.amount));
    if(exactAmount.length === 1) {
      return exactAmount;
    }

    const dedupe : any = {};
    matches = matches.filter(w => {
      if(dedupe[w._id] != null) {
        return false;
      }
      dedupe[w._id] = true;
      return true;
    })

    const timestamp = new Date(entry.date).getTime();
    const fewest = matches.sort(a => a.timestamp - timestamp);
    return fewest;
  }

  private onCheck(entry : BankStatementEntry) {
    let checkMatches = this.getFilteredEntries().filter(w => {
      if(w.tag != null && entry.description != null && w.tag != '' && entry.description != '') {
        return w.tag === entry.description && (w.debit === entry.amount || w.credit === entry.amount);
      }
      return false;
    });

    if(checkMatches.length > 0) {
      checkMatches = this.onMultiCheckMatch(entry, checkMatches);
    }

    if(checkMatches.length === 0) {
      checkMatches = this.onNoCheckMatch(entry);
    }

    this.matches.push({statement : entry, entries : checkMatches, matchType : 'check'});
  }

  private onMultiCheckMatch(statementEntry : BankStatementEntry, matches : CheckbookEntry[]) : CheckbookEntry[] {
    // do nothing here, we must alert if multi checks match.
    return matches;
  }

  private onNoCheckMatch(statementEntry : BankStatementEntry) : CheckbookEntry[] {
    return this.getFilteredEntries().filter(w => this.isAmountInDateRange(w, statementEntry, statementEntry.amount));
  }

  private inRange = (entry : CheckbookEntry, statement : BankStatementEntry, days : number) => {
    const statementTime = stringToDate(statement.date)
    statementTime.setHours(0);
    statementTime.setMinutes(1);
    statementTime.setSeconds(0);
    statementTime.setMilliseconds(0);
    const statementTimeStamp = timestamp(statementTime)
    const epoch7 = statementTimeStamp - (1000 * 60 * 60 * 24 * days);
    const entryDate = new Date(entry.timestamp);
    entryDate.setMonth(entryDate.getMonth());
    entryDate.setHours(0);
    entryDate.setMinutes(0);
    entryDate.setSeconds(0);
    entryDate.setMilliseconds(0);
    const entryStamp = timestamp(entryDate);
    return entryStamp <= statementTimeStamp && entryStamp >= epoch7;
  };

  private isAmountInDateRange = (entry : CheckbookEntry, statement : BankStatementEntry, amount : number) => {

    if(!this.inRange(entry, statement, 7)) {
      return false;
    }

    return amount > 0 ? entry.credit === amount : entry.debit === amount;
  }

  private inRangeAndAmount = (entry : CheckbookEntry, statementEntry : BankStatementEntry, amount : number, range : number) => {

    if(statementEntry.description && statementEntry.description.toLowerCase().includes("american") && entry.payee && entry.payee.toLowerCase().includes("payroll")) {
      return false;
    }

    if(entry.debit > 0) {
      throw new Error("Debit was > 0, this should not happen.")
    }

    if(statementEntry.amount < 0 && entry.debit === 0) {
      return false;
    }

    if(statementEntry.amount > 0 && entry.credit === 0) {
      return false;
    }

    if(!this.inRange(entry, statementEntry, 7)) {
      return false;
    }

    const max = amount + range;
    const min = amount - range;

    return (entry.debit >= min && entry.debit <= max) || ((entry.credit >= min && entry.credit <= max));
  };

  private filterByEntry = (match : StatementMatch) : CheckbookEntry[] => {
    const desc = match.statement.description.toLowerCase();

    let entries = match.entries;

    if(desc.includes("american express")) {
      entries = entries.filter(w => w.payee.toLowerCase().includes("amex") || w.payee.toLowerCase().includes("cc"))
    }
    if(desc.includes("dopgc")) {
      entries = entries.filter(w => !w.payee.toLowerCase().includes("cc"))
    }

    if(desc.includes("american express")) {
      entries = entries.filter(w => w.credit >= match.statement.amount)
    }

    // DOPGC
    return entries;
  };
}
