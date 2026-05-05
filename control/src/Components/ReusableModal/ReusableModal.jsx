import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './ReusableModal.css';

// Reusable Modal Component
const ReusableModal = ({
  isOpen,
  onClose,
  title,
  primaryButtonText,
  secondaryButtonText,
  primaryButtonColor,
  secondaryButtonColor,
  tabs,
  activeTab,
  onTabChange,
  onPrimaryButtonClick,
  onSecondaryButtonClick,
  primaryButtonLoading = false,
  children,
}) => {
  const [scrollPosition, setScrollPosition] = React.useState(0);
  const modalRef = useRef(null);

  /* ---------- Focus trap + Escape ---------- */
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Tab") {
        const focusable = modalRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
        else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    const timer = setTimeout(() => { modalRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus(); }, 50);
    return () => { document.removeEventListener("keydown", handleKeyDown); clearTimeout(timer); };
  }, [isOpen, onClose]);

  // Handle body scroll and position when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setScrollPosition(window.scrollY);
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${window.scrollY}px`;
      document.body.style.width = '100%'; // Prevent horizontal shift
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollPosition); // Restore scroll position
    }

    // Cleanup on unmount or when modal closes
    return () => {
      if (!isOpen) {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollPosition);
      }
    };
  }, [isOpen, scrollPosition]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div ref={modalRef} className="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        {/* Modal Title */}
        <h2 id="modal-title" className="modal-title">{title}</h2>

        {/* Tabs (if provided) */}
        {tabs && tabs.length > 0 && (
          <div className="modal-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                className={`tab-button ${activeTab === tab.name ? 'active-tab' : ''}`}
                onClick={() => onTabChange(tab.name)}
              >
                {tab.name}
              </button>
            ))}
          </div>
        )}

        {/* Tab Content or Children */}
        <div className="ReuseableModal-body no-scrollbar no-scrollbar::-webkit-scrollbar">
          {tabs && tabs.length > 0
            ? tabs.find((tab) => tab.name === activeTab)?.content
            : children}
        </div>

        {/* Buttons */}
        <div className="modal-buttons">
          <button
            onClick={onSecondaryButtonClick || onClose}
            className="modal-button secondary-button"
            style={{ backgroundColor: secondaryButtonColor || '#ffffff', color: '#333333' }}
          >
            {secondaryButtonText || 'Cancel'}
          </button>
          <button
            onClick={onPrimaryButtonClick || onClose}
            className="modal-button primary-button"
            style={{ backgroundColor: primaryButtonColor || '#000000', color: '#ffffff' }}
            disabled={primaryButtonLoading}
          >
            {primaryButtonLoading ? (
              <span className="modal-button-spinner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" focusable="false">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
            ) : (
              primaryButtonText || 'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// PropTypes for type checking
ReusableModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  primaryButtonText: PropTypes.string,
  secondaryButtonText: PropTypes.string,
  primaryButtonColor: PropTypes.string,
  secondaryButtonColor: PropTypes.string,
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      content: PropTypes.node.isRequired,
    })
  ),
  activeTab: PropTypes.string,
  onTabChange: PropTypes.func,
  onPrimaryButtonClick: PropTypes.func,
  onSecondaryButtonClick: PropTypes.func,
  primaryButtonLoading: PropTypes.bool,
  children: PropTypes.node,
};

export default ReusableModal;