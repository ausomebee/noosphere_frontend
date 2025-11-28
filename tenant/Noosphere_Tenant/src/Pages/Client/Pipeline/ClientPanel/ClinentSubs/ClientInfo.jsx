// src/pages/Client/ClinentSubs/ClientInfo.jsx
import React, { useMemo, useState, useEffect } from "react";
import { FaCog, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { FiChevronDown, FiEdit2 } from "react-icons/fi";
import { HiOutlineCog6Tooth, HiOutlineTrash } from "react-icons/hi2";
import { LuEye } from "react-icons/lu";
import Button from "../../../../../Components/Button/Button";
import CustomTable from "../../../../../Components/Table/CustomTable";
import { useNavigate, useParams } from "react-router-dom";
import ClientPortalSettingsModal from "../../../../../Components/ReusableModal/ClientModal/ClientAccessModal";
import AddClientModal from "../../../../../Components/ReusableModal/ClientModal/AddClientModal";
import NewDocumentRequestModal from "../../../../../Components/ReusableModal/ClientModal/NewDocumentRequestModal";
import api from "../../../../../api/TenantApis";
import { showToast } from "../../../../../Helper/ShowToast";
import { useSelector } from "react-redux";
import api2 from "../../../../../api/clientPanelApis";
import FormLibraryModal from "../../../../../Components/ReusableModal/ClientModal/FormLibraryModal";
import ClientDocumentRequestModal from "../../../../../Components/ReusableModal/ClientModal/ClientDocumentRequestModal";
import ClientDocumentUploadModal from "../../../../../Components/ReusableModal/ClientModal/ClientDocumentUploadModal";
import DocumentViewer from "../../../../../Components/FileUpload/DocumentViewer";

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
            key={person.id || idx}
            className="avatar"
            style={{
              zIndex: visible.length - idx,
              marginLeft: idx === 0 ? 0 : "-8px",
              backgroundColor: person.color || "#6B7280",
            }}
          >
            {person.initials}
          </div>
        ))}
        {remaining > 0 && <div className="more-count">+{remaining} more</div>}
      </div>
    </div>
  );
};

