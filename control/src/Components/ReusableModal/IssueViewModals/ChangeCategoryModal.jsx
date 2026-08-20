import React, { useState, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import ReusableModal from "../ReusableModal";
import { SelectInput } from "../../Input/Inputs";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

import { showValidationErrors } from "../../../Helper/formErrors";
const ChangeCategoryModal = ({ isOpen, onClose, onSave, initialCategory }) => {
  const schema = yup.object().shape({
    // An issue can arrive with no category, and this field is read-only,
    // so requiring it made those issues impossible to change.
    categoryFrom: yup.string().trim(),
    categoryTo: yup.string().trim().required("New category is required").notOneOf([yup.ref("categoryFrom")], "New category must be different from the current category"),
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

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && initialCategory) {
      setValue("categoryFrom", initialCategory, { shouldValidate: true });
    } else {
      reset({ categoryFrom: "", categoryTo: "" });
    }
  }, [isOpen, initialCategory, setValue, reset]);

  const onSubmit = async (data) => {
    if (data.categoryTo) {
      setLoading(true);
      try {
        await onSave(data.categoryTo);
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
      title="Change category"
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
          label="Change from"
          {...register("categoryFrom")}
          options={categoryOptions}
          error={errors.categoryFrom?.message}
          disabled={!!initialCategory}
        />
        <SelectInput
          required
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