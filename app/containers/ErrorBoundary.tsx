import React, { ErrorInfo } from 'react';
import { showModal } from '../components/Modal';

export class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: any) {
    return { hasError: true };
  }

  componentDidCatch(error : Error, _: ErrorInfo) {
    ErrorBoundary.showErrorModal(error);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }

  public static showErrorModal(err : Error) {
    showModal({
      onSave(_): Promise<any> {
        return Promise.resolve(undefined);
      },
      title : 'An error has occurred.',
      body : <div>
        {err.message}
      </div>
    })
  }

}
