export function getFloatOrZero(value : any) : number {
  if(!value) {
    return 0;
  }
  const parsed = parseFloat(value);
  if(isNaN(parsed)) {
    return 0;
  }
  return parsed;
}

export function numberWithCommas(x: string | number) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
