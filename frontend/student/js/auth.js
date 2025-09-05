// frontend/js/auth.js
(function () {
    const LOGIN_PAGE = "../index.html";

    function redirectToLogin() {
        localStorage.removeItem("userToken");
        window.location.href = LOGIN_PAGE;
    }

    async function checkAuth() {
        const token = localStorage.getItem("userToken");
        if (!token) return redirectToLogin();

        try {
            const res = await fetch("/api/auth/verify", {
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
        if (event.key === "userToken" && !event.newValue) redirectToLogin();
    });
})();
