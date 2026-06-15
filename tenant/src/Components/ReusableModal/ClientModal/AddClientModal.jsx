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
import { useDispatch } from "react-redux";
import useAuth from "../../../hooks/useAuth";
import ReusableModal from "../../ReusableModal/ReusableModal";
import {
  setDraftField,
  resetDraft,
} from "../../../ReduxStore/features/clientDraftSlice";
import { SelectInput, SwitchInput, TextInput } from "../../Input/Inputs";
import FileUploadArea from "../../FileUpload/FileUploadArea";
import api from "../../../api/AppointmentApi";
import api2 from "../../../api/billingAndPaymentsApi";
import { showToast } from "../../../Helper/ShowToast";
import { genderOptions, countryOptions, stateOptions as usStates } from "../../../Data/selectOptions";
import { formatDateForInput } from "../../../Helper/Formatters";
import useReduxFormDraft from "../../../hooks/useReduxFormDraft";

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
  primaryPayer: yup.string().nullable(),
  streetAddress: yup.string().nullable(),
  city: yup.string().nullable(),
  state: yup.string().nullable(),
  zipCode: yup.string().nullable(),
  country: yup.string().nullable(),
  assignToClinician: yup
    .array()
    .of(yup.string().uuid().required())
    .nullable()
    .default([]),
  clientPortalAccess: yup.boolean().optional(),
  caregiverName: yup.string().nullable(),
  caregiverRelationship: yup.string().nullable(),
  caregiverPhone: yup.string().nullable(),
  caregiverEmail: yup.string().email("Invalid email").nullable(),
  caregiverStreetAddress: yup.string().nullable(),
  caregiverCity: yup.string().nullable(),
  caregiverState: yup.string().nullable(),
  caregiverzipCode: yup.string().nullable(),
  caregiverCountry: yup.string().nullable(),

  documentName: yup.string().when("hasDocument", {
    is: true,
    then: (s) => s.required("Document name is required").min(2).max(50),
    otherwise: (s) => s.nullable(),
  }),
  hasDocument: yup.boolean().default(false),
});


