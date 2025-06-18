import React from "react";
import ReusableModal from "../ReusableModal";
import { TextareaInput } from "../../Input/Inputs";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const AddCommentModal = ({ isOpen, onClose, onSave }) => {
  // Define validation schema with yup
  const schema = yup.object().shape({
    comment: yup.string().trim().required("Comment is required").max(500, "Comment must not exceed 500 characters"),
  });

  // Initialize useForm with yup resolver
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { comment: "" },
  });

  // Handle form submission
  const onSubmit = (data) => {
    if (data.comment.trim()) {
      onSave(data.comment);
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
      title="Add a comment"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(onSubmit)}
      onSecondaryButtonClick={() => {
        reset(); // Reset form on cancel
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

export default AddCommentModal;