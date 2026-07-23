import usePageTitle from "../../../hooks/usePageTitle";
import { useState, useEffect } from "react";
import ReusableTable from "../../../Components/Table/ReuseableTable";
import Button from "../../../Components/Button/Button";
import LoadingSpinner from "../../../Components/LoadingSpinner";
import {
  IoAddOutline,
  IoFolderOutline,
  IoDocumentTextOutline,
  IoDocumentOutline,
  IoSearchOutline,
  IoFolderOpenOutline,
} from "react-icons/io5";
import { BsGrid, BsListUl } from "react-icons/bs";
import { HiOutlineAdjustmentsHorizontal } from "react-icons/hi2";
import { FiEdit3 } from "react-icons/fi";
import "./MyDocuments.css";
import { showToast } from "../../../Helper/ShowToast";
import api from "../../../api/documentsAndFormsApis";

import NewFolderModal from "../../../Components/Modal/DocumentModal/NewFolderModal";
import NewFileModal from "../../../Components/Modal/DocumentModal/NewFileModal";
import FolderFilesModal from "../../../Components/Modal/DocumentModal/FolderFileModal";
import useAuth from "../../../hooks/useAuth";
import useDocumentViewer from "../../../hooks/useDocumentViewer";
import { formatDate, formatDateShort } from "../../../Helper/Formatters";

