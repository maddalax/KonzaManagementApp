import React, {useEffect, useState} from "react"
import {uuid} from "uuidv4";
import ReactDOM from 'react-dom';

export interface ModalProps {
  title : string
  onSave : (values : {[key : string] : any}) => Promise<any>;
  onCancel? : () => Promise<any>;
  body? : any,
  inputs? : {name : string, value? : string, placeholder : string}[]
}

export const Modal = (props : ModalProps) => {

  const [inputValues, setInputValues] = useState<{[key : string] : any}>({})

  useEffect(() => {
    if(!props.inputs) {
      return;
    }
    setInputValues(prev => {
      props.inputs!.forEach(i => {
        prev[i.name] = i.value || '';
      });
      return {...prev};
    })
  }, [props.inputs])

  const onChange = (name : string, e : any) => {
    const value = e.target.value;
    setInputValues(prev => {
      prev[name] = value;
      return {...prev}
    })
  }

  useEffect(() => {
    console.log('input values', inputValues);
  }, [inputValues])

  const onSave = async () => {
    props.onSave && await props.onSave(inputValues);
  };

  return <div className="modal is-active">
    <div className="modal-background" />
    <div className="modal-card">
      <header className="modal-card-head">
        <p className="modal-card-title">{props.title}</p>
        <button className="delete" onClick={props.onCancel} aria-label="close" />
      </header>
      <section className="modal-card-body">
        {props.body && props.body}
        {props.inputs && inputValues && props.inputs.map(i => {
          return <input key={i.name} className="input" type="text" placeholder={i.placeholder} value={inputValues[i.name]} onChange={(e) => onChange(i.name, e)}/>
        })}
      </section>
      <footer className="modal-card-foot">
        <button className="button is-primary is-light" onClick={onSave}>OK</button>
        <button className="button" onClick={props.onCancel}>Cancel</button>
      </footer>
    </div>
  </div>
}

export const showModal = (props : ModalProps) => {
  const container = document.createElement("div") as any;
  const id = uuid();
  container.setAttribute("id", id);
  document.body.appendChild(container);

  const onSave = async (values : {[key : string] : any}) => {
    props.onSave && await props.onSave(values);
    ReactDOM.unmountComponentAtNode(container);
  };

  const close = async () => {
    props.onCancel && await props.onCancel();
    ReactDOM.unmountComponentAtNode(container);
  }

  ReactDOM.render(
    <Modal {...props} onCancel={close} onSave={onSave}/>,
    container
  );
};
