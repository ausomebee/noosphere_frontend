import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import ReusableModal from "../ReusableModal";
import { SelectInput } from "../../Input/Inputs";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const ReassignModal = ({ isOpen, onClose, onSave, initialAssignee, staffList = [], issueId, adminId, accessToken, refreshToken }) => {
  const schema = yup.object().shape({
    currentAssignee: yup.string().trim().required("Current assignee is required"),
    newAssignee: yup.string().trim().required("New assignee is required").notOneOf([yup.ref("currentAssignee")], "New assignee must be different from the current assignee"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(schema),
    defaultValues: {
      currentAssignee: "",
      newAssignee: "",
    },
  });

  const staffOptions = [
    { value: "", label: staffList.length ? "Select" : "No staff available" },
    ...staffList.map((staff) => ({
      value: staff.staffId,
      label: staff.name,
    })),
  ];

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && initialAssignee) {
      const staff = staffList.find((s) => s.name === initialAssignee);
      setValue("currentAssignee", staff?.staffId || initialAssignee, { shouldValidate: true });
    } else {
      reset({ currentAssignee: "", newAssignee: "" });
    }
  }, [isOpen, initialAssignee, staffList, setValue, reset]);

  const onSubmit = async (data) => {
    if (data.currentAssignee && data.newAssignee) {
      setLoading(true);
      try {
        await onSave(data.newAssignee);
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
      title="Reassign to Staff"
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
        <SelectInput
          required
          label="Current Assignee"
          {...register("currentAssignee")}
          options={staffOptions}
          error={errors.currentAssignee?.message}
          disabled={!!initialAssignee}
        />
        <SelectInput
          required
          label="New Assignee"
          {...register("newAssignee")}
          options={staffOptions}
          error={errors.newAssignee?.message}
          emptyHint="No staff found. Create one in Settings → Staff."
        />
      </form>
    </ReusableModal>
  );
};

ReassignModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  initialAssignee: PropTypes.string,
  staffList: PropTypes.arrayOf(
    PropTypes.shape({
      staffId: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
  issueId: PropTypes.string.isRequired,
  adminId: PropTypes.string.isRequired,
  accessToken: PropTypes.string.isRequired,
  refreshToken: PropTypes.string.isRequired,
};

export default ReassignModal;