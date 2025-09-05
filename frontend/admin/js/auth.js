// frontend/admin/js/auth.js
(function () {
    const LOGIN_PAGE = "../index.html";

    function redirectToLogin() {
        localStorage.removeItem("adminToken");
        window.location.href = LOGIN_PAGE;
    }

    async function checkAuth() {
        const token = localStorage.getItem("adminToken");
        if (!token) return redirectToLogin();

        try {
            const res = await fetch("/api/admin/auth/verify", {
                headers: { Authorization: "Bearer " + token }
            });
            if (!res.ok) return redirectToLogin();
        } catch (err) {
            console.error("Auth verification failed:", err);
            redirectToLogin();
        }
    }

    // Run immediately
    checkAuth();

    // bfcache restore
    window.addEventListener("pageshow", (event) => {
        if (event.persisted) checkAuth();
    });

    // Cross-tab logout sync
    window.addEventListener("storage", (event) => {
        if (event.key === "adminToken" && !event.newValue) redirectToLogin();
    });
})();
