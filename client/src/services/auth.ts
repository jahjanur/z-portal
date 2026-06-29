import API from "../api";

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    role: string;
    name: string;
    nickname?: string | null;
    avatarEmoji?: string | null;
    skills?: string[];
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

