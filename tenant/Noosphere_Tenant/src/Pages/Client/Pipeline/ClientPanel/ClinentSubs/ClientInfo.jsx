// src/pages/Client/ClinentSubs/ClientInfo.jsx
import React, { useMemo, useState } from "react";
import { FaCog, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { FiChevronDown, FiEdit2 } from "react-icons/fi";
import { HiOutlineCog6Tooth, HiOutlineTrash } from "react-icons/hi2";
import { LuEye } from "react-icons/lu";
import Button from "../../../../../Components/Button/Button";
import { IoChevronForwardOutline } from "react-icons/io5";
import CustomTable from "../../../../../Components/Table/CustomTable";
import { useNavigate } from "react-router-dom";
import ClientPortalSettingsModal from "../../../../../Components/ReusableModal/ClientModal/ClientAccessModal";
import AddClientModal from "../../../../../Components/ReusableModal/ClientModal/AddClientModal";
import NewDocumentRequestModal from "../../../../../Components/ReusableModal/ClientModal/NewDocumentRequestModal";
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
const BasicInformation = ({ client, onEdit }) => {
  const [isOpen, setIsOpen] = useState(true);

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
            <div className="client-avatar">JH</div>
            <h3 className="client-full-name">Kouthrapauli Ramakrishnan</h3>
            <p className="client-preferred-name">(Kouth)</p>
          </div>
        </div>
        <div>
          <div>
            <div className="info-section-title">Basic Information</div>
            <div className="basic-info-column flex">
              <div className="flex-1">
                <div className="info-row">
                  <span className="info-label">Gender</span>
                  <span className="info-value">Male</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Date of Birth</span>
                  <span className="info-value">12/12/2022</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Primary Payer</span>
                  <span className="info-value">Medi-cal</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="info-row">
                  <span className="info-label">Email</span>
                  <span className="info-value">email@gmail.com</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Phone</span>
                  <span className="info-value">+441 344 36849</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Address</span>
                  <span className="info-value">
                    304 Sharafa Street, Benz, Texas, US, 94562
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="info-section-title">Caregiver Information</div>
            <div className="basic-info-column flex">
              <div className="flex-1">
                <div className="info-row">
                  <span className="info-label">Name</span>
                  <span className="info-value">Phillip Harden</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Phone</span>
                  <span className="info-value">803 234 2345</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Relationship</span>
                  <span className="info-value">Family</span>
                </div>
              </div>

              <div className="flex-1">
                <div className="info-row">
                  <span className="info-label">Email</span>
                  <span className="info-value">email@gmail.com</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Phone</span>
                  <span className="info-value">+441 344 36849</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Address</span>
                  <span className="info-value">
                    304 Sharafa Street, Benz, Texas, US, 94562
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Accordion>
  );
};

