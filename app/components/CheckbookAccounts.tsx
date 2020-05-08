import {HotTable} from "@handsontable/react";
import React, {useEffect, useRef} from "react";
import Handsontable from "handsontable";
import ReactDOMServer from 'react-dom/server';
import {CheckbookAccount} from "../entities/checkbook/CheckbookAccount";
import {uuid} from "uuidv4";
import { currentDate, currentTimestamp, formatDate } from '../utils/dateUtil';
import {dispatch, Event, registerRendererOnce} from "../events/events";

const { dialog } = require('electron').remote


export const CheckbookAccounts = (props : any) => {

  const hotTable = useRef<Handsontable>();

  const accounts = useRef<CheckbookAccount[]>([])

  useEffect(() => {
    registerRendererOnce(Event.AllCheckbookAccounts, (_, args : any[]) => {
      accounts.current = args[0];
      accounts.current = accounts.current.map(w => {
        w.isNew = false;
        return w;
      });
      accounts.current = accounts.current.sort((a, b) => a.timestamp - b.timestamp)
      loadData();
    })
    dispatch(Event.AllCheckbookAccounts);
  }, [])

  useEffect(() => {
    if(!hotTable.current || hotTable.current.isDestroyed) {
      return;
    }
    loadData();
  }, [hotTable.current])

  const loadData = () => {
    if(!hotTable.current || hotTable.current.isDestroyed) {
      return;
    }
    const rows = accounts.current.map(a => {
      return {
        _id: a._id,
        name: a.name,
        balance: a.balance,
        created: a.created,
        lastUpdated: a.lastUpdated,
        actions: ReactDOMServer.renderToString(<button
          className={"button is-small is-primary is-light cell-button"}>View</button>),
      }
    })
    hotTable.current!.loadData(rows);
  };

  const save = () => {
    dispatch(Event.SaveCheckbookAccounts, accounts.current);
  };

  useEffect(() => {
    if(!hotTable.current || hotTable.current.isDestroyed) {
      return;
    }
    hotTable.current.addHook('afterSelection', (row: number, column: number) => {
      if (column === 5) {
        onViewClick(row);
      }
    });
    hotTable.current.addHook('beforeRemoveRow', (index) => {
      return onDelete(index);
    });
    hotTable.current.addHook('afterChange', (changes, source) => {
      if (source == 'edit' && changes) {
        const change = changes[0];
        const row = change[0];
        const column = change[1].toString();
        const newValue = change[3];

        if(column === 'name') {
          const id = hotTable.current!.getDataAtCell(row, 0);
          const index = accounts.current.findIndex(w => w._id === id)
          accounts.current[index].isNew = false;
          accounts.current[index].name = newValue;
          console.log('after change id', id);
          save();
        }

      }
    });
  }, [hotTable.current])

  const onDelete = (row : number) => {
    const confirm = dialog.showMessageBoxSync({
      message  : 'Are you sure you want to delete this account?',
      buttons : ["Yes", "Cancel"]
    })
    if(confirm !== 0) {
      return false;
    }
    const confirm2 = dialog.showMessageBoxSync({
      message  : 'Click Confirm Deletion to delete this account and all its entries.',
      buttons : ["Confirm Deletion", "Cancel"]
    })
    if(confirm2 !== 0) {
      return false;
    }
    const id = hotTable.current!.getDataAtCell(row, 0);
    const index = accounts.current.findIndex(w => w._id === id)
    accounts.current[index].isDeleted = true;
    save();
    return true;
  };

  const onViewClick = (row : number) => {
    const id = hotTable.current!.getDataAtCell(row, 0);
    props.history.replace(`/checkbook/${id}`);
  };

  return <div id="hot-app">
    <HotTable
      ref={r => {
        if (!r) {
          return;
        }
        hotTable.current = r.hotInstance
      }}
      hiddenColumns={{columns: [0]}}
      colHeaders={['Id', 'Name', 'Balance', 'Created', 'Last Updated', 'Actions']}
      columns={[
        {data: '_id'},
        {data: 'name', className: "htMiddle"},
        {
          data: 'balance', readOnly: true, className: "htLeft htMiddle", type: 'numeric', numericFormat: {
            pattern: '$0,0.00',
            culture: 'en-US' // this is the default culture, set up for USD
          }
        },
        {data: 'created', className: "htMiddle", type: 'date', dateFormat: 'MM/DD/YYYY', readOnly: true},
        {data: 'lastUpdated', className: "htMiddle", type: 'date', dateFormat: 'MM/DD/YYYY', readOnly: true},
        {data: 'actions', renderer: 'html', readOnly: true},
      ]}
      stretchH="all"
      contextMenu
      rowHeaders
      width="100%" licenseKey="non-commercial-and-evaluation"/>
    <div style={{"padding": "1em"}}>
      <button className={"button is-small is-primary is-light"} onClick={() => {
        accounts.current.push({_id: uuid(), isNew : true, isDeleted : false, balance: 0, created: currentDate(), lastUpdated:
            currentDate(), name: "Replace Name Here", timestamp: currentTimestamp()})
        save();
        loadData();
      }}>Add New Account</button>
    </div>
  </div>
};
