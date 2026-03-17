import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let isFirestoreError = false;
      let errorMessage = "An unexpected error occurred.";
      
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.operationType) {
            isFirestoreError = true;
            errorMessage = "There was a problem syncing your data. Please check your connection or try again later.";
          }
        }
      } catch (e) {
        // Not a JSON error message
      }

      return (
        <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-raised border border-red/20 rounded-2xl p-8 max-w-md w-full space-y-4"
          >
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red/10 rounded-full flex items-center justify-center text-red">
                <AlertTriangle size={32} />
              </div>
            </div>
            <h2 className="text-2xl font-serif font-bold text-text-primary">System Error</h2>
            <p className="text-text-secondary text-sm leading-relaxed">
              {errorMessage}
            </p>
            {isFirestoreError && (
              <p className="text-xs text-text-tertiary mt-4 p-3 bg-surface rounded-lg border border-border text-left font-mono overflow-auto max-h-32">
                {this.state.error?.message}
              </p>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 w-full bg-accent text-bg font-bold py-3 rounded-xl hover:opacity-90 transition-all active:scale-95"
            >
              Reload System
            </button>
          </motion.div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