// Documents & Forms
const DocumentsForms = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("documents");
  const [expandedRows, setExpandedRows] = useState([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const toggleRow = (id) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  // =====================================
  // 1. DOCUMENTS TAB
  // =====================================
  const documentsData = useMemo(
    () => [
      {
        id: "1",
        name: "SOAP Notes.pdf",
        dateCreated: "12-10-2024",
        createdBy: "Daniel Emeka",
        hasActions: true,
      },
      {
        id: "2",
        name: "Progress Report.docx",
        dateCreated: "11-10-2024",
        createdBy: "Sarah Johnson",
        hasActions: true,
      },
      {
        id: "3",
        name: "Intake Form.xlsx",
        dateCreated: "10-10-2024",
        createdBy: "Daniel Emeka",
        hasActions: true,
      },
      {
        id: "4",
        name: "Treatment Plan.pdf",
        dateCreated: "09-10-2024",
        createdBy: "Admin User",
        hasActions: true,
      },
    ],
    []
  );

  const documentsColumns = [
    { header: "Name", key: "name", type: "document" },
    { header: "Date Created", key: "dateCreated" },
    { header: "Created By", key: "createdBy" },
  ];

  const documentsActions = [
    {
      type: "icon",
      label: "View",
      icon: <LuEye className="w-5 h-5 text-blue-600" />,
      onClick: (row) => navigate(`/documents/view/${row.id}`),
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
  // 2. DOCUMENT REQUESTS DATA
  // =====================================
  const requestsData = useMemo(
    () => [
      {
        id: "req1",
        name: "Request for financial history document",
        dateCreated: "12/10/2024",
        dueDate: "12/10/2024",
        status: "Uploaded",
        files: [
          "Financial History June.pdf",
          "Financial History May.pdf",
          "Financial History April.pdf",
        ],
      },
      {
        id: "req2",
        name: "Request for medical history document",
        dateCreated: "12/3/2024",
        dueDate: "12/3/2024",
        status: "Pending upload",
        note: "Awaiting upload from client ...",
      },
      {
        id: "req3",
        name: "Request for X-Ray scan",
        dateCreated: "1/10/2024",
        dueDate: "1/10/2024",
        note: "Awaiting upload from client ...",
        status: "Pending upload",
      },
      {
        id: "req4",
        name: "Request for dental diagnosis",
        dateCreated: "2/1/2024",
        dueDate: "2/1/2024",
        note: "Awaiting upload from client ...",
        status: "Pending upload",
      },
      {
        id: "req5",
        name: "Request for NYSC certificate",
        dateCreated: "2/1/2024",
        dueDate: "2/1/2024",
        note: "Awaiting upload from client ...",
        status: "Pending upload",
      },
      {
        id: "req6",
        name: "Request for discharge certificate",
        dateCreated: "2/1/2024",
        dueDate: "2/1/2024",
        status: "Uploaded",
        files: ["Financial History June.pdf"],
      },
    ],
    []
  );

  // =====================================
  // 3. FORMS TAB
  // =====================================
  const formsData = useMemo(
    () => [
      {
        id: "1",
        name: "Request for financial history document",
        dateCreated: "12/10/2024",
        dueDate: "12/10/2024",
        status: "Uploaded",
      },
      {
        id: "2",
        name: "Request for medical history document",
        dateCreated: "12/3/2024",
        dueDate: "12/3/2024",
        status: "Uploaded",
      },
      {
        id: "3",
        name: "Request for X-Ray scan",
        dateCreated: "1/10/2024",
        dueDate: "1/10/2024",
        status: "Pending upload",
      },
      {
        id: "4",
        name: "Request for dental diagnosis",
        dateCreated: "2/1/2024",
        dueDate: "2/1/2024",
        status: "Pending upload",
      },
      {
        id: "5",
        name: "Request for NYSC certificate",
        dateCreated: "2/1/2024",
        dueDate: "2/1/2024",
        status: "Pending upload",
      },
      {
        id: "6",
        name: "Request for discharge certificate",
        dateCreated: "2/1/2024",
        dueDate: "2/1/2024",
        status: "Uploaded",
      },
    ],
    []
  );

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

  return (
    <>
      <Accordion
        title="Documents & Forms"
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
      >
        <div className="documents-section p-6">
          {/* Tabs - Pure CSS, no Tailwind */}
          <div className="documents-tabs w-full">
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

          {/* Action Button */}
          <div className="justify-end flex mt-4 mb-4">
            {activeTab === "forms" && (
              <Button
                label="New form"
                icon={<FiChevronDown />}
                iconPosition="right"
              />
            )}
            {activeTab === "documents" && (
              <Button
                label="New"
                icon={<FiChevronDown />}
                iconPosition="right"
              />
            )}
            {activeTab === "requests" && (
              <Button
                label="New document request"
                onClick={() => setIsRequestModalOpen(true)}
              />
            )}
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-lg overflow-hidden">
            {/* ============ DOCUMENTS TAB ============ */}
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
              />
            )}

            {/* ============ DOCUMENT REQUESTS TAB ============ */}
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
                      {requestsData.map((req) => {
                        const isExpanded = expandedRows.includes(req.id);
                        return (
                          <React.Fragment key={req.id}>
                            {/* Main Row */}
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

                            {/* Expanded Row */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={5} className="bg-gray-50">
                                  <div className="p-6 ">
                                    <div className="space-y-4 ">
                                      <div className="items-center justify-center flex">
                                        <div>
                                          {req.note && (
                                            <p className="text-sm italic text-gray-600">
                                              {req.note}
                                            </p>
                                          )}

                                          {req.status === "Pending upload" && (
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
                                        <div className=" pt-4">
                                          {req.files.map((file, i) => (
                                            <div
                                              key={i}
                                              className="flex items-center justify-between py-3  last:border-0"
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
                                                  {file}
                                                </span>
                                              </div>
                                              <a
                                                href="#"
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
                                              </a>
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
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ============ FORMS TAB ============ */}
            {activeTab === "forms" && (
              <CustomTable
                data={formsData}
                columns={formsColumns}
                showActions={false}
                showCheckbox={false}
                filters={[]}
                tableName="forms"
                itemsPerPage={10}
              />
            )}
          </div>
        </div>
      </Accordion>
      <NewDocumentRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
      />
    </>
  );
};
// Main Tab Component
const ClientInformationTab = ({ isViewMode = false }) => {
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);

  const assignees = [
    { id: 1, initials: "MW", color: "#8B5CF6" },
    { id: 2, initials: "JK", color: "#EC4899" },
    { id: 3, initials: "AE", color: "#FBBF24" },
    { id: 4, initials: "TL", color: "#10B981" },
  ];

  const client = {
    id: "1",
    firstName: "Kouthrapauli",
    lastName: "Ramakrishnan",
    preferredName: "Kouth",
    gender: "Male",
    dateOfBirth: "2022-12-12",
    email: "email@gmail.com",
    phoneNumber: "+441 344 36849",
    caregiverName: "Phillip Harden",
    relationshipToCaregiver: "Family",
    streetAddress: "304 Sharafa Street, Benz, Texas, US, 94562",
    city: "Benz",
    state: "Texas",
    country: "US",
    zipCode: "94562",
  };

  return (
    <div className="tab-content">
      {/* ACTION BAR — Unified for both modes, using your original structure */}
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
              {/* Hidden only in view mode */}
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

              <div className="timesheet-dropdown-item">
                Change Assigned Clinicians
              </div>

              <div className="timesheet-dropdown-item timesheet-delete">
                Remove candidate
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ClientPortalSettingsModal
        isOpen={isPortalModalOpen}
        onClose={() => setIsPortalModalOpen(false)}
      />

      <AddClientModal
        isOpen={isAddClientOpen}
        onClose={() => setIsAddClientOpen(false)}
        onSubmit={(data) => {
          console.log("Client saved:", data);
        }}
        initialData={client}
      />

      <BasicInformation client={client} />
      <DocumentsForms />
    </div>
  );
};

export default ClientInformationTab;
