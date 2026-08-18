import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import './ReusableModal.css';
import { modalRegistry } from '../../hooks/modalRegistry';

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
  showPrimaryButton = true,
  showSecondaryButton = true,
  footerClassName = "",
  children,
}) => {
  const [scrollPosition, setScrollPosition] = React.useState(0);
  const modalRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Auto-disable the primary button while an async submit is in flight, so it
  // can't be double-clicked into a duplicate request.
  const [submitting, setSubmitting] = React.useState(false);
  const primaryBusy = primaryButtonLoading || submitting;
  // Held briefly for handlers that return nothing to await, so a rapid second
  // click can't slip through before the request lands.
  const submitGuardRef = useRef(null);
  useEffect(() => () => clearTimeout(submitGuardRef.current), []);

  const handlePrimary = (e) => {
    if (primaryBusy) return;

    // Lock on every submit. Previously only a promise-returning handler locked
    // the buttons, so a handler that fired a request without returning it left
    // the primary button live and a second click sent a duplicate.
    setSubmitting(true);

    let result;
    try {
      result = (onPrimaryButtonClick || onClose)?.(e);
    } catch (err) {
      setSubmitting(false);
      throw err;
    }

    if (result && typeof result.then === "function") {
      Promise.resolve(result)
        .catch(() => {
          // Already surfaced by the handler; swallowed so a
          // deliberate re-throw isn't logged as unhandled.
        })
        .finally(() => setSubmitting(false));
      return;
    }

    clearTimeout(submitGuardRef.current);
    submitGuardRef.current = setTimeout(() => setSubmitting(false), 600);
  };

  /* ---------- Register open modal (so the board goes inert) ---------- */
  useEffect(() => {
    if (!isOpen) return;
    modalRegistry.open();
    return () => modalRegistry.close();
  }, [isOpen]);

  /* ---------- Focus trap + Escape ---------- */
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") { onCloseRef.current(); return; }
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
  }, [isOpen]);

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

  return ReactDOM.createPortal(
    // Stop key events bubbling through the React tree to ancestor handlers.
    // The modal is DOM-portaled to <body>, but React events still bubble to the
    // component that rendered it (e.g. a dnd-kit sortable column) — without this,
    // Space/arrows typed in the modal get hijacked as drag commands.
    <div
      className="modal-overlay"
      // Shield the board's dnd-kit from Space/arrows typed in the modal, but let
      // Escape/Tab bubble to the document handler (close + focus trap).
      onKeyDown={(e) => {
        if (e.key !== "Escape" && e.key !== "Tab") e.stopPropagation();
      }}
    >
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

        {/* Buttons — a single visible button (flex:1) fills the full width. */}
        <div className={`modal-buttons ${footerClassName}`}>
          {showSecondaryButton && (
          <button
            onClick={onSecondaryButtonClick || onClose}
            className="modal-button secondary-button"
            style={{ backgroundColor: secondaryButtonColor || '#ffffff', color: '#333333' }}
          >
            {secondaryButtonText || 'Cancel'}
          </button>
          )}
          {showPrimaryButton && (
          <button
            onClick={handlePrimary}
            className="modal-button primary-button"
            style={{ backgroundColor: primaryButtonColor || '#000000', color: '#ffffff' }}
            disabled={primaryBusy}
          >
            {primaryBusy ? (
              <span className="modal-button-spinner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" focusable="false">
                  <path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            ) : (
              primaryButtonText || 'Save'
            )}
          </button>
          )}
        </div>
      </div>
    </div>,
    document.body
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