import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import AuthLayout from "../AuthLayout";
import { PasswordInput } from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import { showToast } from "../../../Helper/ShowToast";
import {
  passwordSchema,
  confirmPasswordSchema,
} from "../../../Helper/passwordValidation";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../../api/authApis";
// Validation schema. Both fields share the same rule set, so the confirm field
// is held to the identical strength policy — not just "must match".
const resetPasswordSchema = yup.object().shape({
  password: passwordSchema(),
  confirmPassword: confirmPasswordSchema("password"),
});

const InitialResetPassword = () => {
  const clientTenantId = useSelector((state) => state.auth?.user?.tenantLinks[0]?.id);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
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
      const response = await api.ClientSetPassword({
        clientTenantId,
        password: data.password,
      });

      const successMessage =
        response?.data?.message || "Password updated successfully!";
      showToast(successMessage, "success");
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
          className="w-full mt-4"
          type="submit"
          loading={loading}
        />
      </form>
    </AuthLayout>
  );
};

export default InitialResetPassword;
