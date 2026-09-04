import http from "@/core/services/api/http";

const Auth = {
  login: async (data: any) => {
    const response = await http.post("/auth/login", data);
    return response.data;
  },
  register: async (data: any) => {
    const response = await http.post("/auth/register", data);
    return response.data;
  },
  logout: async () => {
    const response = await http.post("/auth/logout");
    return response.data;
  },
  verifyToken: async () => {
    const response = await http.get("/auth/verify");
    return response.data;
  },
  forgotPassword: async (email: string) => {
    const response = await http.post("/auth/forgot-password", { email });
    return response.data;
  },
  resetPassword: async (token: string, password: string) => {
    const response = await http.post("/auth/reset-password", {
      token,
      password,
    });
    return response.data;
  },
};

export default Auth;
