// hooks/useNotificationSettings.js
import { useState, useEffect, useRef } from "react";
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

  // Toggles are saved one at a time, each sending the latest values — not the
  // snapshot from when it was clicked, which let two quick toggles overwrite
  // each other on the server.
  const notificationsRef = useRef(notifications);
  const settingsIdRef = useRef(notificationSettingsId);
  const saveQueueRef = useRef(Promise.resolve());
  // A create already on its way, so a second caller waits for it rather than
  // creating a duplicate record.
  const createInFlightRef = useRef(null);
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);
  useEffect(() => { settingsIdRef.current = notificationSettingsId; }, [notificationSettingsId]);

  const createSettings = (values) => {
    if (!createInFlightRef.current) {
      createInFlightRef.current = api2
        .CreateNotificationSettings({
          tenantClientId: clientTenantId,
          ...values,
          accessToken,
          refreshToken,
        })
        .then((response) => {
          const id = response?.data?.data?.id;
          if (id) {
            settingsIdRef.current = id;
            setNotificationSettingsId(id);
          }
          return response;
        })
        .finally(() => {
          createInFlightRef.current = null;
        });
    }
    return createInFlightRef.current;
  };

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
        console.error("Error loading notification settings:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultNotificationSettings = async () => {
    try {
      await createSettings({
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
      });
      loadNotificationSettings();
    } catch (error) {
      showToast("Failed to create notification settings", "error");
      console.error("Error creating notification settings:", error);
    }
  };

  const saveLatest = async () => {
    // A default record may still be being created; wait for its id.
    if (!settingsIdRef.current && createInFlightRef.current) {
      await createInFlightRef.current.catch(() => {});
    }
    const latest = notificationsRef.current;
    if (settingsIdRef.current) {
      await api2.UpdateNotificationSettings({
        id: settingsIdRef.current,
        ...latest,
        accessToken,
        refreshToken,
      });
    } else {
      await createSettings(latest);
    }
  };

  const toggleNotification = (key) => {
    const nextValue = !notificationsRef.current[key];
    notificationsRef.current = { ...notificationsRef.current, [key]: nextValue };

    // Optimistic update
    setNotifications((prev) => ({ ...prev, [key]: nextValue }));
    setLoadingKeys((prev) => new Set(prev).add(key));

    const run = async () => {
      try {
        await saveLatest();
      } catch (error) {
        // Revert only this key, and only if nothing has changed it since
        if (notificationsRef.current[key] === nextValue) {
          notificationsRef.current = { ...notificationsRef.current, [key]: !nextValue };
        }
        setNotifications((prev) =>
          prev[key] === nextValue ? { ...prev, [key]: !nextValue } : prev,
        );
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

    saveQueueRef.current = saveQueueRef.current.then(run);
    return saveQueueRef.current;
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