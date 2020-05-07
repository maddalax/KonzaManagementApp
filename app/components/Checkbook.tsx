import React, {useEffect, useRef, useState} from 'react';
import {HotTable} from '@handsontable/react';
import Handsontable from 'handsontable';
import {dispatch, Event, registerRendererOnce} from '../events/events';
import {CheckbookEntry, CheckbookEntryStatus} from '../entities/checkbook/CheckbookEntry';
import {uuid} from 'uuidv4';
import {useDebouncedCallback} from 'use-debounce';
import {currentDate, currentTimestamp, formatDate, parseDate} from '../utils/dateUtil';
import {getFloatOrZero, numberWithCommas} from '../utils/checkbookUtil';
import spacetime from 'spacetime';
const { dialog } = require('electron').remote


interface CellEditChange {
  rowId: string,
  row: number;
  column: string;
  oldValue: any;
  newValue: any;
}

export default function Checkbook(props : any) {
  const hotTable = useRef<Handsontable>();
  const entriesRef = useRef<{ [key: string]: CheckbookEntry }>({});
  const [entriesLoaded, setEntriesLoaded] = useState(false);
  const unsavedIds = useRef<{[key : string] : string}>({});
  const accountId = useRef<string>('');
  const addedListeners = useRef<boolean>(false);
  const [reconciledBalance, setReconciledBalance] = useState<number>(0);
  const [totalEntries, setTotalEntries] = useState<number>(0);
  const [reconciledEntries, setReconciledEntries] = useState<number>(0);
  const tags = useRef<string[]>([]);
  const payees = useRef<string[]>([]);


  const dispatchEntryUpdateInstant = () => {
    const toSave : CheckbookEntry[] = [];
    Object.keys(unsavedIds.current).forEach(key => {
      const entry = entriesRef.current[key];
      if(entry) {
        toSave.push(entry);
      } else {
        console.error("Entry was not found?", key)
      }
      delete unsavedIds.current[key];
    })
    dispatch(Event.SaveCheckbookEntry, toSave);
    toSave.forEach(t => entriesRef.current[t._id].isNew = false);
  };

  const [dispatchEntryUpdate] = useDebouncedCallback(dispatchEntryUpdateInstant, 1000
  );

  useEffect(() => {
    accountId.current = props.match.params.id;
    registerRendererOnce(Event.AllCheckbookEntries, (_, args : any[]) => {
      const entries : CheckbookEntry[] = args[0];
      const obj : any = {};
      entries.forEach(e => {
        e.isNew = false;
        obj[e._id] = e;
      });
      entriesRef.current = obj;
      setEntriesLoaded(true);
    })
    dispatch(Event.AllCheckbookEntries, accountId.current);
  }, [])

  useEffect(() => {
    if(!hotTable.current || hotTable.current.isDestroyed) {
      return;
    }
    loadEntriesIntoTable();
  }, [entriesLoaded])

  useEffect(() => {
    if(!hotTable.current || hotTable.current.isDestroyed) {
      return;
    }
  })

  const [loadEntriesCallback] = useDebouncedCallback(() => {
      loadEntriesIntoTable();
  }, 300)

  const onAmountChange = () => {
    loadEntriesCallback();
  };

  const loadEntriesIntoTable = () => {
    if(!hotTable.current || hotTable.current.isDestroyed) {
     return;
    }
    let data: any[] = [];
    const values =  Object.values(entriesRef.current).filter(w => !w.isDeleted);
    values.sort((a, b) => a.timestamp - b.timestamp);
    let balance = 0;
    let reconciledBalance = 0;
    let reconciledEntries = 0;
    let totalEntries = 0;
    let tags : any = {};
    let payees : any = {};

    values.forEach((entry, index) => {
      if(entry.status === CheckbookEntryStatus.Reconciled) {
        reconciledBalance += getFloatOrZero(entry.credit)
        reconciledBalance += getFloatOrZero(entry.debit)
        reconciledEntries++;
      }

      if(entry.tag && isNaN(parseFloat(entry.tag))) {
        if (!tags[entry.tag]) {
          tags[entry.tag] = 1;
        } else {
          tags[entry.tag] += 1;
        }
      }

      if(entry.payee) {
        if (!payees[entry.payee]) {
          payees[entry.payee] = 1;
        } else {
          payees[entry.payee] += 1;
        }
      }

      totalEntries++;
      balance += getFloatOrZero(entry.credit)
      balance += getFloatOrZero(entry.debit)
      entriesRef.current[entry._id].index = index;
      data.push({
        _id: entry._id,
        tag: entry.tag,
        date: entry.date,
        payee: entry.payee,
        credit: entry.credit,
        debit: entry.debit,
        balance : balance,
        status : entry.status === CheckbookEntryStatus.Reconciled ? 'R' : '',
      })
    });
    data = data.reverse();
    // Push an empty row.
    if(data[0] && (data[0].credit != null || data[0].debit != null)) {
      data.unshift({
        _id : uuid(),
        tag : '',
        date : formatDate(currentDate()),
        payee : '',
        credit : null,
        debit : null
      })
    }

    hotTable.current!.loadData(data);
    loadAutoCompletes(tags, payees);
    setHeaderEntries(reconciledBalance, reconciledEntries, totalEntries);
  };

  const [setHeaderEntries] = useDebouncedCallback((reconciledBalance : number, reconciledEntries: number,  totalEntries : number) => {
    setReconciledBalance(parseFloat(reconciledBalance.toFixed(2)));
    setReconciledEntries(reconciledEntries);
    setTotalEntries(totalEntries);
  }, 50)

  const [loadAutoCompletes] = useDebouncedCallback((tagsObj : any, payeesObj : any) => {
    const sort = (obj : any) => {
      let keys = Object.keys(obj);
      keys = keys.sort((a, b) => obj[a] - obj[b])
      return keys;
    }
    tags.current = sort(tagsObj);
    payees.current = sort(payeesObj);
  }, 300);

  useEffect(() => {
    if(!hotTable.current || hotTable.current.isDestroyed) {
      return;
    }
    if(addedListeners.current) {
      return;
    }

    addedListeners.current = true;

    console.log('Adding hooks');
    hotTable.current.addHook('beforeRemoveRow', (index) => {
      return onDelete(index);
    });

    hotTable.current.addHook('afterChange', (changes, source) => {
      console.log(changes, source);
      if (source == 'edit' && changes) {
        const change = changes[0];
        const row = change[0];
        const column = change[1].toString();
        const oldValue = change[2];
        const newValue = change[3];

        let id = getDataAtCell(row, '_id');
        if (!id) {
          id = uuid();
          setDataAtCell(row, '_id', id)
        }

        if(oldValue === newValue) {
          return;
        }

        onCellChange({
          rowId: id,
          row,
          column,
          oldValue,
          newValue
        });
      }
    });
  }, [hotTable.current]);

  const onCellChange = (change: CellEditChange) => {

    if(change.column === '_id') {
      return;
    }

    if (!entriesRef.current[change.rowId]) {
      entriesRef.current[change.rowId] = {
        accountId: accountId.current,
        status: CheckbookEntryStatus.None,
        balance: 0, credit: 0, date: formatDate(currentDate()), timestamp : currentTimestamp(), debit: 0, _id: change.rowId, payee: "", tag: "",
        isNew : true, index : hotTable.current!.countRows()
      }
    }

    let entry = entriesRef.current[change.rowId];
    entry = setPropertyFromColumn(entry, change);
    entriesRef.current[change.rowId] = entry;
    unsavedIds.current[change.rowId] = entry._id;

    if(change.column === 'payee' || change.column === 'tag') {
      entry = fixAutoComplete(entry);
    }

    dispatchEntryUpdate();

    // Re-calculate balance due to date being changed.
    if(change.column === 'date' && (entry.credit || entry.debit)) {
      onAmountChange();
    }
    else if(change.column === "credit" ) {
      onAmountChange();
    }
    else if(change.column === "debit") {
      onAmountChange();
    }
  };

  const fixAutoComplete = (entry : CheckbookEntry) : CheckbookEntry => {
    if(entry.payee === 'payroll') {
      entry.payee = 'Payroll';
    }
    if(entry.tag === 'd') {
      entry.tag = 'Debit'
    }
    return entry;
  };

  const onDelete = (row : number) => {
    const confirm = dialog.showMessageBoxSync({
      message  : 'Are you sure you want to hide this row? Row will be hidden and removed from all calculations.',
      buttons : ["Yes", "Cancel"]
    })
    if(confirm !== 0) {
      return false;
    }
    const id = hotTable.current!.getDataAtCell(row, 0);
    entriesRef.current[id].isDeleted = true;
    unsavedIds.current[id] = id;
    dispatchEntryUpdateInstant();
    loadEntriesCallback();
    return true;
  };

  const setPropertyFromColumn = (entry: CheckbookEntry, change: CellEditChange) : CheckbookEntry => {
    console.log(change);
    switch (change.column) {
      case 'tag':
        entry.tag = change.newValue;
        break;
      case 'status':
        entry.status = change.newValue === 'R' ? CheckbookEntryStatus.Reconciled : CheckbookEntryStatus.None
        break;
      case 'date':
        entry.date = formatDate(spacetime(change.newValue).add(1, 'month'));
        entry.timestamp = spacetime(change.newValue).add(1, 'month').epoch;
        break;
      case 'payee':
        entry.payee = change.newValue;
        break;
      case 'credit':
        entry.credit = change.newValue < 0 ? change.newValue * -1 : change.newValue;
        break;
      case 'debit':
        entry.debit = change.newValue > 0 ? change.newValue * -1 : change.newValue;
    }
    return entry;
  };

  const setDataAtCell = (row: number, column: string, value: any) => {
    hotTable.current!.setDataAtRowProp(row, column, value);
  };

  const getDataAtCell = (row: number, column: string) => {
    return hotTable.current!.getDataAtRowProp(row, column);
  };

  const beforeChange = (changes : Handsontable.CellChange[], source : Handsontable.ChangeSource) => {
    if(source !== 'edit') {
      return;
    }

    const map : any = {
      'p' : 'Payroll',
      'd' : 'Debit'
    }

    const newValue = changes[0][3];
    if(map[newValue]) {
      changes[0][3] = map[newValue];
      return;
    }

    if(changes[0][1] === 'date') {
      changes[0][3] = parseDate(newValue);
      console.log('new date', changes[0][3]);
    }

  };

  return (
    <div>
      <section>
        <div className={"container"} style={{paddingTop : '1em', paddingBottom : '1em', paddingLeft : '.5em'}}>
          <p>Total Entries: <strong>
            {numberWithCommas(totalEntries)}
          </strong></p>
          <p>Reconciled Entries: <strong>
            {numberWithCommas(reconciledEntries)}
          </strong></p>
          <p>Reconciled Balance: <strong>
            ${numberWithCommas(reconciledBalance)}
          </strong></p>
        </div>
      </section>
      <div id="hot-app">
        <HotTable
          ref={r => {
            if (!r) {
              return;
            }
            hotTable.current = r.hotInstance
          }}
          filters={true}
          dropdownMenu={true}
          hiddenColumns={{columns: [0]}}
          colHeaders={['Id', 'Tag', 'Date', 'Payee', 'Credit', 'Debit', 'Balance', 'S']}
          colWidths={[1, 25, 25, 50, 25, 25, 25, 7]}
          beforeChange={(changes, source) => {
            console.log(changes, source);
            beforeChange(changes, source);
          }}
          columns={[
            {data: '_id'},
            {data: 'tag', type : 'autocomplete', strict : false, source : (_, process) => {
              return process(tags.current);
              }},
            {data: 'date', type: 'date', dateFormat: 'MM/DD/YYYY'},
            {
              data: 'payee',
              type: 'autocomplete',
              strict: false,
              source: (_, process) => {
                return process(payees.current);
              }
            },
            {
              data: 'credit',
              type: 'numeric',
              numericFormat: {
                pattern: '$0,0.00',
                culture: 'en-US' // this is the default culture, set up for USD
              }
            },
            {
              data: 'debit',
              type: 'numeric',
              numericFormat: {
                pattern: '$0,0.00',
                culture: 'en-US' // this is the default culture, set up for USD
              }
            },
            {data: 'balance', type: 'numeric', readOnly: true, numericFormat: {
                pattern: '$0,0.00',
                culture: 'en-US' // this is the default culture, set up for USD
              }},
            {
              data: 'status',
              type: 'dropdown',
              className: "htMiddle htCenter",
              source: ['', 'R']
            },
          ]}
          stretchH="all"
          contextMenu
          viewportRowRenderingOffset={30}
          rowHeaders
          width="100%" licenseKey="non-commercial-and-evaluation"/>
      </div>
    </div>
  );
}
