import { useState } from "react";
import { LuDownload, LuX } from "react-icons/lu";
import "./DocumentViewer.css";
import {
  downloadDocumentFile,
  isUnsignedStorageUrl,
  DOCUMENT_UNAVAILABLE,
} from "../../Helper/documentAccess";
import { showToast } from "../../Helper/ShowToast";

const DocumentViewer = ({ fileUrl, fileName, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);

  const getFileExtension = (url) =>
    url?.split("?")[0]?.split(".").pop()?.toLowerCase() || "";

  // An unsigned storage link can be neither framed nor fetched, so it is routed
  // to the explanatory panel below rather than to a preview that would sit
  // blank while the browser was quietly refused.
  const isUnavailable = isUnsignedStorageUrl(fileUrl);
  const fileExtension = getFileExtension(fileUrl);
  const isPdf = !isUnavailable && fileExtension === "pdf";
  const isDoc =
    !isUnavailable && (fileExtension === "doc" || fileExtension === "docx");
  const isImage =
    !isUnavailable &&
    ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExtension);

  const handleDownload = async () => {
    try {
      await downloadDocumentFile(fileUrl, fileName);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const renderContent = () => {
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

    // Word files used to render through docs.google.com/gview, which makes
    // Google's servers fetch the file. That request does not come from our
    // domain, so the referer-locked bucket answers it with Access Denied and
    // the frame stays blank. Downloading keeps the request in the browser,
    // where it carries our origin.
    return (
      <div className="doc-viewer-fallback">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p>
          {isUnavailable
            ? DOCUMENT_UNAVAILABLE
            : isDoc
              ? "Word documents can't be previewed in the browser."
              : "This file type cannot be previewed."}
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

        <div className="doc-viewer-body" aria-busy={isLoading && !isUnavailable}>
          {isLoading && !isUnavailable && (
            <div className="doc-viewer-loading" role="status" aria-live="polite">
              <div className="doc-viewer-spinner" />
              <span className="doc-viewer-sr-only">Loading document...</span>
            </div>
          )}
          <div className={`doc-viewer-content ${isImage ? "doc-viewer-content-image" : ""} ${isLoading && !isUnavailable ? "doc-viewer-content-hidden" : ""}`}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
