export default function getInputCoords(ref) {
  if (!ref.current) return { top: 0, left: 0, width: 0 };
  const r = ref.current.getBoundingClientRect();
  return {
    top: r.bottom + window.scrollY,
    left: r.left + window.scrollX,
    width: r.width,
  };
}