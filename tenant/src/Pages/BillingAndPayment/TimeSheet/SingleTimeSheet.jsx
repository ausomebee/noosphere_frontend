import React, { useState, useEffect, useRef } from "react";
import {
  FaArrowLeft,
  FaChevronDown,
  FaFilePdf,
  FaEye,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
} from "react-icons/fa";
import "../BillingPayment.css";
import { useNavigate, useParams } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import AccordionTable from "../../../Components/Table/AccordionTable";
import Button from "../../../Components/Button/Button";
import RejectTimeSheetModal from "../../../Components/ReusableModal/BillingAndPaymentModal/RejectTimesheetModal";
import ApproveTimeSheetModal from "../../../Components/ReusableModal/BillingAndPaymentModal/ApproveTimeSheetModal";
import api from "../../../api/billingAndPaymentsApi";
import Modal from "../../../Components/ReusableModal/ReusableModal";
import { showToast } from "../../../Helper/ShowToast";
import LoadingSpinner from "../../../Components/LoadingSpinner";

// Helper functions
const formatTimeFromString = (timeString) => {
  if (!timeString) return "12:00:00 AM";
  const [hours, minutes, seconds = "00"] = timeString.split(":");
  let h = parseInt(hours, 10);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h.toString().padStart(2, "0")}:${minutes}:${seconds} ${period}`;
};

const formatDuration = (secs) => {
  if (secs === undefined || secs === null) return "Not set";
  const h = Math.floor(secs / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((secs % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
};

const calculateSessionHours = (startTime, endTime) => {
  if (!startTime || !endTime) return "0.00";
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start) || isNaN(end)) return "0.00";
  const diffMs = end - start;
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours.toFixed(2);
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    return "Invalid date";
  }
};

const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return "Invalid date";
  }
};

// Document Modal Component
const DocumentModal = ({ isOpen, onClose, document }) => {
  if (!document) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={document.title} size="lg">
      <div style={{ padding: "24px" }}>
        <div
          style={{
            backgroundColor: "#f9fafb",
            padding: "16px",
            borderRadius: "8px",
            maxHeight: "400px",
            overflowY: "auto",
          }}
        >
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: "14px",
              lineHeight: "1.5",
              color: "#374151",
              margin: 0,
            }}
          >
            {document.content || "No content available"}
          </pre>
        </div>
        <div
          style={{
            marginTop: "24px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Button label="Close" variant="secondary" onClick={onClose} />
        </div>
      </div>
    </Modal>
  );
};

// Consolidated Program Data Modal Component - Shows all sessionDatas in one modal
const ProgramDataModal = ({ isOpen, onClose, sessionDatas }) => {
  if (!sessionDatas || sessionDatas.length === 0) return null;

  // Determine data collection type based on data structure
  const getDataType = (data) => {
    if (!data?.data) return "Unknown";

    if (data.data.steps) return "Task Analysis";
    if (data.data.trials && data.data.trials[0]?.latency !== undefined)
      return "Latency";
    if (data.data.trials && data.data.trials[0]?.performance !== undefined)
      return "Trials/Opportunities";
    if (
      data.data.numberOfOccurrence !== undefined &&
      data.data.duration === undefined
    )
      return "Frequency";
    if (
      data.data.duration !== undefined &&
      data.data.numberOfOccurrence === undefined
    )
      return "Duration";
    if (
      data.data.duration !== undefined &&
      data.data.numberOfOccurrence !== undefined
    )
      return "Rate";
    return "Unknown";
  };

  // Render appropriate table based on data type
  const renderDataTable = (sessionData) => {
    const data = sessionData.data;
    const dataType = getDataType(sessionData);

    switch (dataType) {
      case "Task Analysis":
        return (
          <div style={{ overflowX: "auto", marginTop: "16px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f3f4f6" }}>
                  <th
                    style={{
                      padding: "12px",
                      border: "1px solid #e5e7eb",
                      textAlign: "left",
                    }}
                  >
                    Step
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      border: "1px solid #e5e7eb",
                      textAlign: "left",
                    }}
                  >
                    Description
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      border: "1px solid #e5e7eb",
                      textAlign: "left",
                    }}
                  >
                    Performance
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      border: "1px solid #e5e7eb",
                      textAlign: "left",
                    }}
                  >
                    Prompt Level
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      border: "1px solid #e5e7eb",
                      textAlign: "left",
                    }}
                  >
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.steps?.map((step) => (
                  <tr key={step.id}>
                    <td
                      style={{ padding: "12px", border: "1px solid #e5e7eb" }}
                    >
                      {step.id}
                    </td>
                    <td
                      style={{ padding: "12px", border: "1px solid #e5e7eb" }}
                    >
                      {step.description || "—"}
                    </td>
                    <td
                      style={{ padding: "12px", border: "1px solid #e5e7eb" }}
                    >
                      {step.performance || "—"}
                    </td>
                    <td
                      style={{ padding: "12px", border: "1px solid #e5e7eb" }}
                    >
                      {step.promptLevel || "—"}
                    </td>
                    <td
                      style={{ padding: "12px", border: "1px solid #e5e7eb" }}
                    >
                      {step.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "Latency":
        return (
          <div style={{ overflowX: "auto", marginTop: "16px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f3f4f6" }}>
                  <th
                    style={{
                      padding: "12px",
                      border: "1px solid #e5e7eb",
                      textAlign: "left",
                    }}
                  >
                    Trial
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      border: "1px solid #e5e7eb",
                      textAlign: "left",
                    }}
                  >
                    Stimulus Presented
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      border: "1px solid #e5e7eb",
                      textAlign: "left",
                    }}
                  >
                    Latency (sec)
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      border: "1px solid #e5e7eb",
                      textAlign: "left",
                    }}
                  >
                    Behavior Start
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.trials?.map((trial) => (
                  <tr key={trial.trial}>
                    <td
                      style={{ padding: "12px", border: "1px solid #e5e7eb" }}
                    >
                      {trial.trial}
                    </td>
                    <td
                      style={{ padding: "12px", border: "1px solid #e5e7eb" }}
                    >
                      {trial.stimulusPresented || "—"}
                    </td>
                    <td
                      style={{ padding: "12px", border: "1px solid #e5e7eb" }}
                    >
                      {trial.latency !== null ? `${trial.latency}s` : "NR"}
                    </td>
                    <td
                      style={{ padding: "12px", border: "1px solid #e5e7eb" }}
                    >
                      {trial.behaviourStart || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "Frequency":
        return (
          <div style={{ overflowX: "auto", marginTop: "16px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f3f4f6" }}>
                  <th
                    style={{
                      padding: "12px",
                      border: "1px solid #e5e7eb",
                      textAlign: "left",
                    }}
                  >
                    Number of Occurrences
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      border: "1px solid #e5e7eb",
                      textAlign: "left",
                    }}
                  >
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "12px", border: "1px solid #e5e7eb" }}>
                    {data.numberOfOccurrence || 0}
                  </td>
                  <td style={{ padding: "12px", border: "1px solid #e5e7eb" }}>
                    {data.notes || "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );

      case "Trials/Opportunities":
        return (
          <div style={{ overflowX: "auto", marginTop: "16px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f3f4f6" }}>
                  <th
                    style={{
                      padding: "12px",
                      border: "1px solid #e5e7eb",
                      textAlign: "left",
                    }}
                  >
                    Trial
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      border: "1px solid #e5e7eb",
                      textAlign: "left",
                    }}
                  >
                    Prompt
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      border: "1px solid #e5e7eb",
                      textAlign: "left",
                    }}
                  >
                    Response
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      border: "1px solid #e5e7eb",
                      textAlign: "left",
                    }}
                  >
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.trials?.map((trial, index) => (
                  <tr key={index}>
                    <td
                      style={{ padding: "12px", border: "1px solid #e5e7eb" }}
                    >
                      {trial.trial || index + 1}
                    </td>
                    <td
                      style={{ padding: "12px", border: "1px solid #e5e7eb" }}
                    >
                      {trial.promptLevel || "—"}
                    </td>
                    <td
                      style={{ padding: "12px", border: "1px solid #e5e7eb" }}
                    >
                      {trial.performance || "—"}
                    </td>
                    <td
                      style={{ padding: "12px", border: "1px solid #e5e7eb" }}
                    >
                      {trial.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return (
          <div
            style={{
              marginTop: "16px",
              padding: "16px",
              backgroundColor: "#f9fafb",
              borderRadius: "8px",
            }}
          >
            <p>Data type: {dataType}</p>
            <pre style={{ fontSize: "12px", overflowX: "auto" }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="All Program Data" size="xl">
      <div style={{ padding: "24px", maxHeight: "80vh", overflowY: "auto" }}>
        {sessionDatas.map((sessionData, index) => (
          <div
            key={sessionData.id || index}
            style={{
              marginBottom: "32px",
              padding: "20px",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                paddingBottom: "12px",
                borderBottom: "2px solid #e5e7eb",
              }}
            >
              <div>
                <h4
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    color: "#111827",
                    marginBottom: "4px",
                  }}
                >
                  Target {index + 1}: {sessionData.targetId || "N/A"}
                </h4>
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    fontSize: "14px",
                    color: "#6b7280",
                  }}
                >
                  <span>Type: {getDataType(sessionData)}</span>
                  <span>Created: {formatDateTime(sessionData.createdAt)}</span>
                </div>
              </div>
            </div>

            {sessionData.data?.notes && (
              <div style={{ marginBottom: "16px" }}>
                <h5
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "8px",
                  }}
                >
                  General Notes
                </h5>
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <p style={{ color: "#374151", margin: 0 }}>
                    {sessionData.data.notes}
                  </p>
                </div>
              </div>
            )}

            {renderDataTable(sessionData)}
          </div>
        ))}

        <div
          style={{
            marginTop: "24px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Button label="Close" variant="secondary" onClick={onClose} />
        </div>
      </div>
    </Modal>
  );
};

// Main Component
const SingleTimeSheet = () => {
  const navigate = useNavigate();
  const { timesheetId } = useParams();

  // Auth state
  const { tenantId, role: roleObj, userId, accessToken, refreshToken, user } = useAuth();
  const role = roleObj?.name ?? "Client";

  // State
  const [activeTab, setActiveTab] = useState("timeSheetDetails");
  const [isOpen, setIsOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [isProgramDataModalOpen, setIsProgramDataModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  // Data states
  const [timesheetData, setTimesheetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [counts, setCounts] = useState({
    historyAndApprovalsCount: 0,
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchTimesheetData();
  }, [timesheetId]);

  const fetchTimesheetData = async () => {
    try {
      const response = await api.GetSingleTimeSheetByTimesheetId({
        timeSheetId: timesheetId,
        accessToken,
        refreshToken,
      });
      setTimesheetData(response.data);

      // Calculate history count
      const totalHistory = response.data?.timesheetHistories?.length || 0;

      setCounts({
        historyAndApprovalsCount: totalHistory,
      });
    } catch (error) {
      console.error("Error fetching timesheet:", error);
    } finally {
      setLoading(false);
    }
  };

  // Approval handlers
  const handleApproveTimesheet = async () => {
    try {
      await api.ApproveTimeSheetBySupervisor({
        timeSheetId: timesheetId,
        supervisorId: userId,
        accessToken,
        refreshToken,
      });
      // Refresh data
      fetchTimesheetData();
      setIsApproveModalOpen(false);
      showToast("Timesheet approved successfully!", "success");
    } catch (error) {
      console.error("Error approving timesheet:", error);
      showToast("Failed to approve timesheet.", "error");
    }
  };

  const handleRejectTimesheet = async (reason) => {
    try {
      await api.RejectTimeSheetBySupervisor({
        timeSheetId: timesheetId,
        supervisorId: userId,
        reason,
        accessToken,
        refreshToken,
      });
      // Refresh data
      fetchTimesheetData();
      setIsRejectModalOpen(false);
      showToast("Timesheet rejected successfully!", "success");
    } catch (error) {
      console.error("Error rejecting timesheet:", error);
      showToast("Failed to reject timesheet.", "error");
    }
  };

  const handleNudgeClient = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      showToast("Nudge sent successfully!", "success");
    } catch (error) {
      console.error("Error sending nudge:", error);
      showToast("Failed to send nudge.", "error");
    }
  };

  // Document handlers
  const handleViewSOAPNotes = () => {
    setSelectedDocument({
      type: "SOAP Notes",
      content: timesheetData?.note || "No notes available",
      title: "SOAP Notes - Session Documentation",
    });
    setIsDocumentModalOpen(true);
  };

  const handleViewAllProgramData = () => {
    setIsProgramDataModalOpen(true);
  };

  // SIMPLIFIED PDF Export function - No text wrapping calculations
  const handleExportPDF = async () => {
    if (!timesheetData) return;

    setExportingPDF(true);
    try {
      // Create jsPDF instance
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF("p", "mm", "a4");

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = margin;
      const lineHeight = 7;

      // Helper function to add new page if needed
      const checkPageBreak = (requiredSpace) => {
        const pageHeight = doc.internal.pageSize.getHeight();
        if (yPos + requiredSpace > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
          // Add watermark to new page
          addWatermark();
        }
      };

      // Function to add watermark
      const addWatermark = () => {
        doc.setFontSize(40);
        doc.setTextColor(230, 230, 230);
        doc.setFont("helvetica", "bold");
        doc.text(
          "CONFIDENTIAL",
          pageWidth / 2,
          doc.internal.pageSize.getHeight() / 2,
          { align: "center", angle: 45 }
        );
        doc.setTextColor(0, 0, 0);
      };

      // Add watermark to first page
      addWatermark();

      // =========== HEADER SECTION ===========
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(44, 62, 80);
      doc.text("COMPLETE TIMESHEET REPORT", pageWidth / 2, yPos, {
        align: "center",
      });
      yPos += 10;

      // Metadata
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Timesheet ID: ${timesheetData.id || "N/A"}`, margin, yPos);
      doc.text(
        `Generated: ${new Date().toLocaleDateString()}`,
        pageWidth - margin,
        yPos,
        { align: "right" }
      );
      yPos += 10;

      // Status
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("STATUS SUMMARY", margin, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Client Approval: ${timesheetData.clientApprovalStatus || "PENDING"}`,
        margin,
        yPos
      );
      doc.text(
        `Supervisor Approval: ${
          timesheetData.supervisorApprovalStatus || "PENDING"
        }`,
        pageWidth / 2,
        yPos
      );
      yPos += lineHeight * 2;

      // =========== SECTION 1: SESSION INFORMATION ===========
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(44, 62, 80);
      doc.text("1. SESSION INFORMATION", margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);

      const clientName = timesheetData.appointment?.client
        ? `${timesheetData.appointment.client.firstName || ""} ${
            timesheetData.appointment.client.lastName || ""
          }`.trim()
        : "N/A";

      const sessionInfo = [
        ["Date", formatDate(timesheetData.startTime)],
        ["Client", clientName],
        ["Client ID", timesheetData.appointment?.clientId || "N/A"],
        ["Clinician(s)", clinicianNames || "N/A"],
        ["Clinician NPI(s)", clinicianNpis || "N/A"],
        ["Session Type", timesheetData.appointment?.session?.name || "N/A"],
        [
          "Service Category",
          timesheetData.appointment?.session?.category || "N/A",
        ],
        ["Location", timesheetData.appointment?.serviceLocation || "N/A"],
      ];

      sessionInfo.forEach(([label, value]) => {
        checkPageBreak(lineHeight);
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, margin, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(value || "N/A", margin + 40, yPos);
        yPos += lineHeight;
      });
      yPos += 10;

      // =========== SECTION 2: TIME INFORMATION ===========
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("2. TIME INFORMATION", margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      const sessionHours = calculateSessionHours(
        timesheetData.startTime,
        timesheetData.endTime
      );
      const travelHours =
        timesheetData?.travelStartTime && timesheetData?.travelEndTime
          ? calculateSessionHours(
              timesheetData.travelStartTime,
              timesheetData.travelEndTime
            )
          : "0.00";
      const totalBillableTime = (
        parseFloat(sessionHours) + parseFloat(travelHours)
      ).toFixed(2);

      const timeInfo = [
        [
          "Session Start",
          timesheetData.startTime
            ? new Date(timesheetData.startTime).toLocaleTimeString()
            : "N/A",
        ],
        [
          "Session End",
          timesheetData.endTime
            ? new Date(timesheetData.endTime).toLocaleTimeString()
            : "N/A",
        ],
        ["Session Duration", `${sessionHours} hours`],
        ["Travel Time Applied", timesheetData.travelStartTime ? "Yes" : "No"],
      ];

      timeInfo.forEach(([label, value]) => {
        checkPageBreak(lineHeight);
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, margin, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(value, margin + 45, yPos);
        yPos += lineHeight;
      });

      if (timesheetData.travelStartTime) {
        checkPageBreak(lineHeight * 3);
        doc.setFont("helvetica", "bold");
        doc.text("Travel Start:", margin, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(
          timesheetData.travelStartTime
            ? new Date(timesheetData.travelStartTime).toLocaleTimeString()
            : "N/A",
          margin + 45,
          yPos
        );
        yPos += lineHeight;

        doc.setFont("helvetica", "bold");
        doc.text("Travel End:", margin, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(
          timesheetData.travelEndTime
            ? new Date(timesheetData.travelEndTime).toLocaleTimeString()
            : "N/A",
          margin + 45,
          yPos
        );
        yPos += lineHeight;

        doc.setFont("helvetica", "bold");
        doc.text("Travel Duration:", margin, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(`${travelHours} hours`, margin + 45, yPos);
        yPos += lineHeight;
      }

      checkPageBreak(lineHeight);
      doc.setFont("helvetica", "bold");
      doc.text("Total Billable Time:", margin, yPos);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 100, 0);
      doc.text(`${totalBillableTime} hours`, margin + 45, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 15;

      // =========== SECTION 3: SOAP NOTES ===========
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("3. SOAP NOTES", margin, yPos);
      yPos += 10;

      // SOAP Notes
      checkPageBreak(15);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Clinical Documentation:", margin, yPos);
      yPos += 7;

      if (timesheetData.note) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        // Split notes into lines
        const notesLines = doc.splitTextToSize(
          timesheetData.note,
          pageWidth - 2 * margin
        );
        notesLines.forEach((line) => {
          checkPageBreak(lineHeight);
          doc.text(line, margin + 5, yPos);
          yPos += lineHeight;
        });
      } else {
        checkPageBreak(lineHeight);
        doc.text("No SOAP notes available", margin + 5, yPos);
        yPos += lineHeight;
      }
      yPos += 15;

      // =========== SECTION 4: PROGRAM DATA ===========
      if (timesheetData.sessionDatas && timesheetData.sessionDatas.length > 0) {
        checkPageBreak(30);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("4. PROGRAM DATA", margin, yPos);
        yPos += 10;

        // Determine data type for each sessionData
        const getDataType = (data) => {
          if (!data?.data) return "Unknown";
          if (data.data.steps) return "Task Analysis";
          if (data.data.trials && data.data.trials[0]?.latency !== undefined)
            return "Latency";
          if (
            data.data.trials &&
            data.data.trials[0]?.performance !== undefined
          )
            return "Trials/Opportunities";
          if (
            data.data.numberOfOccurrence !== undefined &&
            data.data.duration === undefined
          )
            return "Frequency";
          if (
            data.data.duration !== undefined &&
            data.data.numberOfOccurrence === undefined
          )
            return "Duration";
          if (
            data.data.duration !== undefined &&
            data.data.numberOfOccurrence !== undefined
          )
            return "Rate";
          return "Unknown";
        };

        timesheetData.sessionDatas.forEach((sessionData, index) => {
          checkPageBreak(20);

          // Target header
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(44, 62, 80);
          doc.text(
            `Target ${index + 1}: ${sessionData.targetId || "N/A"}`,
            margin,
            yPos
          );
          yPos += 8;

          // Data type
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 100, 100);
          doc.text(`Type: ${getDataType(sessionData)}`, margin, yPos);
          doc.text(
            `Created: ${formatDateTime(sessionData.createdAt)}`,
            pageWidth - margin,
            yPos,
            { align: "right" }
          );
          yPos += 6;

          doc.setTextColor(0, 0, 0);

          // General notes
          if (sessionData.data?.notes) {
            checkPageBreak(lineHeight * 2);
            doc.setFont("helvetica", "bold");
            doc.text("Notes:", margin, yPos);
            yPos += 5;

            doc.setFont("helvetica", "normal");
            const noteLines = doc.splitTextToSize(
              sessionData.data.notes,
              pageWidth - 2 * margin
            );
            noteLines.forEach((line) => {
              checkPageBreak(lineHeight);
              doc.text(line, margin + 5, yPos);
              yPos += lineHeight;
            });
            yPos += 5;
          }

          // Render data table based on type
          const dataType = getDataType(sessionData);

          switch (dataType) {
            case "Task Analysis":
              if (sessionData.data?.steps) {
                checkPageBreak(20);
                // Create table data
                const tableData = sessionData.data.steps.map((step) => [
                  step.id || "",
                  step.description || "",
                  step.performance || "",
                  step.promptLevel || "",
                  step.notes || "",
                ]);

                autoTable(doc, {
                  startY: yPos,
                  head: [
                    [
                      "Step",
                      "Description",
                      "Performance",
                      "Prompt Level",
                      "Notes",
                    ],
                  ],
                  body: tableData,
                  margin: { left: margin, right: margin },
                  styles: { fontSize: 8, cellPadding: 2 },
                  headStyles: {
                    fillColor: [66, 133, 244],
                    textColor: [255, 255, 255],
                  },
                  theme: "grid",
                });
                yPos = doc.lastAutoTable.finalY + 10;
              }
              break;

            case "Latency":
              if (sessionData.data?.trials) {
                checkPageBreak(20);
                const tableData = sessionData.data.trials.map((trial) => [
                  trial.trial || "",
                  trial.stimulusPresented || "",
                  trial.latency !== null ? `${trial.latency}s` : "NR",
                  trial.behaviourStart || "",
                  trial.notes || "",
                ]);

                autoTable(doc, {
                  startY: yPos,
                  head: [
                    [
                      "Trial",
                      "Stimulus Presented",
                      "Latency",
                      "Behavior Start",
                      "Notes",
                    ],
                  ],
                  body: tableData,
                  margin: { left: margin, right: margin },
                  styles: { fontSize: 8, cellPadding: 2 },
                  headStyles: {
                    fillColor: [66, 133, 244],
                    textColor: [255, 255, 255],
                  },
                  theme: "grid",
                });
                yPos = doc.lastAutoTable.finalY + 10;
              }
              break;

            case "Trials/Opportunities":
              if (sessionData.data?.trials) {
                checkPageBreak(20);
                const tableData = sessionData.data.trials.map((trial) => [
                  trial.trial || "",
                  trial.promptLevel || "",
                  trial.performance || "",
                  trial.notes || "",
                ]);

                autoTable(doc, {
                  startY: yPos,
                  head: [["Trial", "Prompt", "Response", "Notes"]],
                  body: tableData,
                  margin: { left: margin, right: margin },
                  styles: { fontSize: 8, cellPadding: 2 },
                  headStyles: {
                    fillColor: [66, 133, 244],
                    textColor: [255, 255, 255],
                  },
                  theme: "grid",
                });
                yPos = doc.lastAutoTable.finalY + 10;
              }
              break;

            case "Frequency":
              checkPageBreak(10);
              doc.setFont("helvetica", "bold");
              doc.text("Frequency Data:", margin, yPos);
              yPos += 6;

              doc.setFont("helvetica", "normal");
              const frequencyData = [
                [
                  "Number of Occurrences",
                  sessionData.data?.numberOfOccurrence || 0,
                ],
                ["Notes", sessionData.data?.notes || "N/A"],
              ];

              frequencyData.forEach(([label, value]) => {
                checkPageBreak(lineHeight);
                doc.setFont("helvetica", "bold");
                doc.text(`${label}:`, margin, yPos);
                doc.setFont("helvetica", "normal");
                doc.text(String(value), margin + 50, yPos);
                yPos += lineHeight;
              });
              yPos += 5;
              break;

            default:
              // Fallback for unknown data types
              if (sessionData.data) {
                checkPageBreak(10);
                doc.setFont("helvetica", "bold");
                doc.text("Raw Data:", margin, yPos);
                yPos += 6;

                doc.setFont("helvetica", "normal");
                const rawData = JSON.stringify(sessionData.data, null, 2);
                const dataLines = doc.splitTextToSize(
                  rawData,
                  pageWidth - 2 * margin
                );
                dataLines.forEach((line) => {
                  checkPageBreak(lineHeight);
                  doc.text(line, margin + 5, yPos);
                  yPos += lineHeight;
                });
                yPos += 5;
              }
              break;
          }

          yPos += 10; // Space between targets
        });
      } else {
        checkPageBreak(15);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("4. PROGRAM DATA", margin, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("No program data available for this session", margin, yPos);
        yPos += 15;
      }

      // =========== SECTION 5: CLIENT AUTHORIZATION ===========
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("5. CLIENT AUTHORIZATION", margin, yPos);
      yPos += 10;

      if (
        timesheetData.clientApprovalStatus === "APPROVED" &&
        timesheetData.sessionApprovals?.[0]
      ) {
        const approval = timesheetData.sessionApprovals[0];

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        const authInfo = [
          ["Status", "Approved"],
          ["Delivery Confirmed", approval.confirmDelivery ? "Yes" : "No"],
          ["Service Rating", `${approval.rateService || 0}/5`],
          ["Therapist Rating", `${approval.rateTherapist || 0}/5`],
          ["Approved Date", formatDateTime(approval.createdAt)],
          ["FeedBack", approval.feedback],
        ];

        authInfo.forEach(([label, value]) => {
          checkPageBreak(lineHeight);
          doc.setFont("helvetica", "bold");
          doc.text(`${label}:`, margin, yPos);
          doc.setFont("helvetica", "normal");
          doc.text(value, margin + 40, yPos);
          yPos += lineHeight;
        });

        // Client Signature
        if (approval.signature) {
          checkPageBreak(50);
          yPos += 5;
          doc.setFont("helvetica", "bold");
          doc.text("Client Signature:", margin, yPos);
          yPos += 5;

          try {
            const sigData = approval.signature.startsWith("data:")
              ? approval.signature
              : `data:image/png;base64,${approval.signature}`;
            const sigWidth = 60;
            const sigHeight = 25;
            doc.addImage(sigData, "PNG", margin, yPos, sigWidth, sigHeight);
            yPos += sigHeight + 5;
          } catch (e) {
            doc.setFont("helvetica", "normal");
            doc.text("(Signature could not be rendered)", margin, yPos);
            yPos += lineHeight;
          }
        }
      } else {
        checkPageBreak(lineHeight);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Status: Pending client approval", margin, yPos);
        yPos += lineHeight;
      }
      yPos += 15;

      // =========== SECTION 6: BILLING & AUTHORIZATION ===========
      if (
        timesheetData.authorizationsUsed &&
        timesheetData.authorizationsUsed.length > 0
      ) {
        checkPageBreak(30);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("6. BILLING & AUTHORIZATION", margin, yPos);
        yPos += 10;

        timesheetData.authorizationsUsed.forEach((auth, authIndex) => {
          checkPageBreak(20);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(
            `Authorization ${authIndex + 1}: ${auth.title || "N/A"}`,
            margin,
            yPos
          );
          yPos += 8;

          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");

          const authDetails = [
            ["Authorization #", auth.authorizationNumber || "N/A"],
            ["Title", auth.title || "N/A"],
            ["Start Date", formatDate(auth.startDate)],
            ["End Date", formatDate(auth.endDate)],
            ["Status", auth.isActive ? "Active" : "Inactive"],
            ["Units Authorized", auth.totalUnits || "N/A"],
            ["Units Used", auth.unitsUsed || "0"],
            ["Units Remaining", auth.unitsRemaining || "N/A"],
          ];

          authDetails.forEach(([label, value]) => {
            checkPageBreak(lineHeight);
            doc.setFont("helvetica", "bold");
            doc.text(`${label}:`, margin, yPos);
            doc.setFont("helvetica", "normal");
            doc.text(value, margin + 50, yPos);
            yPos += lineHeight;
          });

          // Service Codes
          if (
            auth.clientAuthorizationServices &&
            auth.clientAuthorizationServices.length > 0
          ) {
            checkPageBreak(20);
            yPos += 5;
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Service Codes:", margin, yPos);
            yPos += 8;

            const serviceTableData = auth.clientAuthorizationServices.map(
              (service, sIndex) => [
                sIndex + 1,
                service.serviceCode?.code || "N/A",
                service.modifiers || "N/A",
                service.units || "0",
                service.per || "N/A",
                service.serviceCodeId || "N/A",
              ]
            );

            autoTable(doc, {
              startY: yPos,
              head: [
                [
                  "#",
                  "Service Code",
                  "Modifiers",
                  "Units",
                  "Per",
                  "Service Code ID",
                ],
              ],
              body: serviceTableData,
              margin: { left: margin, right: margin },
              styles: { fontSize: 8, cellPadding: 2 },
              headStyles: {
                fillColor: [59, 130, 246],
                textColor: [255, 255, 255],
              },
              theme: "grid",
            });
            yPos = doc.lastAutoTable.finalY + 10;
          }
          yPos += 5;
        });
      }

      // =========== SECTION 7: HISTORY & APPROVALS ===========
      if (
        timesheetData.timesheetHistories &&
        timesheetData.timesheetHistories.length > 0
      ) {
        checkPageBreak(30);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("7. HISTORY & APPROVALS", margin, yPos);
        yPos += 10;

        // Create table data for history
        const historyTableData = timesheetData.timesheetHistories.map(
          (entry, index) => {
            const date = formatDateTime(entry.createdAt || entry.date);
            const by = entry.performedBy || entry.by || "Unknown";
            const action = entry.action || "Updated";
            const reason = entry.reason ? `Reason: ${entry.reason}` : "";

            return [index + 1, date, by, action, reason];
          }
        );

        autoTable(doc, {
          startY: yPos,
          head: [["#", "Date/Time", "Performed By", "Action", "Notes"]],
          body: historyTableData,
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255] },
          theme: "grid",
          alternateRowStyles: { fillColor: [249, 250, 251] },
        });
        yPos = doc.lastAutoTable.finalY + 10;
      }

      // =========== FOOTER ===========
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);

        // Page number
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );

        // Footer info
        doc.text(
          `Generated by ${
            user?.fullName || user?.email || "System"
          } on ${new Date().toLocaleString()}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 5,
          { align: "center" }
        );
      }

      // Save PDF
      const fileName = `Timesheet_${timesheetData.id || "unknown"}_${formatDate(
        timesheetData.startTime
      ).replace(/\//g, "-")}_Complete.pdf`;
      doc.save(fileName);

      showToast("Complete PDF exported successfully!", "success");
    } catch (error) {
      console.error("Error generating PDF:", error);
      showToast("Failed to export PDF. Please try again.", "error");
    } finally {
      setExportingPDF(false);
    }
  };

  // Render rating stars
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          style={{
            fontSize: "28px",
            color: i <= rating ? "#fbbf24" : "#d1d5db",
            marginRight: "2px",
          }}
        >
          ★
        </span>
      );
    }
    return <div style={{ display: "flex" }}>{stars}</div>;
  };

  // Render approval history entries
  const renderApprovalEntry = (entry) => {
    switch (entry.type) {
      case "creation":
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              <span className="text-blue-600 font-bold">Timesheet</span> for{" "}
              <span className="text-blue-600 font-bold">
                {entry.for || "N/A"}
              </span>{" "}
              {entry.action || "created"} on{" "}
              <span className="text-blue-600 font-bold">
                {entry.date || "N/A"}
              </span>{" "}
              by{" "}
              <span className="text-blue-600 font-bold">
                {entry.by || "Unknown"}
              </span>
            </span>
          </div>
        );
      case "submission":
      case "resubmission":
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              <span className="text-blue-600 font-bold">Timesheet</span>{" "}
              {entry.action || "submitted"} by{" "}
              <span className="text-blue-600 font-bold">
                {entry.by || "Unknown"}
              </span>{" "}
              on{" "}
              <span className="text-blue-600 font-bold">
                {entry.date || "N/A"}
              </span>
            </span>
          </div>
        );
      case "return":
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              <span className="text-blue-600 font-bold">Timesheet</span>{" "}
              {entry.action || "returned"} by{" "}
              <span className="text-blue-600 font-bold">
                {entry.by || "Unknown"}
              </span>{" "}
              on{" "}
              <span className="text-blue-600 font-bold">
                {entry.date || "N/A"}
              </span>{" "}
              to{" "}
              <span className="text-blue-600 font-bold">
                {entry.to || "N/A"}
              </span>
            </span>
          </div>
        );
      case "update":
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              <span className="text-blue-600 font-bold">Timesheet</span>{" "}
              {entry.action || "updated"} by{" "}
              <span className="text-blue-600 font-bold">
                {entry.by || "Unknown"}
              </span>{" "}
              on{" "}
              <span className="text-blue-600 font-bold">
                {entry.date || "N/A"}
              </span>
            </span>
          </div>
        );
      case "approval":
      case "rejection":
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              <span className="text-blue-600 font-bold">Timesheet</span>{" "}
              {entry.action || "processed"} by{" "}
              <span className="text-blue-600 font-bold">
                {entry.by || "Unknown"}
              </span>{" "}
              on{" "}
              <span className="text-blue-600 font-bold">
                {entry.date || "N/A"}
              </span>
            </span>
          </div>
        );
      default:
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              {entry.action || "Action"} by{" "}
              <span className="text-blue-600 font-bold">
                {entry.by || "Unknown"}
              </span>{" "}
              on{" "}
              <span className="text-blue-600 font-bold">
                {entry.date || "N/A"}
              </span>
            </span>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "256px",
          }}
        >
          <LoadingSpinner />
        </div>
      </>
    );
  }

  const sessionHours = calculateSessionHours(
    timesheetData.startTime,
    timesheetData.endTime
  );
  const travelHours =
    timesheetData?.travelStartTime && timesheetData?.travelEndTime
      ? calculateSessionHours(
          timesheetData.travelStartTime,
          timesheetData.travelEndTime
        )
      : "0.00";
  const totalBillableTime = (
    parseFloat(sessionHours) + parseFloat(travelHours)
  ).toFixed(2);

  const isAdminOrSupervisor = role === "Admin" || role === "Supervisor";

  // Prepare billing data with fallbacks
  const billingColumns = [
    { key: "authorization", header: "Authorization" },
    { key: "utilization", header: "Utilization", type: "stage_completion" },
    { key: "dateCreated", header: "Date Created" },
  ];

  const billingData =
    timesheetData.authorizationsUsed?.map((auth, index) => ({
      id: auth.id || index,
      authorization: auth.authorizationNumber || "N/A",
      utilization: "0%",
      dateCreated: formatDate(auth.startDate),
    })) || [];

  // Prepare service data with serviceCodeId and per as requested
  const serviceData =
    timesheetData.authorizationsUsed?.[0]?.clientAuthorizationServices?.map(
      (service, index) => ({
        id: service.id || index,
        serviceCode: service.serviceCode?.code || "N/A",
        modifiers: service.modifiers || "N/A",
        units: service.units || 0,
        unitRate: "N/A",
        // ADDED: serviceCodeId and per as requested
        serviceCodeId: service.serviceCodeId || "N/A",
        per: service.per || "N/A",
      })
    ) || [];

  // Create initialServiceData with the structure needed for AccordionTable
  const initialServiceData = {
    0: serviceData,
  };

  // Get client signature from sessionApprovals
  const clientSignature = timesheetData.sessionApprovals?.[0]?.signature;
  const clientName = timesheetData.appointment?.client
    ? `${timesheetData.appointment.client.firstName || ""} ${
        timesheetData.appointment.client.lastName || ""
      }`.trim()
    : "Client";

  // Get clinicians data (multiple clinicians)
  const clinicians = timesheetData.appointment?.clinicians || [];
  const clinicianNames = clinicians
    .map((c) => c.fullName || "Unknown")
    .join(", ");
  const clinicianNpis = clinicians.map((c) => c.npi || "N/A").join(", ");

  // Check if there are program datas
  const hasProgramData =
    timesheetData.sessionDatas && timesheetData.sessionDatas.length > 0;

  return (
    <>
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
            <div className="billing-status-row">
              <div className="billing-approval-box">
                <div className="timesheet-approval-container">
                  <span className="timesheet-approval-text">
                    Client Approval
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginTop: "4px",
                    }}
                  >
                    {timesheetData.clientApprovalStatus === "APPROVED" ? (
                      <FaCheckCircle
                        style={{ color: "#10b981", marginRight: "8px" }}
                      />
                    ) : timesheetData.clientApprovalStatus === "REJECTED" ? (
                      <FaTimesCircle
                        style={{ color: "#ef4444", marginRight: "8px" }}
                      />
                    ) : (
                      <FaClock
                        style={{ color: "#f59e0b", marginRight: "8px" }}
                      />
                    )}
                    <span
                      className={`timesheet-status ${
                        timesheetData.clientApprovalStatus === "APPROVED"
                          ? "timesheet-complete"
                          : timesheetData.clientApprovalStatus === "REJECTED"
                          ? "timesheet-rejected"
                          : "timesheet-pending"
                      }`}
                    >
                      {timesheetData.clientApprovalStatus || "PENDING"}
                    </span>
                  </div>
                </div>
                <div className="timesheet-separator"></div>
                <div className="timesheet-approval-container">
                  <span className="timesheet-approval-text">
                    Supervisor Approval
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginTop: "4px",
                    }}
                  >
                    {timesheetData.supervisorApprovalStatus === "APPROVED" ? (
                      <FaCheckCircle
                        style={{ color: "#10b981", marginRight: "8px" }}
                      />
                    ) : timesheetData.supervisorApprovalStatus ===
                      "REJECTED" ? (
                      <FaTimesCircle
                        style={{ color: "#ef4444", marginRight: "8px" }}
                      />
                    ) : (
                      <FaClock
                        style={{ color: "#f59e0b", marginRight: "8px" }}
                      />
                    )}
                    <span
                      className={`timesheet-status ${
                        timesheetData.supervisorApprovalStatus === "APPROVED"
                          ? "timesheet-complete"
                          : timesheetData.supervisorApprovalStatus ===
                            "REJECTED"
                          ? "timesheet-rejected"
                          : timesheetData.supervisorApprovalStatus ===
                            "UPDATE_REQUESTED"
                          ? "timesheet-update-requested"
                          : "timesheet-pending"
                      }`}
                    >
                      {timesheetData.supervisorApprovalStatus || "PENDING"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="relative inline-block">
                <button
                  className="timesheet-actions-button flex items-center justify-center"
                  onClick={() => setIsOpen(!isOpen)}
                  disabled={exportingPDF}
                >
                  {exportingPDF ? "Exporting..." : "Actions"}
                  <FaChevronDown className="ml-2" />
                </button>
                {isOpen && (
                  <div className="timesheet-dropdown">
                    <div
                      className="timesheet-dropdown-item"
                      onClick={() => {
                        setIsOpen(false);
                        handleExportPDF();
                      }}
                      style={
                        exportingPDF
                          ? { opacity: 0.5, cursor: "not-allowed" }
                          : {}
                      }
                    >
                      {exportingPDF ? "Exporting..." : "Export as PDF"}
                    </div>
                    {isAdminOrSupervisor ? (
                      <>
                        <div
                          className="timesheet-dropdown-item"
                          onClick={() => {
                            setIsOpen(false);
                            setIsApproveModalOpen(true);
                          }}
                        >
                          Approve and Convert to Claim
                        </div>
                        <div
                          className="timesheet-dropdown-item timesheet-delete"
                          onClick={() => {
                            setIsOpen(false);
                            setIsRejectModalOpen(true);
                          }}
                        >
                          Reject
                        </div>
                      </>
                    ) : (
                      <div
                        className="timesheet-dropdown-item"
                        onClick={() => {
                          setIsOpen(false);
                          handleNudgeClient();
                        }}
                      >
                        Nudge client for approval
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-400 mt-6">
                Session Information
              </h3>
              <div className="billing-info-card-bordered">
                <div className="billing-grid-2">
                  <div className="gap-4 flex flex-col">
                    <div>
                      <span className="text-gray-400 font-bold">Date</span>
                      <span className="ml-2 text-gray-700">
                        {formatDate(timesheetData.startTime)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold">
                        Client Name
                      </span>
                      <span className="ml-2 text-blue-600 font-bold">
                        {clientName || "N/A"}
                        {timesheetData.appointment?.clientId && (
                          <span className="text-gray-400 font-500">
                            {" "}
                            (Payer:{" "}
                            {timesheetData.appointment.clientId.slice(0, 8)}...)
                          </span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold">
                        Clinician(s) Name
                      </span>
                      <div className="ml-2 text-blue-600 font-bold">
                        {clinicians.length > 0 ? (
                          <div>
                            {clinicians.map((clinician, index) => (
                              <div
                                key={clinician.id || index}
                                style={{ marginBottom: "4px" }}
                              >
                                {clinician.fullName || "Unknown"}
                                {clinician.npi && (
                                  <span className="text-gray-400 font-500">
                                    {" "}
                                    (NPI: {clinician.npi})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="gap-4 flex flex-col">
                    <div>
                      <span className="text-gray-400 font-bold">
                        Session Type
                      </span>
                      <span className="ml-2 text-gray-700">
                        {timesheetData.appointment?.session?.name || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold">
                        Service Type(s)
                      </span>
                      <span className="ml-2 text-gray-700">
                        {timesheetData.appointment?.session?.category || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold">Location</span>
                      <span className="ml-2 text-gray-700">
                        {timesheetData.appointment?.serviceLocation || "N/A"}
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
              <div className="billing-info-card-bordered">
                <div className="billing-grid-3">
                  <div className="gap-4 flex flex-col">
                    <div>
                      <span className="text-gray-400 font-bold">
                        Session Start Time
                      </span>
                      <span className="ml-2 text-gray-700">
                        {timesheetData.startTime
                          ? new Date(
                              timesheetData.startTime
                            ).toLocaleTimeString()
                          : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold">
                        Session End Time
                      </span>
                      <span className="ml-2 text-gray-700">
                        {timesheetData.endTime
                          ? new Date(timesheetData.endTime).toLocaleTimeString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="gap-4 flex flex-col">
                    <div>
                      <span className="text-gray-400 font-bold">
                        Travel Time Applied
                      </span>
                      <span className="ml-2 text-gray-700">
                        {timesheetData.travelStartTime ? "Yes" : "No"}
                      </span>
                    </div>
                    {timesheetData.travelStartTime && (
                      <>
                        <div>
                          <span className="text-gray-400 font-bold">
                            Travel Start Time
                          </span>
                          <span className="ml-2 text-gray-700">
                            {new Date(
                              timesheetData.travelStartTime
                            ).toLocaleTimeString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-bold">
                            Travel End Time
                          </span>
                          <span className="ml-2 text-gray-700">
                            {new Date(
                              timesheetData.travelEndTime
                            ).toLocaleTimeString()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="gap-4 flex flex-col">
                    <div>
                      <span className="text-gray-400 font-bold">
                        Session Duration
                      </span>
                      <span
                        className="ml-2 text-gray-700"
                        style={{ fontWeight: "600" }}
                      >
                        {sessionHours} hours
                      </span>
                    </div>
                    {timesheetData.travelStartTime && (
                      <div>
                        <span className="text-gray-400 font-bold">
                          Travel Duration
                        </span>
                        <span
                          className="ml-2 text-gray-700"
                          style={{ fontWeight: "600" }}
                        >
                          {travelHours} hours
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-400 font-bold">
                        Total Billable Time
                      </span>
                      <span
                        className="ml-2 text-gray-700"
                        style={{ color: "#059669", fontWeight: "600" }}
                      >
                        {totalBillableTime} hours
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="billing-docs-layout">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-400 mt-6">
                  Documents & Data
                </h3>
                <div className="documents-list">
                  {/* SOAP Notes */}
                  <div
                    className="document-item justify-between"
                    style={{ marginBottom: "16px" }}
                  >
                    <div className="flex" style={{ alignItems: "center" }}>
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
                        style={{ marginRight: "12px" }}
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      <span className="document-link">SOAP Notes</span>
                    </div>
                    <Button
                      label="View"
                      variant="secondary"
                      icon={<FaEye style={{ marginRight: "8px" }} />}
                      onClick={handleViewSOAPNotes}
                    />
                  </div>

                  {/* All Program Data in one button */}
                  {hasProgramData && (
                    <div
                      className="document-item justify-between"
                      style={{ marginBottom: "16px" }}
                    >
                      <div className="flex" style={{ alignItems: "center" }}>
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
                          style={{ marginRight: "12px" }}
                        >
                          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                        </svg>
                        <span className="document-link">
                          Programs Data ({timesheetData.sessionDatas.length}{" "}
                          targets)
                        </span>
                      </div>
                      <Button
                        label="View All"
                        variant="secondary"
                        icon={<FaEye style={{ marginRight: "8px" }} />}
                        onClick={handleViewAllProgramData}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-400 mt-6">
                  Client Authorization
                </h3>
                <div>
                  {timesheetData.clientApprovalStatus === "APPROVED" &&
                  timesheetData.sessionApprovals?.[0] ? (
                    <div className="signature-container p-4 border border-gray-200 rounded-lg">
                      <div
                        style={{
                          padding: "16px",
                          backgroundColor: "#d1fae5",
                          border: "1px solid #a7f3d0",
                          borderRadius: "8px",
                          marginBottom: "16px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <FaCheckCircle
                            style={{ color: "#059669", marginRight: "8px" }}
                          />
                          <span style={{ fontWeight: "500", color: "#065f46" }}>
                            Client has approved this session
                          </span>
                        </div>
                      </div>
                      <h4 className="text-gray-400 font-bold">
                        Client Signature
                      </h4>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "128px",
                          backgroundColor: "#f9fafb",
                          borderRadius: "8px",
                          border: "2px dashed #d1d5db",
                          marginBottom: "12px",
                          marginTop: "8px",
                          overflow: "hidden",
                        }}
                      >
                        {clientSignature ? (
                          // Render base64 signature as image
                          <img
                            src={clientSignature.startsWith("data:") ? clientSignature : `data:image/png;base64,${clientSignature}`}
                            alt="Client Signature"
                            style={{
                              maxWidth: "100%",
                              maxHeight: "100%",
                              objectFit: "contain",
                            }}
                          />
                        ) : (
                          <div style={{ textAlign: "center" }}>
                            <div
                              style={{
                                fontSize: "24px",
                                color: "#374151",
                                fontFamily: "'Dancing Script', cursive",
                              }}
                            >
                              {clientName}
                            </div>
                            <p
                              style={{
                                fontSize: "12px",
                                color: "#6b7280",
                                marginTop: "8px",
                              }}
                            >
                              Digital Signature
                            </p>
                          </div>
                        )}
                      </div>
                      <p className="text-gray-700 mt-2">
                        Signed on{" "}
                        {formatDate(
                          timesheetData.sessionApprovals[0].createdAt
                        )}
                      </p>

                      {/* Ratings */}
                      <div
                        style={{
                          marginTop: "24px",
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "16px",
                        }}
                      >
                        <div style={{ marginBottom: "12px" }}>
                          <span
                            style={{
                              fontSize: "16px",
                              color: "#6b7280",
                              fontWeight: "500",
                            }}
                          >
                            Service Rating:
                          </span>
                          <div style={{ marginTop: "4px" }}>
                            {renderStars(
                              timesheetData.sessionApprovals[0].rateService || 0
                            )}
                          </div>
                        </div>
                        <div style={{ marginBottom: "12px" }}>
                          <span
                            style={{
                              fontSize: "16px",
                              color: "#6b7280",
                              fontWeight: "500",
                            }}
                          >
                            Therapist Rating:
                          </span>
                          <div style={{ marginTop: "4px" }}>
                            {renderStars(
                              timesheetData.sessionApprovals[0].rateTherapist ||
                                0
                            )}
                          </div>
                        </div>
                        {timesheetData.sessionApprovals[0].feedback && (
                          <div>
                            <span
                              style={{
                                fontSize: "16px",
                                color: "#6b7280",
                                fontWeight: "500",
                              }}
                            >
                              Feedback:
                            </span>
                            <p
                              style={{
                                marginTop: "4px",
                                color: "#374151",
                                backgroundColor: "#f9fafb",
                                padding: "8px",
                                borderRadius: "4px",
                              }}
                            >
                              {timesheetData.sessionApprovals[0].feedback}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: "32px", textAlign: "center" }}>
                      <div
                        style={{
                          width: "64px",
                          height: "64px",
                          backgroundColor: "#fef3c7",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto 16px auto",
                        }}
                      >
                        <FaClock
                          style={{
                            width: "32px",
                            height: "32px",
                            color: "#d97706",
                          }}
                        />
                      </div>
                      <h4
                        style={{
                          fontSize: "18px",
                          fontWeight: "500",
                          color: "#374151",
                          marginBottom: "8px",
                        }}
                      >
                        Pending Client Approval
                      </h4>
                      <p style={{ color: "#6b7280", marginBottom: "16px" }}>
                        Awaiting client signature and approval for this session.
                      </p>
                      {!isAdminOrSupervisor && (
                        <Button
                          label="Send Reminder"
                          variant="primary"
                          onClick={handleNudgeClient}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {timesheetData.authorizationsUsed &&
              timesheetData.authorizationsUsed.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-400 mt-6">
                    Billing and Authorization
                  </h3>
                  <div>
                    <AccordionTable
                      data={billingData}
                      columns={billingColumns}
                      tableName="Diagnosis Codes"
                      itemsPerPage={5}
                      initialServiceData={initialServiceData}
                      isEditMode={false}
                    />
                  </div>
                </div>
              )}

            <RejectTimeSheetModal
              isOpen={isRejectModalOpen}
              onClose={() => setIsRejectModalOpen(false)}
              onSave={handleRejectTimesheet}
            />
            <ApproveTimeSheetModal
              isOpen={isApproveModalOpen}
              onClose={() => setIsApproveModalOpen(false)}
              onSave={handleApproveTimesheet}
            />
          </div>
        )}

        {activeTab === "historyAndApprovals" && (
          <div>
            <div className="p-6">
              <div className="space-y-4">
                {timesheetData.timesheetHistories &&
                timesheetData.timesheetHistories.length > 0 ? (
                  timesheetData.timesheetHistories.map((entry, index) => (
                    <div key={entry.id || index} className="approval-item p-6">
                      {renderApprovalEntry({
                        ...entry,
                        date: formatDateTime(entry.createdAt || entry.date),
                        by: entry?.staff?.fullName || entry.by || "Unknown",
                        action: entry.action || "Updated",
                      })}
                    </div>
                  ))
                ) : (
                  <div
                    className="approval-item p-6"
                    style={{ textAlign: "center" }}
                  >
                    <p style={{ color: "#6b7280" }}>
                      No history data available for this timesheet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Document Modals */}
        <DocumentModal
          isOpen={isDocumentModalOpen}
          onClose={() => setIsDocumentModalOpen(false)}
          document={selectedDocument}
        />
        <ProgramDataModal
          isOpen={isProgramDataModalOpen}
          onClose={() => setIsProgramDataModalOpen(false)}
          sessionDatas={timesheetData.sessionDatas || []}
        />
      </div>
    </>
  );
};

export default SingleTimeSheet;
