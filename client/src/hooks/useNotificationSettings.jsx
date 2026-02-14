// hooks/useNotificationSettings.js
import { useState, useEffect } from "react";
import { showToast } from "../Helper/ShowToast";
import api2 from "../api/profileAndSettingsApi";

export const useNotificationSettings = (clientTenantId, accessToken, refreshToken) => {
  const [notifications, setNotifications] = useState({
    reschedule: false,
    starts: false,
    completed: false,
    awaitingReview: false,
    approvedReschedule: false,
  });
  const [notificationSettingsId, setNotificationSettingsId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (clientTenantId && accessToken) {
      loadNotificationSettings();
    }
  }, [clientTenantId, accessToken]);

  const loadNotificationSettings = async () => {
    try {
      setIsLoading(true);
      const response = await api2.GetNotificationSettings({
        tenantClientId: clientTenantId,
        accessToken,
        refreshToken,
      });

      if (response.data?.data) {
        const settings = response.data.data;
        setNotificationSettingsId(settings.id);
        setNotifications({
          reschedule: settings.reschedule || false,
          starts: settings.starts || false,
          completed: settings.completed || false,
          awaitingReview: settings.awaitingReview || false,
          approvedReschedule: settings.approvedReschedule || false,
        });
      }
    } catch (error) {
      if (
        error.message.includes("404") ||
        error.message.includes("not found")
      ) {
        createDefaultNotificationSettings();
      } else {
        showToast("Failed to load notification settings", "error");
        console.error("Error loading notification settings:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultNotificationSettings = async () => {
    try {
      await api2.CreateNotificationSettings({
        tenantClientId: clientTenantId,
        reschedule: true,
        starts: true,
        completed: true,
        awaitingReview: true,
        approvedReschedule: true,
        accessToken,
        refreshToken,
      });
      loadNotificationSettings();
    } catch (error) {
      showToast("Failed to create notification settings", "error");
      console.error("Error creating notification settings:", error);
    }
  };

  const toggleNotification = async (key) => {
    const updatedNotifications = {
      ...notifications,
      [key]: !notifications[key],
    };
    
    // Optimistic update
    setNotifications(updatedNotifications);

    try {
      setIsLoading(true);

      if (notificationSettingsId) {
        await api2.UpdateNotificationSettings({
          id: notificationSettingsId,
          ...updatedNotifications,
          accessToken,
          refreshToken,
        });
        showToast("Notification settings updated successfully", "success");
      } else {
        const response = await api2.CreateNotificationSettings({
          tenantClientId: clientTenantId,
          ...updatedNotifications,
          accessToken,
          refreshToken,
        });

        if (response.data?.data?.id) {
          setNotificationSettingsId(response.data.data.id);
        }
        showToast("Notification settings created successfully", "success");
      }
    } catch (error) {
      // Revert on error
      setNotifications(notifications);
      showToast("Failed to update notification settings", "error");
      console.error("Error updating notification settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetToSaved = () => {
    loadNotificationSettings();
  };

  return {
    notifications,
    isLoading,
    toggleNotification,
    resetToSaved,
  };
};