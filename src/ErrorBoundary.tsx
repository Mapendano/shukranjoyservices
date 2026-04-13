import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-cream p-4 font-sans">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full text-center border border-red-100">
            <h2 className="text-2xl font-serif text-red-600 mb-4">Oups ! Une erreur est survenue.</h2>
            <p className="text-gray-600 mb-6">
              Nous sommes désolés, mais un problème technique est survenu. Veuillez réessayer.
            </p>
            <button
              className="bg-gold-500 text-white px-6 py-2 rounded-sm hover:bg-gold-600 transition-colors"
              onClick={() => window.location.reload()}
            >
              Rafraîchir la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
