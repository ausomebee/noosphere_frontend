import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "../ReusableModal";
import {
  TextInput,
  TextareaInput,
  SwitchInput,
} from "../../Input/Inputs";
import { showToast } from "../../../Helper/ShowToast";

// Validation schema
const schema = yup.object().shape({
  diagnosisCode: yup.string().required("Diagnosis Code is required"),
  description: yup.string().required("Diagnosis Description is required"),
  status: yup.boolean(), // default is true (active)
});

const AddDiagnosisCode = ({
  isOpen,
  onClose,
  onSave,
  mode = "add",
  initialData = {},
}) => {
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(schema),
    defaultValues: {
      diagnosisCode: "",
      description: "",
      status: true,
      ...initialData,
    },
  });

  // Watch status value for dynamic label
  const statusValue = watch("status");

  // Reset form when modal opens or initial data changes
  useEffect(() => {
    reset({
      diagnosisCode: initialData?.code || "",
      description: initialData?.description || "",
      status: initialData?.status ?? true,
    });
  }, [initialData, isOpen, reset]);

  const onValidationError = (errors) => {
    const firstError = Object.values(errors)[0];
    showToast(firstError?.message || "Please fill in all required fields", "error");
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    setSubmitError("");
    try {
      await onSave(data);
      reset();
      onClose();
    } catch (error) {
      console.error("Error saving diagnosis code:", error);
      setSubmitError("Failed to save diagnosis code.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title={mode === "edit" ? "Edit Diagnosis Code" : "Add Diagnosis Code"}
      primaryButtonText={submitting ? "Saving..." : mode === "edit" ? "Save Changes" : "Save"}
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(onSubmit, onValidationError)}
      onSecondaryButtonClick={() => {
        reset();
        onClose();
      }}
      size="medium"
      primaryButtonLoading={submitting}
    >
      <div className="space-y-4">
        {submitError && (
          <p className="text-red-500 text-sm font-medium">{submitError}</p>
        )}

        <TextInput
          required
          label="Diagnosis Code"
          placeholder="Enter code"
          error={errors.diagnosisCode?.message}
          {...register("diagnosisCode")}
        />

        <TextareaInput
          required
          label="Description"
          placeholder="Enter description"
          error={errors.description?.message}
          {...register("description")}
        />

        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <SwitchInput
              label={field.value ? "Active" : "Inactive"}
              checked={field.value}
              onChange={(checked) => field.onChange(checked)}
              inputPosition="before"
            />
          )}
        />
      </div>
    </ReusableModal>
  );
};

export default AddDiagnosisCode;
