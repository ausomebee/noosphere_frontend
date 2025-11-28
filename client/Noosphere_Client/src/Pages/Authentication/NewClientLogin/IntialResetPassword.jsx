import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import AuthLayout from "../AuthLayout";
import { PasswordInput } from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import { showToast } from "../../../Helper/ShowToast";
import { useNavigate } from "react-router-dom";

// Validation schema
const resetPasswordSchema = yup.object().shape({
  password: yup
    .string()
    .required("Password is required")
    .min(8, "Password must be at least 8 characters")
    .matches(/[A-Z]/, "Password must contain at least one uppercase letter")
    .matches(/[a-z]/, "Password must contain at least one lowercase letter")
    .matches(/[0-9]/, "Password must contain at least one number")
    .matches(
      /[!@#$%^&*(),.?":{}|<>]/,
      "Password must contain at least one special character"
    ),
  confirmPassword: yup
    .string()
    .required("Confirm password is required")
    .oneOf([yup.ref("password")], "Passwords must match"),
});

const InitialResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Simulate API call
      console.log("Form submitted:", data);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Handle successful password reset here
      showToast("Password reset successful!", "success");
      navigate("/intialResetSuccessful");
    } catch (error) {
      console.error("Reset password error:", error);
      showToast("Password reset failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit(onSubmit)}>
        <h1 className="text-center">Please create a new and secure password</h1>

        <div className="py-24 space-y-5">
          <PasswordInput
            label="Enter password"
            placeholder="Enter Password"
            {...register("password")}
            error={errors.password?.message}
          />

          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm Password"
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message}
          />
        </div>

        <Button
          label="Continue"
          variant="primary"
          size="large"
          className="w-full mt-4"
          type="submit"
          loading={loading}
        />
      </form>
    </AuthLayout>
  );
};

export default InitialResetPassword;
