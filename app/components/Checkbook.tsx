import React, {useEffect, useRef, useState} from 'react';
import {HotTable} from '@handsontable/react';
import Handsontable from 'handsontable';
import {dispatch, Event, registerRendererOnce} from '../events/events';
import {CheckbookEntry, CheckbookEntryStatus} from '../entities/checkbook/CheckbookEntry';
import {uuid} from 'uuidv4';
import {useDebouncedCallback} from 'use-debounce';
import {currentDate, currentTimestamp, formatDate, parseDate, timestamp} from '../utils/dateUtil';
import {getFloatOrZero, numberWithCommas} from '../utils/checkbookUtil';
import {showModal} from "./Modal";
import { ErrorBoundary } from '../containers/ErrorBoundary';
import toastr from 'toastr';


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
  const tags = useRef<string[]>([]);
  const payees = useRef<string[]>([]);
  const payeeIsDebitRef = useRef<{[key : string] : number}>({})
  const tagIsDebitRef = useRef<{[key : string] : number}>({})
  const sortedValues = useRef<CheckbookEntry[]>([]);
  const loading = useRef<boolean>(true);
  const newRowId = useRef<string>('');
  const changedRowId = useRef<string>('');

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
    });
    dispatch(Event.AllCheckbookEntries, accountId.current);
  }, [])

  useEffect(() => {
    if(!hotTable.current || hotTable.current.isDestroyed) {
      return;
    }
    loading.current = false;
    loadEntriesIntoTable(false);
  }, [entriesLoaded])

  const [loadEntriesCallback] = useDebouncedCallback((setSelection : boolean) => {
      loadEntriesIntoTable(setSelection);
  }, 200)

  const onAmountChange = (setSelection : boolean) => {
    loadEntriesCallback(setSelection);
  };

  const loadEntriesIntoTable = (setSelection : boolean = false) => {
    if(!hotTable.current || hotTable.current.isDestroyed) {
     return;
    }

    let data: any[] = [];

    if(sortedValues.current.length === 0) {
      const values =  Object.values(entriesRef.current).filter(w => !w.isDeleted).filter(w => {
        if(!w.tag && !w.payee && w.credit === 0 && w.debit === 0)  {
          delete entriesRef.current[w._id];
          return false;
        }
        return true;
      })
      values.sort((a, b) => a.timestamp - b.timestamp);
      sortedValues.current = values;
    }

    let balance = 0;
    let tags : any = {};
    let payees : any = {};

    sortedValues.current.forEach((entry, index) => {

      if(entry.tag && isNaN(parseFloat(entry.tag))) {
        if (!tags[entry.tag]) {
          tags[entry.tag] = 1;
          tagIsDebitRef.current[entry.payee] = entry.debit < 0 ? 1 : -1

        } else {
          tags[entry.tag] += 1;
          tagIsDebitRef.current[entry.payee] += entry.debit < 0 ? 1 : -1
        }
      }

      if(entry.payee) {
        if (!payees[entry.payee]) {
          payees[entry.payee] = 1;
          payeeIsDebitRef.current[entry.payee] = entry.debit < 0 ? 1 : -1
        } else {
          payees[entry.payee] += 1;
          payeeIsDebitRef.current[entry.payee] += entry.debit < 0 ? 1 : -1
        }
      }

      balance += getFloatOrZero(entry.credit)
      balance += getFloatOrZero(entry.debit)
      entriesRef.current[entry._id].index = index;
      data.push({
        _id: entry._id,
        tag: entry.tag,
        date: entry.date,
        payee: entry.payee,
        credit: entry.credit === 0 ? null : entry.credit,
        debit: entry.debit === 0 ? null : entry.debit,
        balance : balance,
        status : entry.status === CheckbookEntryStatus.Reconciled ? 'R' : '',
      })
    });

    data = data.reverse();

    const newRowIndex = data.findIndex(w => w._id === newRowId.current);
    if(newRowIndex !== 0) {
      const newRow = data[newRowIndex];
      if(newRow) {
        data.splice(newRowIndex, 1);
        data.unshift(newRow);
      }
    }

    // Push an empty row.
    if(data[0] && (data[0].credit != null || data[0].debit != null)) {
      data.unshift({
        _id : uuid(),
        tag : '',
        date : currentDate(),
        payee : '',
        credit : null,
        debit : null
      })
    }

    if(loading.current && data.length === 0) {
      data.unshift({
        _id : uuid(),
        tag : 'Loading Data...',
        date : '',
        payee : '',
        credit : null,
        debit : null
      });
      hotTable.current!.loadData(data);
      return;
    }

    if(!loading.current && data.length === 0) {
      data.unshift({
        _id : uuid(),
        tag : '',
        date : currentDate(),
        payee : '',
        credit : null,
        debit : null
      });
      hotTable.current!.loadData(data);
      return;
    }

    hotTable.current!.loadData(data);
    loadAutoCompletes(tags, payees);

    if(setSelection) {
      const selected = hotTable.current!.getSelected();
      if(selected) {
        const row = selected[0][0];
        if(row <= 1) {
          hotTable.current!.selectCell(0, 1);
        }
      }
      return;
    }

    if(changedRowId.current) {
      const changedCellIndex = data.findIndex(w => w._id === changedRowId.current)
      if(changedCellIndex != -1) {
        hotTable.current!.selectCell(changedCellIndex, 2);
      }
    }

  };

  const [loadAutoCompletes] = useDebouncedCallback((tagsObj : any, payeesObj : any) => {
    const sort = (obj : any) => {
      let keys = Object.keys(obj);
      keys = keys.sort((a, b) => obj[a] - obj[b])
      return keys;
    }
    tags.current = sort(tagsObj);
    payees.current = sort(payeesObj);
    console.log('PAYEES REF', payeeIsDebitRef)
  }, 300);

  const onCellChange = (change: CellEditChange) => {

    if(change.column === '_id') {
      return;
    }

    changedRowId.current = change.rowId;

    if (!entriesRef.current[change.rowId]) {
      entriesRef.current[change.rowId] = {
        accountId: accountId.current,
        status: CheckbookEntryStatus.None,
        balance: 0, credit: 0, date: currentDate(), timestamp : currentTimestamp(), debit: 0, _id: change.rowId, payee: "", tag: "",
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

    if(change.column === 'payee' && isDebit(getDataAtCell(change.row, 'tag'), change.newValue)) {
      hotTable.current!.selectCell(change.row, 5);
    }

    dispatchEntryUpdate();

    const tag = getDataAtCell(change.row, 'tag');
    const payee = getDataAtCell(change.row, 'payee');
    const debit = isDebit(tag, payee);
    let errored = false;
    if(debit && change.column === 'credit' && change.newValue != 0) {
      toastr.error(`You entered a credit for a payee or tag that is usually a debit. Please make sure this is correct.`, `Ensure Credit Change For Row ${change.row}`, {
        timeOut : 0,
        "closeButton": true,
      })
      errored = true;
    }
    else if(!debit && change.column === 'debit' && change.newValue != 0) {
      toastr.error(`You entered a debit for a payee or tag that is usually a credit. Please make sure this is correct.`, `Ensure Debit Change For Row ${change.row}`, {
        timeOut : 0,
        "closeButton": true,
      })
      errored = true;
    }

    // Re-calculate balance due to date being changed.
    if(change.column === 'date' && (entry.credit || entry.debit)) {
      sortedValues.current = [];
      onAmountChange(false);
    }
    else if(change.column === "credit") {
      change.row === 0 ? addNewEntry(entry) : onAmountChange(true);
    }
    else if(change.column === "debit") {
      change.row === 0 ? addNewEntry(entry) : onAmountChange(true);
    }

    if(!errored && change.row > 1) {
      showSuccess();
    }

  };

  const [showSuccess] = useDebouncedCallback(() => {
    toastr.success('Successfully updated record.', '', {
      "positionClass": "toast-bottom-right",
      "timeOut": "3000",
      "showDuration": "0",
    })
  }, 300)

  const addNewEntry = (entry : CheckbookEntry) => {
    setDataAtCell(0, '_id', entry._id);
    sortedValues.current.unshift(JSON.parse(JSON.stringify(entry)))
    hotTable.current!.alter('insert_row', 0);
    hotTable.current!.selectCell(0, 1);
    setDataAtCell(0, 'date', currentDate());
    newRowId.current = uuid();
    setDataAtCell(0, '_id', newRowId.current);


    setTimeout(() => {
      let balance = 0;
      let tags : any = {}
      let payees : any = {};
      sortedValues.current.forEach(s => {
        balance += getFloatOrZero(s.credit)
        balance += getFloatOrZero(s.debit)

        if(s.tag && isNaN(parseFloat(s.tag))) {
          if (!tags[s.tag]) {
            tags[s.tag] = 1;
            tagIsDebitRef.current[s.payee] = s.debit < 0 ? 1 : -1
          } else {
            tags[s.tag] += 1;
            tagIsDebitRef.current[s.payee] += s.debit < 0 ? 1 : -1
          }
        }

        if(s.payee) {
          if (!payees[s.payee]) {
            payees[s.payee] = 1;
            payeeIsDebitRef.current[s.payee] = s.debit < 0 ? 1 : -1

          } else {
            payees[s.payee] += 1;
            payeeIsDebitRef.current[s.payee] += s.debit < 0 ? 1 : -1

          }
        }

      });
      let rowId = -1;
      for(let i = 0; i < 10; i++) {
        const id = getDataAtCell(i, "_id");
        if(id === entry._id) {
          rowId = i;
          break;
        }
      }
      if(rowId != -1) {
        setDataAtCell(rowId, 'balance', balance);
      }
      loadAutoCompletes(tags, payees);
    }, 100)

    console.log('debit refs', payeeIsDebitRef)
    dispatchEntryUpdateInstant();

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

  const onDelete = (rows : Set<number>) => {
    const confirm = dialog.showMessageBoxSync({
      message  : `Are you sure you want to hide ${rows.size} row(s)? Row(s) will be hidden and removed from all calculations.`,
      buttons : ["Yes", "Cancel"]
    })
    if(confirm !== 0) {
      return false;
    }
    rows.forEach(r => {
      const id = hotTable.current!.getDataAtCell(r, 0);
      entriesRef.current[id].isDeleted = true;
      unsavedIds.current[id] = id;
    });
    sortedValues.current = [];
    toastr.success(`Successfully deleted ${rows.size} row(s).`, '', {
      "positionClass": "toast-bottom-right",
      "timeOut": "3000",
      "showDuration": "0",
    })
    dispatchEntryUpdateInstant();
    loadEntriesCallback(false);
    return true;
  };

  const setPropertyFromColumn = (entry: CheckbookEntry, change: CellEditChange) : CheckbookEntry => {
    switch (change.column) {
      case 'tag':
        entry.tag = change.newValue;
        break;
      case 'status':
        entry.status = change.newValue === 'R' ? CheckbookEntryStatus.Reconciled : CheckbookEntryStatus.None
        break;
      case 'date':
        entry.date = formatDate(change.newValue);
        entry.timestamp = timestamp(change.newValue);
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

    console.log('beofre change')

    const map : any = {
      'p' : 'Payroll',
      'd' : 'Debit',
      'de' : 'Debit',
      'deb' : 'Debit',
      'pa' : 'Payroll',
      'pay' : 'Payroll'
    }

    const column = changes[0][1];
    const newValue = changes[0][3];
    if(newValue != null && typeof newValue === 'string' && map[newValue.toString().toLowerCase()]) {
      changes[0][3] = map[newValue.toString().toLowerCase()];
      return;
    }

    if(column === 'date') {
      changes[0][3] = parseDate(newValue);
    }

    if(column === 'debit') {
      let parsed = getFloatOrZero(newValue);
      if(parsed > 0) {
        parsed = parsed * -1;
      }
      changes[0][3] = parsed;
    }

    if(column === 'credit') {
      let parsed = getFloatOrZero(newValue);
      if(parsed < 0) {
        parsed = parsed * -1;
      }
      changes[0][3] = parsed;
    }

  };

  const [removeRows] = useDebouncedCallback(() => {
    const rows : Set<number> = new Set<number>();
    const selected = hotTable.current!.getSelected()!;
    selected.forEach((s) => {
      const start = s[0];
      const end = s[2];
      for(let i = start; i <= end; i++) {
        rows.add(i);
      }
    })
    onDelete(rows);
  }, 100)

  const isDebit = (tag : string, payee : string) => {
    tag = tag ? tag.toString().toLowerCase().trim() : tag;
    payee = payee ? payee.toString().toLowerCase().trim() : payee;
    if(!tag && !payee) {
      return false;
    }

    // If there have been more negative transactions than positive ones for this payee, it will be
    // a positive number, so we can assume its a debit
    let debitRefValue = payeeIsDebitRef.current[payee];
    if(debitRefValue && debitRefValue > 0) {
      return true;
    }

    debitRefValue = tagIsDebitRef.current[tag];
    if(debitRefValue && debitRefValue > 0) {
      return true;
    }

    if(tag === 'debit' || payee === 'payroll' || !isNaN(parseInt(tag))) {
      return true;
    }
    // Iterate last 10 values to try to find match and check debit.
    for(let i = 0; i < 10; i++) {
      const val = sortedValues.current[i];
      if(tag && val.tag === tag) {
        return val.debit < 0;
      }
      if(tag && val.payee === payee) {
        return val.debit < 0;
      }
    }

    return false;
  };

  return (
    <React.Fragment>
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
            beforeChange(changes, source);
          }}
          beforeRemoveRow={_ => {
            removeRows();
            return false;
          }}
          outsideClickDeselects={false}
          beforeKeyDown={(e) => {
            if(e.key === 'Delete') {
              const selection = hotTable.current!.getSelected();
              if(!selection) {
                return;
              }
              const start = selection[0][1];
              const end = selection[0][3];
              // entire row selected
              if(start === 1 && end === 6 || start === 6 && end === 1 || start === 7 && end === 1 || start === 1 && end === 7) {
                e.preventDefault();
                e.stopImmediatePropagation();
                removeRows();
              }
            }
          }}
          afterDocumentKeyDown={(e) => {
            let selected = hotTable.current!.getSelected();
            if(!selected) {
              return;
            }

            if(e.key !== "Tab" && e.key !== "ArrowRight") {
              return;
            }

            const row = selected[0][0];
            const column = selected[0][3];

            console.log(row, column);
            if(column === 3) {
              const tag = getDataAtCell(row, 'tag');
              const payee = getDataAtCell(row, 'payee');
              if (isDebit(tag, payee)) {
                hotTable.current!.selectCell(row, 4);
              }
            }
          }}
          afterChange={(changes, source) => {
            try {
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

                if (oldValue === newValue) {
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
            } catch (e) {
              ErrorBoundary.showErrorModal(e);
            }
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
          contextMenu={{
            items : {
              'addMemo' : {
                name : () => 'Set Memo',
                callback(_, selection) {
                  const row = selection[0].start.row;
                  const id = getDataAtCell(row, '_id');
                  const entry = entriesRef.current[id];
                  showModal({
                    title : 'Add Memo To Entry',
                    inputs : [{name : 'memo', placeholder : 'Enter Memo', value : entry.memo}],
                    onSave : (values) => {
                      entriesRef.current[id].memo = values["memo"];
                      unsavedIds.current[id] = id;
                      dispatchEntryUpdateInstant()
                      return Promise.resolve();
                    }
                  })
                }
              },
              'removeRows' : {
                name : () => 'Remove selected rows',
                callback() {
                  removeRows();
                }
              },
            }
          }}
          rowHeaders
          width="100%" licenseKey="non-commercial-and-evaluation"/>
      </div>
    </React.Fragment>
  );
}
