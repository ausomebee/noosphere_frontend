import { useEffect, useState } from "react";

const CHECK_EVERY_MS = 5 * 60 * 1000;

/**
 * Notices when a newer build has been deployed behind this tab.
 *
 * Every build carries its version in the bundle and in `version.json` next to
 * index.html. A running tab keeps the version it loaded with, so polling the
 * file and comparing tells us the server has moved on. The tab is never
 * reloaded from here: the user may be halfway through a form, so they choose
 * when to refresh.
 *
 * Checks on mount, every five minutes, and whenever the tab comes back into
 * view — the moment someone returning from lunch is most likely to be stale.
 * Off outside production builds, where there is no version.json to fetch.
 */
const useVersionCheck = ({
  currentVersion = import.meta.env.VITE_APP_VERSION,
  enabled = import.meta.env.PROD,
  intervalMs = CHECK_EVERY_MS,
} = {}) => {
  const [latestVersion, setLatestVersion] = useState(null);

  useEffect(() => {
    // Once a newer version is known there is nothing more to learn.
    if (!enabled || !currentVersion || latestVersion) return undefined;

    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}version.json`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const { version } = await res.json();
        if (!cancelled && version && version !== currentVersion) {
          setLatestVersion(version);
        }
      } catch {
        // Offline, or caught mid-deploy. The next check will try again.
      }
    };

    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") check();
    };

    check();
    const timer = setInterval(check, intervalMs);
    document.addEventListener("visibilitychange", checkWhenVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    };
  }, [enabled, currentVersion, intervalMs, latestVersion]);

  return { updateAvailable: latestVersion !== null, latestVersion };
};

export default useVersionCheck;
