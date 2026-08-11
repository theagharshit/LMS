import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="min-h-screen bg-natural-bg grid place-items-center p-6" role="alert">
        <section className="w-full max-w-lg rounded-3xl border border-natural bg-natural-card p-8 text-center shadow-lg">
          <AlertTriangle
            className="mx-auto mb-4 text-natural-secondary"
            size={42}
            aria-hidden="true"
          />
          <h1 className="font-serif-heading text-2xl text-natural-dark">
            Something needs a quick reset
          </h1>
          <p className="mt-3 text-sm text-natural-light">
            Your data is safe. Retry this view, or refresh the page if the problem continues.
          </p>
          <button
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-natural-accent px-5 py-3 font-semibold text-white"
            onClick={() => this.setState({ error: null })}
          >
            <RefreshCw size={17} aria-hidden="true" /> Retry
          </button>
        </section>
      </main>
    );
  }
}
