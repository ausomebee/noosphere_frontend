import { useState } from "react";
import PropTypes from "prop-types";
import ReusableModal from "./ReusableModal";

/**
 * Confirmation dialog for destructive actions, matching the pattern the other
 * apps use rather than a native `window.confirm` — which can't be styled, can't
 * be dismissed with the rest of the UI, and looks like a browser warning rather
 * than part of the product.
 *
 * Stays open when `onConfirm` rejects, so a failure keeps its message on screen
 * instead of dismissing as though it had worked.
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  confirmColor = "#D92D20",
}) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
    // Reached only when onConfirm resolved — a rejection propagates and leaves
    // the modal open.
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      primaryButtonText={confirmLabel}
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleConfirm}
      onSecondaryButtonClick={onClose}
      primaryButtonColor={confirmColor}
      primaryButtonLoading={loading}
      size="sm"
    >
      <div className="text-center">
        {title && <h2 className="text-xl mb-4">{title}</h2>}
        {message && <p className="text-gray-600 mb-16">{message}</p>}
      </div>
    </ReusableModal>
  );
};

ConfirmModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string,
  message: PropTypes.string,
  confirmLabel: PropTypes.string,
  confirmColor: PropTypes.string,
};

export default ConfirmModal;
