async function loadAllotment() {
  try {
    const response = await apiRequest("/allotments");
    const box = document.getElementById("statusBox");

    if (!response.success) {
      box.innerHTML = `<p>Error: ${response.error || "Unknown error"}</p>`;
      return;
    }

    if (response.status === "NO_RECORD") {
      box.innerHTML = `<p>Please wait for the counselling process to begin.</p>`;
      return;
    }

    if (response.status === "NOT_ALLOTTED") {
      box.innerHTML = `<p>You have not been allotted to a college based on your choice list.</p>`;
      return;
    }

    const allotment = response.data;
    box.innerHTML = `
      <h3>Congratulations!</h3>
      <p>You have been allotted:</p>
      <ul>
        <li><b>College ID:</b> ${allotment.college_id}</li>
        <li><b>Branch ID:</b> ${allotment.branch_id}</li>
        <li><b>Choice ID:</b> ${allotment.choice_id}</li>
        <li><b>Status:</b> ${allotment.allotment_status}</li>
      </ul>
    `;
  } catch (err) {
    console.error(err);
    document.getElementById("statusBox").innerHTML = `<p>Error loading status.</p>`;
  }
}

function logout() {
  localStorage.removeItem("userToken");
  window.location.href = "../index.html";
}

function goBack() {
  window.location.href = "dashboard.html";
}

loadAllotment();
