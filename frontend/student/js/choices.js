// Robust frontend script for Choice Filling (choices.js)
// Assumes apiRequest(path, method='GET', body=null) exists and returns parsed JSON or throws.

// Keep single module instance so we can fully destroy it when re-initializing
let currentModule = null;

async function safeApi(path, method = "GET", body = null) {
    try {
        // If apiRequest signature differs, adapt here.
        const res = await apiRequest(path, method, body);
        return res;
    } catch (err) {
        // Normalize error object so callers can rely on err.message
        const message = err?.message || "Network or server error";
        // If token/unauthenticated, redirect to login (optional)
        if (/unauthorized|token|401/i.test(message)) {
            console.error("Auth error from API:", message);
            // Optional: redirect to login page
            // window.location.href = "/login.html";
        }
        throw new Error(message);
    }
}

// ----------------------
// Main Initialization
// ----------------------
async function initChoicePage() {
    // Acquire DOM elements safely
    const msg = document.getElementById("choices-msg");
    const builder = document.getElementById("builder");
    const viewOnly = document.getElementById("viewOnly");
    const resetChoicesContainer = document.getElementById("resetChoicesContainer");
    const submitBtn = document.getElementById("submitChoicesBtn");
    const confirmInput = document.getElementById("confirmInput");

    // Defensive checks
    if (!msg || !builder || !viewOnly || !resetChoicesContainer) {
        console.error("Critical DOM elements missing. Aborting initChoicePage.");
        return;
    }

    function setMsg(text = "", type = "") {
        // type could be "", "success", "error", "info" depending on your CSS
        try { msg.className = type; } catch (e) { /* ignore */ }
        msg.textContent = text;
    }

    // Clean up any previous module instance to avoid memory leaks and duplicated listeners
    if (currentModule && typeof currentModule.destroy === "function") {
        try { currentModule.destroy(); } catch (e) { console.warn("Error destroying module:", e); }
        currentModule = null;
    }

    // Hide everything while loading
    builder.style.display = "none";
    viewOnly.style.display = "none";
    resetChoicesContainer.style.display = "none";
    setMsg("Checking permissions and current choices...", "info");

    try {
        // 1. Check approval status
        const latest = await safeApi("/submissions/latest", "GET");
        if (!latest || !latest.submission || latest.submission.status !== "approved") {
            setMsg("Please wait until admin approves your submission.", "error");
            // Keep UI hidden (or show a specific message)
            builder.style.display = "none";
            viewOnly.style.display = "none";
            resetChoicesContainer.style.display = "none";
            return;
        }

        // 2. Check whether user already submitted choices
        const existing = await safeApi("/choices/mine", "GET");
        const choicesArr = Array.isArray(existing?.choices) ? existing.choices : [];

        if (choicesArr.length > 0) {
            showSubmittedChoices(choicesArr);
        } else {
            showBuilder();
        }
    } catch (err) {
        console.error("initChoicePage error:", err);
        setMsg(err.message || "Failed to load page", "error");
    }

    // ----------------------
    // Show Builder (SPA mode)
    // ----------------------
    function showBuilder() {
        // Show builder, hide view-only
        builder.style.display = "block";
        viewOnly.style.display = "none";
        resetChoicesContainer.style.display = "none";
        setMsg("Start by selecting a college and branch.", "info");

        // Reset confirm input & submit button safely
        if (confirmInput) {
            confirmInput.value = "";
            confirmInput.oninput = () => {
                if (submitBtn) submitBtn.disabled = confirmInput.value.trim().toUpperCase() !== "CONFIRM";
            };
        }
        if (submitBtn) submitBtn.disabled = true;

        // Initialize ChoiceFillingModule and keep its cleanup handler
        currentModule = ChoiceFillingModule();
    }
}

