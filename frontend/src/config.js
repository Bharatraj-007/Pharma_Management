const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || (
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5001"
    : "https://pharma-management-cpqx.onrender.com"
);

export default API_BASE_URL;
