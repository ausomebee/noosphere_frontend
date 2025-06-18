import React, { useEffect } from "react";
import ReusableModal from "../ReusableModal";
import { SelectInput } from "../../Input/Inputs"; // Adjust the import path as needed
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const ReassignModal = ({ isOpen, onClose, onSave, initialAssignee, staffList = [] }) => {
  // Define validation schema with yup
  const schema = yup.object().shape({
    currentAssignee: yup.string().trim().required("Current assignee is required"),
    newAssignee: yup.string().trim().required("New assignee is required").notOneOf([yup.ref("currentAssignee")], "New assignee must be different from the current assignee"),
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
      currentAssignee: "",
      newAssignee: "",
    },
  });

  // Memoized staff options (moved inside component to use staffList)
  const staffOptions = [
    { value: "", label: staffList.length ? "Select" : "No staff available" },
    ...staffList.map((staff) => ({
      value: staff.staffId,
      label: staff.name,
    })),
  ];

  // Set initial assignee value when the modal opens
  useEffect(() => {
    if (isOpen && initialAssignee) {
      setValue("currentAssignee", initialAssignee, { shouldValidate: true });
    } else {
      reset({ currentAssignee: "", newAssignee: "" });
    }
  }, [isOpen, initialAssignee, setValue, reset]);

  // Handle form submission
  const onSubmit = (data) => {
    if (data.currentAssignee && data.newAssignee) {
      onSave(data.newAssignee); // Only send the "to" value as per your requirement
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
      title="Reassign to Staff"
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
          label="Current Assignee"
          {...register("currentAssignee")}
          options={staffOptions}
          error={errors.currentAssignee?.message}
          disabled={!!initialAssignee} // Disable if initialAssignee is provided
        />
        <SelectInput
          label="New Assignee"
          {...register("newAssignee")}
          options={staffOptions}
          error={errors.newAssignee?.message}
        />
      </form>
    </ReusableModal>
  );
};

export default ReassignModal;