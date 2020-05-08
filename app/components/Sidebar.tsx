import React from "react";
import { Link } from 'react-router-dom';

export function Sidebar() {
  return (<aside className="menu" id="sidebar">
      <p className="menu-label" style={{color: '#00d1b2', paddingBottom: '1em', fontSize: 'large'}}>
        Konza Pizza Management
      </p>
      <p className="menu-label" style={{}}>
        General
      </p>
      <ul className="menu-list">
        <li><Link to={'/'}>Dashboard</Link></li>
      </ul>
      <p className="menu-label">
        Accounting
      </p>
      <ul className="menu-list">
        <li><Link to={"/checkbook"}>Checkbook</Link></li>
        <li><Link to={"/import"}>Import Money File</Link></li>
        <li><Link to={"/import/bank"}>Import Bank Statement</Link></li>
        <li><Link to={"/import/payroll"}>Import Payroll</Link></li>
      </ul>
    </aside>
  )
}
