import API from "../api";

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    role: string;
    name: string;
  };
}


export async function login(email: string, password: string): Promise<LoginResponse> {
  try {
    const res = await API.post<LoginResponse>("/auth/login", { email, password });
    return res.data;
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "response" in error) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || "Login failed";
      throw new Error(msg);
    }
    throw new Error("Login failed");
  }
}

export async function registerUser(email: string, password: string, role = "USER") {
  try {
    const res = await API.post("/auth/register", { email, password, role, name });
    return res.data;
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "response" in error) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || "Registration failed";
      throw new Error(msg);
    }
    throw new Error("Registration failed");
  }
}