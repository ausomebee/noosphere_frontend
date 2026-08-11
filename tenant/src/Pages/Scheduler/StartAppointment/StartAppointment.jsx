import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import Button from "../../../Components/Button/Button";
import "./StartAppointment.css";
import api from "../../../api/AppointmentApi";
import ErrorFallback from "../../../Components/ErrorFallback";

// Data Collection Modals
import FrequencyModal from "../../../Components/ReusableModal/DataCollectionModal/FrequencyModal";
import DurationModal from "../../../Components/ReusableModal/DataCollectionModal/DurationModal";
import RateModal from "../../../Components/ReusableModal/DataCollectionModal/RateModal";
import PercentageCorrectModal from "../../../Components/ReusableModal/DataCollectionModal/PercentageCorrectModal";
import TrialsOpportunitiesModal from "../../../Components/ReusableModal/DataCollectionModal/TrialsOpportunitiesModal";
import TaskAnalysisModal from "../../../Components/ReusableModal/DataCollectionModal/TaskAnalysisModal";
import LatencyModal from "../../../Components/ReusableModal/DataCollectionModal/LatencyModal";

// Appointment Modals
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";
import TravelTimeModal from "../../../Components/ReusableModal/StartAppointmentModal/TravelTimeModal";
import ConfirmCancelModal from "../../../Components/ReusableModal/StartAppointmentModal/ConfirmCancelModal";
import ConfirmLeaveModal from "../../../Components/ReusableModal/StartAppointmentModal/ConfirmLeaveModal";
import { showToast } from "../../../Helper/ShowToast";
import { formatDate, formatTime, formatDuration } from "../../../Helper/Formatters";
import useFormatSettings from "../../../hooks/useFormatSettings";
import SectionLoader from "../../../Components/SectionLoader";

