import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

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
  size = 'medium',
  titleIcon, // New optional prop for the icon
}) => {
  const [activeTab, setActiveTab] = useState(tabs && tabs.length > 0 ? tabs[0].name : null);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Handle body scroll and position when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setScrollPosition(window.scrollY);
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${window.scrollY}px`;
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollPosition);
    }

    // Cleanup
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
    <div className="modal">
      <div className={`modal-content modal-${size}`} role="dialog" aria-labelledby="modal-title">
        <h2 id="modal-title" className="modal-title flex mx-auto items-center gap-2 mt-4">
          {titleIcon && (
            <span className="modal-title-icon" aria-hidden="true">
              {titleIcon}
            </span>
          )}
          <span>{title}</span>
        </h2>

        {tabs && tabs.length > 0 && (
          <div className="modal-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                className={`modal-tab-btn ${activeTab === tab.name ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.name)}
              >
                {tab.name}
              </button>
            ))}
          </div>
        )}

        <div className="modal-body">
          {tabs && tabs.length > 0
            ? tabs.find((tab) => tab.name === activeTab)?.content
            : children}
        </div>

        <div className="modal-btns">
          <button
            onClick={onSecondaryButtonClick || onClose}
            className="modal-btn modal-btn-secondary"
          >
            {secondaryButtonText || 'Cancel'}
          </button>
          <button
            onClick={onPrimaryButtonClick || onClose}
            className="modal-btn modal-btn-primary"
          >
            {primaryButtonText || 'Save'}
          </button>
        </div>
      </div>
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
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  titleIcon: PropTypes.node, // New optional prop
};

export default ReusableModal;