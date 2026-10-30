import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

// UploadImage function to handle file uploads
const UploadImage = async ({ formData, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.post(`${PLAIN_API_URL}/images/client/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    // Normalize response to match frontend expectations
    return {
      success: res.data.success,
      data: res.data.data || [],
      error: res.data.error || null,
    };
  } catch (e) {
    // Handle error response from backend
    const errorMessage = e.response?.data?.error || "Image upload failed";
    return {
      success: false,
      error: errorMessage,
      data: [],
    };
  }
};

export default { UploadImage };