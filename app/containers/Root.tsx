import React, {useEffect} from 'react';
import {HashRouter, Route} from 'react-router-dom';
import HomePage from './HomePage';
import Checkbook from '../components/Checkbook';
import {Sidebar} from '../components/Sidebar';
import {Event, registerRendererOnce} from "../events/events";
import { ImportMoneyFile } from '../components/ImportMoneyFile';
import {CheckbookAccounts} from "../components/CheckbookAccounts";
import { ImportBankStatement } from '../components/ImportBankStatement';
import { ImportPayrollStatement } from '../components/ImportPayrollStatement';
import { ImportedPayrollStatements } from '../components/ImportedPayrollStatements';
import { ErrorBoundary } from './ErrorBoundary';
import {currentTimestamp} from "../utils/dateUtil";
import {uuid} from "uuidv4";

const Root =() => {

  useEffect(() => {
    registerRendererOnce(Event.Error, (_, err : string) => {
      console.error(err);
    })
  }, [])

  return <div>
      <HashRouter>
        <ErrorBoundary>
        <div className="columns is-gapless">
          <div className="column is-one-fifth">
            <Sidebar/>
          </div>
          <div className="column">
            <Route path={"/"} exact component={HomePage} />
            <Route path={"/checkbook"} exact component={(props: any ) => <CheckbookAccounts timestamp={currentTimestamp()} {...props} key={uuid()}/>} />
            <Route path={"/checkbook/:id"} exact component={Checkbook} />
            <Route path={"/import"} exact component={(props : any) => <ImportMoneyFile {...props} key={uuid()}/>} />
            <Route path={"/import/bank"} exact component={(props : any) => <ImportBankStatement {...props} key={uuid()}/>} />
            <Route path={"/import/payroll"} exact component={(props : any) => <ImportPayrollStatement timestamp={currentTimestamp()} {...props} key={uuid()}/>} />
            <Route path={"/payroll/list"} exact component={(props : any) => <ImportedPayrollStatements {...props} key={uuid()}/>} />
          </div>
        </div>
        </ErrorBoundary>
      </HashRouter>
  </div>
}

export default Root;
