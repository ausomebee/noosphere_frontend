import { useEffect, useRef, useState } from "react";
import {
  DOCUMENT_UNAVAILABLE,
  DOCUMENT_GONE,
  DOCUMENT_NOT_VIEWABLE,
  storageKeyFromUrl,
} from "../../Helper/documentAccess";
import imagesApi from "../../api/imagesApi";
import useAuth from "../../hooks/useAuth";

/**
 * Renders a Word document in the browser.
 *
 * No browser displays .docx natively, and the third-party viewers that do
 * (Google's gview, Office Online) work by fetching the file to their own
 * servers -- which for clinical records means handing the document to someone
 * else. This unpacks and lays the file out locally instead: the bytes reach the
 * viewer's machine and go no further.
 *
 * docx-preview is about a megabyte with its zip dependency, so it is imported
 * only once a Word file is actually opened. No other route carries it.
 *
 * Reading the bytes needs `fetch`, which needs a CORS rule on the bucket --
 * unlike the PDF frame and the image, which do not. A file that will not load
 * therefore falls back to the download prompt rather than an empty page.
 */
const DocxPreview = ({ fileUrl, onDownload }) => {
  const { accessToken, refreshToken } = useAuth();
  const containerRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [reason, setReason] = useState(DOCUMENT_NOT_VIEWABLE);

  useEffect(() => {
    if (!fileUrl) {
      setReason(DOCUMENT_UNAVAILABLE);
      setStatus("failed");
      return undefined;
    }

    // A second file can be opened before the first has finished rendering, and
    // renderAsync writes straight into the DOM node -- so a stale run has to be
    // stopped from painting over the newer one.
    let cancelled = false;
    setStatus("loading");

    const fail = (message) => {
      if (cancelled) return;
      setReason(message);
      setStatus("failed");
    };

    (async () => {
      let blob;
      const key = storageKeyFromUrl(fileUrl);

      if (key) {
        // Streamed through our own API. Reading the bucket directly is not an
        // option: its responses carry no CORS header, so the browser discards
        // them however good the signed link is.
        try {
          blob = await imagesApi.GetFileBlob({ key, accessToken, refreshToken });
        } catch (err) {
          const status = err?.response?.status;
          if (status === 403) return fail(DOCUMENT_UNAVAILABLE);
          if (status === 404) return fail(DOCUMENT_GONE);
          return fail(DOCUMENT_NOT_VIEWABLE);
        }
        if (!blob) return fail(DOCUMENT_NOT_VIEWABLE);
      } else {
        // Not a stored object -- an external or same-origin url, read directly.
        let res;
        try {
          res = await fetch(fileUrl);
        } catch {
          return fail(DOCUMENT_NOT_VIEWABLE);
        }
        if (!res.ok) {
          if (res.status === 403) return fail(DOCUMENT_UNAVAILABLE);
          if (res.status === 404) return fail(DOCUMENT_GONE);
          return fail(DOCUMENT_NOT_VIEWABLE);
        }
        blob = await res.blob();
      }

      try {
        const { renderAsync } = await import("docx-preview");
        const container = containerRef.current;
        if (cancelled || !container) return;

        container.replaceChildren();
        await renderAsync(blob, container, null, {
          className: "docx",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: true,
          breakPages: true,
          experimental: false,
        });

        if (!cancelled) setStatus("ready");
      } catch {
        // The bytes arrived but could not be laid out: a corrupt or unsupported
        // file. Still worth offering the download.
        fail(DOCUMENT_NOT_VIEWABLE);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileUrl, accessToken, refreshToken]);

  return (
    <div className="docx-preview">
      {status === "loading" && (
        <div className="doc-viewer-loading" role="status" aria-live="polite">
          <div className="doc-viewer-spinner" />
          <span className="sr-only">Loading document...</span>
        </div>
      )}

      {status === "failed" && (
        <div className="doc-viewer-fallback">
          <p>{reason}</p>
          {onDownload && (
            <button className="doc-viewer-btn" onClick={onDownload}>
              <span>Download File</span>
            </button>
          )}
        </div>
      )}

      {/* Mounted and visible throughout. docx-preview measures this node while
          laying the document out, so it can be neither behind a conditional nor
          hidden -- `display: none` would zero every measurement it takes. It is
          simply empty until there is something to show. */}
      <div ref={containerRef} className="docx-preview-surface" />
    </div>
  );
};

export default DocxPreview;
