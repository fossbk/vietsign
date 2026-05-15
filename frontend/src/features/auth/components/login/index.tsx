"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { login } from "@/core/store/slices/adminSlice";
import { Copy, CheckCircle, AlertCircle, Lock, Mail } from "lucide-react";
import Auth from "@/domain/entities/Auth";
import UserModel, { mapRoleCode } from "@/domain/entities/User";
import { Button, Form, Input, message } from "antd";

import { useMutation } from "@tanstack/react-query";
import Loading from "@/app/loading";

const Login: React.FC = () => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const router = useRouter();
  const [loginError, setLoginError] = useState<string | null>(null);

  const [isRedirecting, setIsRedirecting] = useState(false);

  const loginMutation = useMutation({
    mutationFn: Auth.login,
    onSuccess: async (res: any) => {
      setIsRedirecting(true);
      try {
        // Backend chỉ trả về accessToken
        const accessToken = res.accessToken || res.access_token;

        localStorage.setItem("access_token", accessToken);

        // Lấy thông tin profile từ backend
        const userProfile = await UserModel.getProfile();

        // Map role code từ backend sang frontend role format
        const userData = {
          ...userProfile.user,
          id: userProfile.user.user_id, // Alias for convenience
          organizationId: userProfile.user.organization_id, // Normalize to camelCase
          role: mapRoleCode(userProfile.user.code || "USER"),
        };

        dispatch(login(userData));
        localStorage.setItem("user", JSON.stringify(userData));
        message.success("Đăng nhập thành công");
        router.push("/home");
      } catch (error) {
        console.error("Profile fetch error:", error);
        setIsRedirecting(false); // Reset if profile fetch fails
        setLoginError("Không thể lấy thông tin người dùng.");
      }
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Đăng nhập thất bại. Vui lòng thử lại.";
      setLoginError(errorMessage);
    },
  });

  const handleSubmit = (values: any) => {
    setLoginError(null); // Clear previous error
    loginMutation.mutate(values);
  };

  if (loginMutation.isPending || isRedirecting) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-gray-50 px-4">
      {/* Form Đăng nhập */}
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 m-5">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Đăng nhập VietSignSchool
        </h2>

        {/* Thông báo lỗi đăng nhập */}
        {loginError && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Đăng nhập thất bại
              </p>
              <p className="text-sm text-red-600 mt-1">{loginError}</p>
            </div>
          </div>
        )}

        <Form
          form={form}
          name="login_form"
          className="space-y-6"
          onFinish={handleSubmit}
          layout="vertical"
        >
          <Form.Item
            label="Tài khoản / Email"
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email!" },
              { type: "email", message: "Email không hợp lệ!" },
            ]}
          >
            <Input
              placeholder="Nhập email hoặc tên tài khoản"
              className="py-2"
              prefix={<Mail className="text-gray-400" size={16} />}
            />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu!" }]}
          >
            <Input.Password
              placeholder="••••••••"
              className="py-2"
              prefix={<Lock className="text-gray-400" size={16} />}
            />
          </Form.Item>

          {/* Quên mật khẩu */}
          <div className="flex justify-end -mt-2 mb-4">
            <Link
              href="/forgot-password"
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full bg-primary-600 hover:bg-primary-700 h-10 font-semibold"
            >
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>

        <p className="mt-6 text-center text-gray-500">
          Chưa có tài khoản?{" "}
          <Link
            href="/register"
            className="text-primary-600 font-semibold hover:underline"
          >
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
