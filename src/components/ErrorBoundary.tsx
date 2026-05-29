import React from 'react';
import { AskIndiaLogo } from './AskIndiaLogo';
import { env } from '../utils/env';

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now().toString(36)}`,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console in dev
    if (env.isDev) {
      console.error('[ErrorBoundary]', error, info);
    }
    // In production, send to your error service if configured
    if (env.isProd && env.sentryDsn) {
      // Sentry.captureException(error, { extra: info });
      // (wire up Sentry SDK here when installed)
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorId: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <AskIndiaLogo size={44} showText={true} textClass="text-2xl" />
            </div>

            {/* Illustration */}
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">😵</span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              An unexpected error occurred. Our team has been notified.
              {env.isDev && this.state.error && (
                <span className="block mt-2 font-mono text-red-600 text-xs bg-red-50 rounded-lg p-2 text-left">
                  {this.state.error.message}
                </span>
              )}
            </p>

            {this.state.errorId && (
              <p className="text-xs text-slate-400 mb-5">
                Error ID: <code className="font-mono">{this.state.errorId}</code>
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
              >
                🏠 Go to Homepage
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-medium px-6 py-3 rounded-xl transition-colors text-sm"
              >
                🔄 Try Again
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-6">
              Need help?{' '}
              <a
                href={`mailto:${env.supportEmail}`}
                className="text-accent-600 hover:underline font-medium"
              >
                {env.supportEmail}
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
