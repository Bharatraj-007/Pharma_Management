const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || (
  typeof window !== 'undefined'
    ? (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:5001"
        : window.location.origin)
    : "http://localhost:5001"
);

export default API_BASE_URL;

