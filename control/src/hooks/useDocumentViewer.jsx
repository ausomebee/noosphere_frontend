import React, { createContext, useContext, useState, useCallback } from "react";
import DocumentViewer from "../Components/ReusableModal/DocumentViewer";

import {
  downloadDocumentFile,
  isUnsignedStorageUrl,
  storageKeyFromUrl,
} from "../Helper/documentAccess";
import { showToast } from "../Helper/ShowToast";
import imagesApi from "../api/imagesApi";
import useAuth from "./useAuth";

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

  const downloadDocument = useCallback(
    async (fileUrl, fileName) => {
      let resolved = fileUrl;
      try {
        resolved = await resolveUrl(fileUrl);
      } catch {
        // Fall through with the unsigned url: the helper refuses it with the
        // message written for this exact case, rather than an axios one.
      }
      try {
        await downloadDocumentFile(resolved, fileName);
      } catch (err) {
        // The helper's messages are written for the person on the screen, so
        // the failure is reported rather than swallowed the way it used to be.
        showToast(err.message, "error");
      }
    },
    [resolveUrl]
  );

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
