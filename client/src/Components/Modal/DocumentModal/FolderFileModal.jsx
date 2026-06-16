// src/Components/Modal/DocumentModal/FolderFilesModal.jsx
import { useState, useEffect } from "react";
import ReusableModal from "../ReusableModal"; // adjust path if needed
import { showToast } from "../../../Helper/ShowToast";
import api from "../../../api/documentsAndFormsApis";
import useDocumentViewer from "../../../hooks/useDocumentViewer";
import {
  IoDocumentTextOutline,
  IoImageOutline,
  IoDocumentOutline,
} from "react-icons/io5";
import { fileTypeColors } from "../../../Data/selectOptions";
import { formatDate } from "../../../Helper/Formatters";

const getFileIcon = (fileType = "") => {
  const ext = fileType.toLowerCase();
  const color = fileTypeColors[ext] || fileTypeColors.default;
  if (ext === "pdf") return <IoDocumentTextOutline size={24} color={color} />;
  if (["jpg", "jpeg", "png", "gif"].includes(ext))
    return <IoImageOutline size={24} color={color} />;
  if (["doc", "docx"].includes(ext))
    return <IoDocumentOutline size={24} color={color} />;
  if (["xls", "xlsx"].includes(ext))
    return <IoDocumentOutline size={24} color={color} />;
  return <IoDocumentOutline size={24} color={color} />;
};

const FolderFilesModal = ({
  isOpen,
  onClose,
  folder,
  accessToken,
  refreshToken,
}) => {
  const { openDocument } = useDocumentViewer();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !folder?.id) return;

    const fetchFiles = async () => {
      setLoading(true);
      try {
        const res = await api.GetAllFilesInFolder({
          folderId: folder.id,
          accessToken,
          refreshToken,
        });
        setFiles(res?.data?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [isOpen, folder?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen || !folder) return null;

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Files in "${folder.name}"`}
      size="lg"
      hidePrimaryButton={true}
      secondaryButtonText="Close"
      onSecondaryButtonClick={onClose}
    >
      <div style={{ padding: "16px 0" }}>
        {loading ? (
          <p style={{ textAlign: "center", color: "#6b7280" }}>
            Loading files...
          </p>
        ) : files.length === 0 ? (
          <p style={{ textAlign: "center", color: "#6b7280" }}>
            No files in this folder yet.
          </p>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {files.map((file) => (
              <div
                key={file.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "12px",
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              >
                <div style={{ flexShrink: 0 }}>
                  {getFileIcon(file.fileType)}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: "15px" }}>{file.name}</h4>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "13px",
                      color: "#6b7280",
                    }}
                  >
                    {formatDate(file.createdAt)}
                    {" • "}
                    {file.size || "—"}
                  </p>
                </div>
                <button
                  onClick={() => openDocument(file.url, file.name || "Document")}
                  style={{
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ReusableModal>
  );
};

export default FolderFilesModal;
