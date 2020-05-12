import React, { useEffect, useRef, useState } from 'react';
import { dispatch, Event, registerRendererOnce } from '../events/events';
import { CheckbookAccount } from '../entities/checkbook/CheckbookAccount';
import PDFJS, { PDFDocumentProxy, PDFSource } from 'pdfjs-dist/webpack';
import { ParsePayrollStatementService } from '../services/checkbook/bank/ParsePayrollStatementService';
import { Employee, PayrollParseResult } from '../entities/checkbook/Employee';
import { numberWithCommas } from '../utils/checkbookUtil';
import { ExportPayrollStatementService } from '../services/checkbook/bank/ExportPayrollStatementService';
import findFile from '../images/findFile.png';
import recoverAccounts from '../images/recoverAccounts.png';
import openMoney from '../images/openMoney.png';
import { showModal } from './Modal';
import { ImportedPayrollStatements } from './ImportedPayrollStatements';


export const ImportPayrollStatement = (props: any) => {

    const [file, setFile] = useState<File | null>(null);
    const [accounts, setAccounts] = useState<CheckbookAccount[]>([]);
    const [account, setAccount] = useState<CheckbookAccount | null>(null);
    const [importing, setImporting] = useState(false);
    const parsed = useRef<PayrollParseResult | null>(props.history.location && props.history.location.state ? props.history.location.state.result : null);
    const [didUpload, setDidUpload] = useState(false);
    const [didExportMoney, setDidExportMoney] = useState(false);
    const [date, setDate] = useState('');
    const [name, setName] = useState('');
    const missingNames = useRef<string[]>([])

    useEffect(() => {
      registerRendererOnce(Event.AllCheckbookAccounts, (_, args: any[]) => {
        setAccounts(args[0]);
        setAccount(args[0][0]);
      });
      registerRendererOnce(Event.ImportMoneyRecord, () => {
        props.history.replace('/checkbook');
      });
      dispatch(Event.AllCheckbookAccounts);
    }, []);

    const onFileChange = (e: any) => {
      const file = e.target.files[0];
      setFile(file);
    };

    const startImport = () => {
      setImporting(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        let myData = new Uint8Array(event.target.result);
        let data = { data: myData };
        parsePdf(data as any);
      };
      reader.readAsArrayBuffer(file!);
    };

    const parsePdf = async (arr: any) => {
      const text = await getPdfText(arr);
      const parser = new ParsePayrollStatementService();
      const results = parser.parse(text);
      parsed.current = results;
      setDidUpload(true);
      showComparsionModal();
    };

    const showComparsionModal = () => {
      showModal({
        onSave(_): Promise<any> {
          return Promise.resolve(undefined);
        },
        title : 'Select Previous Payroll Statement To Compare Against',
        body : <div>
          <ImportedPayrollStatements isModal={true} onSelection={(e) => {
            console.log(e);
            compareAgainstLast(parsed.current!, e);
            if(missingNames.current.length > 0) {
              showMissingNamesModal();
            }
            else {
              showModal({
                onSave(_): Promise<any> {
                  return Promise.resolve(undefined);
                }, title: 'All Names Found On New Payroll',
                body : <p>Both payroll statements contain all names.</p>
              })
            }
          }}/>
        </div>
      })
    };

    const showMissingNamesModal = () => {
      showModal({
        onSave(_): Promise<any> {
          return Promise.resolve();
        },
        title : `Found ${missingNames.current.length} names that are not on new payroll.`,
        body : <div>
          <p>Verify the following employees are still employed:</p>
          {missingNames.current.map(n => {
            return <p>Name: <strong>{n}</strong></p>
          })}
        </div>
      })
    };

    /* see example of a PDFSource below */
    const getPdfText = async (source: PDFSource): Promise<string> => {
      Object.assign(window, { pdfjsWorker: PDFJS.PDFWorker }); // added to fit 2.3.0
      const pdf = await PDFJS.getDocument(source).promise;
      const maxPages = pdf.numPages;
      const pageTextPromises = [];
      for (let pageNo = 1; pageNo <= maxPages; pageNo += 1) {
        pageTextPromises.push(getPageText(pdf, pageNo));
      }
      const pageTexts = await Promise.all(pageTextPromises);
      return pageTexts.join(' ');
    };

    const getPageText = async (pdf: PDFDocumentProxy, pageNo: number) => {
      const page = await pdf.getPage(pageNo);
      const tokenizedText = await page.getTextContent();
      const pageText = tokenizedText.items.map(token => token.str).join('');
      return pageText;
    };

    const exportMoneyFile = () => {
      const exporter = new ExportPayrollStatementService();
      parsed.current!.name = name;
      parsed.current!.accountId = account!._id;
      parsed.current!.date = date;
      dispatch(Event.SavePayrollStatement, parsed.current);
      exporter.exportStatement(parsed.current!);
      setDidExportMoney(true);
    };

    const importIntoCheckbook = () => {
      parsed.current!.accountId = account!._id;
      parsed.current!.date = date;
      parsed.current!.name = name;
      dispatch(Event.SavePayrollStatement, parsed.current);
      dispatch(Event.ImportPayrollStatement, parsed.current!);
      setTimeout(() => {
        props.history.replace('/checkbook/' + account!._id);
      }, 2000);
    };

    const compareAgainstLast = (statement : PayrollParseResult, compare : PayrollParseResult) => {
      if(!compare) {
        return;
      }
      const namesLast = new Set(compare.employees.map(w => w.name.trim().toLowerCase()));
      const names = new Set(statement.employees.map(w => w.name.trim().toLowerCase()))
      const missing = new Set<string>();
      namesLast.forEach(name => {
        if(!names.has(name)) {
          missing.add(name);
        }
      });
      missingNames.current = Array.from(missing);
    }

    if (didExportMoney) {
      return <div style={{ padding: '1em' }}>
        <div>
          <div className="notification is-primary">
            <div className="header">
              Successfully exported money file..
            </div>
            <p>Export Path: <strong>C:\Users\USERNAME\ExportedPayroll-{date}-NAME.qif</strong></p>
          </div>
          <br/>
          <h2>Import instructions:</h2>
          <p><strong>Step 1: Open Microsoft Money</strong></p>
          <img width="90%" height="525px" src={openMoney}/>
          <br/><br/>
          <h3>
            <strong>Step 2:</strong> Select File -&gt; Import -&gt; Recover Accounts
          </h3>
          <img src={recoverAccounts} height="525px"/>
          <div className="notification is-danger">Make sure Recover Accounts is selected
            and NOT downloaded statements, it will mess up payroll if downloaded
            statements is selected.
          </div>
          <h3><strong>Step 1:</strong></h3>
          <p>
            Locate the exported file at the path written above.
            It will contain the date you selected as apart of the file name.
          </p>
          <img src={findFile} height="525px"/>
          <h3><strong>Step 4:</strong></h3>
          <p>
            Select the account you would like to import into.
            This will most likely be the <strong>Payroll</strong> account.
            After that is selected, follow the on-screen prompts.
          </p>
          <p>If there is any other popups other than selecting an account
            just choose the default value.</p>
          <br/><br/><br/>
        </div>

      </div>;
    }

    if (didUpload) {
      return <div>
        <section>
          <div className={'container'} style={{ paddingTop: '1em', paddingBottom: '1em', paddingLeft: '.5em' }}>
            <p>Total Gross: <strong>
              ${numberWithCommas(parsed.current!.totalGross.toFixed(2))}
            </strong></p>
            <p>Total Deductions: <strong>
              ${numberWithCommas(parsed.current!.totalDeductions.toFixed(2))}
            </strong></p>
            <p>Total Net: <strong>
              ${numberWithCommas(parsed.current!.totalNet.toFixed(2))}
            </strong></p>
          </div>
        </section>
        <section>
          <div className="container" style={{ paddingLeft: '.5em' }}>
            <div className="field">
              <label className="label">Name For Import. This will be used
              select previous payroll uploads to compare against.</label>
              <div className="control">
                <input className="input" required={true} type="text" placeholder="Name" value={name}
                       onChange={e => setName(e.target.value)}/>
                <span className="icon is-small is-left">
          </span>
              </div>
              <label className="label">Date For Import</label>
              <div className="control">
                <input className="input" type="date" placeholder="Date" value={date}
                       onChange={e => setDate(e.target.value)}/>
                <span className="icon is-small is-left">
          </span>
              </div>
              <div className="buttons">
                <button className={'button is-primary is-light'} disabled={date === '' || name === ''} onClick={exportMoneyFile}>Export
                  To Money File
                </button>
                <button className={'button is-primary is-light'} disabled={date === '' || name === ''}
                        onClick={importIntoCheckbook}>Import Into Checkbook
                </button>
              </div>
            </div>

            <table className="table is-bordered is-striped is-narrow is-hoverable is-fullwidth">
              <thead>
              <tr>
                <th>Employee #</th>
                <th>Name</th>
                <th>Gross</th>
                <th>Deductions</th>
                <th>Net</th>
                <th>Check Number</th>
              </tr>
              </thead>
              <tbody>
              {parsed.current!.employees.map((e: Employee) => {
                return <React.Fragment key={e.id}>
                  <tr key={e.id}>
                    <td>{e.id}</td>
                    <td>{e.name}</td>
                    <td>${numberWithCommas(e.grossPay.toFixed(2))}</td>
                    <td>${numberWithCommas(e.deductions.toFixed(2))}</td>
                    <td>${numberWithCommas(e.netPay.toFixed(2))}</td>
                    <td>{e.checkNumber}</td>
                  </tr>
                </React.Fragment>;
              })}
              </tbody>
            </table>

          </div>
        </section>
      </div>;
    }

    if (!didUpload && parsed.current) {

      return <div>
        <section className="hero">
          <div className="hero-body">
            <div className="container">
              <h1 className="title">
                View Previous Payroll Upload
              </h1>
              <h2 className="subtitle">
                Select an account and click View.
              </h2>
            </div>
          </div>
        </section>
        <section>
          <div className="container" style={{ paddingLeft: '1.5em', paddingBottom: '2em' }}>
            <div className="field">
              <label className="label">{account ? `Selected Account: ${account.name}` : 'Select An Account'}</label>
              <div className="control">
                <div className="select">
                  <select onChange={(e) => {
                    const index = accounts.findIndex(w => w._id === e.target.value);
                    setAccount(accounts[index]);
                  }}>
                    {accounts.map(w => {
                      return <option key={w._id} value={w._id}>{w.name}</option>;
                    })}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="container" style={{ paddingLeft: '1.5em', paddingBottom: '2em' }}>
          <button className={'button is-primary is-light'} onClick={() => {
            setDidUpload(true);
            showComparsionModal();
          }}>
            View Statement
          </button>
        </div>
      </div>;
    }

    return <div>

      <section className="hero">
        <div className="hero-body">
          <div className="container">
            <h1 className="title">
              Upload Payroll Statement .PDF
            </h1>
            <h2 className="subtitle">
              Select choose a file below and then select the account you'd like to import to.
            </h2>
          </div>
        </div>
      </section>

      <section>
        <div className="container" style={{ paddingLeft: '1.5em', paddingBottom: '2em' }}>
          <div className="field">
            <label className="label">{account ? `Selected Account: ${account.name}` : 'Select An Account'}</label>
            <div className="control">
              <div className="select">
                <select onChange={(e) => {
                  const index = accounts.findIndex(w => w._id === e.target.value);
                  setAccount(accounts[index]);
                }}>
                  {accounts.map(w => {
                    return <option key={w._id} value={w._id}>{w.name}</option>;
                  })}
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section>
        <div className="container" style={{ paddingLeft: '1.5em', paddingBottom: '2em' }}>
          <div className="file">
            <label className="file-label">
              <input className="file-input" type="file" name="resume" onChange={onFileChange} accept={'.pdf'}/>
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
        <div className="container" style={{ paddingLeft: '1.5em', paddingBottom: '2em' }}>
          {!importing && <button className={'button is-primary is-light'} onClick={startImport}>
            Start Payroll Statement Import Into {account.name}
          </button>}
          {importing && <button className={'button is-primary is-light'}>
            Uploading... Please Wait.
          </button>}
        </div>
      </section>}
    </div>;
  }
;
