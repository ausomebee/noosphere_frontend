import { useState } from "react";
import { LuDownload, LuX } from "react-icons/lu";
import "./DocumentViewer.css";
import WordDocument from "./WordDocument";
import {
  downloadDocumentFile,
  isUnsignedStorageUrl,
  DOCUMENT_UNAVAILABLE,
} from "../../Helper/documentAccess";
import { showToast } from "../../Helper/ShowToast";

const DocumentViewer = ({ fileUrl, fileName, resolving = false, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);

  const getFileExtension = (url) =>
    url?.split("?")[0]?.split(".").pop()?.toLowerCase() || "";

  // An unsigned storage link can be neither framed nor fetched, so it is routed
  // to the explanatory panel below rather than to a preview that would sit
  // blank while the browser was quietly refused.
  // While the signed link is still being fetched nothing is known about the
  // file yet, so every branch below waits rather than deciding on a url that is
  // about to be replaced.
  const isUnavailable = !resolving && isUnsignedStorageUrl(fileUrl);
  const fileExtension = getFileExtension(fileUrl);
  const isPdf = !resolving && !isUnavailable && fileExtension === "pdf";
  const isDoc =
    !resolving &&
    !isUnavailable &&
    (fileExtension === "doc" || fileExtension === "docx");
  const isImage =
    !resolving &&
    !isUnavailable &&
    ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExtension);
  // Only a framed pdf or an image reports back to *this* component that it has
  // loaded, so only those two may hold its loader up. A Word file renders
  // through DocxPreview, which runs its own loader while it fetches and lays
  // the document out; anything else renders a panel straight away.
  const busy = resolving || (isLoading && (isPdf || isImage));

  const handleDownload = async () => {
    try {
      await downloadDocumentFile(fileUrl, fileName);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const renderContent = () => {
    if (resolving) return null;

    if (isPdf) {
      return (
        <iframe
          src={fileUrl}
          className="doc-viewer-iframe"
          onLoad={() => setIsLoading(false)}
          title={fileName}
        />
      );
    }

    if (isImage) {
      return (
        <img
          src={fileUrl}
          alt={fileName || "Document preview"}
          className="doc-viewer-image"
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />
      );
    }

    if (isDoc) {
      return (
        <WordDocument
          fileUrl={fileUrl}
          fileName={fileName}
          onDownload={handleDownload}
        />
      );
    }

    // Everything else: no preview, only the file itself.
    return (
      <div className="doc-viewer-fallback">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p>
          {isUnavailable ? DOCUMENT_UNAVAILABLE : "This file type cannot be previewed."}
        </p>
        {!isUnavailable && (
          <button className="doc-viewer-btn" onClick={handleDownload} aria-label="Download file">
            <LuDownload size={16} aria-hidden="true" />
            <span>Download File</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="doc-viewer-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Document viewer">
      <div className="doc-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="doc-viewer-header">
          <h3 className="doc-viewer-title">{fileName || "Document Preview"}</h3>
          <div className="doc-viewer-actions">
            <button className="doc-viewer-btn" onClick={handleDownload} aria-label="Download file">
              <LuDownload size={16} aria-hidden="true" />
              <span>Download</span>
            </button>
            <button className="doc-viewer-close" onClick={onClose} aria-label="Close document viewer">
              <LuX size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="doc-viewer-body" aria-busy={busy}>
          {busy && (
            <div className="doc-viewer-loading" role="status" aria-live="polite">
              <div className="doc-viewer-spinner" />
              <span className="doc-viewer-sr-only">Loading document...</span>
            </div>
          )}
          <div className={`doc-viewer-content ${isImage ? "doc-viewer-content-image" : ""} ${busy ? "doc-viewer-content-hidden" : ""}`}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
