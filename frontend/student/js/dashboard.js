async function loadDashboard() {
  try {
    // Get dashboard summary
    const response = await apiRequest("/dashboard/summary");

    if (!response.success) {
      throw new Error(response.message || "Failed to load dashboard");
    }

    const data = response.data;

    // Welcome text
    document.getElementById("welcomeText").textContent = `Welcome, Student 👋`;

    // Stats
    document.getElementById("detailsStatus").textContent = data.details_submitted
      ? "✅ Submitted"
      : "❌ Not Submitted";

    document.getElementById("choicesCount").textContent = data.choices_filled
      ? "✅ Filled"
      : "❌ Not Filled";

    document.getElementById("allotmentRound").textContent =
      data.allotment_status || "Not started";

    // Notifications (not in response, fallback to 0)
    document.getElementById("notifCount").textContent = `0 unread`;

    // Announcements (placeholder)
    const annList = document.getElementById("announcementList");
    annList.innerHTML = "";
    const placeholder = document.createElement("li");
    placeholder.textContent = "No announcements yet.";
    annList.appendChild(placeholder);

    // 🔹 Fetch latest submission for review status
    const subRes = await apiRequest("/submissions/latest");
    let reviewStatus = "❌ Not Submitted";
    let submissionStatus = null;

    if (subRes.submission) {
      submissionStatus = subRes.submission.status; // pending / approved / rejected
      if (submissionStatus === "pending") {
        reviewStatus = "⏳ Pending (Admin review)";
      } else if (submissionStatus === "approved") {
        reviewStatus = "✅ Approved";
      } else if (submissionStatus === "rejected") {
        reviewStatus = `❌ Rejected (Attempts left: ${subRes.attempts_left})`;
      }
    } else {
      reviewStatus = `❌ Not Submitted (Attempts left: ${subRes.attempts_left})`;
    }

    // Update review status card
    const reviewEl = document.getElementById("reviewStatus");
    if (reviewEl) reviewEl.textContent = reviewStatus;

    // 🔹 Progress tracker
    const steps = ["details", "review", "choices", "allotted", "confirmed"];
    let currentStage = "details";

    if (data.details_submitted) {
      currentStage = "review";

      if (submissionStatus === "approved") {
        currentStage = "choices";
      }
    }

    if (data.choices_filled) {
      currentStage = "choices";
    }

    if (data.allotment_status && data.allotment_status !== "Not Allotted") {
      currentStage = "allotted";
    }

    steps.forEach((step) => {
      if (steps.indexOf(step) <= steps.indexOf(currentStage)) {
        document.getElementById("step-" + step).classList.add("active");
      }
    });
  } catch (err) {
    console.error("Dashboard load error", err);
  }
}



loadDashboard();
