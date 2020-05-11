import React, {useEffect, useState} from 'react';
import {HashRouter, Route} from 'react-router-dom';
import HomePage from './HomePage';
import Checkbook from '../components/Checkbook';
import {Sidebar} from '../components/Sidebar';
import {Event, registerRendererOnce} from "../events/events";
import { ImportMoneyFile } from '../components/ImportMoneyFile';
import {CheckbookAccounts} from "../components/CheckbookAccounts";
import { ImportBankStatement } from '../components/ImportBankStatement';
import { ImportPayrollStatement } from '../components/ImportPayrollStatement';

const Root =() => {

  useEffect(() => {
    registerRendererOnce(Event.Error, (_, err : string) => {
      console.error(err);
    })
  }, [])

  return <div>
    <HashRouter>
      <div className="columns is-gapless">
        <div className="column is-one-fifth">
          <Sidebar/>
        </div>
        <div className="column">
          <Route path={"/"} exact component={HomePage} />
          <Route path={"/checkbook"} exact component={CheckbookAccounts} />
          <Route path={"/checkbook/:id"} exact component={Checkbook} />
          <Route path={"/import"} exact component={ImportMoneyFile} />
          <Route path={"/import/bank"} component={ImportBankStatement} />
          <Route path={"/import/payroll"} component={ImportPayrollStatement} />
        </div>
      </div>
    </HashRouter>
  </div>
}

export default Root;
