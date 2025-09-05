// app.js
const BASE_URL = "http://localhost:3001/api";

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch (e) { return null; }
}
// 🔹 Special function for login/signup (no token needed)
async function apiLogin(endpoint, body) {
  const res = await fetch("http://localhost:3001/api" + endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json(); // always parse the response body

  if (!res.ok) {
    // Prefer server-provided message if available, else fallback to statusText
    throw new Error(data.message || res.statusText || "Login failed");
  }

  return data; // return the successful response (with token etc.)
}


async function apiRequest(endpoint, method = "GET", body = null) {
  const token = localStorage.getItem("adminToken");
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` })
    },
    body: body ? JSON.stringify(body) : null
  });

  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "Something went wrong");
    throw new Error(data.error);
  }
  return data;
}

function requireAuth(role, redirect = "index.html") {
  const token = localStorage.getItem("adminToken");
  if (!token) window.location.href = redirect;
  const user = parseJwt(token);
  if (!user) {
    localStorage.removeItem("adminToken");
    window.location.href = redirect;
  }
  if (role && user.role !== role) {
    alert("Access denied");
    window.location.href = redirect;
  }
  return user;
}
