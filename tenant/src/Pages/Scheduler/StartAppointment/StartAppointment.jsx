// src/pages/StartAppointment.jsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Button from "../../../Components/Button/Button";
import "./StartAppointment.css";
import api from "../../../api/AppointmentApi";


// Data Collection Modals
import FrequencyModal from "../../../Components/ReusableModal/DataCollectionModal/FrequencyModal";
import DurationModal from "../../../Components/ReusableModal/DataCollectionModal/DurationModal";
import RateModal from "../../../Components/ReusableModal/DataCollectionModal/RateModal";
import PercentageCorrectModal from "../../../Components/ReusableModal/DataCollectionModal/PercentageCorrectModal";
import TrialsOpportunitiesModal from "../../../Components/ReusableModal/DataCollectionModal/TrialsOpportunitiesModal";
import TaskAnalysisModal from "../../../Components/ReusableModal/DataCollectionModal/TaskAnalysisModal";
import LatencyModal from "../../../Components/ReusableModal/DataCollectionModal/LatencyModal";

// Appointment Modals
import TravelTimeModal from "../../../Components/ReusableModal/StartAppointmentModal/TravelTimeModal";
import ConfirmCancelModal from "../../../Components/ReusableModal/StartAppointmentModal/ConfirmCancelModal";
import ConfirmLeaveModal from "../../../Components/ReusableModal/StartAppointmentModal/ConfirmLeaveModal";
import { showToast } from "../../../Helper/ShowToast";

