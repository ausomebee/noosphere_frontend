import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setFormDraft, clearFormDraft } from "../ReduxStore/features/formDraftsSlice";

const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Bridge react-hook-form to the persisted `formDrafts` slice so an accidental
 * Cancel/close doesn't lose in-progress input. Keeps RHF for validation; the
 * draft values ride through redux-persist.
 *
 * @param {string} key            unique per modal, e.g. "add-prospect"
 * @param {object} opts
 * @param {function} opts.watch   RHF watch()
 * @param {function} opts.reset   RHF reset()
 * @param {boolean}  opts.isOpen  whether the modal is open (controls hydrate/save)
 * @param {string[]} opts.exclude field names never to persist (passwords, files)
 * @param {number}   opts.ttl     draft lifetime in ms (default 7 days)
 * @returns {function} clearDraft — call after a successful submit
 */
export default function useReduxFormDraft(
  key,
  { watch, reset, isOpen = true, exclude = [], ttl = DEFAULT_TTL } = {}
) {
  const dispatch = useDispatch();
  const saved = useSelector((s) => s.formDrafts?.[key]);
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const hydrated = useRef(false);

  // Hydrate from a saved draft when the modal opens.
  useEffect(() => {
    if (!isOpen) {
      hydrated.current = false; // allow rehydrate on next open
      return;
    }
    if (hydrated.current) return;
    hydrated.current = true;
    const draft = savedRef.current;
    if (draft?.values && draft.savedAt && Date.now() - draft.savedAt < ttl) {
      // Defer so this wins over any reset(defaultValues) the modal runs on open.
      const t = setTimeout(() => reset(draft.values), 0);
      return () => clearTimeout(t);
    } else if (draft) {
      dispatch(clearFormDraft(key)); // expired — drop it
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Persist values as they change (debounced).
  useEffect(() => {
    if (!isOpen || typeof watch !== "function") return;
    let timer;
    const sub = watch((values, info) => {
      // Only persist genuine user edits. Programmatic reset() (e.g. on Cancel or
      // on open) fires watch with no `type`; ignoring it keeps the saved draft
      // intact so Cancel closes the modal without wiping what the user typed.
      if (!info || !info.type) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const v = { ...values };
        exclude.forEach((f) => delete v[f]);
        dispatch(setFormDraft({ key, values: v, savedAt: Date.now() }));
      }, 300);
    });
    return () => {
      clearTimeout(timer);
      sub?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, watch]);

  return () => dispatch(clearFormDraft(key));
}
