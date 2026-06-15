import usePageTitle from "../../hooks/usePageTitle";
import { useState, useRef, useEffect } from "react";
import { PasswordInput, TextInput } from "../../Components/Input/Inputs";
import Button from "../../Components/Button/Button";
import "./Profile.css";
import DashboardLayout from "../../layouts/ClientLayout";
import useAuth from "../../hooks/useAuth";
import api from "../../api/ImageUpload";
import api2 from "../../api/profileAndSettingsApi";
import { showToast } from "../../Helper/ShowToast";
import { useNotificationSettings } from "../../hooks/useNotificationSettings";
import NotificationSettings from "../../Components/NotificationSettings/NotificationSettings";
import { DEFAULT_AVATAR, validImageTypes } from "../../Data/selectOptions";

// Function to generate avatar URL with fallback
const getAvatarUrl = (url, firstName, lastName) => {
  if (url && url.trim() !== "") {
    return url;
  }

  // Optional: Generate initials-based avatar as fallback
  // You can use a service like ui-avatars.com
  const initials =
    `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
  if (initials) {
    return `https://ui-avatars.com/api/?name=${initials}&size=120&background=CCCCCC&color=666666`;
  }

  return DEFAULT_AVATAR;
};

const Profile = () => {
  const { tenantClientId: clientTenantId, clientId, accessToken, refreshToken } = useAuth();

  usePageTitle("Profile");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Profile states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender] = useState("");
  const [DOB, setDOB] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [profileImage, setProfileImage] = useState(DEFAULT_AVATAR);
  const [avatarUrl, setAvatarUrl] = useState(""); // Store the actual avatar URL
  const fileInputRef = useRef(null);
  const [clientData, setClientData] = useState(null);

  // Use the isolated notification hook
  const {
    notifications,
    isLoading: isLoadingNotifications,
    loadingKeys: notificationLoadingKeys,
    toggleNotification,
    resetToSaved: resetNotifications,
  } = useNotificationSettings(clientTenantId, accessToken, refreshToken);

  // Password states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Load initial data on component mount
  useEffect(() => {
    if (clientTenantId && accessToken) {
      loadClientDetails();
    }
  }, [clientTenantId, accessToken]);

  const loadClientDetails = async () => {
    try {
      setIsLoading(true);
      const response = await api2.GetClientDetails({
        clientId,
        accessToken,
        refreshToken,
      });

      if (response.data?.data?.client) {
        const clientData = response.data.data.client;
        setFirstName(clientData.firstName || "");
        setLastName(clientData.lastName || "");
        setEmail(clientData.email || "");
        setPhoneNumber(clientData.phoneNumber || "");
        setGender(clientData.gender || "");
        setDOB(clientData.DOB || "");
        setPreferredName(clientData.preferredName || "");

        // Store the actual avatar URL
        setAvatarUrl(clientData.avatarUrl || "");

        // Set profile image with fallback
        setProfileImage(
          getAvatarUrl(
            clientData.avatarUrl,
            clientData.firstName,
            clientData.lastName,
          ),
        );

        setClientData(clientData);
      }
    } catch (error) {
      showToast("Failed to load client details", "error");
      console.error("Error loading client details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!validImageTypes.includes(file.type)) {
      showToast("Please upload a valid image file (JPEG, PNG, GIF)", "error");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast("Image size should be less than 5MB", "error");
      return;
    }

    try {
      setIsLoadingProfile(true);

      // Show preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append("images", file);

      const uploadResponse = await api.UploadImage({
        formData,
        accessToken,
        refreshToken,
      });

      if (
        !uploadResponse.success ||
        !uploadResponse.data ||
        uploadResponse.data.length === 0
      ) {
        throw new Error(uploadResponse.error || "Failed to upload image");
      }

      const imageUrl = uploadResponse.data[0].url;

      await api2.UploadProfileImage({
        clientId,
        avatarUrl: imageUrl,
        accessToken,
        refreshToken,
      });

      // Update avatar URL and profile image
      setAvatarUrl(imageUrl);
      setProfileImage(imageUrl);
      showToast("Profile image updated successfully", "success");

      // Reload client details to ensure data is in sync
      loadClientDetails();
    } catch (error) {
      // Revert to previous image on error
      setProfileImage(getAvatarUrl(avatarUrl, firstName, lastName));
      showToast(error.message || "Failed to upload image", "error");
      console.error("Error uploading image:", error);
    } finally {
      setIsLoadingProfile(false);
      event.target.value = "";
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      showToast("First name and last name are required", "error");
      return;
    }

    try {
      setIsLoadingProfile(true);

      const updateData = {
        clientId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: clientData?.email || "",
        phoneNumber: clientData?.phoneNumber || "",
        gender: clientData?.gender || "",
        DOB: clientData?.DOB || "",
        preferredName: clientData?.preferredName || "",
        streetAddress: clientData?.streetAddress || "",
        city: clientData?.city || "",
        state: clientData?.state || "",
        country: clientData?.country || "",
        zipCode: clientData?.zipCode || "",
        accessToken,
        refreshToken,
      };

      await api2.UpdateClientDetails(updateData);
      showToast("Profile updated successfully", "success");

      // Reload client details to get updated data
      loadClientDetails();
    } catch (error) {
      showToast(error.message || "Failed to update profile", "error");
      console.error("Error updating profile:", error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleChangePasswordClick = () => {
    setShowPasswordModal(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    try {
      setIsLoadingPassword(true);
      setPasswordError("");

      await api2.UpdatePassword({
        clientTenantId,
        currentPassword,
        newPassword,
        accessToken,
        refreshToken,
      });

      showToast("Password changed successfully", "success");
      setShowPasswordModal(false);
    } catch (error) {
      setPasswordError(error.message || "Failed to change password");
      showToast(error.message || "Failed to change password", "error");
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const handleCancel = () => {
    loadClientDetails();
    resetNotifications();
    showToast("Changes discarded", "info");
  };

  // Handle image error - fallback to initials or default
  const handleImageError = () => {
    setProfileImage(getAvatarUrl("", firstName, lastName));
  };

  return (
    <DashboardLayout>
      <div className="profile-container">
        <div className="profile-card">
          {/* Header */}
          <div className="profile-header">
            <h1>My Profile</h1>
            <p className="subtitle">Manage your profile</p>
          </div>

          {/* Personal Info Section */}
          <section className="section">
            <h2 className="profile-section-title">Personal info</h2>
            <p className="section-description">
              Update your photo and personal details here.
            </p>

            <div className="profile-image-section">
              <div className="profile-picture">
                <img
                  src={profileImage}
                  alt={`${firstName} ${lastName}`}
                  onError={handleImageError}
                />
                {isLoadingProfile && (
                  <div className="image-loading-overlay">Uploading...</div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: "none" }}
              />
              <button
                className="change-image-btn"
                onClick={triggerFileSelect}
                disabled={isLoadingProfile}
              >
                {isLoadingProfile ? "Uploading..." : "Change Picture"}
              </button>
            </div>

            <div className="form-fields">
              <div className="name-row">
                <TextInput
                  label="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First Name"
                  disabled={isLoading}
                />
                <TextInput
                  label="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last Name"
                  disabled={isLoading}
                />
              </div>
              <div className="name-row">
                <TextInput
                  label="Email address"
                  value={email}
                  disabled
                  iconLeft={<MailIcon />}
                />

                <div className="password-field-replacement">
                  <label className="input-label">Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type="password"
                      value="••••••••••"
                      disabled
                      className="disabled-password-input"
                    />
                    <button
                      type="button"
                      onClick={handleChangePasswordClick}
                      disabled={isLoading}
                    >
                      Change
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Isolated Notification Settings Component */}
          <NotificationSettings
            notifications={notifications}
            isLoading={isLoadingNotifications}
            loadingKeys={notificationLoadingKeys}
            onToggle={toggleNotification}
          />

          {/* Action Buttons */}
          <div className="action-buttons">
            <Button
              label="Save Changes"
              variant="primary"
              onClick={handleSaveProfile}
              loading={isLoadingProfile}
              disabled={isLoading}
            />
            <Button
              label="Cancel"
              variant="secondary"
              onClick={handleCancel}
              disabled={isLoading || isLoadingProfile || isLoadingNotifications}
            />
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="password-modal" role="dialog" aria-modal="true">
            <h3>Change Password</h3>
            <div className="modal-content">
              <PasswordInput
                label="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
              <PasswordInput
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                showStrength
              />
              <PasswordInput
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
              {passwordError && (
                <div className="password-error">{passwordError}</div>
              )}
              <div className="modal-actions">
                <Button
                  label="Change Password"
                  variant="primary"
                  onClick={handlePasswordChange}
                  loading={isLoadingPassword}
                />
                <Button
                  label="Cancel"
                  variant="secondary"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={isLoadingPassword}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

// Simple Mail Icon SVG
const MailIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

export default Profile;
