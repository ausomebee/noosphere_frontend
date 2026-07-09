import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "../ReusableModal";
import { TextInput, SelectInput, SwitchInput } from "../../Input/Inputs";
import Button from "../../Button/Button";
import { stateOptions, countryOptions } from "../../../Data/selectOptions";
import useReduxFormDraft from "../../../hooks/useReduxFormDraft";

const schema = yup.object({
  name: yup.string().required("Name is required"),
  email: yup.string().email("Invalid email").required("Email is required"),
  phone: yup.string().required("Phone is required"),
  website: yup.string().url("Invalid URL").required("Website is required"),
  practiceNPI: yup.string().required("Practice NPI is required"),
  street: yup.string().required("Street is required"),
  city: yup.string().required("City is required"),
  stateProvince: yup.string().required("State is required"),
  country: yup.string().required("Country is required"),
  zip: yup.string().required("ZIP is required"),
  active: yup.boolean().required("Status is required"),
});

const AddOrganizationModal = ({ isOpen, onClose, onSave, initialValues }) => {
  const [isLoading, setIsLoading] = useState(false)
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      website: "",
      practiceNPI: "",
      street: "",
      city: "",
      stateProvince: "",
      country: "",
      zip: "",
      active: true,
      ...initialValues,
    },
  });

  const clearDraft = useReduxFormDraft("add-organization", { watch, reset, isOpen, exclude: [] });

  useEffect(() => {
    reset({
      name: initialValues?.name || "",
      email: initialValues?.email || "",
      phone: initialValues?.phone || "",
      website: initialValues?.website || "",
      practiceNPI: initialValues?.practiceNPI || "",
      street: initialValues?.streetAddress || "",
      city: initialValues?.city || "",
      stateProvince: initialValues?.state || "",
      country: initialValues?.country || "",
      zip: initialValues?.zipCode || "",
      active: initialValues?.active !== undefined ? initialValues.active : true,
    });
  }, [initialValues, reset]);

  const submit = async (data) => {
    await onSave(data);
    clearDraft();
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Organisation Information"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(submit)}
      onSecondaryButtonClick={onClose}
      size="lg"
       primaryButtonLoading={isLoading}
    >
      <div className="mt-5 grid ">
        <TextInput
          required
          label="Name"
          {...register("name")}
          error={errors.name?.message}
          disabled={true}
        />
        <TextInput
          required
          label="Email"
          {...register("email")}
          error={errors.email?.message}
          disabled={true}
        />
        <TextInput
          required
          label="Phone"
          {...register("phone")}
          error={errors.phone?.message}
        />
        <TextInput
          required
          label="Website"
          {...register("website")}
          error={errors.website?.message}
        />
        <TextInput
          required
          label="Practice NPI"
          {...register("practiceNPI")}
          error={errors.practiceNPI?.message}
        />
        <TextInput
          required
          label="Street Address"
          {...register("street")}
          error={errors.street?.message}
        />
        <div className="flex gap-4">
          <div className="flex-1">
            <TextInput
              required
              label="City"
              {...register("city")}
              error={errors.city?.message}
            />
          </div>
          <div className="flex-1">
            <Controller
              name="stateProvince"
              control={control}
              render={({ field }) => (
                <SelectInput
                  required
                  label="State/Province"
                  options={stateOptions}
                  {...field}
                  error={errors.stateProvince?.message}
                />
              )}
            />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <TextInput
              required
              label="ZIP"
              {...register("zip")}
              error={errors.zip?.message}
            />
          </div>
          <div className="flex-1">
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <SelectInput
                  required
                  label="Country"
                  options={countryOptions}
                  {...field}
                  error={errors.country?.message}
                />
              )}
            />
          </div>
        </div>
        {/* <div className="flex-1">
          <Controller
            name="active"
            control={control}
            render={({ field }) => (
              <SwitchInput
                label="Active"
                {...field}
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                error={errors.active?.message}
              />
            )}
          />
        </div> */}
      </div>
    </ReusableModal>
  );
};

export default AddOrganizationModal;