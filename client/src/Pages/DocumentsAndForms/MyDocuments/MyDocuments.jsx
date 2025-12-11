import React, { useState } from "react";
import ReusableTable from "../../../Components/Table/ReuseableTable";
import Button from "../../../Components/Button/Button";
import {
  IoAddOutline,
  IoFolderOutline,
  IoDocumentTextOutline,
  IoImageOutline,
  IoDocumentOutline,
  IoSearchOutline,
} from "react-icons/io5";
import { BsGrid, BsListUl, BsThreeDotsVertical } from "react-icons/bs";
import "./MyDocuments.css";
import { HiOutlineAdjustmentsHorizontal } from "react-icons/hi2";

const MyDocuments = () => {
  const [showNewMenu, setShowNewMenu] = useState(false);
const [searchTerm, setSearchTerm] = useState("");
  const [viewType, setViewType] = useState("list");
  // Folders Data
  const foldersData = [
    {
      id: 1,
      name: "Children's Documents",
      date: "Aug 6, 2024",
      size: "1345 MB",
      icon: <IoFolderOutline size={20} />,
    },
    {
      id: 2,
      name: "Teacher's Documents",
      date: "Aug 6, 2024",
      size: "1345 MB",
      icon: <IoFolderOutline size={20} />,
    },
    {
      id: 3,
      name: "Choir Documents",
      date: "Aug 6, 2024",
      size: "1345 MB",
      icon: <IoFolderOutline size={20} />,
    },
  ];

  // Recent Files Data
  const recentFiles = [
    {
      id: 1,
      name: "Tech requirements.pdf",
      date: "Aug 6, 2024",
      size: "1345 MB",
      icon: <IoDocumentTextOutline size={20} />,
    },
    {
      id: 2,
      name: "Tech requirements.pdf",
      date: "Aug 6, 2024",
      size: "1345 MB",
      icon: <IoDocumentTextOutline size={20} />,
    },
    {
      id: 3,
      name: "Tech requirements.pdf",
      date: "Aug 6, 2024",
      size: "1345 MB",
      icon: <IoDocumentTextOutline size={20} />,
    },
    {
      id: 4,
      name: "Tech requirements.pdf",
      date: "Aug 6, 2024",
      size: "1345 MB",
      icon: <IoDocumentTextOutline size={20} />,
    },
  ];

  // All Files Data
  const allFilesData = [
    {
      id: 1,
      name: "Eye check up",
      uploadedBy: "Olivia Rhye",
      icon: <IoDocumentOutline size={20} />,
    },
    {
      id: 2,
      name: "Leg check up",
      uploadedBy: "Phoenix Baker",
      icon: <IoImageOutline size={20} />,
    },
    {
      id: 3,
      name: "Nose check up",
      uploadedBy: "Lana Steiner",
      icon: <IoDocumentTextOutline size={20} />,
    },
  ];

  // All Files Columns
  const allFilesColumns = [
    {
      key: "name",
      title: "Name",
      render: (value, row) => (
        <div className="file-name-cell">
          <div className="file-icon">{row.icon}</div>
          <span className="file-name">{value}</span>
        </div>
      ),
    },
    {
      key: "uploadedBy",
      title: "Uploaded by",
    },
  ];

  // Actions for All Files
  const fileActions = [
    {
      menu: true,
      
      label: "Download",
      onClick: (row) => console.log("Download", row),
    },
    {
      menu: true,
      label: "Delete",
      onClick: (row) => console.log("Delete", row),
    },
    {
      menu: true,
      label: "Share",
      onClick: (row) => console.log("Share", row),
    },
  ];

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pagination = {
    currentPage: currentPage,
    totalPages: 10,
  };

  const toggleNewMenu = () => {
    setShowNewMenu(!showNewMenu);
  };
   const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearch?.(value);
  };

  return (
    <div className="my-documents-container">
      {/* Header */}
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
              placeholder="search Documents"
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
                <button className="new-menu-item">
                  <IoFolderOutline size={18} />
                  <span>New Folder</span>
                </button>
                <button className="new-menu-item">
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
        <div className="folders-grid">
          {foldersData.map((folder) => (
            <div key={folder.id} className="folder-card">
              <div className="folder-icon-wrapper">{folder.icon}</div>
              <div className="folder-info">
                <h3 className="folder-name">{folder.name}</h3>
                <p className="folder-meta">
                  {folder.date} {folder.size}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Files Section */}
      <div className="section-wrapper">
        <h2 className="section-heading">Recent</h2>
        <div className="recent-grid">
          {recentFiles.map((file) => (
            <div key={file.id} className="recent-card">
              <div className="recent-icon-wrapper">{file.icon}</div>
              <div className="recent-info">
                <h3 className="recent-name">{file.name}</h3>
                <p className="recent-meta">
                  {file.date} {file.size}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Files Section */}
      <div className="section-wrapper">
        <h2 className="section-heading">All files</h2>
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
      </div>
    </div>
  );
};

export default MyDocuments;
