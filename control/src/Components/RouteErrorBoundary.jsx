import React from "react";

class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error("Route error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center", padding: "20px" }}>
          <h2 style={{ fontSize: "1.5rem", color: "#374151", marginBottom: "8px" }}>Something went wrong</h2>
          <p style={{ color: "#6b7280", marginBottom: "24px" }}>An unexpected error occurred on this page.</p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{ padding: "10px 24px", background: "#1e40af", color: "#fff", border: "none", borderRadius: "6px", fontSize: "1rem", cursor: "pointer" }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default RouteErrorBoundary;
