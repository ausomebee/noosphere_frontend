import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setSettings } from "../ReduxStore/features/generalSettingsSlice";
import useAuth from "./useAuth";
import api from "../api/generalSettingsApi";

const useFormatSettings = () => {
  const dispatch = useDispatch();
  const { tenantId, accessToken, refreshToken } = useAuth();
  const settings = useSelector((s) => s.generalSettings);

  useEffect(() => {
    if (settings.loaded || !tenantId || !accessToken) return;

    const fetchSettings = async () => {
      try {
        const response = await api.GetGeneralSettingsByTenantId({
          tenantId,
          accessToken,
          refreshToken,
        });
        const data = response?.data;
        if (data) {
          dispatch(
            setSettings({
              dateFormat: data.dateFormat,
              timeFormat: data.timeFormat,
              currency: data.currency,
            }),
          );
        }
      } catch {
        // Use defaults if fetch fails
      }
    };

    fetchSettings();
  }, [tenantId, accessToken, refreshToken, settings.loaded, dispatch]);

  return {
    dateFormat: settings.dateFormat,
    timeFormat: settings.timeFormat,
    currency: settings.currency,
  };
};

export default useFormatSettings;
