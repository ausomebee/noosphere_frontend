// src/pages/Client/ClinentSubs/ClientInfo.jsx
import React, { useMemo, useState, useEffect } from "react";
import { FaCog, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { FiChevronDown, FiEdit2 } from "react-icons/fi";
import { HiOutlineCog6Tooth, HiOutlineTrash } from "react-icons/hi2";
import { LuEye } from "react-icons/lu";
import Button from "../../../../../Components/Button/Button";
import CustomTable from "../../../../../Components/Table/CustomTable";
import Pagination from "../../../../../Components/Table/Pagination";
import { useNavigate, useParams } from "react-router-dom";
import ClientPortalSettingsModal from "../../../../../Components/ReusableModal/ClientModal/ClientAccessModal";
import AddClientModal from "../../../../../Components/ReusableModal/ClientModal/AddClientModal";
import NewDocumentRequestModal from "../../../../../Components/ReusableModal/ClientModal/NewDocumentRequestModal";
import DeleteModal from "../../../../../Components/ReusableModal/OrganizationModal/DeleteModal";
import api from "../../../../../api/TenantApis";
import { showToast, showApiError } from "../../../../../Helper/ShowToast";
import useAuth from "../../../../../hooks/useAuth";
import api2 from "../../../../../api/clientPanelApis";
import api3 from "../../../../../api/customFormsApi";
import FormLibraryModal from "../../../../../Components/ReusableModal/ClientModal/FormLibraryModal";
import ClientDocumentRequestModal from "../../../../../Components/ReusableModal/ClientModal/ClientDocumentRequestModal";
import ClientDocumentUploadModal from "../../../../../Components/ReusableModal/ClientModal/ClientDocumentUploadModal";
import useDocumentViewer from "../../../../../hooks/useDocumentViewer";
import { useDispatch } from "react-redux";
import { loadForm } from "../../../../../ReduxStore/features/formBuilderSlice";
import { formatDate } from "../../../../../Helper/Formatters";
import useFormatSettings from "../../../../../hooks/useFormatSettings";
import usePermissions from "../../../../../hooks/usePermissions";
import SectionLoader from "../../../../../Components/SectionLoader";

// The API sends document-request statuses uppercase (PENDING / OVERDUE /
// UPLOADED), so these are matched case-insensitively — comparing against
// "Uploaded" meant an uploaded request never matched and fell through to the
// amber "pending" badge. Matches are exact so the "Pending upload" default
// isn't mistaken for an upload. Uploaded also outranks overdue: once the
// document is in, the row shouldn't still read as late.
const documentStatusClass = (status) => {
  const s = String(status || "").trim().toUpperCase();
  if (s === "UPLOADED" || s === "COMPLETED" || s === "FILLED")
    return "status-active";
  if (s === "OVERDUE") return "status-overdue";
  return "status-pending";
};

// AssignedTo Component
const AssignedTo = ({ assignees = [], maxVisible = 3 }) => {
  const visible = assignees.slice(0, maxVisible);
  const remaining = assignees.length - maxVisible;

  return (
    <div className="assigned-to">
      <span className="assigned-label">Assigned to</span>
      <div className="avatar-group">
        {visible.map((person, idx) => (
          <div
            key={person.id}
            className="avatar tooltip"
            data-tip={person.fullName} // This works if you're using react-tooltip or similar
            style={{
              zIndex: visible.length - idx,
              marginLeft: idx === 0 ? 0 : "-8px",
              backgroundColor: person.color || "#6B7280",
              border: "2px solid white",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "600",
              fontSize: "12px",
            }}
            title={person.fullName} // Native HTML tooltip fallback
          >
            {person.initials}
          </div>
        ))}
        {remaining > 0 && (
          <div className="more-count" title={`${remaining} more clinicians`}>
            +{remaining}
          </div>
        )}
      </div>
    </div>
  );
};
// Accordion Component
const Accordion = ({ title, isOpen, onToggle, children, badge }) => {
  return (
    <div className="accordion-container">
      <div className="accordion-header cursor-pointer" onClick={onToggle}>
        <div className="accordion-title-wrapper">
          <h2 className="accordion-title">{title}</h2>
          {badge && <span className="document-count">{badge}</span>}
        </div>
        <div className="accordion-icon">
          {isOpen ? <FaChevronUp size={18} /> : <FaChevronDown size={18} />}
        </div>
      </div>
      {isOpen && <div className="accordion-content">{children}</div>}
    </div>
  );
};

// Basic Information Section
const BasicInformation = ({ clientData }) => {
  const [isOpen, setIsOpen] = useState(true);

  const client = clientData?.client;

  // Helper to safely display value or "—"
  const val = (v) => (v ? v : "—");

  // Avatar initials
  const initials =
    `${client?.firstName?.[0] || ""}${
      client?.lastName?.[0] || ""
    }`.toUpperCase() || "??";

  return (
    <Accordion
      title="Basic Information"
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
    >
      <div className="basic-info-grid">
        {/* LEFT COLUMN - Avatar + Name */}
        <div className="flex items-center justify-center">
          <div className="client-avatar-section">
            <div className="client-avatar">{initials}</div>
            <h3 className="client-full-name">
              {val(`${client?.firstName} ${client?.lastName}`)}
            </h3>
            {client?.preferredName && (
              <p className="client-preferred-name">({client.preferredName})</p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - Details */}
        <div>
          <div className="info-section-title">Basic Information</div>
          <div className="basic-info-column flex">
            <div className="flex-1">
              <div className="info-row">
                <span className="info-label">Gender</span>
                <span className="info-value">{val(client?.gender)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Date of Birth</span>
                <span className="info-value">
                  {val(client?.DOB ? client.DOB.split("T")[0] : null)}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Primary Payer</span>
                <span className="info-value">
                  {val(client?.payer?.payerName)}
                </span>
              </div>
            </div>

            <div className="flex-1">
              <div className="info-row">
                <span className="info-label">Email</span>
                <span className="info-value">{val(client?.email)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Phone</span>
                <span className="info-value">{val(client?.phoneNumber)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Address</span>
                <span className="info-value">
                  {[
                    client?.streetAddress,
                    client?.city,
                    client?.state,
                    client?.country,
                    client?.zipCode,
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Caregiver Section – only show if any caregiver field exists */}
          {client && (
            <>
              <div className="info-section-title mt-8">
                Caregiver Information
              </div>
              <div className="basic-info-column flex">
                <div className="flex-1">
                  <div className="info-row">
                    <span className="info-label">Name</span>
                    <span className="info-value">
                      {val(client.caregiverName)}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Phone</span>
                    <span className="info-value">
                      {val(client.caregiverPhone)}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Relationship</span>
                    <span className="info-value">
                      {val(client.caregiverRelationship)}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="info-row">
                    <span className="info-label">Email</span>
                    <span className="info-value">
                      {val(client.caregiverEmail)}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Address</span>
                    <span className="info-value">
                      {[
                        client?.caregiverStreetAddress,
                        client?.caregiverCity,
                        client?.caregiverState,
                        client?.caregiverCountry,
                        client?.caregiverZip,
                      ]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Accordion>
  );
};

// Documents & Forms - UPDATED WITH REAL API INTEGRATION
const DocumentsForms = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { tenantClientId } = useParams();
  const { accessToken, refreshToken, userId, tenantId } = useAuth();
  const { dateFormat } = useFormatSettings();
  const { openDocument, downloadDocument } = useDocumentViewer();
  const { hasPermission } = usePermissions();

  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("documents");
  const [expandedRows, setExpandedRows] = useState([]);
  const [reqPage, setReqPage] = useState(1);
  const REQ_PER_PAGE = 10;

  // Modal States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isFormLibraryOpen, setIsFormLibraryOpen] = useState(false);

  // Data States
  const [formsData, setFormsData] = useState([]); // Assigned to this client
  const [libraryForms, setLibraryForms] = useState([]);
  const [documentsData, setDocumentsData] = useState([]);
  const [requestsData, setRequestsData] = useState([]);
  const [selectedDocumentRow, setSelectedDocumentRow] = useState(null);
  const [loading, setLoading] = useState({
    documents: false,
    requests: false,
    forms: false,
    library: false,
  });

  // Dropdown States
  const [docDropdownOpen, setDocDropdownOpen] = useState(false);
  const [formDropdownOpen, setFormDropdownOpen] = useState(false);

  // Which request is mid-nudge, so its button can disable itself rather than
  // firing a second reminder at the client.
  const [nudgingRequestId, setNudgingRequestId] = useState(null);

  const handleNudgeDocumentRequest = async (request) => {
    if (!request?.id || nudgingRequestId) return;
    setNudgingRequestId(request.id);
    try {
      await api2.NudgeClientDocumentRequest({
        id: request.id,
        accessToken,
        refreshToken,
      });
      showToast(`Reminder sent for "${request.name}"`, "success");
    } catch (error) {
      showApiError(error, "NUDGE_DOCUMENT_REQUEST");
    } finally {
      setNudgingRequestId(null);
    }
  };

  // Cancelling withdraws the request from the client and can't be undone here,
  // so it goes through the shared confirmation modal.
  const [cancelRequestTarget, setCancelRequestTarget] = useState(null);

  const handleConfirmCancelRequest = async () => {
    if (!cancelRequestTarget) return;
    try {
      await api2.CancelClientDocumentRequest({
        id: cancelRequestTarget.id,
        accessToken,
        refreshToken,
      });
      showToast(`Request for "${cancelRequestTarget.name}" cancelled`, "success");
      await fetchDocumentRequests();
    } catch (error) {
      showApiError(error, "CANCEL_DOCUMENT_REQUEST");
      // Re-thrown so DeleteModal keeps itself open on failure.
      throw error;
    }
  };

  const handleDeleteDocument = async () => {
    if (!selectedDocumentRow) return;

    // Optional: Add nice confirmation dialog
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${selectedDocumentRow.name}"? This action cannot be undone.`
    );

    if (!confirmDelete) {
      setSelectedDocumentRow(null);
      return;
    }

    try {
      await api2.deleteClientsDocument({
        id: selectedDocumentRow.id,
        accessToken,
        refreshToken,
      });

      showToast("Document deleted successfully", "success");

      // Refresh the list
      fetchDocuments();

      // Clear selection
      setSelectedDocumentRow(null);
    } catch (e) {
      console.error("Delete error:", e);
      showToast(
        e.response?.data?.message || "Failed to delete document",
        "error"
      );
    }
  };
  useEffect(() => {
    if (selectedDocumentRow) {
      handleDeleteDocument();
    }
  }, [selectedDocumentRow]);

  useEffect(() => {
    if (tenantId) {
      fetchLibraryForms();
    }
  }, [tenantId]);
  // Fetch Documents Data
  const fetchDocuments = async () => {
    setLoading((prev) => ({ ...prev, documents: true }));
    try {
      const response = await api2.GetAllClientDocument({
        id: tenantClientId,
        accessToken,
        refreshToken,
      });

      if (response.data) {
        const transformedData = (response?.data?.data || []).map((doc) => {
          // Safely parse the date
          const createdAt = doc.createdAt ? new Date(doc.createdAt) : null;
          const dateCreated =
            createdAt && !isNaN(createdAt)
              ? formatDate(createdAt, dateFormat)
              : "—";

          // Safely get createdBy name (fallback to "System" or ID)
          const createdBy =
            doc.tenantStaff?.fullName ||
            doc.tenantStaff?.name ||
            doc.tenantStaff?.email ||
            doc.createdBy ||
            "System";

          return {
            id: doc.id,
            name: doc.name || "Untitled Document",
            dateCreated,
            createdBy,
            hasActions: true,
            fileUrl: doc.documentDetails?.fileUrl || null,
            fileType:
              doc.documentDetails?.type ||
              doc.documentDetails?.fileType ||
              "application/octet-stream",
          };
        });
        setDocumentsData(transformedData);
      }
    } catch {
      // No toast: empty/unavailable content is not an error.
    } finally {
      setLoading((prev) => ({ ...prev, documents: false }));
    }
  };

  // Fetch Document Requests Data
  const fetchDocumentRequests = async () => {
    setLoading((prev) => ({ ...prev, requests: true }));
    try {
      const response = await api2.GetAllClientDocumentRequested({
        id: tenantClientId,
        accessToken,
        refreshToken,
      });
      if (response.data) {
        setRequestsData(response.data.data || []); // Adjust based on your API response
      }
    } catch {
      // No toast: empty/unavailable content is not an error.
    } finally {
      setLoading((prev) => ({ ...prev, requests: false }));
    }
  };

  const fetchClientForms = async () => {
    setLoading((prev) => ({ ...prev, forms: true }));
    try {
      const res = await api2.GetAllFormsByTenantClientId({
        tenantClientId,
        accessToken,
        refreshToken,
      });

      const forms = (res?.data?.data || []).map((f) => ({
        id: f.id,
        formId: f.form.id,
        name: f.form.name,
        formFields: f.form.formFields || [],
        dateCreated: f.createdAt
          ? formatDate(f.createdAt, dateFormat)
          : "—",
        status: f.status || "Assigned",
        hasActions: true,
      }));

      setFormsData(forms);
    } catch {
      // No toast: empty/unavailable content is not an error.
    } finally {
      setLoading((prev) => ({ ...prev, forms: false }));
    }
  };

  // === FETCH TENANT FORM LIBRARY ===
  const fetchLibraryForms = async () => {
    if (!tenantId) return;
    setLoading((prev) => ({ ...prev, library: true }));
    try {
      const res = await api3.GetFormsByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });

      const library = (res?.data?.data || []).map((f) => ({
        id: f.id,
        name: f.name || "Untitled Form",
      }));

      setLibraryForms(library);
    } catch {
      // No toast: empty/unavailable content is not an error.
    } finally {
      setLoading((prev) => ({ ...prev, library: false }));
    }
  };

  // === IMPORT FORM TO CLIENT ===
  const handleImportForm = async (formId, formName) => {
    try {
      await api2.AttachFormToClient({
        tenantClientId,
        formId,
        accessToken,
        refreshToken,
      });
      showToast(`"${formName}" assigned successfully`, "success");
      fetchClientForms(); // Refresh assigned forms
      setIsFormLibraryOpen(false);
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to assign form",
        "error"
      );
    }
  };
  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === "documents") fetchDocuments();
    if (activeTab === "requests") fetchDocumentRequests();
    if (activeTab === "forms") fetchClientForms();
  }, [activeTab, tenantClientId]);

  const toggleRow = (id) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  // =====================================
  // 1. DOCUMENTS TAB - USING REAL DATA
  // =====================================
  const documentsColumns = [
    { header: "Name", key: "name", type: "document" },
    { header: "Date Created", key: "dateCreated" },
    { header: "Created By", key: "createdBy" },
  ];

  // UPDATED DOCUMENT ACTIONS WITH VIEW FUNCTIONALITY
  const documentsActions = [
    hasPermission("view_client_document") && {
      type: "icon",
      label: "View",
      icon: <LuEye className="w-5 h-5 text-blue-600" />,
      onClick: (row) => {
        if (row.fileUrl) {
          openDocument(row.fileUrl, row.name);
        }
      },
    },
    // {
    //   type: "icon",
    //   label: "Edit",
    //   icon: <FiEdit2 className="w-5 h-5 text-gray-600" />,
    //   onClick: (row) => navigate(`/documents/edit/${row.id}`),
    // },
    hasPermission("delete_client_document") && {
      type: "icon",
      label: "Delete",
      icon: <HiOutlineTrash className="w-5 h-5 text-red-600" />,
      onClick: (row) => {
        // Set the row first, then ask for confirmation
        setSelectedDocumentRow(row);
      },
    },
  ].filter(Boolean);

  // =====================================
  // 2. DOCUMENT REQUESTS DATA - USING REAL DATA
  // =====================================
  // Transform API response to match your table structure
  const transformedRequestsData = requestsData.map((req) => {
    // Extract files from clientDocuments -> documentDetails (doc1, doc2, etc.)
    const files = (req.clientDocuments || []).flatMap((cd) => {
      const details = cd.documentDetails || {};
      return Object.values(details).map((doc) => ({
        name: cd.name || req.name,
        fileUrl: doc.url || doc.fileUrl,
      }));
    });

    return {
      id: req.id,
      name: req.name,
      dateCreated: formatDate(req.createdAt, dateFormat),
      dueDate: req.dueDate
        ? formatDate(req.dueDate, dateFormat)
        : "—",
      status: req.status || "Pending upload",
      note: req.description,
      files,
    };
  });

  // =====================================
  // 3. FORMS TAB - USING REAL DATA
  // =====================================
  const formsColumns = [
    { header: "Name", key: "name" },
    { header: "Date Created", key: "dateCreated" },
    {
      header: "Status",
      key: "status",
      render: (row) => (
        <span className={`status-label ${documentStatusClass(row.status)}`}>
          {row.status}
        </span>
      ),
    },
  ];

  const handleViewForm = async (row) => {
    try {
      // Fetch full form data by formId
      const res = await api3.GetFormsByFormId({
        formId: row.formId,
        accessToken,
        refreshToken,
      });
      const formData = res?.data?.data || res?.data;
      // Load form into Redux so the renderer can display it
      dispatch(
        loadForm({
          formName: formData.name || row.name,
          elements: formData.formFields || row.formFields || [],
          status: formData.status || "published",
        })
      );
      navigate(`/custom-forms/forms/renderer/${row.formId}`);
    } catch {
      // No toast: empty/unavailable content is not an error.
    }
  };

  const formsActions = [
    {
      type: "dropdown",
      label: "More",
      items: [
        hasPermission("view_form_response") && {
          label: "View Form",
          onClick: handleViewForm,
        },
        hasPermission("nudge_client") && {
          label: "Nudge Client",
          onClick: (row) => {
            showToast(`Nudge sent for form "${row.name}"`, "success");
          }
        },

      ].filter(Boolean),
      className: "more-dropdown",
    },
  ];

  // ENDPOINT HANDLERS - UPDATED
  // Errors propagate so the upload modal shows them and stays open.
  const handleUploadDocument = async (doc) => {
    await api2.CreateClientDocuments({
      tenantClientId,
      name: doc.name,
      createdBy: userId,
      documentDetails: {
        size: doc.documentDetails.size,
        type: doc.documentDetails.fileType,
        fileUrl: doc.documentDetails.fileUrl,
      },
      accessToken,
      refreshToken,
    });
    showToast("Document uploaded successfully", "success");
    fetchDocuments(); // Refresh the documents list — modal closes itself on success
  };

  // Errors propagate so the request modal shows them and stays open.
  const handleCreateRequest = async (request) => {
    await api2.CreateClientDocumentsRequest({
      tenantClientId,
      name: request.name,
      description: request.description,
      allowMultiple: request.allowMultiple,
      dueDate: request.dueDate,
      accessToken,
      refreshToken,
    });
    showToast("Document request created", "success");
    fetchDocumentRequests(); // Refresh the requests list — modal closes itself on success
  };


  return (
    <>
      <Accordion
        title="Documents & Forms"
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
      >
        <div className="documents-section p-6">
          {/* Tabs */}
          <div className=" documents-tabs">
            {hasPermission("view_client_document_forms") && (
              <button
                className={`doc-tab flex-1 ${
                  activeTab === "documents" ? "doc-tab-active" : ""
                }`}
                onClick={() => setActiveTab("documents")}
              >
                Documents
              </button>
            )}
            {hasPermission("view_document_request_list") && (
              <button
                className={`doc-tab flex-1 ${
                  activeTab === "requests" ? "doc-tab-active" : ""
                }`}
                onClick={() => setActiveTab("requests")}
              >
                Document Requests
              </button>
            )}
            {hasPermission("view_client_forms_list") && (
              <button
                className={`doc-tab flex-1 ${
                  activeTab === "forms" ? "doc-tab-active" : ""
                }`}
                onClick={() => setActiveTab("forms")}
              >
                Forms
              </button>
            )}
          </div>

          {/* Action Buttons with Dropdowns */}
          <div className="justify-end flex">
            {activeTab === "documents" && hasPermission("add_document") && (
              <div
                className="manage-dropdown-wrapper"
                style={{ minWidth: "0 important!" }}
              >
                <Button
                  label="New"
                  icon={<FiChevronDown />}
                  iconPosition="right"
                  onClick={() => setDocDropdownOpen(!docDropdownOpen)}
                />
                {docDropdownOpen && (
                  <div className="timesheet-dropdown">
                    <button
                      onClick={() => {
                        setIsUploadModalOpen(true);
                        setDocDropdownOpen(false);
                      }}
                      className="timesheet-dropdown-item"
                    >
                      Upload Document
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "requests" && hasPermission("create_document_request") && (
              <Button
                label="New document request"
                onClick={() => setIsRequestModalOpen(true)}
              />
            )}

            {activeTab === "forms" && hasPermission("create_client_form") && (
              <div className="manage-dropdown-wrapper">
                <Button
                  label="New form"
                  icon={<FiChevronDown />}
                  iconPosition="right"
                  onClick={() => {
                    fetchLibraryForms();
                    setFormDropdownOpen(!formDropdownOpen);
                  }}
                />
                {formDropdownOpen && (
                  <div className="timesheet-dropdown">
                    <button
                      onClick={() => {
                        setIsFormLibraryOpen(true);
                        setFormDropdownOpen(false);
                      }}
                      className="timesheet-dropdown-item"
                    >
                      Import from Library
                    </button>
                    {/* Create Custom Form hidden for now per request
                    <button
                      onClick={() => {
                        setFormDropdownOpen(false);
                        navigate("/custom-forms/forms/create");
                      }}
                      className="timesheet-dropdown-item"
                    >
                      Create Custom Form
                    </button>
                    */}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Table Container — capped height with its own vertical scroll so all
              three tabs (Documents, Document Requests, Forms) can be scrolled. */}
          <div
            className="bg-white rounded-lg"
            style={{ maxHeight: "60vh", overflowY: "auto" }}
          >
            {/* DOCUMENTS TAB */}
            {activeTab === "documents" && (
              <CustomTable
                data={documentsData}
                columns={documentsColumns}
                actions={documentsActions}
                filters={[]}
                showActions={true}
                showCheckbox={false}
                tableName="documents"
                itemsPerPage={10}
                loading={loading.documents}
              />
            )}

            {/* DOCUMENT REQUESTS TAB */}
            {activeTab === "requests" && (
              <div className="custom-table-container">
                <div className="table-container no-scrollbar">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th style={{ width: "40px" }}></th>
                        <th>Name</th>
                        <th>Date Created</th>
                        <th>Due Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading.requests ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8">
                            <SectionLoader minHeight={80} />
                          </td>
                        </tr>
                      ) : (
                        transformedRequestsData
                          .slice(
                            (reqPage - 1) * REQ_PER_PAGE,
                            reqPage * REQ_PER_PAGE
                          )
                          .map((req) => {
                          const isExpanded = expandedRows.includes(req.id);
                          return (
                            <React.Fragment key={req.id}>
                              <tr
                                className="hover:bg-gray-50 cursor-pointer"
                                onClick={() => toggleRow(req.id)}
                              >
                                <td className="text-center">
                                  {isExpanded ? (
                                    <FaChevronUp className="w-4 h-4 text-gray-600" />
                                  ) : (
                                    <FaChevronDown className="w-4 h-4 text-gray-600" />
                                  )}
                                </td>
                                <td className="primary-text font-600">
                                  {req.name}
                                </td>
                                <td>{req.dateCreated}</td>
                                <td>{req.dueDate}</td>
                                <td>
                                  <span
                                    className={`status-label ${documentStatusClass(
                                      req.status
                                    )}`}
                                  >
                                    {req.status}
                                  </span>
                                </td>
                              </tr>

                              {isExpanded && (
                                <tr>
                                  <td colSpan={5} className="bg-gray-50">
                                    <div className="p-6">
                                      <div className="space-y-4">
                                        {/* Show uploaded files if available */}
                                        {hasPermission("view_uploaded_documents_in_request_table") && req.files && req.files.length > 0 ? (
                                          <div>
                                            <h3 className="text-base font-600 text-gray-800 mb-4">
                                              Uploaded Documents ({req.files.length})
                                            </h3>
                                            {req.files.map((file, i) => (
                                              <div
                                                key={i}
                                                className="flex items-center justify-between py-3 last:border-0"
                                              >
                                                <div className="flex items-center gap-3">
                                                  <span className="text-2xl">
                                                    <svg
                                                      width="24"
                                                      height="24"
                                                      viewBox="0 0 24 24"
                                                      fill="none"
                                                      xmlns="http://www.w3.org/2000/svg"
                                                    >
                                                      <g clipPath="url(#clip0_2228_42782)">
                                                        <path
                                                          opacity="0.3"
                                                          d="M13 4H6V20H18V9H13V4Z"
                                                          fill="#5686E1"
                                                        />
                                                        <path
                                                          d="M20 8L14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8ZM18 20H6V4H13V9H18V20Z"
                                                          fill="#5686E1"
                                                        />
                                                      </g>
                                                      <defs>
                                                        <clipPath id="clip0_2228_42782">
                                                          <rect
                                                            width="24"
                                                            height="24"
                                                            fill="white"
                                                          />
                                                        </clipPath>
                                                      </defs>
                                                    </svg>
                                                  </span>
                                                  <span className="text-sm font-medium text-gray-800">
                                                    {file.name}
                                                  </span>
                                                </div>
                                                <div className="flex gap-4">
                                                  {hasPermission("view_client_document") && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      openDocument(
                                                        file.fileUrl,
                                                        file.name
                                                      );
                                                    }}
                                                    className="text-primary text-sm flex font-bold items-center gap-1 hover:underline"
                                                  >
                                                    <LuEye className="w-4 h-4" />
                                                    View
                                                  </button>
                                                  )}
                                                  {hasPermission("download_uploaded_document") && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      downloadDocument(
                                                        file.fileUrl,
                                                        file.name
                                                      );
                                                    }}
                                                    className="text-primary text-sm flex font-bold items-center gap-1 hover:underline"
                                                  >
                                                    <svg
                                                      className="w-4 h-4"
                                                      fill="none"
                                                      stroke="currentColor"
                                                      viewBox="0 0 24 24"
                                                    >
                                                      <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                                      />
                                                    </svg>
                                                    Download
                                                  </button>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          /* No files yet - show awaiting message */
                                          <div className="items-center justify-center flex">
                                            <div>
                                              <h3 className="text-base text-gray-800">
                                                Awaiting Upload from the Client..
                                              </h3>
                                              {(req.status === "PENDING" || req.status === "OVERDUE") && (
                                                <div className="flex gap-6 mt-2">
                                                  {hasPermission("nudge_client") && (
                                                  <button
                                                    type="button"
                                                    className="text-primary font-600 text-base hover:underline cursor-pointer"
                                                    onClick={() => handleNudgeDocumentRequest(req)}
                                                    disabled={nudgingRequestId === req.id}
                                                    /* Inline rather than Tailwind's
                                                       disabled: variants, which don't
                                                       reliably emit in this project. */
                                                    style={
                                                      nudgingRequestId === req.id
                                                        ? { opacity: 0.5, cursor: "not-allowed" }
                                                        : undefined
                                                    }
                                                  >
                                                    {nudgingRequestId === req.id ? "Sending..." : "Nudge"}
                                                  </button>
                                                  )}
                                                  {hasPermission("cancel_document_request") && (
                                                  <button
                                                    type="button"
                                                    className="text-red-600 font-600 text-base hover:underline cursor-pointer"
                                                    onClick={() => setCancelRequestTarget(req)}
                                                  >
                                                    Cancel request
                                                  </button>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {transformedRequestsData.length > 0 && (
                  <Pagination
                    currentPage={reqPage}
                    totalPages={Math.ceil(
                      transformedRequestsData.length / REQ_PER_PAGE
                    )}
                    onPageChange={setReqPage}
                  />
                )}
              </div>
            )}

            {/* FORMS TAB */}
            {activeTab === "forms" && (
              <CustomTable
                data={formsData}
                columns={formsColumns}
                loading={loading.forms}
                tableName="Assigned Forms"
                itemsPerPage={10}
                showCheckbox={false}
                showActions={true}
                actions={formsActions}
              />
            )}
          </div>
        </div>
      </Accordion>

      {/* EXISTING MODALS */}
      <ClientDocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUploadDocument}
      />

      <NewDocumentRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSubmit={handleCreateRequest}
      />

      <DeleteModal
        isOpen={Boolean(cancelRequestTarget)}
        onClose={() => setCancelRequestTarget(null)}
        title="Cancel document request?"
        message={
          cancelRequestTarget
            ? `"${cancelRequestTarget.name}" will be withdrawn and the client will no longer be asked to upload it.`
            : ""
        }
        confirmLabel="Cancel request"
        onConfirm={handleConfirmCancelRequest}
      />

      <FormLibraryModal
        isOpen={isFormLibraryOpen}
        onClose={() => setIsFormLibraryOpen(false)}
        onSelectForm={handleImportForm}
        forms={libraryForms}
        loading={loading.library}
      />
    </>
  );
};

// Main Tab Component - ONLY THE PAYLOAD IS CLEANED (empty values excluded)
const ClientInformationTab = ({ clientData, onUpdated }) => {
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { tenantClientId } = useParams();
  const { accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermissions();

  // WITH THIS REAL ONE:
  const assignees = useMemo(() => {
    return (
      clientData?.clinicians?.map((clinician) => {
        const fullName = clinician.fullName || "Unknown";
        const nameParts = fullName.trim().split(" ");
        const initials =
          nameParts.length >= 2
            ? `${nameParts[0][0]}${
                nameParts[nameParts.length - 1][0]
              }`.toUpperCase()
            : fullName.slice(0, 2).toUpperCase();

        // Optional: generate consistent color from name or ID
        const colors = [
          "#8B5CF6",
          "#EC4899",
          "#F59E0B",
          "#10B981",
          "#3B82F6",
          "#EF4444",
          "#6366F1",
          "#14B8A6",
          "#F97316",
          "#06B6D4",
        ];
        const color = colors[clinician.id.charCodeAt(0) % colors.length];

        return {
          id: clinician.id,
          fullName: fullName,
          initials,
          color,
        };
      }) || []
    );
  }, [clientData?.clinicians]);

  const handleUpdateClient = async (data) => {
    setIsUpdating(true);

    // Build payload dynamically — only include non-empty values
    const payload = {
      id: clientData?.clientId,
      tenantId: clientData?.tenantId,
      accessToken,
      refreshToken,
    };

    // Helper to add field only if value exists (not null, undefined, or empty string)
    const addIfValue = (key, value) => {
      if (value !== null && value !== undefined && value !== "") {
        payload[key] = value;
      }
    };

    addIfValue("firstName", data.firstName);
    addIfValue("lastName", data.lastName);
    addIfValue("preferredName", data.preferredName);
    addIfValue("email", data.email);
    addIfValue("phoneNumber", data.phone);
    addIfValue("gender", data.gender);
    addIfValue("DOB", data.DOB);
    addIfValue("primaryPayer", data.primaryPayer);
    addIfValue("streetAddress", data.streetAddress);
    addIfValue("city", data.city);
    addIfValue("state", data.state);
    addIfValue("country", data.country || "United States");
    addIfValue("zipCode", data.zip);
    addIfValue("assignToClinicians", data.assignToClinicians);
    addIfValue("clientPortalAccess", data.clientPortalAccess);
    addIfValue("caregiverName", data.caregiverName);
    addIfValue("caregiverRelationship", data.caregiverRelationship);
    addIfValue("caregiverPhone", data.caregiverPhone);
    addIfValue("caregiverEmail", data.caregiverEmail);
    addIfValue("caregiverStreetAddress", data.caregiverStreetAddress);
    addIfValue("caregiverCity", data.caregiverCity);
    addIfValue("caregiverState", data.caregiverState);
    addIfValue("caregiverCountry", data.caregiverCountry || "United States");
    addIfValue("caregiverZip", data.caregiverZip);
    addIfValue("documents", data.documents);

    try {
      await api.UpdateCandidate(payload);

      showToast("Client updated successfully", "success");
      setIsAddClientOpen(false);
      onUpdated?.(); // refresh the client panel with the saved data
    } catch (err) {
      showApiError(err, "UPDATE_CLIENT");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="tab-content">
      {/* ACTION BAR */}
      <div className="action-bar">
        <AssignedTo assignees={assignees} maxVisible={3} />

        <div className="manage-dropdown-wrapper">
          <Button
            label="Manage candidate"
            icon={<HiOutlineCog6Tooth size={24} />}
            variant="secondary"
            onClick={() => setIsManageOpen(!isManageOpen)}
          />

          {isManageOpen && (
            <div className="timesheet-dropdown">
              <div
                className="timesheet-dropdown-item"
                onClick={() => {
                  setIsPortalModalOpen(true);
                  setIsManageOpen(false);
                }}
              >
                Client Portal Settings
              </div>

              {hasPermission("edit_client_basic_information") && (
              <div
                className="timesheet-dropdown-item"
                onClick={() => {
                  setIsAddClientOpen(true);
                  setIsManageOpen(false);
                }}
              >
                Edit candidate information
              </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ClientPortalSettingsModal
        isOpen={isPortalModalOpen}
        onClose={() => setIsPortalModalOpen(false)}
        clientTenantId={tenantClientId} // the tenant-client link ID
        initialData={{
          clientPortalAccess: clientData?.dbAccess || false,
          documentAccess: clientData?.documentAccess || false,
          requestAppointment: clientData?.requestAppointment !== false,
        }}
        onSaved={onUpdated}
      />

      <AddClientModal
        isOpen={isAddClientOpen}
        onClose={() => setIsAddClientOpen(false)}
        onSubmit={handleUpdateClient}
        initialData={clientData}
        primaryButtonLoading={isUpdating}
      />

      <BasicInformation clientData={clientData} />
      <DocumentsForms />
    </div>
  );
};

export default ClientInformationTab;
