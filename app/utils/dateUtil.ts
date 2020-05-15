import {getTime, format, parse} from 'date-fns'

export function stringToDate(date: string): Date {
  let parsed = parse(date, 'yyyy-MM-dd', new Date());
  if (parsed.toString() === "Invalid Date") {
    parsed = parse(date, 'MM/dd/yyyy', new Date());
  }
  return parsed;
}

export function formatDate(time: number | string | Date): string {
  if (typeof time === 'string') {
    time = timestamp(time);
  }
  return format(
    time,
    'MM/dd/yyyy'
  )
}

export function timestamp(date: Date | number | string) {
  if (typeof date === 'string') {
    date = stringToDate(date);
  }
  return getTime(date);
}

export function currentDate() {
  return formatDate(currentTimestamp());
}

export function currentTimestamp() {
  const stamp = Date.now();
  console.trace('STAMP', stamp)
  return stamp;
}

export function parseDate(value: string) {
  try {

    if(!value.includes("/")) {
      return parseDateNoSlashes(value);
    }

    // 5/5
    const year = new Date().getFullYear();

    if (value.length === 3) {
      const month = parseInt(value[0]);
      const date = parseInt(value[2]);
      const parsed = stringToDate(`${year}-${month}-${date}`)
      return formatDate(parsed);
    }

    // 05/05
    if (value.length === 5 && (value[0] === '0' || value[3] === '0')) {
      const month = `${value[0]}${value[1]}`;
      const day = `${value[3]}${value[4]}`
      return `${month}/${day}/${year}`;
    }


    if (value.length === 4 && value[1] === '/') {
      const month = parseInt(`${value[0]}`);
      const date = parseInt(`${value[2]}${value[3]}`);
      const parsed = stringToDate(`${year}-${month}-${date}`)
      return formatDate(parsed);
    }

//12/5
    if (value.length === 4) {
      const month = parseInt(`${value[0]}${value[1]}`);
      const date = parseInt(value[3]);
      const parsed = stringToDate(`${year}-${month}-${date}`)
      return formatDate(parsed);
    }

//12/12
    if (value.length === 5) {
      const month = parseInt(`${value[0]}${value[1]}`);
      const date = parseInt(`${value[3]}${value[4]}`);
      const parsed = stringToDate(`${year}-${month}-${date}`)
      return formatDate(parsed);
    }

  } catch (e) {
    console.error(e);
  }

  return value;
}

export function parseDateNoSlashes(value : string) {
  const year = new Date().getFullYear();

  // 22
  if(value.length === 2) {
    const month = value[0];
    const date = value[1];
    const parsed = stringToDate(`${year}-${month}-${date}`)
    return formatDate(parsed);
  }

  // 312
  // 330
  // 103
  if(value.length === 3) {
    let monthLength = 1;
    if(parseInt(value[1]) === 0) {
      monthLength = 2;
    }
    else if(parseInt(value[0] + value[1]) <= 12) {
      monthLength = 2;
    }
    let month = monthLength === 1 ? value[0] : value[0] + value[1];
    let date = monthLength === 1 ? value[1] + value[2] : value[2];
    const parsed = stringToDate(`${year}-${month}-${date}`)
    return formatDate(parsed);
  }

  // 1203
  if(value.length === 4) {
    let month = value[0] + value[1];
    let date = value[2] + value[3]
    const parsed = stringToDate(`${year}-${month}-${date}`)
    return formatDate(parsed);
  }

  return value;
}
