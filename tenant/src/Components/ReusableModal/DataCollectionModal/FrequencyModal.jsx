import React from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "../ReusableModal";
import { TextareaInput, TextInput } from "../../Input/Inputs";
import { showToast } from "../../../Helper/ShowToast";

// Validation schema
const frequencySchema = yup.object({
  numberOfOccurrence: yup
    .number()
    .typeError("Number of occurrence must be a number")
    .min(1, "Number of occurrence must be at least 1")
    .required("Number of occurrence is required"),
  notes: yup.string().optional(),
});

const FrequencyModal = ({
  isOpen,
  onClose,
  initialData = {},
  onSave,
  submitting = false,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(frequencySchema),
    defaultValues: {
      numberOfOccurrence: initialData.numberOfOccurrence || 1,
      notes: initialData.notes || "",
    },
  });

  const numberOfOccurrenceValue = watch("numberOfOccurrence");

  const handleFormSubmit = async (data) => {
    try {
      await onSave(data);
    } catch (error) {
      showToast("Failed to save frequency data", "error");
    }
  };

  const onValidationError = (errors) => {
    const firstError = Object.values(errors)[0];
    showToast(firstError?.message || "Please fill in all required fields", "error");
  };

  const incrementNumber = () => {
    const currentValue = parseInt(numberOfOccurrenceValue) || 1;
    setValue("numberOfOccurrence", currentValue + 1);
  };

  const decrementNumber = () => {
    const currentValue = parseInt(numberOfOccurrenceValue) || 1;
    if (currentValue > 1) {
      setValue("numberOfOccurrence", currentValue - 1);
    }
  };

  const handleNumberChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^[1-9]\d*$/.test(value)) {
      setValue("numberOfOccurrence", value === "" ? "" : parseInt(value));
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Frequency"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(handleFormSubmit, onValidationError)}
      onSecondaryButtonClick={onClose}
      size="medium"
      primaryButtonLoading={submitting}
    >
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-16px">
            <button
              type="button"
              onClick={decrementNumber}
              className="border rounded-full px-2 py-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <div className="items-center flex justify-center gap-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of occurence
              </label>
              <div style={{ marginBottom: "-10px" }}>
                <TextInput
                  required
                  type="number"
                  min="1"
                  {...register("numberOfOccurrence")}
                  onChange={handleNumberChange}
                  width={100}
                  className=" text-center px-3 py-2 "
                />
              </div>
            </div>
            <button
              type="button"
              onClick={incrementNumber}
              className="border rounded-full px-2 py-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
          {errors.numberOfOccurrence && (
            <p className="mt-1 text-sm text-red-600">
              {errors.numberOfOccurrence.message}
            </p>
          )}
        </div>
        <div>
          <TextareaInput
            label="Notes"
            {...register("notes")}
            placeholder="Enter a description..."
            rows={5}
          />
          {errors.notes && (
            <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
          )}
        </div>
      </div>
    </ReusableModal>
  );
};

export default FrequencyModal;
