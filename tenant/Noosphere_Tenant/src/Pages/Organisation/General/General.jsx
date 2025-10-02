import React, { useState, useEffect } from "react";
import DashboardLayout from "../../../Layout/TenantLayout";
import { FiEdit3 } from "react-icons/fi";
import { RxDashboard } from "react-icons/rx";
import { useSelector } from "react-redux";
import { PiListDashesBold } from "react-icons/pi";
import Button from "../../../Components/Button/Button";
import { FaPlus, FaRegTrashAlt } from "react-icons/fa";
import { MdOutlineFileOpen } from "react-icons/md";
import CustomTable from "../../../Components/Table/CustomTable";
import AddLicensesModal from "../../../Components/ReusableModal/OrganizationModal/AddLicensesModal";
import AddOrganizationModal from "../../../Components/ReusableModal/OrganizationModal/AddOrganizaionModal";
import UploadOrganizationFileModal from "../../../Components/ReusableModal/OrganizationModal/UploadOrganizationFileModal";
import DeleteModal from "../../../Components/ReusableModal/OrganizationModal/DeleteModal";
import { CgDanger } from "react-icons/cg";
import api from "../../../api/organisationApis";
import { showToast } from "../../../Helper/ShowToast";
import LoadingSpinner from "../../../Components/LoadingSpinner";

// Date formatter for MM/DD/YYYY
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    }).format(date);
  } catch {
    return "N/A";
  }
};

