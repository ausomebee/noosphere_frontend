import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useNavigate, useParams } from "react-router-dom";
import AuthLayout from "../AuthLayout";
import { PasswordInput } from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import { showToast } from "../../../Helper/ShowToast";
import api from "../../../api/authApis";
import {
  passwordSchema,
  confirmPasswordSchema,
} from "../../../Helper/passwordValidation";

// Validation schema. Confirm is held to the same strength rules as the password.
const changePasswordSchema = yup.object().shape({
  password: passwordSchema(),
  confirmPassword: confirmPasswordSchema("password"),
});

const ChangePassword = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { clientTenantId } = useParams();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(changePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);

    try {
      const response = await api.ClientSetPassword({
        clientTenantId,
        password: data.password,
      });

      const successMessage =
        response?.data?.message || "Password updated successfully!";
      showToast(successMessage, "success");
      navigate("/");
    } catch (error) {
      console.error("Change password error:", error);
      showToast("Failed to reset password. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit(onSubmit)}>
        <h1 className="text-center">Reset Password</h1>
        <p className="text-center mt-4">
          Please create a secure password for your account
        </p>

        <div className="py-24 space-y-5">
          <PasswordInput
            label="Enter password"
            placeholder="Enter Password"
            {...register("password")}
            error={errors.password?.message}
            showStrength
          />

          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm Password"
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message}
            matchValue={watch("password") || ""}
          />
        </div>

        <Button
          label="Continue"
          variant="primary"
          size="large"
          className="w-full"
          type="submit"
          loading={loading}
        />
      </form>
    </AuthLayout>
  );
};

export default ChangePassword;
