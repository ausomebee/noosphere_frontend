import React, { createContext, useContext, useState, useCallback } from "react";
import DocumentViewer from "../Components/FileUpload/DocumentViewer";

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
  }, []);

  return (
    <DocumentViewerContext.Provider
      value={{ openDocument, closeDocument, downloadDocument }}
    >
      {children}
      {viewerState.isOpen && (
        <DocumentViewer
          fileUrl={viewerState.fileUrl}
          fileName={viewerState.fileName}
          onClose={closeDocument}
        />
      )}
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
