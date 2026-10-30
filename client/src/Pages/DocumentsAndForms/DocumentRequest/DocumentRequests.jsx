// src/pages/client/DocumentRequests.jsx

import { useState, useEffect } from "react";
import ReusableTable from "../../../Components/Table/ReuseableTable";
import Button from "../../../Components/Button/Button";
import {
  IoDocumentText,
  IoDownloadOutline,
  IoCheckmarkCircle,
} from "react-icons/io5";
import "./DocumentRequests.css";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../../Helper/ShowToast";
import useAuth from "../../../hooks/useAuth";

import UploadDocumentModal from "../../../Components/Modal/ClientDocumentUploadModal";
import SelectFromMyDocumentsModal from "../../../Components/Modal/SelectFromMyDocumentsModal";

import api from "../../../api/documentsAndFormsApis";
import useDocumentViewer from "../../../hooks/useDocumentViewer";
import { formatDate, formatDateShort } from "../../../Helper/Formatters";
import SectionLoader from "../../../Components/SectionLoader";

// Statuses arrive uppercase (PENDING / OVERDUE / UPLOADED). Matched exactly so
// the "Pending upload" wording isn't mistaken for an upload, and uploaded
// outranks overdue — once the document is in, the row shouldn't still read red.
const statusColorFor = (status) => {
  const s = String(status || "").trim().toUpperCase();
  if (s === "UPLOADED" || s === "COMPLETED" || s === "FILLED") return "success";
  if (s === "OVERDUE") return "danger";
  return "warning";
};
const DocumentRequests = () => {
  const navigate = useNavigate();
  const { tenantClientId: clientTenantId, accessToken, refreshToken } = useAuth();
  const { openDocument } = useDocumentViewer();

  const [documentRequests, setDocumentRequests] = useState([]);
  const [counts, setCounts] = useState({ request: {}, overdue: 0 });

  const [formsData, setFormsData] = useState([]);
  const [formsCounts, setFormsCounts] = useState({ forms: {}, overdue: 0 });

  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadingForms, setLoadingForms] = useState(true);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [attaching, setAttaching] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [formsCurrentPage, setFormsCurrentPage] = useState(1);

  const itemsPerPage = 10;

  const documentsPagination = {
    currentPage,
    totalPages: Math.ceil(documentRequests.length / itemsPerPage) || 1,
  };

  const formsPagination = {
    currentPage: formsCurrentPage,
    totalPages: Math.ceil(formsData.length / itemsPerPage) || 1,
  };

  useEffect(() => {
    if (!clientTenantId || !accessToken || !refreshToken) return;

    const loadAllData = async () => {
      setLoadingDocs(true);
      try {
        const docsRes = await api.GetAllRequestDocuments({
          clientTenantId,
          accessToken,
          refreshToken,
        });

        const formattedDocs = (docsRes.data?.data || []).map((item) => ({
          id: item.id,
          name: item.name || "Unnamed Request",
          description: item.description || "—",
          allowMultiple: item.allowMultiple || false,
          status: item.status || "PENDING",
          statusColor: statusColorFor(item.status),
          dueDate: item.dueDate,
          createdAt: item.createdAt,
          clientDocuments: item.clientDocuments || [],
        }));

        setDocumentRequests(formattedDocs);

        const countsRes = await api.GetCountsForDocumentRequests({
          clientTenantId,
          accessToken,
          refreshToken,
        });
        setCounts(countsRes.data?.data || { request: {}, overdue: 0 });
      } catch (err) {
        console.error("Documents fetch error:", err);
      } finally {
        setLoadingDocs(false);
      }

      setLoadingForms(true);
      try {
        const formsRes = await api.GetAllClientForms({
          clientTenantId,
          accessToken,
          refreshToken,
        });

        const formattedForms = (formsRes.data?.data || []).map((item) => ({
          id: item.id,
          formId: item.formId,
          name: item.form?.name || "Unnamed Form",
          dateReceived: item.createdAt ? formatDate(item.createdAt) : "—",
          status: item.status || "PENDING",
          statusColor: statusColorFor(item.status),
        }));

        setFormsData(formattedForms);

        const formsCountsRes = await api.GetFormsCounts({
          clientTenantId,
          accessToken,
          refreshToken,
        });
        setFormsCounts(formsCountsRes.data?.data || { forms: {}, overdue: 0 });
      } catch (err) {
        console.error("Forms fetch error:", err);
      } finally {
        setLoadingForms(false);
      }
    };

    loadAllData();
  }, [clientTenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshDocuments = async () => {
    try {
      const res = await api.GetAllRequestDocuments({
        clientTenantId,
        accessToken,
        refreshToken,
      });

      const formattedDocs = (res.data?.data || []).map((item) => ({
        id: item.id,
        name: item.name || "Unnamed Request",
        description: item.description || "—",
        allowMultiple: item.allowMultiple || false,
        status: item.status || "PENDING",
        statusColor: statusColorFor(item.status),
        dueDate: item.dueDate,
        createdAt: item.createdAt,
        clientDocuments: item.clientDocuments || [],
      }));

      setDocumentRequests(formattedDocs);
    } catch (err) {
      console.error("Refresh failed", err);
    }
  };

  const handleAttachDocuments = async (documentUrls) => {
    if (!activeRequest) return;

    if (!Array.isArray(documentUrls) || documentUrls.length === 0) {
      showToast("No files selected", "error");
      return;
    }

    if (!activeRequest.allowMultiple && documentUrls.length > 1) {
      showToast("This request allows only one document", "error");
      return;
    }

    setAttaching(true);

    try {
      const documentDetails = {};

      documentUrls.forEach((url, index) => {
        const key = `doc${index + 1}`;

        documentDetails[key] = {
          url: url,
          name: `Document ${index + 1} - ${activeRequest.name}`,
          size: "—",
          fileType: url.split(".").pop()?.toLowerCase() || "unknown",
        };
      });

      await api.AttachDocumentsToRequest({
        clientTenantId,
        name: `Documents request Uploaded - ${activeRequest.name}`,
        documentDetails,
        requestId: activeRequest.id,
        accessToken,
        refreshToken,
      });

      showToast(
        `${documentUrls.length} document${documentUrls.length > 1 ? "s" : ""} attached successfully`,
        "success",
      );

      setShowUploadModal(false);
      setShowSelectModal(false);
      setActiveRequest(null);

      await refreshDocuments();
    } catch (err) {
      console.error(err);
      showToast("Failed to attach documents", "error");
    } finally {
      setAttaching(false);
    }
  };

  const documentColumns = [
    { key: "name", title: "Name" },
    { key: "description", title: "Description" },
    {
      key: "dueDate",
      title: "Due Date",
      render: (v) => (v ? formatDate(v) : "—"),
    },
    {
      key: "status",
      title: "Status",
      render: (v, row) => (
        <span className={`status-badge status-${row.statusColor}`}>
          {row.status}
        </span>
      ),
    },
  ];

  const formsColumns = [
    {
      key: "name",
      title: "Name",
      render: (v) => <span className="form-name-link">{v}</span>,
    },
    { key: "dateReceived", title: "Date Received" },
    {
      key: "status",
      title: "Status",
      render: (v, row) => (
        <span className={`status-badge status-${row.statusColor}`}>{v}</span>
      ),
    },
  ];

  // Actions column for the forms table: a "Fill form" link for pending forms,
  // nothing for ones already filled. Passed as the ReusableTable `actions` prop.
  const formsActions = [
    {
      render: (row) =>
        row.status === "FILLED" ? null : (
          <button
            type="button"
            className="fill-form-link"
            onClick={() => navigate(`/forms/renderer/${row.formId}`)}
            style={{
              background: "none",
              border: "none",
              color: "#004aba",
              fontWeight: 500,
              cursor: "pointer",
              padding: 0,
            }}
          >
            Fill form
          </button>
        ),
    },
  ];

  const renderExpandedDocument = (row) => {
    const hasUploaded = row.clientDocuments?.length > 0;

    if (hasUploaded) {
      // Flatten all documents from all clientDocuments entries
      const allDocuments = [];

      row.clientDocuments.forEach((clientDoc) => {
        if (clientDoc.documentDetails) {
          // Extract all doc1, doc2, doc3, etc. from documentDetails
          Object.keys(clientDoc.documentDetails).forEach((docKey) => {
            const docDetail = clientDoc.documentDetails[docKey];
            allDocuments.push({
              name: docDetail.name || "Document",
              url: docDetail.url,
              fileType: docDetail.fileType,
              size: docDetail.size,
              uploadedAt: clientDoc.createdAt,
            });
          });
        }
      });

      return (
        <div
          className="document-expanded-content uploaded"
          style={{
            padding: "24px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            borderRadius: "0 0 8px 8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "20px",
              fontWeight: "600",
              color: "#15803d",
              fontSize: "15px",
            }}
          >
            <IoCheckmarkCircle size={22} style={{ marginRight: "8px" }} />
            {allDocuments.length} Document{allDocuments.length !== 1 ? "s" : ""}{" "}
            Uploaded
          </div>

          <div
            className="uploaded-files"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(500px, 1fr))",
              gap: "12px",
              maxWidth: "100%",
            }}
          >
            {allDocuments.map((doc, idx) => (
              <div
                key={idx}
                className="uploaded-file-item"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "14px 18px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(0,0,0,0.1)";
                  e.currentTarget.style.borderColor = "#cbd5e1";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 1px 3px rgba(0,0,0,0.05)";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      background: "#eff6ff",
                      borderRadius: "8px",
                      padding: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IoDocumentText size={24} style={{ color: "#3b82f6" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="file-name"
                      style={{
                        fontWeight: "500",
                        color: "#1e293b",
                        fontSize: "14px",
                        marginBottom: "4px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={doc.name}
                    >
                      {doc.name}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontWeight: "500" }}>
                        {doc.fileType?.toUpperCase() || "FILE"}
                      </span>
                      {doc.size && doc.size !== "—" && (
                        <>
                          <span>•</span>
                          <span>{doc.size}</span>
                        </>
                      )}
                      {doc.uploadedAt && (
                        <>
                          <span>•</span>
                          <span>
                            {formatDateShort(doc.uploadedAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openDocument(doc.url, doc.name || "Document")}
                  className="download-btn"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "10px 18px",
                    background: "#3b82f6",
                    color: "white",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: "500",
                    transition: "all 0.2s",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#2563eb";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#3b82f6";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <IoDownloadOutline size={16} />
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Awaiting upload state
    return (
      <div
        className="document-expanded-content"
        style={{
          padding: "24px",
          background: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          borderRadius: "0 0 8px 8px",
        }}
      >
        <div
          className="upload-status"
          style={{
            fontSize: "15px",
            fontWeight: "500",
            color: "#dc2626",
            marginBottom: "16px",
          }}
        >
          Awaiting upload...
        </div>

        <div
          className="upload-actions"
          style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}
        >
          <Button
            label="Upload New"
            variant="secondary"
            onClick={() => {
              setActiveRequest(row);
              setShowUploadModal(true);
            }}
            disabled={attaching}
          />
          <div style={{ flex: "1", minWidth: "200px" }}>
            <Button
              label="Select from My Documents"
              variant="important"
              onClick={() => {
                setActiveRequest(row);
                setShowSelectModal(true);
              }}
              disabled={attaching}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="document-requests-container">
      {/* Document Requests Section */}
      <div className="section-wrapper">
        <div className="section-header">
          <div className="section-title-group">
            <h2 className="section-title-req">Document Requests</h2>
            <span className="new-badge">
              {counts.request?.PENDING || 0} new
            </span>
          </div>
          <p className="section-subtitle">Manage document requests here</p>
        </div>

        {counts.overdue > 0 && (
          <div className="overdue-alert">
            <span className="overdue-text">
              {counts.overdue} documents overdue
            </span>
          </div>
        )}

        {loadingDocs ? (
          <SectionLoader />
        ) : documentRequests.length === 0 ? (
          <div className="empty-state">
            <IoDocumentText size={48} className="empty-icon" />
            <h3>No document requests</h3>
            <p>You currently have no pending document requests.</p>
          </div>
        ) : (
          <ReusableTable
            columns={documentColumns}
            data={documentRequests.map((doc) => ({
              ...doc,
              isExpanded: true,
            }))}
            searchPlaceholder="Search document requests"
            showFilters={false}
            showViewToggle={false}
            renderExpandedRow={renderExpandedDocument}
            pagination={documentsPagination}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Forms Section */}
      <div className="section-wrapper">
        <div className="section-header">
          <div className="section-title-group">
            <h2 className="section-title-form">Forms</h2>
            <span className="new-badge">{formsCounts?.PENDING || 0} new</span>
          </div>
          <p className="section-subtitle">See form requests here</p>
        </div>

        {formsCounts.overdue > 0 && (
          <div className="overdue-alert">
            <span className="overdue-text">
              {formsCounts.overdue} forms overdue
            </span>
          </div>
        )}

        {loadingForms ? (
          <SectionLoader />
        ) : formsData.length === 0 ? (
          <div className="empty-state">
            <IoDocumentText size={48} className="empty-icon" />
            <h3>No form requests</h3>
            <p>No pending forms at the moment.</p>
          </div>
        ) : (
          <ReusableTable
            columns={formsColumns}
            data={formsData}
            actions={formsActions}
            searchPlaceholder="Search forms"
            showFilters={false}
            showViewToggle={false}
            pagination={formsPagination}
            onPageChange={setFormsCurrentPage}
          />
        )}
      </div>

      {/* Modals */}
      {activeRequest && (
        <>
          <UploadDocumentModal
            isOpen={showUploadModal}
            onClose={() => {
              setShowUploadModal(false);
              setActiveRequest(null);
            }}
            onFilesReady={handleAttachDocuments}
            allowMultiple={activeRequest.allowMultiple}
            loading={attaching}
          />

          <SelectFromMyDocumentsModal
            isOpen={showSelectModal}
            onClose={() => {
              setShowSelectModal(false);
              setActiveRequest(null);
            }}
            onDocumentsSelected={handleAttachDocuments}
            allowMultiple={activeRequest.allowMultiple}
            loading={attaching}
          />
        </>
      )}
    </div>
  );
};

export default DocumentRequests;
