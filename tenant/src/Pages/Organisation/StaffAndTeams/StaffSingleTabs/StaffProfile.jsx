import React from "react";
import usePermissions from "../../../../hooks/usePermissions";
import useDocumentViewer from "../../../../hooks/useDocumentViewer";
import { FaPlus, FaRegTrashAlt } from "react-icons/fa";
import { FiEdit3, FiRefreshCw } from "react-icons/fi";
import { RxDashboard } from "react-icons/rx";
import { PiListDashesBold } from "react-icons/pi";
import Button from "../../../../Components/Button/Button";
import CustomTable from "../../../../Components/Table/CustomTable";
import { CgDanger } from "react-icons/cg";
import { MdOutlineFileOpen } from "react-icons/md";
import "../../Organisation.css";

const Profile = ({
  staff,
  licenses,
  files,
  licenseView,
  setLicenseView,
  setShowLicenseModal,
  setShowFileModal,
  setLicenseToEdit,
  setFileToEdit,
  openDelete,
  deleteLicense,
  deleteFile,
  openBasicInfoModal, // New prop for opening Basic Info modal
  onResetStaffLogin,
}) => {
  const { hasPermission } = usePermissions();
  const { openDocument, downloadDocument } = useDocumentViewer();
  const renderLicenses = () => {
    if (!licenses.length) {
      return (
        <div className="bg-[#f7f7f7] rounded-lg w-full p-6 mb-6 mt-6">
          <div className="text-center py-8 text-gray-500">
            <IconFile className="mx-auto mb-4 text-gray-400" />
            <p className="mb-2 text-3xl font-bold text-gray-400">
              No licenses added yet
            </p>
            <p className="text-gray-700 text-xl">
              Add this staff member’s license details here, and we’ll track
              renewals and expiration dates for you
            </p>
          </div>
        </div>
      );
    }

    if (licenseView === "card") {
      return (
        <div className="org-license-grid">
          {licenses.map((l) => (
            <LicenseCard
              key={l.id}
              data={l}
              onEdit={hasPermission("add_staff_license") ? () => {
                setLicenseToEdit(l);
                setShowLicenseModal(true);
              } : null}
              onDelete={hasPermission("delete_staff_license") ? () =>
                openDelete({
                  title: "Delete License",
                  message: "Are you sure you want to delete this license?",
                  icon: <CgDanger size={32} color="#D92D20" />,
                  onConfirm: () => deleteLicense(l.id),
                }) : null}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="mt-6">
        <CustomTable
          data={licenses}
          columns={[
            { header: "License Name", key: "licenseName" },
            { header: "License Number", key: "licenseNumber" },
            { header: "State of Issue", key: "state" },
            { header: "Expiration", key: "expirationDate" },
          ]}
          actions={[
            {
              type: "dropdown",
              label: "More",
              items: [
                hasPermission("add_staff_license") && {
                  label: "Edit",
                  onClick: (row) => {
                    setLicenseToEdit(row);
                    setShowLicenseModal(true);
                  },
                },
                hasPermission("delete_staff_license") && {
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
              ].filter(Boolean),
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
    if (!files.length) {
      return (
        <div className="bg-[#f7f7f7] rounded-lg w-full p-6 mb-6 mt-6">
          <div className="text-center py-8 text-gray-500">
            <IconFile className="mx-auto mb-4 text-gray-400" />
            <p className="mb-2 text-3xl font-bold text-gray-400">
              No documents added
            </p>
            <p className="text-gray-700 text-xl">
              Add this staff member’s documents here, and keep them organized and
              easily accessible.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-6">
        <CustomTable
          data={files}
          columns={[
            { header: "File Name", key: "documentName" },
            { header: "Date Created", key: "date" },
          ]}
          actions={[
            {
              type: "dropdown",
              label: "More",
              items: [
                hasPermission("view_staff_document") && {
                  label: "View",
                  onClick: (row) => {
                    if (row.documentsUrl?.url) {
                      openDocument(row.documentsUrl.url, row.documentName || "Document");
                    }
                  },
                },
                hasPermission("view_staff_document") && {
                  label: "Download",
                  onClick: (row) => {
                    if (row.documentsUrl?.url) {
                      downloadDocument(row.documentsUrl.url, row.documentName || row.documentsUrl.filename || "document");
                    }
                  },
                },
                hasPermission("upload_staff_document") && {
                  label: "Edit",
                  onClick: (row) => {
                    setFileToEdit(row);
                    setShowFileModal(true);
                  },
                },
                hasPermission("delete_staff_document") && {
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
              ].filter(Boolean),
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

  return (
    <>
      <h2 className="font-bold text-lg text-gray-700-em mb-4 mt-6">
        Basic Information
      </h2>
      <div className="org-info-card staff-info-card">
        <div className="staff-info-card-main">
          <OrgGrid data={staff} />
          {hasPermission("edit_staff_basic_information") && (
            <div>
              <div
                className="bg-white-bg p-5 rounded-md self-start cursor-pointer"
                onClick={openBasicInfoModal}
              >
                <FiEdit3 size={32} />
              </div>
            </div>
          )}
        </div>
        {onResetStaffLogin && (
          <button
            type="button"
            className="staff-reset-login"
            onClick={() =>
              openDelete({
                title: "Reset staff login",
                message:
                  "The staff will need to set up a new two-factor authentication before they log in.",
                icon: <CgDanger size={32} color="#D92D20" />,
                confirmLabel: "Reset login",
                onConfirm: onResetStaffLogin,
              })
            }
          >
            Reset staff login
            <FiRefreshCw size={16} />
          </button>
        )}
      </div>
      {hasPermission("view_staff_licenses_list") && (
      <div className="org-section">
        <div className="org-section-header">
          <h2 className="font-bold text-lg text-gray-700-em">Staff Licenses</h2>
          <div className="org-section-actions">
            <div className="org-view-toggle">
              <RxDashboard
                className="cursor-pointer"
                size={24}
                onClick={() => setLicenseView("card")}
                color={licenseView === "card" ? "#004ABA" : "#000"}
              />
              <PiListDashesBold
                className="cursor-pointer"
                size={24}
                onClick={() => setLicenseView("list")}
                color={licenseView === "list" ? "#004ABA" : "#000"}
              />
            </div>
            {hasPermission("add_staff_license") && (
              <Button
                label="New"
                variant="secondary"
                icon={<FaPlus />}
                onClick={() => {
                  setLicenseToEdit(null);
                  setShowLicenseModal(true);
                }}
              />
            )}
          </div>
        </div>
        {renderLicenses()}
      </div>
      )}
      {hasPermission("view_staff_document_list") && (
      <div className="org-section">
        <div className="org-section-header">
          <h2 className="font-bold text-lg text-gray-700-em">
            Staff Documents
          </h2>
          {hasPermission("upload_staff_document") && (
            <Button
              label="New upload"
              variant="secondary"
              icon={<FaPlus />}
              onClick={() => {
                setFileToEdit(null);
                setShowFileModal(true);
              }}
            />
          )}
        </div>
        {renderFiles()}
      </div>
      )}
    </>
  );
};
const OrgGrid = ({ data }) => (
  <div className="staff-info-layout">
    <div className="staff-info-avatar">
      <div className="organisation-user-avatar">
        {data?.name
          ? data?.name
              .split(" ")
              .map((word) => word.charAt(0))
              .join("")
              .slice(0, 2)
          : "NA"}
      </div>
      <h2 className="font-bold text-lg text-gray-700 mb-4">
        {data?.name || "N/A"}
      </h2>
    </div>
    <div className="staff-info-fields">
      <Field label="Gender" value={data?.gender} />
      <Field label="Date of Birth" value={data?.DOB} />
      <Field label="Staff Role" value={data?.staffRoleName} />
      <Field label="NPI" value={data?.practiceNPI} />
      <Field label="Email" value={data?.email} />
      <Field label="Address" value={data?.address} />
      <Field label="Date joined" value={data?.dateJoined} />
    </div>
  </div>
);

const Field = ({ label, value, isLink }) => (
  <div className="items-center flex gap-4">
    <p className="text-sm text-gray-400">{label}</p>
    {isLink ? (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-blue-600"
      >
        {value}
      </a>
    ) : (
      <p className="font-semibold text-gray-600">{value || "N/A"}</p>
    )}
  </div>
);

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

const LicenseCard = ({ data, onEdit, onDelete }) => (
  <div className="border rounded-md border-gray-200 bg-white p-6">
    <div className="flex justify-between">
      <div className="flex gap-6">
        <MdOutlineFileOpen size={24} color="#004ABA" />
        <p className="font-semibold text-blue-primary">
          {(data?.licenseName || "N/A").length > 20
            ? (data?.licenseName || "N/A").slice(0, 20) + "..."
            : data?.licenseName || "N/A"}
        </p>
      </div>
      <div className="flex gap-6">
        {onEdit && (
          <div onClick={onEdit} className="cursor-pointer">
            <FiEdit3 size={24} color="#5C6167" />
          </div>
        )}
        {onDelete && (
          <div onClick={onDelete} className="cursor-pointer">
            <FaRegTrashAlt size={20} color="#5C6167" />
          </div>
        )}
      </div>
    </div>
    <div className="flex flex-col gap-3 mt-4">
      <Row label="License Number" value={data?.licenseNumber} />
      <Row label="Expiration Date" value={data?.expirationDate} />
      <Row label="State" value={data?.state} />
    </div>
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex items-center gap-2">
    <p className="text-sm text-gray-500 font-medium w-32">{label}</p>
    <p className="font-semibold text-gray-600">{value || "N/A"}</p>
  </div>
);

export default Profile;