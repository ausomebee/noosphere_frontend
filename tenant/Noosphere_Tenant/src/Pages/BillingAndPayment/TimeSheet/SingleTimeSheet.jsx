import React, { useState } from "react";
import DashboardLayout from "../../../Layout/TenantLayout";
import { FaArrowLeft, FaChevronDown } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import AccordionTable from "../../../Components/Table/AccordionTable";
import Button from "../../../Components/Button/Button";
import RejectTimeSheetModal from "../../../Components/ReusableModal/BillingAndPaymentModal/RejectTimesheetModal";
import ApproveTimeSheetModal from "../../../Components/ReusableModal/BillingAndPaymentModal/ApproveTimeSheetModal";
import RequestTimeSheetModal from "../../../Components/ReusableModal/BillingAndPaymentModal/RequestTimeSheetModal";

const SingleTimeSheet = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("timeSheetDetails");
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isRequestUpdateModalOpen, setIsRequestUpdateModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [counts, setCounts] = useState({
    historyAndApprovalsCount: 7,
  });
  const [approvalData, setApprovalData] = useState({
    clientApproval: "Approve", // Can be "Approve" or "Pending"
    supervisorApproval: "Pending", // Can be "Pending", "Approve", "Update Requested", "Rejected"
  });

  // Destructure approval data
  const { clientApproval, supervisorApproval } = approvalData;

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

  const handleNudgeClient = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Nudge sent to client:", sessionInfo.clientName);
      alert("Nudge sent successfully!");
    } catch (error) {
      console.error("Error sending nudge:", error);
      alert("Failed to send nudge.");
    }
  };

  const handleRejectSave = async (data) => {
    console.log("Reject timesheet with reason:", data.reason);
    setApprovalData({ ...approvalData, supervisorApproval: "Rejected" });
  };

  const handleApproveSave = async () => {
    console.log("Timesheet approved and converted to claim");
    setApprovalData({ ...approvalData, supervisorApproval: "Approve" });
  };

  const handleRequestUpdateSave = async (data) => {
    console.log("Update requested with details:", data.request);
    setApprovalData({ ...approvalData, supervisorApproval: "Update Requested" });
  };

  const renderApprovalEntry = (entry) => {
    switch (entry.type) {
      case "creation":
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              <span className="text-blue-600 font-bold">Timesheet</span> for{" "}
              <span className="text-blue-600 font-bold">{entry.for}</span>{" "}
              {entry.action} on{" "}
              <span className="text-blue-600 font-bold">{entry.date}</span> by{" "}
              <span className="text-blue-600 font-bold">{entry.by}</span>
            </span>
          </div>
        );
      case "submission":
      case "resubmission":
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              <span className="text-blue-600 font-bold">Timesheet</span>{" "}
              {entry.action} by{" "}
              <span className="text-blue-600 font-bold">{entry.by}</span> on{" "}
              <span className="text-blue-600 font-bold">{entry.date}</span>
            </span>
          </div>
        );
      case "return":
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              <span className="text-blue-600 font-bold">Timesheet</span>{" "}
              {entry.action} by{" "}
              <span className="text-blue-600 font-bold">{entry.by}</span> on{" "}
              <span className="text-blue-600 font-bold">{entry.date}</span> to{" "}
              <span className="text-blue-600 font-bold">{entry.to}</span>
            </span>
          </div>
        );
      case "update":
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              <span className="text-blue-600 font-bold">Timesheet</span>{" "}
              {entry.action} by{" "}
              <span className="text-blue-600 font-bold">{entry.by}</span> on{" "}
              <span className="text-blue-600 font-bold">{entry.date}</span>
            </span>
          </div>
        );
      case "approval":
      case "rejection":
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              <span className="text-blue-600 font-bold">Timesheet</span>{" "}
              {entry.action} by{" "}
              <span className="text-blue-600 font-bold">{entry.by}</span> on{" "}
              <span className="text-blue-600 font-bold">{entry.date}</span>
            </span>
          </div>
        );
      default:
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              {entry.action} by{" "}
              <span className="text-blue-600 font-bold">{entry.by}</span> on{" "}
              <span className="text-blue-600 font-bold">{entry.date}</span>
            </span>
          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      <div>
        <div className="manage-column-header">
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
                  <span
                    className={`timesheet-status ${
                      clientApproval === "Approve"
                        ? "timesheet-complete"
                        : "timesheet-pending"
                    }`}
                  >
                    {clientApproval}
                  </span>
                </div>
                <div className="timesheet-separator"></div>
                <div className="timesheet-approval-container">
                  <span className="timesheet-approval-text">
                    Supervisor Approval
                  </span>
                  <span
                    className={`timesheet-status ${
                      supervisorApproval === "Approve"
                        ? "timesheet-complete"
                        : supervisorApproval === "Rejected"
                        ? "timesheet-rejected"
                        : supervisorApproval === "Update Requested"
                        ? "timesheet-update-requested"
                        : "timesheet-pending"
                    }`}
                  >
                    {supervisorApproval}
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
                    <div
                      className="timesheet-dropdown-item"
                      onClick={() => setIsEditMode(true)}
                    >
                      Edit
                    </div>
                    <div
                      className="timesheet-dropdown-item"
                      onClick={handleNudgeClient}
                    >
                      Nudge client for approval
                    </div>
                    <div
                      className="timesheet-dropdown-item"
                      onClick={() => setIsRequestUpdateModalOpen(true)}
                    >
                      Request Update
                    </div>
                    <div
                      className="timesheet-dropdown-item"
                      onClick={() => setIsApproveModalOpen(true)}
                    >
                      Approve and Convert to Claim
                    </div>
                    <div
                      className="timesheet-dropdown-item timesheet-delete"
                      onClick={() => setIsRejectModalOpen(true)}
                    >
                      Reject
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-400 mt-6">
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
                      <span className="ml-2 text-gray-700">
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
              <h3 className="text-lg font-semibold mb-4 text-gray-400 mt-6">
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
                      <span className="ml-2 text-gray-700">
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
                      <span className="ml-2 text-gray-700">
                        {travelTimeInfo.totalBillableTime}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-4 text-gray-400 mt-6">
                  Documents & Data
                </h3>
                <div className="documents-list">
                  {issueData.documents?.length ? (
                    issueData.documents.map((document) => (
                      <div
                        key={document.id}
                        className="document-item justify-between"
                      >
                        <div className="flex">
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
                        <div>
                          <Button label="View" variant="secondary" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No documents available</p>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-4 text-gray-400 mt-6">
                  Client Authorization
                </h3>
                <div>
                  {clientApproval === "Approve" && (
                    <div className="signature-container p-4 border border-gray-200 rounded-lg">
                      <h4 className="text-gray-400 font-bold">
                        Client Signature
                      </h4>
                      <img
                        src="https://via.placeholder.com/150x50?text=Client+Signature"
                        alt="Client Signature"
                        className="mt-2"
                      />
                      <p className="text-gray-700 mt-2">
                        Signed by {sessionInfo.clientName} on {sessionInfo.date}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-400 mt-6">
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
                  isEditMode={isEditMode}
                />
              </div>
            </div>
            <RejectTimeSheetModal
              isOpen={isRejectModalOpen}
              onClose={() => setIsRejectModalOpen(false)}
              onSave={handleRejectSave}
            />
            <ApproveTimeSheetModal
              isOpen={isApproveModalOpen}
              onClose={() => setIsApproveModalOpen(false)}
              onSave={handleApproveSave}
            />
            <RequestTimeSheetModal
              isOpen={isRequestUpdateModalOpen}
              onClose={() => setIsRequestUpdateModalOpen(false)}
              onSave={handleRequestUpdateSave}
            />
          </div>
        )}

        {activeTab === "historyAndApprovals" && (
          <div>
            <div className="p-6">
              <div className="space-y-4">
                {historyAndApprovals.entries.map((entry) => (
                  <div key={entry.id} className="approval-item p-6">
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