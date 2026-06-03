import * as React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 顶层错误边界。捕获子组件渲染时的异常，渲染降级 UI，
 * 避免 Canvas / 文件读取 / localStorage 抛错时整个 App 白屏。
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 p-8">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl p-10 text-center border border-zinc-200">
          <div className="w-16 h-16 mx-auto bg-red-500 text-white rounded-2xl flex items-center justify-center text-3xl shadow-lg">
            <i className="fas fa-bolt"></i>
          </div>
          <h1 className="mt-6 text-2xl font-black text-zinc-900">出错了</h1>
          <p className="mt-3 text-sm text-zinc-500 font-medium">
            渲染过程中遇到意外错误。你可以先重试，必要时刷新页面（会清空未保存的图片）。
          </p>
          <pre className="mt-5 p-4 bg-zinc-50 rounded-2xl text-left text-[11px] text-zinc-600 overflow-auto max-h-40 font-mono border border-zinc-100">
            {this.state.error?.message ?? '未知错误'}
          </pre>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={this.handleReset}
              className="py-3 rounded-2xl border-2 border-zinc-900 text-zinc-900 font-black text-sm hover:bg-zinc-900 hover:text-white transition-all"
            >
              重试
            </button>
            <button
              onClick={this.handleReload}
              className="py-3 py-3 rounded-2xl bg-red-500 text-white font-black text-sm hover:bg-red-600 transition-all"
            >
              刷新页面
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
