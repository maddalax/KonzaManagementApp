import {BankStatementEntry} from '../entities/checkbook/BankStatementEntry';
import React from 'react';
import {numberWithCommas} from '../utils/checkbookUtil';
import {StatementMatch, StatementMatchingService} from '../services/checkbook/bank/StatementMatchingService';
import {CheckbookEntry, CheckbookEntryStatus} from '../entities/checkbook/CheckbookEntry';
import {dispatch, Event, registerRendererOnce} from "../events/events";

const { dialog } = require('electron').remote

export interface BankStatementReconcilerProps {
  import: BankStatementEntry[],
  accountId: string
}

interface BankStatementReconcilerState {
  matches: StatementMatch[],
  entries: StatementMatch[]
  tab: number,
  loading: boolean
  count: number
}

const getTotalBalance = (entries: BankStatementEntry[]): string => {
  let balance = 0;
  entries.forEach(e => {
    balance += e.amount;
  });
  return numberWithCommas(balance.toFixed(2));
};

export class BankStatementReconciler extends React.Component<BankStatementReconcilerProps, BankStatementReconcilerState> {

  constructor(props: BankStatementReconcilerProps) {
    super(props);
    this.state = {
      loading: false,
      tab: 0,
      matches: [],
      entries: [],
      count: 0
    };
  }

  componentDidMount() {

    registerRendererOnce(Event.AllCheckbookEntries, (_, args: any[]) => {
      try {
        let entries: CheckbookEntry[] = args[0];
        entries = entries.filter(w => w.status !== CheckbookEntryStatus.Reconciled);

        entries.forEach(e => {
          this.allEntries[e._id] = e;
        })

        const service = new StatementMatchingService(this.props.import, entries);
        let matches = service.match();
        matches = matches.sort((a, b) => new Date(a.statement.date).getTime() - new Date(b.statement.date).getTime());
        matches.forEach(m => {
          m.entries = m.entries.sort(w => w.timestamp);
        })
        this.setState({matches}, this.onMatchesLoaded);
      } catch (e) {
        console.error(e);
      }
    })
    dispatch(Event.AllCheckbookEntries, this.props.accountId);
  }

  private onMatchesLoaded = () => {
    const predicateOne = this.getPredicate(0);
    const predicateTwo = this.getPredicate(1);
    this.state.matches.forEach(s => {
      if (predicateOne(s) || predicateTwo(s)) {
        s.entries.forEach(e => this.checked[e._id] = s.statement.id);
      }
    })
    this.setState({count: Object.keys(this.checked).length})
    this.onTabChange();
  }

  private checked: { [key: string]: string } = {};
  private allEntries : {[key : string] : CheckbookEntry} = {};

  private tabClass = (num: number) => {
    return this.state.tab == num ? 'is-active' : '';
  };

  private onCheckboxChange = (entry: CheckbookEntry, statement: BankStatementEntry) => {
    if (this.checked[entry._id]) {
      delete this.checked[entry._id];
    } else {
      this.checked[entry._id] = statement.id;
    }
    this.setState({count: Object.keys(this.checked).length})
    this.onTabChange();
  };

  private isCheckboxChecked = (entry: CheckbookEntry, statement: BankStatementEntry): boolean => {
    return this.checked[entry._id] === statement.id;
  };

  private header = () => {
    return <section className="hero">
      <div className="hero-body">
        <div className="container">
          <h1 className="title">
            <p>Bank Statement Entries: {this.props.import.length}</p>
          </h1>
          <h2 className="subtitle">
            <p>Total Amount: ${getTotalBalance(this.props.import)}</p>
          </h2>
          <h2 className="subtitle">
            <p>Records to Set Reconciled: <strong>{this.state.count}</strong></p>
            <p>Records Unreconciled: <strong>{this.props.import.length - this.state.count}</strong></p>
          </h2>
          <button className={"button is-primary is-light"} onClick={this.approve}>Approve Reconcile</button>
        </div>
      </div>
    </section>;
  };

  private setTab = (tab: number) => {
    this.setState({tab}, () => {
      this.onTabChange();
    });
  }

  private approve = () => {
    const confirm = dialog.showMessageBoxSync({
      message  : `Please confirm auto reconciliation of ${this.state.count} records.`,
      buttons : ["Confirm", "Cancel"]
    })
    if(confirm !== 0) {
      return;
    }
    const ids = Object.keys(this.checked);
    const toSave : CheckbookEntry[] = [];
    ids.forEach(i => {
      this.allEntries[i].status = CheckbookEntryStatus.Reconciled;
      toSave.push(this.allEntries[i]);
    })
    dispatch(Event.SaveCheckbookEntry, toSave);
    setTimeout(() => {
      const props : any = this.props;
      props.history.replace('/checkbook/' + this.props.accountId);
    })
  };

