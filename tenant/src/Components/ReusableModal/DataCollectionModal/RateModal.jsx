import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "../ReusableModal";
import { TextInput, TextareaInput, RequiredMark } from "../../Input/Inputs";
import { FiRefreshCcw } from "react-icons/fi";
import Button from "../../Button/Button";
import { formatTimerDisplay } from "../../../Helper/Formatters";
import SectionLoader from "../../SectionLoader";

/* ----------  validation  ---------- */
const frequencySchema = yup.object({
  numberOfOccurrence: yup
    .number()
    .typeError("Number of occurrence must be a number")
    .min(0, "Number of occurrence must be at least 1")
    .required("Number of occurrence is required"),
  duration: yup
    .number()
    .typeError("Duration must be a number")
    .min(0, "Duration cannot be negative")
    .required("Duration is required"),
  notes: yup.string().optional(),
});

/* ----------  reusable timer (DurationModal pattern)  ---------- */
function useTimer(initialSeconds = 0) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);

  const timerRef = useRef(null);
  const startTimeRef = useRef(0);

  const start = () => {
    if (running) return;
    startTimeRef.current = Date.now() - seconds * 1000;
    setRunning(true);
    setStarted(true);
  };

  const stop = () => {
    if (!running) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setSeconds(elapsed);
    setRunning(false);
  };

  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setSeconds(0);
    setRunning(false);
    setStarted(false);
    startTimeRef.current = 0;
  };

  /* ticking */
  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setSeconds(elapsed);
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [running]);

  /* tab visibility */
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && running) stop();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [running]);

  const resetForm = () => reset(); // expose for consumer

  return { seconds, running, started, start, stop, reset, resetForm };
}

/* ----------  the modal  ---------- */
const RateModal = ({
  isOpen,
  onClose,
  initialData = {},
  onSave,
  submitting = false,
}) => {
  const { seconds, running, started, start, stop, resetForm } = useTimer(
    Number(initialData.duration) || 0
  );

  /* ----------  form  ---------- */
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(frequencySchema),
    defaultValues: {
      numberOfOccurrence: initialData.numberOfOccurrence || 0,
      duration: initialData.duration || 0,
      notes: initialData.notes || "",
    },
  });

  /* keep form duration in sync with timer */
  useEffect(() => {
    setValue("duration", seconds, { shouldValidate: true });
  }, [seconds, setValue]);

  // Reset the form + timer each time the modal opens so re-recording after a
  // clear starts blank (the modal stays mounted between opens).
  useEffect(() => {
    if (isOpen) {
      resetForm();
      reset({
        numberOfOccurrence: initialData.numberOfOccurrence || 0,
        duration: initialData.duration || 0,
        notes: initialData.notes || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  /* ----------  submit  ---------- */
  const onSubmit = (data) => {
    onSave({ 
      ...data, 
      duration: seconds,
      dataCollectionType: "Rate" // Add the data collection type
    });
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Rate"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(onSubmit)}
      onSecondaryButtonClick={onClose}
      size="lg"
      primaryButtonLoading={submitting}
      primaryButtonDisabled={submitting} // Disable button when submitting
    >
      <div className="space-y-4">
        {/* -------  occurrence  ------- */}
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Number of Occurrence
                </label>
                <div style={{ marginBottom: "-15px" }}>
                  <TextInput
                    required
                    type="number"
                    min="0"
                    {...register("numberOfOccurrence")}
                    width={100}
                    className="text-center px-3 py-2"
                    disabled={submitting} // Disable input when submitting
                  />
                </div>
              </div>
              {errors.numberOfOccurrence && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.numberOfOccurrence.message}
                </p>
              )}
            </div>

            {/* -------  duration  ------- */}
            <div className="flex-1">
              <div className="flex items-center justify-between gap-4">
                <div className="text-xl font-medium" aria-live="polite">
                  Duration
                  <RequiredMark required />: {formatTimerDisplay(seconds)}
                </div>
                <div className="space-x-3">
                  {!started ? (
                    <Button
                      label="Start Recording"
                      type="button"
                      onClick={start}
                      variant="primary"
                      disabled={submitting} // Disable button when submitting
                    />
                  ) : running ? (
                    <Button
                      label="Stop Recording"
                      type="button"
                      onClick={stop}
                      variant="danger"
                      disabled={submitting} // Disable button when submitting
                    />
                  ) : (
                    <Button
                      label="Stopped"
                      type="button"
                      disabled
                      variant="danger"
                    />
                  )}
                </div>
              </div>

              {errors.duration && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.duration.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* -------  reset  ------- */}
        {!running && started && (
          <div className="mb-6 flex justify-left">
            <Button
              label="Reset"
              type="button"
              onClick={() => {
                resetForm();                       // clear timer
                setValue("numberOfOccurrence", 0); // clear occurrence
              }}
              variant="secondary"
              icon={<FiRefreshCcw size={16} />}
              disabled={submitting} // Disable button when submitting
            />
          </div>
        )}

        {/* -------  notes  ------- */}
        <div>
          <TextareaInput
            label="Notes"
            {...register("notes")}
            placeholder="Enter a description..."
            rows={5}
            disabled={submitting} // Disable textarea when submitting
          />
          {errors.notes && (
            <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
          )}
        </div>

        {/* Show loading indicator while submitting */}
        {submitting && (
          <div className="flex justify-center items-center py-4">
            <SectionLoader minHeight={60} />
            <span className="ml-2 text-gray-600">Saving data...</span>
          </div>
        )}
      </div>
    </ReusableModal>
  );
};

export default RateModal;