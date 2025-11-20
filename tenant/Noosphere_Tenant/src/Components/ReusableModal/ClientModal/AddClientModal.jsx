// src/Components/ReusableModal/ClientModal/AddClientModal.jsx
import React, { useEffect, useRef, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import ReusableModal from "../../ReusableModal/ReusableModal";
import {
  setDraftField,
  resetDraft,
} from "../../../ReduxStore/features/ClientDraftSlice";
import {
  SelectInput,
  SwitchInput,
  TextInput,
} from "../../Input/Inputs";
import FileUploadArea from "../../FileUpload/FileUploadArea";

// ==================== SCHEMA ====================
const schema = yup.object().shape({
  firstName: yup.string().required("First Name is required"),
  lastName: yup.string().required("Last Name is required"),
  preferredName: yup.string().nullable(),
  email: yup.string().email("Invalid email").required("Email is required"),
  phone: yup.string().matches(/^\+?[\d\s-]{10,}$/, "Invalid phone").required("Phone is required"),
  DOB: yup.date().required("Date of Birth is required").max(new Date(), "Cannot be in the future"),
  gender: yup.string().oneOf(["male", "female", "other"]).required("Gender is required"),
  primaryPayer: yup.string().required("Primary Payer is required"),
  streetAddress: yup.string().required("Street Address is required"),
  city: yup.string().required("City is required"),
  state: yup.string().required("State is required"),
  zip: yup.string().matches(/^\d{5}(-\d{4})?$/, "Invalid ZIP").required("ZIP is required"),
  country: yup.string().required("Country is required"),
  assignToClinician: yup.string().optional(),
  clientPortalAccess: yup.boolean().optional(),
  caregiverName: yup.string().nullable(),
  caregiverRelationship: yup.string().nullable(),
  caregiverPhone: yup.string().nullable(),
  caregiverEmail: yup.string().email("Invalid email").nullable(),
  caregiverStreetAddress: yup.string().nullable(),
  caregiverCity: yup.string().nullable(),
  caregiverState: yup.string().nullable(),
  caregiverZip: yup.string().nullable(),
  caregiverCountry: yup.string().nullable(),
  documents: yup.array().of(yup.object()).nullable(),
});

// ==================== OPTIONS ====================
const genderOptions = [
  { value: "", label: "Select Gender" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Prefer not to say" },
];

const countryOptions = [
  { value: "US", label: "United States" },
  { value: "UK", label: "United Kingdom" },
];

const usStates = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

const clinicianOptions = [
  { value: "", label: "Select Clinician" },
  { value: "1", label: "Dr. Sarah Johnson" },
  { value: "2", label: "Dr. Michael Chen" },
  { value: "3", label: "Dr. Emily Rodriguez" },
];

const AddClientModal = ({ isOpen, onClose, onSubmit, initialData = null }) => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = React.useState("Basic Information");
  const [submitting, setSubmitting] = React.useState(false);
  const hasInitialized = useRef(false);

  const defaultValues = useMemo(() => ({
    firstName: "",
    lastName: "",
    preferredName: "",
    email: "",
    phone: "",
    DOB: "",
    gender: "",
    primaryPayer: "",
    streetAddress: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
    assignToClinician: "",
    clientPortalAccess: false,
    caregiverName: "",
    caregiverRelationship: "",
    caregiverPhone: "",
    caregiverEmail: "",
    caregiverStreetAddress: "",
    caregiverCity: "",
    caregiverState: "",
    caregiverZip: "",
    caregiverCountry: "US",
    documents: [],
  }), []);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
    trigger,
    getValues,
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues,
  });

  const documents = watch("documents") || [];

  const handleFileUpload = React.useCallback(
    (files) => {
      setValue("documents", [...documents, ...files], { shouldDirty: true });
    },
    [documents, setValue]
  );

  // Define tabs first
  const tabs = useMemo(
    () => [
      {
        name: "Basic Information",
        content: (
          <div className="space-y-6">
            <TextInput 
              label="First Name" 
              placeholder="John" 
              {...register("firstName")} 
              error={errors.firstName?.message} 
            />
            <TextInput 
              label="Last Name" 
              placeholder="Doe" 
              {...register("lastName")} 
              error={errors.lastName?.message} 
            />
            <TextInput 
              label="Preferred Name (Optional)" 
              placeholder="Johnny" 
              {...register("preferredName")} 
            />
            <TextInput 
              label="Email" 
              type="email" 
              placeholder="john.doe@example.com" 
              {...register("email")} 
              error={errors.email?.message} 
            />
            <TextInput 
              label="Phone" 
              placeholder="+1 (555) 123-4567" 
              {...register("phone")} 
              error={errors.phone?.message} 
            />
            <TextInput 
              label="Date of Birth" 
              type="date" 
              {...register("DOB")} 
              error={errors.DOB?.message} 
            />

            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <SelectInput 
                  label="Gender" 
                  options={genderOptions} 
                  {...field} 
                  error={errors.gender?.message} 
                />
              )}
            />

            <TextInput 
              label="Primary Payer" 
              placeholder="Medi-Cal, Blue Cross, etc." 
              {...register("primaryPayer")} 
              error={errors.primaryPayer?.message} 
            />
            <TextInput 
              label="Street Address" 
              placeholder="123 Main St" 
              {...register("streetAddress")} 
              error={errors.streetAddress?.message} 
            />

            <div className="grid grid-cols-2 gap-4">
              <TextInput 
                label="City" 
                placeholder="Los Angeles" 
                {...register("city")} 
                error={errors.city?.message} 
              />
              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <SelectInput 
                    label="State" 
                    options={usStates} 
                    {...field} 
                    error={errors.state?.message} 
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TextInput 
                label="ZIP Code" 
                placeholder="90210" 
                {...register("zip")} 
                error={errors.zip?.message} 
              />
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <SelectInput 
                    label="Country" 
                    options={countryOptions} 
                    {...field} 
                    error={errors.country?.message} 
                  />
                )}
              />
            </div>

            <Controller
              name="assignToClinician"
              control={control}
              render={({ field }) => (
                <SelectInput 
                  label="Assign To Clinician" 
                  options={clinicianOptions} 
                  {...field} 
                />
              )}
            />

            <SwitchInput 
              {...register("clientPortalAccess")} 
              label="Allow Client Portal Access" 
            />
          </div>
        ),
      },
      {
        name: "Other Information",
        content: (
          <div className="space-y-6">
            <TextInput 
              label="Caregiver Name (Optional)" 
              placeholder="Jane Doe" 
              {...register("caregiverName")} 
            />
            <TextInput 
              label="Relationship" 
              placeholder="Mother, Guardian, Spouse" 
              {...register("caregiverRelationship")} 
            />
            <TextInput 
              label="Caregiver Phone" 
              placeholder="+1 (555) 987-6543" 
              {...register("caregiverPhone")} 
            />
            <TextInput 
              label="Caregiver Email" 
              type="email" 
              placeholder="jane@example.com" 
              {...register("caregiverEmail")} 
              error={errors.caregiverEmail?.message} 
            />
            <TextInput 
              label="Caregiver Address" 
              placeholder="456 Oak Ave" 
              {...register("caregiverStreetAddress")} 
            />
            <div className="grid grid-cols-2 gap-4">
              <TextInput 
                label="City" 
                placeholder="San Francisco" 
                {...register("caregiverCity")} 
              />
            
              <Controller
                name="caregiverState"
                control={control}
                render={({ field }) => (
                  <SelectInput 
                    label="State" 
                    options={usStates} 
                    {...field} 
                    error={errors.caregiverState?.message} 
                  />
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextInput 
                label="ZIP" 
                placeholder="94105" 
                {...register("caregiverZip")} 
              />
             
              <Controller
                name="caregiverCountry"
                control={control}
                render={({ field }) => (
                  <SelectInput 
                    label="Country" 
                    options={countryOptions} 
                    {...field} 
                    error={errors.caregiverCountry?.message} 
                  />
                )}
              />
            </div>
          </div>
        ),
      },
      {
        name: "Documents",
        content: (
          <FileUploadArea
            onUploadComplete={handleFileUpload}
            initialFiles={documents}
            maxSizeMB={50}
            hint="Drop files here or click to upload (PDF, DOCX, images)"
          />
        ),
      },
    ],
    [control, errors, register, handleFileUpload, documents]
  );

  // === SIMPLEST INITIALIZATION - NO DEPENDENCIES THAT CHANGE ===
  useEffect(() => {
    if (!isOpen) {
      hasInitialized.current = false;
      setActiveTab("Basic Information");
      dispatch(resetDraft());
      return;
    }

    if (!hasInitialized.current && isOpen) {
      reset(initialData || defaultValues);
      hasInitialized.current = true;
    }
  }, [isOpen]); // Only depend on isOpen

  const handleClose = useCallback(() => {
    dispatch(resetDraft());
    onClose();
  }, [dispatch, onClose]);

  const onFinalSubmit = async (data) => {
    setSubmitting(true);
    try {
      await onSubmit(data);
      dispatch(resetDraft());
      handleClose();
    } catch (err) {
      console.error("Submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Callback functions
  const handlePrimaryButtonClick = useCallback(async () => {
    if (activeTab === "Documents") {
      handleSubmit(onFinalSubmit)();
    } else {
      const isValid = await trigger();
      if (isValid) {
        // Save draft before next tab
        const currentValues = getValues();
        dispatch(setDraftField(currentValues));
        
        const currentIdx = tabs.findIndex((t) => t.name === activeTab);
        if (currentIdx < tabs.length - 1) {
          setActiveTab(tabs[currentIdx + 1].name);
        }
      }
    }
  }, [activeTab, handleSubmit, onFinalSubmit, trigger, tabs, getValues, dispatch]);

  const handleSecondaryButtonClick = useCallback(() => {
    if (activeTab === "Basic Information") {
      handleClose();
    } else {
      // Save draft before previous tab
      const currentValues = getValues();
      dispatch(setDraftField(currentValues));
      
      const idx = tabs.findIndex((t) => t.name === activeTab);
      if (idx > 0) {
        setActiveTab(tabs[idx - 1].name);
      }
    }
  }, [activeTab, handleClose, tabs, getValues, dispatch]);

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title={initialData ? "Edit Client" : "Add New Client"}
      subTitle={initialData ? "Update client details" : "Enter client information"}
      primaryButtonText={activeTab === "Documents" ? "Save Client" : "Next"}
      secondaryButtonText={activeTab === "Basic Information" ? "Cancel" : "Previous"}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onPrimaryButtonClick={handlePrimaryButtonClick}
      onSecondaryButtonClick={handleSecondaryButtonClick}
      size="lg"
      primaryButtonLoading={submitting}
    />
  );
};

export default React.memo(AddClientModal);