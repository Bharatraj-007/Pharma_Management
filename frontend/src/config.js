const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || (
  typeof window !== 'undefined' && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:5001"
    : "https://pharma-management-ioat.onrender.com"
);

export async function safeJson(res) {
  try {
    const text = await res.text();
    if (!text || !text.trim()) return {};
    return JSON.parse(text);
  } catch (err) {
    return {};
  }
}

export default API_BASE_URL;

