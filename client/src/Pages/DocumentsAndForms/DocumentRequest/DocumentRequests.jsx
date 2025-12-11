import React, { useState } from "react";
import ReusableTable from "../../../Components/Table/ReuseableTable";
import Button from "../../../Components/Button/Button";
import { IoChevronUp, IoChevronDown, IoDocumentText } from "react-icons/io5";
import { BsThreeDotsVertical } from "react-icons/bs";
import "./DocumentRequests.css";

const DocumentRequests = () => {
  const [activeSection, setActiveSection] = useState("documents"); // documents or forms
  const [expandedDocuments, setExpandedDocuments] = useState([]);

  // Document Requests Data
  const documentRequests = [
    {
      id: 1,
      name: "Request for medical history document",
      dateCreated: "12/3/2024",
      dueDate: "12/3/2024",
      status: "Pending upload",
      statusColor: "warning",
    },
    {
      id: 2,
      name: "Request for X-Ray scan",
      dateCreated: "1/10/2024",
      dueDate: "1/10/2024",
      status: "File Uploaded",
      statusColor: "success",
    },
    {
      id: 3,
      name: "Request for dental diagnosis",
      dateCreated: "2/1/2024",
      dueDate: "2/1/2024",
      status: "Request Overdue",
      statusColor: "danger",
    },
  ];

  // Forms Data
  const formsData = [
    {
      id: 1,
      name: "Child care form",
      dateReceived: "12/3/2024",
      status: "Pending",
      statusColor: "warning",
    },
    {
      id: 2,
      name: "Request for X-Ray scan",
      dateReceived: "1/10/2024",
      status: "Filled",
      statusColor: "success",
    },
    {
      id: 3,
      name: "Request for dental diagnosis",
      dateReceived: "2/1/2024",
      status: "Pending",
      statusColor: "warning",
    },
  ];

  const toggleDocumentExpand = (id) => {
    setExpandedDocuments((prev) =>
      prev.includes(id) ? prev.filter((docId) => docId !== id) : [...prev, id]
    );
  };

  // Document Requests Columns
  const documentColumns = [
    {
      key: "name",
      title: "Name",
      
    },
    {
      key: "dateCreated",
      title: "Date Created",
    },
    {
      key: "dueDate",
      title: "Due Date",
    },
    {
      key: "status",
      title: "Status",
      render: (value, row) => (
        <span className={`status-badge status-${row.statusColor}`}>
          {value}
        </span>
      ),
    },
  ];

  // Forms Columns
  const formsColumns = [
    {
      key: "name",
      title: "Name",
      render: (value) => <span className="form-name-link">{value}</span>,
    },
    {
      key: "dateReceived",
      title: "Date Received",
    },
    {
      key: "status",
      title: "Status",
      render: (value, row) => (
        <span className={`status-badge status-${row.statusColor}`}>
          {value}
        </span>
      ),
    },
  ];

  // Expanded Row Content for Documents
  const renderExpandedDocument = (row) => {
    return (
      <div className="document-expanded-content">
        <div className="upload-status">Awaiting upload...</div>
        <div className="upload-actions">
          <Button label="Upload" variant="secondary" />
          <div style={{ width: "50%" }}>
            <Button label="Select from My documents" variant="important" />
          </div>
        </div>
      </div>
    );
  };

  // Actions for Forms
  const formsActions = [
    {
      menu: true,

      label: "Fill form",
      onClick: (row) => console.log("Fill form", row),
    },
  ];

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pagination = {
    currentPage: currentPage,
    totalPages: 10,
  };

  return (
    <div className="document-requests-container">
      {/* Document Requests Section */}
      <div className="section-wrapper">
        <div className="section-header">
          <div className="section-title-group">
            <h2 className="section-title-req">Document Requests</h2>
            <span className="new-badge">2 new</span>
          </div>
          <p className="section-subtitle">Manage document requests here</p>
        </div>

        <div className="overdue-alert">
          <span className="overdue-text">3 documents overdue</span>
        </div>

        <ReusableTable
          columns={documentColumns}
          data={documentRequests.map((doc) => ({
            ...doc,
            isExpanded: expandedDocuments.includes(doc.id),
          }))}
          searchPlaceholder="Search Documents"
          showFilters={false}
          showViewToggle={false}
           renderExpandedRow={renderExpandedDocument}
          pagination={pagination}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Forms Section */}
      <div className="section-wrapper">
        <div className="section-header">
          <div className="section-title-group">
            <h2 className="section-title-form">Forms</h2>
            <span className="new-badge">4 new</span>
          </div>
          <p className="section-subtitle">See form requests here</p>
        </div>

        <div className="overdue-alert">
          <span className="overdue-text">4 forms overdue</span>
        </div>

        <ReusableTable
          columns={formsColumns}
          data={formsData}
          searchPlaceholder="Search Forms"
          showFilters={false}
          showViewToggle={false}
          actions={formsActions}
          pagination={pagination}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default DocumentRequests;
