// src/components/ReusableModal/ClientModal/SelectFromMyDocumentsModal.jsx

import React, { useState, useEffect } from "react";
import ReusableModal from "./ReusableModal";
import { showToast } from "../../Helper/ShowToast";
import { IoDocumentText, IoSearch } from "react-icons/io5";
import { BsCheckCircleFill } from "react-icons/bs";
import { useSelector } from "react-redux";
import api from "../../api/documentsAndFormsApis";

const SelectFromMyDocumentsModal = ({
  isOpen,
  onClose,
  onDocumentsSelected,   // receives array of urls
  allowMultiple = false,
  loading = false,
}) => {
  const clientTenantId = useSelector(
    (state) => state.auth?.user?.tenantLinks?.[0]?.id
  );

  const accessToken = useSelector((state) => state.auth?.user?.accessToken);
  const refreshToken = useSelector((state) => state.auth?.user?.refreshToken);

  const [documents, setDocuments] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!isOpen || !clientTenantId) return;

    const loadMyDocuments = async () => {
      setFetching(true);
      try {
        const res = await api.GetAllFiles({
          clientTenantId,
          accessToken,
          refreshToken,
        });

        const formattedDocs = (res?.data?.data || []).map((file) => ({
          id: file.id,
          name: file.name || "Untitled File",
          fileUrl: file.url,
          type: file.fileType || file.name?.split(".").pop() || "unknown",
          uploadedAt: file.createdAt,
        }));

        setDocuments(formattedDocs);
      } catch (err) {
        console.error("Failed to load documents:", err);
        showToast("Could not load your documents", "error");
      } finally {
        setFetching(false);
      }
    };

    loadMyDocuments();
  }, [isOpen, clientTenantId, accessToken, refreshToken]);

  const filteredDocs = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const toggleSelect = (docId) => {
    if (!allowMultiple) {
      // single select mode
      setSelectedIds(new Set([docId]));
      return;
    }

    // multi select mode
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (selectedIds.size === 0) {
      showToast("Please select at least one document", "error");
      return;
    }

    const selectedUrls = documents
      .filter((doc) => selectedIds.has(doc.id))
      .map((doc) => doc.fileUrl);

    onDocumentsSelected(selectedUrls);
  };

  const getFileIcon = (type = "") => {
    const t = type.toLowerCase();
    if (t.includes("pdf")) return <IoDocumentText className="file-icon pdf" size={22} />;
    if (["jpg", "jpeg", "png"].some((ext) => t.includes(ext))) {
      return <IoDocumentText className="file-icon image" size={22} />;
    }
    return <IoDocumentText className="file-icon default" size={22} />;
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title={allowMultiple ? "Select Documents" : "Select Document"}
      primaryButtonText="Attach Selected"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleConfirm}
      onSecondaryButtonClick={onClose}
      primaryButtonLoading={loading || fetching}
      primaryButtonDisabled={loading || fetching || selectedIds.size === 0}
      size="lg"
    >
      <div className="documents-modal-content">
        {/* Search */}
        <div className="search-wrapper">
          <IoSearch className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search your documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-field"
            disabled={loading || fetching}
          />
        </div>

        {/* Loading / Empty / List */}
        {fetching ? (
          <div className="status-message loading">Loading your documents...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="status-message empty">
            {searchTerm
              ? "No matching documents found"
              : "You have no uploaded documents yet"}
          </div>
        ) : (
          <div className="documents-list">
            {filteredDocs.map((doc) => {
              const isSelected = selectedIds.has(doc.id);
              return (
                <div
                  key={doc.id}
                  className={`document-row ${isSelected ? "selected" : ""}`}
                  onClick={() => !loading && toggleSelect(doc.id)}
                >
                  <div className="document-icon-container">
                    {getFileIcon(doc.type)}
                  </div>

                  <div className="document-details">
                    <div className="document-name">{doc.name}</div>
                    <div className="document-date">
                      Added {new Date(doc.uploadedAt).toLocaleDateString()}
                    </div>
                  </div>

                  {isSelected && (
                    <BsCheckCircleFill className="selection-check" size={22} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Selection summary */}
        {selectedIds.size > 0 && (
          <div className="selection-summary">
            <p>
              {selectedIds.size} document{selectedIds.size !== 1 ? "s" : ""} selected
            </p>
          </div>
        )}
      </div>
    </ReusableModal>
  );
};

export default SelectFromMyDocumentsModal;