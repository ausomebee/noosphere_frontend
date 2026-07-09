import React, { useState } from "react";            // 👈 add useState
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "../ReusableModal";
import { TextareaInput, TextInput } from "../../Input/Inputs";

const schema = yup.object().shape({
  domainName: yup.string().required("Domain Name is required"),
  domainDescription: yup.string().optional(),
});

const AddDomainModal = ({
  isOpen,
  onClose,
  onSubmit,
  type,
  mode,
  initialData,
}) => {
  const [submitting, setSubmitting] = useState(false); // 👈 loading flag

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(schema),
    defaultValues: {
      domainName: initialData?.domain || "",
      domainDescription: initialData?.description || "",
    },
  });

  React.useEffect(() => {
    if (mode === "edit" && initialData) {
      reset({
        domainName: initialData.domain || "",
        domainDescription: initialData.description || "",
      });
    } else {
      reset({ domainName: "", domainDescription: "" });
    }
  }, [initialData, mode, reset]);

  const handleFormSubmit = async (data) => {
    setSubmitting(true);                       // 👈 start spinner
    try {
      await onSubmit({ ...data, type });
    } finally {
      setSubmitting(false);                    // 👈 stop spinner
    }
    reset();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "edit" ? `Edit Domain (${type})` : `Add a new Domain (${type})`}
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(handleFormSubmit)}
      onSecondaryButtonClick={onClose}
      size="medium"
      primaryButtonLoading={submitting}      // 👈 pass loading prop
    >
      <div className="space-y-4">
        <div>
          <TextInput
            required
            label="Domain Name"
            {...register("domainName")}
            placeholder="Enter domain name"
            width="full"
            error={errors.domainName?.message}
          />
        </div>
        <div>
          <TextareaInput
            label="Description"
            {...register("domainDescription")}
            placeholder="Enter domain description"
            width="full"
            error={errors.domainDescription?.message}
          />
        </div>
      </div>
    </ReusableModal>
  );
};

export default AddDomainModal;