// Components/DocumentViewer/DocumentViewer.jsx
import React, { useState } from 'react';
import { LuDownload, LuX } from 'react-icons/lu';

const DocumentViewer = ({ fileUrl, fileName, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);

  const getFileExtension = (url) => {
    return url?.split('.').pop()?.toLowerCase() || '';
  };

  const fileExtension = getFileExtension(fileUrl);
  const isPdf = fileExtension === 'pdf';
  const isDoc = fileExtension === 'doc' || fileExtension === 'docx';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'document';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderDocumentContent = () => {
    if (isPdf) {
      return (
        <iframe
          src={fileUrl}
          className="w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          title={fileName}
        />
      );
    }

    if (isImage) {
      return (
        <img
          src={fileUrl}
          alt={fileName}
          className="max-w-full max-h-full object-contain"
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
          className="w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          title={fileName}
        />
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-6xl mb-4">📄</div>
        <p className="text-lg font-medium text-gray-700 mb-2">
          {fileName || 'Document'}
        </p>
        <p className="text-gray-500 mb-4">
          This document type cannot be previewed directly.
        </p>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <LuDownload size={18} />
          Download File
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800 truncate flex-1 mr-4">
            {fileName || 'Document Preview'}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Download"
              aria-label="Download file"
            >
              <LuDownload size={20} aria-hidden="true" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close document viewer"
            >
              <LuX size={20} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}
          <div className={`w-full h-full ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
            {renderDocumentContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;