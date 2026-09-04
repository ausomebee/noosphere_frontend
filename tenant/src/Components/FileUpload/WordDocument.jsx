import { useEffect, useState } from "react";
import DocxPreview from "./DocxPreview";
import { storageKeyFromUrl } from "../../Helper/documentAccess";
import imagesApi from "../../api/imagesApi";
import useAuth from "../../hooks/useAuth";

/**
 * Shows a Word document, by whichever of the two routes is available.
 *
 * Preferred: the API converts the file to PDF (LibreOffice, server-side) and we
 * frame the result. A frame is a navigation rather than a script read, so it is
 * not subject to CORS -- which matters, because the bucket carries no CORS rule
 * and `fetch` on a stored object is therefore discarded by the browser even
 * when the signed link is perfectly good.
 *
 * Fallback: render the .docx in the browser. That path needs `fetch`, so until
 * the bucket has a CORS rule it will end at "this file couldn't be shown here"
 * with the download offered -- which is still better than nothing, and is what
 * runs today.
 *
 * Deliberately tolerant of the conversion route not existing yet: a 404, an
 * error, or a body with no url all fall through to the local renderer, so this
 * changes nothing until the endpoint is deployed.
 */
const WordDocument = ({ fileUrl, fileName, onDownload }) => {
  const { accessToken, refreshToken } = useAuth();
  const [pdfUrl, setPdfUrl] = useState(null);
  const [route, setRoute] = useState("checking");

  useEffect(() => {
    const key = storageKeyFromUrl(fileUrl);
    if (!key) {
      // Not a stored object -- nothing to convert. Render it directly.
      setPdfUrl(null);
      setRoute("local");
      return undefined;
    }

    let cancelled = false;
    setPdfUrl(null);
    setRoute("checking");

    (async () => {
      let url = null;
      try {
        url = await imagesApi.GetPdfPreviewUrl({ key, accessToken, refreshToken });
      } catch {
        // Route absent, conversion failed, or still queued. None of these are
        // worth reporting: there is a working way to show the file below.
        url = null;
      }
      if (cancelled) return;
      setPdfUrl(url || null);
      setRoute(url ? "pdf" : "local");
    })();

    return () => {
      cancelled = true;
    };
  }, [fileUrl, accessToken, refreshToken]);

  if (route === "checking") {
    return (
      <div className="doc-viewer-loading" role="status" aria-live="polite">
        <div className="doc-viewer-spinner" />
        <span className="doc-viewer-sr-only">Loading document...</span>
      </div>
    );
  }

  if (route === "pdf") {
    return (
      <iframe
        src={pdfUrl}
        className="doc-viewer-iframe"
        title={fileName || "Document preview"}
      />
    );
  }

  return <DocxPreview fileUrl={fileUrl} onDownload={onDownload} />;
};

export default WordDocument;
