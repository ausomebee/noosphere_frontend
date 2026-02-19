import React, { useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import ReusableModal from "../ReusableModal";
import { SelectInput } from "../../Input/Inputs";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const ChangePriorityModal = ({ isOpen, onClose, onSave, initialPriority, selectedTenant, issueId, adminId, accessToken, refreshToken }) => {
  const schema = yup.object().shape({
    priorityFrom: yup.string().trim().required("Current priority is required"),
    priorityTo: yup
      .string()
      .trim()
      .required("New priority is required")
      .notOneOf([yup.ref("priorityFrom")], "New priority must be different from the current priority"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      priorityFrom: initialPriority || "",
      priorityTo: "",
    },
  });

  // Determine isEnterprise from selectedTenant
  const isEnterprise = useMemo(() => {
    if (Array.isArray(selectedTenant)) {
      return selectedTenant[0]?.isEnterprise || false;
    }
    return selectedTenant?.isEnterprise || false;
  }, [selectedTenant]);

  const priorityOptions = useMemo(() => {
    const baseOptions = [
      { value: "P1", label: "P1 - Critical" },
      { value: "P2", label: "P2 - High" },
      { value: "P3", label: "P3 - Medium" },
      { value: "P4", label: "P4 - Low" },
    ];
    if (isEnterprise) {
      return [
        { value: "EP1", label: "EP1 - Enterprise Critical" },
        { value: "EP2", label: "EP2 - Enterprise High" },
        ...baseOptions,
      ];
    }
    return baseOptions;
  }, [isEnterprise]);

  useEffect(() => {

    if (isOpen) {
      const validPriority = priorityOptions.find((opt) => opt.value === initialPriority);
      if (validPriority) {
        setValue("priorityFrom", initialPriority, { shouldValidate: true });
      } else {
        setValue("priorityFrom", "", { shouldValidate: true });
      }
      setValue("priorityTo", "", { shouldValidate: true });
    }
  }, [isOpen, initialPriority, setValue, priorityOptions]);

  const onSubmit = async (data) => {
    if (data.priorityTo && data.priorityFrom === initialPriority) {
      await onSave(data.priorityTo);
      reset({ priorityFrom: initialPriority || "", priorityTo: "" });
      onClose();
    } else {
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        reset({ priorityFrom: initialPriority || "", priorityTo: "" });
        onClose();
      }}
      title="Change Priority"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(onSubmit)}
      onSecondaryButtonClick={() => {
        reset({ priorityFrom: initialPriority || "", priorityTo: "" });
        onClose();
      }}
    >
      <form className="modal-form" onSubmit={handleSubmit(onSubmit)}>
        <SelectInput
          label="Current Priority"
          {...register("priorityFrom")}
          options={[{ value: "", label: "Select current priority" }, ...priorityOptions]}
          error={errors.priorityFrom?.message}
          disabled={true}
        />
        <SelectInput
          label="New Priority"
          {...register("priorityTo")}
          options={[{ value: "", label: "Select a new priority" }, ...priorityOptions.filter((opt) => opt.value !== initialPriority)]}
          error={errors.priorityTo?.message}
        />
      </form>
    </ReusableModal>
  );
};

ChangePriorityModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  initialPriority: PropTypes.string,
  selectedTenant: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.arrayOf(PropTypes.object),
  ]),
  issueId: PropTypes.string.isRequired,
  adminId: PropTypes.string.isRequired,
  accessToken: PropTypes.string.isRequired,
  refreshToken: PropTypes.string.isRequired,
};

export default ChangePriorityModal;