// ----------------------
// Show Submitted Choices (global)
// ----------------------
function showSubmittedChoices(choices) {
    const builder = document.getElementById("builder");
    const viewOnly = document.getElementById("viewOnly");
    const resetChoicesContainer = document.getElementById("resetChoicesContainer");
    const msg = document.getElementById("choices-msg");
    const tbody = document.querySelector("#submittedChoices tbody");
    const resetBtn = document.getElementById("resetChoicesBtn");

    if (!msg || !viewOnly || !resetChoicesContainer || !tbody) {
        console.error("Missing DOM for showSubmittedChoices");
        return;
    }

    // Show view-only area
    builder && (builder.style.display = "none");
    viewOnly.style.display = "block";
    resetChoicesContainer.style.display = "block";

    // Render table (safe)
    tbody.innerHTML = "";
    choices.forEach((c, i) => {
        const tr = document.createElement("tr");
        // escape text if needed in production to avoid XSS
        tr.innerHTML = `<td>${i + 1}</td><td>${c.college_name}</td><td>${c.branch_name}</td>`;
        tbody.appendChild(tr);
    });

    msg.className = "success";
    msg.textContent = "You have already submitted your choices.";

    if (!resetBtn) {
        console.warn("Reset button missing in DOM");
        return;
    }

    // Use onclick assignment to avoid duplicate handlers
    resetBtn.onclick = async () => {
        if (!confirm("All your previous choices will be deleted. You will start afresh. Proceed?")) return;

        // Disable reset button immediately to prevent double clicks
        resetBtn.disabled = true;
        const previousText = resetBtn.textContent;
        resetBtn.textContent = "Deleting...";

        try {
            msg.className = "";
            msg.textContent = "Deleting previous choices…";

            // Call reset endpoint
            await safeApi("/choices/reset", "POST");

            // Re-check DB state to ensure rows are gone
            const updated = await safeApi("/choices/mine", "GET");
            const updatedChoices = Array.isArray(updated?.choices) ? updated.choices : [];

            if (updatedChoices.length === 0) {
                // Clear client-side UI artifacts safely
                const choicesTableBody = document.querySelector("#choicesTable tbody");
                choicesTableBody && (choicesTableBody.innerHTML = "");
                const choicesCount = document.getElementById("choices-count");
                const collegesCount = document.getElementById("colleges-count");
                const branchesCount = document.getElementById("branches-count");
                const confirmInput = document.getElementById("confirmInput");

                if (choicesCount) choicesCount.textContent = "0";
                if (collegesCount) collegesCount.textContent = "0";
                if (branchesCount) branchesCount.textContent = "0";
                if (confirmInput) confirmInput.value = "";

                msg.className = "success";
                msg.textContent = "Previous choices deleted. Reloading builder...";

                // Re-initialize SPA builder (clean)
                // Destroy module if present (safety)
                if (currentModule && typeof currentModule.destroy === "function") {
                    try { currentModule.destroy(); } catch (e) { console.warn("destroy error:", e); }
                    currentModule = null;
                }

                // Small delay to give user feedback, then re-init
                setTimeout(() => initChoicePage(), 150);
            } else {
                // Reset didn't actually remove rows — show latest ones
                msg.className = "error";
                msg.textContent = "Reset did not complete. Showing current submitted choices.";
                showSubmittedChoices(updatedChoices);
            }
        } catch (err) {
            console.error("Reset error:", err);
            msg.className = "error";
            msg.textContent = err.message || "Failed to reset choices.";
        } finally {
            resetBtn.disabled = false;
            resetBtn.textContent = previousText;
        }
    };
}

