import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { initAnalytics } from './lib/analytics';
import { captureUtmFromUrl } from './lib/utm';
import App from './App.tsx';
import './index.css';

initAnalytics();
captureUtmFromUrl();

class RootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem', fontFamily: 'system-ui, sans-serif', background: '#fafaf9' }}>
          <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Something went wrong</h1>
            <p style={{ color: '#78716c', marginBottom: '1.5rem' }}>
              The page failed to load. Try refreshing — if it keeps happening, clear site data for this app.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ background: '#1c1917', color: '#fff', border: 'none', borderRadius: '9999px', padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);
