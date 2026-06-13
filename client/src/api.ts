import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL
  ?? (import.meta.env.DEV ? "http://localhost:4001" : "");

/** Build a full, authenticated URL for a file path (e.g. /uploads/xyz.png).
 *  - External/absolute URLs and data URIs are returned unchanged.
 *  - Protected /uploads routes require the JWT; browsers can't set headers on
 *    <img>/<a> requests, so the token is passed as a same-origin query param. */
export function getFileUrl(filePath: string | undefined | null): string {
  if (!filePath) return "";
  // Pass through absolute/external URLs and data URIs unchanged.
  if (/^(https?:)?\/\//i.test(filePath) || filePath.startsWith("data:")) return filePath;
  const path = filePath.startsWith("/") ? filePath : `/${filePath}`;
  const url = `${API_BASE_URL}${path}`;
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
  if (token && path.startsWith("/uploads/")) {
    return `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
  }
  return url;
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