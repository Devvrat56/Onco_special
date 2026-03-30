const config = {
  // Auto-switch between local development and production backends
  API_BASE_URL: import.meta.env.DEV 
    ? 'http://localhost:8000/api/v1' 
    : 'https://backendscriber-production.up.railway.app/api/v1',
};

export default config;
