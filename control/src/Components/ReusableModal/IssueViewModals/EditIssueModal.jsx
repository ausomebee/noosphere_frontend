import React, { useState } from "react";
import PropTypes from "prop-types";
import ReusableModal from "../ReusableModal";
import { TextInput, TextareaInput } from "../../Input/Inputs";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const EditIssueModal = ({ isOpen, onClose, onSave, initialTitle, initialDescription, issueId, adminId, accessToken, refreshToken }) => {
  const schema = yup.object().shape({
    issueTitle: yup.string().trim().required("Issue title is required").max(100, "Title must not exceed 100 characters"),
    description: yup.string().trim().required("Description is required").max(1000, "Description must not exceed 1000 characters"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(schema),
    defaultValues: {
      issueTitle: initialTitle || "",
      description: initialDescription || "",
    },
  });

  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    if (data.issueTitle.trim() && data.description.trim()) {
      setLoading(true);
      try {
        await onSave({ title: data.issueTitle, description: data.description });
        reset();
        onClose();
      } catch {
        // Error handled by parent - modal stays open
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Edit issue"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      primaryButtonLoading={loading}
      onPrimaryButtonClick={handleSubmit(onSubmit)}
      onSecondaryButtonClick={() => {
        reset();
        onClose();
      }}
    >
      <form className="modal-form" onSubmit={handleSubmit(onSubmit)}>
        <TextInput
          required
          label="Issue Title"
          {...register("issueTitle")}
          error={errors.issueTitle?.message}
          placeholder="Type something"
        />
        <TextareaInput
          required
          label="Issue Description"
          {...register("description")}
          error={errors.description?.message}
          placeholder="Enter a detailed description of the issue"
        />
      </form>
    </ReusableModal>
  );
};

EditIssueModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  initialTitle: PropTypes.string,
  initialDescription: PropTypes.string,
  issueId: PropTypes.string.isRequired,
  adminId: PropTypes.string.isRequired,
  accessToken: PropTypes.string.isRequired,
  refreshToken: PropTypes.string.isRequired,
};

export default EditIssueModal;