import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import "./DocumentViewer.css";
import {
  downloadDocumentFile,
  isUnsignedStorageUrl,
  DOCUMENT_UNAVAILABLE,
} from "../../Helper/documentAccess";
import { showToast } from "../../Helper/ShowToast";

const DocumentViewer = ({ isOpen, fileUrl, fileName, resolving = false, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const scrollPositionRef = useRef(0);

  const getFileExtension = (url) => {
    return url?.split("?")[0]?.split(".").pop()?.toLowerCase() || "";
  };

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
  const busy = resolving || (isLoading && (isPdf || isImage || isDoc));

  const handleDownload = useCallback(async () => {
    try {
      await downloadDocumentFile(fileUrl, fileName);
    } catch (err) {
      showToast(err.message, "error");
    }
  }, [fileUrl, fileName]);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
    }
  }, [isOpen, fileUrl]);

  useEffect(() => {
    if (isOpen) {
      scrollPositionRef.current = window.scrollY;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollPositionRef.current}px`;
      document.body.style.width = "100%";
    }
    return () => {
      if (isOpen) {
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        window.scrollTo(0, scrollPositionRef.current);
      }
    };
  }, [isOpen]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
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

    // Word files used to render through docs.google.com/gview, which makes
    // Google's servers fetch the file. That request does not come from our
    // domain, so the referer-locked bucket answers it with Access Denied and
    // the frame stays blank. Downloading keeps the request in the browser,
    // where it carries our origin.
    return (
      <div className="doc-viewer-fallback">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
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
          <button className="doc-viewer-btn" onClick={handleDownload}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download File</span>
          </button>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="doc-viewer-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-viewer-title"
    >
      <div className="doc-viewer-modal">
        <div className="doc-viewer-header">
          <h2 id="doc-viewer-title" className="doc-viewer-title">
            {fileName || "Document Preview"}
          </h2>
          <div className="doc-viewer-actions">
            <button
              className="doc-viewer-btn"
              onClick={handleDownload}
              aria-label="Download file"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download</span>
            </button>
            <button
              className="doc-viewer-close"
              onClick={onClose}
              aria-label="Close document viewer"
            >
              &times;
            </button>
          </div>
        </div>
        <div className="doc-viewer-body" aria-busy={busy}>
          {busy && (
            <div className="doc-viewer-loading" role="status" aria-live="polite">
              <div className="doc-viewer-spinner" />
              <span className="sr-only">Loading document...</span>
            </div>
          )}
          <div
            className={`doc-viewer-content ${isImage ? "doc-viewer-content-image" : ""} ${busy ? "doc-viewer-content-hidden" : ""}`}
          >
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default DocumentViewer;
