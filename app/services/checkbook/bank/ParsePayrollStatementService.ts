import { Employee } from '../../../entities/checkbook/Employee';

export class ParsePayrollStatementService {

  private regex = new RegExp("\r?\n|\r");
  private regexDecimal = new RegExp("^\d");
  private extraSpacesRegex = new RegExp("\s+");

  public parse(text : string) : Employee[] {

    let result = text.split(this.regex);
    let lines = result.map(w => w.trim())
      .filter(w => this.regexDecimal.test(w.substring(0, 4)))
      .filter(w => w.includes("$"))
      .map(w => w.replace(/[^0-9]/g, ''))
      .map(w => w.replace(",", "").replace("'", ""))
      .map(w => w.replace("$", ""))
      .map(w => w.replace("-", ""))
      .map(w => w.replace(this.extraSpacesRegex, " "))
      .map(w =>
      {
        let indexes = this.findIndexes(w, ".");
        indexes.forEach(index => {
          let charAfter = w[index + 1];
          let charBefore = w[index - 1];
          if (!this.isNumber(charAfter) || !this.isNumber(charBefore))
            w = this.replaceAt(w, index, "");
        });
        return w;
      })
      .map(w => w.replace(this.extraSpacesRegex, " "));

    let split = lines
      .map(w => w.split(" "));

    let employees : Employee[] = []

    split.forEach(s => {
      let id = s[0];
      let gross = s[3];
      let deductions = s[4];
      let net = s[5];
      let checkNumber = s[6];

      if (checkNumber.indexOf(":") != -1)
        checkNumber = checkNumber.substring(0, checkNumber.indexOf(":"));

      let employee : Employee = {
        checkNumber : getFloat(checkNumber)!,
        id : getFloat(id)!,
        grossPay : getFloat(gross)!,
        deductions : getFloat(deductions)!,
        netPay : getFloat(net)!
      }
      employees.push(employee);
    });

    console.log(employees);
    return employees;
  }

  private findIndexes(text : string, query : string) : number[] {
    const indexes = []
    for(let i = 0; i < text.length - query.length; i++) {
      if(query === text.substring(i, query.length)) {
        indexes.push(i);
      }
    }
    return indexes;
  }

  private isNumber(char : any) {
    return char >= '0' && char <= '9';
  }

  private replaceAt(str : string, index : number, replacement : string) {
    return str.substr(0, index) + replacement+ str.substr(index + replacement.length);
  }


}
