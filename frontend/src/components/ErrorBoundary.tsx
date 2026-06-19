import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMsg: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full border-[3px] border-ink p-8 bg-white shadow-[8px_8px_0px_0px_#2d2d2d] wobbly-md">
            <h1 className="text-4xl font-bold font-kalam mb-4 text-accent">Oops! A scribble went wrong.</h1>
            <p className="text-xl mb-6 font-patrick">{this.state.errorMsg}</p>
            <button 
              onClick={() => window.location.href = '/'}
              className="px-6 py-2 border-[3px] border-ink bg-[#fff9c4] font-bold text-xl hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#2d2d2d] transition-transform wobbly-lg"
            >
              Back to Safety
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
