import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../AuthLayout";
import { TextInput } from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import { showToast } from "../../../Helper/ShowToast";

// Validation schema
const forgotPasswordSchema = yup.object().shape({
  email: yup
    .string()
    .required("Email is required")
    .email("Please enter a valid email address"),
});

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Simulate API call
      console.log("Form submitted:", data);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Handle successful submission
      showToast("Reset instructions sent to your email!", "success");
      navigate("/checkEmail");
    } catch (error) {
      console.error("Forgot password error:", error);
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit(onSubmit)}>
        <h1 className="text-center">Forgot Password?</h1>
        <p className="text-center mt-4">
          No worries. Enter your email and we'll send you reset instructions
        </p>

        <div className="py-24 space-y-5">
          <TextInput
            label="Email"
            placeholder="Enter your email"
            type="email"
            {...register("email")}
            error={errors.email?.message}
          />
        </div>

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