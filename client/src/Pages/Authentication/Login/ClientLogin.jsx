import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../AuthLayout";
import { PasswordInput, TextInput } from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import { showToast } from "../../../Helper/ShowToast";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { ClientLogin } from "../../../ReduxStore/features/authentication";

import { showValidationErrors } from "../../../Helper/formErrors";
// Validation schema 
const loginSchema = yup.object().shape({
  email: yup
    .string()
    .required("Email is required")
    .email("Please enter a valid email address"),
  password: yup
    .string()
    .required("Password is required")
    .min(8, "Password must be at least 8 characters"),
});

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const resultAction = await dispatch(ClientLogin(data));

      if (ClientLogin.fulfilled.match(resultAction)) {
        showToast("Login successful", "success");
        navigate("/dashboard");
      } else {
        const errorMessage = resultAction.payload?.message || resultAction.payload || "Login failed";
        showToast(errorMessage, "error");
      }
    } catch (error) {
      console.error("Login error:", error);
      showToast("Login failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit(onSubmit, showValidationErrors)}>
        <h1 className="text-center">Welcome to your Client Portal!</h1>
        <p className="text-center mt-4">Please login to your account</p>

        <div className="py-24 space-y-5">
          <TextInput
            required
            label="Email"
            placeholder="Enter email"
            type="email"
            {...register("email")}
            error={errors.email?.message}
          />

          <PasswordInput
            required
            label="Password"
            placeholder="Password"
            {...register("password")}
            error={errors.password?.message}
          />

          <div className="text-right">
            <Link
              to="/forgotPassword"
              className="text-blue-600 text-sm font-semibold hover:underline"
            >
              Forgot password?
            </Link>
          </div>
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

export default Login;