const StartAppointment = () => {
  const { clientId, appointmentId } = useParams();
  const navigate = useNavigate();

  const { accessToken, refreshToken, userId } = useAuth();
  const { dateFormat, timeFormat } = useFormatSettings();

  // States
  const [appointment, setAppointment] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [sessionNotes, setSessionNotes] = useState("");
  const [seconds, setSeconds] = useState(0);

  const [travelTime, setTravelTime] = useState({ start: null, end: null });

  // Unified data collection modal state
  const [currentModal, setCurrentModal] = useState({
    type: null, // "frequency" | "duration" | "rate" | "percentage" | "trials" | "task" | "latency"
    isOpen: false,
    props: {}, // trialCount, steps, etc.
  });

  const [travelModalOpen, setTravelModalOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  // Target whose recorded data is being cleared. Holds the targetId while the
  // "Clear data" confirmation modal is open.
  const [clearTargetInfo, setClearTargetInfo] = useState(null);

  const pendingCloseRef = useRef(null);
  const [collectedData, setCollectedData] = useState({});

  // Timer refs
  const sessionStartTimestampRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Session start time
  useEffect(() => {
    const now = Date.now();
    sessionStartTimestampRef.current = now;
    sessionStorage.setItem(`sessionStartTime_${appointmentId}`, now.toString());
  }, [appointmentId]);

  // Accurate timer
  useEffect(() => {
    if (!appointment) return;

    const updateTimer = () => {
      if (sessionStartTimestampRef.current !== null) {
        const elapsedMs = Date.now() - sessionStartTimestampRef.current;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        setSeconds(elapsedSeconds);
      }
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    };

    animationFrameRef.current = requestAnimationFrame(updateTimer);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (sessionStartTimestampRef.current !== null) {
          const elapsedMs = Date.now() - sessionStartTimestampRef.current;
          const elapsedSeconds = Math.floor(elapsedMs / 1000);
          setSeconds(elapsedSeconds);
        }
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = requestAnimationFrame(updateTimer);
      } else {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [appointment]);

  // Fetch appointment and programs
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!accessToken) throw new Error("No access token found");

        const [appointmentRes, programsRes] = await Promise.all([
          api.GetClientAppointmentDetails({
            Id: appointmentId,
            accessToken,
            refreshToken,
          }),
          api.GetClientProgramAndTargetsDetails({
            clientId,
            accessToken,
            refreshToken,
          }),
        ]);

        setAppointment(appointmentRes.data.data);

        const programsData = programsRes.data.data.map((item) => ({
          id: item.program.id,
          name: item.program.name,
          targets: (item.program.target || [])
            .filter((t) => !t.isDeleted)
            .map((t) => ({
              id: t.id,
              name: t.name,
              domain: t.domain || t.domainName || "—",
              sd: t.sd || "—",
              expectedResponse: t.expectedResponse || "—",
              teachingProcedure: t.teachingProcedure || "—",
              promptingStrategy: Array.isArray(t.promptingStrategy)
                ? t.promptingStrategy
                    .map((p) => {
                      try {
                        const parsed = JSON.parse(p);
                        return parsed.label || p;
                      } catch {
                        return p;
                      }
                    })
                    .join(", ")
                : "—",
              dataCollectionType: t.dataCollectionType || "Frequency",
              numberOfTrials: t.numberOfTrials || null,
              taskSteps: (() => {
                if (!t.taskSteps) return [];

                // Case 1: Already array of objects with description
                if (
                  Array.isArray(t.taskSteps) &&
                  t.taskSteps.length > 0 &&
                  t.taskSteps[0]?.description !== undefined
                ) {
                  return t.taskSteps.map((step, index) => ({
                    id: step.id || index + 1,
                    description: step.description || "",
                  }));
                }

                // Case 2: Array of strings → convert to objects
                if (
                  Array.isArray(t.taskSteps) &&
                  t.taskSteps.length > 0 &&
                  typeof t.taskSteps[0] === "string"
                ) {
                  return t.taskSteps.map((desc, index) => ({
                    id: index + 1,
                    description: desc.trim(),
                  }));
                }

                // Case 3: JSON string like '["Step 1", "Step 2"]'
                if (typeof t.taskSteps === "string") {
                  try {
                    const parsed = JSON.parse(t.taskSteps);
                    if (
                      Array.isArray(parsed) &&
                      parsed.every((s) => typeof s === "string")
                    ) {
                      return parsed.map((desc, index) => ({
                        id: index + 1,
                        description: desc.trim(),
                      }));
                    }
                    if (Array.isArray(parsed)) {
                      return parsed.map((step, index) => ({
                        id: step.id || index + 1,
                        description: step.description || "",
                      }));
                    }
                  } catch (e) {
                    if (import.meta.env.DEV) console.warn("Failed to parse taskSteps:", t.taskSteps, e);
                  }
                }

                return [];
              })(),
              initialStatus: t.initialStatus || "Not Introduced",
              description: t.description,
              notes: t.notes,
              attachment: t.attachment,
            })),
        }));

        setPrograms(programsData);
        setLoading(false);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message || "Failed to load data");
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId, appointmentId, accessToken, refreshToken]);
  // Format helpers
  const formatTotalTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? h + "hrs " : ""}${m}m ${s}s`;
  };

  const timeStringToIso = (timeStr) => {
    if (!timeStr) return null;
    const today = new Date().toISOString().slice(0, 10);
    return `${today}T${timeStr}:00.000Z`;
  };

  // Current selections
  const currentProgram = programs.find((p) => p.id === selectedProgramId);
  const currentTarget = currentProgram?.targets.find(
    (t) => t.id === selectedTargetId,
  );
  const hasCollectedData = selectedTargetId
    ? !!collectedData[selectedTargetId]
    : false;

  // Robust data collection handler
  const handleCollectData = () => {
    if (!currentTarget) {
      showToast("Please select a target first", "warning");
      return;
    }

    const type = currentTarget.dataCollectionType;
    if (!type || type === "N/A") {
      showToast("No valid data collection type found.", "error");
      return;
    }

    let modalType = null;
    const extraProps = {};

    switch (type) {
      case "Frequency":
        modalType = "frequency";
        break;
      case "Duration":
        modalType = "duration";
        break;
      case "Rate":
        modalType = "rate";
        break;
      case "Percentage Correct":
        modalType = "percentage";
        extraProps.trialCount = currentTarget.numberOfTrials || 10;
        break;
      case "Trials/Opportunities":
        modalType = "trials";
        extraProps.trialCount = currentTarget.numberOfTrials || 10;
        break;
      case "Task Analysis":
        modalType = "task";
        extraProps.steps =
          Array.isArray(currentTarget.taskSteps) &&
          currentTarget.taskSteps.length > 0
            ? currentTarget.taskSteps
            : [];
        break;
      case "Latency":
        modalType = "latency";
        extraProps.trialCount = currentTarget.numberOfTrials || 10;
        break;
      default:
        showToast(`Unsupported data collection type: ${type}`, "error");
        return;
    }

    setCurrentModal({
      type: modalType,
      isOpen: true,
      props: extraProps,
    });
  };

  const closeDataModal = () => {
    setCurrentModal({ type: null, isOpen: false, props: {} });
  };

  const requestCloseDataModal = () => {
    setConfirmCancelOpen(true);
    pendingCloseRef.current = closeDataModal;
  };

  const saveCollectedData = (data) => {
    setCollectedData((prev) => ({
      ...prev,
      [selectedTargetId]: data,
    }));
    closeDataModal();
  };

  // Clear ALL recorded data for the selected target/task (any task type).
  // The target returns to the unrecorded state so the clinician can record it
  // fresh via "Collect Data". This is a Start-Appointment-only action and
  // can't be undone.
  const confirmClearData = () => {
    if (!clearTargetInfo) return;
    const targetId = clearTargetInfo;
    setCollectedData((prev) => {
      const next = { ...prev };
      delete next[targetId];
      return next;
    });
    setClearTargetInfo(null);
  };

  const handleBackClick = () => setConfirmLeaveOpen(true);

  const finishAppointment = async () => {
    if (submitting) return;
    cancelAnimationFrame(animationFrameRef.current);
    setSubmitting(true);

    const sessionEndTime = new Date().toISOString();
    const sessionStartIso = new Date(
      sessionStartTimestampRef.current,
    ).toISOString();

    const sessionDatas = Object.entries(collectedData).map(
      ([targetId, data]) => ({
        targetId,
        data: data || {},
      }),
    );

    const payload = {
      appointmentId,
      note: sessionNotes.trim() || null,
      startTime: sessionStartIso,
      endTime: sessionEndTime,
      sessionDatas,
      createdBy: userId,
    };

    if (appointment?.requiresTravel && travelTime.start && travelTime.end) {
      payload.travelStartTime = timeStringToIso(travelTime.start);
      payload.travelEndTime = timeStringToIso(travelTime.end);
    }

    try {
      await api.SubmitStartAppointment({
        ...payload,
        accessToken,
        refreshToken,
      });
      showToast(
        "Appointment finished and session saved successfully!",
        "success",
      );
      sessionStorage.removeItem(`sessionStartTime_${appointmentId}`);
      navigate("/billing/timesheets");
    } catch (err) {
      console.error("Failed to submit session:", err);
      showToast(
        `Error: ${err.message || "Failed to submit session."}`,
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // renderDataTable remains the same (unchanged from previous version)
  const renderDataTable = () => {
    if (!currentTarget || !collectedData[selectedTargetId]) return null;

    const data = collectedData[selectedTargetId];
    const type = currentTarget.dataCollectionType;

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

    const headers = getHeaders(type);
    const dataRows = (() => {
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
        {
          const rate =
            data.duration > 0
              ? (data.numberOfOccurrence / (data.duration / 60)).toFixed(2) +
                "/min"
              : "N/A";
          return [
            {
              count: data.numberOfOccurrence || 0,
              duration: data.duration || 0,
              rate,
              notes: data.notes || "N/A",
            },
          ];
        }
        case "Percentage Correct":
        case "Trials/Opportunities":
          return (data.trials || []).map((trial, i) => ({
            trialCount: i + 1,
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
    })();

    const summary = (() => {
      if (type === "Percentage Correct") {
        const trials = data.trials || [];
        const correct = trials.filter(
          (t) => t.performance === "correct",
        ).length;
        // Recompute accuracy from the live trials so it stays correct after a
        // trial is cleared (don't use the stale stored data.percentageCorrect).
        const accuracy = trials.length
          ? Math.round((correct / trials.length) * 100)
          : 0;
        return `Total Correct: ${correct}/${trials.length} | Accuracy: ${accuracy}%`;
      }
      if (type === "Trials/Opportunities") {
        const trials = data.trials || [];
        const correct = trials.filter(
          (t) => t.performance === "correct",
        ).length;
        const incorrect = trials.filter(
          (t) => t.performance === "incorrect",
        ).length;
        // Prompted = a prompt level was recorded and it wasn't independent ("I").
        // Cleared trials (empty promptLevel) are excluded.
        const prompted = trials.filter(
          (t) => t.promptLevel && t.promptLevel !== "I" && t.promptLevel !== "independent",
        ).length;
        return `Trials: ${trials.length} | Correct: ${correct} | Incorrect: ${incorrect} | Prompted: ${prompted}`;
      }
      return null;
    })();

    return (
      <div className="sa-trials-table-container">
        <div className="sa-table-scroll">
          <table className="sa-trials-table">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.length > 0 ? (
                dataRows.map((row, i) => (
                  <tr key={i}>
                    {headers.map((h) => {
                      const keyMap = {
                        Count: "count",
                        Duration: "duration",
                        "Duration (sec)": "duration",
                        Rate: "rate",
                        Notes: "notes",
                        "Trial Count": "trialCount",
                        Prompt: "prompt",
                        Response: "response",
                        Step: "step",
                        Description: "description",
                        "SD Delivered Time": "sdTime",
                      };
                      const key =
                        keyMap[h] || h.toLowerCase().replace(/[^a-z]/g, "");
                      const value = row[key];
                      return (
                        <td key={h}>
                          {value === 0 || value ? value : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={headers.length} className="sa-table-empty">
                    No data collected yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {summary && <div className="sa-summary-bar">{summary}</div>}
      </div>
    );
  };

  if (loading)
    return (
      <SectionLoader />
    );
  if (error)
    return <ErrorFallback message="Something went wrong loading the appointment. Please try again." onRetry={() => window.location.reload()} />;
  if (!appointment)
    return <div className="p-10 text-center">No appointment found</div>;

  const {
    client,
    startTime,
    endTime,
    requiresTravel,
    serviceLocation,
    session,
    clinicians,
    appointmentServices,
  } = appointment;

  return (
    <div className="start-appointment-container">
      {/* Header */}
      <header className="sa-header">
        <button className="sa-back-btn" onClick={handleBackClick}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span>Back</span>
        </button>
        <h1 className="sa-title">Start Appointment</h1>
      </header>

      <div className="sa-content">
        {/* Client Card */}
        <div className="client-card">
          <div className="sa-client-block">
            <span className="sa-field-label">Client</span>
            <div className="client-name">
              {client.firstName} {client.lastName}
              {client.preferredName ? ` (${client.preferredName})` : ""}
            </div>
            <div className="sa-client-meta">
              <div className="sa-field">
                <span className="sa-field-label">Gender</span>
                <span className="sa-field-value">{client.gender || "—"}</span>
              </div>
              <div className="sa-field">
                <span className="sa-field-label">Date of Birth</span>
                <span className="sa-field-value">
                  {formatDate(client.DOB, dateFormat) || "—"}
                </span>
              </div>
              <div className="sa-field">
                <span className="sa-field-label">Primary Payer</span>
                <span className="sa-field-value">
                  {client.payer?.payerName || "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="sa-client-cols">
            <div className="sa-field">
              <span className="sa-field-label">Clinician(s)</span>
              <div className="sa-field-value">
                {clinicians.map((c) => (
                  <div key={c.id}>{c.fullName}</div>
                ))}
              </div>
            </div>

            <div className="sa-field">
              <span className="sa-field-label">Service Type</span>
              <div className="sa-field-value">
                {appointmentServices?.map((s, i) => {
                  const code = s.serviceCode || {};
                  const serviceLabel = code.code
                    ? `${code.code}${code.description ? ` - ${code.description}` : ""}`
                    : "Not specified";
                  const modifier = code.modifiers?.modifier1;
                  return (
                    <div key={i}>
                      {serviceLabel}
                      {modifier ? ` + ${modifier}` : ""}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="sa-field">
              <span className="sa-field-label">Service Location</span>
              <span className="sa-field-value">{serviceLocation || "—"}</span>
            </div>

            <div className="sa-field">
              <span className="sa-field-label">Session Type</span>
              <span className="sa-field-value">{session?.name || "—"}</span>
            </div>

            <div className="sa-field">
              <span className="sa-field-label">Appointment Time</span>
              <span className="sa-field-value">
                {formatTime(startTime, timeFormat)} -{" "}
                {formatTime(endTime, timeFormat)}
              </span>
            </div>

            {requiresTravel && (
              <div className="sa-field">
                <span className="sa-field-label">Travel Time</span>
                {travelTime.start && travelTime.end ? (
                  <span className="sa-field-value sa-field-value--travel">
                    {formatTime(travelTime.start, timeFormat)} -{" "}
                    {formatTime(travelTime.end, timeFormat)}
                    <button
                      type="button"
                      className="sa-travel-clear"
                      aria-label="Clear travel time"
                      title="Clear and re-log travel time"
                      onClick={() => setTravelTime({ start: null, end: null })}
                    >
                      Clear
                    </button>
                  </span>
                ) : (
                  <Button
                    label="+ Log travel time"
                    variant="primary"
                    onClick={() => setTravelModalOpen(true)}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="main-layout">
          <aside className="programs-sidebar">
            {programs.map((prog) => (
              <div key={prog.id} className="program-item">
                <button
                  className={`program-btn ${
                    selectedProgramId === prog.id ? "active" : ""
                  }`}
                  onClick={() => {
                    setSelectedProgramId(prog.id);
                    setSelectedTargetId(null);
                  }}
                >
                  {prog.name}
                </button>
                {selectedProgramId === prog.id && prog.targets.length > 0 && (
                  <div className="targets-list">
                    {prog.targets.map((t) => (
                      <div
                        key={t.id}
                        className={`target-item ${
                          selectedTargetId === t.id ? "active" : ""
                        }`}
                        onClick={() => setSelectedTargetId(t.id)}
                      >
                        {t.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </aside>

          <main className="main-content">
            {selectedTargetId && currentTarget ? (
              <div className="data-card">
                <h2>Data Collection</h2>

                <div className="data-grid">
                  <div className="data-section">
                    <h3>Basic Details</h3>
                    <div className="sa-field">
                      <span className="sa-field-label">Domain</span>
                      <span className="sa-field-value">
                        {currentTarget.domain}
                      </span>
                    </div>
                    <div className="sa-field">
                      <span className="sa-field-label">Program</span>
                      <span className="sa-field-value">
                        {currentProgram.name}
                      </span>
                    </div>
                    <div className="sa-field">
                      <span className="sa-field-label">Target</span>
                      <span className="sa-field-value">
                        {currentTarget.name}
                      </span>
                    </div>
                    <div className="sa-field">
                      <span className="sa-field-label">Status</span>
                      <span className="sa-field-value status-not-started">
                        {currentTarget.initialStatus}
                      </span>
                    </div>
                  </div>
                  <div className="data-section">
                    <h3>Teaching Details</h3>
                    <div className="sa-field">
                      <span className="sa-field-label">
                        SD/Discretionary Stimulus
                      </span>
                      <span className="sa-field-value">{currentTarget.sd}</span>
                    </div>
                    <div className="sa-field">
                      <span className="sa-field-label">Expected Response</span>
                      <span className="sa-field-value">
                        {currentTarget.expectedResponse}
                      </span>
                    </div>
                    <div className="sa-field">
                      <span className="sa-field-label">Teaching Procedure</span>
                      <span className="sa-field-value">
                        {currentTarget.teachingProcedure}
                      </span>
                    </div>
                    <div className="sa-field">
                      <span className="sa-field-label">Prompting Strategy</span>
                      <span className="sa-field-value">
                        {currentTarget.promptingStrategy}
                      </span>
                    </div>
                  </div>
                  <div className="data-section">
                    <h3>Data Collection</h3>
                    <div className="sa-field">
                      <span className="sa-field-label">Type</span>
                      <span className="sa-field-value">
                        {currentTarget.dataCollectionType}
                      </span>
                    </div>
                    <div className="sa-field">
                      <span className="sa-field-label">No of Trials</span>
                      <span className="sa-field-value">
                        {currentTarget.numberOfTrials || "Flexible"}
                      </span>
                    </div>
                  </div>
                </div>

                {!hasCollectedData ? (
                  <div className="collect-btn-wrapper">
                    <Button
                      label="Collect Data"
                      variant="primary"
                      size="large"
                      onClick={handleCollectData}
                      icon={
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 8v8M8 12h8" />
                        </svg>
                      }
                      iconPosition="left"
                    />
                  </div>
                ) : (
                  <div className="sa-success-wrapper">
                    <div className="sa-success-chip" role="status">
                      <span className="sa-success-icon">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </span>
                      <span>Data recorded successfully</span>
                    </div>
                    <Button
                      label="Clear Data"
                      variant="secondary"
                      size="medium"
                      onClick={() => setClearTargetInfo(selectedTargetId)}
                      icon={
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        </svg>
                      }
                      iconPosition="left"
                    />
                  </div>
                )}

                {renderDataTable()}
              </div>
            ) : (
              <div className="data-card text-center py-16 text-gray-500">
                <p className="text-lg font-medium">
                  Select a target to begin data collection
                </p>
              </div>
            )}
          </main>
        </div>

        <div className="notes-card">
          <h2>Session Notes</h2>
          <textarea
            className="notes-textarea"
            placeholder="Write Something"
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            rows="6"
          />
        </div>

        <div className="bottom-bar">
          <div className="time-display">
            <strong>Total time spent:</strong>{" "}
            <span className="time-value">{formatTotalTime(seconds)}</span>
          </div>
          <Button
            label="Finish Appointment"
            variant="primary"
            size="large"
            onClick={finishAppointment}
            loading={submitting}
            disabled={submitting}
          />
        </div>
      </div>

      {/* Modals */}
      <FrequencyModal
        isOpen={currentModal.isOpen && currentModal.type === "frequency"}
        onClose={requestCloseDataModal}        onSave={saveCollectedData}
      />
      <DurationModal
        isOpen={currentModal.isOpen && currentModal.type === "duration"}
        onClose={requestCloseDataModal}        onSave={saveCollectedData}
      />
      <RateModal
        isOpen={currentModal.isOpen && currentModal.type === "rate"}
        onClose={requestCloseDataModal}        onSave={saveCollectedData}
      />
      <PercentageCorrectModal
        isOpen={currentModal.isOpen && currentModal.type === "percentage"}
        onClose={requestCloseDataModal}
        trialCount={currentModal.props.trialCount}        onSave={saveCollectedData}
      />
      <TrialsOpportunitiesModal
        isOpen={currentModal.isOpen && currentModal.type === "trials"}
        onClose={requestCloseDataModal}
        trialCount={currentModal.props.trialCount}        onSave={saveCollectedData}
      />
      <TaskAnalysisModal
        isOpen={currentModal.isOpen && currentModal.type === "task"}
        onClose={requestCloseDataModal}
        steps={currentModal.props.steps}        onSave={saveCollectedData}
      />
      <LatencyModal
        isOpen={currentModal.isOpen && currentModal.type === "latency"}
        onClose={requestCloseDataModal}
        trialCount={currentModal.props.trialCount}        onSave={saveCollectedData}
      />

      <TravelTimeModal
        isOpen={travelModalOpen}
        onClose={() => setTravelModalOpen(false)}
        onSave={(times) => {
          setTravelTime(times);
          setTravelModalOpen(false);
        }}
      />

      <ConfirmCancelModal
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={() => {
          pendingCloseRef.current?.();
          setConfirmCancelOpen(false);
        }}
      />

      <ConfirmLeaveModal
        isOpen={confirmLeaveOpen}
        onClose={() => setConfirmLeaveOpen(false)}
        onConfirm={() => navigate(-1)}
      />

      <ReusableModal
        isOpen={!!clearTargetInfo}
        onClose={() => setClearTargetInfo(null)}
        title="Clear this recording?"
        primaryButtonText="Clear data"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={confirmClearData}
        onSecondaryButtonClick={() => setClearTargetInfo(null)}
        primaryButtonColor="#D92D20"
        size="md"
      >
        <div className="text-center">
          <div className="flex justify-center mb-5">
            <svg
              width="56"
              height="56"
              viewBox="0 0 56 56"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="4" y="4" width="48" height="48" rx="24" fill="#FEE4E2" />
              <rect
                x="4"
                y="4"
                width="48"
                height="48"
                rx="24"
                stroke="#FEF3F2"
                strokeWidth="8"
              />
              <path
                d="M28 24V28M28 32H28.01M38 28C38 33.5228 33.5228 38 28 38C22.4772 38 18 33.5228 18 28C18 22.4772 22.4772 18 28 18C33.5228 18 38 22.4772 38 28Z"
                stroke="#D92D20"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-gray-600 mb-8">
            Once cleared, this recording can&apos;t be retrieved. Are you sure?
          </p>
        </div>
      </ReusableModal>
    </div>
  );
};

export default StartAppointment;
