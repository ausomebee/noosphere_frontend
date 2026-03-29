import React, { useState, useCallback, useRef, useEffect } from "react";

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
import useAuth from "../../hooks/useAuth";
import api from "../../api/ProgramLibraryApis";
import LoadingSpinner from "../../Components/LoadingSpinner";
import { showToast } from "../../Helper/ShowToast";
import { formatDate, formatDateTime, formatTime, formatDuration } from "../../Helper/Formatters";
import useFormatSettings from "../../hooks/useFormatSettings";
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
  const { accessToken, refreshToken, tenantId } = useAuth();
  const { dateFormat, timeFormat } = useFormatSettings();

  // State for dropdowns and data
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [targetInfo, setTargetInfo] = useState(null);
  const [baselineData, setBaselineData] = useState(null);
  const [baselineDataRequired, setBaselineDataRequired] = useState(false);
  const [clientTargetId, setClientTargetId] = useState(null);
  const [hasPerformanceData, setHasPerformanceData] = useState(false);
  const [hasSessionData, setHasSessionData] = useState(false);
  const [showPerformanceGraph] = useState(true);
  const [timeRange, setTimeRange] = useState("All time");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Session data state
  const [sessionData, setSessionData] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Performance data state
  const [performanceData, setPerformanceData] = useState(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState(null);

  // Modal states
  const [activeModal, setActiveModal] = useState(null);
  const [modalData, setModalData] = useState({});

  // Refs for positioning dropdowns
  const exportButtonRef = useRef(null);
  const exportDropdownRef = useRef(null);
  const tableContainerRef = useRef(null);

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
                  description:
                    typeof step === "string" ? step : step.description || "",
                }))
              : typeof target.taskSteps === "string"
                ? JSON.parse(target.taskSteps).map((step, index) => ({
                    id: index + 1,
                    description:
                      typeof step === "string" ? step : step.description || "",
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
              ? target.promptingStrategy
                  .map((p) => {
                    try {
                      return JSON.parse(p).label;
                    } catch {
                      return p;
                    }
                  })
                  .join(", ")
              : target.promptingStrategy
            : "N/A",
          dataCollectionType: target.dataCollectionType || "N/A",
          numberOfTrials: target.numberOfTrials || "N/A",
          taskSteps,
        });
      } else {
        setTargetInfo(null);
      }

      const isBaselineRequired = target.baselineDataRequired === true;
      setBaselineDataRequired(isBaselineRequired);

      if (clientId && targetId) {
        const ctId = res?.data?.data?.[0]?.id;
        setClientTargetId(ctId);
        try {
          const baselineRes = await api.GetTargetBaselineData({ targetId, accessToken, refreshToken });
          const targetFromBaseline = baselineRes?.data?.data;
          const isBaseline = targetFromBaseline?.baselineDataRequired === true;
          setBaselineDataRequired(isBaseline);
          if (isBaseline) {
            const sessionDatas = targetFromBaseline?.sessionDatas || [];
            const type = target.dataCollectionType;
            if (sessionDatas.length > 0) {
              const latest = sessionDatas[0];
              setBaselineData({
                title: type,
                headers: getHeaders(type),
                data: getDataRows(type, latest.data),
                summary: getSummary(type, latest.data),
              });
            } else {
              setBaselineData(null);
            }
          } else {
            setBaselineData(null);
          }
        } catch {
          setBaselineDataRequired(false);
          setBaselineData(null);
        }
        // Always fetch performance and session data when client context exists
        setHasPerformanceData(true);
        setHasSessionData(true);
      } else {
        if (targetId) {
          try {
            const baselineRes = await api.GetTargetBaselineData({ targetId, accessToken, refreshToken });
            const targetFromBaseline = baselineRes?.data?.data;
            const isBaseline = targetFromBaseline?.baselineDataRequired === true;
            setBaselineDataRequired(isBaseline);
            if (isBaseline) {
              const sessionDatas = targetFromBaseline?.sessionDatas || [];
              const type = target.dataCollectionType;
              if (sessionDatas.length > 0) {
                const rows = sessionDatas.flatMap((sd) => getDataRows(type, sd.data));
                setBaselineData({
                  title: type,
                  headers: getHeaders(type),
                  data: rows,
                  summary: null,
                });
              } else {
                setBaselineData(null);
              }
            } else {
              setBaselineData(null);
            }
          } catch {
            setBaselineDataRequired(false);
            setBaselineData(null);
          }
        } else {
          setBaselineData(null);
        }
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

  // Fetch session data from API
  const fetchSessionData = useCallback(async () => {
    if (!targetId || !clientId || !tenantId) return;
    setSessionLoading(true);
    try {
      const response = await api.GetSessionsByTarget({
        targetId,
        clientId,
        tenantId,
        accessToken,
        refreshToken,
      });
      const data = response?.data?.data || [];
      const mapped = data.map((session, index) => ({
        id: session.id,
        sessions: `Session ${index + 1}`,
        clientName: session.clientName || "N/A",
        sessionType: session.sessionTypeName || "N/A",
        clinician: session.clinician || "N/A",
        clientApproval: session.clientApprovalStatus || "PENDING",
        supervisorApproval: session.supervisorApprovalStatus || "PENDING",
        totalHours: session.totalHours
          ? `${session.totalHours.toFixed(2)} hrs`
          : "0 hrs",
        dateTime: session.date
          ? {
              date: formatDate(session.date, dateFormat),
              time: formatDateTime(session.date, dateFormat, timeFormat).split(" ").slice(1).join(" "),
            }
          : { date: "N/A", time: "" },
        payer:
          session.authorizationsUsed?.[0]?.payerDetails?.payerName || "N/A",
        hasActions: true,
      }));
      setSessionData(mapped);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
      showToast("Failed to load sessions", "error");
      setSessionData([]);
    } finally {
      setSessionLoading(false);
    }
  }, [targetId, clientId, tenantId, accessToken, refreshToken, dateFormat, timeFormat]);

  useEffect(() => {
    if (hasSessionData) {
      fetchSessionData();
    }
  }, [hasSessionData, fetchSessionData]);

  // Fetch performance data from API
  const fetchPerformanceData = useCallback(async () => {
    if (!targetId || !clientId) return;
    setPerformanceLoading(true);
    setPerformanceError(null);
    try {
      const response = await api.GetClientTargetPerformance({
        clientId,
        targetId,
        accessToken,
        refreshToken,
      });

      const monthlyData = response.data?.data || [];

      const values = monthlyData.map((item) =>
        item.average !== null ? Number(item.average) : 0
      );
      const labels = monthlyData.map((item) => item.monthName);

      const hasData = monthlyData.some(
        (item) => item.average !== null && item.average > 0
      );

      if (!hasData) {
        setPerformanceData(null);
        setPerformanceError("No session data available for this target");
        setPerformanceLoading(false);
        return;
      }

      const firstDataMonth = monthlyData.find(
        (item) => item.rawData?.length > 0
      );
      const dataType = firstDataMonth?.dataType || "percentage";

      const chartData = createChartData(values, labels, monthlyData, dataType);
      setPerformanceData(chartData);
    } catch (err) {
      console.error("Performance fetch failed:", err);
      setPerformanceError(err.message || "Failed to load performance data");
    } finally {
      setPerformanceLoading(false);
    }
  }, [targetId, clientId, accessToken, refreshToken]);

  useEffect(() => {
    if (hasPerformanceData) {
      fetchPerformanceData();
    }
  }, [hasPerformanceData, fetchPerformanceData]);

  const createChartData = (values, labels, monthlyData, dataType) => {
    const getYAxisConfig = () => {
      switch (dataType) {
        case "percentage":
          return {
            min: 0,
            max: 100,
            tickAmount: 5,
            title: {
              text: "Percentage (%)",
              style: { fontSize: "13px", color: "#64748b" },
            },
          };
        case "task_analysis":
          return {
            min: 0,
            max: 100,
            tickAmount: 5,
            title: {
              text: "Completion Rate (%)",
              style: { fontSize: "13px", color: "#64748b" },
            },
          };
        case "trials_opportunities":
          return {
            min: 0,
            max: Math.max(...values) + 2,
            tickAmount: 6,
            title: {
              text: "Correct Trials",
              style: { fontSize: "13px", color: "#64748b" },
            },
          };
        default:
          return {
            min: 0,
            max: Math.max(...values.filter((v) => v > 0), 100) + 10,
            tickAmount: 6,
            title: {
              text: "Performance Score",
              style: { fontSize: "13px", color: "#64748b" },
            },
          };
      }
    };

    const yAxisConfig = getYAxisConfig();

    return {
      series: [
        {
          name:
            dataType === "percentage"
              ? "Percentage"
              : dataType === "task_analysis"
                ? "Completion Rate"
                : dataType === "trials_opportunities"
                  ? "Correct Trials"
                  : "Average Performance",
          data: values,
        },
      ],
      options: {
        chart: {
          id: "target-performance-chart",
          type: "area",
          height: 350,
          toolbar: {
            show: true,
            tools: { download: true, selection: true, zoom: true, pan: true },
          },
          zoom: { enabled: true },
          animations: { enabled: true, speed: 800 },
        },
        dataLabels: { enabled: false },
        stroke: { curve: "smooth", width: 2.5, colors: ["#3b82f6"] },
        fill: {
          type: "gradient",
          gradient: {
            shadeIntensity: 0.9,
            opacityFrom: 0.5,
            opacityTo: 0.1,
            stops: [0, 90, 100],
          },
        },
        markers: {
          size: 4,
          colors: ["#3b82f6"],
          strokeColors: "#fff",
          strokeWidth: 2,
          hover: { size: 6 },
        },
        xaxis: {
          categories: labels,
          labels: {
            style: { colors: "#64748b", fontSize: "13px" },
            rotate: 0,
          },
          axisBorder: { show: false },
          axisTicks: { show: false },
          title: {
            text: "Month",
            style: { fontSize: "13px", color: "#64748b" },
          },
        },
        yaxis: {
          ...yAxisConfig,
          labels: {
            style: { colors: "#64748b", fontSize: "13px" },
            formatter: (val) => {
              if (
                dataType === "percentage" ||
                dataType === "task_analysis"
              ) {
                return Math.round(val) + "%";
              }
              return Math.round(val);
            },
          },
        },
        grid: {
          borderColor: "#e2e8f0",
          strokeDashArray: 4,
          yaxis: { lines: { show: true } },
          xaxis: { lines: { show: false } },
        },
        tooltip: {
          y: {
            formatter: (val, { dataPointIndex }) => {
              const monthData = monthlyData[dataPointIndex];
              if (monthData?.sessionCount === 0) return "No data";
              const sessions = monthData?.sessionCount || 0;
              const suffix = sessions !== 1 ? "s" : "";
              if (
                dataType === "percentage" ||
                dataType === "task_analysis"
              ) {
                return `${val.toFixed(1)}% (${sessions} session${suffix})`;
              }
              if (dataType === "trials_opportunities") {
                return `${val.toFixed(1)} correct (${sessions} session${suffix})`;
              }
              return `${val.toFixed(1)} (${sessions} session${suffix})`;
            },
          },
        },
        colors: ["#3b82f6"],
        noData: {
          text: "No data available",
          align: "center",
          verticalAlign: "middle",
          style: { color: "#64748b", fontSize: "14px" },
        },
      },
    };
  };

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

  const getDataRows = (type, data) => {
    switch (type) {
      case "Frequency":
        return [
          { count: data.numberOfOccurrence || 0, notes: data.notes || "N/A" },
        ];
      case "Duration":
        return [
          {
            duration: formatDuration(data.duration || 0),
            notes: data.notes || "N/A",
          },
        ];
      case "Rate":
        return [
          {
            count: data.numberOfOccurrence || 0,
            duration: data.duration || 0,
            rate:
              data.duration > 0
                ? (data.numberOfOccurrence / (data.duration / 60)).toFixed(2) +
                  "/min"
                : "N/A",
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
          sdTime: formatTime(trial.stimulusPresented, timeFormat),
          response:
            trial.latency !== null
              ? `${trial.latency >= 0 ? "+" : ""}${trial.latency} secs`
              : "NR",
          notes: data.notes || "N/A",
        }));
      default:
        return [];
    }
  };

  const getSummary = (type, data) => {
    switch (type) {
      case "Percentage Correct": {
        const percentageTrials = (data.trials || []).length;
        const correct = (data.trials || []).filter(
          (t) => t.performance === "correct",
        ).length;
        return `Total Correct: ${correct}/${percentageTrials} | Accuracy: ${data.percentageCorrect || 0}%`;
      }
      case "Trials/Opportunities": {
        const trials = data.trials || [];
        const correctCount = trials.filter(
          (t) => t.performance === "correct",
        ).length;
        const incorrectCount = trials.filter(
          (t) => t.performance === "incorrect",
        ).length;
        const promptedCount = trials.filter(
          (t) => t.promptLevel !== "independent",
        ).length;
        return `Trials: ${trials.length} | Correct: ${correctCount} | Incorrect: ${incorrectCount} | Prompted: ${promptedCount}`;
      }
      default:
        return null;
    }
  };

  const onBack = () => {
    navigate(-1);
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
      showToast(
        "No client selected. Please select a client to collect data.",
        "error",
      );
      return;
    }
    if (
      !targetInfo?.dataCollectionType ||
      targetInfo.dataCollectionType === "N/A"
    ) {
      showToast("No valid data collection type found.", "error");
      return;
    }

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
        showToast(
          `Unknown data collection type: ${targetInfo.dataCollectionType}`,
          "error",
        );
        return;
    }

    const extra = {};
    if (["percentage", "trials", "latency"].includes(modalName)) {
      extra.trialCount =
        targetInfo.numberOfTrials !== "N/A" ? targetInfo.numberOfTrials : 0;
    }
    if (modalName === "task") {
      extra.steps =
        targetInfo.taskSteps && targetInfo.taskSteps !== "N/A"
          ? targetInfo.taskSteps
          : [];
    }

    handleOpenModal(modalName, extra);
  };

  const renderEmptyState = (title, buttonLabel) => (
    <div className="bg-gray-200 rounded-sm w-full p-20 mb-6">
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
      return renderEmptyState("Performance Data");
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
        {performanceLoading ? (
          <div className="flex justify-center items-center py-12">
            <p className="text-gray-500">Loading performance data...</p>
          </div>
        ) : performanceError ? (
          <div className="flex justify-center items-center py-12">
            <p className="text-gray-500">{performanceError}</p>
          </div>
        ) : performanceData ? (
          <Chart
            options={performanceData.options}
            series={performanceData.series}
            type="area"
            height={350}
          />
        ) : (
          <div className="flex justify-center items-center py-12">
            <p className="text-gray-500">No performance data available</p>
          </div>
        )}
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
      { header: "Clinician", key: "clinician", type: "text" },
      { header: "Total Hours", key: "totalHours", type: "text" },
      { header: "Client Approval", key: "clientApproval", type: "text" },
      { header: "Payer", key: "payer", type: "text" },
    ];

    return (
      <div>
        <CustomTable
          data={sessionData}
          columns={columns}
          showActions={false}
          showCheckbox={false}
          itemsPerPage={10}
          tableName="Targets Session Data"
          loading={sessionLoading}
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
    <>
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
            <span className="breadcrumb-separator">&rsaquo;</span>
            <span className="breadcrumb-segment">
              {decodeURIComponent(programName)}
            </span>
            <span className="breadcrumb-separator">&rsaquo;</span>
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
                    <p className="font-medium text-gray-600">
                      {targetInfo.program}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-400">Domain</p>
                    <p className="font-medium text-gray-600">
                      {targetInfo.domain}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-400">Target</p>
                    <p className="font-medium text-gray-600">
                      {targetInfo.target}
                    </p>
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
                    <p className="font-medium text-gray-600">
                      {targetInfo.expectedResponse}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-600">Teaching Procedure</p>
                    <p className="font-medium text-gray-600">
                      {targetInfo.teachingProcedure}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-600">Prompting Strategy</p>
                    <p className="font-medium text-gray-600 w-70">
                      {targetInfo.promptingStrategy}
                    </p>
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
                    <p className="font-medium text-gray-600">
                      {targetInfo.dataCollectionType}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-600">No of Trials</p>
                    <p className="font-medium text-gray-600">
                      {targetInfo.numberOfTrials}
                    </p>
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
        {baselineDataRequired && (
          <>
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
          </>
        )}

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
    </>
  );
};

export default TargetSingle;
