"use client";

import React from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  children: React.ReactNode;
  /** Custom fallback label shown in the recovery UI */
  label?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

/**
 * ErrorBoundary
 * Wraps any subtree and catches React render errors.
 * Shows a calm recovery screen instead of a white/blank page.
 *
 * Usage:
 *   <ErrorBoundary label="Dashboard">
 *     <DashboardClient />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : null,
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // Structured log — swap for Sentry.captureException later
    console.error("[ErrorBoundary] Caught render error", {
      error: error instanceof Error ? error.message : String(error),
      componentStack: info.componentStack?.slice(0, 300),
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const label = this.props.label ?? "this section";

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
        </div>

        <h2 className="text-base font-semibold text-foreground mb-1.5">
          Something interrupted {label}.
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs mb-6 leading-relaxed">
          Your work is safe. This was an unexpected display error — not a data loss.
          Retry when ready.
        </p>

        <button
          onClick={this.handleRetry}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>

        {process.env.NODE_ENV !== "production" && this.state.errorMessage && (
          <p className="mt-6 text-[11px] text-muted-foreground/50 font-mono max-w-sm break-all">
            {this.state.errorMessage}
          </p>
        )}
      </div>
    );
  }
}
