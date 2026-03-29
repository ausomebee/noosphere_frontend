import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // Errors logged by monitoring service in production
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "20px", textAlign: "center" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#111827", marginBottom: "8px" }}>Something went wrong</h2>
          <p style={{ fontSize: "16px", color: "#6b7280", marginBottom: "24px" }}>An unexpected error occurred. Please refresh the page.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "10px 24px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
