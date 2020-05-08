import {Employee, PayrollParseResult} from '../../../entities/checkbook/Employee';
import {getFloat, isAmount} from "./ParseBankStatementService";

enum State {
  None,
  EmployeeNumber,
  Name,
  SSN,
  Department,
  Gross,
  Deduction,
  Net,
  CheckNumber
}

export class ParsePayrollStatementService {

  private extraSpacesRegex = new RegExp(/\s+/);

  public parse(text : string) : PayrollParseResult {

    let result : string[] = text.replace(this.extraSpacesRegex, " ").split(" ").filter(w => w != null && w.trim() != "");

    const start = this.getIndexMultiple(result, ['Number', 'Reason', 'for']);
    const end = this.getIndexMultiple(result, ["-------------", "-------------", "-------------"])

    result = result.slice(start + 4, end);

    let state = State.None;
    let employee : Employee = {name: "", checkNumber: 0, deductions: 0, grossPay: 0, id: 0, netPay: 0};
    const employees : Employee[] = [];
    let skip = false;

    for (let line of result) {
      const nextLine = result[result.indexOf(line) + 1];

      if(line.toLowerCase().startsWith("system:")) {
        console.log('skipping', line)
        skip = true;
        continue;
      }

      if(line.includes("Voiding---")) {
        console.log('skipping', line)
        skip = false;
        continue;
      }

      if(skip) {
        console.log('skipping', line)
        continue;
      }


      if((state === State.None || state === State.CheckNumber) && !isAmount(line)) {
        console.log('skipping', line);
        continue;
      }

      if((state === State.None || state === State.CheckNumber) &&  isAmount(line)) {
        state = State.EmployeeNumber;
        employee.id = getFloat(line)!;
      }

      else if(line.startsWith("XXX-XX-")) {
        state = State.SSN;
      }

      else if((state === State.EmployeeNumber || state === State.Name) && !isAmount(line)) {
        employee.name += line + " ";
        state = State.Name;
      }

      else if(state === State.Name && isAmount(line) && nextLine.startsWith("XXX-XX-") ) {
        state = State.Department;
      }

      else if(state === State.SSN && isAmount(line)) {
        state = State.Gross;
        employee.grossPay = getFloat(line)!;
      }

      else if(state === State.Gross && isAmount(line)) {
        state = State.Deduction;
        employee.deductions = getFloat(line)!;
      }

      else if(state === State.Deduction && isAmount(line)) {
        state = State.Net;
        employee.netPay = getFloat(line)!;
      }

      else if(state === State.Net && isAmount(line)) {
        state = State.CheckNumber;
        employee.checkNumber = getFloat(line)!;
        employee.name = employee.name.trim();
        employees.push(employee);
        employee = {checkNumber: 0, deductions: 0, grossPay: 0, id: 0, name: "", netPay: 0};
      }
    }

    const parseResult : PayrollParseResult = {
      accountId: "",
      totalDeductions: 0, totalGross: 0, totalNet: 0,
      employees, date : ''
    };

    employees.forEach(e => {
      parseResult.totalDeductions += e.deductions
      parseResult.totalNet += e.netPay
      parseResult.totalGross += e.grossPay
    })

    return parseResult;
  }

  private getIndexMultiple = (array: string[], args: string[]) => {
    const lower = (arg: string) => arg.toString().toLowerCase();
    for (let i = 0; i < array.length; i++) {
      if (lower(args[0]) === lower(array[i]) && lower(args[1]) === lower(array[i + 1]) && lower(args[2]) === lower(array[i + 2])) {
        return i;
      }
    }
    return -1;
  };


}
