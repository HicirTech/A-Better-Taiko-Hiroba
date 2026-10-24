import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  /** What stands in the children's place once they threw as they drew. */
  readonly fallback: (error: unknown) => ReactNode;
  readonly onError?: ((error: unknown) => void) | undefined;
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  /** Wrapped, as a thrown value may itself be null or undefined. */
  readonly thrown: { readonly error: unknown } | null;
}

/** Draws `fallback` in place of children that threw as they drew; a new `key` tries them again. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { thrown: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { thrown: { error } };
  }

  override componentDidCatch(error: unknown): void {
    this.props.onError?.(error);
  }

  override render(): ReactNode {
    const { thrown } = this.state;
    return thrown === null ? this.props.children : this.props.fallback(thrown.error);
  }
}
