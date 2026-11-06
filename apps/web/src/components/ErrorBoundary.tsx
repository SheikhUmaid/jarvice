import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logActivity } from '../store/activity';

interface Props {
  /** Shown instead of the children after a render error. */
  fallback: (error: Error, reset: () => void) => ReactNode;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Contains a crashing mode (e.g. a lost WebGL context) so the rest of the shell keeps working. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[JARVIS] module crashed', error, info.componentStack);
    logActivity('system', 'Module crashed', { level: 'error', detail: error.message });
  }

  private reset = () => this.setState({ error: null });

  override render(): ReactNode {
    return this.state.error
      ? this.props.fallback(this.state.error, this.reset)
      : this.props.children;
  }
}
