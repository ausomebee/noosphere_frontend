import React, { createContext, useContext, useState, useCallback } from "react";
import DocumentViewer from "../Components/ReusableModal/DocumentViewer";

import { downloadDocumentFile } from "../Helper/documentAccess";
import { showToast } from "../Helper/ShowToast";

const DocumentViewerContext = createContext(null);

export const DocumentViewerProvider = ({ children }) => {
  const [viewerState, setViewerState] = useState({
    isOpen: false,
    fileUrl: "",
    fileName: "",
  });

  const openDocument = useCallback((fileUrl, fileName) => {
    setViewerState({ isOpen: true, fileUrl, fileName });
  }, []);

  const closeDocument = useCallback(() => {
    setViewerState({ isOpen: false, fileUrl: "", fileName: "" });
  }, []);

  const downloadDocument = useCallback(async (fileUrl, fileName) => {
    try {
      await downloadDocumentFile(fileUrl, fileName);
    } catch (err) {
      // The helper's messages are written for the person on the screen, so the
      // failure is reported rather than swallowed the way it used to be.
      showToast(err.message, "error");
    }
  }, []);

  return (
    <DocumentViewerContext.Provider
      value={{ openDocument, closeDocument, downloadDocument }}
    >
      {children}
      <DocumentViewer
        isOpen={viewerState.isOpen}
        fileUrl={viewerState.fileUrl}
        fileName={viewerState.fileName}
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
