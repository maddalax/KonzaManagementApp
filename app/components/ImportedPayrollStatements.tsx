import React, { useEffect, useRef, useState } from 'react';
import { dispatch, Event, registerRendererOnce } from '../events/events';
import { PayrollParseResult } from '../entities/checkbook/Employee';
import { numberWithCommas } from '../utils/checkbookUtil';

export interface ImportedPayrollStatementsProps extends React.ComponentProps<any> {
  isModal? : boolean,
  onSelection? : (result : PayrollParseResult) => void
}

export const ImportedPayrollStatements = (props : ImportedPayrollStatementsProps) => {

  const statements = useRef<PayrollParseResult[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    registerRendererOnce(Event.AllPayrollStatements, (_, args) => {
      statements.current = args[0];
      setLoaded(true);
    })
    dispatch(Event.AllPayrollStatements);
  }, [])

  const view = (e : PayrollParseResult) => {
    props.history.push({
      pathname: '/import/payroll',
      state: { result : e }
    })
  }

  if(loaded) {
    return <div className={"container"} style={{padding : '1em'}}>
      <h3 className={'hero'}>Imported Payroll Statements</h3>
      <table className="table is-bordered is-striped is-narrow is-hoverable is-fullwidth">
        <thead>
        <tr>
          <th>Date</th>
          <th>Name</th>
          <th>Net Amount</th>
          <th>Total Employees</th>
          <th>View</th>
        </tr>
        </thead>
        <tbody>
        {statements.current.map((e) => {
          return <React.Fragment key={e.date}>
            <tr key={e.date}>
              <td>{e.date}</td>
              <td>{e.name}</td>
              <td>{numberWithCommas(e.totalNet.toFixed(2))}</td>
              <td>{e.employees.length}</td>
              {!props.isModal && <td><button className={"button is-primary is-light"} onClick={() => view(e)}>View</button></td>}
              {props.isModal && <td><button className={"button is-primary is-light"} onClick={() => props.onSelection!(e)}>Select</button></td>}
            </tr>
          </React.Fragment>;
        })}
        </tbody>
      </table>
    </div>
  }

  return <div>Loading...</div>
};
