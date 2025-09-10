import React, { useState, useCallback, useRef, useEffect } from "react";
import DashboardLayout from "../../Layout/TenantLayout";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "./TargetSingle.css";
import {
  exportTableData,
  printTableData,
  exportTableToPDF,
} from "../../utils/TableUtils";
import Button from "../../Components/Button/Button";
import Chart from "react-apexcharts";
import CustomTable from "../../Components/Table/CustomTable";
import { useSelector } from "react-redux";
import api from "../../api/ProgramLibraryApis";
import LoadingSpinner from "../../Components/LoadingSpinner";
import { showToast } from "../../Helper/ShowToast";
import FrequencyModal from "../../Components/ReusableModal/DataCollectionModal/FrequencyModal";
import DurationModal from "../../Components/ReusableModal/DataCollectionModal/DurationModal";
import RateModal from "../../Components/ReusableModal/DataCollectionModal/RateModal";
import PercentageCorrectModal from "../../Components/ReusableModal/DataCollectionModal/PercentageCorrectModal";
import TrialsOpportunitiesModal from "../../Components/ReusableModal/DataCollectionModal/TrialsOpportunitiesModal";
import TaskAnalysisModal from "../../Components/ReusableModal/DataCollectionModal/TaskAnalysisModal";
import LatencyModal from "../../Components/ReusableModal/DataCollectionModal/LatencyModal";

