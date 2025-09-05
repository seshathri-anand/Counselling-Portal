document.getElementById("studentLoginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const errorBox = document.getElementById("loginError");
    const loginBtn = document.getElementById("loginBtn");
    errorBox.style.display = "none"; 
    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    const identifier = e.target.identifier.value.trim();
    const password = e.target.password.value;

    // Decide whether it's an email or username
    const body = identifier.includes("@") 
    ? { email: identifier, password } 
    : { username: identifier, password };

    try {
    // ✅ Only pass endpoint + body (not fetch config)
    const data = await apiLogin("/auth/login", body);

    if (!data.token) throw new Error("No token returned");

    localStorage.setItem("userToken", data.token);
    window.location.href = "dashboard.html"; // redirect on success

    } catch (err) {
    errorBox.textContent = err.message;
    errorBox.style.display = "block";
    } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
    }
});
