import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { RxCross2 } from "react-icons/rx";

const ReusableModal = ({
  isOpen,
  onClose,
  title,
  primaryButtonText,
  secondaryButtonText,
  tabs,
  onPrimaryButtonClick,
  onSecondaryButtonClick,
  children,
  size = "md",
  titleIcon,
  primaryButtonColor,
  secondaryButtonColor,
  primaryButtonLoading = false,
  activeTab,
  onTabChange,
}) => {
  const [scrollPosition, setScrollPosition] = useState(0);

  /* ---------- Body Scroll Lock ---------- */
  useEffect(() => {
    if (isOpen) {
      setScrollPosition(window.scrollY);
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${window.scrollY}px`;
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollPosition);
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollPosition);
    };
  }, [isOpen, scrollPosition]);

  if (!isOpen) return null;

  /* ---------- Submit Handler ---------- */
  const handleSubmit = (e) => {
    e.preventDefault();
    onPrimaryButtonClick?.(e);
  };

  return (
    <div className="modal">
      <form
        id="modal-form"
        className={`modal-content modal-${size}`}
        role="dialog"
        aria-labelledby="modal-title"
        onSubmit={handleSubmit}
      >
        <div className="re-modal-header">
          <h1
            id="modal-title"
            className="modal-title flex items-center justify-center gap-2"
          >
            {titleIcon && (
              <span className="modal-title-icon" aria-hidden="true">
                {titleIcon}
              </span>
            )}
            <span>{title}</span>
          </h1>
          {tabs && tabs.length > 0 && (
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              <RxCross2 size={28} />
            </button>
          )}
        </div>

       {tabs && tabs.length > 0 && (
          <div className="modal-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                type="button"
                className={`modal-tab-btn ${
                  activeTab === tab.name ? "active" : ""
                }`}
                onClick={() => onTabChange?.(tab.name)}
              >
                {tab.name}
              </button>
            ))}
          </div>
        )}

        {/* ---------- Modal Body – Always Mount Every Tab ---------- */}
        <div className="modal-body">
          {tabs && tabs.length > 0
            ? tabs.map((tab) => (
                <div
                  key={tab.name}
                  style={{ display: activeTab === tab.name ? "block" : "none" }}
                >
                  {tab.content}
                </div>
              ))
            : children}
        </div>

        {/* ---------- Footer Buttons ---------- */}
        {(tabs?.length || primaryButtonText || secondaryButtonText) && (
          <div className="modal-btns">
            {secondaryButtonText && (
              <button
                type="button"
                onClick={onSecondaryButtonClick || onClose}
                className="modal-btn modal-btn-secondary"
                style={{
                  backgroundColor: secondaryButtonColor || "#ffffff",
                  color: "#333333",
                }}
              >
                {secondaryButtonText}
              </button>
            )}

            {primaryButtonText && (
              <button
                type="submit"
                className="modal-btn"
                style={{
                  backgroundColor: primaryButtonColor || "#004aba",
                  color: "#ffffff",
                }}
                disabled={primaryButtonLoading}
              >
                {primaryButtonLoading ? (
                  <span className="btn-spinner">
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
                  </span>
                ) : (
                  primaryButtonText
                )}
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

ReusableModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  primaryButtonText: PropTypes.string,
  secondaryButtonText: PropTypes.string,
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      content: PropTypes.node.isRequired,
    })
  ),
  onPrimaryButtonClick: PropTypes.func,
  onSecondaryButtonClick: PropTypes.func,
  children: PropTypes.node,
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  titleIcon: PropTypes.node,
  primaryButtonColor: PropTypes.string,
  secondaryButtonColor: PropTypes.string,
  primaryButtonLoading: PropTypes.bool,
  activeTab: PropTypes.string,
  onTabChange: PropTypes.func,
};

export default ReusableModal;