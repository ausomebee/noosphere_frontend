// hooks/useNotificationSettings.js
import { useState, useEffect } from "react";
import { showToast } from "../Helper/ShowToast";
import api2 from "../api/profileAndSettingsApi";

export const useNotificationSettings = (clientTenantId, accessToken, refreshToken) => {
  const [notifications, setNotifications] = useState({
    appointmentScheduled: false,
    appointmentRescheduled: false,
    appointmentAboutToStart: false,
    appointmentStarted: false,
    appointmentCancelled: false,
    appointmentCompletedAwaitingFeedback: false,
    documentRequested: false,
    formShared: false,
    authorizationAboutToExpire: false,
    authorizationExpired: false,
    authorizationUnitsAlmostExhausted: false,
    authorizationUnitsExhausted: false,
    signatureRequested: false,
  });
  const [notificationSettingsId, setNotificationSettingsId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(new Set());

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
          appointmentScheduled: settings.appointmentScheduled || false,
          appointmentRescheduled: settings.appointmentRescheduled || false,
          appointmentAboutToStart: settings.appointmentAboutToStart || false,
          appointmentStarted: settings.appointmentStarted || false,
          appointmentCancelled: settings.appointmentCancelled || false,
          appointmentCompletedAwaitingFeedback: settings.appointmentCompletedAwaitingFeedback || false,
          documentRequested: settings.documentRequested || false,
          formShared: settings.formShared || false,
          authorizationAboutToExpire: settings.authorizationAboutToExpire || false,
          authorizationExpired: settings.authorizationExpired || false,
          authorizationUnitsAlmostExhausted: settings.authorizationUnitsAlmostExhausted || false,
          authorizationUnitsExhausted: settings.authorizationUnitsExhausted || false,
          signatureRequested: settings.signatureRequested || false,
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
        appointmentScheduled: true,
        appointmentRescheduled: true,
        appointmentAboutToStart: true,
        appointmentStarted: true,
        appointmentCancelled: true,
        appointmentCompletedAwaitingFeedback: true,
        documentRequested: true,
        formShared: true,
        authorizationAboutToExpire: true,
        authorizationExpired: true,
        authorizationUnitsAlmostExhausted: true,
        authorizationUnitsExhausted: true,
        signatureRequested: true,
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
    setLoadingKeys((prev) => new Set(prev).add(key));

    try {
      if (notificationSettingsId) {
        await api2.UpdateNotificationSettings({
          id: notificationSettingsId,
          ...updatedNotifications,
          accessToken,
          refreshToken,
        });
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
      }
    } catch (error) {
      // Revert on error
      setNotifications(notifications);
      showToast("Failed to update notification settings", "error");
      console.error("Error updating notification settings:", error);
    } finally {
      setLoadingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const resetToSaved = () => {
    loadNotificationSettings();
  };

  return {
    notifications,
    isLoading,
    loadingKeys,
    toggleNotification,
    resetToSaved,
  };
};