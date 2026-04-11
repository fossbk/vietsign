"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { Button, Form, Input, message } from "antd";
import { AlertCircle, CheckCircle } from "lucide-react";
import Auth from "@/domain/entities/Auth";
import Loader from "@/shared/components/ui/Loader";
import { supabase } from "@/core/lib/supabaseClient";

export const ResetPassword: React.FC = () => {
  const [form] = Form.useForm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("checking"); // checking, success, error, ready

  useEffect(() => {
    const initializeResetFlow = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setStatus("ready");
        return;
      }
      const queryParam = new URLSearchParams(window.location.search);
      const code = queryParam.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError(error.message);
          setStatus("error");
          return;
        } else {
          setStatus("ready");
        }
      } else {
        setStatus("error");
      }
    };

    initializeResetFlow();
  }, []);

  const resetPasswordMutation = useMutation({
    mutationFn: ({
      token,
      newPassword,
    }: {
      token: string;
      newPassword: string;
    }) => Auth.resetPassword(token, newPassword),
    onSuccess: (res) => {
      setIsSuccess(true);
      setError(null);
      message.success("Đặt lại mật khẩu thành công!");
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Có lỗi xảy ra. Vui lòng thử lại.";
      setError(errorMessage);
    },
  });

  const handleSubmit = async (values: any) => {
    const newPassword = values.password;
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setError(error.message);
      message.error(error.message);
    } else {
      setIsSuccess(true);
      message.success("Mật khẩu đã được cập nhật thành công!");
    }
  };

  if (resetPasswordMutation.isPending) {
    return <Loader />;
  }

  // Hiển thị kết quả thành công
  if (isSuccess) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 animate-in fade-in slide-in-from-bottom-2">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Thành công!
            </h2>
            <p className="text-gray-500 mb-8">
              Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập với mật
              khẩu mới.
            </p>
          </div>

          <Link href="/login">
            <Button
              type="primary"
              className="w-full bg-primary-600 hover:bg-primary-700 h-10 font-semibold"
            >
              Đăng nhập ngay
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Kiểm tra token không hợp lệ
  if (status === "error") {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 animate-in fade-in slide-in-from-bottom-2">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Link không hợp lệ
            </h2>
            <p className="text-gray-500 mb-8">
              Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
            </p>
          </div>

          <Link href="/forgot-password">
            <Button
              type="primary"
              className="w-full bg-primary-600 hover:bg-primary-700 h-10 font-semibold"
            >
              Yêu cầu đặt lại mật khẩu
            </Button>
          </Link>

          <p className="mt-6 text-center text-gray-600">
            Nhớ mật khẩu rồi?{" "}
            <Link
              href="/login"
              className="text-primary-600 font-semibold hover:underline"
            >
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 animate-in fade-in slide-in-from-bottom-2">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Đặt lại mật khẩu
        </h2>
        <p className="text-center text-gray-500 mb-8">
          Nhập mật khẩu mới cho tài khoản của bạn
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Có lỗi xảy ra</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        <Form
          form={form}
          name="reset_password_form"
          className="space-y-5"
          onFinish={handleSubmit}
          layout="vertical"
        >
          <Form.Item
            label="Mật khẩu mới"
            name="password"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu mới!" },
              { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự!" },
            ]}
          >
            <Input.Password
              placeholder="••••••••"
              className="py-2"
              prefix={<Lock className="text-gray-400" size={16} />}
            />
          </Form.Item>

          <Form.Item
            label="Xác nhận mật khẩu"
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Vui lòng xác nhận mật khẩu!" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("Mật khẩu xác nhận không khớp!"),
                  );
                },
              }),
            ]}
          >
            <Input.Password
              placeholder="••••••••"
              className="py-2"
              prefix={<Lock className="text-gray-400" size={16} />}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full bg-primary-600 hover:bg-primary-700 h-10 font-semibold"
            >
              Đặt lại mật khẩu
            </Button>
          </Form.Item>
        </Form>

        <p className="mt-6 text-center text-gray-600">
          Nhớ mật khẩu rồi?{" "}
          <Link
            href="/login"
            className="text-primary-600 font-semibold hover:underline"
          >
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
