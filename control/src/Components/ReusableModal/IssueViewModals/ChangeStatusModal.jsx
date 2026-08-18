import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import ReusableModal from "../ReusableModal";
import { SelectInput } from "../../Input/Inputs";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { issueStatusOptions as statusOptions } from "../../../Data/selectOptions";

import { showValidationErrors } from "../../../Helper/formErrors";
const ChangeStatusModal = ({ isOpen, onClose, onSave, initialStatus }) => {
  const schema = yup.object().shape({
    statusFrom: yup.string().trim().required("Current status is required"),
    statusTo: yup.string().trim().required("New status is required").notOneOf([yup.ref("statusFrom")], "New status must be different from the current status"),
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
      statusFrom: "",
      statusTo: "",
    },
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && initialStatus) {
      setValue("statusFrom", initialStatus, { shouldValidate: true });
    } else {
      reset({ statusFrom: "", statusTo: "" });
    }
  }, [isOpen, initialStatus, setValue, reset]);

  const onSubmit = async (data) => {
    if (data.statusFrom && data.statusTo) {
      setLoading(true);
      try {
        await onSave(data.statusTo);
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
      title="Change Status"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      primaryButtonLoading={loading}
      onPrimaryButtonClick={handleSubmit(onSubmit, showValidationErrors)}
      onSecondaryButtonClick={() => {
        reset();
        onClose();
      }}
    >
      <form className="modal-form" onSubmit={handleSubmit(onSubmit, showValidationErrors)}>
        <SelectInput
          required
          label="Change from"
          {...register("statusFrom")}
          options={statusOptions}
          error={errors.statusFrom?.message}
          disabled={!!initialStatus}
        />
        <SelectInput
          required
          label="Change To"
          {...register("statusTo")}
          options={statusOptions}
          error={errors.statusTo?.message}
        />
      </form>
    </ReusableModal>
  );
};

ChangeStatusModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  initialStatus: PropTypes.string,
  issueId: PropTypes.string.isRequired,
  adminId: PropTypes.string.isRequired,
  accessToken: PropTypes.string.isRequired,
  refreshToken: PropTypes.string.isRequired,
};

export default ChangeStatusModal;