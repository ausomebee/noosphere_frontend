import React, { useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import ReusableModal from "../ReusableModal";
import { SelectInput } from "../../Input/Inputs";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const ChangeCategoryModal = ({ isOpen, onClose, onSave, initialCategory, issueId, adminId, accessToken, refreshToken }) => {
  const schema = yup.object().shape({
    categoryFrom: yup.string().trim().required("Current category is required"),
    categoryTo: yup.string().trim().required("New category is required").notOneOf([yup.ref("categoryFrom")], "New category must be different from the current category"),
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
      categoryFrom: "",
      categoryTo: "",
    },
  });

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "Select" },
      { value: "Account & Access", label: "Account & Access" },
      { value: "Billing & Payments", label: "Billing & Payments" },
      { value: "Subscription & Plans", label: "Subscription & Plans" },
      { value: "Data Issues", label: "Data Issues" },
      { value: "User Management & Roles", label: "User Management & Roles" },
      { value: "Client/Patient Management Issues", label: "Client/Patient Management Issues" },
      { value: "Bug Report", label: "Bug Report" },
      { value: "Performance", label: "Performance" },
      { value: "Compliance & Security", label: "Compliance & Security" },
      { value: "Notifications & Emails", label: "Notifications & Emails" },
      { value: "Analytics & Reporting", label: "Analytics & Reporting" },
      { value: "Customization & Settings", label: "Customization & Settings" },
      { value: "Third-Party Integrations", label: "Third-Party Integrations" },
      { value: "Training & Onboarding", label: "Training & Onboarding" },
      { value: "Feature Request", label: "Feature Request" },
      { value: "Other / Miscellaneous", label: "Other / Miscellaneous" },
    ],
    []
  );

  useEffect(() => {
    if (isOpen && initialCategory) {
      setValue("categoryFrom", initialCategory, { shouldValidate: true });
    } else {
      reset({ categoryFrom: "", categoryTo: "" });
    }
  }, [isOpen, initialCategory, setValue, reset]);

  const onSubmit = async (data) => {
    if (data.categoryFrom && data.categoryTo) {
      await onSave(data.categoryTo);
      reset();
      onClose();
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Change category"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(onSubmit)}
      onSecondaryButtonClick={() => {
        reset();
        onClose();
      }}
    >
      <form className="modal-form" onSubmit={handleSubmit(onSubmit)}>
        <SelectInput
          label="Change from"
          {...register("categoryFrom")}
          options={categoryOptions}
          error={errors.categoryFrom?.message}
          disabled={!!initialCategory}
        />
        <SelectInput
          label="Change To"
          {...register("categoryTo")}
          options={categoryOptions}
          error={errors.categoryTo?.message}
        />
      </form>
    </ReusableModal>
  );
};

ChangeCategoryModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  initialCategory: PropTypes.string,
  issueId: PropTypes.string.isRequired,
  adminId: PropTypes.string.isRequired,
  accessToken: PropTypes.string.isRequired,
  refreshToken: PropTypes.string.isRequired,
};

export default ChangeCategoryModal;