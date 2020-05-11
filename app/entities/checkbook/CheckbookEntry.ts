export interface CheckbookEntry {
  _id : string;
  tag : string;
  date : string;
  payee : string;
  status : CheckbookEntryStatus
  credit : number;
  debit : number;
  balance : number;
  timestamp : number;
  isNew? : boolean
  isDeleted? : boolean
  index : number,
  accountId : string,
  memo? : string
}

export enum CheckbookEntryStatus {
  None,
  Reconciled
}
