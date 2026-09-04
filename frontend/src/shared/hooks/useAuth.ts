/**
 * Auth Hooks
 * 
 * React Query hooks để xử lý authentication.
 */

"use client";

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { message } from 'antd';
import AuthModel from '@/domain/entities/Auth';
import UserModel, { mapRoleCode } from '@/domain/entities/User';
import { login, logout } from '@/core/store/slices/adminSlice';

/**
 * Hook để đăng nhập
 */
export function useLogin() {
    const router = useRouter();
    const dispatch = useDispatch();

    return useMutation({
        mutationFn: (credentials: { email: string; password: string }) => 
            AuthModel.login(credentials),
        onSuccess: async (res) => {
            // Lưu access token
            const accessToken = res.accessToken || res.access_token;
            localStorage.setItem("access_token", accessToken);

            // Lấy profile từ API
            const userProfile = await UserModel.getProfile();
            
            // Map role code sang frontend format
            const userData = {
                ...userProfile.user,
                role: mapRoleCode(userProfile.user.code || 'USER')
            };

            // Dispatch vào Redux store
            dispatch(login(userData));
            localStorage.setItem("user", JSON.stringify(userData));
            
            message.success("Đăng nhập thành công");
            router.push("/home");
        },
        onError: (error: any) => {
            const errorMessage = error?.response?.data?.message
                || error?.response?.data?.error
                || error?.message
                || "Đăng nhập thất bại. Vui lòng thử lại.";
            message.error(errorMessage);
        },
    });
}

/**
 * Hook để đăng ký
 */
export function useRegister() {
    const router = useRouter();

    return useMutation({
        mutationFn: (data: { name: string; email: string; password: string; phone_number?: string }) => 
            AuthModel.register(data),
        onSuccess: () => {
            message.success("Đăng ký thành công! Vui lòng đợi admin phê duyệt tài khoản.");
            router.push("/login");
        },
        onError: (error: any) => {
            const errorMessage = error?.response?.data?.message
                || error?.message
                || "Đăng ký thất bại. Vui lòng thử lại.";
            message.error(errorMessage);
        },
    });
}

/**
 * Hook để quên mật khẩu
 */
export function useForgotPassword() {
    return useMutation({
        mutationFn: (email: string) => AuthModel.forgotPassword(email),
        onSuccess: (res) => {
            message.success(res.message || "Vui lòng kiểm tra email để đặt lại mật khẩu.");
        },
        onError: (error: any) => {
            message.error(error?.response?.data?.message || "Có lỗi xảy ra. Vui lòng thử lại.");
        },
    });
}

/**
 * Hook để đặt lại mật khẩu
 */
export function useResetPassword() {
    const router = useRouter();

    return useMutation({
        mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) => 
            AuthModel.resetPassword(token, newPassword),
        onSuccess: (res) => {
            message.success(res.message || "Đặt lại mật khẩu thành công!");
            router.push("/login");
        },
        onError: (error: any) => {
            message.error(error?.response?.data?.message || "Token không hợp lệ hoặc đã hết hạn.");
        },
    });
}

/**
 * Hook để đăng xuất
 */
export function useLogout() {
    const router = useRouter();
    const dispatch = useDispatch();

    const handleLogout = async () => {
        try {
            await AuthModel.logout();
        } catch (error) {
            console.error("Logout API failed:", error);
        } finally {
            dispatch(logout());
            router.push("/");
        }
    };

    return { logout: handleLogout };
}
