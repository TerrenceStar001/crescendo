import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.btnRef = React.createRef();
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.error && !prevState.error) {
      setTimeout(() => this.btnRef.current?.focus(), 0);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="canvas-loading" style={{ flexDirection: 'column', gap: '1rem' }} role="alert" aria-live="assertive">
          <p>Something went wrong loading this view.</p>
          <button
            ref={this.btnRef}
            className="main__icon-btn"
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            onClick={() => this.setState({ error: null })}
            aria-label="Try again"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}