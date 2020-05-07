export interface CheckbookAccount {
  _id : string,
  name : string,
  balance : number,
  created : string,
  timestamp : number,
  lastUpdated : string
  isNew? : boolean
  isDeleted : boolean
}
