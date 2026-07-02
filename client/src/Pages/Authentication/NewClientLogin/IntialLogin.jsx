import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import AuthLayout from "../AuthLayout";
import { PasswordInput, TextInput } from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import { showToast } from "../../../Helper/ShowToast";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ClientLogin } from "../../../ReduxStore/features/authentication";

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

const InitialLogin = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const { loading } = useSelector((state) => state.auth);

  const onSubmit = async (data) => {
    try {
      const resultAction = await dispatch(ClientLogin(data));

      if (ClientLogin.fulfilled.match(resultAction)) {
        // const user = resultAction.payload.data;
        showToast("Login successful", "success");

        navigate("/intialResetPassword");
      } else {
        // The thunk rejects with the backend message string, so read the
        // payload directly; fall back to a generic message.
        const errorMessage =
          resultAction.payload?.message || resultAction.payload || "Login failed";
        showToast(errorMessage, "error");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      showToast("An unexpected error occurred. Please try again.", "error");
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit(onSubmit)}>
        <h1 className="text-center">Welcome to your Client Portal!</h1>
        <p className="text-center mt-4">Please login to your account</p>

        <div className="py-24 space-y-5">
          <TextInput
            label="Email"
            placeholder="Please Enter your email"
            type="email"
            {...register("email")}
            error={errors.email?.message}
          />

          <PasswordInput
            label="Password"
            placeholder="Enter your Password"
            {...register("password")}
            error={errors.password?.message}
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

export default InitialLogin;
