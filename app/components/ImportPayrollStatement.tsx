import React, {useEffect, useRef, useState} from 'react';
import {dispatch, Event, registerRendererOnce} from '../events/events';
import {CheckbookAccount} from '../entities/checkbook/CheckbookAccount';
import PDFJS, {PDFDocumentProxy, PDFSource} from 'pdfjs-dist';
import {ParsePayrollStatementService} from '../services/checkbook/bank/ParsePayrollStatementService';
import {Employee, PayrollParseResult} from "../entities/checkbook/Employee";
import {numberWithCommas} from "../utils/checkbookUtil";
import {ExportPayrollStatementService} from "../services/checkbook/bank/ExportPayrollStatementService";


export const ImportPayrollStatement = (props: any) => {

    const [file, setFile] = useState<File | null>(null);
    const [accounts, setAccounts] = useState<CheckbookAccount[]>([]);
    const [account, setAccount] = useState<CheckbookAccount | null>(null);
    const [importing, setImporting] = useState(false);
    const parsed = useRef<PayrollParseResult | null>(null);
    const [didUpload, setDidUpload] = useState(false);
    const [didExportMoney, setDidExportMoney] = useState(false);
    const [date, setDate] = useState('');


    useEffect(() => {
      registerRendererOnce(Event.AllCheckbookAccounts, (_, args: any[]) => {
        setAccounts(args[0]);
        setAccount(args[0][0]);
      });
      registerRendererOnce(Event.ImportMoneyRecord, () => {
        console.log('complete');
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
        let data = {data: myData};
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
    };

    /* see example of a PDFSource below */
    const getPdfText = async (source: PDFSource): Promise<string> => {
      Object.assign(window, {pdfjsWorker: PDFJS.PDFWorker}); // added to fit 2.3.0
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
      parsed.current!.accountId = account!._id;
      parsed.current!.date = date;
      exporter.exportStatement(parsed.current!);
      setDidExportMoney(true);
    }

    const importIntoCheckbook = () => {
      parsed.current!.accountId = account!._id;
      parsed.current!.date = date;
      dispatch(Event.ImportPayrollStatement, parsed.current!)
      setTimeout(() => {
        props.history.replace('/checkbook/' + account!._id);
      }, 2000)
    };

    if(didExportMoney) {
      return <div>
        Complete
      </div>
    }

    if (didUpload) {
      return <div>
        <section>
          <div className={"container"} style={{paddingTop: '1em', paddingBottom: '1em', paddingLeft: '.5em'}}>
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
          <div className="container"  style={{paddingLeft: '.5em'}}>
            <div className="field">
              <label className="label">Date For Import</label>
              <div className="control">
                <input className="input" type="date" placeholder="Date" value={date} onChange={e => setDate(e.target.value)}/>
                <span className="icon is-small is-left">
          </span>
              </div>
              <div className="buttons">
                <button className={"button is-primary is-light"} disabled={date === ''} onClick={exportMoneyFile}>Export To Money File</button>
                <button className={"button is-primary is-light"} disabled={date === ''} onClick={importIntoCheckbook}>Import Into Checkbook</button>
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
      </div>
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
        <div className="container" style={{paddingLeft: '1.5em', paddingBottom: '2em'}}>
          <div className="field">
            <label className="label">{account ? `Selected Account: ${account.name}` : 'Select An Account'}</label>
            <div className="control">
              <div className="select">
                <select onChange={(e) => {
                  console.log(e.target.value);
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
        <div className="container" style={{paddingLeft: '1.5em', paddingBottom: '2em'}}>
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
        <div className="container" style={{paddingLeft: '1.5em', paddingBottom: '2em'}}>
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
