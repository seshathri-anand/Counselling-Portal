const formContainer = document.getElementById("formContainer");
const messageBox = document.getElementById("messageBox");
const submitForm = document.getElementById("submitForm");
const submitBtn = document.getElementById("submitBtn");
const attemptsLeftEl = document.getElementById("attemptsLeft");
const statusBox = document.getElementById("statusBox");

async function checkSubmissionStatus() {
  try {
    const response = await apiRequest("/submissions/latest", "GET");
    const latest = response.submission;
    const attempts_left = response.attempts_left ?? 0;

    // Update attempts UI (except if approved)
    if (latest && latest.status === "approved") {
      attemptsLeftEl.style.display = "none";
    } else {
      attemptsLeftEl.style.display = "block";
      attemptsLeftEl.textContent = `Attempts left: ${attempts_left}`;

      if (attempts_left <= 0) {
        submitBtn.disabled = true;
        attemptsLeftEl.innerHTML = `
          Attempts left: 0 <br>
          <a href="contactSupport.html" style="color:#d9534f; text-decoration:underline;">
            Contact Support
          </a>`;
      }
    }

    // Show submission status
    if (!latest) {
      formContainer.style.display = "block";
      messageBox.style.display = "none";
    } else if (latest.status === "pending") {
      formContainer.style.display = "none";
      messageBox.style.display = "block";
      messageBox.innerHTML = `
        <h3>⏳ Pending</h3>
        <p>Your submission is under review. Please wait for it to get approved.</p>
        <div class="submission-details">
          <strong>Full Name:</strong> ${latest.full_name}<br>
          <strong>Date of Birth:</strong> ${latest.dob}<br>
          <strong>Marksheet No:</strong> ${latest.marksheet_number}<br>
          <strong>Cutoff:</strong> ${latest.cutoff}<br>
          <strong>Physics Marks:</strong> ${latest.physics}<br>
          <strong>Chemistry Marks:</strong> ${latest.chemistry}<br>
          <strong>Maths Marks:</strong> ${latest.maths}
        </div>
      `;
    } else if (latest.status === "rejected") {
      formContainer.style.display = "block";
      messageBox.style.display = "block";
      messageBox.innerHTML = `
        <h3 style="color:#d9534f;">❌ Rejected</h3>
        <p>Your previous submission was rejected. You still have <strong>${attempts_left}</strong> attempt(s) left.</p>
        <div class="submission-details">
          <strong>Full Name:</strong> ${latest.full_name}<br>
          <strong>Date of Birth:</strong> ${latest.dob}<br>
          <strong>Marksheet No:</strong> ${latest.marksheet_number}<br>
          <strong>Cutoff:</strong> ${latest.cutoff}<br>
          <strong>Physics Marks:</strong> ${latest.physics}<br>
          <strong>Chemistry Marks:</strong> ${latest.chemistry}<br>
          <strong>Maths Marks:</strong> ${latest.maths}
        </div>
      `;
    } else if (latest.status === "approved") {
      formContainer.style.display = "none";
      messageBox.style.display = "block";
      messageBox.innerHTML = `
        <h3>✅ Approved</h3>
        <p>Your submission has been approved.<br>
        You may proceed to choice filling now.</p>
        <div class="submission-details">
          <strong>Full Name:</strong> ${latest.full_name}<br>
          <strong>Date of Birth:</strong> ${latest.dob}<br>
          <strong>Marksheet No:</strong> ${latest.marksheet_number}<br>
          <strong>Cutoff:</strong> ${latest.cutoff}<br>
          <strong>Physics Marks:</strong> ${latest.physics}<br>
          <strong>Chemistry Marks:</strong> ${latest.chemistry}<br>
          <strong>Maths Marks:</strong> ${latest.maths}
        </div>
        <p><a href="choices.html">➡ Go to Choice Filling</a></p>
      `;
    }

  } catch (err) {
    console.error(err);
    messageBox.style.display = "block";
    messageBox.innerHTML = `<p style="color:#d9534f;">⚠ Failed to check submission status.</p>`;
  }
}

submitForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  const body = {
    full_name: e.target.full_name.value.trim(),
    dob: e.target.dob.value,
    marksheet_number: e.target.marksheet_number.value.trim(),
    physics: Number(e.target.physics.value),
    chemistry: Number(e.target.chemistry.value),
    maths: Number(e.target.maths.value)
  };

  statusBox.style.display = "block";
  statusBox.textContent = "⏳ Submitting your details...";
  statusBox.className = "info";

  try {
    const response = await apiRequest("/submissions", "POST", body);

    // ✅ success UI
    statusBox.textContent = "✅ Submission created successfully!";
    statusBox.className = "success";
    statusBox.innerHTML += `
      <div class="details">
        <strong>Submission ID:</strong> ${response.submission_id}<br>
        <strong>Full Name:</strong> ${body.full_name}<br>
        <strong>Maths:</strong> ${body.maths}<br>
        <strong>Physics:</strong> ${body.physics}<br>
        <strong>Chemistry:</strong> ${body.chemistry}<br>
        <strong>Marksheet:</strong> ${body.marksheet_number}
      </div>
      <p>Attempts left after this submission: <strong>${response.attempts_left}</strong></p>
    `;

  } catch (err) {
    // ❌ error UI
    let errorMsg = "Submission failed. Please try again.";
    if (err?.error === "DUPLICATE_ENTRY") {
      errorMsg = `❌ Duplicate marksheet number detected: '${err.message.split("'")[1]}'`;
    } else if (err?.message) {
      errorMsg = `❌ ${err.message}`;
    }

    statusBox.textContent = errorMsg;
    statusBox.className = "error";
    console.log(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
  }
});

// check status on load
checkSubmissionStatus();
