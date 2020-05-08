import { BankStatementEntry } from '../../../entities/checkbook/BankStatementEntry';
import {uuid} from "uuidv4";

enum State {
  None,
  FirstDate,
  Description,
  Amount,
  StatementNumber,
  StatementDate,
  IdField,
  IdNumber,
  TraceField,
  TraceNumber,
  PageChange,
  CheckNumber
}

const getIndexMultiple = (array: string[], args: string[]) => {
  const lower = (arg: string) => arg.toString().toLowerCase();
  for (let i = 0; i < array.length; i++) {
    if (lower(args[0]) === lower(array[i]) && lower(args[1]) === lower(array[i + 1]) && lower(args[2]) === lower(array[i + 2])) {
      return i;
    }
  }
  return -1;
};

export const getFloat = (value: string): number | null => {

  if (isDate(value).result) {
    return null;
  }

  const isNegative = value.includes("-");
  value = value.replace(/,/g, '').replace('/*/g', '').replace('/-/g', '').replace(new RegExp('\\$', 'g'), '').trim();
  const parsed = parseFloat(value);
  if(!isNaN(parsed) && isNegative) {
    return parsed > 0 ? parsed * -1 : parsed;
  }
  return parsed;
};

export const isAmount = (val: string): boolean => {
  const float = getFloat(val);
  return float != null && !isNaN(float);
};

export const isDate = (val: string): { result: boolean, slashes: number } => {

  if (!val.includes('/')) {
    return { result: false, slashes: 0 };
  }

  const split = val.split('/');
  // only 1 slash
  if (isNaN(parseInt(split[0]))) {
    return { result: false, slashes: 1 };
  }
  if (split.length === 2) {
    val = `/${new Date().getFullYear()}`;
  }
  return {
    result: new Date(val).toString() !== 'Invalid Date',
    slashes: split.length - 1
  };
};

export class ParseBankStatementService {

  public parse(text: string) : BankStatementEntry[] {

    text = text.replace(/\s\s+/g, ' ')
    let split = text.split(" ");

    const dateIndex = split.findIndex((w : string) => w === "Date");
    const dateString = split[dateIndex + 1];
    const year = new Date(dateString).getFullYear();

    const start = getIndexMultiple(split, ['Date', 'Description', 'Amount']);
    const end = getIndexMultiple(split, ["CHECKS", "IN", "SERIAL"])

    let state = State.None;


    let entry : BankStatementEntry = {
      id: uuid(),
      amount: 0,
      date: '',
      description : '',
      type : 'activity'
    };

    const entries : BankStatementEntry[] = [];

    for(let i = start; i < end; i++) {
      const line = split[i];
      const date = isDate(line);
      const isNotDate = !date.result;

      if((state === State.FirstDate || state === State.Description) &&  isAmount(line) && line.includes('.')) {
        state = State.Amount;
        entry.amount = getFloat(line)!;
      }

      else if(state === State.Amount && isAmount(line)) {
      }

      else if((state === State.FirstDate || state === State.Description) && isNotDate && !entry.amount) {
        state = State.Description;
        entry.description += (' ' + line);
        entry.description = entry.description.trim();
      }

      else if(date.result && date.slashes === 1) {

        if(entry.date && entry.amount) {
          entries.push(entry);
          entry = {
            id: uuid(),
            amount: 0,
            date: '',
            description : '',
            type : 'activity'
          };
        }

        if(entry.date) {
          continue;
        }

        state = State.FirstDate;
        entry.date = `${line}/${year}`;
      }

      else if(date.result && date.slashes === 2) {
        state = State.StatementDate;
      }
    }

    entries.push(entry);

    const checkEnd = getIndexMultiple(split, ["DAILY",
      "BALANCE",
      "INFORMATION"])

    const checkEntries : BankStatementEntry [] = [];

    let checkEntry : BankStatementEntry = {
      id: uuid(),
      amount: 0, date: '', description: '',
      type : 'check'
    }
    state = State.None;

    for(let i = end; i < checkEnd; i++) {
      const line = split[i];
      const date = isDate(line).result && !isAmount(line);

      if(date) {
        if(checkEntry.date) {
          checkEntries.push(checkEntry);
          checkEntry = {
            id: uuid(),
            amount: 0, date: '', description: '',
            type : 'check'
          };
        }
        checkEntry.date = `${line}/${year}`;
      }

      else if(isAmount(line) && line.includes(".")) {
        checkEntry.amount = getFloat(line)! * -1;
      }

      else if(isAmount(line) && !line.includes(".")) {
        checkEntry.description = getFloat(line)!.toString();
      }

    }

    checkEntries.push(checkEntry);

    const all : BankStatementEntry[] = [];

    entries.filter(w => w.amount).forEach(c => {
      all.push(c);
    })

    checkEntries.filter(w => w.amount).forEach(c => {
      all.push(c);
    })

    return all;
  }

}
