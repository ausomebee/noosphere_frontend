import React, { useState, useEffect } from "react";
import useAuth from "../../../../../hooks/useAuth";
import { FiX, FiFileText } from "react-icons/fi";
import { MdNavigateBefore, MdNavigateNext } from "react-icons/md";
import "./TemplateLibraryModal.css";
import api from "../../../../../api/TemplateAndReportApi";
import SectionLoader from "../../../../SectionLoader";

const TemplateLibraryModal = ({ isOpen, onClose, onSelectTemplate }) => {
  const { tenantId, accessToken, refreshToken } = useAuth();

  const [currentPage, setCurrentPage] = useState(1);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingTemplate, setFetchingTemplate] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    if (isOpen && tenantId) {
      fetchTemplates();
    }
  }, [isOpen, tenantId]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await api.GetClinicalReportTemplateByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });

      // Handle response format - could be { templates: [...] } or just [...]
      const templateList =
         response?.data || [];

      setTemplates(
        templateList.map((t) => ({
          id: t.id,
          name: t.title || t.name,
          sections: t.sections || [],
        })),
      );
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(templates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTemplates = templates.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handleUseTemplate = async (template) => {
    setFetchingTemplate(template.id);
    try {
      const response = await api.GetSingleClinicalReportTemplateById({
        Id: template.id,
        accessToken,
        refreshToken,
      });
      const fullTemplate = response?.data || response;
      onSelectTemplate({
        id: fullTemplate.id,
        name: fullTemplate.title || fullTemplate.name || template.name,
        sections: fullTemplate.sections || [],
      });
    } catch (error) {
      console.error("Failed to fetch template details:", error);
      // Fall back to the list data if full fetch fails
      onSelectTemplate(template);
    } finally {
      setFetchingTemplate(null);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const renderPageNumbers = () => {
    const pages = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage, "...", totalPages);
      }
    }

    return pages;
  };

  if (!isOpen) return null;

  return (
    <div className="template-library-overlay">
      <div className="template-library-modal">
        <div className="template-library-header">
          <h2 className="template-library-title">Template Library</h2>
          <button className="template-close-btn" onClick={onClose}>
            <FiX size={20} />
            <span>Close</span>
          </button>
        </div>

        <div className="template-library-content">
          {loading ? (
            <SectionLoader />
          ) : templates.length === 0 ? (
            <div className="template-empty">
              <p>No templates available</p>
            </div>
          ) : (
            <>
              <div className="template-table">
                <div className="template-table-header">
                  <span className="template-header-label">Name</span>
                </div>

                <div className="template-table-body">
                  {currentTemplates.map((template) => (
                    <div key={template.id} className="template-row">
                      <div className="template-row-left">
                        <FiFileText className="template-icon" size={18} />
                        <span className="template-name">{template.name}</span>
                      </div>
                      <button
                        className="use-template-btn"
                        onClick={() => handleUseTemplate(template)}
                        disabled={fetchingTemplate === template.id}
                      >
                        {fetchingTemplate === template.id ? (
                          <svg
                            className="spinner animate-spin"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          "Use Template"
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {totalPages > 1 && (
                <div className="template-pagination">
                  <button
                    className="pagination-btn"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <MdNavigateBefore size={20} />
                    <span>Previous</span>
                  </button>

                  <div className="pagination-numbers">
                    {renderPageNumbers().map((page, index) => (
                      <button
                        key={index}
                        className={`pagination-number ${
                          page === currentPage ? "pagination-active" : ""
                        } ${page === "..." ? "pagination-ellipsis" : ""}`}
                        onClick={() =>
                          typeof page === "number" && handlePageChange(page)
                        }
                        disabled={page === "..."}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    className="pagination-btn"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <span>Next</span>
                    <MdNavigateNext size={20} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateLibraryModal;
