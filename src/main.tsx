import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('应用渲染失败', error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <section className="mx-auto mt-16 max-w-2xl rounded-2xl border border-red-400/30 bg-red-500/10 p-6 shadow-2xl">
          <h1 className="text-2xl font-bold">页面启动失败</h1>
          <p className="mt-3 text-sm text-red-100">应用捕获到了一个前端错误，所以没有继续显示黑屏。</p>
          <pre className="mt-5 max-h-80 overflow-auto rounded-xl bg-black/40 p-4 text-xs text-red-100">
            {this.state.error.stack || this.state.error.message}
          </pre>
        </section>
      </main>
    );
  }
}

const root = document.getElementById('root');

if (!root) {
  document.body.innerHTML = '<main style="padding:24px;color:white;background:#020617;min-height:100vh">缺少 root 节点，应用无法启动。</main>';
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