const TargetSingle = () => {
  const navigate = useNavigate();
  const { domainName, programName, targetName } = useParams();
  const [searchParams] = useSearchParams();
  const targetId = searchParams.get("targetId");
  const clientId = searchParams.get("clientId");
  const token = useSelector((s) => s.authentication?.user?.token);
  const accessToken = token;
  const refreshToken = token;

  // State for dropdowns and data
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [targetInfo, setTargetInfo] = useState(null);
  const [baselineData, setBaselineData] = useState(null);
  const [clientTargetId, setClientTargetId] = useState(null);
  const [hasPerformanceData, setHasPerformanceData] = useState(false);
  const [hasSessionData, setHasSessionData] = useState(false);
  const [showPerformanceGraph, setShowPerformanceGraph] = useState(true);
  const [timeRange, setTimeRange] = useState("All time");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Modal states
  const [activeModal, setActiveModal] = useState(null);
  const [modalData, setModalData] = useState({});

  // Refs for positioning dropdowns
  const exportButtonRef = useRef(null);
  const exportDropdownRef = useRef(null);
  const tableContainerRef = useRef(null);

  // Performance graph data (mock for now)
  const performanceData = {
    series: [
      {
        name: "Sessions",
        data: [25, 28, 30, 32, 35, 38, 40, 42, 45, 48, 50, 45],
      },
    ],
    options: {
      chart: {
        type: "area",
        height: 200,
        toolbar: { show: false },
      },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 2 },
      fill: {
        type: "gradient",
        gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 1 },
      },
      xaxis: {
        categories: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ],
        labels: { style: { colors: "#6B7280" } },
      },
      yaxis: { labels: { show: false } },
      colors: ["#3B82F6"],
      tooltip: { x: { format: "MMM" } },
    },
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (clientId && targetId) {
        res = await api.GetTargetInfoByTargetIdAndClientId({
          clientId,
          targetId,
          accessToken,
          refreshToken,
        });
      } else if (targetId) {
        res = await api.GetProgramsTargetById({
          Id: targetId,
          accessToken,
          refreshToken,
        });
      } else {
        throw new Error("Missing targetId");
      }

      let target;
      if (clientId && targetId) {
        target = res?.data?.data?.[0]?.target;
      } else {
        target = res?.data?.data;
      }

      if (target) {
        let taskSteps = [];
        if (target.taskSteps) {
          try {
            // Transform taskSteps into array of objects for TaskAnalysisModal
            taskSteps = Array.isArray(target.taskSteps)
              ? target.taskSteps.map((step, index) => ({
                  id: index + 1,
                  description: typeof step === "string" ? step : step.description || "",
                }))
              : typeof target.taskSteps === "string"
                ? JSON.parse(target.taskSteps).map((step, index) => ({
                    id: index + 1,
                    description: typeof step === "string" ? step : step.description || "",
                  }))
                : [];
          } catch (e) {
            console.error("Failed to parse taskSteps:", e);
            taskSteps = [];
          }
        }

        setTargetInfo({
          program: target.program?.name || "N/A",
          domain: target.program?.domain?.name || "N/A",
          target: target.name || "N/A",
          status: target.initialStatus || "Not Introduced",
          sd: target.sd || "N/A",
          expectedResponse: target.expectedResponse || "N/A",
          teachingProcedure: target.teachingProcedure || "N/A",
          promptingStrategy: target.promptingStrategy
            ? Array.isArray(target.promptingStrategy)
              ? target.promptingStrategy.map((p) => {
                  try {
                    return JSON.parse(p).label;
                  } catch {
                    return p;
                  }
                }).join(", ")
              : target.promptingStrategy
            : "N/A",
          dataCollectionType: target.dataCollectionType || "N/A",
          numberOfTrials: target.numberOfTrials || "N/A",
          taskSteps,
        });
      } else {
        setTargetInfo(null);
      }

      if (clientId && targetId) {
        const ctId = res?.data?.data?.[0]?.id;
        setClientTargetId(ctId);
        const baselineRes = await api.GetBaselineDataByClientTargetId({
          clientTargetId: ctId,
          accessToken,
          refreshToken,
        });
        const records = baselineRes?.data?.data || [];
        if (records.length > 0) {
          const latest = records[0];
          const type = target.dataCollectionType;
          setBaselineData({
            title: type,
            headers: getHeaders(type),
            data: getDataRows(type, latest.data),
            summary: getSummary(type, latest.data),
          });
          setHasPerformanceData(true);
          setHasSessionData(true);
        } else {
          setBaselineData(null);
          setHasPerformanceData(false);
          setHasSessionData(false);
        }
      } else {
        setBaselineData(null);
        setHasPerformanceData(false);
        setHasSessionData(false);
      }
    } catch (e) {
      setError(e.message || "Failed to fetch data");
      console.error("Fetch error:", e);
    }
    setLoading(false);
  }, [targetId, clientId, accessToken, refreshToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper functions for baseline formatting
  const getHeaders = (type) => {
    switch (type) {
      case "Frequency":
        return ["Count", "Notes"];
      case "Duration":
        return ["Duration", "Notes"];
      case "Rate":
        return ["Count", "Duration (sec)", "Rate", "Notes"];
      case "Percentage Correct":
        return ["Trial Count", "Prompt", "Response", "Notes"];
      case "Trials/Opportunities":
        return ["Trial Count", "Prompt", "Response", "Notes"];
      case "Task Analysis":
        return ["Step", "Description", "Response", "Prompt", "Notes"];
      case "Latency":
        return ["Trial Count", "SD Delivered Time", "Response", "Notes"];
      default:
        return [];
    }
  };

  const formatTimeFromString = (timeString) => {
    if (!timeString) return "12:00:00 AM";
    
    // Split the time string into hours, minutes, seconds
    const timeParts = timeString.split(':');
    
    // Ensure we have at least 3 parts (HH:mm:ss)
    if (timeParts.length >= 3) {
      let hours = parseInt(timeParts[0] || "00");
      const minutes = timeParts[1] || "00";
      const seconds = timeParts[2] || "00";
      
      // Determine AM/PM
      const period = hours >= 12 ? 'PM' : 'AM';
      
      // Convert to 12-hour format
      hours = hours % 12 || 12;
      
      // Format hours to always have 2 digits
      const formattedHours = hours.toString().padStart(2, '0');
      
      return `${formattedHours}:${minutes}:${seconds} ${period}`;
    }
    
    return "12:00:00 AM";
  };

  const getDataRows = (type, data) => {
    switch (type) {
      case "Frequency":
        return [{ count: data.numberOfOccurrence || 0, notes: data.notes || "N/A" }];
      case "Duration":
        return [{ duration: formatTime(data.duration || 0), notes: data.notes || "N/A" }];
      case "Rate":
        return [
          {
            count: data.numberOfOccurrence || 0,
            duration: data.duration || 0,
            rate: data.duration > 0 ? (data.numberOfOccurrence / (data.duration / 60)).toFixed(2) + "/min" : "N/A",
            notes: data.notes || "N/A",
          },
        ];
      case "Percentage Correct":
      case "Trials/Opportunities":
        return (data.trials || []).map((trial, index) => ({
          trialCount: index + 1,
          prompt: trial.promptLevel || "",
          response: trial.performance || "",
          notes: trial.notes || "N/A",
        }));
      case "Task Analysis":
        return (data.steps || []).map((step) => ({
          step: step.id,
          description: step.description || "",
          response: step.performance || "",
          prompt: step.promptLevel || "",
          notes: step.notes || "N/A",
        }));
      case "Latency":
        return (data.trials || []).map((trial) => ({
          trialCount: trial.trial,
          sdTime: formatTimeFromString(trial.stimulusPresented),
          response: trial.latency !== null ? `${trial.latency >= 0 ? "+" : ""}${trial.latency} secs` : "NR",
          notes: data.notes || "N/A",
        }));
      default:
        return [];
    }
  };

  const getSummary = (type, data) => {
    switch (type) {
      case "Percentage Correct":
        const percentageTrials = (data.trials || []).length;
        const correct = (data.trials || []).filter((t) => t.performance === "correct").length;
        return `Total Correct: ${correct}/${percentageTrials} | Accuracy: ${data.percentageCorrect || 0}%`;
      case "Trials/Opportunities":
        const trials = data.trials || [];
        const correctCount = trials.filter((t) => t.performance === "correct").length;
        const incorrectCount = trials.filter((t) => t.performance === "incorrect").length;
        const promptedCount = trials.filter((t) => t.promptLevel !== "independent").length;
        return `Trials: ${trials.length} | Correct: ${correctCount} | Incorrect: ${incorrectCount} | Prompted: ${promptedCount}`;
      default:
        return null;
    }
  };

  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return "Not set";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const onBack = () => {
    navigate("/program-library");
  };

  const handleExportCSV = useCallback(() => {
    setExportDropdownOpen(false);
  }, []);

  const handleExportPDF = useCallback(() => {
    setExportDropdownOpen(false);
  }, []);

  const handlePrint = useCallback(() => {
    // Implement print logic if needed
  }, []);

  const toggleExportDropdown = useCallback(() => {
    setExportDropdownOpen((prev) => !prev);
  }, []);

  const handleOpenModal = (modalName, data = {}) => {
    console.log("Opening modal:", modalName, "with data:", data);
    setActiveModal(modalName);
    setModalData(data);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setModalData({});
    setSubmitting(false);
  };

  const handleSaveData = async (data) => {
    if (!clientTargetId) {
      console.error("No clientTargetId available for saving data");
      showToast("Error: No client target ID available", "error");
      return;
    }
    setSubmitting(true);
    try {
      await api.CreateClientDataCollectionData({
        clientTargetId,
        data,
        accessToken,
        refreshToken,
      });
      showToast("Data saved successfully", "success");
      await fetchData();
    } catch (e) {
      console.error("Failed to save data", e);
      showToast("Failed to save data", "error");
    } finally {
      setSubmitting(false);
      handleCloseModal();
    }
  };

  const handleCollectData = () => {
    if (!clientId) {
      showToast("No client selected. Please select a client to collect data.", "error");
      console.error("No clientId provided, cannot open modal");
      return;
    }
    if (!targetInfo?.dataCollectionType || targetInfo.dataCollectionType === "N/A") {
      showToast("No valid data collection type found.", "error");
      console.error("No valid dataCollectionType found:", targetInfo?.dataCollectionType);
      return;
    }

    console.log("Data Collection Type:", targetInfo.dataCollectionType);

    let modalName;
    switch (targetInfo.dataCollectionType) {
      case "Frequency":
        modalName = "frequency";
        break;
      case "Duration":
        modalName = "duration";
        break;
      case "Rate":
        modalName = "rate";
        break;
      case "Percentage Correct":
        modalName = "percentage";
        break;
      case "Trials/Opportunities":
        modalName = "trials";
        break;
      case "Task Analysis":
        modalName = "task";
        break;
      case "Latency":
        modalName = "latency";
        break;
      default:
        showToast(`Unknown data collection type: ${targetInfo.dataCollectionType}`, "error");
        console.error("Unknown dataCollectionType:", targetInfo.dataCollectionType);
        return;
    }

    const extra = {};
    if (["percentage", "trials", "latency"].includes(modalName)) {
      extra.trialCount = targetInfo.numberOfTrials !== "N/A" ? targetInfo.numberOfTrials : 0;
    }
    if (modalName === "task") {
      extra.steps = targetInfo.taskSteps && targetInfo.taskSteps !== "N/A"
        ? targetInfo.taskSteps
        : [];
      console.log("Task Analysis steps:", extra.steps);
    }

    handleOpenModal(modalName, extra);
  };

  const togglePerformanceGraph = () => {
    setShowPerformanceGraph((prev) => !prev);
  };

  const renderEmptyState = (title, buttonLabel) => (
    <div className="bg-gray-200 rounded-sm shadow-md w-full p-20 mb-6">
      <div className="text-center py-8 text-gray-500">
        <div className="table-empty-state-content">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white-light2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <p className="mb-2 text-3xl font-bold text-gray-400">
          No {title.toLowerCase()} to show
        </p>
        <p className="text-gray-700 text-xl mb-2">
          {title} will be shown here once collected
        </p>
        {buttonLabel && (
          <Button
            label={buttonLabel}
            variant="secondary"
            onClick={handleCollectData}
          />
        )}
      </div>
    </div>
  );

  const renderBaselineTable = () => {
    if (loading) return <LoadingSpinner />;
    if (!baselineData) {
      return renderEmptyState("Baseline Data", "Collect Baseline Data");
    }

    return (
      <div className="baseline-table-container bg-white shadow-sm mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {baselineData.headers.map((header, index) => (
                  <th
                    key={index}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {baselineData.data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {Object.values(row).map((cellValue, colIndex) => (
                    <td
                      key={colIndex}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                    >
                      {cellValue}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {baselineData.summary && (
          <div className="summary-container p-6 text-center">
            <p className="text-sm text-blue-700 font-medium">
              {baselineData.summary}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderPerformanceGraph = () => {
    if (loading) return <LoadingSpinner />;
    if (!hasPerformanceData || !showPerformanceGraph) {
      return renderEmptyState("Performance Data", "Collect Data");
    }

    return (
      <div className="bg-white border-gray rounded-lg w-full p-20 mb-6">
        <div className="flex justify-center items-center mb-4">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-gray-700 text-base">
              {decodeURIComponent(targetName)}
            </h2>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-100 rounded-lg p-8 text-sm"
            >
              <option value="All time">All time</option>
              {[
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ].map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Chart
          options={performanceData.options}
          series={performanceData.series}
          type="area"
          height={350}
        />
      </div>
    );
  };

  const renderSessionData = () => {
    if (loading) return <LoadingSpinner />;
    if (!hasSessionData) {
      return renderEmptyState("Session Data", "Collect Data");
    }

    const columns = [
      { header: "Session", key: "sessions", type: "text" },
      { header: "Date", key: "dateTime", type: "day_time" },
      { header: "Session Type", key: "sessionType", type: "text" },
      { header: "Number of Trials", key: "numberOfTrials", type: "text" },
    ];

    const actions = [
      {
        type: "dropdown",
        label: "More",
        items: [
          {
            label: "View",
            onClick: (row) => console.log("View row", row),
          },
          {
            label: "Duplicate",
            onClick: (row) => console.log("Duplicate row", row),
          },
          { label: "Delete", className: "remove" },
        ],
        className: "more-dropdown",
      },
    ];

    const mockSessionData = [
      {
        id: 1,
        sessions: "Session 1",
        dateTime: { date: "2024-11-11", time: "10:00 pm" },
        sessionType: "Tele-health Session",
        numberOfTrials: 4,
        hasActions: true,
      },
      {
        id: 2,
        sessions: "Session 2",
        dateTime: { date: "2024-11-11", time: "10:00 pm" },
        sessionType: "T1 coaching",
        numberOfTrials: 8,
        hasActions: true,
      },
      {
        id: 3,
        sessions: "Session 3",
        dateTime: { date: "2024-11-11", time: "10:00 pm" },
        sessionType: "Group coaching",
        numberOfTrials: 12,
        hasActions: true,
      },
      {
        id: 4,
        sessions: "Session 4",
        dateTime: { date: "2024-11-11", time: "10:00 pm" },
        sessionType: "Parent/Caregiver training",
        numberOfTrials: 2,
        hasActions: true,
      },
    ];

    return (
      <div className="">
        <CustomTable
          data={mockSessionData}
          columns={columns}
          actions={actions}
          showActions={true}
          showCheckbox={false}
          itemsPerPage={10}
          tableName="Targets Session Data"
          loading={false}
          hideSearch={true}
          hideTableActions={true}
        />
      </div>
    );
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="program-column-header flex gap-4 items-center">
          <button
            className="back-button flex items-center gap-2 text-blue-600"
            onClick={onBack}
          >
            <FaArrowLeft />
            <span className="primary-text">Back</span>
          </button>
          <div className="breadcrumb-trail flex items-center gap-1 text-sm text-gray-600">
            <span className="breadcrumb-segment">
              {decodeURIComponent(domainName)}
            </span>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-segment">
              {decodeURIComponent(programName)}
            </span>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current font-semibold">
              {decodeURIComponent(targetName)}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="font-bold text-lg text-white-light">
              Target Information
            </h1>
            {clientId && targetInfo?.dataCollectionType !== "N/A" && (
              <Button
                label="Collect Data"
                variant="primary"
                onClick={handleCollectData}
              />
            )}
          </div>
          {loading ? (
            <LoadingSpinner />
          ) : targetInfo ? (
            <div className="bg-white-light2 rounded-lg w-full p-20 mb-6 grid grid-cols-3">
              <div className="mb-4">
                <h2 className="font-semibold text-gray-700 text-base mb-4">
                  Basic Details
                </h2>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-400">Program</p>
                    <p className="font-medium text-gray-600">{targetInfo.program}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-400">Domain</p>
                    <p className="font-medium text-gray-600">{targetInfo.domain}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-400">Target</p>
                    <p className="font-medium text-gray-600">{targetInfo.target}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-400">Status</p>
                    <p className="font-medium text-gray-600">
                      {targetInfo.status}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <h2 className="font-semibold text-gray-700 text-base mb-4">
                  Teaching Details
                </h2>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-600">SD</p>
                    <p className="font-medium text-gray-600">{targetInfo.sd}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-600">Expected Response</p>
                    <p className="font-medium text-gray-600">{targetInfo.expectedResponse}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-600">Teaching Procedure</p>
                    <p className="font-medium text-gray-600">{targetInfo.teachingProcedure}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-600">Prompting Strategy</p>
                    <p className="font-medium text-gray-600 w-70">{targetInfo.promptingStrategy}</p>
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <h2 className="font-semibold text-gray-700 text-base mb-4">
                  Data Collection
                </h2>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-600">Type</p>
                    <p className="font-medium text-gray-600">{targetInfo.dataCollectionType}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-600">No of Trials</p>
                    <p className="font-medium text-gray-600">{targetInfo.numberOfTrials}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-200 rounded-sm shadow-md w-full p-6 mb-6">
              <div className="text-center py-8 text-gray-500">
                <p className="mb-2 text-xl font-bold text-gray-400">
                  No target information available
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Baseline Data Section */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-bold text-lg text-white-light mb-4">
            Baseline Data
          </h1>
          <div className="flex gap-2">
            <div className="relative">
              <button onClick={toggleExportDropdown} ref={exportButtonRef}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              {exportDropdownOpen && (
                <div
                  className="action-dropdown export-dropdown absolute right-0 mt-1 bg-white rounded-md shadow-lg py-1 z-10"
                  ref={exportDropdownRef}
                >
                  <button
                    className="dropdown-item px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    onClick={handleExportCSV}
                  >
                    Export as CSV
                  </button>
                  <button
                    className="dropdown-item px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    onClick={handleExportPDF}
                  >
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
            <button onClick={handlePrint}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
            </button>
          </div>
        </div>
        {renderBaselineTable()}

        {/* Performance Graph Section */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-bold text-lg text-white-light mb-4">
            Performance Graph
          </h1>
          <div className="flex gap-2">
            <div className="relative">
              <button onClick={toggleExportDropdown} ref={exportButtonRef}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              {exportDropdownOpen && (
                <div
                  className="action-dropdown export-dropdown absolute right-0 mt-1 bg-white rounded-md shadow-lg py-1 z-10"
                  ref={exportDropdownRef}
                >
                  <button
                    className="dropdown-item px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    onClick={handleExportCSV}
                  >
                    Export as CSV
                  </button>
                  <button
                    className="dropdown-item px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    onClick={handleExportPDF}
                  >
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
            <button onClick={handlePrint}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
            </button>
          </div>
        </div>
        {renderPerformanceGraph()}

        {/* Session Data Section */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-bold text-lg text-white-light mb-4">
            Session Data
          </h1>
          <div className="flex gap-2">
            <div className="relative">
              <button onClick={toggleExportDropdown} ref={exportButtonRef}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              {exportDropdownOpen && (
                <div
                  className="action-dropdown export-dropdown absolute right-0 mt-1 bg-white rounded-md shadow-lg py-1 z-10"
                  ref={exportDropdownRef}
                >
                  <button
                    className="dropdown-item px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    onClick={handleExportCSV}
                  >
                    Export as CSV
                  </button>
                  <button
                    className="dropdown-item px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    onClick={handleExportPDF}
                  >
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
            <button onClick={handlePrint}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
            </button>
          </div>
        </div>
        {renderSessionData()}
      </div>

      {/* Modal Components */}
      <FrequencyModal
        isOpen={activeModal === "frequency"}
        onClose={handleCloseModal}
        onSave={handleSaveData}
        submitting={submitting}
      />
      <DurationModal
        isOpen={activeModal === "duration"}
        onClose={handleCloseModal}
        onSave={handleSaveData}
        submitting={submitting}
      />
      <RateModal
        isOpen={activeModal === "rate"}
        onClose={handleCloseModal}
        onSave={handleSaveData}
        submitting={submitting}
      />
      <PercentageCorrectModal
        isOpen={activeModal === "percentage"}
        onClose={handleCloseModal}
        trialCount={modalData.trialCount || 3}
        onSave={handleSaveData}
        submitting={submitting}
      />
      <TrialsOpportunitiesModal
        isOpen={activeModal === "trials"}
        onClose={handleCloseModal}
        trialCount={modalData.trialCount || 3}
        onSave={handleSaveData}
        submitting={submitting}
      />
      <TaskAnalysisModal
        isOpen={activeModal === "task"}
        onClose={handleCloseModal}
        steps={modalData.steps || []}
        onSave={handleSaveData}
        submitting={submitting}
      />
      <LatencyModal
        isOpen={activeModal === "latency"}
        onClose={handleCloseModal}
        trialCount={modalData.trialCount || 4}
        onSave={handleSaveData}
        submitting={submitting}
      />
    </DashboardLayout>
  );
};

export default TargetSingle;