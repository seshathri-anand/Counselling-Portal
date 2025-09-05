const progressBox = document.getElementById("progressBox");

async function loadStatus() {
  try {
    const response = await apiRequest("/dashboard/summary", "GET");
    const data = response.data;

    const steps = [
      {
        label: "Step 1: Submit Personal Details",
        done: data.details_submitted === 1,
        link: "submit.html"
      },
      {
        label: "Step 2: Fill Choices",
        done: data.choices_filled === 1,
        link: "choices.html"
      },
      {
        label: "Step 3: Wait for Allotment",
        done: data.allotment_status !== "Not Allotted",
        link: "allotment.html"
      }
    ];

    let html = `
      <h2>Welcome, ${data.full_name ?? "Student"}</h2>
      <p><strong>Current Allotment Status:</strong> ${data.allotment_status}</p>
      <ul class="steps">
    `;

    steps.forEach((step, idx) => {
      if (step.done) {
        html += `
          <li class="done">
            <strong>✅ ${step.label}</strong>
            <p>Completed successfully.</p>
          </li>
        `;
      } else if (idx === steps.findIndex(s => !s.done)) {
        // first pending step → highlight
        html += `
          <li class="pending">
            <strong>⚠ ${step.label}</strong>
            <p>Please complete this step. <a href="${step.link}">Go now ➡</a></p>
          </li>
        `;
      } else {
        html += `
          <li class="locked">
            <strong>🔒 ${step.label}</strong>
            <p>Locked until you complete previous steps.</p>
          </li>
        `;
      }
    });

    html += `</ul>`;

    progressBox.innerHTML = html;

  } catch (err) {
    console.error(err);
    progressBox.innerHTML = `<p style="color:#d9534f;">⚠ Failed to load progress. Please try again.</p>`;
  }
}

loadStatus();
