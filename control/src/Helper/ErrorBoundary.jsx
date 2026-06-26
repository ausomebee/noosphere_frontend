import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Errors logged by monitoring service in production.
    if (import.meta.env.DEV) {
      console.error("Error caught by ErrorBoundary:", error, errorInfo);
    }
    this.setState({ errorInfo });
  }

  handleTryAgain = () => {
    // Reset so the children re-render without a full page reload.
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "20px",
            textAlign: "center",
            fontFamily: "sans-serif",
          }}
        >
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color: "#111827",
              marginBottom: "8px",
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "#6b7280",
              marginBottom: "24px",
              maxWidth: "480px",
            }}
          >
            An unexpected error occurred. You can try again, or reload the page.
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={this.handleTryAgain}
              style={{
                padding: "10px 24px",
                background: "#fff",
                color: "#111827",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 24px",
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Reload Page
            </button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <details
              style={{
                whiteSpace: "pre-wrap",
                marginTop: "24px",
                textAlign: "left",
                maxWidth: "800px",
                color: "#900",
              }}
            >
              {this.state.error.toString()}
              <br />
              {this.state.errorInfo?.componentStack}
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