const General = () => {
  const tenantId = useSelector((state) => state.authentication?.user?.tenantId);
  const token = useSelector((s) => s.authentication?.user?.token);
  const accessToken = token;
  const refreshToken = token;

  /* -------------------------------------------------------------- */
  /* 1. ORGANISATION ---------------------------------------------- */
  /* -------------------------------------------------------------- */
  const [tenantData, setTenantData] = useState(null);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [loadingTenant, setLoadingTenant] = useState(false);

  /* -------------------------------------------------------------- */
  /* 2. LICENSES -------------------------------------------------- */
  /* -------------------------------------------------------------- */
  const [licenses, setLicenses] = useState([]);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseToEdit, setLicenseToEdit] = useState(null);
  const [licenseView, setLicenseView] = useState("card");
  const [loadingLicenses, setLoadingLicenses] = useState(false);

  /* -------------------------------------------------------------- */
  /* 3. FILES ----------------------------------------------------- */
  /* -------------------------------------------------------------- */
  const [files, setFiles] = useState([]);
  const [showFileModal, setShowFileModal] = useState(false);
  const [fileToEdit, setFileToEdit] = useState(null);
  const [loadingFiles, setLoadingFiles] = useState(false);

  /* -------------------------------------------------------------- */
  /* 4. DELETE ---------------------------------------------------- */
  /* -------------------------------------------------------------- */
  const [deleteCfg, setDeleteCfg] = useState({
    isOpen: false,
    title: "",
    message: "",
    icon: null,
    onConfirm: () => {},
  });

  /* -------------------------------------------------------------- */
  /* 5. USE EFFECTS FOR DATA FETCHING ----------------------------- */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    if (tenantId) {
      fetchTenantData();
      fetchLicenses();
      fetchFiles();
    }
  }, [tenantId]);

  const fetchTenantData = async () => {
    if (!tenantId) return;
    setLoadingTenant(true);
    try {
      const response = await api.GetOrganizationInformationByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      setTenantData(response.data.data);
    } catch (error) {
      showToast(
        error.message || "Failed to fetch organization information",
        "error"
      );
      console.error("Error fetching tenant data:", error);
    } finally {
      setLoadingTenant(false);
    }
  };

  const fetchLicenses = async () => {
    if (!tenantId) return;
    setLoadingLicenses(true);
    try {
      const response = await api.GetLicenseByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const normalizedLicenses = (response.data.data || []).map((license) => ({
        ...license,
        licenseName: license.licenseName || license.licenseName || "",
        licenseNumber: license.licenseNumber || license.licenseNumber || "",
        issueState: license.issueState || license.state || "",
        expiryDate: license.expiryDate
          ? new Date(license.expiryDate).toISOString().split("T")[0]
          : "",
        hasActions: true,
      }));
      setLicenses(normalizedLicenses);
    } catch (error) {
      showToast(error.message || "Failed to fetch licenses", "error");
      console.error("Error fetching licenses:", error);
    } finally {
      setLoadingLicenses(false);
    }
  };

  const fetchFiles = async () => {
    if (!tenantId) return;
    setLoadingFiles(true);
    try {
      const response = await api.GetSingleDocumentByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const fetchedFiles = Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      const updatedFiles = fetchedFiles.map((file) => ({
        ...file,
        hasActions: true,
      }));
      setFiles(updatedFiles);
    } catch (error) {
      showToast(error.message || "Failed to fetch files", "error");
      console.error("Error fetching files:", error);
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  /* ------------ handlers ------------ */
  const saveOrg = async (data) => {
    try {
      const response = await api.UpdateOrganizationInformation({
        id: tenantData?.id || undefined,
        name: data.name,
        email: data.email,
        phoneNumber: data.phone,
        website: data.website,
        practiceNPI: data.practiceNPI,
        streetAddress: data.street,
        city: data.city,
        state: data.stateProvince,
        country: data.country,
        zipCode: data.zip,
        active: data.active,
        accessToken,
        refreshToken,
      });
      setTenantData(response.data.data);
      setShowOrgModal(false);
      showToast("Organization information updated successfully", "success");
    } catch (error) {
      showToast(
        error.message || "Failed to save organization information",
        "error"
      );
      console.error("Error saving organization:", error);
      throw error;
    }
  };

  const saveLicense = async (payload) => {
    try {
      let response;
      if (payload.id) {
        response = await api.UpdateOrganizationLicense({
          ...payload,
          tenantId,
          accessToken,
          refreshToken,
        });
        setLicenses((prev) =>
          prev.map((l) =>
            l.id === payload.id
              ? {
                  ...response.data.data,
                  licenseName:
                    response.data.data.licenseName || response.data.licenseName,
                  licenseNumber:
                    response.data.data.licenseNumber ||
                    response.data.licenseNumber,
                  expiryDate: response.data.data.expiryDate
                    ? new Date(response.data.data.expiryDate)
                        .toISOString()
                        .split("T")[0]
                    : "",
                  hasActions: true,
                }
              : l
          )
        );
        showToast("License updated successfully", "success");
      } else {
        response = await api.CreateOrganizationLicense({
          ...payload,
          tenantId,
          accessToken,
          refreshToken,
        });
        setLicenses((prev) => [
          ...prev,
          {
            ...response.data.data,
            licenseName:
              response.data.data.licenseName || response.data.licenseName,
            licenseNumber:
              response.data.data.licenseNumber || response.data.licenseNumber,
            expiryDate: response.data.data.expiryDate
              ? new Date(response.data.data.expiryDate)
                  .toISOString()
                  .split("T")[0]
              : "",
            hasActions: true,
          },
        ]);
        showToast("License created successfully", "success");
      }
      setShowLicenseModal(false);
    } catch (error) {
      showToast(error.message || "Failed to save license", "error");
      console.error("Error saving license:", error);
      throw error;
    }
  };

  const saveFile = async (formData) => {
    try {
      const response = await api.CreateDocument({
        formData,
        accessToken,
        refreshToken,
      });
      setFiles((prev) => {
        const safePrev = Array.isArray(prev) ? prev : [];
        return [...safePrev, { ...response.data.data, hasActions: true }];
      });
      setShowFileModal(false);
      showToast("File uploaded successfully", "success");
    } catch (error) {
      showToast(error.message || "Failed to upload file", "error");
      console.error("Error uploading file:", error);
      throw error;
    }
  };

  const deleteLicense = async (id) => {
    try {
      await api.DeleteLicense({
        id,
        accessToken,
        refreshToken,
      });
      setLicenses((prev) => prev.filter((l) => l.id !== id));
      closeDelete();
      showToast("License deleted successfully", "success");
    } catch (error) {
      showToast(error.message || "Failed to delete license", "error");
      console.error("Error deleting license:", error);
    }
  };

  const deleteFile = async (id) => {
    try {
      await api.DeleteDocument({
        id,
        accessToken,
        refreshToken,
      });
      setFiles((prev) => prev.filter((f) => f.id !== id));
      closeDelete();
      showToast("File deleted successfully", "success");
    } catch (error) {
      showToast(error.message || "Failed to delete file", "error");
      console.error("Error deleting file:", error);
    }
  };

  const openDelete = ({ title, message, icon, onConfirm }) =>
    setDeleteCfg({ isOpen: true, title, message, icon, onConfirm });

  const closeDelete = () =>
    setDeleteCfg({
      isOpen: false,
      title: "",
      message: "",
      icon: null,
      onConfirm: () => {},
    });

  /* -------------------------------------------------------------- */
  /* render helpers                                                 */
  /* -------------------------------------------------------------- */
  const renderLicenses = () => {
    if (loadingLicenses) {
      return <LoadingSpinner />;
    }

    if (!licenses.length)
      return (
        <div className="bg-gray-200 rounded-sm w-full p-20 mb-6 mt-6">
          <div className="text-center py-8 text-gray-500">
            <IconFile className="mx-auto mb-4 text-gray-400" />
            <p className="mb-2 text-3xl font-bold text-gray-400">
              No Licenses added yet
            </p>
            <p className="text-gray-700 text-xl">
              Add your practice license details here …
            </p>
          </div>
        </div>
      );

    if (licenseView === "card")
      return (
        <div className="grid grid-cols-3 gap-10 mt-6">
          {licenses.map((l) => (
            <LicenseCard
              key={l.id}
              data={l}
              onEdit={() => {
                setLicenseToEdit(l);
                setShowLicenseModal(true);
              }}
              onDelete={() =>
                openDelete({
                  title: "Delete License",
                  message: "Are you sure you want to delete this license?",
                  icon: <CgDanger size={32} color="#D92D20" />,
                  onConfirm: () => deleteLicense(l.id),
                })
              }
            />
          ))}
        </div>
      );

    return (
      <div className="mt-6">
        <CustomTable
          data={licenses}
          columns={[
            { header: "License Name", key: "licenseName" },
            { header: "License Number", key: "licenseNumber" },
            { header: "State of Issue", key: "issueState" },
            {
              header: "Expiration",
              key: "expiryDate",
              render: (row) => formatDate(row.expiryDate),
            },
          ]}
          actions={[
            {
              type: "dropdown",
              label: "More",
              items: [
                {
                  label: "Edit",
                  onClick: (row) => {
                    setLicenseToEdit(row);
                    setShowLicenseModal(true);
                  },
                },
                {
                  label: "Delete",
                  className: "remove",
                  onClick: (row) =>
                    openDelete({
                      title: "Delete License",
                      message: "Are you sure you want to delete this license?",
                      icon: <CgDanger />,
                      onConfirm: () => deleteLicense(row.id),
                    }),
                },
              ],
            },
          ]}
          showActions
          showCheckbox={false}
          hideSearch
          hideTableActions
        />
      </div>
    );
  };

  const renderFiles = () => {
    if (loadingFiles) {
      return <LoadingSpinner />;
    }

    if (!files.length)
      return (
        <div className="bg-gray-200 rounded-sm w-full p-20 mb-6 mt-6">
          <div className="text-center py-8 text-gray-500">
            <IconFile className="mx-auto mb-4 text-gray-400" />
            <p className="mb-2 text-3xl font-bold text-gray-400">
              No Documents added
            </p>
            <p className="text-gray-700 text-xl">
              Add your practice documents here …
            </p>
          </div>
        </div>
      );

    return (
      <div className="mt-6">
        <CustomTable
          data={files}
          columns={[
            { header: "File Name", key: "documentName" },
            {
              header: "Date Created",
              key: "createdAt",
              render: (row) => formatDate(row.createdAt),
            },
            { header: "Uploaded By", key: "uploadedBy" },
          ]}
          actions={[
            {
              type: "dropdown",
              label: "More",
              items: [
                {
                  label: "View",
                  onClick: (row) => window.open(row.documentUrl, "_blank"),
                },
                {
                  label: "Download",
                  onClick: (row) => {
                    const a = document.createElement("a");
                    a.href = row.documentUrl;
                    a.download = row.documentName;
                    a.click();
                  },
                },
                {
                  label: "Delete",
                  className: "remove",
                  onClick: (row) =>
                    openDelete({
                      title: "Delete File",
                      message: "Are you sure you want to delete this file?",
                      icon: <CgDanger size={32} color="#D92D20" />,
                      onConfirm: () => deleteFile(row.id),
                    }),
                },
              ],
            },
          ]}
          showActions
          showCheckbox={false}
          hideSearch
          itemsPerPage={10}
          hideTableActions
        />
      </div>
    );
  };

  /* -------------------------------------------------------------- */
  /* UI                                                             */
  /* -------------------------------------------------------------- */
  return (
    <DashboardLayout>
      <div className="p-20">
        <h1 className="appointment-sched-title mb-4">General</h1>

        {/* ---------- 1. Organisation ---------- */}
        <h2 className="font-bold text-lg text-gray-700-em mb-4">
          Organisation Information
        </h2>
        <div className="flex justify-between bg-gray-200 rounded-lg w-full p-20 mb-6">
          {loadingTenant ? (
            <div className="flex justify-center items-center w-full py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              <OrgGrid data={tenantData || {}} />
              <div>
                <div
                  className="bg-white-bg p-5 rounded-md self-start cursor-pointer"
                  onClick={() => {
                    setShowOrgModal(true);
                  }}
                >
                  <FiEdit3 size={32} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* ---------- 2. Licenses ---------- */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-gray-700-em">Licenses</h2>
            <div className="flex items-center gap-20">
              <div className="flex gap-10">
                <div className="p-3 bg-gray-200 rounded-md">
                  <RxDashboard
                    className="cursor-pointer"
                    size={24}
                    onClick={() => setLicenseView("card")}
                    color={licenseView === "card" ? "#004ABA" : "#000"}
                  />
                </div>
                <div className="p-3 bg-gray-200 rounded-md">
                  <PiListDashesBold
                    className="cursor-pointer"
                    size={24}
                    onClick={() => setLicenseView("list")}
                    color={licenseView === "list" ? "#004ABA" : "#000"}
                  />
                </div>
              </div>
              <Button
                label="New"
                variant="secondary"
                icon={<FaPlus />}
                onClick={() => {
                  setLicenseToEdit(null);
                  setShowLicenseModal(true);
                }}
              />
            </div>
          </div>
          {renderLicenses()}
        </div>

        {/* ---------- 3. Files ---------- */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-gray-700-em">
              Business files and documents
            </h2>
            <Button
              label="New upload"
              variant="secondary"
              icon={<FaPlus />}
              onClick={() => {
                setFileToEdit(null);
                setShowFileModal(true);
              }}
            />
          </div>
          {renderFiles()}
        </div>
      </div>

      {/* ---------- Modals ---------- */}
      <AddOrganizationModal
        isOpen={showOrgModal}
        onClose={() => setShowOrgModal(false)}
        onSave={saveOrg}
        initialValues={{
          name: tenantData?.companyName || "",
          email: tenantData?.email || "",
          phone: tenantData?.phoneNumber || "",
          website: tenantData?.website || "",
          practiceNPI: tenantData?.practiceNPI || "",
          street: tenantData?.streetAddress || "",
          city: tenantData?.location?.city || "",
          stateProvince: tenantData?.location?.state || "",
          country: tenantData?.country || "",
          zip: tenantData?.zipCode || "",
          active: tenantData?.active !== undefined ? tenantData.active : true,
        }}
      />
      <AddLicensesModal
        isOpen={showLicenseModal}
        onClose={() => setShowLicenseModal(false)}
        onSave={saveLicense}
        initialValues={licenseToEdit}
      />
      <UploadOrganizationFileModal
        isOpen={showFileModal}
        onClose={() => setShowFileModal(false)}
        onSave={saveFile}
        tenantId={tenantId}
        initialValues={fileToEdit}
      />
      <DeleteModal {...deleteCfg} onClose={closeDelete} />
    </DashboardLayout>
  );
};

/* ------------------------------------------------------------------ */
/* small components                                                   */
/* ------------------------------------------------------------------ */
const IconFile = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="80"
    height="80"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-white-light2 mx-auto"
    {...props}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const OrgGrid = ({ data }) => (
  <div className="grid grid-cols-4 items-start w-full">
    <div className="items-center flex justify-center h-full">
      <div className="organisation-user-avatar ">
        {data.companyName
          ? data.companyName
              .split(" ")
              .map((word) => word.charAt(0))
              .join("")
              .slice(0, 2)
          : "NA"}
      </div>
    </div>
    <div className="flex flex-col gap-2">
      <Field label="Name" value={data.companyName || "--"} />
      <Field label="Website" value={data.website || "--"} isLink />
      <Field label="State/Province" value={data.location?.state || "--"} />
    </div>
    <div className="flex flex-col gap-2">
      <Field label="Phone" value={data.phoneNumber || "--"} />
      <Field label="Street Address" value={data.streetAddress || "--"} />
      <Field
        label="Country/ZIP"
        value={`${data.location?.country || "--"} / ${data.zipCode || "--"}`}
      />
    </div>
    <div className="flex flex-col gap-2">
      <Field label="Email" value={data.email || "--"} />
      <Field label="City" value={data.location?.city || "--"} />
      <Field label="Practice NPI" value={data.practiceNPI || "--"} />
    </div>
  </div>
);

const Field = ({ label, value, isLink }) => (
  <div className="items-center gap-4">
    <p className="text-sm text-gray-400">{label}</p>
    {isLink && value !== "--" ? (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-blue-600"
      >
        {value}
      </a>
    ) : (
      <p className="font-semibold text-gray-600">{value}</p>
    )}
  </div>
);

const LicenseCard = ({ data, onEdit, onDelete }) => (
  <div className="border rounded-md border-gray-200 bg-white p-20">
    <div className="flex justify-between">
      <div className="flex gap-6">
        <MdOutlineFileOpen size={24} color="#004ABA" />
        <p className="font-semibold text-blue-primary">
          {(data.licenseName || "N/A").length > 20
            ? (data.licenseName || "N/A").slice(0, 10) + "..."
            : data.licenseName || "N/A"}
        </p>
      </div>
      <div className="flex gap-6">
        <div onClick={onEdit} className="cursor-pointer">
          <FiEdit3 size={24} color="#5C6167" />
        </div>
        <div onClick={onDelete} className="cursor-pointer">
          <FaRegTrashAlt size={20} color="#5C6167" />
        </div>
      </div>
    </div>
    <div className="flex flex-col gap-3 mt-4">
      <Row label="License Number" value={data.licenseNumber} />
      <Row label="Expiration Date" value={formatDate(data.expiryDate)} />
      <Row label="State" value={data.issueState} />
    </div>
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex items-center gap-2">
    <p className="text-sm text-gray-500 font-medium w-32">{label}</p>
    <p className="font-semibold text-gray-600">{value || "N/A"}</p>
  </div>
);

export default General;
