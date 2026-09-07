import React, { createContext, useContext, useState, useCallback } from "react";
import DocumentViewer from "../Components/ReusableModal/DocumentViewer";

import {
  isUnsignedStorageUrl,
  storageKeyFromUrl,
} from "../Helper/documentAccess";
import imagesApi from "../api/imagesApi";
import useAuth from "./useAuth";
import useDocumentDownload from "./useDocumentDownload";

const DocumentViewerContext = createContext(null);

export const DocumentViewerProvider = ({ children }) => {
  const { accessToken, refreshToken } = useAuth();
  const [viewerState, setViewerState] = useState({
    isOpen: false,
    fileUrl: "",
    fileName: "",
    resolving: false,
  });

  // Stored urls point at a private bucket and carry no signature of their own,
  // so they are exchanged for a short-lived signed one at the moment they are
  // needed. Resolving here rather than at the call sites keeps the link fresh:
  // one signed when a list was drawn would expire while the page sat open, and
  // fail with the very error this exists to avoid.
  const resolveUrl = useCallback(
    async (fileUrl) => {
      if (!isUnsignedStorageUrl(fileUrl)) return fileUrl;
      const key = storageKeyFromUrl(fileUrl);
      if (!key) return fileUrl;
      const signed = await imagesApi.GetPresignedUrl({
        key,
        accessToken,
        refreshToken,
      });
      return signed || fileUrl;
    },
    [accessToken, refreshToken]
  );

  const openDocument = useCallback(
    async (fileUrl, fileName) => {
      setViewerState({ isOpen: true, fileUrl: "", fileName, resolving: true });
      let resolved = fileUrl;
      try {
        resolved = await resolveUrl(fileUrl);
      } catch {
        // Keep the original url. The viewer recognises an unsigned link and
        // explains itself, which reads better than a blank frame.
      }
      setViewerState({
        isOpen: true,
        fileUrl: resolved,
        fileName,
        resolving: false,
      });
    },
    [resolveUrl]
  );

  const closeDocument = useCallback(() => {
    setViewerState({ isOpen: false, fileUrl: "", fileName: "", resolving: false });
  }, []);

  // Downloading needs no signed link at all now: a stored object is read
  // through our own API by key, so resolving one first would be a wasted round
  // trip. Non-stored urls still go the direct route inside the hook.
  const downloadDocument = useDocumentDownload();

  return (
    <DocumentViewerContext.Provider
      value={{ openDocument, closeDocument, downloadDocument }}
    >
      {children}
      <DocumentViewer
        isOpen={viewerState.isOpen}
        fileUrl={viewerState.fileUrl}
        fileName={viewerState.fileName}
        resolving={viewerState.resolving}
        onDownload={() =>
          downloadDocument(viewerState.fileUrl, viewerState.fileName)
        }
        onClose={closeDocument}
      />
    </DocumentViewerContext.Provider>
  );
};

const useDocumentViewer = () => {
  const context = useContext(DocumentViewerContext);
  if (!context) {
    throw new Error(
      "useDocumentViewer must be used within a DocumentViewerProvider"
    );
  }
  return context;
};

export default useDocumentViewer;
