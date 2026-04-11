"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, CheckCircle, Lock, Mail, User } from "lucide-react";
import Auth from "@/domain/entities/Auth";
import { Button, Form, Input, message } from "antd";

import { useMutation } from "@tanstack/react-query";
import Loader from "@/shared/components/ui/Loader";

import { supabase } from "@/core/lib/supabaseClient";

export const Register: React.FC = () => {
  const [form] = Form.useForm();
  const router = useRouter();

  const registerMutation = useMutation({
    mutationFn: async (values: any) => {
      // 1. Đăng ký với Supabase để gửi email xác thực
      const { data: supabaseData, error: supabaseError } =
        await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: {
              full_name: values.name,
            },
          },
        });

      if (supabaseError) {
        // Nếu lỗi do email đã tồn tại bên Supabase hoặc lỗi khác
        throw new Error(supabaseError.message);
      }

      // 2. Gọi backend cũ để lưu thông tin vào MySQL (nếu cần sync)
      // Lưu ý: Backend có thể trả về 409 nếu email đã tồn tại trong MySQL
      const backendRes = await Auth.register(values);
      return { backendRes, supabaseData };
    },
    onSuccess: async ({ backendRes, supabaseData }) => {
      if (supabaseData.session) {
        // Trường hợp đã tắt Email Confirmation hoặc auto-confirm
        message.success("Đăng ký thành công! Bạn có thể đăng nhập ngay.");
      } else {
        // Trường hợp cần xác thực email
        message.success(
          "Đăng ký thành công! Vui lòng kiểm tra email (hộp thư đến hoặc Spam) để xác thực tài khoản.",
        );
      }
      router.push("/login");
    },
    onError: (error: Error) => {
      // Xử lý thông báo lỗi thân thiện hơn
      if (
        error.message.includes("User already exists") ||
        error.message.includes("409")
      ) {
        message.error("Email này đã được sử dụng. Vui lòng dùng email khác.");
      } else {
        message.error(error.message);
      }
    },
  });

  const handleSubmit = (values: any) => {
    registerMutation.mutate(values);
  };

  if (registerMutation.isPending) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 animate-in fade-in slide-in-from-bottom-2">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Đăng ký tài khoản
        </h2>
        <p className="text-center text-gray-500 mb-8">
          Bắt đầu hành trình học ASL của bạn
        </p>

        <Form
          form={form}
          name="register_form"
          className="space-y-5"
          onFinish={handleSubmit}
          layout="vertical"
        >
          <Form.Item
            label="Họ và tên"
            name="name"
            rules={[{ required: true, message: "Vui lòng nhập họ và tên!" }]}
          >
            <Input
              placeholder="Nguyen Van A"
              className="py-2"
              prefix={<User className="text-gray-400" size={16} />}
            />
          </Form.Item>

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

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full bg-primary-600 hover:bg-primary-700 h-10 font-semibold"
            >
              Đăng ký
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

export default Register;
