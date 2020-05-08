import React, { useEffect, useRef, useState } from 'react';
import { dispatch, Event, registerRendererOnce } from '../events/events';
import { CheckbookAccount } from '../entities/checkbook/CheckbookAccount';
import PDFJS, { PDFDocumentProxy, PDFSource } from 'pdfjs-dist';
import { BankStatementEntry } from '../entities/checkbook/BankStatementEntry';
import { ParsePayrollStatementService } from '../services/checkbook/bank/ParsePayrollStatementService';


export const ImportPayrollStatement = (props: any) => {

    const [file, setFile] = useState<File | null>(null);
    const [accounts, setAccounts] = useState<CheckbookAccount[]>([]);
    const [account, setAccount] = useState<CheckbookAccount | null>(null);
    const [importing, setImporting] = useState(false);
    const parsed = useRef<BankStatementEntry[]>([]);
    const [didUpload, setDidUpload] = useState(false);


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


    if (didUpload) {
      return <div>
        Uploaded
      </div>
    }


    return <div>

      <section className="hero">
        <div className="hero-body">
          <div className="container">
            <h1 className="title">
              Upload Bank Statement .PDF
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
            Start Auto Recopncile Into {account.name}
          </button>}
          {importing && <button className={'button is-primary is-light'}>
            Uploading... Please Wait.
          </button>}
        </div>
      </section>}
    </div>;
  }
;
