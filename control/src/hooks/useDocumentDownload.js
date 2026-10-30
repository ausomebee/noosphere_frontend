import { useCallback } from "react";
import {
  downloadDocumentFile,
  saveBlob,
  storageKeyFromUrl,
  DOCUMENT_FAILED,
} from "../Helper/documentAccess";
import { showToast } from "../Helper/ShowToast";
import imagesApi from "../api/imagesApi";
import useAuth from "./useAuth";

/**
 * Saving a document, by whichever route its url allows.
 *
 * A stored object is read through our own API, which streams the bytes from the
 * bucket. That is the only way script can read one at all: a bucket response
 * carries no CORS header, so the browser discards it however good the signed
 * link is. The API also corrects the Office MIME types that S3 returns as
 * application/zip, so a saved .docx opens in Word rather than prompting to
 * unzip.
 *
 * Anything else -- a url of our own, an external one -- is fetched directly,
 * which is what `downloadDocumentFile` already handles, along with its
 * open-in-a-tab fallback.
 *
 * Errors are reported rather than thrown: the messages are written for the
 * person on the screen, and a download is not worth taking a page down for.
 */
const useDocumentDownload = () => {
  const { accessToken, refreshToken } = useAuth();

  return useCallback(
    async (fileUrl, fileName) => {
      const key = storageKeyFromUrl(fileUrl);

      if (!key) {
        try {
          await downloadDocumentFile(fileUrl, fileName);
        } catch (err) {
          showToast(err.message, "error");
        }
        return;
      }

      try {
        const blob = await imagesApi.GetFileBlob({
          key,
          accessToken,
          refreshToken,
        });
        if (!blob) throw new Error(DOCUMENT_FAILED);
        saveBlob(blob, fileName);
      } catch (err) {
        showToast(err?.message || DOCUMENT_FAILED, "error");
      }
    },
    [accessToken, refreshToken]
  );
};

export default useDocumentDownload;
