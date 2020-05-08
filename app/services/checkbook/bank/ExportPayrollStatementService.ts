import {MoneyTransaction, PayrollParseResult} from "../../../entities/checkbook/Employee";
import {dispatch, Event} from "../../../events/events";


export class ExportPayrollStatementService {

  public exportStatement(result: PayrollParseResult) {
    let transactions = this.parseToTransactions(result);
    let file = `ExportedPayroll-${result.date}.qif`;
    let builder = "!Type:Bank\n";
    for (let i = 0; i < transactions.length; i++) {
      let t = transactions[i];
      builder += this.toMoneyFormat(t, result.date, i === 0);
    }
    console.log(builder.toString());
    dispatch(Event.ExportToHomeFolder, builder.toString(), file)
  }

  public simpleDate(date: string) {
    const s = new Date(date);
    s.setHours(12);
    return `${s.getMonth() + 1}/${s.getDate()}'${s.getFullYear()}`;
  }

  private parseToTransactions(request: PayrollParseResult): MoneyTransaction[] {
    return request.employees.map(w => {
      const transaction: MoneyTransaction = {
        category: "Cost of Goods:Labor",
        date: request.date,
        meta: "",
        number: w.checkNumber,
        total: w.netPay,
        vendor: "Payroll"
      }
      return transaction;
    })
  }

  private toMoneyFormat(transaction: MoneyTransaction, date: string, disableCarrot: boolean) : string {
    let builder = '';
    if (!disableCarrot) {
      builder += ("^");
      builder += "\n";
    }
    builder += `D${this.simpleDate(date)}\n`;
    builder += `T-${transaction.total}\n`;
    builder += `N${transaction.number}\n`;
    builder += `P${transaction.vendor}\n`;
    builder += `L${transaction.category}\n`;
    return builder;
  }


}
