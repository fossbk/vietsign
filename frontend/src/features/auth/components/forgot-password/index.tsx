"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { Button, Form, Input, message } from "antd";
import { AlertCircle, Mail, ArrowLeft } from "lucide-react";
import Auth from "@/domain/entities/Auth";
import Loader from "@/shared/components/ui/Loader";

export const ForgotPassword: React.FC = () => {
  const [form] = Form.useForm();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const forgotPasswordMutation = useMutation({
    mutationFn: (email: string) => Auth.forgotPassword(email),
    onSuccess: (res) => {
      setIsSubmitted(true);
      setError(null);
      message.success("Đã gửi email hướng dẫn đặt lại mật khẩu!");
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Có lỗi xảy ra. Vui lòng thử lại.";
      setError(errorMessage);
    },
  });

  const handleSubmit = (values: any) => {
    setError(null);
    setSubmittedEmail(values.email);
    forgotPasswordMutation.mutate(values.email);
  };

  if (forgotPasswordMutation.isPending) {
    return <Loader />;
  }

  // Hiển thị kết quả sau khi gửi thành công
  if (isSubmitted) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 animate-in fade-in slide-in-from-bottom-2">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Nhập email của bạn
            </h2>
            <p className="text-gray-500 mb-6">
              Truy cập email để đặt lại mật khẩu:
              <br />
              <span className="font-semibold text-primary-600">{submittedEmail}</span>
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-amber-800">
              <strong>Lưu ý:</strong> Link đặt lại mật khẩu sẽ hết hạn sau 15 phút.
              Nếu bạn không nhận được email, vui lòng kiểm tra thư mục spam.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              type="default"
              className="w-full h-10"
              onClick={() => {
                setIsSubmitted(false);
                form.resetFields();
              }}
            >
              Gửi lại email
            </Button>

            <Link href="/login">
              <Button
                type="primary"
                className="w-full bg-primary-600 hover:bg-primary-700 h-10 font-semibold"
              >
                Quay lại đăng nhập
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 animate-in fade-in slide-in-from-bottom-2">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Quên mật khẩu?
        </h2>
        <p className="text-center text-gray-500 mb-8">
          Nhập email đăng ký tài khoản của bạn
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
          name="forgot_password_form"
          className="space-y-5"
          onFinish={handleSubmit}
          layout="vertical"
        >
          <Form.Item
            label="Địa chỉ Email"
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email!" },
              { type: "email", message: "Email không hợp lệ!" },
            ]}
          >
            <Input
              placeholder="you@example.com"
              className="py-2"
              prefix={<Mail className="text-gray-400" size={16} />}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full bg-primary-600 hover:bg-primary-700 h-10 font-semibold"
            >
              Gửi email
            </Button>
          </Form.Item>
        </Form>

        <p className="mt-6 text-center text-gray-600">
          Đã có tài khoản?{" "}
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

export default ForgotPassword;