const MyDocuments = () => {
  const { tenantClientId: clientTenantId, accessToken, refreshToken } = useAuth();
  const { openDocument } = useDocumentViewer();

  usePageTitle("Documents & Forms");
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [showFolderFilesModal, setShowFolderFilesModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewType, setViewType] = useState("list");

  // Data states
  const [foldersData, setFoldersData] = useState([]);
  const [recentFiles, setRecentFiles] = useState([]);
  const [allFilesData, setAllFilesData] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const refreshFiles = () => setReloadKey((k) => k + 1);

  // Isolated loading states
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(true);
  const [allFilesLoading, setAllFilesLoading] = useState(true);

  const [selectedFolder, setSelectedFolder] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(allFilesData.length / itemsPerPage);

  const pagination = {
    currentPage,
    totalPages: totalPages || 1,
  };

  const toggleNewMenu = () => setShowNewMenu(!showNewMenu);
  const handleSearch = (e) => setSearchTerm(e.target.value);

  useEffect(() => {
    if (!clientTenantId || !accessToken || !refreshToken) {
      if (import.meta.env.DEV) console.warn("Missing auth data");
      setFoldersLoading(false);
      setRecentLoading(false);
      setAllFilesLoading(false);
      return;
    }

    const loadAllData = async () => {
      // Load in parallel
      const promises = [
        // Folders
        api
          .GetAllFolders({ clientTenantId, accessToken, refreshToken })
          .then((res) => {
            setFoldersData(res?.data?.data || []);
          })
          .catch((err) => {
            console.error("Folders fetch failed:", err);
          })
          .finally(() => setFoldersLoading(false)),

        // Recent files
        api
          .GetRecentFiles({ clientTenantId, accessToken, refreshToken })
          .then((res) => {
            setRecentFiles(
              (res?.data?.data || []).map((f) => ({
                id: f.id,
                name: f.name,
                date: formatDate(f.createdAt),
                size: f.size || "—",
                icon: <IoDocumentOutline size={20} />,
                url: f.url || f.fileUrl || f.downloadUrl || f.previewUrl || "",
              })),
            );
          })
          .catch((err) => {
            console.error("Recent files fetch failed:", err);
          })
          .finally(() => setRecentLoading(false)),

        // All files
        api
          .GetAllFiles({ clientTenantId, accessToken, refreshToken })
          .then((res) => {
            setAllFilesData(
              (res?.data?.data || []).map((f) => ({
                id: f.id,
                name: f.name,
                uploadedBy: f.uploadedBy || "Unknown",
                icon: <IoDocumentOutline size={20} />,
                url: f.url || f.fileUrl || f.downloadUrl || f.previewUrl || "",
              })),
            );
          })
          .catch((err) => {
            console.error("All files fetch failed:", err);
          })
          .finally(() => setAllFilesLoading(false)),
      ];

      await Promise.all(promises);
    };

    loadAllData();
  }, [clientTenantId, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateFolder = async (folderData) => {
    try {
      const res = await api.CreateNewFolder({
        clientTenantId,
        folderName: folderData.name.trim(),
        accessToken,
        refreshToken,
      });
      setFoldersData((prev) => [...prev, res?.data?.data]);
      showToast(`Folder "${folderData.name}" created`, "success");
    } catch {
      showToast("Failed to create folder", "error");
    }
  };

  const handleRenameFolder = async (folderId, newName) => {
    try {
      await api.UpdateFolderName({
        folderId,
        name: newName.trim(),
        accessToken,
        refreshToken,
      });
      setFoldersData((prev) =>
        prev.map((f) =>
          f.id === folderId ? { ...f, name: newName.trim() } : f,
        ),
      );
      showToast("Folder renamed successfully", "success");
    } catch {
      showToast("Failed to rename folder", "error");
    }
  };

  const handleCreateFile = async (payloads) => {
    try {
      for (const payload of payloads) {
        await api.CreateNewFile({
          clientTenantId,
          name: payload.name,
          url: payload.url,
          size: payload.size,
          fileType: payload.fileType,
          folderId: payload.folderId || null,
          accessToken,
          refreshToken,
        });
      }
      showToast("File(s) uploaded successfully", "success");
      refreshFiles(); // re-fetch recent/all files so the upload appears
    } catch {
      showToast("Failed to upload file", "error");
    }
  };

  const handleRecentFileClick = (file) => {
    if (file.url?.trim()) {
      openDocument(file.url, file.name || "Document");
    } else {
      showToast("No file link available", "warning");
    }
  };

  const allFilesColumns = [
    {
      key: "name",
      title: "Name",
      render: (value, row) => (
        <div
          className="file-name-cell"
          style={{ cursor: row.url ? "pointer" : "default" }}
          onClick={() => {
            if (row.url?.trim()) {
              openDocument(row.url, row.name || "Document");
            } else {
              showToast("No file link available", "warning");
            }
          }}
        >
          <div className="file-icon">{row.icon}</div>
          <span
            className="file-name"
            style={{
              color: row.url ? "#1e40af" : "inherit",
              textDecoration: row.url ? "underline" : "none",
            }}
          >
            {value}
          </span>
        </div>
      ),
    },
    {
      key: "uploadedBy",
      title: "Uploaded by",
    },
  ];

  const fileActions = [
    {
      menu: true,
      label: "View",
      onClick: (row) => {
        if (row.url?.trim()) {
          openDocument(row.url, row.name || "Document");
        } else {
          showToast(
            "No preview/download link available for this file",
            "warning",
          );
        }
      },
    },
  ];

  return (
    <div className="my-documents-container">
      {/* Header – always visible */}
      <div className="documents-header">
        <div className="header-text">
          <h1 className="documents-title">My Documents</h1>
          <p className="documents-subtitle">
            All your documents will appear here
          </p>
        </div>
      </div>

      <div className="documents-header">
        <div className="table-controls">
          <div className="table-search">
            <IoSearchOutline size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search Documents"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>

          <div className="table-actions">
            <button className="filter-btn">
              <HiOutlineAdjustmentsHorizontal size={18} />
              <span>Filters</span>
            </button>

            <div className="view-toggle">
              <button
                className={`view-btn ${viewType === "list" ? "active" : ""}`}
                onClick={() => setViewType("list")}
              >
                <BsListUl size={18} />
              </button>
              <button
                className={`view-btn ${viewType === "grid" ? "active" : ""}`}
                onClick={() => setViewType("grid")}
              >
                <BsGrid size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <div className="new-button-wrapper">
            <Button
              label="New"
              variant="primary"
              icon={<IoAddOutline size={18} color="#FFF" />}
              onClick={toggleNewMenu}
            />
            {showNewMenu && (
              <div className="new-menu">
                <button
                  className="new-menu-item"
                  onClick={() => {
                    setShowNewMenu(false);
                    setShowFolderModal(true);
                  }}
                >
                  <IoFolderOutline size={18} />
                  <span>New Folder</span>
                </button>
                <button
                  className="new-menu-item"
                  onClick={() => {
                    setShowNewMenu(false);
                    setShowFileModal(true);
                  }}
                >
                  <IoDocumentOutline size={18} />
                  <span>New File</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Folders Section */}
      <div className="section-wrapper">
        <h2 className="section-heading">Folders</h2>

        {foldersLoading ? (
          <LoadingSpinner />
        ) : foldersData.length === 0 ? (
          <div className="empty-state">
            <IoFolderOpenOutline size={48} className="empty-icon" />
            <h3>No folders yet</h3>
            <p>Create your first folder to start organizing files.</p>
            <Button
              label="New Folder"
              variant="outline"
              size="sm"
              onClick={() => setShowFolderModal(true)}
            />
          </div>
        ) : (
          <div className="folders-grid">
            {foldersData.map((folder) => (
              <div
                key={folder.id}
                className="folder-card"
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedFolder(folder);
                  setShowFolderFilesModal(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedFolder(folder);
                    setShowFolderFilesModal(true);
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="folder-icon-wrapper">
                  <IoFolderOutline size={20} />
                </div>
                <div className="folder-info">
                  <h3 className="folder-name">{folder.name}</h3>
                  <p className="folder-meta">
                    {formatDateShort(folder.createdAt)}
                    {" • "}
                    {folder.folderSize || "0"} items
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Rename folder"
                  style={{ cursor: "pointer", marginLeft: "auto", background: "none", border: "none", padding: 0, display: "flex", alignItems: "center" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFolder(folder);
                    setShowRenameFolderModal(true);
                  }}
                >
                  <FiEdit3 />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Files Section */}
      <div className="section-wrapper">
        <h2 className="section-heading">Recent</h2>

        {recentLoading ? (
          <LoadingSpinner />
        ) : recentFiles.length === 0 ? (
          <div className="empty-state">
            <IoDocumentTextOutline size={48} className="empty-icon" />
            <h3>No recent files</h3>
            <p>Files you recently worked on will appear here.</p>
          </div>
        ) : (
          <div className="recent-grid">
            {recentFiles.map((file) => (
              <div
                key={file.id}
                className="recent-card"
                role="button"
                tabIndex={0}
                onClick={() => handleRecentFileClick(file)}
                style={{ cursor: file.url ? "pointer" : "default" }}
              >
                <div className="recent-icon-wrapper">{file.icon}</div>
                <div className="recent-info">
                  <h3
                    className="recent-name"
                    style={{
                      color: file.url ? "#1e40af" : "inherit",
                      textDecoration: file.url ? "underline" : "none",
                    }}
                  >
                    {file.name}
                  </h3>
                  <p className="recent-meta">
                    {file.date} • {file.size}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Files Section */}
      <div className="section-wrapper">
        <h2 className="section-heading">All files</h2>

        {allFilesLoading ? (
          <LoadingSpinner />
        ) : allFilesData.length === 0 ? (
          <div className="empty-state">
            <IoDocumentOutline size={48} className="empty-icon" />
            <h3>No files uploaded yet</h3>
            <p>Upload your first document to get started.</p>
            <Button
              label="Upload File"
              variant="primary"
              size="sm"
              onClick={() => setShowFileModal(true)}
            />
          </div>
        ) : (
          <ReusableTable
            columns={allFilesColumns}
            data={allFilesData}
            searchPlaceholder="Search Documents"
            showFilters={true}
            showViewToggle={true}
            actions={fileActions}
            pagination={pagination}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Modals */}
      <NewFolderModal
        isOpen={showFolderModal || showRenameFolderModal}
        onClose={() => {
          setShowFolderModal(false);
          setShowRenameFolderModal(false);
        }}
        onCreate={showFolderModal ? handleCreateFolder : undefined}
        onRename={showRenameFolderModal ? handleRenameFolder : undefined}
        isRenameMode={showRenameFolderModal}
        initialName={showRenameFolderModal ? selectedFolder?.name || "" : ""}
        folderId={showRenameFolderModal ? selectedFolder?.id : null}
      />

      <NewFileModal
        isOpen={showFileModal}
        onClose={() => setShowFileModal(false)}
        onCreate={handleCreateFile}
        folders={foldersData}
      />

      <FolderFilesModal
        isOpen={showFolderFilesModal}
        onClose={() => setShowFolderFilesModal(false)}
        folder={selectedFolder}
        accessToken={accessToken}
        refreshToken={refreshToken}
      />
    </div>
  );
};

export default MyDocuments;
