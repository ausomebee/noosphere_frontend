// Returns the text colour (#000000 or #FFFFFF) with the best contrast against
// the given background colour, using the WCAG relative-luminance formula.
// Use this anywhere a user-picked colour is rendered as a background so the
// text on top stays legible (accessibility).
export const getContrastTextColor = (
  bgColor,
  { dark = "#000000", light = "#FFFFFF" } = {}
) => {
  if (!bgColor || typeof bgColor !== "string") return dark;

  let hex = bgColor.trim().replace(/^#/, "");
  // Expand shorthand (#abc -> #aabbcc)
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (hex.length !== 6 || /[^0-9a-fA-F]/.test(hex)) return dark;

  const channel = (start) => {
    const c = parseInt(hex.slice(start, start + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const luminance =
    0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);

  // 0.179 is the standard cut-off for switching between black and white text.
  return luminance > 0.179 ? dark : light;
};

export default getContrastTextColor;
