import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import ReusableModal from "./ReusableModal";
import { TextInput, TextareaInput } from "../Input/Inputs";
import { showToast } from "../../Helper/ShowToast";
import useAuth from "../../hooks/useAuth";
import api from "../../api/TenantApis";

const SendEmailModal = ({ isOpen, onClose, recipientEmail, recipientName }) => {
  const { accessToken, refreshToken } = useAuth();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState({});
  const [isSending, setIsSending] = useState(false);

  const hasRecipient = recipientEmail && recipientEmail !== "N/A";

  // Reset the form each time the modal opens.
  useEffect(() => {
    if (isOpen) {
      setSubject("");
      setBody("");
      setErrors({});
    }
  }, [isOpen]);

  const validate = () => {
    const next = {};
    if (!hasRecipient) next.recipient = "No recipient email on file for this prospect.";
    if (!subject.trim()) next.subject = "Subject is required.";
    if (!body.trim()) next.body = "Message is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const openMailto = () => {
    const url = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    // Use location.href (not window.open) so it hands off to the mail client
    // without leaving a blank browser tab open.
    window.location.href = url;
  };

  const handleSend = async () => {
    if (!validate()) return;
    setIsSending(true);
    try {
      // Wire to the (dummy) backend endpoint...
      await api.SendProspectEmail({
        to: recipientEmail,
        subject,
        body,
        accessToken,
        refreshToken,
      });
      // ...and open the user's mail client addressed to the prospect.
      openMailto();
      showToast("Email sent", "success");
      onClose();
    } catch (error) {
      showToast(error.message || "Failed to send email", "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Send an email"
      primaryButtonText={isSending ? "Sending..." : "Send"}
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSend}
      onSecondaryButtonClick={onClose}
      primaryButtonLoading={isSending}
    >
      <div className="space-y-4">
        <div className="input-group">
          <label className="input-label">To</label>
          <p style={{ margin: 0, fontSize: 14, color: "#374151" }}>
            {recipientName ? `${recipientName} ` : ""}
            {hasRecipient ? `<${recipientEmail}>` : "No email on file"}
          </p>
          {errors.recipient && (
            <span className="input-error-message">{errors.recipient}</span>
          )}
        </div>

        <TextInput
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject"
          error={errors.subject}
        />

        <TextareaInput
          label="Message"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message..."
          rows={6}
          error={errors.body}
        />
      </div>
    </ReusableModal>
  );
};

SendEmailModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  recipientEmail: PropTypes.string,
  recipientName: PropTypes.string,
};

export default SendEmailModal;
