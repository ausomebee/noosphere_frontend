import React, { useState, useEffect } from "react";
import ReusableModal from "../ReusableModal";
import { TextareaInput, CheckboxInput, SelectInput } from "../../Input/Inputs";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { showToast } from "../../../Helper/ShowToast";

// Validation schema
const createValidationSchema = (trialCount) => {
  return yup.object().shape({
    trials: yup.array().of(
      yup.object().shape({
        performance: yup
          .string()
          .oneOf(["correct", "incorrect", "noResponse", "refused"], "Please select a performance option")
          .required("Performance is required"),
        promptLevel: yup
          .string()
          .oneOf(["I", "VP", "GP", "MP", "PPP", "FPP", "VIS", "POS"], "Please select a prompt level")
          .required("Prompt level is required"),
        notes: yup.string().optional(),
      })
    ),
    overallNotes: yup.string().optional(),
  });
};

const PercentageCorrect = ({
  isOpen,
  onClose,
  trialCount = 3,
  onSave,
  submitting = false,
}) => {
  const [percentageCorrect, setPercentageCorrect] = useState(0);

  // Create validation schema based on trialCount
  const validationSchema = createValidationSchema(trialCount);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    getValues,
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      trials: Array.from({ length: trialCount }, (_, i) => ({
        id: i + 1,
        performance: "",
        promptLevel: "",
        notes: "",
      })),
      overallNotes: "",
    },
  });

  // Watch all trials individually to trigger updates
  const watchedTrials = [];
  for (let i = 0; i < trialCount; i++) {
    watchedTrials.push(watch(`trials.${i}.performance`));
  }

  // Calculate percentage correct whenever any trial performance changes
  useEffect(() => {
    const formValues = getValues();
    if (formValues.trials && formValues.trials.length > 0) {
      const correctCount = formValues.trials.filter(
        (trial) => trial.performance === "correct"
      ).length;
      const calculatedPercentage = Math.round(
        (correctCount / formValues.trials.length) * 100
      );
      setPercentageCorrect(calculatedPercentage);
    } else {
      setPercentageCorrect(0);
    }
  }, [watchedTrials, getValues]); // watchedTrials array will change when any performance changes

  // Reset form when modal opens or trialCount changes
  useEffect(() => {
    if (isOpen) {
      reset({
        trials: Array.from({ length: trialCount }, (_, i) => ({
          id: i + 1,
          performance: "",
          promptLevel: "",
          notes: "",
        })),
        overallNotes: "",
      });
      setPercentageCorrect(0);
    }
  }, [isOpen, trialCount, reset]);

  // Handle save
  const onSubmit = async (data) => {
    // Calculate final percentage before saving
    const correctCount = data.trials.filter(
      (trial) => trial.performance === "correct"
    ).length;
    const finalPercentage = Math.round(
      (correctCount / data.trials.length) * 100
    );

    try {
      await onSave({
        trials: data.trials,
        notes: data.overallNotes,
        percentageCorrect: finalPercentage,
      });
    } catch {
      showToast("Failed to save data", "error");
    }
  };

  const onValidationError = (errors) => {
    const firstError = Object.values(errors)[0];
    showToast(firstError?.message || "Please fill in all required fields", "error");
  };

  // Prompt level options
  const promptLevelOptions = [
    { value: "I", label: "I - Independent" },
    { value: "VP", label: "VP - Verbal Prompt" },
    { value: "GP", label: "GP - Gesture Prompt" },
    { value: "MP", label: "MP - Model Prompt" },
    { value: "PPP", label: "PPP - Partial Physical Prompt" },
    { value: "FPP", label: "FPP - Full Physical Prompt" },
    { value: "VIS", label: "VIS - Visual Prompt" },
    { value: "POS", label: "POS - Positional Prompt" },
  ];

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Percentage Correct"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(onSubmit, onValidationError)}
      onSecondaryButtonClick={onClose}
      size="xl"
      primaryButtonLoading={submitting}
    >
      <div className="percentage-correct-modal">
        <div className="trials-table-container">
          <table className="trials-table w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left font-semibold">Trial Count</th>
                <th className="p-2 text-left font-semibold">Performance</th>
                <th className="p-2 text-left font-semibold">Prompt Level</th>
                <th className="p-2 text-left font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: trialCount }, (_, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="p-3 trial-number font-medium">{index + 1}</td>
                  <td className="p-3 performance-cell">
                    <div className="performance-options space-y-2">
                      <Controller
                        name={`trials.${index}.performance`}
                        control={control}
                        render={({ field }) => (
                          <CheckboxInput
                            label="Correct"
                            checked={field.value === "correct"}
                            onChange={() => field.onChange("correct")}
                            radio
                          />
                        )}
                      />
                      <Controller
                        name={`trials.${index}.performance`}
                        control={control}
                        render={({ field }) => (
                          <CheckboxInput
                            label="Incorrect"
                            checked={field.value === "incorrect"}
                            onChange={() => field.onChange("incorrect")}
                            radio
                          />
                        )}
                      />
                      <Controller
                        name={`trials.${index}.performance`}
                        control={control}
                        render={({ field }) => (
                          <CheckboxInput
                            label="No Response"
                            checked={field.value === "noResponse"}
                            onChange={() => field.onChange("noResponse")}
                            radio
                          />
                        )}
                      />
                      <Controller
                        name={`trials.${index}.performance`}
                        control={control}
                        render={({ field }) => (
                          <CheckboxInput
                            label="Refused"
                            checked={field.value === "refused"}
                            onChange={() => field.onChange("refused")}
                            radio
                          />
                        )}
                      />
                      {errors.trials?.[index]?.performance && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.trials[index].performance.message}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-3 prompt-level-cell">
                    <Controller
                      name={`trials.${index}.promptLevel`}
                      control={control}
                      render={({ field }) => (
                        <SelectInput
                          options={promptLevelOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select"
                          width="200"
                          className="rounded-md"
                        />
                      )}
                    />
                    {errors.trials?.[index]?.promptLevel && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.trials[index].promptLevel.message}
                      </p>
                    )}
                  </td>
                  <td className="p-3 notes-cell">
                    <Controller
                      name={`trials.${index}.notes`}
                      control={control}
                      render={({ field }) => (
                        <TextareaInput
                          type="text"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Enter a description..."
                          
                        />
                      )}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="percentage-result mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800">
            Percentage Correct: {percentageCorrect}%
          </h3>
        </div>

        <div className="modal-notes-section mt-6">
          <Controller
            name="overallNotes"
            control={control}
            render={({ field }) => (
              <TextareaInput
                value={field.value}
                onChange={field.onChange}
                placeholder="Enter a description..."
                rows={5}
                label="Overall Notes"
              />
            )}
          />
        </div>
      </div>
    </ReusableModal>
  );
};

export default PercentageCorrect;