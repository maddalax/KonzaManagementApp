import React, {useEffect, useState} from 'react';
import {dispatch, Event, registerRendererOnce} from '../events/events';
import {CheckbookAccount} from "../entities/checkbook/CheckbookAccount";

export const ImportMoneyFile = (props : any) => {

  const [file, setFile] = useState<File | null>(null);
  const [accounts, setAccounts] = useState<CheckbookAccount[]>([])
  const [account, setAccount] = useState<CheckbookAccount | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    registerRendererOnce(Event.AllCheckbookAccounts, (_, args: any[]) => {
      setAccounts(args[0])
      setAccount(args[0][0])
    })
    registerRendererOnce(Event.ImportMoneyRecord, () => {
      props.history.replace('/checkbook')
    })
    dispatch(Event.AllCheckbookAccounts);
  }, [])

  const onFileChange = (e: any) => {
    const file = e.target.files[0];
    setFile(file);
  };

  const startImport = () => {
    setImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result: string = event.target!.result as string;
      const allLines = result!.split(/\r\n|\n/);
      afterUpload(allLines);
    };
    reader.readAsText(file!);
  };

  const afterUpload = (lines: string[]) => {
    let container: any[] = [];
    let payload = [];
    for (let line of lines) {
      if (line === '^') {
        container.push(payload);
        payload = [];
      } else {
        payload.push(line);
      }
    }

    dispatch(Event.ImportMoneyRecord, container, account!._id);
  };

  return <div>

    <section className="hero">
      <div className="hero-body">
        <div className="container">
          <h1 className="title">
            Upload Money .QIF File
          </h1>
          <h2 className="subtitle">
            Select choose a file below and then select the account you'd like to import to.
          </h2>
        </div>
      </div>
    </section>

    <section>
      <div className="container" style={{paddingLeft: '1.5em', paddingBottom : '2em'}}>
        <div className="field">
          <label className="label">{account ? `Selected Account: ${account.name}` : 'Select An Account'}</label>
          <div className="control">
            <div className="select">
              <select onChange={(e) => {
                const index = accounts.findIndex(w => w._id === e.target.value);
                setAccount(accounts[index]);
              }}>
                {accounts.map(w => {
                  return <option key={w._id} value={w._id}>{w.name}</option>
                })}
              </select>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section>
      <div className="container" style={{paddingLeft: '1.5em', paddingBottom : '2em'}}>
        <div className="file">
          <label className="file-label">
            <input className="file-input" type="file" name="resume" onChange={onFileChange} accept={".qif"}/>
            <span className="file-cta">
      <span className="file-icon">
        <i className="fas fa-upload"/>
      </span>
      <span className="file-label">
        {file != null ? file.name : 'Choose a file…'}
      </span>
    </span>
          </label>
        </div>
      </div>
    </section>

    {account && file && <section>
      <div className="container" style={{paddingLeft: '1.5em', paddingBottom : '2em'}}>
        {!importing && <button className={"button is-primary is-light"} onClick={startImport}>
          Start Import Into {account.name}
        </button>}
        {importing && <button className={"button is-primary is-light"}>
          Importing... Please Wait. You will be redirected once finished.
        </button>}
      </div>
    </section>}
  </div>
};