// ----------------------
// Choice Filling Module (returns an object with destroy())
// ----------------------
function ChoiceFillingModule() {
    // DOM references
    const msg = document.getElementById("choices-msg");
    const collegeSelect = document.getElementById("collegeSelect");
    const branchSelect = document.getElementById("branchSelect");
    const addChoiceBtn = document.getElementById("addChoiceBtn");
    const clearAllBtn = document.getElementById("clearAllBtn");
    const submitBtn = document.getElementById("submitChoicesBtn");
    const tableBody = document.querySelector("#choicesTable tbody");
    const confirmInput = document.getElementById("confirmInput");

    // Defensive checks
    if (!msg || !collegeSelect || !branchSelect || !addChoiceBtn || !clearAllBtn || !submitBtn || !tableBody) {
        console.error("Missing DOM in ChoiceFillingModule. Aborting module init.");
        return {
            destroy() { /* no-op */ }
        };
    }

    // Internal state
    const state = {
        collegesMap: new Map(),   // id -> { id, name, branches: Map(branchId -> {id,name})}
        selections: [],           // {college_id, college_name, branch_id, branch_name}
        selectedCombos: new Set() // combo keys "c-b"
    };

    const handlers = {}; // store handlers so we can remove them later
    const comboKey = (cId, bId) => `${cId}-${bId}`;

    function setMsg(text = "", type = "") {
        try { msg.className = type; } catch (e) {}
        msg.textContent = text;
    }

    function updateStats() {
        const choicesCount = document.getElementById("choices-count");
        const collegesCount = document.getElementById("colleges-count");
        const branchesCount = document.getElementById("branches-count");

        if (choicesCount) choicesCount.textContent = String(state.selections.length);
        if (collegesCount) collegesCount.textContent = String(new Set(state.selections.map(s => s.college_id)).size);
        if (branchesCount) branchesCount.textContent = String(new Set(state.selections.map(s => s.branch_id)).size);
    }

    function enableControls() {
        const hasData = state.collegesMap.size > 0;
        const hasChoice = state.selections.length > 0;
        collegeSelect.disabled = !hasData;
        branchSelect.disabled = !hasData || !collegeSelect.value;
        addChoiceBtn.disabled = !hasData || !collegeSelect.value || !branchSelect.value;
        clearAllBtn.disabled = !hasChoice;
        // confirmInput might not exist but we guarded earlier
        submitBtn.disabled = !hasChoice || (confirmInput ? confirmInput.value.trim().toUpperCase() !== "CONFIRM" : true);
    }

    function renderColleges() {
        collegeSelect.innerHTML = `<option value="">Select College</option>`;
        const list = [...state.collegesMap.values()].sort((a, b) => a.name.localeCompare(b.name));
        for (const c of list) {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = c.name;
            collegeSelect.appendChild(opt);
        }
    }

    function renderBranchesFor(collegeId) {
        branchSelect.innerHTML = `<option value="">Select Branch</option>`;
        if (!collegeId) { enableControls(); return; }
        const college = state.collegesMap.get(Number(collegeId));
        if (!college) { enableControls(); return; }

        const branches = [...college.branches.values()].sort((a, b) => a.name.localeCompare(b.name));
        for (const b of branches) {
            const key = comboKey(college.id, b.id);
            if (!state.selectedCombos.has(key)) {
                const opt = document.createElement("option");
                opt.value = b.id;
                opt.textContent = b.name;
                branchSelect.appendChild(opt);
            }
        }
        enableControls();
    }

    function refreshBuilderAfterSelection(keepCollege = true) {
        if (keepCollege && collegeSelect.value) {
            renderBranchesFor(collegeSelect.value);
            branchSelect.value = "";
        } else {
            collegeSelect.value = "";
            renderBranchesFor("");
        }
        enableControls();
    }

    function renderTable() {
        tableBody.innerHTML = "";
        if (!state.selections.length) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;">No choices added yet. Start by selecting a college and branch above.</td></tr>`;
        } else {
            for (let i = 0; i < state.selections.length; i++) {
                const s = state.selections[i];
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${i + 1}</td>
                    <td>${s.college_name}</td>
                    <td>${s.branch_name}</td>
                    <td class="row-actions">
                        <button type="button" data-act="up" data-idx="${i}" ${i===0?"disabled":""}>▲</button>
                        <button type="button" data-act="down" data-idx="${i}" ${i===state.selections.length-1?"disabled":""}>▼</button>
                        <button type="button" data-act="remove" data-idx="${i}">Remove</button>
                    </td>`;
                tableBody.appendChild(tr);
            }
        }
        updateStats();
        enableControls();
    }

    function addSelection(collegeId, branchId) {
        const cId = Number(collegeId), bId = Number(branchId);
        const college = state.collegesMap.get(cId);
        const branch = college?.branches.get(bId);
        if (!college || !branch) return;

        const key = comboKey(cId, bId);
        if (state.selectedCombos.has(key)) {
            setMsg("That college–branch is already in your list.", "error");
            return;
        }

        state.selectedCombos.add(key);
        state.selections.push({ college_id: cId, college_name: college.name, branch_id: bId, branch_name: branch.name });
        setMsg("");
        renderTable();
        refreshBuilderAfterSelection(true);
    }

    function removeSelection(index) {
        const item = state.selections[index];
        if (!item) return;
        state.selections.splice(index, 1);
        state.selectedCombos.delete(comboKey(item.college_id, item.branch_id));
        renderTable();
        renderBranchesFor(collegeSelect.value);
    }

    function moveSelection(index, dir) {
        const j = index + dir;
        if (j < 0 || j >= state.selections.length) return;
        [state.selections[index], state.selections[j]] = [state.selections[j], state.selections[index]];
        renderTable();
    }

    // Event handlers (named so we can remove them)
    handlers.collegeChange = () => renderBranchesFor(collegeSelect.value);
    handlers.branchChange = () => { addChoiceBtn.disabled = !(collegeSelect.value && branchSelect.value); };
    handlers.addChoice = () => { if (collegeSelect.value && branchSelect.value) addSelection(collegeSelect.value, branchSelect.value); };
    handlers.clearAll = () => {
        if (!state.selections.length || !confirm("Clear all selected choices?")) return;
        state.selections = [];
        state.selectedCombos.clear();
        renderTable();
        refreshBuilderAfterSelection(false);
        setMsg("All choices cleared.", "success");
    };
    handlers.tableClick = (e) => {
        const btn = e.target.closest("button[data-act]");
        if (!btn) return;
        const idx = Number(btn.dataset.idx);
        const act = btn.dataset.act;
        if (act === "remove") removeSelection(idx);
        else if (act === "up") moveSelection(idx, -1);
        else if (act === "down") moveSelection(idx, +1);
    };
    handlers.submit = async () => {
        if (!state.selections.length) { setMsg("Please add at least one choice.", "error"); return; }
        const payload = { choices: state.selections.map((s, i) => ({ college_id: s.college_id, branch_id: s.branch_id, preference_order: i + 1 })) };
        submitBtn.disabled = true;
        setMsg("Submitting your choices…", "info");
        try {
            await safeApi("/choices", "POST", payload);
            setMsg("Choices submitted successfully. Fetching submitted list...", "success");
            // After submit, fetch the server's submitted choices and enter view-only mode
            const updated = await safeApi("/choices/mine", "GET");
            const updatedChoices = Array.isArray(updated?.choices) ? updated.choices : [];
            if (updatedChoices.length > 0) {
                // destroy module and show submitted
                destroy();
                showSubmittedChoices(updatedChoices);
            } else {
                // Unexpected: show message and re-init
                setMsg("Submitted but server returned empty list. Refreshing...", "error");
                destroy();
                setTimeout(() => initChoicePage(), 250);
            }
        } catch (err) {
            console.error("Submit error:", err);
            // If server says already submitted, fetch latest and show it
            if (/already submitted/i.test(err.message || "")) {
                setMsg("You have already submitted your choice list. Showing current submission.", "error");
                try {
                    const updated = await safeApi("/choices/mine", "GET");
                    const updatedChoices = Array.isArray(updated?.choices) ? updated.choices : [];
                    destroy();
                    showSubmittedChoices(updatedChoices);
                } catch (fetchErr) {
                    console.error("Error fetching choices after submit failure:", fetchErr);
                    setMsg(fetchErr.message || "Failed to fetch submitted choices", "error");
                }
            } else {
                setMsg(err.message || "Failed to submit choices.", "error");
            }
        } finally {
            submitBtn.disabled = false;
        }
    };

    // Attach listeners
    collegeSelect.addEventListener("change", handlers.collegeChange);
    branchSelect.addEventListener("change", handlers.branchChange);
    addChoiceBtn.addEventListener("click", handlers.addChoice);
    clearAllBtn.addEventListener("click", handlers.clearAll);
    tableBody.addEventListener("click", handlers.tableClick);
    submitBtn.addEventListener("click", handlers.submit);

    // Load colleges/branches from server
    (async function loadChoicesData() {
        try {
            setMsg("Loading available colleges & branches…", "info");
            const data = await safeApi("/choices", "GET"); // endpoint that returns available choices
            const list = Array.isArray(data?.choices) ? data.choices : [];

            if (!list.length) {
                setMsg("No seats available right now.", "error");
                enableControls();
                return;
            }

            for (const row of list) {
                const cId = Number(row.college_id);
                const bId = Number(row.branch_id);
                if (!state.collegesMap.has(cId)) state.collegesMap.set(cId, { id: cId, name: row.college_name, branches: new Map() });
                const col = state.collegesMap.get(cId);
                if (!col.branches.has(bId)) col.branches.set(bId, { id: bId, name: row.branch_name });
            }

            renderColleges();
            renderBranchesFor("");
            setMsg("Start by selecting a college, then a branch.", "info");
        } catch (err) {
            console.error("Failed to load available choices:", err);
            setMsg(err.message || "Failed to load choices.", "error");
        } finally {
            enableControls();
        }
    })();

    // destroy() - remove listeners and clear state
    function destroy() {
        try {
            collegeSelect.removeEventListener("change", handlers.collegeChange);
            branchSelect.removeEventListener("change", handlers.branchChange);
            addChoiceBtn.removeEventListener("click", handlers.addChoice);
            clearAllBtn.removeEventListener("click", handlers.clearAll);
            tableBody.removeEventListener("click", handlers.tableClick);
            submitBtn.removeEventListener("click", handlers.submit);
        } catch (e) {
            // ignore removal errors
        }

        // clear UI bits to avoid stale references
        try {
            tableBody.innerHTML = "";
            const choicesCount = document.getElementById("choices-count");
            const collegesCount = document.getElementById("colleges-count");
            const branchesCount = document.getElementById("branches-count");
            if (choicesCount) choicesCount.textContent = "0";
            if (collegesCount) collegesCount.textContent = "0";
            if (branchesCount) branchesCount.textContent = "0";
        } catch (e) { /* ignore */ }
    }

    // Return cleanup handle so parent can destroy the module
    return { destroy };
}

// ----------------------
// Page load
// ----------------------
document.addEventListener("DOMContentLoaded", () => {
    try {
        initChoicePage();
    } catch (e) {
        console.error("Fatal init error:", e);
    }
});

// ----------------------
// Go back button helper
// ----------------------
function goBack() {
    window.location.href = "dashboard.html";
}
