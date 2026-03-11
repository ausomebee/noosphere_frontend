import React, { useState } from "react";
import PropTypes from "prop-types";
import ReusableModal from "../ReusableModal";
import { TextareaInput } from "../../Input/Inputs";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const AddCommentModal = ({ isOpen, onClose, onSave, issueId, adminId, accessToken, refreshToken }) => {
  const schema = yup.object().shape({
    comment: yup.string().trim().required("Comment is required").max(500, "Comment must not exceed 500 characters"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { comment: "" },
  });

  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    if (data.comment.trim()) {
      setLoading(true);
      try {
        await onSave(data.comment);
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
      title="Add a comment"
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
        <TextareaInput
          label="Comment"
          {...register("comment")}
          error={errors.comment?.message}
          placeholder="Type something..."
          rows={5}
        />
      </form>
    </ReusableModal>
  );
};

AddCommentModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  issueId: PropTypes.string.isRequired,
  adminId: PropTypes.string.isRequired,
  accessToken: PropTypes.string.isRequired,
  refreshToken: PropTypes.string.isRequired,
};

export default AddCommentModal;