import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../AuthLayout";
import { TextInput } from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import { showToast } from "../../../Helper/ShowToast";
import api from "../../../api/authApis";

import { showValidationErrors } from "../../../Helper/formErrors";
// Validation schema
const forgotPasswordSchema = yup.object().shape({
  email: yup
    .string()
    .required("Email is required")
    .email("Please enter a valid email address"),
});

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);

    setErrorMessage("");
    try {
      const response = await api.ClientForgetPassword({
        email: data.email,
      });
      if (response.data.message === "email sent successfully") {
        showToast("Password reset email sent successfully!", "success");
      } else {
        throw new Error("Failed to initiate password reset.");
      }
      navigate("/checkEmail", { state: { email: data.email } });
    } catch (error) {
      console.error("Forgot password error:", error);
      const msg =
        error?.response?.data?.message ||
        error.message ||
        "Failed to send reset email. Please try again.";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit(onSubmit, showValidationErrors)}>
        <h1 className="text-center">Forgot Password?</h1>
        <p className="text-center mt-4">
          No worries. Enter your email and we'll send you reset instructions
        </p>

        <div className="py-24 space-y-5">
          <TextInput
            required
            label="Email"
            placeholder="Enter your email"
            type="email"
            {...register("email")}
            error={errors.email?.message}
          />
        </div>
        {errors.email && (
          <p className="error-message">{errors.email.message}</p>
        )}
        {errorMessage && <p className="error-message">{errorMessage}</p>}

        <Button
          label="Reset password"
          variant="primary"
          size="large"
          className="w-full"
          type="submit"
          loading={loading}
        />

        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-blue-600 text-sm font-semibold hover:underline inline-flex items-center gap-2"
          >
            ← Back to Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default ForgotPassword;
