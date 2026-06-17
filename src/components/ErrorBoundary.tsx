import React from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { STORAGE_KEY } from '../lib/utils';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('ErrorBoundary:', error, info.componentStack); }
  render() {
    if (!this.state.hasError) return this.props.children;
    const reset = () => this.setState({ hasError: false, error: null });
    const clearData = () => {
      if (window.confirm('Kustuta kõik salvestatud projektid?')) {
        try { localStorage.removeItem(STORAGE_KEY); } catch { }
        window.location.reload();
      }
    };
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8" role="alert">
        <div className="bg-white rounded-2xl border border-rose-200 shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Midagi läks valesti</h1>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">Rakenduses tekkis ootamatu viga. Proovi laadida leht uuesti.</p>
          {this.state.error && (
            <details className="text-left mb-6">
              <summary className="text-xs text-slate-400 cursor-pointer mb-2">Tehniline info</summary>
              <pre className="text-[10px] text-rose-700 bg-rose-50 p-3 rounded-lg overflow-auto max-h-32 border border-rose-100 font-mono whitespace-pre-wrap">{this.state.error.message}</pre>
            </details>
          )}
          <div className="flex flex-col gap-3">
            <button onClick={reset} className="btn-primary flex items-center justify-center gap-2 py-2.5"><RefreshCw className="w-4 h-4" /> Proovi uuesti</button>
            <button onClick={clearData} className="btn-secondary flex items-center justify-center gap-2 py-2.5 !text-rose-600"><Trash2 className="w-4 h-4" /> Kustuta andmed ja taasta</button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
