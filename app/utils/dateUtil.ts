import {getTime, format, parse} from 'date-fns'

export function stringToDate(date : string) : Date {
   let parsed = parse(date, 'yyyy-MM-dd', new Date());
   if(parsed.toString() === "Invalid Date") {
     parsed = parse(date, 'MM/dd/yyyy', new Date());
   }
   return parsed;
}

export function formatDate(time : number | string | Date) : string {
  if(typeof time === 'string') {
    time = timestamp(time);
  }
  return format(
    time,
    'MM/dd/yyyy'
  )
}

export function timestamp(date : Date | number | string) {
  if(typeof date === 'string') {
    date = stringToDate(date);
  }
  return getTime(date);
}

export function currentDate() {
  return formatDate(currentTimestamp());
}

export function currentTimestamp() {
  return getTime(Date.now());
}

export function parseDate(value : string) {

  /*
  // 5/5
  if(value.length === 3) {
    const month = parseInt(value[0]);
    const date = parseInt(value[2]);
    const s = spacetime({month, date, year : currentDate().year()});
    return formatDate(s, false);
  }

  // 05/05
  if(value.length === 5 && (value[0] === '0' || value[3] === '0')) {
    const month = `${value[0]}${value[1]}`;
    const day = `${value[3]}${value[4]}`
    const year = currentDate().year();
    return `${month}/${day}/${year}`;
  }

  if(value.length === 4 && value[1] === '/') {
    const month = parseInt(`${value[0]}`);
    const date = parseInt(`${value[2]}${value[3]}`);
    const s = spacetime({month, date, year : currentDate().year()});
    return formatDate(s, false);
  }

  //12/5
  if(value.length === 4) {
    const month = parseInt(`${value[0]}${value[1]}`) + 1;
    const date = parseInt(value[3]);
    const s = spacetime({month, date, year : currentDate().year()});
    return formatDate(s, false);
  }

  //12/12
  if(value.length === 5) {
    const month = parseInt(`${value[0]}${value[1]}`);
    const date = parseInt(`${value[3]}${value[4]}`);
    const s = spacetime({month, date, year : currentDate().year()});
    return `${month == 12 ? s.month() + 1 : s.month()}/${s.date()}/${s.year()}`
  }

   */
  return value;
}
