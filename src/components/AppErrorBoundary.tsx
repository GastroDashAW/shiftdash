import { Component, type ErrorInfo, type ReactNode } from 'react';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10 text-foreground">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
            <h1 className="font-heading text-2xl font-semibold">App konnte nicht geladen werden</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Beim Rendern ist ein Fehler aufgetreten. Bitte lade die Seite neu.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Neu laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
