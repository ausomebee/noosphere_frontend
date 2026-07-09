import React from "react";
import ReusableModal from "../ReusableModal";
import { TextareaInput, SelectInput, RequiredMark } from "../../Input/Inputs";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { performanceOptions, promptLevelOptions } from "../../../Data/selectOptions";

// Validation schema
const createValidationSchema = () => {
  return yup.object().shape({
    steps: yup.array().of(
      yup.object().shape({
        performance: yup
          .string()
          .oneOf(["I", "VP", "GP", "MP", "PPP", "FPP", "NR", "Error"], "Please select a performance option")
          .nullable()
          .required("Performance is required"),
        promptLevel: yup
          .string()
          .oneOf(["I", "VP", "GP", "MP", "PPP", "FPP", "VIS", "POS", null], "Please select a prompt level")
          .nullable()
          .required("Prompt level is required"),
        notes: yup.string().nullable().optional(),
      })
    ),
    overallNotes: yup.string().nullable().optional(),
  });
};

const TaskAnalysisModal = ({
  isOpen,
  onClose,
  steps = [],
  onSave,
  submitting = false,
}) => {

  // Create validation schema based on steps
  const validationSchema = createValidationSchema(steps);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(validationSchema),
    defaultValues: {
      steps: steps.map(step => ({
        ...step,
        performance: null,
        promptLevel: null,
        notes: null,
      })),
      overallNotes: null,
    },
  });

  // Reset form when modal opens or steps change
  React.useEffect(() => {
    if (isOpen) {
      reset({
        steps: steps.map(step => ({
          ...step,
          performance: null,
          promptLevel: null,
          notes: null,
        })),
        overallNotes: null,
      });
    }
  }, [isOpen, steps, reset]);

  // Handle save
  const onSubmit = (data) => {
    // Convert null values to empty strings for consistency
    const processedData = {
      steps: data.steps.map(step => ({
        ...step,
        performance: step.performance || "",
        promptLevel: step.promptLevel || "",
        notes: step.notes || ""
      })),
      notes: data.overallNotes || ""
    };
    
    onSave(processedData);
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Task Analysis"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(onSubmit)}
      onSecondaryButtonClick={onClose}
      size="2xl"
      primaryButtonLoading={submitting}
    >
<div className="trials-opportunities-modal">
        <div className="trials-table-container">
          <table className="trials-table w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left font-semibold">Step</th>
                <th className="p-2 text-left font-semibold">
                  Performance
                  <RequiredMark required />
                </th>
                <th className="p-2 text-left font-semibold">
                  Prompt Level
                  <RequiredMark required />
                </th>
                <th className="p-2 text-left font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="p-3 step-description font-semibold">{step.description}</td>
                  <td className="p-3 performance-cell">
                    <Controller
                      name={`steps.${index}.performance`}
                      control={control}
                      render={({ field }) => (
                        <SelectInput
                          options={performanceOptions}
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="Select"
                          width="200"
                          className="rounded-md"
                        />
                      )}
                    />
                    {errors.steps?.[index]?.performance && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.steps[index].performance.message}
                      </p>
                    )}
                  </td>
                  <td className="p-3 prompt-level-cell">
                    <Controller
                      name={`steps.${index}.promptLevel`}
                      control={control}
                      render={({ field }) => (
                        <SelectInput
                          options={promptLevelOptions}
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="Select"
                          width="200"
                          className="rounded-md"
                        />
                      )}
                    />
                    {errors.steps?.[index]?.promptLevel && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.steps[index].promptLevel.message}
                      </p>
                    )}
                  </td>
                  <td className="p-3 notes-cell">
                    <Controller
                      name={`steps.${index}.notes`}
                      control={control}
                      render={({ field }) => (
                        <TextareaInput
                          type="text"
                          value={field.value || ""}
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

        <div className="modal-notes-section mt-6">
          <Controller
            name="overallNotes"
            control={control}
            render={({ field }) => (
              <TextareaInput
                value={field.value || ""}
                onChange={field.onChange}
                placeholder="Enter a description..."
                rows={5}
                label="Notes"
              />
            )}
          />
        </div>
      </div>
    </ReusableModal>
  );
};

export default TaskAnalysisModal;