// Accordion Component
const Accordion = ({ title, isOpen, onToggle, children, badge }) => {
  return (
    <div className="accordion-container">
      <div className="accordion-header" onClick={onToggle}>
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
                <span className="info-value">{val(client?.DOB)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Primary Payer</span>
                <span className="info-value">{val(client?.primaryPayer)}</span>
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

// Documents & Forms
// Documents & Forms - UPDATED WITH REAL API INTEGRATION
const DocumentsForms = () => {
  const navigate = useNavigate();
  const { tenantClientId } = useParams();
  const { accessToken, refreshToken } = useSelector(
    (s) => s.authentication?.user || {}
  );

  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("documents");
  const [expandedRows, setExpandedRows] = useState([]);

  // Modal States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isFormLibraryOpen, setIsFormLibraryOpen] = useState(false);

  // Document Viewer State
  const [viewerState, setViewerState] = useState({
    isOpen: false,
    fileUrl: null,
    fileName: null,
  });

  // Data States
  const [documentsData, setDocumentsData] = useState([]);
  const [requestsData, setRequestsData] = useState([]);
  const [formsData, setFormsData] = useState([]);
  const [loading, setLoading] = useState({
    documents: false,
    requests: false,
    forms: false,
  });

  // Dropdown States
  const [docDropdownOpen, setDocDropdownOpen] = useState(false);
  const [formDropdownOpen, setFormDropdownOpen] = useState(false);

  // Fetch Documents Data
  const fetchDocuments = async () => {
    setLoading((prev) => ({ ...prev, documents: true }));
    try {
      const response = await api2.GetAllClientDocument({
        id: tenantClientId,
        accessToken,
        refreshToken,
      });
      console.log(response.data)
      if (response.data) {
        const transformedData = response?.data.data.map((doc) => ({
          id: doc.id,
          name: doc.name,
          dateCreated: new Date().toLocaleDateString(), // You might want to get actual date from API
          createdBy: "System", // Adjust based on your API response
          hasActions: true,
          fileUrl: doc.documentDetails?.fileUrl,
          fileType: doc.documentDetails?.type,
        }));
        console.log(transformedData)
        setDocumentsData(transformedData);
      }
      
    } catch (error) {
      showToast("Failed to fetch documents", "error");
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
    } catch (error) {
      showToast("Failed to fetch document requests", "error");
    } finally {
      setLoading((prev) => ({ ...prev, requests: false }));
    }
  };

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === "documents") {
      fetchDocuments();
    } else if (activeTab === "requests") {
      fetchDocumentRequests();
    }
    // Add forms fetching if you have an endpoint for it
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
    {
      type: "icon",
      label: "View",
      icon: <LuEye className="w-5 h-5 text-blue-600" />,
      onClick: (row) => {
        if (row.fileUrl) {
          setViewerState({
            isOpen: true,
            fileUrl: row.fileUrl,
            fileName: row.name,
          });
        } else {
          // Fallback if no fileUrl
          navigate(`/documents/view/${row.id}`);
        }
      },
    },
    {
      type: "icon",
      label: "Edit",
      icon: <FiEdit2 className="w-5 h-5 text-gray-600" />,
      onClick: (row) => navigate(`/documents/edit/${row.id}`),
    },
    {
      type: "icon",
      label: "Delete",
      icon: <HiOutlineTrash className="w-5 h-5 text-red-600" />,
      onClick: (row) => {
        if (window.confirm(`Delete ${row.name}?`)) {
          console.log("Delete", row.id);
        }
      },
    },
  ];

  // =====================================
  // 2. DOCUMENT REQUESTS DATA - USING REAL DATA
  // =====================================
  // Transform API response to match your table structure
  const transformedRequestsData = requestsData.map((req) => ({
    id: req.id,
    name: req.name,
    dateCreated: new Date(req.createdAt).toLocaleDateString(),
    dueDate: req.dueDate ? new Date(req.dueDate).toLocaleDateString() : "—",
    status: req.status || "Pending upload",
    note: req.description,
    files: req.documents || [], // Assuming documents array contains uploaded files
  }));

  // =====================================
  // 3. FORMS TAB - USING REAL DATA
  // =====================================
  const formsColumns = [
    { header: "Name", key: "name" },
    { header: "Date Created", key: "dateCreated" },
    { header: "Due Date", key: "dueDate" },
    {
      header: "Status",
      key: "status",
      render: (row) => (
        <span
          className={`status-label ${
            row.status === "Uploaded" ? "status-active" : "status-pending"
          }`}
        >
          {row.status}
        </span>
      ),
    },
  ];

  // ENDPOINT HANDLERS - UPDATED
  const handleUploadDocument = async (doc) => {
    try {
      await api2.CreateClientDocuments({
        tenantClientId,
        name: doc.name,
        documentDetails: {
          size: doc.documentDetails.size,
          type: doc.documentDetails.fileType,
          fileUrl: doc.documentDetails.fileUrl,
        },
        accessToken,
        refreshToken,
      });
      showToast("Document uploaded successfully", "success");
      setIsUploadModalOpen(false);
      fetchDocuments(); // Refresh the documents list
    } catch (err) {
      showToast("Upload failed", "error");
    }
  };

  const handleCreateRequest = async (request) => {
    try {
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
      setIsRequestModalOpen(false);
      fetchDocumentRequests(); // Refresh the requests list
    } catch (err) {
      showToast("Failed to create request", "error");
    }
  };

  const handleImportForm = async (formId, formName) => {
    try {
      await api2.AttachFormToClient({
        tenantClientId,
        formId,
        accessToken,
        refreshToken,
      });
      showToast(`"${formName}" imported`, "success");
    } catch (err) {
      showToast("Import failed", "error");
    }
  };

  // Document handlers for requests tab
  const handleViewDocument = (fileUrl, fileName) => {
    setViewerState({
      isOpen: true,
      fileUrl: fileUrl,
      fileName: fileName,
    });
  };

  const handleDownloadDocument = (fileUrl, fileName) => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const closeViewer = () => {
    setViewerState({
      isOpen: false,
      fileUrl: null,
      fileName: null,
    });
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
            <button
              className={`doc-tab flex-1 ${
                activeTab === "documents" ? "doc-tab-active" : ""
              }`}
              onClick={() => setActiveTab("documents")}
            >
              Documents
            </button>
            <button
              className={`doc-tab flex-1 ${
                activeTab === "requests" ? "doc-tab-active" : ""
              }`}
              onClick={() => setActiveTab("requests")}
            >
              Document Requests
            </button>
            <button
              className={`doc-tab flex-1 ${
                activeTab === "forms" ? "doc-tab-active" : ""
              }`}
              onClick={() => setActiveTab("forms")}
            >
              Forms
            </button>
          </div>

          {/* Action Buttons with Dropdowns */}
          <div className="justify-end flex">
            {activeTab === "documents" && (
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

            {activeTab === "requests" && (
              <Button
                label="New document request"
                onClick={() => setIsRequestModalOpen(true)}
              />
            )}

            {activeTab === "forms" && (
              <div className="manage-dropdown-wrapper">
                <Button
                  label="New form"
                  icon={<FiChevronDown />}
                  iconPosition="right"
                  onClick={() => setFormDropdownOpen(!formDropdownOpen)}
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
                    <button
                      onClick={() => {
                        setFormDropdownOpen(false);
                        navigate("/custom-forms/forms");
                      }}
                      className="timesheet-dropdown-item"
                    >
                      Create Custom Form
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-lg overflow-hidden">
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
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                          </td>
                        </tr>
                      ) : (
                        transformedRequestsData.map((req) => {
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
                                    className={`status-label ${
                                      req.status === "Uploaded"
                                        ? "status-active"
                                        : "status-pending"
                                    }`}
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
                                        <div className="items-center justify-center flex">
                                          <div>
                                            {req.note && (
                                              <p className="text-sm italic text-gray-600">
                                                {req.note}
                                              </p>
                                            )}
                                            {req.status ===
                                              "Pending upload" && (
                                              <div className="flex gap-6">
                                                <button className="text-primary font-600 text-base hover:underline cursor-pointer">
                                                  Nudge
                                                </button>
                                                <button className="text-red-600 font-600 text-base hover:underline cursor-pointer">
                                                  Cancel request
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {req.files && req.files.length > 0 && (
                                          <div className="pt-4">
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
                                                      <g clip-path="url(#clip0_2228_42782)">
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
                                                    {file.name || file}
                                                  </span>
                                                </div>
                                                <div className="flex gap-4">
                                                  <button
                                                    onClick={() =>
                                                      handleViewDocument(
                                                        file.fileUrl ||
                                                          file.documentDetails
                                                            ?.fileUrl,
                                                        file.name || file
                                                      )
                                                    }
                                                    className="text-primary text-sm flex font-bold items-center gap-1 hover:underline"
                                                  >
                                                    <LuEye className="w-4 h-4" />
                                                    View
                                                  </button>
                                                  <button
                                                    onClick={() =>
                                                      handleDownloadDocument(
                                                        file.fileUrl ||
                                                          file.documentDetails
                                                            ?.fileUrl,
                                                        file.name || file
                                                      )
                                                    }
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
                                                </div>
                                              </div>
                                            ))}
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
              </div>
            )}

            {/* FORMS TAB */}
            {activeTab === "forms" && (
              <CustomTable
                data={formsData}
                columns={formsColumns}
                showActions={false}
                showCheckbox={false}
                filters={[]}
                tableName="forms"
                itemsPerPage={10}
                loading={loading.forms}
              />
            )}
          </div>
        </div>
      </Accordion>

      {/* DOCUMENT VIEWER MODAL */}
      {viewerState.isOpen && (
        <DocumentViewer
          fileUrl={viewerState.fileUrl}
          fileName={viewerState.fileName}
          onClose={closeViewer}
        />
      )}

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

      <FormLibraryModal
        isOpen={isFormLibraryOpen}
        onClose={() => setIsFormLibraryOpen(false)}
        onSelectForm={handleImportForm}
        forms={[]}
        loading={false}
      />
    </>
  );
};
// Main Tab Component - ONLY THE PAYLOAD IS CLEANED (empty values excluded)
const ClientInformationTab = ({ clientData, isViewMode = false }) => {
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { clientId, tenantClientId } = useParams();
  const { token: accessToken, refreshToken } = useSelector(
    (s) => s.authentication?.user || {}
  );

  const assignees = [
    { id: 1, initials: "MW", color: "#8B5CF6" },
    { id: 2, initials: "JK", color: "#EC4899" },
    { id: 3, initials: "AE", color: "#FBBF24" },
    { id: 4, initials: "TL", color: "#10B981" },
  ];

  const handleUpdateClient = async (data) => {
    setIsUpdating(true);

    // Build payload dynamically — only include non-empty values
    const payload = {
      id: clientData?.client?.id,
      tenantId: clientData?.tenantId,
      pipelineStageId: "99e9b9fe-ed4f-48ee-857e-e6a3d7e6a3cb",
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
    addIfValue("country", data.country || "US");
    addIfValue("zipCode", data.zip);
    addIfValue("assignToClinician", data.assignToClinician);
    addIfValue("clientPortalAccess", data.clientPortalAccess);
    addIfValue("caregiverName", data.caregiverName);
    addIfValue("caregiverRelationship", data.caregiverRelationship);
    addIfValue("caregiverPhone", data.caregiverPhone);
    addIfValue("caregiverEmail", data.caregiverEmail);
    addIfValue("caregiverStreetAddress", data.caregiverStreetAddress);
    addIfValue("caregiverCity", data.caregiverCity);
    addIfValue("caregiverState", data.caregiverState);
    addIfValue("caregiverCountry", data.caregiverCountry || "US");
    addIfValue("caregiverZip", data.caregiverZip);
    addIfValue("documents", data.documents);

    console.log("Update Client Payload:", payload);
    try {
      await api.UpdateCandidate(payload);

      showToast("Client updated successfully", "success");
      setIsAddClientOpen(false);
    } catch (err) {
      showToast(err.message || "Failed to update client", "error");
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
              {!isViewMode && (
                <div className="timesheet-dropdown-item">
                  Move intake candidate
                </div>
              )}

              <div
                className="timesheet-dropdown-item"
                onClick={() => {
                  setIsPortalModalOpen(true);
                  setIsManageOpen(false);
                }}
              >
                Client Portal Settings
              </div>

              <div
                className="timesheet-dropdown-item"
                onClick={() => {
                  setIsAddClientOpen(true);
                  setIsManageOpen(false);
                }}
              >
                Edit candidate information
              </div>
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
