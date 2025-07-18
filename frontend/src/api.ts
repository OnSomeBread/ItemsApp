import axios from "axios";

const BACKEND_ADDRESS: string = import.meta.env.VITE_BACKEND_SERVER as string;
const api = axios.create({
  baseURL: BACKEND_ADDRESS,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
