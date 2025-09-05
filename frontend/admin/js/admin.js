// Global variables
let allSubmissions = [];
let currentAction = { id: null, status: null };

// DOM elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const logoutBtn = document.getElementById('logoutBtn');
const allotBtn = document.getElementById('allotBtn');
const modal = document.getElementById('confirmationModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalCancel = document.getElementById('modalCancel');
const modalConfirm = document.getElementById('modalConfirm');
const toast = document.getElementById('toast');

// API request helper
async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`http://localhost:3001/api${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("adminToken")}`
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (err) {
    console.error("API request failed:", err);
    showToast("API request failed. Please try again.", false);
    throw err;
  }
}

// Toast utility
function showToast(msg, isSuccess = true) {
  toast.textContent = msg;
  toast.className = isSuccess ? "toast success" : "toast error";
  setTimeout(() => { toast.className = "toast"; }, 3001);
}

// Format date
function formatDate(d) {
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
}

// Fetch submissions
async function fetchSubmissions() {
  try {
    const data = await apiRequest("/admin/submissions");
    allSubmissions = data.submissions || [];
    updateStatistics();
    renderTables();
  } catch (err) {
    document.getElementById("pending-loading").textContent = "Error loading submissions";
    document.getElementById("approved-loading").textContent = "Error loading submissions";
    document.getElementById("rejected-loading").textContent = "Error loading submissions";
  }
}

// Stats cards
function updateStatistics() {
  const total = allSubmissions.length;
  const pending = allSubmissions.filter(s => s.status === "pending").length;
  const approved = allSubmissions.filter(s => s.status === "approved").length;
  const rejected = allSubmissions.filter(s => s.status === "rejected").length;

  document.getElementById("totalSubmissions").textContent = total;
  document.getElementById("pendingSubmissions").textContent = pending;
  document.getElementById("approvedSubmissions").textContent = approved;
  document.getElementById("rejectedSubmissions").textContent = rejected;
}

// Render tables (pending/approved/rejected)
function renderTables() {
  renderTable("pending");
  renderTable("approved");
  renderTable("rejected");
}

function renderTable(status) {
  const rows = allSubmissions.filter(s => s.status === status);
  const tableBody = document.getElementById(`${status}-table-body`);
  const table = document.getElementById(`${status}-table`);
  const loading = document.getElementById(`${status}-loading`);
  const emptyState = document.getElementById(`${status}-empty`);

  tableBody.innerHTML = "";

  if (rows.length === 0) {
    table.style.display = "none";
    loading.style.display = "none";
    emptyState.style.display = "block";
    return;
  }

  loading.style.display = "none";
  emptyState.style.display = "none";
  table.style.display = "table";

  rows.forEach(sub => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${sub.submission_id}</td>
      <td>${sub.full_name}</td>
      <td>${sub.marksheet_number}</td>
      <td>${sub.physics}</td>
      <td>${sub.chemistry}</td>
      <td>${sub.maths}</td>
      <td>${sub.cutoff}</td>
      <td>${formatDate(sub.dob)}</td>
      <td>${formatDate(sub.submitted_at)}</td>
      <td><span class="status-badge status-${status}">${status}</span></td>
      ${status === "pending" ? `
        <td>
          <button class="action-btn approve-btn" data-id="${sub.submission_id}">Approve</button>
          <button class="action-btn reject-btn" data-id="${sub.submission_id}">Reject</button>
        </td>` : ""}
    `;
    tableBody.appendChild(row);
  });

  // Attach listeners only for pending
  if (status === "pending") {
    tableBody.querySelectorAll(".approve-btn").forEach(btn =>
      btn.addEventListener("click", e => showConfirmationModal(e.target.dataset.id, "approved"))
    );
    tableBody.querySelectorAll(".reject-btn").forEach(btn =>
      btn.addEventListener("click", e => showConfirmationModal(e.target.dataset.id, "rejected"))
    );

  }
}

// Confirmation modal
function showConfirmationModal(id, status) {
  currentAction = { id, status };
  const sub = allSubmissions.find(s => s.submission_id == id);
  const actionText = status === "approved" ? "approve" : "reject";

  modalTitle.textContent = `Confirm ${actionText}`;
  modalMessage.textContent = `Are you sure you want to ${actionText} ${sub.full_name}'s submission (Marksheet: ${sub.marksheet_number})?`;
  modal.style.display = "flex";
}

// Update status
async function updateSubmissionStatus(id, status) {
  try {
    await apiRequest(`/admin/submissions/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    const idx = allSubmissions.findIndex(s => s.submission_id == id);
    if (idx !== -1) allSubmissions[idx].status = status;
    showToast(`Submission ${status} successfully!`);
    updateStatistics();
    renderTables();
  } catch {
    showToast("Failed to update submission.", false);
  }
}

// Increase attempt
async function increaseAttempt(studentId) {
  try {
    await apiRequest(`/admin/submission-overrides/${studentId}/attempts`, {
      method: "PATCH"
    });
    showToast("Attempt increased for student!");
  } catch {
    showToast("Failed to increase attempt.", false);
  }
}

// Run allotment
async function runAllotment() {
  try {
    allotBtn.disabled = true;
    allotBtn.textContent = "Processing...";
    await apiRequest("/admin/allotments", { method: "POST" });
    showToast("Seat allotment completed!");
  } catch {
    showToast("Failed to run seat allotment.", false);
    allotBtn.disabled = false;
  } finally {
    
    allotBtn.textContent = "Run Seat Allotment";
  }
}

// Event bindings
tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    tabButtons.forEach(b => b.classList.remove("active"));
    tabPanes.forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`${btn.dataset.tab}-tab`).classList.add("active");
  });
});
modalCancel.addEventListener("click", () => modal.style.display = "none");
modalConfirm.addEventListener("click", () => {
  modal.style.display = "none";
  updateSubmissionStatus(currentAction.id, currentAction.status);
});
allotBtn.addEventListener("click", runAllotment);
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("adminToken");
  window.location.href = "/admin/login.html";
});

// Init
document.addEventListener("DOMContentLoaded", fetchSubmissions);
