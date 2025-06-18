import React from "react";
import ReusableModal from "../ReusableModal";
import { TextInput, TextareaInput } from "../../Input/Inputs"; // Adjust the import path as needed
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const EditIssueModal = ({ isOpen, onClose, onSave, initialTitle, initialDescription }) => {
  // Define validation schema with yup
  const schema = yup.object().shape({
    issueTitle: yup.string().trim().required("Issue title is required").max(100, "Title must not exceed 100 characters"),
    description: yup.string().trim().required("Description is required").max(1000, "Description must not exceed 1000 characters"),
  });

  // Initialize useForm with yup resolver and initial values
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      issueTitle: initialTitle || "",
      description: initialDescription || "",
    },
  });

  // Handle form submission
  const onSubmit = (data) => {
    if (data.issueTitle.trim() && data.description.trim()) {
      onSave({ title: data.issueTitle, description: data.description });
      reset(); // Reset form
      onClose();
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        reset(); // Reset form on close
        onClose();
      }}
      title="Edit issue"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(onSubmit)}
      onSecondaryButtonClick={() => {
        reset(); // Reset form on cancel
        onClose();
      }}
    >
      <form className="modal-form" onSubmit={handleSubmit(onSubmit)}>
        <TextInput
          label="Issue Title"
          {...register("issueTitle")}
          error={errors.issueTitle?.message}
          placeholder="Type something"
        />
        <TextareaInput
          label="Issue Description"
          {...register("description")}
          error={errors.description?.message}
          placeholder="Enter a detailed description of the issue"
        />
      </form>
    </ReusableModal>
  );
};

export default EditIssueModal;