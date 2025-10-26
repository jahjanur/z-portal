import axios from "axios";

const API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:4000"
  : "https://your-production-api.com";

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