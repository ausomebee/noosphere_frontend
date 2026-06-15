import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setFormDraft, clearFormDraft } from "../ReduxStore/features/formDraftsSlice";

const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Draft persistence for modals using controlled useState (not react-hook-form).
 * Mirrors a plain values object into the persisted `formDrafts` slice so an
 * accidental Cancel/close doesn't lose input; cleared only on successful submit.
 *
 * @param {string} key            unique per modal, e.g. "add-authorization"
 * @param {object} opts
 * @param {object} opts.values    current form state object to persist
 * @param {function} opts.restore (savedValues) => void — apply a restored draft
 * @param {boolean}  opts.isOpen  whether the modal is open
 * @param {number}   opts.ttl     draft lifetime in ms (default 7 days)
 * @returns {function} clearDraft — call after a successful submit
 */
export default function useReduxStateDraft(
  key,
  { values, restore, isOpen = true, ttl = DEFAULT_TTL } = {}
) {
  const dispatch = useDispatch();
  const saved = useSelector((s) => s.formDrafts?.[key]);
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const restoreRef = useRef(restore);
  restoreRef.current = restore;
  const hydrated = useRef(false);

  // Restore a saved draft when the modal opens.
  useEffect(() => {
    if (!isOpen) {
      hydrated.current = false;
      return;
    }
    if (hydrated.current) return;
    hydrated.current = true;
    const draft = savedRef.current;
    if (draft?.values && draft.savedAt && Date.now() - draft.savedAt < ttl) {
      const t = setTimeout(() => restoreRef.current?.(draft.values), 0);
      return () => clearTimeout(t);
    } else if (draft) {
      dispatch(clearFormDraft(key));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Persist values as they change (debounced).
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      dispatch(setFormDraft({ key, values: valuesRef.current, savedAt: Date.now() }));
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, values]);

  return () => dispatch(clearFormDraft(key));
}
