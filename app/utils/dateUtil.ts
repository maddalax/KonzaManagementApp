import spacetime, {Spacetime} from 'spacetime';

export function formatDate(spacetime : Spacetime) : string {
  return spacetime.format('{month-pad}/{date-pad}/{year}').toString();
}

export function currentDate() {
  return spacetime.now().add(1 ,'month');
}

export function currentTimestamp() {
  return spacetime.now().add(1, 'month').epoch;
}

export function parseDate(value : string) {

  // 5/5
  if(value.length === 3) {
    const month = parseInt(value[0]);
    const date = parseInt(value[2]);
    const s = spacetime({month, date, year : currentDate().year()});
    return formatDate(s);
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
    return formatDate(s);
  }

  //12/5
  if(value.length === 4) {
    const month = parseInt(`${value[0]}${value[1]}`) + 1;
    const date = parseInt(value[3]);
    const s = spacetime({month, date, year : currentDate().year()});
    return formatDate(s);
  }

  //12/12
  if(value.length === 5) {
    const month = parseInt(`${value[0]}${value[1]}`);
    const date = parseInt(`${value[3]}${value[4]}`);
    const s = spacetime({month, date, year : currentDate().year()});
    return `${month == 12 ? s.month() + 1 : s.month()}/${s.date()}/${s.year()}`
  }

  return value;
}