const AddClientModal = ({ isOpen, onClose, onSubmit, initialData = null }) => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("Basic Information");
  const [submitting, setSubmitting] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState(null); // This holds the file

  const [clinicians, setClinicians] = useState([]);
  const [loadingClinicians, setLoadingClinicians] = useState(false);
  const [payers, setPayers] = useState([]);
  const [loadingPayers, setLoadingPayers] = useState(false);

  const hasInitialized = useRef(false);
  const { tenantId, accessToken, refreshToken } = useAuth();

  // Fetch Clinicians & Payers
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
      setClinicians(
        staff.map((c) => ({ value: c.id, label: c.fullName || "Unnamed" })),
      );
    } catch (err) {
      console.error("Failed to load clinicians:", err);
      showToast("Failed to load clinicians", "error");
    } finally {
      setLoadingClinicians(false);
    }
  }, [tenantId, accessToken, refreshToken]);

  const fetchPayers = useCallback(async () => {
    if (!tenantId || !accessToken) return;
    setLoadingPayers(true);
    try {
      const response = await api2.GetPayerByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const payerList = (response?.data || []).map((p) => ({
        value: p.id,
        label: p.payerName,
      }));
      setPayers(payerList);
    } catch (err) {
      console.error("Failed to load payers:", err);
      showToast("Failed to load payers", "error");
    } finally {
      setLoadingPayers(false);
    }
  }, [tenantId, accessToken, refreshToken]);

  useEffect(() => {
    if (isOpen) {
      fetchClinicians();
      fetchPayers();
    }
  }, [isOpen, fetchClinicians, fetchPayers]);

  const defaultValues = useMemo(() => {
    const docs = initialData?.client?.documents?.[0];
    const hasDoc = !!docs?.documentDetails?.fileUrl;

    return {
      firstName: initialData?.client?.firstName || "",
      lastName: initialData?.client?.lastName || "",
      preferredName: initialData?.client?.preferredName || "",
      email: initialData?.client?.email || "",
      phone: initialData?.client?.phoneNumber || "",
      DOB: formatDateForInput(initialData?.client?.DOB),
      gender: initialData?.client?.gender || "",
      primaryPayer: initialData?.client?.primaryPayer || "",
      streetAddress: initialData?.client?.streetAddress || "",
      city: initialData?.client?.city || "",
      state: initialData?.client?.state || "",
      zipCode: initialData?.client?.zipCodeCode || "",
      country: initialData?.client?.country || "US",
      assignToClinician: initialData?.clinicians?.map((c) => c.id) || [],
      clientPortalAccess: initialData?.dbAccess ?? false,
      caregiverName: initialData?.client?.caregiverName || "",
      caregiverRelationship: initialData?.client?.caregiverRelationship || "",
      caregiverPhone: initialData?.client?.caregiverPhone || "",
      caregiverEmail: initialData?.client?.caregiverEmail || "",
      caregiverStreetAddress: initialData?.client?.caregiverStreetAddress || "",
      caregiverCity: initialData?.client?.caregiverCity || "",
      caregiverState: initialData?.client?.caregiverState || "",
      caregiverzipCode: initialData?.client?.caregiverzipCode || "",
      caregiverCountry: initialData?.client?.caregiverCountry || "US",

      documentName: hasDoc ? docs.name : "",
      hasDocument: hasDoc,
    };
  }, [initialData]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    getValues,
    trigger,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues,
  });

  const clearDraft = useReduxFormDraft("add-client", { watch, reset, isOpen, exclude: [] });

  const documentName = watch("documentName");

  const handleFileUpload = useCallback(
    (uploadedFiles) => {
      const file = uploadedFiles[0]; // Safe because maxFiles={1}
      if (!file) return;

      const fileObj = {
        name: file.filename,
        fileUrl: file.url,
        fileType:
          file.url.split(".").pop() === "pdf"
            ? "application/pdf"
            : "image/jpeg",
      };

      setUploadedDocument(fileObj);
      setValue("hasDocument", true, { shouldValidate: true });

      // Auto-fill document name if empty
      if (!getValues("documentName")) {
        const cleanName = file.filename
          .split(".")
          .slice(0, -1)
          .join(".")
          .replace(/[_-]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        setValue("documentName", cleanName);
      }
    },
    [setValue, getValues],
  );

  const tabs = useMemo(
    () => [
      {
        name: "Basic Information",
        content: (
          <div className="space-y-6">
            <TextInput
              label="First Name *"
              {...register("firstName")}
              error={errors.firstName?.message}
            />
            <TextInput
              label="Last Name *"
              {...register("lastName")}
              error={errors.lastName?.message}
            />

            <TextInput label="Preferred Name" {...register("preferredName")} />
            <TextInput
              label="Email *"
              type="email"
              {...register("email")}
              error={errors.email?.message}
            />
            <TextInput
              label="Phone *"
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

            <Controller
              name="primaryPayer"
              control={control}
              render={({ field }) => (
                <SelectInput
                  label="Primary Payer"
                  options={payers}
                  placeholder={loadingPayers ? "Loading..." : "Select payer"}
                  disabled={loadingPayers}
                  {...field}
                />
              )}
            />

            <TextInput label="Street Address" {...register("streetAddress")} />
            <div className="grid grid-cols-2 gap-4">
              <TextInput label="City" {...register("city")} />
              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <SelectInput label="State" options={usStates} {...field} />
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextInput label="zipCode Code" {...register("zipCode")} />
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

            <Controller
              name="assignToClinician"
              control={control}
              render={({ field }) => (
                <SelectInput
                  label="Assign To Clinician(s)"
                  options={clinicians}
                  isMulti
                  placeholder={
                    loadingClinicians ? "Loading..." : "Select clinicians"
                  }
                  disabled={loadingClinicians}
                  {...field}
                />
              )}
            />

            <Controller
              name="clientPortalAccess"
              control={control}
              render={({ field }) => (
                <SwitchInput
                  {...field}
                  label="Allow Client Portal Access"
                  checked={field.value}
                />
              )}
            />
          </div>
        ),
      },
      {
        name: "Other Information",
        content: (
          <div className="space-y-6">
            {/* Caregiver fields same as before */}
            <TextInput label="Caregiver Name" {...register("caregiverName")} />
            <TextInput
              label="Relationship"
              {...register("caregiverRelationship")}
            />
            <TextInput
              label="Caregiver Phone"
              {...register("caregiverPhone")}
            />
            <TextInput
              label="Caregiver Email"
              type="email"
              {...register("caregiverEmail")}
              error={errors.caregiverEmail?.message}
            />
            <TextInput
              label="Caregiver Address"
              {...register("caregiverStreetAddress")}
            />
            <div className="grid grid-cols-2 gap-4">
              <TextInput label="City" {...register("caregiverCity")} />
              <Controller
                name="caregiverState"
                control={control}
                render={({ field }) => (
                  <SelectInput label="State" options={usStates} {...field} />
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextInput label="zipCode" {...register("caregiverzipCode")} />
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
          <div className="space-y-6">
            <h4 className="text-lg font-semibold mb-4 text-center">
              Upload Document
            </h4>

            <TextInput
              label="Document Name *"
              placeholder="e.g., National ID, Passport, Insurance Card"
              {...register("documentName")}
              error={errors.documentName?.message}
            />

            <FileUploadArea
              onUploadComplete={handleFileUpload}
              initialFiles={
                initialData?.client?.documents?.[0]
                  ? [
                      {
                        filename:
                          initialData.client.documents[0].name || "Document",
                        url: initialData.client.documents[0].documentDetails
                          .fileUrl,
                      },
                    ]
                  : uploadedDocument
                    ? [
                        {
                          filename: uploadedDocument.name,
                          url: uploadedDocument.fileUrl,
                        },
                      ]
                    : []
              }
              maxFiles={1}
              maxSizeMB={10}
              hint="PDF, PNG, JPG — Max 10MB (ID, Passport, Insurance Card)"
            />
          </div>
        ),
      },
    ],
    [
      clinicians,
      loadingClinicians,
      payers,
      loadingPayers,
      handleFileUpload,
      control,
      uploadedDocument,
      initialData,
      errors,
      register,
    ],
  );

  useEffect(() => {
    if (!isOpen) {
      hasInitialized.current = false;
      setActiveTab("Basic Information");
      dispatch(resetDraft());
      return;
    }
    if (isOpen && !hasInitialized.current) {
      reset(defaultValues);
      hasInitialized.current = true;
    }
  }, [isOpen, reset, defaultValues, dispatch]);

  // const cleanData = (data) => {
  //   return Object.fromEntries(
  //     Object.entries(data).filter(
  //       ([_, v]) => v != null && v !== "" && (!Array.isArray(v) || v.length > 0)
  //     )
  //   );
  // };

  const onValidationError = (errors) => {
    const firstError = Object.values(errors)[0];
    showToast(firstError?.message || "Please fill in all required fields", "error");
  };

  const onFinalSubmit = async (data) => {
    setSubmitting(true);
    try {
      const submitData = { ...data };

      // Transform assignToClinician (array of strings) → assignToClinicians (array of {id})
      submitData.assignToClinicians = (data.assignToClinician || []).map(
        (id) => ({
          id,
        }),
      );

      // Remove the temporary form field
      delete submitData.assignToClinician;

      // Handle document upload
      if (uploadedDocument && data.documentName?.trim()) {
        submitData.documents = [
          {
            name: data.documentName.trim(),
            documentDetails: {
              fileUrl: uploadedDocument.fileUrl,
              fileType: uploadedDocument.fileType,
              uploadedAt: new Date().toISOString(),
            },
          },
        ];
      } else {
        submitData.documents = [];
      }

      delete submitData.documentName;
      delete submitData.hasDocument;

      // Remove unused fields
      const cleaned = Object.fromEntries(
        Object.entries(submitData).filter(
          ([_, v]) =>
            v != null && v !== "" && (!Array.isArray(v) || v.length > 0),
        ),
      );

      await onSubmit(cleaned);

      dispatch(resetDraft());
      clearDraft();
      onClose();
    } catch (err) {
      console.error("Submit error:", err);
      showToast("Failed to save client", "error");
    } finally {
      setSubmitting(false);
    }
  };
  const handlePrimaryButtonClick = async () => {
    if (activeTab === "Documents") {
      const valid = await trigger();
      if (valid) {
        handleSubmit(onFinalSubmit, onValidationError)();
      } else {
        showToast("Please fill in all required fields before proceeding", "error");
      }
    } else {
      const isValid = await trigger();
      if (isValid) {
        dispatch(setDraftField(getValues()));
        const idx = tabs.findIndex((t) => t.name === activeTab);
        if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1].name);
      } else {
        showToast("Please fill in all required fields before proceeding", "error");
      }
    }
  };

  const handleSecondaryButtonClick = () => {
    if (activeTab === "Basic Information") onClose();
    else {
      const idx = tabs.findIndex((t) => t.name === activeTab);
      if (idx > 0) setActiveTab(tabs[idx - 1].name);
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Client" : "Add New Client"}
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
