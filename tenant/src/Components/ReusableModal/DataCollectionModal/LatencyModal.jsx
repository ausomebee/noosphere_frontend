import React, { useState, useEffect, useRef } from "react";
import ReusableModal from "../ReusableModal";
import { TextareaInput } from "../../Input/Inputs";
import { FiRefreshCcw } from "react-icons/fi";
import Button from "../../Button/Button";

const LatencyModal = ({
  isOpen,
  onClose,
  trialCount = 4,
  onSave,
  submitting = false,
}) => {
  const [trials, setTrials] = useState([]);
  const [currentTrialIdx, setCurrentIdx] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [notes, setNotes] = useState("");
  const [behaviorTime, setBehaviorTime] = useState("00:00:00"); // For real-time display
  const [renderTrigger, setRenderTrigger] = useState(0); // Force re-render

  const timerRef = useRef(null);
  const startTimeRef = useRef(0);

  // Initialize trials
  useEffect(() => {
    if (!isOpen) return;
    setTrials(
      Array.from({ length: trialCount }, (_, i) => ({
        trial: i + 1,
        stimulusPresented: "", // Store as HH:MM:SS string
        behaviourStart: "",
        latency: null,
      }))
    );
    setCurrentIdx(0);
    setIsRunning(false);
    setNotes("");
    setBehaviorTime("00:00:00");
    setRenderTrigger(0);
  }, [isOpen, trialCount]);

  // Convert HH:MM:SS string to seconds
  const timeToSeconds = (timeStr) => {
    if (!timeStr || !/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) return 0;
    const [hours, minutes, seconds] = timeStr.split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  };

  // Convert seconds to HH:MM:SS
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Get current timestamp in HH:MM:SS
  const getCurrentTimestamp = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  // Format latency for display
  const formatLatency = (seconds) => {
    if (seconds === null || seconds === undefined) return "--:--:--";
    const absSeconds = Math.max(0, seconds); // Ensure non-negative
    const hours = Math.floor(absSeconds / 3600);
    const minutes = Math.floor((absSeconds % 3600) / 60);
    const secs = absSeconds % 60;
    return `${hours.toString().padStart(2, "0")}hr:${minutes
      .toString()
      .padStart(2, "0")}mm:${secs.toString().padStart(2, "0")}ss`;
  };

  // Start latency timer
  const startLatency = () => {
    const stimTime = trials[currentTrialIdx].stimulusPresented;
    const stimSeconds = timeToSeconds(stimTime);
    if (stimSeconds === 0) {
      console.log("No stimulus time set, cannot start latency");
      return;
    }

    setIsRunning(true);
    const now = Date.now();
    startTimeRef.current = now;
    timerRef.current = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      // Behavior time starts from stimulus time and counts up
      const behaviorSeconds = stimSeconds + elapsedSec;
      setBehaviorTime(formatTime(behaviorSeconds));
      setTrials((t) =>
        t.map((tr, idx) =>
          idx === currentTrialIdx
            ? {
                ...tr,
                behaviourStart: formatTime(behaviorSeconds),
              }
            : tr
        )
      );
    }, 1000);
  };

  // Stop latency timer and calculate latency
  const stopLatency = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);

    const stimTime = trials[currentTrialIdx].stimulusPresented;
    const stimSeconds = timeToSeconds(stimTime);
    const elapsedSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const behaviorSeconds = stimSeconds + elapsedSec;
    const latency = Math.max(0, behaviorSeconds - stimSeconds); // Latency = behaviourStart - stimulusPresented

    setTrials((t) =>
      t.map((tr, idx) =>
        idx === currentTrialIdx
          ? {
              ...tr,
              behaviourStart: formatTime(behaviorSeconds),
              latency: latency,
            }
          : tr
      )
    );
  };

  // Reset trial
  const resetTrial = (idx) => {
    stopLatency();
    setCurrentIdx(idx);
    setTrials((t) =>
      t.map((tr, i) =>
        i === idx
          ? { ...tr, stimulusPresented: "", behaviourStart: "", latency: null }
          : tr
      )
    );
    setBehaviorTime("00:00:00");
    setRenderTrigger((prev) => prev + 1);
  };

  // Save handler
  const handleSave = () => {
    console.log("Saving trials and notes:", { trials, notes });
    onSave({ trials, notes });
  };

  // Handle Time button click to set current timestamp
  const handleTimeClick = (idx) => {
    const currentTime = getCurrentTimestamp();
    setTrials((t) =>
      t.map((tr, i) =>
        i === idx ? { ...tr, stimulusPresented: currentTime } : tr
      )
    );
    setCurrentIdx(idx);
    setRenderTrigger((prev) => prev + 1); // Force re-render
    console.log(`Set stimulusPresented for trial ${idx + 1} to ${currentTime}`);
  };

  const current = trials[currentTrialIdx];

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Latency"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSave}
      onSecondaryButtonClick={onClose}
      size="xl"
      primaryButtonLoading={submitting}
    >
      <div className="trials-opportunities-modal">
        <div className="trials-table-container">
          <table className="trials-table w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left font-semibold">Trial</th>
                <th className="p-2 text-left font-semibold">
                  Stimulus Presented
                </th>
                <th className="p-2 text-left font-semibold">Behaviour Start</th>
                <th className="p-2 text-left font-semibold">Latency</th>
                <th className="p-2 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trials.map((tr, idx) => (
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="p-3">{tr.trial}</td>
                  <td className="p-3">
                    {tr.stimulusPresented ? tr.stimulusPresented : "--:--:--"}
                  </td>
                  <td className="p-3">
                    {idx === currentTrialIdx && isRunning
                      ? behaviorTime
                      : tr.behaviourStart || "--:--:--"}
                  </td>
                  <td className="p-3">{formatLatency(tr.latency)}</td>
                  <td className="p-3 space-x-2">
                   
                      {isRunning && idx === currentTrialIdx ? (
                        // Stop button when running and current trial
                        <Button
                          label="Stop Recording"
                          type="button"
                          onClick={stopLatency}
                          variant="danger"
                        />
                      ) : (
                        // Show action buttons when not running
                        <>
                          {tr.stimulusPresented ? (
                            // If stimulus has been presented
                            <>
                              {tr.latency === null ? (
                                // If no latency recorded yet
                                <Button
                                  label="Record Behaviour"
                                  type="button"
                                  onClick={() => {
                                    setCurrentIdx(idx);
                                    startLatency();
                                  }}
                                  variant="secondary"
                                />
                              ) : (
                                
                                <Button
                                  label="Reset"
                                  type="button"
                                  onClick={() => resetTrial(idx)}
                                  variant="secondary"
                                  icon={<FiRefreshCcw size={16} />}
                                />
                              )}
                            </>
                          ) : (
                            // If no stimulus presented yet
                            <Button
                              label="Present Stimulus"
                              type="button"
                              onClick={() => handleTimeClick(idx)}
                              variant="secondary"
                              disabled={
                                isRunning 
                              }
                            />
                          )}
                        </>
                      )}
                 
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TextareaInput
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter a description..."
          rows={4}
        />
      </div>
    </ReusableModal>
  );
};

export default LatencyModal;
