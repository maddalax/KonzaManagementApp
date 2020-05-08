export interface Employee {
  id: number,
  name : string
  grossPay: number;
  deductions: number;
  netPay: number;
  checkNumber: number;
}

export interface PayrollParseResult {
  totalGross : number;
  totalNet : number;
  totalDeductions : number;
  employees : Employee[]
  date : string
  accountId : string
}

export interface MoneyTransaction {
  date: string;
  total: number;
  vendor: string;
  number: number;
  category: string
  meta: string

}
