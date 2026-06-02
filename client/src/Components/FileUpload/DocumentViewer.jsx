import { useState } from "react";
import { LuDownload, LuX } from "react-icons/lu";
import "./DocumentViewer.css";

const DocumentViewer = ({ fileUrl, fileName, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);

  const getFileExtension = (url) =>
    url?.split("?")[0]?.split(".").pop()?.toLowerCase() || "";

  const fileExtension = getFileExtension(fileUrl);
  const isPdf = fileExtension === "pdf";
  const isDoc = fileExtension === "doc" || fileExtension === "docx";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExtension);

  const handleDownload = async () => {
    try {
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(fileUrl, "_blank");
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

    if (isDoc) {
      const googleDocsViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
      return (
        <iframe
          src={googleDocsViewerUrl}
          className="doc-viewer-iframe"
          onLoad={() => setIsLoading(false)}
          title={fileName}
        />
      );
    }

    return (
      <div className="doc-viewer-fallback">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p>This file type cannot be previewed.</p>
        <button className="doc-viewer-btn" onClick={handleDownload} aria-label="Download file">
          <LuDownload size={16} aria-hidden="true" />
          <span>Download File</span>
        </button>
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

        <div className="doc-viewer-body" aria-busy={isLoading}>
          {isLoading && (
            <div className="doc-viewer-loading" role="status" aria-live="polite">
              <div className="doc-viewer-spinner" />
              <span className="doc-viewer-sr-only">Loading document...</span>
            </div>
          )}
          <div className={`doc-viewer-content ${isImage ? "doc-viewer-content-image" : ""} ${isLoading ? "doc-viewer-content-hidden" : ""}`}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
