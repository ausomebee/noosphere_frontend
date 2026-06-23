import { useEffect, useState } from "react";

/**
 * Drop-in replacement for useState that remembers the active tab across a page
 * refresh. Backed by sessionStorage (survives refresh, clears when the browser
 * tab is closed). Each tab bar passes a unique `key`; record-scoped panels
 * should include the record id in the key so each record keeps its own tab.
 *
 * @param {string} key          unique storage key, e.g. "tenant:clientPanel:<id>"
 * @param {string} defaultValue the tab to use when nothing is stored yet
 * @param {string[]} [validValues] optional allow-list of tab keys. When given, a
 *        stored value that isn't in the list (e.g. a permission-gated tab the
 *        current user can't see on a shared workstation) falls back to default.
 * @returns {[string, Function]} [tab, setTab] — same shape as useState
 */
export default function usePersistedTab(key, defaultValue, validValues) {
  const storageKey = `tab:${key}`;

  const [tab, setTab] = useState(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      const allowed =
        !Array.isArray(validValues) ||
        validValues.length === 0 ||
        validValues.includes(saved);
      return saved !== null && saved !== "" && allowed ? saved : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      if (tab !== undefined && tab !== null && tab !== "") {
        sessionStorage.setItem(storageKey, tab);
      }
    } catch {
      /* ignore storage errors (e.g. private mode) */
    }
  }, [storageKey, tab]);

  return [tab, setTab];
}
