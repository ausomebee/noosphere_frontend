// AddProgramModal.jsx
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "../ReusableModal";
import { TextareaInput, TextInput } from "../../Input/Inputs";

import { showValidationErrors } from "../../../Helper/formErrors";
const schema = yup.object().shape({
  programName: yup.string().required("Program Name is required"),
  programDescription: yup.string().optional(),
});

const AddProgramModal = ({ isOpen, onClose, onSubmit, mode, initialData }) => {
  const [submitting, setSubmitting] = useState(false); 
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(schema),
  });

  // Reset form when modal opens/closes or when mode/initialData changes
  useEffect(() => {
    if (isOpen) {
      reset({
        programName: initialData?.programName || "",
        programDescription: initialData?.programDescription || "",
      });
    } else {
      // Clear form when modal closes
      reset({
        programName: "",
        programDescription: "",
      });
    }
  }, [isOpen, initialData, reset, mode]);

  const handleFormSubmit = async (data) => {
    setSubmitting(true);
    try {
      await onSubmit(data);
      // Reset form after successful submission
      reset({
        programName: "",
        programDescription: "",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing modal
    reset({
      programName: "",
      programDescription: "",
    });
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === "edit" ? "Edit Program" : "Add a New Program"}
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(handleFormSubmit, showValidationErrors)}
      onSecondaryButtonClick={handleClose}
      size="medium"
      primaryButtonLoading={submitting}
    >
      <div className="space-y-4">
        <TextInput
          required
          label="Program Name"
          {...register("programName")}
          placeholder="Enter program name"
          width="full"
          error={errors.programName?.message}
          autoComplete="off"
        />
        <TextareaInput
          label="Description"
          {...register("programDescription")}
          placeholder="Enter program description"
          width="full"
          error={errors.programDescription?.message}
          autoComplete="off"
        />
      </div>
    </ReusableModal>
  );
};

export default AddProgramModal;