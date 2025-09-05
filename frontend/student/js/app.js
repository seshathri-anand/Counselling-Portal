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
  const token = localStorage.getItem("userToken");

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` })
    },
    body: body ? JSON.stringify(body) : null
  });

  let data;
  try {
    data = await res.json();
  } catch (err) {
    data = {}; // fallback if response is empty or invalid JSON
  }

  if (!res.ok) {
    // Throw the whole data object so UI can parse it
    throw data;
  }

  return data;
}

// async function apiRequest(endpoint, method = "GET", body = null) {
//   const token = localStorage.getItem("userToken");
//   const res = await fetch(`${BASE_URL}${endpoint}`, {
//     method,
//     headers: {
//       "Content-Type": "application/json",
//       ...(token && { Authorization: `Bearer ${token}` })
//     },
//     body: body ? JSON.stringify(body) : null
//   });

//   const data = await res.json();
//   if (!res.ok) {
//     alert(data.error || "Something went wrong");
//     throw new Error(data.error);
//   }
//   return data;
// }

// async function apiRequest(endpoint, method = "GET", body = null) {
//   try {
//     const options = {
//       method,
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": `Bearer ${localStorage.getItem("adminToken")}`
//       },
//     };
//     if (body) options.body = JSON.stringify(body);

//     const response = await fetch(`http://localhost:3001/api${endpoint}`, options);

//     const data = await response.json(); // parse JSON regardless of status

//     if (!response.ok) {
//       // Throw the actual backend data instead of generic error
//       throw data;
//     }
//     return data;
//   } catch (err) {
//     console.error("API request failed:", err);
//     showToast("API request failed. Please try again.", false);
//     throw err; // now frontend can read err.error and err.message
//   }
// }

function requireAuth(role, redirect = "index.html") {
  const token = localStorage.getItem("userToken");
  if (!token) window.location.href = redirect;
  const user = parseJwt(token);
  if (!user) {
    localStorage.removeItem("userToken");
    window.location.href = redirect;
  }
  if (role && user.role !== role) {
    alert("Access denied");
    window.location.href = redirect;
  }
  return user;
}

function logout() {
  localStorage.removeItem("userToken");
  window.location.href = "login.html";
}