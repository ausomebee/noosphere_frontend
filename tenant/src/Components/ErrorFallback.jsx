import React from "react";

const ErrorFallback = ({
  message = "Something went wrong. Please try again.",
  onRetry,
}) => (
  <div style={styles.container}>
    <div style={styles.card}>
      <div style={styles.iconWrap}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="24" fill="#FEF3F2" />
          <circle cx="24" cy="24" r="16" fill="#FEE4E2" />
          <path
            d="M24 18v5m0 4h.01"
            stroke="#D92D20"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h3 style={styles.title}>Oops!</h3>
      <p style={styles.message}>{message}</p>
      {onRetry && (
        <button style={styles.button} onClick={onRetry}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginRight: 6 }}
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Try Again
        </button>
      )}
    </div>
  </div>
);

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "300px",
    padding: "32px 16px",
    width: "100%",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "40px 32px",
    maxWidth: "400px",
    width: "100%",
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #f2f4f7",
    boxShadow: "0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)",
  },
  iconWrap: {
    marginBottom: "20px",
  },
  title: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#101828",
    margin: "0 0 8px",
  },
  message: {
    fontSize: "14px",
    color: "#667085",
    margin: "0 0 24px",
    lineHeight: 1.6,
  },
  button: {
    display: "inline-flex",
    alignItems: "center",
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#fff",
    background: "#1e40af",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background 0.2s",
  },
};

export default ErrorFallback;
