import React, { useState, useEffect, useRef } from "react";
import ReusableModal from "../ReusableModal";
import Button from "../../Button/Button";
import { TextareaInput } from "../../Input/Inputs";
import { FiRefreshCw } from "react-icons/fi";
import { formatTimerDisplay } from "../../../Helper/Formatters";

const DurationModal = ({ isOpen, onClose, initialDuration = 0, onSave, submitting = false }) => {
  const [duration, setDuration] = useState(initialDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [notes, setNotes] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);
  const elapsedTimeRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setDuration(initialDuration);
      setNotes("");
      setIsRunning(false);
      setHasStarted(false);
      elapsedTimeRef.current = 0;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isOpen, initialDuration]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isRunning) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        elapsedTimeRef.current = elapsed;
        setDuration(elapsed);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isRunning]);

  const startTimer = () => {
    setIsRunning(true);
    setHasStarted(true);
    if (!startTimeRef.current) startTimeRef.current = Date.now();

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setDuration(elapsedSeconds);
    }, 1000);
  };

  const stopTimer = () => {
    setIsRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setDuration(elapsedSeconds);
  };

  const resetTimer = () => {
    setDuration(0);
    setIsRunning(false);
    setHasStarted(false); // <-- change: allows Start Recording again
    elapsedTimeRef.current = 0;
    startTimeRef.current = 0;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // removed immediate startTimer() call
  };

  const handleSave = () => {
    onSave({ duration, notes });
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Duration"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSave}
      onSecondaryButtonClick={onClose}
      size="medium"
      primaryButtonLoading={submitting}
    >
      <div className="space-y-4">
        <div className="text-center flex justify-between items-center mb-24px">
          <div className="text-xl font-semibold mb-2">
            Duration {formatTimerDisplay(duration)}
          </div>
          <div className="flex justify-center space-x-3 mb-4">
            {!hasStarted ? (
              <Button
                label="Start Recording"
                type="button"
                onClick={startTimer}
                variant="primary"
              />
            ) : isRunning ? (
              <Button
                label="Stop Recording"
                type="button"
                onClick={stopTimer}
                variant="danger"
              />
            ) : (
              <Button
                label="Stopped"
                type="button"
                onClick={stopTimer}
                variant="danger"
                disabled={true}
              />
            )}
          </div>
        </div>

        {!isRunning && hasStarted && (
          <div className="mb-24px">
            <Button
              label="Reset"
              type="button"
              onClick={resetTimer}
              variant="secondary"
              icon={<FiRefreshCw size={16} />}
            />
          </div>
        )}

        <div>
          <TextareaInput
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter a description..."
            rows={5}
            label="Notes"
          />
        </div>
      </div>
    </ReusableModal>
  );
};

export default DurationModal;