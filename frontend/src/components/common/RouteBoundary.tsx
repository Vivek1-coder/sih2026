import { Component, type ReactNode } from 'react';
import Header from "../layout/header";
import { ui } from '../../i18n';
export default class RouteBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <><Header /><main className="route-loading" role="alert"><p>{ui('errors:routeFailed')}</p><button className="button primary" onClick={() => window.location.reload()}>{ui('common:retry')}</button></main></> : this.props.children;
  }
}
