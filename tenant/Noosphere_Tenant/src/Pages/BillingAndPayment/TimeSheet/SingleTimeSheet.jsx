import React, { useState } from "react";
import DashboardLayout from "../../../Layout/TenantLayout";
import { FaArrowLeft, FaChevronDown } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import AccordionTable from "../../../Components/Table/AccordionTable";

const SingleTimeSheet = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("timeSheetDetails");
  const [isOpen, setIsOpen] = useState(false);
  const [counts, setCounts] = useState({
    historyAndApprovalsCount: 7, // Updated count based on the actual entries
  });

  const columns = [
    { key: "diagnosisCode", header: "Diagnosis Code" },
    { key: "description", header: "Description" },
    { key: "authorization", header: "Authorization" },
    { key: "utilization", header: "Utilization", type: "stage_completion" },
    { key: "dateCreated", header: "Date Created" },
  ];

  const data = [
    {
      diagnosisCode: "F84.2",
      description: "Adaptive treatment",
      authorization: "JeDBedPaul-01",
      utilization: "60%",
      dateCreated: "12/10/2024",
    },
    {
      diagnosisCode: "F84.2",
      description: "Adaptive treatment",
      authorization: "JeDBedPaul-01",
      utilization: "60%",
      dateCreated: "12/10/2024",
    },
    {
      diagnosisCode: "F84.2",
      description: "Adaptive treatment",
      authorization: "JeDBedPaul-01",
      utilization: "60%",
      dateCreated: "12/10/2024",
    },
  ];

  const initialServiceData = {
    0: [
      {
        serviceCode: "H2002",
        modifiers: "BT",
        units: "40",
        unitRate: "40",
      },
    ],
  };

  // Dummy JSON data for each section
  const sessionInfo = {
    date: "2024-06-15",
    clientName: "John Doe",
    clientId: "12378598606",
    therapistName: "Joe Bowelle",
    therapistNPI: "12378598606",
    sessionType: "In Home",
    serviceType: "ABA Therapy",
    location: "304 Sharafa Street, Benz, Texas, US, 94562",
  };

  const travelTimeInfo = {
    sessionStartTime: "12:00 PM (UTC)",
    sessionEndTime: "2:00 PM (UTC)",
    travelTimeApplied: "Yes",
    travelStartTime: "11:00 AM (UTC)",
    travelEndTime: "11:45 AM (UTC)",
    totalSessionDuration: "4 hours",
    totalBillableTime: "4 hours",
  };

  // Updated historyAndApprovals data structure based on the image content
  const historyAndApprovals = {
    entries: [
      {
        id: 1,
        action: "created",
        by: "Shareef Smith",
        for: "Phillip Harden",
        date: "12/04/23",
        type: "creation",
      },
      {
        id: 2,
        action: "submitted for approval",
        by: "Shareef Smith",
        to: "Supervisor Mannaseh Jenkins",
        date: "12/04/23",
        type: "submission",
      },
      {
        id: 3,
        action: "returned for review",
        by: "Supervisor Mannaseh Jenkins",
        to: "Shareef Smith",
        date: "12/04/23",
        type: "return",
      },
      {
        id: 4,
        action: "updated",
        by: "Shareef Smith",
        date: "12/04/23",
        type: "update",
      },
      {
        id: 5,
        action: "re-submitted for approval",
        by: "Shareef Smith",
        to: "Supervisor Mannaseh Jenkins",
        date: "12/04/23",
        type: "resubmission",
      },
      {
        id: 6,
        action: "approved",
        by: "Mannaseh Jenkins",
        date: "12/04/23",
        type: "approval",
      },
      {
        id: 7,
        action: "rejected",
        by: "Mannaseh Jenkins",
        date: "12/04/23",
        type: "rejection",
      },
    ],
  };

  const issueData = {
    documents: [
      {
        id: 1,
        name: "Session_Notes_2024-06-15.pdf",
        url: "https://example.com/documents/session_notes_2024-06-15.pdf",
      },
      {
        id: 2,
        name: "Treatment_Plan_John_Doe.pdf",
        url: "https://example.com/documents/treatment_plan_john_doe.pdf",
      },
      {
        id: 3,
        name: "Progress_Report_2024.pdf",
        url: "https://example.com/documents/progress_report_2024.pdf",
      },
    ],
  };

  const handleServiceDataChange = (serviceData) => {
    console.log("Service data changed:", serviceData);
    // Save to state or send to API
  };

  // Helper function to render the approval entry based on type
  const renderApprovalEntry = (entry) => {
    switch (entry.type) {
      case "creation":
        return (
          <div className="approval-entry">
            <span className="text-gray-700 ">
              <span className="text-blue-600 font-bold">Timesheet</span> for{" "}
               <span className="text-blue-600 font-bold">{entry.for}</span> {entry.action} on  <span className="text-blue-600 font-bold">{entry.date}</span> by  <span className="text-blue-600 font-bold">{entry.by}</span>
            </span>
          </div>
        );
      case "submission":
      case "resubmission":
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              <span className="text-blue-600 font-bold">Timesheet</span>{" "}
              {entry.action} by  <span className="text-blue-600 font-bold">{entry.by}</span> on  <span className="text-blue-600 font-bold">{entry.date}</span>
            </span>
          </div>
        );
      case "return":
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              <span className="text-blue-600 font-bold">Timesheet</span>{" "}
              {entry.action} by  <span className="text-blue-600 font-bold">{entry.by}</span> on  <span className="text-blue-600 font-bold">{entry.date}</span> to  <span className="text-blue-600 font-bold">{entry.to}</span>
            </span>
          </div>
        );
      case "update":
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              <span className="text-blue-600 font-bold">Timesheet</span>{" "}
              {entry.action} by  <span className="text-blue-600 font-bold">{entry.by}</span> on  <span className="text-blue-600 font-bold">{entry.date}</span>
            </span>
          </div>
        );
      case "approval":
      case "rejection":
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              <span className="text-blue-600 font-bold">Timesheet</span>{" "}
              {entry.action} by  <span className="text-blue-600 font-bold">{entry.by}</span> on  <span className="text-blue-600 font-bold">{entry.date}</span>
            </span>
          </div>
        );
      default:
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              {entry.action} by  <span className="text-blue-600 font-bold">{entry.by}</span> on  <span className="text-blue-600 font-bold">{entry.date}</span>
            </span>
          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      <div>
        <div className="manage-column-header" >
          <button className="manage-back-button" onClick={() => navigate(-1)}>
            <FaArrowLeft />
            Back
          </button>
          <h2 className="text-2xl text-gray-400">TimeSheet</h2>
          <button
            className="manage-back-button"
            style={{ opacity: 0, pointerEvents: "none" }}
          >
            <FaArrowLeft />
            Back
          </button>
        </div>
        <div className="tabs">
          <button
            className={`tab flex items-center justify-center ${
              activeTab === "timeSheetDetails" ? "active" : ""
            }`}
            onClick={() => setActiveTab("timeSheetDetails")}
          >
            <span>TimeSheet Details</span>
          </button>
          <button
            className={`tab flex items-center justify-center ${
              activeTab === "historyAndApprovals" ? "active" : ""
            }`}
            onClick={() => setActiveTab("historyAndApprovals")}
          >
            <span>History & Approvals</span>
            {counts.historyAndApprovalsCount !== undefined && (
              <span className="ml-2 bg-blue-600 text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                {counts.historyAndApprovalsCount}
              </span>
            )}
          </button>
        </div>

        {activeTab === "timeSheetDetails" && (
          <div>
            <div className="flex justify-between items-center mt-6">
              <div className="flex border rounded-md items-center p-4 border-gray-200 w-fit">
                <div className="timesheet-approval-container">
                  <span className="timesheet-approval-text">
                    Client Approval
                  </span>
                  <span className="timesheet-status timesheet-complete">
                    Complete
                  </span>
                </div>
                <div className="timesheet-separator"></div>
                <div className="timesheet-approval-container">
                  <span className="timesheet-approval-text">
                    Supervisor Approval
                  </span>
                  <span className="timesheet-status timesheet-pending">
                    Pending
                  </span>
                </div>
              </div>
              <div className="relative inline-block">
                <button
                  className="timesheet-actions-button flex items-center justify-center"
                  onClick={() => setIsOpen(!isOpen)}
                >
                  Actions
                  <FaChevronDown className="ml-2" />
                </button>
                {isOpen && (
                  <div className="timesheet-dropdown">
                    <div className="timesheet-dropdown-item">Edit</div>
                    <div className="timesheet-dropdown-item">
                      Convert to Claim
                    </div>
                    <div className="timesheet-dropdown-item timesheet-delete">
                      Delete
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-400 mt-6 ">
                Session Information
              </h3>
              <div className="p-20 border border-gray-200 rounded-lg">
                <div className="grid grid-cols-2 gap-8">
                  <div className="gap-4 flex flex-col">
                    <div>
                      <span className="text-gray-400 font-bold">Date</span>
                      <span className="ml-2 text-gray-700">
                        {sessionInfo.date}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold">
                        Client Name
                      </span>
                      <span className="ml-2 text-blue-600 font-bold">
                        {sessionInfo.clientName}{" "}
                        <span className="text-gray-400 font-500">
                          (Insurance ID: {sessionInfo.clientId})
                        </span>
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold">
                        Therapist Name
                      </span>
                      <span className="ml-2 text-blue-600 font-bold">
                        {sessionInfo.therapistName}{" "}
                        <span className="text-gray-400 font-500">
                          (NPI {sessionInfo.therapistNPI})
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="gap-4 flex flex-col">
                    <div>
                      <span className="text-gray-400 font-bold">
                        Session Type
                      </span>
                      <span className="ml-2 text-gray-700">
                        {sessionInfo.sessionType}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold">
                        Service Type(s)
                      </span>
                      <span className="ml-2 text-gray-700 ">
                        {sessionInfo.serviceType}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold">Location</span>
                      <span className="ml-2 text-gray-700">
                        {sessionInfo.location}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-400 mt-6 ">
                Travel & Time Information
              </h3>
              <div className="p-20 border border-gray-200 rounded-lg">
                <div className="grid grid-cols-3 gap-8">
                  <div className="gap-4 flex flex-col">
                    <div>
                      <span className="text-gray-400 font-bold">
                        Session Start Time
                      </span>
                      <span className="ml-2 text-gray-700">
                        {travelTimeInfo.sessionStartTime}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold">
                        Session End Time
                      </span>
                      <span className="ml-2 text-gray-700">
                        {travelTimeInfo.sessionEndTime}
                      </span>
                    </div>
                  </div>
                  <div className="gap-4 flex flex-col">
                    <div>
                      <span className="text-gray-400 font-bold">
                        Travel Time Applied
                      </span>
                      <span className="ml-2 text-gray-700">
                        {travelTimeInfo.travelTimeApplied}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold">
                        Travel Start Time
                      </span>
                      <span className="ml-2 text-gray-700 ">
                        {travelTimeInfo.travelStartTime}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold">
                        Travel End Time
                      </span>
                      <span className="ml-2 text-gray-700">
                        {travelTimeInfo.travelEndTime}
                      </span>
                    </div>
                  </div>
                  <div className="gap-4 flex flex-col">
                    <div>
                      <span className="text-gray-400 font-bold">
                        Total Session Duration
                      </span>
                      <span className="ml-2 text-gray-700">
                        {travelTimeInfo.totalSessionDuration}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold">
                        Total Billable Time
                      </span>
                      <span className="ml-2 text-gray-700 ">
                        {travelTimeInfo.totalBillableTime}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-400 mt-6 ">
                Documents & Data
              </h3>
              <div className="documents-list">
                {issueData.documents?.length ? (
                  issueData.documents.map((document) => (
                    <div key={document.id} className="document-item">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="document-icon"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      <a href={document.url} className="document-link">
                        {document.name}
                      </a>
                    </div>
                  ))
                ) : (
                  <p>No documents available</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-400 mt-6 ">
                Billing and Authorization
              </h3>
              <div>
                <AccordionTable
                  data={data}
                  columns={columns}
                  tableName="Diagnosis Codes"
                  itemsPerPage={5}
                  onServiceDataChange={handleServiceDataChange}
                  initialServiceData={initialServiceData}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "historyAndApprovals" && (
          <div>
            <div className="p-6  ">
              <div className="space-y-4">
                {historyAndApprovals.entries.map((entry) => (
                  <div key={entry.id} className="approval-item p-6 ">
                    {renderApprovalEntry(entry)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SingleTimeSheet;
