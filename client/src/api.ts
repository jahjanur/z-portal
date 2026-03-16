import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL
  ?? (import.meta.env.DEV ? "http://localhost:4001" : "");

/** Build full URL for a file path (e.g. /uploads/xyz.png). Ensures path starts with /. */
export function getFileUrl(filePath: string | undefined | null): string {
  if (!filePath) return "";
  const path = filePath.startsWith("/") ? filePath : `/${filePath}`;
  return `${API_BASE_URL}${path}`;
}

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;