  private getPredicate = (tab: number) => {
    switch (tab) {
      case 0:
        return this.singleMatchesPredicate;
      case 1:
        return this.singleMatchesSimilarAmountPredicate;
      case 2:
        return this.multiMatchesPredicate;
      case 3:
        return this.noMatchesPredicate;
    }
    return () => false;
  };

  private isCheckedOnAnotherStatement = (entry: CheckbookEntry, statement: BankStatementEntry): boolean => {
    if (!this.checked[entry._id]) {
      return false;
    }
    return this.checked[entry._id] !== statement.id;
  };

  private singleMatchesPredicate = (w: StatementMatch) => {
    if (w.entries.length !== 1) {
      return false;
    }
    const entry = w.entries[0];
    if (!entry) {
      return false;
    }
    return w.statement.amount >= 0 ? entry.credit === w.statement.amount : entry.debit === w.statement.amount;
  };

  private singleMatchesSimilarAmountPredicate = (w: StatementMatch) => {
    if (w.entries.length !== 1) {
      return false;
    }
    const entry = w.entries[0];
    if (!entry) {
      return false;
    }
    return w.statement.amount >= 0 ? entry.credit != w.statement.amount : entry.debit != w.statement.amount;
  };

  private noMatchesPredicate = (w: StatementMatch) => w.entries.length === 0;

  private multiMatchesPredicate = (w: StatementMatch) => w.entries.length > 1;

  private onTabChange = () => {
    const predicate = this.getPredicate(this.state.tab);
    const cloned: StatementMatch[] = JSON.parse(JSON.stringify(this.state.matches));
    const filtered = cloned.filter(w => predicate(w));
    filtered.forEach(f => {
      f.entries = f.entries.filter(w => !this.isCheckedOnAnotherStatement(w, f.statement))
    })
    this.setState({entries: filtered})
  };

  private backgroundColor = () => {
    switch (this.state.tab) {
      case 0:
        return '#3ff17d';
      case 1:
        return `#37afff`
      case 2:
        return '#ffdd57'
    }
    return ''
  }

  render() {
    return <div>
      {this.header()}
      <div className="tabs is-boxed">
        <ul>
          <li className={this.tabClass(0)} onClick={() => this.setTab(0)}>
            <a>
              <span>Exact Matches</span>
            </a>
          </li>
          <li className={this.tabClass(1)} onClick={() => this.setTab(1)}>
            <a>
              <span>Matches Similar Amount</span>
            </a>
          </li>
          <li className={this.tabClass(2)} onClick={() => this.setTab(2)}>
            <a>
              <span>Multi Matches</span>
            </a>
          </li>
          <li className={this.tabClass(3)} onClick={() => this.setTab(3)}>
            <a>
              <span>No Matches</span>
            </a>
          </li>
        </ul>
      </div>
      <section>
        <div className="container" style={{paddingLeft: '1.5em', paddingBottom: '2em'}}>
          <table className="table is-bordered is-striped is-narrow is-hoverable is-fullwidth" key={this.state.tab}>
            <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Type</th>
            </tr>
            </thead>
            <tbody>
            {this.state.entries.map(e => {
              let entries = e.entries;
              const filtered = entries.filter(s => this.isCheckboxChecked(s, e.statement));
              if (filtered.length > 0) {
                entries = filtered;
              }
              return <React.Fragment key={e.statement.id}>
                <tr key={e.statement.id} style={{backgroundColor: this.backgroundColor()}}>
                  <td>{e.statement.date}</td>
                  <td>{e.statement.description}</td>
                  <td>{numberWithCommas(e.statement.amount)}</td>
                  <td>{e.statement.type}</td>
                </tr>
                {entries.map(entry => {
                  return <tr key={entry._id}>
                    <td><label className="checkbox">
                      <input type="checkbox" checked={this.isCheckboxChecked(entry, e.statement)}
                             onChange={() => this.onCheckboxChange(entry, e.statement)}/>
                    </label> <span style={{paddingLeft: '0.3em'}}>{entry.date}</span></td>
                    <td>{`${entry.tag || ''} ${entry.payee || ''}`}</td>
                    <td>{numberWithCommas(entry.credit > 0 ? entry.credit : entry.debit)}</td>
                    <td>{entry.credit > 0 ? 'Credit' : 'Debit'}</td>
                  </tr>;
                })}
                {this.state.tab !== 3 && <tr>
                  <td style={{paddingTop: '1.5em'}}></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>}
              </React.Fragment>;
            })}
            </tbody>
          </table>

        </div>
      </section>
    </div>;
  }
}
