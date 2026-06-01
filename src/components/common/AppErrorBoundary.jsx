import { Component } from 'react';

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Route render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 px-6 py-16 bg-gradient-to-b from-slate-50 to-indigo-50/50 text-center">
          <div className="text-4xl" aria-hidden>⚠️</div>
          <h2 className="font-display text-xl font-semibold text-gray-900 m-0">
            Something went wrong
          </h2>
          <p className="text-sm text-gray-600 max-w-md m-0">
            Please refresh the page. If the problem continues, try signing in again.
          </p>
          <button
            type="button"
            className="btn-glow mt-2"
            onClick={() => window.location.reload()}
          >
            Refresh page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
