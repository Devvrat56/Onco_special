// Read runtime configuration from Vite env variables with safe fallbacks.
// Use `VITE_` prefix so Vite exposes these as `import.meta.env.VITE_*`.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://backend-scriber.onrender.com/api/v1';
const API_USER = import.meta.env.VITE_API_USER || 'https://backend-scriber.onrender.com';
const API_URL = import.meta.env.VITE_API_URL || 'https://backend-scriber.onrender.com';

const config = {
  API_BASE_URL,
  api_user: API_USER,
  api_url: API_URL,
};

export default config;