const StartAppointment = () => {
  const { clientId, appointmentId } = useParams();
  const navigate = useNavigate();

  const accessToken = useSelector((s) => s.authentication?.user?.token);
  const refreshToken = accessToken;

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

  // Travel Time: stores HH:mm strings
  const [travelTime, setTravelTime] = useState({
    start: null,
    end: null,
  });

  // Modal states
  const [dataModal, setDataModal] = useState({
    open: false,
    type: "",
    target: null,
  });
  const [travelModalOpen, setTravelModalOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  const pendingCloseRef = useRef(null);
  const [collectedData, setCollectedData] = useState({});

  // Accurate timer refs
  const sessionStartTimestampRef = useRef(null); // Real start time in milliseconds (Date.now())
  const animationFrameRef = useRef(null);

  // Save session start time on mount
  useEffect(() => {
    const now = Date.now();
    sessionStartTimestampRef.current = now;
    sessionStorage.setItem(`sessionStartTime_${appointmentId}`, now.toString());
  }, [appointmentId]);

  // Accurate timer: updates smoothly when visible, corrects instantly when returning
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

    // Start updating
    animationFrameRef.current = requestAnimationFrame(updateTimer);

    // Handle visibility change: correct time instantly when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab became visible → immediately correct the displayed time
        if (sessionStartTimestampRef.current !== null) {
          const elapsedMs = Date.now() - sessionStartTimestampRef.current;
          const elapsedSeconds = Math.floor(elapsedMs / 1000);
          setSeconds(elapsedSeconds);
        }
        // Resume smooth updates
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = requestAnimationFrame(updateTimer);
      } else {
        // Tab hidden → stop rAF to save resources (throttling would happen anyway)
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
              taskSteps: t.taskSteps || [],
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

  // Format "HH:mm" (24-hour) to 12-hour with AM/PM
  const formatTime = (timeStr) => {
    if (!timeStr || timeStr === "—") return "—";

    const [hours, minutes] = timeStr.split(":");
    let h = parseInt(hours, 10);
    const m = minutes || "00";
    const period = h >= 12 ? "PM" : "AM";

    h = h % 12;
    if (h === 0) h = 12;

    return `${h}:${m} ${period}`;
  };

  // Convert HH:mm string to full ISO datetime
  const timeStringToIso = (timeStr) => {
    if (!timeStr) return null;
    const today = new Date().toISOString().slice(0, 10);
    return `${today}T${timeStr}:00.000Z`;
  };

  // Current selections
  const currentProgram = programs.find((p) => p.id === selectedProgramId);
  const currentTarget = currentProgram?.targets.find(
    (t) => t.id === selectedTargetId
  );
  const hasCollectedData = selectedTargetId
    ? !!collectedData[selectedTargetId]
    : false;

  // Handlers
  const openDataModal = () => {
    if (!currentTarget) return;
    setDataModal({
      open: true,
      type: currentTarget.dataCollectionType,
      target: currentTarget,
    });
  };

  const requestCloseDataModal = () => {
    setConfirmCancelOpen(true);
    pendingCloseRef.current = () =>
      setDataModal({ open: false, type: "", target: null });
  };

  const saveCollectedData = (data) => {
    setCollectedData((prev) => ({
      ...prev,
      [selectedTargetId]: data,
    }));
    setDataModal({ open: false, type: "", target: null });
  };

  const handleBackClick = () => setConfirmLeaveOpen(true);

  // Finish Appointment
  const finishAppointment = async () => {
    if (submitting) return;

    cancelAnimationFrame(animationFrameRef.current);
    setSubmitting(true);

    const sessionEndTime = new Date().toISOString();
    const sessionStartIso = new Date(
      sessionStartTimestampRef.current
    ).toISOString();

    const sessionDatas = Object.entries(collectedData).map(
      ([targetId, data]) => ({
        targetId,
        data: data || {},
      })
    );

    const payload = {
      appointmentId,
      note: sessionNotes.trim() || null,
      startTime: sessionStartIso,
      endTime: sessionEndTime,
      sessionDatas,
    };

    if (appointment?.requiresTravel && travelTime.start && travelTime.end) {
      payload.travelStartTime = timeStringToIso(travelTime.start);
      payload.travelEndTime = timeStringToIso(travelTime.end);
    }

    try {
      const response = await api.SubmitStartAppointment({
        ...payload,
        accessToken,
        refreshToken,
      });

      console.log("Session submitted successfully:", response);
     showToast("Appointment finished and session saved successfully!");

      sessionStorage.removeItem(`sessionStartTime_${appointmentId}`);
      navigate(-1);
    } catch (err) {
      console.error("Failed to submit session:", err);
      showToast(
        `Error: ${err.message || "Failed to submit session. Please try again."}`
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
            sdTime: formatTimeFromString(trial.stimulusPresented),
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
          (t) => t.performance === "correct"
        ).length;
        return `Total Correct: ${correct}/${trials.length} | Accuracy: ${
          data.percentageCorrect || 0
        }%`;
      }
      if (type === "Trials/Opportunities") {
        const trials = data.trials || [];
        const correct = trials.filter(
          (t) => t.performance === "correct"
        ).length;
        const incorrect = trials.filter(
          (t) => t.performance === "incorrect"
        ).length;
        const prompted = trials.filter(
          (t) => t.promptLevel !== "independent"
        ).length;
        return `Trials: ${trials.length} | Correct: ${correct} | Incorrect: ${incorrect} | Prompted: ${prompted}`;
      }
      return null;
    })();

    return (
      <div className="baseline-table-container mt-8">
        {summary && (
          <div className="mb-4 text-sm font-medium text-gray-700">
            {summary}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
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
                      return (
                        <td key={h} className="px-6 py-4 text-sm">
                          {row[key] || "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={headers.length}
                    className="text-center py-8 text-gray-500"
                  >
                    No data collected yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading)
    return (
      <div className="p-10 text-center text-lg">Loading appointment...</div>
    );
  if (error)
    return <div className="p-10 text-red-600 text-center">Error: {error}</div>;
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
    service,
  } = appointment;

  return (
    <div className="start-appointment-container">
      {/* Header */}
      <header className="sa-header">
        <button className="sa-back-btn" onClick={handleBackClick}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="sa-title">Start Appointment</h1>
      </header>

      <div className="sa-content">
        {/* Client Card */}
        <div className="client-card">
          <div className="client-grid">
            <div className="sa-client-info">
              <h2>Client</h2>
              <div className="client-name">
                {client.firstName} {client.lastName} ({client.preferredName})
              </div>
              <div className="client-details">
                <span className="flex flex-col">
                  <strong>Gender:</strong> {client.gender || "—"}
                </span>
                <span className="flex flex-col">
                  <strong>DOB:</strong>{" "}
                  {new Date(client.DOB).toLocaleDateString()}
                </span>
                <span className="flex flex-col">
                  <strong>Payer:</strong> {client.payer?.payerName || "—"}
                </span>
              </div>
            </div>

            <div className="info-section">
              <h3>Clinician(s)</h3>
              <ul>
                {clinicians.map((c) => (
                  <li key={c.id}>• {c.fullName}</li>
                ))}
              </ul>
            </div>

            <div className="info-section">
              <h3>Service Type</h3>
              <ul>
                {service.map((s, i) => (
                  <li key={i}>
                    {s.serviceType}{" "}
                    {s.modifierType ? `+ ${s.modifierType}` : ""}
                  </li>
                ))}
              </ul>
            </div>

            <div className="info-section">
              <h3>Location</h3>
              <p>{serviceLocation || "—"}</p>

              <h3 style={{ marginTop: "16px" }}>Session</h3>
              <p>{session?.name || "—"}</p>

              <h3 style={{ marginTop: "16px" }}>Appointment Time</h3>
              <p className="font-medium text-gray-800">
                {formatTime(startTime)} - {formatTime(endTime)}
              </p>

              {requiresTravel && (
                <>
                  <h3 style={{ marginTop: "16px" }}>Travel Time</h3>
                  {travelTime.start && travelTime.end ? (
                    <p className="font-medium text-green-600">
                      {formatTime(travelTime.start)} -{" "}
                      {formatTime(travelTime.end)}
                    </p>
                  ) : (
                    <Button
                      label="+ Log travel time"
                      variant="primary"
                      onClick={() => setTravelModalOpen(true)}
                    />
                  )}
                </>
              )}
            </div>
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
                    <p>
                      <strong>Program:</strong> {currentProgram.name}
                    </p>
                    <p>
                      <strong>Target:</strong> {currentTarget.name}
                    </p>
                    <p>
                      <strong>Status:</strong>{" "}
                      <span className="status-not-started">
                        {currentTarget.initialStatus}
                      </span>
                    </p>
                  </div>
                  <div className="data-section">
                    <h3>Teaching Details</h3>
                    <p>
                      <strong>SD:</strong> {currentTarget.sd}
                    </p>
                    <p>
                      <strong>Expected:</strong>{" "}
                      {currentTarget.expectedResponse}
                    </p>
                    <p>
                      <strong>Procedure:</strong>{" "}
                      {currentTarget.teachingProcedure}
                    </p>
                    <p>
                      <strong>Prompting:</strong>{" "}
                      {currentTarget.promptingStrategy}
                    </p>
                  </div>
                  <div className="data-section">
                    <h3>Data Collection</h3>
                    <p>
                      <strong>Type:</strong> {currentTarget.dataCollectionType}
                    </p>
                    <p>
                      <strong>Trials:</strong>{" "}
                      {currentTarget.numberOfTrials || "Flexible"}
                    </p>
                  </div>
                </div>

                {!hasCollectedData ? (
                  <div className="collect-btn-wrapper">
                    <Button
                      label="Collect Data"
                      variant="primary"
                      size="large"
                      onClick={openDataModal}
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
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center mb-6">
                    <p className="text-green-800 font-medium">
                      Data collected successfully!
                    </p>
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

            <div className="notes-card">
              <h2>Session Notes</h2>
              <textarea
                className="notes-textarea"
                placeholder="Write session notes here..."
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
                label={submitting ? "Submitting..." : "Finish Appointment"}
                variant="primary"
                size="large"
                onClick={finishAppointment}
                disabled={submitting}
              />
            </div>
          </main>
        </div>
      </div>

      {/* Modals */}
      <FrequencyModal
        isOpen={dataModal.open && dataModal.type === "Frequency"}
        onClose={requestCloseDataModal}
        onSave={saveCollectedData}
      />
      <DurationModal
        isOpen={dataModal.open && dataModal.type === "Duration"}
        onClose={requestCloseDataModal}
        onSave={saveCollectedData}
      />
      <RateModal
        isOpen={dataModal.open && dataModal.type === "Rate"}
        onClose={requestCloseDataModal}
        onSave={saveCollectedData}
      />
      <PercentageCorrectModal
        isOpen={dataModal.open && dataModal.type === "Percentage Correct"}
        onClose={requestCloseDataModal}
        trialCount={currentTarget?.numberOfTrials || 10}
        onSave={saveCollectedData}
      />
      <TrialsOpportunitiesModal
        isOpen={dataModal.open && dataModal.type === "Trials/Opportunities"}
        onClose={requestCloseDataModal}
        trialCount={currentTarget?.numberOfTrials || 10}
        onSave={saveCollectedData}
      />
      <TaskAnalysisModal
        isOpen={dataModal.open && dataModal.type === "Task Analysis"}
        onClose={requestCloseDataModal}
        steps={currentTarget?.taskSteps || []}
        onSave={saveCollectedData}
      />
      <LatencyModal
        isOpen={dataModal.open && dataModal.type === "Latency"}
        onClose={requestCloseDataModal}
        trialCount={currentTarget?.numberOfTrials || 10}
        onSave={saveCollectedData}
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
    </div>
  );
};

export default StartAppointment;
