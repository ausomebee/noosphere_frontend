import React, { useEffect } from "react";
import ReusableModal from "../ReusableModal";
import { SelectInput } from "../../Input/Inputs"; // Adjust the import path as needed
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const ChangeStatusModal = ({ isOpen, onClose, onSave, initialStatus }) => {
  // Define validation schema with yup
  const schema = yup.object().shape({
    statusFrom: yup.string().trim().required("Current status is required"),
    statusTo: yup.string().trim().required("New status is required").notOneOf([yup.ref("statusFrom")], "New status must be different from the current status"),
  });

  // Initialize useForm with yup resolver and initial values
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      statusFrom: "",
      statusTo: "",
    },
  });

  // Status options
  const statusOptions = [
    { value: "", label: "Select" },
    { value: "Unassigned", label: "Unassigned" },
    { value: "In Progress", label: "In-Progress" },
    { value: "Not Started", label: "Not Started" },
    { value: "Resolved", label: "Resolved" },
  ];

  // Set initial status value when the modal opens
  useEffect(() => {
    if (isOpen && initialStatus) {
      setValue("statusFrom", initialStatus, { shouldValidate: true });
    } else {
      reset({ statusFrom: "", statusTo: "" });
    }
  }, [isOpen, initialStatus, setValue, reset]);

  // Handle form submission
  const onSubmit = (data) => {
    if (data.statusFrom && data.statusTo) {
      onSave(data.statusTo); // Only send the "to" value as per your requirement
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
      title="Change Status"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(onSubmit)}
      onSecondaryButtonClick={() => {
        reset(); // Reset form on cancel
        onClose();
      }}
    >
      <form className="modal-form" onSubmit={handleSubmit(onSubmit)}>
        <SelectInput
          label="Change from"
          {...register("statusFrom")}
          options={statusOptions}
          error={errors.statusFrom?.message}
          disabled={!!initialStatus} // Disable if initialStatus is provided
        />
        <SelectInput
          label="Change To"
          {...register("statusTo")}
          options={statusOptions}
          error={errors.statusTo?.message}
        />
      </form>
    </ReusableModal>
  );
};

export default ChangeStatusModal;