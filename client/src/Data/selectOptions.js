// ---------------------------------------------------------------------------
// Navigation config (without icon JSX – icons are applied in ClientLayout)
// ---------------------------------------------------------------------------
export const navConfig = [
  { label: "Home", path: "/dashboard" },
  { label: "My programs", path: "/programs" },
  { label: "Notifications", path: "/notifications" },
  { label: "Documents & Forms", path: "/documents" },
  { label: "My Profile", path: "/profile" },
];

// ---------------------------------------------------------------------------
// MIME / accept-string map used by FormRenderer
// ---------------------------------------------------------------------------
export const mimeMap = {
  PDF: ".pdf",
  IMAGE: "image/*",
  DOCX: ".doc,.docx",
  SPREADSHEET: ".xls,.xlsx,.csv",
  VIDEO: "video/*",
  AUDIO: "audio/*",
  TEXT: ".txt",
  ALL: "*",
};

// ---------------------------------------------------------------------------
// Profile defaults
// ---------------------------------------------------------------------------
export const DEFAULT_AVATAR =
  "https://via.placeholder.com/120x120/cccccc/666666?text=Profile";

export const validImageTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
];

// ---------------------------------------------------------------------------
// File-extension → colour mapping (without icon JSX)
// ---------------------------------------------------------------------------
export const fileTypeColors = {
  pdf: "#e74c3c",
  jpg: "#3498db",
  jpeg: "#3498db",
  png: "#3498db",
  gif: "#3498db",
  doc: "#2b579a",
  docx: "#2b579a",
  xls: "#107c41",
  xlsx: "#107c41",
  default: "#6b7280",
};
