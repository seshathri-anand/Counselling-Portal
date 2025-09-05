document.getElementById("adminLoginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const errorBox = document.getElementById("loginError");
    const loginBtn = document.getElementById("loginBtn");
    errorBox.style.display = "none"; 
    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    const body = {
    email: e.target.email.value.trim(),
    password: e.target.password.value
    };

    try {
    const data = await apiLogin("/admin/login", body);
    if (!data.token) throw new Error("No token returned");

    localStorage.setItem("adminToken", data.token);
    window.location.href = "admin.html"; // redirect after login

    } catch (err) {
    errorBox.textContent = err.message;
    errorBox.style.display = "block";
    } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
    }
});