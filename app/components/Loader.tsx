import spinner from "./../images/spinner.svg"
import React from "react";
import ReactDOM from "react-dom";

export const Loader = () => {
  return <div className="preloader">
    <img src={spinner} alt="spinner"/>
  </div>
}

export const showLoader = () => {
  const element = document.getElementById('page-loader');
  if(element) {
    ReactDOM.render(
      <Loader/>,
      element
    );
  } else {
    const container = document.createElement("div") as any;
    const id = 'page-loader';
    container.setAttribute("id", id);
    document.body.appendChild(container);
    ReactDOM.render(
      <Loader/>,
      container
    );
  }
};

export const removeLoader = () => {
  const element = document.getElementById('page-loader');
  element && ReactDOM.unmountComponentAtNode(element);
};
