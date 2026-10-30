import { FaLock } from "react-icons/fa";

/**
 * Shown in place of a page's content when the user lacks the permission to VIEW
 * it. This is the "two-way" half of view gating: the sidebar hides the nav link,
 * and this blocks the content itself so a direct URL can't reveal the table.
 */
const AccessDenied = ({
  message = "You don't have permission to view this.",
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
      padding: "64px 24px",
      textAlign: "center",
      color: "#6b7280",
    }}
  >
    <FaLock size={28} aria-hidden="true" />
    <p style={{ fontSize: "1rem", fontWeight: 500, margin: 0 }}>{message}</p>
  </div>
);

export default AccessDenied;
