import { useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
export default function useDropdownAnchor() {
  const anchorRef = useRef(null);      // the text/div you click
  const popupRef  = useRef(null);      // the <ul> we render
  const [open, setOpen] = useState(false);

  /* ------------ click outside / ESC close ------------ */
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e) => e.key === 'Escape' && close();

    document.addEventListener('mousedown', close, { once: true });
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  /* ------------ position once when opened ------------ */
  useEffect(() => {
    if (!open || !anchorRef.current || !popupRef.current) return;

    const anchor = anchorRef.current.getBoundingClientRect();
    const popup  = popupRef.current;

    /*  fallback for browsers without @supports(anchor-name)  */
    popup.style.position = 'fixed';
    popup.style.top  = `${anchor.bottom + 4}px`;
    popup.style.left = `${anchor.left}px`;
    popup.style.minWidth = `${anchor.width}px`;
  }, [open]);

  const toggle = (e) => {
    e.stopPropagation();
    setOpen((o) => !o);
  };

  return { anchorRef, popupRef, open, toggle, setOpen };
}