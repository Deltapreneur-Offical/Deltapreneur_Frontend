import { Component } from 'react';

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Route render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 px-6 py-12 text-center overflow-auto"
          style={{
            background: 'linear-gradient(165deg, #f8fafc 0%, #eef2ff 42%, #f1f5f9 100%)',
          }}
          role="alert"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white/95 px-8 py-10 shadow-xl shadow-indigo-100/50 backdrop-blur-sm"
          >
            <div className="text-5xl mb-4" aria-hidden>
              ⚠️
            </div>
            <h2 className="font-display text-2xl font-semibold text-gray-900 m-0">
              Something went wrong
            </h2>
            <p className="text-sm text-gray-600 max-w-sm mx-auto mt-3 mb-6 leading-relaxed">
              Please refresh the page. If the problem continues, try signing in again or return to your dashboard.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3">
              <button
                type="button"
                className="btn-glow flex-1"
                onClick={() => window.location.reload()}
              >
                Refresh page
              </button>
              <button
                type="button"
                className="btn-glow flex-1"
                onClick={() => {
                  window.location.href = '/dashboard';
                }}
              >
                Go to dashboard
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-6 text-left text-[0.72rem] text-gray-600 max-h-40 overflow-auto whitespace-pre-wrap bg-red-50 p-4 rounded-lg border border-red-100">
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
