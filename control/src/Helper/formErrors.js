import { showToast } from "./ShowToast";

/**
 * Pulls every message out of a react-hook-form error object.
 *
 * Errors nest: a yup object schema or a field array puts its failures under a
 * parent key that has no `message` of its own, so reading Object.values(...)[0]
 * returns a bare container and the toast comes out empty. This walks down to
 * the real messages instead.
 */
const collectMessages = (errors, out = []) => {
  if (!errors || typeof errors !== "object") return out;

  for (const [key, value] of Object.entries(errors)) {
    // `ref` points at a DOM node and `types` holds raw validator output —
    // recursing into either yields noise, not user-facing text.
    if (key === "ref" || key === "types") continue;
    if (!value || typeof value !== "object") continue;

    if (typeof value.message === "string" && value.message.trim()) {
      out.push(value.message.trim());
    } else {
      collectMessages(value, out);
    }
  }

  return out;
};

/**
 * Surfaces schema validation failures as a toast.
 *
 * Pass as react-hook-form's second submit argument:
 *   onPrimaryButtonClick={handleSubmit(onValid, showValidationErrors)}
 *
 * Inline field errors still render — this exists because a validation failure
 * inside a modal otherwise looks like the button did nothing, especially when
 * the offending field is scrolled out of view. The modal stays open either way;
 * react-hook-form never calls the valid handler, so nothing is submitted.
 */
export const showValidationErrors = (errors) => {
  const messages = collectMessages(errors);

  if (!messages.length) {
    showToast("Please fill in all required fields", "error");
    return;
  }

  const [first] = messages;
  showToast(
    messages.length > 1
      ? `${messages.length} fields need attention: ${first}`
      : first,
    "error",
  );
};

export default showValidationErrors;
