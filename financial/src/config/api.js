const rawApiUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.DEV ? "http://localhost:3001" : "");

export const API_URL = String(rawApiUrl).replace(/\/+$/, "");
