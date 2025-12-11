import React, { useState, useRef } from "react";
import {
  SwitchInput,
  PasswordInput,
  TextInput,
} from "../../Components/Input/Inputs";
import Button from "../../Components/Button/Button";
import "./Profile.css";
import DashboardLayout from "../../layouts/ClientLayout";

const Profile = () => {
  const [firstName, setFirstName] = useState("Oiva");
  const [lastName, setLastName] = useState("Rhye");
  const [email] = useState("email@email.com");
  const [profileImage, setProfileImage] = useState(
    "https://via.placeholder.com/120x120/cccccc/666666?text=Profile"
  ); // Initial image
  const fileInputRef = useRef(null);
  const [notifications, setNotifications] = useState({
    scheduled: true,
    starts: true,
    completed: true,
    awaitingReview: true,
    rescheduleApproved: true,
  });

  const handleNotificationToggle = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Preview the selected image
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result); // Update preview
      };
      reader.readAsDataURL(file);

      // Simulate sending/uploading the image
      console.log("Uploading image:", file);
      // Here you would normally send it to your backend:
      // const formData = new FormData();
      // formData.append('profileImage', file);
      // await fetch('/api/upload-profile-image', { method: 'POST', body: formData });

      alert(
        `Image selected: ${file.name}\n(In a real app, this would upload to the server)`
      );
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
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

            <div className="">
              <div className="profile-picture">
                <img src={profileImage} alt="Profile" />
              </div>
               <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: "none" }}
              />
              <button className="change-image-btn" onClick={triggerFileSelect}>
                Change Picture
              </button>
            </div>

            {/* Form Fields */}
            <div className="form-fields">
              <div className="name-row">
                <TextInput
                  label="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First Name"
                />
                <TextInput
                  label="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last Name"
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
                    <button type="button">Change</button>
                  </div>
                </div>
              </div>
             
            </div>
          </section>

          {/* Notifications Section */}
          <section className="section">
            <h2 className="profile-section-title">Notifications</h2>
            <p className="section-description">
              Manage how and when you'd like to receive updates.
            </p>

            <div className="profile-notifications-list">
              <NotificationItem
                label="Notify me when a session has been scheduled"
                checked={notifications.scheduled}
                onChange={() => handleNotificationToggle("scheduled")}
              />
              <NotificationItem
                label="Notify me when a session starts"
                checked={notifications.starts}
                onChange={() => handleNotificationToggle("starts")}
              
              />
              <NotificationItem
                label="Notify me when a session is marked as completed"
                checked={notifications.completed}
                onChange={() => handleNotificationToggle("completed")}
              />
              <NotificationItem
                label="Notify me when a session is awaiting review"
                checked={notifications.awaitingReview}
                onChange={() => handleNotificationToggle("awaitingReview")}
              />
              <NotificationItem
                label="Notify me when a reschedule has been approved"
                checked={notifications.rescheduleApproved}
                onChange={() => handleNotificationToggle("rescheduleApproved")}
              />
            </div>
          </section>

          {/* Action Buttons */}
          <div className="action-buttons">
            <Button label="Save Changes" variant="primary" />
            <Button label="Cancel" variant="secondary" />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

// Reusable Notification Switch Component
const NotificationItem = ({ label, checked, onChange, highlight }) => {
  return (
    <div className={`notification-item ${highlight ? "highlight" : ""}`}>
      <span className="notification-label">{label}</span>
      <SwitchInput checked={checked} onChange={onChange} />
    </div>
  );
};

// Simple Mail Icon SVG (you can replace with your own)
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
