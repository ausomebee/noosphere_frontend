// src/Components/ReusableModal/ClientModal/AddClientModal.jsx
import React, {
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useState,
} from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import ReusableModal from "../../ReusableModal/ReusableModal";
import {
  setDraftField,
  resetDraft,
} from "../../../ReduxStore/features/ClientDraftSlice";
import { SelectInput, SwitchInput, TextInput } from "../../Input/Inputs";
import FileUploadArea from "../../FileUpload/FileUploadArea";
import api from "../../../api/AppointmentApi";
import api2 from "../../../api/billingAndPaymentsApi";

// ==================== SCHEMA ====================
const schema = yup.object().shape({
  firstName: yup.string().required("First Name is required"),
  lastName: yup.string().required("Last Name is required"),
  preferredName: yup.string().nullable(),
  email: yup.string().email("Invalid email").required("Email is required"),
  phone: yup
    .string()
    .matches(/^\+?[\d\s-]{10,}$/, "Invalid phone")
    .required("Phone is required"),
  DOB: yup.string().nullable(),
  gender: yup
    .string()
    .oneOf(["male", "female", "other", ""])
    .required("Gender is required"),
  primaryPayer: yup.string().nullable(), // payer ID (string)
  streetAddress: yup.string().nullable(),
  city: yup.string().nullable(),
  state: yup.string().nullable(),
  zip: yup.string().nullable(),
  country: yup.string().nullable(),
  assignToClinician: yup.array().of(yup.string()).nullable(),
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
  { value: "", label: "Select Country" },
  { value: "US", label: "United States" },
  { value: "UK", label: "United Kingdom" },
];

const usStates = [
  { value: "", label: "Select State" },
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
const AddClientModal = ({ isOpen, onClose, onSubmit, initialData = null }) => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = React.useState("Basic Information");
  const [submitting, setSubmitting] = React.useState(false);


  // Clinicians
  const [clinicians, setClinicians] = useState([]);
  const [loadingClinicians, setLoadingClinicians] = useState(false);

  // Payers
  const [payers, setPayers] = useState([]);
  const [loadingPayers, setLoadingPayers] = useState(false);

  const hasInitialized = useRef(false);

  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const token = useSelector((s) => s.authentication?.user?.token);
  const accessToken = token;
  const refreshToken = token;

  // Fetch Clinicians
  const fetchClinicians = useCallback(async () => {
    if (!tenantId || !accessToken) return;
    setLoadingClinicians(true);
    try {
      const response = await api.GetTenantStaffByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const staff = response?.data?.data || [];
      const clinicianList = staff.map((c) => ({
        value: c.id,
        label: c.fullName || "Unnamed Clinician",
      }));
      setClinicians(clinicianList);
    } catch (error) {
      console.error("Failed to fetch clinicians:", error);
    } finally {
      setLoadingClinicians(false);
    }
  }, [tenantId, accessToken, refreshToken]);

  // Fetch Payers
  const fetchPayers = useCallback(async () => {
    if (!tenantId || !accessToken) return;
    setLoadingPayers(true);
    try {
      const response = await api2.GetPayerByTenantId({
        // or GetPayersByTenantId if that's the correct name
        tenantId,
        accessToken,
        refreshToken,
      });
console.log(response)
      const payerList = (response?.data || []).map((payer) => ({
        value: payer.id,
        label: payer.payerName,
      }));
      setPayers(payerList);
    } catch (error) {
      console.error("Failed to fetch payers:", error);
    } finally {
      setLoadingPayers(false);
    }
  }, [tenantId, accessToken, refreshToken]);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchClinicians();
      fetchPayers();
    }
  }, [isOpen, fetchClinicians, fetchPayers]);

  const defaultValues = useMemo(
    () => ({
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      preferredName: initialData?.preferredName || "",
      email: initialData?.email || "",
      phone: initialData?.phoneNumber || "",
      DOB: initialData?.DOB || "",
      gender: initialData?.gender || "",
      primaryPayer: initialData?.primaryPayer || "", // assuming this is the payer ID
      streetAddress: initialData?.streetAddress || "",
      city: initialData?.city || "",
      state: initialData?.state || "",
      zip: initialData?.zipCode || "",
      country: initialData?.country || "US",
      assignToClinician: initialData?.assignToClinician || [],
      clientPortalAccess: initialData?.clientPortalAccess || false,
      caregiverName: initialData?.caregiverName || "",
      caregiverRelationship: initialData?.caregiverRelationship || "",
      caregiverPhone: initialData?.caregiverPhone || "",
      caregiverEmail: initialData?.caregiverEmail || "",
      caregiverStreetAddress: initialData?.caregiverStreetAddress || "",
      caregiverCity: initialData?.caregiverCity || "",
      caregiverState: initialData?.caregiverState || "",
      caregiverZip: initialData?.caregiverZip || "",
      caregiverCountry: initialData?.caregiverCountry || "US",
      documents: initialData?.documents || [],
    }),
    [initialData]
  );

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

  // Tabs with updated Primary Payer as Select
  const tabs = useMemo(
    () => [
      {
        name: "Basic Information",
        content: (
          <div className="space-y-6">
            <TextInput
              label="First Name *"
              placeholder="John"
              {...register("firstName")}
              error={errors.firstName?.message}
            />
            <TextInput
              label="Last Name *"
              placeholder="Doe"
              {...register("lastName")}
              error={errors.lastName?.message}
            />
            <TextInput
              label="Preferred Name"
              placeholder="Johnny"
              {...register("preferredName")}
            />

            <TextInput
              label="Email *"
              type="email"
              placeholder="john.doe@example.com"
              {...register("email")}
              error={errors.email?.message}
            />
            <TextInput
              label="Phone *"
              placeholder="+1 (555) 123-4567"
              {...register("phone")}
              error={errors.phone?.message}
            />
            <TextInput label="Date of Birth" type="date" {...register("DOB")} />

            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <SelectInput
                  label="Gender *"
                  options={genderOptions}
                  {...field}
                  error={errors.gender?.message}
                />
              )}
            />

            {/* Primary Payer - Now a Select */}
            <Controller
              name="primaryPayer"
              control={control}
              render={({ field }) => (
                <SelectInput
                  label="Primary Payer"
                  options={payers}
                  placeholder={
                    loadingPayers
                      ? "Loading payers..."
                      : payers.length === 0
                      ? "No payers found"
                      : "Select a payer"
                  }
                  disabled={loadingPayers || payers.length === 0}
                  {...field}
                />
              )}
            />

            <TextInput
              label="Street Address"
              placeholder="123 Main St"
              {...register("streetAddress")}
            />
            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="City"
                placeholder="Los Angeles"
                {...register("city")}
              />
              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <SelectInput label="State" options={usStates} {...field} />
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="ZIP Code"
                placeholder="90210"
                {...register("zip")}
              />
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <SelectInput
                    label="Country"
                    options={countryOptions}
                    {...field}
                  />
                )}
              />
            </div>

            {/* Assign to Clinicians */}
            <Controller
              name="assignToClinician"
              control={control}
              render={({ field }) => (
                <SelectInput
                  label="Assign To Clinician(s)"
                  options={clinicians}
                  isMulti={true}
                  placeholder={
                    loadingClinicians
                      ? "Loading clinicians..."
                      : clinicians.length === 0
                      ? "No clinicians found"
                      : "Select one or more clinicians"
                  }
                  disabled={loadingClinicians || clinicians.length === 0}
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
              label="Caregiver Name"
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
                  <SelectInput label="State" options={usStates} {...field} />
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
    [
      control,
      errors,
      register,
      handleFileUpload,
      documents,
      clinicians,
      loadingClinicians,
      payers,
      loadingPayers,
    ]
  );

  // Reset form on open/close
  useEffect(() => {
    if (!isOpen) {
      hasInitialized.current = false;
      setActiveTab("Basic Information");
      dispatch(resetDraft());
      return;
    }
    if (!hasInitialized.current && isOpen) {
      reset(defaultValues);
      hasInitialized.current = true;
    }
  }, [isOpen, reset, defaultValues, dispatch]);

  const handleClose = useCallback(() => {
    dispatch(resetDraft());
    onClose();
  }, [dispatch, onClose]);

  const cleanData = (data) => {
    return Object.keys(data).reduce((acc, key) => {
      const value = data[key];
      if (
        value === null ||
        value === undefined ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      ) {
        return acc;
      }
      if (typeof value === "boolean") {
        acc[key] = value;
        return acc;
      }
      if (typeof value === "object" && !Array.isArray(value)) {
        const nested = cleanData(value);
        if (Object.keys(nested).length > 0) acc[key] = nested;
        return acc;
      }
      acc[key] = value;
      return acc;
    }, {});
  };

  const onFinalSubmit = async (data) => {
    setSubmitting(true);
    try {
      const cleanedData = cleanData(data);
      if (
        cleanedData.assignToClinician &&
        Array.isArray(cleanedData.assignToClinician)
      ) {
        cleanedData.assignToClinician =
          cleanedData.assignToClinician.map(String);
      }
      await onSubmit(cleanedData);
      dispatch(resetDraft());
      handleClose();
    } catch (err) {
      console.error("Submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrimaryButtonClick = useCallback(async () => {
    if (activeTab === "Documents") {
      handleSubmit(onFinalSubmit)();
    } else {
      const fieldsToValidate =
        activeTab === "Basic Information"
          ? ["firstName", "lastName", "email", "phone", "gender"]
          : [];
      const isValid = await trigger(fieldsToValidate);
      if (isValid) {
        dispatch(setDraftField(getValues()));
        const currentIdx = tabs.findIndex((t) => t.name === activeTab);
        if (currentIdx < tabs.length - 1) {
          setActiveTab(tabs[currentIdx + 1].name);
        }
      }
    }
  }, [
    activeTab,
    handleSubmit,
    onFinalSubmit,
    trigger,
    tabs,
    getValues,
    dispatch,
  ]);

  const handleSecondaryButtonClick = useCallback(() => {
    if (activeTab === "Basic Information") {
      handleClose();
    } else {
      dispatch(setDraftField(getValues()));
      const idx = tabs.findIndex((t) => t.name === activeTab);
      if (idx > 0) setActiveTab(tabs[idx - 1].name);
    }
  }, [activeTab, handleClose, tabs, getValues, dispatch]);

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title={initialData ? "Edit Client" : "Add New Client"}
      titleIcon={
        <svg
          width="22"
          height="16"
          viewBox="0 0 22 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* SVG paths unchanged */}
        </svg>
      }
      primaryButtonText={activeTab === "Documents" ? "Save Client" : "Next"}
      secondaryButtonText={
        activeTab === "Basic Information" ? "Cancel" : "Previous"
      }
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
