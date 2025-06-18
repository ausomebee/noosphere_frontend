import React, { useMemo, useEffect } from "react";
import ReusableModal from "../ReusableModal";
import { SelectInput } from "../../Input/Inputs"; // Adjust the import path as needed
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const ChangePriorityModal = ({ isOpen, onClose, onSave, initialPriority, selectedTenant }) => {
  // Define validation schema with yup
  const schema = yup.object().shape({
    priorityFrom: yup.string().trim().required("Current priority is required"),
    priorityTo: yup.string().trim().required("New priority is required").notOneOf([yup.ref("priorityFrom")], "New priority must be different from the current priority"),
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
      priorityFrom: "",
      priorityTo: "",
    },
  });

  // Memoized priority options based on selectedTenant
  const priorityOptions = useMemo(() => {
    const baseOptions = [
      { value: "", label: "Select" },
      { value: "Critical", label: "P1 - Critical" },
      { value: "High", label: "P2 - High" },
      { value: "Medium", label: "P3 - Medium" },
      { value: "Low", label: "P4 - Low" },
    ];
    if (selectedTenant?.isEnterprise) {
      return [
        { value: "", label: "Select" },
        { value: "Enterprise Critical", label: "EP1 - Enterprise Critical" },
        { value: "Enterprise High", label: "EP1 - Enterprise High" },
        ...baseOptions.slice(1),
      ];
    }
    return baseOptions;
  }, [selectedTenant]);

  // Set initial priority value when the modal opens
  useEffect(() => {
    if (isOpen && initialPriority) {
      setValue("priorityFrom", initialPriority, { shouldValidate: true });
    } else {
      reset({ priorityFrom: "", priorityTo: "" });
    }
  }, [isOpen, initialPriority, setValue, reset]);

  // Handle form submission
  const onSubmit = (data) => {
    if (data.priorityFrom && data.priorityTo) {
      onSave(data.priorityTo); // Only send the "to" value as per your requirement
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
      title="Change Priority"
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
          {...register("priorityFrom")}
          options={priorityOptions}
          error={errors.priorityFrom?.message}
          disabled={!!initialPriority} // Disable if initialPriority is provided
        />
        <SelectInput
          label="Change To"
          {...register("priorityTo")}
          options={priorityOptions}
          error={errors.priorityTo?.message}
        />
      </form>
    </ReusableModal>
  );
};

export default ChangePriorityModal;