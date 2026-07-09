import React, { useState } from "react";
import ReusableModal from "../ReusableModal";
import { TextInput, TextareaInput, SelectInput, RadioInput, CheckboxInput, RequiredMark } from "../../Input/Inputs";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import useReduxFormDraft from "../../../hooks/useReduxFormDraft";

const PauseSubscriptionModal = ({ isOpen, onClose, onSave, selectedItems }) => {
  const [loading, setLoading] = useState(false);

  const schema = yup.object().shape({
    pauseType: yup.string().required("Pause type is required"),
    reason: yup.string().required("Reason is required"),
    comment: yup.string().nullable().notRequired().max(1000, "Comment must not exceed 1000 characters"),
    untilDate: yup.string().when("pauseType", {
      is: "until",
      then: (schema) => schema.required("Until date is required"),
      otherwise: (schema) => schema.nullable(),
    }),
    specificDate: yup.string().when("pauseType", {
      is: "specificDate",
      then: (schema) => schema.required("Specific date is required"),
      otherwise: (schema) => schema.nullable(),
    }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      pauseType: "indefinitely",
      reason: "",
      comment: "",
      notifyTenant: false,
      untilDate: "",
      specificDate: "",
    },
  });

  const clearDraft = useReduxFormDraft("pause-subscription", { watch, reset, isOpen, exclude: [] });

  const pauseType = watch("pauseType");

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await onSave({
        items: selectedItems,
        pauseType: data.pauseType,
        reason: data.reason,
        ...(data.comment ? { comment: data.comment } : {}),
        notifyTenant: data.notifyTenant,
        untilDate: data.untilDate || undefined,
        specificDate: data.specificDate || undefined,
      });
      clearDraft();
      reset();
      onClose();
    } catch {
      // Parent already shows error toast — modal stays open
    } finally {
      setLoading(false);
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Pause Subscription"
      primaryButtonText="Pause Subscription"
      secondaryButtonText="Cancel"
      primaryButtonLoading={loading}
      onPrimaryButtonClick={handleSubmit(onSubmit)}
      onSecondaryButtonClick={() => {
        reset();
        onClose();
      }}
    >
      <form className="modal-form" onSubmit={handleSubmit(onSubmit)}>
        <label>
          Select Pause Type
          <RequiredMark required />
        </label>
        <div style={{display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px", marginBottom: "20px"}}>
          <RadioInput
            name="pauseType"
            value="indefinitely"
            label="Pause now (indefinitely)"
            {...register("pauseType")}
            error={errors.pauseType?.message}
          />
          <RadioInput
            name="pauseType"
            value="until"
            label="Pause Until"
            {...register("pauseType")}
            error={errors.pauseType?.message}
          />
          {pauseType === "until" && (
            <TextInput
              type="datetime-local"
              {...register("untilDate")}
              error={errors.untilDate?.message}
              placeholder="Select"
            />
          )}
          <RadioInput
            name="pauseType"
            value="specificDate"
            label="Pause on a specific date"
            {...register("pauseType")}
            error={errors.pauseType?.message}
          />
          {pauseType === "specificDate" && (
            <TextInput
              type="datetime-local"
              {...register("specificDate")}
              error={errors.specificDate?.message}
              placeholder="Select"
            />
          )}
        </div>

        <label>Select Reason</label>
        <SelectInput
          required
          {...register("reason")}
          error={errors.reason?.message}
          options={[
            { value: "", label: "Select" },
            { value: "Tenant Request", label: "Tenant Request" },
            { value: "Terms Violation", label: "Terms Violation" },
            { value: "No Usage/Inactivity", label: "No Usage/Inactivity" },
            { value: "Compliance Requirement", label: "Compliance Requirement" },
            { value: "other", label: "Other" },
          ]}
        />

        <label>Comment (optional)</label>
        <TextareaInput
          {...register("comment")}
          error={errors.comment?.message}
          placeholder="Type Something"
        />

        <CheckboxInput
          name="notifyTenant"
          label="Notify tenant via email"
          {...register("notifyTenant")}
        />

        <button type="submit" style={{ display: "none" }} />
      </form>
    </ReusableModal>
  );
};

export default PauseSubscriptionModal;